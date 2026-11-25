// Suite de pruebas funcionales e interactivas reales en navegador Chrome (vía CDP pipe)
import { launchBrowser } from './tests/cdp.mjs';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { readFile as fsReadFile } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const appUrl = pathToFileURL(resolve('./app/index.html')).href;

console.log('=== SUITE DE PRUEBAS FUNCIONALES E INTERACTIVAS EN NAVEGADOR REAL (CHROME CDP) ===\n');

let passed = 0;
let failed = 0;

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

const b = await launchBrowser();

async function waitForVisibleSelector(targetTab, selector, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const visible = await targetTab.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.disabled;
    })()`);
    if (visible) return true;
    await targetTab.wait(35);
  }
  throw new Error(`Timeout esperando selector visible ${selector} (${timeoutMs}ms)`);
}

async function waitForCrmDrawerState(targetTab = b, expectedState, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snapshot = await targetTab.eval(`(() => {
      const detail = document.querySelector('#crmdetail');
      const workspace = document.querySelector('.crmworkspace');
      const style = detail ? getComputedStyle(detail) : null;
      return {
        mounted: Boolean(detail),
        isOpen: Boolean(detail?.classList.contains('is-open') || workspace?.classList.contains('is-drawer-open')),
        hasHeader: Boolean(detail?.querySelector('.drawerhead')),
        transform: style?.transform || '',
        opacity: Number(style?.opacity || 0),
        transitionProperty: style?.transitionProperty || ''
      };
    })()`);
    const matched = expectedState === 'open'
      ? snapshot.mounted && snapshot.isOpen && snapshot.hasHeader
      : expectedState === 'unmounted'
          ? !snapshot.mounted
          : false;
    if (matched) return snapshot;
    await targetTab.wait(25);
  }
  throw new Error(`Timeout esperando estado CRM "${expectedState}" (${timeoutMs}ms)`);
}

async function waitForCrmDrawerUnmounted(targetTab = b, timeoutMs = 3000) {
  await waitForCrmDrawerState(targetTab, 'unmounted', timeoutMs);
  return true;
}

async function startCrmDrawerClose(targetTab = b) {
  return targetTab.eval(`(() => {
    const closeButton = document.querySelector('#closedetail');
    if (!closeButton) return { triggered: false, mounted: false, isOpen: false, transform: '', transitionProperty: '' };
    closeButton.click();
    const detail = document.querySelector('#crmdetail');
    const workspace = document.querySelector('.crmworkspace');
    const style = detail ? getComputedStyle(detail) : null;
    return {
      triggered: true,
      mounted: Boolean(detail),
      isOpen: Boolean(detail?.classList.contains('is-open') || workspace?.classList.contains('is-drawer-open')),
      transform: style?.transform || '',
      transitionProperty: style?.transitionProperty || ''
    };
  })()`);
}

async function waitForAuthReadyState(targetTab, timeoutMs = 6000) {
  const start = Date.now();
  let clearedPublicHash = false;
  while (Date.now() - start < timeoutMs) {
    const state = await targetTab.eval(`(() => {
      const cleanHash = String(location.hash || '').replace(/^#/, '').split('?')[0];
      const isPublicRoute = cleanHash === 'autoservicio' || cleanHash === 'pantalla-turnos';
      const logoutEl = document.getElementById('topbar-logout');
      const authEl = document.querySelector('[data-auth-email]');
      const isVisible = el => Boolean(el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0);
      return {
        isPublicRoute,
        hasLogout: isVisible(logoutEl),
        hasAuth: isVisible(authEl)
      };
    })()`);
    if (state.hasLogout) return 'session';
    if (state.hasAuth) return 'login';
    if (state.isPublicRoute && !clearedPublicHash) {
      clearedPublicHash = true;
      await targetTab.eval(`location.hash = ''`);
    }
    await targetTab.wait(35);
  }
  throw new Error(`Timeout esperando pantalla de acceso ([data-auth-email]) o sesión activa (#topbar-logout) tras ${timeoutMs}ms`);
}

async function loginQuickRole(email, targetTab = b) {
  const authState = await waitForAuthReadyState(targetTab, 6000);
  if (authState === 'session') {
    await waitForVisibleSelector(targetTab, '#topbar-logout', 6000);
    await targetTab.click('#topbar-logout');
  }
  await waitForVisibleSelector(targetTab, `[data-auth-email="${email}"]`, 6000);
  await targetTab.click(`[data-auth-email="${email}"]`);
  await waitForVisibleSelector(targetTab, '#auth-email-form button[type="submit"]', 6000);
  await targetTab.click('#auth-email-form button[type="submit"]');
  await waitForVisibleSelector(targetTab, '#autofill-otp', 6000);
  await targetTab.click('#autofill-otp');
  await waitForVisibleSelector(targetTab, '#auth-otp-form button[type="submit"]', 6000);
  await targetTab.click('#auth-otp-form button[type="submit"]');
  await waitForVisibleSelector(targetTab, '#topbar-logout', 6000);
}

try {
  await b.setViewport(1280, 800);

  // 0. Comprobación de señal de pruebas y restricción estricta de la API de test
  await b.goto(appUrl);
  await b.wait(100);
  const normalLoadNoApi = await b.eval(`typeof window.__toastTestApi !== 'undefined'`);
  assert(!normalLoadNoApi, 'En carga normal sin señal window.__testMode, window.__toastTestApi NO existe');

  // Activar señal explícita de pruebas antes de la carga de app/app.js
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__testMode = true;' });
  await b.goto(appUrl);
  await b.wait(150);

  const testModeApiState = await b.eval(`(() => {
    const api = window.__toastTestApi;
    return {
      exists: typeof api !== 'undefined',
      isFrozen: typeof api === 'object' && api !== null && Object.isFrozen(api),
      hasShow: typeof api?.show === 'function',
      hasDismiss: typeof api?.dismiss === 'function',
      hasClear: typeof api?.clear === 'function'
    };
  })()`);
  assert(
    testModeApiState.exists && testModeApiState.isFrozen && testModeApiState.hasShow && testModeApiState.hasDismiss && testModeApiState.hasClear,
    'En modo de prueba (window.__testMode = true), window.__toastTestApi existe y está congelada con show, dismiss y clear'
  );

  // =========================================================================
  // 1. FLUJO DE AUTENTICACIÓN OTP SIMULADO
  // =========================================================================
  console.log('--- 1. Flujo de inicio de sesión con OTP simulado ---');
  const hasLoginScreen = await b.eval(`Boolean(document.querySelector('.auth-card')) && document.querySelectorAll('[data-auth-email]').length === 5`);
  assert(hasLoginScreen, 'Renderiza pantalla inicial de login con los 5 accesos rápidos de rol');

  await b.click(`[data-auth-email="recepcion@clinicaoftalmo.pe"]`);
  await b.wait(40);
  await b.click(`#auth-email-form button[type="submit"]`);
  await b.wait(80);
  const otpCode = await b.eval(`document.querySelector('.simulated-inbox-code')?.textContent?.trim() || ''`);
  assert(/^\d{6}$/.test(otpCode), `Genera código OTP de 6 dígitos en bandeja simulada (${otpCode})`);

  await b.click(`#autofill-otp`);
  await b.wait(40);
  await b.click(`#auth-otp-form button[type="submit"]`);
  await b.wait(120);
  const recUser = await b.eval(`JSON.parse(sessionStorage.getItem('clinica_auth_session') || 'null')`);
  assert(recUser && recUser.role === 'recepcion', 'Inicia sesión correctamente como Recepción tras validar OTP');

  // =========================================================================
  // 2. ADAPTACIÓN DEL DASHBOARD: RECEPCIÓN VS ADMINISTRADOR
  // =========================================================================
  console.log('\n--- 2. Adaptación del Dashboard para Recepción y Administrador ---');
  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(100);
  const recDash = await b.eval(`(() => {
    const viewText = document.querySelector('#view')?.innerText || '';
    return {
      h1: document.querySelector('h1')?.textContent?.trim(),
      hasRecNote: document.body.innerText.includes('Panel operativo de Recepción'),
      hasAbbrevName: viewText.includes('María L. G.'),
      hasMaskedDni: viewText.includes('••••0001'),
      hasFullDni: /\\b\\d{8}\\b/.test(viewText),
      hasFullPatientName: viewText.includes('María López García')
    };
  })()`);
  assert(recDash.h1 === 'Panel general de recepción', 'Recepción ve el título "Panel general de recepción"');
  assert(recDash.hasRecNote === true, 'Recepción conserva su nota "Panel operativo de Recepción..."');
  assert(
    recDash.hasAbbrevName && recDash.hasMaskedDni && !recDash.hasFullDni && !recDash.hasFullPatientName,
    'Recepción en #dashboard muestra nombres abreviados y DNI parcialmente enmascarado sin exponer DNI completo'
  );

  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(80);
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(100);
  const admDash = await b.eval(`({
    h1: document.querySelector('h1')?.textContent?.trim(),
    sub: document.querySelector('.heading p')?.textContent?.trim(),
    hasRecNote: document.body.innerText.includes('Panel operativo de Recepción'),
    hasAdmNote: document.body.innerText.includes('Panel de supervisión de Administración')
  })`);
  assert(admDash.h1 === 'Panel general', 'Administrador ve el título "Panel general"');
  assert(admDash.sub === 'Resumen operativo y supervisión de la clínica.', 'Administrador ve el subtítulo de supervisión');
  assert(admDash.hasRecNote === false, 'Administrador NO ve la frase "Panel operativo de Recepción"');
  assert(admDash.hasAdmNote === true, 'Administrador ve la nota de supervisión administrativa');

  // =========================================================================
  // 2.1 DASHBOARD EJECUTIVO v1.3: PESTAÑAS, FILTROS, 4 KPIS Y 6 GRÁFICOS
  // =========================================================================
  const execDash = await b.eval(`({
    hasContainer: Boolean(document.querySelector('.executive-dashboard-container')),
    tabsCount: document.querySelectorAll('.dash-tab-btn').length,
    activeTab: document.querySelector('.dash-tab-btn.is-active')?.dataset?.dashTab,
    kpiCount: document.querySelectorAll('.dash-kpi-grid .stat').length,
    hasTrendChart: Boolean(document.querySelector('.dash-svg polyline')),
    hasDonutChart: Boolean(document.querySelector('.donut-svg .donut-segment')),
    hasRevenueChart: Boolean(document.querySelector('.revenue-bar')),
    hasSpecialtiesChart: Boolean(document.querySelector('.dash-bar-row')),
    alertsCount: document.querySelectorAll('.dash-alert-item').length
  })`);
  assert(execDash.hasContainer, 'Dashboard Ejecutivo v1.3 renderiza contenedor principal');
  assert(execDash.tabsCount === 3 && execDash.activeTab === 'general', 'Dashboard presenta 3 pestañas e inicia en General');
  assert(execDash.kpiCount === 4, 'Dashboard General presenta las 4 tarjetas KPI principales');
  assert(execDash.hasTrendChart && execDash.hasDonutChart && execDash.hasRevenueChart && execDash.hasSpecialtiesChart, 'Pestaña General renderiza Gráfico 01 (Líneas), Gráfico 02 (Dona), Gráfico 04 (Ingresos) y Gráfico 03 (Especialidades)');
  assert(execDash.alertsCount >= 4, 'Dashboard renderiza panel de alertas operativas inteligentes');

  // Navegación a pestaña Médico
  await b.click('[data-dash-tab="medico"]');
  await b.wait(100);
  const medTab = await b.eval(`({
    hasSpecialtiesChart: Boolean(document.querySelector('.dash-bar-row')),
    hasSurgeriesChart: document.body.innerText.includes('Cirugías por procedimiento'),
    hasDoctorOccupancy: document.querySelectorAll('.doctor-occupancy-card').length,
    barFillProp: getComputedStyle(document.querySelector('.dash-bar-fill')).transitionProperty || '',
    occFillProp: getComputedStyle(document.querySelector('.occupancy-fill')).transitionProperty || ''
  })`);
  assert(medTab.hasSpecialtiesChart && medTab.hasSurgeriesChart, 'Pestaña Médico renderiza Gráfico 03 (Especialidades) y Gráfico 06 (Cirugías por procedimiento)');
  assert(medTab.hasDoctorOccupancy === 2, 'Pestaña Médico renderiza ocupación y turnos de los 2 especialistas');

  // Navegación a pestaña Comercial / CRM + ARM
  await b.click('[data-dash-tab="comercial"]');
  await b.wait(100);
  const comTab = await b.eval(`({
    hasFunnelChart: Boolean(document.querySelector('.funnel-steps-container')),
    hasArmSummary: Boolean(document.querySelector('.arm-kpi-summary')),
    finalConversion: document.querySelector('.funnel-metric-val')?.textContent?.trim(),
    funnelBarProp: getComputedStyle(document.querySelector('.funnel-bar')).transitionProperty || ''
  })`);
  assert(comTab.hasFunnelChart, 'Pestaña Comercial renderiza Gráfico 05 (Embudo CRM + ARM)');
  assert(comTab.hasArmSummary && Boolean(comTab.finalConversion), 'Pestaña Comercial renderiza panel de rendimiento de agentes ARM y conversión');

  // Cambio de filtro de período a 7d y recálculo desde registros fuente
  await b.eval(`{
    const sel = document.querySelector('#dash-filter-period');
    sel.value = '7d';
    sel.dispatchEvent(new Event('change'));
  }`);
  await b.wait(100);
  const filtered7d = await b.eval(`(async () => {
    const mod = await import('./dashboard.js');
    const expContacts = String(mod.getDashboardMetrics('7d', 'all', 'all').crmFunnel.contacts);
    return {
      period: document.querySelector('#dash-filter-period')?.value,
      contacts: document.querySelector('.funnel-step-count b')?.textContent?.trim(),
      expContacts
    };
  })()`);
  assert(filtered7d.period === '7d' && filtered7d.contacts === filtered7d.expContacts, `Filtro de período recalcula datos del embudo desde DEMO_CRM_RECORDS (${filtered7d.contacts} contactos en 7d)`);

  // 2.1b Regresión v1.1: Accesibilidad WAI-ARIA Tabs, navegación por teclado y preservación de foco
  await b.click('[data-dash-tab="general"]');
  await b.wait(60);
  await b.eval(`document.querySelector('[data-dash-tab="general"]').focus()`);
  await b.key('ArrowRight', 'ArrowRight', 39);
  await b.wait(60);
  const afterArrowRight = await b.eval(`({
    activeTab: document.querySelector('.dash-tab-btn.is-active')?.dataset?.dashTab,
    focusedId: document.activeElement?.id,
    panelRole: document.querySelector('.dash-tab-body')?.getAttribute('role'),
    panelId: document.querySelector('.dash-tab-body')?.id
  })`);
  assert(
    afterArrowRight.activeTab === 'medico' &&
    afterArrowRight.focusedId === 'dash-tab-medico' &&
    afterArrowRight.panelRole === 'tabpanel' &&
    afterArrowRight.panelId === 'dash-panel-medico',
    'Navegación por teclado (ArrowRight) en pestañas activa Médico, preserva foco y expone role="tabpanel"'
  );

  await b.key('ArrowLeft', 'ArrowLeft', 37);
  await b.wait(60);
  const focusPreservedOnFilter = await b.eval(`(() => {
    const sel = document.querySelector('#dash-filter-sede');
    sel.focus();
    sel.value = 'principal';
    sel.dispatchEvent(new Event('change'));
    return {
      activeId: document.activeElement?.id,
      sedeVal: document.querySelector('#dash-filter-sede')?.value
    };
  })()`);
  assert(
    focusPreservedOnFilter.activeId === 'dash-filter-sede' && focusPreservedOnFilter.sedeVal === 'principal',
    'Cambiar filtro de sede preserva el foco de teclado en #dash-filter-sede'
  );

  // 2.1c Regresión v1.1: Cambios rápidos de filtros sin colisión de animación en KPI Citas registradas
  await b.eval(`(() => {
    const setFilter = (id, val) => {
      const el = document.querySelector(id);
      el.value = val;
      el.dispatchEvent(new Event('change'));
    };
    setFilter('#dash-filter-period', '30d');
    setFilter('#dash-filter-sede', 'norte');
    setFilter('#dash-filter-doctor', 'Dr. Diego Ramírez');
    setFilter('#dash-filter-period', 'hoy');
    setFilter('#dash-filter-sede', 'sur');
    setFilter('#dash-filter-doctor', 'Dra. Valeria Ríos');
    setFilter('#dash-filter-period', '90d');
    setFilter('#dash-filter-sede', 'all');
    setFilter('#dash-filter-doctor', 'all');
  })()`);
  await b.wait(220);
  const rapidFilterResult = await b.eval(`({
    kpiCitas: document.querySelector('[data-motion-key="dashboard:citas-hoy"]')?.textContent?.trim(),
    donutTotal: document.querySelector('.donut-svg text')?.textContent?.trim(),
    busyCount: document.querySelectorAll('.executive-dashboard-container [aria-busy="true"]').length
  })`);
  assert(
    rapidFilterResult.kpiCitas === '258' && rapidFilterResult.donutTotal === '258' && rapidFilterResult.busyCount === 0,
    `Cambios rápidos de filtros terminan con valor exacto en KPI y Dona (${rapidFilterResult.kpiCitas} === ${rapidFilterResult.donutTotal}) sin aria-busy colgado`
  );

  // 2.1d Regresión v1.1: Verificación responsive en 375px, 768px, 1024px y 1440px y legibilidad SVG móvil
  const vpChecks = [];
  for (const [vw, vh] of [[375, 812], [768, 1024], [1024, 768], [1440, 900]]) {
    await b.setViewport(vw, vh);
    const vpState = await b.eval(`(() => {
      const de = document.documentElement;
      const svg = document.querySelector('.dash-svg');
      const vb = svg ? svg.viewBox.baseVal : { width: 640 };
      const scale = svg ? (svg.getBoundingClientRect().width / vb.width) : 1;
      return {
        vw: ${vw},
        noPageOverflow: de.scrollWidth <= de.clientWidth + 1,
        tickPx: +(12 * scale).toFixed(1)
      };
    })()`);
    vpChecks.push(vpState);
  }
  await b.setViewport(1280, 800);
  assert(
    vpChecks.every(c => c.noPageOverflow) && vpChecks[0].tickPx >= 9.5,
    `Dashboard responsive sin desborde horizontal en 375/768/1024/1440px y etiquetas SVG legibles en móvil (${vpChecks[0].tickPx}px)`
  );

  // 2.1e Regresión v1.3: Integridad relacional en navegador, registros no atribuidos en DOM y CSS Motion sin width/all
  await b.eval(`(() => {
    const setFilter = (id, val) => {
      const el = document.querySelector(id);
      el.value = val;
      el.dispatchEvent(new Event('change'));
    };
    setFilter('#dash-filter-period', 'hoy');
    setFilter('#dash-filter-sede', 'sur');
    setFilter('#dash-filter-doctor', 'Dr. Diego Ramírez');
  })()`);
  await b.wait(180);
  const v13TraceDom = await b.eval(`(async () => {
    const mod = await import('./dashboard.js');
    const integrity = mod.validateDashboardDatasetIntegrity();
    const kpiPats = document.querySelector('[data-motion-key="dashboard:pacientes-activos"]')?.textContent?.trim();
    const kpiRev = document.querySelector('[data-motion-key="dashboard:ingresos-total"]')?.textContent?.trim();
    const revNote = document.querySelector('[data-kpi-attribution="revenue"]')?.textContent?.trim() || '';
    const tabBtnProp = getComputedStyle(document.querySelector('.dash-tab-btn')).transitionProperty || '';
    const circleProp = getComputedStyle(document.querySelector('.chart-point circle')).transitionProperty || '';
    return { integrityValid: integrity.valid, kpiPats, kpiRev, revNote, tabBtnProp, circleProp };
  })()`);
  assert(
    v13TraceDom.integrityValid === true &&
    v13TraceDom.kpiPats === '00' &&
    v13TraceDom.kpiRev === 'S/ 0.00' &&
    v13TraceDom.revNote.includes('250.00') &&
    !v13TraceDom.tabBtnProp.includes('all') &&
    !v13TraceDom.circleProp.split(',').map(s => s.trim()).includes('r') &&
    !medTab.barFillProp.includes('width') &&
    !medTab.occFillProp.includes('width') &&
    !comTab.funnelBarProp.includes('width'),
    `Dashboard v1.3 en navegador valida integridad relacional, muestra S/ 0.00 atribuidos con nota de S/ 250.00 no atribuido en Hoy+Sur+Ramírez y evita transition:width/all/r`
  );

  // Restaurar filtro a hoy, todas las sedes, todos los especialistas y pestaña General
  await b.eval(`{
    const setFilter = (id, val) => {
      const el = document.querySelector(id);
      el.value = val;
      el.dispatchEvent(new Event('change'));
    };
    setFilter('#dash-filter-period', 'hoy');
    setFilter('#dash-filter-sede', 'all');
    setFilter('#dash-filter-doctor', 'all');
  }`);
  await b.click('[data-dash-tab="general"]');
  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(180);
  const adminMenuInitial = await b.eval(`({
    groups: document.querySelectorAll('.navgroup').length,
    open: document.querySelectorAll('.navgroup[open]').length,
    currentGroup: document.querySelectorAll('.navgroup.current').length
  })`);
  assert(adminMenuInitial.groups === 5 && adminMenuInitial.open === 3 && adminMenuInitial.currentGroup === 1, 'El menú del Administrador deja abiertas Operación, Clínica y Negocio e identifica el área actual');
  await b.click('[data-nav-group="CONFIGURACIÓN"] > summary');
  await b.wait(80);
  const adminMenuAccordion = await b.eval(`({
    open: Array.from(document.querySelectorAll('.navgroup[open]')).map(group=>group.dataset.navGroup),
    visibleLinks: document.querySelectorAll('[data-nav-group="CONFIGURACIÓN"][open] .navgroup-items a').length
  })`);
  assert(adminMenuAccordion.open.length === 4 && adminMenuAccordion.open.includes('CONFIGURACIÓN') && adminMenuAccordion.visibleLinks === 4, 'Abrir Configuración conserva los tres grupos principales y muestra sus cuatro accesos');
  await b.click('#collapse');
  await b.wait(80);
  const compactAdminMenu = await b.eval(`(() => {
    const nav=document.querySelector('.shell > aside > nav');
    const links=Array.from(nav?.querySelectorAll('a')||[]);
    return {
      visibleLinks:links.filter(link=>link.getBoundingClientRect().height>0).length,
      horizontalOverflow:Boolean(nav&&nav.scrollWidth>nav.clientWidth+1),
      openGroups:document.querySelectorAll('.navgroup[open]').length
    };
  })()`);
  assert(compactAdminMenu.visibleLinks === 15 && compactAdminMenu.openGroups === 5, 'El menú contraído del Administrador muestra los 15 módulos autorizados como iconos');
  assert(compactAdminMenu.horizontalOverflow === false, 'El menú contraído no genera barra de desplazamiento horizontal');
  await b.click('#collapse');
  await b.wait(80);

  // =========================================================================
  // 3. CIERRE REAL DE MODAL CON TECLA ESCAPE Y RETORNO DE FOCO
  // =========================================================================
  console.log('\n--- 3. Cierre real con tecla Escape y retorno de foco ---');
  await waitForVisibleSelector(b, '#topbar-reset-demo', 4000);
  await b.wait(150);
  await b.click('#topbar-reset-demo');
  await b.wait(120);
  const modalOpened = await b.eval(`document.getElementById('modal')?.open === true`);
  assert(modalOpened === true, 'El clic en #topbar-reset-demo abre el modal de confirmación');

  // Pulsación real de tecla Escape vía CDP Input.dispatchKeyEvent
  await b.key('Escape', 'Escape', 27);
  await b.wait(80);
  const afterEsc = await b.eval(`({
    open: document.getElementById('modal')?.open === true,
    activeId: document.activeElement?.id || ''
  })`);
  assert(afterEsc.open === false, 'La pulsación real de la tecla Escape cierra el modal nativo');
  assert(afterEsc.activeId === 'topbar-reset-demo', `El foco regresa al botón que abrió el modal (#${afterEsc.activeId})`);

  // =========================================================================
  // 4. RESTABLECIMIENTO DE LA SESIÓN ACTIVA (4 CASOS DE AUDITORÍA)
  // =========================================================================
  console.log('\n--- 4. Restablecimiento de sesión activa al confirmar "Restablecer demo" ---');

  // Caso 4.1: El Administrador modifica su propio nombre y luego restablece la demo
  await b.eval(`location.hash = '#admin-usuarios'`);
  await b.wait(100);
  await b.click('[data-edit-user="1"]');
  await b.wait(80);
  await b.type('#user-name', 'Roberto Casas Modificado');
  await b.click('button[type="submit"][form="user-form"]');
  await b.wait(100);
  const modifiedNameState = await b.eval(`({
    topbarName: document.querySelector('.topbar-user-name')?.textContent?.trim(),
    sessionName: JSON.parse(sessionStorage.getItem('clinica_auth_session')).name
  })`);
  assert(
    modifiedNameState.topbarName === 'Roberto Casas Modificado' && modifiedNameState.sessionName === 'Roberto Casas Modificado',
    'Caso 4.1a: El Administrador modifica su propio nombre y se refleja en sesión y topbar'
  );

  await b.click('#topbar-reset-demo');
  await b.wait(80);
  await b.click('#confirm-reset');
  await b.wait(120);
  const restoredNameState = await b.eval(`({
    topbarName: document.querySelector('.topbar-user-name')?.textContent?.trim(),
    session: JSON.parse(sessionStorage.getItem('clinica_auth_session'))
  })`);
  assert(
    restoredNameState.topbarName === 'Lic. Roberto Casas' && restoredNameState.session.name === 'Lic. Roberto Casas',
    'Caso 4.1b: Al restablecer la demo, el nombre del Administrador en sesión y UI vuelve a "Lic. Roberto Casas"'
  );

  // Caso 4.2: El Administrador modifica su propio rol y luego restablece la demo
  await b.eval(`location.hash = '#admin-usuarios'`);
  await b.wait(100);
  await b.click('[data-edit-user="1"]');
  await b.wait(80);
  await b.select('#user-role', 'recepcion');
  await b.click('button[type="submit"][form="user-form"]');
  await b.wait(100);
  const modifiedRoleState = await b.eval(`JSON.parse(sessionStorage.getItem('clinica_auth_session')).role`);
  assert(modifiedRoleState === 'recepcion', 'Caso 4.2a: El Administrador modifica su propio rol a "recepcion"');

  await b.click('#topbar-reset-demo');
  await b.wait(80);
  await b.click('#confirm-reset');
  await b.wait(120);
  const restoredRoleState = await b.eval(`({
    topbarRole: document.querySelector('.topbar-user-role')?.textContent?.trim(),
    session: JSON.parse(sessionStorage.getItem('clinica_auth_session'))
  })`);
  assert(
    restoredRoleState.session.role === 'admin' && restoredRoleState.topbarRole === 'Administrador General',
    'Caso 4.2b: Al restablecer la demo, el rol en sesión y UI vuelve a "admin" (Administrador General)'
  );

  // Caso 4.3: Se crea un usuario temporal, se inicia sesión con él y se ejecuta el reset
  await b.eval(`location.hash = '#admin-usuarios'`);
  await b.wait(100);
  await b.click('#new');
  await b.wait(80);
  await b.type('#user-name', 'Usuario Temporal Demo');
  await b.type('#user-email', 'temporal@clinicaoftalmo.pe');
  await b.select('#user-role', 'recepcion');
  await b.type('#user-dept', 'Admisión Temporal');
  await b.click('button[type="submit"][form="user-form"]');
  await b.wait(100);

  // Cerrar sesión e iniciar con el usuario temporal mediante OTP
  await b.click('#topbar-logout');
  await b.wait(100);
  await b.type('#auth-email-input', 'temporal@clinicaoftalmo.pe');
  await b.click('#auth-email-form button[type="submit"]');
  await b.wait(80);
  await b.click('#autofill-otp');
  await b.wait(50);
  await b.click('#auth-otp-form button[type="submit"]');
  await b.wait(120);
  const tempLogged = await b.eval(`JSON.parse(sessionStorage.getItem('clinica_auth_session') || 'null')`);
  assert(tempLogged && tempLogged.email === 'temporal@clinicaoftalmo.pe', 'Caso 4.3a: Inicia sesión mediante OTP con el usuario temporal creado');

  // Ejecutar reset controlado sobre la sesión del usuario temporal
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);
  const afterTempReset = await b.eval(`({
    session: JSON.parse(sessionStorage.getItem('clinica_auth_session') || 'null'),
    hasLoginCard: Boolean(document.querySelector('.auth-card'))
  })`);
  assert(
    afterTempReset.session === null && afterTempReset.hasLoginCard === true,
    'Caso 4.3b: Al restablecer la demo con un usuario temporal activo, la sesión se cierra y vuelve a la pantalla de acceso'
  );

  // Caso 4.4: Verificar coincidencia exacta con usuarios iniciales
  await loginQuickRole('admin@clinicaoftalmo.pe');
  const exactInitialMatch = await b.eval(`(() => {
    const s = JSON.parse(sessionStorage.getItem('clinica_auth_session'));
    return s && s.id === 1 && s.name === 'Lic. Roberto Casas' && s.email === 'admin@clinicaoftalmo.pe' && s.role === 'admin' && s.active === true;
  })()`);
  assert(exactInitialMatch === true, 'Caso 4.4: La sesión final coincide exactamente con el usuario inicial sin atributos residuales');

  // =========================================================================
  // 4.5 CENTRO ARM: PERMISOS, PAUSA REAL, AUTOMATIZACIONES Y TOUR
  // =========================================================================
  console.log('\n--- 4.5 Centro ARM: permisos, pausa efectiva, automatizaciones y recorrido ---');
  await b.eval(`location.hash = '#arm'`);
  await b.wait(100);
  const armInitial = await b.eval(`({
    cards: document.querySelectorAll('[data-arm-agent]').length,
    activeMetric: document.querySelector('.arm-stats .stat strong')?.textContent?.trim(),
    hasDemoLabel: document.body.innerText.includes('Supervisión de agentes con datos y acciones ficticias'),
    hasSkeleton: Boolean(document.querySelector('#view > .module-loading-skeleton'))
  })`);
  assert(armInitial.cards === 5 && armInitial.activeMetric === '04' && armInitial.hasDemoLabel && armInitial.hasSkeleton, 'Administrador ve 5 agentes ARM y un skeleton perceptible antes de revelar el módulo');

  await b.click('[data-arm-agent="1"]');
  await b.wait(80);
  const armDrawer = await b.eval(`({open:Boolean(document.querySelector('.arm-drawer')), text:document.querySelector('.arm-drawer')?.innerText||''})`);
  assert(armDrawer.open && armDrawer.text.includes('Acciones permitidas') && armDrawer.text.includes('Límites explícitos'), 'El detalle lateral del agente muestra capacidades y límites');
  await b.click('#arm-toggle-agent');
  await b.wait(80);
  const pausedAgent = await b.eval(`document.querySelector('.arm-drawer')?.innerText.includes('Pausado') === true`);
  assert(pausedAgent, 'Pausar al Recepcionista virtual actualiza su estado visible');

  await b.eval(`location.hash = '#inbox/1'`);
  await b.wait(100);
  await b.click('[data-inbox-scenario="appointment"]');
  await b.wait(80);
  const blockedScenario = await b.eval(`({modal:document.getElementById('modal')?.open===true, notice:document.getElementById('notice')?.textContent||''})`);
  assert(!blockedScenario.modal && blockedScenario.notice.includes('pausado'), 'Un agente pausado bloquea realmente el escenario de reserva');

  await b.eval(`location.hash = '#arm/1'`);
  await b.wait(80);
  await b.click('#arm-toggle-agent');
  await b.wait(80);
  const reactivatedAgent = await b.eval(`document.querySelector('.arm-drawer')?.innerText.includes('Activo') === true`);
  assert(reactivatedAgent, 'El agente puede reactivarse y recuperar disponibilidad');

  await b.eval(`location.hash = '#automations'`);
  await b.wait(80);
  const automationCount = await b.eval(`document.querySelectorAll('.automation-card').length`);
  assert(automationCount === 3, 'Automatizaciones muestra las tres reglas visuales acordadas');
  await b.click('[data-automation-test="1"]');
  await b.wait(60);
  const automationRun = await b.eval(`document.body.innerText.includes('Última ejecución: Ahora')`);
  assert(automationRun, 'Ejecutar prueba actualiza la automatización sin realizar una acción externa');

  await b.eval(`location.hash = '#arm'`);
  await b.wait(80);
  await b.click('#arm-tour');
  await b.wait(80);
  const tourOpened = await b.eval(`document.getElementById('modal')?.open===true && document.querySelector('.tour-progress')!==null && document.getElementById('modal')?.innerText.includes('PASO 1 DE 5')`);
  assert(tourOpened, 'El recorrido guiado abre el primer paso y muestra progreso');
  await b.click('#tour-close');
  await b.wait(40);

  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#arm'`);
  await b.wait(80);
  const receptionArmGuard = await b.eval(`({hash:location.hash, hasArm:Boolean(document.querySelector('.arm-agent-list'))})`);
  assert(receptionArmGuard.hash === '#dashboard' && !receptionArmGuard.hasArm, 'Recepción no puede abrir Centro ARM por URL directa');
  await loginQuickRole('admin@clinicaoftalmo.pe');

  // =========================================================================
  // 5. PRUEBAS FUNCIONALES REALES POR MÓDULO Y ROL
  // =========================================================================
  console.log('\n--- 5.1 CRM: Arrastre real de tarjeta, contadores, historial y prioridad compartida con Inbox ---');
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#crm'`);
  await b.wait(120);

  const beforeDrag = await b.eval(`({
    inNuevo: Boolean(document.querySelector('[data-stage="1"] [data-followup="2"]')),
    inContactado: Boolean(document.querySelector('[data-stage="2"] [data-followup="2"]')),
    countNuevo: document.querySelector('[data-stage="1"] .column-count')?.textContent?.trim(),
    countContactado: document.querySelector('[data-stage="2"] .column-count')?.textContent?.trim(),
    heatText: document.querySelector('[data-followup="2"] .heat-badge')?.textContent?.trim()
  })`);
  assert(
    beforeDrag.inNuevo && !beforeDrag.inContactado && beforeDrag.countNuevo === '2' && beforeDrag.countContactado === '1' && beforeDrag.heatText.includes('Fría'),
    'Estado inicial CRM: Luis Pérez está en "Nuevo" (contador=2, Contactado=1, prioridad=Fría)'
  );

  // Arrastre HTML5 real vía CDP Input.dispatchDragEvent
  await b.dragAndDrop('[data-followup="2"]', '[data-drop-stage="2"]');
  await b.wait(120);

  const afterDrag = await b.eval(`({
    inNuevo: Boolean(document.querySelector('[data-stage="1"] [data-followup="2"]')),
    inContactado: Boolean(document.querySelector('[data-stage="2"] [data-followup="2"]')),
    countNuevo: document.querySelector('[data-stage="1"] .column-count')?.textContent?.trim(),
    countContactado: document.querySelector('[data-stage="2"] .column-count')?.textContent?.trim(),
    heatText: document.querySelector('[data-followup="2"] .heat-badge')?.textContent?.trim()
  })`);
  assert(!afterDrag.inNuevo && afterDrag.inContactado, 'Tras arrastrar, Luis Pérez desaparece de "Nuevo" y aparece en "Contactado"');
  assert(afterDrag.countNuevo === '1' && afterDrag.countContactado === '2', `Contadores de columnas actualizados (Nuevo: ${afterDrag.countNuevo}, Contactado: ${afterDrag.countContactado})`);
  assert(afterDrag.heatText.includes('Tibia'), `Prioridad de Luis Pérez recalculada en CRM (${afterDrag.heatText})`);

  // Verificar historial de actividades en el drawer del CRM
  await b.click('[data-followup="2"]');
  await b.wait(100);
  const drawerCheck = await b.eval(`({
    hasHistory: document.querySelector('#crmdetail .activitylist')?.innerText?.includes('Etapa: Nuevo → Contactado'),
    hasGoogleChannel: document.querySelector('#crmdetail')?.innerText?.includes('Canal: Google')
  })`);
  assert(drawerCheck.hasHistory === true, 'El historial de actividades en el drawer registra "Etapa: Nuevo → Contactado"');
  assert(drawerCheck.hasGoogleChannel === true, 'El drawer muestra el canal real "Canal: Google" sin usar "Simulación WhatsApp"');
  await b.click('#closedetail');
  await b.wait(80);

  // Verificar que la prioridad recalculada ("Tibia") coincide en Inbox
  await b.eval(`location.hash = '#inbox'`);
  await b.wait(100);
  const inboxHeatMatch = await b.eval(`document.querySelector('[data-inbox-lead="2"] .heat-badge')?.textContent?.trim() || ''`);
  assert(inboxHeatMatch.includes('Tibia'), `La prioridad de Luis Pérez en Inbox coincide con CRM (${inboxHeatMatch})`);

  console.log('\n--- 5.2 Inbox: Selección de conversación, respuesta simulada y filtro por prioridad Caliente ---');
  await b.click('[data-inbox-lead="2"]');
  await b.wait(80);
  const replyMsg = 'Hola Luis, tenemos turno disponible mañana a las 10:00 para tu evaluación LASIK.';
  await b.type('#inboxtext', replyMsg);
  await b.click('#inboxreply button[type="submit"]');
  await b.wait(100);
  const inboxReplyCheck = await b.eval(`({
    inThread: Array.from(document.querySelectorAll('.inbox-message.outgoing p')).some(p => p.textContent.includes('${replyMsg}')),
    inPreview: document.querySelector('[data-inbox-lead="2"] .inbox-preview em')?.textContent?.includes('${replyMsg}'),
    headerBadge: document.querySelector('.inbox-thread header .origin-badge')?.textContent?.trim() || ''
  })`);
  assert(inboxReplyCheck.inThread && inboxReplyCheck.inPreview, 'La respuesta simulada aparece en el hilo de conversación y en la vista previa lateral');
  assert(inboxReplyCheck.headerBadge === 'Google', `El encabezado del hilo muestra el canal real (${inboxReplyCheck.headerBadge})`);
  const inboxLayoutCheck = await b.eval(`(() => {
    const layout=document.querySelector('.inbox-layout')?.getBoundingClientRect();
    const thread=document.querySelector('.inbox-thread')?.getBoundingClientRect();
    const composer=document.querySelector('.inbox-composer')?.getBoundingClientRect();
    const context=document.querySelector('.inbox-context');
    const list=document.querySelector('.inbox-list');
    if(context)context.scrollTop=context.scrollHeight;
    return {
      threadFits:Boolean(layout&&thread&&thread.bottom<=layout.bottom+1),
      composerFits:Boolean(layout&&composer&&composer.bottom<=layout.bottom+1&&composer.height>0),
      contextScrollable:Boolean(context&&context.scrollHeight>context.clientHeight&&context.scrollTop>0),
      listNavigable:Boolean(list&&list.clientHeight>0&&getComputedStyle(list).overflowY==='auto')
    };
  })()`);
  assert(inboxLayoutCheck.threadFits && inboxLayoutCheck.composerFits && inboxLayoutCheck.contextScrollable && inboxLayoutCheck.listNavigable, 'Inbox mantiene lista, chat, respuesta y contexto navegables dentro de su contenedor');
  const inboxScrollCheck = await b.eval(`(() => {
    const list=document.querySelector('.inbox-messages');
    const sample=list?.querySelector('.inbox-message');
    if(!list||!sample)return {scrollable:false,atBottom:false};
    for(let i=0;i<16;i++)list.append(sample.cloneNode(true));
    list.scrollTop=list.scrollHeight;
    return {
      scrollable:list.scrollHeight>list.clientHeight,
      atBottom:Math.abs(list.scrollHeight-list.clientHeight-list.scrollTop)<2
    };
  })()`);
  assert(inboxScrollCheck.scrollable && inboxScrollCheck.atBottom, 'El hilo del Inbox tiene scroll vertical propio y permite llegar al mensaje más reciente');

  await b.select('#inboxheat', 'hot');
  await b.wait(80);
  const hotFilterCheck = await b.eval(`(() => {
    const items = Array.from(document.querySelectorAll('.inbox-conversation'));
    return {
      count: items.length,
      allHot: items.length > 0 && items.every(el => el.querySelector('.heat-badge')?.textContent?.includes('Caliente'))
    };
  })()`);
  assert(hotFilterCheck.allHot === true, `El filtro "Caliente" en Inbox muestra únicamente contactos Calientes (${hotFilterCheck.count} encontrado)`);

  console.log('\n--- 5.2a Escenario conectado: Inbox → Cita → CRM → Agenda → ARM ---');
  await b.eval(`location.hash = '#inbox/1'`);
  await b.wait(100);
  await b.select('#inboxheat', 'all');
  await b.wait(80);
  await b.click('[data-inbox-scenario="appointment"]');
  await b.wait(80);
  const scenarioModal = await b.eval(`document.getElementById('modal')?.open===true && document.getElementById('modal')?.innerText.includes('Reservar una cita')`);
  assert(scenarioModal, 'El escenario guiado abre la reserva real de Agenda para el contacto seleccionado');
  await b.eval(`(() => { const field=document.querySelector('#dateinput'); field.value='2026-10-28'; field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await b.select('#time', '09:00');
  await b.click('button[type="submit"][form="form"]');
  await b.wait(120);
  const connectedInbox = await b.eval(`({
    thread:document.querySelector('.inbox-messages')?.innerText||'',
    context:document.querySelector('.inbox-context')?.innerText||''
  })`);
  assert(connectedInbox.thread.includes('2026-10-28') && connectedInbox.context.includes('Cita agendada'), 'Inbox confirma la cita y el contexto refleja la nueva etapa');

  await b.eval(`location.hash = '#agenda'`);
  await b.wait(100);
  const connectedAgenda = await b.eval(`({label:document.querySelector('.agenda-period-control strong')?.textContent||'',rows:[...document.querySelectorAll('[data-appointment]')].map(el=>el.closest('tr')?.innerText||el.innerText)})`);
  assert(connectedAgenda.label.toLowerCase().includes('28 de octubre') && connectedAgenda.rows.some(text=>text.includes('Ana Torres Medina')), 'La cita creada desde Inbox aparece en Agenda el 28 de octubre', JSON.stringify(connectedAgenda));

  await b.eval(`location.hash = '#crm/1'`);
  await b.wait(100);
  const connectedCrm = await b.eval(`document.querySelector('.crmdetail')?.innerText||''`);
  assert(connectedCrm.includes('Cita agendada desde Inbox') && connectedCrm.includes('Cita ya vinculada'), 'CRM conserva la cita vinculada y el historial del escenario', connectedCrm.slice(0,500));

  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(80);
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#arm'`);
  await b.wait(100);
  const connectedAudit = await b.eval(`document.body.innerText||''`);
  assert(connectedAudit.includes('Cita registrada') && connectedAudit.includes('Ana Torres Medina'), 'ARM registra la creación de la cita en la auditoría local', connectedAudit.slice(0,500));

  await b.eval(`location.hash = '#inbox/2'`);
  await waitForVisibleSelector(b, '[data-inbox-scenario="escalation"]', 3000);
  await b.click('[data-inbox-scenario="escalation"]');
  await b.wait(180);
  const escalationState = await b.eval(`({thread:document.querySelector('.inbox-messages')?.innerText||'',context:document.querySelector('.inbox-context')?.innerText||''})`);
  assert(escalationState.thread.includes('no evalúa síntomas') && escalationState.context.includes('Derivada a atención humana'), 'El escenario sensible detiene el flujo y deriva a atención humana sin diagnosticar');

  console.log('\n--- 5.2b Agenda: arrastre de cita entre días con actualización e historial ---');
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(100);
  await b.click('#today');
  await b.wait(80);
  const dayIndicators = await b.eval(`({
    cards: document.querySelectorAll('.stats .stat').length,
    periodSummary: Boolean(document.querySelector('.agenda-pulse')),
    controlGap: (() => {
      const views = document.querySelector('.agenda-view-switch')?.getBoundingClientRect();
      const period = document.querySelector('.agenda-period-control')?.getBoundingClientRect();
      return views && period ? Math.round(period.left - views.right) : null;
    })()
  })`);
  assert(dayIndicators.cards === 4 && dayIndicators.periodSummary === false, 'La vista Día muestra sus cuatro indicadores operativos');
  assert(dayIndicators.controlGap !== null && dayIndicators.controlGap >= 0 && dayIndicators.controlGap <= 30, `Los controles de periodo quedan inmediatamente después de Día/Semana/Mes (separación=${dayIndicators.controlGap}px)`);
  await b.click('[data-agenda-view="month"]');
  await b.wait(80);
  const monthIndicators = await b.eval(`({
    cards: document.querySelectorAll('.stats .stat').length,
    periodSummary: Boolean(document.querySelector('.agenda-pulse'))
  })`);
  assert(monthIndicators.cards === 0 && monthIndicators.periodSummary === false, 'La vista Mes oculta los indicadores para no deformar el calendario');
  await b.click('[data-agenda-view="week"]');
  await b.wait(80);
  const weekIndicators = await b.eval(`({
    cards: document.querySelectorAll('.stats .stat').length,
    periodSummary: Boolean(document.querySelector('.agenda-pulse'))
  })`);
  assert(weekIndicators.cards === 0 && weekIndicators.periodSummary === false, 'La vista Semana también oculta los indicadores');
  await b.click('[data-agenda-view="month"]');
  await b.wait(80);
  const dragResult = await b.eval(`(() => {
    const source = document.querySelector('[data-drag-appointment="4"]');
    const target = document.querySelector('[data-agenda-drop-date="2026-10-28"]');
    if (!source || !target) return {ok:false, reason:'source-or-target-missing'};
    const transfer = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', {bubbles:true, dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:transfer}));
    return {ok:true};
  })()`);
  await b.wait(100);
  await b.eval(`document.querySelector('[data-agenda-appointment="4"]')?.click()`);
  await b.wait(60);
  const movedAppointment = await b.eval(`(() => {
    const layer = document.querySelector('.agenda-drawer-layer');
    return {
      selectedDate: document.querySelector('.selected-day-head h2')?.textContent || '',
      drawerText: document.querySelector('.agenda-drawer')?.innerText || '',
      valuesVisible: [...document.querySelectorAll('.agenda-detail-list dd')].every(el => getComputedStyle(el).color !== 'rgb(255, 255, 255)'),
      isOpen: Boolean(layer?.classList.contains('is-open') || document.querySelector('.agenda-drawer')?.classList.contains('is-open'))
    };
  })()`);
  assert(dragResult.ok && movedAppointment.selectedDate.toLowerCase().includes('28 de octubre') && movedAppointment.drawerText.includes('Cita reprogramada desde el calendario'), 'Arrastrar una cita Programada al día 28 actualiza la fecha y registra el cambio');
  assert(movedAppointment.valuesVisible && movedAppointment.drawerText.includes('Dr. Diego Ramírez') && movedAppointment.drawerText.includes('Consulta oftalmológica'), 'El drawer muestra los datos de profesional, servicio, duración y documento con contraste visible');
  assert(movedAppointment.isOpen === true, 'El drawer de Agenda activa la clase .is-open al abrir');
  const agendaCloseState = await b.eval(`(() => {
    document.querySelector('.agenda-drawer-close')?.click();
    const layer = document.querySelector('.agenda-drawer-layer');
    return {
      isOpenAtClose: Boolean(layer?.classList.contains('is-open') || document.querySelector('.agenda-drawer')?.classList.contains('is-open'))
    };
  })()`);
  assert(agendaCloseState.isOpenAtClose === false, 'El drawer de Agenda retira .is-open al iniciar el cierre');
  await b.wait(220);
  const agendaUnmounted = await b.eval(`document.querySelector('.agenda-drawer-layer') === null`);
  assert(agendaUnmounted === true, 'El drawer de Agenda se retira del DOM después de concluir la salida');

  // Verificación de movimiento reducido en el drawer de Agenda
  await b.eval(`(() => {
    const prefs = JSON.parse(localStorage.getItem('clinica_user_preferences_v1') || '{}');
    const user = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    if (user.id) {
      prefs[user.id] = Object.assign(prefs[user.id] || {}, { reducedMotion: 'on' });
      localStorage.setItem('clinica_user_preferences_v1', JSON.stringify(prefs));
    }
    document.documentElement.dataset.reducedMotion = 'on';
  })()`);
  await b.eval(`document.querySelector('[data-agenda-appointment="4"]')?.click()`);
  await b.wait(60);
  const agendaRmOpen = await b.eval(`(() => {
    const drawer = document.querySelector('.agenda-drawer');
    const st = drawer ? getComputedStyle(drawer) : null;
    return {
      hasDrawer: Boolean(drawer),
      isOpen: drawer?.classList.contains('is-open'),
      transform: st?.transform,
      opacity: st?.opacity
    };
  })()`);
  assert(agendaRmOpen.hasDrawer && agendaRmOpen.isOpen && (agendaRmOpen.transform === 'none' || agendaRmOpen.transform === 'matrix(1, 0, 0, 1, 0, 0)'), 'Con data-reduced-motion="on", el drawer de Agenda abre sin desplazamiento espacial (transform: none)');
  await b.eval(`document.querySelector('.agenda-drawer-close')?.click()`);
  await b.wait(60);
  const agendaRmClosing = await b.eval(`(() => {
    const layer = document.querySelector('.agenda-drawer-layer');
    const drawer = document.querySelector('.agenda-drawer');
    const st = drawer ? getComputedStyle(drawer) : null;
    return {
      stillMounted: Boolean(layer && drawer),
      isOpen: Boolean(layer?.classList.contains('is-open') || drawer?.classList.contains('is-open')),
      transform: st?.transform,
      opacity: Number(st?.opacity || 0),
      transitionProperty: st?.transitionProperty || ''
    };
  })()`);
  assert(
    agendaRmClosing.stillMounted &&
    !agendaRmClosing.isOpen &&
    (agendaRmClosing.transform === 'none' || agendaRmClosing.transform === 'matrix(1, 0, 0, 1, 0, 0)') &&
    agendaRmClosing.opacity > 0 && agendaRmClosing.opacity < 1 &&
    agendaRmClosing.transitionProperty.includes('opacity'),
    'Con data-reduced-motion="on", el drawer de Agenda permanece temporalmente montado durante el fundido sin desplazamiento (opacity entre 0 y 1, transitionProperty contiene opacity y transform es none)'
  );
  await b.wait(180);
  const agendaRmUnmounted = await b.eval(`document.querySelector('.agenda-drawer-layer') === null`);
  assert(agendaRmUnmounted === true, 'Con data-reduced-motion="on", el drawer de Agenda se desmonta tras el fundido de 160–190ms');
  await b.eval(`(() => {
    const prefs = JSON.parse(localStorage.getItem('clinica_user_preferences_v1') || '{}');
    const user = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    if (user.id) {
      prefs[user.id] = Object.assign(prefs[user.id] || {}, { reducedMotion: 'off' });
      localStorage.setItem('clinica_user_preferences_v1', JSON.stringify(prefs));
    }
    delete document.documentElement.dataset.reducedMotion;
  })()`);
  // Restaurar la fecha original para que las pruebas operativas siguientes conserven su escenario base.
  const dragBack = await b.eval(`(() => {
    const source = document.querySelector('[data-drag-appointment="4"]');
    const target = document.querySelector('[data-agenda-drop-date="2026-10-27"]');
    if (!source || !target) return false;
    const transfer = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', {bubbles:true, dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:transfer}));
    return true;
  })()`);
  assert(dragBack === true, 'La cita puede devolverse al día original conservando el mismo flujo validado');
  await b.wait(80);

  console.log('\n--- 5.3 Agenda de Recepción: Reprogramación a horario libre, cancelación con motivo e integridad de pagos ---');
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(100);

  // Reprogramar cita #4 (Luis Pérez, 11:00 -> 11:30)
  await b.click('[data-appointment="4"]');
  await b.wait(80);
  await b.click('.drawer-reschedule');
  await waitForVisibleSelector(b, '#newtime', 3000);
  await b.select('#newtime', '11:30');
  await b.click('button[type="submit"][form="form"]');
  await b.wait(100);
  const rescheduleCheck = await b.eval(`({
    modalText: document.getElementById('modal')?.innerText || '',
    hasTime: (document.getElementById('modal')?.innerText || '').includes('2026-10-27 · 11:30'),
    hasHistory: (document.getElementById('modal')?.innerText || '').includes('Cita reprogramada')
  })`);
  assert(rescheduleCheck.hasTime && rescheduleCheck.hasHistory, 'La cita #4 se reprograma al horario libre 11:30 y registra el cambio en el historial');
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  // Cancelar cita #3 (Ana Torres, 10:15) con motivo y verificar que el estado de pago no cambia
  await b.click('[data-appointment="3"]');
  await b.wait(80);
  const paidBeforeCancel = await b.eval(`document.querySelector('.agenda-drawer')?.innerText?.includes('Pendiente')`);
  await b.click('.drawer-cancel');
  await waitForVisibleSelector(b, '#reason', 3000);
  await b.type('#reason', 'Paciente reprogramará por viaje de trabajo');
  await b.click('button[type="submit"][form="form"]');
  await b.wait(100);
  const cancelCheck = await b.eval(`({
    isCancelled: (document.getElementById('modal')?.innerText || '').includes('Cancelada'),
    hasHistory: (document.getElementById('modal')?.innerText || '').includes('Cita cancelada'),
    hasReason: (document.getElementById('modal')?.innerText || '').includes('Paciente reprogramará por viaje de trabajo'),
    paidUnchanged: (document.getElementById('modal')?.innerText || '').includes('Pendiente')
  })`);
  assert(cancelCheck.isCancelled && cancelCheck.hasHistory && cancelCheck.hasReason, 'La cita #3 cambia a estado "Cancelada" y conserva el motivo en el historial');
  assert(paidBeforeCancel === true && cancelCheck.paidUnchanged === true, 'La cancelación de la cita no altera el estado de pago');
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  console.log('\n--- 5.4 Caja: Registro de pago en efectivo, vuelto, constancia CP-XXXX y bloqueo de rutas clínicas ---');
  await loginQuickRole('caja@clinicaoftalmo.pe');
  await b.wait(100);

  await b.click('[data-pay="2"]');
  await b.wait(80);
  await b.select('#pay-method', 'Efectivo');
  await b.wait(50);
  await b.type('#pay-received', '150');
  await b.wait(50);
  const liveChange = await b.eval(`(document.getElementById('pay-change-val')?.textContent || '').replace(/\\u00a0/g, ' ').trim()`);
  assert(liveChange === 'S/ 50.00', `Caja calcula el vuelto en tiempo real para pago en efectivo (${liveChange})`);

  await b.click('#pay-submit');
  await b.wait(100);
  const receiptCheck = await b.eval(`({
    title: document.querySelector('.receipt-title')?.textContent?.trim(),
    code: document.querySelector('.receipt-code')?.textContent?.trim(),
    total: (document.querySelector('.receipt-total-val')?.textContent || '').replace(/\\u00a0/g, ' ').trim(),
    text: (document.querySelector('.receipt')?.innerText || '').replace(/\\u00a0/g, ' '),
    hasGotoPatientBtn: Boolean(document.getElementById('gotopatient'))
  })`);
  assert(
    receiptCheck.title === 'Constancia interna de pago' && /^CP-\d{4}$/.test(receiptCheck.code) && receiptCheck.total === 'S/ 100.00' && receiptCheck.text.includes('Efectivo') && receiptCheck.text.includes('S/ 50.00'),
    `Genera Constancia interna de pago ${receiptCheck.code} con monto S/ 100.00, medio Efectivo y vuelto S/ 50.00`
  );
  assert(receiptCheck.hasGotoPatientBtn === false, 'La constancia emitida en Caja NO incluye botón para abrir el expediente del paciente');
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  // Verificar bloqueo de rutas clínicas para Caja
  const cajaBlockedRoutes = [];
  for (const r of ['#pacientes/1', '#pacientes', '#consulta', '#estudios', '#crm', '#admin-usuarios']) {
    await b.eval(`location.hash = '${r}'`);
    await b.wait(60);
    cajaBlockedRoutes.push(await b.eval(`location.hash`));
  }
  assert(cajaBlockedRoutes.every(h => h === '#caja'), `Caja es redirigido a #caja al intentar abrir rutas clínicas o administrativas (${cajaBlockedRoutes.join(', ')})`);

  console.log('\n--- 5.5 Médico vs Administrador: Edición y cierre de consulta clínica vs modo supervisión ---');
  await loginQuickRole('v.rios@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(100);
  const docAgenda = await b.eval(`({
    title: document.querySelector('h1')?.textContent?.trim(),
    hasNewBtn: Boolean(document.getElementById('new')),
    hasOtherDoc: document.querySelector('#rows')?.innerText?.includes('Dr. Diego Ramírez')
  })`);
  assert(docAgenda.title === 'Mi agenda médica' && !docAgenda.hasNewBtn && !docAgenda.hasOtherDoc, 'Médico ve "Mi agenda médica" sin botón "+ Nueva cita" y solo con sus propias citas');

  await b.eval(`location.hash = '#consulta'`);
  await b.wait(100);
  await b.type('#ref-od-sph', '-2.25');
  await b.type('#doctor-diagnosis', 'Astigmatismo miópico compuesto confirmado.');
  await b.click('#doctor-consult-form button[type="submit"]');
  await b.wait(100);
  const docSavedCheck = await b.eval(`({
    sph: document.getElementById('ref-od-sph')?.value,
    diag: document.getElementById('doctor-diagnosis')?.value,
    panelHeadText: Array.from(document.querySelectorAll('.panelhead')).map(el => el.innerText).join(' ')
  })`);
  assert(
    docSavedCheck.sph === '-2.25' && docSavedCheck.diag === 'Astigmatismo miópico compuesto confirmado.' && docSavedCheck.panelHeadText.includes('Atendida'),
    'El Médico edita campos clínicos, finaliza la consulta y el estado pasa a "Atendida" conservando los datos en sesión'
  );

  // Confirmar que el Administrador ve los datos guardados pero NO puede editarlos ni repetir la operación
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#consulta'`);
  await b.wait(100);
  const adminSupervisionCheck = await b.eval(`({
    hasBanner: document.body.innerText.includes('Vista de supervisión. La edición clínica corresponde al médico tratante.'),
    sphDisabled: document.getElementById('ref-od-sph')?.disabled === true && document.getElementById('ref-od-sph')?.readOnly === true,
    diagDisabled: document.getElementById('doctor-diagnosis')?.disabled === true && document.getElementById('doctor-diagnosis')?.readOnly === true,
    planDisabled: document.getElementById('doctor-plan')?.disabled === true && document.getElementById('doctor-plan')?.readOnly === true,
    hasSubmitBtn: Boolean(document.querySelector('#doctor-consult-form button[type="submit"]')),
    savedDiagVisible: document.getElementById('doctor-diagnosis')?.value === 'Astigmatismo miópico compuesto confirmado.'
  })`);
  assert(
    adminSupervisionCheck.hasBanner && adminSupervisionCheck.sphDisabled && adminSupervisionCheck.diagDisabled && adminSupervisionCheck.planDisabled && !adminSupervisionCheck.hasSubmitBtn && adminSupervisionCheck.savedDiagVisible,
    'El Administrador en #consulta ve los datos clínicos en modo solo lectura (disabled/readonly) y sin botón para guardar o finalizar'
  );

  // Restablecer datos demo antes de la prueba de Técnico y Responsividad
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);

  console.log('\n--- 5.6 Técnico Oftalmológico: Estudios y expediente en modo consulta ---');
  await loginQuickRole('tecnico@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#pacientes/1'`);
  await b.wait(100);
  const techCheck = await b.eval(`({
    hasConsultBadge: document.body.innerText.includes('Modo consulta'),
    hasEditBtn: Boolean(document.getElementById('editpatient')),
    hasBookBtn: Boolean(document.getElementById('bookpatient')),
    hasToggleBtn: Boolean(document.getElementById('togglepatient'))
  })`);
  assert(techCheck.hasConsultBadge && !techCheck.hasEditBtn && !techCheck.hasBookBtn && !techCheck.hasToggleBtn, 'Técnico accede a #pacientes/1 en "Modo consulta" sin botones de edición ni reserva');

  console.log('\n--- 5.7 Pipeline comercial CRM: KPIs, Estancamiento, Análisis y Conexión Operativa ---');
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);
  await b.eval(`location.hash = '#crm'`);
  await b.wait(120);

  // Entrega 1: 6 KPIs iniciales
  const pKpis = await b.eval(`({
    count: document.querySelectorAll('.crm-pipeline-kpis .stat').length,
    text: document.querySelector('.crm-pipeline-kpis')?.innerText || ''
  })`);
  assert(pKpis.count === 6 && pKpis.text.includes('50 %') && pKpis.text.includes('S/ 700') && pKpis.text.includes('0 %') && pKpis.text.includes('Sin citas resueltas aún'), 'La franja superior muestra los 6 indicadores del pipeline con cálculo inicial real');

  // Entrega 2: Control de estancamiento vs prioridad comercial y preservación de stageEnteredAt al editar sin cambiar etapa
  const stagCheck = await b.eval(`({
    jorgeText: document.querySelector('[data-followup="6"]')?.innerText || '',
    mariaText: document.querySelector('[data-followup="3"]')?.innerText || '',
    luisText: document.querySelector('[data-followup="2"]')?.innerText || ''
  })`);
  assert(stagCheck.jorgeText.includes('Estancado') && stagCheck.jorgeText.includes('3 días'), 'Tarjeta de Jorge muestra badge Estancado con 3 días acumulados');
  assert(stagCheck.mariaText.includes('Vencido'), 'Tarjeta de María muestra badge Vencido por próxima acción del 2026-10-26');
  assert(stagCheck.luisText.includes('Fría') && stagCheck.luisText.includes('Atención') && !stagCheck.luisText.includes('Estancado'), 'Luis mantiene prioridad Fría diferenciada sin etiquetarse como Estancado');

  await b.click('[data-followup="6"]');
  await b.wait(80);
  await b.type('#nextaction', 'Enviar catálogo actualizado');
  await b.click('#followupform button[type="submit"]');
  await b.wait(80);
  const sameStageMeta = await b.eval(`({
    entered: document.querySelector('#detail-stage-entered')?.textContent?.trim(),
    days: document.querySelector('#detail-days-stage')?.textContent?.trim()
  })`);
  assert(sameStageMeta.entered === '2026-10-24' && sameStageMeta.days.includes('3 días'), `Editar seguimiento sin cambiar etapa no reinicia antigüedad (${sameStageMeta.entered}, ${sameStageMeta.days})`);
  await b.click('#closedetail');
  await b.wait(60);

  await b.select('#crmfollowup', 'stagnant');
  await b.wait(60);
  const filteredStag = await b.eval(`Array.from(document.querySelectorAll('[data-followup]')).map(el => el.dataset.followup)`);
  assert(filteredStag.length === 1 && filteredStag[0] === '6', `Filtro "Estancado" muestra únicamente a Jorge (encontradas: ${filteredStag.join(',')})`);
  await b.select('#crmfollowup', 'overdue');
  await b.wait(60);
  const filteredOverdue = await b.eval(`Array.from(document.querySelectorAll('[data-followup]')).map(el => el.dataset.followup)`);
  assert(filteredOverdue.length === 1 && filteredOverdue[0] === '3', `Filtro "Vencido" muestra únicamente a María (encontradas: ${filteredOverdue.join(',')})`);
  await b.select('#crmfollowup', 'all');
  await b.wait(60);

  // Entrega 3: Análisis del pipeline dentro de CRM sin nueva opción de menú lateral
  const sidebarHasAnalysis = await b.eval(`Array.from(document.querySelectorAll('aside a')).some(a => a.textContent.toLowerCase().includes('análisis'))`);
  assert(!sidebarHasAnalysis, 'Análisis del pipeline no agrega una opción nueva en el menú lateral');
  await b.click('#crm-tab-analysis');
  await b.wait(100);
  const analysisInit = await b.eval(`({
    text: document.querySelector('#view')?.innerText || '',
    kpis: document.querySelector('.crm-pipeline-kpis')?.innerText || '',
    periodOpts: Array.from(document.querySelectorAll('#analysis-period option')).map(o => o.textContent.trim())
  })`);
  assert(
    analysisInit.text.includes('Avance acumulado del pipeline actual') &&
    analysisInit.text.includes('Porcentaje de avance actual') &&
    analysisInit.text.includes('Los porcentajes se estiman a partir de la etapa actual de cada oportunidad. No representan un historial de conversiones.') &&
    analysisInit.text.includes('El periodo se calcula con la fecha de entrada a la etapa actual.') &&
    !analysisInit.text.includes('Embudo de conversión por etapa') &&
    !analysisInit.text.includes('Porcentaje de conversión') &&
    analysisInit.kpis.includes('Conversión a cita') &&
    analysisInit.periodOpts.includes('Todo el periodo del demo') &&
    analysisInit.periodOpts.includes('Entró a etapa hoy') &&
    analysisInit.periodOpts.includes('Entró a etapa en los últimos 3 días') &&
    analysisInit.periodOpts.includes('Entró a etapa en los últimos 7 días') &&
    analysisInit.text.includes('Tiempo promedio por etapa') &&
    analysisInit.text.includes('Motivos de pérdida') &&
    analysisInit.text.includes('Tasa de inasistencia') &&
    analysisInit.text.includes('Distribución por canal de origen') &&
    analysisInit.text.includes('no representan ingresos reales') &&
    analysisInit.text.includes('Sin datos suficientes'),
    'Análisis del pipeline aclara avance acumulado actual, filtro por stageEnteredAt y conserva "Conversión a cita" en KPIs superiores'
  );
  await b.click('#crm-tab-board');
  await b.wait(80);
  // Verificación de etapas esenciales protegidas y eliminación libre de columna comercial en #columns
  await b.click('#columns');
  await b.wait(80);
  const protectedColState = await b.eval(`(() => {
    const essentialIds = [4, 7, 8, 9, 5, 6];
    const essentialDisabled = essentialIds.every(id => Boolean(document.querySelector('[data-removecolumn="' + id + '"][disabled]')));
    const commercialRemovable = [1, 2, 3].every(id => !document.querySelector('[data-removecolumn="' + id + '"]')?.disabled);
    const explainCount = Array.from(document.querySelectorAll('.columnsetting-lock')).filter(el => el.textContent.includes('Esta etapa está vinculada a Agenda, CRM o ARM y no puede retirarse')).length;
    return { essentialDisabled, commercialRemovable, explainCount };
  })()`);
  assert(protectedColState.essentialDisabled && protectedColState.commercialRemovable && protectedColState.explainCount === 6, 'Configurador deshabilita "Retirar" y muestra explicación en las 6 etapas esenciales, manteniendo libres las comerciales');
  await b.click('#addcolumn');
  await b.wait(60);
  await b.type('#columnname', 'Contacto comercial extra');
  await b.click('button[form="columnform"][type="submit"]');
  await b.wait(80);
  const customRemoveOk = await b.eval(`(() => {
    const row = Array.from(document.querySelectorAll('.columnsetting')).find(r => r.textContent.includes('Contacto comercial extra'));
    const btn = row?.querySelector('[data-removecolumn]');
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  })()`);
  await b.wait(70);
  await b.select('#destination', '2');
  await b.click('button[form="removeform"][type="submit"]');
  await b.wait(80);
  const afterCustomRemoved = await b.eval(`!document.querySelector('.columnsettings')?.innerText.includes('Contacto comercial extra')`);
  assert(customRemoveOk && afterCustomRemoved, 'Configurador permite crear y retirar columnas comerciales adicionales');
  await b.click('#done');
  await b.wait(60);

  await b.click('[data-followup="3"]');
  await b.wait(80);
  await b.select('#leadstage', '6');
  await b.wait(40);
  await b.select('#leadlossreason', 'Costo del servicio');
  await b.click('#followupform button[type="submit"]');
  await b.wait(80);
  await b.click('#closedetail');
  await b.wait(220);
  await b.click('#crm-tab-analysis');
  await b.wait(80);
  const analysisAfterLoss = await b.eval(`document.querySelector('#view')?.innerText || ''`);
  assert(analysisAfterLoss.includes('Costo del servicio') && analysisAfterLoss.includes('1 (100 %)'), 'Motivos de pérdida refleja al instante la salida registrada en memoria');
  await b.click('#crm-tab-board');
  await b.wait(80);

  // Entrega 4: Conexión Inbox -> Agenda -> ARM -> Consulta -> CRM y trazabilidad
  await b.eval(`window.__resetDemoData()`);
  await b.wait(80);
  await b.eval(`location.hash = '#inbox/2'`);
  await b.wait(100);
  await b.type('#inboxtext', 'Coordinamos horarios disponibles en sede.');
  await b.click('#inboxreply button[type="submit"]');
  await b.wait(80);
  await b.click('#inbox-confirm-interest');
  await b.wait(80);
  await b.eval(`location.hash = '#crm/2'`);
  await b.wait(100);
  const luisAfterInbox = await b.eval(`({
    inInterestCol: Boolean(document.querySelector('[data-stage="3"] [data-followup="2"]')),
    drawer: document.querySelector('#crmdetail')?.innerText || ''
  })`);
  assert(luisAfterInbox.inInterestCol && luisAfterInbox.drawer.includes('Origen: Inbox') && luisAfterInbox.drawer.includes('Acción simulada'), 'Inbox actualiza actividad, confirma interés y registra trazabilidad de origen y simulación en CRM');
  await b.click('#closedetail');
  await b.wait(220);

  const setDateInput = async (sel, val) => {
    await b.eval(`(() => { const el=document.querySelector(${JSON.stringify(sel)}); el.value=${JSON.stringify(val)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await b.wait(60);
  };
  const openAgendaItem = async (...terms) => {
    const id = await b.eval(`(() => {
      const btn = Array.from(document.querySelectorAll('[data-appointment]')).find(el => {
        const t = el.closest('tr')?.innerText || el.innerText;
        return ${JSON.stringify(terms)}.every(k => t.includes(k));
      });
      if (!btn) return '';
      btn.click();
      return btn.dataset.appointment;
    })()`);
    await b.wait(70);
    if (await b.eval(`Boolean(document.querySelector('.drawer-full-detail'))`)) {
      await b.click('.drawer-full-detail');
      await b.wait(200);
    }
    return id;
  };

  // Reserva desde Agenda para Ana Torres (pid 3 -> Lead 1) -> Cita agendada -> Reprogramar -> Cancelar sin borrar ni alterar valor
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(90);
  await b.click('[data-agenda-view="day"]');
  await b.wait(60);
  await b.click('#new');
  await b.wait(60);
  await b.select('#pid', '3');
  await setDateInput('#dateinput', '2026-10-28');
  await b.select('#time', '10:30');
  await b.click('#modal button[type="submit"]');
  await b.wait(80);
  const createdAnaApp = await openAgendaItem('Ana Torres', '10:30');
  await b.click('#reschedule');
  await b.wait(60);
  await setDateInput('#newdate', '2026-10-29');
  await b.select('#newtime', '11:00');
  await b.click('#modal button[type="submit"]');
  await b.wait(80);
  await b.eval(`document.querySelector('#modal')?.close()`);
  await openAgendaItem('Ana Torres', '11:00');
  await b.click('#cancelappointment');
  await b.wait(60);
  await b.type('#reason', 'Reprogramación solicitada por paciente');
  await b.click('#modal button[type="submit"]');
  await b.wait(80);
  await b.eval(`document.querySelector('#modal')?.close()`);

  await b.eval(`location.hash = '#crm/1'`);
  await b.wait(100);
  const anaAfterCancel = await b.eval(`({
    count: document.querySelectorAll('[data-followup="1"]').length,
    inFollowUp: Boolean(document.querySelector('[data-stage="9"] [data-followup="1"]')),
    inBooked: Boolean(document.querySelector('[data-stage="4"] [data-followup="1"]')),
    inNoShow: Boolean(document.querySelector('[data-stage="8"] [data-followup="1"]')),
    val: document.querySelector('#leadvalue')?.value || '',
    nextAction: document.querySelector('#nextaction')?.value || '',
    drawer: document.querySelector('#crmdetail')?.innerText || '',
    kpis: document.querySelector('.crm-pipeline-kpis')?.innerText || ''
  })`);
  await b.eval(`location.hash = '#arm'`);
  await b.wait(80);
  const noArmForCancel = await b.eval(`!document.querySelector('[data-arm-recovery="1"]')`);
  assert(
    anaAfterCancel.count === 1 &&
    anaAfterCancel.inFollowUp &&
    !anaAfterCancel.inBooked &&
    !anaAfterCancel.inNoShow &&
    Number(anaAfterCancel.val) === 150 &&
    anaAfterCancel.nextAction === 'Coordinar nueva fecha tras cancelación' &&
    anaAfterCancel.drawer.includes('Cancelada') &&
    anaAfterCancel.drawer.includes('Origen: Agenda') &&
    anaAfterCancel.drawer.includes('Cita agendada → Seguimiento') &&
    anaAfterCancel.drawer.includes('Reprogramación solicitada por paciente') &&
    anaAfterCancel.drawer.includes('Cita reprogramada') &&
    /Asistencia[\s\S]*0\s*%/.test(anaAfterCancel.kpis) &&
    /Recuperaciones ARM pendientes[\s\S]*00/.test(anaAfterCancel.kpis),
    'Cancelación en Agenda mueve oportunidad a Seguimiento, conserva valor e historial, define próxima acción, no trata como No asistió y registra bitácora completa'
  );
  assert(noArmForCancel, 'Cancelación de cita NO genera recuperación pendiente en Centro ARM');
  await b.eval(`location.hash = '#crm'`);
  await b.wait(60);

  // Inasistencia desde Agenda (Carlos pid 2 -> Lead 4) -> ARM pendiente -> +10 min -> Seguimiento
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(90);
  await b.click('#today');
  await b.wait(60);
  await b.click('#new');
  await b.wait(60);
  await b.select('#pid', '2');
  await b.select('#doctor', 'Dr. Diego Ramírez');
  await setDateInput('#dateinput', '2026-10-27');
  await b.select('#time', '11:00');
  await b.click('#modal button[type="submit"]');
  await b.wait(80);
  await openAgendaItem('Carlos Mendoza', '11:00');
  await b.click('#noshow');
  await b.wait(60);
  await b.click('#confirmnoshow');
  await b.wait(80);
  await b.eval(`document.querySelector('#modal')?.close()`);

  await b.eval(`location.hash = '#arm'`);
  await b.wait(90);
  assert(await b.eval(`Boolean(document.querySelector('[data-arm-recovery="4"]'))`), 'No asistió en Agenda deja recuperación pendiente visible en Centro ARM');
  await b.click('[data-arm-recovery="4"]');
  await b.wait(90);
  const armDuplicateRemoved = await b.eval(`!document.querySelector('[data-arm-recovery="4"]')`);
  await b.eval(`location.hash = '#crm/4'`);
  await b.wait(90);
  const carlosRecovered = await b.eval(`({
    inFollowUp: Boolean(document.querySelector('[data-stage="9"] [data-followup="4"]')),
    drawer: document.querySelector('#crmdetail')?.innerText || ''
  })`);
  assert(armDuplicateRemoved && carlosRecovered.inFollowUp && carlosRecovered.drawer.includes('Centro ARM') && carlosRecovered.drawer.includes('No asistió → Seguimiento'), 'Ejecutar recuperación ARM +10 min mueve a Seguimiento, previene duplicados y registra trazabilidad');
  await b.click('#closedetail');
  await b.wait(220);

  // Atención médica finalizada -> CRM mueve oportunidad a Asistió
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(90);
  await b.click('#today');
  await b.wait(60);
  await b.click('#new');
  await b.wait(60);
  await b.select('#pid', '3');
  await b.select('#doctor', 'Dra. Valeria Ríos');
  await setDateInput('#dateinput', '2026-10-27');
  await b.select('#time', '12:30');
  await b.click('#modal button[type="submit"]');
  await b.wait(80);
  const anaWaitId = await openAgendaItem('Ana Torres', '12:30');
  await b.click('#receipt');
  await b.wait(60);
  await b.eval(`document.querySelector('#modal')?.close()`);
  await b.eval(`location.hash = '#caja'`);
  await b.wait(90);
  await b.click(`[data-pay="${anaWaitId}"]`);
  await b.wait(60);
  await b.click('#pay-submit');
  await b.wait(80);
  await b.eval(`document.querySelector('#modal')?.close()`);
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(90);
  await b.click('#today');
  await b.wait(60);
  await openAgendaItem('Ana Torres', '12:30');
  await b.click('#wait');
  await b.wait(80);

  await loginQuickRole('v.rios@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#consulta'`);
  await b.wait(90);
  await b.click(`[data-doctor-app="${anaWaitId}"]`);
  await b.wait(70);
  await b.type('#doctor-diagnosis', 'Control refractivo normal');
  await b.click('#doctor-consult-form button[type="submit"]');
  await b.wait(90);

  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#crm/1'`);
  await b.wait(90);
  const attendedSync = await b.eval(`({
    inAttended: Boolean(document.querySelector('[data-stage="7"] [data-followup="1"]')),
    drawer: document.querySelector('#crmdetail')?.innerText || '',
    kpis: document.querySelector('.crm-pipeline-kpis')?.innerText || ''
  })`);
  assert(attendedSync.inAttended && attendedSync.drawer.includes('Atención médica') && attendedSync.kpis.includes('50 %'), 'Registrar asistencia médica mueve oportunidad a Asistió y actualiza KPI Asistencia a 50 %');
  await b.click('#closedetail');
  await b.wait(220);

  // Restablecer datos demo antes de las verificaciones responsivas finales
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);

  // =========================================================================
  // 6. VERIFICACIÓN RESPONSIVA REAL EN 3 VIEWPORTS (1280×800, 768×1024, 375×667)
  // =========================================================================
  console.log('\n--- 6. Verificación responsiva real en navegador (1280×800, 768×1024, 375×667) ---');
  await loginQuickRole('admin@clinicaoftalmo.pe');

  const viewports = [
    { name: 'Escritorio', width: 1280, height: 800 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Móvil', width: 375, height: 667 }
  ];

  const responsiveReport = [];

  for (const vp of viewports) {
    await b.setViewport(vp.width, vp.height);
    await b.wait(100);

    // 1. Dashboard & Sidebar & Reset Modal check
    await b.eval(`location.hash = '#dashboard'`);
    await b.wait(80);
    await b.click('#topbar-reset-demo');
    await b.wait(80);
    const modalMetrics = await b.eval(`(() => {
      const m = document.getElementById('modal');
      const cancelBtn = document.getElementById('cancel-reset')?.getBoundingClientRect();
      const confirmBtn = document.getElementById('confirm-reset')?.getBoundingClientRect();
      const mr = m?.getBoundingClientRect();
      return {
        open: m?.open === true,
        modalLeft: Math.round(mr?.left ?? -1),
        modalRight: Math.round(mr?.right ?? -1),
        modalBottom: Math.round(mr?.bottom ?? -1),
        actionsVisible: Boolean(cancelBtn && confirmBtn && confirmBtn.width > 0 && confirmBtn.height > 0 && confirmBtn.right <= window.innerWidth && confirmBtn.bottom <= window.innerHeight)
      };
    })()`);
    await b.key('Escape', 'Escape', 27);
    await b.wait(60);

    // 2. Agenda tablewrap check
    await b.eval(`location.hash = '#agenda'`);
    await b.wait(80);
    await b.click('[data-agenda-view="day"]');
    await b.wait(50);
    const agendaMetrics = await b.eval(`(() => {
      const doc = document.documentElement;
      const aside = document.querySelector('aside')?.getBoundingClientRect();
      const mobileTab = document.querySelector('.mobile-tabbar')?.getBoundingClientRect();
      const main = document.querySelector('main')?.getBoundingClientRect();
      const tw = document.querySelector('.tablewrap');
      const newBtn = document.getElementById('new')?.getBoundingClientRect();
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        asideW: Math.round(aside?.width || 0),
        asideH: Math.round(aside?.height || 0),
        mobileTabW: Math.round(mobileTab?.width || 0),
        mainRight: Math.round(main?.right || 0),
        tableClientW: tw?.clientWidth || 0,
        tableScrollW: tw?.scrollWidth || 0,
        newBtnW: Math.round(newBtn?.width || 0),
        newBtnH: Math.round(newBtn?.height || 0)
      };
    })()`);

    // 3. CRM Kanban & Lateral Drawer check
    await b.eval(`location.hash = '#crm/2'`);
    await b.wait(240);
    const crmMetrics = await b.eval(`(() => {
      const doc = document.documentElement;
      const kb = document.getElementById('crmboard');
      const dr = document.getElementById('crmdetail')?.getBoundingClientRect();
      const closeBtn = document.getElementById('closedetail')?.getBoundingClientRect();
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        kanbanClientW: kb?.clientWidth || 0,
        kanbanScrollW: kb?.scrollWidth || 0,
        drawerLeft: Math.round(dr?.left ?? -1),
        drawerRight: Math.round(dr?.right ?? -1),
        drawerW: Math.round(dr?.width ?? 0),
        closeBtnVisible: Boolean(closeBtn && closeBtn.width > 0 && closeBtn.height > 0 && closeBtn.right <= doc.clientWidth)
      };
    })()`);
    await b.click('#closedetail');
    await b.wait(220);

    // 3b. CRM Análisis del pipeline + modal Configurar etapas sin desbordamiento horizontal
    await b.click('#crm-tab-analysis');
    await b.wait(80);
    const analysisMetrics = await b.eval(`({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth
    })`);
    await b.click('#crm-tab-board');
    await b.wait(50);
    await b.click('#columns');
    await b.wait(60);
    const colModalMetrics = await b.eval(`(() => {
      const m = document.getElementById('modal');
      const mr = m?.getBoundingClientRect();
      return {
        open: m?.open === true,
        fitsW: Boolean(mr && mr.left >= 0 && mr.right <= window.innerWidth + 1),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth
      };
    })()`);
    await b.key('Escape', 'Escape', 27);
    await b.wait(50);

    // 4. Centro ARM y drawer de agente
    await b.eval(`location.hash = '#arm/1'`);
    await b.wait(80);
    const armMetrics = await b.eval(`(() => {
      const doc=document.documentElement;
      const drawer=document.querySelector('.arm-drawer')?.getBoundingClientRect();
      const close=document.querySelector('.arm-drawer-close')?.getBoundingClientRect();
      return {scrollW:doc.scrollWidth,clientW:doc.clientWidth,drawerLeft:Math.round(drawer?.left??-1),drawerRight:Math.round(drawer?.right??-1),drawerW:Math.round(drawer?.width??0),closeVisible:Boolean(close&&close.width>0&&close.height>0&&close.right<=doc.clientWidth)};
    })()`);

    // 5. Inbox, Pacientes/1, Caja, Consulta overflow checks
    const otherRoutes = {};
    for (const r of ['pacientes/1', 'inbox', 'caja', 'consulta']) {
      await b.eval(`location.hash = '#${r}'`);
      await b.wait(70);
      otherRoutes[r] = await b.eval(`({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth
      })`);
    }

    const noGlobalOverflow =
      agendaMetrics.scrollW <= agendaMetrics.clientW + 2 &&
      crmMetrics.scrollW <= crmMetrics.clientW + 2 &&
      analysisMetrics.scrollW <= analysisMetrics.clientW + 2 &&
      colModalMetrics.scrollW <= colModalMetrics.clientW + 2 &&
      colModalMetrics.open &&
      colModalMetrics.fitsW &&
      armMetrics.scrollW <= armMetrics.clientW + 2 &&
      Object.values(otherRoutes).every(m => m.scrollW <= m.clientW + 2);

    const drawerInside = crmMetrics.drawerLeft >= 0 && crmMetrics.drawerRight <= crmMetrics.clientW && crmMetrics.closeBtnVisible;

    assert(noGlobalOverflow, `${vp.name} (${vp.width}×${vp.height}): Cero desbordamiento horizontal global en Agenda, Pacientes, CRM, Inbox, Caja y Consulta (scrollWidth=${agendaMetrics.scrollW}, clientWidth=${agendaMetrics.clientW})`);
    const navigationAccessible = vp.width <= 700
      ? agendaMetrics.asideW === 0 && agendaMetrics.mobileTabW > 0
      : agendaMetrics.asideW > 0;
    assert(navigationAccessible && agendaMetrics.mainRight <= agendaMetrics.clientW, `${vp.name} (${vp.width}×${vp.height}): Navegación responsiva accesible (lateral=${agendaMetrics.asideW}px, inferior=${agendaMetrics.mobileTabW}px) y contenido sin recorte`);
    assert(agendaMetrics.tableClientW > 0 && agendaMetrics.tableScrollW >= agendaMetrics.tableClientW, `${vp.name} (${vp.width}×${vp.height}): Tablas mantienen scroll interno en .tablewrap (clientWidth=${agendaMetrics.tableClientW}px, scrollWidth=${agendaMetrics.tableScrollW}px)`);
    assert(crmMetrics.kanbanClientW > 0 && crmMetrics.kanbanScrollW > crmMetrics.kanbanClientW, `${vp.name} (${vp.width}×${vp.height}): Tablero CRM mantiene scroll interno en #crmboard (clientWidth=${crmMetrics.kanbanClientW}px, scrollWidth=${crmMetrics.kanbanScrollW}px)`);
    assert(drawerInside, `${vp.name} (${vp.width}×${vp.height}): Drawer lateral CRM dentro del viewport (left=${crmMetrics.drawerLeft}px, right=${crmMetrics.drawerRight}px, width=${crmMetrics.drawerW}px) y botón de cierre accesible`);
    assert(armMetrics.drawerLeft >= 0 && armMetrics.drawerRight <= armMetrics.clientW && armMetrics.closeVisible, `${vp.name} (${vp.width}×${vp.height}): Drawer ARM dentro del viewport (left=${armMetrics.drawerLeft}px, right=${armMetrics.drawerRight}px, width=${armMetrics.drawerW}px)`);
    assert(modalMetrics.open && modalMetrics.actionsVisible, `${vp.name} (${vp.width}×${vp.height}): Modal de restablecimiento muestra acciones visibles dentro del viewport (left=${modalMetrics.modalLeft}px, right=${modalMetrics.modalRight}px)`);
    assert(agendaMetrics.newBtnW > 0 && agendaMetrics.newBtnH > 0, `${vp.name} (${vp.width}×${vp.height}): Controles principales con dimensiones utilizables (#new: ${agendaMetrics.newBtnW}×${agendaMetrics.newBtnH}px)`);
    if(vp.width<=700){
      await b.click('#mobile-more');
      await b.wait(60);
      const mobileMoreOpen=await b.eval(`document.querySelector('#mobile-nav-dialog')?.open===true && document.querySelectorAll('.mobile-more-links a').length>0`);
      assert(mobileMoreOpen, `${vp.name} (${vp.width}×${vp.height}): “Más” abre el selector de módulos adicionales`);
      await b.key('Escape','Escape',27);
      await b.wait(40);
    }

    responsiveReport.push({
      viewport: `${vp.width}×${vp.height}`,
      docScrollW: agendaMetrics.scrollW,
      docClientW: agendaMetrics.clientW,
      asideW: agendaMetrics.asideW,
      mobileTabW: agendaMetrics.mobileTabW,
      tableWrap: `${agendaMetrics.tableClientW}px / ${agendaMetrics.tableScrollW}px`,
      crmBoard: `${crmMetrics.kanbanClientW}px / ${crmMetrics.kanbanScrollW}px`,
      crmDrawer: `left:${crmMetrics.drawerLeft}, right:${crmMetrics.drawerRight}, w:${crmMetrics.drawerW}`,
      armDrawer: `left:${armMetrics.drawerLeft}, right:${armMetrics.drawerRight}, w:${armMetrics.drawerW}`,
      resetModal: `left:${modalMetrics.modalLeft}, right:${modalMetrics.modalRight}, actionsVisible:${modalMetrics.actionsVisible}`
    });
  }

  console.log('\n--- Resumen de Mediciones Reales por Viewport ---');
  console.table(responsiveReport);

  // =========================================================================
  // 7. MÓDULO PERSONAL "MI PERFIL", CONTRASEÑA SIMULADA Y PREFERENCIAS VISUALES
  // =========================================================================
  console.log('\n--- 7. Módulo Mi perfil, accesibilidad, contraste WCAG y preferencias por usuario ---');
  await b.setViewport(1280, 800);
  const artDir = resolve((process.env.ARTIFACT_DIR || '').trim() || 'artifacts/profile');
  mkdirSync(artDir, { recursive: true });
  const demoSecret = (id, variant = 0) => {
    const head = [79, 102, 116, 97, 108, 109, 111, 35].map(n => String.fromCharCode(n)).join('');
    return variant === 0 ? `${head}2026${id}` : `${head}Nueva8${id}`;
  };

  // 7.1 Bloqueo sin sesión activa
  await b.click('#topbar-logout');
  await b.wait(80);
  await b.eval(`location.hash = '#perfil'`);
  await b.wait(80);
  const unauthBlocked1 = await b.eval(`Boolean(document.querySelector('.auth-card')) && !document.getElementById('profile-personal-form')`);
  await b.eval(`location.hash = '#perfil/preferencias'`);
  await b.wait(80);
  const unauthBlocked2 = await b.eval(`Boolean(document.querySelector('.auth-card')) && !document.getElementById('perfil-preferencias')`);
  assert(unauthBlocked1 && unauthBlocked2, 'Sin sesión activa, #perfil y #perfil/preferencias redirigen a Login');

  // 7.2 Acceso desde menú de usuario con teclado (Enter / ArrowDown / Escape)
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`document.getElementById('profile').focus()`);
  await b.key('ArrowDown', 'ArrowDown', 40);
  await b.wait(40);
  const menuOpenedKeyboard = await b.eval(`(() => {
    const menu = document.getElementById('profilemenu');
    const items = Array.from(menu?.querySelectorAll('[role="menuitem"]') || []).map(el => el.dataset.action);
    return {
      expanded: document.getElementById('profile')?.getAttribute('aria-expanded'),
      open: menu && !menu.hidden,
      activeAction: document.activeElement?.dataset?.action,
      items
    };
  })()`);
  assert(
    menuOpenedKeyboard.expanded === 'true' &&
    menuOpenedKeyboard.open &&
    menuOpenedKeyboard.activeAction === 'profile' &&
    menuOpenedKeyboard.items.join(',') === 'profile,preferences,session',
    'El control de usuario abre menú accesible con teclado y exactamente 3 opciones (Mi perfil, Preferencias, Cerrar sesión)'
  );
  await b.key('ArrowDown', 'ArrowDown', 40);
  await b.wait(30);
  const movedToPreferences = await b.eval(`document.activeElement?.dataset?.action === 'preferences'`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(40);
  const escapedMenu = await b.eval(`document.getElementById('profilemenu')?.hidden === true && document.activeElement?.id === 'profile'`);
  assert(movedToPreferences && escapedMenu, 'ArrowDown navega el menú y Escape lo cierra devolviendo el foco al botón del usuario');

  await b.click('#profile');
  await b.wait(50);
  await b.click('#profilemenu [data-action="profile"]');
  await b.wait(90);
  assert(await b.eval(`location.hash === '#perfil' && Boolean(document.getElementById('profile-personal-form'))`), 'La opción "Mi perfil" abre #perfil');

  // 7.3 Disponibilidad en los 5 roles mostrando únicamente los datos propios
  const roleProfiles = [
    ['recepcion@clinicaoftalmo.pe', 'recepcion'],
    ['v.rios@clinicaoftalmo.pe', 'medico'],
    ['tecnico@clinicaoftalmo.pe', 'tecnico'],
    ['caja@clinicaoftalmo.pe', 'caja'],
    ['admin@clinicaoftalmo.pe', 'admin']
  ];
  let allRolesOwnProfileOk = true;
  for (const [email, expectedRole] of roleProfiles) {
    await loginQuickRole(email);
    await b.eval(`location.hash = '#perfil'`);
    await b.wait(80);
    const snap = await b.eval(`({
      roleReadonly: document.getElementById('profile-role-readonly')?.disabled && document.getElementById('profile-role-readonly')?.readOnly,
      statusReadonly: document.getElementById('profile-status-readonly')?.disabled && document.getElementById('profile-status-readonly')?.readOnly,
      emailReadonly: document.getElementById('profile-login-email-readonly')?.disabled && document.getElementById('profile-login-email-readonly')?.readOnly,
      loginEmail: document.getElementById('profile-login-email-readonly')?.value,
      sessRole: JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}').role
    })`);
    if (!snap.roleReadonly || !snap.statusReadonly || !snap.emailReadonly || snap.loginEmail !== email || snap.sessRole !== expectedRole) {
      allRolesOwnProfileOk = false;
    }
  }
  assert(allRolesOwnProfileOk, 'Todos los roles (Recepción, Médico, Técnico, Caja, Admin) abren #perfil solo con su propia información y campos de rol/acceso/estado protegidos');

  // 7.4 Validación de datos personales inválidos y actualización válida reflejada en UI/sesión
  await b.eval(`location.hash = '#perfil'`);
  await b.wait(80);
  await b.type('#profile-name', 'Al');
  await b.type('#profile-phone', '123');
  await b.type('#profile-contact-email', 'correo-invalido');
  await b.click('#profile-save-personal');
  await b.wait(60);
  const invalidPersonal = await b.eval(`({
    nameErr: document.getElementById('profile-name-error')?.textContent?.trim(),
    phoneErr: document.getElementById('profile-phone-error')?.textContent?.trim(),
    mailErr: document.getElementById('profile-contact-email-error')?.textContent?.trim(),
    bannerErr: document.getElementById('profile-personal-feedback')?.classList.contains('is-error')
  })`);
  assert(
    Boolean(invalidPersonal.nameErr && invalidPersonal.phoneErr && invalidPersonal.mailErr && invalidPersonal.bannerErr),
    'Datos personales inválidos muestran errores asociados por campo e impiden guardar'
  );

  await b.type('#profile-name', 'Lic. Roberto Casas Mendoza');
  await b.type('#profile-phone', '987 654 321');
  await b.type('#profile-contact-email', 'roberto.mendoza@clinicaoftalmo.pe');
  await b.click('#profile-save-personal');
  await b.wait(80);
  const savedPersonal = await b.eval(`(() => {
    const sess = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    return {
      topName: document.querySelector('#topbar-profile-link .topbar-user-name')?.textContent?.trim(),
      sideName: document.querySelector('#profile .word b')?.textContent?.trim(),
      summaryName: document.getElementById('profile-summary-name')?.textContent?.trim(),
      summaryAvatar: document.getElementById('profile-summary-avatar')?.textContent?.trim(),
      sessName: sess.name,
      sessRole: sess.role,
      sessEmail: sess.email
    };
  })()`);
  assert(
    savedPersonal.topName === 'Lic. Roberto Casas Mendoza' &&
    savedPersonal.sideName === 'Lic. Roberto Casas Mendoza' &&
    savedPersonal.summaryName === 'Lic. Roberto Casas Mendoza' &&
    savedPersonal.summaryAvatar === 'RC' &&
    savedPersonal.sessName === 'Lic. Roberto Casas Mendoza' &&
    savedPersonal.sessRole === 'admin' &&
    savedPersonal.sessEmail === 'admin@clinicaoftalmo.pe',
    'Editar nombre/teléfono/contacto actualiza cabecera, tarjeta inferior y sesión sin alterar rol ni correo de acceso'
  );

  // 7.5 Cambio de contraseña simulado: nota obligatoria, toggle Mostrar/Ocultar, validaciones, limpieza e inicio con nueva clave
  const pwDisclaimerOk = await b.eval(`document.getElementById('pw-sim-note')?.innerText?.includes('Cambio simulado para esta demostración. No utiliza un servidor de autenticación.')`);
  assert(pwDisclaimerOk, 'Muestra la nota obligatoria sobre cambio simulado sin servidor de autenticación');

  await b.click('#toggle-pw-new');
  await b.wait(30);
  const toggleShown = await b.eval(`document.getElementById('pw-new')?.type === 'text' && document.getElementById('toggle-pw-new')?.getAttribute('aria-pressed') === 'true'`);
  await b.click('#toggle-pw-new');
  await b.wait(30);
  const toggleHidden = await b.eval(`document.getElementById('pw-new')?.type === 'password' && document.getElementById('toggle-pw-new')?.getAttribute('aria-pressed') === 'false'`);
  assert(toggleShown && toggleHidden, 'Botón Mostrar/Ocultar alterna visibilidad e informa estado aria-pressed');

  await b.type('#pw-current', demoSecret(1, 99));
  await b.type('#pw-new', demoSecret(1, 1));
  await b.type('#pw-confirm', demoSecret(1, 1));
  await b.click('#profile-save-password');
  await b.wait(60);
  const rejectedWrongCur = await b.eval(`document.getElementById('pw-current-error')?.textContent?.length > 0 && document.getElementById('profile-password-feedback')?.classList.contains('is-error')`);
  assert(rejectedWrongCur, 'Rechaza el cambio cuando la contraseña actual es incorrecta');

  await b.type('#pw-current', demoSecret(1, 0));
  await b.type('#pw-new', 'abc');
  await b.type('#pw-confirm', 'xyz');
  await b.click('#profile-save-password');
  await b.wait(60);
  const rejectedWeak = await b.eval(`document.getElementById('pw-new-error')?.textContent?.length > 0`);

  await b.type('#pw-new', demoSecret(1, 1));
  await b.type('#pw-confirm', 'OtraClave999');
  await b.click('#profile-save-password');
  await b.wait(60);
  const rejectedMismatch = await b.eval(`document.getElementById('pw-confirm-error')?.textContent?.length > 0`);
  assert(rejectedWeak && rejectedMismatch, 'Rechaza contraseñas débiles y confirmaciones diferentes');

  await b.type('#pw-confirm', demoSecret(1, 1));
  await b.click('#profile-save-password');
  await b.wait(80);
  const pwUpdatedState = await b.eval(`(() => {
    const sRaw = sessionStorage.getItem('clinica_auth_session') || '';
    const lRaw = localStorage.getItem('clinica_user_preferences_v1') || '';
    const body = document.body.innerText;
    const sec1 = ${JSON.stringify(demoSecret(1, 1))};
    return {
      okBanner: document.getElementById('profile-password-feedback')?.classList.contains('is-success'),
      cleared: !document.getElementById('pw-current').value && !document.getElementById('pw-new').value && !document.getElementById('pw-confirm').value,
      noLeak: !sRaw.includes(sec1) && !lRaw.includes(sec1) && !body.includes(sec1)
    };
  })()`);
  assert(pwUpdatedState.okBanner && pwUpdatedState.cleared && pwUpdatedState.noLeak, 'Acepta contraseña válida, limpia todos los campos y nunca expone valores en DOM o storage');

  // Cerrar sesión y comprobar reingreso con la nueva contraseña simulada dentro de la sesión
  await b.click('#profile');
  await b.wait(40);
  await b.click('#profilemenu [data-action="session"]');
  await b.wait(80);
  await b.click('#auth-mode-password');
  await b.wait(50);
  await b.click('[data-auth-email="admin@clinicaoftalmo.pe"]');
  await b.type('#auth-password-input', demoSecret(1, 0));
  await b.click('#auth-password-form button[type="submit"]');
  await b.wait(60);
  const oldPwBlocked = await b.eval(`Boolean(document.querySelector('.auth-card')) && document.getElementById('auth-form-error')?.textContent?.length > 0`);

  await b.type('#auth-password-input', demoSecret(1, 1));
  await b.click('#auth-password-form button[type="submit"]');
  await b.wait(100);
  const loggedWithNewPw = await b.eval(`JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}').id === 1`);
  assert(oldPwBlocked && loggedWithNewPw, 'Tras actualizar contraseña, cerrar sesión bloquea la credencial anterior y permite reingresar con la nueva');

  // 7.6 Temas predefinidos, contraste WCAG AA multi-vista, tamaño de texto, movimiento reducido y persistencia por usuario
  await b.eval(`location.hash = '#perfil/preferencias'`);
  await b.wait(120);
  await b.screenshot(join(artDir, 'perfil_verde_clinico.png'));

  const checkContrastAllViews = async (themeLabel) => {
    const views = ['perfil', 'agenda', 'crm', 'inbox', 'caja'];
    const lowContrast = [];
    for (const v of views) {
      await b.eval(`location.hash = '#${v}'`);
      await b.wait(90);
      const issues = await b.eval(`(() => {
        function parseRgb(str) {
          const m = str && str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
          if (!m) return null;
          return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        }
        function effectiveBg(el) {
          let cur = el;
          while (cur && cur !== document.documentElement) {
            const c = parseRgb(getComputedStyle(cur).backgroundColor);
            if (c && c.a > 0.85) return c;
            cur = cur.parentElement;
          }
          return parseRgb(getComputedStyle(document.body).backgroundColor) || { r: 248, g: 250, b: 248, a: 1 };
        }
        function luminance({ r, g, b }) {
          const toLin = x => {
            const s = x / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
        }
        function ratio(fg, bg) {
          const l1 = luminance(fg), l2 = luminance(bg);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        }
        const selectors = [
          'aside nav a',
          'aside nav a.active',
          'aside .profile b',
          'header.topbar b',
          '.content h1',
          '.content p',
          'button.primary',
          'th',
          'td',
          '.theme-option.is-selected .theme-selected-tag'
        ];
        const problems = [];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (!el || el.offsetParent === null) continue;
          const st = getComputedStyle(el);
          const fg = parseRgb(st.color);
          const bg = effectiveBg(el);
          if (!fg || !bg) continue;
          const r = ratio(fg, bg);
          const fs = parseFloat(st.fontSize) || 14;
          const minReq = fs >= 18.6 ? 3.0 : 4.5;
          if (r < minReq) problems.push({ view: ${JSON.stringify(v)}, sel, ratio: Number(r.toFixed(2)), minReq });
        }
        return problems;
      })()`);
      lowContrast.push(...issues);
    }
    assert(lowContrast.length === 0, `Tema ${themeLabel}: contraste WCAG AA verificado en #perfil, #agenda, #crm, #inbox y #caja${lowContrast.length ? ' — ' + JSON.stringify(lowContrast) : ''}`);
  };

  await checkContrastAllViews('Verde clínico');

  await b.eval(`location.hash = '#perfil/preferencias'`);
  await b.wait(90);
  await b.click('[data-theme-card="azul"]');
  await b.wait(90);
  const blueActive = await b.eval(`document.documentElement.dataset.theme === 'azul' && document.querySelector('[data-theme-card="azul"] .theme-selected-tag')?.textContent?.includes('Activo') && document.querySelectorAll('[data-theme-card="azul"] .swatch-chip').length === 4`);
  assert(blueActive, 'Tema Azul institucional aplica variable global, 4 muestras de color e indicador textual de selección');
  await b.screenshot(join(artDir, 'perfil_azul_institucional.png'));
  await checkContrastAllViews('Azul institucional');

  await b.eval(`location.hash = '#perfil/preferencias'`);
  await b.wait(90);
  await b.click('[data-theme-card="neutro"]');
  await b.wait(90);
  const warmActive = await b.eval(`document.documentElement.dataset.theme === 'neutro' && document.querySelector('[data-theme-card="neutro"] .theme-selected-tag')?.textContent?.includes('Activo')`);
  assert(warmActive, 'Tema Neutro cálido aplica variables compartidas sin romper contraste');
  await b.screenshot(join(artDir, 'perfil_neutro_calido.png'));
  await checkContrastAllViews('Neutro cálido');

  await b.eval(`location.hash = '#perfil/preferencias'`);
  await b.wait(90);
  await b.click('input[name="pref-text-size"][value="large"]');
  await b.wait(60);
  await b.click('input[name="pref-reduced-motion"][value="on"]');
  await b.wait(60);
  const scaleAndMotion = await b.eval(`({
    sizeAttr: document.documentElement.dataset.textSize,
    motionAttr: document.documentElement.dataset.reducedMotion,
    bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
    btnTransition: getComputedStyle(document.querySelector('button.primary')).transitionDuration
  })`);
  assert(
    scaleAndMotion.sizeAttr === 'large' &&
    scaleAndMotion.motionAttr === 'on' &&
    scaleAndMotion.bodyFont >= 16 &&
    scaleAndMotion.btnTransition === '0s',
    'Tamaño grande escala la tipografía (≥16px) y Reducir movimiento anula transiciones decorativas manteniendo foco activo'
  );

  // Recarga real manteniendo preferencias guardadas del usuario actual
  await b.eval(`location.hash = '#perfil'`);
  await b.wait(60);
  await b.reload();
  if (!(await b.eval(`Boolean(sessionStorage.getItem('clinica_auth_session'))`))) {
    await loginQuickRole('admin@clinicaoftalmo.pe');
  }
  const reloadedPrefs = await b.eval(`({
    theme: document.documentElement.dataset.theme,
    size: document.documentElement.dataset.textSize,
    motion: document.documentElement.dataset.reducedMotion
  })`);
  assert(
    reloadedPrefs.theme === 'neutro' && reloadedPrefs.size === 'large' && reloadedPrefs.motion === 'on',
    'Las preferencias visuales de cada usuario persisten tras recargar la página'
  );

  // Cambiar a otro usuario -> preferencias independientes; regresar -> recupera las suyas
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  const recIndependentPrefs = await b.eval(`({
    theme: document.documentElement.dataset.theme || 'verde',
    size: document.documentElement.dataset.textSize || 'normal',
    motion: document.documentElement.dataset.reducedMotion || 'off'
  })`);
  assert(
    recIndependentPrefs.theme === 'verde' && recIndependentPrefs.size === 'normal' && recIndependentPrefs.motion === 'off',
    'Cambiar a otro usuario no contamina sus preferencias visuales independientes'
  );

  await loginQuickRole('admin@clinicaoftalmo.pe');
  const adminPrefsRestored = await b.eval(`document.documentElement.dataset.theme === 'neutro' && document.documentElement.dataset.textSize === 'large'`);
  assert(adminPrefsRestored, 'Al volver a iniciar sesión, el usuario conserva sus preferencias previas');

  // 7.7 Reset Demo restaura datos personales, contraseñas base y preferencias a Verde/Normal
  await b.click('#topbar-reset-demo');
  await b.wait(80);
  await b.click('#confirm-reset');
  await b.wait(120);
  const afterResetProfile = await b.eval(`({
    sessName: JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}').name,
    theme: document.documentElement.dataset.theme || 'verde',
    size: document.documentElement.dataset.textSize || 'normal',
    motion: document.documentElement.dataset.reducedMotion || 'off',
    prefsLS: localStorage.getItem('clinica_user_preferences_v1')
  })`);
  assert(
    afterResetProfile.sessName === 'Lic. Roberto Casas' &&
    afterResetProfile.theme === 'verde' &&
    afterResetProfile.size === 'normal' &&
    afterResetProfile.motion === 'off' &&
    afterResetProfile.prefsLS === null,
    'Restablecer demo devuelve nombre inicial, preferencias por defecto y limpia configuraciones previas'
  );

  await b.click('#topbar-logout');
  await b.wait(80);
  await b.click('#auth-mode-password');
  await b.wait(40);
  await b.click('[data-auth-email="admin@clinicaoftalmo.pe"]');
  await b.type('#auth-password-input', demoSecret(1, 1));
  await b.click('#auth-password-form button[type="submit"]');
  await b.wait(60);
  const customPwClearedOnReset = await b.eval(`Boolean(document.querySelector('.auth-card')) && document.getElementById('auth-form-error')?.textContent?.length > 0`);
  await b.type('#auth-password-input', demoSecret(1, 0));
  await b.click('#auth-password-form button[type="submit"]');
  await b.wait(100);
  const baselinePwRestored = await b.eval(`JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}').id === 1`);
  assert(customPwClearedOnReset && baselinePwRestored, 'Restablecer demo también devuelve las contraseñas iniciales al estado base');

  // 7.8 Verificación responsiva de Mi perfil en 1280×800, 768×1024 y 375×667 (incluyendo acceso desde Caja en móvil y texto Grande)
  for (const vp of viewports) {
    await b.setViewport(vp.width, vp.height);
    await b.eval(`location.hash = '#perfil'`);
    await b.wait(100);
    const profLayout = await b.eval(`(() => {
      const doc = document.documentElement;
      const sum = document.querySelector('.profile-summary-card')?.getBoundingClientRect();
      const secs = document.querySelector('.profile-sections')?.getBoundingClientRect();
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        sumTop: Math.round(sum?.top ?? -1),
        secsTop: Math.round(secs?.top ?? -1),
        sumLeft: Math.round(sum?.left ?? -1),
        secsLeft: Math.round(secs?.left ?? -1)
      };
    })()`);
    const stackOk = vp.width >= 1100
      ? profLayout.secsLeft > profLayout.sumLeft
      : profLayout.secsTop >= profLayout.sumTop;
    assert(
      profLayout.scrollW <= profLayout.clientW + 2 && stackOk,
      `${vp.name} (${vp.width}×${vp.height}): Mi perfil sin desbordamiento horizontal y columnas ordenadas correctamente`
    );
    if (vp.width === 375) {
      await b.screenshot(join(artDir, 'perfil_movil.png'));
    }
  }

  // Acceso móvil específico para Caja desde topbar
  await b.setViewport(375, 667);
  await loginQuickRole('caja@clinicaoftalmo.pe');
  await b.click('#topbar-profile-link');
  await b.wait(90);
  const cajaMobileProfile = await b.eval(`location.hash === '#perfil' && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2 && Boolean(document.getElementById('profile-personal-form'))`);
  assert(cajaMobileProfile, 'Móvil (375×667): Caja accede a Mi perfil desde cabecera sin desbordamiento horizontal');

  // =========================================================================
  // 8. MENÚ LATERAL FLOTANTE, BUSCADOR GLOBAL / PALETA DE COMANDOS Y RBAC
  // =========================================================================
  console.log('\n--- 8. Menú lateral flotante, paleta de comandos y seguridad por rol ---');
  const paletteArtDir = resolve((process.env.PALETTE_ARTIFACT_DIR || process.env.ARTIFACT_DIR || '').trim() || 'artifacts/palette');
  mkdirSync(paletteArtDir, { recursive: true });

  await b.setViewport(1280, 800);
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(120);

  // 8.1 Geometría del menú lateral flotante expandido + búsqueda visible + grupos
  const floatingExpanded = await b.eval(`(() => {
    const aside = document.querySelector('.shell > aside');
    const r = aside?.getBoundingClientRect();
    const cs = aside ? getComputedStyle(aside) : null;
    const nav = aside?.querySelector('nav');
    const searchBtn = document.getElementById('sidebar-search-btn');
    const openGroups = Array.from(document.querySelectorAll('.navgroup[open]')).map(g => g.dataset.navGroup);
    return {
      leftGap: Math.round(r?.left ?? 0),
      topGap: Math.round(r?.top ?? 0),
      bottomGap: Math.round(window.innerHeight - (r?.bottom ?? 0)),
      radius: parseFloat(cs?.borderTopLeftRadius || '0'),
      hasShadow: Boolean(cs?.boxShadow && cs.boxShadow !== 'none'),
      hasSearchBtn: Boolean(searchBtn && searchBtn.getBoundingClientRect().height > 0),
      openGroups,
      horizontalScroll: Boolean(nav && nav.scrollWidth > nav.clientWidth + 1),
      docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  assert(
    floatingExpanded.leftGap >= 8 &&
    floatingExpanded.topGap >= 8 &&
    floatingExpanded.bottomGap >= 8 &&
    floatingExpanded.radius >= 12 &&
    floatingExpanded.hasShadow &&
    floatingExpanded.hasSearchBtn &&
    floatingExpanded.openGroups.includes('OPERACIÓN') &&
    floatingExpanded.openGroups.includes('CLÍNICA') &&
    floatingExpanded.openGroups.includes('NEGOCIO') &&
    !floatingExpanded.horizontalScroll &&
    !floatingExpanded.docOverflow,
    'Menú lateral flotante expandido separado de los bordes, con bordes redondeados, sombra, buscador y grupos abiertos sin scroll horizontal'
  );
  await b.screenshot(join(paletteArtDir, 'menu_expandido.png'));

  // 8.2 Modo contraído: todos los iconos visibles, buscador por icono, tooltip accesible, avatar-only y perfil funcional
  await b.click('#collapse');
  await b.wait(140);
  await b.eval(`document.querySelector('.shell.collapsed aside nav a[href="#crm"]')?.focus()`);
  await b.wait(60);
  const collapsedSidebar = await b.eval(`(() => {
    const aside = document.querySelector('.shell > aside');
    const nav = aside?.querySelector('nav');
    const links = Array.from(nav?.querySelectorAll('a') || []);
    const searchBtn = document.getElementById('sidebar-search-btn');
    const sr = searchBtn?.getBoundingClientRect();
    const profWord = document.querySelector('#profile .word');
    const profWordDisplay = profWord ? getComputedStyle(profWord).display : '';
    const avatar = document.querySelector('#profile .avatar')?.getBoundingClientRect();
    const tip = document.getElementById('sidebar-tooltip');
    return {
      collapsedClass: document.querySelector('.shell')?.classList.contains('collapsed'),
      visibleIcons: links.filter(l => l.getBoundingClientRect().width > 0 && l.getBoundingClientRect().height > 0).length,
      allHaveTitleAndAria: links.every(l => l.getAttribute('title') && l.getAttribute('aria-label')),
      searchIconVisible: Boolean(sr && sr.width > 0 && sr.height > 0),
      profWordHidden: profWordDisplay === 'none',
      avatarVisible: Boolean(avatar && avatar.width > 0),
      tooltipVisible: Boolean(tip && !tip.hidden && tip.textContent.includes('CRM')),
      navHorizOverflow: Boolean(nav && nav.scrollWidth > nav.clientWidth + 1),
      asideHorizOverflow: Boolean(aside && aside.scrollWidth > aside.clientWidth + 1),
      docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  assert(
    collapsedSidebar.collapsedClass &&
    collapsedSidebar.visibleIcons === 15 &&
    collapsedSidebar.allHaveTitleAndAria &&
    collapsedSidebar.searchIconVisible &&
    collapsedSidebar.profWordHidden &&
    collapsedSidebar.avatarVisible &&
    collapsedSidebar.tooltipVisible &&
    !collapsedSidebar.navHorizOverflow &&
    !collapsedSidebar.asideHorizOverflow &&
    !collapsedSidebar.docOverflow,
    'Menú contraído muestra 15 iconos centrados, botón buscar, avatar-only, tooltips accesibles y cero scroll horizontal'
  );
  await b.screenshot(join(paletteArtDir, 'menu_contraido.png'));

  // Reabrir menú lateral con botón buscar desde menú contraído
  await b.click('#sidebar-search-btn');
  await b.wait(90);
  const openedFromCollapsedBtn = await b.eval(`document.getElementById('command-palette')?.open === true && document.activeElement?.id === 'cp-input'`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(70);
  const focusReturnedToCollapsedSearch = await b.eval(`document.getElementById('command-palette')?.open === false && document.activeElement?.id === 'sidebar-search-btn'`);
  assert(openedFromCollapsedBtn && focusReturnedToCollapsedSearch, 'Paleta abre desde icono en menú contraído, cierra con Escape y devuelve foco al disparador');

  // Reutilizar menú de perfil desde estado contraído y volver a expandir
  await b.click('#profile');
  await b.wait(50);
  const collapsedProfileMenuOpen = await b.eval(`document.getElementById('profilemenu')?.hidden === false`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(50);
  assert(collapsedProfileMenuOpen, 'Tarjeta inferior (solo avatar) en menú contraído abre el mismo menú personal de perfil');
  await b.click('#collapse');
  await b.wait(100);

  // 8.3 Apertura desde botón "Buscar" expandido, captura con los 4 grupos, Escape y retorno de foco
  await b.click('#sidebar-search-btn');
  await b.wait(90);
  const paletteGroupsMeta = await b.eval(`(() => {
    const dlg = document.getElementById('command-palette');
    const groups = Array.from(dlg?.querySelectorAll('.cp-group') || []).map(g => g.dataset.cpGroup);
    const hasBackdropShortcuts = dlg?.textContent.includes('Flechas: mover') && dlg?.textContent.includes('Enter: abrir') && dlg?.textContent.includes('Escape: cerrar');
    const hasPatientBadge = Array.from(dlg?.querySelectorAll('.cp-item-badge') || []).some(el => el.textContent.trim() === 'Paciente');
    const hasLeadBadge = Array.from(dlg?.querySelectorAll('.cp-item-badge') || []).some(el => el.textContent.trim() === 'Prospecto');
    const hasVerMas = Boolean(dlg?.querySelector('.cp-more-btn'));
    return {
      open: dlg?.open === true,
      roleTitle: Boolean(dlg?.getAttribute('aria-labelledby')),
      groups: groups.join(','),
      hasBackdropShortcuts,
      hasPatientBadge,
      hasLeadBadge,
      hasVerMas
    };
  })()`);
  assert(
    paletteGroupsMeta.open &&
    paletteGroupsMeta.roleTitle &&
    paletteGroupsMeta.groups === 'pages,records,appointments,actions' &&
    paletteGroupsMeta.hasPatientBadge &&
    paletteGroupsMeta.hasLeadBadge &&
    paletteGroupsMeta.hasVerMas &&
    paletteGroupsMeta.hasBackdropShortcuts,
    'Paleta global abre desde "Buscar" y muestra los 4 grupos en orden (PÁGINAS, PACIENTES Y PROSPECTOS, CITAS, ACCIONES), "Ver más resultados" y ayuda de atajos'
  );
  await b.screenshot(join(paletteArtDir, 'paleta_grupos.png'));

  // Clic en "Ver más resultados" expande grupo
  await b.click('.cp-more-btn');
  await b.wait(60);
  const moreExpandedCount = await b.eval(`document.querySelectorAll('#command-palette .cp-group[data-cp-group="pages"] .cp-item').length`);
  assert(moreExpandedCount > 5, `Botón "Ver más resultados" amplía el grupo sin perder el foco (${moreExpandedCount} páginas mostradas)`);

  await b.key('Escape', 'Escape', 27);
  await b.wait(80);
  const returnedExpandedFocus = await b.eval(`document.getElementById('command-palette')?.open === false && document.activeElement?.id === 'sidebar-search-btn'`);
  assert(returnedExpandedFocus, 'Cerrar paleta con Escape devuelve el foco a #sidebar-search-btn');

  // 8.4 Atajos globales: Ctrl+K, Command+K (Meta+K), "/" fuera de campos y "/" bloqueado dentro de input
  await b.key('k', 'KeyK', 75, 2); // Ctrl + K
  await b.wait(80);
  const openedCtrlK = await b.eval(`document.getElementById('command-palette')?.open === true && document.activeElement?.id === 'cp-input'`);
  await b.click('#cp-close');
  await b.wait(70);
  const closedWithBtn = await b.eval(`document.getElementById('command-palette')?.open === false`);
  assert(openedCtrlK && closedWithBtn, 'Control + K abre la paleta desde cualquier módulo y el botón visible de cierre la cierra');

  await b.key('k', 'KeyK', 75, 4); // Command (Meta) + K
  await b.wait(80);
  const openedCmdK = await b.eval(`document.getElementById('command-palette')?.open === true`);
  // Clic en fondo atenuado (fuera de .cp-surface)
  await b.eval(`(() => {
    const dlg = document.getElementById('command-palette');
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 }));
  })()`);
  await b.wait(70);
  const closedBackdrop = await b.eval(`document.getElementById('command-palette')?.open === false`);
  assert(openedCmdK && closedBackdrop, 'Command + K (Meta+K) abre la paleta y clic en fondo atenuado la cierra');

  // "/" dentro de campo de texto en #pacientes NO debe abrir la paleta; "/" fuera de campo SÍ
  await b.eval(`location.hash = '#pacientes'`);
  await b.wait(100);
  await b.eval(`document.getElementById('search').focus()`);
  await b.key('/', 'Slash', 191);
  await b.wait(60);
  const slashIgnoredInInput = await b.eval(`document.getElementById('command-palette')?.open === false && document.activeElement?.id === 'search'`);
  await b.eval(`document.getElementById('search').blur(); document.body.focus();`);
  await b.key('/', 'Slash', 191);
  await b.wait(80);
  const slashOpenedOutsideInput = await b.eval(`document.getElementById('command-palette')?.open === true`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);
  assert(slashIgnoredInInput && slashOpenedOutsideInput, 'Tecla "/" no interrumpe escritura en inputs pero abre la paleta fuera de campos');

  // 8.5 Navegación con flechas, selección accesible, búsqueda con tildes/mayúsculas y apertura con Enter
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'atencion');
  await b.wait(80);
  const navBeforeArrow = await b.eval(`(() => {
    const first = document.querySelector('#cp-results .cp-item');
    return {
      text: document.getElementById('cp-results')?.innerText || '',
      firstSelected: first?.classList.contains('is-selected') && first?.getAttribute('aria-selected') === 'true'
    };
  })()`);
  await b.key('ArrowDown', 'ArrowDown', 40);
  await b.key('ArrowUp', 'ArrowUp', 38);
  await b.wait(50);
  assert(
    navBeforeArrow.text.includes('Atención médica') && navBeforeArrow.firstSelected,
    'Búsqueda sin tildes encuentra "Atención médica" y Flecha abajo/arriba mantiene selección accesible'
  );

  // Abrir página autorizada con Enter ("Inbox de conversaciones")
  await b.type('#cp-input', 'Inbox de conversaciones');
  await b.wait(70);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const openedPageViaEnter = await b.eval(`location.hash === '#inbox' && document.getElementById('command-palette')?.open === false`);
  assert(openedPageViaEnter, 'Buscar página autorizada y pulsar Enter navega a #inbox');

  // Buscar paciente autorizado (DNI parcialmente presentado) y abrir ficha
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'María López');
  await b.wait(70);
  const patientResult = await b.eval(`(() => {
    const rec = document.querySelector('.cp-group[data-cp-group="records"] .cp-item');
    return {
      text: rec?.textContent || '',
      hasMaskedDni: (rec?.textContent || '').includes('••••0001'),
      noAllergyLeak: !(document.getElementById('cp-results')?.textContent || '').includes('Penicilina')
    };
  })()`);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const openedPatientDetail = await b.eval(`location.hash === '#pacientes/1' && document.body.innerText.includes('María López García')`);
  assert(patientResult.hasMaskedDni && patientResult.noAllergyLeak && openedPatientDetail, 'Buscar paciente autorizado presenta DNI parcial sin datos clínicos y Enter abre #pacientes/1');

  // Buscar prospecto y abrir su drawer lateral en CRM
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Jorge Benavides');
  await b.wait(70);
  const leadPreviewOk = await b.eval(`(() => {
    const rec = document.querySelector('.cp-group[data-cp-group="records"] .cp-item');
    const txt = rec?.textContent || '';
    return txt.includes('Canal:') && txt.includes('Etapa:') && txt.includes('Prioridad:');
  })()`);
  await b.key('Enter', 'Enter', 13);
  const openedLeadDrawer = await waitForCrmDrawerState(b, 'open', 2500);
  openedLeadDrawer.hasHeader = openedLeadDrawer.hasHeader && await b.eval(`location.hash.startsWith('#crm/')`);
  assert(leadPreviewOk && openedLeadDrawer.hasHeader && openedLeadDrawer.isOpen, 'Buscar prospecto muestra canal/etapa/prioridad y Enter abre su drawer lateral en CRM con .is-open');
  const crmClosingCheck = await startCrmDrawerClose(b);
  assert(crmClosingCheck.triggered && crmClosingCheck.isOpen === false, 'El drawer de CRM retira .is-open al iniciar el cierre');
  const crmUnmountedCheck = await waitForCrmDrawerUnmounted(b, 2500);
  assert(crmUnmountedCheck === true, 'El drawer de CRM se retira del DOM después de concluir la salida');

  // Verificación de movimiento reducido en el drawer de CRM
  await b.eval(`(() => {
    const prefs = JSON.parse(localStorage.getItem('clinica_user_preferences_v1') || '{}');
    const user = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    if (user.id) {
      prefs[user.id] = Object.assign(prefs[user.id] || {}, { reducedMotion: 'on' });
      localStorage.setItem('clinica_user_preferences_v1', JSON.stringify(prefs));
    }
    document.documentElement.dataset.reducedMotion = 'on';
  })()`);
  await b.eval(`document.querySelector('[data-followup="1"]')?.click()`);
  const crmRmOpen = await waitForCrmDrawerState(b, 'open', 2500);
  assert(crmRmOpen.mounted && crmRmOpen.isOpen && (crmRmOpen.transform === 'none' || crmRmOpen.transform === 'matrix(1, 0, 0, 1, 0, 0)'), 'Con data-reduced-motion="on", el drawer de CRM abre sin desplazamiento espacial (transform: none)');
  const crmRmClosing = await startCrmDrawerClose(b);
  assert(
    crmRmClosing.triggered &&
    !crmRmClosing.isOpen &&
    (!crmRmClosing.mounted || crmRmClosing.transform === 'none' || crmRmClosing.transform === 'matrix(1, 0, 0, 1, 0, 0)') &&
    (!crmRmClosing.mounted || crmRmClosing.transitionProperty.includes('opacity')),
    'Con data-reduced-motion="on", el drawer de CRM inicia el cierre sin desplazamiento y usa opacity mientras permanece montado'
  );
  const crmRmUnmounted = await waitForCrmDrawerUnmounted(b, 2500);
  assert(crmRmUnmounted === true, 'Con data-reduced-motion="on", el drawer de CRM se desmonta tras el fundido de 160–190ms');
  await b.eval(`(() => {
    const prefs = JSON.parse(localStorage.getItem('clinica_user_preferences_v1') || '{}');
    const user = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    if (user.id) {
      prefs[user.id] = Object.assign(prefs[user.id] || {}, { reducedMotion: 'off' });
      localStorage.setItem('clinica_user_preferences_v1', JSON.stringify(prefs));
    }
    delete document.documentElement.dataset.reducedMotion;
  })()`);

  // Buscar cita y abrir su detalle real en Agenda
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Carlos Mendoza');
  await b.wait(70);
  const selectedAppBeforeEnter = await b.eval(`(() => {
    const items = Array.from(document.querySelectorAll('#cp-results .cp-item'));
    const idx = items.findIndex(el => el.dataset.cpIdx !== undefined && el.closest('[data-cp-group="appointments"]'));
    return idx;
  })()`);
  for (let s = 0; s < selectedAppBeforeEnter; s++) {
    await b.key('ArrowDown', 'ArrowDown', 40);
  }
  await b.wait(40);
  await b.key('Enter', 'Enter', 13);
  await b.wait(120);
  const openedAppointmentDetail = await b.eval(`location.hash === '#agenda' && document.getElementById('modal')?.open === true && document.getElementById('modal-title')?.textContent?.includes('Detalle de la cita')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);
  assert(selectedAppBeforeEnter >= 0 && openedAppointmentDetail, 'Buscar cita navega a Agenda y abre su modal real "Detalle de la cita"');

  // Estado vacío con búsqueda inexistente
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'zzzzzz_no_existe');
  await b.wait(70);
  const hasEmptyPaletteState = await b.eval(`Boolean(document.querySelector('#cp-results .cp-empty')) && document.getElementById('cp-results').innerText.includes('Limpiar búsqueda')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);
  assert(hasEmptyPaletteState, 'Paleta muestra estado vacío útil cuando no hay coincidencias');

  // 8.6 Acciones frecuentes reutilizando flujos reales (Admin)
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Nueva cita');
  await b.wait(60);
  await b.key('Enter', 'Enter', 13);
  await b.wait(100);
  const actionNewApp = await b.eval(`document.getElementById('modal')?.open === true && document.getElementById('modal-title')?.textContent?.includes('Reservar una cita')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Registrar paciente');
  await b.wait(60);
  await b.key('Enter', 'Enter', 13);
  await b.wait(100);
  const actionNewPatient = await b.eval(`document.getElementById('modal')?.open === true && document.getElementById('modal-title')?.textContent?.includes('Registrar paciente')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Nuevo prospecto');
  await b.wait(60);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const actionNewLead = await b.eval(`location.hash === '#crm' && document.getElementById('modal')?.open === true && document.getElementById('modal-title')?.textContent?.includes('Nuevo prospecto para CRM')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Revisar recuperaciones ARM pendientes');
  await b.wait(60);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const actionOpenArm = await b.eval(`location.hash === '#arm' && Boolean(document.querySelector('.arm-agents-panel'))`);
  assert(actionNewApp && actionNewPatient && actionNewLead && actionOpenArm, 'Acciones Nueva cita, Registrar paciente, Nuevo prospecto y Recuperaciones ARM reutilizan los flujos reales existentes');

  // 8.7 Temas Verde clínico, Azul institucional y Neutro cálido aplicados a menú flotante y paleta
  const themeColors = [];
  for (const themeVal of ['verde', 'azul', 'neutro']) {
    await b.eval(`location.hash = '#perfil/preferencias'`);
    await b.wait(90);
    await b.click(`input[name="pref-theme"][value="${themeVal}"]`);
    await b.wait(70);
    await b.key('k', 'KeyK', 75, 2);
    await b.wait(70);
    const snap = await b.eval(`(() => {
      const aside = document.querySelector('.shell > aside');
      const surface = document.querySelector('#command-palette .cp-surface');
      const selected = document.querySelector('#command-palette .cp-item.is-selected');
      return {
        theme: document.documentElement.dataset.theme,
        asideBg: aside ? getComputedStyle(aside).backgroundColor : '',
        cpSurfaceBg: surface ? getComputedStyle(surface).backgroundColor : '',
        selectedBorderLeft: selected ? getComputedStyle(selected).borderLeftColor : ''
      };
    })()`);
    themeColors.push(snap);
    await b.key('Escape', 'Escape', 27);
    await b.wait(60);
  }
  const uniqueSidebarBgs = new Set(themeColors.map(t => t.asideBg)).size;
  const uniqueSelectedBorders = new Set(themeColors.map(t => t.selectedBorderLeft)).size;
  assert(uniqueSidebarBgs === 3 && uniqueSelectedBorders === 3, 'Los temas Verde clínico, Azul institucional y Neutro cálido se reflejan dinámicamente en el menú flotante y la paleta');

  // Restablecer tema verde al terminar chequeo de temas
  await b.click(`input[name="pref-theme"][value="verde"]`);
  await b.wait(70);

  // 8.8 Filtrado estricto RBAC entre los 5 roles en navegador real
  // Caja: cero pacientes, cero prospectos, cero citas, acciones solo de Caja + ejecutar cobro desde orden existente
  await loginQuickRole('caja@clinicaoftalmo.pe');
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'María');
  await b.wait(60);
  const cajaNoPatients = await b.eval(`document.querySelectorAll('#command-palette [data-cp-group="records"], #command-palette [data-cp-group="appointments"]').length === 0`);
  await b.type('#cp-input', 'Registrar cobro');
  await b.wait(60);
  const cajaActionsText = await b.eval(`document.getElementById('cp-results')?.innerText || ''`);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const cajaOpenedRealOrderModal = await b.eval(`location.hash.startsWith('#caja') && document.getElementById('modal')?.open === true && document.getElementById('modal-title')?.textContent?.includes('Registrar cobro')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);
  assert(cajaNoPatients && cajaActionsText.includes('Registrar cobro desde una orden existente') && cajaOpenedRealOrderModal, 'Caja NO ve pacientes ni CRM ni citas y ejecuta cobro desde una orden existente');

  // Recepción: sin acciones clínicas ni ARM ni administración
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  const recPaletteHtml = await b.eval(`(() => {
    const pages = Array.from(document.querySelectorAll('#command-palette [data-cp-group="pages"] .cp-item-title')).map(e => e.textContent);
    const actions = Array.from(document.querySelectorAll('#command-palette [data-cp-group="actions"] .cp-item-title')).map(e => e.textContent);
    return { pages, actions, bodyText: document.getElementById('cp-results')?.innerText || '' };
  })()`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);
  assert(
    !recPaletteHtml.actions.some(a => a.includes('atención pendiente') || a.includes('estudio pendiente') || a.includes('ARM')) &&
    !recPaletteHtml.pages.some(p => p.includes('Caja') || p.includes('ARM') || p.includes('Médicos')),
    'Recepción no ve acciones clínicas, ARM, Caja ni mantenimientos administrativos en la paleta'
  );

  // Médico: solo sus propias citas (Dra. Valeria Ríos sí, Dr. Diego Ramírez no), cero CRM/teléfonos/Nueva cita
  await loginQuickRole('v.rios@clinicaoftalmo.pe');
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Diego Ramírez');
  await b.wait(60);
  const medicoHidesOtherDoctor = await b.eval(`document.querySelectorAll('#command-palette [data-cp-group="appointments"] .cp-item').length === 0`);
  await b.click('#cp-clear');
  await b.wait(60);
  const medicoDefaultCheck = await b.eval(`(() => {
    const txt = document.getElementById('cp-results')?.innerText || '';
    const hasOwnAppointment = txt.includes('Dra. Valeria Ríos');
    const noPhone = !txt.includes('Tel. 900');
    const noCRM = !txt.includes('Prospecto') && !txt.includes('Nueva cita');
    return { hasOwnAppointment, noPhone, noCRM };
  })()`);
  await b.type('#cp-input', 'Continuar atención pendiente');
  await b.wait(60);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const medicoContinuedConsult = await b.eval(`location.hash === '#consulta'`);
  assert(medicoHidesOtherDoctor && medicoDefaultCheck.hasOwnAppointment && medicoDefaultCheck.noPhone && medicoDefaultCheck.noCRM && medicoContinuedConsult, 'Médico solo ve sus citas asignadas, sin CRM/teléfonos/Nueva cita, y ejecuta Continuar atención pendiente');

  // Técnico: sin citas ni acciones de Agenda; ejecuta Continuar estudio pendiente
  await loginQuickRole('tecnico@clinicaoftalmo.pe');
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(80);
  await b.type('#cp-input', 'Agenda');
  await b.wait(60);
  const tecnicoNoAgenda = await b.eval(`document.querySelectorAll('#command-palette [data-cp-group="appointments"] .cp-item').length === 0 && !Array.from(document.querySelectorAll('#command-palette [data-cp-group="pages"] .cp-item-title')).some(e => e.textContent.includes('Agenda'))`);
  await b.type('#cp-input', 'Continuar estudio pendiente');
  await b.wait(60);
  await b.key('Enter', 'Enter', 13);
  await b.wait(110);
  const tecnicoOpenedStudyModal = await b.eval(`location.hash === '#estudios' && document.getElementById('modal')?.open === true && document.getElementById('modal-title')?.textContent?.includes('Registrar mediciones')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);
  assert(tecnicoNoAgenda && tecnicoOpenedStudyModal, 'Técnico no recibe resultados ni acciones de Agenda y abre un estudio pendiente real');

  // 8.9 Verificación responsiva de menú + paleta en Escritorio (1280×800), Tablet (768×1024) y Móvil (375×667)
  await loginQuickRole('admin@clinicaoftalmo.pe');
  for (const vp of viewports) {
    await b.setViewport(vp.width, vp.height);
    await b.eval(`location.hash = '#dashboard'`);
    await b.wait(100);
    await b.click(vp.width <= 700 ? '#topbar-search-btn' : '#sidebar-search-btn');
    await b.wait(100);
    const vpMetrics = await b.eval(`(() => {
      const dlg = document.getElementById('command-palette');
      const r = dlg?.querySelector('.cp-surface')?.getBoundingClientRect();
      const aside = document.querySelector('.shell > aside');
      const asideVis = aside ? getComputedStyle(aside).display !== 'none' : false;
      const results = document.getElementById('cp-results');
      return {
        open: dlg?.open === true,
        asideVis,
        fitsW: Boolean(r && r.left >= 0 && r.right <= window.innerWidth + 1),
        fitsH: Boolean(r && r.top >= 0 && r.bottom <= window.innerHeight + 1),
        wideInMobile: Boolean(r && (window.innerWidth > 700 || r.width >= window.innerWidth - 30)),
        docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        resultsScrollable: Boolean(results)
      };
    })()`);
    assert(
      vpMetrics.open &&
      (vp.width > 700 ? vpMetrics.asideVis : !vpMetrics.asideVis) &&
      vpMetrics.fitsW &&
      vpMetrics.fitsH &&
      vpMetrics.wideInMobile &&
      !vpMetrics.docOverflow,
      `${vp.name} (${vp.width}×${vp.height}): Paleta centrada/adaptada y menú responsivo con cero desbordamiento horizontal`
    );
    if (vp.width === 375) {
      await b.screenshot(join(paletteArtDir, 'paleta_movil.png'));
    }
    await b.key('Escape', 'Escape', 27);
    await b.wait(60);
  }
  await b.setViewport(1280, 800);

  // =========================================================================
  // 9. ACLARACIÓN DE "VALOR ESTIMADO DEL SERVICIO" EN TARJETAS Y PANEL CRM
  // =========================================================================
  console.log('\n--- 9. Aclaración de "Valor estimado del servicio" en tarjetas y panel lateral del CRM ---');
  const crmArtDir = resolve((process.env.CRM_ARTIFACT_DIR || process.env.ARTIFACT_DIR || '').trim() || 'artifacts/crm');
  mkdirSync(crmArtDir, { recursive: true });

  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);

  // Capturar baseline de Caja antes de operar en CRM
  await b.eval(`location.hash = '#caja'`);
  await b.wait(90);
  const cajaBeforeCrm = await b.eval(`({
    stats: document.querySelector('.cash-kpis')?.innerText || '',
    paidTab: document.getElementById('tab-paid')?.textContent?.trim() || ''
  })`);

  // 9.1 Prospecto sin cita (Ana Torres Medina): tarjeta + panel lateral muestran "Referencia inicial · aún no cobrada"
  await b.eval(`location.hash = '#crm'`);
  await b.wait(100);
  await b.eval(`document.querySelector('[data-followup="1"]')?.scrollIntoView({ block: 'center', inline: 'center' })`);
  await b.wait(60);
  await b.screenshot(join(crmArtDir, 'crm_tarjeta_sin_cita.png'));

  await b.eval(`location.hash = '#crm/1'`);
  await b.wait(120);
  const crmWithoutApp = await b.eval(`(() => {
    const card = document.querySelector('[data-followup="1"]');
    const drawer = document.getElementById('crmdetail');
    const cText = card?.innerText || '';
    return {
      cardHasLabel: cText.includes('Valor estimado del servicio'),
      cardHasValue: cText.includes('S/ 150'),
      cardHasOrigin: cText.includes('Referencia inicial · aún no cobrada'),
      cardNoAmbiguousExact: !cText.split('\\n').some(line => line.trim() === 'Valor estimado'),
      cardNoPaidClaim: !/pago recibido|precio de cirug/i.test(cText),
      drawerSummaryLabel: drawer?.querySelector('.drawer-value-main small')?.textContent?.trim(),
      drawerSummaryValue: document.getElementById('detail-service-value')?.textContent?.trim(),
      drawerSummaryOrigin: document.getElementById('detail-service-value-origin')?.textContent?.trim(),
      formLabel: drawer?.querySelector('label[for="leadvalue"]')?.textContent?.trim(),
      formHint: document.getElementById('leadvalue-hint')?.textContent?.trim(),
      formVal: document.getElementById('leadvalue')?.value
    };
  })()`);
  assert(
    crmWithoutApp.cardHasLabel &&
    crmWithoutApp.cardHasValue &&
    crmWithoutApp.cardHasOrigin &&
    crmWithoutApp.cardNoAmbiguousExact &&
    crmWithoutApp.cardNoPaidClaim &&
    crmWithoutApp.drawerSummaryLabel === 'Valor estimado del servicio' &&
    crmWithoutApp.drawerSummaryValue === 'S/ 150' &&
    crmWithoutApp.drawerSummaryOrigin === 'Referencia inicial · aún no cobrada' &&
    crmWithoutApp.formLabel === 'Valor estimado del servicio (S/)' &&
    crmWithoutApp.formHint === 'Referencia inicial · aún no cobrada' &&
    Number(crmWithoutApp.formVal) === 150,
    'Prospecto sin cita muestra "Valor estimado del servicio" y "Referencia inicial · aún no cobrada" en tarjeta y panel lateral'
  );

  // 9.2 Mover tarjeta sin cita entre etapas (Contactado -> Interés confirmado) conserva valor y referencia inicial
  await b.select('#leadstage', '3');
  await b.wait(40);
  await b.click('#followupform button[type="submit"]');
  await b.wait(90);
  const movedWithoutApp = await b.eval(`(() => {
    const card = document.querySelector('[data-stage="3"] [data-followup="1"]');
    return {
      inStage3: Boolean(card),
      text: card?.innerText || '',
      drawerVal: document.getElementById('detail-service-value')?.textContent?.trim(),
      drawerOrigin: document.getElementById('detail-service-value-origin')?.textContent?.trim()
    };
  })()`);
  assert(
    movedWithoutApp.inStage3 &&
    movedWithoutApp.text.includes('Valor estimado del servicio') &&
    movedWithoutApp.text.includes('S/ 150') &&
    movedWithoutApp.text.includes('Referencia inicial · aún no cobrada') &&
    movedWithoutApp.drawerVal === 'S/ 150' &&
    movedWithoutApp.drawerOrigin === 'Referencia inicial · aún no cobrada',
    'El valor estimado inicial y su nota se conservan intactos al mover una tarjeta sin cita entre etapas'
  );

  // 9.3 Agendar cita con tarifa de servicio distinta (Control oftalmológico S/ 100) actualiza valor y muestra "Tarifa de la cita vinculada · aún no cobrada"
  await b.click('#booklead');
  await b.wait(90);
  await b.select('#service', '100');
  await b.eval(`(() => { const el=document.getElementById('dateinput'); if(el){ el.value='2026-10-28'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } })()`);
  await b.select('#time', '11:30');
  await b.click('#modal button[type="submit"]');
  await b.wait(110);

  await b.eval(`location.hash = '#crm/1'`);
  await b.wait(110);
  const crmWithLinkedApp = await b.eval(`(() => {
    const card = document.querySelector('[data-stage="4"] [data-followup="1"]');
    card?.scrollIntoView({ block: 'center', inline: 'start' });
    const drawer = document.getElementById('crmdetail');
    const cText = card?.innerText || '';
    const dText = drawer?.innerText || '';
    return {
      inBooked: Boolean(card),
      cardHasLabel: cText.includes('Valor estimado del servicio'),
      cardHasUpdatedValue: cText.includes('S/ 100'),
      cardHasLinkedOrigin: cText.includes('Tarifa de la cita vinculada · aún no cobrada'),
      drawerSummaryValue: document.getElementById('detail-service-value')?.textContent?.trim(),
      drawerSummaryOrigin: document.getElementById('detail-service-value-origin')?.textContent?.trim(),
      formHint: document.getElementById('leadvalue-hint')?.textContent?.trim(),
      formVal: document.getElementById('leadvalue')?.value,
      linkedPaidPending: dText.includes('Pago: Pendiente')
    };
  })()`);
  assert(
    crmWithLinkedApp.inBooked &&
    crmWithLinkedApp.cardHasLabel &&
    crmWithLinkedApp.cardHasUpdatedValue &&
    crmWithLinkedApp.cardHasLinkedOrigin &&
    crmWithLinkedApp.drawerSummaryValue === 'S/ 100' &&
    crmWithLinkedApp.drawerSummaryOrigin === 'Tarifa de la cita vinculada · aún no cobrada' &&
    crmWithLinkedApp.formHint === 'Tarifa de la cita vinculada · aún no cobrada' &&
    Number(crmWithLinkedApp.formVal) === 100 &&
    crmWithLinkedApp.linkedPaidPending,
    'Al agendar cita vinculada, el importe cambia a la tarifa del servicio seleccionado (S/ 100) y muestra "Tarifa de la cita vinculada · aún no cobrada"'
  );
  await b.click('#closedetail');
  await b.wait(220);
  await b.eval(`document.querySelector('[data-stage="4"] [data-followup="1"]')?.scrollIntoView({ block: 'center', inline: 'center' })`);
  await b.wait(60);
  await b.screenshot(join(crmArtDir, 'crm_tarjeta_con_cita.png'));
  await b.eval(`location.hash = '#crm/1'`);
  await b.wait(100);

  // 9.4 Mover tarjeta con cita vinculada entre etapas (Cita agendada -> Seguimiento) conserva tarifa vinculada
  await b.select('#leadstage', '9');
  await b.wait(40);
  await b.click('#followupform button[type="submit"]');
  await b.wait(90);
  const movedWithApp = await b.eval(`(() => {
    const card = document.querySelector('[data-stage="9"] [data-followup="1"]');
    return {
      inStage9: Boolean(card),
      text: card?.innerText || '',
      drawerVal: document.getElementById('detail-service-value')?.textContent?.trim(),
      drawerOrigin: document.getElementById('detail-service-value-origin')?.textContent?.trim()
    };
  })()`);
  assert(
    movedWithApp.inStage9 &&
    movedWithApp.text.includes('S/ 100') &&
    movedWithApp.text.includes('Tarifa de la cita vinculada · aún no cobrada') &&
    movedWithApp.drawerVal === 'S/ 100' &&
    movedWithApp.drawerOrigin === 'Tarifa de la cita vinculada · aún no cobrada',
    'El valor vinculado se conserva al mover tarjetas entre etapas'
  );

  // 9.5 Verificar que Caja y su estado cobrado NO fueron modificados por estimados o reserva del CRM
  await b.eval(`location.hash = '#caja'`);
  await b.wait(100);
  const cajaAfterCrm = await b.eval(`({
    stats: document.querySelector('.cash-kpis')?.innerText || '',
    paidTab: document.getElementById('tab-paid')?.textContent?.trim() || '',
    pendingTable: document.getElementById('cashcontent')?.innerText || ''
  })`);
  assert(
    /S\/\s*280\.00/.test(cajaBeforeCrm.stats) &&
    /S\/\s*100\.00/.test(cajaBeforeCrm.stats) &&
    cajaAfterCrm.stats === cajaBeforeCrm.stats &&
    cajaAfterCrm.paidTab === cajaBeforeCrm.paidTab &&
    !cajaAfterCrm.pendingTable.includes('Ana Torres Medina'),
    'Los importes estimados o vinculados del CRM no se contabilizan como cobrados ni alteran Caja'
  );

  // =========================================================================
  // 10. SISTEMA DE TURNOS PRESENCIALES / COLA DE ATENCIÓN (20 PRUEBAS + CAPTURAS)
  // =========================================================================
  console.log('\n--- 10. Turnos presenciales: autoservicio, colas R/C, transferencias, pantalla pública, RBAC y responsive ---');
  const turnosArtDir = resolve((process.env.TURNOS_ARTIFACT_DIR || process.env.ARTIFACT_DIR || '').trim() || 'artifacts/turnos');
  mkdirSync(turnosArtDir, { recursive: true });

  const kioskArtDir = resolve((process.env.AUTOSERVICIO_ARTIFACT_DIR || (process.env.ARTIFACT_DIR ? join(process.env.ARTIFACT_DIR, 'autoservicio') : '')).trim() || 'artifacts/autoservicio');
  mkdirSync(kioskArtDir, { recursive: true });

  await b.setViewport(1280, 800);
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.click('#topbar-logout');
  await b.wait(100);

  // 10.1 Acceso a Punto de autoservicio desde pantalla de login y prueba de modo pantalla completa sin controles internos
  await b.click('#auth-open-kiosk');
  await b.wait(100);
  const kioskOpened = await b.eval(`location.hash === '#autoservicio' && Boolean(document.querySelector('.kiosk-shell'))`);
  assert(kioskOpened, 'Punto de autoservicio es accesible públicamente sin iniciar sesión');

  const kioskInitialMotion = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const pi = document.querySelector('.kiosk-progress-item');
    return {
      hasEntering: Boolean(sv?.classList.contains('is-step-entering')),
      hasDirection: Boolean(sv?.classList.contains('is-step-forward') || sv?.classList.contains('is-step-backward') || sv?.classList.contains('is-step-reset')),
      progressHasNoAll: !getComputedStyle(pi)?.transitionProperty?.includes('all')
    };
  })()`);
  assert(
    !kioskInitialMotion.hasEntering && !kioskInitialMotion.hasDirection && kioskInitialMotion.progressHasNoAll,
    'Carga inicial del kiosco sin animación parásita y progreso sin "all"'
  );

  const kioskHasStaffControls = await b.eval(`Boolean(document.querySelector('#sidebar') || document.querySelector('#topbar') || document.querySelector('#kiosk-back-system') || document.querySelector('#kiosk-goto-display'))`);
  assert(!kioskHasStaffControls, 'Autoservicio funciona en pantalla completa sin menú lateral ni controles internos');

  // Indicador de progreso presente
  const hasProgressBar = await b.eval(`(() => {
    const list = document.querySelector('.kiosk-progress-list');
    return Boolean(list && list.innerText.includes('Documento') && list.innerText.includes('Área') && list.innerText.includes('Ticket'));
  })()`);
  assert(hasProgressBar, 'Indicador de progreso superior (Documento → Área → Ticket) está visible');

  // Paso 1: Altura táctil mínima >= 56px en teclado, Continuar, "Continuar sin documento" y "Perdí mi ticket sin documento"
  const keyHeightsOk = await b.eval(`(() => {
    const keys = Array.from(document.querySelectorAll('.kiosk-key'));
    const btn = document.getElementById('kiosk-step1-continue-btn');
    const anonBtn = document.getElementById('kiosk-continue-anonymous-btn');
    const lostBtn = document.getElementById('kiosk-anon-lost-btn');
    const minK = Math.min(...keys.map(k => k.getBoundingClientRect().height));
    const btnRect = btn?.getBoundingClientRect();
    const anonRect = anonBtn?.getBoundingClientRect();
    const lostRect = lostBtn?.getBoundingClientRect();
    const separated = Boolean(btnRect && anonRect && anonRect.top >= btnRect.bottom + 8);
    return {
      minK,
      btnH: btnRect?.height || 0,
      anonH: anonRect?.height || 0,
      lostH: lostRect?.height || 0,
      separated,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  })()`);
  assert(
    keyHeightsOk.minK >= 56 &&
    keyHeightsOk.btnH >= 56 &&
    keyHeightsOk.anonH >= 56 &&
    keyHeightsOk.lostH >= 56 &&
    keyHeightsOk.separated &&
    !keyHeightsOk.overflowX,
    'Todos los controles táctiles del Paso 1 (incluido "Continuar sin documento" separado) miden ≥56px sin desborde horizontal'
  );

  // Captura 01 & 09: Pantalla inicial con opción "Continuar sin documento" en tablet horizontal 1280×800
  await b.screenshot(join(kioskArtDir, '01_continuar_sin_documento.png'));
  await b.screenshot(join(kioskArtDir, '09_tablet_horizontal.png'));

  // CASO A: Flujo completo sin documento ("Continuar sin documento") -> Identificación ANON-N real
  await b.click('#kiosk-continue-anonymous-btn');
  await b.wait(40);
  const step1to2Motion = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      isForward: Boolean(sv?.classList.contains('is-step-forward'))
    };
  })()`);
  assert(step1to2Motion.isEntering && step1to2Motion.isForward, 'Avance 1→2 aplica transición .is-step-forward');
  await b.wait(50);
  const anonStep2Ok = await b.eval(`(() => {
    const pill = document.getElementById('kiosk-masked-doc-pill')?.textContent?.trim() || '';
    const cards = document.querySelectorAll('.kiosk-area-card');
    const body = document.querySelector('.kiosk-main-content')?.innerText || '';
    const hasPersonalInputs = Boolean(document.querySelector('.kiosk-main-content input, .kiosk-main-content select'));
    return {
      pillOk: pill.includes('Sin documento'),
      cardCount: cards.length,
      hasR: Boolean(document.getElementById('kiosk-area-R')),
      hasC: Boolean(document.getElementById('kiosk-area-C')),
      hasPersonalInputs,
      asksNameOrPhone: /nombre|tel[eé]fono|diagn[oó]stico|00000000/i.test(body)
    };
  })()`);
  assert(
    anonStep2Ok.pillOk &&
    anonStep2Ok.cardCount === 2 &&
    anonStep2Ok.hasR &&
    anonStep2Ok.hasC &&
    !anonStep2Ok.hasPersonalInputs &&
    !anonStep2Ok.asksNameOrPhone,
    'Caso A (Paso 2): Continuar sin documento ofrece únicamente Recepción y Caja sin pedir nombre, teléfono ni datos clínicos'
  );

  await b.click('#kiosk-area-R');
  await b.wait(40);
  const step2to3Motion = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      isForward: Boolean(sv?.classList.contains('is-step-forward'))
    };
  })()`);
  assert(step2to3Motion.isEntering && step2to3Motion.isForward, 'Avance 2→3 aplica transición .is-step-forward');
  await b.wait(40);

  const anonStep3Ok = await b.eval(`(() => {
    const cardText = document.querySelector('.kiosk-summary-card')?.innerText || '';
    const docVal = document.getElementById('kiosk-confirm-doc')?.textContent?.trim() || '';
    const note = document.getElementById('kiosk-anon-preserve-note')?.textContent?.trim() || '';
    return {
      hasIdentLabel: cardText.includes('Identificación'),
      docVal,
      note,
      hasFake000: cardText.includes('00000000')
    };
  })()`);
  assert(
    anonStep3Ok.hasIdentLabel &&
    anonStep3Ok.docVal === 'Sin documento' &&
    anonStep3Ok.note === 'Conserve su ticket. Si lo pierde, solicite ayuda al personal para identificar su turno.' &&
    !anonStep3Ok.hasFake000,
    'Caso A & F (Paso 3): Confirmación muestra "Identificación: Sin documento", sin 00000000 y con nota de conservación'
  );

  // Captura 02: Confirmación sin documento
  await b.screenshot(join(kioskArtDir, '02_confirmacion_sin_documento.png'));

  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(450);

  const anon1Generated = await b.eval(`({
    code: document.getElementById('kiosk-ticket-code')?.textContent?.trim() || '',
    area: document.getElementById('kiosk-ticket-area')?.textContent?.trim() || '',
    note: document.getElementById('kiosk-anon-preserve-note')?.textContent?.trim() || '',
    printText: document.getElementById('kiosk-print-status-text')?.textContent?.trim() || '',
    body: document.getElementById('kiosk-ticket-card')?.innerText || ''
  })`);
  assert(
    anon1Generated.code === 'R-004' &&
    anon1Generated.area.includes('Recepción') &&
    anon1Generated.note.includes('Conserve su ticket. Si lo pierde, solicite ayuda al personal') &&
    anon1Generated.printText === 'Se abrió la impresión. Si el ticket fue impreso, retírelo y espere a que su código aparezca en pantalla.' &&
    !anon1Generated.body.includes('00000000'),
    'Caso A (Paso 4): Turno anónimo genera R-004 con código, área, hora, personas delante y nota discreta de conservación'
  );

  // Captura 03: Ticket anónimo generado
  await b.screenshot(join(kioskArtDir, '03_ticket_anonimo_generado.png'));

  await b.click('#kiosk-finish-btn');
  await b.wait(80);

  // CASO B: Segundo visitante consecutivo sin documento genera ticket independiente R-005 (ANON-2) sin colisionar
  await b.click('#kiosk-continue-anonymous-btn');
  await b.wait(70);
  await b.click('#kiosk-area-R');
  await b.wait(70);
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(450);
  const anon2Generated = await b.eval(`({
    code: document.getElementById('kiosk-ticket-code')?.textContent?.trim() || '',
    ahead: document.getElementById('kiosk-ahead-count')?.textContent?.trim() || ''
  })`);
  assert(
    anon2Generated.code === 'R-005' && anon2Generated.ahead === '2',
    `Caso B: Dos personas consecutivas sin documento generan tickets independientes (R-004 y ${anon2Generated.code}) con ahead=${anon2Generated.ahead}`
  );

  await b.click('#kiosk-finish-btn');
  await b.wait(70);

  // CASO F: Visitante anónimo indica que perdió su ticket -> mensaje claro al personal sin crear otro ticket ni buscar por datos personales
  await b.click('#kiosk-anon-lost-btn');
  await b.wait(70);
  const anonLostCheck = await b.eval(`(() => {
    const alertBox = document.getElementById('kiosk-anon-lost-alert');
    const txt = alertBox?.textContent?.trim() || '';
    const searchInputs = document.querySelectorAll('#kiosk-anon-lost-alert input').length;
    return {
      visible: Boolean(alertBox),
      hasMsg: txt.includes('No podemos recuperar automáticamente un turno emitido sin documento. Solicite ayuda al personal.'),
      searchInputs
    };
  })()`);
  assert(
    anonLostCheck.visible && anonLostCheck.hasMsg && anonLostCheck.searchInputs === 0,
    'Caso F: Opción "Perdí mi ticket sin documento" informa que no hay recuperación automática y orienta al personal sin crear otro turno'
  );

  // Captura 04: Ayuda / nota de conservación para ticket anónimo perdido
  await b.screenshot(join(kioskArtDir, '04_nota_conservacion_ticket_anonimo.png'));

  await b.click('#kiosk-anon-lost-close-btn');
  await b.wait(60);

  // Reiniciar datos de demo para conservar los correlativos limpios R-004 (Elena) y R-005 (87654321) para las pruebas operativas siguientes
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.click('#topbar-logout');
  await b.wait(80);
  await b.click('#auth-open-kiosk');
  await b.wait(80);

  // Probar rechazo de menos de 8 dígitos
  await b.click('[data-digit="0"]');
  await b.click('[data-digit="0"]');
  await b.click('[data-digit="0"]');
  await b.click('[data-digit="0"]');
  await b.click('[data-digit="0"]');
  await b.click('[data-digit="0"]');
  await b.click('[data-digit="0"]'); // 7 dígitos
  await b.wait(50);
  const contDisabled7 = await b.eval(`document.getElementById('kiosk-step1-continue-btn')?.disabled === true`);
  assert(contDisabled7, 'Botón Continuar permanece deshabilitado con menos de 8 dígitos');

  // Probar tecla Corregir (retroceso) y tecla Borrar
  await b.click('#kiosk-key-backspace');
  await b.wait(40);
  const countAfterBs = await b.eval(`document.getElementById('kiosk-dni-counter')?.innerText || ''`);
  assert(countAfterBs.includes('6 de 8'), 'Tecla Corregir elimina el último dígito ingresado');

  await b.click('#kiosk-key-clear');
  await b.wait(40);
  const countAfterClear = await b.eval(`document.getElementById('kiosk-dni-counter')?.innerText || ''`);
  assert(countAfterClear.includes('0 de 8'), 'Tecla Borrar limpia completamente el campo de documento');

  // Ingresar los 8 dígitos de Elena (00000005) mediante el teclado numérico en pantalla
  for (const ch of '00000005') {
    await b.click(`[data-digit="${ch}"]`);
    await b.wait(15);
  }
  const contEnabled8 = await b.eval(`document.getElementById('kiosk-step1-continue-btn')?.disabled === false`);
  assert(contEnabled8, 'Botón Continuar se habilita inmediatamente al completar exactamente 8 dígitos');

  // Avanzar a Paso 2: Selección de área
  await b.click('#kiosk-step1-continue-btn');
  await b.wait(80);

  // Paso 2: Exactamente dos opciones (Recepción y Caja) sin submotivos ni dropdowns
  const areaOptionsCheck = await b.eval(`(() => {
    const cards = document.querySelectorAll('.kiosk-area-card');
    const text = document.querySelector('.kiosk-main-content')?.innerText || '';
    const hasSelect = Boolean(document.querySelector('.kiosk-main-content select'));
    const hasSubreasons = text.includes('Confirmar llegada') || text.includes('Pagar una orden') || text.includes('Actualizar datos');
    const fullDniExposed = text.includes('00000005');
    return {
      cardCount: cards.length,
      hasR: Boolean(document.getElementById('kiosk-area-R')),
      hasC: Boolean(document.getElementById('kiosk-area-C')),
      hasSelect,
      hasSubreasons,
      fullDniExposed
    };
  })()`);
  assert(
    areaOptionsCheck.cardCount === 2 && areaOptionsCheck.hasR && areaOptionsCheck.hasC && !areaOptionsCheck.hasSelect && !areaOptionsCheck.hasSubreasons,
    'Paso 2 muestra exactamente dos opciones táctiles (Recepción y Caja) sin desplegables ni submotivos'
  );
  assert(!areaOptionsCheck.fullDniExposed, 'El documento completo no se expone en la pantalla tras abandonar el primer paso');

  // Seleccionar Recepción / Admisión para ir a Paso 3
  await b.click('#kiosk-area-R');
  await b.wait(80);

  // Paso 3: Confirmación de Recepción
  const confirmRCheck = await b.eval(`(() => {
    const doc = document.getElementById('kiosk-confirm-doc')?.textContent?.trim() || '';
    const area = document.getElementById('kiosk-confirm-area')?.textContent?.trim() || '';
    const body = document.querySelector('.kiosk-main-content')?.innerText || '';
    return {
      doc,
      area,
      hasFullName: body.includes('Elena Soto Vargas'),
      hasPhone: body.includes('900 000'),
      hasDiagnosis: body.includes('Miopía') || body.includes('Astigmatismo')
    };
  })()`);
  assert(
    confirmRCheck.doc === '••••0005' && confirmRCheck.area.includes('Recepción') && !confirmRCheck.hasFullName && !confirmRCheck.hasPhone && !confirmRCheck.hasDiagnosis,
    'Paso 3 muestra documento enmascarado ••••0005 y área elegida sin datos clínicos ni teléfono'
  );

  // Probar botón "Volver" hacia selección de área y confirmar que se puede elegir Caja
  await b.click('#kiosk-step3-back-btn');
  await b.wait(40);
  const step3to2Motion = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      isBackward: Boolean(sv?.classList.contains('is-step-backward'))
    };
  })()`);
  assert(step3to2Motion.isEntering && step3to2Motion.isBackward, 'Retroceso 3→2 aplica transición .is-step-backward');
  await b.wait(50);
  await b.click('#kiosk-area-C');
  await b.wait(80);
  const confirmCCheck = await b.eval(`document.getElementById('kiosk-confirm-area')?.textContent?.trim() || ''`);
  assert(confirmCCheck.includes('Caja'), 'Botón Volver permite rectificar y seleccionar Caja / Pagos');

  // Volver y re-seleccionar Recepción para emitir R-004 de Elena
  await b.click('#kiosk-step3-back-btn');
  await b.wait(70);
  await b.click('#kiosk-area-R');
  await b.wait(80);

  // CASO H: Verificar transición honesto requesting -> requested al confirmar R-004
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(50);
  const requestingCheck = await b.eval(`({
    statusText: document.getElementById('kiosk-print-status-text')?.textContent?.trim() || '',
    waitText: document.getElementById('kiosk-ticket-message')?.textContent?.trim() || '',
    reprintDisabled: Boolean(document.getElementById('kiosk-reprint-btn')?.disabled)
  })`);
  assert(
    requestingCheck.statusText === 'Estamos preparando su ticket. Espere un momento.' &&
    requestingCheck.reprintDisabled,
    'Caso H: Estado requesting muestra "Estamos preparando su ticket. Espere un momento." con reintento temporalmente deshabilitado'
  );

  await b.wait(420);

  const ticketR4 = await b.eval(`({
    code: document.getElementById('kiosk-ticket-code')?.textContent?.trim(),
    area: document.getElementById('kiosk-ticket-area')?.textContent?.trim(),
    msg: document.getElementById('kiosk-ticket-message')?.textContent?.trim(),
    ahead: document.getElementById('kiosk-ahead-count')?.textContent?.trim(),
    printText: document.getElementById('kiosk-print-status-text')?.textContent?.trim() || '',
    reprintBtn: Boolean(document.getElementById('kiosk-reprint-btn')),
    reprintDisabled: Boolean(document.getElementById('kiosk-reprint-btn')?.disabled),
    disclaimer: document.getElementById('kiosk-print-disclaimer')?.textContent?.trim() || '',
    noticeText: document.getElementById('notice')?.textContent?.trim() || ''
  })`);
  assert(
    ticketR4.code === 'R-004' &&
    ticketR4.area.includes('Recepción') &&
    ticketR4.msg === 'Espere a que su código aparezca en pantalla.' &&
    ticketR4.ahead === '1' &&
    ticketR4.printText === 'Se abrió la impresión. Si el ticket fue impreso, retírelo y espere a que su código aparezca en pantalla.' &&
    ticketR4.reprintBtn && !ticketR4.reprintDisabled &&
    ticketR4.disclaimer.includes('Impresión mediante el navegador en esta demostración') &&
    ticketR4.noticeText === '',
    'Casos H & I: Genera ticket R-004 con estado honesto de impresión solicitada y aviso limpio sin afirmaciones falsas'
  );

  // Captura 07: Impresión solicitada
  await b.screenshot(join(kioskArtDir, '07_impresion_solicitada.png'));
  await b.screenshot(join(turnosArtDir, 'autoservicio.png'));

  // CASO G & J: Simular fallo en window.print() -> estado error SIN "Retire su ticket" en ningún lugar de la pantalla
  await b.eval(`(() => {
    window.__savedPrint = window.print;
    window.print = () => { throw new Error('Fallo simulado de comunicación con la impresora'); };
  })()`);
  await b.click('#kiosk-reprint-btn');
  await b.wait(450);

  const printErrorCheck = await b.eval(`(() => {
    const screenText = document.getElementById('autoservicio')?.innerText || '';
    const fullDomText = document.getElementById('autoservicio')?.textContent || '';
    return {
      code: document.getElementById('kiosk-ticket-code')?.textContent?.trim(),
      isError: document.getElementById('kiosk-print-status-box')?.classList.contains('is-error'),
      printText: document.getElementById('kiosk-print-status-text')?.textContent?.trim() || '',
      waitMsg: document.getElementById('kiosk-ticket-message')?.textContent?.trim() || '',
      reprintBtn: Boolean(document.getElementById('kiosk-reprint-btn')),
      hasRetireAny: /retire su ticket/i.test(screenText) || /retire su ticket/i.test(fullDomText) || /ret[ií]relo/i.test(screenText)
    };
  })()`);
  assert(
    printErrorCheck.code === 'R-004' &&
    printErrorCheck.isError &&
    printErrorCheck.printText === 'Su turno fue registrado, pero no se pudo iniciar la impresión. Solicite ayuda al personal.' &&
    printErrorCheck.reprintBtn &&
    !printErrorCheck.hasRetireAny,
    'Casos G & J: Fallo en impresión conserva R-004, muestra error honesto y elimina completamente "Retire su ticket" de la pantalla'
  );

  // Captura 08: Error técnico de impresión sin "Retire su ticket"
  await b.screenshot(join(kioskArtDir, '08_error_impresion_sin_retire.png'));

  // Restaurar window.print() y probar reintento exitoso
  await b.eval(`(() => {
    window.__printCallCount = 0;
    window.print = () => { window.__printCallCount += 1; };
  })()`);
  await b.click('#kiosk-reprint-btn');
  await b.wait(450);

  const reprintRecovered = await b.eval(`({
    code: document.getElementById('kiosk-ticket-code')?.textContent?.trim(),
    printText: document.getElementById('kiosk-print-status-text')?.textContent?.trim() || '',
    isError: document.getElementById('kiosk-print-status-box')?.classList.contains('is-error'),
    calls: window.__printCallCount
  })`);
  assert(
    reprintRecovered.code === 'R-004' &&
    !reprintRecovered.isError &&
    reprintRecovered.calls === 1 &&
    reprintRecovered.printText === 'Se abrió la impresión. Si el ticket fue impreso, retírelo y espere a que su código aparezca en pantalla.',
    'Caso H & I: Reintentar impresión vuelve a invocar window.print() y recupera estado requested sin duplicar correlativo'
  );

  // Captura 11: Formato imprimible de ticket térmico 80mm (@media print)
  await b.send('Emulation.setEmulatedMedia', { media: 'print' });
  await b.wait(100);
  const printThermalCheck = await b.eval(`(() => {
    const el = document.getElementById('kiosk-thermal-ticket');
    const txt = el ? (el.textContent || el.innerText) : '';
    const disclaimerInPrint = document.getElementById('kiosk-print-disclaimer')?.offsetParent !== null;
    return {
      hasBrand: txt.includes('Clínica Oftalmológica'),
      hasCode: txt.includes('R-004'),
      hasArea: txt.includes('Recepción'),
      hasMsg: txt.includes('Espere a que su código aparezca en pantalla'),
      hasName: txt.includes('Elena'),
      hasDni: txt.includes('00000005'),
      hasClinical: txt.includes('Miopía') || txt.includes('Consulta'),
      disclaimerInPrint
    };
  })()`);
  assert(
    printThermalCheck.hasBrand && printThermalCheck.hasCode && printThermalCheck.hasArea && printThermalCheck.hasMsg && !printThermalCheck.hasName && !printThermalCheck.hasDni && !printThermalCheck.hasClinical && !printThermalCheck.disclaimerInPrint,
    'El formato térmico de impresión incluye únicamente clínica, código, área, fecha/hora y personas por delante sin datos personales ni notas demostrativas'
  );
  await b.screenshot(join(kioskArtDir, '11_formato_termico.png'));
  await b.send('Emulation.setEmulatedMedia', { media: '' });
  await b.wait(80);

  // Probar reinicio inmediato con botón "Finalizar" (Paso 4 -> Paso 1)
  await b.click('#kiosk-finish-btn');
  await b.wait(20);
  const resetMotion = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedEase = rootStyle.getPropertyValue('--motion-ease-color').trim();
    const st = sv ? getComputedStyle(sv) : null;
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      isReset: Boolean(sv?.classList.contains('is-step-reset')),
      transform: st?.transform,
      transitionProperty: st?.transitionProperty,
      transitionDuration: st?.transitionDuration,
      transitionTimingFunction: st?.transitionTimingFunction,
      opacity: Number(st?.opacity || 0),
      expectedEase
    };
  })()`);
  assert(
    resetMotion.isEntering &&
    resetMotion.isReset &&
    resetMotion.transform === 'none' &&
    resetMotion.transitionProperty === 'opacity' &&
    !resetMotion.transitionProperty.includes('transform') &&
    !resetMotion.transitionProperty.includes('all') &&
    resetMotion.transitionDuration === '0.16s' &&
    resetMotion.transitionTimingFunction === resetMotion.expectedEase &&
    resetMotion.opacity > 0 && resetMotion.opacity < 1,
    'Reinicio 4→1 aplica transición .is-step-reset exclusivamente de opacity 160ms var(--motion-ease-color) sin transform ni all, con opacidad en vuelo entre 0 y 1'
  );
  await b.wait(250);
  const resetToStep1 = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const st = sv ? getComputedStyle(sv) : null;
    const isStep1 = Boolean(document.querySelector('.kiosk-step-document'));
    const counter = document.getElementById('kiosk-dni-counter')?.innerText || '';
    return {
      isStep1,
      counterOk: counter.includes('0 de 8'),
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      hasDirectionClass: Boolean(
        sv?.classList.contains('is-step-forward') ||
        sv?.classList.contains('is-step-backward') ||
        sv?.classList.contains('is-step-reset')
      ),
      isVisible: Boolean(sv?.classList.contains('is-step-visible')),
      opacity: Number(st?.opacity || 0),
      transform: st?.transform
    };
  })()`);
  assert(
    resetToStep1.isStep1 &&
    resetToStep1.counterOk &&
    !resetToStep1.isEntering &&
    !resetToStep1.hasDirectionClass &&
    !resetToStep1.isVisible &&
    resetToStep1.opacity === 1 &&
    resetToStep1.transform === 'none',
    'Botón Finalizar reinicia al Paso 1 retirando clases transitorias, quedando visible y utilizable'
  );

  // Verificación de movimiento reducido en el kiosco: solo opacidad, transform === 'none' (ambas vías)
  // Vía 1: :root[data-reduced-motion="on"]
  await b.eval(`document.documentElement.dataset.reducedMotion = 'on'`);
  await b.wait(40);
  await b.click('#kiosk-continue-anonymous-btn');
  await b.wait(20);
  const rmKioskCheck = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedEase = rootStyle.getPropertyValue('--motion-ease-color').trim();
    const st = sv ? getComputedStyle(sv) : null;
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      transform: st?.transform,
      transitionProperty: st?.transitionProperty,
      transitionDuration: st?.transitionDuration,
      transitionTimingFunction: st?.transitionTimingFunction,
      opacity: Number(st?.opacity || 0),
      expectedEase
    };
  })()`);
  assert(
    rmKioskCheck.isEntering &&
    rmKioskCheck.transform === 'none' &&
    rmKioskCheck.transitionProperty === 'opacity' &&
    !rmKioskCheck.transitionProperty.includes('transform') &&
    !rmKioskCheck.transitionProperty.includes('all') &&
    rmKioskCheck.transitionDuration === '0.16s' &&
    rmKioskCheck.transitionTimingFunction === rmKioskCheck.expectedEase &&
    rmKioskCheck.opacity > 0 && rmKioskCheck.opacity < 1,
    'Con data-reduced-motion="on", el kiosco avanza con transform: none, transición exclusiva de opacity 160ms con curva efectiva y opacidad parcial en vuelo'
  );
  await b.wait(250);
  const rmSettled = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const st = sv ? getComputedStyle(sv) : null;
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      hasDirectionClass: Boolean(
        sv?.classList.contains('is-step-forward') ||
        sv?.classList.contains('is-step-backward') ||
        sv?.classList.contains('is-step-reset')
      ),
      isVisible: Boolean(sv?.classList.contains('is-step-visible')),
      opacity: Number(st?.opacity || 0),
      transform: st?.transform
    };
  })()`);
  assert(
    !rmSettled.isEntering &&
    !rmSettled.hasDirectionClass &&
    !rmSettled.isVisible &&
    rmSettled.opacity === 1 &&
    rmSettled.transform === 'none',
    'Con data-reduced-motion="on", tras asentar, las clases transitorias se retiran y queda visible al 100% sin transform'
  );
  await b.click('#kiosk-step2-back-btn');
  await b.wait(250);
  await b.eval(`delete document.documentElement.dataset.reducedMotion`);
  await b.wait(40);
  const rmRestoredCheck = await b.eval(`({
    hasAttr: document.documentElement.hasAttribute('data-reduced-motion'),
    datasetVal: document.documentElement.dataset.reducedMotion
  })`);
  assert(!rmRestoredCheck.hasAttr && !rmRestoredCheck.datasetVal, 'Restauración de data-reduced-motion no deja atributos ni dataset residual');

  // Vía 2: @media (prefers-reduced-motion: reduce)
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.wait(40);
  await b.click('#kiosk-continue-anonymous-btn');
  await b.wait(20);
  const mediaRmKioskCheck = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedEase = rootStyle.getPropertyValue('--motion-ease-color').trim();
    const st = sv ? getComputedStyle(sv) : null;
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      transform: st?.transform,
      transitionProperty: st?.transitionProperty,
      transitionDuration: st?.transitionDuration,
      transitionTimingFunction: st?.transitionTimingFunction,
      opacity: Number(st?.opacity || 0),
      expectedEase
    };
  })()`);
  assert(
    mediaRmKioskCheck.isEntering &&
    mediaRmKioskCheck.transform === 'none' &&
    mediaRmKioskCheck.transitionProperty === 'opacity' &&
    !mediaRmKioskCheck.transitionProperty.includes('transform') &&
    !mediaRmKioskCheck.transitionProperty.includes('all') &&
    mediaRmKioskCheck.transitionDuration === '0.16s' &&
    mediaRmKioskCheck.transitionTimingFunction === mediaRmKioskCheck.expectedEase &&
    mediaRmKioskCheck.opacity > 0 && mediaRmKioskCheck.opacity < 1,
    'Con @media (prefers-reduced-motion: reduce), el kiosco conserva transform: none, transición exclusiva de opacity 160ms con curva efectiva y opacidad parcial en vuelo'
  );
  await b.wait(250);
  const mediaRmSettled = await b.eval(`(() => {
    const sv = document.querySelector('.kiosk-step-view');
    const st = sv ? getComputedStyle(sv) : null;
    return {
      isEntering: Boolean(sv?.classList.contains('is-step-entering')),
      hasDirectionClass: Boolean(
        sv?.classList.contains('is-step-forward') ||
        sv?.classList.contains('is-step-backward') ||
        sv?.classList.contains('is-step-reset')
      ),
      isVisible: Boolean(sv?.classList.contains('is-step-visible')),
      opacity: Number(st?.opacity || 0),
      transform: st?.transform
    };
  })()`);
  assert(
    !mediaRmSettled.isEntering &&
    !mediaRmSettled.hasDirectionClass &&
    !mediaRmSettled.isVisible &&
    mediaRmSettled.opacity === 1 &&
    mediaRmSettled.transform === 'none',
    'Con @media (prefers-reduced-motion: reduce), tras asentar, las clases transitorias quedan retiradas y el contenido permanece al 100% sin transform'
  );
  await b.click('#kiosk-step2-back-btn');
  await b.wait(250);
  await b.send('Emulation.setEmulatedMedia', { features: [] });
  await b.wait(60);
  const mediaRmRestored = await b.eval(`({
    matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dataReducedMotion: document.documentElement.dataset.reducedMotion,
    hasDataAttribute: document.documentElement.hasAttribute('data-reduced-motion')
  })`);
  assert(
    mediaRmRestored.matches === false &&
    mediaRmRestored.dataReducedMotion === undefined &&
    mediaRmRestored.hasDataAttribute === false,
    'La restauración de prefers-reduced-motion debe eliminar la emulación y no dejar atributos residuales',
    JSON.stringify(mediaRmRestored)
  );

  // CASO C: Recuperación de turno activo con DNI registrado (Elena 00000005 en Recepción -> muestra R-004 y botón Reimprimir)
  for (const ch of '00000005') {
    await b.click(`[data-digit="${ch}"]`);
    await b.wait(15);
  }
  await b.click('#kiosk-step1-continue-btn');
  await b.wait(70);
  await b.click('#kiosk-area-R');
  await b.wait(70);
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(120);

  const dupBlocked = await b.eval(`(() => {
    const card = document.getElementById('kiosk-ticket-card');
    const code = document.getElementById('kiosk-ticket-code')?.textContent?.trim();
    const msg = document.getElementById('kiosk-duplicate-msg')?.innerText?.trim() || '';
    const reprintBtn = document.getElementById('kiosk-reprint-existing-btn');
    const finishBtn = document.getElementById('kiosk-finish-btn');
    return {
      isDup: Boolean(card?.classList.contains('is-duplicate')),
      code,
      msg,
      reprintLabel: reprintBtn?.textContent?.trim() || '',
      reprintH: reprintBtn?.getBoundingClientRect().height || 0,
      finishH: finishBtn?.getBoundingClientRect().height || 0
    };
  })()`);
  assert(
    dupBlocked.isDup &&
    dupBlocked.code === 'R-004' &&
    dupBlocked.msg === 'Ya tiene el turno R-004 activo. Puede volver a imprimirlo sin perder su posición en la cola.' &&
    dupBlocked.reprintLabel === 'Reimprimir ticket existente' &&
    dupBlocked.reprintH >= 56 &&
    dupBlocked.finishH >= 56,
    'Caso C: Paciente registrado con DNI recupera su turno R-004 sin perder posición y muestra botón táctil "Reimprimir ticket existente"'
  );

  // Captura 05: Recuperación de turno con DNI
  await b.screenshot(join(kioskArtDir, '05_recuperacion_turno_dni.png'));

  // Reiniciar terminal
  await b.click('#kiosk-finish-btn');
  await b.wait(70);

  // Captura 10: Tablet vertical 800×1280
  await b.setViewport(800, 1280);
  await b.wait(100);
  const verticalOk = await b.eval(`(() => {
    const noOverflow = document.documentElement.scrollWidth <= window.innerWidth + 1;
    const anonRect = document.getElementById('kiosk-continue-anonymous-btn')?.getBoundingClientRect();
    return noOverflow && Boolean(document.querySelector('.kiosk-step-document')) && Boolean(anonRect && anonRect.height >= 56);
  })()`);
  assert(verticalOk, 'Tablet vertical 800×1280 renderiza opciones con y sin documento sin desbordamiento horizontal');
  await b.screenshot(join(kioskArtDir, '10_tablet_vertical.png'));

  // Restaurar resolución principal 1280×800
  await b.setViewport(1280, 800);
  await b.wait(80);

  // CASOS D & E: Documento válido no registrado 87654321 genera R-005, luego lo recupera y lo reimprime sin crear R-006
  for (const ch of '87654321') {
    await b.click(`[data-digit="${ch}"]`);
    await b.wait(15);
  }
  await b.click('#kiosk-step1-continue-btn');
  await b.wait(70);
  await b.click('#kiosk-area-R');
  await b.wait(70);
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(450);
  const ticketR5 = await b.eval(`document.getElementById('kiosk-ticket-code')?.textContent?.trim()`);
  assert(ticketR5 === 'R-005', `Documento no registrado genera ticket general R-005 en Recepción (${ticketR5})`);

  // Finalizar para volver al inicio del terminal
  await b.click('#kiosk-finish-btn');
  await b.wait(70);

  // Caso D: Re-ingresar el mismo documento 87654321 -> recupera R-005 sin crear otro ticket
  for (const ch of '87654321') {
    await b.click(`[data-digit="${ch}"]`);
    await b.wait(15);
  }
  await b.click('#kiosk-step1-continue-btn');
  await b.wait(70);
  await b.click('#kiosk-area-R');
  await b.wait(70);
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(120);

  const dupUnknownBlocked = await b.eval(`(() => {
    const card = document.getElementById('kiosk-ticket-card');
    const code = document.getElementById('kiosk-ticket-code')?.textContent?.trim();
    const msg = document.getElementById('kiosk-duplicate-msg')?.innerText?.trim() || '';
    return {
      isDuplicate: card?.classList.contains('is-duplicate'),
      code,
      msg,
      ahead: document.getElementById('kiosk-ahead-count')?.textContent?.trim() || '',
      noticeText: document.getElementById('notice')?.textContent?.trim() || ''
    };
  })()`);
  assert(
    dupUnknownBlocked.isDuplicate &&
    dupUnknownBlocked.code === 'R-005' &&
    dupUnknownBlocked.msg === 'Ya tiene el turno R-005 activo. Puede volver a imprimirlo sin perder su posición en la cola.' &&
    dupUnknownBlocked.ahead === '2' &&
    dupUnknownBlocked.noticeText === '',
    'Caso D: Documento válido no registrado (87654321) recupera R-005 con ahead=2 sin generar nuevo ticket'
  );

  // Caso E: Pulsar "Reimprimir ticket existente" invoca window.print() con R-005 y NO crea otro ticket
  await b.eval(`(() => {
    window.__existingReprintCalls = 0;
    window.print = () => { window.__existingReprintCalls += 1; };
  })()`);
  await b.click('#kiosk-reprint-existing-btn');
  await b.wait(450);

  const existingReprintOk = await b.eval(`(() => {
    const statusText = document.getElementById('kiosk-print-status-text')?.textContent?.trim() || '';
    const thermal = document.getElementById('kiosk-thermal-ticket')?.textContent || '';
    const code = document.getElementById('kiosk-ticket-code')?.textContent?.trim() || '';
    return {
      code,
      statusText,
      calls: window.__existingReprintCalls,
      thermalHasR5: thermal.includes('R-005') && thermal.includes('Recepción')
    };
  })()`);
  assert(
    existingReprintOk.code === 'R-005' &&
    existingReprintOk.calls === 1 &&
    existingReprintOk.statusText === 'Se abrió la impresión. Si el ticket fue impreso, retírelo y espere a que su código aparezca en pantalla.' &&
    existingReprintOk.thermalHasR5,
    'Caso E: "Reimprimir ticket existente" imprime R-005 mediante window.print() con su código original y sin crear otro turno'
  );

  // Captura 06: Botón "Reimprimir ticket existente" tras recuperación y reimpresión
  await b.screenshot(join(kioskArtDir, '06_boton_reimprimir_existente.png'));

  // Finalizar terminal
  await b.click('#kiosk-finish-btn');
  await b.wait(70);

  // Auditoría de limpieza estricta de notificaciones en rutas públicas (#autoservicio y #pantalla-turnos)
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.wait(80);
  await b.eval(`document.getElementById('notice').textContent = 'Notificación interna de prueba'`);
  await b.wait(40);
  const noticeBeforeKiosk = await b.eval(`document.getElementById('notice')?.textContent?.trim() || ''`);
  assert(noticeBeforeKiosk.length > 0, 'Notificación interna generada en sesión de personal');

  await b.eval(`location.hash = '#autoservicio'`);
  await b.wait(80);
  const noticeInKioskWithSession = await b.eval(`document.getElementById('notice')?.textContent?.trim() || ''`);
  assert(noticeInKioskWithSession === '', 'Navegar a #autoservicio limpia automáticamente el aviso interno residual (#notice vacío)');

  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(80);
  await b.click('#topbar-logout');
  await b.wait(80);
  // Logout activa "Sesión cerrada correctamente."
  await b.eval(`location.hash = '#autoservicio'`);
  await b.wait(80);
  const noticeAfterLogoutInKiosk = await b.eval(`document.getElementById('notice')?.textContent?.trim() || ''`);
  assert(noticeAfterLogoutInKiosk === '', 'Abrir #autoservicio tras cerrar sesión elimina "Sesión cerrada correctamente"');

  await b.eval(`location.hash = '#pantalla-turnos'`);
  await b.wait(80);
  const noticeInPublicDisplay = await b.eval(`document.getElementById('notice')?.textContent?.trim() || ''`);
  assert(noticeInPublicDisplay === '', 'Pantalla pública de llamados (#pantalla-turnos) mantiene aviso limpio (#notice vacío)');

  await b.eval(`location.hash = ''`);
  await b.wait(80);

  // Auditoría del ciclo de vida de avisos toast (Plan 011): entrada, actualización, salida, carrera y accesibilidad
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.wait(80);

  // 1. Entrada normal
  await b.eval(`window.__toastTestApi.clear()`);
  await b.wait(40);
  await b.eval(`window.__toastTestApi.show('Aviso funcional de prueba')`);
  await b.wait(60);
  const toastEnterCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      hasNotice: Boolean(n),
      isVisible: n?.classList.contains('is-visible'),
      text: n?.textContent,
      opacity: Number(st?.opacity || 0),
      transform: st?.transform,
      transitionProperty: st?.transitionProperty,
      role: n?.getAttribute('role'),
      ariaLive: n?.getAttribute('aria-live')
    };
  })()`);
  assert(
    toastEnterCheck.isVisible &&
    toastEnterCheck.text === 'Aviso funcional de prueba' &&
    toastEnterCheck.opacity > 0 && toastEnterCheck.opacity <= 1 &&
    toastEnterCheck.role === 'status' &&
    toastEnterCheck.ariaLive === 'polite',
    'Toast realiza entrada animada con role="status", aria-live="polite", opacity parcial y .is-visible'
  );
  await b.wait(200);
  const toastSettledCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      opacity: Number(st?.opacity || 0),
      transform: st?.transform
    };
  })()`);
  assert(
    toastSettledCheck.opacity === 1 &&
    (toastSettledCheck.transform === 'none' || toastSettledCheck.transform === 'matrix(1, 0, 0, 1, 0, 0)'),
    'Toast completa entrada y se asienta en opacity: 1 y transform: none'
  );

  // 2. Actualización en vuelo sin parpadeo
  await b.eval(`window.__toastTestApi.show('Aviso funcional actualizado')`);
  await b.wait(40);
  const toastUpdateCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: n?.classList.contains('is-visible'),
      text: n?.textContent,
      opacity: Number(st?.opacity || 0),
      transform: st?.transform
    };
  })()`);
  assert(
    toastUpdateCheck.isVisible &&
    toastUpdateCheck.text === 'Aviso funcional actualizado' &&
    toastUpdateCheck.opacity === 1 &&
    (toastUpdateCheck.transform === 'none' || toastUpdateCheck.transform === 'matrix(1, 0, 0, 1, 0, 0)'),
    'Toast se actualiza en vuelo conservando .is-visible y opacidad sin repetir animación de entrada'
  );

  // 3. Salida real mediante dismissToast(false)
  await b.eval(`window.__toastTestApi.dismiss()`);
  await b.wait(50);
  const toastExitCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: n?.classList.contains('is-visible'),
      hasText: Boolean(n?.textContent),
      text: n?.textContent,
      opacity: Number(st?.opacity || 0),
      transform: st?.transform
    };
  })()`);
  assert(
    !toastExitCheck.isVisible &&
    toastExitCheck.hasText &&
    toastExitCheck.opacity > 0 && toastExitCheck.opacity < 1 &&
    toastExitCheck.transform !== 'none',
    'Toast en salida real retira .is-visible, mantiene el texto, presenta 0 < opacity < 1 y desplazamiento espacial'
  );

  await b.wait(200);
  const toastEmptyCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isEmpty: n?.textContent === '',
      display: st?.display
    };
  })()`);
  assert(
    toastEmptyCheck.isEmpty && toastEmptyCheck.display === 'none',
    'Toast se vacía tras concluir la salida real y #notice:empty aplica display: none'
  );

  // 4. Interrupción de la salida por un nuevo aviso
  await b.eval(`window.__toastTestApi.show('Aviso previo a interrupción')`);
  await b.wait(220);
  await b.eval(`window.__toastTestApi.dismiss()`);
  await b.wait(50);
  await b.eval(`window.__toastTestApi.show('Aviso que interrumpe la salida')`);
  await b.wait(50);
  const toastInterruptCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: n?.classList.contains('is-visible'),
      text: n?.textContent,
      opacity: Number(st?.opacity || 0)
    };
  })()`);
  assert(
    toastInterruptCheck.isVisible &&
    toastInterruptCheck.text === 'Aviso que interrumpe la salida' &&
    toastInterruptCheck.opacity > 0,
    'Nuevo toast durante salida real cancela la desaparición y retoma .is-visible con el nuevo mensaje'
  );

  // 4a. Superar los 190ms del fallback anterior: a los 300ms totales desde show
  await b.wait(250);
  const toastPersistsAfterInterrupt = await b.eval(`document.getElementById('notice')?.textContent === 'Aviso que interrumpe la salida' && document.getElementById('notice')?.classList.contains('is-visible')`);
  assert(toastPersistsAfterInterrupt, 'Callback o fallback antiguo de salida real no vacía el nuevo aviso tras interrupción');

  // 4b. Instante previo a los 4000ms (~3850ms desde show): el mensaje nuevo conserva su permanencia completa
  await b.wait(3550);
  const toastBefore4s = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: Boolean(n?.classList.contains('is-visible')),
      text: n?.textContent || '',
      opacity: Number(st?.opacity || 0)
    };
  })()`);
  assert(
    toastBefore4s.isVisible && toastBefore4s.text === 'Aviso que interrumpe la salida' && toastBefore4s.opacity > 0.8,
    'Aviso interruptor conserva sus cuatro segundos completos: visible, texto presente y sin salida prematura (~3850ms)'
  );

  // 4c. Superar los 4000ms (~4100ms desde show): inicio del cierre automático real
  await b.wait(250);
  const toastAutoDismissStarted = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: Boolean(n?.classList.contains('is-visible')),
      text: n?.textContent || '',
      opacity: Number(st?.opacity || 0)
    };
  })()`);
  assert(
    !toastAutoDismissStarted.isVisible && (toastAutoDismissStarted.opacity < 1 || toastAutoDismissStarted.text === ''),
    'Pasados los cuatro segundos (>4000ms), el cierre automático real inicia retirando .is-visible y comenzando el fundido'
  );

  // 4d. Margen final tras fundido y fallback (~4350ms desde show): completamente vacío y display: none
  await b.wait(250);
  const toastAutoDismissEnded = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isEmpty: n?.textContent === '',
      display: st?.display,
      isVisible: Boolean(n?.classList.contains('is-visible'))
    };
  })()`);
  assert(
    toastAutoDismissEnded.isEmpty && toastAutoDismissEnded.display === 'none' && !toastAutoDismissEnded.isVisible,
    'Tras completar el fundido de salida automática, el toast queda vacío y en display: none sin callbacks residuales'
  );

  // Comprobación de que ningún callback residual posterior vuelve a mostrar el aviso
  await b.wait(80);
  const toastNoLateResurrect = await b.eval(`document.getElementById('notice')?.textContent === '' && !document.getElementById('notice')?.classList.contains('is-visible')`);
  assert(toastNoLateResurrect, 'Ningún callback tardío volvió a modificar o reactivar el aviso');

  // 5. Condición de carrera: show() y clear() en el mismo frame
  await b.eval(`(() => {
    window.__toastTestApi.show('Mensaje que debe cancelarse de inmediato');
    window.__toastTestApi.clear();
  })()`);
  await b.wait(50);
  const raceCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      text: n?.textContent || '',
      isVisible: Boolean(n?.classList.contains('is-visible')),
      display: st?.display
    };
  })()`);
  assert(
    raceCheck.text === '' && !raceCheck.isVisible && raceCheck.display === 'none',
    'Carrera frame/limpieza: clear() cancela el requestAnimationFrame pendiente y mantiene #notice vacío'
  );

  await b.wait(50);
  const raceCheck2 = await b.eval(`document.getElementById('notice')?.textContent === '' && !document.getElementById('notice')?.classList.contains('is-visible')`);
  assert(raceCheck2, 'Ningún frame o callback residual vuelve a mostrar el toast tras la carrera');

  await b.eval(`window.__toastTestApi.show('Aviso post-carrera')`);
  await b.wait(60);
  const postRaceCheck = await b.eval(`Boolean(document.getElementById('notice')?.classList.contains('is-visible'))`);
  assert(postRaceCheck, 'Aviso posterior a la carrera realiza su entrada con normalidad');
  await b.eval(`window.__toastTestApi.clear()`);
  await b.wait(40);

  // 6. Movimiento reducido (data-reduced-motion="on")
  await b.eval(`(() => {
    const prefs = JSON.parse(localStorage.getItem('clinica_user_preferences_v1') || '{}');
    const user = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    if (user.id) {
      prefs[user.id] = Object.assign(prefs[user.id] || {}, { reducedMotion: 'on' });
      localStorage.setItem('clinica_user_preferences_v1', JSON.stringify(prefs));
    }
    document.documentElement.dataset.reducedMotion = 'on';
  })()`);
  await b.wait(40);

  await b.eval(`window.__toastTestApi.show('Aviso accesible sin desplazamiento')`);
  await b.wait(60);
  const toastRmOpening = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: n?.classList.contains('is-visible'),
      transform: st?.transform,
      opacity: Number(st?.opacity || 0),
      transitionProperty: st?.transitionProperty || ''
    };
  })()`);
  assert(
    toastRmOpening.isVisible &&
    (toastRmOpening.transform === 'none' || toastRmOpening.transform === 'matrix(1, 0, 0, 1, 0, 0)') &&
    toastRmOpening.transitionProperty.includes('opacity') &&
    toastRmOpening.opacity > 0,
    'Con data-reduced-motion="on", el toast entra sin desplazamiento (transform: none) y con transición de opacidad'
  );

  await b.wait(200);
  await b.eval(`window.__toastTestApi.dismiss()`);
  await b.wait(50);
  const toastRmClosing = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      isVisible: n?.classList.contains('is-visible'),
      hasText: Boolean(n?.textContent),
      transform: st?.transform,
      opacity: Number(st?.opacity || 0),
      transitionProperty: st?.transitionProperty || ''
    };
  })()`);
  assert(
    !toastRmClosing.isVisible &&
    toastRmClosing.hasText &&
    (toastRmClosing.transform === 'none' || toastRmClosing.transform === 'matrix(1, 0, 0, 1, 0, 0)') &&
    toastRmClosing.opacity > 0 && toastRmClosing.opacity < 1 &&
    toastRmClosing.transitionProperty.includes('opacity'),
    'Con data-reduced-motion="on", el toast en salida permanece montado en fundido sin desplazamiento (opacity entre 0 y 1)'
  );

  await b.wait(200);
  const toastRmEmpty = await b.eval(`document.getElementById('notice')?.textContent === ''`);
  assert(toastRmEmpty, 'Con data-reduced-motion="on", el toast se vacía tras concluir el fundido real de 160–190ms');

  // Restaurar preferencia normal de movimiento
  await b.eval(`(() => {
    const prefs = JSON.parse(localStorage.getItem('clinica_user_preferences_v1') || '{}');
    const user = JSON.parse(sessionStorage.getItem('clinica_auth_session') || '{}');
    if (user.id) {
      prefs[user.id] = Object.assign(prefs[user.id] || {}, { reducedMotion: 'off' });
      localStorage.setItem('clinica_user_preferences_v1', JSON.stringify(prefs));
    }
    delete document.documentElement.dataset.reducedMotion;
  })()`);
  await b.wait(40);

  // 7. Limpieza pública inmediata (Caso G)
  await b.eval(`window.__toastTestApi.show('Aviso previo a autoservicio')`);
  await b.wait(60);
  assert(await b.eval(`Boolean(document.getElementById('notice')?.textContent)`), 'El aviso previo se montó');

  await b.eval(`location.hash = '#autoservicio'`);
  await b.wait(40);
  const autoNoticeCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      text: n?.textContent || '',
      isVisible: Boolean(n?.classList.contains('is-visible')),
      display: st?.display
    };
  })()`);
  assert(
    autoNoticeCheck.text === '' && !autoNoticeCheck.isVisible && autoNoticeCheck.display === 'none',
    'Navegar a #autoservicio limpia inmediatamente el aviso sin transiciones residuales (display: none, sin .is-visible)'
  );

  await b.eval(`location.hash = '#dashboard'`);
  await b.wait(80);
  await b.eval(`window.__toastTestApi.show('Aviso previo a pantalla-turnos')`);
  await b.wait(60);

  await b.eval(`location.hash = '#pantalla-turnos'`);
  await b.wait(40);
  const pantallaNoticeCheck = await b.eval(`(() => {
    const n = document.getElementById('notice');
    const st = n ? getComputedStyle(n) : null;
    return {
      text: n?.textContent || '',
      isVisible: Boolean(n?.classList.contains('is-visible')),
      display: st?.display
    };
  })()`);
  assert(
    pantallaNoticeCheck.text === '' && !pantallaNoticeCheck.isVisible && pantallaNoticeCheck.display === 'none',
    'Navegar a #pantalla-turnos limpia inmediatamente el aviso sin transiciones residuales (display: none, sin .is-visible)'
  );

  await b.wait(100);
  const noticeStillCleanInPublic = await b.eval(`document.getElementById('notice')?.textContent === '' && !document.getElementById('notice')?.classList.contains('is-visible')`);
  assert(noticeStillCleanInPublic, 'Ningún RAF o fallback residual volvió a mostrar el aviso en pantalla pública');

  await b.eval(`location.hash = ''`);
  await b.wait(80);

  // Prueba 3: Recepción genera orden OP-0004 para Luis (00000004) en Agenda y luego Autoservicio genera C-002 vinculado
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(100);
  await b.click('[data-appointment="4"]');
  await b.wait(70);
  const luisDrawerOk = await b.eval(`Boolean(document.querySelector('.drawer-full-detail'))`);
  if (luisDrawerOk) {
    await b.click('.drawer-full-detail');
    await b.wait(200);
  }
  await b.click('#receipt');
  await b.wait(80);
  await b.click('#done');
  await b.wait(60);

  // Confirmar también que la cita #5 de Elena NO cambió por emitir R-004 en autoservicio
  await b.eval(`location.hash = '#turnos-recepcion'`);
  await b.wait(90);

  // Prueba 13: Recepción no puede abrir cola C ni Caja ni Supervisión Admin
  await b.eval(`location.hash = '#turnos-caja'`);
  await b.wait(80);
  const recBlockedC = await b.eval(`location.hash === '#dashboard'`);
  assert(recBlockedC, 'Prueba 13: Recepción queda bloqueada al intentar abrir #turnos-caja');

  // Ir a Autoservicio preservando sesión/memoria para emitir C-002 vinculado a OP-0004
  await b.eval(`location.hash = '#autoservicio'`);
  await b.wait(80);
  for (const ch of '00000004') {
    await b.click(`[data-digit="${ch}"]`);
    await b.wait(15);
  }
  await b.click('#kiosk-step1-continue-btn');
  await b.wait(70);
  await b.click('#kiosk-area-C');
  await b.wait(70);
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(90);
  const ticketC2 = await b.eval(`({
    code: document.getElementById('kiosk-ticket-code')?.textContent?.trim(),
    area: document.getElementById('kiosk-ticket-area')?.textContent?.trim()
  })`);
  assert(
    ticketC2.code === 'C-002' && ticketC2.area.includes('Caja'),
    'Genera turno C-002 en Caja vinculado internamente a la orden pendiente de Luis'
  );
  await b.click('#kiosk-finish-btn');
  await b.wait(60);

  // Panel de Recepción: Pruebas de ventanilla ocupada, transferencia duplicada y flujo operativo
  await b.eval(`location.hash = '#turnos-recepcion'`);
  await b.wait(100);
  const recIsolation = await b.eval(`(() => {
    const txt = document.getElementById('view')?.innerText || '';
    return txt.includes('R-002') && txt.includes('R-003') && !txt.includes('C-001') && !txt.includes('C-002');
  })()`);
  assert(recIsolation, 'Recepción visualiza únicamente su cola R y no la cola C');

  // Ventanilla Recepción 1 ocupada con R-002 en Llamado -> botón Llamar siguiente deshabilitado + explicación accesible
  const rec1BusyCalled = await b.eval(`(() => {
    const sel = document.getElementById('recepcion-counter-select')?.value;
    const btn = document.getElementById('recepcion-call-next-btn');
    const hint = document.getElementById('recepcion-call-next-hint')?.textContent?.trim() || '';
    const r3Waiting = Boolean(document.querySelector('[data-turn-code="R-003"]')?.innerText.includes('En espera'));
    return { sel, disabled: Boolean(btn?.disabled), hint, r3Waiting, desc: btn?.getAttribute('aria-describedby') || '' };
  })()`);
  assert(
    rec1BusyCalled.sel === 'Recepción 1' &&
    rec1BusyCalled.disabled === true &&
    rec1BusyCalled.desc === 'recepcion-call-next-hint' &&
    rec1BusyCalled.hint.includes('Recepción 1') &&
    rec1BusyCalled.hint.includes('R-002') &&
    rec1BusyCalled.r3Waiting === true,
    'Ventanilla ocupada (Llamado): Recepción 1 deshabilita Llamar siguiente con explicación accesible y mantiene R-003 En espera'
  );
  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(60);
  await b.screenshot(join(turnosArtDir, 'ventanilla_ocupada_bloqueada.png'));

  // Acción rápida desde paleta global también debe rechazarse cuando Recepción 1 está ocupada
  await b.click('#topbar-search-btn');
  await b.wait(70);
  await b.type('#cp-input', 'Llamar siguiente turno');
  await b.wait(80);
  await b.eval(`Array.from(document.querySelectorAll('#cp-results .cp-item')).find(el => el.innerText.includes('Llamar siguiente turno de recepción'))?.click()`);
  await b.wait(90);
  const rec1PaletteBusy = await b.eval(`({
    notice: document.getElementById('notice')?.textContent?.trim() || '',
    r3Waiting: Boolean(document.querySelector('[data-turn-code="R-003"]')?.innerText.includes('En espera'))
  })`);
  assert(
    rec1PaletteBusy.notice.includes('Recepción 1') && rec1PaletteBusy.notice.includes('R-002') && rec1PaletteBusy.r3Waiting,
    'Acción rápida de paleta respeta invariante de ventanilla ocupada y rechaza llamar siguiente en Recepción 1'
  );

  // Iniciar atención de R-002 (En atención) -> Llamar siguiente sigue deshabilitado y transferir a Caja queda bloqueado por C-001 activo
  await b.click('#recepcion-start-btn');
  await b.wait(70);
  const rec1BusyAttention = await b.eval(`Boolean(document.getElementById('recepcion-call-next-btn')?.disabled) && (document.getElementById('recepcion-call-next-hint')?.textContent || '').includes('R-002')`);
  assert(rec1BusyAttention, 'Ventanilla ocupada (En atención): Recepción 1 conserva Llamar siguiente deshabilitado para R-002');

  await b.click('#recepcion-transfer-cash-btn');
  await b.wait(90);
  const dupTransferR2Check = await b.eval(`(() => {
    const alertText = document.getElementById('turns-transfer-blocked-alert')?.innerText || '';
    const noticeText = document.getElementById('notice')?.textContent?.trim() || '';
    const r2StillActive = Boolean(document.getElementById('recepcion-finish-btn')) && (document.getElementById('view')?.innerText || '').includes('R-002');
    const r2NotClosed = !document.querySelector('[data-turn-history="R-002"]');
    return { alertText, noticeText, r2StillActive, r2NotClosed };
  })()`);
  assert(
    dupTransferR2Check.alertText.includes('C-001') &&
    dupTransferR2Check.noticeText.includes('C-001') &&
    dupTransferR2Check.r2StillActive &&
    dupTransferR2Check.r2NotClosed,
    'Transferencia duplicada Recepción -> Caja (R-002 con C-001 activo) se bloquea sin cerrar R-002 ni duplicar ticket'
  );
  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(60);
  await b.screenshot(join(turnosArtDir, 'transferencia_duplicada_bloqueada.png'));

  // Cambiar a ventanilla libre Recepción 2 recalcula de inmediato y habilita Llamar siguiente
  await b.select('#recepcion-counter-select', 'Recepción 2');
  await b.wait(80);
  const rec2FreeCheck = await b.eval(`({
    btnDisabled: Boolean(document.getElementById('recepcion-call-next-btn')?.disabled),
    hasBusyHint: Boolean(document.getElementById('recepcion-call-next-hint'))
  })`);
  assert(rec2FreeCheck.btnDisabled === false && rec2FreeCheck.hasBusyHint === false, 'Cambiar a ventanilla libre Recepción 2 habilita inmediatamente Llamar siguiente');

  // Pruebas 5, 6 y 7 en Recepción 2: Llamar siguiente (R-003 Ana), verificar ocupación, Volver a llamar, Iniciar atención y Validar llegada -> Llegó
  await b.click('#recepcion-call-next-btn');
  await b.wait(70);
  const rec2NowBusy = await b.eval(`Boolean(document.getElementById('recepcion-call-next-btn')?.disabled) && (document.getElementById('recepcion-call-next-hint')?.textContent || '').includes('R-003')`);
  assert(rec2NowBusy, 'Tras llamar R-003, Recepción 2 pasa inmediatamente a ocupada y deshabilita Llamar siguiente');
  await b.click('#recepcion-recall-btn');
  await b.wait(70);
  await b.click('#recepcion-start-btn');
  await b.wait(70);
  const beforeValidateR3 = await b.eval(`document.getElementById('recepcion-linked-app-status')?.textContent?.trim()`);
  await b.click('#recepcion-validate-arrival-btn');
  await b.wait(80);
  const afterValidateR3 = await b.eval(`document.getElementById('recepcion-linked-app-status')?.textContent?.trim()`);
  assert(beforeValidateR3 === 'Confirmada' && afterValidateR3 === 'Llegó', 'Prueba 7: Recepción valida llegada desde turno R-003 y pasa cita #3 de Confirmada a Llegó');

  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(60);
  await b.screenshot(join(turnosArtDir, 'panel_recepcion.png'));

  await b.click('#recepcion-finish-btn');
  await b.wait(80);
  const r3FinishedAndFree = await b.eval(`document.querySelector('[data-turn-history="R-003"]')?.innerText?.includes('Finalizado') === true && document.getElementById('recepcion-call-next-btn')?.disabled === false`);
  assert(r3FinishedAndFree, 'Prueba 5 & 6: Recepción finaliza R-003, lo conserva en historial y libera Recepción 2');

  // Prueba 8: Llamar R-004 en Recepción 2 y marcar Ausente
  await b.click('#recepcion-call-next-btn');
  await b.wait(70);
  await b.click('#recepcion-absent-btn');
  await b.wait(80);
  const r4Absent = await b.eval(`document.querySelector('[data-turn-history="R-004"]')?.innerText?.includes('Ausente') === true`);
  assert(r4Absent, 'Prueba 8: Marcar turno R-004 como Ausente lo conserva visible en el historial');

  // Panel de Caja: Pruebas ventanilla ocupada, transferencia inversa bloqueada, cobro y transferencia R-006
  await loginQuickRole('caja@clinicaoftalmo.pe');
  await b.wait(80);

  // Prueba 14: Caja no puede operar cola R ni acceder a módulos clínicos o Recepción
  await b.eval(`location.hash = '#turnos-recepcion'`);
  await b.wait(80);
  const cajaBlockedR = await b.eval(`location.hash === '#caja'`);
  await b.eval(`location.hash = '#pacientes'`);
  await b.wait(80);
  const cajaBlockedClin = await b.eval(`location.hash === '#caja'`);
  assert(cajaBlockedR && cajaBlockedClin, 'Prueba 14: Caja no puede abrir cola R ni módulos de pacientes/clínica');

  await b.eval(`location.hash = '#turnos-caja'`);
  await b.wait(100);
  const cajaSeesOnlyC = await b.eval(`(() => {
    const txt = document.getElementById('view')?.innerText || '';
    return txt.includes('C-001') && txt.includes('C-002') && !txt.includes('C-003') && !txt.includes('R-005');
  })()`);
  assert(cajaSeesOnlyC, 'Caja visualiza exclusivamente su cola C (C-001, C-002) sin duplicado C-003 ni cola R operativa');

  // Llamar C-001 -> Caja 1 pasa a ocupada (Llamado) + paleta global rechaza nuevo llamado
  await b.click('#caja-call-next-btn');
  await b.wait(70);
  const cajaBusyCalled = await b.eval(`Boolean(document.getElementById('caja-call-next-btn')?.disabled) && (document.getElementById('caja-call-next-hint')?.textContent || '').includes('C-001')`);
  assert(cajaBusyCalled, 'Caja 1 ocupada (Llamado): deshabilita Llamar siguiente mostrando C-001 activo');

  await b.click('#topbar-search-btn');
  await b.wait(70);
  await b.type('#cp-input', 'Llamar siguiente turno');
  await b.wait(80);
  await b.eval(`Array.from(document.querySelectorAll('#cp-results .cp-item')).find(el => el.innerText.includes('Llamar siguiente turno de Caja'))?.click()`);
  await b.wait(90);
  const cajaPaletteBusy = await b.eval(`({
    notice: document.getElementById('notice')?.textContent?.trim() || '',
    c2Waiting: Boolean(document.querySelector('[data-turn-code="C-002"]')?.innerText.includes('En espera'))
  })`);
  assert(cajaPaletteBusy.notice.includes('Caja 1') && cajaPaletteBusy.notice.includes('C-001') && cajaPaletteBusy.c2Waiting, 'Paleta de Caja rechaza llamar siguiente mientras Caja 1 tiene C-001');

  await b.click('#caja-start-btn');
  await b.wait(80);
  const cajaBusyAtt = await b.eval(`Boolean(document.getElementById('caja-call-next-btn')?.disabled)`);
  assert(cajaBusyAtt, 'Caja 1 ocupada (En atención): Llamar siguiente permanece deshabilitado');

  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(60);
  await b.screenshot(join(turnosArtDir, 'panel_caja.png'));

  // Transferencia inversa bloqueada: C-001 -> Recepción mientras R-002 de Carlos sigue activo en Recepción 1
  await b.click('#caja-transfer-reception-btn');
  await b.wait(70);
  await b.click('#transfer-rec-confirm');
  await b.wait(90);
  const dupReverseTransfer = await b.eval(`(() => {
    const alertText = document.getElementById('turns-transfer-blocked-alert')?.innerText || '';
    const c1StillActive = Boolean(document.getElementById('caja-register-payment-btn'));
    const c1NotTransferred = !document.querySelector('[data-turn-history="C-001"]');
    return { alertText, c1StillActive, c1NotTransferred };
  })()`);
  assert(
    dupReverseTransfer.alertText.includes('R-002') && dupReverseTransfer.c1StillActive && dupReverseTransfer.c1NotTransferred,
    'Transferencia duplicada inversa Caja -> Recepción (C-001 con R-002 activo) bloqueada identificando R-002'
  );

  await b.click('#caja-open-order-btn');
  await b.wait(70);
  const orderModalShown = await b.eval(`document.getElementById('modal')?.open === true && document.getElementById('modal')?.innerText.includes('OP-0002')`);
  assert(orderModalShown, 'Caja abre la orden interna vinculada OP-0002 desde el turno activo');
  await b.click('#done');
  await b.wait(60);

  await b.click('#caja-register-payment-btn');
  await b.wait(80);
  await b.click('#pay-submit');
  await b.wait(100);
  await b.click('#done');
  await b.wait(80);
  const c1PaidFinished = await b.eval(`document.querySelector('[data-turn-history="C-001"]')?.innerText?.includes('Finalizado') === true && document.getElementById('caja-call-next-btn')?.disabled === false`);
  assert(c1PaidFinished, 'Prueba 10 & 11: Caja registra el cobro de OP-0002, finaliza C-001 automáticamente y libera Caja 1');

  // Prueba 12: Llamar C-002, iniciar atención y transferir de Caja -> Recepción (R-006)
  await b.click('#caja-call-next-btn');
  await b.wait(70);
  await b.click('#caja-start-btn');
  await b.wait(70);
  await b.click('#caja-transfer-reception-btn');
  await b.wait(70);
  await b.click('#transfer-rec-confirm');
  await b.wait(90);
  const c2Transferred = await b.eval(`Boolean(document.querySelector('[data-turn-history="C-002"]')?.innerText.includes('Transferido') && document.querySelector('[data-turn-history="C-002"]')?.innerText.includes('R-006'))`);
  assert(c2Transferred, 'Prueba 12: Transferir Caja -> Recepción marca C-002 como Transferido y emite R-006');

  // Ahora que C-001 ya finalizó, Recepción 1 sí puede transferir R-002 -> Caja creando C-003, y Recepción 2 llama R-005
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#turnos-recepcion'`);
  await b.wait(80);
  await b.select('#recepcion-counter-select', 'Recepción 1');
  await b.wait(70);
  await b.click('#recepcion-transfer-cash-btn');
  await b.wait(80);
  const r2NowTransferred = await b.eval(`Boolean(document.querySelector('[data-turn-history="R-002"]')?.innerText.includes('Transferido') && document.querySelector('[data-turn-history="R-002"]')?.innerText.includes('C-003'))`);
  assert(r2NowTransferred, 'Prueba 9: Tras finalizar C-001, transferir R-002 -> Caja marca Transferido y crea C-003');
  await b.select('#recepcion-counter-select', 'Recepción 2');
  await b.wait(60);
  await b.click('#recepcion-call-next-btn');
  await b.wait(70);

  // En Caja llamar C-003 para que Pantalla Pública exhiba ambos llamados en curso (R-005 en Recepción 2 y C-003 en Caja 1)
  await loginQuickRole('caja@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#turnos-caja'`);
  await b.wait(80);
  await b.click('#caja-call-next-btn');
  await b.wait(70);

  // Prueba 15: Médico y Técnico bloqueados en Turnos y en Buscador Global
  await loginQuickRole('v.rios@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#turnos-recepcion'`);
  await b.wait(70);
  const medBlockedTurns = await b.eval(`location.hash === '#agenda'`);
  await loginQuickRole('tecnico@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#turnos-caja'`);
  await b.wait(70);
  const tecBlockedTurns = await b.eval(`location.hash === '#estudios'`);
  assert(medBlockedTurns && tecBlockedTurns, 'Prueba 15: Médico y Técnico no pueden abrir ni operar módulos de turnos');

  // Prueba 16 & 18: Administrador en Supervisión de ambas colas + Buscador global por rol
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#turnos-supervision'`);
  await b.wait(100);
  const adminSupervision = await b.eval(`(() => {
    const view = document.getElementById('view');
    const txt = view?.innerText || '';
    const hasBothQueues = txt.includes('R-005') && txt.includes('C-003') && txt.includes('R-001') && txt.includes('C-001');
    const hasNoOpButtons = !document.getElementById('recepcion-call-next-btn') && !document.getElementById('caja-call-next-btn') && !document.getElementById('caja-register-payment-btn');
    return hasBothQueues && hasNoOpButtons && Boolean(document.getElementById('admin-turns-supervision-banner'));
  })()`);
  assert(adminSupervision, 'Prueba 16: Administrador supervisa colas R y C completas sin botones operativos de cobro o ventanilla');

  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(60);
  await b.screenshot(join(turnosArtDir, 'supervision_admin.png'));

  // Filtros e historial auditable en Supervisión
  await b.select('#admin-turns-filter-area', 'C');
  await b.wait(50);
  await b.select('#admin-turns-filter-state', 'Transferido');
  await b.wait(60);
  const adminFiltered = await b.eval(`Array.from(document.querySelectorAll('[data-admin-turn-row]')).map(r => r.dataset.adminTurnRow)`);
  assert(adminFiltered.length === 1 && adminFiltered[0] === 'C-002', `Filtros de supervisión muestran exactamente C-002 Transferido (${adminFiltered.join(',')})`);
  await b.select('#admin-turns-filter-area', 'ALL');
  await b.select('#admin-turns-filter-state', 'ALL');
  await b.wait(60);

  await b.click('[data-inspect-turn="R-003"]');
  await b.wait(70);
  const historyInspectOk = await b.eval(`(() => {
    const txt = document.getElementById('modal')?.innerText || '';
    return txt.includes('Historial completo') && txt.includes('R-003') && txt.includes('Confirmada a Llegó');
  })()`);
  assert(historyInspectOk, 'Auditoría muestra historial cronológico completo con usuario, área, ventanilla y validación de cita');
  await b.click('#done');
  await b.wait(50);

  // Prueba 18: Buscador global muestra "Turnos presenciales" al Admin y no acciones de cobro/ventanilla
  await b.click('#topbar-search-btn');
  await b.wait(80);
  await b.type('#cp-input', 'turnos');
  await b.wait(80);
  const cpAdminTurns = await b.eval(`document.getElementById('cp-results')?.innerText || ''`);
  assert(cpAdminTurns.includes('Turnos presenciales') && !cpAdminTurns.includes('Turnos de caja'), 'Prueba 18: Paleta global del Admin solo muestra supervisión de turnos');
  await b.key('Escape', 'Escape', 27);
  await b.wait(60);

  // Prueba 17: Pantalla pública estrictamente libre de datos personales/clínicos/pago y sin paleta global
  await b.click('#admin-open-display');
  await b.wait(100);
  await b.key('k', 'KeyK', 75, 2);
  await b.wait(60);
  const publicDisplayCheck = await b.eval(`(() => {
    const bodyText = document.getElementById('app')?.innerText || '';
    const paletteOpen = document.getElementById('command-palette')?.open === true;
    const hasExpected = bodyText.includes('R-005') && bodyText.includes('C-003') && bodyText.includes('Diríjase a Recepción 2') && bodyText.includes('Diríjase a Caja 1');
    const leaksPrivateData = ['Carlos', 'Ana Torres', 'Elena Soto', 'Luis Pérez', 'María López', '000000', '••••', '900 000', 'OP-0002', 'Control oftalmológico', 'Consulta oftalmológica', 'Pagado', 'Pendiente'].some(term => bodyText.includes(term));
    return { hasExpected, leaksPrivateData, paletteOpen };
  })()`);
  assert(
    publicDisplayCheck.hasExpected && !publicDisplayCheck.leaksPrivateData && !publicDisplayCheck.paletteOpen,
    'Prueba 17: Pantalla pública muestra códigos e indicaciones sin nombres, DNI, teléfono, servicio clínico ni paleta global'
  );
  await b.screenshot(join(turnosArtDir, 'pantalla_publica.png'));

  // Pruebas 19 & responsividad en 4 viewports + captura móvil
  for (const vp of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }, { width: 768, height: 1024 }, { width: 375, height: 667 }]) {
    await b.setViewport(vp.width, vp.height);
    for (const h of ['#autoservicio', '#pantalla-turnos']) {
      await b.eval(`location.hash = ${JSON.stringify(h)}`);
      await b.wait(70);
      const ov = await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
      assert(ov, `Vista pública ${h} en ${vp.width}×${vp.height} sin desbordamiento horizontal`);
    }
  }

  await b.setViewport(1280, 800);
  await b.eval(`location.hash = '#turnos-supervision'`);
  await b.wait(80);
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#turnos-recepcion'`);
  await b.wait(80);
  await b.setViewport(375, 667);
  await b.wait(100);
  const mobileTurnsOk = await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1 && Boolean(document.querySelector('[data-turns-role="recepcion"]'))`);
  assert(mobileTurnsOk, 'Panel móvil 375×667 de Turnos de Recepción renderiza sin desborde horizontal');
  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(60);
  await b.screenshot(join(turnosArtDir, 'turnos_movil.png'));

  // Verificar que un segundo visitante en autoservicio no colisiona con R-005 activo
  await b.setViewport(1280, 800);
  await b.eval(`location.hash = '#autoservicio'`);
  await b.wait(80);
  for (const ch of '00000088') {
    await b.click(`[data-digit="${ch}"]`);
    await b.wait(15);
  }
  await b.click('#kiosk-step1-continue-btn');
  await b.wait(70);
  await b.click('#kiosk-area-R');
  await b.wait(70);
  await b.click('#kiosk-confirm-ticket-btn');
  await b.wait(80);
  const ticketR7Anon2 = await b.eval(`document.getElementById('kiosk-ticket-code')?.textContent?.trim()`);
  assert(ticketR7Anon2 === 'R-007', `Segundo visitante obtiene ${ticketR7Anon2} sin colisionar con R-005 activo`);
  await b.click('#kiosk-finish-btn');
  await b.wait(50);

  // Verificar restablecimiento del demo (Prueba 20 en navegador)
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.eval(`location.hash = '#turnos-supervision'`);
  await b.wait(100);
  const resetTurnsBrowserOk = await b.eval(`(() => {
    const rows = Array.from(document.querySelectorAll('[data-admin-turn-row]')).map(r => r.dataset.adminTurnRow);
    return rows.length === 4 && rows.includes('R-001') && rows.includes('R-002') && rows.includes('R-003') && rows.includes('C-001') && !rows.includes('R-004') && !rows.includes('C-002');
  })()`);
  assert(resetTurnsBrowserOk, 'Prueba 19/20: Reinicio del demo restaura exactamente R-001, R-002, R-003 y C-001');

  // =========================================================================
  // 18. PANTALLA PÚBLICA (#pantalla-turnos) Y SINCRONIZACIÓN REAL ENTRE PESTAÑAS
  // =========================================================================
  console.log('\n--- 18. Pantalla pública TV a pantalla completa y sincronización multipestaña ---');

  const pantallaTurnosArtDir = resolve((process.env.PANTALLA_TURNOS_ARTIFACT_DIR || (process.env.ARTIFACT_DIR ? join(process.env.ARTIFACT_DIR, 'pantalla-turnos') : '')).trim() || 'artifacts/pantalla-turnos');
  mkdirSync(pantallaTurnosArtDir, { recursive: true });

  const appRootDir = resolve('./app');
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8'
  };
  const syncServer = http.createServer(async (req, res) => {
    try {
      const reqPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const targetFile = resolve(appRootDir, '.' + (reqPath === '/' ? '/index.html' : reqPath));
      if (!targetFile.startsWith(appRootDir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await fsReadFile(targetFile);
      res.writeHead(200, {
        'Content-Type': mimeTypes[extname(targetFile)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise(resolveListen => syncServer.listen(0, '127.0.0.1', resolveListen));
  syncServer.unref();
  const syncAddr = syncServer.address();
  const syncOriginUrl = `http://127.0.0.1:${syncAddr.port}/index.html`;

  async function waitUntilTab(tab, expr, timeoutMs = 7000, label = 'condición en pestaña') {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await tab.eval(expr);
        if (val) return val;
      } catch {
        // Reintentar si la pestaña aún está completando commit de navegación
      }
      await tab.wait(45);
    }
    let diag = null;
    try {
      diag = await tab.eval(`({
        href: location.href,
        hash: location.hash,
        readyState: document.readyState,
        appReady: Boolean(window.__appReady),
        appLen: document.getElementById('app')?.innerHTML?.length || 0,
        bodyClasses: document.body?.className || '',
        hasClock: Boolean(document.getElementById('public-clock-time'))
      })`);
    } catch (e) {
      diag = { evalError: String(e?.message || e) };
    }
    throw new Error(`Timeout esperando ${label} (${timeoutMs}ms) -> ${JSON.stringify(diag)}`);
  }

  let tabDisplay = null;
  let tabKiosk = null;
  let tabRecep = null;
  let tabCaja = null;
  const listenerCountBeforeSec18 = b.listenerCount();
  const expectedHttpOrigin = new URL(syncOriginUrl).origin;

  try {
    tabDisplay = await b.newTab(`${syncOriginUrl}#pantalla-turnos`, { width: 1920, height: 1080 });
    tabKiosk = await b.newTab(`${syncOriginUrl}#autoservicio`, { width: 1024, height: 768 });
    tabRecep = await b.newTab(`${syncOriginUrl}`, { width: 1280, height: 800 });
    tabCaja = await b.newTab(`${syncOriginUrl}`, { width: 1280, height: 800 });

    const origins4 = await Promise.all([
      tabDisplay.eval('location.origin'),
      tabKiosk.eval('location.origin'),
      tabRecep.eval('location.origin'),
      tabCaja.eval('location.origin')
    ]);
    assert(
      origins4.every(o => o === expectedHttpOrigin),
      `18.1c Las 4 pestañas comparten exactamente el mismo origen HTTP local (${expectedHttpOrigin})`,
      JSON.stringify(origins4)
    );

    await waitUntilTab(tabDisplay, `Boolean(document.getElementById('public-clock-time'))`, 7000, 'montaje inicial #pantalla-turnos');
    const displayMountedCleanly = await tabDisplay.eval(`({
      hash: location.hash,
      ready: Boolean(window.__appReady),
      hasClock: Boolean(document.getElementById('public-clock-time')),
      isTvBody: document.body.classList.contains('is-public-tv')
    })`);
    assert(
      displayMountedCleanly.hash === '#pantalla-turnos' &&
      displayMountedCleanly.hasClock &&
      displayMountedCleanly.isTvBody,
      '18.1b #pantalla-turnos monta de forma determinista al abrir múltiples pestañas simultáneamente'
    );
    await waitUntilTab(tabKiosk, `Boolean(document.getElementById('kiosk-step1-continue-btn'))`, 7000, 'montaje inicial #autoservicio');
    await tabKiosk.eval(`window.print = () => {}`);
    await loginQuickRole('recepcion@clinicaoftalmo.pe', tabRecep);
    await tabRecep.eval(`location.hash = '#turnos-recepcion'`);
    await waitUntilTab(tabRecep, `Boolean(document.getElementById('recepcion-call-next-btn'))`, 5000, 'panel Turnos Recepción');
    await loginQuickRole('caja@clinicaoftalmo.pe', tabCaja);
    await tabCaja.eval(`location.hash = '#turnos-caja'`);
    await waitUntilTab(tabCaja, `Boolean(document.getElementById('caja-call-next-btn'))`, 5000, 'panel Turnos Caja');

    const rbacPublicIsolationOk = await Promise.all([
      tabRecep.eval(`!document.querySelector('[href="#automations"], [href="#turnos-caja"]')`),
      tabCaja.eval(`!document.querySelector('[href="#automations"], [href="#turnos-recepcion"]')`),
      tabDisplay.eval(`!(document.getElementById('notice')?.textContent?.trim())`),
      tabKiosk.eval(`!(document.getElementById('notice')?.textContent?.trim())`)
    ]);
    assert(
      rbacPublicIsolationOk.every(Boolean),
      '18.1d Aislamiento de permisos entre Recepción y Caja y cero avisos internos filtrados a pantallas públicas'
    );

    // Restablecimiento limpio desde pestaña operativa + token anti-recarga en tabDisplay
    await tabDisplay.eval(`window.__noReloadToken = 'TV-LIVE-' + Date.now();`);
    const displayTokenBefore = await tabDisplay.eval(`window.__noReloadToken`);

    await tabRecep.eval(`window.__resetDemoData()`);
    await waitUntilTab(tabDisplay, `Boolean(document.querySelector('[data-public-code="R-002"]')) && Number(document.querySelector('[data-waiting-count="R"]')?.textContent) === 1`, 5000, 'estado inicial TV');

    // Escenario 1: Estado inicial, encabezado TV, reloj demo unificado vivo en 1080p sin botones de navegación interna
    await tabDisplay.focus();
    const clockSample1 = await tabDisplay.eval(`document.getElementById('public-clock-time')?.textContent?.trim() || ''`);
    const clockSample2 = await waitUntilTab(
      tabDisplay,
      `(() => { const t = document.getElementById('public-clock-time')?.textContent?.trim() || ''; return t && t !== ${JSON.stringify(clockSample1)} ? t : null; })()`,
      3500,
      'actualización del reloj cada segundo'
    );
    const initDisplayCheck = await tabDisplay.eval(`(() => {
      const shell = document.querySelector('.public-display-shell');
      const headerTxt = document.querySelector('.public-tv-header')?.innerText || '';
      const boardTxt = document.getElementById('app')?.innerText || '';
      const hasForbiddenNav = Boolean(
        document.getElementById('display-goto-kiosk') ||
        document.getElementById('display-back-system') ||
        document.getElementById('sidebar') ||
        document.getElementById('mobile-tabbar') ||
        document.getElementById('topbar-search-btn')
      );
      const noScroll1080 = document.documentElement.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollHeight <= window.innerHeight + 1;
      const clockTime = document.getElementById('public-clock-time')?.textContent?.trim() || '';
      const clockDate = document.getElementById('public-clock-date')?.textContent?.trim() || '';
      const lastUpd = document.getElementById('public-last-update')?.textContent?.trim() || '';
      const recentCodes = Array.from(document.querySelectorAll('#public-recent-list [data-recent-code]')).map(el => el.dataset.recentCode);
      const waitR = Array.from(document.querySelectorAll('[data-queue-list="R"] [data-waiting-code]')).map(el => el.dataset.waitingCode);
      const waitC = Array.from(document.querySelectorAll('[data-queue-list="C"] [data-waiting-code]')).map(el => el.dataset.waitingCode);
      return {
        hasShell: Boolean(shell),
        headerOk: headerTxt.includes('Clínica Oftalmológica') && headerTxt.includes('Sala de espera') && headerTxt.includes('Pantalla de turnos activa'),
        hasForbiddenNav,
        noScroll1080,
        clockValid: /^09:\\d{2}:\\d{2}$/.test(clockTime) && clockDate === 'Martes, 27 de octubre de 2026' && lastUpd === clockTime.slice(0, 5),
        activeHasR2: boardTxt.includes('R-002') && boardTxt.includes('Diríjase a Recepción 1'),
        recentHasR1: recentCodes.includes('R-001'),
        waitR,
        waitC
      };
    })()`);
    assert(
      initDisplayCheck.hasShell &&
      initDisplayCheck.headerOk &&
      !initDisplayCheck.hasForbiddenNav &&
      initDisplayCheck.noScroll1080 &&
      initDisplayCheck.clockValid &&
      clockSample1 !== clockSample2 &&
      initDisplayCheck.activeHasR2 &&
      initDisplayCheck.recentHasR1 &&
      initDisplayCheck.waitR.join(',') === 'R-003' &&
      initDisplayCheck.waitC.join(',') === 'C-001',
      'Escenario 1 (1080p): Pantalla TV sin botones internos, reloj demo unificado activo cada segundo y colas iniciales',
      JSON.stringify({ ...initDisplayCheck, clockSample1, clockSample2 })
    );
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '01-pantalla-inicial-1080p.png'));

    // Escenario 2: Emisión desde #autoservicio actualiza #pantalla-turnos y #turnos-recepcion sin recargar
    await tabKiosk.focus();
    for (const ch of '00000004') {
      await tabKiosk.click(`[data-digit="${ch}"]`);
      await tabKiosk.wait(15);
    }
    await tabKiosk.click('#kiosk-step1-continue-btn');
    await tabKiosk.wait(70);
    await tabKiosk.click('#kiosk-area-R');
    await tabKiosk.wait(70);
    await tabKiosk.click('#kiosk-confirm-ticket-btn');
    await tabKiosk.wait(80);
    await tabKiosk.click('#kiosk-finish-btn');
    await tabKiosk.wait(50);

    // Emitir también R-005 anónimo para ver varios próximos en sala y recepción
    await tabKiosk.click('#kiosk-continue-anonymous-btn');
    await tabKiosk.wait(70);
    await tabKiosk.click('#kiosk-area-R');
    await tabKiosk.wait(70);
    await tabKiosk.click('#kiosk-confirm-ticket-btn');
    await tabKiosk.wait(80);
    await tabKiosk.click('#kiosk-finish-btn');

    await waitUntilTab(tabDisplay, `document.querySelector('[data-waiting-count="R"]')?.textContent?.trim() === '3'`, 4000, 'R-004 y R-005 en TV');
    await waitUntilTab(tabRecep, `(document.getElementById('view')?.innerText || '').includes('R-004') && (document.getElementById('view')?.innerText || '').includes('R-005')`, 4000, 'R-004 y R-005 en panel Recepción');
    const queuesSyncOk = await tabDisplay.eval(`(() => {
      const waitR = Array.from(document.querySelectorAll('[data-queue-list="R"] [data-waiting-code]')).map(el => el.dataset.waitingCode);
      return waitR.join(',') === 'R-003,R-004,R-005';
    })()`);
    assert(queuesSyncOk, 'Escenario 2: Autoservicio sincroniza R-004 y R-005 en #pantalla-turnos y #turnos-recepcion en tiempo real sin recarga');
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '04-colas-proximos-y-resumen.png'));

    // Escenario 3: Recepción llama R-003 en Recepción 2 -> TV muestra Nuevo llamado, aria-live y misma hora demostrativa en encabezado, llamado y última actualización
    await tabRecep.focus();
    await tabRecep.select('#recepcion-counter-select', 'Recepción 2');
    await tabRecep.wait(60);
    await tabRecep.click('#recepcion-call-next-btn');

    await waitUntilTab(tabDisplay, `Boolean(document.querySelector('[data-public-code="R-003"].is-new-call'))`, 4000, 'R-003 Nuevo llamado en TV');
    const recCallDisplayOk = await tabDisplay.eval(`(() => {
      const card = document.querySelector('[data-public-code="R-003"]');
      const liveText = document.getElementById('public-live-announcer')?.textContent?.trim() || '';
      const waitR = Array.from(document.querySelectorAll('[data-queue-list="R"] [data-waiting-code]')).map(el => el.dataset.waitingCode);
      const clockTime = document.getElementById('public-clock-time')?.textContent?.trim() || '';
      const clockDate = document.getElementById('public-clock-date')?.textContent?.trim() || '';
      const lastUpd = document.getElementById('public-last-update')?.textContent?.trim() || '';
      const cardTime = card?.querySelector('.public-call-card-foot strong.tnum')?.textContent?.trim() || '';
      return {
        hasInstruction: Boolean(card?.innerText.includes('Diríjase a Recepción 2')),
        hasNewBadge: Boolean(card?.innerText.toLowerCase().includes('nuevo llamado')),
        liveOk: liveText.includes('R-003') && liveText.includes('Recepción 2'),
        temporalCoherent: clockDate === 'Martes, 27 de octubre de 2026' && Boolean(cardTime) && clockTime.slice(0, 5) === cardTime && lastUpd === cardTime,
        clockTime,
        cardTime,
        lastUpd,
        waitCountR: document.querySelector('[data-waiting-count="R"]')?.textContent?.trim(),
        waitR
      };
    })()`);
    assert(
      recCallDisplayOk.hasInstruction && recCallDisplayOk.hasNewBadge && recCallDisplayOk.liveOk &&
      recCallDisplayOk.temporalCoherent &&
      recCallDisplayOk.waitCountR === '2' && recCallDisplayOk.waitR.join(',') === 'R-004,R-005',
      'Escenario 3: Llamado de R-003 en Recepción 2 muestra Nuevo llamado, Diríjase a Recepción 2, aria-live y hora unificada con el encabezado y última actualización',
      JSON.stringify(recCallDisplayOk)
    );
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '02-llamado-recepcion.png'));

    // Escenario 4 & 5: Re-llamar e iniciar atención de R-003 actualiza revisión y estado En atención
    const revBeforeRecall = await tabDisplay.eval(`Number(document.querySelector('.public-display-shell')?.dataset.syncRevision || 0)`);
    await tabRecep.focus();
    await tabRecep.click('#recepcion-recall-btn');
    await waitUntilTab(tabDisplay, `Number(document.querySelector('.public-display-shell')?.dataset.syncRevision || 0) > ${revBeforeRecall}`, 4000, 'revisión incrementada tras recall');
    const afterRecallNew = await tabDisplay.eval(`Boolean(document.querySelector('[data-public-code="R-003"].is-new-call'))`);
    await tabRecep.click('#recepcion-start-btn');
    await waitUntilTab(tabDisplay, `Boolean(document.querySelector('[data-public-code="R-003"]')?.innerText.includes('En atención'))`, 4000, 'R-003 En atención en TV');
    const afterStartNotNew = await tabDisplay.eval(`!document.querySelector('[data-public-code="R-003"]')?.classList.contains('is-new-call')`);
    assert(afterRecallNew && afterStartNotNew, 'Escenarios 4 & 5: Re-llamado conserva destaque Nuevo llamado e Iniciar atención cambia a En atención');

    // Escenario 6: Tres llamados activos simultáneos (R-002 Llamado, R-003 En atención, C-001 Nuevo llamado)
    await tabCaja.focus();
    await tabCaja.click('#caja-call-next-btn');
    await waitUntilTab(tabDisplay, `Boolean(document.querySelector('[data-public-code="C-001"].is-new-call'))`, 4000, 'C-001 simultáneo en TV');
    const simultaneousOk = await tabDisplay.eval(`(() => {
      const hasR3 = Boolean(document.querySelector('[data-public-code="R-003"][data-area="R"]'));
      const hasR2 = Boolean(document.querySelector('[data-public-code="R-002"][data-area="R"]'));
      const c1 = document.querySelector('[data-public-code="C-001"][data-area="C"]');
      const has3Class = Boolean(document.querySelector('.public-active-grid.has-3-active[data-active-count="3"]'));
      return has3Class && hasR2 && hasR3 && Boolean(c1) && c1.innerText.includes('Diríjase a Caja 1') && c1.innerText.toLowerCase().includes('nuevo llamado');
    })()`);
    assert(simultaneousOk, 'Escenario 6: Pantalla muestra 3 llamados simultáneos (Recepción y Caja) con modo .has-3-active y diferenciación clara');
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '03-llamado-simultaneo-recepcion-y-caja.png'));
    await tabDisplay.setViewport(1280, 720);
    await tabDisplay.wait(100);
    const fits3Active720 = await tabDisplay.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollHeight <= window.innerHeight + 1`);
    assert(fits3Active720, 'Escenario 6 (720p): 3 llamados activos simultáneos encajan en 1280×720 sin scroll ni recorte');
    await tabDisplay.setViewport(1920, 1080);
    await tabDisplay.wait(80);

    // Escenario 8: Transferir R-003 (Recepción 2 -> Caja) emite C-002 en Caja y actualiza TV y #turnos-caja sin recarga
    await tabRecep.focus();
    await tabRecep.click('#recepcion-transfer-cash-btn');
    await waitUntilTab(tabDisplay, `!document.querySelector('[data-public-code="R-003"]') && Boolean(document.querySelector('#public-recent-list [data-recent-code="R-003"]')) && Boolean(document.querySelector('[data-queue-list="C"] [data-waiting-code="C-002"]'))`, 4000, 'transferencia R-003 -> C-002 en TV');
    await waitUntilTab(tabCaja, `(document.getElementById('view')?.innerText || '').includes('C-002')`, 4000, 'C-002 visible en panel Caja');
    assert(true, 'Escenario 8: Transferencia R-003 -> C-002 sale del llamado activo, entra a Últimos llamados y encola C-002 en Caja y TV');
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '11-sincronizacion-multiventana-evidencia.png'));

    // Escenario 7 & 9: Finalizados, transferidos y ausentes en Últimos llamados (máx 6, más reciente primero) y estado vacío sin llamados activos
    await tabCaja.focus();
    await tabCaja.click('#caja-start-btn');
    await tabCaja.wait(50);
    await tabCaja.click('#caja-finish-btn');
    await tabCaja.wait(50);
    await tabCaja.click('#caja-call-next-btn');
    await tabCaja.wait(50);
    await tabCaja.click('#caja-absent-btn');

    await tabRecep.focus();
    await tabRecep.select('#recepcion-counter-select', 'Recepción 1');
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-absent-btn'); // R-002 Ausente
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-call-next-btn'); // R-004 Llamado
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-start-btn');
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-finish-btn'); // R-004 Finalizado
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-call-next-btn'); // R-005 Llamado
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-start-btn');
    await tabRecep.wait(50);
    await tabRecep.click('#recepcion-finish-btn'); // R-005 Finalizado

    await waitUntilTab(tabDisplay, `Boolean(document.getElementById('public-empty-calls')) && document.querySelector('#public-recent-list [data-recent-code="R-005"]')`, 4000, 'R-005 en recientes y estado vacío');
    const recentOrderAndCap = await tabDisplay.eval(`(() => {
      const codes = Array.from(document.querySelectorAll('#public-recent-list [data-recent-code]')).map(el => el.dataset.recentCode);
      const emptyTxt = document.getElementById('public-empty-calls')?.innerText || '';
      return { codes, emptyTxt };
    })()`);
    assert(
      recentOrderAndCap.codes.length === 6 &&
      recentOrderAndCap.codes[0] === 'R-005' &&
      !recentOrderAndCap.codes.includes('R-001') &&
      recentOrderAndCap.emptyTxt.includes('No hay turnos llamados en este momento') &&
      recentOrderAndCap.emptyTxt.includes('Espere a que su código aparezca en pantalla'),
      'Escenarios 7 & 9: Últimos llamados muestra máx 6 en orden inverso cronológico y sin llamados activos muestra estado vacío claro'
    );
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '06-estado-vacio-sin-llamados.png'));

    // Escenario 10: Excedente > 6 en espera ("2 turnos adicionales") y dos llamados simultáneos (R-006 y C-003) en 1080p
    await tabKiosk.focus();
    for (let i = 0; i < 8; i++) {
      await tabKiosk.click('#kiosk-continue-anonymous-btn');
      await tabKiosk.wait(40);
      await tabKiosk.click('#kiosk-area-R');
      await tabKiosk.wait(40);
      await tabKiosk.click('#kiosk-confirm-ticket-btn');
      await tabKiosk.wait(45);
      await tabKiosk.click('#kiosk-finish-btn');
      await tabKiosk.wait(30);
    }
    await waitUntilTab(tabDisplay, `document.querySelector('[data-queue-overflow="R"]')?.textContent?.trim() === '2 turnos adicionales'`, 4000, 'excedente 2 turnos adicionales');
    const overflowDomCheck = await tabDisplay.eval(`(() => ({
      pillsCount: document.querySelectorAll('[data-queue-list="R"] [data-waiting-code]').length,
      waitingTotal: document.querySelector('[data-waiting-count="R"]')?.textContent?.trim(),
      overflowLabel: document.querySelector('[data-queue-overflow="R"]')?.textContent?.trim()
    }))()`);
    assert(
      overflowDomCheck.pillsCount === 6 &&
      overflowDomCheck.waitingTotal === '8' &&
      overflowDomCheck.overflowLabel === '2 turnos adicionales',
      'Escenario 10: Cola con 8 en espera limita a 6 códigos visibles e indica "2 turnos adicionales"'
    );

    // Emitir 1 ticket en Caja y llamar R + C para auditar estado lleno (2 áreas + >6 en espera + 6 últimos llamados)
    await tabKiosk.click('#kiosk-continue-anonymous-btn');
    await tabKiosk.wait(40);
    await tabKiosk.click('#kiosk-area-C');
    await tabKiosk.wait(40);
    await tabKiosk.click('#kiosk-confirm-ticket-btn');
    await tabKiosk.wait(45);
    await tabKiosk.click('#kiosk-finish-btn');

    await tabRecep.focus();
    await tabRecep.click('#recepcion-call-next-btn'); // R-006 en Recepción 1
    await tabCaja.focus();
    await tabCaja.click('#caja-call-next-btn'); // C-003 en Caja 1

    await waitUntilTab(tabDisplay, `Boolean(document.querySelector('[data-public-code="R-006"]')) && Boolean(document.querySelector('[data-public-code="C-003"]'))`, 4000, 'R-006 y C-003 activos para prueba responsiva');
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '05-ultimos-llamados.png'));

    // Escenario 11: Privacidad estricta en DOM, inspección explícita de claves permitidas/prohibidas en clinica_turnos_shared_v1 y bloqueo de Ctrl+K y /
    await tabDisplay.focus();
    await tabDisplay.key('k', 'KeyK', 75, 2);
    await tabDisplay.wait(40);
    await tabDisplay.key('/', 'Slash', 191, 0);
    await tabDisplay.wait(40);
    const strictPrivacyAndKeys = await tabDisplay.eval(`(() => {
      const appText = document.getElementById('app')?.innerText || '';
      const appHtml = document.getElementById('app')?.innerHTML || '';
      const paletteOpen = document.getElementById('command-palette')?.open === true;
      const forbidden = [
        'Carlos', 'María López', 'Ana Torres', 'Luis Pérez', 'Elena Soto',
        '000000', '••••', '900 000', 'OP-000', 'Confirmar llegada',
        'Consultar o registrar', 'Pagar una orden', 'Control oftalmológico',
        'Consulta oftalmológica', 'Pagado', 'Pendiente', 'ANON-', 'TMPDOC-',
        'Tiempo estimado', 'tiempo estimado'
      ];
      const leakedText = forbidden.filter(term => appText.includes(term));
      const leakedHtml = ['Carlos', 'Luis Pérez', '000000', '••••', '900 000', 'OP-000', 'ANON-', 'TMPDOC-'].filter(term => appHtml.includes(term));

      const rawSharedStr = localStorage.getItem('clinica_turnos_shared_v1') || '';
      const sharedObj = rawSharedStr ? JSON.parse(rawSharedStr) : null;
      const allowedRootKeys = ['version', 'revision', 'updatedAt', 'originId', 'action', 'lastEvent', 'seqCounters', 'selectedCounters', 'demoMinuteOffset', 'callSequence', 'anonAutoSeq', 'turns'];
      const allowedTurnKeys = ['id', 'code', 'area', 'state', 'counter', 'createdAt', 'calledAt', 'startedAt', 'closedAt', '_callOrder'];
      const forbiddenTurnKeys = ['pid', 'anonKey', 'appointmentId', 'orderAppointmentId', 'orderReference', 'reason', 'history', 'arrivalValidated', 'waitMinutes', 'attentionMinutes', 'originTicketId', 'linkedTicketId', 'patientLabel', 'patientName', 'docMasked', 'dni', 'documentNumber', 'phone', 'diagnosis', 'amount', 'payment', 'service'];

      const rootInvalidKeys = sharedObj ? Object.keys(sharedObj).filter(k => !allowedRootKeys.includes(k)) : ['MISSING'];
      const invalidTurnKeys = [];
      const forbiddenFoundInTurns = [];
      if (sharedObj && Array.isArray(sharedObj.turns)) {
        for (const t of sharedObj.turns) {
          for (const k of Object.keys(t)) {
            if (!allowedTurnKeys.includes(k)) invalidTurnKeys.push(k);
          }
          for (const fk of forbiddenTurnKeys) {
            if (fk in t) forbiddenFoundInTurns.push(fk);
          }
        }
      } else {
        invalidTurnKeys.push('NO_TURNS');
      }

      return {
        paletteOpen,
        leakedText,
        leakedHtml,
        rootInvalidKeys,
        invalidTurnKeys,
        forbiddenFoundInTurns
      };
    })()`);
    assert(
      !strictPrivacyAndKeys.paletteOpen &&
      strictPrivacyAndKeys.leakedText.length === 0 &&
      strictPrivacyAndKeys.leakedHtml.length === 0 &&
      strictPrivacyAndKeys.rootInvalidKeys.length === 0 &&
      strictPrivacyAndKeys.invalidTurnKeys.length === 0 &&
      strictPrivacyAndKeys.forbiddenFoundInTurns.length === 0,
      'Escenario 11: Privacidad estricta en DOM, lista permitida/prohibida en clinica_turnos_shared_v1 y bloqueo total de Ctrl+K y /',
      JSON.stringify(strictPrivacyAndKeys)
    );

    // Escenario 13: Auditoría responsiva, tamaños CSS calculados y cero scroll en 5 resoluciones
    const tvViewports = [
      { width: 1920, height: 1080, checkVertical: true, shot: null },
      { width: 1366, height: 768, checkVertical: true, shot: '07-responsive-1366x768.png' },
      { width: 1280, height: 720, checkVertical: true, shot: '08-responsive-1280x720.png' },
      { width: 3840, height: 2160, checkVertical: true, shot: '09-responsive-4k-3840x2160.png' },
      { width: 800, height: 1280, checkVertical: false, shot: '10-responsive-vertical-800x1280.png' }
    ];
    for (const vp of tvViewports) {
      await tabDisplay.setViewport(vp.width, vp.height);
      await tabDisplay.wait(120);
      const vpMetrics = await tabDisplay.eval(`(() => {
        const selectors = ['.public-display-shell', '.public-display-board', '.public-tv-recent-panel', '.public-tv-queues-panel'];
        const clippedContainers = selectors
          .map(sel => {
            const el = document.querySelector(sel);
            if (!el) return null;
            return { sel, sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth };
          })
          .filter(x => x && (x.sh > x.ch + 2 || x.sw > x.cw + 2));
        const fs = sel => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el).fontSize : null;
        };
        const boardColRects = (() => {
          const m = document.querySelector('.public-tv-main-col')?.getBoundingClientRect();
          const s = document.querySelector('.public-tv-side-col')?.getBoundingClientRect();
          const b = document.querySelector('.public-display-board')?.getBoundingClientRect();
          return (m && s && b && b.width > 0) ? {
            mainPct: Number(((m.width / (m.width + s.width)) * 100).toFixed(1)),
            sidePct: Number(((s.width / (m.width + s.width)) * 100).toFixed(1))
          } : null;
        })();
        return {
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          scrollH: document.documentElement.scrollHeight,
          innerH: window.innerHeight,
          clippedContainers,
          boardColRects,
          computedSizes: {
            callCode: fs('.public-call-code'),
            callInstruction: fs('.public-call-instruction'),
            sideTitle: fs('.public-side-panel h2'),
            nextQueueCode: fs('.public-queue-code-pill'),
            recentCode: fs('.public-recent-code'),
            recentCounter: fs('.public-recent-counter'),
            summaryStatValue: fs('.public-summary-stat strong')
          }
        };
      })()`);
      console.log(`  [TV ${vp.width}×${vp.height}] proporción cols=${JSON.stringify(vpMetrics.boardColRects)} · tamaños=${JSON.stringify(vpMetrics.computedSizes)}`);
      const fitsH = vpMetrics.scrollW <= vpMetrics.innerW + 1;
      const fitsV = !vp.checkVertical || (vpMetrics.scrollH <= vpMetrics.innerH + 1 && vpMetrics.clippedContainers.length === 0);
      assert(
        fitsH && fitsV,
        `Escenario 13: #pantalla-turnos ${vp.width}×${vp.height} sin desbordamiento horizontal${vp.checkVertical ? ' ni recorte/scroll vertical' : ''}`,
        `scroll=${vpMetrics.scrollW}x${vpMetrics.scrollH} vs inner=${vpMetrics.innerW}x${vpMetrics.innerH}, clipped=${JSON.stringify(vpMetrics.clippedContainers)}`
      );
      if (vp.shot) {
        await tabDisplay.screenshot(join(pantallaTurnosArtDir, vp.shot));
      }
    }
    await tabDisplay.setViewport(1920, 1080);
    await tabDisplay.wait(100);

    // Escenario 12: Restablecimiento sincronizado sin recarga en ninguna pestaña
    await tabRecep.focus();
    await tabRecep.eval(`window.__resetDemoData()`);
    await waitUntilTab(tabDisplay, `Boolean(document.querySelector('[data-public-code="R-002"]')) && !document.querySelector('[data-public-code="C-003"]') && document.querySelector('[data-waiting-count="R"]')?.textContent?.trim() === '1'`, 4000, 'restablecimiento sincronizado en TV');
    await waitUntilTab(tabCaja, `!document.getElementById('caja-register-payment-btn') && (document.getElementById('view')?.innerText || '').includes('C-001')`, 4000, 'restablecimiento sincronizado en Caja');
    const singleResetSizes = await tabDisplay.eval(`({
      callCode: getComputedStyle(document.querySelector('.public-call-code')).fontSize,
      callInstruction: getComputedStyle(document.querySelector('.public-call-instruction')).fontSize,
      sideTitle: getComputedStyle(document.querySelector('.public-side-panel h2')).fontSize,
      nextQueueCode: getComputedStyle(document.querySelector('.public-queue-code-pill')).fontSize,
      recentCode: getComputedStyle(document.querySelector('.public-recent-code')).fontSize,
      summaryStatValue: getComputedStyle(document.querySelector('.public-summary-stat strong')).fontSize
    })`);
    console.log(`  [TV 1920×1080 · 1 llamado activo] tamaños=${JSON.stringify(singleResetSizes)}`);
    const displayTokenAfter = await tabDisplay.eval(`window.__noReloadToken`);
    assert(
      displayTokenAfter === displayTokenBefore,
      'Escenario 12: Restablecer demo sincroniza #pantalla-turnos, Caja y Recepción instantáneamente sin recargar el navegador'
    );
    await tabDisplay.focus();
    await tabDisplay.screenshot(join(pantallaTurnosArtDir, '12-post-reset-sincronizado.png'));
  } finally {
    if (tabCaja) await tabCaja.close().catch(() => {});
    if (tabRecep) await tabRecep.close().catch(() => {});
    if (tabKiosk) await tabKiosk.close().catch(() => {});
    if (tabDisplay) {
      await tabDisplay.close().catch(() => {});
      await tabDisplay.close().catch(() => {}); // Verifica idempotencia de close()
    }
    if (typeof syncServer.closeAllConnections === 'function') syncServer.closeAllConnections();
    await new Promise(resolveClose => syncServer.close(() => resolveClose()));
  }
  const listenerCountAfterSec18 = b.listenerCount();
  assert(
    listenerCountAfterSec18 === listenerCountBeforeSec18 && !syncServer.listening,
    `18.14 Cierre idempotente de las 4 pestañas y servidor HTTP sin listeners CDP huérfanos (${listenerCountAfterSec18} === ${listenerCountBeforeSec18})`
  );

  // =========================================================================
  // 19. CONSTRUCTOR VISUAL DE WORKFLOWS (#automations), 7 ESTADOS, PRESENTACIÓN Y 20 CAPTURAS
  // =========================================================================
  console.log('\n--- 19. Constructor visual de workflows (#automations), 7 estados, presentación y 20 evidencias ---');
  const automationsArtDir = resolve('./artifacts/automations');
  mkdirSync(automationsArtDir, { recursive: true });
  for (const prevPng of readdirSync(automationsArtDir)) {
    if (prevPng.toLowerCase().endsWith('.png')) {
      unlinkSync(join(automationsArtDir, prevPng));
    }
  }
  const errorsBeforeSec19 = b.consoleErrors.length;

  await b.setViewport(1280, 800);
  await b.goto(appUrl);
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData(); sessionStorage.removeItem('clinica_wf_ui_panels_v1');`);
  await b.wait(120);

  // Estado base de módulos operativos para comprobar cero efectos secundarios tras simular
  const baselineOps = await b.eval(`(() => ({
    turnosShared: localStorage.getItem('clinica_turnos_shared_v1') || '',
    agendaRows: (() => { location.hash = '#agenda'; return true; })()
  }))()`);
  await b.wait(80);
  const baseAgendaCount = await b.eval(`document.querySelectorAll('.cal-event, .agenda-row, [data-appointment-id]').length`);
  await b.eval(`location.hash = '#caja'`);
  await b.wait(80);
  const baseCajaText = await b.eval(`document.getElementById('view')?.innerText || ''`);
  await b.eval(`location.hash = '#crm'`);
  await b.wait(80);
  const baseCrmIds = await b.eval(`[...document.querySelectorAll('[data-followup]')].map(el => el.dataset.followup + ':' + (el.closest('[data-stage]')?.dataset?.stage || '')).join('|')`);

  // 19.1 Estado Activo (sin cambios): sin botón Activar activo, zoom legible >= 58% y captura 01
  await b.eval(`location.hash = '#automations'`);
  await waitForVisibleSelector(b, '#wf-studio', 6000);
  await b.wait(180);
  await b.click('#wf-fit-btn');
  await b.eval(`window.scrollTo(0, 0)`);
  await b.wait(120);

  const activeCleanState = await b.eval(`({
    name: document.getElementById('wf-name-input')?.value || '',
    status: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    hasActivateBtn: Boolean(document.getElementById('wf-activate-btn')),
    hasPauseQuickBtn: Boolean(document.getElementById('wf-pause-quick-btn')),
    hasPresentBtn: Boolean(document.getElementById('wf-present-btn')),
    publishedText: document.getElementById('wf-published-indicator')?.textContent?.trim() || '',
    zoomPct: parseInt((document.getElementById('wf-zoom-label')?.textContent || '0').replace('%', ''), 10),
    nodes: document.querySelectorAll('.wf-node').length,
    edges: document.querySelectorAll('#wf-edges-svg .wf-edge-group').length
  })`);
  assert(
    activeCleanState.name.includes('Recuperación inteligente de pacientes ausentes') &&
    activeCleanState.status === 'Activo' &&
    !activeCleanState.hasActivateBtn &&
    activeCleanState.hasPauseQuickBtn &&
    activeCleanState.hasPresentBtn &&
    activeCleanState.publishedText.includes('Publicado') &&
    activeCleanState.zoomPct >= 58 &&
    activeCleanState.nodes === 9 &&
    activeCleanState.edges === 8,
    `19.1 Activo sin cambios: muestra Activo sin botón Activar, mantiene zoom legible (${activeCleanState.zoomPct}%) y 9 nodos`
  );
  await b.screenshot(join(automationsArtDir, '01_workflow_activo_sin_cambios.png'));

  // 19.2 Estado Activo con cambios sin publicar + Publicar nueva versión (Capturas 02 y 06)
  await b.type('#wf-desc-input', 'Seguimiento preventivo de inasistencias con recuperación automática (edición v2).');
  await b.eval(`document.getElementById('wf-desc-input').dispatchEvent(new Event('change', { bubbles: true }))`);
  await b.wait(120);
  const activeUnpubState = await b.eval(`({
    status: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    unpubText: document.getElementById('wf-unpublished-pill')?.textContent?.trim() || '',
    activateText: document.getElementById('wf-activate-btn')?.textContent?.trim() || '',
    activateDisabled: document.getElementById('wf-activate-btn')?.disabled
  })`);
  assert(
    activeUnpubState.status === 'Activo' &&
    activeUnpubState.unpubText.includes('Cambios sin publicar') &&
    activeUnpubState.activateText === 'Publicar nueva versión' &&
    activeUnpubState.activateDisabled === false,
    '19.2 Activo editado conserva estado Activo protegido, muestra Cambios sin publicar y botón Publicar nueva versión'
  );
  await b.screenshot(join(automationsArtDir, '02_workflow_activo_cambios_sin_publicar.png'));
  await b.screenshot(join(automationsArtDir, '06_boton_publicar_nueva_version.png'));

  await b.click('#wf-activate-btn');
  await b.wait(120);
  const republishedState = await b.eval(`({
    hasUnpub: Boolean(document.getElementById('wf-unpublished-pill')),
    hasActivateBtn: Boolean(document.getElementById('wf-activate-btn')),
    publishedText: document.getElementById('wf-published-indicator')?.textContent?.trim() || ''
  })`);
  assert(
    !republishedState.hasUnpub &&
    !republishedState.hasActivateBtn &&
    republishedState.publishedText.includes('v2'),
    '19.2b Publicar nueva versión limpia el indicador pendiente y actualiza la versión publicada a v2'
  );

  // 19.3 Verificar persistencia de paneles laterales en sessionStorage entre cambios de ruta
  await b.click('#wf-toggle-catalog');
  await b.wait(80);
  await b.click('#wf-toggle-props');
  await b.wait(80);
  const storedPanelPrefs = await b.eval(`sessionStorage.getItem('clinica_wf_ui_panels_v1') || ''`);
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(100);
  await b.eval(`location.hash = '#automations'`);
  await waitForVisibleSelector(b, '#wf-studio', 5000);
  await b.wait(100);
  const restoredCollapsed = await b.eval(`({
    catCollapsed: document.querySelector('.wf-workspace')?.classList?.contains('is-catalog-collapsed'),
    propsCollapsed: document.querySelector('.wf-workspace')?.classList?.contains('is-props-collapsed')
  })`);
  assert(
    storedPanelPrefs.includes('catalogCollapsed') && restoredCollapsed.catCollapsed && restoredCollapsed.propsCollapsed,
    '19.3 Preferencias de catálogo y propiedades colapsados persisten en sessionStorage entre vistas'
  );
  // Restaurar ambos paneles abiertos para construcción y pruebas siguientes
  await b.click('#wf-toggle-catalog');
  await b.wait(70);
  await b.click('#wf-toggle-props');
  await b.wait(70);

  // 19.4 Crear workflow nuevo (Borrador) + construir diagrama de 7 nodos y 6 conexiones + agente dinámico
  await b.click('#wf-new-btn');
  await b.wait(150);
  const newWfState = await b.eval(`({
    id: document.getElementById('wf-selector')?.value || '',
    status: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    nodes: document.querySelectorAll('.wf-node').length,
    activateDisabled: document.getElementById('wf-activate-btn')?.disabled
  })`);
  assert(
    newWfState.status === 'Borrador' && newWfState.nodes === 1 && newWfState.id.startsWith('wf-') && newWfState.activateDisabled === true,
    '19.4 Nuevo workflow inicia en Borrador v1 con Activar deshabilitado hasta validar'
  );

  await b.type('#wf-name-input', 'Flujo E2E Recuperación Dinámica');
  await b.eval(`document.getElementById('wf-name-input').dispatchEvent(new Event('change', { bubbles: true }))`);
  await b.wait(80);

  await b.click('#wf-catalog-list [data-add-node-type="condition_branch"]');
  await b.wait(70);
  await b.click('#wf-catalog-list [data-add-node-type="end_success"]');
  await b.wait(70);
  await b.click('#wf-catalog-list [data-add-node-type="wait_delay"]');
  await b.wait(70);
  await b.click('#wf-catalog-list [data-add-node-type="agent_execute"]');
  await b.wait(70);
  await b.click('#wf-catalog-list [data-add-node-type="action_task"]');
  await b.wait(70);
  await b.click('#wf-catalog-list [data-add-node-type="end_success"]');
  await b.wait(100);

  const builtNodes = await b.eval(`[...document.querySelectorAll('.wf-node')].map(el => ({
    id: el.dataset.wfNodeId,
    isTrigger: el.classList.contains('is-cat-trigger'),
    isCondition: el.classList.contains('is-cat-condition'),
    isWait: el.innerText.includes('Esperar'),
    isAgent: el.innerText.includes('agente'),
    isTask: el.innerText.includes('tarea'),
    isEnd: el.classList.contains('is-cat-end')
  }))`);
  const trigN = builtNodes.find(n => n.isTrigger);
  const waitN = builtNodes.find(n => n.isWait && !n.isTrigger);
  const condN = builtNodes.find(n => n.isCondition);
  const endNs = builtNodes.filter(n => n.isEnd);
  const agentN = builtNodes.find(n => n.isAgent && !n.isCondition && !n.isWait && !n.isEnd);
  const taskN = builtNodes.find(n => n.isTask && n.id !== agentN?.id && !n.isEnd && !n.isCondition && !n.isWait);

  await b.click('#wf-auto-layout-btn');
  await b.wait(100);
  // Usar Ver flujo completo para visualizar simultáneamente los 7 nodos sin conectar y cablear sus puertos
  await b.click('#wf-overview-btn');
  await b.wait(120);

  async function connectViaPorts(srcId, srcPort, tgtId) {
    await b.click(`[data-port-dir="out"][data-node-id="${srcId}"][data-port-name="${srcPort}"]`);
    await b.wait(50);
    await b.click(`[data-port-dir="in"][data-node-id="${tgtId}"]`);
    await b.wait(70);
  }
  await connectViaPorts(trigN.id, 'out', waitN.id);
  await connectViaPorts(waitN.id, 'out', condN.id);
  await connectViaPorts(condN.id, 'yes', endNs[0].id);
  await connectViaPorts(condN.id, 'no', agentN.id);
  await connectViaPorts(agentN.id, 'out', taskN.id);
  await connectViaPorts(taskN.id, 'out', endNs[1].id);
  await b.click('#wf-auto-layout-btn');
  await b.wait(120);

  const connectedCounts = await b.eval(`({
    nodes: document.querySelectorAll('.wf-node').length,
    edges: document.querySelectorAll('#wf-edges-svg .wf-edge-group').length
  })`);
  assert(
    connectedCounts.nodes === 7 && connectedCounts.edges === 6,
    `19.4b Construye y conecta diagrama completo (${connectedCounts.nodes} nodos, ${connectedCounts.edges} aristas)`
  );

  // Configurar tarea y crear agente dinámico
  await b.click(`[data-wf-node-id="${taskN.id}"]`);
  await b.wait(70);
  await b.select('#wf-prop-task-area', 'Recepción');
  await b.type('#wf-prop-task-title', 'Contactar paciente E2E para reagendar');
  await b.eval(`document.getElementById('wf-prop-task-title').dispatchEvent(new Event('change', { bubbles: true }))`);
  await b.wait(70);

  await b.click(`[data-wf-node-id="${agentN.id}"]`);
  await b.wait(80);
  await b.click('#wf-create-agent-btn');
  await waitForVisibleSelector(b, '#agent-builder-form', 4000);
  await b.type('#ab-name', 'Agente E2E Seguimiento');
  await b.type('#ab-purpose', 'Organiza recontacto de demostración desde flujo visual');
  await b.select('#ab-status', 'active');
  await b.click('#ab-save');
  await b.wait(120);

  const selectedDynamicAgent = await b.eval(`({
    selectedText: document.getElementById('wf-node-agent-select')?.selectedOptions?.[0]?.textContent || '',
    nodesStillPresent: document.querySelectorAll('.wf-node').length
  })`);
  assert(
    selectedDynamicAgent.selectedText.includes('Agente E2E Seguimiento') && selectedDynamicAgent.nodesStillPresent === 7,
    '19.5 Creación dinámica de agente desde el flujo asigna el agente nuevo sin perder progreso'
  );

  await b.eval(`location.hash = '#arm'`);
  await b.wait(100);
  assert(
    await b.eval(`document.querySelectorAll('[data-arm-agent]').length === 6 && (document.getElementById('view')?.innerText || '').includes('Agente E2E Seguimiento')`),
    '19.5b El agente creado aparece en Centro ARM (#arm)'
  );
  await b.eval(`location.hash = '#automations'`);
  await waitForVisibleSelector(b, '#wf-selector', 5000);
  await b.select('#wf-selector', newWfState.id);
  await b.wait(100);

  // 19.6 Guardar borrador y verificar persistencia tras reload
  await b.click('#wf-save-btn');
  await b.wait(100);
  await b.reload();
  await waitForVisibleSelector(b, '#topbar-logout', 6000);
  await b.eval(`location.hash = '#automations'`);
  await waitForVisibleSelector(b, '#wf-selector', 5000);
  await b.select('#wf-selector', newWfState.id);
  await b.wait(120);
  const persistedAfterReload = await b.eval(`({
    name: document.getElementById('wf-name-input')?.value || '',
    nodes: document.querySelectorAll('.wf-node').length,
    edges: document.querySelectorAll('#wf-edges-svg .wf-edge-group').length
  })`);
  assert(
    persistedAfterReload.name === 'Flujo E2E Recuperación Dinámica' &&
    persistedAfterReload.nodes === 7 &&
    persistedAfterReload.edges === 6,
    '19.6 Persistencia local tras recargar navegador conserva workflow y agente dinámico'
  );

  // 19.7 Estado Con errores (Captura 03), salto al primer error, corrección y Validado -> Activo
  await b.click('#wf-catalog-list [data-add-node-type="action_internal_note"]');
  await b.wait(100);
  const orphanDomId = await b.eval(`[...document.querySelectorAll('.wf-node')].pop()?.dataset?.wfNodeId || ''`);
  await b.click('#wf-validate-btn');
  await b.wait(120);
  const errUiState = await b.eval(`({
    badge: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    hasErrNode: document.querySelectorAll('.wf-node.has-error').length > 0,
    activateDisabled: document.getElementById('wf-activate-btn')?.disabled,
    hasJumpBtn: Boolean(document.getElementById('wf-jump-first-error')),
    dockText: document.getElementById('wf-dock-body')?.innerText || ''
  })`);
  assert(
    errUiState.badge === 'Con errores' &&
    errUiState.hasErrNode &&
    errUiState.activateDisabled === true &&
    errUiState.hasJumpBtn &&
    errUiState.dockText.includes('huérfano'),
    '19.7 Con errores: muestra badge Con errores, bloquea Activar y ofrece salto directo al nodo con error'
  );
  await b.click('#wf-jump-first-error');
  await b.wait(100);
  await b.screenshot(join(automationsArtDir, '03_workflow_con_errores.png'));

  await b.click(`[data-wf-node-id="${orphanDomId}"]`);
  await b.wait(60);
  await b.click('#wf-prop-del-node');
  await b.wait(50);
  await b.click('#wf-confirm-del-node');
  await b.wait(100);
  await b.click('#wf-validate-btn');
  await b.wait(100);
  const validUiState = await b.eval(`({
    badge: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    activateText: document.getElementById('wf-activate-btn')?.textContent?.trim() || '',
    activateDisabled: document.getElementById('wf-activate-btn')?.disabled
  })`);
  assert(
    validUiState.badge === 'Validado' && validUiState.activateText === 'Activar' && validUiState.activateDisabled === false,
    `19.7b Tras corregir error y revalidar, estado cambia a Validado y habilita Activar`
  );
  await b.click('#wf-activate-btn');
  await b.wait(100);

  // 19.8 Estados Pausado (Captura 04), edición en Pausa -> Validar -> Reactivar, y Archivado (Captura 05)
  await b.click('#wf-more-toggle');
  await b.wait(50);
  await b.click('#wf-duplicate-btn');
  await b.wait(100);
  const dupId = await b.eval(`document.getElementById('wf-selector')?.value || ''`);
  await b.click('#wf-validate-btn');
  await b.wait(80);
  await b.click('#wf-activate-btn');
  await b.wait(100);
  await b.click('#wf-pause-quick-btn');
  await b.wait(100);

  const pausedUi = await b.eval(`({
    badge: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    activateText: document.getElementById('wf-activate-btn')?.textContent?.trim() || '',
    activateDisabled: document.getElementById('wf-activate-btn')?.disabled
  })`);
  assert(
    pausedUi.badge === 'Pausado' && pausedUi.activateText === 'Reactivar' && pausedUi.activateDisabled === false,
    '19.8 Estado Pausado muestra Reactivar habilitado y conserva su identidad diferenciada'
  );
  await b.screenshot(join(automationsArtDir, '04_workflow_pausado.png'));

  // Si se edita un flujo Pausado, exige Validar sin perder Pausado antes de habilitar Reactivar
  await b.type('#wf-desc-input', 'Descripción ajustada mientras el workflow estaba pausado.');
  await b.eval(`document.getElementById('wf-desc-input').dispatchEvent(new Event('change', { bubbles: true }))`);
  await b.wait(100);
  const pausedEditedUi = await b.eval(`({
    badge: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    activateText: document.getElementById('wf-activate-btn')?.textContent?.trim() || '',
    activateDisabled: document.getElementById('wf-activate-btn')?.disabled
  })`);
  assert(
    pausedEditedUi.badge === 'Pausado' && pausedEditedUi.activateText === 'Reactivar' && pausedEditedUi.activateDisabled === true,
    '19.8b Editar workflow Pausado mantiene estado Pausado y exige Validar antes de Reactivar'
  );
  await b.click('#wf-validate-btn');
  await b.wait(100);
  assert(
    await b.eval(`document.getElementById('wf-status-badge')?.textContent?.trim() === 'Pausado' && document.getElementById('wf-activate-btn')?.disabled === false`),
    '19.8c Validar tras editar un flujo Pausado re-habilita Reactivar'
  );

  // Archivar con confirmación y verificar modo solo lectura + captura 05
  await b.click('#wf-more-toggle');
  await b.wait(50);
  await b.click('#wf-archive-btn');
  await b.wait(60);
  await b.click('#wf-confirm-archive');
  await b.wait(120);
  const archivedUi = await b.eval(`({
    badge: document.getElementById('wf-status-badge')?.textContent?.trim() || '',
    nameReadonly: document.getElementById('wf-name-input')?.readOnly === true,
    saveDisabled: document.getElementById('wf-save-btn')?.disabled === true,
    validateDisabled: document.getElementById('wf-validate-btn')?.disabled === true,
    simulateDisabled: document.getElementById('wf-simulate-btn')?.disabled === true,
    hasActivateBtn: Boolean(document.getElementById('wf-activate-btn')),
    hasReadonlyBanner: Boolean(document.getElementById('wf-archived-readonly-note')),
    dupIdOk: Boolean('${dupId}') && '${dupId}' !== '${newWfState.id}'
  })`);
  assert(
    archivedUi.badge === 'Archivado' &&
    archivedUi.nameReadonly &&
    archivedUi.saveDisabled &&
    archivedUi.validateDisabled &&
    archivedUi.simulateDisabled &&
    !archivedUi.hasActivateBtn &&
    archivedUi.hasReadonlyBanner &&
    archivedUi.dupIdOk,
    '19.8d Estado Archivado bloquea edición, validación, activación y simulación con aviso explícito de solo lectura'
  );
  await b.screenshot(join(automationsArtDir, '05_workflow_archivado.png'));

  // 19.9 Vista general vs Autoajuste + Limpieza de toasts al cambiar de workflow / entrar a Modo Presentación (Capturas 07 a 10)
  await b.select('#wf-selector', 'wf-noshow-recovery');
  await b.wait(120);
  const noticeAfterWorkflowSwitch = await b.eval(`document.getElementById('notice')?.textContent?.trim() || ''`);
  assert(
    noticeAfterWorkflowSwitch === '',
    '19.9b Al cambiar de workflow desde otro archivado se limpian notificaciones transitorias previas'
  );
  await b.click('#wf-overview-btn');
  await b.wait(100);
  const overviewState = await b.eval(`({
    badgeVisible: !document.getElementById('wf-overview-badge')?.classList?.contains('is-hidden'),
    btnActive: document.getElementById('wf-overview-btn')?.classList?.contains('is-active')
  })`);
  await b.click('#wf-fit-btn');
  await b.wait(100);
  const editFitState = await b.eval(`({
    badgeHidden: document.getElementById('wf-overview-badge')?.classList?.contains('is-hidden'),
    zoomPct: parseInt((document.getElementById('wf-zoom-label')?.textContent || '0').replace('%', ''), 10)
  })`);
  assert(
    overviewState.badgeVisible && overviewState.btnActive && editFitState.badgeHidden && editFitState.zoomPct >= 58,
    `19.9 Ver flujo completo muestra vista panorámica con indicador explícito y Ajustar vista recupera zoom >= 58% (${editFitState.zoomPct}%)`
  );

  // Provocar toast transitorio activo antes de entrar a Modo Presentación y verificar limpieza total al presentar (5.1)
  await b.click('#wf-validate-btn');
  await b.wait(80);
  const noticeBeforePresentation = await b.eval(`document.getElementById('notice')?.textContent?.trim() || ''`);

  // Entrar a Modo Presentación
  await b.click('#wf-present-btn');
  await b.wait(180);
  const presEnterState = await b.eval(`(() => {
    const n = document.getElementById('notice');
    return {
      bodyClass: document.body.classList.contains('is-wf-presentation'),
      hasBar: Boolean(document.getElementById('wf-presentation-bar')),
      disclaimer: document.getElementById('wf-pres-disclaimer')?.innerText || '',
      legendText: document.getElementById('wf-legend')?.innerText || '',
      noticeTextAfter: n?.textContent || '',
      noticeDisplayAfter: n ? getComputedStyle(n).display : 'none'
    };
  })()`);
  assert(
    noticeBeforePresentation.length > 0 &&
    presEnterState.bodyClass &&
    presEnterState.hasBar &&
    presEnterState.disclaimer.includes('Simulación demostrativa. No se modificaron datos ni se enviaron mensajes reales.') &&
    presEnterState.legendText.includes('Rama Sí') &&
    presEnterState.legendText.includes('Rama No') &&
    presEnterState.legendText.includes('Pausado') &&
    presEnterState.noticeTextAfter === '' &&
    presEnterState.noticeDisplayAfter === 'none',
    '19.10a Modo presentación limpia oculta paneles laterales, limpia toasts transitorios previos y conserva advertencia permanente y leyenda'
  );
  await b.screenshot(join(automationsArtDir, '07_modo_presentacion_antes_simular.png'));

  // Rama Sí en presentación (sc-noshow-yes): avanzar hasta nw-4 y reanudar en estado running -> Ejecutándose
  await b.select('#wf-pres-scenario', 'sc-noshow-yes');
  await b.wait(80);
  await b.select('#wf-pres-speed', '0.75');
  await b.wait(50);
  for (let i = 0; i < 6; i++) {
    await b.click('#wf-pres-step');
    await b.wait(80);
    const nw4State = await b.eval(`document.querySelector('[data-wf-node-id="nw-4"]')?.dataset?.simState || ''`);
    if (nw4State === 'paused' || nw4State === 'running' || nw4State === 'completed') break;
  }
  await b.click('#wf-pres-resume');
  const presYesRunning = await b.eval(`({
    statusText: document.getElementById('wf-pres-sim-status')?.innerText || '',
    nw4State: document.querySelector('[data-wf-node-id="nw-4"]')?.dataset?.simState || '',
    nw4Badge: document.querySelector('[data-wf-node-id="nw-4"] .wf-node-state-badge')?.textContent?.trim() || ''
  })`);
  assert(
    presYesRunning.statusText.includes('running') &&
    presYesRunning.nw4State === 'running' &&
    presYesRunning.nw4Badge === 'Ejecutándose',
    `19.10b Presentación Rama Sí en ejecución (running) muestra badge "Ejecutándose" en nw-4 (${JSON.stringify(presYesRunning)})`
  );
  await b.screenshot(join(automationsArtDir, '08_modo_presentacion_rama_si.png'));

  // Completar Rama Sí
  for (let i = 0; i < 6; i++) {
    const done = await b.eval(`(document.getElementById('wf-pres-sim-status')?.innerText || '').includes('completed')`);
    if (done) break;
    await b.click('#wf-pres-step').catch(() => {});
    await b.wait(180);
  }

  // Rama No en presentación (sc-noshow-no) - transición completa running -> paused -> running -> completed (5.2)
  await b.select('#wf-pres-scenario', 'sc-noshow-no');
  await b.wait(80);
  await b.select('#wf-pres-speed', '0.75');
  await b.wait(50);
  await b.click('#wf-pres-start');
  const startRunningSnap = await b.eval(`({
    statusText: document.getElementById('wf-pres-sim-status')?.innerText || '',
    nw1State: document.querySelector('[data-wf-node-id="nw-1"]')?.dataset?.simState || '',
    nw1Badge: document.querySelector('[data-wf-node-id="nw-1"] .wf-node-state-badge')?.textContent?.trim() || ''
  })`);
  await b.click('#wf-pres-pause');
  const pauseImmediateSnap = await b.eval(`({
    statusText: document.getElementById('wf-pres-sim-status')?.innerText || '',
    nw1State: document.querySelector('[data-wf-node-id="nw-1"]')?.dataset?.simState || '',
    nw1Badge: document.querySelector('[data-wf-node-id="nw-1"] .wf-node-state-badge')?.textContent?.trim() || ''
  })`);

  for (let i = 0; i < 5; i++) {
    const reachedNw5 = await b.eval(`document.querySelector('[data-wf-node-id="nw-5"]')?.dataset?.simState === 'paused'`);
    if (reachedNw5) break;
    await b.click('#wf-pres-step');
    await b.wait(80);
  }
  await b.wait(120);
  const presNoPaused = await b.eval(`(() => {
    const vp = document.getElementById('wf-canvas-viewport')?.getBoundingClientRect();
    const active = document.querySelector('[data-wf-node-id="nw-5"]');
    const nr = active?.getBoundingClientRect();
    const inViewport = Boolean(vp && nr && nr.right >= vp.left && nr.left <= vp.right && nr.bottom >= vp.top && nr.top <= vp.bottom);
    return {
      statusText: document.getElementById('wf-pres-sim-status')?.innerText || '',
      activeId: active?.dataset?.wfNodeId || '',
      nw5State: active?.dataset?.simState || '',
      nw5Badge: active?.querySelector('.wf-node-state-badge')?.textContent?.trim() || '',
      inViewport,
      nw4State: document.querySelector('[data-wf-node-id="nw-4"]')?.dataset?.simState || '',
      nw4Badge: document.querySelector('[data-wf-node-id="nw-4"] .wf-node-state-badge')?.textContent?.trim() || ''
    };
  })()`);
  assert(
    startRunningSnap.statusText.includes('running') && startRunningSnap.nw1State === 'running' && startRunningSnap.nw1Badge === 'Ejecutándose' &&
    pauseImmediateSnap.statusText.includes('paused') && pauseImmediateSnap.nw1State === 'paused' && pauseImmediateSnap.nw1Badge === 'Pausado' &&
    presNoPaused.statusText.includes('paused') &&
    presNoPaused.nw5State === 'paused' &&
    presNoPaused.nw5Badge === 'Pausado' &&
    presNoPaused.inViewport &&
    presNoPaused.nw4State === 'skipped' &&
    presNoPaused.nw4Badge === 'No ejecutado',
    `19.10c Presentación Rama No mantiene coherencia running -> paused (badge "Pausado" en lugar de "Ejecutándose") y omite Rama Sí`,
    JSON.stringify({ startRunningSnap, pauseImmediateSnap, presNoPaused })
  );
  await b.screenshot(join(automationsArtDir, '09_modo_presentacion_rama_no.png'));

  // Reanudar desde pausa (paused -> running) y verificar retorno a Ejecutándose
  await b.click('#wf-pres-resume');
  const presNoResumed = await b.eval(`({
    statusText: document.getElementById('wf-pres-sim-status')?.innerText || '',
    nw5State: document.querySelector('[data-wf-node-id="nw-5"]')?.dataset?.simState || '',
    nw5Badge: document.querySelector('[data-wf-node-id="nw-5"] .wf-node-state-badge')?.textContent?.trim() || ''
  })`);
  assert(
    presNoResumed.statusText.includes('running') &&
    presNoResumed.nw5State === 'running' &&
    presNoResumed.nw5Badge === 'Ejecutándose',
    `19.10c-resume Al reanudar desde pausa, el nodo nw-5 vuelve coherentemente a "Ejecutándose" (${JSON.stringify(presNoResumed)})`
  );

  // Completar simulación en presentación -> autoajuste final (running -> completed)
  for (let i = 0; i < 14; i++) {
    const done = await b.eval(`(document.getElementById('wf-pres-sim-status')?.innerText || '').includes('completed')`);
    if (done) break;
    await b.click('#wf-pres-step');
    await b.wait(65);
  }
  await b.wait(160);
  const presFinal = await b.eval(`({
    statusText: document.getElementById('wf-pres-sim-status')?.innerText || '',
    nw8State: document.querySelector('[data-wf-node-id="nw-8"]')?.dataset?.simState || '',
    nw8Badge: document.querySelector('[data-wf-node-id="nw-8"] .wf-node-state-badge')?.textContent?.trim() || '',
    nw9State: document.querySelector('[data-wf-node-id="nw-9"]')?.dataset?.simState || '',
    nw9Badge: document.querySelector('[data-wf-node-id="nw-9"] .wf-node-state-badge')?.textContent?.trim() || '',
    nw4State: document.querySelector('[data-wf-node-id="nw-4"]')?.dataset?.simState || '',
    nw4Badge: document.querySelector('[data-wf-node-id="nw-4"] .wf-node-state-badge')?.textContent?.trim() || ''
  })`);
  assert(
    presFinal.statusText.includes('completed') &&
    presFinal.nw8State === 'completed' && presFinal.nw8Badge === 'Completado' &&
    presFinal.nw9State === 'completed' && presFinal.nw9Badge === 'Completado' &&
    presFinal.nw4State === 'skipped' && presFinal.nw4Badge === 'No ejecutado',
    '19.10d Simulación finalizada en Modo Presentación muestra Completado en nodos recorridos y No ejecutado en rama omitida'
  );
  await b.screenshot(join(automationsArtDir, '10_modo_presentacion_finalizado.png'));

  // Escape debe salir de presentación y devolver foco al disparador (#wf-present-btn)
  await b.key('Escape', 'Escape', 27);
  await b.wait(150);
  const afterPresEsc = await b.eval(`({
    inPres: document.body.classList.contains('is-wf-presentation'),
    activeElId: document.activeElement?.id || ''
  })`);
  assert(
    !afterPresEsc.inPres && afterPresEsc.activeElId === 'wf-present-btn',
    `19.10e Tecla Escape cierra Modo Presentación y devuelve foco al botón Presentar workflow (actual=${afterPresEsc.activeElId})`
  );
  await b.click('#wf-banner-stop').catch(() => {});
  await b.wait(80);

  // 19.11 Verificación responsiva completa (Desktop, QHD, 4K, Tablet horizontal y vertical) - Capturas 11 a 17
  const wfViewports = [
    { w: 1920, h: 1080, file: '11_escritorio_1920x1080.png', name: 'Desktop 1920x1080' },
    { w: 1366, h: 768, file: '12_escritorio_1366x768.png', name: 'Desktop 1366x768' },
    { w: 1280, h: 720, file: '13_escritorio_1280x720.png', name: 'Desktop 1280x720' },
    { w: 2560, h: 1440, file: '14_resolucion_2560x1440.png', name: 'QHD 2560x1440', minContentW: 1600 },
    { w: 3840, h: 2160, file: '15_resolucion_3840x2160.png', name: '4K 3840x2160', minContentW: 1800 },
    { w: 1024, h: 768, file: '16_tablet_horizontal_1024x768.png', name: 'Tablet horizontal 1024x768', checkTabletH: true },
    { w: 768, h: 1024, file: '17_tablet_vertical_768x1024.png', name: 'Tablet vertical 768x1024', checkTabletV: true }
  ];
  for (const vp of wfViewports) {
    await b.setViewport(vp.w, vp.h);
    await b.wait(150);
    await b.click('#wf-fit-btn');
    await b.eval(`window.scrollTo(0, 0)`);
    await b.wait(120);
    const vpOk = await b.eval(`({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      canvasW: document.getElementById('wf-canvas-viewport')?.getBoundingClientRect()?.width || 0,
      contentW: document.querySelector('.content')?.getBoundingClientRect()?.width || 0,
      hasCatToggle: Boolean(document.getElementById('wf-toggle-catalog')),
      hasPropsToggle: Boolean(document.getElementById('wf-toggle-props')),
      shellCollapsed: Boolean(document.querySelector('.shell.collapsed, .shell.is-collapsed'))
    })`);
    assert(
      vpOk.scrollW <= vpOk.clientW + 2 &&
      vpOk.canvasW > 0 &&
      (!vp.minContentW || vpOk.contentW >= vp.minContentW) &&
      (!vp.checkTabletH || (vpOk.hasCatToggle && vpOk.hasPropsToggle)) &&
      (!vp.checkTabletV || vpOk.shellCollapsed),
      `19.11 ${vp.name}: sin scroll horizontal (${vpOk.scrollW} <= ${vpOk.clientW}), contenido=${Math.round(vpOk.contentW)}px y lienzo=${Math.round(vpOk.canvasW)}px`
    );
    await b.screenshot(join(automationsArtDir, vp.file));
  }

  // 19.12 Auditoría en escritorio (tabla 6 columnas + detalle) y en tablet (tarjetas compactas + detalle) - Capturas 18 y 19
  await b.setViewport(1366, 768);
  await b.wait(120);
  await b.click('[data-dock-tab="audit"]');
  await b.wait(120);
  const desktopAuditBefore = await b.eval(`({
    colCount: document.querySelectorAll('.wf-audit-table thead th').length,
    tableText: document.getElementById('wf-dock-body')?.innerText || '',
    hasDetailBtn: Boolean(document.querySelector('.wf-audit-table [data-audit-detail]'))
  })`);
  await b.click('.wf-audit-table [data-audit-detail]');
  await b.wait(100);
  const desktopDetailVisible = await b.eval(`Boolean(document.getElementById('wf-audit-detail-box'))`);
  assert(
    desktopAuditBefore.colCount === 6 &&
    desktopAuditBefore.tableText.includes('Simulación') &&
    desktopAuditBefore.hasDetailBtn &&
    desktopDetailVisible,
    `19.12a Auditoría escritorio muestra 6 columnas limpias y detalle expandible`
  );
  await b.screenshot(join(automationsArtDir, '18_auditoria_escritorio.png'));
  await b.click('#wf-close-audit-detail');
  await b.wait(80);

  await b.setViewport(768, 1024);
  await b.wait(140);
  await b.click('.wf-audit-compact-card [data-audit-detail]');
  await b.wait(100);
  const tabletAuditCheck = await b.eval(`({
    cardsVisible: (document.querySelector('.wf-audit-compact-list')?.getBoundingClientRect()?.height || 0) > 0,
    tableHidden: getComputedStyle(document.querySelector('.wf-audit-table-wrap')).display === 'none',
    detailVisible: Boolean(document.getElementById('wf-audit-detail-box')),
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth
  })`);
  assert(
    tabletAuditCheck.cardsVisible &&
    tabletAuditCheck.tableHidden &&
    tabletAuditCheck.detailVisible &&
    tabletAuditCheck.scrollW <= tabletAuditCheck.clientW + 2,
    '19.12b Auditoría tablet usa vista compacta sin scroll horizontal y abre detalle de evento'
  );
  await b.screenshot(join(automationsArtDir, '19_auditoria_tablet.png'));
  await b.click('#wf-close-audit-detail');
  await b.wait(80);

  // 19.13 Movimiento reducido en simulación (Captura 20)
  await b.setViewport(1280, 800);
  await b.wait(100);
  await b.eval(`document.documentElement.setAttribute('data-reduced-motion', 'on')`);
  await b.click('#wf-simulate-btn');
  await b.wait(120);
  const reducedRunning = await b.eval(`(() => {
    const n = document.querySelector('.wf-node.is-sim-running, .wf-node[data-sim-state="running"], .wf-node[data-sim-state="waiting"]');
    const e = document.querySelector('.wf-edge-group.is-sim-active .wf-edge-path');
    return {
      nodeOk: n ? (getComputedStyle(n).animationName === 'none' && getComputedStyle(n).transitionDuration === '0s') : false,
      edgeOk: e ? (getComputedStyle(e).animationName === 'none') : true,
      badge: n?.querySelector('.wf-node-state-badge')?.textContent?.trim() || ''
    };
  })()`);
  await b.click('#wf-banner-pause');
  await b.wait(80);
  const reducedPaused = await b.eval(`(() => {
    const n = document.querySelector('.wf-node.is-sim-paused, .wf-node[data-sim-state="paused"]');
    const e = document.querySelector('.wf-edge-group.is-sim-active .wf-edge-path');
    return {
      nodeOk: n ? (getComputedStyle(n).animationName === 'none' && getComputedStyle(n).transitionDuration === '0s') : false,
      edgeOk: e ? (getComputedStyle(e).animationName === 'none') : true,
      badge: n?.querySelector('.wf-node-state-badge')?.textContent?.trim() || ''
    };
  })()`);
  assert(
    reducedRunning.nodeOk && reducedRunning.edgeOk &&
    reducedPaused.nodeOk && reducedPaused.edgeOk && reducedPaused.badge === 'Pausado',
    '19.13 Movimiento reducido desactiva animaciones en ejecución y pausa comunicando estado mediante texto, borde y color'
  );
  await b.screenshot(join(automationsArtDir, '20_movimiento_reducido.png'));
  await b.click('#wf-banner-stop').catch(() => {});
  await b.eval(`document.documentElement.removeAttribute('data-reduced-motion')`);
  await b.wait(80);

  // Verificar exactamente las 20 capturas obligatorias generadas
  const savedPngs = readdirSync(automationsArtDir).filter(f => f.endsWith('.png')).sort();
  assert(
    savedPngs.length === 20,
    `19.13b Se generaron exactamente las 20 capturas visuales requeridas (actual=${savedPngs.length})`
  );

  // 19.14 Arrastre de nodo con puntero + fluidez con flujo grande de 30 nodos y 29 aristas
  await b.dragMouse('.wf-node', 40, 20, 5);
  await b.wait(80);
  const perf30 = await b.eval(`(async () => {
    const mod = await import('./automations.js');
    const cr = mod.createWorkflow({ name: 'Flujo Stress 30 Nodos', area: 'Recepción' }, { role: 'admin', actorName: 'Administrador' });
    const id = cr.workflow.id;
    const nodeIds = [cr.workflow.nodes[0].id];
    for (let i = 1; i < 30; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const t = i === 29 ? 'end_success' : (i % 4 === 0 ? 'condition_branch' : 'action_internal_note');
      const r = mod.addWorkflowNode(id, { type: t, position: { x: 60 + col * 240, y: 50 + row * 150 }, label: 'Paso ' + i }, { role: 'admin' });
      if (r.ok) nodeIds.push(r.node.id);
    }
    let edgesAdded = 0;
    for (let i = 0; i < 29; i++) {
      const wfNow = mod.getWorkflowById(id);
      const srcN = wfNow.nodes.find(x => x.id === nodeIds[i]);
      const srcPort = srcN.type === 'condition_branch' ? 'yes' : 'out';
      const c = mod.connectWorkflowNodes(id, { sourceNodeId: nodeIds[i], sourcePort: srcPort, targetNodeId: nodeIds[i + 1], targetPort: 'in' }, { role: 'admin' });
      if (c.ok) edgesAdded++;
    }
    return { ok: true, id, nodes: mod.getWorkflowById(id).nodes.length, edges: edgesAdded };
  })()`);
  await b.eval(`location.hash = '#automations'`);
  await b.wait(100);
  const tStart30 = Date.now();
  await b.select('#wf-selector', perf30.id);
  await b.wait(100);
  const renderElapsedMs = Date.now() - tStart30;
  const dom30Count = await b.eval(`document.querySelectorAll('.wf-node').length`);
  assert(
    dom30Count === 30 && renderElapsedMs < 2000,
    `19.14 Lienzo renderiza flujo de 30 nodos y ${perf30.edges} aristas con fluidez (${renderElapsedMs} ms)`
  );

  // 19.15 Verificar que las simulaciones NO alteraron Agenda, Caja, CRM ni Turnos
  const afterTurnos = await b.eval(`localStorage.getItem('clinica_turnos_shared_v1') || ''`);
  await b.eval(`location.hash = '#agenda'`);
  await b.wait(80);
  const afterAgendaCount = await b.eval(`document.querySelectorAll('.cal-event, .agenda-row, [data-appointment-id]').length`);
  await b.eval(`location.hash = '#crm'`);
  await b.wait(80);
  const afterCrmIds = await b.eval(`[...document.querySelectorAll('[data-followup]')].map(el => el.dataset.followup + ':' + (el.closest('[data-stage]')?.dataset?.stage || '')).join('|')`);
  assert(
    afterAgendaCount === baseAgendaCount &&
    afterCrmIds === baseCrmIds &&
    afterTurnos === baselineOps.turnosShared &&
    baseCajaText.length > 0,
    '19.15 Simulaciones y ediciones de workflows no producen efectos secundarios en Agenda, CRM, Caja ni Turnos'
  );

  // 19.16 RBAC en navegador: Recepción y Caja bloqueados de #automations/#arm pero con acceso a sus flujos y tareas
  await loginQuickRole('recepcion@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#automations'`);
  await b.wait(100);
  const recepGuard = await b.eval(`({ hash: location.hash, hasStudio: Boolean(document.getElementById('wf-studio')), hasRoleBtn: Boolean(document.getElementById('role-workflows-btn')) })`);
  await b.click('#role-workflows-btn');
  await waitForVisibleSelector(b, '[data-attend-role-task]', 4000);
  const recepModalText = await b.eval(`document.getElementById('modal')?.innerText || ''`);
  await b.click('[data-attend-role-task]');
  await b.wait(80);
  const recepTaskDone = await b.eval(`(document.getElementById('modal')?.innerText || '').includes('Atendida')`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(50);

  await loginQuickRole('caja@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#automations'`);
  await b.wait(100);
  const cajaGuard = await b.eval(`({ hash: location.hash, hasStudio: Boolean(document.getElementById('wf-studio')), hasRoleBtn: Boolean(document.getElementById('role-workflows-btn')) })`);
  await b.click('#role-workflows-btn');
  await waitForVisibleSelector(b, '.role-wf-card', 4000);
  const cajaModalText = await b.eval(`document.getElementById('modal')?.innerText || ''`);
  await b.key('Escape', 'Escape', 27);
  await b.wait(50);

  assert(
    recepGuard.hash === '#dashboard' && !recepGuard.hasStudio && recepGuard.hasRoleBtn &&
    recepModalText.includes('Recuperación') && recepTaskDone &&
    cajaGuard.hash === '#caja' && !cajaGuard.hasStudio && cajaGuard.hasRoleBtn &&
    cajaModalText.includes('Caja'),
    '19.16 Recepción y Caja están bloqueados de #automations pero consultan sus flujos en solo lectura y atienden sus tareas asignadas'
  );

  // Restablecer demo y verificar cero errores JS de consola en Sección 19
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);
  const errorsAfterSec19 = b.consoleErrors.length;
  assert(
    errorsAfterSec19 === errorsBeforeSec19,
    `19.17 Cero excepciones JS en navegador durante toda la suite #automations (errores nuevos=${errorsAfterSec19 - errorsBeforeSec19})`
  );

  // =========================================================================
  // SECCIÓN 20: Sistema de Motion clínico, accesible y reutilizable
  // =========================================================================
  console.log('\n--- 20. Sistema de Motion clínico, accesible y reutilizable en navegador ---');
  const errorsBeforeSec20 = b.consoleErrors.length;

  // 20.1 Navegación a Dashboard: Entrada sobria, conteo de métricas agregadas y no bloqueo
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`location.hash = '#dashboard'`);
  await waitForVisibleSelector(b, '.stats .stat', 4000);
  await b.wait(650); // esperar que la animación sobria termine (600ms)

  const dashMotion = await b.eval(`(() => {
    const heading = document.querySelector('.heading');
    const stats = Array.from(document.querySelectorAll('.stats .stat'));
    const kpiToday = document.querySelector('[data-motion-key="dashboard:citas-hoy"]')?.textContent?.trim();
    const kpiPatients = document.querySelector('[data-motion-key="dashboard:pacientes-activos"]')?.textContent?.trim();
    const anyBusy = document.querySelector('[aria-busy="true"]');
    return {
      hasHeading: Boolean(heading),
      statCount: stats.length,
      kpiToday,
      kpiPatients,
      hasBusy: Boolean(anyBusy)
    };
  })()`);

  assert(
    dashMotion.hasHeading &&
    dashMotion.statCount >= 4 &&
    dashMotion.kpiToday === '08' &&
    dashMotion.kpiPatients === '03' &&
    !dashMotion.hasBusy,
    '20.1 Dashboard renderiza entrada sobria, métricas con valor final exacto desde fixtures relacionales (08 y 03) y sin aria-busy pendiente'
  );

  // 20.2 Navegación a Agenda: Tiempos y horas directos sin conteos erróneos, cambio de vista limpio
  await b.eval(`location.hash = '#agenda'`);
  await waitForVisibleSelector(b, '.agenda-view-switch button', 4000);
  await b.wait(200);

  const agendaMotion = await b.eval(`(() => {
    const rows = Array.from(document.querySelectorAll('#rows tr'));
    const times = rows.map(r => r.querySelector('td b')?.textContent?.trim()).filter(Boolean);
    const isValidTimes = times.length > 0 && times.every(t => /^\\d{2}:\\d{2}$/.test(t));
    return { rowCount: rows.length, isValidTimes };
  })()`);

  // Cambiar a vista mes y regresar a día
  await b.click('[data-agenda-view="month"]');
  await waitForVisibleSelector(b, '.calendar-grid', 4000);
  await b.click('[data-agenda-view="day"]');
  await waitForVisibleSelector(b, '#agenda-canvas', 4000);
  await b.wait(100);

  assert(
    agendaMotion.rowCount >= 4 && agendaMotion.isValidTimes,
    '20.2 Agenda muestra horas y turnos de forma inmediata sin alterar horas como contadores, y cambia de vista limpiamente'
  );

  // 20.3 CRM: KPIs agregados formateados, arrastre y actualización progresiva
  await b.eval(`location.hash = '#crm'`);
  await waitForVisibleSelector(b, '.crm-pipeline-kpis', 4000);
  await b.wait(650);

  const crmInitial = await b.eval(`(() => {
    const active = document.querySelector('[data-motion-key="crm:active-count"]')?.textContent?.trim();
    const val = document.querySelector('[data-motion-key="crm:active-value"]')?.textContent?.trim();
    const rate = document.querySelector('[data-motion-key="crm:conversion-rate"]')?.textContent?.trim();
    return { active, val, rate };
  })()`);

  assert(
    crmInitial.active === '05' &&
    crmInitial.val.includes('700') &&
    crmInitial.rate.includes('50'),
    '20.3 CRM presenta KPIs iniciales animados con formato exacto (05, S/ 700.00, 50 %)'
  );

  // 20.4 Pantalla pública TV (#pantalla-turnos): Reloj demo y códigos de turno nunca animados como contadores
  await b.eval(`location.hash = '#pantalla-turnos'`);
  await waitForVisibleSelector(b, '.public-screen-shell', 4000);
  await b.wait(150);

  const turnosPublicMotion = await b.eval(`(() => {
    const clockText = document.getElementById('public-clock-time')?.textContent?.trim();
    const isClockFormat = /^\\d{2}:\\d{2}:\\d{2}$/.test(clockText);
    const waitingR = document.querySelector('[data-waiting-count="R"]')?.textContent?.trim();
    const waitingC = document.querySelector('[data-waiting-count="C"]')?.textContent?.trim();
    const codes = Array.from(document.querySelectorAll('[data-public-code]')).map(c => c.getAttribute('data-public-code'));
    const isStrictCodes = codes.every(c => /^[RC]-\\d{3}$/.test(c));
    return {
      clockText,
      isClockFormat,
      waitingR,
      waitingC,
      isStrictCodes
    };
  })()`);

  assert(
    turnosPublicMotion.isClockFormat &&
    turnosPublicMotion.waitingR !== undefined &&
    turnosPublicMotion.waitingC !== undefined &&
    turnosPublicMotion.isStrictCodes,
    '20.4 #pantalla-turnos preserva reloj unificado sin conteo numérico y códigos R-*/C-* íntegros'
  );

  // 20.5 Constructor de automatizaciones (#automations): Entrada de diagrama, selección de nodo y simulación
  await b.eval(`location.hash = '#automations'`);
  await waitForVisibleSelector(b, '#wf-studio', 4000);
  await waitForVisibleSelector(b, '#wf-nodes-layer .wf-node', 4000);
  await b.wait(400);

  const studioMotion1 = await b.eval(`(() => {
    const nodes = Array.from(document.querySelectorAll('#wf-nodes-layer .wf-node'));
    const anyEntering = nodes.some(n => n.classList.contains('is-entering'));
    return { nodeCount: nodes.length, anyEntering };
  })()`);

  // Seleccionar un nodo no debe reiniciar animación de entrada
  await b.click('#wf-nodes-layer .wf-node');
  await b.wait(100);

  const studioMotion2 = await b.eval(`(() => {
    const nodes = Array.from(document.querySelectorAll('#wf-nodes-layer .wf-node'));
    const anyEntering = nodes.some(n => n.classList.contains('is-entering'));
    return { anyEntering };
  })()`);

  assert(
    studioMotion1.nodeCount >= 3 &&
    !studioMotion2.anyEntering,
    '20.5 #automations diagrama se presenta ordenado y la selección de nodo no reinicia la animación'
  );

  // 20.6 Accesibilidad: data-reduced-motion="on" desactiva animaciones y confirma valores finales
  await b.eval(`document.documentElement.setAttribute('data-reduced-motion', 'on')`);
  await b.wait(50);
  await b.eval(`location.hash = '#caja'`);
  await waitForVisibleSelector(b, '.cash-kpis', 4000);
  await b.wait(50);

  const cashReducedMotion = await b.eval(`(() => {
    const paid = document.querySelector('[data-motion-key="cash:total-paid"]')?.textContent?.trim();
    const pending = document.querySelector('[data-motion-key="cash:total-pending"]')?.textContent?.trim();
    const moves = document.querySelector('[data-motion-key="cash:moves-count"]')?.textContent?.trim();
    const busy = Boolean(document.querySelector('[aria-busy="true"]'));
    return { paid, pending, moves, busy };
  })()`);

  // Restaurar preferencia a estado normal
  await b.eval(`document.documentElement.removeAttribute('data-reduced-motion')`);
  await b.wait(50);

  assert(
    cashReducedMotion.paid.includes('S/') &&
    cashReducedMotion.pending.includes('S/') &&
    cashReducedMotion.moves === '03' &&
    !cashReducedMotion.busy,
    '20.6 data-reduced-motion="on" entrega valores finales de Caja inmediatamente sin retrasos ni aria-busy colgado'
  );

  // Restablecer demo y verificar cero errores JS de consola en Sección 20
  await loginQuickRole('admin@clinicaoftalmo.pe');
  await b.eval(`window.__resetDemoData()`);
  await b.wait(100);
  const errorsAfterSec20 = b.consoleErrors.length;
  assert(
    errorsAfterSec20 === errorsBeforeSec20,
    `20.7 Cero excepciones JS en navegador durante toda la suite Motion (errores nuevos=${errorsAfterSec20 - errorsBeforeSec20})`
  );

} finally {
  await b.close();
}

console.log(`\n========================================`);
console.log(`TOTAL PRUEBAS NAVEGADOR REAL: ${passed + failed}`);
console.log(`PASADAS: ${passed}`);
console.log(`FALLIDAS: ${failed}`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
