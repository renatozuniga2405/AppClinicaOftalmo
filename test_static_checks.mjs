// Comprobaciones estáticas de código, directivas de diseño y ausencia de términos no autorizados
import { readFile } from 'node:fs/promises';

console.log('=== SUITE DE COMPROBACIONES ESTÁTICAS DE POLÍTICAS Y DIRECTIVAS ===\n');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    failed++;
  }
}

const appCode = await readFile('./app/app.js', 'utf8');
const crmCode = await readFile('./app/crm.js', 'utf8');
const automationsCode = await readFile('./app/automations.js', 'utf8');
const armCode = await readFile('./app/arm.js', 'utf8');
const authCode = await readFile('./app/auth.js', 'utf8');
const paletteCode = await readFile('./app/palette.js', 'utf8');
const turnosCode = await readFile('./app/turnos.js', 'utf8');
const motionCode = await readFile('./app/motion.js', 'utf8');
const dashboardCode = await readFile('./app/dashboard.js', 'utf8');
const indexHtml = await readFile('./app/index.html', 'utf8');
const styleCode = await readFile('./app/style.css', 'utf8');

console.log('--- 1. Ausencia total de términos regulatorios y fiscales no autorizados ---');
assert(!appCode.includes('MINSA/SUSALUD'), 'app.js no contiene afirmaciones normativas "MINSA/SUSALUD"');
assert(!appCode.includes('Boleta de Venta'), 'app.js no contiene "Boleta de Venta"');
assert(!appCode.includes('Factura Electrónica'), 'app.js no contiene "Factura Electrónica"');
assert(!appCode.includes('B001-'), 'app.js no contiene series B001');
assert(!appCode.includes('F001-'), 'app.js no contiene series F001');
assert(!appCode.includes('comprobante legal'), 'app.js no contiene la frase "comprobante legal"');
assert(!appCode.includes('RUC 20601234567'), 'app.js no contiene RUC ficticio');

console.log('\n--- 2. Unificación estricta de Caja: cero usos de "comprobante" ---');
const comprobanteInApp = (appCode.match(/comprobante/gi) || []).length;
const comprobanteInCrm = (crmCode.match(/comprobante/gi) || []).length;
const comprobanteInAuth = (authCode.match(/comprobante/gi) || []).length;
assert(comprobanteInApp === 0, `app.js no contiene "comprobante" (encontrados: ${comprobanteInApp})`);
assert(comprobanteInCrm === 0, `crm.js no contiene "comprobante" (encontrados: ${comprobanteInCrm})`);
assert(comprobanteInAuth === 0, `auth.js no contiene "comprobante" (encontrados: ${comprobanteInAuth})`);
assert(appCode.includes('Constancia interna de pago'), 'app.js implementa "Constancia interna de pago"');
assert(appCode.includes('Orden interna de pago'), 'app.js implementa "Orden interna de pago"');
assert(appCode.includes('CP-'), 'app.js implementa correlativo interno CP-');
assert(appCode.includes('OP-'), 'app.js implementa correlativo interno OP-');

console.log('\n--- 3. Verificación de Route Guard y protección de rutas en app.js ---');
assert(!appCode.includes("route!=='paciente-detalle'&&!auth.canAccess"), 'Route guard protege paciente-detalle');
assert(appCode.includes("!auth.canAccess(user.role,route)"), 'Route guard protege todas las rutas por rol');

console.log('\n--- 4. Panel operativo de Recepción y adaptación para Administrador ---');
assert(!appCode.includes('<dt>Por cobrar</dt>'), 'Panel de recepción no tiene métrica "Por cobrar"');
assert(appCode.includes('<dt>Llegaron</dt>'), 'Panel de recepción tiene métrica "Llegaron"');
assert(appCode.includes('<dt>Por confirmar</dt>'), 'Panel de recepción tiene métrica "Por confirmar"');
assert(appCode.includes('Panel operativo de Recepción. Los cobros se gestionan en Caja y la información clínica en los módulos autorizados.'), 'Panel de recepción tiene nota informativa discreta');
assert(appCode.includes("title='Panel general'"), 'Dashboard adapta título a "Panel general" para Administrador');
assert(appCode.includes("sub='Resumen operativo y supervisión de la clínica.'"), 'Dashboard adapta subtítulo para Administrador');
assert(appCode.includes('Panel de supervisión de Administración.'), 'Dashboard adapta nota informativa para Administrador');

