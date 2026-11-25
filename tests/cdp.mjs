// Cliente mínimo del Chrome DevTools Protocol (CDP) sobre --remote-debugging-pipe.
// No usa red ni dependencias: Chrome lee comandos por el descriptor 3 y responde por el 4.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

export function findChrome() {
  return CHROME_CANDIDATES.find(p => fs.existsSync(p)) || null;
}

function parseExpectedUrl(url) {
  let expectedOrigin = '';
  let expectedPath = '';
  let expectedHash = '';
  try {
    const parsed = new URL(url);
    expectedOrigin = parsed.origin === 'null' ? '' : parsed.origin;
    expectedPath = parsed.pathname || '';
    expectedHash = parsed.hash || '';
  } catch {
    // URL no estándar (ej. about:blank)
  }
  return { expectedOrigin, expectedPath, expectedHash };
}

export async function launchChrome({ width = 1280, height = 800 } = {}) {
  const chromePath = findChrome();
  if (!chromePath) throw new Error('No se encontró Google Chrome instalado.');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clinica-cdp-'));
  const proc = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--remote-debugging-pipe', `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

  const writer = proc.stdio[3];
  const reader = proc.stdio[4];
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  const openTabs = new Set();
  let buffer = '';
  let browserClosed = false;

  const exitPromise = new Promise(resolve => {
    proc.once('exit', (code, signal) => resolve({ code, signal }));
  });

  reader.on('data', chunk => {
    buffer += chunk.toString('utf8');
    let idx;
    while ((idx = buffer.indexOf('\0')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!raw) continue;
      const msg = JSON.parse(raw);
      if (msg.id && pending.has(msg.id)) {
        const entry = pending.get(msg.id);
        pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error) {
          entry.reject(new Error(`${msg.error.message} ${msg.error.data || ''}`.trim()));
        } else {
          entry.resolve(msg.result);
        }
      } else if (msg.method) {
        for (const fn of [...listeners]) {
          try {
            fn(msg);
          } catch {
            // Ignorar error aislado de listener para no detener despacho CDP
          }
        }
      }
    }
  });

  function send(method, params = {}, sessionId) {
    if (browserClosed && method !== 'Browser.close' && method !== 'Target.closeTarget') {
      return Promise.reject(new Error(`Conexión CDP cerrada al invocar ${method}`));
    }
    const id = nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    writer.write(JSON.stringify(payload) + '\0');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout CDP: ${method}`));
        }
      }, 15000);
      pending.set(id, { resolve, reject, timer });
    });
  }

  const consoleErrors = [];

  async function attachTarget(targetId, isRoot = false) {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const sessionListeners = new Set();
    const registerSessionListener = fn => {
      listeners.add(fn);
      sessionListeners.add(fn);
      return () => {
        listeners.delete(fn);
        sessionListeners.delete(fn);
      };
    };

    const lastNetworkEvents = {
      lastRequest: null,
      lastResponse: null,
      lastLoadingFailed: null
    };

    const tabErrors = [];
    let isTabClosed = false;

    const errListener = msg => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        const text = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
        tabErrors.push(text);
        if (!isRoot) consoleErrors.push(text);
      }
    };
    const netListener = msg => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Network.requestWillBeSent') {
        lastNetworkEvents.lastRequest = {
          requestId: msg.params?.requestId || null,
          type: msg.params?.type || null,
          url: msg.params?.request?.url || null
        };
      } else if (msg.method === 'Network.responseReceived') {
        lastNetworkEvents.lastResponse = {
          requestId: msg.params?.requestId || null,
          type: msg.params?.type || null,
          url: msg.params?.response?.url || null,
          status: msg.params?.response?.status ?? null
        };
      } else if (msg.method === 'Network.loadingFailed') {
        lastNetworkEvents.lastLoadingFailed = {
          requestId: msg.params?.requestId || null,
          type: msg.params?.type || null,
          errorText: msg.params?.errorText || null,
          blockedReason: msg.params?.blockedReason || null,
          corsErrorStatus: msg.params?.corsErrorStatus || null,
          canceled: Boolean(msg.params?.canceled)
        };
      }
    };

    registerSessionListener(errListener);
    registerSessionListener(netListener);

    await s('Page.enable');
    await s('Runtime.enable');
    await s('Network.enable');

    async function collectNavigationDiag(expectedUrl, extra = {}) {
      let frameInfo = null;
      try {
        const tree = await s('Page.getFrameTree');
        const mainFrame = tree?.frameTree?.frame || null;
        if (mainFrame) {
          frameInfo = {
            id: mainFrame.id || null,
            loaderId: mainFrame.loaderId || null,
            url: mainFrame.url || null,
            unreachableUrl: mainFrame.unreachableUrl || null
          };
        }
      } catch {
        // Ignorar si el target ya se cerró
      }

      let domDiag = null;
      try {
        const res = await s('Runtime.evaluate', {
          expression: '({ href: location.href, origin: location.origin, pathname: location.pathname, hash: location.hash, readyState: document.readyState, appReady: window.__appReady === true })',
          returnByValue: true
        });
        domDiag = res?.result?.value || null;
      } catch {
        // Ignorar si no hay contexto ejecutable
      }

      const relevantNetEvent = extra.lastNetworkEvent
        || lastNetworkEvents.lastLoadingFailed
        || lastNetworkEvents.lastResponse
        || lastNetworkEvents.lastRequest
        || null;

      return {
        expectedUrl: expectedUrl || null,
        observedUrl: domDiag?.href || frameInfo?.url || null,
        unreachableUrl: frameInfo?.unreachableUrl || null,
        targetId,
        sessionId,
        mainFrameId: extra.mainFrameId || frameInfo?.id || null,
        loaderId: extra.loaderId || frameInfo?.loaderId || null,
        readyState: domDiag?.readyState || null,
        appReady: Boolean(domDiag?.appReady),
        lastNetworkEvent: relevantNetEvent
      };
    }

    async function buildNavigationError(prefix, expectedUrl, extra = {}) {
      const diag = await collectNavigationDiag(expectedUrl, extra);
      const err = new Error(`${prefix} | diag=${JSON.stringify(diag)}`);
      err.diag = diag;
      return err;
    }

    async function checkUrlDomReady(url, { requireComplete = true } = {}) {
      try {
        const { expectedOrigin, expectedPath, expectedHash } = parseExpectedUrl(url);
        const res = await s('Runtime.evaluate', {
          expression: '({ href: location.href, origin: location.origin, pathname: location.pathname, hash: location.hash, ready: document.readyState, appReady: window.__appReady === true, hasAppScript: Boolean(document.getElementById("app") && document.querySelector("script[src=\\"app.js\\"]")) })',
          returnByValue: true
        });
        const v = res?.result?.value;
        if (!v) return { ok: false, v: null };
        if (String(v.href || '').startsWith('chrome-error://')) {
          return { ok: false, chromeError: true, v };
        }
        const readyStateOk = requireComplete
          ? v.ready === 'complete'
          : (v.ready === 'interactive' || v.ready === 'complete');
        if (!readyStateOk) return { ok: false, v };
        if (url === 'about:blank') return { ok: v.href === 'about:blank', v };
        if (expectedOrigin && v.origin !== expectedOrigin) return { ok: false, v };
        if (expectedPath && v.pathname !== expectedPath) return { ok: false, v };
        if (expectedHash && v.hash !== expectedHash) return { ok: false, v };
        if (v.hasAppScript && !v.appReady) return { ok: false, v };
        return { ok: true, v };
      } catch {
        return { ok: false, v: null };
      }
    }

    const api = {
      targetId,
      sessionId,
      send: s,
      consoleErrors: isRoot ? consoleErrors : tabErrors,
      listenerCount() {
        return listeners.size;
      },
      getLastNetworkEvents() {
        return structuredClone(lastNetworkEvents);
      },
      on(fn) {
        return registerSessionListener(fn);
      },
      async focus() {
        await s('Page.bringToFront');
      },
      async bringToFront() {
        await s('Page.bringToFront').catch(() => {});
      },
      async close() {
        if (!isRoot) {
          if (isTabClosed) return;
          isTabClosed = true;
          for (const fn of [...sessionListeners]) {
            listeners.delete(fn);
          }
          sessionListeners.clear();
          openTabs.delete(api);
          await send('Target.closeTarget', { targetId }).catch(() => {});
          return;
        }
        if (browserClosed) return;
        browserClosed = true;
        for (const childTab of [...openTabs]) {
          await childTab.close().catch(() => {});
        }
        for (const fn of [...sessionListeners]) {
          listeners.delete(fn);
        }
        sessionListeners.clear();
        for (const [id, entry] of pending.entries()) {
          clearTimeout(entry.timer);
          entry.reject(new Error('Navegador cerrado'));
          pending.delete(id);
        }
        await send('Browser.close').catch(() => {});
        let killWaitTimer = null;
        const raced = await Promise.race([
          exitPromise.then(() => 'exited'),
          new Promise(r => { killWaitTimer = setTimeout(() => r('timeout'), 1500); })
        ]);
        if (killWaitTimer) clearTimeout(killWaitTimer);
        if (raced === 'timeout' && proc.exitCode === null && proc.signalCode === null) {
          try { proc.kill('SIGKILL'); } catch {}
          let killPostTimer = null;
          await Promise.race([
            exitPromise,
            new Promise(r => { killPostTimer = setTimeout(r, 500); })
          ]);
          if (killPostTimer) clearTimeout(killPostTimer);
        }
        try { writer.destroy(); reader.destroy(); } catch {}
        proc.unref();
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 80 });
        } catch {}
      },
      async goto(url, timeoutMs = 15000) {
        let targetFrameId = '';
        let targetLoaderId = '';
        let sawCommit = false;
        let sawStopAfterCommit = false;
        let sawLoadAfterCommit = false;
        let docLoadingFailure = null;
        const earlyFrames = [];
        const earlyStopped = new Set();
        let resolveNav = null;
        const navDone = new Promise(resolve => { resolveNav = resolve; });

        const fn = msg => {
          if (msg.sessionId !== sessionId) return;
          if (msg.method === 'Network.loadingFailed' && msg.params?.type === 'Document') {
            const ev = {
              requestId: msg.params?.requestId || null,
              type: 'Document',
              errorText: msg.params?.errorText || 'net::ERR_FAILED',
              blockedReason: msg.params?.blockedReason || null,
              corsErrorStatus: msg.params?.corsErrorStatus || null,
              canceled: Boolean(msg.params?.canceled)
            };
            if (!ev.canceled) {
              docLoadingFailure = ev;
              if (resolveNav) {
                resolveNav('failed');
                resolveNav = null;
              }
            }
          } else if (msg.method === 'Page.frameNavigated' && !msg.params?.frame?.parentId) {
            const frame = msg.params.frame;
            if (url !== 'about:blank' && frame.url === 'about:blank') return;
            if (String(frame.url || '').startsWith('chrome-error://')) {
              if (resolveNav) {
                resolveNav('chrome-error');
                resolveNav = null;
              }
              return;
            }
            if (!targetLoaderId) {
              earlyFrames.push(frame);
            } else if (frame.loaderId === targetLoaderId && (!targetFrameId || frame.id === targetFrameId)) {
              sawCommit = true;
            }
          } else if (msg.method === 'Page.frameStoppedLoading') {
            const fId = msg.params?.frameId;
            if (!targetLoaderId) {
              if (fId) earlyStopped.add(fId);
            } else if (sawCommit && (!targetFrameId || fId === targetFrameId)) {
              sawStopAfterCommit = true;
            }
          } else if (msg.method === 'Page.loadEventFired') {
            if (sawCommit) {
              sawLoadAfterCommit = true;
            }
          }
          if ((sawStopAfterCommit || (sawCommit && sawLoadAfterCommit)) && resolveNav) {
            resolveNav('ok');
            resolveNav = null;
          }
        };
        const detachFn = registerSessionListener(fn);

        try {
          lastNetworkEvents.lastLoadingFailed = null;
          const nav = await s('Page.navigate', { url });
          targetFrameId = nav?.frameId || '';
          targetLoaderId = nav?.loaderId || '';
          if (nav?.errorText) {
            throw await buildNavigationError(`Page.navigate(${url}) falló: ${nav.errorText}`, url, {
              mainFrameId: targetFrameId,
              loaderId: targetLoaderId,
              lastNetworkEvent: docLoadingFailure || lastNetworkEvents.lastLoadingFailed || { errorText: nav.errorText, type: 'Document' }
            });
          }

          if (!targetFrameId || !targetLoaderId) {
            try {
              const tree = await s('Page.getFrameTree');
              const mainFrame = tree?.frameTree?.frame;
              if (mainFrame) {
                targetFrameId = targetFrameId || mainFrame.id || '';
                targetLoaderId = targetLoaderId || mainFrame.loaderId || '';
              }
            } catch { /* ignorar */ }
          }

          if (targetLoaderId && earlyFrames.some(f => f.loaderId === targetLoaderId && (!targetFrameId || f.id === targetFrameId))) {
            sawCommit = true;
            if (!targetFrameId || earlyStopped.has(targetFrameId)) {
              sawStopAfterCommit = true;
            }
          }

          const deadline = Date.now() + timeoutMs;
          if (targetLoaderId && !sawStopAfterCommit && !docLoadingFailure) {
            await Promise.race([
              navDone,
              (async () => {
                while (Date.now() < deadline && resolveNav) {
                  if (docLoadingFailure) {
                    resolveNav('failed');
                    resolveNav = null;
                    return;
                  }
                  const st = await checkUrlDomReady(url, { requireComplete: true });
                  if (st.chromeError) {
                    if (resolveNav) {
                      resolveNav('chrome-error');
                      resolveNav = null;
                    }
                    return;
                  }
                  if (st.ok) {
                    if (resolveNav) {
                      resolveNav('ok');
                      resolveNav = null;
                    }
                    return;
                  }
                  await api.sleep(35);
                }
              })()
            ]);
          }

          if (docLoadingFailure) {
            throw await buildNavigationError(`Page.navigate(${url}) falló: ${docLoadingFailure.errorText}`, url, {
              mainFrameId: targetFrameId,
              loaderId: targetLoaderId,
              lastNetworkEvent: docLoadingFailure
            });
          }

          while (Date.now() < deadline) {
            if (docLoadingFailure) {
              throw await buildNavigationError(`Page.navigate(${url}) falló: ${docLoadingFailure.errorText}`, url, {
                mainFrameId: targetFrameId,
                loaderId: targetLoaderId,
                lastNetworkEvent: docLoadingFailure
              });
            }
            const st = await checkUrlDomReady(url, { requireComplete: true });
            if (st.chromeError) {
              const netErr = lastNetworkEvents.lastLoadingFailed;
              throw await buildNavigationError(
                `Page.navigate(${url}) falló: ${netErr?.errorText || 'chrome-error'}`,
                url,
                { mainFrameId: targetFrameId, loaderId: targetLoaderId, lastNetworkEvent: netErr }
              );
            }
            if (st.ok) {
              return;
            }
            await api.sleep(35);
          }

          throw await buildNavigationError(`Timeout en Page.navigate hacia ${url} (${timeoutMs}ms)`, url, {
            mainFrameId: targetFrameId,
            loaderId: targetLoaderId
          });
        } finally {
          detachFn();
        }
      },
      async waitForInitialNavigation(url, timeoutMs = 15000) {
        if (!url || url === 'about:blank') return;
        let mainFrameId = '';
        let loaderId = '';
        let docFailure = null;
        const navListener = msg => {
          if (msg.sessionId !== sessionId) return;
          if (msg.method === 'Network.loadingFailed' && msg.params?.type === 'Document' && !msg.params?.canceled) {
            docFailure = {
              requestId: msg.params?.requestId || null,
              type: 'Document',
              errorText: msg.params?.errorText || 'net::ERR_FAILED',
              blockedReason: msg.params?.blockedReason || null,
              corsErrorStatus: msg.params?.corsErrorStatus || null
            };
          }
        };
        const detach = registerSessionListener(navListener);
        try {
          const start = Date.now();
          const deadline = start + timeoutMs;
          let fallbackAttempted = false;

          while (Date.now() < deadline) {
            if (docFailure) {
              throw await buildNavigationError(`Target.createTarget(${url}) falló: ${docFailure.errorText}`, url, {
                mainFrameId,
                loaderId,
                lastNetworkEvent: docFailure
              });
            }

            let frame = null;
            try {
              const tree = await s('Page.getFrameTree');
              frame = tree?.frameTree?.frame || null;
              if (frame) {
                mainFrameId = frame.id || mainFrameId;
                loaderId = frame.loaderId || loaderId;
              }
            } catch { /* ignorar */ }

            if (frame && (String(frame.url || '').startsWith('chrome-error://') || frame.unreachableUrl)) {
              const netErr = lastNetworkEvents.lastLoadingFailed;
              throw await buildNavigationError(
                `Target.createTarget(${url}) falló: ${netErr?.errorText || 'chrome-error'}`,
                url,
                { mainFrameId, loaderId, lastNetworkEvent: netErr }
              );
            }

            const st = await checkUrlDomReady(url, { requireComplete: false });
            if (st.chromeError) {
              const netErr = lastNetworkEvents.lastLoadingFailed;
              throw await buildNavigationError(
                `Target.createTarget(${url}) falló: ${netErr?.errorText || 'chrome-error'}`,
                url,
                { mainFrameId, loaderId, lastNetworkEvent: netErr }
              );
            }
            if (st.ok) {
              return;
            }

            // Si tras 400ms el target quedó estrictamente en about:blank sin solicitud de red iniciada, navegar explícitamente
            if (!fallbackAttempted && Date.now() - start >= 400 && frame?.url === 'about:blank' && !lastNetworkEvents.lastRequest) {
              fallbackAttempted = true;
              const remaining = Math.max(2000, deadline - Date.now());
              await api.goto(url, remaining);
              return;
            }

            await api.sleep(35);
          }

          throw await buildNavigationError(`Timeout esperando navegación inicial de pestaña hacia ${url} (${timeoutMs}ms)`, url, {
            mainFrameId,
            loaderId
          });
        } finally {
          detach();
        }
      },
      async reload() {
        let timer = null;
        let detach = null;
        try {
          await new Promise((resolve, reject) => {
            const fn = msg => {
              if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') {
                resolve();
              }
            };
            detach = registerSessionListener(fn);
            timer = setTimeout(() => reject(new Error('Timeout en Page.reload')), 15000);
            s('Page.reload', { ignoreCache: true }).catch(reject);
          });
          await api.sleep(120);
        } finally {
          if (timer) clearTimeout(timer);
          if (detach) detach();
        }
      },
      async eval(expression) {
        const res = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
        if (res.exceptionDetails) {
          throw new Error('Error en la página: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
        }
        return res.result.value;
      },
      sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
      wait(ms) { return new Promise(r => setTimeout(r, ms)); },
      async setViewport(vw, vh) {
        await s('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 1, mobile: vw < 800 });
        await api.sleep(80);
      },
      async screenshot(filePath, fullPage = false) {
        const { data } = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage });
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        return filePath;
      },
      // Centro del elemento visible (lo desplaza a la vista primero).
      async center(selector) {
        const box = await api.eval(`(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
        })()`);
        if (!box) throw new Error(`No existe el elemento ${selector}`);
        if (box.w === 0 || box.h === 0) throw new Error(`El elemento ${selector} no es visible`);
        return box;
      },
      // Clic real del ratón mediante Input.dispatchMouseEvent (evento de confianza, isTrusted=true).
      async click(selector) {
        const { x, y } = await api.center(selector);
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await api.sleep(80);
      },
      async dragMouse(selector, dx = 80, dy = 40, steps = 6) {
        const { x, y } = await api.center(selector);
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
        for (let i = 1; i <= steps; i++) {
          const cx = Math.round(x + (dx * i) / steps);
          const cy = Math.round(y + (dy * i) / steps);
          await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'left', buttons: 1 });
          await api.sleep(20);
        }
        await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y: y + dy, button: 'left', clickCount: 1 });
        await api.sleep(90);
      },
      // Escritura real con el teclado (Input.insertText tras enfocar mediante clic).
      async type(selector, text, { clear = true } = {}) {
        await api.click(selector);
        if (clear) {
          await api.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.select ? el.select() : null; })()`);
          await api.key('Backspace', 'Backspace', 8);
        }
        await s('Input.insertText', { text });
        await api.sleep(40);
      },
      async key(key, code, keyCode, modifiers = 0) {
        const base = modifiers ? { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers } : { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
        await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
        await s('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
        await api.sleep(80);
      },
      async select(selector, value) {
        await api.center(selector);
        await api.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await api.sleep(80);
      },
      // Arrastre HTML5 real: Chrome intercepta el arrastre iniciado por el ratón y lo
      // entregamos en el destino con Input.dispatchDragEvent (mismo mecanismo que Puppeteer).
      async dragAndDrop(sourceSelector, targetSelector) {
        const boxPair = await api.eval(`(() => {
          const src = document.querySelector(${JSON.stringify(sourceSelector)});
          const dst = document.querySelector(${JSON.stringify(targetSelector)});
          if (!src || !dst) return null;
          dst.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          src.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          const fr = src.getBoundingClientRect();
          const tr = dst.getBoundingClientRect();
          return {
            from: { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2, w: fr.width, h: fr.height },
            to: { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2, w: tr.width, h: tr.height }
          };
        })()`);
        if (!boxPair || boxPair.from.w === 0 || boxPair.to.w === 0) {
          throw new Error(`Elemento origen o destino no visible para arrastre (${sourceSelector} -> ${targetSelector})`);
        }
        const { from, to } = boxPair;
        await s('Input.setInterceptDrags', { enabled: true });
        let detachDrag = null;
        let dragTimer = null;
        try {
          const intercepted = new Promise((resolve, reject) => {
            dragTimer = setTimeout(() => reject(new Error('Chrome no inició el arrastre')), 5000);
            detachDrag = registerSessionListener(msg => {
              if (msg.sessionId === sessionId && msg.method === 'Input.dragIntercepted') {
                resolve(msg.params.data);
              }
            });
          });
          await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y });
          await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 });
          for (let i = 1; i <= 5; i++) {
            await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + (to.x - from.x) * i / 5, y: from.y + (to.y - from.y) * i / 5, button: 'left', buttons: 1 });
          }
          const data = await intercepted;
          await s('Input.dispatchDragEvent', { type: 'dragEnter', x: to.x, y: to.y, data });
          await s('Input.dispatchDragEvent', { type: 'dragOver', x: to.x, y: to.y, data });
          await s('Input.dispatchDragEvent', { type: 'drop', x: to.x, y: to.y, data });
          await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 });
          await api.sleep(150);
        } finally {
          if (dragTimer) clearTimeout(dragTimer);
          if (detachDrag) detachDrag();
          await s('Input.setInterceptDrags', { enabled: false }).catch(() => {});
        }
      }
    };
    if (!isRoot) openTabs.add(api);
    return api;
  }

  const { targetInfos } = await send('Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page');
  const rootApi = await attachTarget(page.targetId, true);
  rootApi.newTab = async (url = 'about:blank', { width: vw = width, height: vh = height } = {}) => {
    const targetUrl = url && url.trim() ? url : 'about:blank';
    const { targetId } = await send('Target.createTarget', { url: targetUrl });
    let tabApi = null;
    try {
      tabApi = await attachTarget(targetId, false);
      if (vw !== width || vh !== height) {
        await tabApi.setViewport(vw, vh);
      }
      if (targetUrl !== 'about:blank') {
        await tabApi.waitForInitialNavigation(targetUrl, 15000);
      }
      return tabApi;
    } catch (err) {
      if (tabApi) {
        await tabApi.close().catch(() => {});
      } else if (targetId) {
        await send('Target.closeTarget', { targetId }).catch(() => {});
      }
      throw err;
    }
  };
  return rootApi;
}

export const launchBrowser = launchChrome;
