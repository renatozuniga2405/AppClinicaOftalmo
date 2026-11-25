// Módulo de Turnos Presenciales / Cola de Atención (en memoria, sin backend ni impresión física)

import * as motion from './motion.js';

export const QUEUE_AREAS = Object.freeze({
  R: {
    code: 'R',
    label: 'Recepción / Admisión',
    shortLabel: 'Recepción',
    counters: ['Recepción 1', 'Recepción 2']
  },
  C: {
    code: 'C',
    label: 'Caja / Pagos',
    shortLabel: 'Caja',
    counters: ['Caja 1']
  }
});

export const TURN_STATES = Object.freeze([
  'En espera',
  'Llamado',
  'En atención',
  'Finalizado',
  'Ausente',
  'Transferido'
]);

export const ACTIVE_TURN_STATES = Object.freeze(['En espera', 'Llamado', 'En atención']);

export const TURN_REASONS = Object.freeze({
  R: [
    'Confirmar llegada para una cita',
    'Consultar o registrar una cita',
    'Actualizar datos personales'
  ],
  C: [
    'Pagar una orden existente',
    'Consultar un pago'
  ]
});

export const INITIAL_TURN_COUNTERS = Object.freeze({ R: 3, C: 1 });

export const INITIAL_TURNS = Object.freeze([
  {
    id: 'R-001',
    code: 'R-001',
    area: 'R',
    state: 'Finalizado',
    reason: 'Confirmar llegada para una cita',
    pid: 1,
    patientLabel: 'María López García',
    docMasked: '••••0001',
    anonKey: null,
    appointmentId: 1,
    orderAppointmentId: null,
    orderReference: null,
    arrivalValidated: true,
    counter: 'Recepción 1',
    createdAt: '2026-10-27 08:38',
    calledAt: '2026-10-27 08:40',
    startedAt: '2026-10-27 08:41',
    closedAt: '2026-10-27 08:44',
    waitMinutes: 2,
    attentionMinutes: 3,
    originTicketId: null,
    linkedTicketId: null,
    history: [
      {
        timestamp: '2026-10-27 08:38',
        fromState: null,
        toState: 'En espera',
        user: 'Autoservicio',
        area: 'R',
        counter: 'Autoservicio',
        reason: 'Confirmar llegada para una cita'
      },
      {
        timestamp: '2026-10-27 08:40',
        fromState: 'En espera',
        toState: 'Llamado',
        user: 'Lucía Fernández',
        area: 'R',
        counter: 'Recepción 1',
        reason: 'Llamado inicial de admisión'
      },
      {
        timestamp: '2026-10-27 08:41',
        fromState: 'Llamado',
        toState: 'En atención',
        user: 'Lucía Fernández',
        area: 'R',
        counter: 'Recepción 1',
        reason: 'Validación de llegada y cita #1'
      },
      {
        timestamp: '2026-10-27 08:44',
        fromState: 'En atención',
        toState: 'Finalizado',
        user: 'Lucía Fernández',
        area: 'R',
        counter: 'Recepción 1',
        reason: 'Admisión completada'
      }
    ]
  },
  {
    id: 'R-002',
    code: 'R-002',
    area: 'R',
    state: 'Llamado',
    reason: 'Confirmar llegada para una cita',
    pid: 2,
    patientLabel: 'Carlos Mendoza Ruiz',
    docMasked: '••••0002',
    anonKey: null,
    appointmentId: 2,
    orderAppointmentId: 2,
    orderReference: 'OP-0002',
    arrivalValidated: false,
    counter: 'Recepción 1',
    createdAt: '2026-10-27 09:08',
    calledAt: '2026-10-27 09:11',
    startedAt: null,
    closedAt: null,
    waitMinutes: 3,
    attentionMinutes: 0,
    originTicketId: null,
    linkedTicketId: null,
    history: [
      {
        timestamp: '2026-10-27 09:08',
        fromState: null,
        toState: 'En espera',
        user: 'Autoservicio',
        area: 'R',
        counter: 'Autoservicio',
        reason: 'Confirmar llegada para una cita'
      },
      {
        timestamp: '2026-10-27 09:11',
        fromState: 'En espera',
        toState: 'Llamado',
        user: 'Lucía Fernández',
        area: 'R',
        counter: 'Recepción 1',
        reason: 'Llamado en pantalla hacia Recepción 1'
      }
    ]
  },
  {
    id: 'R-003',
    code: 'R-003',
    area: 'R',
    state: 'En espera',
    reason: 'Confirmar llegada para una cita',
    pid: 3,
    patientLabel: 'Ana Torres Medina',
    docMasked: '••••0003',
    anonKey: null,
    appointmentId: 3,
    orderAppointmentId: null,
    orderReference: null,
    arrivalValidated: false,
    counter: null,
    createdAt: '2026-10-27 09:14',
    calledAt: null,
    startedAt: null,
    closedAt: null,
    waitMinutes: 4,
    attentionMinutes: 0,
    originTicketId: null,
    linkedTicketId: null,
    history: [
      {
        timestamp: '2026-10-27 09:14',
        fromState: null,
        toState: 'En espera',
        user: 'Autoservicio',
        area: 'R',
        counter: 'Autoservicio',
        reason: 'Confirmar llegada para una cita'
      }
    ]
  },
  {
    id: 'C-001',
    code: 'C-001',
    area: 'C',
    state: 'En espera',
    reason: 'Pagar una orden existente',
    pid: 2,
    patientLabel: 'Carlos Mendoza Ruiz',
    docMasked: '••••0002',
    anonKey: null,
    appointmentId: 2,
    orderAppointmentId: 2,
    orderReference: 'OP-0002',
    arrivalValidated: false,
    counter: null,
    createdAt: '2026-10-27 09:15',
    calledAt: null,
    startedAt: null,
    closedAt: null,
    waitMinutes: 3,
    attentionMinutes: 0,
    originTicketId: null,
    linkedTicketId: null,
    history: [
      {
        timestamp: '2026-10-27 09:15',
        fromState: null,
        toState: 'En espera',
        user: 'Autoservicio',
        area: 'C',
        counter: 'Autoservicio',
        reason: 'Pagar una orden existente (OP-0002)'
      }
    ]
  }
]);

export const SHARED_TURNOS_STORAGE_KEY = 'clinica_turnos_shared_v1';
export const INTERNAL_TURNOS_OPS_STORAGE_KEY = 'clinica_turnos_ops_private_v1';
export const SHARED_TURNOS_CHANNEL_NAME = 'clinica_turnos_channel_v1';
const SHARED_TURNOS_SCHEMA_VERSION = 1;
const DEMO_BASE_DATE_STR = '2026-10-27';
const DEMO_BASE_DATE_LABEL = 'Martes, 27 de octubre de 2026';
const TAB_ORIGIN_ID = `tab-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

export const ALLOWED_SHARED_ROOT_KEYS = Object.freeze([
  'version', 'revision', 'updatedAt', 'originId', 'action', 'lastEvent',
  'seqCounters', 'selectedCounters', 'demoMinuteOffset', 'callSequence', 'anonAutoSeq', 'turns'
]);
export const ALLOWED_SHARED_TURN_KEYS = Object.freeze([
  'id', 'code', 'area', 'state', 'counter',
  'createdAt', 'calledAt', 'startedAt', 'closedAt', '_callOrder'
]);
export const FORBIDDEN_SHARED_TURN_KEYS = Object.freeze([
  'pid', 'anonKey', 'appointmentId', 'orderAppointmentId', 'orderReference',
  'reason', 'history', 'arrivalValidated', 'waitMinutes', 'attentionMinutes',
  'originTicketId', 'linkedTicketId', 'patientLabel', 'patientName',
  'docMasked', 'dni', 'documentNumber', 'phone', 'diagnosis', 'amount', 'payment', 'service'
]);

const initialTurnsByCode = new Map(INITIAL_TURNS.map(t => [t.code, t]));

let turns = JSON.parse(JSON.stringify(INITIAL_TURNS));
let seqCounters = { ...INITIAL_TURN_COUNTERS };
let selectedCounters = { recepcion: 'Recepción 1', caja: 'Caja 1' };
let demoMinuteOffset = 20;
let demoClockSeconds = 12;
let demoClockExtraMinutes = 0;
let callSequence = 2;
let anonAutoSeq = 1;
let panelUiAlert = null;

let sharedRevision = 0;
let sharedUpdatedAt = '2026-10-27 09:19';
let lastSharedEvent = null;
let lastAnnouncedCallKey = '';
let tvClockTimer = null;

const defaultPatientDirectory = new Map();
for (const seedTurn of INITIAL_TURNS) {
  if (seedTurn.pid != null && seedTurn.patientLabel) {
    defaultPatientDirectory.set(Number(seedTurn.pid), {
      name: seedTurn.patientLabel,
      docMasked: seedTurn.docMasked || `••••${String(seedTurn.pid).padStart(4, '0')}`
    });
  }
}
let registeredPatientDirectory = new Map();

let customStorageAdapter = null;
let sharedBroadcastChannel = null;
let syncTransportBound = false;
const syncListeners = new Set();

export function getTabOriginId() {
  return TAB_ORIGIN_ID;
}

export function setTurnosStorageAdapter(adapter) {
  customStorageAdapter = adapter || null;
}

export function registerTurnosPatientDirectory(patientList = []) {
  registeredPatientDirectory = new Map();
  if (!Array.isArray(patientList)) return;
  for (const p of patientList) {
    if (!p || p.id == null) continue;
    const cleanDni = String(p.doc ?? p.dni ?? '').replace(/\D/g, '');
    const docMasked = cleanDni.length >= 4
      ? `••••${cleanDni.slice(-4)}`
      : `••••${String(p.id).padStart(4, '0')}`;
    registeredPatientDirectory.set(Number(p.id), {
      name: String(p.name || `Paciente #${p.id}`),
      docMasked
    });
  }
}

function resolvePatientIdentity(pid, anonKey = null) {
  if (pid != null) {
    const numId = Number(pid);
    const meta = registeredPatientDirectory.get(numId) || defaultPatientDirectory.get(numId);
    if (meta) {
      return { patientLabel: meta.name, docMasked: meta.docMasked };
    }
    return {
      patientLabel: `Paciente #${numId}`,
      docMasked: `••••${String(numId).padStart(4, '0')}`
    };
  }
  const tmpMatch = typeof anonKey === 'string' ? anonKey.match(/^TMPDOC-[A-Z0-9]+-(\d{4})$/) : null;
  if (tmpMatch) {
    return {
      patientLabel: 'Visitante sin identificación',
      docMasked: `••••${tmpMatch[1]}`
    };
  }
  return {
    patientLabel: 'Visitante sin identificación',
    docMasked: 'Sin DNI'
  };
}

function getStorageBackend() {
  if (customStorageAdapter) return customStorageAdapter;
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getOrCreateBroadcastChannel() {
  if (sharedBroadcastChannel) return sharedBroadcastChannel;
  try {
    if (typeof BroadcastChannel === 'function') {
      sharedBroadcastChannel = new BroadcastChannel(SHARED_TURNOS_CHANNEL_NAME);
      if (typeof sharedBroadcastChannel.unref === 'function') {
        sharedBroadcastChannel.unref();
      }
      sharedBroadcastChannel.addEventListener('message', ev => {
        handleIncomingSyncSignal(ev?.data, 'broadcast');
      });
    }
  } catch {
    sharedBroadcastChannel = null;
  }
  return sharedBroadcastChannel;
}

function initSyncTransport() {
  if (syncTransportBound) return;
  syncTransportBound = true;
  getOrCreateBroadcastChannel();
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', ev => {
      if (ev && ev.key === SHARED_TURNOS_STORAGE_KEY && ev.newValue) {
        handleIncomingSyncSignal({ action: 'storage' }, 'storage');
      }
    });
    window.addEventListener('visibilitychange', () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        handleIncomingSyncSignal({ action: 'visibility' }, 'visibility');
      }
    });
  }
}

function sanitizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    timestamp: String(entry.timestamp || ''),
    fromState: entry.fromState != null ? String(entry.fromState) : null,
    toState: String(entry.toState || 'En espera'),
    user: String(entry.user || ''),
    area: entry.area === 'C' ? 'C' : 'R',
    counter: String(entry.counter || ''),
    reason: String(entry.reason || '')
  };
}

function sanitizeSharedEvent(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const type = String(ev.type || '').trim();
  if (!type) return null;
  return {
    type,
    code: ev.code ? String(ev.code) : null,
    area: ev.area === 'R' || ev.area === 'C' ? ev.area : null,
    counter: ev.counter ? String(ev.counter) : null,
    callOrder: Number.isFinite(Number(ev.callOrder)) ? Number(ev.callOrder) : 0,
    at: ev.at ? String(ev.at) : ''
  };
}

function sanitizeTurnPrivateOps(t) {
  if (!t || typeof t !== 'object') return null;
  const area = t.area === 'C' ? 'C' : (t.area === 'R' ? 'R' : null);
  const pid = t.pid != null && Number.isFinite(Number(t.pid)) ? Number(t.pid) : null;
  const defaultReason = area ? (TURN_REASONS[area]?.[0] || 'Atención general') : 'Confirmar llegada para una cita';
  const validReason = area && TURN_REASONS[area]?.includes(t.reason)
    ? t.reason
    : (typeof t.reason === 'string' && t.reason.trim() ? t.reason.trim() : defaultReason);
  return {
    pid,
    anonKey: pid == null && t.anonKey ? String(t.anonKey) : null,
    reason: validReason,
    appointmentId: t.appointmentId != null && Number.isFinite(Number(t.appointmentId)) ? Number(t.appointmentId) : null,
    orderAppointmentId: t.orderAppointmentId != null && Number.isFinite(Number(t.orderAppointmentId)) ? Number(t.orderAppointmentId) : null,
    orderReference: t.orderReference ? String(t.orderReference) : null,
    arrivalValidated: Boolean(t.arrivalValidated),
    waitMinutes: Number.isFinite(Number(t.waitMinutes)) ? Number(t.waitMinutes) : 0,
    attentionMinutes: Number.isFinite(Number(t.attentionMinutes)) ? Number(t.attentionMinutes) : 0,
    originTicketId: t.originTicketId ? String(t.originTicketId) : null,
    linkedTicketId: t.linkedTicketId ? String(t.linkedTicketId) : null,
    history: Array.isArray(t.history) ? t.history.map(sanitizeHistoryEntry).filter(Boolean) : []
  };
}

function savePrivateOpsState(storageBackend = getStorageBackend()) {
  if (!storageBackend) return;
  const byCode = {};
  for (const t of turns) {
    const ops = sanitizeTurnPrivateOps(t);
    if (ops) byCode[t.code] = ops;
  }
  try {
    storageBackend.setItem(INTERNAL_TURNOS_OPS_STORAGE_KEY, JSON.stringify({
      version: SHARED_TURNOS_SCHEMA_VERSION,
      revision: sharedRevision,
      byCode
    }));
  } catch {
    // Ignorar cuota/disponibilidad en modo memoria
  }
}

function loadPrivateOpsState() {
  const storage = getStorageBackend();
  if (!storage) return { revision: -1, byCode: {} };
  try {
    const raw = storage.getItem(INTERNAL_TURNOS_OPS_STORAGE_KEY);
    if (!raw) return { revision: -1, byCode: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.byCode || typeof parsed.byCode !== 'object') {
      return { revision: -1, byCode: {} };
    }
    const rev = Number.isFinite(Number(parsed.revision)) ? Number(parsed.revision) : -1;
    return { revision: rev, byCode: parsed.byCode };
  } catch {
    return { revision: -1, byCode: {} };
  }
}

function formatDemoStampByOffset(minuteOffset) {
  const safeOffset = Math.max(0, Number(minuteOffset) || 0);
  const baseMinutes = 9 * 60 + safeOffset;
  const hh = String(Math.floor(baseMinutes / 60) % 24).padStart(2, '0');
  const mm = String(baseMinutes % 60).padStart(2, '0');
  return `${DEMO_BASE_DATE_STR} ${hh}:${mm}`;
}

export function getCurrentDemoTimestamp(minuteOffset = demoMinuteOffset) {
  const markOffset = Math.max(15, Number(minuteOffset || 20) - 1);
  return formatDemoStampByOffset(markOffset);
}

export function getDemoClockSnapshot() {
  const markOffset = Math.max(15, Number(demoMinuteOffset || 20) - 1) + demoClockExtraMinutes;
  const totalMinutes = 9 * 60 + markOffset;
  const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  const ss = String(demoClockSeconds % 60).padStart(2, '0');
  return {
    date: DEMO_BASE_DATE_STR,
    dateText: DEMO_BASE_DATE_LABEL,
    hm: `${hh}:${mm}`,
    timeText: `${hh}:${mm}:${ss}`,
    timestamp: `${DEMO_BASE_DATE_STR} ${hh}:${mm}`
  };
}

function sanitizeTurnForSharedStorage(t) {
  if (!t || typeof t !== 'object') return null;
  const area = t.area === 'C' ? 'C' : (t.area === 'R' ? 'R' : null);
  const code = String(t.code || t.id || '').trim();
  if (!area || !code) return null;
  const state = TURN_STATES.includes(t.state) ? t.state : 'En espera';

  return {
    id: String(t.id || code),
    code,
    area,
    state,
    counter: t.counter && QUEUE_AREAS[area].counters.includes(t.counter) ? t.counter : null,
    createdAt: String(t.createdAt || ''),
    calledAt: t.calledAt ? String(t.calledAt) : null,
    startedAt: t.startedAt ? String(t.startedAt) : null,
    closedAt: t.closedAt ? String(t.closedAt) : null,
    _callOrder: Number.isFinite(Number(t._callOrder)) ? Number(t._callOrder) : 0
  };
}

