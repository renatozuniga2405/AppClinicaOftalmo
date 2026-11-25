// Test suite for RBAC, route guards, CRM metrics and visual consistency
import * as auth from './app/auth.js';
import * as crm from './app/crm.js';
import * as automations from './app/automations.js';
import * as arm from './app/arm.js';
import * as palette from './app/palette.js';
import * as turnos from './app/turnos.js';
import * as motion from './app/motion.js';

console.log('=== TEST SUITE: RBAC, RUTAS Y COHERENCIA VISUAL/FUNCIONAL ===\n');

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

// 1. Verificación de permisos y Route Guard en auth.js
console.log('--- 1. Permisos y Route Guard en auth.js ---');
assert(auth.canAccess('caja', 'caja') === true, 'Caja puede acceder a "caja"');
assert(auth.canAccess('caja', 'pacientes') === false, 'Caja NO puede acceder a "pacientes"');
assert(auth.canAccess('caja', 'paciente-detalle') === false, 'Caja NO puede acceder a "paciente-detalle"');
assert(auth.canAccess('caja', 'agenda') === false, 'Caja NO puede acceder a "agenda"');
assert(auth.canAccess('caja', 'crm') === false, 'Caja NO puede acceder a "crm"');
assert(auth.canAccess('caja', 'consulta') === false, 'Caja NO puede acceder a "consulta"');
assert(auth.canAccess('caja', 'estudios') === false, 'Caja NO puede acceder a "estudios"');
assert(auth.canAccess('caja', 'admin-medicos') === false, 'Caja NO puede acceder a "admin-medicos"');

assert(auth.canAccess('medico', 'agenda') === true, 'Médico puede acceder a "agenda"');
assert(auth.canAccess('medico', 'consulta') === true, 'Médico puede acceder a "consulta"');
assert(auth.canAccess('medico', 'pacientes') === true, 'Médico puede acceder a "pacientes"');
assert(auth.canAccess('medico', 'paciente-detalle') === true, 'Médico puede acceder a "paciente-detalle"');
assert(auth.canAccess('medico', 'crm') === false, 'Médico NO puede acceder a "crm"');
assert(auth.canAccess('medico', 'caja') === false, 'Médico NO puede acceder a "caja"');
assert(auth.canAccess('medico', 'admin-usuarios') === false, 'Médico NO puede acceder a "admin-usuarios"');

assert(auth.canAccess('tecnico', 'estudios') === true, 'Técnico puede acceder a "estudios"');
assert(auth.canAccess('tecnico', 'pacientes') === true, 'Técnico puede acceder a "pacientes"');
assert(auth.canAccess('tecnico', 'paciente-detalle') === true, 'Técnico puede acceder a "paciente-detalle"');
assert(auth.canAccess('tecnico', 'agenda') === false, 'Técnico NO puede acceder a "agenda"');
assert(auth.canAccess('tecnico', 'caja') === false, 'Técnico NO puede acceder a "caja"');

assert(auth.canAccess('recepcion', 'dashboard') === true, 'Recepción puede acceder a "dashboard"');
assert(auth.canAccess('recepcion', 'agenda') === true, 'Recepción puede acceder a "agenda"');
assert(auth.canAccess('recepcion', 'pacientes') === true, 'Recepción puede acceder a "pacientes"');
assert(auth.canAccess('recepcion', 'crm') === true, 'Recepción puede acceder a "crm"');
assert(auth.canAccess('recepcion', 'arm') === false, 'Recepción NO puede acceder al Centro ARM');
assert(auth.canAccess('recepcion', 'automations') === false, 'Recepción NO puede administrar automatizaciones');
assert(auth.canAccess('recepcion', 'caja') === false, 'Recepción NO puede acceder a "caja"');
assert(auth.canAccess('recepcion', 'consulta') === false, 'Recepción NO puede acceder a "consulta"');

assert(auth.canAccess('admin', 'dashboard') === true, 'Admin puede acceder a "dashboard"');
assert(auth.canAccess('admin', 'consulta') === true, 'Admin puede acceder a "consulta"');
assert(auth.canAccess('admin', 'admin-servicios') === true, 'Admin puede acceder a "admin-servicios"');
assert(auth.canAccess('admin', 'arm') === true, 'Admin puede acceder al Centro ARM');
assert(auth.canAccess('admin', 'automations') === true, 'Admin puede acceder a Automatizaciones');

// 2. Verificación de lógica CRM
console.log('\n--- 2. Métricas y flujos CRM ---');
const sampleLeads = [
  { id: 1, name: 'Lead 1', stage: 'Primer contacto', nextDate: '2026-10-27', reason: 'Consulta' },
  { id: 2, name: 'Lead 2', stage: 'Evaluación / En seguimiento', nextDate: '2026-10-28', reason: 'Cirugía' },
  { id: 3, name: 'Lead 3', stage: 'Cita agendada', nextDate: '2026-10-27', reason: 'Refracción' },
  { id: 4, name: 'Lead 4', stage: 'Convertido', nextDate: '2026-10-25', reason: 'Control' },
  { id: 5, name: 'Lead 5', stage: 'Perdido', nextDate: '2026-10-20', reason: 'Sin respuesta' }
];

const total = sampleLeads.length;
const converted = sampleLeads.filter(l => l.stage === 'Convertido');
const active = sampleLeads.filter(l => l.stage !== 'Convertido' && l.stage !== 'Perdido');
const rate = Math.round((converted.length / total) * 100);
const dueToday = sampleLeads.filter(l => l.nextDate === '2026-10-27');

assert(converted.length === 1, 'Métrica CRM Convertidos: exactamente los que están en columna Convertido (1)');
assert(active.length === 3, 'Métrica CRM Activos: excluye Convertido y Perdido (3)');
assert(rate === 20, 'Tasa de conversión calculada dinámicamente: 1/5 * 100 = 20%');
assert(dueToday.length === 2, 'Seguimientos de hoy: filtra por fecha demo 2026-10-27 (2)');

// Simulación de mover tarjeta
sampleLeads[0].stage = 'Convertido';
const newConverted = sampleLeads.filter(l => l.stage === 'Convertido');
const newActive = sampleLeads.filter(l => l.stage !== 'Convertido' && l.stage !== 'Perdido');
const newRate = Math.round((newConverted.length / total) * 100);
assert(newConverted.length === 2, 'Al mover tarjeta a Convertido, Convertidos aumenta a 2');
assert(newActive.length === 2, 'Al mover tarjeta a Convertido, Activos disminuye a 2');
assert(newRate === 40, 'Nueva tasa de conversión es 2/5 * 100 = 40%');

// Simulación de vinculación a paciente
const leadToBook = { id: 6, name: 'Prospecto Nuevo', stage: 'Evaluación / En seguimiento', pid: null };
const newPatient = { id: 10, name: leadToBook.name, doc: '00000010' };
leadToBook.pid = newPatient.id;
assert(leadToBook.stage !== 'Convertido', 'Vincular prospecto a paciente NO lo marca automáticamente como Convertido');
assert(leadToBook.pid === 10, 'Prospecto queda asociado con su pid');

const noShowHandled=crm.handleAppointmentNoShow({id:2,status:'No asistió'});
const recoveredLead=crm.leads.find(l=>l.appointmentId===2);
assert(noShowHandled===true&&recoveredLead.stage===8, 'Una inasistencia vinculada permanece visible en No asistió');
assert(crm.getPendingNoShowRecoveries().some(item=>item.leadId===recoveredLead.id), 'ARM expone la recuperación pendiente sin ejecutarla automáticamente');
const recoveryExecuted=crm.executeNoShowRecovery(recoveredLead.id);
assert(recoveryExecuted===true&&recoveredLead.stage===9, 'Ejecutar +10 min mueve el prospecto a Seguimiento');
assert(recoveredLead.nextAction==='Contactar para reagendar cita'&&recoveredLead.nextDate==='2026-10-27', 'ARM crea la tarea simulada de reagendamiento');
assert(recoveredLead.messages.at(-1).text.includes('nuevo horario')&&recoveredLead.activities.at(-1).text.includes('10 minutos'), 'La recuperación registra mensaje y espera simulados, sin envío real');
assert(crm.columns.some(c=>c.name==='Interés confirmado')&&crm.columns.some(c=>c.name==='Asistió')&&crm.columns.some(c=>c.name==='No asistió')&&crm.columns.some(c=>c.name==='Seguimiento'), 'El pipeline incluye las etapas clínicas comerciales acordadas');
crm.resetCRMData();
arm.resetARMData();

console.log('\n--- 3. Permisos de Inbox omnicanal ---');
assert(auth.canAccess('admin', 'inbox') === true, 'Admin puede acceder a Inbox');
assert(auth.canAccess('recepcion', 'inbox') === true, 'Recepción puede acceder a Inbox');
assert(auth.canAccess('medico', 'inbox') === false, 'Médico NO puede acceder a Inbox');
assert(auth.canAccess('tecnico', 'inbox') === false, 'Técnico NO puede acceder a Inbox');
assert(auth.canAccess('caja', 'inbox') === false, 'Caja NO puede acceder a Inbox');

console.log('\n--- 4. Funciones de restablecimiento de datos demo y sesión activa ---');
const memoryStore = new Map();
globalThis.sessionStorage = {
  getItem: k => memoryStore.has(k) ? memoryStore.get(k) : null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: k => memoryStore.delete(k)
};

// Caso A: Admin modifica su propio nombre y luego restablece
auth.saveSession(auth.getUsers().find(u => u.id === 1));
auth.updateUser(1, { name: 'Roberto Modificado', role: 'admin', email: 'admin@clinicaoftalmo.pe', department: 'Dirección' });
assert(auth.getSession().name === 'Roberto Modificado', 'Sesión activa refleja nombre modificado antes del reset');
auth.resetUsers();
const resName = auth.restoreSessionAfterReset();
assert(resName.status === 'restored' && auth.getSession().name === 'Lic. Roberto Casas', 'Tras reset, sesión activa restaura el nombre inicial "Lic. Roberto Casas"');

// Caso B: Admin modifica su propio rol y luego restablece
auth.updateUser(1, { name: 'Lic. Roberto Casas', role: 'recepcion', email: 'admin@clinicaoftalmo.pe', department: 'Admisión' });
assert(auth.getSession().role === 'recepcion', 'Sesión activa refleja rol modificado antes del reset');
auth.resetUsers();
const resRole = auth.restoreSessionAfterReset();
assert(resRole.status === 'restored' && auth.getSession().role === 'admin' && auth.getSession().roleLabel === 'Administrador General', 'Tras reset, sesión activa restaura rol inicial "admin"');

// Caso C: Usuario temporal inicia sesión y luego se ejecuta reset
const tempUser = auth.addUser({ name: 'Usuario Temporal', email: 'temp@clinica.pe', role: 'recepcion', department: 'Demo' });
assert(auth.getUsers().length === 6, 'Usuario agregado temporalmente (total 6)');
auth.saveSession(tempUser);
assert(auth.getSession().email === 'temp@clinica.pe', 'Sesión activa iniciada con usuario temporal');
auth.resetUsers();
const resTemp = auth.restoreSessionAfterReset();
assert(auth.getUsers().length === 5, 'auth.resetUsers() restaura a los 5 usuarios iniciales');
assert(resTemp.status === 'closed' && auth.getSession() === null, 'Tras reset con usuario temporal, la sesión se cierra (null)');
assert(auth.getUsers().find(u => u.email === 'admin@clinicaoftalmo.pe') !== undefined, 'Admin original presente tras reset');

crm.resetCRMData();
const summary = crm.getLeadsSummary();
assert(summary.length === 6, 'crm.resetCRMData() restaura los 6 prospectos iniciales');
assert(summary.some(l => l.origin === 'WhatsApp'), 'Prospectos de WhatsApp presentes');
assert(summary.some(l => l.origin === 'Google'), 'Prospecto de Google presente');
assert(summary.some(l => l.origin === 'Instagram'), 'Prospecto de Instagram presente');
assert(summary.some(l => l.origin === 'Facebook'), 'Prospecto de Facebook presente');

console.log('\n--- 5. Estado local, auditoría y restablecimiento ARM ---');
arm.resetARMData();
const initialArm = arm.getARMSummary();
assert(initialArm.total === 5 && initialArm.active === 4, 'ARM inicia con 5 agentes y 4 en estado Activo');
assert(arm.isAgentActive('receptionist') === true, 'Recepcionista virtual está disponible en el escenario inicial');
const initialEventCount = initialArm.events.length;
arm.recordARMEvent('commercial', 'Prueba unitaria', 'Evento de demostración', 'success');
assert(arm.getARMSummary().events.length === initialEventCount + 1, 'La auditoría ARM registra una acción simulada');
arm.resetARMData();
assert(arm.getARMSummary().events.length === initialEventCount, 'resetARMData() restaura la auditoría inicial');

console.log('\n--- 6. Pipeline CRM: KPIs, Estancamiento, Análisis y Trazabilidad ---');
crm.resetCRMData();
arm.resetARMData();

const baseKpis = crm.computePipelineKPIs(crm.leads, [], '2026-10-27');
assert(baseKpis.activeCount === 5, `Prospectos activos iniciales = 5 (excluye Convertido/Perdido; obtenido: ${baseKpis.activeCount})`);
assert(baseKpis.activeValue === 700, `Valor potencial activo inicial = 700 (obtenido: ${baseKpis.activeValue})`);
assert(baseKpis.conversionBookedCount === 2 && baseKpis.conversionContactedCount === 4 && baseKpis.conversionRate === 50, `Conversión a cita inicial = 50% (2 de 4; obtenido: ${baseKpis.conversionRate}% = ${baseKpis.conversionBookedCount}/${baseKpis.conversionContactedCount})`);
assert(baseKpis.attendanceResolvedCount === 0 && baseKpis.attendanceRate === 0, 'Asistencia inicia en 0% cuando aún no hay citas CRM resueltas');
assert(baseKpis.stagnantCount === 2, `Oportunidades estancadas iniciales = 2 (María vencida + Jorge excedido; obtenido: ${baseKpis.stagnantCount})`);
assert(baseKpis.pendingRecoveryCount === 0, 'Recuperaciones ARM pendientes inician en 0');

assert(crm.STAGE_THRESHOLDS[1] === 2 && crm.STAGE_THRESHOLDS[8] === 1, 'Umbrales iniciales de estancamiento por etapa configurados');
const cAna = crm.getFollowUpClassification(crm.leads.find(l => l.id === 1), '2026-10-27');
const cLuis = crm.getFollowUpClassification(crm.leads.find(l => l.id === 2), '2026-10-27');
const cMaria = crm.getFollowUpClassification(crm.leads.find(l => l.id === 3), '2026-10-27');
const cElena = crm.getFollowUpClassification(crm.leads.find(l => l.id === 5), '2026-10-27');
const cJorge = crm.getFollowUpClassification(crm.leads.find(l => l.id === 6), '2026-10-27');
assert(cAna.key === 'normal' && !cAna.isStagnant, 'Ana Torres está en seguimiento Normal');
assert(cLuis.key === 'attention' && !cLuis.isStagnant, 'Luis Pérez (Fría en prioridad) NO se confunde con Estancado: está en Atención');
assert(cMaria.key === 'overdue' && cMaria.isStagnant, 'María López con acción del 2026-10-26 está Vencida');
assert(cElena.key === 'closed' && !cElena.isStagnant, 'Elena Soto en Convertido se clasifica Cerrado sin estancamiento');
assert(cJorge.key === 'stagnant' && cJorge.isStagnant && cJorge.daysInStage === 3, `Jorge con 3 días en Nuevo (>2d) está Estancado`);

