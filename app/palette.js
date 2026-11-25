import { canAccess as defaultCanAccess } from './auth.js';

export const PALETTE_GROUP_ORDER = ['pages', 'records', 'appointments', 'actions'];

export const PALETTE_GROUP_META = {
  pages: {
    key: 'pages',
    letter: 'A',
    label: 'PÁGINAS',
    ariaLabel: 'Páginas y módulos autorizados'
  },
  records: {
    key: 'records',
    letter: 'B',
    label: 'PACIENTES Y PROSPECTOS',
    ariaLabel: 'Pacientes y prospectos permitidos'
  },
  appointments: {
    key: 'appointments',
    letter: 'C',
    label: 'CITAS',
    ariaLabel: 'Citas operativas autorizadas'
  },
  actions: {
    key: 'actions',
    letter: 'D',
    label: 'ACCIONES',
    ariaLabel: 'Acciones frecuentes disponibles para tu rol'
  }
};

export const DEFAULT_GROUP_LIMITS = {
  pages: 5,
  records: 5,
  appointments: 5,
  actions: 6
};

export const MODULE_META = {
  dashboard: {
    title: 'Panel general de recepción',
    titleByRole: { admin: 'Panel general' },
    description: 'Resumen del día y estado operativo',
    keywords: 'inicio panel resumen metricas hoy recepcion',
    iconKey: 'home'
  },
  agenda: {
    title: 'Agenda y citas',
    titleByRole: { medico: 'Mi agenda médica' },
    description: 'Calendario de citas, horarios y turnos',
    keywords: 'citas calendario horarios turnos agenda reserva',
    iconKey: 'calendar'
  },
  pacientes: {
    title: 'Pacientes',
    titleByRole: { medico: 'Expedientes' },
    description: 'Directorio de pacientes y fichas operativas',
    keywords: 'expedientes fichas dni directorio pacientes',
    iconKey: 'users'
  },
  crm: {
    title: 'CRM de prospectos',
    description: 'Pipeline comercial, etapas y conversiones',
    keywords: 'prospectos leads embudo pipeline ventas oportunidades',
    iconKey: 'crm'
  },
  inbox: {
    title: 'Inbox de conversaciones',
    description: 'Mensajes entrantes por WhatsApp, Instagram, Facebook y Google',
    keywords: 'mensajes chat whatsapp instagram facebook google conversaciones',
    iconKey: 'inbox'
  },
  caja: {
    title: 'Caja y cobros',
    description: 'Órdenes pendientes, cobros, movimientos y cuadre',
    keywords: 'pagos cobros efectivo yape plin pos ordenes movimientos cuadre',
    iconKey: 'cash'
  },
  consulta: {
    title: 'Atención médica',
    titleByRole: { medico: 'Atención y diagnósticos' },
    description: 'Cola de consulta clínica y evaluación oftalmológica',
    keywords: 'consulta diagnostico atencion medico refraccion',
    iconKey: 'stethoscope'
  },
  estudios: {
    title: 'Cola de estudios',
    description: 'Mediciones técnicas, tonometría y optometría',
    keywords: 'estudios optometria tonometria examenes mediciones',
    iconKey: 'flask'
  },
  arm: {
    title: 'Centro de agentes ARM',
    description: 'Supervisión de recuperaciones, límites y trazabilidad',
    keywords: 'arm agentes recuperaciones inasistencias auditoria',
    iconKey: 'bot'
  },
  automations: {
    title: 'Automatizaciones',
    description: 'Reglas visuales y disparadores simulados locales',
    keywords: 'reglas flujos disparadores triggers automatizaciones',
    iconKey: 'flow'
  },
  'admin-medicos': {
    title: 'Médicos tratantes',
    description: 'Mantenimiento de profesionales, CMP y turnos',
    keywords: 'mantenimiento doctores medicos cmp rne especialidades',
    iconKey: 'doctor'
  },
  'admin-tecnicos': {
    title: 'Técnicos de optometría',
    description: 'Mantenimiento de personal técnico y exámenes',
    keywords: 'mantenimiento tecnicos optometristas personal',
    iconKey: 'flask'
  },
  'admin-usuarios': {
    title: 'Usuarios y accesos',
    description: 'Cuentas RBAC, roles y estado OTP',
    keywords: 'mantenimiento usuarios cuentas permisos roles accesos',
    iconKey: 'key'
  },
  'admin-servicios': {
    title: 'Servicios y tarifas',
    description: 'Catálogo de prestaciones clínicas y precios en S/',
    keywords: 'mantenimiento tarifario precios servicios catalogo',
    iconKey: 'tag'
  },
  'turnos-recepcion': {
    title: 'Turnos de recepción',
    description: 'Cola presencial R · Admisión y llegada de citas',
    keywords: 'turnos cola recepcion admision llamado ventanilla espera ticket',
    iconKey: 'clock'
  },
  'turnos-caja': {
    title: 'Turnos de caja',
    description: 'Cola presencial C · Órdenes y registro de cobros',
    keywords: 'turnos cola caja pagos cobro ventanilla espera ticket orden',
    iconKey: 'clock'
  },
  'turnos-supervision': {
    title: 'Turnos presenciales',
    description: 'Supervisión de colas R y C, tiempos e historial',
    keywords: 'turnos supervision colas recepcion caja tiempos espera auditoria',
    iconKey: 'clock'
  },
  perfil: {
    title: 'Mi perfil',
    description: 'Datos personales, contraseña demostrativa y preferencias visuales',
    keywords: 'perfil cuenta personal preferencias tema verde azul neutro accesibilidad contrasena',
    iconKey: 'doctor'
  }
};