export function sanitizeSharedTurnState(rawState) {
  if (!rawState || typeof rawState !== 'object') return null;
  const version = Number(rawState.version ?? SHARED_TURNOS_SCHEMA_VERSION);
  if (version !== SHARED_TURNOS_SCHEMA_VERSION) return null;
  if (!Array.isArray(rawState.turns)) return null;

  const revNum = Number(rawState.revision);
  const revision = Number.isFinite(revNum) && revNum >= 0 ? Math.floor(revNum) : 0;
  const safeOffset = Number.isFinite(Number(rawState.demoMinuteOffset)) ? Number(rawState.demoMinuteOffset) : 20;

  return {
    version: SHARED_TURNOS_SCHEMA_VERSION,
    revision,
    updatedAt: typeof rawState.updatedAt === 'string' && rawState.updatedAt
      ? rawState.updatedAt
      : getCurrentDemoTimestamp(safeOffset),
    originId: typeof rawState.originId === 'string' && rawState.originId
      ? rawState.originId
      : TAB_ORIGIN_ID,
    action: typeof rawState.action === 'string' && rawState.action
      ? rawState.action
      : 'sync',
    lastEvent: sanitizeSharedEvent(rawState.lastEvent),
    seqCounters: {
      R: Math.max(0, Number(rawState.seqCounters?.R ?? INITIAL_TURN_COUNTERS.R)),
      C: Math.max(0, Number(rawState.seqCounters?.C ?? INITIAL_TURN_COUNTERS.C))
    },
    selectedCounters: {
      recepcion: QUEUE_AREAS.R.counters.includes(rawState.selectedCounters?.recepcion)
        ? rawState.selectedCounters.recepcion
        : 'Recepción 1',
      caja: QUEUE_AREAS.C.counters.includes(rawState.selectedCounters?.caja)
        ? rawState.selectedCounters.caja
        : 'Caja 1'
    },
    demoMinuteOffset: safeOffset,
    callSequence: Number.isFinite(Number(rawState.callSequence)) ? Number(rawState.callSequence) : 2,
    anonAutoSeq: Number.isFinite(Number(rawState.anonAutoSeq)) ? Math.max(1, Number(rawState.anonAutoSeq)) : 1,
    turns: rawState.turns.map(sanitizeTurnForSharedStorage).filter(Boolean)
  };
}

function hydrateMemoryTurnFromShared(sharedTurn, { opsState, rawByCode, existingByCode, cleanRevision, isReset }) {
  const codeKey = String(sharedTurn.code || sharedTurn.id || '');
  const rawTurn = rawByCode && rawByCode.get(codeKey);
  const rawHasOps = Boolean(
    rawTurn && (
      rawTurn.pid !== undefined ||
      rawTurn.anonKey !== undefined ||
      rawTurn.reason !== undefined ||
      rawTurn.appointmentId !== undefined ||
      rawTurn.orderAppointmentId !== undefined ||
      Array.isArray(rawTurn.history)
    )
  );
  const existingTurn = !isReset && existingByCode ? existingByCode.get(codeKey) : null;
  const initialTurn = initialTurnsByCode.get(codeKey) || null;
  const opsByCode = opsState?.byCode?.[codeKey] || null;
  const opsSource = (opsState?.revision === cleanRevision && opsByCode)
    ? opsByCode
    : (rawHasOps ? rawTurn : (opsByCode || existingTurn || initialTurn || null));

  const cleanOps = sanitizeTurnPrivateOps({ area: sharedTurn.area, ...(opsSource || {}) }) || {
    pid: null,
    anonKey: null,
    reason: TURN_REASONS[sharedTurn.area]?.[0] || 'Atención general',
    appointmentId: null,
    orderAppointmentId: null,
    orderReference: null,
    arrivalValidated: false,
    waitMinutes: 0,
    attentionMinutes: 0,
    originTicketId: null,
    linkedTicketId: null,
    history: []
  };
  const identity = resolvePatientIdentity(cleanOps.pid, cleanOps.anonKey);
  return {
    ...sharedTurn,
    ...cleanOps,
    patientLabel: identity.patientLabel,
    docMasked: identity.docMasked
  };
}

export function loadSharedTurnState() {
  const storage = getStorageBackend();
  if (!storage) return null;
  try {
    const raw = storage.getItem(SHARED_TURNOS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeSharedTurnState(parsed);
  } catch {
    return null;
  }
}

export function applyExternalSharedTurnState(rawState, { force = false } = {}) {
  const clean = sanitizeSharedTurnState(rawState);
  if (!clean) {
    return { applied: false, reason: 'invalid' };
  }
  if (!force && clean.revision <= sharedRevision) {
    return {
      applied: false,
      reason: 'stale',
      revision: clean.revision,
      currentRevision: sharedRevision
    };
  }

  const opsState = loadPrivateOpsState();
  const existingByCode = new Map(turns.map(t => [t.code, t]));
  const rawByCode = new Map(
    (Array.isArray(rawState.turns) ? rawState.turns : [])
      .filter(Boolean)
      .map(t => [String(t.code || t.id || ''), t])
  );
  const isReset = clean.action === 'reset';

  turns = clean.turns.map(st =>
    hydrateMemoryTurnFromShared(st, {
      opsState,
      rawByCode,
      existingByCode,
      cleanRevision: clean.revision,
      isReset
    })
  );
  seqCounters = { ...clean.seqCounters };
  selectedCounters = { ...clean.selectedCounters };
  demoMinuteOffset = clean.demoMinuteOffset;
  demoClockExtraMinutes = 0;
  callSequence = clean.callSequence;
  anonAutoSeq = clean.anonAutoSeq;
  panelUiAlert = null;
  sharedRevision = clean.revision;
  sharedUpdatedAt = clean.updatedAt;
  lastSharedEvent = clean.lastEvent;

  if (isReset) {
    lastAnnouncedCallKey = '';
    resetKioskState();
  }

  return { applied: true, state: clean };
}

export function hydrateTurnStateFromSharedStorage({ forceIfEqual = false } = {}) {
  const stored = loadSharedTurnState();
  if (!stored) return { hydrated: false, reason: 'empty', revision: sharedRevision };
  const res = applyExternalSharedTurnState(stored, {
    force: forceIfEqual || (sharedRevision === 0 && stored.revision >= 0)
  });
  return {
    hydrated: res.applied,
    reason: res.applied ? 'ok' : res.reason,
    state: stored,
    revision: sharedRevision
  };
}

export function broadcastTurnStateChange(payload = null) {
  const channel = getOrCreateBroadcastChannel();
  const message = {
    version: SHARED_TURNOS_SCHEMA_VERSION,
    revision: sharedRevision,
    updatedAt: sharedUpdatedAt,
    originId: TAB_ORIGIN_ID,
    action: String(payload?.action || 'sync'),
    lastEvent: sanitizeSharedEvent(payload?.lastEvent ?? lastSharedEvent)
  };
  if (channel) {
    try {
      channel.postMessage(message);
    } catch {
      // Ignorar canales cerrados en entorno de prueba
    }
  }
  return message;
}

function notifySyncListeners(meta) {
  for (const listener of syncListeners) {
    try {
      listener(meta);
    } catch {
      // Aislamiento entre suscriptores UI
    }
  }
}

function handleIncomingSyncSignal(signal, source = 'broadcast') {
  if (signal && signal.originId && signal.originId === TAB_ORIGIN_ID) {
    return { applied: false, reason: 'self' };
  }
  const stored = loadSharedTurnState();
  if (stored && stored.revision > sharedRevision) {
    const res = applyExternalSharedTurnState(stored);
    if (res.applied) {
      notifySyncListeners({
        originId: stored.originId,
        revision: stored.revision,
        updatedAt: stored.updatedAt,
        action: stored.action,
        lastEvent: stored.lastEvent,
        source
      });
      return { applied: true, state: stored };
    }
  }
  return { applied: false, reason: 'no_newer_state' };
}

export function subscribeToTurnStateChanges(listener) {
  if (typeof listener !== 'function') return () => {};
  initSyncTransport();
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncMetadata() {
  return {
    version: SHARED_TURNOS_SCHEMA_VERSION,
    revision: sharedRevision,
    updatedAt: sharedUpdatedAt,
    originId: TAB_ORIGIN_ID,
    lastEvent: lastSharedEvent ? { ...lastSharedEvent } : null
  };
}

function buildCurrentSharedStateSnapshot(actionName = 'sync', eventObj = null) {
  return sanitizeSharedTurnState({
    version: SHARED_TURNOS_SCHEMA_VERSION,
    revision: sharedRevision,
    updatedAt: sharedUpdatedAt,
    originId: TAB_ORIGIN_ID,
    action: actionName,
    lastEvent: eventObj ?? lastSharedEvent,
    seqCounters,
    selectedCounters,
    demoMinuteOffset,
    callSequence,
    anonAutoSeq,
    turns
  });
}

function persistAndBroadcastSnapshot(actionName = 'sync', eventObj = null, source = 'local') {
  const snapshot = buildCurrentSharedStateSnapshot(actionName, eventObj);
  const storage = getStorageBackend();
  if (storage && snapshot) {
    savePrivateOpsState(storage);
    try {
      storage.setItem(SHARED_TURNOS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignorar cuota/disponibilidad en modo memoria
    }
  }
  broadcastTurnStateChange({ action: actionName, lastEvent: snapshot?.lastEvent });
  notifySyncListeners({
    originId: TAB_ORIGIN_ID,
    revision: sharedRevision,
    updatedAt: sharedUpdatedAt,
    action: actionName,
    lastEvent: snapshot?.lastEvent || null,
    source
  });
  return snapshot;
}

function takeMemorySnapshot() {
  return {
    turns: turns.map(t => ({ ...t, history: t.history.map(h => ({ ...h })) })),
    seqCounters: { ...seqCounters },
    selectedCounters: { ...selectedCounters },
    demoMinuteOffset,
    demoClockExtraMinutes,
    callSequence,
    anonAutoSeq,
    panelUiAlert: panelUiAlert ? { ...panelUiAlert } : null,
    sharedRevision,
    sharedUpdatedAt,
    lastSharedEvent: lastSharedEvent ? { ...lastSharedEvent } : null
  };
}

function restoreMemorySnapshot(snap) {
  turns = snap.turns;
  seqCounters = snap.seqCounters;
  selectedCounters = snap.selectedCounters;
  demoMinuteOffset = snap.demoMinuteOffset;
  demoClockExtraMinutes = snap.demoClockExtraMinutes ?? 0;
  callSequence = snap.callSequence;
  anonAutoSeq = snap.anonAutoSeq;
  panelUiAlert = snap.panelUiAlert;
  sharedRevision = snap.sharedRevision;
  sharedUpdatedAt = snap.sharedUpdatedAt;
  lastSharedEvent = snap.lastSharedEvent;
}

export function commitSharedTurnMutation(actionName, mutatorFn, eventBuilderFn = null) {
  if (typeof mutatorFn !== 'function') {
    return { ok: false, error: 'Mutación inválida.' };
  }

  const stored = loadSharedTurnState();
  if (stored && stored.revision > sharedRevision) {
    applyExternalSharedTurnState(stored);
  }

  const prevSnap = takeMemorySnapshot();
  const result = mutatorFn();

  if (!result || result.ok === false) {
    restoreMemorySnapshot(prevSnap);
    return result;
  }

  const invariants = verifyQueueInvariants();
  if (!invariants.ok) {
    restoreMemorySnapshot(prevSnap);
    return {
      ok: false,
      error: invariants.issues.join(' ') || 'Inconsistencia operativa en cola de turnos.'
    };
  }

  const latestStored = loadSharedTurnState();
  const highestRev = Math.max(sharedRevision, latestStored?.revision || 0);
  sharedRevision = highestRev + 1;
  demoClockExtraMinutes = 0;
  sharedUpdatedAt = getCurrentDemoTimestamp();
  lastSharedEvent = typeof eventBuilderFn === 'function'
    ? sanitizeSharedEvent(eventBuilderFn(result, sharedUpdatedAt))
    : sanitizeSharedEvent({ type: actionName, at: sharedUpdatedAt });

  const snapshot = persistAndBroadcastSnapshot(actionName, lastSharedEvent, 'local');
  return {
    ...result,
    revision: snapshot?.revision ?? sharedRevision,
    updatedAt: snapshot?.updatedAt ?? sharedUpdatedAt
  };
}

if (typeof window !== 'undefined') {
  initSyncTransport();
}

export function buildTemporaryDocumentKey(documentNumber) {
  const clean = String(documentNumber || '').trim().replace(/\D/g, '');
  if (!/^\d{8}$/.test(clean)) return null;
  let hash = 0x811c9dc5;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const token = (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
  const tail = clean.slice(-4);
  return `TMPDOC-${token}-${tail}`;
}

export const kioskUiState = {
  step: 1, // 1: Documento, 2: Área, 3: Confirmación, 4: Ticket generado / Duplicado
  dni: '',
  maskedDni: '',
  tempKey: null,
  match: null,
  isAnonymous: false,
  anonymousLostHelp: false,
  selectedArea: null, // 'R' | 'C'
  isSubmitting: false,
  docError: '',
  duplicateError: '',
  duplicateExisting: null,
  genError: '',
  generatedResult: null,
  printState: 'idle', // 'idle' | 'requesting' | 'requested' | 'error'
  inactivityTimer: null,
  autoResetTimer: null
};

export function resetKioskState() {
  if (kioskUiState.inactivityTimer) {
    clearTimeout(kioskUiState.inactivityTimer);
    kioskUiState.inactivityTimer = null;
  }
  if (kioskUiState.autoResetTimer) {
    clearTimeout(kioskUiState.autoResetTimer);
    kioskUiState.autoResetTimer = null;
  }
  kioskUiState.step = 1;
  kioskUiState.dni = '';
  kioskUiState.maskedDni = '';
  kioskUiState.tempKey = null;
  kioskUiState.match = null;
  kioskUiState.isAnonymous = false;
  kioskUiState.anonymousLostHelp = false;
  kioskUiState.selectedArea = null;
  kioskUiState.isSubmitting = false;
  kioskUiState.docError = '';
  kioskUiState.duplicateError = '';
  kioskUiState.duplicateExisting = null;
  kioskUiState.genError = '';
  kioskUiState.generatedResult = null;
  kioskUiState.printState = 'idle';
  if (typeof window !== 'undefined' && typeof window.__clearPublicNotice === 'function') {
    window.__clearPublicNotice();
  }
}

const adminUiState = {
  area: 'ALL',
  state: 'ALL'
};

function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, s => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]
  ));
}

function normalizeTurnText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function nextDemoTimestamp() {
  const stamp = formatDemoStampByOffset(demoMinuteOffset);
  demoMinuteOffset += 1;
  return stamp;
}