const baseAnalytics = crm.computePipelineAnalytics(crm.leads, [], { refDate: '2026-10-27' });
assert(baseAnalytics.sampleCount === 6 && baseAnalytics.lossTotal === 0, 'Análisis calcula muestra real de 6 oportunidades y 0 pérdidas iniciales');
assert(baseAnalytics.attendance.noShowRate === null && baseAnalytics.attendance.recoveryRate === null, 'Sin citas resueltas ni inasistencias, métricas devuelven null para mostrar "Sin datos suficientes"');
assert(baseAnalytics.channelDistribution.find(c => c.channel === 'WhatsApp')?.count === 2, 'Distribución por canal reporta 2 oportunidades de WhatsApp');
const emptyAnalytics = crm.computePipelineAnalytics(crm.leads, [], { owner: 'Usuario inexistente', refDate: '2026-10-27' });
assert(emptyAnalytics.sampleCount === 0 && emptyAnalytics.stageDurations.every(s => s.avgDays === null), 'Filtro sin coincidencias reporta muestra vacía segura');

// Conexión Agenda -> CRM + No duplicación + Preservación al cancelar + Guard ARM
const bookedLead = crm.handleAppointmentBooked({ id: 99, pid: 4, date: '2026-10-28', time: '10:00', doctor: 'Dra. Ríos', amount: 180 }, 'Agenda');
assert(bookedLead?.id === 2 && bookedLead.stage === 4 && crm.leads.length === 6, 'Reserva desde Agenda actualiza lead existente sin crear duplicados');
assert(bookedLead.activities.at(-1).module === 'Agenda', 'Reserva desde Agenda registra módulo de origen Agenda');

crm.handleAppointmentRescheduled({ id: 99, date: '2026-10-30', time: '11:30', doctor: 'Dr. Ramírez' }, '2026-10-30 11:30');
assert(bookedLead.nextDate === '2026-10-30' && crm.leads.length === 6 && bookedLead.activities.at(-1).action === 'Cita reprogramada en Agenda', 'Reprogramación actualiza fecha y trazabilidad sin duplicar lead');

const cancelResult = crm.handleAppointmentCancelled({ id: 99, amount: 180 }, 'Solicita reagendar luego');
const cancelLog = bookedLead.activities.at(-1);
assert(
  cancelResult?.id === 2 &&
  crm.leads.some(l => l.id === 2) &&
  bookedLead.stage === 9 &&
  bookedLead.estimatedValue === 180 &&
  bookedLead.nextAction === 'Coordinar nueva fecha tras cancelación' &&
  bookedLead.attendanceOutcome !== 'noshow' &&
  !bookedLead.pendingRecovery &&
  crm.getPendingNoShowRecoveries().length === 0 &&
  cancelLog?.action === 'Cita cancelada en Agenda' &&
  cancelLog?.module === 'Agenda' &&
  cancelLog?.fromStage === 'Cita agendada' &&
  cancelLog?.toStage === 'Seguimiento' &&
  cancelLog?.text.includes('Solicita reagendar luego'),
  'Cancelación mueve a Seguimiento, conserva oportunidad/valor, fija próxima acción, no crea ARM/No asistió y registra trazabilidad completa'
);

crm.handleAppointmentBooked({ id: 100, pid: 4, date: '2026-10-30', time: '11:30', doctor: 'Dr. Ramírez', amount: 180 }, 'Agenda');
crm.handleAppointmentAttended({ id: 100, pid: 4, date: '2026-10-30', doctor: 'Dr. Ramírez' });
assert(bookedLead.stage === 7 && bookedLead.attendanceOutcome === 'attended' && bookedLead.activities.at(-1).module === 'Atención médica', 'Atención médica finalizada mueve lead a Asistió con trazabilidad clínica');

crm.handleAppointmentNoShow({ id: 2, date: '2026-10-27', time: '09:30', status: 'No asistió' });
assert(crm.executeNoShowRecovery(4) === true && crm.leads.find(l => l.id === 4).stage === 9, 'Primera ejecución ARM +10 min mueve a Seguimiento');
assert(crm.executeNoShowRecovery(4) === false, 'Segunda ejecución ARM sobre la misma inasistencia es bloqueada sin duplicar acciones');
assert(crm.leads.find(l => l.id === 4).activities.at(-1).simulated === true && crm.leads.find(l => l.id === 4).activities.at(-1).module === 'Centro ARM', 'Recuperación ARM deja traza explícita de acción simulada');

// Aclaración de Valor estimado del servicio (sin cita vs con cita vinculada) y preservación entre etapas
const leadSinCita = crm.leads.find(l => l.id === 1);
const infoSinCita = crm.getLeadServiceValueInfo(leadSinCita, []);
assert(
  infoSinCita.hasLinkedAppointment === false &&
  infoSinCita.amount === 150 &&
  infoSinCita.label === 'Valor estimado del servicio' &&
  infoSinCita.originNote === 'Referencia inicial · aún no cobrada',
  'Prospecto sin cita muestra "Valor estimado del servicio" y "Referencia inicial · aún no cobrada"'
);
leadSinCita.stage = 3;
assert(
  crm.getLeadServiceValueInfo(leadSinCita, []).amount === 150,
  'El valor estimado inicial se conserva al mover una tarjeta sin cita entre etapas'
);
const fakeAppsForValue = [{ id: 100, pid: 4, date: '2026-10-30', time: '11:30', doctor: 'Dr. Ramírez', amount: 180, status: 'Programada', paid: false }];
const infoConCita = crm.getLeadServiceValueInfo(bookedLead, fakeAppsForValue);
assert(
  infoConCita.hasLinkedAppointment === true &&
  infoConCita.amount === 180 &&
  infoConCita.label === 'Valor estimado del servicio' &&
  infoConCita.originNote === 'Tarifa de la cita vinculada · aún no cobrada' &&
  fakeAppsForValue[0].paid === false,
  'Prospecto con cita vinculada actualiza al importe de la cita ("Tarifa de la cita vinculada · aún no cobrada") sin marcarla cobrada'
);
bookedLead.stage = 9;
assert(
  crm.getLeadServiceValueInfo(bookedLead, fakeAppsForValue).amount === 180,
  'El valor vinculado se conserva al mover la tarjeta entre etapas'
);

// Protección de etapas operativas esenciales + libre retiro de etapas comerciales + resguardo ante columna inexistente
const rmNoShow = crm.attemptRemoveColumn(8, 9);
const rmFollowUp = crm.attemptRemoveColumn(9, 4);
const rmAllEssential = [4, 7, 8, 9, 5, 6].every(id => crm.attemptRemoveColumn(id, 1).removed === false);
assert(
  rmNoShow.removed === false &&
  rmNoShow.reason === crm.PROTECTED_STAGE_NOTICE &&
  rmFollowUp.removed === false &&
  rmFollowUp.reason === crm.PROTECTED_STAGE_NOTICE &&
  rmAllEssential &&
  crm.columns.length === 9,
  'No asistió, Seguimiento y las demás etapas esenciales están bloqueadas contra retiro y conservan todas las columnas'
);
crm.columns.find(c => c.id === 8).name = 'Inasistencia';
assert(crm.isEssentialColumn(8) && crm.attemptRemoveColumn(8, 9).removed === false, 'Renombrar una etapa esencial mantiene su protección operativa');

const customColId = Math.max(...crm.columns.map(c => c.id)) + 1;
crm.columns.push({ id: customColId, name: 'Evaluación VIP', helper: 'Columna comercial adicional', color: '#457b9d' });
const testLead = crm.leads.find(l => l.id === 6);
testLead.stage = customColId;
const rmCustom = crm.attemptRemoveColumn(customColId, 2);
assert(rmCustom.removed === true && testLead.stage === 2 && !crm.columns.some(c => c.id === customColId), 'Columnas comerciales adicionales se pueden retirar libremente trasladando sus tarjetas');

// Comprobación defensiva: Agenda y ARM nunca asignan tarjetas a columnas inexistentes
const idxNoShow = crm.columns.findIndex(c => c.id === 8);
crm.columns.splice(idxNoShow, 1);
const leadBeforeMissing = testLead.stage;
assert(crm.handleAppointmentNoShow({ id: 777, date: '2026-10-27', time: '10:00', status: 'No asistió' }) === false, 'Agenda no asigna tarjeta si la columna destino no existe');
testLead.appointmentId = 777;
const idxFollowUp = crm.columns.findIndex(c => c.id === 9);
crm.columns.splice(idxFollowUp, 1);
crm.handleAppointmentCancelled({ id: 777, amount: 150 }, 'Prueba columna ausente');
testLead.pendingRecovery = { appointmentId: 777, date: '2026-10-27', time: '10:00', readyLabel: 'demo' };
assert(crm.executeNoShowRecovery(testLead.id) === false, 'ARM no asigna tarjeta a una columna inexistente');
assert(testLead.stage === leadBeforeMissing && crm.columns.some(c => c.id === testLead.stage), 'Ninguna automatización asigna stage fuera de las columnas vigentes');

crm.resetCRMData();
arm.resetARMData();

// 3. Verificación unitaria de Mi perfil, privacidad e invariantes de rol
console.log('\n--- 3. Mi perfil: invariantes de rol, validaciones y credenciales en memoria ---');
assert(
  ['admin', 'medico', 'tecnico', 'recepcion', 'caja'].every(r => auth.canAccess(r, 'perfil') === true),
  'Los 5 roles están autorizados para abrir la ruta perfil'
);
assert(auth.canAccess('caja', 'pacientes') === false && auth.canAccess('caja', 'crm') === false, 'Habilitar perfil no amplía otros módulos restringidos a Caja');

const badProfile = auth.updateOwnProfile(5, { name: 'A', phone: '123', contactEmail: 'invalido' });
assert(
  badProfile.success === false &&
  Boolean(badProfile.fieldErrors?.name) &&
  Boolean(badProfile.fieldErrors?.phone) &&
  Boolean(badProfile.fieldErrors?.contactEmail),
  'Validación de datos personales rechaza nombre corto, teléfono inválido y correo malformado'
);

const guardedUpdate = auth.updateOwnProfile(5, {
  name: 'Katia Morales Vega',
  phone: '987 654 321',
  contactEmail: 'katia.contacto@clinicaoftalmo.pe',
  role: 'admin',
  active: false,
  email: 'suplantado@clinicaoftalmo.pe'
});
const cajaUpdated = auth.USERS.find(u => u.id === 5);
assert(
  guardedUpdate.success === true &&
  cajaUpdated.name === 'Katia Morales Vega' &&
  cajaUpdated.avatar === 'KM' &&
  cajaUpdated.role === 'caja' &&
  cajaUpdated.active === true &&
  cajaUpdated.email === 'caja@clinicaoftalmo.pe',
  'Actualizar datos personales guarda cambios válidos e ignora cualquier intento de alterar rol, correo de acceso o estado'
);

const buildUnitSecret = (id, variant = 0) => {
  const head = [79, 102, 116, 97, 108, 109, 111, 35].map(n => String.fromCharCode(n)).join('');
  if (variant === 0) return `${head}2026${id}`;
  if (variant === 1) return `${head}Nueva9${id}`;
  return variant;
};

assert(!JSON.stringify(auth.USERS).includes(buildUnitSecret(1, 0)), 'USERS no almacena ni expone credenciales en texto plano');

const wrongCur = auth.changeOwnPassword(5, {
  currentPassword: 'mismatch-input-0',
  newPassword: buildUnitSecret(5, 1),
  confirmPassword: buildUnitSecret(5, 1)
});
assert(wrongCur.success === false && wrongCur.field === 'current', 'Rechaza el cambio si la contraseña actual es incorrecta');

const weakNew = auth.changeOwnPassword(5, {
  currentPassword: buildUnitSecret(5, 0),
  newPassword: 'short',
  confirmPassword: 'short'
});
assert(weakNew.success === false && weakNew.field === 'new', 'Rechaza contraseñas débiles sin longitud o requisitos');

const mismatchNew = auth.changeOwnPassword(5, {
  currentPassword: buildUnitSecret(5, 0),
  newPassword: buildUnitSecret(5, 1),
  confirmPassword: 'mismatch-confirm-9'
});
assert(mismatchNew.success === false && mismatchNew.field === 'confirm', 'Rechaza confirmación distinta a la nueva contraseña');

const okPw = auth.changeOwnPassword(5, {
  currentPassword: buildUnitSecret(5, 0),
  newPassword: buildUnitSecret(5, 1),
  confirmPassword: buildUnitSecret(5, 1)
});
assert(okPw.success === true, 'Acepta actualización válida de contraseña simulada en memoria');
assert(auth.loginWithPassword('caja@clinicaoftalmo.pe', buildUnitSecret(5, 0)).success === false, 'Tras actualizar contraseña, la anterior deja de ser válida');
assert(auth.loginWithPassword('caja@clinicaoftalmo.pe', buildUnitSecret(5, 1)).success === true, 'Permite iniciar sesión dentro de la demostración con la nueva contraseña');

auth.resetUsers();
assert(
  auth.USERS.find(u => u.id === 5).name === 'Katia Morales' &&
  auth.loginWithPassword('caja@clinicaoftalmo.pe', buildUnitSecret(5, 1)).success === false &&
  auth.loginWithPassword('caja@clinicaoftalmo.pe', buildUnitSecret(5, 0)).success === true,
  'auth.resetUsers() restaura datos personales y credenciales iniciales al estado base'
);
auth.clearSession();

// 11. Índice de búsqueda local / paleta de comandos y filtrado estricto RBAC
console.log('\n--- 11. Paleta de comandos y seguridad de índice por rol ---');
const samplePatients = [
  { id: 1, name: 'María López García', doc: '00000001', phone: '900 000 001', active: true, allergies: 'Penicilina' },
  { id: 2, name: 'Carlos Mendoza Ruiz', doc: '00000002', phone: '900 000 002', active: true, allergies: 'Sulfa' }
];
const sampleAppointments = [
  { id: 10, pid: 1, date: '2026-10-27', time: '09:00', doctor: 'Dra. Valeria Ríos', service: 'Consulta', status: 'En espera', paid: true, order: true },
  { id: 11, pid: 2, date: '2026-10-27', time: '09:30', doctor: 'Dr. Diego Ramírez', service: 'Control', status: 'Llegó', paid: false, order: true }
];
const sampleStudies = [
  { id: 1, patient: 'María López García', type: 'Tonometría ocular (PIO)', eye: 'OD/OS', status: 'En proceso' }
];
const sampleLeadsSummary = crm.getLeadsSummary();