const ROLE_ROUTE_ORDER = {
  admin: [
    'dashboard', 'agenda', 'pacientes', 'consulta', 'estudios',
    'crm', 'inbox', 'caja', 'arm', 'automations', 'turnos-supervision',
    'admin-medicos', 'admin-tecnicos', 'admin-usuarios', 'admin-servicios', 'perfil'
  ],
  medico: ['agenda', 'consulta', 'pacientes', 'perfil'],
  tecnico: ['estudios', 'pacientes', 'perfil'],
  recepcion: ['dashboard', 'agenda', 'pacientes', 'crm', 'inbox', 'turnos-recepcion', 'perfil'],
  caja: ['caja', 'turnos-caja', 'perfil']
};

const ROLE_ACTIONS_SPEC = {
  admin: [
    { actionId: 'new-appointment', title: 'Nueva cita', subtitle: 'Agenda y citas · Formulario real de reserva', requiresRoute: 'agenda', iconKey: 'plus', badgeText: 'Acción', keywords: 'reservar agendar crear cita nueva' },
    { actionId: 'new-patient', title: 'Registrar paciente', subtitle: 'Pacientes · Alta de ficha operativa', requiresRoute: 'pacientes', iconKey: 'users', badgeText: 'Acción', keywords: 'alta nuevo paciente crear ficha' },
    { actionId: 'new-lead', title: 'Nuevo prospecto', subtitle: 'CRM de prospectos · Registrar oportunidad', requiresRoute: 'crm', iconKey: 'crm', badgeText: 'Acción', keywords: 'crear lead prospecto oportunidad crm' },
    { actionId: 'open-crm', title: 'Abrir CRM', subtitle: 'Tablero comercial y pipeline', requiresRoute: 'crm', iconKey: 'crm', badgeText: 'Ir', keywords: 'pipeline tablero comercial' },
    { actionId: 'open-inbox', title: 'Abrir Inbox', subtitle: 'Bandeja multicanal de conversaciones', requiresRoute: 'inbox', iconKey: 'inbox', badgeText: 'Ir', keywords: 'mensajes chat conversaciones' },
    { actionId: 'open-arm', title: 'Revisar recuperaciones ARM pendientes', subtitleFn: ctx => `${ctx.pendingRecoveriesCount || 0} recuperaciones pendientes en Centro ARM`, requiresRoute: 'arm', iconKey: 'bot', badgeFn: ctx => `${ctx.pendingRecoveriesCount || 0} pend.`, keywords: 'arm recuperaciones inasistencia revisar' },
    { actionId: 'open-turns-supervision', title: 'Supervisar colas de turnos presenciales', subtitle: 'Ver métricas e historial de Recepción y Caja', requiresRoute: 'turnos-supervision', iconKey: 'clock', badgeText: 'Ir', keywords: 'supervisar turnos colas recepcion caja metricas historial' },
    { actionId: 'manage-doctors', title: 'Gestionar médicos', subtitle: 'Mantenimiento de médicos tratantes y turnos', requiresRoute: 'admin-medicos', iconKey: 'doctor', badgeText: 'Admin', keywords: 'administrar doctores cmp horarios' },
    { actionId: 'manage-technicians', title: 'Gestionar técnicos', subtitle: 'Mantenimiento de técnicos de optometría', requiresRoute: 'admin-tecnicos', iconKey: 'flask', badgeText: 'Admin', keywords: 'administrar optometria personal' },
    { actionId: 'manage-users', title: 'Gestionar usuarios', subtitle: 'Cuentas individuales, roles RBAC y acceso', requiresRoute: 'admin-usuarios', iconKey: 'key', badgeText: 'Admin', keywords: 'administrar cuentas roles permisos' },
    { actionId: 'manage-services', title: 'Gestionar servicios', subtitle: 'Tarifario oficial y duración estimada', requiresRoute: 'admin-servicios', iconKey: 'tag', badgeText: 'Admin', keywords: 'administrar tarifario precios servicios' }
  ],
  recepcion: [
    { actionId: 'new-appointment', title: 'Nueva cita', subtitle: 'Agenda y citas · Formulario real de reserva', requiresRoute: 'agenda', iconKey: 'plus', badgeText: 'Acción', keywords: 'reservar agendar crear cita nueva' },
    { actionId: 'new-patient', title: 'Registrar paciente', subtitle: 'Pacientes · Alta de ficha operativa', requiresRoute: 'pacientes', iconKey: 'users', badgeText: 'Acción', keywords: 'alta nuevo paciente crear ficha' },
    { actionId: 'new-lead', title: 'Nuevo prospecto', subtitle: 'CRM de prospectos · Registrar oportunidad', requiresRoute: 'crm', iconKey: 'crm', badgeText: 'Acción', keywords: 'crear lead prospecto oportunidad crm' },
    { actionId: 'open-inbox', title: 'Abrir Inbox', subtitle: 'Bandeja de mensajes multicanal', requiresRoute: 'inbox', iconKey: 'inbox', badgeText: 'Ir', keywords: 'mensajes chat whatsapp conversaciones' },
    { actionId: 'focus-patient-search', title: 'Buscar paciente', subtitle: 'Ir al buscador del directorio de pacientes', requiresRoute: 'pacientes', iconKey: 'search', badgeText: 'Ir', keywords: 'directorio expedientes buscar dni' },
    { actionId: 'open-crm', title: 'Abrir CRM', subtitle: 'Pipeline y seguimiento comercial', requiresRoute: 'crm', iconKey: 'crm', badgeText: 'Ir', keywords: 'pipeline tablero comercial' },
    { actionId: 'open-turns-recepcion', title: 'Abrir cola de turnos de recepción', subtitle: 'Gestionar tickets R en espera y ventanillas', requiresRoute: 'turnos-recepcion', iconKey: 'clock', badgeText: 'Ir', keywords: 'turnos cola recepcion abrir ventanilla r' },
    { actionId: 'call-next-recepcion', title: 'Llamar siguiente turno de recepción', subtitle: 'Llamar al próximo paciente en espera en cola R', requiresRoute: 'turnos-recepcion', iconKey: 'clock', badgeText: 'Llamar', keywords: 'llamar siguiente turno recepcion cola r' }
  ],
  medico: [
    { actionId: 'open-my-agenda', title: 'Abrir mi agenda', subtitle: 'Citas asignadas a tu consulta médica', requiresRoute: 'agenda', iconKey: 'calendar', badgeText: 'Ir', keywords: 'agenda medica mis citas turnos' },
    { actionId: 'continue-consult', title: 'Continuar atención pendiente', subtitleFn: ctx => ctx.nextDoctorAppLabel ? `Siguiente en turno: ${ctx.nextDoctorAppLabel}` : 'Ir a la cola de atención médica', requiresRoute: 'consulta', iconKey: 'stethoscope', badgeText: 'Atender', keywords: 'consulta espera paciente diagnostico continuar' },
    { actionId: 'focus-patient-search', title: 'Buscar paciente autorizado', subtitle: 'Ir al directorio de expedientes permitidos', requiresRoute: 'pacientes', iconKey: 'search', badgeText: 'Ir', keywords: 'expediente paciente ficha buscar' }
  ],
  tecnico: [
    { actionId: 'open-studies-queue', title: 'Abrir cola de estudios', subtitle: 'Mediciones de optometría y tonometría', requiresRoute: 'estudios', iconKey: 'flask', badgeText: 'Ir', keywords: 'cola estudios optometria tonometria' },
    { actionId: 'focus-patient-search', title: 'Buscar paciente autorizado', subtitle: 'Ir al directorio de pacientes permitidos', requiresRoute: 'pacientes', iconKey: 'search', badgeText: 'Ir', keywords: 'paciente ficha buscar' },
    { actionId: 'continue-study', title: 'Continuar estudio pendiente', subtitleFn: ctx => ctx.nextStudyLabel ? `Siguiente estudio: ${ctx.nextStudyLabel}` : 'Ir al estudio en espera o proceso', requiresRoute: 'estudios', iconKey: 'flask', badgeText: 'Registrar', keywords: 'medicion estudio pendiente continuar refraccion' }
  ],
  caja: [
    { actionId: 'cash-pending', title: 'Abrir órdenes pendientes', subtitleFn: ctx => `${ctx.pendingCashCount || 0} órdenes pendientes de cobro`, requiresRoute: 'caja', iconKey: 'cash', badgeText: 'Por cobrar', keywords: 'ordenes pendientes pagar cobros' },
    { actionId: 'cash-pay', title: 'Registrar cobro desde una orden existente', subtitle: 'Abrir formulario de pago de Caja', requiresRoute: 'caja', iconKey: 'plus', badgeText: 'Cobrar', keywords: 'cobrar efectivo yape pos plin registrar pago' },
    { actionId: 'cash-movements', title: 'Ver movimientos de Caja', subtitleFn: ctx => `${ctx.paidCashCount || 0} constancias emitidas registradas`, requiresRoute: 'caja', iconKey: 'cash', badgeText: 'Historial', keywords: 'movimientos constancias historial cobros' },
    { actionId: 'cash-open-turns', title: 'Abrir cola de turnos de Caja', subtitle: 'Gestionar tickets C y órdenes pendientes', requiresRoute: 'turnos-caja', iconKey: 'clock', badgeText: 'Ir', keywords: 'turnos cola caja abrir ventanilla c' },
    { actionId: 'cash-call-next-turn', title: 'Llamar siguiente turno de Caja', subtitle: 'Llamar al próximo ticket C en espera en Caja 1', requiresRoute: 'turnos-caja', iconKey: 'clock', badgeText: 'Llamar', keywords: 'llamar siguiente turno caja cola c cobro' }
  ]
};