console.log('\n--- 5. Rol Administrador en Atención Médica y Restablecimiento Demo ---');
assert(appCode.includes('Vista de supervisión. La edición clínica corresponde al médico tratante.'), 'Consulta médica muestra mensaje de supervisión para Admin');
assert(appCode.includes('isAdmin?\'disabled readonly\':\'\''), 'Consulta médica deshabilita campos clínicos para Admin');
assert(appCode.includes('const doctorName = currentApp?.doctor ||'), 'Admin no se muestra como médico tratante');
assert(appCode.includes('resetDemoData()'), 'app.js implementa función resetDemoData()');
assert(appCode.includes('auth.restoreSessionAfterReset()'), 'resetDemoData() invoca auth.restoreSessionAfterReset()');
assert(authCode.includes('export function restoreSessionAfterReset()'), 'auth.js exporta restoreSessionAfterReset()');
assert(appCode.includes('confirmResetDemo()'), 'app.js implementa diálogo de confirmación para restablecer demo');
assert(appCode.includes('user.role===\'admin\'') && appCode.includes('topbar-reset-demo'), 'Botón restablecer demo visible solo para Admin');

console.log('\n--- 6. Fidelidad de canales en CRM e Inbox ---');
assert(crmCode.includes('Canal: ${esc(l.origin'), 'CRM muestra canal real del prospecto en lugar de WhatsApp genérico');
assert(crmCode.includes('resetCRMData'), 'crm.js exporta función resetCRMData');

console.log('\n--- 7. Agenda específica para Médico ---');
assert(appCode.includes("title='Mi agenda médica'"), 'Título de agenda para médico cambia a "Mi agenda médica"');
assert(appCode.includes('canCreateAppointment'), 'Botón "+ Nueva cita" está restringido para Médico');
assert(appCode.includes('a.doctor!==user.name'), 'Médico solo ve sus citas asignadas en agenda');

console.log('\n--- 8. Centro ARM y escenarios deterministas ---');
assert(armCode.includes('No hay modelos de IA, canales externos ni decisiones clínicas conectadas'), 'Centro ARM identifica explícitamente sus límites de demostración');
assert(armCode.includes('Pausar agente') && armCode.includes('Reactivar agente'), 'ARM implementa pausa y reactivación reversibles');
assert(crmCode.includes("isAgentActive('receptionist')"), 'El escenario de reserva consulta el estado real del agente');
assert(crmCode.includes('no evalúa síntomas') && crmCode.includes('Derivada a atención humana'), 'Derivación sensible evita diagnóstico y exige atención humana');
assert(appCode.includes('resetARMData()'), 'Restablecer demo también restaura agentes, automatizaciones y auditoría');

console.log('\n--- 9. Pipeline comercial: KPIs, estancamiento, análisis y trazabilidad ---');
assert(crmCode.includes('STAGE_THRESHOLDS') && crmCode.includes('computePipelineKPIs') && crmCode.includes('computePipelineAnalytics'), 'crm.js expone umbrales, cálculo de KPIs y cálculo de análisis');
assert(crmCode.includes('no representan ingresos reales') && crmCode.includes('Sin datos suficientes'), 'Análisis de pipeline declara límites demostrativos y maneja ausencia de datos');
assert(crmCode.includes('Acción simulada'), 'Trazabilidad advierte explícitamente las acciones simuladas');
assert(appCode.includes('handleAppointmentBooked') && appCode.includes('handleAppointmentAttended') && appCode.includes('handleAppointmentRescheduled') && appCode.includes('handleAppointmentCancelled'), 'app.js sincroniza reservas, asistencia, reprogramaciones y cancelaciones hacia CRM');
assert(styleCode.includes('.crm-stats-strip.crm-pipeline-kpis') && styleCode.includes('grid-auto-flow: column'), 'CSS mantiene franja de 6 KPIs y flujo horizontal en columnas del tablero');
assert(crmCode.includes("ESSENTIAL_STAGE_KEYS=['cita_agendada','asistio','no_asistio','seguimiento','convertido','perdido']") && crmCode.includes('Esta etapa está vinculada a Agenda, CRM o ARM y no puede retirarse'), 'CRM protege las 6 etapas operativas esenciales con explicación explícita');
assert(crmCode.includes('Avance acumulado del pipeline actual') && crmCode.includes('Porcentaje de avance actual') && crmCode.includes('Los porcentajes se estiman a partir de la etapa actual de cada oportunidad. No representan un historial de conversiones.') && !crmCode.includes('Embudo de conversión por etapa') && !crmCode.includes('Porcentaje de conversión'), 'Vista Análisis aclara avance acumulado actual sin afirmar conversión histórica');
assert(crmCode.includes('Conversión a cita'), 'Franja superior de KPIs conserva el indicador "Conversión a cita"');
assert(crmCode.includes('Entró a etapa en los últimos 3 días') && crmCode.includes('El periodo se calcula con la fecha de entrada a la etapa actual.'), 'Filtro de periodo en Análisis aclara que evalúa stageEnteredAt');
assert(
  crmCode.includes('Valor estimado del servicio') &&
  crmCode.includes('Referencia inicial · aún no cobrada') &&
  crmCode.includes('Tarifa de la cita vinculada · aún no cobrada') &&
  crmCode.includes('export function getLeadServiceValueInfo') &&
  !crmCode.includes('<small>Valor estimado</small>') &&
  !crmCode.includes('Valor estimado de la oportunidad') &&
  !/precio de cirug[íi]a/i.test(crmCode),
  'CRM reemplaza "Valor estimado" por "Valor estimado del servicio" con nota de referencia inicial o tarifa vinculada aún no cobrada'
);