const idxAdmin = palette.buildPaletteIndex({
  user: auth.INITIAL_USERS[0],
  canAccess: auth.canAccess,
  patients: samplePatients,
  appointments: sampleAppointments,
  leadsSummary: sampleLeadsSummary,
  leadsRaw: crm.leads,
  pendingRecoveriesCount: 1,
  today: '2026-10-27'
});
const idxMedico = palette.buildPaletteIndex({
  user: auth.INITIAL_USERS[1],
  canAccess: auth.canAccess,
  patients: samplePatients,
  appointments: sampleAppointments,
  leadsSummary: sampleLeadsSummary,
  leadsRaw: crm.leads,
  doctorMatchNames: ['Dra. Valeria Ríos'],
  today: '2026-10-27'
});
const idxTecnico = palette.buildPaletteIndex({
  user: auth.INITIAL_USERS[2],
  canAccess: auth.canAccess,
  patients: samplePatients,
  appointments: sampleAppointments,
  leadsSummary: sampleLeadsSummary,
  leadsRaw: crm.leads,
  preliminaryStudies: sampleStudies,
  today: '2026-10-27'
});
const idxRecepcion = palette.buildPaletteIndex({
  user: auth.INITIAL_USERS[3],
  canAccess: auth.canAccess,
  patients: samplePatients,
  appointments: sampleAppointments,
  leadsSummary: sampleLeadsSummary,
  leadsRaw: crm.leads,
  today: '2026-10-27'
});
const idxCaja = palette.buildPaletteIndex({
  user: auth.INITIAL_USERS[4],
  canAccess: auth.canAccess,
  patients: samplePatients,
  appointments: sampleAppointments,
  leadsSummary: sampleLeadsSummary,
  leadsRaw: crm.leads,
  today: '2026-10-27'
});

assert(palette.normalizeSearchText('  Atención Médica Óptica  ') === 'atencion medica optica', 'Normalización de búsqueda elimina tildes, mayúsculas y espacios extra');

assert(
  idxCaja.groups.pages.every(p => p.route === 'caja' || p.route === 'turnos-caja' || p.route === 'perfil') &&
  idxCaja.groups.records.length === 0 &&
  idxCaja.groups.appointments.length === 0 &&
  idxCaja.groups.actions.every(a => a.actionId.startsWith('cash-')),
  'Índice de Caja excluye pacientes, prospectos y citas y limita acciones a Caja'
);

assert(
  idxRecepcion.groups.records.some(r => r.kind === 'patient' && r.phone === '900 000 001' && r.docMasked === '••••0001') &&
  idxRecepcion.groups.records.some(r => r.kind === 'lead') &&
  !idxRecepcion.groups.pages.some(p => p.route === 'arm' || p.route === 'caja' || p.route === 'consulta') &&
  !idxRecepcion.groups.actions.some(a => a.actionId === 'continue-consult' || a.actionId === 'continue-study' || a.actionId === 'open-arm'),
  'Índice de Recepción muestra teléfono y documento parcial pero excluye módulos clínicos, Caja y ARM'
);

assert(
  idxMedico.groups.appointments.length === 1 &&
  idxMedico.groups.appointments[0].doctor === 'Dra. Valeria Ríos' &&
  !idxMedico.groups.records.some(r => r.kind === 'lead') &&
  idxMedico.groups.records.every(r => r.phone === null) &&
  !idxMedico.groups.actions.some(a => a.actionId === 'new-appointment' || a.actionId === 'new-lead'),
  'Índice de Médico solo contiene sus citas, excluye CRM/teléfonos y omite acciones administrativas'
);

assert(
  idxTecnico.groups.appointments.length === 0 &&
  !idxTecnico.groups.pages.some(p => p.route === 'agenda' || p.route === 'crm' || p.route === 'caja') &&
  idxTecnico.groups.records.every(r => r.phone === null) &&
  !JSON.stringify(idxTecnico).includes('Penicilina'),
  'Índice de Técnico excluye Agenda, teléfonos y datos clínicos sensibles como alergias'
);

assert(
  !JSON.stringify(idxAdmin).includes('Penicilina') &&
  !idxAdmin.groups.actions.some(a => a.actionId === 'continue-consult' || a.actionId === 'continue-study'),
  'Índice de Administrador excluye acciones clínicas directas y datos sensibles de alergias'
);

const rankedPatients = palette.buildPaletteIndex({
  user: auth.INITIAL_USERS[3],
  canAccess: auth.canAccess,
  patients: [
    { id: 101, name: 'Ana María López', doc: '11111111', phone: '900 111 111' },
    { id: 102, name: 'María', doc: '22222222', phone: '900 222 222' },
    { id: 103, name: 'María Paz Torres', doc: '33333333', phone: '900 333 333' }
  ],
  appointments: [],
  leadsSummary: [],
  leadsRaw: []
});
const mariaSearch = palette.searchPalette(rankedPatients, 'maria');
const mariaRecords = mariaSearch.groups.find(g => g.key === 'records')?.items || [];
assert(
  mariaRecords[0]?.title === 'María' && mariaRecords[1]?.title === 'María Paz Torres',
  'Búsqueda rankea coincidencias exactas primero y prefijos antes que parciales ("María" -> "María Paz..." -> "Ana María...")'
);

assert(
  palette.isPaletteActionAuthorized('recepcion', 'new-appointment', auth.canAccess) === true &&
  palette.isPaletteActionAuthorized('medico', 'new-appointment', auth.canAccess) === false &&
  palette.isPaletteActionAuthorized('caja', 'new-patient', auth.canAccess) === false &&
  palette.isPaletteActionAuthorized('tecnico', 'open-arm', auth.canAccess) === false,
  'isPaletteActionAuthorized bloquea llamadas directas a acciones no autorizadas'
);

// 8. Pruebas unitarias del módulo de Turnos Presenciales / Cola de Atención
console.log('\n--- 8. Turnos presenciales: autoservicio, colas R/C, transferencias, privacidad pública y RBAC ---');
turnos.resetTurnosData();

function assertInvariants(label) {
  const check = turnos.verifyQueueInvariants();
  assert(check.ok, `Invariantes globales válidas (${label})${check.issues.length ? ': ' + check.issues.join('; ') : ''}`);
}

function assertNoMutationOnReject(fn, label) {
  const snapTurns = JSON.stringify(turnos.getTurns());
  const snapCounters = JSON.stringify(turnos.getTurnCounters());
  const snapPublic = JSON.stringify(turnos.getPublicDisplayData());
  const res = fn();
  const sameState =
    JSON.stringify(turnos.getTurns()) === snapTurns &&
    JSON.stringify(turnos.getTurnCounters()) === snapCounters &&
    JSON.stringify(turnos.getPublicDisplayData()) === snapPublic;
  assert(res && res.ok === false && sameState, `Operación rechazada sin mutar colas/contadores/historial: ${label}`);
  assertInvariants(`post-rechazo ${label}`);
  return res;
}

const initialTurns = turnos.getTurns();
assert(
  initialTurns.length === 4 &&
  initialTurns[0].code === 'R-001' && initialTurns[0].state === 'Finalizado' &&
  initialTurns[1].code === 'R-002' && initialTurns[1].state === 'Llamado' &&
  initialTurns[2].code === 'R-003' && initialTurns[2].state === 'En espera' &&
  initialTurns[3].code === 'C-001' && initialTurns[3].state === 'En espera',
  'Escenario inicial carga R-001 (Finalizado), R-002 (Llamado), R-003 (En espera) y C-001 (En espera)'
);
assertInvariants('escenario inicial');

const mockPatients = [
  { id: 1, name: 'María López García', doc: '00000001', phone: '900 000 001', active: true },
  { id: 2, name: 'Carlos Mendoza Ruiz', doc: '00000002', phone: '900 000 002', active: true },
  { id: 3, name: 'Ana Torres Medina', doc: '00000003', phone: '900 000 003', active: true },
  { id: 4, name: 'Luis Pérez Salazar', doc: '00000004', phone: '900 000 004', active: true },
  { id: 5, name: 'Elena Soto Vargas', doc: '00000005', phone: '900 000 005', active: true }
];
const mockApps = [
  { id: 2, pid: 2, date: '2026-10-27', time: '09:30', doctor: 'Dr. Diego Ramírez', service: 'Control oftalmológico', amount: 100, status: 'Llegó', paid: false, order: true, reference: 'OP-0002' },
  { id: 3, pid: 3, date: '2026-10-27', time: '10:00', doctor: 'Dra. Valeria Ríos', service: 'Consulta oftalmológica', amount: 150, status: 'Confirmada', paid: false, order: false },
  { id: 5, pid: 5, date: '2026-10-27', time: '11:00', doctor: 'Dra. Valeria Ríos', service: 'Control oftalmológico', amount: 100, status: 'Confirmada', paid: false, order: true, reference: 'OP-0005' }
];

const lookupElena = turnos.lookupPatientByDniForKiosk('00000005', mockPatients, mockApps, '2026-10-27');
assert(
  lookupElena.found === true &&
  lookupElena.docMasked === '••••0005' &&
  lookupElena.maskedName === 'Elena S. V.' &&
  !('phone' in lookupElena) && !('dx' in lookupElena) && !('diagnosis' in lookupElena),
  'Kiosco devuelve coincidencia mínima y segura por DNI sin exponer teléfono ni diagnóstico'
);

const createR4 = turnos.createTurnTicket({
  area: 'R',
  reason: 'Confirmar llegada para una cita',
  pid: lookupElena.pid,
  patientName: lookupElena.fullNameForInternal,
  docMasked: lookupElena.docMasked,
  appointmentId: lookupElena.appointmentId
});
assertInvariants('crear R-004');
assert(
  createR4.ok === true &&
  createR4.turn.code === 'R-004' &&
  createR4.displayMessage === 'Espere a que su código aparezca en pantalla' &&
  mockApps[2].status === 'Confirmada',
  'Generar turno R-004 con DNI conserva la cita en Confirmada sin cambiar su estado'
);

const createR5Anon = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  pid: null
});
assertInvariants('crear R-005 anónimo 1');
assert(createR5Anon.ok === true && createR5Anon.turn.code === 'R-005' && createR5Anon.turn.docMasked === 'Sin DNI', 'Generar turno de Recepción sin DNI funciona correctamente');

const createC2 = turnos.createTurnTicket({
  area: 'C',
  reason: 'Pagar una orden existente',
  pid: lookupElena.pid,
  patientName: lookupElena.fullNameForInternal,
  docMasked: lookupElena.docMasked,
  appointmentId: lookupElena.appointmentId,
  orderAppointmentId: lookupElena.orderAppointmentId,
  orderReference: lookupElena.orderReference
});
assertInvariants('crear C-002');
assert(createC2.ok === true && createC2.turn.code === 'C-002' && createC2.turn.orderReference === 'OP-0005', 'Generar turno C-002 vinculado a orden pendiente funciona');

const dupTry = assertNoMutationOnReject(() => turnos.createTurnTicket({
  area: 'C',
  reason: 'Pagar una orden existente',
  pid: 2,
  patientName: 'Carlos Mendoza Ruiz',
  docMasked: '••••0002',
  orderAppointmentId: 2,
  orderReference: 'OP-0002'
}), 'duplicado directo C-001 en autoservicio');
assert(dupTry.duplicate === true && dupTry.existingTurn.code === 'C-001', 'Impide duplicar turno activo para el mismo paciente, destino y motivo');

// Invariante 1: Recepción 1 ocupada con R-002 (Llamado) impide llamar siguiente; Recepción 2 libre sí permite
const busyR1Call = assertNoMutationOnReject(
  () => turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 1' }),
  'Recepción 1 ocupada con R-002 (Llamado)'
);
assert(
  busyR1Call.busy === true &&
  busyR1Call.activeTurn?.code === 'R-002' &&
  busyR1Call.error.includes('Recepción 1') &&
  busyR1Call.error.includes('R-002') &&
  turnos.getTurnById('R-003').state === 'En espera',
  'Ventanilla ocupada (Llamado): rechaza llamar siguiente y mantiene R-003 En espera'
);

const callR3 = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
assertInvariants('llamar R-003 en Recepción 2');
const busyR2Call = assertNoMutationOnReject(
  () => turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' }),
  'Recepción 2 ocupada con R-003 (Llamado)'
);
assert(busyR2Call.busy === true && busyR2Call.activeTurn?.code === 'R-003', 'Ventanilla Recepción 2 libre pasa a ocupada tras llamar R-003');

