// Diagnóstico mínimo y aislado de navegación multipestaña Chrome CDP + servidor HTTP local.
// No depende de tests/cdp.mjs ni del flujo de pruebas: usa su propio cliente de pipe CDP.
// No imprime contenido de páginas ni datos clínicos: solo metadatos de protocolo y HTTP.
//
// Uso: node tests/diag_cdp_multitab.mjs
// Salida: resumen en consola + JSON en artifacts/diagnostics/cdp_multitab_<timestamp>.json
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { findChrome } from './cdp.mjs';

const APP_DIR = path.resolve('./app');
const OUT_DIR = path.resolve('./artifacts/diagnostics');
fs.mkdirSync(OUT_DIR, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  node: process.version,
  platform: `${os.platform()} ${os.release()}`,
  chrome: {},
  server: {},
  nodeSelfCheck: null,
  cases: {},
  targetEvents: []
};

// ---------------------------------------------------------------------------
// 1. Servidor HTTP mínimo con registro de cada petición (método, ruta, estado)
// ---------------------------------------------------------------------------
const serverLog = [];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const entry = { t: Date.now(), method: req.method, path: '', status: 0, remote: req.socket.remoteAddress };
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    entry.path = p;
    const file = path.resolve(APP_DIR, '.' + (p === '/' ? '/index.html' : p));
    if (!file.startsWith(APP_DIR) || !fs.existsSync(file)) {
      entry.status = 404;
      res.writeHead(404); res.end();
    } else {
      entry.status = 200;
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(file));
    }
  } catch (e) {
    entry.status = 500;
    entry.error = String(e?.message || e);
    try { res.writeHead(500); res.end(); } catch {}
  }
  serverLog.push(entry);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const ORIGIN = `http://127.0.0.1:${port}`;
report.server = { address: server.address(), listening: server.listening };

// Comprobación desde el propio proceso Node (mismo entorno que lanza Chrome)
report.nodeSelfCheck = await new Promise(resolve => {
  const req = http.get(`${ORIGIN}/index.html?selfcheck=1`, res => {
    res.resume();
    res.on('end', () => resolve({ ok: true, status: res.statusCode }));
  });
  req.on('error', e => resolve({ ok: false, code: e.code, message: e.message }));
  req.setTimeout(4000, () => { req.destroy(new Error('timeout')); });
});