console.log('\n--- 10. Módulo Mi perfil, preferencias visuales y privacidad de credenciales ---');
assert(
  ['admin', 'medico', 'tecnico', 'recepcion', 'caja'].every(r => authCode.includes(r)) &&
  authCode.includes("'caja'") && authCode.includes("'perfil'"),
  'auth.js concede acceso a la ruta perfil para los 5 roles del sistema'
);
assert(
  authCode.includes('export function updateOwnProfile') &&
  authCode.includes('export function changeOwnPassword') &&
  authCode.includes('export function loginWithPassword') &&
  authCode.includes('export function safeSessionUser'),
  'auth.js implementa gestión personal protegida y verificación en memoria sin exponer contraseñas'
);
assert(
  appCode.includes('Cambio simulado para esta demostración. No utiliza un servidor de autenticación.'),
  'Mi perfil muestra exactamente la nota obligatoria sobre cambio simulado de contraseña'
);
assert(
  appCode.includes('PREFS_STORAGE_KEY') && appCode.includes('resetAllUserPreferences()'),
  'app.js persiste preferencias por usuario en localStorage y las restablece en Reset Demo'
);
assert(
  styleCode.includes(':root[data-theme="azul"]') &&
  styleCode.includes(':root[data-theme="neutro"]') &&
  styleCode.includes(':root[data-text-size="large"]') &&
  styleCode.includes(':root[data-reduced-motion="on"]') &&
  styleCode.includes('@media (prefers-reduced-motion: reduce)'),
  'style.css unifica los 3 temas preset, escala de lectura y reducción de movimiento sin duplicar hojas'
);
assert(
  motionCode.includes('export function showModuleLoading') &&
  styleCode.includes('.module-loading-skeleton') &&
  styleCode.includes('@keyframes moduleSkeletonSweep'),
  'La entrada de módulos incluye skeleton visible y shimmer antes de revelar textos y métricas'
);

console.log('\n--- 11. Menú lateral flotante, buscador global / paleta y seguridad sin IA ---');
assert(
  (paletteCode.match(/comprobante/gi) || []).length === 0,
  'palette.js no contiene "comprobante"'
);
assert(
  !/copilot|asistente inteligente|inteligencia artificial/i.test(paletteCode + '\n' + appCode),
  'Ni palette.js ni app.js afirman existencia de Copilot ni inteligencia artificial'
);
assert(
  indexHtml.includes('<dialog id="command-palette"') && indexHtml.includes('closedby="any"'),
  'index.html declara <dialog id="command-palette"> con closedby="any"'
);
assert(
  appCode.includes('<search class="sidebar-search-wrap"') && appCode.includes('<search class="cp-searchbar"'),
  'app.js usa el elemento semántico <search> en el menú lateral y en la paleta'
);
assert(
  appCode.includes('isPaletteActionAuthorized') && appCode.includes('executeCommandPaletteItem') && paletteCode.includes('export function isPaletteActionAuthorized'),
  'palette.js y app.js validan permisos RBAC antes de indexar y ejecutar acciones de la paleta'
);
assert(
  !paletteCode.includes('allerg') && !paletteCode.includes('diagnosis') && !paletteCode.includes('clinicalExams') && !paletteCode.includes('antecedent'),
  'palette.js nunca indexa alergias, diagnósticos ni antecedentes clínicos sensibles'
);
assert(
  styleCode.includes('dialog.command-palette') && styleCode.includes('border-radius: 18px') && styleCode.includes('.sidebar-tooltip'),
  'style.css estiliza el panel flotante redondeado, tooltip accesible en modo contraído y paleta responsiva'
);

