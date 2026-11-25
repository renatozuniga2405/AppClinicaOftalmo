// Motor central de motion clínico, sobrio, accesible y reutilizable para AppClinicaOftalmo.
// Centraliza animaciones de entrada, conteos agregados, transiciones de estado y respeto a accesibilidad.
// Sin dependencias externas. Utiliza CSS, requestAnimationFrame y Web Animations API.

// Registro de animaciones activas y ciclos de vida por ámbito (scope)
const activeAnimations = new Map(); // scopeKey -> Set of { cancel, finish }
const activeNumberHandles = new Map(); // cacheKey -> handle
const renderedScopes = new Set(); // Set of "scope:key"
const metricCache = new Map(); // cacheKey -> number
let mediaQueryList = null;
let mutationObserver = null;
let listenersInitialized = false;

/**
 * Comprueba si la reducción de movimiento está activa por sistema o por preferencia de la app.
 * @returns {boolean}
 */
export function isMotionReduced() {
  if (typeof document !== 'undefined') {
    const docEl = document.documentElement;
    if (docEl?.getAttribute('data-reduced-motion') === 'on' || docEl?.dataset?.reducedMotion === 'on') {
      return true;
    }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      // Ignorar fallos de matchMedia en entornos sin DOM completo
    }
  }
  return false;
}

/**
 * Inicializa observadores para reaccionar de inmediato si cambia la preferencia de movimiento.
 */
export function initMotionAccessibilityListeners() {
  if (listenersInitialized || typeof window === 'undefined') return;
  listenersInitialized = true;

  if (typeof window.matchMedia === 'function') {
    try {
      mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMqChange = e => {
        if (e.matches) {
          cancelAllMotion({ applyFinal: true });
        }
      };
      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', handleMqChange);
      } else if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(handleMqChange);
      }
    } catch {
      // ignore
    }
  }

  if (typeof MutationObserver !== 'undefined' && document?.documentElement) {
    try {
      mutationObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
          if (m.type === 'attributes' && (m.attributeName === 'data-reduced-motion' || m.attributeName === 'class')) {
            if (isMotionReduced()) {
              cancelAllMotion({ applyFinal: true });
            }
          }
        }
      });
      mutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-reduced-motion', 'class']
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Determina si la entrada de un módulo debe animarse o si ya fue renderizada en la sesión visual.
 * Evita repeticiones en re-renders internos por búsqueda, filtrado o selección.
 * @param {string} scope - Identificador del módulo (ej. 'dashboard', 'agenda', 'crm', 'automations')
 * @param {string} key - Clave del elemento o subvista (ej. 'entry', 'wf-noshow-recovery')
 * @returns {boolean}
 */
export function shouldAnimateModuleEntry(scope, key = 'entry') {
  if (isMotionReduced()) return false;
  const compositeKey = `${scope}:${key}`;
  if (renderedScopes.has(compositeKey)) {
    return false;
  }
  renderedScopes.add(compositeKey);
  return true;
}

/**
 * Marca manualmente un ámbito como ya renderizado.
 */
export function markMotionRendered(scope, key = 'entry') {
  renderedScopes.add(`${scope}:${key}`);
}

/**
 * Comprueba si un ámbito ya fue marcado como renderizado.
 */
export function hasMotionRendered(scope, key = 'entry') {
  return renderedScopes.has(`${scope}:${key}`);
}

/**
 * Reinicia el estado de un ámbito (por ejemplo al salir de una ruta o cambiar de workflow).
 */
export function resetMotionScope(scope) {
  cancelMotionScope(scope);
  for (const k of [...renderedScopes]) {
    if (k.startsWith(`${scope}:`)) {
      renderedScopes.delete(k);
    }
  }
  for (const key of metricCache.keys()) {
    if (key.startsWith(`${scope}:`)) {
      metricCache.delete(key);
    }
  }
  for (const [key, handle] of [...activeNumberHandles.entries()]) {
    if (key.startsWith(`${scope}:`)) {
      try { handle.finish?.(); } catch {}
      activeNumberHandles.delete(key);
    }
  }
}

/**
 * Restablece todos los ámbitos y cancela animaciones activas (ej. al restablecer la demo o cerrar sesión).
 */
export function resetAllMotionScopes() {
  cancelAllMotion({ applyFinal: true });
  activeNumberHandles.clear();
  renderedScopes.clear();
  metricCache.clear();
}

/**
 * Registra una animación activa para permitir su cancelación limpia.
 */
function registerActiveAnimation(scope, handle) {
  if (!activeAnimations.has(scope)) {
    activeAnimations.set(scope, new Set());
  }
  const set = activeAnimations.get(scope);
  set.add(handle);
  return () => {
    set.delete(handle);
    if (set.size === 0) activeAnimations.delete(scope);
  };
}

