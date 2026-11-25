// Módulo de Dashboard Ejecutivo para el Panel General v1.3
// Clínica Oftalmológica · Sistema de Gestión Clínica y CRM + ARM
// Arquitectura relacional basada en entidades (Fixtures válidos -> Consultas -> Agregaciones -> KPIs -> Gráficos)

import * as motion from './motion.js';
import { getARMSummary } from './arm.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const formatMoney = val => 'S/ ' + Number(val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPercent = (val, withSign = true) => {
  const num = Number(val || 0);
  if (Math.abs(Number(num.toFixed(1))) === 0) return '0.0%';
  const sign = withSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

// Catálogo base de especialidades y procedimientos de la clínica
export const SPECIALTIES_CATALOG = [
  { id: 'general', name: 'Oftalmología general', color: '#1b4d3e', description: 'Refracción, agudeza visual y descarte' },
  { id: 'retina', name: 'Retina y Vítreo', color: '#2563eb', description: 'Retinopatía diabética, desprendimientos y láser' },
  { id: 'glaucoma', name: 'Glaucoma', color: '#d97706', description: 'Control de PIO, campo visual y trabeculectomía' },
  { id: 'cornea', name: 'Córnea y Segmento Anterior', color: '#0d9488', description: 'Topografía, queratocono y superficie ocular' },
  { id: 'pediatrica', name: 'Oftalmología pediátrica', color: '#8b5cf6', description: 'Estrabismo, ambliopía y tamizaje visual' }
];

export const SURGERIES_CATALOG = [
  { id: 'catarata', name: 'Catarata', fullName: 'Facoemulsificación con LIO', color: '#1b4d3e' },
  { id: 'refractiva', name: 'Cirugía refractiva', fullName: 'Cirugía láser LASIK / PRK', color: '#0284c7' },
  { id: 'retina', name: 'Retina quirúrgica', fullName: 'Vitrectomía posterior / Láser', color: '#3b82f6' },
  { id: 'glaucoma', name: 'Glaucoma quirúrgico', fullName: 'Trabeculectomía / Válvula', color: '#d97706' }
];

export const SEDES_CATALOG = [
  { id: 'all', name: 'Todas las sedes' },
  { id: 'principal', name: 'Sede Principal (San Isidro)' },
  { id: 'norte', name: 'Sede Norte (Los Olivos)' },
  { id: 'sur', name: 'Sede Sur (Surco)' }
];

export const PERIODS_CATALOG = [
  { id: 'hoy', name: 'Hoy (27 Oct 2026)', short: 'Hoy', label: 'hoy' },
  { id: '7d', name: 'Últimos 7 días', short: '7 días', label: '7 días' },
  { id: '30d', name: 'Últimos 30 días', short: '30 días', label: '30 días' },
  { id: '90d', name: 'Últimos 90 días', short: '90 días', label: '90 días' }
];

export const DOCTORS_CATALOG = [
  { id: 'all', name: 'Todos los especialistas' },
  { id: 'Dra. Valeria Ríos', name: 'Dra. Valeria Ríos (Córnea/Gral)' },
  { id: 'Dr. Diego Ramírez', name: 'Dr. Diego Ramírez (Retina/Glaucoma)' }
];

const DOCTOR_RIOS = 'Dra. Valeria Ríos';
const DOCTOR_RAMIREZ = 'Dr. Diego Ramírez';
const VALID_SEDES = ['principal', 'norte', 'sur'];
const VALID_DOCTORS = [DOCTOR_RIOS, DOCTOR_RAMIREZ];
const VALID_ORIGINS = ['WhatsApp', 'Instagram', 'Google', 'Facebook', 'Referido', 'Presencial', 'No especificado'];

// Estado global reactivo del Dashboard Ejecutivo
export const dashboardState = {
  tab: 'general', // 'general' | 'medico' | 'comercial'
  period: 'hoy',  // 'hoy' | '7d' | '30d' | '90d'
  sede: 'all',    // 'all' | 'principal' | 'norte' | 'sur'
  doctor: 'all',  // 'all' | 'Dra. Valeria Ríos' | 'Dr. Diego Ramírez'
  lastUpdated: '2026-10-27 12:00'
};

/**
 * Reconciliación determinista de enteros (Método del Resto Mayor / Hamilton).
 * Conservada por compatibilidad de utilidad matemática; no se emplea para fabricar
 * registros ni atribuir pacientes o ingresos.
 */