console.log('\n--- 12. Turnos presenciales / Cola de atención y privacidad pública ---');
assert(
  (turnosCode.match(/comprobante/gi) || []).length === 0,
  'turnos.js no contiene "comprobante"'
);
assert(
  turnosCode.includes('Espere a que su código aparezca en pantalla') &&
  turnosCode.includes('getPublicDisplayData') &&
  turnosCode.includes('confirmArrivalFromTurn') &&
  turnosCode.includes('completeTurnAfterPayment'),
  'turnos.js implementa mensaje de autoservicio, salida pública sanitizada, llegada vinculada y cierre tras cobro'
);
assert(
  authCode.includes("'turnos-recepcion'") &&
  authCode.includes("'turnos-caja'") &&
  authCode.includes("'turnos-supervision'") &&
  appCode.includes('completeTurnAfterPayment') &&
  appCode.includes('resetSharedTurnState()'),
  'auth.js y app.js protegen rutas de turnos por rol e integran cierre de turno y restablecimiento'
);
assert(
  styleCode.includes('.public-display-board') && styleCode.includes('.kiosk-ticket-visual') && styleCode.includes('.turn-state-badge') && styleCode.includes('.turns-counter-busy-hint'),
  'style.css estiliza autoservicio, pantalla pública, insignias accesibles y aviso de ventanilla ocupada'
);
assert(
  turnosCode.includes('getActiveTurnForCounter') &&
  turnosCode.includes('verifyQueueInvariants') &&
  turnosCode.includes('occupiedCounter') &&
  turnosCode.includes('recepcion-call-next-hint') &&
  turnosCode.includes('caja-call-next-hint'),
  'turnos.js blinda ventanilla única y transferencias sin duplicados en lógica central y paneles'
);

// 13. Auditoría de Autoservicio: identidad temporal, estados honestos de impresión y limpieza de avisos públicos
assert(
  turnosCode.includes('buildTemporaryDocumentKey') &&
  turnosCode.includes('TMPDOC-') &&
  appCode.includes('clearPublicNotice'),
  'turnos.js implementa identidad temporal buildTemporaryDocumentKey y app.js centraliza clearPublicNotice'
);
assert(
  !turnosCode.includes('Ticket listo') &&
  !turnosCode.includes('Ticket impreso') &&
  !turnosCode.includes('Impresión completada') &&
  !turnosCode.includes('listo para retirar') &&
  !turnosCode.includes('Retire su ticket'),
  'turnos.js no contiene afirmaciones falsas ni contradictorias ("Ticket listo", "Ticket impreso", "Retire su ticket")'
);
assert(
  turnosCode.includes('Estamos preparando su ticket. Espere un momento.') &&
  turnosCode.includes('Se abrió la impresión. Si el ticket fue impreso, retírelo y espere a que su código aparezca en pantalla.') &&
  turnosCode.includes('Su turno fue registrado, pero no se pudo iniciar la impresión. Solicite ayuda al personal.') &&
  turnosCode.includes('kiosk-reprint-btn') &&
  turnosCode.includes('Reintentar impresión') &&
  styleCode.includes('.kiosk-print-disclaimer') &&
  styleCode.includes('.kiosk-print-status-box.is-error'),
  'Autoservicio implementa estados honestos de impresión, reintento sin duplicación y nota demostrativa'
);
assert(
  turnosCode.includes('Continuar sin documento') &&
  turnosCode.includes('Sin documento') &&
  turnosCode.includes('Conserve su ticket. Si lo pierde, solicite ayuda al personal para identificar su turno.') &&
  turnosCode.includes('No podemos recuperar automáticamente un turno emitido sin documento. Solicite ayuda al personal.') &&
  turnosCode.includes('Puede volver a imprimirlo sin perder su posición en la cola.') &&
  turnosCode.includes('Reimprimir ticket existente') &&
  turnosCode.includes('getAheadCountForTurn') &&
  styleCode.includes('.kiosk-alt-actions') &&
  styleCode.includes('.kiosk-anon-lost-alert'),
  'Autoservicio implementa flujo anónimo real sin documento, recuperación por DNI con reimpresión y ayuda discreta sin documento'
);