/**
 * Normaliza texto eliminando mayúsculas, diacríticos y espacios redundantes.
 */
export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function maskDocument(doc) {
  const digits = String(doc || '').trim();
  if (!digits) return '••••';
  if (digits.length <= 4) return '••••';
  return `••••${digits.slice(-4)}`;
}

export function canViewPatientPhone(role) {
  return role === 'admin' || role === 'recepcion';
}

export function isPaletteActionAuthorized(role, actionId, canAccess = defaultCanAccess) {
  if (!role || !actionId) return false;
  const spec = (ROLE_ACTIONS_SPEC[role] || []).find(a => a.actionId === actionId);
  if (!spec) return false;
  return !spec.requiresRoute || Boolean(canAccess(role, spec.requiresRoute));
}

function makeTokens(text) {
  const norm = normalizeSearchText(text);
  return norm ? norm.split(/[\s·,/:-]+/).filter(Boolean) : [];
}

/**
 * Construye el índice completo filtrado estrictamente según el rol y permisos vigentes.
 * Nunca agrega rutas, prospectos, citas o campos sensibles fuera de RBAC.
 */
export function buildPaletteIndex({
  user,
  canAccess = defaultCanAccess,
  patients = [],
  appointments = [],
  leadsSummary = [],
  leadsRaw = [],
  doctorMatchNames = [],
  preliminaryStudies = [],
  pendingRecoveriesCount = 0,
  today = ''
} = {}) {
  if (!user || !user.role) {
    return {
      role: null,
      groups: { pages: [], records: [], appointments: [], actions: [] }
    };
  }

  const role = user.role;
  const allowPages = new Set(ROLE_ROUTE_ORDER[role] || []);
  const patientById = new Map(patients.map(p => [p.id, p]));
  const rawLeadById = new Map(leadsRaw.map(l => [l.id, l]));

  // A. PÁGINAS
  const pages = [];
  for (const routeId of allowPages) {
    if (routeId === 'paciente-detalle') continue;
    if (!canAccess(role, routeId)) continue;
    const meta = MODULE_META[routeId];
    if (!meta) continue;
    const title = meta.titleByRole?.[role] || meta.title;
    pages.push({
      id: `page:${routeId}`,
      group: 'pages',
      kind: 'page',
      route: routeId,
      iconKey: meta.iconKey,
      title,
      description: meta.description,
      actionLabel: 'Abrir módulo',
      normTitle: normalizeSearchText(title),
      titleTokens: makeTokens(title),
      normSecondary: normalizeSearchText(`${meta.description} ${meta.keywords} ${routeId}`),
      secondaryTokens: makeTokens(`${meta.description} ${meta.keywords} ${routeId}`)
    });
  }

  // B. PACIENTES Y PROSPECTOS
  const records = [];
  const canPatients = canAccess(role, 'pacientes') && canAccess(role, 'paciente-detalle');
  const canAgenda = canAccess(role, 'agenda');
  const allowPhone = canViewPatientPhone(role);
  const doctorSet = new Set(doctorMatchNames.filter(Boolean));

  if (canPatients) {
    for (const p of patients) {
      if (!p || !p.id) continue;
      const docMasked = maskDocument(p.doc);
      let statusOrAppointment = p.active === false ? 'Estado: Inactivo' : 'Estado: Activo';

      if (canAgenda) {
        const upcoming = appointments.find(a =>
          a.pid === p.id &&
          !['Atendida', 'Cancelada'].includes(a.status) &&
          (!today || a.date >= today) &&
          (role !== 'medico' || a.doctor === user.name || doctorSet.has(a.doctor))
        );
        if (upcoming) {
          statusOrAppointment = `Próxima cita: ${upcoming.date} ${upcoming.time}`;
        }
      }

      const phoneText = allowPhone ? (p.phone || '') : null;
      const metaParts = [`DNI ${docMasked}`];
      if (phoneText) metaParts.push(`Tel. ${phoneText}`);
      metaParts.push(statusOrAppointment);

      // Permitimos buscar por documento a roles con acceso a Pacientes, pero nunca a Caja
      const docSearchToken = p.doc ? `${p.doc} ${docMasked}` : '';
      const phoneSearchToken = phoneText || '';

      records.push({
        id: `patient:${p.id}`,
        group: 'records',
        kind: 'patient',
        patientId: p.id,
        iconKey: 'users',
        title: p.name,
        docMasked,
        phone: phoneText,
        statusOrAppointment,
        description: metaParts.join(' · '),
        badgeText: 'Paciente',
        actionLabel: 'Abrir ficha',
        normTitle: normalizeSearchText(p.name),
        titleTokens: makeTokens(p.name),
        normSecondary: normalizeSearchText(`paciente ${docSearchToken} ${phoneSearchToken} ${statusOrAppointment}`),
        secondaryTokens: makeTokens(`paciente ${docSearchToken} ${phoneSearchToken} ${statusOrAppointment}`)
      });
    }
  }

  const canCRM = canAccess(role, 'crm');
  if (canCRM) {
    for (const l of leadsSummary) {
      if (!l || !l.id) continue;
      const raw = rawLeadById.get(l.id) || {};
      const priority = raw.heat || 'Media';
      const nextAct = l.nextAction || raw.nextAction || 'Revisar seguimiento';
      const channel = l.origin || raw.origin || 'Web';
      const stage = l.stageName || 'Seguimiento';
      const metaParts = [
        `Canal: ${channel}`,
        `Etapa: ${stage}`,
        `Prioridad: ${priority}`,
        `Próx. acción: ${nextAct}`
      ];

      records.push({
        id: `lead:${l.id}`,
        group: 'records',
        kind: 'lead',
        leadId: l.id,
        iconKey: 'crm',
        title: l.name,
        origin: channel,
        stageName: stage,
        priority,
        nextAction: nextAct,
        description: metaParts.join(' · '),
        badgeText: 'Prospecto',
        actionLabel: 'Abrir seguimiento en CRM',
        normTitle: normalizeSearchText(l.name),
        titleTokens: makeTokens(l.name),
        normSecondary: normalizeSearchText(`prospecto crm ${channel} ${stage} ${priority} ${nextAct} ${l.reason || ''}`),
        secondaryTokens: makeTokens(`prospecto crm ${channel} ${stage} ${priority} ${nextAct} ${l.reason || ''}`)
      });
    }
  }

  // C. CITAS (Nunca Técnico ni Caja; Médico solo sus propias citas)
  const appointmentItems = [];
  if (canAgenda) {
    const visibleApps = appointments
      .filter(a => {
        if (!a || !a.id) return false;
        if (role === 'medico') {
          return a.doctor === user.name || doctorSet.has(a.doctor);
        }
        return true;
      })
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    for (const a of visibleApps) {
      const p = patientById.get(a.pid);
      const patientName = p?.name || `Paciente #${a.pid}`;
      const title = `${patientName} · ${a.date} ${a.time}`;
      const desc = `${a.service} · ${a.doctor} · Estado: ${a.status}`;
      appointmentItems.push({
        id: `app:${a.id}`,
        group: 'appointments',
        kind: 'appointment',
        appointmentId: a.id,
        iconKey: 'calendar',
        title,
        patientName,
        date: a.date,
        time: a.time,
        doctor: a.doctor,
        status: a.status,
        description: desc,
        badgeText: a.status,
        actionLabel: 'Abrir cita en Agenda',
        normTitle: normalizeSearchText(`${patientName} ${a.date} ${a.time}`),
        titleTokens: makeTokens(`${patientName} ${a.date} ${a.time}`),
        normSecondary: normalizeSearchText(`cita agenda ${a.service} ${a.doctor} ${a.status} ${a.date} ${a.time}`),
        secondaryTokens: makeTokens(`cita agenda ${a.service} ${a.doctor} ${a.status} ${a.date} ${a.time}`)
      });
    }
  }

  // D. ACCIONES FRECUENTES POR ROL
  const nextDoctorApp = role === 'medico'
    ? appointments.find(a =>
      (a.doctor === user.name || doctorSet.has(a.doctor)) &&
      ['En espera', 'Llegó'].includes(a.status) &&
      (!today || a.date === today)
    )
    : null;
  const nextDoctorPatient = nextDoctorApp ? patientById.get(nextDoctorApp.pid)?.name : null;

  const nextStudy = role === 'tecnico'
    ? (preliminaryStudies.find(s => s.status === 'En proceso' || s.status === 'En espera') || null)
    : null;

  const cashOrders = appointments.filter(a => a.order);
  const ctx = {
    pendingRecoveriesCount,
    nextDoctorAppLabel: nextDoctorPatient ? `${nextDoctorPatient} (${nextDoctorApp.time})` : null,
    nextStudyLabel: nextStudy ? `${nextStudy.patient} (${nextStudy.type})` : null,
    pendingCashCount: cashOrders.filter(a => !a.paid).length,
    paidCashCount: cashOrders.filter(a => a.paid).length
  };

  const actions = [];
  for (const spec of (ROLE_ACTIONS_SPEC[role] || [])) {
    if (spec.requiresRoute && !canAccess(role, spec.requiresRoute)) continue;
    const subtitle = spec.subtitleFn ? spec.subtitleFn(ctx) : spec.subtitle;
    const badgeText = spec.badgeFn ? spec.badgeFn(ctx) : spec.badgeText;
    actions.push({
      id: `action:${spec.actionId}`,
      group: 'actions',
      kind: 'action',
      actionId: spec.actionId,
      requiresRoute: spec.requiresRoute,
      iconKey: spec.iconKey,
      title: spec.title,
      description: subtitle,
      badgeText,
      actionLabel: 'Ejecutar',
      normTitle: normalizeSearchText(spec.title),
      titleTokens: makeTokens(spec.title),
      normSecondary: normalizeSearchText(`${subtitle} ${spec.keywords || ''}`),
      secondaryTokens: makeTokens(`${subtitle} ${spec.keywords || ''}`)
    });
  }

  return {
    role,
    groups: {
      pages,
      records,
      appointments: appointmentItems,
      actions
    }
  };
}