function parseStampMinutes(ts) {
  if (!ts || typeof ts !== 'string') return null;
  const m = ts.match(/(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function maskPatientName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Paciente';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.slice(1).map(p => p[0].toUpperCase() + '.').join(' ')}`;
}

function findTurnMutable(idOrCode) {
  const key = String(idOrCode || '').trim().toUpperCase();
  return turns.find(t => t.id.toUpperCase() === key || t.code.toUpperCase() === key) || null;
}

function resetInMemoryTurnosState() {
  turns = JSON.parse(JSON.stringify(INITIAL_TURNS));
  seqCounters = { ...INITIAL_TURN_COUNTERS };
  selectedCounters = { recepcion: 'Recepción 1', caja: 'Caja 1' };
  demoMinuteOffset = 20;
  demoClockSeconds = 12;
  demoClockExtraMinutes = 0;
  callSequence = 2;
  anonAutoSeq = 1;
  panelUiAlert = null;
  lastSharedEvent = null;
  lastAnnouncedCallKey = '';
  resetKioskState();
  adminUiState.area = 'ALL';
  adminUiState.state = 'ALL';
}

export function resetSharedTurnState() {
  const latestStored = loadSharedTurnState();
  const nextRevision = Math.max(sharedRevision, latestStored?.revision || 0) + 1;
  resetInMemoryTurnosState();
  motion.resetMotionScope('turnos');
  sharedRevision = nextRevision;
  sharedUpdatedAt = getCurrentDemoTimestamp();
  persistAndBroadcastSnapshot('reset', null, 'local');
  return {
    ok: true,
    revision: sharedRevision,
    updatedAt: sharedUpdatedAt
  };
}

export function resetTurnosData() {
  return resetSharedTurnState();
}

export function getTurns() {
  return turns.map(t => ({
    ...t,
    history: t.history.map(h => ({ ...h }))
  }));
}

export function getTurnById(idOrCode) {
  const found = findTurnMutable(idOrCode);
  return found ? { ...found, history: found.history.map(h => ({ ...h })) } : null;
}

export function getTurnCounters() {
  return { ...seqCounters };
}

export function getSelectedCounter(role) {
  if (role === 'recepcion') return selectedCounters.recepcion || 'Recepción 1';
  if (role === 'caja') return selectedCounters.caja || 'Caja 1';
  return null;
}

export function setSelectedCounter(role, counterName) {
  if (role === 'recepcion' && QUEUE_AREAS.R.counters.includes(counterName)) {
    selectedCounters.recepcion = counterName;
    return { ok: true, counter: counterName };
  }
  if (role === 'caja' && QUEUE_AREAS.C.counters.includes(counterName)) {
    selectedCounters.caja = counterName;
    return { ok: true, counter: counterName };
  }
  return { ok: false, error: 'Ventanilla no válida para este rol.' };
}

export function getAheadCount(area) {
  return turns.filter(t => t.area === area && t.state === 'En espera').length;
}

export function getAheadCountForTurn(turn) {
  if (!turn || !turn.id) return 0;
  const waitingInArea = turns.filter(t => t.area === turn.area && t.state === 'En espera');
  const idx = waitingInArea.findIndex(t => t.id === turn.id);
  return idx >= 0 ? idx : 0;
}

export function getActiveTurnForCounter(area, counterName) {
  if (!area || !counterName) return null;
  const found = turns.find(
    t => t.area === area && t.counter === counterName && ['Llamado', 'En atención'].includes(t.state)
  );
  return found ? getTurnById(found.id) : null;
}

export function lookupPatientByDniForKiosk(dniInput, patients = [], appointments = [], today = '2026-10-27') {
  const cleanDni = String(dniInput || '').replace(/\s+/g, '').trim();
  if (!/^\d{8}$/.test(cleanDni)) {
    return { found: false, invalid: true, error: 'Ingresa un DNI válido de 8 dígitos.' };
  }
  const tempKey = buildTemporaryDocumentKey(cleanDni);
  const patient = patients.find(p => String(p.doc || '').trim() === cleanDni && p.active !== false);
  if (!patient) {
    return {
      found: false,
      invalid: false,
      tempKey,
      docMasked: '••••' + cleanDni.slice(-4),
      error: 'No encontramos un registro activo con ese DNI. Puedes continuar sin identificación.'
    };
  }
  const patientApps = appointments.filter(a => a.pid === patient.id && a.status !== 'Cancelada');
  const todayApp = patientApps.find(a => a.date === today && a.status !== 'Atendida') || null;
  const pendingOrderApp = patientApps.find(a => a.order === true && !a.paid) || null;

  return {
    found: true,
    invalid: false,
    pid: patient.id,
    maskedName: maskPatientName(patient.name),
    fullNameForInternal: patient.name,
    docMasked: '••••' + cleanDni.slice(-4),
    hasAppointmentToday: Boolean(todayApp),
    appointmentId: todayApp ? todayApp.id : null,
    appointmentTime: todayApp ? todayApp.time : null,
    appointmentStatus: todayApp ? todayApp.status : null,
    hasPendingOrder: Boolean(pendingOrderApp),
    orderAppointmentId: pendingOrderApp ? pendingOrderApp.id : null,
    orderReference: pendingOrderApp
      ? (pendingOrderApp.reference || `OP-${String(pendingOrderApp.id).padStart(4, '0')}`)
      : null,
    orderAmount: pendingOrderApp ? Number(pendingOrderApp.amount || 0) : null
  };
}

export function findDuplicateActiveTurn({
  pid = null,
  anonKey = null,
  area,
  reason = '',
  appointmentId = null,
  orderAppointmentId = null,
  orderReference = null,
  isTransfer = false,
  excludeTurnId = null
}) {
  const normReason = normalizeTurnText(reason);
  const normAnon = anonKey ? normalizeTurnText(anonKey) : null;
  const numPid = pid != null ? Number(pid) : null;
  const numAppId = appointmentId != null ? Number(appointmentId) : null;
  const numOrderId = orderAppointmentId != null ? Number(orderAppointmentId) : null;
  const normOrderRef = orderReference ? normalizeTurnText(orderReference) : null;

  const found = turns.find(t => {
    if (excludeTurnId && t.id === excludeTurnId) return false;
    if (t.area !== area) return false;
    if (!ACTIVE_TURN_STATES.includes(t.state)) return false;

    let sameIdentity = false;
    if (numPid != null && t.pid != null) {
      sameIdentity = Number(t.pid) === numPid;
    } else if (numPid == null && t.pid == null && normAnon && t.anonKey) {
      sameIdentity = normalizeTurnText(t.anonKey) === normAnon;
    }
    if (!sameIdentity) return false;

    const sameOrderId = numOrderId != null && t.orderAppointmentId != null && Number(t.orderAppointmentId) === numOrderId;
    const sameOrderRef = Boolean(normOrderRef && t.orderReference && normalizeTurnText(t.orderReference) === normOrderRef);
    const sameOrder = sameOrderId || sameOrderRef;

    const tAppId = t.appointmentId != null ? Number(t.appointmentId) : null;
    const sameApp = numAppId != null && tAppId != null && numAppId === tAppId;

    if (normReason && normalizeTurnText(t.reason) === normReason) {
      if (numAppId != null && tAppId != null && numAppId !== tAppId) return false;
      if (numOrderId != null && t.orderAppointmentId != null && Number(t.orderAppointmentId) !== numOrderId) return false;
      return true;
    }

    if ((area === 'C' || isTransfer) && sameOrder) return true;
    if (isTransfer && sameApp) return true;

    return false;
  });

  return found ? getTurnById(found.id) : null;
}

export function verifyQueueInvariants() {
  const issues = [];
  const occupiedMap = new Map();

  for (const t of turns) {
    if (['Llamado', 'En atención'].includes(t.state)) {
      if (!t.counter || !QUEUE_AREAS[t.area]?.counters.includes(t.counter)) {
        issues.push(`Turno ${t.code} en estado ${t.state} sin ventanilla válida (${t.counter}).`);
      } else {
        const key = `${t.area}::${t.counter}`;
        if (occupiedMap.has(key)) {
          issues.push(`Ventanilla ${t.counter} tiene múltiples turnos activos: ${occupiedMap.get(key)} y ${t.code}.`);
        } else {
          occupiedMap.set(key, t.code);
        }
      }
    }
    if (ACTIVE_TURN_STATES.includes(t.state)) {
      const dup = findDuplicateActiveTurn({
        pid: t.pid,
        anonKey: t.pid == null ? t.anonKey : null,
        area: t.area,
        reason: t.reason,
        appointmentId: t.appointmentId,
        orderAppointmentId: t.orderAppointmentId,
        orderReference: t.orderReference,
        excludeTurnId: t.id
      });
      if (dup) {
        issues.push(`Duplicado activo detectado en cola ${t.area}: ${t.code} y ${dup.code}.`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function _createTurnTicketCore({
  area,
  reason,
  pid = null,
  patientName = null,
  docMasked = null,
  anonKey = null,
  documentNumber = null,
  appointmentId = null,
  orderAppointmentId = null,
  orderReference = null,
  actor = 'Autoservicio',
  originTicketId = null,
  originNote = ''
}) {
  if (!QUEUE_AREAS[area]) {
    return { ok: false, error: 'Área de destino inválida.' };
  }
  const validReasons = TURN_REASONS[area];
  const cleanReason = String(reason || '').trim();
  if (!validReasons.includes(cleanReason)) {
    return { ok: false, error: 'Selecciona un motivo válido para el área elegida.' };
  }

  let resolvedAnonKey = anonKey;
  if (!resolvedAnonKey && pid == null && documentNumber) {
    resolvedAnonKey = buildTemporaryDocumentKey(documentNumber);
  }

  const hasExplicitAnon = Boolean(resolvedAnonKey && String(resolvedAnonKey).trim());
  const effectiveAnonKey = pid == null
    ? (hasExplicitAnon ? String(resolvedAnonKey).trim() : `ANON-${anonAutoSeq++}`)
    : null;

  if (pid != null || hasExplicitAnon) {
    const duplicate = findDuplicateActiveTurn({
      pid,
      anonKey: pid == null ? effectiveAnonKey : null,
      area,
      reason: cleanReason,
      appointmentId,
      orderAppointmentId,
      orderReference,
      isTransfer: Boolean(originTicketId)
    });
    if (duplicate) {
      return {
        ok: false,
        duplicate: true,
        existingTurn: duplicate,
        error: originTicketId
          ? `El paciente ya tiene el turno ${duplicate.code} activo en ${QUEUE_AREAS[area].shortLabel} para esta atención.`
          : `Ya tiene el turno ${duplicate.code} activo. Puede volver a imprimirlo sin perder su posición en la cola.`
      };
    }
  }

  const aheadCount = getAheadCount(area);
  seqCounters[area] += 1;
  const code = `${area}-${String(seqCounters[area]).padStart(3, '0')}`;
  const createdAt = nextDemoTimestamp();
  const displayPatientLabel = pid != null
    ? (patientName || `Paciente #${pid}`)
    : 'Visitante sin identificación';

  const turn = {
    id: code,
    code,
    area,
    state: 'En espera',
    reason: cleanReason,
    pid: pid != null ? Number(pid) : null,
    patientLabel: displayPatientLabel,
    docMasked: docMasked || (pid != null ? '••••0000' : 'Sin DNI'),
    anonKey: effectiveAnonKey,
    appointmentId: appointmentId != null ? Number(appointmentId) : null,
    orderAppointmentId: orderAppointmentId != null ? Number(orderAppointmentId) : null,
    orderReference: orderReference || (orderAppointmentId != null ? `OP-${String(orderAppointmentId).padStart(4, '0')}` : null),
    arrivalValidated: false,
    counter: null,
    createdAt,
    calledAt: null,
    startedAt: null,
    closedAt: null,
    waitMinutes: 0,
    attentionMinutes: 0,
    originTicketId: originTicketId || null,
    linkedTicketId: null,
    history: [
      {
        timestamp: createdAt,
        fromState: null,
        toState: 'En espera',
        user: actor,
        area,
        counter: originTicketId ? `Transferido desde ${originTicketId}` : 'Autoservicio',
        reason: originNote || cleanReason + (orderReference ? ` (${orderReference})` : '')
      }
    ]
  };

  turns.push(turn);

  return {
    ok: true,
    turn: { ...turn, history: turn.history.map(h => ({ ...h })) },
    aheadCount,
    displayMessage: 'Espere a que su código aparezca en pantalla'
  };
}

export function createTurnTicket(params) {
  return commitSharedTurnMutation(
    'create',
    () => _createTurnTicketCore(params),
    (res, at) => ({
      type: 'create',
      code: res.turn?.code || null,
      area: res.turn?.area || null,
      counter: null,
      at
    })
  );
}

export function assertQueuePermission(role, area, action = 'operate') {
  if (role === 'admin') {
    return {
      ok: false,
      error: 'El rol Administrador solo supervisa colas y no puede operar ventanillas ni registrar cobros desde Turnos.'
    };
  }
  if (role === 'medico' || role === 'tecnico' || !['recepcion', 'caja'].includes(role)) {
    return {
      ok: false,
      error: 'Tu rol no tiene permisos para abrir ni operar colas presenciales.'
    };
  }
  if (role === 'recepcion' && area !== 'R') {
    return {
      ok: false,
      error: 'Recepción solo puede ver y operar la cola R. Caja se gestiona exclusivamente desde su panel.'
    };
  }
  if (role === 'caja' && area !== 'C') {
    return {
      ok: false,
      error: 'Caja solo puede ver y operar la cola C. Recepción se gestiona exclusivamente desde Admisión.'
    };
  }
  return { ok: true, action };
}

export function callNextTurn({ area, role, operatorName = 'Operador', counterName = null }) {
  return commitSharedTurnMutation('call', () => {
    const perm = assertQueuePermission(role, area, 'call_next');
    if (!perm.ok) return perm;

    const chosenCounter = counterName || getSelectedCounter(role);
    if (!chosenCounter || !QUEUE_AREAS[area].counters.includes(chosenCounter)) {
      return { ok: false, error: 'Selecciona una ventanilla válida antes de llamar un turno.' };
    }

    const occupied = turns.find(
      t => t.area === area && t.counter === chosenCounter && ['Llamado', 'En atención'].includes(t.state)
    );
    if (occupied) {
      return {
        ok: false,
        busy: true,
        occupiedCounter: chosenCounter,
        activeTurn: getTurnById(occupied.id),
        existingTurn: getTurnById(occupied.id),
        error: `La ventanilla ${chosenCounter} ya tiene el turno ${occupied.code} activo. Finalízalo, transfiérelo o márcalo como ausente antes de llamar al siguiente.`
      };
    }

    const nextWaiting = turns.find(t => t.area === area && t.state === 'En espera');
    if (!nextWaiting) {
      return { ok: false, empty: true, error: `No hay turnos en espera en la cola ${area}.` };
    }

    panelUiAlert = null;
    const ts = nextDemoTimestamp();
    const prevState = nextWaiting.state;
    nextWaiting.state = 'Llamado';
    nextWaiting.counter = chosenCounter;
    nextWaiting.calledAt = ts;
    callSequence += 1;
    nextWaiting._callOrder = callSequence;
    const createdMin = parseStampMinutes(nextWaiting.createdAt);
    const calledMin = parseStampMinutes(ts);
    if (createdMin != null && calledMin != null && calledMin >= createdMin) {
      nextWaiting.waitMinutes = calledMin - createdMin;
    }
    nextWaiting.history.push({
      timestamp: ts,
      fromState: prevState,
      toState: 'Llamado',
      user: operatorName,
      area,
      counter: chosenCounter,
      reason: `Llamado a ${chosenCounter}`
    });

    return { ok: true, turn: getTurnById(nextWaiting.id) };
  }, (res, at) => ({
    type: 'call',
    code: res.turn?.code || null,
    area: res.turn?.area || null,
    counter: res.turn?.counter || null,
    callOrder: res.turn?._callOrder || callSequence,
    at
  }));
}

export function recallTurn(turnId, { role, operatorName = 'Operador', counterName = null }) {
  return commitSharedTurnMutation('recall', () => {
    const turn = findTurnMutable(turnId);
    if (!turn) return { ok: false, error: 'Turno no encontrado.' };
    const perm = assertQueuePermission(role, turn.area, 'recall');
    if (!perm.ok) return perm;
    if (turn.state !== 'Llamado') {
      return { ok: false, error: 'Solo se puede volver a llamar un turno en estado Llamado.' };
    }
    const activeCounter = counterName || turn.counter || getSelectedCounter(role);
    if (!QUEUE_AREAS[turn.area].counters.includes(activeCounter)) {
      return { ok: false, error: 'Ventanilla no válida para el re-llamado.' };
    }
    const occupiedByOther = turns.find(
      t => t.id !== turn.id && t.area === turn.area && t.counter === activeCounter && ['Llamado', 'En atención'].includes(t.state)
    );
    if (occupiedByOther) {
      return {
        ok: false,
        busy: true,
        occupiedCounter: activeCounter,
        activeTurn: getTurnById(occupiedByOther.id),
        existingTurn: getTurnById(occupiedByOther.id),
        error: `La ventanilla ${activeCounter} ya tiene el turno ${occupiedByOther.code} activo. Finalízalo, transfiérelo o márcalo como ausente antes de atender otro turno.`
      };
    }
    panelUiAlert = null;
    const ts = nextDemoTimestamp();
    turn.counter = activeCounter;
    turn.calledAt = ts;
    callSequence += 1;
    turn._callOrder = callSequence;
    turn.history.push({
      timestamp: ts,
      fromState: 'Llamado',
      toState: 'Llamado',
      user: operatorName,
      area: turn.area,
      counter: activeCounter,
      reason: `Re-llamado en pantalla hacia ${activeCounter}`
    });
    return { ok: true, turn: getTurnById(turn.id) };
  }, (res, at) => ({
    type: 'recall',
    code: res.turn?.code || null,
    area: res.turn?.area || null,
    counter: res.turn?.counter || null,
    callOrder: res.turn?._callOrder || callSequence,
    at
  }));
}

export function startTurnAttention(turnId, { role, operatorName = 'Operador', counterName = null }) {
  return commitSharedTurnMutation('start', () => {
    const turn = findTurnMutable(turnId);
    if (!turn) return { ok: false, error: 'Turno no encontrado.' };
    const perm = assertQueuePermission(role, turn.area, 'start');
    if (!perm.ok) return perm;
    if (turn.state !== 'Llamado') {
      return { ok: false, error: 'El turno debe estar en estado Llamado para iniciar atención.' };
    }
    const activeCounter = turn.counter || counterName || getSelectedCounter(role);
    if (!QUEUE_AREAS[turn.area].counters.includes(activeCounter)) {
      return { ok: false, error: 'Ventanilla no válida para iniciar atención.' };
    }
    const occupiedByOther = turns.find(
      t => t.id !== turn.id && t.area === turn.area && t.counter === activeCounter && ['Llamado', 'En atención'].includes(t.state)
    );
    if (occupiedByOther) {
      return {
        ok: false,
        busy: true,
        occupiedCounter: activeCounter,
        activeTurn: getTurnById(occupiedByOther.id),
        existingTurn: getTurnById(occupiedByOther.id),
        error: `La ventanilla ${activeCounter} ya tiene el turno ${occupiedByOther.code} activo. Finalízalo, transfiérelo o márcalo como ausente antes de atender otro turno.`
      };
    }
    panelUiAlert = null;
    const ts = nextDemoTimestamp();
    turn.state = 'En atención';
    turn.counter = activeCounter;
    turn.startedAt = ts;
    turn.history.push({
      timestamp: ts,
      fromState: 'Llamado',
      toState: 'En atención',
      user: operatorName,
      area: turn.area,
      counter: activeCounter,
      reason: 'Inicio de atención en ventanilla'
    });
    return { ok: true, turn: getTurnById(turn.id) };
  }, (res, at) => ({
    type: 'start',
    code: res.turn?.code || null,
    area: res.turn?.area || null,
    counter: res.turn?.counter || null,
    at
  }));
}

export function finishTurnAttention(turnId, { role, operatorName = 'Operador', counterName = null, note = '' }) {
  return commitSharedTurnMutation('finish', () => {
    const turn = findTurnMutable(turnId);
    if (!turn) return { ok: false, error: 'Turno no encontrado.' };
    const perm = assertQueuePermission(role, turn.area, 'finish');
    if (!perm.ok) return perm;
    if (turn.state !== 'En atención') {
      return { ok: false, error: 'Solo se puede finalizar un turno que está En atención.' };
    }
    panelUiAlert = null;
    const activeCounter = turn.counter || counterName || getSelectedCounter(role);
    const ts = nextDemoTimestamp();
    turn.state = 'Finalizado';
    turn.closedAt = ts;
    const startMin = parseStampMinutes(turn.startedAt);
    const endMin = parseStampMinutes(ts);
    if (startMin != null && endMin != null && endMin >= startMin) {
      turn.attentionMinutes = endMin - startMin;
    }
    turn.history.push({
      timestamp: ts,
      fromState: 'En atención',
      toState: 'Finalizado',
      user: operatorName,
      area: turn.area,
      counter: activeCounter,
      reason: note || 'Atención finalizada'
    });
    return { ok: true, turn: getTurnById(turn.id) };
  }, (res, at) => ({
    type: 'finish',
    code: res.turn?.code || null,
    area: res.turn?.area || null,
    counter: res.turn?.counter || null,
    at
  }));
}

export function markTurnAbsent(turnId, { role, operatorName = 'Operador', counterName = null, reason = '' }) {
  return commitSharedTurnMutation('absent', () => {
    const turn = findTurnMutable(turnId);
    if (!turn) return { ok: false, error: 'Turno no encontrado.' };
    const perm = assertQueuePermission(role, turn.area, 'absent');
    if (!perm.ok) return perm;
    if (!['Llamado', 'En atención'].includes(turn.state)) {
      return { ok: false, error: 'Solo se puede marcar ausente un turno Llamado o En atención.' };
    }
    panelUiAlert = null;
    const activeCounter = turn.counter || counterName || getSelectedCounter(role);
    const prevState = turn.state;
    const ts = nextDemoTimestamp();
    turn.state = 'Ausente';
    turn.closedAt = ts;
    turn.history.push({
      timestamp: ts,
      fromState: prevState,
      toState: 'Ausente',
      user: operatorName,
      area: turn.area,
      counter: activeCounter,
      reason: reason || 'Paciente no se presentó tras llamado en ventanilla'
    });
    return { ok: true, turn: getTurnById(turn.id) };
  }, (res, at) => ({
    type: 'absent',
    code: res.turn?.code || null,
    area: res.turn?.area || null,
    counter: res.turn?.counter || null,
    at
  }));
}

export function transferTurn(turnId, {
  targetArea,
  role,
  operatorName = 'Operador',
  counterName = null,
  reason = ''
}) {
  return commitSharedTurnMutation('transfer', () => {
    const turn = findTurnMutable(turnId);
    if (!turn) return { ok: false, error: 'Turno no encontrado.' };
    const perm = assertQueuePermission(role, turn.area, 'transfer');
    if (!perm.ok) return perm;
    if (!['Llamado', 'En atención'].includes(turn.state)) {
      return { ok: false, error: 'Solo se puede transferir un turno Llamado o En atención.' };
    }

    const expectedTarget = turn.area === 'R' ? 'C' : 'R';
    if (targetArea !== expectedTarget) {
      return {
        ok: false,
        error: turn.area === 'R'
          ? 'Recepción solo puede transferir hacia Caja (cola C).'
          : 'Caja solo puede transferir hacia Recepción (cola R).'
      };
    }

    const targetReason = targetArea === 'C'
      ? 'Pagar una orden existente'
      : 'Consultar o registrar una cita';
    const targetOrderId = turn.orderAppointmentId || (targetArea === 'C' ? turn.appointmentId : null);
    const targetOrderRef = turn.orderReference || (targetOrderId ? `OP-${String(targetOrderId).padStart(4, '0')}` : null);

    if (turn.pid != null || turn.anonKey) {
      const duplicate = findDuplicateActiveTurn({
        pid: turn.pid,
        anonKey: turn.pid == null ? turn.anonKey : null,
        area: targetArea,
        reason: targetReason,
        appointmentId: turn.appointmentId || turn.orderAppointmentId,
        orderAppointmentId: targetOrderId,
        orderReference: targetOrderRef,
        isTransfer: true
      });
      if (duplicate) {
        return {
          ok: false,
          duplicate: true,
          existingTurn: duplicate,
          error: `El paciente ya tiene el turno ${duplicate.code} activo en ${QUEUE_AREAS[targetArea].shortLabel} para esta atención.`
        };
      }
    }

    const activeCounter = turn.counter || counterName || getSelectedCounter(role);
    const cleanReason = String(reason || '').trim() || (
      targetArea === 'C'
        ? 'Pase a Caja para pago de orden vinculada'
        : 'Derivado a Recepción para gestión de cita o datos'
    );

    const created = _createTurnTicketCore({
      area: targetArea,
      reason: targetReason,
      pid: turn.pid,
      patientName: turn.patientLabel,
      docMasked: turn.docMasked,
      anonKey: turn.pid == null ? turn.anonKey : null,
      appointmentId: turn.appointmentId,
      orderAppointmentId: targetOrderId,
      orderReference: targetOrderRef,
      actor: operatorName,
      originTicketId: turn.code,
      originNote: `Transferido desde ${turn.code}: ${cleanReason}`
    });

    if (!created.ok) return created;

    panelUiAlert = null;
    const prevState = turn.state;
    const ts = nextDemoTimestamp();
    if (prevState === 'En atención') {
      const startMin = parseStampMinutes(turn.startedAt);
      const endMin = parseStampMinutes(ts);
      if (startMin != null && endMin != null && endMin >= startMin) {
        turn.attentionMinutes = endMin - startMin;
      }
    }

    turn.state = 'Transferido';
    turn.closedAt = ts;
    turn.linkedTicketId = created.turn.code;
    turn.history.push({
      timestamp: ts,
      fromState: prevState,
      toState: 'Transferido',
      user: operatorName,
      area: turn.area,
      counter: activeCounter,
      reason: `${cleanReason} · Nuevo ticket ${created.turn.code}`
    });

    return {
      ok: true,
      originTurn: getTurnById(turn.id),
      targetTurn: created.turn
    };
  }, (res, at) => ({
    type: 'transfer',
    code: res.targetTurn?.code || res.originTurn?.code || null,
    area: res.targetTurn?.area || null,
    counter: res.originTurn?.counter || null,
    at
  }));
}

export function confirmArrivalFromTurn(turnId, {
  role,
  operatorName = 'Recepción',
  appointments = [],
  onStatusChange = null
}) {
  return commitSharedTurnMutation('validate_arrival', () => {
    const turn = findTurnMutable(turnId);
    if (!turn) return { ok: false, error: 'Turno no encontrado.' };
    const perm = assertQueuePermission(role, turn.area, 'validate_arrival');
    if (!perm.ok) return perm;
    if (turn.area !== 'R') {
      return { ok: false, error: 'Solo Recepción puede validar llegada de citas.' };
    }
    if (turn.state !== 'En atención') {
      return { ok: false, error: 'Inicia la atención del turno antes de validar la llegada de la cita.' };
    }
    if (!turn.appointmentId) {
      return { ok: false, error: 'Este turno no tiene una cita vinculada para actualizar.' };
    }
    const app = appointments.find(a => a.id === Number(turn.appointmentId));
    if (!app) {
      return { ok: false, error: 'No se encontró la cita vinculada en la agenda.' };
    }
    if (app.status === 'Cancelada') {
      return { ok: false, error: 'La cita vinculada figura como Cancelada y no puede pasar a Llegó.' };
    }
    const prevAppStatus = app.status;
    if (['Programada', 'Confirmada'].includes(app.status)) {
      app.status = 'Llegó';
    }
    turn.arrivalValidated = true;
    const ts = nextDemoTimestamp();
    turn.history.push({
      timestamp: ts,
      fromState: turn.state,
      toState: turn.state,
      user: operatorName,
      area: 'R',
      counter: turn.counter || getSelectedCounter('recepcion'),
      reason: prevAppStatus === 'Llegó'
        ? `Cita #${app.id} verificada (ya en estado Llegó)`
        : `Validación de llegada: cita #${app.id} pasó de ${prevAppStatus} a Llegó`
    });
    if (typeof onStatusChange === 'function') {
      onStatusChange(app, prevAppStatus);
    }
    return {
      ok: true,
      appointmentStatus: app.status,
      previousStatus: prevAppStatus,
      turn: getTurnById(turn.id)
    };
  }, (res, at) => ({
    type: 'validate_arrival',
    code: res.turn?.code || null,
    area: res.turn?.area || 'R',
    counter: res.turn?.counter || null,
    at
  }));
}

export function completeTurnAfterPayment(appointmentId, { operatorName = 'Caja' } = {}) {
  const numericId = Number(appointmentId);
  if (!numericId) return { ok: false, skipped: true };
  return commitSharedTurnMutation('finish_payment', () => {
    const candidate = turns.find(t =>
      t.area === 'C' &&
      ['En atención', 'Llamado'].includes(t.state) &&
      (Number(t.orderAppointmentId) === numericId || Number(t.appointmentId) === numericId)
    );
    if (!candidate) return { ok: false, skipped: true };

    const activeCounter = candidate.counter || getSelectedCounter('caja');
    if (candidate.state === 'Llamado') {
      const startTs = nextDemoTimestamp();
      candidate.state = 'En atención';
      candidate.startedAt = startTs;
      candidate.history.push({
        timestamp: startTs,
        fromState: 'Llamado',
        toState: 'En atención',
        user: operatorName,
        area: 'C',
        counter: activeCounter,
        reason: 'Apertura de cobro desde Caja'
      });
    }

    panelUiAlert = null;
    const endTs = nextDemoTimestamp();
    candidate.state = 'Finalizado';
    candidate.closedAt = endTs;
    const startMin = parseStampMinutes(candidate.startedAt);
    const endMin = parseStampMinutes(endTs);
    if (startMin != null && endMin != null && endMin >= startMin) {
      candidate.attentionMinutes = endMin - startMin;
    }
    candidate.history.push({
      timestamp: endTs,
      fromState: 'En atención',
      toState: 'Finalizado',
      user: operatorName,
      area: 'C',
      counter: activeCounter,
      reason: `Cobro registrado para OP-${String(numericId).padStart(4, '0')} y turno finalizado`
    });

    return { ok: true, turn: getTurnById(candidate.id) };
  }, (res, at) => ({
    type: 'finish',
    code: res.turn?.code || null,
    area: res.turn?.area || 'C',
    counter: res.turn?.counter || null,
    at
  }));
}

function extractStampTime(ts) {
  if (!ts) return '—';
  const str = String(ts).trim();
  const hmMatch = str.match(/(?:^|\s)(\d{2}:\d{2})(?::\d{2})?$/);
  if (hmMatch) return hmMatch[1];
  const isoMatch = str.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];
  return str;
}

export function getPublicTurnProjection() {
  const sortCalls = (a, b) =>
    (Number(b._callOrder || 0) - Number(a._callOrder || 0)) ||
    String(b.calledAt || '').localeCompare(String(a.calledAt || ''));

  const sortRecent = (a, b) =>
    (Number(b._callOrder || 0) - Number(a._callOrder || 0)) ||
    String(b.closedAt || b.calledAt || '').localeCompare(String(a.closedAt || a.calledAt || ''));

  const sanitizePublicCall = (t, allowNewBadge = false) => {
    const resolvedCounter = t.counter || QUEUE_AREAS[t.area].counters[0];
    const isNewCall = Boolean(
      allowNewBadge &&
      t.state === 'Llamado' &&
      lastSharedEvent &&
      ['call', 'recall'].includes(lastSharedEvent.type) &&
      lastSharedEvent.code === t.code
    );
    return {
      code: t.code,
      area: t.area,
      areaLabel: QUEUE_AREAS[t.area].shortLabel,
      areaFullLabel: QUEUE_AREAS[t.area].label,
      counter: resolvedCounter,
      state: t.state,
      calledAt: t.calledAt || t.createdAt,
      calledTime: extractStampTime(t.calledAt || t.createdAt),
      callOrder: Number(t._callOrder || 0),
      instruction: `Diríjase a ${resolvedCounter}`,
      isNewCall
    };
  };

  const activeCalls = turns
    .filter(t => ['Llamado', 'En atención'].includes(t.state))
    .sort(sortCalls)
    .map(t => sanitizePublicCall(t, true));

  const activeR = activeCalls.filter(c => c.area === 'R');
  const activeC = activeCalls.filter(c => c.area === 'C');

  const recentCalls = turns
    .filter(t => Boolean(t.calledAt) && ['Finalizado', 'Transferido', 'Ausente'].includes(t.state))
    .sort(sortRecent)
    .slice(0, 6)
    .map(t => sanitizePublicCall(t, false));

  const buildWaitingQueue = area => {
    const waiting = turns.filter(t => t.area === area && t.state === 'En espera');
    const totalWaiting = waiting.length;
    const visibleCodes = waiting.slice(0, 6).map(t => ({
      code: t.code,
      area: t.area,
      areaLabel: QUEUE_AREAS[t.area].shortLabel,
      state: t.state
    }));
    const overflowCount = Math.max(0, totalWaiting - 6);
    const overflowLabel = overflowCount === 0
      ? ''
      : (overflowCount === 1 ? '1 turno adicional' : `${overflowCount} turnos adicionales`);
    return {
      area,
      areaLabel: QUEUE_AREAS[area].shortLabel,
      visibleCodes,
      totalWaiting,
      overflowCount,
      overflowLabel
    };
  };

  const waitingQueues = {
    R: buildWaitingQueue('R'),
    C: buildWaitingQueue('C')
  };

  const activeCountersCount = new Set(activeCalls.map(c => `${c.area}::${c.counter}`)).size;

  return {
    activeCalls,
    currentByArea: {
      R: activeR,
      C: activeC
    },
    primaryByArea: {
      R: activeR[0] || null,
      C: activeC[0] || null
    },
    recentCalls,
    waitingQueues,
    waitingSummary: {
      R: waitingQueues.R.totalWaiting,
      C: waitingQueues.C.totalWaiting,
      total: waitingQueues.R.totalWaiting + waitingQueues.C.totalWaiting
    },
    activeCountersCount,
    revision: sharedRevision,
    updatedAt: sharedUpdatedAt,
    lastEvent: sanitizeSharedEvent(lastSharedEvent)
  };
}

export function getPublicDisplayData() {
  return getPublicTurnProjection();
}

export function getTurnMetrics() {
  const byArea = area => {
    const list = turns.filter(t => t.area === area);
    const waitList = list.filter(t => t.calledAt != null);
    const attList = list.filter(t => t.state === 'Finalizado' || t.attentionMinutes > 0);
    const avgWait = waitList.length
      ? Math.round(waitList.reduce((acc, t) => acc + Number(t.waitMinutes || 0), 0) / waitList.length)
      : 0;
    const avgAtt = attList.length
      ? Math.round(attList.reduce((acc, t) => acc + Number(t.attentionMinutes || 0), 0) / attList.length)
      : 0;
    return {
      total: list.length,
      waiting: list.filter(t => t.state === 'En espera').length,
      called: list.filter(t => t.state === 'Llamado').length,
      inAttention: list.filter(t => t.state === 'En atención').length,
      finished: list.filter(t => t.state === 'Finalizado').length,
      absent: list.filter(t => t.state === 'Ausente').length,
      transferred: list.filter(t => t.state === 'Transferido').length,
      avgWaitMinutes: avgWait,
      avgAttentionMinutes: avgAtt
    };
  };
  return {
    total: turns.length,
    R: byArea('R'),
    C: byArea('C')
  };
}

function renderStateBadge(state) {
  const map = {
    'En espera': { cls: 'turn-state-espera', icon: '◷' },
    'Llamado': { cls: 'turn-state-llamado', icon: '◈' },
    'En atención': { cls: 'turn-state-atencion', icon: '▶' },
    'Finalizado': { cls: 'turn-state-finalizado', icon: '✓' },
    'Ausente': { cls: 'turn-state-ausente', icon: '✕' },
    'Transferido': { cls: 'turn-state-transferido', icon: '⇄' }
  };
  const cfg = map[state] || { cls: 'turn-state-espera', icon: '•' };
  return `<span class="turn-state-badge ${cfg.cls}"><span aria-hidden="true">${cfg.icon}</span><span>${escHtml(state)}</span></span>`;
}

function openTurnHistoryModal(turn, openModalFn) {
  if (!turn || typeof openModalFn !== 'function') return;
  const rows = turn.history.map(h => `
    <div class="turn-history-item">
      <div class="turn-history-head">
        <strong>${escHtml(h.fromState ? `${h.fromState} → ${h.toState}` : `Emitido (${h.toState})`)}</strong>
        <span class="tnum">${escHtml(h.timestamp)}</span>
      </div>
      <div class="turn-history-meta">
        <span>Área: <b>${escHtml(QUEUE_AREAS[h.area]?.shortLabel || h.area)}</b></span>
        <span>Ventanilla: <b>${escHtml(h.counter || '—')}</b></span>
        <span>Usuario: <b>${escHtml(h.user || 'Sistema')}</b></span>
      </div>
      ${h.reason ? `<p class="turn-history-reason">${escHtml(h.reason)}</p>` : ''}
    </div>
  `).join('');

  const linkLine = turn.originTicketId
    ? `<div class="note">Derivado desde ticket origen <b>${escHtml(turn.originTicketId)}</b>.</div>`
    : turn.linkedTicketId
      ? `<div class="note">Transferido hacia nuevo ticket <b>${escHtml(turn.linkedTicketId)}</b>.</div>`
      : '';

  openModalFn(
    `Historial completo · Turno ${escHtml(turn.code)}`,
    `
      <div class="turn-audit-summary">
        <div><small>Paciente</small><strong>${escHtml(turn.patientLabel)} (${escHtml(turn.docMasked)})</strong></div>
        <div><small>Estado actual</small><div>${renderStateBadge(turn.state)}</div></div>
        <div><small>Motivo</small><strong>${escHtml(turn.reason)}</strong></div>
        <div><small>Vínculos</small><strong>${turn.appointmentId ? `Cita #${turn.appointmentId}` : 'Sin cita'} · ${turn.orderReference ? escHtml(turn.orderReference) : 'Sin orden'}</strong></div>
      </div>
      ${linkLine}
      <div class="turn-history-list">${rows}</div>
    `,
    `<button class="primary" id="done">Cerrar historial</button>`,
    true
  );
}

// ==========================================
// 1. PUNTO DE AUTOSERVICIO (#autoservicio)
// ==========================================
function renderDniSlots(dni) {
  const digits = String(dni || '');
  let html = '';
  for (let i = 0; i < 8; i++) {
    const digit = digits[i] || '';
    html += `<span class="kiosk-digit-slot ${digit ? 'is-filled' : ''}">${digit ? escHtml(digit) : '·'}</span>`;
  }
  return html;
}

function getKioskPrintMessage(state) {
  if (state === 'requesting') {
    return 'Estamos preparando su ticket. Espere un momento.';
  }
  if (state === 'requested') {
    return 'Se abrió la impresión. Si el ticket fue impreso, retírelo y espere a que su código aparezca en pantalla.';
  }
  if (state === 'error') {
    return 'Su turno fue registrado, pero no se pudo iniciar la impresión. Solicite ayuda al personal.';
  }
  return 'Puede solicitar la impresión de su ticket o conservar su código en pantalla.';
}

function getKioskWaitMessage(state) {
  if (state === 'requesting') {
    return 'Su código de turno se muestra arriba. Espere un momento.';
  }
  if (state === 'requested') {
    return 'Espere a que su código aparezca en pantalla.';
  }
  if (state === 'error') {
    return 'Su turno sigue activo con el código mostrado en pantalla.';
  }
  return 'Su turno sigue activo en la cola. Puede reimprimirlo o finalizar.';
}

export function renderKioskView(container, ctx) {
  hydrateTurnStateFromSharedStorage();
  const { patients, appointments, today, clearNotice } = ctx;
  if (Array.isArray(patients) && patients.length) registerTurnosPatientDirectory(patients);
  if (typeof clearNotice === 'function') clearNotice();
  if (typeof window !== 'undefined' && typeof window.__clearPublicNotice === 'function') {
    window.__clearPublicNotice();
  }
  const generated = kioskUiState.generatedResult;
  const dupTurn = kioskUiState.duplicateExisting;
  const printTurn = generated ? generated.turn : dupTurn;
  const printAheadCount = generated
    ? generated.aheadCount
    : (dupTurn ? getAheadCountForTurn(dupTurn) : 0);

  function scheduleInactivityReset() {
    if (kioskUiState.inactivityTimer) {
      clearTimeout(kioskUiState.inactivityTimer);
    }
    kioskUiState.inactivityTimer = setTimeout(() => {
      resetKioskState();
      renderKioskView(container, ctx);
    }, 60000);
  }

  function scheduleAutoReset() {
    if (kioskUiState.autoResetTimer) {
      clearTimeout(kioskUiState.autoResetTimer);
    }
    kioskUiState.autoResetTimer = setTimeout(() => {
      resetKioskState();
      renderKioskView(container, ctx);
    }, 12000);
  }

  scheduleInactivityReset();

  const areaLabel = kioskUiState.selectedArea === 'R'
    ? 'Recepción / Admisión'
    : kioskUiState.selectedArea === 'C'
      ? 'Caja / Pagos'
      : '';

  const printBoxClass = kioskUiState.printState === 'error'
    ? 'is-error'
    : kioskUiState.printState === 'requesting'
      ? 'is-requesting'
      : kioskUiState.printState === 'requested'
        ? 'is-requested'
        : '';

  const printIcon = kioskUiState.printState === 'error'
    ? '⚠️'
    : (kioskUiState.printState === 'requesting' ? '⏳' : '🖨️');

  const isInitialMount = !container.querySelector('#kiosk-terminal-app');
  const prevStep = isInitialMount ? 0 : Number(container.dataset?.kioskRenderedStep || 0);
  const currentStep = Number(kioskUiState.step || 1);

  let direction = null;
  if (prevStep !== 0 && prevStep !== currentStep) {
    if (
      (prevStep === 1 && currentStep === 2) ||
      (prevStep === 2 && currentStep === 3) ||
      (prevStep === 3 && currentStep === 4)
    ) {
      direction = 'forward';
    } else if (
      (prevStep === 3 && currentStep === 2) ||
      (prevStep === 2 && currentStep === 1)
    ) {
      direction = 'backward';
    } else if (prevStep === 4 && currentStep === 1) {
      direction = 'reset';
    } else {
      direction = 'reset';
    }
  }

  container.innerHTML = `
    <div class="public-screen-shell kiosk-shell" id="kiosk-terminal-app">
      <header class="kiosk-terminal-header">
        <div class="kiosk-terminal-brand">
          <span class="eye" aria-hidden="true"></span>
          <span class="kiosk-brand-title">Clínica Oftalmológica</span>
        </div>
        <nav class="kiosk-progress-bar" aria-label="Progreso del turno">
          <ol class="kiosk-progress-list">
            <li class="kiosk-progress-item ${kioskUiState.step === 1 ? 'is-active' : (kioskUiState.step > 1 ? 'is-completed' : '')}" ${kioskUiState.step === 1 ? 'aria-current="step"' : ''}>
              <span class="kiosk-step-badge">1</span>
              <span class="kiosk-step-label">Documento</span>
            </li>
            <li class="kiosk-progress-arrow" aria-hidden="true">→</li>
            <li class="kiosk-progress-item ${kioskUiState.step === 2 ? 'is-active' : (kioskUiState.step > 2 ? 'is-completed' : '')}" ${kioskUiState.step === 2 ? 'aria-current="step"' : ''}>
              <span class="kiosk-step-badge">2</span>
              <span class="kiosk-step-label">Área</span>
            </li>
            <li class="kiosk-progress-arrow" aria-hidden="true">→</li>
            <li class="kiosk-progress-item ${kioskUiState.step >= 3 ? 'is-active' : ''}" ${kioskUiState.step >= 3 ? 'aria-current="step"' : ''}>
              <span class="kiosk-step-badge">3</span>
              <span class="kiosk-step-label">Ticket</span>
            </li>
          </ol>
        </nav>
      </header>

      <main class="kiosk-main-content">
        ${kioskUiState.step === 1 ? `
          <section class="kiosk-step-view kiosk-step-document" aria-labelledby="kiosk-step1-title">
            <div class="kiosk-doc-panel">
              <div class="kiosk-doc-left">
                <h1 id="kiosk-step1-title" class="kiosk-hero-title">Bienvenido</h1>
                <p class="kiosk-instruction-text">Ingrese su número de documento</p>

                <div class="kiosk-doc-display-box" id="kiosk-dni-display" aria-live="polite">
                  ${renderDniSlots(kioskUiState.dni)}
                </div>

                <input
                  id="kiosk-dni-input"
                  type="text"
                  inputmode="numeric"
                  maxlength="8"
                  pattern="[0-9]*"
                  autocomplete="off"
                  class="kiosk-accessible-input"
                  value="${escHtml(kioskUiState.dni)}"
                  aria-label="Número de documento de 8 dígitos"
                />

                <div class="kiosk-dni-counter" id="kiosk-dni-counter">
                  ${kioskUiState.dni.length} de 8 dígitos
                </div>

                ${kioskUiState.docError ? `
                  <div class="kiosk-error-alert" id="kiosk-doc-error" role="alert">
                    ${escHtml(kioskUiState.docError)}
                  </div>
                ` : ''}

                <div class="kiosk-tip-text">
                  Ingrese los 8 dígitos utilizando el teclado táctil en pantalla o su teclado físico. Si no cuenta con documento, elija continuar sin documento.
                </div>

                ${kioskUiState.anonymousLostHelp ? `
                  <div class="kiosk-anon-lost-alert" id="kiosk-anon-lost-alert" role="alert">
                    <p>No podemos recuperar automáticamente un turno emitido sin documento. Solicite ayuda al personal.</p>
                    <button type="button" id="kiosk-anon-lost-close-btn" class="secondary-btn kiosk-anon-lost-close">
                      Entendido
                    </button>
                  </div>
                ` : ''}
              </div>

              <div class="kiosk-doc-right">
                <div class="kiosk-keypad" role="group" aria-label="Teclado numérico táctil">
                  <button type="button" class="kiosk-key" data-digit="1" aria-label="1">1</button>
                  <button type="button" class="kiosk-key" data-digit="2" aria-label="2">2</button>
                  <button type="button" class="kiosk-key" data-digit="3" aria-label="3">3</button>

                  <button type="button" class="kiosk-key" data-digit="4" aria-label="4">4</button>
                  <button type="button" class="kiosk-key" data-digit="5" aria-label="5">5</button>
                  <button type="button" class="kiosk-key" data-digit="6" aria-label="6">6</button>

                  <button type="button" class="kiosk-key" data-digit="7" aria-label="7">7</button>
                  <button type="button" class="kiosk-key" data-digit="8" aria-label="8">8</button>
                  <button type="button" class="kiosk-key" data-digit="9" aria-label="9">9</button>

                  <button type="button" class="kiosk-key kiosk-key-action kiosk-key-clear" data-action="clear" id="kiosk-key-clear" aria-label="Borrar todo">Borrar</button>
                  <button type="button" class="kiosk-key" data-digit="0" aria-label="0">0</button>
                  <button type="button" class="kiosk-key kiosk-key-action kiosk-key-backspace" data-action="backspace" id="kiosk-key-backspace" aria-label="Corregir último dígito">Corregir</button>
                </div>

                <button
                  type="button"
                  id="kiosk-step1-continue-btn"
                  class="primary kiosk-primary-btn"
                  ${kioskUiState.dni.length === 8 ? '' : 'disabled'}
                  aria-label="Continuar a selección de área"
                >
                  Continuar
                </button>

                <div class="kiosk-alt-actions" role="group" aria-label="Opciones sin documento">
                  <button
                    type="button"
                    id="kiosk-continue-anonymous-btn"
                    class="secondary-btn kiosk-secondary-btn kiosk-anon-btn"
                  >
                    Continuar sin documento
                  </button>
                  <button
                    type="button"
                    id="kiosk-anon-lost-btn"
                    class="secondary-btn kiosk-secondary-btn kiosk-anon-lost-btn"
                  >
                    Perdí mi ticket sin documento
                  </button>
                </div>
              </div>
            </div>
          </section>
        ` : kioskUiState.step === 2 ? `
          <section class="kiosk-step-view kiosk-step-area" aria-labelledby="kiosk-step2-title">
            <div class="kiosk-section-head">
              <div class="kiosk-context-pill" id="kiosk-masked-doc-pill">
                ${kioskUiState.isAnonymous ? 'Identificación: Sin documento' : `Documento: ${escHtml(kioskUiState.maskedDni)}`}
              </div>
              <h1 id="kiosk-step2-title" class="kiosk-hero-title">Seleccione el área de atención</h1>
              <p class="kiosk-instruction-text">Toque la opción correspondiente a su visita</p>
            </div>

            <div class="kiosk-areas-grid" role="group" aria-label="Áreas de atención">
              <button
                type="button"
                class="kiosk-area-card"
                id="kiosk-area-R"
                data-select-area="R"
                aria-label="Recepción / Admisión. Genera ticket R"
              >
                <div class="kiosk-area-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                  </svg>
                </div>
                <div class="kiosk-area-text">
                  <h2 class="kiosk-area-name">Recepción / Admisión</h2>
                  <span class="kiosk-area-badge">Ticket R</span>
                </div>
              </button>

              <button
                type="button"
                class="kiosk-area-card"
                id="kiosk-area-C"
                data-select-area="C"
                aria-label="Caja / Pagos. Genera ticket C"
              >
                <div class="kiosk-area-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                </div>
                <div class="kiosk-area-text">
                  <h2 class="kiosk-area-name">Caja / Pagos</h2>
                  <span class="kiosk-area-badge">Ticket C</span>
                </div>
              </button>
            </div>

            <div class="kiosk-actions-footer">
              <button type="button" id="kiosk-step2-back-btn" class="secondary-btn kiosk-secondary-btn">
                ← Volver
              </button>
            </div>
          </section>
        ` : kioskUiState.step === 3 ? `
          <section class="kiosk-step-view kiosk-step-confirm" aria-labelledby="kiosk-step3-title">
            <div class="kiosk-section-head">
              <h1 id="kiosk-step3-title" class="kiosk-hero-title">Confirme su selección</h1>
              <p class="kiosk-instruction-text">Verifique la información antes de emitir su turno</p>
            </div>

            <div class="kiosk-summary-card">
              <div class="kiosk-summary-row">
                <span class="kiosk-summary-label">${kioskUiState.isAnonymous ? 'Identificación' : 'Documento'}</span>
                <span class="kiosk-summary-value tnum" id="kiosk-confirm-doc">${kioskUiState.isAnonymous ? 'Sin documento' : escHtml(kioskUiState.maskedDni)}</span>
              </div>
              <div class="kiosk-summary-row">
                <span class="kiosk-summary-label">Área elegida</span>
                <span class="kiosk-summary-value" id="kiosk-confirm-area">${escHtml(areaLabel)}</span>
              </div>
            </div>

            ${kioskUiState.isAnonymous ? `
              <p class="kiosk-anon-preserve-note" id="kiosk-anon-preserve-note">
                Conserve su ticket. Si lo pierde, solicite ayuda al personal para identificar su turno.
              </p>
            ` : ''}

            ${kioskUiState.genError ? `
              <div class="kiosk-error-alert" id="kiosk-gen-error" role="alert">
                ${escHtml(kioskUiState.genError)}
              </div>
            ` : ''}

            <div class="kiosk-confirm-actions">
              <button
                type="button"
                id="kiosk-confirm-ticket-btn"
                class="primary kiosk-primary-btn"
                ${kioskUiState.isSubmitting ? 'disabled' : ''}
              >
                ${kioskUiState.isSubmitting ? 'Emitiendo ticket…' : 'Obtener e imprimir ticket'}
              </button>
              <button
                type="button"
                id="kiosk-step3-back-btn"
                class="secondary-btn kiosk-secondary-btn"
                ${kioskUiState.isSubmitting ? 'disabled' : ''}
              >
                ← Volver
              </button>
            </div>
          </section>
        ` : dupTurn ? `
          <section class="kiosk-step-view kiosk-step-duplicate-stage" aria-labelledby="kiosk-dup-title">
            <div class="kiosk-ticket-visual is-duplicate" id="kiosk-ticket-card">
              <div class="kiosk-ticket-eyebrow" style="color:var(--amber, #b45309)">Turno activo existente</div>
              <h1 id="kiosk-dup-title" class="sr-only">Turno activo existente</h1>

              <div class="kiosk-ticket-code" id="kiosk-ticket-code">${escHtml(dupTurn.code)}</div>
              <div class="kiosk-ticket-area" id="kiosk-ticket-area">${escHtml(areaLabel)}</div>

              <div class="kiosk-duplicate-alert" id="kiosk-duplicate-alert" role="alert">
                <strong>Ya tiene un turno activo</strong>
                <p id="kiosk-duplicate-msg">
                  ${escHtml(kioskUiState.duplicateError || `Ya tiene el turno ${dupTurn.code} activo. Puede volver a imprimirlo sin perder su posición en la cola.`)}
                </p>
              </div>

              <p class="kiosk-ticket-wait-msg ${kioskUiState.printState === 'error' ? 'is-error' : ''}" id="kiosk-ticket-message">
                ${escHtml(getKioskWaitMessage(kioskUiState.printState))}
              </p>

              <dl class="kiosk-ticket-meta">
                <div>
                  <dt>Hora de emisión</dt>
                  <dd class="tnum" id="kiosk-ticket-time">${escHtml((dupTurn.createdAt || '').split(' ')[1] || dupTurn.createdAt)}</dd>
                </div>
                <div>
                  <dt>Personas por delante</dt>
                  <dd class="tnum" id="kiosk-ahead-count">${getAheadCountForTurn(dupTurn)}</dd>
                </div>
              </dl>

              <div class="kiosk-print-status-box ${printBoxClass}" id="kiosk-print-status-box" role="status" aria-live="polite" ${kioskUiState.printState === 'idle' ? 'hidden' : ''}>
                <span class="kiosk-print-status-icon" id="kiosk-print-status-icon" aria-hidden="true">${printIcon}</span>
                <span id="kiosk-print-status-text">${escHtml(getKioskPrintMessage(kioskUiState.printState))}</span>
              </div>

              <div class="kiosk-ticket-actions">
                <button type="button" id="kiosk-reprint-existing-btn" class="primary kiosk-primary-btn" ${kioskUiState.printState === 'requesting' ? 'disabled' : ''}>
                  Reimprimir ticket existente
                </button>
                <button type="button" id="kiosk-finish-btn" class="secondary-btn kiosk-secondary-btn">
                  Finalizar
                </button>
              </div>

              <p class="kiosk-print-disclaimer" id="kiosk-print-disclaimer">
                Impresión mediante el navegador en esta demostración. La impresión automática requiere configurar el terminal y la impresora térmica.
              </p>

              <div class="kiosk-demo-footnote">
                El terminal se reiniciará automáticamente en 12 segundos.
              </div>
            </div>
          </section>
        ` : generated ? `
          <section class="kiosk-step-view kiosk-step-ticket-stage" aria-labelledby="kiosk-ticket-title">
            <div class="kiosk-ticket-visual" id="kiosk-ticket-card">
              <div class="kiosk-ticket-eyebrow">✓ Su ticket fue generado</div>
              <h1 id="kiosk-ticket-title" class="sr-only">Su ticket fue generado</h1>

              <div class="kiosk-ticket-code" id="kiosk-ticket-code">${escHtml(generated.turn.code)}</div>
              <div class="kiosk-ticket-area" id="kiosk-ticket-area">${escHtml(areaLabel)}</div>

              <p class="kiosk-ticket-wait-msg ${kioskUiState.printState === 'error' ? 'is-error' : ''}" id="kiosk-ticket-message">
                ${escHtml(getKioskWaitMessage(kioskUiState.printState))}
              </p>

              ${kioskUiState.isAnonymous ? `
                <p class="kiosk-anon-preserve-note" id="kiosk-anon-preserve-note">
                  Conserve su ticket. Si lo pierde, solicite ayuda al personal para identificar su turno.
                </p>
              ` : ''}

              <dl class="kiosk-ticket-meta">
                <div>
                  <dt>Hora de emisión</dt>
                  <dd class="tnum" id="kiosk-ticket-time">${escHtml(generated.turn.createdAt.split(' ')[1] || generated.turn.createdAt)}</dd>
                </div>
                <div>
                  <dt>Personas por delante</dt>
                  <dd class="tnum" id="kiosk-ahead-count">${generated.aheadCount}</dd>
                </div>
              </dl>

              <div class="kiosk-print-status-box ${printBoxClass}" id="kiosk-print-status-box" role="status" aria-live="polite">
                <span class="kiosk-print-status-icon" id="kiosk-print-status-icon" aria-hidden="true">${printIcon}</span>
                <span id="kiosk-print-status-text">${escHtml(getKioskPrintMessage(kioskUiState.printState))}</span>
              </div>

              <div class="kiosk-ticket-actions">
                <button type="button" id="kiosk-finish-btn" class="primary kiosk-primary-btn">
                  Finalizar
                </button>
                <button type="button" id="kiosk-reprint-btn" class="secondary-btn kiosk-secondary-btn" ${kioskUiState.printState === 'requesting' ? 'disabled' : ''}>
                  Reintentar impresión
                </button>
              </div>

              <p class="kiosk-print-disclaimer" id="kiosk-print-disclaimer">
                Impresión mediante el navegador en esta demostración. La impresión automática requiere configurar el terminal y la impresora térmica.
              </p>

              <div class="kiosk-demo-footnote">
                El terminal se reiniciará automáticamente en 12 segundos.
              </div>
            </div>
          </section>
        ` : ''}
      </main>

      <div id="kiosk-thermal-ticket" class="kiosk-thermal-ticket" aria-hidden="true">
        ${printTurn ? `
          <div class="thermal-ticket-wrapper">
            <div class="thermal-brand">Clínica Oftalmológica</div>
            <div class="thermal-subtitle">Ticket de Atención</div>
            <div class="thermal-divider">================================</div>
            <div class="thermal-code">${escHtml(printTurn.code)}</div>
            <div class="thermal-area">${escHtml(areaLabel)}</div>
            <div class="thermal-divider">--------------------------------</div>
            <div class="thermal-meta">
              <div>Fecha: ${escHtml(printTurn.createdAt.split(' ')[0] || '2026-10-27')}</div>
              <div>Hora: ${escHtml(printTurn.createdAt.split(' ')[1] || '09:20')}</div>
              <div>Personas por delante: ${printAheadCount}</div>
            </div>
            <div class="thermal-divider">================================</div>
            <div class="thermal-footer">
              Espere a que su código aparezca en pantalla
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  container.dataset.kioskRenderedStep = String(currentStep);

  if (direction) {
    const stepView = container.querySelector('.kiosk-step-view');
    if (stepView) {
      const dirClass = `is-step-${direction}`;
      stepView.classList.add('is-step-entering', dirClass);

      let cleaned = false;
      let fallbackTimer = null;
      const cleanTransition = () => {
        if (cleaned) return;
        cleaned = true;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        stepView.removeEventListener('transitionend', onEnd);
        stepView.classList.remove('is-step-entering', 'is-step-forward', 'is-step-backward', 'is-step-reset', 'is-step-visible');
      };

      const onEnd = (e) => {
        if (e.target !== stepView || e.propertyName !== 'opacity') return;
        cleanTransition();
      };

      stepView.addEventListener('transitionend', onEnd);
      fallbackTimer = setTimeout(cleanTransition, 230);

      requestAnimationFrame(() => {
        if (stepView.isConnected) {
          stepView.classList.add('is-step-visible');
        }
      });
    }
  }

  // Global activity listeners for inactivity timeout
  container.onpointerdown = () => scheduleInactivityReset();
  container.onkeydown = () => scheduleInactivityReset();

  // STEP 1 HANDLERS
  if (kioskUiState.step === 1) {
    const displayEl = container.querySelector('#kiosk-dni-display');
    const counterEl = container.querySelector('#kiosk-dni-counter');
    const inputEl = container.querySelector('#kiosk-dni-input');
    const contBtn = container.querySelector('#kiosk-step1-continue-btn');
    const anonBtn = container.querySelector('#kiosk-continue-anonymous-btn');
    const anonLostBtn = container.querySelector('#kiosk-anon-lost-btn');
    const anonLostCloseBtn = container.querySelector('#kiosk-anon-lost-close-btn');

    function syncDniDisplay() {
      if (displayEl) displayEl.innerHTML = renderDniSlots(kioskUiState.dni);
      if (counterEl) counterEl.textContent = `${kioskUiState.dni.length} de 8 dígitos`;
      if (inputEl) inputEl.value = kioskUiState.dni;
      if (contBtn) {
        contBtn.disabled = kioskUiState.dni.length !== 8;
      }
    }

    container.querySelectorAll('[data-digit]').forEach(btn => {
      btn.onclick = () => {
        if (kioskUiState.dni.length < 8) {
          kioskUiState.dni += btn.dataset.digit;
          kioskUiState.docError = '';
          syncDniDisplay();
        }
      };
    });

    const clearBtn = container.querySelector('#kiosk-key-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        kioskUiState.dni = '';
        kioskUiState.docError = '';
        syncDniDisplay();
      };
    }

    const bsBtn = container.querySelector('#kiosk-key-backspace');
    if (bsBtn) {
      bsBtn.onclick = () => {
        kioskUiState.dni = kioskUiState.dni.slice(0, -1);
        kioskUiState.docError = '';
        syncDniDisplay();
      };
    }

    if (inputEl) {
      inputEl.oninput = () => {
        kioskUiState.dni = inputEl.value.replace(/\D/g, '').slice(0, 8);
        kioskUiState.docError = '';
        syncDniDisplay();
      };
      inputEl.onkeydown = e => {
        if (e.key === 'Enter' && kioskUiState.dni.length === 8) {
          e.preventDefault();
          if (contBtn) contBtn.click();
        }
      };
    }

    if (contBtn) {
      contBtn.onclick = () => {
        const clean = kioskUiState.dni.replace(/\D/g, '');
        if (clean.length !== 8) {
          kioskUiState.docError = 'Ingrese los 8 dígitos de su documento.';
          renderKioskView(container, ctx);
          return;
        }
        kioskUiState.dni = clean;
        kioskUiState.maskedDni = '••••' + clean.slice(-4);
        kioskUiState.tempKey = buildTemporaryDocumentKey(clean);
        kioskUiState.isAnonymous = false;
        kioskUiState.anonymousLostHelp = false;
        kioskUiState.docError = '';
        const lookup = lookupPatientByDniForKiosk(clean, patients, appointments, today);
        kioskUiState.match = lookup.found ? lookup : null;
        kioskUiState.step = 2;
        renderKioskView(container, ctx);
      };
    }

    if (anonBtn) {
      anonBtn.onclick = () => {
        kioskUiState.dni = '';
        kioskUiState.maskedDni = 'Sin documento';
        kioskUiState.tempKey = null;
        kioskUiState.match = null;
        kioskUiState.isAnonymous = true;
        kioskUiState.anonymousLostHelp = false;
        kioskUiState.docError = '';
        kioskUiState.step = 2;
        renderKioskView(container, ctx);
      };
    }

    if (anonLostBtn) {
      anonLostBtn.onclick = () => {
        kioskUiState.anonymousLostHelp = true;
        kioskUiState.docError = '';
        renderKioskView(container, ctx);
      };
    }

    if (anonLostCloseBtn) {
      anonLostCloseBtn.onclick = () => {
        kioskUiState.anonymousLostHelp = false;
        renderKioskView(container, ctx);
      };
    }
    return;
  }

  // STEP 2 HANDLERS
  if (kioskUiState.step === 2) {
    container.querySelectorAll('[data-select-area]').forEach(card => {
      card.onclick = () => {
        kioskUiState.selectedArea = card.dataset.selectArea;
        kioskUiState.step = 3;
        renderKioskView(container, ctx);
      };
    });

    const b2 = container.querySelector('#kiosk-step2-back-btn');
    if (b2) {
      b2.onclick = () => {
        kioskUiState.step = 1;
        renderKioskView(container, ctx);
      };
    }
    return;
  }

  // STEP 3 HANDLERS
  if (kioskUiState.step === 3) {
    const b3 = container.querySelector('#kiosk-step3-back-btn');
    if (b3) {
      b3.onclick = () => {
        kioskUiState.step = 2;
        renderKioskView(container, ctx);
      };
    }

    const confBtn = container.querySelector('#kiosk-confirm-ticket-btn');
    if (confBtn) {
      confBtn.onclick = () => {
        if (kioskUiState.isSubmitting) return;
        kioskUiState.isSubmitting = true;
        confBtn.disabled = true;
        confBtn.textContent = 'Emitiendo ticket…';

        const isAnon = Boolean(kioskUiState.isAnonymous);
        const m = isAnon ? null : kioskUiState.match;
        const area = kioskUiState.selectedArea;
        const reason = area === 'R'
          ? (m && m.hasAppointmentToday ? 'Confirmar llegada para una cita' : 'Consultar o registrar una cita')
          : (m && m.hasPendingOrder ? 'Pagar una orden existente' : 'Consultar un pago');

        const tempDocKey = (!isAnon && !m && kioskUiState.dni)
          ? (kioskUiState.tempKey || buildTemporaryDocumentKey(kioskUiState.dni))
          : null;

        const created = createTurnTicket({
          area,
          reason,
          pid: m ? m.pid : null,
          patientName: m ? m.fullNameForInternal : null,
          docMasked: isAnon ? 'Sin DNI' : kioskUiState.maskedDni,
          anonKey: tempDocKey,
          appointmentId: m ? m.appointmentId : null,
          orderAppointmentId: area === 'C' && m ? m.orderAppointmentId : null,
          orderReference: area === 'C' && m ? m.orderReference : null,
          actor: 'Autoservicio'
        });

        if (!created.ok) {
          kioskUiState.isSubmitting = false;
          if (created.duplicate) {
            kioskUiState.duplicateExisting = created.existingTurn || null;
            kioskUiState.duplicateError = created.error || `Ya tiene el turno ${created.existingTurn.code} activo. Puede volver a imprimirlo sin perder su posición en la cola.`;
            kioskUiState.printState = 'idle';
            kioskUiState.step = 4;
            renderKioskView(container, ctx);
            scheduleAutoReset();
          } else {
            kioskUiState.genError = 'No pudimos generar el ticket. Solicite ayuda en Recepción.';
            renderKioskView(container, ctx);
          }
          return;
        }

        kioskUiState.isSubmitting = false;
        kioskUiState.generatedResult = created;
        kioskUiState.step = 4;
        kioskUiState.printState = 'requesting';
        renderKioskView(container, ctx);

        triggerKioskPrint();
        scheduleAutoReset();
      };
    }
    return;
  }

  function updatePrintStatusUi() {
    const waitMsgEl = container.querySelector('#kiosk-ticket-message');
    const statusBox = container.querySelector('#kiosk-print-status-box');
    const statusIcon = container.querySelector('#kiosk-print-status-icon');
    const statusText = container.querySelector('#kiosk-print-status-text');
    const reprintBtn = container.querySelector('#kiosk-reprint-btn');
    const reprintExistingBtn = container.querySelector('#kiosk-reprint-existing-btn');

    if (waitMsgEl) {
      waitMsgEl.textContent = getKioskWaitMessage(kioskUiState.printState);
      waitMsgEl.classList.toggle('is-error', kioskUiState.printState === 'error');
    }
    if (statusBox) {
      statusBox.hidden = kioskUiState.printState === 'idle';
      statusBox.classList.toggle('is-error', kioskUiState.printState === 'error');
      statusBox.classList.toggle('is-requesting', kioskUiState.printState === 'requesting');
      statusBox.classList.toggle('is-requested', kioskUiState.printState === 'requested');
    }
    if (statusIcon) {
      statusIcon.textContent = kioskUiState.printState === 'error'
        ? '⚠️'
        : (kioskUiState.printState === 'requesting' ? '⏳' : '🖨️');
    }
    if (statusText) {
      statusText.textContent = getKioskPrintMessage(kioskUiState.printState);
    }
    if (reprintBtn) {
      reprintBtn.disabled = kioskUiState.printState === 'requesting';
    }
    if (reprintExistingBtn) {
      reprintExistingBtn.disabled = kioskUiState.printState === 'requesting';
    }
  }

  function triggerKioskPrint() {
    kioskUiState.printState = 'requesting';
    updatePrintStatusUi();

    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && typeof window.print === 'function') {
          window.print();
          kioskUiState.printState = 'requested';
        } else {
          kioskUiState.printState = 'error';
        }
      } catch (e) {
        kioskUiState.printState = 'error';
      }
      updatePrintStatusUi();
    }, 300);
  }

  // STEP 4 HANDLERS (Ticket / Duplicate)
  if (kioskUiState.step === 4) {
    const finBtn = container.querySelector('#kiosk-finish-btn');
    if (finBtn) {
      finBtn.onclick = () => {
        resetKioskState();
        renderKioskView(container, ctx);
      };
    }
    const reprintBtn = container.querySelector('#kiosk-reprint-btn');
    if (reprintBtn) {
      reprintBtn.onclick = () => {
        scheduleAutoReset();
        triggerKioskPrint();
      };
    }
    const reprintExistingBtn = container.querySelector('#kiosk-reprint-existing-btn');
    if (reprintExistingBtn) {
      reprintExistingBtn.onclick = () => {
        scheduleAutoReset();
        triggerKioskPrint();
      };
    }
  }
}

// ==========================================
// 2. PANEL DE RECEPCIÓN (#turnos-recepcion)
// ==========================================
export function renderReceptionTurnsView(container, ctx) {
  hydrateTurnStateFromSharedStorage();
  const { user, appointments, onAppointmentUpdated, onTransferToCashOrder, openModal, toast } = ctx;
  const area = 'R';
  const list = turns.filter(t => t.area === area);
  const currentCounter = getSelectedCounter('recepcion');

  const activeTurn =
    list.find(t => t.counter === currentCounter && t.state === 'En atención') ||
    list.find(t => t.counter === currentCounter && t.state === 'Llamado') ||
    null;
  const waitingList = list.filter(t => t.state === 'En espera');
  const historyList = list.filter(t => ['Finalizado', 'Ausente', 'Transferido'].includes(t.state)).slice().reverse();
  const linkedApp = activeTurn?.appointmentId ? appointments.find(a => a.id === activeTurn.appointmentId) : null;
  const counterBusyMsg = activeTurn
    ? `La ventanilla ${currentCounter} ya tiene el turno ${activeTurn.code} activo. Finalízalo, transfiérelo o márcalo como ausente antes de llamar al siguiente.`
    : '';
  const callNextDisabled = Boolean(activeTurn) || waitingList.length === 0;
  const callNextTitle = counterBusyMsg || (waitingList.length === 0 ? 'No hay turnos en espera en la cola R.' : `Llamar al siguiente turno para ${currentCounter}`);
  const transferAlert = panelUiAlert && activeTurn && panelUiAlert.turnId === activeTurn.id ? panelUiAlert : null;

  container.innerHTML = `
    <div class="turns-workspace" data-turns-role="recepcion">
      <div class="stats">
        <div class="stat tone-accent">
          <div class="stat-head"><span>En espera (Cola R)</span></div>
          <strong id="recepcion-stat-waiting">${waitingList.length.toString().padStart(2, '0')}</strong>
          <small>Turnos por llamar en Admisión</small>
        </div>
        <div class="stat tone-warning">
          <div class="stat-head"><span>Llamado / En atención</span></div>
          <strong>${list.filter(t => ['Llamado', 'En atención'].includes(t.state)).length.toString().padStart(2, '0')}</strong>
          <small>${activeTurn ? `${escHtml(activeTurn.code)} en ${escHtml(currentCounter)}` : `${escHtml(currentCounter)} libre`}</small>
        </div>
        <div class="stat tone-success">
          <div class="stat-head"><span>Finalizados</span></div>
          <strong>${list.filter(t => t.state === 'Finalizado').length.toString().padStart(2, '0')}</strong>
          <small>Conservados en historial</small>
        </div>
        <div class="stat">
          <div class="stat-head"><span>Transferidos / Ausentes</span></div>
          <strong>${list.filter(t => ['Transferido', 'Ausente'].includes(t.state)).length.toString().padStart(2, '0')}</strong>
          <small>Trazabilidad hacia Caja u otros</small>
        </div>
      </div>

      <div class="turns-control-bar panel">
        <div class="turns-counter-group">
          <label for="recepcion-counter-select">Ventanilla operativa</label>
          <select id="recepcion-counter-select" aria-label="Ventanilla de Recepción">
            ${QUEUE_AREAS.R.counters.map(c => `<option value="${escHtml(c)}" ${currentCounter === c ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="turns-top-actions">
          <button type="button" class="secondary-btn" id="recepcion-open-kiosk">Abrir autoservicio</button>
          <button type="button" class="secondary-btn" id="recepcion-open-display">Pantalla pública</button>
          <button type="button" class="primary" id="recepcion-call-next-btn" ${callNextDisabled ? 'disabled' : ''} title="${escHtml(callNextTitle)}"${activeTurn ? ' aria-describedby="recepcion-call-next-hint"' : ''}>Llamar siguiente</button>
        </div>
        ${activeTurn ? `<p class="turns-counter-busy-hint" id="recepcion-call-next-hint" role="status">${escHtml(counterBusyMsg)}</p>` : ''}
      </div>

      <div class="turns-columns">
        <section class="panel turns-active-panel" aria-labelledby="recepcion-active-title">
          <div class="panelhead">
            <div>
              <h2 id="recepcion-active-title">Turno activo en ${escHtml(currentCounter)}</h2>
              <p>Cola exclusiva de Recepción (R). No altera cobros ni historial clínico.</p>
            </div>
            ${activeTurn ? renderStateBadge(activeTurn.state) : '<span class="badge">Libre</span>'}
          </div>
          <div class="turns-active-body">
            ${activeTurn ? `
              ${transferAlert ? `
                <div class="kiosk-duplicate-alert" id="turns-transfer-blocked-alert" role="alert">
                  <strong>Transferencia bloqueada${transferAlert.existingCode ? ` · Turno activo existente (${escHtml(transferAlert.existingCode)})` : ''}</strong>
                  <p>${escHtml(transferAlert.error)}</p>
                </div>
              ` : ''}

              <div class="turns-active-ticket-header">
                <div class="turns-code-pill">${escHtml(activeTurn.code)}</div>
                <div>
                  <h3>${escHtml(activeTurn.patientLabel)}</h3>
                  <p>Documento: <b>${escHtml(activeTurn.docMasked)}</b> · Motivo: <b>${escHtml(activeTurn.reason)}</b></p>
                  <small>Emitido: ${escHtml(activeTurn.createdAt)}${activeTurn.originTicketId ? ` · Derivado desde <b>${escHtml(activeTurn.originTicketId)}</b>` : ''}</small>
                </div>
              </div>

              ${linkedApp ? `
                <div class="turns-linked-box" id="recepcion-linked-appointment">
                  <div class="turns-linked-head">
                    <strong>Cita vinculada #${linkedApp.id}</strong>
                    <span class="badge" id="recepcion-linked-app-status">${escHtml(linkedApp.status)}</span>
                  </div>
                  <p>${escHtml(linkedApp.date)} · ${escHtml(linkedApp.time)} · ${escHtml(linkedApp.doctor)}</p>
                  ${activeTurn.state === 'En atención' ? `
                    <div class="turns-linked-actions">
                      ${['Programada', 'Confirmada'].includes(linkedApp.status)
                        ? `<button type="button" class="primary" id="recepcion-validate-arrival-btn">Validar llegada y pasar cita a Llegó</button>`
                        : `<span class="turns-validated-note">✓ Cita en estado ${escHtml(linkedApp.status)}</span>`}
                    </div>
                  ` : `<small>Inicia la atención para validar la llegada de la cita.</small>`}
                </div>
              ` : `
                <div class="note">Turno sin cita vinculada. Atención administrativa en Recepción.</div>
              `}

              <div class="turns-action-grid" role="group" aria-label="Acciones del turno">
                ${activeTurn.state === 'Llamado' ? `
                  <button type="button" id="recepcion-recall-btn">Volver a llamar</button>
                  <button type="button" class="primary" id="recepcion-start-btn">Iniciar atención</button>
                  <button type="button" class="warning" id="recepcion-absent-btn">Marcar como ausente</button>
                ` : `
                  <button type="button" class="primary" id="recepcion-finish-btn">Finalizar atención</button>
                  <button type="button" id="recepcion-transfer-cash-btn">Transferir a Caja</button>
                  <button type="button" class="warning" id="recepcion-absent-btn">Marcar como ausente</button>
                `}
                <button type="button" class="secondary-btn" data-inspect-turn="${escHtml(activeTurn.code)}">Ver historial</button>
              </div>
            ` : `
              <div class="empty">
                <p>No hay un turno llamado o en atención en ${escHtml(currentCounter)}.</p>
                <small>${waitingList.length ? 'Pulsa "Llamar siguiente" para convocar al próximo ticket de la cola R.' : 'La cola R no tiene tickets en espera por ahora.'}</small>
              </div>
            `}
          </div>
        </section>

        <section class="panel turns-queue-list" aria-labelledby="recepcion-waiting-title">
          <div class="panelhead">
            <div>
              <h2 id="recepcion-waiting-title">Cola en espera R (${waitingList.length})</h2>
              <p>Orden cronológico de llegada en Recepción.</p>
            </div>
          </div>
          <div class="turns-list-items">
            ${waitingList.length ? waitingList.map((t, idx) => `
              <article class="turn-row-card" data-turn-code="${escHtml(t.code)}">
                <div class="turn-row-main">
                  <span class="turns-code-mini">${escHtml(t.code)}</span>
                  <div>
                    <strong>${escHtml(t.patientLabel)}</strong>
                    <small>${escHtml(t.reason)} · ${escHtml(t.createdAt.split(' ')[1] || t.createdAt)}${t.originTicketId ? ` · Desde ${escHtml(t.originTicketId)}` : ''}</small>
                  </div>
                </div>
                <div class="turn-row-right">
                  <span class="badge">${idx === 0 ? 'Siguiente' : `Posición ${idx + 1}`}</span>
                  ${renderStateBadge(t.state)}
                </div>
              </article>
            `).join('') : '<div class="empty">Sin turnos en espera en Recepción.</div>'}
          </div>

          <div class="panelhead" style="border-top:1px solid var(--line);margin-top:8px">
            <div>
              <h2>Historial reciente de Recepción (${historyList.length})</h2>
              <p>Tickets cerrados, ausentes o transferidos se conservan durante la sesión.</p>
            </div>
          </div>
          <div class="turns-list-items">
            ${historyList.map(t => `
              <article class="turn-row-card is-closed" data-turn-history="${escHtml(t.code)}">
                <div class="turn-row-main">
                  <span class="turns-code-mini">${escHtml(t.code)}</span>
                  <div>
                    <strong>${escHtml(t.patientLabel)}</strong>
                    <small>${escHtml(t.counter || 'Recepción')}${t.linkedTicketId ? ` · Derivado a ${escHtml(t.linkedTicketId)}` : ''}</small>
                  </div>
                </div>
                <div class="turn-row-right">
                  ${renderStateBadge(t.state)}
                  <button type="button" class="linkbutton" data-inspect-turn="${escHtml(t.code)}">Historial</button>
                </div>
              </article>
            `).join('') || '<div class="empty">Sin movimientos cerrados aún.</div>'}
          </div>
        </section>
      </div>
    </div>
  `;

  container.querySelector('#recepcion-counter-select').onchange = e => {
    panelUiAlert = null;
    setSelectedCounter('recepcion', e.target.value);
    renderReceptionTurnsView(container, ctx);
    toast(`Ventanilla activa: ${e.target.value}.`);
  };
  container.querySelector('#recepcion-open-kiosk').onclick = () => { location.hash = '#autoservicio'; };
  container.querySelector('#recepcion-open-display').onclick = () => { location.hash = '#pantalla-turnos'; };

  container.querySelector('#recepcion-call-next-btn').onclick = () => {
    const res = callNextTurn({
      area: 'R',
      role: user.role,
      operatorName: user.name,
      counterName: getSelectedCounter('recepcion')
    });
    if (!res.ok) return toast(res.error);
    toast(`Turno ${res.turn.code} llamado a ${res.turn.counter}.`);
    renderReceptionTurnsView(container, ctx);
  };

  if (activeTurn) {
    const recallBtn = container.querySelector('#recepcion-recall-btn');
    if (recallBtn) {
      recallBtn.onclick = () => {
        const res = recallTurn(activeTurn.id, { role: user.role, operatorName: user.name, counterName: getSelectedCounter('recepcion') });
        if (!res.ok) return toast(res.error);
        toast(`Se volvió a llamar al turno ${res.turn.code}.`);
        renderReceptionTurnsView(container, ctx);
      };
    }
    const startBtn = container.querySelector('#recepcion-start-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        const res = startTurnAttention(activeTurn.id, { role: user.role, operatorName: user.name, counterName: getSelectedCounter('recepcion') });
        if (!res.ok) return toast(res.error);
        toast(`Atención iniciada para ${res.turn.code}.`);
        renderReceptionTurnsView(container, ctx);
      };
    }
    const validateBtn = container.querySelector('#recepcion-validate-arrival-btn');
    if (validateBtn) {
      validateBtn.onclick = () => {
        const res = confirmArrivalFromTurn(activeTurn.id, {
          role: user.role,
          operatorName: user.name,
          appointments,
          onStatusChange: onAppointmentUpdated
        });
        if (!res.ok) return toast(res.error);
        toast(`Llegada validada: la cita #${linkedApp.id} pasó a estado Llegó.`);
        renderReceptionTurnsView(container, ctx);
      };
    }
    const finishBtn = container.querySelector('#recepcion-finish-btn');
    if (finishBtn) {
      finishBtn.onclick = () => {
        const res = finishTurnAttention(activeTurn.id, { role: user.role, operatorName: user.name, counterName: getSelectedCounter('recepcion') });
        if (!res.ok) return toast(res.error);
        toast(`Turno ${res.turn.code} finalizado.`);
        renderReceptionTurnsView(container, ctx);
      };
    }
    const transferBtn = container.querySelector('#recepcion-transfer-cash-btn');
    if (transferBtn) {
      transferBtn.onclick = () => {
        const res = transferTurn(activeTurn.id, {
          targetArea: 'C',
          role: user.role,
          operatorName: user.name,
          counterName: getSelectedCounter('recepcion'),
          reason: 'Derivado desde Recepción hacia Caja para completar orden de pago'
        });
        if (!res.ok) {
          panelUiAlert = { turnId: activeTurn.id, error: res.error, existingCode: res.existingTurn?.code || null };
          toast(res.error);
          renderReceptionTurnsView(container, ctx);
          return;
        }
        panelUiAlert = null;
        if (typeof onTransferToCashOrder === 'function' && res.targetTurn.orderAppointmentId) {
          onTransferToCashOrder(res.targetTurn.orderAppointmentId);
        }
        toast(`Turno ${res.originTurn.code} transferido a Caja como ${res.targetTurn.code}.`);
        renderReceptionTurnsView(container, ctx);
      };
    }
    const absentBtn = container.querySelector('#recepcion-absent-btn');
    if (absentBtn) {
      absentBtn.onclick = () => {
        const res = markTurnAbsent(activeTurn.id, {
          role: user.role,
          operatorName: user.name,
          counterName: getSelectedCounter('recepcion')
        });
        if (!res.ok) return toast(res.error);
        toast(`Turno ${res.turn.code} marcado como Ausente.`);
        renderReceptionTurnsView(container, ctx);
      };
    }
  }

  container.querySelectorAll('[data-inspect-turn]').forEach(btn => {
    btn.onclick = () => openTurnHistoryModal(getTurnById(btn.dataset.inspectTurn), openModal);
  });
}

// ==========================================
// 3. PANEL DE CAJA (#turnos-caja)
// ==========================================
export function renderCashTurnsView(container, ctx) {
  hydrateTurnStateFromSharedStorage();
  const { user, appointments, onOpenOrder, onRegisterPayment, openModal, toast } = ctx;
  const area = 'C';
  const list = turns.filter(t => t.area === area);
  const currentCounter = getSelectedCounter('caja');

  const activeTurn =
    list.find(t => t.counter === currentCounter && t.state === 'En atención') ||
    list.find(t => t.counter === currentCounter && t.state === 'Llamado') ||
    null;
  const waitingList = list.filter(t => t.state === 'En espera');
  const historyList = list.filter(t => ['Finalizado', 'Ausente', 'Transferido'].includes(t.state)).slice().reverse();

  const linkedOrderId = activeTurn ? (activeTurn.orderAppointmentId || activeTurn.appointmentId) : null;
  const linkedOrderApp = linkedOrderId ? appointments.find(a => a.id === Number(linkedOrderId)) : null;
  const counterBusyMsg = activeTurn
    ? `La ventanilla ${currentCounter} ya tiene el turno ${activeTurn.code} activo. Finalízalo, transfiérelo o márcalo como ausente antes de llamar al siguiente.`
    : '';
  const callNextDisabled = Boolean(activeTurn) || waitingList.length === 0;
  const callNextTitle = counterBusyMsg || (waitingList.length === 0 ? 'No hay turnos en espera en la cola C.' : `Llamar al siguiente turno para ${currentCounter}`);
  const transferAlert = panelUiAlert && activeTurn && panelUiAlert.turnId === activeTurn.id ? panelUiAlert : null;

  container.innerHTML = `
    <div class="turns-workspace" data-turns-role="caja">
      <div class="stats">
        <div class="stat tone-accent">
          <div class="stat-head"><span>En espera (Cola C)</span></div>
          <strong id="caja-stat-waiting">${waitingList.length.toString().padStart(2, '0')}</strong>
          <small>Tickets en espera de Caja</small>
        </div>
        <div class="stat tone-warning">
          <div class="stat-head"><span>En ventanilla</span></div>
          <strong>${list.filter(t => ['Llamado', 'En atención'].includes(t.state)).length.toString().padStart(2, '0')}</strong>
          <small>${activeTurn ? `${escHtml(activeTurn.code)} en ${escHtml(currentCounter)}` : `${escHtml(currentCounter)} libre`}</small>
        </div>
        <div class="stat tone-success">
          <div class="stat-head"><span>Finalizados</span></div>
          <strong>${list.filter(t => t.state === 'Finalizado').length.toString().padStart(2, '0')}</strong>
          <small>Atenciones completadas en Caja</small>
        </div>
        <div class="stat">
          <div class="stat-head"><span>Transferidos / Ausentes</span></div>
          <strong>${list.filter(t => ['Transferido', 'Ausente'].includes(t.state)).length.toString().padStart(2, '0')}</strong>
          <small>Derivados a Recepción o ausentes</small>
        </div>
      </div>

      <div class="turns-control-bar panel">
        <div class="turns-counter-group">
          <label for="caja-counter-select">Ventanilla de Caja</label>
          <select id="caja-counter-select" aria-label="Ventanilla de Caja">
            ${QUEUE_AREAS.C.counters.map(c => `<option value="${escHtml(c)}" ${currentCounter === c ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="turns-top-actions">
          <button type="button" class="secondary-btn" id="caja-open-kiosk">Autoservicio</button>
          <button type="button" class="secondary-btn" id="caja-open-display">Pantalla pública</button>
          <button type="button" class="primary" id="caja-call-next-btn" ${callNextDisabled ? 'disabled' : ''} title="${escHtml(callNextTitle)}"${activeTurn ? ' aria-describedby="caja-call-next-hint"' : ''}>Llamar siguiente</button>
        </div>
        ${activeTurn ? `<p class="turns-counter-busy-hint" id="caja-call-next-hint" role="status">${escHtml(counterBusyMsg)}</p>` : ''}
      </div>

      <div class="turns-columns">
        <section class="panel turns-active-panel" aria-labelledby="caja-active-title">
          <div class="panelhead">
            <div>
              <h2 id="caja-active-title">Atención en ${escHtml(currentCounter)}</h2>
              <p>Cola exclusiva de Caja (C). Sin acceso a ficha clínica ni cola de Recepción.</p>
            </div>
            ${activeTurn ? renderStateBadge(activeTurn.state) : '<span class="badge">Libre</span>'}
          </div>
          <div class="turns-active-body">
            ${activeTurn ? `
              ${transferAlert ? `
                <div class="kiosk-duplicate-alert" id="turns-transfer-blocked-alert" role="alert">
                  <strong>Transferencia bloqueada${transferAlert.existingCode ? ` · Turno activo existente (${escHtml(transferAlert.existingCode)})` : ''}</strong>
                  <p>${escHtml(transferAlert.error)}</p>
                </div>
              ` : ''}

              <div class="turns-active-ticket-header">
                <div class="turns-code-pill">${escHtml(activeTurn.code)}</div>
                <div>
                  <h3>${escHtml(activeTurn.patientLabel)}</h3>
                  <p>Documento: <b>${escHtml(activeTurn.docMasked)}</b> · Motivo: <b>${escHtml(activeTurn.reason)}</b></p>
                  <small>Emitido: ${escHtml(activeTurn.createdAt)}${activeTurn.originTicketId ? ` · Derivado desde <b>${escHtml(activeTurn.originTicketId)}</b>` : ''}</small>
                </div>
              </div>

              ${linkedOrderApp ? `
                <div class="turns-linked-box" id="caja-linked-order">
                  <div class="turns-linked-head">
                    <strong>Orden vinculada ${escHtml(activeTurn.orderReference || `OP-${String(linkedOrderApp.id).padStart(4, '0')}`)}</strong>
                    <span class="badge ${linkedOrderApp.paid ? 'green' : 'amber'}" id="caja-linked-order-status">${linkedOrderApp.paid ? 'Pagado' : 'Pendiente'}</span>
                  </div>
                  <p>Concepto: <b>${escHtml(linkedOrderApp.service)}</b> · Importe: <b>S/ ${Number(linkedOrderApp.amount || 0).toFixed(2)}</b></p>
                  <div class="turns-linked-actions">
                    <button type="button" id="caja-open-order-btn">Abrir la orden vinculada</button>
                    ${!linkedOrderApp.paid && activeTurn.state === 'En atención'
                      ? `<button type="button" class="primary" id="caja-register-payment-btn">Registrar el cobro</button>`
                      : linkedOrderApp.paid
                        ? `<span class="turns-validated-note">✓ Orden ya pagada (${escHtml(linkedOrderApp.reference || '')})</span>`
                        : `<small>Inicia la atención para habilitar el cobro.</small>`}
                  </div>
                </div>
              ` : `
                <div class="note">Turno de consulta de pago sin orden vinculada. Puedes transferir a Recepción si requiere generar o actualizar cita.</div>
              `}

              <div class="turns-action-grid" role="group" aria-label="Acciones de Caja">
                ${activeTurn.state === 'Llamado' ? `
                  <button type="button" id="caja-recall-btn">Volver a llamar</button>
                  <button type="button" class="primary" id="caja-start-btn">Iniciar atención</button>
                  <button type="button" class="warning" id="caja-absent-btn">Marcar como ausente</button>
                ` : `
                  <button type="button" class="primary" id="caja-finish-btn">Finalizar atención</button>
                  <button type="button" id="caja-transfer-reception-btn">Transferir a Recepción</button>
                  <button type="button" class="warning" id="caja-absent-btn">Marcar como ausente</button>
                `}
                <button type="button" class="secondary-btn" data-inspect-turn="${escHtml(activeTurn.code)}">Ver historial</button>
              </div>
            ` : `
              <div class="empty">
                <p>No hay un turno llamado o en atención en ${escHtml(currentCounter)}.</p>
                <small>${waitingList.length ? 'Pulsa "Llamar siguiente" para atender al próximo ticket de la cola C.' : 'No hay tickets en espera en Caja.'}</small>
              </div>
            `}
          </div>
        </section>

        <section class="panel turns-queue-list" aria-labelledby="caja-waiting-title">
          <div class="panelhead">
            <div>
              <h2 id="caja-waiting-title">Cola en espera C (${waitingList.length})</h2>
              <p>Pacientes en espera para Caja / Pagos.</p>
            </div>
          </div>
          <div class="turns-list-items">
            ${waitingList.length ? waitingList.map((t, idx) => `
              <article class="turn-row-card" data-turn-code="${escHtml(t.code)}">
                <div class="turn-row-main">
                  <span class="turns-code-mini">${escHtml(t.code)}</span>
                  <div>
                    <strong>${escHtml(t.patientLabel)}</strong>
                    <small>${escHtml(t.reason)}${t.orderReference ? ` · ${escHtml(t.orderReference)}` : ''}${t.originTicketId ? ` · Desde ${escHtml(t.originTicketId)}` : ''}</small>
                  </div>
                </div>
                <div class="turn-row-right">
                  <span class="badge">${idx === 0 ? 'Siguiente' : `Posición ${idx + 1}`}</span>
                  ${renderStateBadge(t.state)}
                </div>
              </article>
            `).join('') : '<div class="empty">Sin turnos en espera en Caja.</div>'}
          </div>

          <div class="panelhead" style="border-top:1px solid var(--line);margin-top:8px">
            <div>
              <h2>Historial reciente de Caja (${historyList.length})</h2>
              <p>Todos los movimientos se mantienen en memoria durante la sesión.</p>
            </div>
          </div>
          <div class="turns-list-items">
            ${historyList.map(t => `
              <article class="turn-row-card is-closed" data-turn-history="${escHtml(t.code)}">
                <div class="turn-row-main">
                  <span class="turns-code-mini">${escHtml(t.code)}</span>
                  <div>
                    <strong>${escHtml(t.patientLabel)}</strong>
                    <small>${escHtml(t.counter || 'Caja')}${t.linkedTicketId ? ` · Derivado a ${escHtml(t.linkedTicketId)}` : ''}</small>
                  </div>
                </div>
                <div class="turn-row-right">
                  ${renderStateBadge(t.state)}
                  <button type="button" class="linkbutton" data-inspect-turn="${escHtml(t.code)}">Historial</button>
                </div>
              </article>
            `).join('') || '<div class="empty">Sin tickets cerrados en Caja todavía.</div>'}
          </div>
        </section>
      </div>
    </div>
  `;

  container.querySelector('#caja-counter-select').onchange = e => {
    panelUiAlert = null;
    setSelectedCounter('caja', e.target.value);
    renderCashTurnsView(container, ctx);
  };
  container.querySelector('#caja-open-kiosk').onclick = () => { location.hash = '#autoservicio'; };
  container.querySelector('#caja-open-display').onclick = () => { location.hash = '#pantalla-turnos'; };

  container.querySelector('#caja-call-next-btn').onclick = () => {
    const res = callNextTurn({
      area: 'C',
      role: user.role,
      operatorName: user.name,
      counterName: getSelectedCounter('caja')
    });
    if (!res.ok) return toast(res.error);
    toast(`Turno ${res.turn.code} llamado a ${res.turn.counter}.`);
    renderCashTurnsView(container, ctx);
  };

  if (activeTurn) {
    const recallBtn = container.querySelector('#caja-recall-btn');
    if (recallBtn) {
      recallBtn.onclick = () => {
        const res = recallTurn(activeTurn.id, { role: user.role, operatorName: user.name, counterName: getSelectedCounter('caja') });
        if (!res.ok) return toast(res.error);
        toast(`Se volvió a llamar al turno ${res.turn.code}.`);
        renderCashTurnsView(container, ctx);
      };
    }
    const startBtn = container.querySelector('#caja-start-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        const res = startTurnAttention(activeTurn.id, { role: user.role, operatorName: user.name, counterName: getSelectedCounter('caja') });
        if (!res.ok) return toast(res.error);
        toast(`Atención en Caja iniciada para ${res.turn.code}.`);
        renderCashTurnsView(container, ctx);
      };
    }
    const openOrderBtn = container.querySelector('#caja-open-order-btn');
    if (openOrderBtn && linkedOrderApp) {
      openOrderBtn.onclick = () => {
        if (typeof onOpenOrder === 'function') onOpenOrder(linkedOrderApp.id);
      };
    }
    const regPayBtn = container.querySelector('#caja-register-payment-btn');
    if (regPayBtn && linkedOrderApp) {
      regPayBtn.onclick = () => {
        if (typeof onRegisterPayment === 'function') onRegisterPayment(linkedOrderApp.id, activeTurn);
      };
    }
    const finishBtn = container.querySelector('#caja-finish-btn');
    if (finishBtn) {
      finishBtn.onclick = () => {
        const res = finishTurnAttention(activeTurn.id, { role: user.role, operatorName: user.name, counterName: getSelectedCounter('caja') });
        if (!res.ok) return toast(res.error);
        toast(`Turno ${res.turn.code} finalizado en Caja.`);
        renderCashTurnsView(container, ctx);
      };
    }
    const transferRecBtn = container.querySelector('#caja-transfer-reception-btn');
    if (transferRecBtn) {
      transferRecBtn.onclick = () => {
        openModal(
          `Transferir ${escHtml(activeTurn.code)} a Recepción`,
          `
            <form id="transfer-rec-form" novalidate>
              <div class="fields">
                <div class="field full">
                  <label for="transfer-rec-reason">Motivo de transferencia a Recepción *</label>
                  <input id="transfer-rec-reason" value="Validación de cita o actualización de datos antes del pago" required>
                </div>
              </div>
              <div id="form-error" class="error" role="alert"></div>
            </form>
            <div class="note">El ticket ${escHtml(activeTurn.code)} pasará a estado Transferido y se emitirá un nuevo ticket R- en espera para Recepción.</div>
          `,
          `
            <button type="button" id="transfer-rec-cancel">Cancelar</button>
            <button type="submit" class="primary" form="transfer-rec-form" id="transfer-rec-confirm">Confirmar transferencia</button>
          `
        );
        document.querySelector('#transfer-rec-cancel').onclick = () => document.querySelector('#modal').close();
        document.querySelector('#transfer-rec-form').onsubmit = e => {
          e.preventDefault();
          const reason = document.querySelector('#transfer-rec-reason').value.trim();
          if (reason.length < 4) {
            document.querySelector('#form-error').textContent = 'Indica un motivo de transferencia.';
            return;
          }
          const res = transferTurn(activeTurn.id, {
            targetArea: 'R',
            role: user.role,
            operatorName: user.name,
            counterName: getSelectedCounter('caja'),
            reason
          });
          document.querySelector('#modal').close();
          if (!res.ok) {
            panelUiAlert = { turnId: activeTurn.id, error: res.error, existingCode: res.existingTurn?.code || null };
            toast(res.error);
            renderCashTurnsView(container, ctx);
            return;
          }
          panelUiAlert = null;
          toast(`Turno ${res.originTurn.code} transferido a Recepción como ${res.targetTurn.code}.`);
          renderCashTurnsView(container, ctx);
        };
      };
    }
    const absentBtn = container.querySelector('#caja-absent-btn');
    if (absentBtn) {
      absentBtn.onclick = () => {
        const res = markTurnAbsent(activeTurn.id, {
          role: user.role,
          operatorName: user.name,
          counterName: getSelectedCounter('caja')
        });
        if (!res.ok) return toast(res.error);
        toast(`Turno ${res.turn.code} marcado como Ausente.`);
        renderCashTurnsView(container, ctx);
      };
    }
  }

  container.querySelectorAll('[data-inspect-turn]').forEach(btn => {
    btn.onclick = () => openTurnHistoryModal(getTurnById(btn.dataset.inspectTurn), openModal);
  });
}

// ==========================================
// 4. SUPERVISIÓN ADMINISTRADOR (#turnos-supervision)
// ==========================================
export function renderAdminTurnsView(container, ctx) {
  hydrateTurnStateFromSharedStorage();
  const { openModal } = ctx;
  const metrics = getTurnMetrics();

  const filteredTurns = turns
    .filter(t => {
      if (adminUiState.area !== 'ALL' && t.area !== adminUiState.area) return false;
      if (adminUiState.state !== 'ALL' && t.state !== adminUiState.state) return false;
      return true;
    })
    .slice()
    .reverse();

  container.innerHTML = `
    <div class="turns-workspace" data-turns-role="admin">
      <div class="note" id="admin-turns-supervision-banner">
        <strong>Modo supervisión (Administrador):</strong> Visualiza colas de Recepción (R) y Caja (C), tiempos e historial completo de transiciones. Los llamados de ventanilla y los cobros se operan exclusivamente desde Recepción y Caja.
      </div>

      <div class="stats">
        <div class="stat tone-accent">
          <div class="stat-head"><span>Cola Recepción (R)</span></div>
          <strong>${metrics.R.waiting.toString().padStart(2, '0')}</strong>
          <small>${metrics.R.inAttention + metrics.R.called} activos · Espera prom. ${metrics.R.avgWaitMinutes} min</small>
        </div>
        <div class="stat tone-warning">
          <div class="stat-head"><span>Cola Caja (C)</span></div>
          <strong>${metrics.C.waiting.toString().padStart(2, '0')}</strong>
          <small>${metrics.C.inAttention + metrics.C.called} activos · Espera prom. ${metrics.C.avgWaitMinutes} min</small>
        </div>
        <div class="stat tone-success">
          <div class="stat-head"><span>Atendidos / Finalizados</span></div>
          <strong>${(metrics.R.finished + metrics.C.finished).toString().padStart(2, '0')}</strong>
          <small>Atención prom. R: ${metrics.R.avgAttentionMinutes}m · C: ${metrics.C.avgAttentionMinutes}m</small>
        </div>
        <div class="stat">
          <div class="stat-head"><span>Transferidos y ausentes</span></div>
          <strong>${(metrics.R.transferred + metrics.C.transferred + metrics.R.absent + metrics.C.absent).toString().padStart(2, '0')}</strong>
          <small>${metrics.R.transferred + metrics.C.transferred} transferencias · ${metrics.R.absent + metrics.C.absent} ausentes</small>
        </div>
      </div>

      <div class="turns-control-bar panel">
        <div class="turns-filter-pair">
          <div>
            <label for="admin-turns-filter-area">Filtrar por área</label>
            <select id="admin-turns-filter-area" aria-label="Filtrar turnos por área">
              <option value="ALL" ${adminUiState.area === 'ALL' ? 'selected' : ''}>Todas las áreas (R y C)</option>
              <option value="R" ${adminUiState.area === 'R' ? 'selected' : ''}>Recepción / Admisión (R)</option>
              <option value="C" ${adminUiState.area === 'C' ? 'selected' : ''}>Caja / Pagos (C)</option>
            </select>
          </div>
          <div>
            <label for="admin-turns-filter-state">Filtrar por estado</label>
            <select id="admin-turns-filter-state" aria-label="Filtrar turnos por estado">
              <option value="ALL" ${adminUiState.state === 'ALL' ? 'selected' : ''}>Todos los estados</option>
              ${TURN_STATES.map(st => `<option value="${escHtml(st)}" ${adminUiState.state === st ? 'selected' : ''}>${escHtml(st)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="turns-top-actions">
          <button type="button" class="secondary-btn" id="admin-open-kiosk">Autoservicio</button>
          <button type="button" class="secondary-btn" id="admin-open-display">Pantalla pública</button>
        </div>
      </div>

      <section class="panel" aria-labelledby="admin-turns-table-title">
        <div class="panelhead">
          <div>
            <h2 id="admin-turns-table-title">Registro auditable de turnos (${filteredTurns.length})</h2>
            <p>Incluye turnos activos, finalizados, ausentes y transferidos en ambas colas.</p>
          </div>
          <span class="badge blue">Solo lectura operativa</span>
        </div>
        <div class="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Área / Ventanilla</th>
                <th>Paciente</th>
                <th>Motivo y vínculo</th>
                <th>Estado</th>
                <th>Tiempos</th>
                <th>Auditoría</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTurns.map(t => `
                <tr data-admin-turn-row="${escHtml(t.code)}">
                  <td>
                    <span class="turns-code-mini">${escHtml(t.code)}</span>
                    ${t.originTicketId ? `<small style="display:block;color:var(--muted)">Origen: ${escHtml(t.originTicketId)}</small>` : ''}
                    ${t.linkedTicketId ? `<small style="display:block;color:var(--muted)">Pasó a: ${escHtml(t.linkedTicketId)}</small>` : ''}
                  </td>
                  <td>
                    <b>${escHtml(QUEUE_AREAS[t.area].shortLabel)}</b>
                    <small style="display:block;color:var(--muted)">${escHtml(t.counter || 'Sin ventanilla asignada')}</small>
                  </td>
                  <td>
                    <b>${escHtml(t.patientLabel)}</b>
                    <small style="display:block;color:var(--muted)">DNI ${escHtml(t.docMasked)}</small>
                  </td>
                  <td>
                    <span>${escHtml(t.reason)}</span>
                    <small style="display:block;color:var(--muted)">${t.orderReference ? `Orden ${escHtml(t.orderReference)}` : t.appointmentId ? `Cita #${t.appointmentId}` : 'Sin vínculo'}</small>
                  </td>
                  <td>${renderStateBadge(t.state)}</td>
                  <td class="tnum">
                    <span>Espera: ${t.waitMinutes}m</span>
                    <small style="display:block;color:var(--muted)">Atención: ${t.attentionMinutes}m</small>
                  </td>
                  <td>
                    <button type="button" class="linkbutton" data-inspect-turn="${escHtml(t.code)}">Ver historial (${t.history.length})</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="empty">No existen turnos con los filtros seleccionados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  container.querySelector('#admin-turns-filter-area').onchange = e => {
    adminUiState.area = e.target.value;
    renderAdminTurnsView(container, ctx);
  };
  container.querySelector('#admin-turns-filter-state').onchange = e => {
    adminUiState.state = e.target.value;
    renderAdminTurnsView(container, ctx);
  };
  container.querySelector('#admin-open-kiosk').onclick = () => { location.hash = '#autoservicio'; };
  container.querySelector('#admin-open-display').onclick = () => { location.hash = '#pantalla-turnos'; };
  container.querySelectorAll('[data-inspect-turn]').forEach(btn => {
    btn.onclick = () => openTurnHistoryModal(getTurnById(btn.dataset.inspectTurn), openModal);
  });
}

// ==========================================
// 5. PANTALLA PÚBLICA DE LLAMADOS (#pantalla-turnos)
// ==========================================
function stopPublicDisplayClock() {
  if (tvClockTimer) {
    clearInterval(tvClockTimer);
    tvClockTimer = null;
  }
}

function formatTvClockParts() {
  return getDemoClockSnapshot();
}

function formatLastUpdateClock(stamp) {
  if (!stamp) return getDemoClockSnapshot().hm;
  return extractStampTime(stamp);
}

function startPublicDisplayClock() {
  stopPublicDisplayClock();
  const updateClockDom = () => {
    if (typeof document === 'undefined' || typeof location === 'undefined') {
      stopPublicDisplayClock();
      return;
    }
    const cleanHash = String(location.hash || '').replace(/^#/, '').split('?')[0];
    const timeEl = document.getElementById('public-clock-time');
    const dateEl = document.getElementById('public-clock-date');
    if (cleanHash !== 'pantalla-turnos' || !timeEl || !dateEl) {
      stopPublicDisplayClock();
      return;
    }
    const { timeText, dateText } = formatTvClockParts();
    if (timeEl.textContent !== timeText) timeEl.textContent = timeText;
    if (dateEl.textContent !== dateText) dateEl.textContent = dateText;
  };
  updateClockDom();
  if (typeof setInterval === 'function') {
    tvClockTimer = setInterval(() => {
      demoClockSeconds += 1;
      if (demoClockSeconds >= 60) {
        demoClockSeconds = 0;
        demoClockExtraMinutes += 1;
      }
      updateClockDom();
    }, 1000);
  }
}

export function renderPublicDisplayView(container) {
  hydrateTurnStateFromSharedStorage();
  const data = getPublicTurnProjection();
  const clockNow = formatTvClockParts();
  const activeCount = data.activeCalls.length;
  const gridModeClass = activeCount === 0
    ? 'is-empty'
    : (activeCount === 1 ? 'is-single-active' : (activeCount >= 3 ? 'is-multi-active has-3-active' : 'is-multi-active'));

  const renderWaitingAreaBlock = (areaCode, title) => {
    const q = data.waitingQueues[areaCode];
    return `
      <div class="public-queue-box" data-queue-panel="${areaCode}">
        <div class="public-queue-box-head">
          <h3>${escHtml(title)}</h3>
          <span class="public-queue-count-pill tnum" data-queue-total="${areaCode}">${q.totalWaiting}</span>
        </div>
        ${q.visibleCodes.length ? `
          <ul class="public-queue-code-list" data-queue-list="${areaCode}">
            ${q.visibleCodes.map((item, idx) => `
              <li class="public-queue-code-pill area-${areaCode.toLowerCase()} ${idx === 0 ? 'is-next' : ''}" data-waiting-code="${escHtml(item.code)}">
                <span class="public-queue-pos tnum">${idx + 1}</span>
                <strong>${escHtml(item.code)}</strong>
              </li>
            `).join('')}
          </ul>
        ` : `<p class="public-queue-empty" data-queue-empty="${areaCode}">Sin turnos en espera</p>`}
        ${q.overflowCount > 0 ? `<p class="public-queue-overflow" data-queue-overflow="${areaCode}">${escHtml(q.overflowLabel)}</p>` : ''}
      </div>
    `;
  };

  container.innerHTML = `
    <div class="public-screen-shell public-display-shell" data-public-privacy="strict" data-sync-revision="${data.revision}">
      <header class="public-tv-header">
        <div class="public-tv-brand">
          <span class="eye" aria-hidden="true"></span>
          <div class="public-tv-title-group">
            <h1>Clínica Oftalmológica</h1>
            <p>Sala de espera</p>
          </div>
        </div>

        <div class="public-tv-header-right">
          <span class="public-tv-status-pill" aria-label="Estado de pantalla">
            <span class="public-tv-status-dot" aria-hidden="true"></span>
            Pantalla de turnos activa
          </span>
          <div class="public-tv-clock" aria-label="Hora y fecha actuales">
            <time id="public-clock-time" class="public-clock-time tnum">${escHtml(clockNow.timeText)}</time>
            <span id="public-clock-date" class="public-clock-date">${escHtml(clockNow.dateText)}</span>
          </div>
        </div>
      </header>

      <div id="public-live-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>

      <main class="public-display-board public-tv-grid" aria-label="Tablero de llamados de turnos">
        <section class="public-tv-main-col" aria-labelledby="public-current-calls-title">
          <div class="public-tv-section-bar">
            <h2 id="public-current-calls-title">Turnos llamados actualmente</h2>
            <span class="public-tv-section-sub">${activeCount === 1 ? '1 llamado activo' : `${activeCount} llamados activos`}</span>
          </div>

          <div class="public-active-grid ${gridModeClass}" data-active-count="${activeCount}">
            ${activeCount ? data.activeCalls.map(call => `
              <article
                class="public-call-card ${call.isNewCall ? 'is-new-call' : ''} ${call.state === 'En atención' ? 'is-attending' : 'is-called'}"
                data-public-code="${escHtml(call.code)}"
                data-area="${escHtml(call.area)}"
              >
                <div class="public-call-card-head">
                  <span class="public-call-area-badge area-${call.area.toLowerCase()}">${escHtml(call.areaFullLabel)}</span>
                  <div class="public-call-badges">
                    ${call.isNewCall ? '<span class="public-new-call-badge">Nuevo llamado</span>' : ''}
                    <span class="public-call-state-badge ${call.state === 'En atención' ? 'is-attending' : 'is-called'}">${escHtml(call.state)}</span>
                  </div>
                </div>
                <div class="public-call-code">${escHtml(call.code)}</div>
                <p class="public-call-instruction">${escHtml(call.instruction)}</p>
                <div class="public-call-card-foot">
                  <span>Ventanilla: <strong>${escHtml(call.counter)}</strong></span>
                  <span>Llamado: <strong class="tnum">${escHtml(call.calledTime)}</strong></span>
                </div>
              </article>
            `).join('') : `
              <div class="public-empty-calls" id="public-empty-calls" role="status">
                <strong>No hay turnos llamados en este momento.</strong>
                <span>Espere a que su código aparezca en pantalla.</span>
              </div>
            `}
          </div>

          <section class="public-tv-summary-strip" aria-label="Resumen de espera en sala">
            <div class="public-summary-stat area-r">
              <span>En espera en Recepción</span>
              <strong class="tnum" data-waiting-count="R">${data.waitingSummary.R}</strong>
            </div>
            <div class="public-summary-stat area-c">
              <span>En espera en Caja</span>
              <strong class="tnum" data-waiting-count="C">${data.waitingSummary.C}</strong>
            </div>
            <div class="public-summary-stat">
              <span>Ventanillas activas</span>
              <strong class="tnum" data-active-counters="${data.activeCountersCount}">${data.activeCountersCount}</strong>
            </div>
            <div class="public-summary-stat">
              <span>Última actualización</span>
              <strong class="tnum" id="public-last-update">${escHtml(formatLastUpdateClock(data.updatedAt))}</strong>
            </div>
          </section>
        </section>

        <aside class="public-tv-side-col" aria-label="Colas próximas e historial reciente">
          <section class="public-side-panel public-tv-queues-panel" aria-labelledby="public-next-queues-title">
            <div class="public-side-panel-head">
              <h2 id="public-next-queues-title">Próximos turnos en espera</h2>
            </div>
            <div class="public-tv-queues-stack">
              ${renderWaitingAreaBlock('R', 'Próximos en Recepción')}
              ${renderWaitingAreaBlock('C', 'Próximos en Caja')}
            </div>
          </section>

          <section class="public-side-panel public-tv-recent-panel" aria-labelledby="public-recent-title">
            <div class="public-side-panel-head">
              <h2 id="public-recent-title">Últimos llamados</h2>
            </div>
            <ul class="public-recent-list" id="public-recent-list">
              ${data.recentCalls.length ? data.recentCalls.map(call => `
                <li class="public-recent-item" data-recent-code="${escHtml(call.code)}">
                  <span class="public-recent-code area-${call.area.toLowerCase()}">${escHtml(call.code)}</span>
                  <span class="public-recent-area">${escHtml(call.areaLabel)}</span>
                  <span class="public-recent-counter">${escHtml(call.counter)}</span>
                  <time class="public-recent-time tnum">${escHtml(call.calledTime)}</time>
                </li>
              `).join('') : '<li class="public-recent-empty">No hay llamados anteriores registrados.</li>'}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  `;

  if (motion.shouldAnimateModuleEntry('turnos', 'public-board')) {
    motion.animateStagger('.public-active-grid .public-call-card', { scope: 'turnos', maxItems: 4 });
  }
  motion.animateNumber(container.querySelector('[data-waiting-count="R"]'), { to: data.waitingSummary.R, scope: 'turnos' });
  motion.animateNumber(container.querySelector('[data-waiting-count="C"]'), { to: data.waitingSummary.C, scope: 'turnos' });
  motion.animateNumber(container.querySelector('[data-active-counters]'), { to: data.activeCountersCount, scope: 'turnos' });

  const announcer = container.querySelector('#public-live-announcer');
  if (announcer && data.lastEvent && ['call', 'recall'].includes(data.lastEvent.type) && data.lastEvent.code) {
    const evKey = `${data.lastEvent.type}:${data.lastEvent.code}:${data.lastEvent.counter || ''}:${data.lastEvent.callOrder || 0}`;
    if (evKey !== lastAnnouncedCallKey) {
      lastAnnouncedCallKey = evKey;
      announcer.textContent = `Nuevo llamado: turno ${data.lastEvent.code}. Diríjase a ${data.lastEvent.counter || 'ventanilla'}.`;
    }
  }

  startPublicDisplayClock();
}