// 14. Pantalla pública #pantalla-turnos a pantalla completa y sincronización entre pestañas
assert(
  turnosCode.includes('clinica_turnos_shared_v1') &&
  turnosCode.includes('clinica_turnos_ops_private_v1') &&
  turnosCode.includes('clinica_turnos_channel_v1') &&
  turnosCode.includes('ALLOWED_SHARED_ROOT_KEYS') &&
  turnosCode.includes('ALLOWED_SHARED_TURN_KEYS') &&
  turnosCode.includes('FORBIDDEN_SHARED_TURN_KEYS') &&
  turnosCode.includes('sanitizeSharedTurnState') &&
  turnosCode.includes('loadSharedTurnState') &&
  turnosCode.includes('commitSharedTurnMutation') &&
  turnosCode.includes('broadcastTurnStateChange') &&
  turnosCode.includes('subscribeToTurnStateChanges') &&
  turnosCode.includes('hydrateTurnStateFromSharedStorage') &&
  turnosCode.includes('resetSharedTurnState') &&
  turnosCode.includes('getPublicTurnProjection') &&
  turnosCode.includes('getDemoClockSnapshot') &&
  turnosCode.includes('getCurrentDemoTimestamp'),
  'turnos.js exporta la infraestructura de sincronización separada, listas blancas/negras, reloj demo unificado y proyección pública'
);
assert(
  !turnosCode.includes('display-goto-kiosk') &&
  !turnosCode.includes('display-back-system') &&
  !turnosCode.includes('public-demo-nav') &&
  !/tiempo estimado/i.test(turnosCode),
  '#pantalla-turnos elimina botones de navegación interna/kiosco y no muestra estimaciones falsas de tiempo'
);
const tvSectionCode = turnosCode.slice(turnosCode.indexOf('5. PANTALLA PÚBLICA DE LLAMADOS'));
assert(
  !/new Date\s*\(/.test(tvSectionCode),
  'El reloj de #pantalla-turnos utiliza el reloj demostrativo unificado sin mezclar new Date() real'
);
assert(
  appCode.includes('subscribeToTurnStateChanges') &&
  appCode.includes('hydrateTurnStateFromSharedStorage') &&
  appCode.includes('registerTurnosPatientDirectory') &&
  appCode.includes('is-public-tv'),
  'app.js conecta hidratación inicial, suscripción entre pestañas, directorio de pacientes y modo TV completo'
);
assert(
  styleCode.includes('.public-display-shell') &&
  styleCode.includes('.public-tv-header') &&
  styleCode.includes('.public-queue-code-list') &&
  styleCode.includes('.public-empty-calls') &&
  styleCode.includes('body.is-public-tv') &&
  styleCode.includes('[data-reduced-motion="on"] .public-call-card.is-new-call'),
  'style.css define diseño TV a pantalla completa, colas próximas, estado vacío y soporte de movimiento reducido'
);

console.log('\n--- 15. Constructor Visual de Workflows (#automations) y ARM dinámico ---');
assert(
  (automationsCode.match(/comprobante|copilot|asistente inteligente|inteligencia artificial/gi) || []).length === 0 &&
  (armCode.match(/comprobante|copilot|asistente inteligente|inteligencia artificial/gi) || []).length === 0,
  'automations.js y arm.js no contienen términos prohibidos ("comprobante", "copilot", "asistente inteligente", "inteligencia artificial")'
);
assert(
  automationsCode.includes("AUTOMATIONS_STORAGE_KEY = 'clinica_automations_state_v2'") &&
  automationsCode.includes('AUTOMATIONS_SCHEMA_VERSION = 2') &&
  automationsCode.includes('sanitizeAutomationsState') &&
  automationsCode.includes('loadAutomationsState') &&
  automationsCode.includes('resetAutomationsOnly'),
  'automations.js implementa almacenamiento local versionado, sanitización, recuperación ante corrupción y restablecimiento'
);
assert(
  automationsCode.includes('AGENT_CAPABILITIES_CATALOG') &&
  automationsCode.includes('AGENT_FORBIDDEN_CATALOG') &&
  automationsCode.includes('NODE_CATALOG') &&
  automationsCode.includes('WORKFLOW_TEMPLATES') &&
  automationsCode.includes('AUDIT_EVENT_TYPES') &&
  automationsCode.includes('SIMULATION_DISCLAIMER') &&
  automationsCode.includes('Simulación demostrativa. No se modificaron datos ni se enviaron mensajes reales.'),
  'automations.js define catálogos cerrados de agentes/nodos, plantillas, tipos de auditoría y aviso fijo de simulación'
);
assert(
  automationsCode.includes('validateWorkflowStructure') &&
  automationsCode.includes('wouldCreateCycle') &&
  automationsCode.includes('startWorkflowSimulation') &&
  automationsCode.includes('getAutomationRolePermissions') &&
  automationsCode.includes('getAssignedTasksForRole'),
  'automations.js implementa validación estructural/antibucles, simulación paso a paso y RBAC granular'
);
assert(
  armCode.includes('.wf-studio') || (armCode.includes('wf-studio') &&
  armCode.includes('wf-canvas-viewport') &&
  armCode.includes('wf-edges-svg') &&
  armCode.includes('openAgentBuilderModal') &&
  armCode.includes('data-automation-card')),
  'arm.js implementa la interfaz del constructor visual, lienzo SVG, creador dinámico de agentes y tarjetas rápidas compatibles'
);
assert(
  appCode.includes('cleanupAutomationsRuntime') &&
  appCode.includes('openRoleWorkflowsModal') &&
  appCode.includes('role-workflows-btn') &&
  styleCode.includes('.wf-studio') &&
  styleCode.includes('.wf-node.is-sim-running') &&
  styleCode.includes('.wf-edge-group.is-yes') &&
  styleCode.includes('.wf-edge-group.is-no') &&
  styleCode.includes('[data-reduced-motion="on"]'),
  'app.js y style.css integran permisos por rol para flujos/tareas, limpieza de temporizadores y estilos responsivos con movimiento reducido'
);

console.log('\n--- 16. Dashboard Ejecutivo v1.3: integridad relacional, términos y transiciones CSS ---');
assert(
  (dashboardCode.match(/comprobante|copilot|asistente inteligente|inteligencia artificial/gi) || []).length === 0,
  'dashboard.js no contiene términos prohibidos ("comprobante", "copilot", "asistente inteligente", "inteligencia artificial")'
);
assert(
  dashboardCode.includes('export const DEMO_PATIENTS_CATALOG') &&
  dashboardCode.includes('export const DEMO_NEW_PATIENTS') &&
  dashboardCode.includes('export const DEMO_TRANSACTIONS') &&
  dashboardCode.includes('export const DEMO_APPOINTMENTS') &&
  dashboardCode.includes('export const DEMO_SURGERIES') &&
  dashboardCode.includes('export const DEMO_STUDY_ORDERS') &&
  dashboardCode.includes('export const DEMO_CRM_RECORDS') &&
  dashboardCode.includes('export function validateDashboardDatasetIntegrity') &&
  !dashboardCode.includes('populateSlice') &&
  !dashboardCode.includes('distributeSedeForIndex') &&
  !dashboardCode.includes('riosShare'),
  'dashboard.js exporta colecciones relacionales (incluido DEMO_STUDY_ORDERS) y validateDashboardDatasetIntegrity sin populateSlice ni cuotas artificiales'
);
assert(
  appCode.includes('formatDashboardPersonName(') &&
  appCode.includes('maskDashboardDoc('),
  'app.js aplica abreviación de nombres y enmascaramiento parcial de DNI en el resumen de #dashboard para Recepción'
);

console.log(`\n========================================`);
console.log(`TOTAL COMPROBACIONES ESTÁTICAS: ${passed + failed}`);
console.log(`PASADAS: ${passed}`);
console.log(`FALLIDAS: ${failed}`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