function scoreEntry(entry, normQuery) {
  if (!normQuery) return 1;
  const qTokens = makeTokens(normQuery);
  if (!qTokens.length) return 1;

  // Coincidencia exacta de título completo
  if (entry.normTitle === normQuery) return 120;
  // Prefijo exacto del título completo
  if (entry.normTitle.startsWith(normQuery)) return 95;

  // Coincidencia exacta de algún token principal o secundario (ej. DNI completo o palabra exacta)
  if (entry.titleTokens.includes(normQuery)) return 90;
  if (entry.secondaryTokens.includes(normQuery)) return 85;

  // Prefijo de token principal
  if (entry.titleTokens.some(t => t.startsWith(normQuery))) return 75;

  // Coincidencia parcial en título completo
  if (entry.normTitle.includes(normQuery)) return 60;

  // Todas las palabras buscadas presentes entre título y metadatos
  const fullText = `${entry.normTitle} ${entry.normSecondary}`;
  if (qTokens.every(tok => fullText.includes(tok))) {
    // Mayor puntaje si todas están en título
    if (qTokens.every(tok => entry.normTitle.includes(tok))) return 70;
    if (entry.secondaryTokens.some(t => t.startsWith(normQuery))) return 45;
    return 30;
  }

  return 0;
}

/**
 * Filtra, rankea y pagina los resultados agrupados según A..D sin alterar el orden jerárquico.
 */