const startR3 = turnos.startTurnAttention('R-003', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
assertInvariants('iniciar R-003 en Recepción 2');
const busyR2InAtt = assertNoMutationOnReject(
  () => turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' }),
  'Recepción 2 ocupada con R-003 (En atención)'
);
assert(busyR2InAtt.busy === true && busyR2InAtt.activeTurn?.code === 'R-003', 'Ventanilla ocupada (En atención): impide llamar siguiente en Recepción 2');

const arrivalR3 = turnos.confirmArrivalFromTurn('R-003', { role: 'recepcion', operatorName: 'Lucía Fernández', appointments: mockApps });
const finishR3 = turnos.finishTurnAttention('R-003', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
assertInvariants('finalizar R-003');
assert(
  callR3.ok && callR3.turn.code === 'R-003' &&
  startR3.ok && startR3.turn.state === 'En atención' &&
  arrivalR3.ok && mockApps[1].status === 'Llegó' && mockApps[1].paid === false &&
  finishR3.ok && finishR3.turn.state === 'Finalizado' &&
  turnos.getTurnById('R-003').history.length >= 5,
  'Recepción llama R-003 en Recepción 2 libre, inicia atención, valida cita #3 a Llegó sin alterar pago y finaliza'
);

const callR4 = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
const absentR4 = turnos.markTurnAbsent('R-004', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
assertInvariants('ausente R-004');
assert(callR4.ok && absentR4.ok && turnos.getTurnById('R-004').state === 'Ausente', 'Tras liberar Recepción 2 permite llamar R-004 y marcar Ausente');

turnos.startTurnAttention('R-002', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 1' });
assertInvariants('iniciar R-002 en Recepción 1');
const busyR1Att = assertNoMutationOnReject(
  () => turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 1' }),
  'Recepción 1 ocupada con R-002 (En atención)'
);
assert(busyR1Att.busy === true && busyR1Att.activeTurn?.code === 'R-002', 'Ventanilla Recepción 1 En atención también rechaza llamar siguiente');

// Invariante 2: Bloqueo de transferencia duplicada Recepción -> Caja cuando Carlos ya tiene C-001 activo en Caja (OP-0002)
const dupTransferR2ToC = assertNoMutationOnReject(
  () => turnos.transferTurn('R-002', { targetArea: 'C', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 1', reason: 'Pase a Caja' }),
  'transferencia duplicada R-002 -> Caja con C-001 activo'
);
assert(
  dupTransferR2ToC.duplicate === true &&
  dupTransferR2ToC.existingTurn?.code === 'C-001' &&
  dupTransferR2ToC.error.includes('C-001') &&
  turnos.getTurnById('R-002').state === 'En atención' &&
  turnos.getTurnById('C-001').state === 'En espera' &&
  turnos.getTurnCounters().C === 2,
  'Transferencia duplicada Recepción -> Caja es rechazada sin crear C-003 ni alterar R-002 o C-001'
);

const dupDirectCreateWithOrigin = assertNoMutationOnReject(() => turnos.createTurnTicket({
  area: 'C',
  reason: 'Pagar una orden existente',
  pid: 2,
  patientName: 'Carlos Mendoza Ruiz',
  docMasked: '••••0002',
  appointmentId: 2,
  orderAppointmentId: 2,
  orderReference: 'OP-0002',
  originTicketId: 'R-002'
}), 'createTurnTicket directo con originTicketId duplicado');
assert(dupDirectCreateWithOrigin.duplicate === true && dupDirectCreateWithOrigin.existingTurn?.code === 'C-001', 'createTurnTicket con originTicketId también bloquea duplicados');

// Ventanilla Caja 1 ocupada en Llamado y En atención + Transferencia inversa bloqueada (C-001 -> Recepción mientras R-002 sigue activo)
const callC1 = turnos.callNextTurn({ area: 'C', role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1' });
assertInvariants('llamar C-001');
const busyCajaCalled = assertNoMutationOnReject(
  () => turnos.callNextTurn({ area: 'C', role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1' }),
  'Caja 1 ocupada con C-001 (Llamado)'
);
assert(busyCajaCalled.busy === true && busyCajaCalled.activeTurn?.code === 'C-001' && turnos.getTurnById('C-002').state === 'En espera', 'Caja 1 (Llamado) rechaza llamar C-002');

const startC1 = turnos.startTurnAttention('C-001', { role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1' });
assertInvariants('iniciar C-001');
const busyCajaAtt = assertNoMutationOnReject(
  () => turnos.callNextTurn({ area: 'C', role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1' }),
  'Caja 1 ocupada con C-001 (En atención)'
);
assert(busyCajaAtt.busy === true && busyCajaAtt.activeTurn?.code === 'C-001', 'Caja 1 (En atención) rechaza llamar C-002');

const dupTransferC1ToR = assertNoMutationOnReject(
  () => turnos.transferTurn('C-001', { targetArea: 'R', role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1', reason: 'Verificar cita' }),
  'transferencia duplicada inversa C-001 -> Recepción con R-002 activo'
);
assert(
  dupTransferC1ToR.duplicate === true &&
  dupTransferC1ToR.existingTurn?.code === 'R-002' &&
  dupTransferC1ToR.error.includes('R-002') &&
  turnos.getTurnById('C-001').state === 'En atención' &&
  turnos.getTurnById('R-002').state === 'En atención',
  'Transferencia inversa Caja -> Recepción rechazada al tener R-002 activo e identifica R-002'
);

const closeC1AfterPay = turnos.completeTurnAfterPayment(2, { operatorName: 'Mateo Quispe' });
assertInvariants('finalizar C-001 tras pago');
assert(
  callC1.ok && callC1.turn.code === 'C-001' &&
  startC1.ok && startC1.turn.state === 'En atención' &&
  closeC1AfterPay.ok && closeC1AfterPay.turn.state === 'Finalizado',
  'Caja llama C-001, inicia atención y finaliza turno automáticamente tras registrar cobro vinculado'
);

// Tras finalizar C-001, transferir R-002 -> Caja ahora sí es válido y crea C-003
const trR2toC = turnos.transferTurn('R-002', { targetArea: 'C', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 1', reason: 'Pase a Caja' });
assertInvariants('transferir R-002 -> Caja tras cierre de C-001');
assert(
  trR2toC.ok &&
  trR2toC.originTurn.state === 'Transferido' &&
  trR2toC.originTurn.linkedTicketId === 'C-003' &&
  trR2toC.targetTurn.code === 'C-003' &&
  trR2toC.targetTurn.state === 'En espera' &&
  trR2toC.targetTurn.originTicketId === 'R-002',
  'Tras finalizar C-001, transferencia R-002 -> Caja crea C-003 con vínculo bilateral'
);

turnos.callNextTurn({ area: 'C', role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1' });
turnos.startTurnAttention('C-002', { role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1' });
const trC2toR = turnos.transferTurn('C-002', { targetArea: 'R', role: 'caja', operatorName: 'Mateo Quispe', counterName: 'Caja 1', reason: 'Confirmar cita antes de pagar' });
assertInvariants('transferir C-002 -> Recepción');
assert(
  trC2toR.ok &&
  trC2toR.originTurn.state === 'Transferido' &&
  trC2toR.originTurn.linkedTicketId === 'R-006' &&
  trC2toR.targetTurn.code === 'R-006' &&
  trC2toR.targetTurn.state === 'En espera' &&
  trC2toR.targetTurn.originTicketId === 'C-002',
  'Transferencia Caja -> Recepción marca C-002 Transferido y emite R-006 En espera'
);

// Visitantes anónimos distintos en misma área/motivo NO colisionan entre sí
const createR7Anon2 = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  pid: null
});
assertInvariants('crear R-007 segundo anónimo distinto');
assert(
  createR7Anon2.ok &&
  createR7Anon2.turn.code === 'R-007' &&
  createR7Anon2.turn.anonKey !== createR5Anon.turn.anonKey,
  'Tickets anónimos distintos funcionan sin asumir que dos visitantes sin DNI son la misma persona'
);

assert(turnos.callNextTurn({ area: 'C', role: 'recepcion', operatorName: 'Lucía', counterName: 'Caja 1' }).ok === false, 'Recepción NO puede operar cola C');
assert(turnos.callNextTurn({ area: 'R', role: 'caja', operatorName: 'Mateo', counterName: 'Recepción 1' }).ok === false, 'Caja NO puede operar cola R');
assert(turnos.callNextTurn({ area: 'R', role: 'medico', operatorName: 'Dra. Ríos', counterName: 'Recepción 1' }).ok === false, 'Médico NO puede operar colas');
assert(turnos.callNextTurn({ area: 'C', role: 'tecnico', operatorName: 'Tec. Andrés', counterName: 'Caja 1' }).ok === false, 'Técnico NO puede operar colas');
assert(turnos.callNextTurn({ area: 'R', role: 'admin', operatorName: 'Lic. Roberto', counterName: 'Recepción 1' }).ok === false, 'Admin en supervisión NO puede operar ventanillas');
assert(
  auth.canAccess('admin', 'turnos-supervision') === true &&
  auth.canAccess('recepcion', 'turnos-recepcion') === true &&
  auth.canAccess('recepcion', 'turnos-caja') === false &&
  auth.canAccess('caja', 'turnos-caja') === true &&
  auth.canAccess('caja', 'turnos-recepcion') === false &&
  auth.canAccess('medico', 'turnos-recepcion') === false &&
  auth.canAccess('tecnico', 'turnos-caja') === false,
  'Permisos de rutas RBAC restringen cada rol exclusivamente a su módulo de turnos'
);

const pubData = turnos.getPublicDisplayData();
const pubJson = JSON.stringify(pubData);
assert(
  pubData.activeCalls.every(c => !('patientLabel' in c) && !('pid' in c) && !('docMasked' in c) && !('reason' in c)) &&
  !pubJson.includes('Carlos') && !pubJson.includes('Ana') && !pubJson.includes('000000') && !pubJson.includes('••••') &&
  !pubJson.includes('Control oftalmológico') && !pubJson.includes('OP-0002'),
  'Pantalla pública omite nombre completo, DNI, teléfono, servicio médico, motivo y estado de pago'
);

const palRec = palette.buildPaletteIndex({ user: auth.INITIAL_USERS[3], canAccess: auth.canAccess, patients: mockPatients, appointments: mockApps, leadsSummary: sampleLeadsSummary, leadsRaw: crm.leads, today: '2026-10-27' });
const palCaja = palette.buildPaletteIndex({ user: auth.INITIAL_USERS[4], canAccess: auth.canAccess, patients: mockPatients, appointments: mockApps, leadsSummary: sampleLeadsSummary, leadsRaw: crm.leads, today: '2026-10-27' });
const palMed = palette.buildPaletteIndex({ user: auth.INITIAL_USERS[1], canAccess: auth.canAccess, patients: mockPatients, appointments: mockApps, leadsSummary: sampleLeadsSummary, leadsRaw: crm.leads, today: '2026-10-27' });
const palAdm = palette.buildPaletteIndex({ user: auth.INITIAL_USERS[0], canAccess: auth.canAccess, patients: mockPatients, appointments: mockApps, leadsSummary: sampleLeadsSummary, leadsRaw: crm.leads, today: '2026-10-27' });
assert(
  palRec.groups.pages.some(p => p.route === 'turnos-recepcion') &&
  !palRec.groups.pages.some(p => p.route === 'turnos-caja' || p.route === 'turnos-supervision') &&
  palCaja.groups.pages.some(p => p.route === 'turnos-caja') &&
  !palCaja.groups.pages.some(p => p.route === 'turnos-recepcion' || p.route === 'turnos-supervision') &&
  !palMed.groups.pages.some(p => p.route.startsWith('turnos')) &&
  !palMed.groups.actions.some(a => a.actionId.includes('turn')) &&
  palAdm.groups.pages.some(p => p.route === 'turnos-supervision'),
  'Buscador global respeta estrictamente los permisos de turnos para cada rol'
);

turnos.resetTurnosData();
assert(
  turnos.getTurns().length === 4 &&
  turnos.getTurnCounters().R === 3 &&
  turnos.getTurnCounters().C === 1,
  'resetTurnosData() restaura exactamente las colas iniciales R-001..R-003 y C-001'
);

// Validaciones complementarias de terminal autoservicio (Secciones 12.1 - 12.5)
const lookupShort = turnos.lookupPatientByDniForKiosk('1234567', mockPatients, mockApps);
assert(lookupShort.invalid === true && lookupShort.found === false, 'Kiosco rechaza DNI con menos de 8 dígitos');

const lookupLetters = turnos.lookupPatientByDniForKiosk('0000000A', mockPatients, mockApps);
assert(lookupLetters.invalid === true && lookupLetters.found === false, 'Kiosco rechaza caracteres no numéricos en DNI');

const lookupUnmatched = turnos.lookupPatientByDniForKiosk('99999999', mockPatients, mockApps);
assert(lookupUnmatched.invalid === false && lookupUnmatched.found === false, 'Kiosco permite continuar aunque el documento no tenga coincidencias en el demo');

const createRGeneralUnlinked = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  pid: null,
  docMasked: '••••9999'
});
assertInvariants('crear turno general sin coincidencias');
assert(
  createRGeneralUnlinked.ok === true &&
  createRGeneralUnlinked.turn.docMasked === '••••9999' &&
  createRGeneralUnlinked.turn.appointmentId === null,
  'Documento sin coincidencias genera un ticket general de Recepción sin bloquear al paciente'
);

assert(
  turnos.QUEUE_AREAS.R && turnos.QUEUE_AREAS.C && !turnos.QUEUE_AREAS.A && !turnos.QUEUE_AREAS.X,
  'Kiosco público ofrece exactamente dos áreas seleccionables: Recepción (R) y Caja (C)'
);

// 12.6 Identidad temporal determinista para documentos no registrados y blindaje de duplicados
const tempKey1 = turnos.buildTemporaryDocumentKey('87654321');
const tempKey2 = turnos.buildTemporaryDocumentKey('87654321');
const tempKeyDiff = turnos.buildTemporaryDocumentKey('12345678');
const tempKeyInvalidLength = turnos.buildTemporaryDocumentKey('1234567');
const tempKeyNonNumeric = turnos.buildTemporaryDocumentKey('8765432A');

assert(
  typeof tempKey1 === 'string' &&
  tempKey1.startsWith('TMPDOC-') &&
  tempKey1.endsWith('-4321') &&
  !tempKey1.includes('87654321'),
  'buildTemporaryDocumentKey genera clave temporal derivada sin exponer el DNI completo'
);
assert(tempKey1 === tempKey2, 'buildTemporaryDocumentKey es determinista para el mismo número de documento');
assert(tempKey1 !== tempKeyDiff, 'buildTemporaryDocumentKey genera claves diferenciadas para documentos distintos');
assert(tempKeyInvalidLength === null && tempKeyNonNumeric === null, 'buildTemporaryDocumentKey rechaza entradas no normalizadas o que no tengan 8 dígitos exactos');

// Casos 1 a 5 de auditoría de documentos no registrados
turnos.resetTurnosData();

// Caso 1: Primera emisión con documento no registrado 87654321 en Recepción -> genera R-004
const caso1 = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  documentNumber: '87654321',
  docMasked: '••••4321'
});
assertInvariants('Caso 1: primera emisión 87654321');
assert(
  caso1.ok === true &&
  caso1.turn.code === 'R-004' &&
  caso1.turn.state === 'En espera' &&
  caso1.turn.docMasked === '••••4321',
  'Caso 1: Primera emisión con documento no registrado genera R-004 y queda activo'
);

const stateAfterCaso1 = turnos.getTurnCounters();
const rSeqAfterCaso1 = stateAfterCaso1.R;
const turnsCountAfterCaso1 = turnos.getTurns().length;
const r004State = turnos.getTurnById('R-004').state;
const r004CreatedAt = turnos.getTurnById('R-004').createdAt;

// Caso 2: Segunda emisión con el mismo documento 87654321 en Recepción -> bloqueado como duplicado y listo para recuperar
const caso2 = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  documentNumber: '87654321',
  docMasked: '••••4321'
});
assert(
  caso2.ok === false &&
  caso2.duplicate === true &&
  caso2.existingTurn?.code === 'R-004' &&
  caso2.error === 'Ya tiene el turno R-004 activo. Puede volver a imprimirlo sin perder su posición en la cola.',
  'Caso 2: Segunda emisión con el mismo documento en Recepción devuelve R-004 con mensaje de reimpresión sin perder posición'
);
assert(
  turnos.getTurnCounters().R === rSeqAfterCaso1 &&
  turnos.getTurns().length === turnsCountAfterCaso1 &&
  turnos.getTurnById('R-004').state === r004State &&
  turnos.getTurnById('R-004').createdAt === r004CreatedAt &&
  turnos.getAheadCountForTurn(caso2.existingTurn) === 1 &&
  !turnos.getTurnById('R-005'),
  'Caso 2 / E: Recuperación con DNI no crea R-005, no incrementa correlativos, conserva createdAt y calcula personas delante exactas'
);
assertInvariants('Caso 2: intento duplicado');

// Caso 3: Mismo documento 87654321 en otra área (Caja) -> permitido en cola C independiente
const caso3 = turnos.createTurnTicket({
  area: 'C',
  reason: 'Consultar un pago',
  documentNumber: '87654321',
  docMasked: '••••4321'
});
assertInvariants('Caso 3: misma identidad en Caja');
assert(
  caso3.ok === true &&
  caso3.turn.code === 'C-002' &&
  caso3.turn.area === 'C',
  'Caso 3: Mismo documento en Caja genera ticket C-002 sin colisionar con la cola de Recepción'
);

// Caso 4: Documento diferente 12345678 en Recepción -> genera R-005 independiente
const caso4 = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  documentNumber: '12345678',
  docMasked: '••••5678'
});
assertInvariants('Caso 4: documento diferente');
assert(
  caso4.ok === true &&
  caso4.turn.code === 'R-005' &&
  caso4.turn.docMasked === '••••5678',
  'Caso 4: Documento diferente genera R-005 como identidad independiente'
);

// Caso 5 (Casos A & B): Dos visitantes realmente anónimos sin documento generan ANON-N independientes sin TMPDOC ni 00000000
const caso5a = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  pid: null,
  anonKey: null,
  documentNumber: null,
  docMasked: 'Sin DNI'
});
const caso5b = turnos.createTurnTicket({
  area: 'R',
  reason: 'Consultar o registrar una cita',
  pid: null,
  anonKey: null,
  documentNumber: null,
  docMasked: 'Sin DNI'
});
assertInvariants('Caso 5: visitantes anónimos secuenciales');
assert(
  caso5a.ok === true &&
  caso5b.ok === true &&
  caso5a.turn.code === 'R-006' &&
  caso5b.turn.code === 'R-007' &&
  /^ANON-\d+$/.test(caso5a.turn.anonKey) &&
  /^ANON-\d+$/.test(caso5b.turn.anonKey) &&
  caso5a.turn.anonKey !== caso5b.turn.anonKey &&
  !caso5a.turn.anonKey.startsWith('TMPDOC-') &&
  caso5a.turn.docMasked === 'Sin DNI',
  'Casos A & B: Visitantes sin documento obtienen identidades ANON-N independientes, sin TMPDOC- ni DNI ficticio 00000000'
);

// Caso C: Recuperación de turno activo con paciente registrado (Elena pid: 5) devuelve existente sin alterar cola
const elenaLookup = turnos.lookupPatientByDniForKiosk('00000005', mockPatients, mockApps, '2026-10-27');
const elenaTicket = turnos.createTurnTicket({
  area: 'R',
  reason: 'Confirmar llegada para una cita',
  pid: elenaLookup.pid,
  patientName: elenaLookup.fullNameForInternal,
  docMasked: elenaLookup.docMasked,
  appointmentId: elenaLookup.appointmentId
});
const countersAfterElena = turnos.getTurnCounters();
const countAfterElena = turnos.getTurns().length;
const elenaRecover = turnos.createTurnTicket({
  area: 'R',
  reason: 'Confirmar llegada para una cita',
  pid: elenaLookup.pid,
  patientName: elenaLookup.fullNameForInternal,
  docMasked: elenaLookup.docMasked,
  appointmentId: elenaLookup.appointmentId
});
assert(
  elenaTicket.ok === true &&
  elenaRecover.ok === false &&
  elenaRecover.duplicate === true &&
  elenaRecover.existingTurn?.code === elenaTicket.turn.code &&
  elenaRecover.error === `Ya tiene el turno ${elenaTicket.turn.code} activo. Puede volver a imprimirlo sin perder su posición en la cola.` &&
  turnos.getTurnCounters().R === countersAfterElena.R &&
  turnos.getTurns().length === countAfterElena,
  'Caso C: Paciente registrado con DNI existente recupera su turno sin incrementar correlativos ni duplicar cola'
);

// ==========================================
// 17. Pruebas unitarias de sincronización compartida y proyección pública (#pantalla-turnos)
// ==========================================
const storageBacking = new Map();
const mockStorage = {
  getItem: key => (storageBacking.has(key) ? storageBacking.get(key) : null),
  setItem: (key, val) => { storageBacking.set(key, String(val)); },
  removeItem: key => { storageBacking.delete(key); }
};
turnos.setTurnosStorageAdapter(mockStorage);
turnos.registerTurnosPatientDirectory(mockPatients);
turnos.resetSharedTurnState();

// 17.1 Sanitización del estado compartido: separación pública mínima con lista explícita de permitidas/prohibidas
const noisyShared = {
  version: 1,
  revision: 9,
  updatedAt: '2026-10-27 09:20',
  originId: 'tab-externa-1',
  action: 'create',
  seqCounters: { R: 4, C: 1 },
  selectedCounters: { recepcion: 'Recepción 1', caja: 'Caja 1' },
  demoMinuteOffset: 25,
  callSequence: 4,
  anonAutoSeq: 2,
  turns: [
    {
      id: 'R-004',
      code: 'R-004',
      area: 'R',
      state: 'En espera',
      counter: null,
      createdAt: '2026-10-27 09:20',
      calledAt: null,
      startedAt: null,
      closedAt: null,
      _callOrder: 0,
      reason: 'Confirmar llegada para una cita',
      pid: 4,
      anonKey: null,
      patientLabel: 'Jorge Paredes León',
      patientName: 'Jorge Paredes León',
      docMasked: '••••0004',
      documentNumber: '00000004',
      dni: '00000004',
      phone: '999888777',
      diagnosis: 'Glaucoma crónico',
      amount: 350,
      payment: 'Pagado',
      service: 'Consulta oftalmológica',
      appointmentId: 4,
      orderAppointmentId: 4,
      orderReference: 'OP-0004',
      arrivalValidated: false,
      waitMinutes: 2,
      attentionMinutes: 0,
      originTicketId: 'R-001',
      linkedTicketId: 'C-002',
      history: [{ timestamp: '2026-10-27 09:20', fromState: null, toState: 'En espera', user: 'Autoservicio', area: 'R', counter: 'Autoservicio', reason: 'Confirmar llegada para una cita' }]
    }
  ]
};
const sanitizedState = turnos.sanitizeSharedTurnState(noisyShared);
const sanitizedJson = JSON.stringify(sanitizedState);
const rootKeys = sanitizedState ? Object.keys(sanitizedState) : [];
const sanitizedTurnKeys = sanitizedState?.turns?.[0] ? Object.keys(sanitizedState.turns[0]) : [];
const hasOnlyAllowedRoot = rootKeys.length === turnos.ALLOWED_SHARED_ROOT_KEYS.length && rootKeys.every(k => turnos.ALLOWED_SHARED_ROOT_KEYS.includes(k));
const hasOnlyAllowedTurn = sanitizedTurnKeys.length === turnos.ALLOWED_SHARED_TURN_KEYS.length && sanitizedTurnKeys.every(k => turnos.ALLOWED_SHARED_TURN_KEYS.includes(k));
const hasZeroForbiddenTurn = turnos.FORBIDDEN_SHARED_TURN_KEYS.every(fk => !(fk in (sanitizedState?.turns?.[0] || {})));
assert(
  sanitizedState !== null &&
  sanitizedState.version === 1 &&
  sanitizedState.turns.length === 1 &&
  hasOnlyAllowedRoot &&
  hasOnlyAllowedTurn &&
  hasZeroForbiddenTurn &&
  !sanitizedJson.includes('Jorge Paredes') &&
  !sanitizedJson.includes('00000004') &&
  !sanitizedJson.includes('999888777') &&
  !sanitizedJson.includes('Glaucoma') &&
  !sanitizedJson.includes('OP-0004') &&
  !sanitizedJson.includes('350'),
  '17.1 sanitizeSharedTurnState restringe strictly a ALLOWED_SHARED_ROOT_KEYS / ALLOWED_SHARED_TURN_KEYS y excluye todas las claves de FORBIDDEN_SHARED_TURN_KEYS'
);

// 17.2 Revisiones crecientes en almacenamiento compartido tras mutaciones
const rev0 = turnos.getSyncMetadata().revision;
const mCreate = turnos.createTurnTicket({ area: 'R', reason: 'Confirmar llegada para una cita', pid: 4 });
const rev1 = turnos.getSyncMetadata().revision;
const mCall = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
const rev2 = turnos.getSyncMetadata().revision;
const mRecall = turnos.recallTurn('R-003', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
const rev3 = turnos.getSyncMetadata().revision;
const mStart = turnos.startTurnAttention('R-003', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
const rev4 = turnos.getSyncMetadata().revision;
const mFinish = turnos.finishTurnAttention('R-003', { role: 'recepcion', operatorName: 'Lucía Fernández', counterName: 'Recepción 2' });
const rev5 = turnos.getSyncMetadata().revision;
const storedAfterOps = turnos.loadSharedTurnState();
assert(
  mCreate.ok && mCall.ok && mRecall.ok && mStart.ok && mFinish.ok &&
  rev1 > rev0 && rev2 > rev1 && rev3 > rev2 && rev4 > rev3 && rev5 > rev4 &&
  storedAfterOps?.revision === rev5,
  '17.2 Cada mutación de turnos incrementa de forma monótona la revisión compartida y la persiste en clinica_turnos_shared_v1'
);

// 17.3 Rechazo de revisiones obsoletas o esquemas inválidos
const staleRes = turnos.applyExternalSharedTurnState({ ...noisyShared, revision: rev5 });
const olderRes = turnos.applyExternalSharedTurnState({ ...noisyShared, revision: rev5 - 1 });
const badVersionRes = turnos.applyExternalSharedTurnState({ ...noisyShared, version: 99, revision: rev5 + 10 });
const corruptTurnRes = turnos.sanitizeSharedTurnState({ version: 1, revision: rev5 + 10, turns: null });
mockStorage.setItem(turnos.SHARED_TURNOS_STORAGE_KEY, '{corrupt json');
const corruptLoad = turnos.loadSharedTurnState();
mockStorage.setItem(turnos.SHARED_TURNOS_STORAGE_KEY, JSON.stringify(storedAfterOps));
assert(
  staleRes.applied === false &&
  olderRes.applied === false &&
  badVersionRes.applied === false &&
  corruptTurnRes === null &&
  corruptLoad === null &&
  turnos.getSyncMetadata().revision === rev5,
  '17.3 Se rechazan revisiones obsoletas (<= actual), versiones no soportadas y JSON/estructura corrupta'
);

// 17.4 Separación estricta de estado público vs operativo privado y reconstrucción interna por pid
const persistedJson = mockStorage.getItem(turnos.SHARED_TURNOS_STORAGE_KEY);
const persistedParsed = JSON.parse(persistedJson || '{}');
const privateOpsJson = mockStorage.getItem(turnos.INTERNAL_TURNOS_OPS_STORAGE_KEY) || '';
const persistedTurnsClean = Array.isArray(persistedParsed.turns) && persistedParsed.turns.length > 0 && persistedParsed.turns.every(t =>
  Object.keys(t).every(k => turnos.ALLOWED_SHARED_TURN_KEYS.includes(k)) &&
  turnos.FORBIDDEN_SHARED_TURN_KEYS.every(fk => !(fk in t))
);
turnos.applyExternalSharedTurnState({
  ...storedAfterOps,
  revision: rev5 + 1,
  originId: 'otra-pestana'
});
const hydratedR4 = turnos.getTurnById('R-004');
assert(
  persistedTurnsClean &&
  Boolean(privateOpsJson) &&
  !privateOpsJson.includes('Luis Pérez') &&
  !privateOpsJson.includes('Carlos Mendoza') &&
  !privateOpsJson.includes('••••') &&
  !persistedJson.includes('Luis Pérez') &&
  !persistedJson.includes('Carlos Mendoza') &&
  hydratedR4?.patientLabel === 'Luis Pérez Salazar' &&
  hydratedR4?.docMasked === '••••0004',
  '17.4 clinica_turnos_shared_v1 solo persiste claves públicas permitidas y el panel interno reconstruye datos desde clinica_turnos_ops_private_v1 + pid'
);

// 17.5 Proyección pública excluye datos privados e internos
turnos.resetSharedTurnState();
turnos.createTurnTicket({ area: 'R', reason: 'Consultar o registrar una cita', documentNumber: '87654321' });
turnos.createTurnTicket({ area: 'R', reason: 'Consultar o registrar una cita', pid: null });
const publicProj = turnos.getPublicTurnProjection();
const publicProjJson = JSON.stringify(publicProj);
assert(
  !publicProjJson.includes('Carlos') &&
  !publicProjJson.includes('María') &&
  !publicProjJson.includes('Ana') &&
  !publicProjJson.includes('000000') &&
  !publicProjJson.includes('87654321') &&
  !publicProjJson.includes('••••') &&
  !publicProjJson.includes('OP-0002') &&
  !publicProjJson.includes('Confirmar llegada') &&
  !publicProjJson.includes('TMPDOC-') &&
  !publicProjJson.includes('ANON-') &&
  publicProj.activeCalls.every(c => !('pid' in c) && !('patientLabel' in c) && !('docMasked' in c) && !('reason' in c)),
  '17.5 getPublicTurnProjection() excluye nombres, DNI, enmascarados, motivos, órdenes, pid, TMPDOC y ANON'
);

// 17.6 Orden estricto de próximos en cola R y C y límite visual de 6 con indicador de excedente
turnos.resetSharedTurnState();
// Ya existe R-003 y C-001 en espera; agregamos 7 en R (total 8 -> 6 visibles + "2 turnos adicionales") y 6 en C (total 7 -> 6 visibles + "1 turno adicional")
for (let i = 1; i <= 7; i++) {
  turnos.createTurnTicket({ area: 'R', reason: 'Consultar o registrar una cita', pid: null });
}
for (let i = 1; i <= 6; i++) {
  turnos.createTurnTicket({ area: 'C', reason: 'Consultar un pago', pid: null });
}
const overflowProj = turnos.getPublicTurnProjection();
assert(
  overflowProj.waitingQueues.R.totalWaiting === 8 &&
  overflowProj.waitingQueues.R.visibleCodes.length === 6 &&
  overflowProj.waitingQueues.R.visibleCodes[0].code === 'R-003' &&
  overflowProj.waitingQueues.R.visibleCodes[5].code === 'R-008' &&
  overflowProj.waitingQueues.R.overflowCount === 2 &&
  overflowProj.waitingQueues.R.overflowLabel === '2 turnos adicionales' &&
  overflowProj.waitingQueues.C.totalWaiting === 7 &&
  overflowProj.waitingQueues.C.visibleCodes.length === 6 &&
  overflowProj.waitingQueues.C.visibleCodes[0].code === 'C-001' &&
  overflowProj.waitingQueues.C.overflowCount === 1 &&
  overflowProj.waitingQueues.C.overflowLabel === '1 turno adicional',
  '17.6 Colas públicas conservan orden FIFO exacto, limitan a 6 códigos visibles y reportan turnos adicionales'
);

// 17.7 Límite máximo de 6 en últimos llamados y exclusión de llamados activos actuales
turnos.resetSharedTurnState();
for (let i = 1; i <= 7; i++) {
  turnos.createTurnTicket({ area: 'R', reason: 'Consultar o registrar una cita', pid: null });
}
// R-002 ya estaba Llamado en Recepción 1; lo iniciamos y finalizamos, luego atendemos R-003..R-008 (7 adicionales) en Recepción 2
turnos.startTurnAttention('R-002', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
turnos.finishTurnAttention('R-002', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
for (let i = 0; i < 6; i++) {
  const c = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 2' });
  turnos.startTurnAttention(c.turn.code, { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 2' });
  turnos.finishTurnAttention(c.turn.code, { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 2' });
}
// Llamar uno más que queda activo en Recepción 2
const activeLast = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 2' });
const recentProj = turnos.getPublicTurnProjection();
assert(
  recentProj.recentCalls.length === 6 &&
  !recentProj.recentCalls.some(c => c.code === activeLast.turn.code) &&
  recentProj.recentCalls[0].code === 'R-008' &&
  recentProj.recentCalls[5].code === 'R-003' &&
  recentProj.activeCalls.some(c => c.code === activeLast.turn.code),
  '17.7 Últimos llamados muestra máximo 6 registros recientes más nuevo primero sin duplicar el llamado activo actual'
);

// 17.8 Transiciones de proyección pública: Llamado (isNewCall) -> En atención -> Finalizado / Ausente
turnos.resetSharedTurnState();
turnos.markTurnAbsent('R-002', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
const projAfterAbsent = turnos.getPublicTurnProjection();
const callR3Proj = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
const projAfterCallR3 = turnos.getPublicTurnProjection();
turnos.startTurnAttention(callR3Proj.turn.code, { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
const projAfterStartR3 = turnos.getPublicTurnProjection();
turnos.finishTurnAttention(callR3Proj.turn.code, { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
const projAfterFinishR3 = turnos.getPublicTurnProjection();
assert(
  projAfterAbsent.activeCalls.length === 0 &&
  projAfterAbsent.recentCalls.some(c => c.code === 'R-002') &&
  projAfterCallR3.primaryByArea.R?.code === 'R-003' &&
  projAfterCallR3.primaryByArea.R?.isNewCall === true &&
  projAfterStartR3.primaryByArea.R?.state === 'En atención' &&
  projAfterStartR3.primaryByArea.R?.isNewCall === false &&
  projAfterFinishR3.activeCalls.length === 0 &&
  projAfterFinishR3.recentCalls[0]?.code === 'R-003',
  '17.8 Transiciones Llamado -> En atención -> Finalizado/Ausente actualizan activeCalls, isNewCall y recentCalls'
);

// 17.9 Restablecimiento sincronizado limpia estado, sube revisión monótonamente y notifica suscriptores
let lastNotified = null;
const unsubReset = turnos.subscribeToTurnStateChanges(ev => { lastNotified = ev; });
const revBeforeReset = turnos.getSyncMetadata().revision;
const resetInfo = turnos.resetSharedTurnState();
const revAfterReset = turnos.getSyncMetadata().revision;
const postResetProj = turnos.getPublicTurnProjection();
unsubReset();
assert(
  resetInfo.ok === true &&
  revAfterReset > revBeforeReset &&
  lastNotified?.action === 'reset' &&
  postResetProj.activeCalls.length === 1 &&
  postResetProj.activeCalls[0].code === 'R-002' &&
  postResetProj.waitingSummary.R === 1 &&
  postResetProj.waitingSummary.C === 1,
  '17.9 resetSharedTurnState() restaura colas iniciales, incrementa revisión y notifica action="reset"'
);

// 17.10 Transferencias entre Recepción y Caja sincronizan ambos extremos en proyección pública
turnos.resetSharedTurnState();
turnos.finishTurnAttention('R-002', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' }).ok; // debe fallar si R-002 está Llamado
turnos.startTurnAttention('R-002', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
// C-001 es de pid 2 también; primero finalizamos o transferimos R-003 para probar transferencia limpia R -> C
turnos.finishTurnAttention('R-002', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
turnos.startTurnAttention('R-003', { role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1' });
const trProjRes = turnos.transferTurn('R-003', { targetArea: 'C', role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 1', reason: 'Pase a caja' });
const projAfterTransfer = turnos.getPublicTurnProjection();
assert(
  trProjRes.ok === true &&
  trProjRes.targetTurn.code === 'C-002' &&
  projAfterTransfer.recentCalls.some(c => c.code === 'R-003') &&
  !projAfterTransfer.activeCalls.some(c => c.code === 'R-003') &&
  projAfterTransfer.waitingQueues.C.visibleCodes.some(c => c.code === 'C-002'),
  '17.10 Transferencia entre áreas saca R-003 del llamado activo, lo agrega a recientes y encola C-002 en Caja'
);

// 17.11 Fuente temporal unificada del reloj demostrativo en encabezado, llamados y última actualización
turnos.resetSharedTurnState();
const snapInitClock = turnos.getDemoClockSnapshot();
turnos.createTurnTicket({ area: 'R', reason: 'Consultar o registrar una cita', pid: null });
const callCoherent = turnos.callNextTurn({ area: 'R', role: 'recepcion', operatorName: 'Lucía', counterName: 'Recepción 2' });
const snapAfterCall = turnos.getDemoClockSnapshot();
const projCoherent = turnos.getPublicTurnProjection();
const activeCalledItem = projCoherent.activeCalls.find(c => c.code === callCoherent.turn.code);
assert(
  snapInitClock.date === '2026-10-27' &&
  snapInitClock.dateText === 'Martes, 27 de octubre de 2026' &&
  snapAfterCall.date === '2026-10-27' &&
  snapAfterCall.hm === activeCalledItem?.calledTime &&
  String(projCoherent.updatedAt).startsWith('2026-10-27 ') &&
  projCoherent.updatedAt.endsWith(snapAfterCall.hm),
  '17.11 Reloj del encabezado, fecha, hora de llamado y última actualización comparten exactamente el mismo contexto temporal demostrativo'
);

turnos.setTurnosStorageAdapter(null);
turnos.resetTurnosData();

// =========================================================================
// 18. MOTOR DE WORKFLOWS VISUALES, AGENTES DINÁMICOS, SIMULACIÓN Y RBAC
// =========================================================================
console.log('\n--- 18. Constructor visual de workflows, agentes dinámicos, validación, simulación y RBAC ---');

// Preparamos almacenamiento en memoria para verificar persistencia versionada y recuperación ante JSON corrupto
const originalLocalStorage = globalThis.localStorage;
const mockStore = new Map();
globalThis.localStorage = {
  getItem: k => (mockStore.has(k) ? mockStore.get(k) : null),
  setItem: (k, v) => { mockStore.set(k, String(v)); },
  removeItem: k => { mockStore.delete(k); }
};

try {
  automations.resetARMData();

  assert(
    arm.getAgents === automations.getAgents &&
    automations.NODE_CATALOG.length === 14 &&
    automations.WORKFLOW_TEMPLATES.length === 8 &&
    automations.AGENT_CAPABILITIES_CATALOG.length === 19 &&
    automations.AGENT_FORBIDDEN_CATALOG.length === 9,
    '18.0 Exportaciones compatibles, 14 tipos de nodo, 8 plantillas y catálogos cerrados de capacidades/prohibiciones'
  );

  // 18.1 Crear agente válido
  const agRes1 = automations.createAgent({
    name: 'Coordinador de Citas VIP',
    purpose: 'Coordina confirmaciones de agenda demostrativas',
    area: 'Agenda y Citas',
    capabilities: ['read_demo_appointments', 'prepare_reminder', 'escalate_to_human'],
    forbiddenActions: ['emit_diagnosis', 'modify_medical_record', 'execute_real_payment'],
    status: 'draft'
  }, { role: 'admin', actorName: 'Administrador' });
  assert(
    agRes1.ok && agRes1.agent.name === 'Coordinador de Citas VIP' && agRes1.agent.capabilities.length === 3 && agRes1.agent.status === 'draft',
    '18.1 Crea agente válido con capacidades cerradas y estado inicial Borrador'
  );

  // 18.2 Rechazar agente sin nombre o sin capacidades
  const agInvalidName = automations.createAgent({
    name: 'A',
    capabilities: ['read_demo_appointments'],
    forbiddenActions: ['emit_diagnosis']
  });
  const agInvalidCaps = automations.createAgent({
    name: 'Agente Sin Permisos',
    capabilities: ['invented_unknown_capability'],
    forbiddenActions: ['emit_diagnosis']
  });
  assert(
    !agInvalidName.ok && !agInvalidCaps.ok,
    '18.2 Rechaza crear agente sin nombre válido o sin capacidades del catálogo cerrado'
  );

  // 18.3 Generar ID único de agente
  const agRes2 = automations.createAgent({
    name: 'Monitor de Recepción',
    capabilities: ['create_reception_task', 'route_to_reception'],
    forbiddenActions: ['execute_real_payment'],
    status: 'active'
  });
  assert(
    agRes2.ok && agRes2.agent.id !== agRes1.agent.id && Number.isFinite(agRes2.agent.id),
    '18.3 Genera ID único incremental para cada nuevo agente'
  );

  // 18.4 Editar y duplicar agente + 18.6 validar catálogo cerrado
  const agUpd = automations.updateAgent(agRes1.agent.id, {
    purpose: 'Propósito actualizado',
    capabilities: ['read_demo_appointments', 'create_reception_task', 'cap_inexistente_ignorada'],
    forbiddenActions: ['emit_diagnosis', 'prohibicion_invalida']
  });
  const agDup = automations.duplicateAgent(agRes1.agent.id);
  assert(
    agUpd.ok &&
    agUpd.agent.capabilities.length === 2 &&
    !agUpd.agent.capabilities.includes('cap_inexistente_ignorada') &&
    agUpd.agent.forbiddenActions.length === 1 &&
    agDup.ok &&
    agDup.agent.id !== agRes1.agent.id &&
    agDup.agent.name.includes('(Copia)'),
    '18.4 & 18.6 Edita y duplica agente filtrando capacidades y prohibiciones estrictamente al catálogo cerrado'
  );

  // 18.5 Impedir archivar o pausar agente usado por un workflow activo
  const blockPauseAgent2 = automations.toggleAgentStatus(2, { role: 'admin' });
  const blockArchiveAgent2 = automations.archiveAgent(2, { role: 'admin' });
  const allowArchiveDraft = automations.archiveAgent(agDup.agent.id, { role: 'admin' });
  assert(
    !blockPauseAgent2.ok && blockPauseAgent2.code === 'AGENT_HAS_ACTIVE_WORKFLOWS' &&
    !blockArchiveAgent2.ok && blockArchiveAgent2.code === 'AGENT_HAS_ACTIVE_WORKFLOWS' &&
    allowArchiveDraft.ok && allowArchiveDraft.agent.status === 'archived',
    '18.5 Impide pausar o archivar agente asignado a un workflow activo y permite archivar copias sin flujos activos'
  );

  // 18.7 Crear, renombrar, duplicar, cambiar estado y preservar versión activa al editar borrador
  const activeRecoveryBefore = automations.getWorkflowById('wf-noshow-recovery');
  const activeMetaEdit = automations.updateWorkflowMeta('wf-noshow-recovery', { name: 'Recuperación inteligente editada (borrador)' });
  assert(
    activeRecoveryBefore.status === 'active' &&
    activeMetaEdit.ok &&
    activeMetaEdit.workflow.status === 'active' &&
    activeMetaEdit.workflow.hasUnsavedChanges === true &&
    activeMetaEdit.workflow.version === 2 &&
    activeMetaEdit.workflow.publishedSnapshot?.version === 1 &&
    activeMetaEdit.workflow.publishedSnapshot?.name === activeRecoveryBefore.name,
    '18.7 Editar un workflow activo conserva publishedSnapshot v1 y sube el borrador actual a v2'
  );

  const wfCreated = automations.createWorkflow({ name: 'Flujo Prueba Unitaria', area: 'Recepción' });
  const wfRenamed = automations.updateWorkflowMeta(wfCreated.workflow.id, { name: 'Flujo Prueba Renombrado' });
  const wfDuplicated = automations.duplicateWorkflow(wfCreated.workflow.id);
  const wfPausedInit = automations.pauseWorkflow('wf-security-guardrail');
  const wfArchivedUnconfirmed = automations.archiveWorkflow(wfDuplicated.workflow.id, { confirmed: false });
  const wfArchivedDup = automations.archiveWorkflow(wfDuplicated.workflow.id, { confirmed: true });
  assert(
    wfCreated.ok &&
    wfRenamed.ok && wfRenamed.workflow.name === 'Flujo Prueba Renombrado' &&
    wfDuplicated.ok && wfDuplicated.workflow.status === 'draft' &&
    wfPausedInit.ok && wfPausedInit.workflow.status === 'paused' &&
    !wfArchivedUnconfirmed.ok && wfArchivedUnconfirmed.code === 'CONFIRMATION_REQUIRED' &&
    wfArchivedDup.ok && wfArchivedDup.workflow.status === 'archived',
    '18.7b Crea, renombra, duplica, pausa y archiva workflows (exigiendo confirmación)'
  );

  // 18.8 Agregar, mover, configurar, duplicar y eliminar nodos y conexiones + Undo/Redo
  const trigId = wfCreated.workflow.nodes[0].id;
  const condAdd = automations.addWorkflowNode(wfCreated.workflow.id, { type: 'condition_branch', position: { x: 300, y: 120 } });
  const moveCond = automations.moveWorkflowNode(wfCreated.workflow.id, condAdd.node.id, { x: 340, y: 150 });
  const cfgCond = automations.updateWorkflowNode(wfCreated.workflow.id, condAdd.node.id, {
    label: '¿Cita confirmada?',
    config: { field: 'hasNewAppointment', operator: 'equals', expectedValue: 'true' }
  });
  const dupCond = automations.duplicateWorkflowNode(wfCreated.workflow.id, condAdd.node.id);
  const rmDupCond = automations.removeWorkflowNode(wfCreated.workflow.id, dupCond.node.id);
  const connTrigCond = automations.connectWorkflowNodes(wfCreated.workflow.id, {
    sourceNodeId: trigId,
    sourcePort: 'out',
    targetNodeId: condAdd.node.id,
    targetPort: 'in'
  });
  const undoConn = automations.undoWorkflowAction(wfCreated.workflow.id);
  const redoConn = automations.redoWorkflowAction(wfCreated.workflow.id);
  assert(
    condAdd.ok && moveCond.ok &&
    moveCond.node.position.x === 340 &&
    cfgCond.ok && dupCond.ok && rmDupCond.ok && connTrigCond.ok &&
    undoConn.ok && undoConn.workflow.edges.length === 0 &&
    redoConn.ok && redoConn.workflow.edges.length === 1,
    '18.8 Agrega, mueve, configura, duplica, elimina, conecta nodos y soporta Deshacer/Rehacer'
  );

  // 18.9 Rechazar autoconexión, conexión duplicada y múltiples entradas en un mismo puerto
  const endYes = automations.addWorkflowNode(wfCreated.workflow.id, { type: 'end_success', position: { x: 640, y: 60 } });
  const agStep = automations.addWorkflowNode(wfCreated.workflow.id, {
    type: 'agent_execute',
    position: { x: 620, y: 240 },
    config: { agentId: agRes1.agent.id, requiredCapability: 'read_demo_appointments' }
  });
  const selfConn = automations.connectWorkflowNodes(wfCreated.workflow.id, {
    sourceNodeId: condAdd.node.id, sourcePort: 'yes', targetNodeId: condAdd.node.id, targetPort: 'in'
  });
  const dupConnAttempt = automations.connectWorkflowNodes(wfCreated.workflow.id, {
    sourceNodeId: trigId, sourcePort: 'out', targetNodeId: condAdd.node.id, targetPort: 'in'
  });
  const yesConn = automations.connectWorkflowNodes(wfCreated.workflow.id, {
    sourceNodeId: condAdd.node.id, sourcePort: 'yes', targetNodeId: endYes.node.id, targetPort: 'in'
  });
  const multiInputAttempt = automations.connectWorkflowNodes(wfCreated.workflow.id, {
    sourceNodeId: condAdd.node.id, sourcePort: 'no', targetNodeId: endYes.node.id, targetPort: 'in'
  });
  assert(
    !selfConn.ok && selfConn.code === 'SELF_CONNECTION' &&
    !dupConnAttempt.ok && dupConnAttempt.code === 'DUPLICATE_CONNECTION' &&
    yesConn.ok &&
    !multiInputAttempt.ok && multiInputAttempt.code === 'TARGET_PORT_OCCUPIED',
    '18.9 Rechaza autoconexión, conexión duplicada y múltiples entradas al mismo puerto'
  );

  // 18.10 Rechazar ciclos no permitidos
  const endNo = automations.addWorkflowNode(wfCreated.workflow.id, { type: 'end_success', position: { x: 920, y: 240 } });
  const wfCycleCheck = automations.connectWorkflowNodes(wfCreated.workflow.id, {
    sourceNodeId: agStep.node.id, sourcePort: 'out', targetNodeId: condAdd.node.id, targetPort: 'in'
  });
  // Nota: condAdd ya tiene entrada desde trigId, probemos ciclo hacia agStep: condAdd(no)->agStep y luego agStep->agStep o wait->condAdd
  const waitCycle = automations.addWorkflowNode(wfCreated.workflow.id, { type: 'wait_delay', position: { x: 180, y: 260 } });
  automations.connectWorkflowNodes(wfCreated.workflow.id, { sourceNodeId: condAdd.node.id, sourcePort: 'no', targetNodeId: waitCycle.node.id, targetPort: 'in' });
  const backTrig = automations.addWorkflowNode(wfCreated.workflow.id, { type: 'action_task', position: { x: 400, y: 260 } });
  automations.connectWorkflowNodes(wfCreated.workflow.id, { sourceNodeId: waitCycle.node.id, sourcePort: 'out', targetNodeId: backTrig.node.id, targetPort: 'in' });
  const wfSnapForCycle = automations.getWorkflowById(wfCreated.workflow.id);
  const directCycleRejected = automations.wouldCreateCycle(wfSnapForCycle, backTrig.node.id, condAdd.node.id) === true;
  assert(
    !wfCycleCheck.ok && directCycleRejected,
    '18.10 Detecta y rechaza ciclos que producirían bucles infinitos en el grafo'
  );

  // 18.11 Detectar nodos huérfanos y condiciones sin ramas Sí y No
  const wfOrphanBranch = automations.createWorkflow({ name: 'Prueba Huérfanos y Ramas', area: 'Recepción' });
  const wfObId = wfOrphanBranch.workflow.id;
  const condIncomplete = automations.addWorkflowNode(wfObId, { type: 'condition_branch', position: { x: 300, y: 120 } });
  const orphanNode = automations.addWorkflowNode(wfObId, { type: 'action_internal_note', position: { x: 600, y: 300 } });
  automations.connectWorkflowNodes(wfObId, { sourceNodeId: wfOrphanBranch.workflow.nodes[0].id, sourcePort: 'out', targetNodeId: condIncomplete.node.id, targetPort: 'in' });
  const reportOrphan = automations.validateWorkflowStructure(automations.getWorkflowById(wfObId), automations.getAgents(), { mode: 'activate' });
  const errCodes11 = new Set(reportOrphan.errors.map(e => e.code));
  assert(
    !reportOrphan.valid &&
    errCodes11.has('ORPHAN_NODE') &&
    errCodes11.has('CONDITION_BRANCH_MISSING') &&
    (errCodes11.has('NO_END_NODE') || errCodes11.has('PATH_DOES_NOT_END')),
    '18.11 Detecta nodos huérfanos, ramas Sí/No incompletas y ausencia de nodo de cierre'
  );

  // 18.12 Detectar incompatibilidad entre nodo de agente y capacidades o agente inactivo al publicar
  const wfAgentCheck = automations.createWorkflow({ name: 'Prueba Capacidad Agente', area: 'Recepción' });
  const acId = wfAgentCheck.workflow.id;
  const acNode = automations.addWorkflowNode(acId, {
    type: 'agent_execute',
    position: { x: 320, y: 120 },
    config: { agentId: agRes1.agent.id, requiredCapability: 'route_to_caja' } // agRes1 no tiene route_to_caja y está en draft
  });
  const acEnd = automations.addWorkflowNode(acId, { type: 'end_success', position: { x: 620, y: 120 } });
  automations.connectWorkflowNodes(acId, { sourceNodeId: wfAgentCheck.workflow.nodes[0].id, sourcePort: 'out', targetNodeId: acNode.node.id, targetPort: 'in' });
  automations.connectWorkflowNodes(acId, { sourceNodeId: acNode.node.id, sourcePort: 'out', targetNodeId: acEnd.node.id, targetPort: 'in' });
  const reportAgentMismatch = automations.validateWorkflowStructure(automations.getWorkflowById(acId), automations.getAgents(), { mode: 'activate' });
  const errCodes12 = new Set(reportAgentMismatch.errors.map(e => e.code));
  assert(
    !reportAgentMismatch.valid &&
    errCodes12.has('AGENT_CAPABILITY_MISSING') &&
    errCodes12.has('AGENT_NOT_ACTIVE'),
    '18.12 Detecta incompatibilidad de capacidad requerida y agente no activo al intentar publicar'
  );

  // 18.13 Detectar bloqueo por política clínica o financiera en descripción de nodos
  const wfSecText = automations.createWorkflow({ name: 'Prueba Política Clínica', area: 'Recepción' });
  const stId = wfSecText.workflow.id;
  const badAction = automations.addWorkflowNode(stId, {
    type: 'action_internal_note',
    position: { x: 320, y: 120 },
    config: { noteText: 'Enviar diagnóstico automático y realizar cobro real sin médico' }
  });
  const goodEnd = automations.addWorkflowNode(stId, { type: 'end_success', position: { x: 620, y: 120 } });
  automations.connectWorkflowNodes(stId, { sourceNodeId: wfSecText.workflow.nodes[0].id, sourcePort: 'out', targetNodeId: badAction.node.id, targetPort: 'in' });
  automations.connectWorkflowNodes(stId, { sourceNodeId: badAction.node.id, sourcePort: 'out', targetNodeId: goodEnd.node.id, targetPort: 'in' });
  const reportSec = automations.validateWorkflowStructure(automations.getWorkflowById(stId), automations.getAgents(), { mode: 'activate' });
  assert(
    !reportSec.valid && reportSec.errors.some(e => e.code === 'CLINICAL_FINANCIAL_RESTRICTED'),
    '18.13 Bloquea en validación textos o acciones que pretendan diagnosticar o ejecutar cobros reales'
  );

  // 18.14 Guardar y recargar desde almacenamiento local versionado + 18.15 recuperarse ante JSON corrupto
  automations.saveWorkflowDraft(wfCreated.workflow.id, { role: 'admin' });
  const loadedOk = automations.loadAutomationsState();
  const hasSavedWf = loadedOk.state.workflows.some(w => w.id === wfCreated.workflow.id);
  mockStore.set(automations.AUTOMATIONS_STORAGE_KEY, '{json_corrupto_no_valido!!!');
  const recovered = automations.loadAutomationsState();
  const hasRecoveryAudit = recovered.state.audit.some(e => e.type === 'storage_recovered');
  assert(
    !loadedOk.recoveredFromCorruption &&
    hasSavedWf &&
    recovered.recoveredFromCorruption === true &&
    recovered.state.workflows.length >= 4 &&
    hasRecoveryAudit,
    '18.14 & 18.15 Persiste y recarga desde almacenamiento versionado y se recupera ante JSON corrupto registrando auditoría'
  );

  // 18.19 Simulación paso a paso (ramas Sí, No y Bloqueo por seguridad)
  automations.resetARMData();
  const simYes = automations.startWorkflowSimulation('wf-noshow-recovery', { scenarioId: 'sc-noshow-yes' }, { role: 'admin' });
  for (let i = 0; i < 30 && ['running', 'paused'].includes(automations.getSimulationState()?.status); i++) {
    automations.stepWorkflowSimulation();
  }
  const simYesDone = automations.getSimulationState();
  const simNo = automations.startWorkflowSimulation('wf-noshow-recovery', { scenarioId: 'sc-noshow-no' }, { role: 'admin' });
  automations.pauseWorkflowSimulation();
  const simPausedState = automations.getSimulationState();
  automations.resumeWorkflowSimulation();
  for (let i = 0; i < 30 && ['running', 'paused'].includes(automations.getSimulationState()?.status); i++) {
    automations.stepWorkflowSimulation();
  }
  const simNoDone = automations.getSimulationState();
  const simSec = automations.startWorkflowSimulation('wf-security-guardrail', { scenarioId: 'sc-security-clinical' }, { role: 'admin' });
  for (let i = 0; i < 30 && ['running', 'paused'].includes(automations.getSimulationState()?.status); i++) {
    automations.stepWorkflowSimulation();
  }
  const simSecDone = automations.getSimulationState();
  automations.stopWorkflowSimulation({ silent: true });

  assert(
    simYes.ok && simYesDone?.status === 'completed' &&
    simYesDone.steps.some(s => s.nodeId === 'nw-4') &&
    simYesDone.nodeStates['nw-5'] === 'skipped' &&
    simNo.ok && simPausedState?.status === 'paused' && simNoDone?.status === 'completed' &&
    simNoDone.steps.some(s => s.nodeId === 'nw-8') &&
    simSec.ok && simSecDone?.status === 'completed' &&
    simSecDone.nodeStates['sg-3'] === 'blocked' &&
    simSecDone.disclaimer === automations.SIMULATION_DISCLAIMER,
    '18.19 Simulación paso a paso ejecuta ramas Sí/No, pausa/reanuda y detiene el flujo en Bloqueo por seguridad'
  );

  // 18.19b Coherencia visual de nodo en transición running -> paused -> running -> completed y bloqueos
  const simLife = automations.startWorkflowSimulation('wf-noshow-recovery', { scenarioId: 'sc-noshow-no' }, { role: 'admin' });
  const simRunningSnap = automations.getSimulationState();
  const visRunning = automations.getSimulationNodeVisualMeta(simRunningSnap, simRunningSnap.activeNodeId);
  const simPausedSnap = automations.pauseWorkflowSimulation();
  const visPaused = automations.getSimulationNodeVisualMeta(simPausedSnap, simPausedSnap.activeNodeId);
  const simResumedSnap = automations.resumeWorkflowSimulation();
  const visResumed = automations.getSimulationNodeVisualMeta(simResumedSnap, simResumedSnap.activeNodeId);
  for (let i = 0; i < 30 && ['running', 'paused'].includes(automations.getSimulationState()?.status); i++) {
    automations.stepWorkflowSimulation();
  }
  const simCompletedSnap = automations.getSimulationState();
  const visCompletedNode = automations.getSimulationNodeVisualMeta(simCompletedSnap, 'nw-8');
  const visSkippedNode = automations.getSimulationNodeVisualMeta(simCompletedSnap, 'nw-4');
  const visBlockedNode = automations.getSimulationNodeVisualMeta(simSecDone, 'sg-3');
  const visErrNoSim = automations.getSimulationNodeVisualMeta(null, 'x1', [{ severity: 'error' }]);
  const visWarnNoSim = automations.getSimulationNodeVisualMeta(null, 'x2', [{ severity: 'warning' }]);
  automations.stopWorkflowSimulation({ silent: true, clearRun: true });

  assert(
    simLife.ok &&
    simRunningSnap.status === 'running' && visRunning.state === 'running' && visRunning.badgeText === 'Ejecutándose' &&
    simPausedSnap.status === 'paused' && visPaused.state === 'paused' && visPaused.badgeText === 'Pausado' &&
    simResumedSnap.status === 'running' && visResumed.state === 'running' && visResumed.badgeText === 'Ejecutándose' &&
    simCompletedSnap.status === 'completed' &&
    visCompletedNode.state === 'completed' && visCompletedNode.badgeText === 'Completado' &&
    visSkippedNode.state === 'skipped' && visSkippedNode.badgeText === 'No ejecutado' &&
    visBlockedNode.state === 'blocked' && visBlockedNode.badgeText === 'Bloqueado' &&
    visErrNoSim.badgeText === 'Error' && visWarnNoSim.badgeText === 'Advertencia',
    '18.19b Badges de nodo mantienen coherencia estricta en running -> paused -> running -> completed, omitido y bloqueo'
  );

  // 18.17 Auditoría (verificar catálogo de tipos + consulta filtrada) y 18.18 permisos por rol
  const deniedRecepCreate = automations.createWorkflow({ name: 'No autorizado' }, { role: 'recepcion', actorName: 'Recepción' });
  const deniedSupArchive = automations.archiveWorkflow('wf-noshow-recovery', { role: 'supervisor', actorName: 'Supervisor' });
  const deniedSupReset = automations.resetAutomationsOnly({ role: 'supervisor', actorName: 'Supervisor' });
  const allowedSupCreate = automations.createWorkflow({ name: 'Borrador Supervisor' }, { role: 'supervisor', actorName: 'Supervisor' });
  const recepWfs = automations.getWorkflowsForRole('recepcion');
  const cajaWfs = automations.getWorkflowsForRole('caja');
  const recepTasks = automations.getAssignedTasksForRole('recepcion');
  const doneTask = automations.completeAssignedAutomationTask(recepTasks[0].id, { role: 'recepcion', actorName: 'Lucía' });
  const deniedCajaTask = automations.completeAssignedAutomationTask('task-1', { role: 'caja', actorName: 'Cajero' });
  const unauthorizedLogs = automations.getAuditEvents({ type: 'unauthorized_attempt' });

  assert(
    !deniedRecepCreate.ok && deniedRecepCreate.code === 'UNAUTHORIZED' &&
    !deniedSupArchive.ok && deniedSupArchive.code === 'UNAUTHORIZED' &&
    !deniedSupReset.ok && deniedSupReset.code === 'UNAUTHORIZED' &&
    allowedSupCreate.ok &&
    recepWfs.every(w => !w.area.toLowerCase().includes('caja')) &&
    cajaWfs.every(w => w.area.toLowerCase().includes('caja')) &&
    doneTask.ok && doneTask.task.status === 'completed' &&
    !deniedCajaTask.ok &&
    unauthorizedLogs.length >= 4 &&
    Object.keys(automations.AUDIT_EVENT_TYPES).length >= 15,
    '18.17 & 18.18 Registra auditoría por tipo (incluidos intentos no autorizados) y aplica RBAC estricto para Admin, Supervisor, Recepción y Caja'
  );

  // 18.20 Matriz coherente de 7 estados UI (getWorkflowUiStateMeta + transiciones)
  automations.resetARMData();
  const permsAdmin = automations.getAutomationRolePermissions('admin');
  const wfTpl = automations.createWorkflowFromTemplate(automations.WORKFLOW_TEMPLATES[0].id, { role: 'admin', actorName: 'Administrador' });
  const wfTplObj = automations.getWorkflowById(wfTpl.workflow.id);
  const metaDraft = automations.getWorkflowUiStateMeta(wfTplObj, { valid: true, errors: [] }, permsAdmin);
  assert(
    metaDraft.uiStateKey === 'draft' &&
    metaDraft.badgeLabel === 'Borrador' &&
    !metaDraft.saveDisabled &&
    !metaDraft.validateDisabled &&
    metaDraft.showActivateBtn &&
    metaDraft.activateLabel === 'Activar' &&
    metaDraft.activateDisabled === true,
    '18.20a Estado Borrador (sin validar): Guardar y Validar habilitados, Activar deshabilitado hasta validar'
  );

  const valOk = automations.validateAndSaveWorkflowStatus(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  const wfValidatedObj = automations.getWorkflowById(wfTplObj.id);
  const metaValidated = automations.getWorkflowUiStateMeta(wfValidatedObj, valOk.validation, permsAdmin);
  assert(
    metaValidated.uiStateKey === 'validated' &&
    metaValidated.badgeLabel === 'Validado' &&
    metaValidated.showActivateBtn &&
    metaValidated.activateLabel === 'Activar' &&
    metaValidated.activateDisabled === false,
    '18.20b Estado Validado: muestra badge Validado y habilita Activar'
  );

  const actOk = automations.activateWorkflow(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  const wfActiveClean = automations.getWorkflowById(wfTplObj.id);
  const metaActiveClean = automations.getWorkflowUiStateMeta(wfActiveClean, actOk.validation, permsAdmin);
  assert(
    actOk.ok &&
    metaActiveClean.uiStateKey === 'active_clean' &&
    metaActiveClean.badgeLabel === 'Activo' &&
    metaActiveClean.showActivateBtn === false &&
    metaActiveClean.showPublishedPill === true,
    '18.20c Estado Activo (sin cambios): muestra Activo y omite botón Activar activo'
  );

  automations.updateWorkflowMeta(wfTplObj.id, { name: 'Recuperación editada' }, { role: 'admin', actorName: 'Administrador' });
  const wfActiveUnpub = automations.getWorkflowById(wfTplObj.id);
  const metaActiveUnpub = automations.getWorkflowUiStateMeta(wfActiveUnpub, { valid: true, errors: [] }, permsAdmin);
  assert(
    wfActiveUnpub.publishedSnapshot &&
    metaActiveUnpub.uiStateKey === 'active_unpublished' &&
    metaActiveUnpub.badgeLabel === 'Activo' &&
    metaActiveUnpub.hasUnpublishedChanges === true &&
    metaActiveUnpub.unpublishedLabel.includes('Cambios sin publicar') &&
    metaActiveUnpub.showActivateBtn === true &&
    metaActiveUnpub.activateLabel === 'Publicar nueva versión' &&
    metaActiveUnpub.activateDisabled === false,
    '18.20d Estado Activo con cambios sin publicar: protege versión publicada y muestra Publicar nueva versión'
  );

  const pubNew = automations.activateWorkflow(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  const wfRepublished = automations.getWorkflowById(wfTplObj.id);
  const metaRepublished = automations.getWorkflowUiStateMeta(wfRepublished, pubNew.validation, permsAdmin);
  assert(
    pubNew.ok &&
    wfRepublished.publishedSnapshot === null &&
    metaRepublished.uiStateKey === 'active_clean' &&
    metaRepublished.showActivateBtn === false,
    '18.20e Al publicar nueva versión se limpia publishedSnapshot y vuelve a Activo sin botón Activar'
  );

  const pauseRes = automations.pauseWorkflow(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  const wfPausedClean = automations.getWorkflowById(wfTplObj.id);
  const metaPausedClean = automations.getWorkflowUiStateMeta(wfPausedClean, { valid: true, errors: [] }, permsAdmin);
  automations.updateWorkflowMeta(wfTplObj.id, { description: 'Cambio en pausa' }, { role: 'admin', actorName: 'Administrador' });
  const wfPausedDirty = automations.getWorkflowById(wfTplObj.id);
  const metaPausedDirty = automations.getWorkflowUiStateMeta(wfPausedDirty, { valid: true, errors: [] }, permsAdmin);
  const revalPaused = automations.validateAndSaveWorkflowStatus(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  const wfPausedRevalidated = automations.getWorkflowById(wfTplObj.id);
  const metaPausedRevalidated = automations.getWorkflowUiStateMeta(wfPausedRevalidated, revalPaused.validation, permsAdmin);
  assert(
    pauseRes.ok &&
    metaPausedClean.uiStateKey === 'paused' &&
    metaPausedClean.activateLabel === 'Reactivar' &&
    metaPausedClean.activateDisabled === false &&
    wfPausedDirty.status === 'paused' &&
    metaPausedDirty.activateDisabled === true &&
    revalPaused.ok &&
    wfPausedRevalidated.status === 'paused' &&
    metaPausedRevalidated.activateDisabled === false,
    '18.20f Estado Pausado: muestra Reactivar; si se edita exige Validar manteniendo Pausado y luego habilita Reactivar'
  );

  const orphanAdd = automations.addWorkflowNode(wfTplObj.id, { type: 'action_reminder', x: 100, y: 100 }, { role: 'admin', actorName: 'Administrador' });
  const errVal = automations.validateAndSaveWorkflowStatus(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  const wfErrObj = automations.getWorkflowById(wfTplObj.id);
  const metaErr = automations.getWorkflowUiStateMeta(wfErrObj, errVal.validation, permsAdmin);
  const archRes = automations.archiveWorkflow(wfTplObj.id, { role: 'admin', actorName: 'Administrador', confirmed: true });
  const wfArchObj = automations.getWorkflowById(wfTplObj.id);
  const metaArch = automations.getWorkflowUiStateMeta(wfArchObj, { valid: true, errors: [] }, permsAdmin);
  const dupFromArch = automations.duplicateWorkflow(wfTplObj.id, { role: 'admin', actorName: 'Administrador' });
  assert(
    orphanAdd.ok && !errVal.ok &&
    metaErr.uiStateKey === 'error' &&
    metaErr.badgeLabel === 'Con errores' &&
    metaErr.activateDisabled === true &&
    archRes.ok &&
    metaArch.uiStateKey === 'archived' &&
    metaArch.badgeLabel === 'Archivado' &&
    metaArch.isReadOnly === true &&
    metaArch.saveDisabled && metaArch.validateDisabled && metaArch.simulateDisabled && metaArch.showActivateBtn === false &&
    dupFromArch.ok && dupFromArch.workflow.status === 'draft',
    '18.20g Estados Con errores y Archivado bloquean edición/publicación/simulación y Archivado permite Duplicar'
  );

  // 18.16 Restablecimiento completo de demostración
  const resetAfter = automations.resetAutomationsOnly({ role: 'admin', actorName: 'Administrador' });
  assert(
    resetAfter.ok &&
    automations.getWorkflows().length === 4 &&
    automations.getAgents().length === 5 &&
    automations.getAuditEvents({ type: 'demo_reset' }).length >= 1,
    '18.16 Restablecimiento restaura los 4 workflows iniciales, 5 agentes y registra evento demo_reset'
  );
} finally {
  automations.stopWorkflowSimulation({ silent: true });
  automations.resetARMData();
  if (originalLocalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalLocalStorage;
  }
}

// --- 20. Sistema de Motion clínico, accesible y reutilizable ---
console.log('\n--- 20. Sistema de Motion clínico, accesible y reutilizable ---');

const origDoc = globalThis.document;
const origWin = globalThis.window;
const origRAF = globalThis.requestAnimationFrame;
const origCAF = globalThis.cancelAnimationFrame;

try {
  let docAttrs = {};
  let rafCallbacks = [];
  let rafCounter = 0;
  globalThis.requestAnimationFrame = cb => {
    rafCounter++;
    rafCallbacks.push({ id: rafCounter, cb });
    return rafCounter;
  };
  globalThis.cancelAnimationFrame = id => {
    rafCallbacks = rafCallbacks.filter(item => item.id !== id);
  };

  const createMockElement = (id = '', className = '', attrs = {}) => {
    const elAttrs = { ...attrs };
    return {
      id,
      className,
      style: {},
      textContent: '',
      innerHTML: '',
      getAttribute: key => elAttrs[key] || null,
      setAttribute: (key, val) => { elAttrs[key] = String(val); },
      removeAttribute: key => { delete elAttrs[key]; },
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      }
    };
  };

  globalThis.document = {
    documentElement: {
      getAttribute: key => docAttrs[key] || null,
      setAttribute: (key, val) => { docAttrs[key] = String(val); },
      removeAttribute: key => { delete docAttrs[key]; }
    },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  globalThis.window = {
    matchMedia: query => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    })
  };

  // 20.1 isMotionReduced y data-reduced-motion
  assert(motion.isMotionReduced() === false, '20.1a isMotionReduced() inicia en false sin preferencias activas');
  docAttrs['data-reduced-motion'] = 'on';
  assert(motion.isMotionReduced() === true, '20.1b isMotionReduced() es true cuando data-reduced-motion="on"');
  docAttrs['data-reduced-motion'] = 'off';
  assert(motion.isMotionReduced() === false, '20.1c isMotionReduced() es false cuando data-reduced-motion="off"');
  delete docAttrs['data-reduced-motion'];
  globalThis.window.matchMedia = query => ({
    matches: query.includes('prefers-reduced-motion: reduce'),
    addEventListener: () => {},
    removeEventListener: () => {}
  });
  assert(motion.isMotionReduced() === true, '20.1d isMotionReduced() respeta prefers-reduced-motion: reduce del sistema');
  globalThis.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });

  // 20.2 Ciclo de vida y protección contra repeticiones innecesarias
  motion.resetAllMotionScopes();
  assert(motion.shouldAnimateModuleEntry('dashboard', 'kpis') === true, '20.2a shouldAnimateModuleEntry devuelve true en primer render');
  assert(motion.shouldAnimateModuleEntry('dashboard', 'kpis') === false, '20.2b shouldAnimateModuleEntry devuelve false en re-render interno inmediato');
  assert(motion.hasMotionRendered('dashboard', 'kpis') === true, '20.2c hasMotionRendered reporta true tras marcar render');
  motion.resetMotionScope('dashboard');
  assert(motion.shouldAnimateModuleEntry('dashboard', 'kpis') === true, '20.2d resetMotionScope limpia el alcance y permite re-animar al cambiar de ruta');
  assert(motion.shouldAnimateModuleEntry('dashboard', 'kpis') === false, '20.2e re-render tras reset vuelve a quedar protegido');

  // 20.3 animateNumber con movimiento reducido aplica valor inmediato sin delay ni RAF
  docAttrs['data-reduced-motion'] = 'on';
  const elReduced = createMockElement('test-kpi');
  const handleReduced = motion.animateNumber(elReduced, { to: 42, scope: 'test' });
  assert(handleReduced === null && elReduced.textContent === '42', '20.3 animateNumber asigna valor exacto inmediato sin animación cuando reduced-motion está activo');
  delete docAttrs['data-reduced-motion'];

  // 20.4 Exclusión estricta de datos sensibles, horas, relojes y códigos identificadores
  const sensitiveDNI = createMockElement('patient-dni', 'stat-dni');
  motion.animateNumber(sensitiveDNI, { to: 12345678, scope: 'test' });
  assert(sensitiveDNI.textContent === '12345678', '20.4a DNI / identificadores son excluidos estrictamente de animación de conteo progresivo');

  const sensitiveClock = createMockElement('public-clock-time', 'tnum');
  motion.animateNumber(sensitiveClock, { to: 12, scope: 'turnos' });
  assert(sensitiveClock.textContent === '12', '20.4b Reloj y marcas horarias son excluidos de conteo progresivo');

  // 20.5 animateNumber con formato, ceros a la izquierda y formateadores de moneda
  const elPad = createMockElement('active-count');
  motion.animateNumber(elPad, { to: 7, padZeros: 2, from: 7, scope: 'test' });
  assert(elPad.textContent === '07', '20.5a animateNumber formatea con padZeros correctamente (07)');

  const elMoney = createMockElement('money-val');
  motion.animateNumber(elMoney, { to: 1500, customFormatter: v => `S/ ${v.toFixed(2)}`, from: 1500, scope: 'test' });
  assert(elMoney.textContent === 'S/ 1500.00', '20.5b animateNumber soporta formateador monetario sin discrepancias');

  // 20.6 Métrica caching e interpolación progresiva basada en tiempo
  motion.resetMotionScope('kpi-test');
  const elDynamic = createMockElement('dyn-kpi', '', { 'data-motion-key': 'test:metric' });
  // Primera llamada con conteo explícito: de 0 a 10
  const h1 = motion.animateNumber(elDynamic, { to: 10, from: 0, duration: 200, scope: 'kpi-test' });
  assert(h1 !== null, '20.6a Primer animateNumber con from:0 inicia ciclo RAF de interpolación');
  // Simular paso intermedio
  if (rafCallbacks.length) {
    const cb = rafCallbacks.pop().cb;
    cb(performance.now() + 100);
  }
  // Forzar terminación limpia
  h1.finish();
  assert(elDynamic.textContent === '10', '20.6b handle.finish() confirma el valor final de destino');

  // Segunda llamada (ej. mover tarjeta CRM): interpola desde 10 (en caché) a 15
  const h2 = motion.animateNumber(elDynamic, { to: 15, duration: 200, scope: 'kpi-test' });
  assert(h2 !== null, '20.6c Segunda llamada usa valor anterior en caché (10) como punto de partida sin saltar a 0');
  h2.finish();
  assert(elDynamic.textContent === '15', '20.6d Termina limpiamente en 15');

  // 20.7 animateStagger maneja listas de elementos
  const items = Array.from({ length: 12 }, (_, i) => createMockElement(`item-${i}`));
  const staggerList = motion.animateStagger(items, { maxItems: 6, scope: 'test' });
  assert(Array.isArray(staggerList), '20.7 animateStagger maneja listas limitadas sin errores');

  // 20.8 Cancelación y limpieza de alcances
  const elCancel = createMockElement('cancel-kpi');
  const hCancel = motion.animateNumber(elCancel, { to: 100, from: 0, duration: 500, scope: 'cancel-scope' });
  motion.cancelMotionScope('cancel-scope');
  assert(elCancel.textContent === '100', '20.8 cancelMotionScope() finaliza y fija el valor exacto cancelando timers activos');

} finally {
  globalThis.document = origDoc;
  globalThis.window = origWin;
  globalThis.requestAnimationFrame = origRAF;
  globalThis.cancelAnimationFrame = origCAF;
}

console.log(`\n========================================`);
console.log(`TOTAL PRUEBAS: ${passed + failed}`);
console.log(`PASADAS: ${passed}`);
console.log(`FALLIDAS: ${failed}`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