// ---------------------------------------------------------------------------
// 2. Chrome con los mismos argumentos que tests/cdp.mjs
// ---------------------------------------------------------------------------
const chromePath = findChrome();
if (!chromePath) throw new Error('Chrome no encontrado');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clinica-diag-'));
const args = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--remote-debugging-pipe', `--user-data-dir=<tmp>`,
  '--window-size=1280,800', 'about:blank'
];
report.chrome.path = chromePath;
report.chrome.launchArgs = args;
const proc = spawn(chromePath, args.map(a => a === '--user-data-dir=<tmp>' ? `--user-data-dir=${userDataDir}` : a), {
  stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
});
const writer = proc.stdio[3];
const reader = proc.stdio[4];
let nextId = 1;
const pending = new Map();
const events = []; // { t, sessionId, method, params(reducido) }
let buf = '';
reader.on('data', chunk => {
  buf += chunk.toString('utf8');
  let i;
  while ((i = buf.indexOf('\0')) >= 0) {
    const msg = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      msg.error ? reject(new Error(`${msg.error.message} ${msg.error.data || ''}`.trim())) : resolve(msg.result);
    } else if (msg.method) {
      events.push({ t: Date.now(), sessionId: msg.sessionId || null, method: msg.method, params: reduceParams(msg.method, msg.params) });
    }
  }
});
function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  writer.write(JSON.stringify(payload) + '\0');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout CDP ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
  });
}
function reduceParams(method, p = {}) {
  switch (method) {
    case 'Page.frameNavigated': return { frameId: p.frame?.id, parentId: p.frame?.parentId || null, loaderId: p.frame?.loaderId, url: p.frame?.url, urlFragment: p.frame?.urlFragment || '' };
    case 'Page.frameStartedLoading':
    case 'Page.frameStoppedLoading': return { frameId: p.frameId };
    case 'Page.frameRequestedNavigation': return { frameId: p.frameId, url: p.url, reason: p.reason };
    case 'Page.lifecycleEvent': return { frameId: p.frameId, loaderId: p.loaderId, name: p.name };
    case 'Network.requestWillBeSent': return { requestId: p.requestId, loaderId: p.loaderId, url: p.request?.url, type: p.type };
    case 'Network.responseReceived': return { requestId: p.requestId, status: p.response?.status, url: p.response?.url, remoteIPAddress: p.response?.remoteIPAddress };
    case 'Network.loadingFailed': return { requestId: p.requestId, type: p.type, errorText: p.errorText, canceled: p.canceled, blockedReason: p.blockedReason || null, corsErrorStatus: p.corsErrorStatus || null };
    case 'Target.targetCreated':
    case 'Target.targetInfoChanged':
    case 'Target.targetDestroyed':
      return p.targetInfo ? { targetId: p.targetInfo.targetId, type: p.targetInfo.type, url: p.targetInfo.url, attached: p.targetInfo.attached, browserContextId: p.targetInfo.browserContextId } : { targetId: p.targetId };
    case 'Target.attachedToTarget': return { sessionId: p.sessionId, targetId: p.targetInfo?.targetId, waitingForDebugger: p.waitingForDebugger };
    case 'Target.detachedFromTarget': return { sessionId: p.sessionId, targetId: p.targetId };
    case 'Inspector.targetCrashed': return {};
    default: return undefined;
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  report.chrome.version = await send('Browser.getVersion');
  try {
    report.chrome.commandLine = (await send('Browser.getBrowserCommandLine')).arguments;
  } catch (e) {
    report.chrome.commandLine = `no disponible: ${e.message}`;
  }
  await send('Target.setDiscoverTargets', { discover: true });

  async function attach(targetId) {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Network.enable', {}, sessionId);
    await send('Runtime.enable', {}, sessionId);
    await send('Page.setLifecycleEventsEnabled', { enabled: true }, sessionId).catch(() => {});
    return sessionId;
  }
  async function pageState(sessionId) {
    try {
      const r = await send('Runtime.evaluate', {
        expression: '({ href: location.href, origin: location.origin, pathname: location.pathname, hash: location.hash, readyState: document.readyState, appReady: window.__appReady === true })',
        returnByValue: true
      }, sessionId);
      return r?.result?.value || null;
    } catch (e) {
      return { evalError: e.message };
    }
  }
  async function waitApp(sessionId, expected, timeoutMs = 8000) {
    const end = Date.now() + timeoutMs;
    let last = null;
    while (Date.now() < end) {
      last = await pageState(sessionId);
      if (last && last.origin === expected.origin && last.pathname === expected.pathname && last.hash === expected.hash &&
          (last.readyState === 'interactive' || last.readyState === 'complete') && last.appReady) {
        return { ok: true, state: last, waitedMs: timeoutMs - (end - Date.now()) };
      }
      await sleep(50);
    }
    return { ok: false, state: last };
  }
  function eventsFor(sessionId, since) {
    return events.filter(e => e.sessionId === sessionId && e.t >= since && e.params !== undefined)
      .map(e => ({ dt: e.t - since, method: e.method, ...e.params }));
  }
  function serverHitsSince(since) {
    return serverLog.filter(h => h.t >= since).map(h => ({ dt: h.t - since, method: h.method, path: h.path, status: h.status, remote: h.remote }));
  }
  async function targetInfo(targetId) {
    try { return (await send('Target.getTargetInfo', { targetId })).targetInfo; } catch (e) { return { error: e.message }; }
  }
  function expectedOf(url) {
    const u = new URL(url);
    return { origin: u.origin, pathname: u.pathname, hash: u.hash };
  }

  // ---- Caso A: pestaña raíz existente navega a HTTP ----
  {
    const t0 = Date.now();
    const { targetInfos } = await send('Target.getTargets');
    const root = targetInfos.find(t => t.type === 'page');
    const sessionId = await attach(root.targetId);
    const url = `${ORIGIN}/index.html`;
    const nav = await send('Page.navigate', { url }, sessionId).catch(e => ({ cdpError: e.message }));
    const wait = nav.errorText || nav.cdpError ? { ok: false, state: await pageState(sessionId) } : await waitApp(sessionId, expectedOf(url));
    const frameTree = await send('Page.getFrameTree', {}, sessionId).catch(e => ({ error: e.message }));
    report.cases.A_rootTab = {
      url, targetId: root.targetId, sessionId, browserContextId: root.browserContextId,
      navigate: nav, mainFrameId: frameTree?.frameTree?.frame?.id, mainLoaderId: frameTree?.frameTree?.frame?.loaderId,
      result: wait, events: eventsFor(sessionId, t0), serverHits: serverHitsSince(t0)
    };
  }

  // ---- Caso B: Target.createTarget con la URL final (sin about:blank intermedio) ----
  {
    const t0 = Date.now();
    const url = `${ORIGIN}/index.html#pantalla-turnos`;
    const { targetId } = await send('Target.createTarget', { url });
    const infoBeforeAttach = await targetInfo(targetId);
    const sessionId = await attach(targetId);
    const infoAfterAttach = await targetInfo(targetId);
    const frameTree = await send('Page.getFrameTree', {}, sessionId).catch(e => ({ error: e.message }));
    const wait = await waitApp(sessionId, expectedOf(url));
    report.cases.B_createTargetFinalUrl = {
      url, targetId, sessionId, infoBeforeAttach, infoAfterAttach,
      mainFrameId: frameTree?.frameTree?.frame?.id, mainLoaderId: frameTree?.frameTree?.frame?.loaderId,
      result: wait, events: eventsFor(sessionId, t0), serverHits: serverHitsSince(t0)
    };
    await send('Target.closeTarget', { targetId }).catch(() => {});
  }

  // ---- Caso C: about:blank + attach + Page.navigate (procedimiento actual) ----
  {
    const t0 = Date.now();
    const url = `${ORIGIN}/index.html#pantalla-turnos`;
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const infoBeforeAttach = await targetInfo(targetId);
    const sessionId = await attach(targetId);
    const nav = await send('Page.navigate', { url }, sessionId).catch(e => ({ cdpError: e.message }));
    const wait = nav.errorText || nav.cdpError ? { ok: false, state: await pageState(sessionId) } : await waitApp(sessionId, expectedOf(url));
    const infoAfterNav = await targetInfo(targetId);
    report.cases.C_blankThenNavigate = {
      url, targetId, sessionId, infoBeforeAttach, infoAfterNav, navigate: nav,
      result: wait, events: eventsFor(sessionId, t0), serverHits: serverHitsSince(t0)
    };
    await send('Target.closeTarget', { targetId }).catch(() => {});
  }

  // ---- Caso D: cuatro targets consecutivos con cada estrategia ----
  for (const strategy of ['createTargetFinalUrl', 'blankThenNavigate']) {
    const urls = [
      `${ORIGIN}/index.html#pantalla-turnos`,
      `${ORIGIN}/index.html#autoservicio`,
      `${ORIGIN}/index.html`,
      `${ORIGIN}/index.html`
    ];
    const labels = ['pantalla-turnos', 'autoservicio', 'recepcion', 'caja'];
    const tabs = [];
    for (let i = 0; i < urls.length; i++) {
      const t0 = Date.now();
      const url = urls[i];
      let targetId, sessionId, nav = null;
      if (strategy === 'createTargetFinalUrl') {
        ({ targetId } = await send('Target.createTarget', { url }));
        sessionId = await attach(targetId);
      } else {
        ({ targetId } = await send('Target.createTarget', { url: 'about:blank' }));
        sessionId = await attach(targetId);
        nav = await send('Page.navigate', { url }, sessionId).catch(e => ({ cdpError: e.message }));
      }
      const wait = nav && (nav.errorText || nav.cdpError) ? { ok: false, state: await pageState(sessionId) } : await waitApp(sessionId, expectedOf(url));
      tabs.push({ label: labels[i], url, targetId, sessionId, navigate: nav, result: wait,
        loadingFailed: eventsFor(sessionId, t0).filter(e => e.method === 'Network.loadingFailed'),
        serverHits: serverHitsSince(t0).length });
    }
    // Comprobación de mismo origen compartido entre las cuatro pestañas
    const origins = [];
    for (const t of tabs) origins.push((await pageState(t.sessionId))?.origin || null);
    report.cases[`D_fourTabs_${strategy}`] = { tabs, sameOrigin: origins.every(o => o === ORIGIN), origins };
    for (const t of tabs) await send('Target.closeTarget', { targetId: t.targetId }).catch(() => {});
  }

  report.targetEvents = events.filter(e => e.method.startsWith('Target.')).map(e => ({ method: e.method, ...e.params }));

  // ---- Caso E (control de política de red): destino NO loopback desde Node y desde Chrome ----
  // Si el entorno deniega sockets fuera de loopback, ambos procesos deben fallar con el mismo
  // tipo de denegación (EACCES en Node / net::ERR_NETWORK_ACCESS_DENIED en Chrome). Esto permite
  // saber qué produce ese código de error sin modificar la aplicación.
  {
    const lanIp = Object.values(os.networkInterfaces()).flat()
      .find(n => n && n.family === 'IPv4' && !n.internal)?.address || null;
    const caseE = { lanIp, controlServer: null, node: null, chrome: null, nodeTestNet: null, chromeTestNet: null };
    if (lanIp) {
      const ctl = http.createServer((req, res) => { serverLog.push({ t: Date.now(), method: req.method, path: 'CONTROL:' + req.url, status: 200, remote: req.socket.remoteAddress }); res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); });
      const bindErr = await new Promise(r => { ctl.once('error', e => r(e)); ctl.listen(0, '0.0.0.0', () => r(null)); });
      caseE.controlServer = bindErr ? { error: bindErr.code } : { address: ctl.address() };
      const nodeGet = url => new Promise(resolve => {
        const req = http.get(url, res => { res.resume(); res.on('end', () => resolve({ ok: true, status: res.statusCode })); });
        req.on('error', e => resolve({ ok: false, code: e.code }));
        req.setTimeout(3000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
      });
      const chromeNav = async url => {
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        const sid = await attach(targetId);
        const t0 = Date.now();
        const nav = await send('Page.navigate', { url }, sid).catch(e => ({ cdpError: e.message }));
        await sleep(300);
        const failed = eventsFor(sid, t0).filter(e => e.method === 'Network.loadingFailed');
        await send('Target.closeTarget', { targetId }).catch(() => {});
        return { navigateErrorText: nav.errorText || null, cdpError: nav.cdpError || null, loadingFailed: failed };
      };
      if (!bindErr) {
        const ctlUrl = `http://${lanIp}:${ctl.address().port}/`;
        caseE.node = await nodeGet(ctlUrl);
        caseE.chrome = await chromeNav(ctlUrl);
        ctl.close();
      }
      // 192.0.2.1 es TEST-NET-1 (RFC 5737): nunca enrutable. Sin política restrictiva el resultado
      // esperable es timeout; una denegación inmediata indica un bloqueo del entorno.
      caseE.nodeTestNet = await nodeGet('http://192.0.2.1/');
      caseE.chromeTestNet = await chromeNav('http://192.0.2.1/');
    }
    report.cases.E_networkPolicyControl = caseE;
  }
} catch (e) {
  report.fatal = String(e?.stack || e);
} finally {
  report.serverLogTotal = serverLog.length;
  report.serverStillListening = server.listening;
  send('Browser.close').catch(() => {});
  await new Promise(r => {
    const t = setTimeout(r, 3000);
    proc.once('exit', () => { clearTimeout(t); r(); });
  });
  try { proc.kill(); } catch {}
  report.chrome.exitCode = proc.exitCode;
  report.chrome.killed = proc.killed;
  try { writer.destroy(); reader.destroy(); } catch {}
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  await new Promise(r => server.close(r));
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

const outFile = path.join(OUT_DIR, `cdp_multitab_${Date.now()}.json`);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

// Resumen compacto
const line = (name, c) => {
  if (!c) return `${name}: (no ejecutado)`;
  const r = c.result || {};
  const nav = c.navigate ? (c.navigate.errorText || c.navigate.cdpError || 'ok') : 'n/a';
  const fails = (c.events || []).filter(e => e.method === 'Network.loadingFailed').map(e => `${e.errorText}${e.blockedReason ? '/' + e.blockedReason : ''}`);
  return `${name}: ${r.ok ? 'OK' : 'FALLO'} | navigate=${nav} | hitsServidor=${(c.serverHits || []).length} | loadingFailed=[${fails.join(', ')}] | estado=${JSON.stringify(r.state)}`;
};
console.log('=== DIAGNÓSTICO CDP MULTIPESTAÑA ===');
console.log('Chrome:', report.chrome.version?.product, '| protocolo', report.chrome.version?.protocolVersion);
console.log('Servidor:', JSON.stringify(report.server.address), '| autocomprobación Node:', JSON.stringify(report.nodeSelfCheck));
console.log(line('A raíz -> HTTP', report.cases.A_rootTab));
console.log(line('B createTarget(URL final)', report.cases.B_createTargetFinalUrl));
console.log(line('C about:blank + navigate', report.cases.C_blankThenNavigate));
for (const k of ['D_fourTabs_createTargetFinalUrl', 'D_fourTabs_blankThenNavigate']) {
  const d = report.cases[k];
  if (!d) { console.log(`${k}: (no ejecutado)`); continue; }
  console.log(`${k}: mismoOrigen=${d.sameOrigin} | ` + d.tabs.map(t => `${t.label}=${t.result.ok ? 'OK' : 'FALLO'}(${t.navigate ? (t.navigate.errorText || t.navigate.cdpError || 'nav ok') : 'directo'}, hits=${t.serverHits})`).join(' '));
}
if (report.cases.E_networkPolicyControl) {
  const e = report.cases.E_networkPolicyControl;
  console.log(`E control red (IP LAN ${e.lanIp}): servidor=${JSON.stringify(e.controlServer)} | Node=${JSON.stringify(e.node)} | Chrome=${JSON.stringify(e.chrome)}`);
  console.log(`E control TEST-NET 192.0.2.1: Node=${JSON.stringify(e.nodeTestNet)} | Chrome=${JSON.stringify(e.chromeTestNet)}`);
}
if (report.fatal) console.log('FATAL:', report.fatal);
console.log('Chrome cerrado: exitCode=', report.chrome.exitCode, '| servidor escuchando tras cierre:', server.listening);
console.log('Informe JSON:', outFile);