export function searchPalette(index, rawQuery = '', {
  limits = DEFAULT_GROUP_LIMITS,
  expandedGroups = {}
} = {}) {
  const normQuery = normalizeSearchText(rawQuery);
  const groups = [];
  let flatCount = 0;
  let totalMatches = 0;
  let bestScore = -1;
  let bestMatchId = null;

  for (const groupKey of PALETTE_GROUP_ORDER) {
    const rawItems = index?.groups?.[groupKey] || [];
    const scored = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const s = scoreEntry(item, normQuery);
      if (s > 0) {
        scored.push({ item, score: s, order: i });
      }
    }

    if (normQuery) {
      scored.sort((a, b) => (b.score - a.score) || (a.order - b.order));
    }

    const total = scored.length;
    if (!total) continue;

    const baseLimit = limits[groupKey] ?? 5;
    const emptyCapByGroup = { pages: 2, records: 2, appointments: 1, actions: 2 };
    const initialCap = !normQuery ? Math.min(baseLimit, emptyCapByGroup[groupKey] ?? 2) : baseLimit;
    const isExpanded = Boolean(expandedGroups[groupKey]);
    const cap = isExpanded ? total : Math.min(total, initialCap);
    let items;
    if (!normQuery && !isExpanded && groupKey === 'records') {
      const patientsOnly = scored.filter(x => x.item.kind === 'patient').map(x => x.item);
      const leadsOnly = scored.filter(x => x.item.kind === 'lead').map(x => x.item);
      if (patientsOnly.length && leadsOnly.length) {
        const pCount = Math.min(patientsOnly.length, Math.max(1, Math.ceil(cap / 2)));
        const lCount = Math.min(leadsOnly.length, cap - pCount);
        const mixed = [...patientsOnly.slice(0, pCount), ...leadsOnly.slice(0, lCount)];
        if (mixed.length < cap) {
          for (const extra of patientsOnly.slice(pCount)) {
            if (mixed.length >= cap) break;
            mixed.push(extra);
          }
        }
        items = mixed;
      } else {
        items = scored.slice(0, cap).map(x => x.item);
      }
    } else {
      items = scored.slice(0, cap).map(x => x.item);
    }
    const remaining = Math.max(0, total - items.length);

    if (normQuery && items.length && scored[0].score > bestScore) {
      bestScore = scored[0].score;
      bestMatchId = scored[0].item.id;
    }

    totalMatches += total;
    flatCount += items.length;

    groups.push({
      key: groupKey,
      label: PALETTE_GROUP_META[groupKey].label,
      ariaLabel: PALETTE_GROUP_META[groupKey].ariaLabel,
      items,
      total,
      remaining,
      isExpanded
    });
  }

  return {
    query: String(rawQuery || ''),
    normalizedQuery: normQuery,
    groups,
    visibleCount: flatCount,
    totalMatches,
    bestMatchId
  };
}