export function reconcileIntegerSeries(values, targetTotal) {
  const safeTarget = Math.max(0, Math.round(Number(targetTotal) || 0));
  if (!Array.isArray(values) || values.length === 0) return [];
  if (safeTarget === 0) return values.map(() => 0);

  const clean = values.map(v => Math.max(0, Number(v) || 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const fallback = clean.map(() => 0);
    fallback[0] = safeTarget;
    return fallback;
  }

  const quotas = clean.map((v, idx) => {
    const exact = (v / sum) * safeTarget;
    const floor = Math.floor(exact);
    return { idx, floor, rem: exact - floor, base: v };
  });

  const currentSum = quotas.reduce((acc, q) => acc + q.floor, 0);
  let diff = safeTarget - currentSum;

  quotas.sort((a, b) => (b.rem - a.rem) || (b.base - a.base) || (a.idx - b.idx));
  for (let i = 0; i < quotas.length && diff > 0; i++) {
    quotas[i].floor += 1;
    diff -= 1;
  }

  const out = new Array(values.length).fill(0);
  for (const q of quotas) {
    out[q.idx] = Math.max(0, q.floor);
  }
  return out;
}

export function reconcilePairedSeries(schedWeights, attendWeights, targetScheduled, targetAttended) {
  const scheduled = reconcileIntegerSeries(schedWeights, targetScheduled);
  const schedTotal = scheduled.reduce((a, b) => a + b, 0);
  const safeAttendedTarget = Math.min(schedTotal, Math.max(0, Math.round(Number(targetAttended) || 0)));
  const rawAttended = reconcileIntegerSeries(attendWeights, safeAttendedTarget);
  const attended = rawAttended.map((v, i) => Math.min(v, scheduled[i]));
  let deficit = safeAttendedTarget - attended.reduce((a, b) => a + b, 0);

  while (deficit > 0) {
    let bestIdx = -1;
    let bestSlack = 0;
    for (let i = 0; i < scheduled.length; i++) {
      const slack = scheduled[i] - attended[i];
      if (slack > bestSlack) {
        bestSlack = slack;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    attended[bestIdx] += 1;
    deficit -= 1;
  }

  return { scheduled, attended };
}

export function computeVariationMeta(current, previous, { invertPolarity = false } = {}) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0 && cur === 0) {
    return {
      variation: 0,
      hasValidBase: true,
      state: 'neutral',
      isPositive: false,
      isNeutral: true,
      label: '0.0%'
    };
  }

  if (prev <= 0 && cur > 0) {
    return {
      variation: 0,
      hasValidBase: false,
      state: 'neutral',
      isPositive: false,
      isNeutral: true,
      label: 'Sin base previa'
    };
  }

  const rawVar = ((cur - prev) / prev) * 100;
  const rounded = Number(rawVar.toFixed(1));
  if (Math.abs(rounded) === 0) {
    return {
      variation: 0,
      hasValidBase: true,
      state: 'neutral',
      isPositive: false,
      isNeutral: true,
      label: '0.0%'
    };
  }

  const isUp = rounded > 0;
  const favorable = invertPolarity ? !isUp : isUp;
  return {
    variation: rawVar,
    hasValidBase: true,
    state: favorable ? 'up' : 'down',
    isPositive: favorable,
    isNeutral: false,
    label: formatPercent(rawVar)
  };
}

// ============================================================================
// VENTANAS TEMPORALES Y PARTICIONES DE INTERVALOS (v1.3)
// ============================================================================

export const PERIOD_WINDOWS = Object.freeze({
  hoy: Object.freeze({
    id: 'hoy',
    label: 'Hoy (27 Oct 2026)',
    previousLabel: 'Ayer (26 Oct 2026)',
    startDate: '2026-10-27',
    endDate: '2026-10-27',
    prevStartDate: '2026-10-26',
    prevEndDate: '2026-10-26',
    surgeryStatusLabel: '100% quirófanos cubiertos en turno tarde',
    trendBuckets: Object.freeze([
      { label: '08:00', match: r => r.startTime >= '08:00' && r.startTime < '10:00' },
      { label: '10:00', match: r => r.startTime >= '10:00' && r.startTime < '12:00' },
      { label: '12:00', match: r => r.startTime >= '12:00' && r.startTime < '14:00' },
      { label: '14:00', match: r => r.startTime >= '14:00' && r.startTime < '16:00' },
      { label: '16:00', match: r => r.startTime >= '16:00' && r.startTime < '18:00' },
      { label: '18:00', match: r => r.startTime >= '18:00' }
    ]),
    revenueBuckets: Object.freeze([
      { label: '08:00–10:00', match: r => r.time >= '08:00' && r.time < '10:00' },
      { label: '10:00–12:00', match: r => r.time >= '10:00' && r.time < '12:00' },
      { label: '12:00–14:00', match: r => r.time >= '12:00' && r.time < '14:00' },
      { label: '14:00–18:00', match: r => r.time >= '14:00' }
    ])
  }),
  '7d': Object.freeze({
    id: '7d',
    label: 'Últimos 7 días (21–27 Oct 2026)',
    previousLabel: '7 días previos (14–20 Oct 2026)',
    startDate: '2026-10-21',
    endDate: '2026-10-27',
    prevStartDate: '2026-10-14',
    prevEndDate: '2026-10-20',
    surgeryStatusLabel: 'Programación quirúrgica semanal verificada',
    trendBuckets: Object.freeze([
      { label: 'Mié 21', match: r => r.date === '2026-10-21' },
      { label: 'Jue 22', match: r => r.date === '2026-10-22' },
      { label: 'Vie 23', match: r => r.date === '2026-10-23' },
      { label: 'Sáb 24', match: r => r.date >= '2026-10-24' && r.date <= '2026-10-25' },
      { label: 'Lun 26', match: r => r.date === '2026-10-26' },
      { label: 'Mar 27', match: r => r.date === '2026-10-27' }
    ]),
    revenueBuckets: Object.freeze([
      { label: 'Mié 21', match: r => r.date === '2026-10-21' },
      { label: 'Jue 22', match: r => r.date === '2026-10-22' },
      { label: 'Vie 23', match: r => r.date === '2026-10-23' },
      { label: 'Sáb 24', match: r => r.date >= '2026-10-24' && r.date <= '2026-10-25' },
      { label: 'Lun 26', match: r => r.date === '2026-10-26' },
      { label: 'Mar 27', match: r => r.date === '2026-10-27' }
    ])
  }),
  '30d': Object.freeze({
    id: '30d',
    label: 'Últimos 30 días (28 Sep–27 Oct 2026)',
    previousLabel: '30 días previos (29 Ago–27 Sep 2026)',
    startDate: '2026-09-28',
    endDate: '2026-10-27',
    prevStartDate: '2026-08-29',
    prevEndDate: '2026-09-27',
    surgeryStatusLabel: 'Bloque quirúrgico mensual con trazabilidad clínica',
    trendBuckets: Object.freeze([
      { label: 'Sem 1 (28 Sep)', match: r => r.date >= '2026-09-28' && r.date <= '2026-10-04' },
      { label: 'Sem 2 (05 Oct)', match: r => r.date >= '2026-10-05' && r.date <= '2026-10-11' },
      { label: 'Sem 3 (12 Oct)', match: r => r.date >= '2026-10-12' && r.date <= '2026-10-18' },
      { label: 'Sem 4 (19 Oct)', match: r => r.date >= '2026-10-19' && r.date <= '2026-10-25' },
      { label: 'Sem 5 (26 Oct)', match: r => r.date >= '2026-10-26' && r.date <= '2026-10-27' }
    ]),
    revenueBuckets: Object.freeze([
      { label: 'Sem 1', match: r => r.date >= '2026-09-28' && r.date <= '2026-10-04' },
      { label: 'Sem 2', match: r => r.date >= '2026-10-05' && r.date <= '2026-10-11' },
      { label: 'Sem 3', match: r => r.date >= '2026-10-12' && r.date <= '2026-10-18' },
      { label: 'Sem 4', match: r => r.date >= '2026-10-19' && r.date <= '2026-10-25' },
      { label: 'Sem 5', match: r => r.date >= '2026-10-26' && r.date <= '2026-10-27' }
    ])
  }),
  '90d': Object.freeze({
    id: '90d',
    label: 'Últimos 90 días (30 Jul–27 Oct 2026)',
    previousLabel: '90 días previos (01 May–29 Jul 2026)',
    startDate: '2026-07-30',
    endDate: '2026-10-27',
    prevStartDate: '2026-05-01',
    prevEndDate: '2026-07-29',
    surgeryStatusLabel: 'Agenda quirúrgica trimestral verificada',
    trendBuckets: Object.freeze([
      { label: 'Agosto 2026', match: r => r.date >= '2026-07-30' && r.date <= '2026-08-31' },
      { label: 'Septiembre 2026', match: r => r.date >= '2026-09-01' && r.date <= '2026-09-30' },
      { label: 'Octubre 2026', match: r => r.date >= '2026-10-01' && r.date <= '2026-10-27' }
    ]),
    revenueBuckets: Object.freeze([
      { label: 'Agosto 2026', match: r => r.date >= '2026-07-30' && r.date <= '2026-08-31' },
      { label: 'Septiembre 2026', match: r => r.date >= '2026-09-01' && r.date <= '2026-09-30' },
      { label: 'Octubre 2026', match: r => r.date >= '2026-10-01' && r.date <= '2026-10-27' }
    ])
  })
});

// ============================================================================
// CONSTRUCCIÓN RELACIONAL BASADA EN ENTIDADES Y REGLAS CLÍNICAS (v1.3)
// ============================================================================

const FICTITIOUS_FIRST_NAMES = [
  'María', 'Carlos', 'Ana', 'Luis', 'Elena', 'Jorge', 'Lucía', 'Pedro',
  'Rosa', 'Miguel', 'Carmen', 'José', 'Sofía', 'Daniel', 'Valeria', 'Fernando',
  'Gabriela', 'Ricardo', 'Patricia', 'Alejandro', 'Claudia', 'Roberto', 'Natalia', 'Andrés',
  'Camila', 'Sebastián', 'Paula', 'Diego', 'Adriana', 'Javier', 'Mónica', 'Héctor'
];

const FICTITIOUS_LAST_NAMES = [
  'López García', 'Mendoza Ruiz', 'Torres Medina', 'Pérez Salazar', 'Soto Vargas',
  'Benavides Paz', 'Quispe Huamán', 'Rojas Paredes', 'Castillo Flores', 'Vargas Díaz',
  'Morales Castro', 'Sánchez Vega', 'Romero Chávez', 'Gómez Silva', 'Díaz Aguilar',
  'Fernández Luna', 'Cruzado Peña', 'Herrera Campos', 'Medina Ortega', 'Delgado Ríos',
  'Paredes León', 'Aguirre Montes', 'Salinas Ponce', 'Cárdenas Meza'
];

function getPatientFictitiousName(seq) {
  if (seq === 1) return 'María López García';
  if (seq === 2) return 'Carlos Mendoza Ruiz';
  if (seq === 3) return 'Ana Torres Medina';
  if (seq === 4) return 'Luis Pérez Salazar';
  if (seq === 5) return 'Elena Soto Vargas';
  const f = FICTITIOUS_FIRST_NAMES[(seq - 1) % FICTITIOUS_FIRST_NAMES.length];
  const l = FICTITIOUS_LAST_NAMES[Math.floor((seq - 1) / 2) % FICTITIOUS_LAST_NAMES.length];
  return `${f} ${l}`;
}

function addMinutesToTime(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

const SPECIALTY_TARIFFS = Object.freeze({
  general: 150,
  retina: 180,
  glaucoma: 160,
  cornea: 150,
  pediatrica: 140
});

const SURGERY_TARIFFS = Object.freeze({
  catarata: 950,
  refractiva: 850,
  retina: 1200,
  glaucoma: 1100
});

// Bloques horarios de consulta externa de 30 minutos (estrictamente disjuntos)
const CONSULT_SLOTS = Object.freeze([
  { start: '08:00', end: '08:30', block: 'morning_1' },
  { start: '08:30', end: '09:00', block: 'morning_1' },
  { start: '09:00', end: '09:30', block: 'morning_2' },
  { start: '09:30', end: '10:00', block: 'morning_2' },
  { start: '10:00', end: '10:30', block: 'mid_1' },
  { start: '10:30', end: '11:00', block: 'mid_1' },
  { start: '11:00', end: '11:30', block: 'mid_2' },
  { start: '12:30', end: '13:00', block: 'noon' },
  { start: '14:30', end: '15:00', block: 'afternoon' },
  { start: '15:30', end: '16:00', block: 'afternoon' }
]);

// Bloques horarios quirúrgicos de 60 minutos (fuera del horario de consulta externa)
const SURGICAL_SLOTS = Object.freeze([
  { start: '17:00', end: '18:00' },
  { start: '18:00', end: '19:00' }
]);

function buildRelationalDemoFixtures() {
  const patientsCatalog = [];
  const appointments = [];
  const newPatients = [];
  const surgeries = [];
  const studyOrders = [];
  const transactions = [];
  const crmRecords = [];

  let patSeq = 1;
  let appSeq = 1;
  let surgSeq = 1;
  let trxSeq = 1;
  let cpSeq = 100;
  let opSeq = 100;
  let leadSeq = 1;
  let techOrderSeq = 1;

  const createCatalogPatient = ({
    cohortType,
    historicalFirstDate = null,
    historicalSede = null,
    historicalDoctor = null,
    registeredDate = null,
    registeredSede = null
  }) => {
    const id = `PAT-2026-${String(patSeq).padStart(4, '0')}`;
    const patientCode = `HC-2026-${String(patSeq).padStart(4, '0')}`;
    const patientName = getPatientFictitiousName(patSeq);
    patSeq++;
    const rec = {
      id,
      patientCode,
      patientName,
      cohortType, // 'recurrente_historico' | 'nuevo_atendido' | 'registrado_sin_primera_atencion_medica'
      firstAttentionCompleted: cohortType === 'recurrente_historico',
      firstAttentionDate: historicalFirstDate,
      sede: historicalSede || registeredSede || 'principal',
      firstAttentionDoctor: historicalDoctor,
      firstAppointmentId: null,
      registeredDate: registeredDate || historicalFirstDate
    };
    patientsCatalog.push(rec);
    return rec;
  };

  // 1. Crear pacientes recurrentes históricos (primera atención en 2025, antes de la ventana de 180 días)
  const recurrentPatients = [];
  for (let i = 0; i < 24; i++) {
    const sede = VALID_SEDES[i % VALID_SEDES.length];
    const doc = i % 2 === 0 ? DOCTOR_RIOS : DOCTOR_RAMIREZ;
    recurrentPatients.push(createCatalogPatient({
      cohortType: 'recurrente_historico',
      historicalFirstDate: `2025-11-${String((i % 20) + 1).padStart(2, '0')}`,
      historicalSede: sede,
      historicalDoctor: doc
    }));
  }

  const pushAppointmentRecord = ({
    patientId,
    date,
    startTime,
    endTime,
    sede,
    doctor,
    specialty,
    status,
    confirmationStatus,
    followUpStatus
  }) => {
    const id = `APT-2026-${String(appSeq).padStart(4, '0')}`;
    appSeq++;
    const resolvedEnd = endTime || addMinutesToTime(startTime, 30);
    const resolvedConfirm = confirmationStatus || (
      status === 'Pendiente' ? 'confirmada' : (status === 'Atendida' ? 'confirmada' : 'no_requiere')
    );
    const resolvedFollowUp = followUpStatus || (
      status === 'No asistió'
        ? 'pendiente_reagendamiento'
        : (status === 'Pendiente' && resolvedConfirm === 'pendiente_confirmacion'
          ? 'pendiente_seguimiento'
          : (status === 'Atendida' ? 'completado' : 'al_dia'))
    );
    const requiresHumanIntervention =
      status === 'No asistió' || (status === 'Pendiente' && resolvedConfirm === 'pendiente_confirmacion');
    const operationalPriority =
      status === 'No asistió'
        ? 'alta'
        : (status === 'Pendiente' && resolvedConfirm === 'pendiente_confirmacion'
          ? 'media'
          : (status === 'Pendiente' ? 'informativa' : 'normal'));

    const app = Object.freeze({
      id,
      patientId,
      date,
      time: startTime,
      startTime,
      endTime: resolvedEnd,
      sede,
      doctor,
      specialty,
      status,
      confirmationStatus: resolvedConfirm,
      followUpStatus: resolvedFollowUp,
      requiresHumanIntervention,
      operationalPriority
    });
    appointments.push(app);
    return app;
  };

  // Calendario de jornadas clínicas operativas desde 2026-05-01 hasta 2026-10-26
  // Cada fecha define turnos reales sin solapamientos para Dra. Valeria Ríos y Dr. Diego Ramírez
  const HISTORICAL_CLINIC_DAYS = [
    // Ventana 90d previa (2026-05-01 .. 2026-07-29): 12 jornadas representativas
    { date: '2026-05-06', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'catarata', surgRamirez: null },
    { date: '2026-05-14', riosSedes: ['principal', 'sur'], ramirezSedes: ['norte', 'principal'], newPatsRios: 1, newPatsRamirez: 2, unattrTechSede: 'norte', surgRios: 'refractiva', surgRamirez: 'retina' },
    { date: '2026-05-22', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: null },
    { date: '2026-05-29', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: null, surgRamirez: 'glaucoma' },
    { date: '2026-06-05', riosSedes: ['principal', 'sur'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-06-12', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'sur'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'norte', surgRios: 'refractiva', surgRamirez: null },
    { date: '2026-06-19', riosSedes: ['principal', 'norte'], ramirezSedes: ['norte', 'principal'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'catarata', surgRamirez: 'glaucoma' },
    { date: '2026-06-26', riosSedes: ['sur', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 1, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: null, surgRamirez: 'retina' },
    { date: '2026-07-04', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'norte', surgRios: 'catarata', surgRamirez: 'refractiva' },
    { date: '2026-07-11', riosSedes: ['principal', 'sur'], ramirezSedes: ['norte', 'principal'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'refractiva', surgRamirez: null },
    { date: '2026-07-18', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-07-25', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'catarata', surgRamirez: 'glaucoma' },

    // Ventana 90d actual - Agosto (2026-07-30 .. 2026-08-31): 6 jornadas (4 en Ago temprano + 2 en 30d.previous)
    { date: '2026-08-03', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-08-10', riosSedes: ['principal', 'sur'], ramirezSedes: ['norte', 'principal'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'norte', surgRios: 'refractiva', surgRamirez: 'glaucoma' },
    { date: '2026-08-18', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'sur', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-08-25', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 1, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: null },
    { date: '2026-08-29', riosSedes: ['principal', 'sur'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'refractiva', surgRamirez: 'retina' },
    { date: '2026-08-31', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'sur'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'norte', surgRios: 'catarata', surgRamirez: null },

    // Ventana 90d actual - Septiembre previo (2026-09-01 .. 2026-09-27, parte de 30d.previous): 5 jornadas
    { date: '2026-09-04', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-09-10', riosSedes: ['principal', 'sur'], ramirezSedes: ['norte', 'principal'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'refractiva', surgRamirez: 'glaucoma' },
    { date: '2026-09-16', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'norte', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-09-21', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 1, newPatsRamirez: 2, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: null },
    { date: '2026-09-25', riosSedes: ['sur', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'refractiva', surgRamirez: 'glaucoma' },

    // Ventana 30d actual - Sem 1 (2026-09-28 .. 2026-10-04): 2 jornadas (1 en Sep + 1 en Oct)
    { date: '2026-09-29', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-10-02', riosSedes: ['principal', 'sur'], ramirezSedes: ['norte', 'principal'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'norte', surgRios: 'refractiva', surgRamirez: 'glaucoma' },

    // Ventana 30d actual - Sem 2 (2026-10-05 .. 2026-10-11): 2 jornadas
    { date: '2026-10-06', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'sur', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-10-09', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'refractiva' },

    // Ventana 30d actual - Sem 3 antes de 7d.previous (2026-10-12 .. 2026-10-13): 1 jornada
    { date: '2026-10-12', riosSedes: ['principal', 'sur'], ramirezSedes: ['principal', 'norte'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'norte', surgRios: 'catarata', surgRamirez: 'glaucoma' },

    // Ventana 7d.previous (2026-10-14 .. 2026-10-20): 4 jornadas (3 en Sem 3 + 1 en Sem 4)
    { date: '2026-10-14', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-10-16', riosSedes: ['norte', 'principal'], ramirezSedes: ['norte', 'principal'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'sur', surgRios: 'refractiva', surgRamirez: null },
    { date: '2026-10-17', riosSedes: ['principal', 'sur'], ramirezSedes: ['principal', 'norte'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'norte', surgRios: 'catarata', surgRamirez: 'glaucoma' },
    { date: '2026-10-20', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'retina' },

    // Ventana 7d actual (2026-10-21 .. 2026-10-26): 5 jornadas activas previas a Hoy
    { date: '2026-10-21', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: 'catarata', surgRamirez: 'refractiva' },
    { date: '2026-10-22', riosSedes: ['principal', 'sur'], ramirezSedes: ['norte', 'principal'], newPatsRios: 2, newPatsRamirez: 2, unattrTechSede: 'norte', surgRios: 'catarata', surgRamirez: 'retina' },
    { date: '2026-10-23', riosSedes: ['norte', 'principal'], ramirezSedes: ['principal', 'norte'], newPatsRios: 1, newPatsRamirez: 2, unattrTechSede: 'sur', surgRios: 'refractiva', surgRamirez: 'glaucoma' },
    { date: '2026-10-24', riosSedes: ['principal', 'norte'], ramirezSedes: ['sur', 'principal'], newPatsRios: 1, newPatsRamirez: 1, unattrTechSede: 'principal', surgRios: null, surgRamirez: 'retina' },
    // Ayer 2026-10-26 (previous de Hoy: Dra. Ríos tiene 1 cirugía; Dr. Ramírez tiene 0 cirugías ayer -> variación "Sin base previa" hoy)
    { date: '2026-10-26', riosSedes: ['principal', 'norte'], ramirezSedes: ['principal', 'sur'], newPatsRios: 2, newPatsRamirez: 1, unattrTechSede: 'sur', surgRios: 'catarata', surgRamirez: null }
  ];

  const riosSpecialties = ['general', 'cornea', 'pediatrica', 'general', 'cornea'];
  const ramirezSpecialties = ['retina', 'glaucoma', 'general', 'retina', 'glaucoma'];

  let recCursor = 0;
  const nextRecurrentPatient = () => {
    const p = recurrentPatients[recCursor % recurrentPatients.length];
    recCursor++;
    return p;
  };

  for (let dIdx = 0; dIdx < HISTORICAL_CLINIC_DAYS.length; dIdx++) {
    const day = HISTORICAL_CLINIC_DAYS[dIdx];
    const { date, riosSedes, ramirezSedes, newPatsRios, newPatsRamirez, unattrTechSede, surgRios, surgRamirez } = day;

    const dayAttendedRios = [];
    const dayAttendedRamirez = [];

    // 1. Generar citas de Dra. Valeria Ríos en horarios estrictamente disjuntos (08:00, 08:30, 09:00, 10:00, 11:00)
    const riosSlots = [
      { start: '08:00', end: '08:30', sede: riosSedes[0], isNew: newPatsRios >= 1, status: 'Atendida' },
      { start: '08:30', end: '09:00', sede: riosSedes[0], isNew: newPatsRios >= 2, status: 'Atendida' },
      { start: '09:00', end: '09:30', sede: riosSedes[0], isNew: false, status: 'Atendida' },
      { start: '10:30', end: '11:00', sede: riosSedes[1], isNew: false, status: dIdx % 3 === 0 ? 'Pendiente' : 'Atendida', confirm: dIdx % 6 === 0 ? 'pendiente_confirmacion' : 'confirmada' },
      { start: '11:30', end: '12:00', sede: riosSedes[1], isNew: false, status: dIdx % 4 === 0 ? 'Cancelada' : (dIdx % 5 === 0 ? 'No asistió' : 'Pendiente'), confirm: 'confirmada' }
    ];

    riosSlots.forEach((slot, sIdx) => {
      let pat;
      if (slot.isNew && slot.status === 'Atendida') {
        pat = createCatalogPatient({
          cohortType: 'nuevo_atendido',
          registeredDate: date,
          registeredSede: slot.sede
        });
      } else {
        pat = nextRecurrentPatient();
      }
      const spec = riosSpecialties[(dIdx + sIdx) % riosSpecialties.length];
      const app = pushAppointmentRecord({
        patientId: pat.id,
        date,
        startTime: slot.start,
        endTime: slot.end,
        sede: slot.sede,
        doctor: DOCTOR_RIOS,
        specialty: spec,
        status: slot.status,
        confirmationStatus: slot.confirm
      });
      if (app.status === 'Atendida') {
        dayAttendedRios.push(app);
      }
    });

    // 2. Generar citas de Dr. Diego Ramírez en horarios estrictamente disjuntos (09:30, 10:00, 11:00, 12:30, 15:00)
    // Nota: los horarios también son distintos a los de los pacientes recurrentes de esa mañana para evitar colisión por paciente
    const ramirezSlots = [
      { start: '09:30', end: '10:00', sede: ramirezSedes[0], isNew: newPatsRamirez >= 1, status: 'Atendida' },
      { start: '10:00', end: '10:30', sede: ramirezSedes[0], isNew: newPatsRamirez >= 2, status: 'Atendida' },
      { start: '11:00', end: '11:30', sede: ramirezSedes[0], isNew: false, status: 'Atendida' },
      { start: '12:30', end: '13:00', sede: ramirezSedes[1], isNew: false, status: dIdx % 3 === 1 ? 'Pendiente' : 'Atendida', confirm: dIdx % 5 === 1 ? 'pendiente_confirmacion' : 'confirmada' },
      { start: '15:00', end: '15:30', sede: ramirezSedes[1], isNew: false, status: dIdx % 4 === 1 ? 'No asistió' : (dIdx % 5 === 2 ? 'Cancelada' : 'Pendiente'), confirm: 'confirmada' }
    ];

    ramirezSlots.forEach((slot, sIdx) => {
      let pat;
      if (slot.isNew && slot.status === 'Atendida') {
        pat = createCatalogPatient({
          cohortType: 'nuevo_atendido',
          registeredDate: date,
          registeredSede: slot.sede
        });
      } else {
        pat = nextRecurrentPatient();
      }
      const spec = ramirezSpecialties[(dIdx + sIdx) % ramirezSpecialties.length];
      const app = pushAppointmentRecord({
        patientId: pat.id,
        date,
        startTime: slot.start,
        endTime: slot.end,
        sede: slot.sede,
        doctor: DOCTOR_RAMIREZ,
        specialty: spec,
        status: slot.status,
        confirmationStatus: slot.confirm
      });
      if (app.status === 'Atendida') {
        dayAttendedRamirez.push(app);
      }
    });

    // 3. Paciente registrado sin primera atención médica completada (estudio técnico directo en la jornada)
    const techPat = createCatalogPatient({
      cohortType: 'registrado_sin_primera_atencion_medica',
      registeredDate: date,
      registeredSede: unattrTechSede
    });

    // Orden de estudio técnico sin especialista médico atribuido
    const techOrderId = `ORD-TEC-${String(techOrderSeq++).padStart(4, '0')}`;
    studyOrders.push(Object.freeze({
      id: techOrderId,
      date,
      time: '13:30',
      sede: unattrTechSede,
      patientId: techPat.id,
      specialist: null,
      studyType: 'Topografía y paquimetría corneal por optometría'
    }));
    const techPaid = dIdx % 3 !== 0;
    transactions.push(Object.freeze({
      id: `TRX-2026-${String(trxSeq++).padStart(4, '0')}`,
      date,
      time: '13:30',
      sede: unattrTechSede,
      patientId: techPat.id,
      amount: 110,
      paymentStatus: techPaid ? 'cobrado' : 'pendiente',
      operationRef: techPaid ? `CP-${String(cpSeq++).padStart(4, '0')}` : `OP-${String(opSeq++).padStart(4, '0')}`,
      specialist: null,
      appointmentId: null,
      surgeryId: null,
      studyOrderId: techOrderId,
      concept: 'Topografía y paquimetría corneal por optometría (sin atribución médica)',
      attributionStatus: 'unattributed'
    }));

    // 4. Cirugías programadas de la jornada (vinculadas a una consulta Atendida previa o del mismo día temprano)
    if (surgRios && dayAttendedRios.length > 0) {
      const indApp = dayAttendedRios[0];
      const preop = dIdx % 3 === 0 ? 'pendiente_validacion' : 'validada';
      const surg = Object.freeze({
        id: `SURG-2026-${String(surgSeq++).padStart(4, '0')}`,
        patientId: indApp.patientId,
        indicationAppointmentId: indApp.id,
        date,
        time: SURGICAL_SLOTS[0].start,
        startTime: SURGICAL_SLOTS[0].start,
        endTime: SURGICAL_SLOTS[0].end,
        sede: indApp.sede,
        doctor: DOCTOR_RIOS,
        procedureId: surgRios,
        surgicalStatus: date < '2026-10-27' ? 'Realizada' : 'Programada',
        preopEvaluationStatus: preop,
        requiresHumanIntervention: preop === 'pendiente_validacion',
        operationalPriority: preop === 'pendiente_validacion' ? 'media' : 'normal'
      });
      surgeries.push(surg);
    }

    if (surgRamirez && dayAttendedRamirez.length > 0) {
      const indApp = dayAttendedRamirez[0];
      const preop = dIdx % 3 === 1 ? 'pendiente_validacion' : 'validada';
      const surg = Object.freeze({
        id: `SURG-2026-${String(surgSeq++).padStart(4, '0')}`,
        patientId: indApp.patientId,
        indicationAppointmentId: indApp.id,
        date,
        time: SURGICAL_SLOTS[1].start,
        startTime: SURGICAL_SLOTS[1].start,
        endTime: SURGICAL_SLOTS[1].end,
        sede: indApp.sede,
        doctor: DOCTOR_RAMIREZ,
        procedureId: surgRamirez,
        surgicalStatus: date < '2026-10-27' ? 'Realizada' : 'Programada',
        preopEvaluationStatus: preop,
        requiresHumanIntervention: preop === 'pendiente_validacion',
        operationalPriority: preop === 'pendiente_validacion' ? 'media' : 'normal'
      });
      surgeries.push(surg);
    }
  }

  // ==========================================================================
  // JORNADA EXPLÍCITA DE HOY: 2026-10-27
  // ==========================================================================
  // 3 pacientes nuevos con primera atención médica Atendida hoy + 2 pacientes registrados hoy con cita Pendiente/Cancelada + 1 paciente de estudio técnico
  const patHoy1 = createCatalogPatient({ cohortType: 'nuevo_atendido', registeredDate: '2026-10-27', registeredSede: 'principal' });
  const patHoy2 = createCatalogPatient({ cohortType: 'nuevo_atendido', registeredDate: '2026-10-27', registeredSede: 'principal' });
  const patHoy3 = createCatalogPatient({ cohortType: 'nuevo_atendido', registeredDate: '2026-10-27', registeredSede: 'norte' });
  const patHoy4 = createCatalogPatient({ cohortType: 'registrado_sin_primera_atencion_medica', registeredDate: '2026-10-27', registeredSede: 'principal' });
  const patHoy5 = createCatalogPatient({ cohortType: 'registrado_sin_primera_atencion_medica', registeredDate: '2026-10-27', registeredSede: 'sur' });
  const patHoy6 = createCatalogPatient({ cohortType: 'registrado_sin_primera_atencion_medica', registeredDate: '2026-10-27', registeredSede: 'sur' });

  // Citas de Hoy (2026-10-27) sin solapamientos por médico ni por paciente:
  // 1. 08:00-08:30: Dr. Ramírez en Principal (Atendida - Primera atención de patHoy1)
  const aptHoy1 = pushAppointmentRecord({
    patientId: patHoy1.id,
    date: '2026-10-27',
    startTime: '08:00',
    endTime: '08:30',
    sede: 'principal',
    doctor: DOCTOR_RAMIREZ,
    specialty: 'retina',
    status: 'Atendida',
    confirmationStatus: 'confirmada'
  });
  // 2. 08:30-09:00: Dra. Ríos en Principal (Atendida - Primera atención de patHoy2)
  const aptHoy2 = pushAppointmentRecord({
    patientId: patHoy2.id,
    date: '2026-10-27',
    startTime: '08:30',
    endTime: '09:00',
    sede: 'principal',
    doctor: DOCTOR_RIOS,
    specialty: 'general',
    status: 'Atendida',
    confirmationStatus: 'confirmada'
  });
  // 3. 09:00-09:30: Dra. Ríos en Norte (Atendida - Primera atención de patHoy3)
  const aptHoy3 = pushAppointmentRecord({
    patientId: patHoy3.id,
    date: '2026-10-27',
    startTime: '09:00',
    endTime: '09:30',
    sede: 'norte',
    doctor: DOCTOR_RIOS,
    specialty: 'cornea',
    status: 'Atendida',
    confirmationStatus: 'confirmada'
  });
  // 4. 10:00-10:30: Dra. Ríos en Principal (Pendiente - patHoy4 aún no atendido; NO cuenta como primera atención realizada)
  const aptHoy4 = pushAppointmentRecord({
    patientId: patHoy4.id,
    date: '2026-10-27',
    startTime: '10:00',
    endTime: '10:30',
    sede: 'principal',
    doctor: DOCTOR_RIOS,
    specialty: 'general',
    status: 'Pendiente',
    confirmationStatus: 'confirmada'
  });
  // 5. 10:30-11:00: Dr. Ramírez en Principal (Pendiente - paciente recurrente histórico)
  const aptHoy5 = pushAppointmentRecord({
    patientId: recurrentPatients[0].id,
    date: '2026-10-27',
    startTime: '10:30',
    endTime: '11:00',
    sede: 'principal',
    doctor: DOCTOR_RAMIREZ,
    specialty: 'glaucoma',
    status: 'Pendiente',
    confirmationStatus: 'confirmada'
  });
  // 6. 11:00-11:30: Dra. Ríos en Norte (Pendiente de confirmación - paciente recurrente histórico)
  const aptHoy6 = pushAppointmentRecord({
    patientId: recurrentPatients[1].id,
    date: '2026-10-27',
    startTime: '11:00',
    endTime: '11:30',
    sede: 'norte',
    doctor: DOCTOR_RIOS,
    specialty: 'pediatrica',
    status: 'Pendiente',
    confirmationStatus: 'pendiente_confirmacion'
  });
  // 7. 12:30-13:00: Dr. Ramírez en Principal (Pendiente - interconsulta posterior en el mismo día para patHoy2,
  // cuya primera atención fue aptHoy2 a las 08:30 con Dra. Valeria Ríos)
  const aptHoy7 = pushAppointmentRecord({
    patientId: patHoy2.id,
    date: '2026-10-27',
    startTime: '12:30',
    endTime: '13:00',
    sede: 'principal',
    doctor: DOCTOR_RAMIREZ,
    specialty: 'retina',
    status: 'Pendiente',
    confirmationStatus: 'confirmada'
  });
  // 8. 14:30-15:00: Dra. Ríos en Sur (Cancelada - patHoy5 no tuvo primera atención realizada)
  pushAppointmentRecord({
    patientId: patHoy5.id,
    date: '2026-10-27',
    startTime: '14:30',
    endTime: '15:00',
    sede: 'sur',
    doctor: DOCTOR_RIOS,
    specialty: 'general',
    status: 'Cancelada',
    confirmationStatus: 'no_requiere'
  });

  // 2 Cirugías de Hoy (2026-10-27) en bloques quirúrgicos 17:00-18:00 y 18:00-19:00
  surgeries.push(Object.freeze({
    id: `SURG-2026-${String(surgSeq++).padStart(4, '0')}`,
    patientId: aptHoy2.patientId,
    indicationAppointmentId: aptHoy2.id,
    date: '2026-10-27',
    time: '17:00',
    startTime: '17:00',
    endTime: '18:00',
    sede: 'principal',
    doctor: DOCTOR_RIOS,
    procedureId: 'catarata',
    surgicalStatus: 'Programada',
    preopEvaluationStatus: 'validada',
    requiresHumanIntervention: false,
    operationalPriority: 'normal'
  }));

  surgeries.push(Object.freeze({
    id: `SURG-2026-${String(surgSeq++).padStart(4, '0')}`,
    patientId: aptHoy1.patientId,
    indicationAppointmentId: aptHoy1.id,
    date: '2026-10-27',
    time: '18:00',
    startTime: '18:00',
    endTime: '19:00',
    sede: 'principal',
    doctor: DOCTOR_RAMIREZ,
    procedureId: 'refractiva',
    surgicalStatus: 'Programada',
    preopEvaluationStatus: 'pendiente_validacion',
    requiresHumanIntervention: true,
    operationalPriority: 'media'
  }));

  // 2 Órdenes de estudio técnico en Sede Sur en Hoy (2026-10-27) sin especialista atribuido (S/ 150 cobrado + S/ 100 pendiente = S/ 250)
  const techOrderHoy1 = `ORD-TEC-${String(techOrderSeq++).padStart(4, '0')}`;
  studyOrders.push(Object.freeze({
    id: techOrderHoy1,
    date: '2026-10-27',
    time: '09:15',
    sede: 'sur',
    patientId: patHoy6.id,
    specialist: null,
    studyType: 'Paquimetría y biometría óptica por orden externa'
  }));
  transactions.push(Object.freeze({
    id: `TRX-2026-${String(trxSeq++).padStart(4, '0')}`,
    date: '2026-10-27',
    time: '09:15',
    sede: 'sur',
    patientId: patHoy6.id,
    amount: 150,
    paymentStatus: 'cobrado',
    operationRef: 'CP-0043',
    specialist: null,
    appointmentId: null,
    surgeryId: null,
    studyOrderId: techOrderHoy1,
    concept: 'Paquimetría y biometría óptica por orden externa (sin atribución médica)',
    attributionStatus: 'unattributed'
  }));

  const techOrderHoy2 = `ORD-TEC-${String(techOrderSeq++).padStart(4, '0')}`;
  studyOrders.push(Object.freeze({
    id: techOrderHoy2,
    date: '2026-10-27',
    time: '12:40',
    sede: 'sur',
    patientId: patHoy6.id,
    specialist: null,
    studyType: 'Topografía corneal ambulatoria'
  }));
  transactions.push(Object.freeze({
    id: `TRX-2026-${String(trxSeq++).padStart(4, '0')}`,
    date: '2026-10-27',
    time: '12:40',
    sede: 'sur',
    patientId: patHoy6.id,
    amount: 100,
    paymentStatus: 'pendiente',
    operationRef: 'OP-0006',
    specialist: null,
    appointmentId: null,
    surgeryId: null,
    studyOrderId: techOrderHoy2,
    concept: 'Topografía corneal ambulatoria (sin atribución médica)',
    attributionStatus: 'unattributed'
  }));

  // ==========================================================================
  // DERIVACIÓN ESTRICTA DE PRIMERAS ATENCIONES Y TRANSACCIONES DESDE ENTIDADES
  // ==========================================================================

  // Ordenar citas cronológicamente por fecha y hora de inicio
  appointments.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // Agrupar citas por paciente para determinar la primera atención efectivamente realizada (Atendida)
  const appsByPatient = new Map();
  for (const app of appointments) {
    if (!appsByPatient.has(app.patientId)) appsByPatient.set(app.patientId, []);
    appsByPatient.get(app.patientId).push(app);
  }

  for (const pat of patientsCatalog) {
    if (pat.cohortType === 'recurrente_historico') {
      continue;
    }
    const patApps = appsByPatient.get(pat.id) || [];
    const firstAttended = patApps.find(a => a.status === 'Atendida') || null;
    if (firstAttended) {
      // Verificar que no exista atención previa anterior a firstAttended
      const laterApp = patApps.find(a => a.id !== firstAttended.id && (a.date > firstAttended.date || (a.date === firstAttended.date && a.startTime >= firstAttended.endTime))) || null;
      pat.firstAttentionCompleted = true;
      pat.firstAttentionDate = firstAttended.date;
      pat.sede = firstAttended.sede;
      pat.firstAttentionDoctor = firstAttended.doctor;
      pat.firstAppointmentId = firstAttended.id;

      newPatients.push(Object.freeze({
        id: pat.id,
        patientCode: pat.patientCode,
        patientName: pat.patientName,
        firstAttentionDate: firstAttended.date,
        sede: firstAttended.sede,
        firstAttentionDoctor: firstAttended.doctor,
        firstAppointmentId: firstAttended.id,
        firstAttentionCompleted: true,
        firstAttentionStatus: 'realizada',
        subsequentAppointmentId: laterApp ? laterApp.id : null,
        subsequentDoctor: laterApp ? laterApp.doctor : null,
        attributionStatus: 'attributed'
      }));
    } else {
      // Paciente registrado sin primera atención médica completada (cita pendiente/cancelada o solo estudio técnico)
      pat.firstAttentionCompleted = false;
      pat.firstAttentionDate = pat.registeredDate;
      pat.firstAttentionDoctor = null;
      pat.firstAppointmentId = null;

      newPatients.push(Object.freeze({
        id: pat.id,
        patientCode: pat.patientCode,
        patientName: pat.patientName,
        firstAttentionDate: pat.registeredDate,
        sede: pat.sede,
        firstAttentionDoctor: null,
        firstAppointmentId: null,
        firstAttentionCompleted: false,
        firstAttentionStatus: 'sin_primera_atencion_completada',
        subsequentAppointmentId: null,
        subsequentDoctor: null,
        attributionStatus: 'unattributed'
      }));
    }
  }

  // Generar transacciones verificables vinculadas 1 a 1 con citas no canceladas
  for (const app of appointments) {
    if (app.status === 'Cancelada') continue;
    const isPaid = app.status === 'Atendida';
    const amount = SPECIALTY_TARIFFS[app.specialty] || 150;
    const operationRef = isPaid
      ? `CP-${String(cpSeq++).padStart(4, '0')}`
      : `OP-${String(opSeq++).padStart(4, '0')}`;

    transactions.push(Object.freeze({
      id: `TRX-2026-${String(trxSeq++).padStart(4, '0')}`,
      date: app.date,
      time: app.startTime,
      sede: app.sede,
      patientId: app.patientId,
      amount,
      paymentStatus: isPaid ? 'cobrado' : 'pendiente',
      operationRef,
      specialist: app.doctor,
      appointmentId: app.id,
      surgeryId: null,
      studyOrderId: null,
      concept: `Consulta de ${app.specialty} (${app.doctor})`,
      attributionStatus: 'attributed'
    }));
  }

  // Generar transacciones verificables vinculadas 1 a 1 con cirugías
  for (const surg of surgeries) {
    const isPaid = surg.surgicalStatus === 'Realizada';
    const amount = SURGERY_TARIFFS[surg.procedureId] || 900;
    const operationRef = isPaid
      ? `CP-${String(cpSeq++).padStart(4, '0')}`
      : `OP-${String(opSeq++).padStart(4, '0')}`;

    transactions.push(Object.freeze({
      id: `TRX-2026-${String(trxSeq++).padStart(4, '0')}`,
      date: surg.date,
      time: surg.startTime,
      sede: surg.sede,
      patientId: surg.patientId,
      amount,
      paymentStatus: isPaid ? 'cobrado' : 'pendiente',
      operationRef,
      specialist: surg.doctor,
      appointmentId: null,
      surgeryId: surg.id,
      studyOrderId: null,
      concept: `Procedimiento quirúrgico: ${surg.procedureId} (${surg.doctor})`,
      attributionStatus: 'attributed'
    }));
  }

  // ==========================================================================
  // GENERACIÓN DE REGISTROS CRM + ARM VINCULADOS A CITAS Y PROSPECTOS REALES
  // ==========================================================================
  const catalogById = new Map(patientsCatalog.map(p => [p.id, p]));
  for (let i = 0; i < appointments.length; i++) {
    const app = appointments[i];
    if (app.date < '2026-07-30') continue;
    const origin = VALID_ORIGINS[i % VALID_ORIGINS.length];
    const isAttended = app.status === 'Atendida';
    const patObj = catalogById.get(app.patientId);

    crmRecords.push(Object.freeze({
      id: `LEAD-2026-${String(leadSeq++).padStart(4, '0')}`,
      date: app.date,
      sede: app.sede,
      doctor: app.doctor, // Asignación respaldada por app.id
      origin,
      commercialStage: isAttended ? 'consulta_realizada' : 'cita_programada',
      qualified: true,
      scheduled: true,
      attended: isAttended,
      patientId: app.patientId,
      appointmentId: app.id,
      followUpStatus: isAttended ? 'completado' : 'al_dia',
      requiresHumanIntervention: false,
      operationalPriority: 'normal'
    }));

    if (i % 2 === 0) {
      const hasPriorPatient = i % 4 === 0 && Boolean(patObj?.firstAttentionCompleted && patObj?.firstAttentionDoctor);
      const followOrigin = VALID_ORIGINS[(i + 2) % VALID_ORIGINS.length];
      crmRecords.push(Object.freeze({
        id: `LEAD-2026-${String(leadSeq++).padStart(4, '0')}`,
        date: app.date,
        sede: app.sede,
        doctor: hasPriorPatient ? patObj.firstAttentionDoctor : null,
        origin: followOrigin,
        commercialStage: 'calificado',
        qualified: true,
        scheduled: false,
        attended: false,
        patientId: hasPriorPatient ? patObj.id : null,
        appointmentId: null,
        followUpStatus: 'pendiente_seguimiento',
        requiresHumanIntervention: false,
        operationalPriority: 'media'
      }));
    }

    if (i % 3 === 0) {
      const hasPriorPatient = i % 6 === 0 && Boolean(patObj?.firstAttentionCompleted && patObj?.firstAttentionDoctor);
      const rawOrigin = VALID_ORIGINS[(i + 4) % VALID_ORIGINS.length];
      crmRecords.push(Object.freeze({
        id: `LEAD-2026-${String(leadSeq++).padStart(4, '0')}`,
        date: app.date,
        sede: app.sede,
        doctor: hasPriorPatient ? patObj.firstAttentionDoctor : null,
        origin: rawOrigin,
        commercialStage: 'contacto_recibido',
        qualified: false,
        scheduled: false,
        attended: false,
        patientId: hasPriorPatient ? patObj.id : null,
        appointmentId: null,
        followUpStatus: 'al_dia',
        requiresHumanIntervention: true,
        operationalPriority: 'alta'
      }));
    }
  }

  return {
    patientsCatalog: Object.freeze(patientsCatalog.map(p => Object.freeze({ ...p }))),
    newPatients: Object.freeze(newPatients),
    appointments: Object.freeze(appointments),
    surgeries: Object.freeze(surgeries),
    studyOrders: Object.freeze(studyOrders),
    transactions: Object.freeze(transactions),
    crmRecords: Object.freeze(crmRecords)
  };
}

const DEMO_RELATIONAL_DATA = buildRelationalDemoFixtures();

export const DEMO_PATIENTS_CATALOG = DEMO_RELATIONAL_DATA.patientsCatalog;
export const DEMO_NEW_PATIENTS = DEMO_RELATIONAL_DATA.newPatients;
export const DEMO_APPOINTMENTS = DEMO_RELATIONAL_DATA.appointments;
export const DEMO_SURGERIES = DEMO_RELATIONAL_DATA.surgeries;
export const DEMO_STUDY_ORDERS = DEMO_RELATIONAL_DATA.studyOrders;
export const DEMO_TRANSACTIONS = DEMO_RELATIONAL_DATA.transactions;
export const DEMO_CRM_RECORDS = DEMO_RELATIONAL_DATA.crmRecords;

// ============================================================================
// 5. VALIDADOR PURO E INDEPENDIENTE DE INTEGRIDAD RELACIONAL (v1.3.1)
// ============================================================================

function isValidIsoCalendarDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && (dt.getUTCMonth() + 1) === m && dt.getUTCDate() === d;
}

function isValidTimeSlot(start, end) {
  const re = /^([01]\d|2[0-3]):[0-5]\d$/;
  return typeof start === 'string' && typeof end === 'string' && re.test(start) && re.test(end) && start < end;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Valida las reglas de integridad relacional y temporal sobre cualquier dataset provisto.
 * Devuelve `{ valid: boolean, errors: string[] }`.
 */
export function validateDashboardDatasetIntegrity(dataset) {
  const errors = [];

  // Regla 1: La llamada sin argumentos puede continuar utilizando el dataset oficial completo.
  // Regla 2: La llamada con un dataset explícito debe validar exclusivamente los datos recibidos.
  const isDefaultCall = arguments.length === 0;
  const targetDataset = isDefaultCall
    ? {
        patientsCatalog: DEMO_PATIENTS_CATALOG,
        newPatients: DEMO_NEW_PATIENTS,
        appointments: DEMO_APPOINTMENTS,
        surgeries: DEMO_SURGERIES,
        studyOrders: DEMO_STUDY_ORDERS,
        transactions: DEMO_TRANSACTIONS,
        crmRecords: DEMO_CRM_RECORDS
      }
    : dataset;

  if (!targetDataset || typeof targetDataset !== 'object') {
    return {
      valid: false,
      errors: ['[0. Estructura] El dataset proporcionado no es un objeto válido']
    };
  }

  // Regla 3: Exigir las siete colecciones requeridas.
  // Regla 4: No completar campos faltantes mediante variables globales.
  // Regla 5: No reemplazar colecciones vacías por colecciones oficiales.
  // Regla 6: No mutar el dataset recibido.
  // Regla 7: Devolver errores específicos cuando falte una colección.
  const REQUIRED_COLLECTIONS = [
    'patientsCatalog',
    'newPatients',
    'appointments',
    'surgeries',
    'studyOrders',
    'transactions',
    'crmRecords'
  ];

  for (const colName of REQUIRED_COLLECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(targetDataset, colName) || !Array.isArray(targetDataset[colName])) {
      errors.push(`[0. Estructura] Colección obligatoria ausente o inválida: ${colName}`);
    }
  }

  // Si faltan colecciones obligatorias en un dataset explícito, rechazar inmediatamente
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  const {
    patientsCatalog,
    newPatients,
    appointments,
    surgeries,
    studyOrders,
    transactions,
    crmRecords
  } = targetDataset;

  const allowedSedes = new Set(VALID_SEDES);
  const allowedDoctors = new Set(VALID_DOCTORS);
  const allowedStatuses = new Set(['Atendida', 'Pendiente', 'Cancelada', 'No asistió']);
  const allowedConfirm = new Set(['confirmada', 'pendiente_confirmacion', 'no_requiere']);
  const allowedOrigins = new Set(VALID_ORIGINS);

  // 1. Unicidad de IDs y códigos
  const checkUnique = (list, prop, label) => {
    const seen = new Set();
    for (const item of list) {
      const val = item?.[prop];
      if (!val) {
        errors.push(`[1. Unicidad] ${label} posee registro sin ${prop}`);
      } else if (seen.has(val)) {
        errors.push(`[1. Unicidad] Valor duplicado ${prop}="${val}" en ${label}`);
      } else {
        seen.add(val);
      }
    }
    return seen;
  };

  checkUnique(patientsCatalog, 'id', 'patientsCatalog');
  checkUnique(patientsCatalog, 'patientCode', 'patientsCatalog');
  checkUnique(newPatients, 'id', 'newPatients');
  checkUnique(newPatients, 'patientCode', 'newPatients');
  checkUnique(appointments, 'id', 'appointments');
  checkUnique(surgeries, 'id', 'surgeries');
  checkUnique(studyOrders, 'id', 'studyOrders');
  checkUnique(transactions, 'id', 'transactions');
  checkUnique(transactions, 'operationRef', 'transactions');
  checkUnique(crmRecords, 'id', 'crmRecords');

  // Construir patientById exclusivamente desde patientsCatalog (sin incorporar newPatients ni crear maestros)
  const patientById = new Map();
  for (const p of patientsCatalog) {
    if (p && p.id) {
      if (typeof p.patientName !== 'string' || p.patientName.trim() === '') {
        errors.push(`[3. Correspondencia] Paciente maestro ${p.id} carece de patientName obligatorio`);
      }
      patientById.set(p.id, p);
    }
  }
  const appById = new Map(appointments.map(a => [a.id, a]));
  const surgById = new Map(surgeries.map(s => [s.id, s]));
  const studyOrderById = new Map(studyOrders.map(o => [o.id, o]));

  // Órdenes de estudio técnico (respaldo verificable para transacciones sin atribución médica)
  for (const o of studyOrders) {
    if (!patientById.has(o.patientId)) {
      errors.push(`[2. Referencias] Orden técnica ${o.id} referencia patientId inexistente "${o.patientId}"`);
    }
    if (!isValidIsoCalendarDate(o.date)) {
      errors.push(`[5. Temporal] Orden técnica ${o.id} tiene fecha inválida "${o.date}"`);
    }
    if (!allowedSedes.has(o.sede)) {
      errors.push(`[2. Referencias] Orden técnica ${o.id} tiene sede inválida "${o.sede}"`);
    }
    if (o.specialist !== null) {
      errors.push(`[10. Atribución] Orden técnica ${o.id} no puede asignar especialista "${o.specialist}"`);
    }
  }

  // 2, 3, 5. Citas: integridad de referencias, correspondencia y coherencia temporal
  for (const a of appointments) {
    if (!patientById.has(a.patientId)) {
      errors.push(`[2. Referencias] Cita ${a.id} referencia patientId inexistente "${a.patientId}"`);
    }
    if (!isValidIsoCalendarDate(a.date)) {
      errors.push(`[5. Temporal] Cita ${a.id} tiene fecha inválida "${a.date}"`);
    }
    if (!isValidTimeSlot(a.startTime, a.endTime)) {
      errors.push(`[5. Temporal] Cita ${a.id} tiene intervalo horario inválido "${a.startTime}-${a.endTime}"`);
    }
    if (!allowedSedes.has(a.sede)) {
      errors.push(`[2. Referencias] Cita ${a.id} tiene sede inválida "${a.sede}"`);
    }
    if (!allowedDoctors.has(a.doctor)) {
      errors.push(`[7. Atribución] Cita ${a.id} tiene médico inválido "${a.doctor}"`);
    }
    if (!allowedStatuses.has(a.status)) {
      errors.push(`[2. Referencias] Cita ${a.id} tiene estado inválido "${a.status}"`);
    }
    if (!allowedConfirm.has(a.confirmationStatus)) {
      errors.push(`[2. Referencias] Cita ${a.id} tiene confirmationStatus inválido "${a.confirmationStatus}"`);
    }
  }

  // 4 & 7. Validez de primera atención y atribución médica justificada en newPatients contra catálogo maestro
  for (const np of newPatients) {
    if (!np || typeof np !== 'object') {
      errors.push('[2. Referencias] Registro de paciente nuevo inválido o nulo');
      continue;
    }

    // Regla: cada newPatient.id debe existir previamente en patientsCatalog
    if (!patientById.has(np.id)) {
      errors.push(`[2. Referencias] Paciente nuevo ${np.id} no existe en el catálogo maestro patientsCatalog`);
      continue;
    }

    const masterPatient = patientById.get(np.id);

    // Validar correspondencia de identidad contra el registro maestro
    if (np.patientCode !== masterPatient.patientCode) {
      errors.push(`[3. Correspondencia] Paciente nuevo ${np.id} tiene patientCode "${np.patientCode}" discordante con catálogo maestro ("${masterPatient.patientCode}")`);
    }
    if (typeof np.patientName !== 'string' || np.patientName.trim() === '') {
      errors.push(`[3. Correspondencia] Paciente nuevo ${np.id} carece de patientName obligatorio`);
    } else if (np.patientName !== masterPatient.patientName) {
      errors.push(`[3. Correspondencia] Paciente nuevo ${np.id} tiene patientName "${np.patientName}" discordante con catálogo maestro ("${masterPatient.patientName}")`);
    }

    // Si el registro de paciente nuevo especifica un identificador maestro explícito (masterPatientId, catalogPatientId o patientId)
    const explicitMasterId = np.masterPatientId || np.catalogPatientId || np.masterId || (np.patientId && np.patientId !== np.id ? np.patientId : null);
    if (explicitMasterId && explicitMasterId !== masterPatient.id) {
      errors.push(`[3. Correspondencia] Paciente nuevo ${np.id} apunta a identificador maestro ajeno "${explicitMasterId}" (esperado: "${masterPatient.id}")`);
    }

    if (!isValidIsoCalendarDate(np.firstAttentionDate)) {
      errors.push(`[5. Temporal] Paciente ${np.id} tiene firstAttentionDate inválida "${np.firstAttentionDate}"`);
    }
    if (!allowedSedes.has(np.sede)) {
      errors.push(`[2. Referencias] Paciente ${np.id} tiene sede inválida "${np.sede}"`);
    }

    const isCompleted = Boolean(np.firstAttentionCompleted);
    if (isCompleted || np.firstAttentionDoctor !== null || np.firstAppointmentId !== null) {
      if (!np.firstAppointmentId || !appById.has(np.firstAppointmentId)) {
        errors.push(`[4. Primera atención] Paciente ${np.id} carece de firstAppointmentId válido`);
        continue;
      }
      const firstApp = appById.get(np.firstAppointmentId);
      if (firstApp.patientId !== np.id) {
        errors.push(`[3. Correspondencia] firstAppointmentId ${firstApp.id} pertenece a ${firstApp.patientId}, no a ${np.id}`);
      }
      if (firstApp.sede !== np.sede) {
        errors.push(`[4. Primera atención] Sede de primera atención de ${np.id} (${np.sede}) no coincide con cita ${firstApp.id} (${firstApp.sede})`);
      }
      if (firstApp.doctor !== np.firstAttentionDoctor) {
        errors.push(`[4. Primera atención] Especialista atribuido a ${np.id} (${np.firstAttentionDoctor}) no coincide con médico de cita ${firstApp.id} (${firstApp.doctor})`);
      }
      if (firstApp.date !== np.firstAttentionDate) {
        errors.push(`[4. Primera atención] Fecha de primera atención de ${np.id} (${np.firstAttentionDate}) no coincide con cita ${firstApp.id} (${firstApp.date})`);
      }
      if (firstApp.status !== 'Atendida') {
        errors.push(`[4. Primera atención] Cita de primera atención ${firstApp.id} de ${np.id} tiene estado "${firstApp.status}" (debe ser "Atendida")`);
      }

      // Verificar ausencia de atención anterior incompatible
      const earlierApp = appointments.find(a =>
        a.patientId === np.id &&
        a.id !== firstApp.id &&
        a.status === 'Atendida' &&
        (a.date < firstApp.date || (a.date === firstApp.date && a.startTime < firstApp.startTime))
      );
      if (earlierApp) {
        errors.push(`[4. Primera atención] Paciente ${np.id} posee una atención anterior (${earlierApp.id} en ${earlierApp.date}) previa a ${firstApp.id}`);
      }
    } else {
      if (np.firstAttentionDoctor !== null || np.firstAppointmentId !== null) {
        errors.push(`[10. Atribución] Paciente ${np.id} sin primera atención completada no puede tener médico o cita de primera atención atribuida`);
      }
    }
  }

  // Cirugías: paciente existente, indicación obligatoria con correspondencia total y precedencia temporal estricta
  for (const s of surgeries) {
    if (!patientById.has(s.patientId)) {
      errors.push(`[2. Referencias] Cirugía ${s.id} referencia patientId inexistente "${s.patientId}"`);
    }
    if (!isValidIsoCalendarDate(s.date) || !isValidTimeSlot(s.startTime, s.endTime)) {
      errors.push(`[5. Temporal] Cirugía ${s.id} tiene fecha u horario inválido`);
    }
    if (!allowedSedes.has(s.sede) || !allowedDoctors.has(s.doctor)) {
      errors.push(`[7. Atribución] Cirugía ${s.id} tiene sede o médico inválido`);
    }
    if (!s.indicationAppointmentId) {
      errors.push(`[2. Referencias] Cirugía ${s.id} carece de indicationAppointmentId obligatorio`);
    } else {
      const indApp = appById.get(s.indicationAppointmentId);
      if (!indApp) {
        errors.push(`[2. Referencias] Cirugía ${s.id} referencia indicationAppointmentId inexistente "${s.indicationAppointmentId}"`);
      } else {
        if (indApp.patientId !== s.patientId) {
          errors.push(`[3. Correspondencia] Cirugía ${s.id} e indicación ${indApp.id} tienen pacientes distintos ("${s.patientId}" vs "${indApp.patientId}")`);
        }
        if (indApp.doctor !== s.doctor) {
          errors.push(`[7. Atribución] Cirugía ${s.id} tiene especialista "${s.doctor}" distinto al de su cita indicadora ${indApp.id} ("${indApp.doctor}")`);
        }
        if (indApp.sede !== s.sede) {
          errors.push(`[2. Referencias] Cirugía ${s.id} tiene sede "${s.sede}" incompatible con su cita indicadora ${indApp.id} ("${indApp.sede}")`);
        }
        if (indApp.status !== 'Atendida') {
          errors.push(`[5. Temporal] Indicación ${indApp.id} de cirugía ${s.id} tiene estado "${indApp.status}" (debe ser "Atendida")`);
        }
        const validPrecedence = isValidIsoCalendarDate(indApp.date) && isValidIsoCalendarDate(s.date) && (
          indApp.date < s.date ||
          (
            indApp.date === s.date &&
            isValidTimeSlot(indApp.startTime, indApp.endTime) &&
            isValidTimeSlot(s.startTime, s.endTime) &&
            indApp.endTime <= s.startTime
          )
        );
        if (!validPrecedence) {
          errors.push(`[5. Temporal] Cirugía ${s.id} (${s.date} ${s.startTime}) no respeta precedencia temporal estricta respecto a su consulta indicadora ${indApp.id} (${indApp.date} ${indApp.startTime}-${indApp.endTime})`);
        }
      }
    }
  }

  // 6. Ausencia unificada de solapamientos completos [startTime, endTime) en citas activas y cirugías
  //    (cubre cita-cita, cirugía-cirugía y cita-cirugía tanto para especialista como para paciente)
  const clinicalEvents = [
    ...appointments
      .filter(a => a.status !== 'Cancelada')
      .map(a => ({
        kind: 'cita',
        id: a.id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        doctor: a.doctor,
        patientId: a.patientId
      })),
    ...surgeries
      .filter(s => s.surgicalStatus !== 'Cancelada')
      .map(s => ({
        kind: 'cirugía',
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        doctor: s.doctor,
        patientId: s.patientId
      }))
  ];

  for (let i = 0; i < clinicalEvents.length; i++) {
    const ev1 = clinicalEvents[i];
    if (!isValidIsoCalendarDate(ev1.date) || !isValidTimeSlot(ev1.startTime, ev1.endTime)) continue;
    for (let j = i + 1; j < clinicalEvents.length; j++) {
      const ev2 = clinicalEvents[j];
      if (ev1.date !== ev2.date) continue;
      if (!isValidTimeSlot(ev2.startTime, ev2.endTime)) continue;
      if (!intervalsOverlap(ev1.startTime, ev1.endTime, ev2.startTime, ev2.endTime)) continue;

      const pairDesc = ev1.kind === 'cita' && ev2.kind === 'cita'
        ? 'citas solapadas'
        : (ev1.kind === 'cirugía' && ev2.kind === 'cirugía' ? 'cirugías solapadas' : 'eventos solapados');
      if (ev1.doctor === ev2.doctor) {
        errors.push(`[6. Solapamiento] Especialista ${ev1.doctor} tiene eventos solapados (${pairDesc}: ${ev1.kind} ${ev1.id} ${ev1.startTime}-${ev1.endTime} y ${ev2.kind} ${ev2.id} ${ev2.startTime}-${ev2.endTime}) en ${ev1.date}`);
      }
      if (ev1.patientId === ev2.patientId) {
        errors.push(`[6. Solapamiento] Paciente ${ev1.patientId} tiene eventos solapados (${pairDesc}: ${ev1.kind} ${ev1.id} ${ev1.startTime}-${ev1.endTime} y ${ev2.kind} ${ev2.id} ${ev2.startTime}-${ev2.endTime}) en ${ev1.date}`);
      }
    }
  }

  // 8 & 10. Coherencia estricta y fuente exclusiva (appointmentId XOR surgeryId XOR studyOrderId) en transacciones
  for (const t of transactions) {
    if (!isValidIsoCalendarDate(t.date)) {
      errors.push(`[5. Temporal] Transacción ${t.id} tiene fecha inválida "${t.date}"`);
    }
    if (!allowedSedes.has(t.sede)) {
      errors.push(`[8. Transacciones] Transacción ${t.id} tiene sede inválida "${t.sede}"`);
    }
    if (!t.patientId || !patientById.has(t.patientId)) {
      errors.push(`[2. Referencias] Transacción ${t.id} referencia patientId inválido o inexistente "${t.patientId}"`);
    }
    if (!(Number(t.amount) > 0)) {
      errors.push(`[8. Transacciones] Transacción ${t.id} tiene importe inválido "${t.amount}"`);
    }
    if (!['cobrado', 'pendiente'].includes(t.paymentStatus)) {
      errors.push(`[8. Transacciones] Transacción ${t.id} tiene paymentStatus inválido "${t.paymentStatus}"`);
    } else if (
      (t.paymentStatus === 'cobrado' && !/^CP-\d+$/.test(String(t.operationRef || ''))) ||
      (t.paymentStatus === 'pendiente' && !/^OP-\d+$/.test(String(t.operationRef || '')))
    ) {
      errors.push(`[8. Transacciones] Transacción ${t.id} tiene operationRef "${t.operationRef}" incompatible con paymentStatus "${t.paymentStatus}"`);
    }

    const hasApp = t.appointmentId !== null && t.appointmentId !== undefined && t.appointmentId !== '';
    const hasSurg = t.surgeryId !== null && t.surgeryId !== undefined && t.surgeryId !== '';
    const hasOrder = t.studyOrderId !== null && t.studyOrderId !== undefined && t.studyOrderId !== '';
    const sourceCount = Number(hasApp) + Number(hasSurg) + Number(hasOrder);

    if (sourceCount === 0) {
      errors.push(`[8. Transacciones] Transacción ${t.id} carece de fuente verificable (appointmentId, surgeryId o studyOrderId)`);
    } else if (sourceCount > 1) {
      errors.push(`[8. Transacciones] Transacción ${t.id} posee múltiples fuentes simultáneas (appointmentId, surgeryId, studyOrderId)`);
    } else if (hasApp) {
      const app = appById.get(t.appointmentId);
      if (!app) {
        errors.push(`[2. Referencias] Transacción ${t.id} referencia appointmentId inexistente "${t.appointmentId}"`);
      } else {
        if (app.status === 'Cancelada') {
          errors.push(`[8. Transacciones] Transacción ${t.id} referencia cita cancelada ${app.id}`);
        }
        if (app.patientId !== t.patientId) {
          errors.push(`[8. Transacciones] Transacción ${t.id} tiene patientId "${t.patientId}" incompatible con cita ${app.id} ("${app.patientId}")`);
        }
        if (app.sede !== t.sede) {
          errors.push(`[8. Transacciones] Transacción ${t.id} tiene sede "${t.sede}" incompatible con cita ${app.id} ("${app.sede}")`);
        }
        if (t.specialist !== app.doctor) {
          errors.push(`[7. Atribución] Transacción ${t.id} atribuye especialista "${t.specialist}" distinto al de la cita ${app.id} ("${app.doctor}")`);
        }
        if (t.date !== app.date) {
          errors.push(`[5. Temporal] Transacción ${t.id} tiene fecha "${t.date}" incompatible con la cita ${app.id} ("${app.date}")`);
        }
      }
    } else if (hasSurg) {
      const surg = surgById.get(t.surgeryId);
      if (!surg) {
        errors.push(`[2. Referencias] Transacción ${t.id} referencia surgeryId inexistente "${t.surgeryId}"`);
      } else {
        if (surg.surgicalStatus === 'Cancelada') {
          errors.push(`[8. Transacciones] Transacción quirúrgica ${t.id} referencia cirugía cancelada ${surg.id}`);
        }
        if (surg.patientId !== t.patientId) {
          errors.push(`[8. Transacciones] Transacción quirúrgica ${t.id} tiene patientId "${t.patientId}" incompatible con cirugía ${surg.id} ("${surg.patientId}")`);
        }
        if (surg.sede !== t.sede) {
          errors.push(`[8. Transacciones] Transacción quirúrgica ${t.id} tiene sede "${t.sede}" incompatible con cirugía ${surg.id} ("${surg.sede}")`);
        }
        if (t.specialist !== surg.doctor) {
          errors.push(`[7. Atribución] Transacción quirúrgica ${t.id} atribuye especialista "${t.specialist}" distinto al de la cirugía ${surg.id} ("${surg.doctor}")`);
        }
        if (t.date !== surg.date) {
          errors.push(`[5. Temporal] Transacción quirúrgica ${t.id} tiene fecha "${t.date}" incompatible con la cirugía ${surg.id} ("${surg.date}")`);
        }
      }
    } else if (hasOrder) {
      const order = studyOrderById.get(t.studyOrderId);
      if (!order) {
        errors.push(`[2. Referencias] Transacción ${t.id} referencia studyOrderId inexistente "${t.studyOrderId}"`);
      } else {
        if (order.patientId !== t.patientId) {
          errors.push(`[8. Transacciones] Transacción técnica ${t.id} tiene patientId "${t.patientId}" incompatible con orden ${order.id} ("${order.patientId}")`);
        }
        if (order.sede !== t.sede) {
          errors.push(`[8. Transacciones] Transacción técnica ${t.id} tiene sede "${t.sede}" incompatible con orden ${order.id} ("${order.sede}")`);
        }
        if (t.date !== order.date) {
          errors.push(`[5. Temporal] Transacción técnica ${t.id} tiene fecha "${t.date}" incompatible con orden ${order.id} ("${order.date}")`);
        }
      }
      if (t.specialist !== null) {
        errors.push(`[10. Atribución] Transacción técnica ${t.id} atribuye especialista "${t.specialist}" sin respaldo médico`);
      }
    }
  }

  // 9 & 10. Coherencia de registros CRM + ARM
  for (const l of crmRecords) {
    if (!isValidIsoCalendarDate(l.date)) {
      errors.push(`[5. Temporal] Lead ${l.id} tiene fecha inválida "${l.date}"`);
    }
    if (!allowedSedes.has(l.sede)) {
      errors.push(`[9. CRM] Lead ${l.id} tiene sede inválida "${l.sede}"`);
    }
    if (!allowedOrigins.has(l.origin)) {
      errors.push(`[9. CRM] Lead ${l.id} tiene canal de origen inválido o ausente "${l.origin}"`);
    }
    if (l.attended && !l.scheduled) {
      errors.push(`[9. CRM] Lead ${l.id} está marcado attended sin estar scheduled`);
    }
    if (l.scheduled && !l.qualified) {
      errors.push(`[9. CRM] Lead ${l.id} está marcado scheduled sin estar qualified`);
    }
    if (l.scheduled) {
      if (!l.appointmentId || !appById.has(l.appointmentId)) {
        errors.push(`[9. CRM] Lead agendado ${l.id} carece de appointmentId válido`);
      } else {
        const app = appById.get(l.appointmentId);
        if (!l.patientId || l.patientId !== app.patientId) {
          errors.push(`[9. CRM] Lead agendado ${l.id} tiene patientId "${l.patientId}" incompatible con su cita ${app.id} ("${app.patientId}")`);
        }
        if (app.sede !== l.sede || app.doctor !== l.doctor) {
          errors.push(`[9. CRM] Lead ${l.id} tiene sede o médico inconsistente con su cita ${app.id}`);
        }
        if (isValidIsoCalendarDate(l.date) && isValidIsoCalendarDate(app.date) && l.date > app.date) {
          errors.push(`[5. Temporal] Lead ${l.id} tiene fecha "${l.date}" posterior a su cita asociada ${app.id} ("${app.date}")`);
        }
        if (l.attended && app.status !== 'Atendida') {
          errors.push(`[9. CRM] Lead atendido ${l.id} referencia cita ${app.id} con estado "${app.status}"`);
        }
      }
    } else {
      if (l.appointmentId !== null && l.appointmentId !== undefined) {
        errors.push(`[9. CRM] Lead no agendado ${l.id} no debe referenciar appointmentId "${l.appointmentId}"`);
      }
      // Lead sin cita agendada: solo puede tener médico asignado si referencia un paciente existente atendido por ese médico antes o en esa fecha
      if (l.doctor !== null) {
        const pat = l.patientId ? patientById.get(l.patientId) : null;
        if (
          !pat ||
          !pat.firstAttentionCompleted ||
          pat.firstAttentionDoctor !== l.doctor ||
          (isValidIsoCalendarDate(l.date) && isValidIsoCalendarDate(pat.firstAttentionDate) && pat.firstAttentionDate > l.date)
        ) {
          errors.push(`[10. Atribución] Lead no agendado ${l.id} asigna especialista "${l.doctor}" sin vínculo válido de cita o paciente`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// CONSULTAS Y FILTROS SOBRE LAS COLECCIONES RELACIONALES (v1.3)
// ============================================================================

export function getFilteredDashboardRecords(period = 'hoy', sede = 'all', doctor = 'all') {
  const win = PERIOD_WINDOWS[period] || PERIOD_WINDOWS.hoy;
  const inCurr = d => d >= win.startDate && d <= win.endDate;
  const inPrev = d => d >= win.prevStartDate && d <= win.prevEndDate;
  const matchSede = r => sede === 'all' || r.sede === sede;

  // Citas
  const appointmentsInScope = DEMO_APPOINTMENTS.filter(r => inCurr(r.date) && matchSede(r));
  const appointmentsPrevScope = DEMO_APPOINTMENTS.filter(r => inPrev(r.date) && matchSede(r));
  const appointmentsCurrent = doctor === 'all'
    ? appointmentsInScope
    : appointmentsInScope.filter(r => r.doctor === doctor);
  const appointmentsPrevious = doctor === 'all'
    ? appointmentsPrevScope
    : appointmentsPrevScope.filter(r => r.doctor === doctor);

  // Pacientes nuevos (Sección 3.3: solo se contabilizan como atendidos por primera vez aquellos con primera atención Atendida completada)
  const newPatientsAllInScope = DEMO_NEW_PATIENTS.filter(r => inCurr(r.firstAttentionDate) && matchSede(r));
  const newPatientsCompletedInScope = newPatientsAllInScope.filter(r => r.firstAttentionCompleted === true);
  const newPatientsPendingOrTechInScope = newPatientsAllInScope.filter(r => r.firstAttentionCompleted === false);

  const newPatientsPrevAllInScope = DEMO_NEW_PATIENTS.filter(r => inPrev(r.firstAttentionDate) && matchSede(r));
  const newPatientsCompletedPrevScope = newPatientsPrevAllInScope.filter(r => r.firstAttentionCompleted === true);

  const newPatientsCurrent = doctor === 'all'
    ? newPatientsCompletedInScope
    : newPatientsCompletedInScope.filter(r => r.firstAttentionDoctor === doctor);
  const newPatientsPrevious = doctor === 'all'
    ? newPatientsCompletedPrevScope
    : newPatientsCompletedPrevScope.filter(r => r.firstAttentionDoctor === doctor);

  // Cirugías
  const surgeriesInScope = DEMO_SURGERIES.filter(r => inCurr(r.date) && matchSede(r));
  const surgeriesPrevScope = DEMO_SURGERIES.filter(r => inPrev(r.date) && matchSede(r));
  const surgeriesCurrent = doctor === 'all'
    ? surgeriesInScope
    : surgeriesInScope.filter(r => r.doctor === doctor);
  const surgeriesPrevious = doctor === 'all'
    ? surgeriesPrevScope
    : surgeriesPrevScope.filter(r => r.doctor === doctor);

  // Transacciones financieras
  const transactionsInScope = DEMO_TRANSACTIONS.filter(r => inCurr(r.date) && matchSede(r));
  const transactionsPrevScope = DEMO_TRANSACTIONS.filter(r => inPrev(r.date) && matchSede(r));
  const transactionsCurrent = doctor === 'all'
    ? transactionsInScope
    : transactionsInScope.filter(r => r.specialist === doctor);
  const transactionsPrevious = doctor === 'all'
    ? transactionsPrevScope
    : transactionsPrevScope.filter(r => r.specialist === doctor);
  const transactionsUnattributedInScope = transactionsInScope.filter(r => r.specialist === null);

  // Registros comerciales CRM + ARM
  const crmInScope = DEMO_CRM_RECORDS.filter(r => inCurr(r.date) && matchSede(r));
  const crmCurrent = doctor === 'all'
    ? crmInScope
    : crmInScope.filter(r => r.doctor === doctor);
  const crmUnattributedInScope = crmInScope.filter(r => r.doctor === null);

  return {
    window: win,
    appointmentsInScope,
    appointmentsCurrent,
    appointmentsPrevious,
    newPatientsInScope: newPatientsCompletedInScope,
    newPatientsAllInScope,
    newPatientsCurrent,
    newPatientsPrevious,
    newPatientsUnattributedInScope: newPatientsPendingOrTechInScope,
    surgeriesInScope,
    surgeriesCurrent,
    surgeriesPrevious,
    transactionsInScope,
    transactionsCurrent,
    transactionsPrevious,
    transactionsUnattributedInScope,
    crmInScope,
    crmCurrent,
    crmUnattributedInScope
  };
}

// ============================================================================
// AGREGACIONES E INDICADORES DESDE REGISTROS FUENTE (v1.3)
// ============================================================================

export function getDashboardMetrics(period = 'hoy', sede = 'all', doctor = 'all') {
  const src = getFilteredDashboardRecords(period, sede, doctor);
  const win = src.window;

  // 1. KPI 01: Pacientes Nuevos (exclusivamente primeras atenciones médicas efectivamente Atendidas)
  const patCurrent = src.newPatientsCurrent.length;
  const patPrevious = src.newPatientsPrevious.length;
  const patVarMeta = computeVariationMeta(patCurrent, patPrevious);
  const patAttributedCount = src.newPatientsCurrent.filter(r => r.firstAttentionDoctor !== null).length;
  const patPendingOrTechCount = src.newPatientsUnattributedInScope.length;
  const patAttributionDisplay = doctor === 'all'
    ? `1.ª atención realizada: ${patAttributedCount} · Sin 1.ª atención médica: ${patPendingOrTechCount}`
    : (patCurrent > 0
      ? `1.ª atención realizada con ${doctor}${patPendingOrTechCount > 0 ? ` · ${patPendingOrTechCount} sin atribución médica en sede` : ''}`
      : (patPendingOrTechCount > 0
        ? `0 atribuidos al especialista (${patPendingOrTechCount} sin 1.ª atención médica en sede)`
        : 'Sin primeras atenciones registradas en la selección'));

  // 2. KPI 02 y Gráfico 02: Citas registradas y Estados de citas
  const appTotal = src.appointmentsCurrent.length;
  const appPrev = src.appointmentsPrevious.length;
  const appVarMeta = computeVariationMeta(appTotal, appPrev);

  let appAttended = 0;
  let appPending = 0;
  let appCancelled = 0;
  let appNoShow = 0;
  for (const a of src.appointmentsCurrent) {
    if (a.status === 'Atendida') appAttended++;
    else if (a.status === 'Pendiente') appPending++;
    else if (a.status === 'Cancelada') appCancelled++;
    else if (a.status === 'No asistió') appNoShow++;
  }

  const medicalAttendanceRate = appTotal > 0 ? (appAttended / appTotal) * 100 : 0;

  // 3. KPI 03: Cirugías programadas
  const surCurrent = src.surgeriesCurrent.length;
  const surPrev = src.surgeriesPrevious.length;
  const surVarMeta = computeVariationMeta(surCurrent, surPrev);
  const surStatusText = surCurrent === 0
    ? 'Sin cirugías programadas en la selección'
    : win.surgeryStatusLabel;

  // 4. KPI 04: Ingresos del período (suma directa de DEMO_TRANSACTIONS)
  let revCollected = 0;
  let revPending = 0;
  let revAttributedTotal = 0;
  let revAttributedCollected = 0;
  let revAttributedPending = 0;
  let revUnattributedTotal = 0;
  let revUnattributedCollected = 0;
  let revUnattributedPending = 0;

  for (const t of src.transactionsCurrent) {
    if (t.paymentStatus === 'cobrado') {
      revCollected += t.amount;
      if (t.specialist !== null) revAttributedCollected += t.amount;
      else revUnattributedCollected += t.amount;
    } else {
      revPending += t.amount;
      if (t.specialist !== null) revAttributedPending += t.amount;
      else revUnattributedPending += t.amount;
    }
    if (t.specialist !== null) revAttributedTotal += t.amount;
    else revUnattributedTotal += t.amount;
  }

  const revTotal = revCollected + revPending;
  const revPrev = src.transactionsPrevious.reduce((acc, t) => acc + t.amount, 0);
  const revVarMeta = computeVariationMeta(revTotal, revPrev);

  const unattributedScopeRevenue = src.transactionsUnattributedInScope.reduce((acc, t) => acc + t.amount, 0);
  const revAttributionDisplay = doctor === 'all'
    ? (revUnattributedTotal > 0
      ? `Atribuido a médicos: ${formatMoney(revAttributedTotal)} · No atribuido: ${formatMoney(revUnattributedTotal)}`
      : `Atribuido a especialistas: ${formatMoney(revAttributedTotal)}`)
    : (revTotal > 0
      ? `Atribuido a ${doctor}${unattributedScopeRevenue > 0 ? ` · ${formatMoney(unattributedScopeRevenue)} no atribuido en sede` : ''}`
      : (unattributedScopeRevenue > 0
        ? `S/ 0.00 atribuidos al especialista (${formatMoney(unattributedScopeRevenue)} no atribuido en sede)`
        : 'Sin transacciones atribuidas en la selección'));

  // 5. Gráfico 01: Evolución de citas médicas
  const trendLabels = win.trendBuckets.map(b => b.label);
  const trendScheduled = win.trendBuckets.map(b =>
    src.appointmentsCurrent.filter(a => b.match(a)).length
  );
  const trendAttended = win.trendBuckets.map(b =>
    src.appointmentsCurrent.filter(a => a.status === 'Atendida' && b.match(a)).length
  );

  // 6. Gráfico 03: Consultas por especialidad
  const specialtiesData = SPECIALTIES_CATALOG.map(spec => ({
    ...spec,
    count: src.appointmentsCurrent.filter(a => a.status === 'Atendida' && a.specialty === spec.id).length
  }));
  const totalSpecialtyConsults = specialtiesData.reduce((acc, s) => acc + s.count, 0);

  // 7. Gráfico 06: Cirugías por procedimiento
  const surgeriesData = SURGERIES_CATALOG.map(surg => ({
    ...surg,
    count: src.surgeriesCurrent.filter(s => s.procedureId === surg.id).length
  }));
  const totalSurgeryProcedures = surgeriesData.reduce((acc, s) => acc + s.count, 0);

  // 8. Gráfico 04: Evolución de ingresos
  const revenueBuckets = {
    labels: win.revenueBuckets.map(b => b.label),
    collected: win.revenueBuckets.map(b =>
      src.transactionsCurrent
        .filter(t => t.paymentStatus === 'cobrado' && b.match(t))
        .reduce((acc, t) => acc + t.amount, 0)
    ),
    pending: win.revenueBuckets.map(b =>
      src.transactionsCurrent
        .filter(t => t.paymentStatus === 'pendiente' && b.match(t))
        .reduce((acc, t) => acc + t.amount, 0)
    )
  };

  // 9. Gráfico 05: Embudo comercial CRM + ARM
  const crmContacts = src.crmCurrent.length;
  const crmQualified = src.crmCurrent.filter(l => l.qualified).length;
  const crmScheduled = src.crmCurrent.filter(l => l.scheduled).length;
  const crmAttended = src.crmCurrent.filter(l => l.attended).length;

  const funnelScopeLabel = doctor === 'all'
    ? (sede === 'all'
      ? `Cohorte comercial consolidada (${src.crmUnattributedInScope.length} sin asignación médica)`
      : `Cohorte comercial de la sede (${src.crmUnattributedInScope.length} sin asignación médica)`)
    : `Cohorte con asignación médica verificable a ${doctor}`;

  // 10. Ocupación de especialistas (basada en turnos de consulta disponibles por jornada activa del período)
  const activeDatesInPeriod = new Set(src.appointmentsInScope.map(a => a.date));
  const activeDaysCount = Math.max(1, activeDatesInPeriod.size);
  const slotsPerDayPerSede = sede === 'all' ? 6 : 3;

  const doctorCatalogModels = [
    { name: DOCTOR_RIOS, specialty: 'Córnea y General' },
    { name: DOCTOR_RAMIREZ, specialty: 'Retina y Glaucoma' }
  ];

  const doctorOccupancy = doctorCatalogModels.map(d => {
    const isSelected = doctor === 'all' || doctor === d.name;
    const apps = isSelected
      ? src.appointmentsInScope.filter(a => a.doctor === d.name).length
      : 0;
    const surgs = isSelected
      ? src.surgeriesInScope.filter(s => s.doctor === d.name).length
      : 0;
    const scheduledCap = activeDaysCount * slotsPerDayPerSede;
    const cap = Math.max(apps, Math.max(1, scheduledCap));
    const rate = isSelected && cap > 0 ? Math.min(100, Math.round((apps / cap) * 100)) : 0;
    return {
      ...d,
      appointments: apps,
      maxCapacity: cap,
      surgeries: surgs,
      rate,
      isFilteredOut: !isSelected
    };
  });

  const activeDoctorsForRate = doctorOccupancy.filter(d => !d.isFilteredOut);
  const averageOccupancyRate = activeDoctorsForRate.length > 0
    ? Math.round(activeDoctorsForRate.reduce((acc, d) => acc + d.rate, 0) / activeDoctorsForRate.length)
    : 0;

  // 11. Alertas operativas derivadas estrictamente de estados explícitos de los registros
  const confirmPendingRecords = src.appointmentsCurrent.filter(
    a => a.status === 'Pendiente' && a.confirmationStatus === 'pendiente_confirmacion'
  );
  const noShowAlertRecords = src.appointmentsCurrent.filter(
    a => a.status === 'No asistió' && a.followUpStatus === 'pendiente_reagendamiento'
  );
  const crmFollowupRecords = src.crmCurrent.filter(
    l => l.followUpStatus === 'pendiente_seguimiento'
  );
  const nextAppointmentsRecords = src.appointmentsCurrent.filter(
    a => a.status === 'Pendiente'
  );
  const inboxUnattendedRecords = src.crmCurrent.filter(
    l => l.requiresHumanIntervention === true
  );
  const surgicalReadinessRecords = src.surgeriesCurrent.filter(
    s => s.preopEvaluationStatus === 'pendiente_validacion'
  );

  const alerts = [
    {
      id: 'confirm-pending',
      icon: 'alert',
      title: 'Citas pendientes de confirmación',
      count: confirmPendingRecords.length,
      priority: 'media',
      description: 'Pacientes con turno próximo que aún no han confirmado recepción del recordatorio.',
      actionRoute: '#agenda',
      actionLabel: 'Abrir Agenda y confirmar',
      sourceCollection: 'DEMO_APPOINTMENTS',
      stateField: 'confirmationStatus',
      stateValue: 'pendiente_confirmacion',
      affectedRecordIds: confirmPendingRecords.map(r => r.id)
    },
    {
      id: 'noshow-recovery',
      icon: 'crm',
      title: 'Pacientes que no asistieron',
      count: noShowAlertRecords.length,
      priority: 'alta',
      description: 'Inasistencias registradas que cuentan con tarea de reagendamiento sugerida.',
      actionRoute: '#crm',
      actionLabel: 'Ver seguimientos CRM',
      sourceCollection: 'DEMO_APPOINTMENTS',
      stateField: 'followUpStatus',
      stateValue: 'pendiente_reagendamiento',
      affectedRecordIds: noShowAlertRecords.map(r => r.id)
    },
    {
      id: 'crm-followup',
      icon: 'clock',
      title: 'Prospectos pendientes de seguimiento',
      count: crmFollowupRecords.length,
      priority: 'media',
      description: 'Contactos calificados pendientes de agendar cita médica en el pipeline.',
      actionRoute: '#crm',
      actionLabel: 'Gestionar pipeline',
      sourceCollection: 'DEMO_CRM_RECORDS',
      stateField: 'followUpStatus',
      stateValue: 'pendiente_seguimiento',
      affectedRecordIds: crmFollowupRecords.map(r => r.id)
    },
    {
      id: 'next-appointments',
      icon: 'calendar',
      title: 'Consultas programadas próximas',
      count: nextAppointmentsRecords.length,
      priority: 'informativa',
      description: 'Turnos pendientes de atención en consultorios para la selección actual.',
      actionRoute: '#agenda',
      actionLabel: 'Revisar agenda del día',
      sourceCollection: 'DEMO_APPOINTMENTS',
      stateField: 'status',
      stateValue: 'Pendiente',
      affectedRecordIds: nextAppointmentsRecords.map(r => r.id)
    },
    {
      id: 'inbox-unattended',
      icon: 'inbox',
      title: 'Conversaciones pendientes de atención',
      count: inboxUnattendedRecords.length,
      priority: 'alta',
      description: 'Contactos recibidos por canales digitales que requieren calificación humana.',
      actionRoute: '#inbox',
      actionLabel: 'Ir al Inbox omnicanal',
      sourceCollection: 'DEMO_CRM_RECORDS',
      stateField: 'requiresHumanIntervention',
      stateValue: true,
      affectedRecordIds: inboxUnattendedRecords.map(r => r.id)
    },
    {
      id: 'surgical-readiness',
      icon: 'stethoscope',
      title: 'Evaluaciones prequirúrgicas por validar',
      count: surgicalReadinessRecords.length,
      priority: 'media',
      description: 'Cirugías programadas en el período que esperan validación de exámenes preoperatorios.',
      actionRoute: '#agenda',
      actionLabel: 'Ver programación quirúrgica',
      sourceCollection: 'DEMO_SURGERIES',
      stateField: 'preopEvaluationStatus',
      stateValue: 'pendiente_validacion',
      affectedRecordIds: surgicalReadinessRecords.map(r => r.id)
    }
  ];

  return {
    period: win.id,
    sede,
    doctor,
    periodMeta: {
      label: win.label,
      previousLabel: win.previousLabel,
      startDate: win.startDate,
      endDate: win.endDate,
      prevStartDate: win.prevStartDate,
      prevEndDate: win.prevEndDate
    },
    kpi: {
      patientsNew: {
        count: patCurrent,
        previous: patPrevious,
        attributedCount: patAttributedCount,
        unattributedCount: 0,
        pendingOrTechnicalInScope: patPendingOrTechCount,
        unattributedInScope: patPendingOrTechCount,
        attributionDisplay: patAttributionDisplay,
        dataStatus: 'registrado',
        recordIds: src.newPatientsCurrent.map(r => r.id),
        variation: patVarMeta.variation,
        hasValidBase: patVarMeta.hasValidBase,
        state: patVarMeta.state,
        label: patVarMeta.label,
        isPositive: patVarMeta.isPositive,
        isNeutral: patVarMeta.isNeutral
      },
      appointments: {
        count: appTotal,
        previous: appPrev,
        dataStatus: 'registrado',
        recordIds: src.appointmentsCurrent.map(r => r.id),
        variation: appVarMeta.variation,
        hasValidBase: appVarMeta.hasValidBase,
        state: appVarMeta.state,
        label: appVarMeta.label,
        isPositive: appVarMeta.isPositive,
        isNeutral: appVarMeta.isNeutral
      },
      surgeries: {
        count: surCurrent,
        previous: surPrev,
        dataStatus: 'registrado',
        recordIds: src.surgeriesCurrent.map(r => r.id),
        variation: surVarMeta.variation,
        hasValidBase: surVarMeta.hasValidBase,
        state: surVarMeta.state,
        label: surVarMeta.label,
        status: surStatusText,
        isPositive: surVarMeta.isPositive,
        isNeutral: surVarMeta.isNeutral
      },
      revenue: {
        total: revTotal,
        previous: revPrev,
        collected: revCollected,
        pending: revPending,
        attributedTotal: revAttributedTotal,
        attributedCollected: revAttributedCollected,
        attributedPending: revAttributedPending,
        unattributedTotal: revUnattributedTotal,
        unattributedCollected: revUnattributedCollected,
        unattributedPending: revUnattributedPending,
        unattributedInScope: unattributedScopeRevenue,
        attributionDisplay: revAttributionDisplay,
        dataStatus: revTotal > 0 || unattributedScopeRevenue === 0 ? 'registrado' : 'no_atribuido',
        transactionIds: src.transactionsCurrent.map(t => t.id),
        variation: revVarMeta.variation,
        hasValidBase: revVarMeta.hasValidBase,
        state: revVarMeta.state,
        label: revVarMeta.label,
        isPositive: revVarMeta.isPositive,
        isNeutral: revVarMeta.isNeutral
      }
    },
    appointmentStatus: {
      total: appTotal,
      attended: appAttended,
      pending: appPending,
      cancelled: appCancelled,
      noShow: appNoShow,
      attendanceRate: medicalAttendanceRate
    },
    trends: {
      labels: trendLabels,
      scheduled: trendScheduled,
      attended: trendAttended
    },
    specialties: {
      list: specialtiesData,
      total: totalSpecialtyConsults
    },
    surgeries: {
      list: surgeriesData,
      total: totalSurgeryProcedures
    },
    revenueBuckets,
    crmFunnel: {
      contacts: crmContacts,
      qualified: crmQualified,
      scheduled: crmScheduled,
      attended: crmAttended,
      unattributedInScope: src.crmUnattributedInScope.length,
      scopeLabel: funnelScopeLabel,
      rates: {
        qualification: crmContacts > 0 ? (crmQualified / crmContacts) * 100 : 0,
        booking: crmQualified > 0 ? (crmScheduled / crmQualified) * 100 : 0,
        attendance: crmScheduled > 0 ? (crmAttended / crmScheduled) * 100 : 0,
        finalConversion: crmContacts > 0 ? (crmAttended / crmContacts) * 100 : 0
      }
    },
    doctorOccupancy,
    averageOccupancyRate,
    alerts,
    sourceTraceability: {
      version: '1.3.1',
      registeredCollections: [
        'DEMO_PATIENTS_CATALOG',
        'DEMO_NEW_PATIENTS',
        'DEMO_APPOINTMENTS',
        'DEMO_SURGERIES',
        'DEMO_STUDY_ORDERS',
        'DEMO_TRANSACTIONS',
        'DEMO_CRM_RECORDS'
      ],
      estimatedIndicators: ['armResolutionRateDemo', 'armDerivationRateDemo']
    }
  };
}

// ============================================================================
// GENERADORES DE GRÁFICOS SVG INTERACTIVOS Y RESPONSIVOS (CERO DEPENDENCIAS)
// ============================================================================

export function renderAppointmentsTrendChart(trends, width = 640, height = 240) {
  const { labels, scheduled, attended } = trends;
  const padding = { top: 24, right: 28, bottom: 38, left: 44 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;

  const gridSteps = 4;
  const rawMax = Math.max(1, ...scheduled, ...attended);
  const stepVal = Math.max(1, Math.ceil((rawMax * 1.1) / gridSteps));
  const maxVal = stepVal * gridSteps;

  const pointsCount = labels.length;
  const getX = i => padding.left + (pointsCount > 1 ? (i / (pointsCount - 1)) * w : w / 2);
  const getY = v => padding.top + h - (v / maxVal) * h;

  const schedPoints = scheduled.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');
  const attendPoints = attended.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');

  let gridHtml = '';
  for (let s = 0; s <= gridSteps; s++) {
    const val = stepVal * s;
    const y = getY(val);
    gridHtml += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line, #e2e8f0)" stroke-dasharray="3 3" />
      <text x="${padding.left - 8}" y="${y + 4}" font-size="12" font-weight="500" text-anchor="end" fill="var(--muted, #64748b)">${val}</text>
    `;
  }

  const xLabelsHtml = labels.map((lbl, i) => {
    const x = getX(i);
    return `<text x="${x}" y="${height - 10}" font-size="12" font-weight="500" text-anchor="middle" fill="var(--muted, #64748b)">${esc(lbl)}</text>`;
  }).join('');

  const schedCircles = scheduled.map((v, i) => {
    const cx = getX(i);
    const cy = getY(v);
    return `
      <g class="chart-point" tabindex="0" role="img" aria-label="Programadas ${esc(labels[i])}: ${v} citas">
        <circle cx="${cx}" cy="${cy}" r="4.5" fill="#1b4d3e" stroke="#ffffff" stroke-width="2" class="point-circle" />
        <title>Programadas (${esc(labels[i])}): ${v} citas</title>
      </g>
    `;
  }).join('');

  const attendCircles = attended.map((v, i) => {
    const cx = getX(i);
    const cy = getY(v);
    return `
      <g class="chart-point" tabindex="0" role="img" aria-label="Atendidas ${esc(labels[i])}: ${v} citas">
        <circle cx="${cx}" cy="${cy}" r="4.5" fill="#2563eb" stroke="#ffffff" stroke-width="2" class="point-circle" />
        <title>Atendidas (${esc(labels[i])}): ${v} citas</title>
      </g>
    `;
  }).join('');

  return `
    <div class="dash-chart-card">
      <div class="dash-chart-header">
        <div>
          <h3 class="dash-chart-title">Evolución de citas médicas</h3>
          <p class="dash-chart-sub">Comparativa entre citas programadas y efectivamente atendidas</p>
        </div>
        <div class="dash-chart-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#1b4d3e"></span> Programadas</span>
          <span class="legend-item"><span class="legend-dot" style="background:#2563eb"></span> Atendidas</span>
        </div>
      </div>
      <div class="dash-chart-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" class="dash-svg" preserveAspectRatio="xMidYMid meet" role="region" aria-label="Gráfico de líneas de evolución de citas">
          <defs>
            <linearGradient id="schedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1b4d3e" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#1b4d3e" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          ${gridHtml}
          <polygon points="${getX(0)},${padding.top + h} ${schedPoints} ${getX(pointsCount - 1)},${padding.top + h}" fill="url(#schedGrad)" />
          <polyline points="${schedPoints}" fill="none" stroke="#1b4d3e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <polyline points="${attendPoints}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="5 3" stroke-linecap="round" stroke-linejoin="round" />
          ${schedCircles}
          ${attendCircles}
          ${xLabelsHtml}
        </svg>
      </div>
    </div>
  `;
}

export function renderAppointmentStatusDonut(status, size = 260) {
  const { total, attended, pending, cancelled, noShow } = status;
  const safeTotal = total > 0 ? total : 1;

  const slices = [
    { label: 'Atendidas', count: attended, color: '#20835d' },
    { label: 'Pendientes', count: pending, color: '#2563eb' },
    { label: 'Canceladas', count: cancelled, color: '#ef4444' },
    { label: 'No asistió', count: noShow, color: '#d97706' }
  ];

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 30;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const paths = slices.map(s => {
    const fraction = total > 0 ? s.count / safeTotal : 0;
    const dashLength = fraction * circumference;
    const dashOffset = -currentOffset;
    currentOffset += dashLength;

    if (s.count === 0) return '';
    const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';

    return `
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="transparent"
        stroke="${s.color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${dashLength.toFixed(2)} ${circumference.toFixed(2)}"
        stroke-dashoffset="${dashOffset.toFixed(2)}"
        class="donut-segment" tabindex="0" role="img" aria-label="${s.label}: ${s.count} citas (${pct}%)">
        <title>${s.label}: ${s.count} (${pct}%)</title>
      </circle>
    `;
  }).join('');

  const legendItems = slices.map(s => {
    const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';
    return `
      <div class="donut-legend-row">
        <span class="donut-legend-badge" style="background:${s.color}"></span>
        <span class="donut-legend-text">${s.label}</span>
        <b class="donut-legend-count">${s.count}</b>
        <span class="donut-legend-pct">${pct}%</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-chart-card">
      <div class="dash-chart-header">
        <div>
          <h3 class="dash-chart-title">Estado de las citas</h3>
          <p class="dash-chart-sub">Distribución categórica y cumplimiento del período</p>
        </div>
      </div>
      <div class="donut-layout">
        <div class="donut-graphic">
          <svg viewBox="0 0 ${size} ${size}" class="donut-svg" preserveAspectRatio="xMidYMid meet" role="region" aria-label="Gráfico de dona de estados de cita">
            <g transform="rotate(-90 ${cx} ${cy})">
              <circle cx="${cx}" cy="${cy}" r="${radius}" fill="transparent" stroke="var(--surface-soft, #f1f5f9)" stroke-width="${strokeWidth}" />
              ${paths}
            </g>
            <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="28" font-weight="700" fill="var(--text, #0f172a)">${total}</text>
            <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="12" fill="var(--muted, #64748b)" font-weight="500">Total citas</text>
          </svg>
        </div>
        <div class="donut-legend-list">
          ${legendItems}
        </div>
      </div>
    </div>
  `;
}

export function renderSpecialtiesBarChart(specialties) {
  const { list, total } = specialties;
  const maxCount = Math.max(1, ...list.map(s => s.count));

  const barsHtml = list.map(item => {
    const pctOfMax = total > 0 ? ((item.count / maxCount) * 100).toFixed(1) : '0.0';
    const pctOfTotal = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
    return `
      <div class="dash-bar-row">
        <div class="dash-bar-info">
          <span class="dash-bar-name">
            <span class="dash-bar-dot" style="background:${item.color}"></span>
            <b>${esc(item.name)}</b>
          </span>
          <span class="dash-bar-numbers">
            <b>${item.count}</b> consultas <span class="dash-bar-pct">(${pctOfTotal}%)</span>
          </span>
        </div>
        <div class="dash-bar-track" role="progressbar" aria-label="${esc(item.name)}: ${item.count} consultas atendidas (${pctOfTotal}%)" aria-valuenow="${item.count}" aria-valuemin="0" aria-valuemax="${maxCount}">
          <div class="dash-bar-fill" style="width:${pctOfMax}%;background:${item.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-chart-card">
      <div class="dash-chart-header">
        <div>
          <h3 class="dash-chart-title">Consultas por especialidad</h3>
          <p class="dash-chart-sub">Consultas efectivamente atendidas según servicio oftalmológico</p>
        </div>
        <span class="badge tone-accent">${total} atendidas</span>
      </div>
      <div class="dash-bar-list">
        ${barsHtml}
      </div>
    </div>
  `;
}

export function renderRevenueChart(revenueBuckets, width = 640, height = 240) {
  const { labels, collected, pending } = revenueBuckets;
  const padding = { top: 24, right: 24, bottom: 38, left: 64 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;

  const gridSteps = 4;
  const rawMax = Math.max(1, ...collected.map((c, i) => c + (pending[i] || 0)));
  const stepVal = Math.max(1, Math.ceil((rawMax * 1.1) / gridSteps));
  const maxVal = stepVal * gridSteps;

  const steps = labels.length;
  const colWidth = w / steps;
  const barWidth = Math.min(26, colWidth * 0.35);

  let gridHtml = '';
  for (let s = 0; s <= gridSteps; s++) {
    const val = stepVal * s;
    const y = padding.top + h - (val / maxVal) * h;
    const formatted = val >= 1000 ? `S/ ${(val / 1000).toFixed(1)}k` : `S/ ${val}`;
    gridHtml += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line, #e2e8f0)" stroke-dasharray="3 3" />
      <text x="${padding.left - 8}" y="${y + 4}" font-size="12" font-weight="500" text-anchor="end" fill="var(--muted, #64748b)">${formatted}</text>
    `;
  }

  const barsSvg = labels.map((lbl, i) => {
    const colX = padding.left + i * colWidth + (colWidth / 2);
    const colVal = collected[i] || 0;
    const penVal = pending[i] || 0;

    const colH = (colVal / maxVal) * h;
    const penH = (penVal / maxVal) * h;

    const colY = padding.top + h - colH;
    const penY = padding.top + h - penH;

    const x1 = colX - barWidth - 2;
    const x2 = colX + 2;

    const colFormatted = colVal.toLocaleString('es-PE');
    const penFormatted = penVal.toLocaleString('es-PE');

    return `
      <rect x="${x1}" y="${colY}" width="${barWidth}" height="${colH}" rx="3" fill="#1b4d3e"
        class="revenue-bar" tabindex="0" role="img" aria-label="${esc(lbl)} · Cobrado: S/ ${colFormatted}">
        <title>${esc(lbl)} · Cobrado: S/ ${colFormatted}</title>
      </rect>
      <rect x="${x2}" y="${penY}" width="${barWidth}" height="${penH}" rx="3" fill="#d97706"
        class="revenue-bar" tabindex="0" role="img" aria-label="${esc(lbl)} · Pendiente: S/ ${penFormatted}">
        <title>${esc(lbl)} · Pendiente: S/ ${penFormatted}</title>
      </rect>
      <text x="${colX}" y="${height - 10}" font-size="12" font-weight="500" text-anchor="middle" fill="var(--muted, #64748b)">${esc(lbl)}</text>
    `;
  }).join('');

  return `
    <div class="dash-chart-card">
      <div class="dash-chart-header">
        <div>
          <h3 class="dash-chart-title">Evolución de ingresos</h3>
          <p class="dash-chart-sub">Diferenciación entre ingresos efectivamente cobrados e importes pendientes</p>
        </div>
        <div class="dash-chart-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#1b4d3e"></span> Cobrado</span>
          <span class="legend-item"><span class="legend-dot" style="background:#d97706"></span> Pendiente</span>
        </div>
      </div>
      <div class="dash-chart-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" class="dash-svg" preserveAspectRatio="xMidYMid meet" role="region" aria-label="Gráfico de evolución de ingresos">
          ${gridHtml}
          ${barsSvg}
        </svg>
      </div>
    </div>
  `;
}

export function renderFunnelChart(funnel) {
  const { contacts, qualified, scheduled, attended, rates, scopeLabel } = funnel;
  const safeMax = Math.max(1, contacts);

  const steps = [
    {
      label: '1. Contactos recibidos',
      count: contacts,
      stepRate: '100%',
      dropoff: `${contacts - qualified} perdidos (${(100 - rates.qualification).toFixed(1)}%)`,
      color: '#3e95d3',
      widthPct: 100
    },
    {
      label: '2. Prospectos calificados',
      count: qualified,
      stepRate: `${rates.qualification.toFixed(1)}% del paso previo`,
      dropoff: `${qualified - scheduled} no agendados (${((1 - (scheduled / (qualified || 1))) * 100).toFixed(1)}%)`,
      color: '#2563eb',
      widthPct: Math.max(25, (qualified / safeMax) * 100)
    },
    {
      label: '3. Citas programadas',
      count: scheduled,
      stepRate: `${rates.booking.toFixed(1)}% de calificados`,
      dropoff: `${scheduled - attended} inasistencias o cancelaciones`,
      color: '#0d9488',
      widthPct: Math.max(20, (scheduled / safeMax) * 100)
    },
    {
      label: '4. Consultas realizadas',
      count: attended,
      stepRate: `${rates.attendance.toFixed(1)}% de asistencia`,
      dropoff: 'Conversión efectiva a paciente',
      color: '#1b4d3e',
      widthPct: Math.max(16, (attended / safeMax) * 100)
    }
  ];

  const stepsHtml = steps.map((st, idx) => `
    <div class="funnel-step">
      <div class="funnel-step-head">
        <span class="funnel-step-title">
          <span class="funnel-step-num" style="background:${st.color}">${idx + 1}</span>
          <b>${esc(st.label)}</b>
        </span>
        <span class="funnel-step-count"><b>${st.count}</b> registros</span>
      </div>
      <div class="funnel-bar-wrapper">
        <div class="funnel-bar" style="width:${st.widthPct}%;background:${st.color};"
          role="progressbar" aria-label="${esc(st.label)}: ${st.count} registros (${st.stepRate})"
          aria-valuenow="${st.count}" aria-valuemin="0" aria-valuemax="${safeMax}">
          <span class="funnel-bar-inner-text">${st.count}</span>
        </div>
      </div>
      <div class="funnel-step-footer">
        <span class="dash-funnel-rate">✓ ${st.stepRate}</span>
        <span class="funnel-dropoff">${st.dropoff}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="dash-chart-card">
      <div class="dash-chart-header">
        <div>
          <h3 class="dash-chart-title">Embudo comercial CRM + ARM</h3>
          <p class="dash-chart-sub">Conversión por etapas desde el primer contacto hasta la atención médica · ${esc(scopeLabel || 'Cohorte comercial')}</p>
        </div>
        <div class="dash-funnel-metric">
          <span class="funnel-metric-label">Conversión final</span>
          <b class="funnel-metric-val">${rates.finalConversion.toFixed(1)}%</b>
        </div>
      </div>
      <div class="funnel-steps-container">
        ${stepsHtml}
      </div>
    </div>
  `;
}

export function renderSurgeriesBarChart(surgeries) {
  const { list, total } = surgeries;
  const maxCount = Math.max(1, ...list.map(s => s.count));

  const itemsHtml = list.map(item => {
    const pctOfMax = total > 0 ? ((item.count / maxCount) * 100).toFixed(1) : '0.0';
    const pctOfTotal = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
    return `
      <div class="dash-bar-row">
        <div class="dash-bar-info">
          <div>
            <b>${esc(item.name)}</b>
            <small class="dash-bar-subtext">${esc(item.fullName)}</small>
          </div>
          <span class="dash-bar-numbers">
            <b>${item.count}</b> procedimientos <span class="dash-bar-pct">(${pctOfTotal}%)</span>
          </span>
        </div>
        <div class="dash-bar-track" role="progressbar" aria-label="${esc(item.name)}: ${item.count} procedimientos (${pctOfTotal}%)" aria-valuenow="${item.count}" aria-valuemin="0" aria-valuemax="${maxCount}">
          <div class="dash-bar-fill" style="width:${pctOfMax}%;background:${item.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-chart-card">
      <div class="dash-chart-header">
        <div>
          <h3 class="dash-chart-title">Cirugías por procedimiento</h3>
          <p class="dash-chart-sub">Volumen quirúrgico programado sin datos sensibles de pacientes</p>
        </div>
        <span class="badge tone-accent">${total} procedimientos</span>
      </div>
      <div class="dash-bar-list">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// COMPONENTES PRINCIPALES DE LA INTERFAZ
// ============================================================================

export function renderFiltersBar(state, svgIcons = {}) {
  return `
    <div class="dash-controls-panel">
      <div class="dash-filters-grid">
        <div class="dash-filter-group">
          <label for="dash-filter-period" class="dash-filter-label">
            ${svgIcons.calendar || ''} <span>Período</span>
          </label>
          <select id="dash-filter-period" class="dash-select">
            ${PERIODS_CATALOG.map(p => `
              <option value="${p.id}" ${state.period === p.id ? 'selected' : ''}>${esc(p.name)}</option>
            `).join('')}
          </select>
        </div>

        <div class="dash-filter-group">
          <label for="dash-filter-sede" class="dash-filter-label">
            ${svgIcons.home || ''} <span>Sede</span>
          </label>
          <select id="dash-filter-sede" class="dash-select">
            ${SEDES_CATALOG.map(s => `
              <option value="${s.id}" ${state.sede === s.id ? 'selected' : ''}>${esc(s.name)}</option>
            `).join('')}
          </select>
        </div>

        <div class="dash-filter-group">
          <label for="dash-filter-doctor" class="dash-filter-label">
            ${svgIcons.doctor || ''} <span>Especialista</span>
          </label>
          <select id="dash-filter-doctor" class="dash-select">
            ${DOCTORS_CATALOG.map(d => `
              <option value="${esc(d.id)}" ${state.doctor === d.id ? 'selected' : ''}>${esc(d.name)}</option>
            `).join('')}
          </select>
        </div>

        <div class="dash-meta-badge">
          <span class="dash-meta-text">Actualizado: <b>${esc(state.lastUpdated)}</b></span>
          <span class="badge tone-accent">Modo demostración · Datos simulados</span>
        </div>
      </div>

      <nav class="dash-tabs-bar" role="tablist" aria-label="Secciones del Dashboard Ejecutivo">
        <button type="button" id="dash-tab-general" role="tab"
          class="dash-tab-btn ${state.tab === 'general' ? 'is-active' : ''}"
          data-dash-tab="general"
          aria-selected="${state.tab === 'general'}"
          aria-controls="dash-panel-general"
          tabindex="${state.tab === 'general' ? '0' : '-1'}">
          ${svgIcons.home || ''} <span>General</span>
        </button>
        <button type="button" id="dash-tab-medico" role="tab"
          class="dash-tab-btn ${state.tab === 'medico' ? 'is-active' : ''}"
          data-dash-tab="medico"
          aria-selected="${state.tab === 'medico'}"
          aria-controls="dash-panel-medico"
          tabindex="${state.tab === 'medico' ? '0' : '-1'}">
          ${svgIcons.stethoscope || ''} <span>Médico</span>
        </button>
        <button type="button" id="dash-tab-comercial" role="tab"
          class="dash-tab-btn ${state.tab === 'comercial' ? 'is-active' : ''}"
          data-dash-tab="comercial"
          aria-selected="${state.tab === 'comercial'}"
          aria-controls="dash-panel-comercial"
          tabindex="${state.tab === 'comercial' ? '0' : '-1'}">
          ${svgIcons.crm || ''} <span>Comercial / CRM + ARM</span>
        </button>
      </nav>
    </div>
  `;
}

function getVariationClass(kpiItem) {
  if (kpiItem.state === 'neutral' || kpiItem.isNeutral || !kpiItem.hasValidBase) return 'is-neutral';
  return kpiItem.isPositive ? 'is-up' : 'is-down';
}

function getVariationText(kpiItem) {
  if (kpiItem.label) return kpiItem.label;
  return formatPercent(kpiItem.variation);
}

export function renderMainKpiCards(kpi, state = dashboardState, svgIcons = {}) {
  const { patientsNew, appointments, surgeries, revenue } = kpi;

  const formattedAppCount = appointments.count.toString().padStart(2, '0');
  const formattedPatientCount = patientsNew.count.toString().padStart(2, '0');
  const formattedSurgCount = surgeries.count.toString().padStart(2, '0');

  const patTone = patientsNew.isNeutral ? 'tone-accent' : (patientsNew.isPositive ? 'tone-success' : 'tone-warning');

  return `
    <div class="stats dash-kpi-grid">
      <div class="stat ${patTone}">
        <div class="stat-head">
          <span>Pacientes nuevos</span>
          <div class="stat-icon">${svgIcons.users || ''}</div>
        </div>
        <strong data-motion-key="dashboard:pacientes-activos">${formattedPatientCount}</strong>
        <div class="dash-kpi-footer">
          <span class="kpi-variation ${getVariationClass(patientsNew)}">
            ${esc(getVariationText(patientsNew))}
          </span>
          <small>vs. período anterior</small>
          ${patientsNew.attributionDisplay ? `<small class="kpi-attribution-note" data-kpi-attribution="patients">${esc(patientsNew.attributionDisplay)}</small>` : ''}
        </div>
      </div>

      <div class="stat tone-accent">
        <div class="stat-head">
          <span>Citas registradas</span>
          <div class="stat-icon">${svgIcons.calendar || ''}</div>
        </div>
        <strong data-motion-key="dashboard:citas-hoy">${formattedAppCount}</strong>
        <div class="dash-kpi-footer">
          <span class="kpi-variation ${getVariationClass(appointments)}">
            ${esc(getVariationText(appointments))}
          </span>
          <a href="#agenda" class="kpi-quick-link" title="Abrir agenda y citas">Ver agenda →</a>
        </div>
      </div>

      <div class="stat tone-success">
        <div class="stat-head">
          <span>Cirugías programadas</span>
          <div class="stat-icon">${svgIcons.stethoscope || ''}</div>
        </div>
        <strong data-motion-key="dashboard:cirugias-total">${formattedSurgCount}</strong>
        <div class="dash-kpi-footer">
          <span class="kpi-variation ${getVariationClass(surgeries)}">
            ${esc(getVariationText(surgeries))}
          </span>
          <small class="kpi-desc">${esc(surgeries.status)}</small>
        </div>
      </div>

      <div class="stat tone-primary">
        <div class="stat-head">
          <span>Ingresos del período</span>
          <div class="stat-icon">${svgIcons.cash || ''}</div>
        </div>
        <strong data-motion-key="dashboard:ingresos-total">${formatMoney(revenue.total)}</strong>
        <div class="dash-kpi-footer">
          <span class="kpi-variation ${getVariationClass(revenue)}">
            ${esc(getVariationText(revenue))}
          </span>
          <small class="kpi-revenue-breakdown">
            Cobrado: <b>${formatMoney(revenue.collected)}</b> · Pendiente: ${formatMoney(revenue.pending)}
          </small>
          ${revenue.attributionDisplay ? `<small class="kpi-attribution-note" data-kpi-attribution="revenue">${esc(revenue.attributionDisplay)}</small>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderAlertsPanel(alerts, svgIcons = {}) {
  const priorityBadge = prio => {
    if (prio === 'alta') return '<span class="badge tone-warning">Alta prioridad</span>';
    if (prio === 'media') return '<span class="badge tone-accent">Media</span>';
    return '<span class="badge">Informativa</span>';
  };

  const getAlertIcon = iconName => {
    return svgIcons[iconName] || svgIcons.alert || '';
  };

  return `
    <section class="panel dash-alerts-card">
      <div class="panelhead">
        <div>
          <h2>${svgIcons.alert || ''} Alertas operativas de supervisión</h2>
          <p>Situaciones asistenciales y comerciales que requieren atención o seguimiento</p>
        </div>
        <span class="badge tone-warning">${alerts.filter(a => a.count > 0).length} activas</span>
      </div>
      <div class="dash-alerts-grid">
        ${alerts.map(a => `
          <div class="dash-alert-item priority-${a.priority}" data-alert-id="${esc(a.id)}" data-alert-count="${a.count}">
            <div class="dash-alert-head">
              <span class="dash-alert-icon">${getAlertIcon(a.icon)}</span>
              <div class="dash-alert-title-wrap">
                <b>${esc(a.title)}</b>
                <p class="dash-alert-desc">${esc(a.description)}</p>
              </div>
              <span class="dash-alert-count-pill">${a.count}</span>
            </div>
            <div class="dash-alert-action-bar">
              ${priorityBadge(a.priority)}
              ${a.actionRoute ? `<a href="${a.actionRoute}" class="dash-alert-link">${esc(a.actionLabel)} →</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

export function renderGeneralTabContent(metrics, svgIcons = {}, state = dashboardState) {
  const { kpi, trends, appointmentStatus, revenueBuckets, specialties, alerts } = metrics;

  return `
    ${renderMainKpiCards(kpi, state, svgIcons)}

    <div class="dash-charts-grid twocol">
      ${renderAppointmentsTrendChart(trends)}
      ${renderAppointmentStatusDonut(appointmentStatus)}
      ${renderRevenueChart(revenueBuckets)}
      ${renderSpecialtiesBarChart(specialties)}
    </div>

    ${renderAlertsPanel(alerts, svgIcons)}
  `;
}

export function renderMedicalTabContent(metrics, svgIcons = {}) {
  const { specialties, surgeries, doctorOccupancy, averageOccupancyRate, appointmentStatus, alerts } = metrics;
  const medicalAlerts = alerts.filter(a => ['confirm-pending', 'next-appointments', 'surgical-readiness'].includes(a.id));

  const totalConsults = specialties.total;
  const totalSurg = surgeries.total;
  const attendanceRate = appointmentStatus.attendanceRate ?? 0;

  return `
    <div class="stats dash-kpi-grid">
      <div class="stat tone-success">
        <div class="stat-head"><span>Consultas realizadas</span><div class="stat-icon">${svgIcons.stethoscope || ''}</div></div>
        <strong>${totalConsults.toString().padStart(2, '0')}</strong>
        <small>Citas efectivamente atendidas (${totalConsults} de ${appointmentStatus.total})</small>
      </div>
      <div class="stat tone-accent">
        <div class="stat-head"><span>Tasa de asistencia médica</span><div class="stat-icon">${svgIcons.check || ''}</div></div>
        <strong>${attendanceRate.toFixed(1)}%</strong>
        <small>Citas atendidas sobre total registrado</small>
      </div>
      <div class="stat tone-primary">
        <div class="stat-head"><span>Cirugías en agenda</span><div class="stat-icon">${svgIcons.eye || ''}</div></div>
        <strong>${totalSurg.toString().padStart(2, '0')}</strong>
        <small>Procedimientos de alta especialidad</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Ocupación de especialistas</span><div class="stat-icon">${svgIcons.doctor || ''}</div></div>
        <strong>${averageOccupancyRate}%</strong>
        <small>Capacidad asistencial cubierta</small>
      </div>
    </div>

    <div class="dash-charts-grid twocol">
      ${renderSpecialtiesBarChart(specialties)}
      ${renderSurgeriesBarChart(surgeries)}
    </div>

    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svgIcons.doctor || ''} Ocupación y turnos de especialistas</h2>
          <p>Seguimiento asistencial y distribución de carga en quirófanos y consulta externa</p>
        </div>
        <span class="badge">Turnos asignados</span>
      </div>
      <div class="doctor-occupancy-grid">
        ${doctorOccupancy.map(doc => `
          <div class="doctor-occupancy-card ${doc.isFilteredOut ? 'is-muted' : ''}">
            <div class="doctor-occupancy-head">
              <span class="avatar">${doc.name.split(' ').slice(1, 3).map(w => w[0]).join('')}</span>
              <div>
                <b>${esc(doc.name)}</b>
                <p class="dash-subtext">${esc(doc.specialty)}</p>
              </div>
              <span class="badge-load ${doc.rate > 80 ? 'busy' : 'free'}">${doc.rate}% ocupación</span>
            </div>
            <div class="occupancy-progress-bar" role="progressbar" aria-label="Ocupación de ${esc(doc.name)}: ${doc.rate}%" aria-valuenow="${doc.rate}" aria-valuemin="0" aria-valuemax="100">
              <div class="occupancy-fill" style="width:${doc.rate}%;"></div>
            </div>
            <div class="occupancy-stats">
              <span><b>${doc.appointments}</b> de ${doc.maxCapacity} citas de consulta</span>
              <span><b>${doc.surgeries}</b> cirugías</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    ${renderAlertsPanel(medicalAlerts, svgIcons)}
  `;
}

export function renderCommercialTabContent(metrics, svgIcons = {}) {
  const { crmFunnel, alerts } = metrics;
  const commercialAlerts = alerts.filter(a => ['noshow-recovery', 'crm-followup', 'inbox-unattended'].includes(a.id));

  const armSummary = getARMSummary();

  return `
    <div class="stats dash-kpi-grid">
      <div class="stat tone-primary">
        <div class="stat-head"><span>Contactos recibidos</span><div class="stat-icon">${svgIcons.inbox || ''}</div></div>
        <strong>${crmFunnel.contacts.toString().padStart(2, '0')}</strong>
        <small>Total prospectos omnicanal</small>
      </div>
      <div class="stat tone-accent">
        <div class="stat-head"><span>Prospectos calificados</span><div class="stat-icon">${svgIcons.users || ''}</div></div>
        <strong>${crmFunnel.qualified.toString().padStart(2, '0')}</strong>
        <small>${crmFunnel.rates.qualification.toFixed(1)}% tasa de calificación</small>
      </div>
      <div class="stat tone-success">
        <div class="stat-head"><span>Citas agendadas</span><div class="stat-icon">${svgIcons.calendar || ''}</div></div>
        <strong>${crmFunnel.scheduled.toString().padStart(2, '0')}</strong>
        <small>${crmFunnel.rates.booking.toFixed(1)}% conversión a cita</small>
      </div>
      <div class="stat ${crmFunnel.rates.finalConversion > 30 ? 'tone-success' : 'tone-warning'}">
        <div class="stat-head"><span>Conversión final</span><div class="stat-icon">${svgIcons.check || ''}</div></div>
        <strong>${crmFunnel.rates.finalConversion.toFixed(1)}%</strong>
        <small>Contactos convertidos a pacientes</small>
      </div>
    </div>

    <div class="dash-full-chart-row">
      ${renderFunnelChart(crmFunnel)}
    </div>

    <div class="twocol">
      <section class="panel">
        <div class="panelhead">
          <div>
            <h2>${svgIcons.bot || ''} Rendimiento de agentes ARM</h2>
            <p>Capacidad operativa autónoma, derivaciones y flujos activos (métricas demo)</p>
          </div>
          <a class="linkbutton" href="#arm">Abrir Centro ARM →</a>
        </div>
        <div class="arm-kpi-summary">
          <div class="arm-stat-tile">
            <span class="arm-tile-title">Agentes activos</span>
            <b class="arm-tile-val">${armSummary.active} / ${armSummary.total}</b>
            <small>En línea supervisados</small>
          </div>
          <div class="arm-stat-tile">
            <span class="arm-tile-title">Workflows en ejecución</span>
            <b class="arm-tile-val">${armSummary.workflowsActive}</b>
            <small>Flujos automatizados</small>
          </div>
          <div class="arm-stat-tile">
            <span class="arm-tile-title">Tasa de resolución</span>
            <b class="arm-tile-val">84.2%</b>
            <small>Sin intervención humana (demo)</small>
          </div>
          <div class="arm-stat-tile">
            <span class="arm-tile-title">Derivaciones</span>
            <b class="arm-tile-val">15.8%</b>
            <small>Transferidas al equipo (demo)</small>
          </div>
        </div>
        <div class="note" style="margin-top:12px">
          Los agentes de automatización asisten en confirmación de citas, derivación de inasistencias y clasificación inicial de prospectos bajo supervisión humana estricta.
        </div>
      </section>

      ${renderAlertsPanel(commercialAlerts, svgIcons)}
    </div>
  `;
}

export function renderExecutiveDashboardView(containerEl, state, svgIcons = {}, options = {}) {
  if (!containerEl) return;

  let preservedFocusSelector = null;
  if (typeof document !== 'undefined' && document.activeElement && containerEl.contains(document.activeElement)) {
    const activeEl = document.activeElement;
    if (activeEl.id) {
      preservedFocusSelector = `#${activeEl.id}`;
    } else if (activeEl.dataset?.dashTab) {
      preservedFocusSelector = `[data-dash-tab="${activeEl.dataset.dashTab}"]`;
    }
  }

  motion.cancelMotionScope('dashboard', { applyFinal: true });

  const metrics = getDashboardMetrics(state.period, state.sede, state.doctor);

  let tabHtml = '';
  if (state.tab === 'general') {
    tabHtml = renderGeneralTabContent(metrics, svgIcons, state);
  } else if (state.tab === 'medico') {
    tabHtml = renderMedicalTabContent(metrics, svgIcons);
  } else if (state.tab === 'comercial') {
    tabHtml = renderCommercialTabContent(metrics, svgIcons);
  }

  const adminSupervisionNote = options.supervisionNote ||
    'Panel de supervisión de Administración. Acceso integral a operación, finanzas, catálogos y consulta clínica en modo lectura.';

  containerEl.innerHTML = `
    <div class="executive-dashboard-container">
      ${renderFiltersBar(state, svgIcons)}
      <div class="dash-tab-body" id="dash-panel-${esc(state.tab)}" role="tabpanel" aria-labelledby="dash-tab-${esc(state.tab)}" tabindex="0">
        ${tabHtml}
      </div>
      <div class="note" style="margin-top:18px">${esc(adminSupervisionNote)}</div>
    </div>
  `;

  if (motion.shouldAnimateModuleEntry('dashboard', 'kpis')) {
    motion.animateStagger('.dash-kpi-grid .stat', { scope: 'dashboard', maxItems: 4 });
  }

  if (state.tab === 'general') {
    motion.animateNumber(containerEl.querySelector('[data-motion-key="dashboard:citas-hoy"]'), {
      to: metrics.kpi.appointments.count,
      padZeros: 2,
      duration: 140,
      scope: 'dashboard'
    });
    motion.animateNumber(containerEl.querySelector('[data-motion-key="dashboard:pacientes-activos"]'), {
      to: metrics.kpi.patientsNew.count,
      padZeros: 2,
      duration: 140,
      scope: 'dashboard'
    });
    motion.animateNumber(containerEl.querySelector('[data-motion-key="dashboard:cirugias-total"]'), {
      to: metrics.kpi.surgeries.count,
      padZeros: 2,
      duration: 140,
      scope: 'dashboard'
    });
  }

  const triggerFilterRefresh = selector => {
    if (options.onFilterChange) options.onFilterChange();
    const target = containerEl.querySelector(selector);
    if (target && typeof target.focus === 'function') {
      try { target.focus({ preventScroll: true }); } catch { target.focus(); }
    }
  };

  const periodSel = containerEl.querySelector('#dash-filter-period');
  if (periodSel) {
    periodSel.onchange = e => {
      state.period = e.target.value;
      triggerFilterRefresh('#dash-filter-period');
    };
  }

  const sedeSel = containerEl.querySelector('#dash-filter-sede');
  if (sedeSel) {
    sedeSel.onchange = e => {
      state.sede = e.target.value;
      triggerFilterRefresh('#dash-filter-sede');
    };
  }

  const doctorSel = containerEl.querySelector('#dash-filter-doctor');
  if (doctorSel) {
    doctorSel.onchange = e => {
      state.doctor = e.target.value;
      triggerFilterRefresh('#dash-filter-doctor');
    };
  }

  const tabOrder = ['general', 'medico', 'comercial'];
  const activateTab = (tabId, focusTab = false) => {
    state.tab = tabId;
    if (options.onTabChange) options.onTabChange();
    if (focusTab) {
      const btn = containerEl.querySelector(`[data-dash-tab="${tabId}"]`);
      if (btn && typeof btn.focus === 'function') {
        try { btn.focus({ preventScroll: true }); } catch { btn.focus(); }
      }
    }
  };

  containerEl.querySelectorAll('[data-dash-tab]').forEach(btn => {
    btn.onclick = () => activateTab(btn.dataset.dashTab, true);
    btn.onkeydown = e => {
      const idx = tabOrder.indexOf(btn.dataset.dashTab);
      if (idx === -1) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextTab = tabOrder[(idx + 1) % tabOrder.length];
        activateTab(nextTab, true);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevTab = tabOrder[(idx - 1 + tabOrder.length) % tabOrder.length];
        activateTab(prevTab, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        activateTab(tabOrder[0], true);
      } else if (e.key === 'End') {
        e.preventDefault();
        activateTab(tabOrder[tabOrder.length - 1], true);
      }
    };
  });

  if (preservedFocusSelector) {
    const elToFocus = containerEl.querySelector(preservedFocusSelector);
    if (elToFocus && typeof elToFocus.focus === 'function') {
      try { elToFocus.focus({ preventScroll: true }); } catch { elToFocus.focus(); }
    }
  }
}