/**
 * Cancela todas las animaciones de un ámbito específico.
 */
export function cancelMotionScope(scope, { applyFinal = true } = {}) {
  const set = activeAnimations.get(scope);
  if (!set) return;
  for (const item of [...set]) {
    try {
      if (applyFinal && typeof item.finish === 'function') {
        item.finish();
      } else if (typeof item.cancel === 'function') {
        item.cancel();
      }
    } catch {
      // Ignorar excepciones al cancelar handles
    }
  }
  set.clear();
  activeAnimations.delete(scope);
}

/**
 * Cancela todas las animaciones activas en la aplicación.
 */
export function cancelAllMotion({ applyFinal = true } = {}) {
  for (const scope of [...activeAnimations.keys()]) {
    cancelMotionScope(scope, { applyFinal });
  }
}

/**
 * Anima la entrada sobria de un módulo (encabezado o sección principal).
 * @param {HTMLElement|string} target - Elemento o selector
 * @param {Object} options
 */
export function animateModuleEntry(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return null;
  const {
    scope = 'global',
    key = 'entry',
    duration = 280,
    distance = 6,
    force = false
  } = options;

  if (!force && !shouldAnimateModuleEntry(scope, key)) {
    return null;
  }

  if (isMotionReduced()) {
    el.style.opacity = '1';
    el.style.transform = 'none';
    return null;
  }

  // Animación sobria con Web Animations API si está disponible
  if (typeof el.animate === 'function') {
    let unregister = null;
    const animation = el.animate([
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both'
    });

    const handle = {
      cancel: () => animation.cancel(),
      finish: () => animation.finish()
    };
    unregister = registerActiveAnimation(scope, handle);

    animation.onfinish = () => {
      try {
        animation.commitStyles?.();
        animation.cancel();
      } catch {}
      el.style.opacity = '1';
      el.style.transform = 'none';
      if (unregister) unregister();
    };

    animation.oncancel = () => {
      if (unregister) unregister();
    };

    return animation;
  }

  // Respaldo CSS
  el.classList.add('motion-enter');
  return null;
}

/**
 * Anima un conjunto de tarjetas o elementos con escalonamiento (stagger) limitado.
 * Máximo 6-8 elementos; el resto aparece inmediatamente para no demorar la interacción.
 * @param {Array<HTMLElement>|NodeList|string} elements
 * @param {Object} options
 */
export function animateStagger(elements, options = {}) {
  const list = typeof elements === 'string'
    ? Array.from(document.querySelectorAll(elements))
    : Array.from(elements || []);
  if (!list.length) return [];
  const {
    scope = 'global',
    maxItems = 8,
    staggerMs = 40,
    duration = 260,
    distance = 6
  } = options;

  if (isMotionReduced()) {
    list.forEach(el => {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
    return [];
  }

  const animations = [];
  list.forEach((el, index) => {
    if (!el) return;
    if (index >= maxItems) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const delay = index * staggerMs;
    if (typeof el.animate === 'function') {
      let unregister = null;
      const animation = el.animate([
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], {
        duration,
        delay,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both'
      });

      const handle = {
        cancel: () => animation.cancel(),
        finish: () => animation.finish()
      };
      unregister = registerActiveAnimation(scope, handle);

      animation.onfinish = () => {
        try {
          animation.commitStyles?.();
          animation.cancel();
        } catch {}
        el.style.opacity = '1';
        el.style.transform = 'none';
        if (unregister) unregister();
      };
      animation.oncancel = () => {
        if (unregister) unregister();
      };
      animations.push(animation);
    } else {
      if (el.style?.setProperty) {
        el.style.setProperty('--motion-index', index);
      } else if (el.style) {
        el.style['--motion-index'] = index;
      }
      el.classList?.add?.('motion-enter-stagger');
    }
  });

  return animations;
}

/**
 * Presenta un skeleton breve al entrar a un módulo y revela el contenido real.
 * El contenido ya está disponible y accesible; esta capa evita una aparición
 * brusca y hace perceptible el estado de carga solicitado para la demostración.
 */
export function showModuleLoading(target, options = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host || isMotionReduced()) return null;

  const {
    scope = 'global',
    key = 'module-loading',
    hold = 420,
    exitDuration = 160
  } = options;

  if (!shouldAnimateModuleEntry(scope, key)) return null;
  host.querySelector?.('.module-loading-skeleton')?.remove();

  const layer = document.createElement('div');
  layer.className = 'module-loading-skeleton';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="module-skeleton-line is-short"></div>
    <div class="module-skeleton-line is-title"></div>
    <div class="module-skeleton-line is-medium"></div>
    <div class="module-skeleton-metrics">
      <div class="module-skeleton-card"><i></i><b></b><span></span></div>
      <div class="module-skeleton-card"><i></i><b></b><span></span></div>
      <div class="module-skeleton-card"><i></i><b></b><span></span></div>
      <div class="module-skeleton-card"><i></i><b></b><span></span></div>
    </div>
    <div class="module-skeleton-layout">
      <div class="module-skeleton-panel is-wide"><i></i><i></i><i></i><i></i></div>
      <div class="module-skeleton-panel"><i></i><i></i><i></i></div>
    </div>
  `;

  host.classList.add('module-loading-host');
  host.setAttribute('aria-busy', 'true');
  host.prepend(layer);

  let exitTimer = null;
  let cleanupTimer = null;
  let unregister = null;
  let settled = false;

  const cleanup = () => {
    if (settled) return;
    settled = true;
    if (exitTimer) clearTimeout(exitTimer);
    if (cleanupTimer) clearTimeout(cleanupTimer);
    layer.remove();
    host.classList.remove('module-loading-host');
    host.removeAttribute('aria-busy');
    if (unregister) unregister();
  };

  const finish = () => {
    if (settled) return;
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = null;
    }
    if (isMotionReduced()) {
      cleanup();
      return;
    }
    layer.classList.add('is-leaving');
    cleanupTimer = setTimeout(cleanup, exitDuration);
  };

  const handle = { cancel: cleanup, finish };
  unregister = registerActiveAnimation(scope, handle);
  exitTimer = setTimeout(finish, hold);
  return handle;
}

/**
 * Lista estricta de selectores o patrones que JAMÁS deben ser animados como contadores.
 */
const EXCLUDED_COUNTER_PATTERNS = [
  /dni/i, /doc/i, /telefono/i, /phone/i, /historia/i, /cita/i, /código/i,
  /codigo/i, /reloj/i, /clock/i, /fecha/i, /hora/i, /time/i, /date/i,
  /version/i, /v1/i, /v2/i, /precio/i, /tarifa/i, /monto/i, /otp/i, /token/i
];

/**
 * Anima el conteo progresivo de una métrica agregada.
 * Anima desde el valor anterior si existía (o desde 0 en la primera entrada).
 * Nunca aplica conteo a fechas, horas, relojes, códigos ni datos sensibles.
 * @param {HTMLElement|string} target
 * @param {Object} options
 */
export function animateNumber(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return null;

  const {
    to = 0,
    from = null,
    duration = 600,
    scope = 'global',
    key = null,
    decimals = 0,
    padZeros = 0,
    prefix = '',
    suffix = '',
    formatLocale = 'es-PE',
    useGrouping = true,
    accessibleLabel = null,
    customFormatter = null
  } = options;

  const cacheKey = key || el.id || el.getAttribute('data-motion-key') || `${scope}:${el.className}`;

  if (activeNumberHandles.has(cacheKey)) {
    const prevHandle = activeNumberHandles.get(cacheKey);
    activeNumberHandles.delete(cacheKey);
    try { prevHandle.finish?.(); } catch {}
  }

  // Formateador
  const format = customFormatter ? customFormatter : (val => formatMetricValue(val, { decimals, padZeros, prefix, suffix, formatLocale, useGrouping }));

  // Comprobación de seguridad: excluir explícitamente elementos no permitidos
  const checkText = `${el.id} ${el.className} ${el.getAttribute('aria-label') || ''}`;
  if (EXCLUDED_COUNTER_PATTERNS.some(rx => rx.test(checkText))) {
    // Si contiene patrones de hora/reloj o identificadores, aplicar valor final sin conteo ni agrupación
    el.textContent = customFormatter ? customFormatter(to) : String(to ?? '');
    return null;
  }

  const targetNum = Number(to) || 0;
  const previousCached = metricCache.has(cacheKey) ? metricCache.get(cacheKey) : null;
  const startNum = from !== null
    ? Number(from)
    : (previousCached !== null ? previousCached : targetNum);

  // Actualizar caché para la siguiente llamada
  metricCache.set(cacheKey, targetNum);

  // Si movimiento reducido está activo o los valores son idénticos, aplicar de inmediato
  if (isMotionReduced() || startNum === targetNum) {
    el.textContent = format(targetNum);
    el.removeAttribute?.('aria-busy');
    if (accessibleLabel) el.setAttribute('aria-label', accessibleLabel);
    return null;
  }

  // Interpolación basada en tiempo usando requestAnimationFrame
  let rafId = null;
  let startTime = null;
  let settled = false;

  const finalFormatted = format(targetNum);
  el.setAttribute('aria-busy', 'true');

  const step = timestamp => {
    if (settled) return;
    if (typeof el.isConnected === 'boolean' && !el.isConnected) {
      finish();
      return;
    }
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Easing cúbico hacia fuera (desaceleración suave y clínica)
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentVal = startNum + (targetNum - startNum) * eased;

    el.textContent = format(currentVal);

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      finish();
    }
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    el.textContent = finalFormatted;
    el.removeAttribute('aria-busy');
    if (accessibleLabel) el.setAttribute('aria-label', accessibleLabel);
    if (activeNumberHandles.get(cacheKey) === handle) {
      activeNumberHandles.delete(cacheKey);
    }
    unregister();
  };

  const cancel = () => {
    finish();
  };

  const handle = { cancel, finish };
  const unregister = registerActiveAnimation(scope, handle);
  activeNumberHandles.set(cacheKey, handle);

  rafId = requestAnimationFrame(step);
  return handle;
}

/**
 * Formatea un valor numérico para métricas agregadas.
 */
function formatMetricValue(val, { decimals = 0, padZeros = 0, prefix = '', suffix = '', formatLocale = 'es-PE', useGrouping = true }) {
  const rounded = Number(val).toFixed(decimals);
  let numStr;
  if (decimals === 0 && padZeros > 0) {
    numStr = Math.round(Number(val)).toString().padStart(padZeros, '0');
  } else if (useGrouping && typeof Number.prototype.toLocaleString === 'function') {
    numStr = Number(rounded).toLocaleString(formatLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } else {
    numStr = rounded;
  }
  return `${prefix}${numStr}${suffix}`;
}

/**
 * Aplica una microtransición limpia a un badge o elemento ante un cambio de estado.
 * @param {HTMLElement|string} target
 * @param {Object} options
 */
export function animateStateChange(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el || isMotionReduced()) return null;

  const { duration = 180, scope = 'global' } = options;

  if (typeof el.animate === 'function') {
    let unregister = null;
    const animation = el.animate([
      { transform: 'scale(0.97)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' }
    ], {
      duration,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    });

    const handle = {
      cancel: () => animation.cancel(),
      finish: () => animation.finish()
    };
    unregister = registerActiveAnimation(scope, handle);

    animation.onfinish = () => {
      el.style.transform = 'none';
      if (unregister) unregister();
    };
    animation.oncancel = () => {
      if (unregister) unregister();
    };

    return animation;
  }

  el.classList.add('motion-badge-pulse');
  setTimeout(() => el.classList.remove('motion-badge-pulse'), duration);
  return null;
}

/**
 * Revelado inicial suave de nodos y aristas de un workflow en el constructor visual.
 * Se ejecuta una sola vez al cargar un workflow nuevo; no al mover o seleccionar nodos.
 * @param {HTMLElement} stageEl
 * @param {Array<HTMLElement>} nodeEls
 * @param {Array<SVGElement>} edgeEls
 * @param {Object} options
 */
export function animateWorkflowDiagramEntry(stageEl, nodeEls = [], edgeEls = [], options = {}) {
  if (!stageEl) return null;
  const { workflowId = 'wf', scope = 'automations' } = options;

  if (!shouldAnimateModuleEntry(scope, `diagram:${workflowId}`)) {
    return null;
  }

  if (isMotionReduced()) {
    nodeEls.forEach(n => { if (n) { n.style.opacity = '1'; n.style.transform = 'none'; } });
    edgeEls.forEach(e => { if (e) { e.style.opacity = '1'; } });
    return null;
  }

  // Revelar nodos con escalonamiento limitado a 8 nodos
  const cappedNodes = Array.from(nodeEls || []);
  cappedNodes.forEach((node, i) => {
    if (!node) return;
    if (i < 8 && typeof node.animate === 'function') {
      const anim = node.animate([
        { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], {
        duration: 260,
        delay: i * 35,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both'
      });
      registerActiveAnimation(scope, { cancel: () => anim.cancel(), finish: () => anim.finish() });
      anim.onfinish = () => {
        try { anim.commitStyles?.(); anim.cancel(); } catch {}
        node.style.opacity = '1';
        node.style.transform = 'none';
      };
    } else {
      node.style.opacity = '1';
      node.style.transform = 'none';
    }
  });

  // Revelar aristas progresivamente
  const edges = Array.from(edgeEls || []);
  edges.forEach((edgeGroup, j) => {
    if (!edgeGroup) return;
    if (typeof edgeGroup.animate === 'function') {
      const anim = edgeGroup.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], {
        duration: 320,
        delay: 70 + Math.min(j * 30, 200),
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both'
      });
      registerActiveAnimation(scope, { cancel: () => anim.cancel(), finish: () => anim.finish() });
      anim.onfinish = () => {
        try { anim.commitStyles?.(); anim.cancel(); } catch {}
        edgeGroup.style.opacity = '1';
      };
    }
  });

  return true;
}

// Inicializar automáticamente observadores si estamos en navegador
if (typeof window !== 'undefined') {
  initMotionAccessibilityListeners();
}
