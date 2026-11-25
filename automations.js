// Motor puro de workflows visuales, agentes demostrativos dinámicos, validación, simulación,
// persistencia versionada, auditoría local y control de permisos para #automations y #arm.
// Nota: todas las operaciones externas (mensajería, esperas, aprobaciones simuladas) son
// demostrativas y no envían mensajes reales ni modifican expedientes clínicos o cobros de Caja.

export const AUTOMATIONS_STORAGE_KEY = 'clinica_automations_state_v2';
export const AUTOMATIONS_SCHEMA_VERSION = 2;

export const SIMULATION_DISCLAIMER = 'Simulación demostrativa. No se modificaron datos ni se enviaron mensajes reales.';

export const WORKFLOW_STATES = Object.freeze({
  draft: { key: 'draft', label: 'Borrador', badge: 'neutral' },
  validated: { key: 'validated', label: 'Validado', badge: 'info' },
  active: { key: 'active', label: 'Activo', badge: 'success' },
  paused: { key: 'paused', label: 'Pausado', badge: 'warn' },
  error: { key: 'error', label: 'Con errores', badge: 'danger' },
  archived: { key: 'archived', label: 'Archivado', badge: 'muted' }
});

export const AGENT_STATUS_LABELS = Object.freeze({
  draft: 'Borrador',
  active: 'Activo',
  paused: 'Pausado',
  supervision: 'Supervisión',
  archived: 'Archivado'
});

export const AGENT_AREAS_CATALOG = Object.freeze([
  'Recepción',
  'Agenda y Citas',
  'Caja y Cobranzas',
  'CRM Comercial',
  'Atención al Paciente',
  'Supervisión Operativa'
]);

export const AGENT_ICONS_CATALOG = Object.freeze([
  { key: 'calendar', label: 'Agenda y citas' },
  { key: 'user-check', label: 'Recepción y admisión' },
  { key: 'cash', label: 'Caja administrativa' },
  { key: 'chart', label: 'Seguimiento CRM' },
  { key: 'shield', label: 'Supervisión y control' },
  { key: 'message', label: 'Comunicación guiada' }
]);

export const AGENT_COLORS_CATALOG = Object.freeze([
  { key: 'emerald', label: 'Verde institucional', hex: '#0f766e', soft: '#ccfbf1' },
  { key: 'pine', label: 'Verde clínico', hex: '#15803d', soft: '#dcfce7' },
  { key: 'teal', label: 'Turquesa sereno', hex: '#0d9488', soft: '#ccfbf1' },
  { key: 'slate', label: 'Pizarra clínica', hex: '#334155', soft: '#e2e8f0' },
  { key: 'cobalt', label: 'Azul operativo', hex: '#1d4ed8', soft: '#dbeafe' },
  { key: 'amber', label: 'Ámbar preventivo', hex: '#b45309', soft: '#fef3c7' }
]);

export const ESCALATION_TARGETS_CATALOG = Object.freeze([
  'Coordinador de Recepción',
  'Jefatura de Caja',
  'Supervisor Operativo',
  'Dirección Médica (revisión humana)',
  'Administrador del Sistema'
]);

export const AGENT_CAPABILITIES_CATALOG = Object.freeze([
  { key: 'read_demo_appointments', label: 'Leer citas de demostración', category: 'Agenda', simulatedOnly: false },
  { key: 'check_demo_availability', label: 'Consultar horarios ficticios', category: 'Agenda', simulatedOnly: true },
  { key: 'propose_slots', label: 'Proponer turnos', category: 'Agenda', simulatedOnly: true },
  { key: 'request_booking', label: 'Solicitar reserva', category: 'Agenda', simulatedOnly: true },
  { key: 'register_confirmation', label: 'Registrar confirmación', category: 'Agenda', simulatedOnly: false },
  { key: 'prepare_reminder', label: 'Preparar recordatorio', category: 'Comunicación', simulatedOnly: true },
  { key: 'create_reception_task', label: 'Crear tarea para Recepción', category: 'Operación', simulatedOnly: false },
  { key: 'create_operational_task', label: 'Crear tarea operativa', category: 'Operación', simulatedOnly: false },
  { key: 'request_reschedule', label: 'Solicitar reprogramación', category: 'Agenda', simulatedOnly: true },
  { key: 'update_crm_stage', label: 'Actualizar etapa del CRM', category: 'CRM', simulatedOnly: false },
  { key: 'change_commercial_priority', label: 'Cambiar prioridad comercial', category: 'CRM', simulatedOnly: false },
  { key: 'apply_admin_tag', label: 'Aplicar etiqueta administrativa', category: 'CRM', simulatedOnly: false },
  { key: 'register_internal_note', label: 'Registrar nota interna', category: 'Operación', simulatedOnly: false },
  { key: 'notify_internally', label: 'Notificar internamente', category: 'Operación', simulatedOnly: false },
  { key: 'route_to_reception', label: 'Derivar a Recepción', category: 'Derivación', simulatedOnly: false },
  { key: 'route_to_caja', label: 'Derivar a Caja', category: 'Derivación', simulatedOnly: false },
  { key: 'escalate_to_human', label: 'Derivar a una persona', category: 'Seguridad', simulatedOnly: false },
  { key: 'review_audit', label: 'Revisar auditoría', category: 'Supervisión', simulatedOnly: false },
  { key: 'register_simulated_approval', label: 'Registrar aprobación simulada', category: 'Seguridad', simulatedOnly: true }
]);

export const AGENT_FORBIDDEN_CATALOG = Object.freeze([
  { key: 'emit_diagnosis', label: 'Emitir diagnósticos médicos', severity: 'critical' },
  { key: 'interpret_symptoms', label: 'Interpretar síntomas clínicos', severity: 'critical' },
  { key: 'prescribe_treatment', label: 'Indicar tratamientos o recetas', severity: 'critical' },
  { key: 'modify_medical_record', label: 'Modificar historia clínica', severity: 'critical' },
  { key: 'decide_medical_control', label: 'Decidir controles médicos', severity: 'critical' },
  { key: 'execute_real_payment', label: 'Ejecutar cobros o devoluciones reales', severity: 'critical' },
  { key: 'delete_caja_transactions', label: 'Eliminar transacciones de Caja', severity: 'critical' },
  { key: 'send_unauthorized_external', label: 'Enviar mensajes externos reales sin autorización', severity: 'critical' },
  { key: 'expose_sensitive_data', label: 'Exponer datos personales o clínicos públicamente', severity: 'critical' }
]);

export const TRIGGER_PRESETS = Object.freeze([
  { key: 'cita_creada', label: 'Cita creada', area: 'Agenda y Citas', executionMode: 'funcional', description: 'Se activa cuando se registra una nueva cita administrativa en el demo.' },
  { key: 'cita_modificada', label: 'Cita modificada', area: 'Agenda y Citas', executionMode: 'funcional', description: 'Se activa al reprogramar horario o médico de una cita existente.' },
  { key: 'cita_cancelada', label: 'Cita cancelada', area: 'Agenda y Citas', executionMode: 'funcional', description: 'Detecta la cancelación de una cita para coordinar recuperación.' },
  { key: 'paciente_no_asistio', label: 'Paciente no asistió', area: 'Recepción', executionMode: 'funcional', description: 'Detecta una inasistencia marcada en Recepción o Agenda.' },
  { key: 'paciente_llego', label: 'Paciente llegó', area: 'Recepción', executionMode: 'funcional', description: 'Detecta el registro de llegada presencial en recepción o autoservicio.' },
  { key: 'pago_pendiente', label: 'Pago pendiente', area: 'Caja y Cobranzas', executionMode: 'funcional', description: 'Detecta una orden pendiente de regularización administrativa en Caja.' },
  { key: 'pago_confirmado', label: 'Pago confirmado', area: 'Caja y Cobranzas', executionMode: 'funcional', description: 'Se activa tras registrar confirmación de pago en demostración.' },
  { key: 'mensaje_recibido', label: 'Mensaje recibido', area: 'Atención al Paciente', executionMode: 'simulado', description: 'Simula la recepción de una consulta entrante por canal externo.' },
  { key: 'cambio_etapa_crm', label: 'Cambio de etapa en CRM', area: 'CRM Comercial', executionMode: 'funcional', description: 'Responde cuando una oportunidad comercial cambia de etapa en el embudo.' },
  { key: 'inicio_manual', label: 'Inicio manual', area: 'Supervisión Operativa', executionMode: 'funcional', description: 'Ejecución demostrativa iniciada manualmente por un operador autorizado.' }
]);

export const NODE_CATEGORIES = Object.freeze([
  { key: 'trigger', label: 'Disparadores', color: '#0f766e', soft: '#f0fdfa', description: 'Eventos de entrada que inician el workflow (máximo 1).' },
  { key: 'condition', label: 'Condiciones', color: '#b45309', soft: '#fffbeb', description: 'Evaluaciones Sí / No para ramificar el recorrido.' },
  { key: 'control', label: 'Control y seguridad', color: '#1d4ed8', soft: '#eff6ff', description: 'Esperas aceleradas y puntos de aprobación humana.' },
  { key: 'agent', label: 'Agentes', color: '#047857', soft: '#ecfdf5', description: 'Pasos delegados a un perfil demostrativo de agente.' },
  { key: 'action', label: 'Acciones', color: '#334155', soft: '#f8fafc', description: 'Tareas internas, notas, recordatorios simulados y derivaciones.' },
  { key: 'end', label: 'Finalización', color: '#64748b', soft: '#f1f5f9', description: 'Cierres controlados o bloqueos por seguridad clínica.' }
]);

// 14 tipos de nodos funcionales y no decorativos
export const NODE_CATALOG = Object.freeze([
  {
    type: 'trigger_event',
    category: 'trigger',
    label: 'Disparador de evento',
    shortLabel: 'Disparador',
    executionMode: 'funcional',
    description: 'Punto de inicio único del workflow según evento operativo o simulado.',
    helpText: 'Cada workflow debe comenzar con exactamente un nodo disparador y nunca recibe conexiones de entrada.',
    inputs: [],
    outputs: ['out'],
    defaultConfig: { triggerKey: 'paciente_no_asistio', area: 'Recepción' }
  },
  {
    type: 'condition_branch',
    category: 'condition',
    label: 'Condición Sí / No',
    shortLabel: 'Condición',
    executionMode: 'funcional',
    description: 'Evalúa estado de cita, área, prioridad, etiqueta o indicador de seguridad.',
    helpText: 'Requiere conectar obligatoriamente las dos salidas: Sí y No.',
    inputs: ['in'],
    outputs: ['yes', 'no'],
    defaultConfig: { field: 'hasNewAppointment', operator: 'equals', expectedValue: 'true', branchSummary: 'Comprobar estado de cita' }
  },
  {
    type: 'condition_group',
    category: 'condition',
    label: 'Grupo de condiciones (AND/OR)',
    shortLabel: 'Grupo AND/OR',
    executionMode: 'funcional',
    description: 'Combina múltiples reglas (estado, área, prioridad, etiqueta u horario) con AND / OR.',
    helpText: 'Evalúa 2 o más criterios y bifurca el recorrido en ramas Sí y No.',
    inputs: ['in'],
    outputs: ['yes', 'no'],
    defaultConfig: {
      combinator: 'AND',
      rules: [
        { field: 'withinBusinessHours', operator: 'equals', expectedValue: 'true' },
        { field: 'area', operator: 'equals', expectedValue: 'Recepción' }
      ]
    }
  },
  {
    type: 'wait_delay',
    category: 'control',
    label: 'Esperar tiempo simulado',
    shortLabel: 'Esperar',
    executionMode: 'simulado',
    description: 'Representa una espera operativa acelerada (ej. 10 min → 1.2 s en demo).',
    helpText: 'Durante la simulación la espera se acelera para no bloquear la demostración.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { durationMinutes: 10, acceleratedMs: 1200 }
  },
  {
    type: 'human_approval',
    category: 'control',
    label: 'Solicitar aprobación humana',
    shortLabel: 'Aprobación humana',
    executionMode: 'funcional',
    description: 'Pausa para validación de una persona antes de ejecutar pasos sensibles.',
    helpText: 'Garantiza intervención humana explícita antes de continuar.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { approverRole: 'Coordinador de Recepción', approvalPrompt: 'Confirmar acción antes de preparar recordatorio al paciente', timeoutHours: 4, autoDecisionInDemo: 'pause_or_approve' }
  },
  {
    type: 'agent_execute',
    category: 'agent',
    label: 'Ejecutar con agente',
    shortLabel: 'Agente',
    executionMode: 'simulado',
    description: 'Asigna un perfil de agente demostrativo con capacidad validada y límites.',
    helpText: 'El agente debe existir, no estar archivado y contar con la capacidad requerida.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { agentId: 2, requiredCapability: 'prepare_reminder', taskSummary: 'Analizar caso administrativo y preparar borrador de seguimiento' }
  },
  {
    type: 'agent_escalate',
    category: 'agent',
    label: 'Escalar a otro agente o persona',
    shortLabel: 'Escalar',
    executionMode: 'funcional',
    description: 'Transfiere el caso a un agente supervisor o responsable humano.',
    helpText: 'Útil cuando se agotan intentos o aparece una excepción operativa.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { escalationMode: 'human', targetRole: 'Supervisor Operativo', targetAgentId: 5, reason: 'Requiere criterio operativo humano' }
  },
  {
    type: 'action_task',
    category: 'action',
    label: 'Crear tarea interna',
    shortLabel: 'Crear tarea',
    executionMode: 'funcional',
    description: 'Genera una tarea interna asignable a Recepción, Caja u Operación.',
    helpText: 'En simulación describe la tarea que se habría creado sin alterar colas reales.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { targetArea: 'Recepción', taskTitle: 'Contactar paciente para confirmar o reprogramar cita', priority: 'Alta' }
  },
  {
    type: 'action_reminder',
    category: 'action',
    label: 'Preparar recordatorio',
    shortLabel: 'Recordatorio',
    executionMode: 'simulado',
    description: 'Prepara un mensaje recordatorio demostrativo (WhatsApp, SMS o correo simulado).',
    helpText: 'No envía mensajes externos reales en esta demostración local.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { channel: 'WhatsApp (simulado)', template: 'Estimado paciente, te ayudamos a coordinar tu próxima cita en Clínica Oftalmológica.' }
  },
  {
    type: 'action_crm_update',
    category: 'action',
    label: 'Actualizar CRM / prioridad / etiqueta',
    shortLabel: 'Actualizar CRM',
    executionMode: 'funcional',
    description: 'Actualiza etapa comercial simulada, prioridad o etiqueta administrativa.',
    helpText: 'No altera datos clínicos ni realiza diagnósticos.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { operation: 'update_stage', stage: 'En seguimiento', priority: 'Alta', tag: 'Seguimiento demo' }
  },
  {
    type: 'action_internal_note',
    category: 'action',
    label: 'Registrar nota o notificación interna',
    shortLabel: 'Nota / Aviso',
    executionMode: 'funcional',
    description: 'Registra una nota administrativa o aviso interno para el equipo.',
    helpText: 'Mantiene trazabilidad sin exponer datos clínicos sensibles.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { notifyArea: 'Recepción', noteText: 'Seguimiento administrativo registrado para revisión interna.' }
  },
  {
    type: 'action_route_area',
    category: 'action',
    label: 'Derivar a Recepción o Caja',
    shortLabel: 'Derivar área',
    executionMode: 'funcional',
    description: 'Enruta el caso administrativo hacia Recepción o Caja según corresponda.',
    helpText: 'Mantiene estricta separación entre Recepción y Caja.',
    inputs: ['in'],
    outputs: ['out'],
    defaultConfig: { destinationArea: 'Caja', handoffNote: 'Derivar para orientación administrativa en ventanilla.' }
  },
  {
    type: 'end_success',
    category: 'end',
    label: 'Finalizar flujo',
    shortLabel: 'Finalizar',
    executionMode: 'funcional',
    description: 'Cierre ordenado del recorrido (finalizado correctamente o sin acción).',
    helpText: 'Nodo terminal: no admite conexiones de salida.',
    inputs: ['in'],
    outputs: [],
    defaultConfig: { outcome: 'completed', summaryNote: 'Recorrido finalizado correctamente.' }
  },
  {
    type: 'end_security_block',
    category: 'end',
    label: 'Bloquear por seguridad',
    shortLabel: 'Bloqueo seguridad',
    executionMode: 'funcional',
    description: 'Detiene la automatización ante contenido clínico/financiero sensible y deriva a persona.',
    helpText: 'Protege diagnósticos, tratamientos, historia clínica y cobros reales.',
    inputs: ['in'],
    outputs: [],
    defaultConfig: { mode: 'security_block', humanTarget: 'Dirección Médica (revisión humana)', blockReason: 'Se detectó contenido clínico o financiero restringido. Derivado a personal autorizado sin exponer datos.' }
  }
]);

export const CONDITION_FIELDS_CATALOG = Object.freeze([
  { key: 'hasNewAppointment', label: '¿El paciente ya tiene una nueva cita?', type: 'boolean', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] },
  { key: 'appointmentStatus', label: 'Estado de la cita', type: 'select', options: [{ value: 'Confirmada', label: 'Confirmada' }, { value: 'Pendiente', label: 'Pendiente' }, { value: 'Ausente', label: 'Ausente' }, { value: 'Cancelada', label: 'Cancelada' }, { value: 'Reprogramada', label: 'Reprogramada' }] },
  { key: 'area', label: 'Área responsable', type: 'select', options: AGENT_AREAS_CATALOG.map(a => ({ value: a, label: a })) },
  { key: 'priority', label: 'Prioridad operativa', type: 'select', options: [{ value: 'Alta', label: 'Alta' }, { value: 'Media', label: 'Media' }, { value: 'Baja', label: 'Baja' }] },
  { key: 'tag', label: 'Etiqueta administrativa', type: 'text', options: [{ value: 'VIP', label: 'VIP' }, { value: 'Control', label: 'Control' }, { value: 'Pago pendiente', label: 'Pago pendiente' }, { value: 'Reprogramar', label: 'Reprogramar' }] },
  { key: 'withinBusinessHours', label: 'Dentro de horario de atención', type: 'boolean', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] },
  { key: 'sensitiveContent', label: 'Incluye consulta clínica o cobro real', type: 'boolean', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] },
  { key: 'hasPhoneConsent', label: 'Tiene teléfono y autorización demo', type: 'boolean', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] }
]);

// Palabras clave restringidas para evitar automatizar acciones clínicas o financieras reales
export const RESTRICTED_CLINICAL_FINANCIAL_KEYWORDS = Object.freeze([
  'diagnóstico',
  'diagnostico',
  'diagnosticar',
  'síntoma',
  'sintoma',
  'receta',
  'prescripción',
  'prescripcion',
  'tratamiento médico',
  'indicación médica',
  'indicacion medica',
  'historia clínica',
  'historia clinica',
  'decisión clínica',
  'decision clinica',
  'cobro real',
  'cobrar tarjeta',
  'devolución real',
  'devolucion real',
  'eliminar transacción',
  'eliminar transaccion',
  'modificar boleta'
]);

export const AUDIT_EVENT_TYPES = Object.freeze({
  agent_created: { label: 'Creación de agente', tone: 'good' },
  agent_updated: { label: 'Edición de agente', tone: 'info' },
  agent_status_changed: { label: 'Pausa o reactivación de agente', tone: 'warn' },
  workflow_created: { label: 'Creación de workflow', tone: 'good' },
  workflow_saved: { label: 'Guardado de borrador', tone: 'info' },
  workflow_validated: { label: 'Validación de workflow', tone: 'info' },
  workflow_simulated: { label: 'Simulación de workflow', tone: 'info' },
  workflow_activated: { label: 'Activación de workflow', tone: 'good' },
  workflow_paused: { label: 'Pausa de workflow', tone: 'warn' },
  workflow_duplicated: { label: 'Duplicación de workflow', tone: 'info' },
  workflow_archived: { label: 'Archivado de workflow', tone: 'warn' },
  version_changed: { label: 'Cambio de versión', tone: 'info' },
  validation_error: { label: 'Error de validación', tone: 'bad' },
  security_block: { label: 'Bloqueo de seguridad', tone: 'bad' },
  unauthorized_attempt: { label: 'Intento no autorizado', tone: 'bad' },
  storage_recovered: { label: 'Recuperación de almacenamiento', tone: 'warn' },
  demo_reset: { label: 'Restablecimiento de demo', tone: 'warn' }
});

export const SIMULATION_SCENARIOS = Object.freeze([
  {
    id: 'sc-noshow-no',
    label: 'Rama No: Paciente sin nueva cita (requiere seguimiento)',
    compatibleTriggers: ['paciente_no_asistio', 'inicio_manual'],
    description: 'Paciente ejemplo ausente que aún no ha reprogramado cita.',
    context: {
      patientAlias: 'Paciente demo #P-408 (datos ficticios)',
      appointmentCode: 'CITA-DEMO-912',
      appointmentStatus: 'Ausente',
      hasNewAppointment: false,
      area: 'Recepción',
      priority: 'Alta',
      tag: 'Reprogramar',
      withinBusinessHours: true,
      sensitiveContent: false,
      hasPhoneConsent: true,
      approvalGranted: true
    }
  },
  {
    id: 'sc-noshow-yes',
    label: 'Rama Sí: Paciente ya tiene nueva cita programada',
    compatibleTriggers: ['paciente_no_asistio', 'inicio_manual'],
    description: 'Paciente ejemplo que ya reprogramó en recepción; cierra sin duplicar recordatorio.',
    context: {
      patientAlias: 'Paciente demo #P-411 (datos ficticios)',
      appointmentCode: 'CITA-DEMO-919',
      appointmentStatus: 'Reprogramada',
      hasNewAppointment: true,
      area: 'Recepción',
      priority: 'Media',
      tag: 'Control',
      withinBusinessHours: true,
      sensitiveContent: false,
      hasPhoneConsent: true,
      approvalGranted: true
    }
  },
  {
    id: 'sc-security-clinical',
    label: 'Escenario sensible: Mensaje con síntomas o pregunta médica',
    compatibleTriggers: ['mensaje_recibido', 'inicio_manual'],
    description: 'Simula la detección de contenido clínico sensible y activa Bloquear por seguridad.',
    context: {
      patientAlias: 'Contacto demo #M-204 (datos ficticios)',
      appointmentCode: 'SIN-CITA-DEMO',
      appointmentStatus: 'Pendiente',
      hasNewAppointment: false,
      area: 'Atención al Paciente',
      priority: 'Alta',
      tag: 'Revisión humana',
      withinBusinessHours: true,
      sensitiveContent: true,
      hasPhoneConsent: false,
      approvalGranted: false
    }
  },
  {
    id: 'sc-caja-pending',
    label: 'Escenario Caja: Orden pendiente en horario hábil',
    compatibleTriggers: ['pago_pendiente', 'pago_confirmado', 'inicio_manual'],
    description: 'Simula una orden administrativa pendiente para derivación a Caja sin cobro automático.',
    context: {
      patientAlias: 'Paciente demo #C-109 (datos ficticios)',
      appointmentCode: 'ORD-DEMO-304',
      appointmentStatus: 'Confirmada',
      hasNewAppointment: true,
      area: 'Caja y Cobranzas',
      priority: 'Alta',
      tag: 'Pago pendiente',
      withinBusinessHours: true,
      sensitiveContent: false,
      hasPhoneConsent: true,
      approvalGranted: true
    }
  },
  {
    id: 'sc-generic-crm',
    label: 'Escenario general: Cita / CRM / Llegada estándar',
    compatibleTriggers: ['cita_creada', 'cita_modificada', 'cita_cancelada', 'paciente_llego', 'cambio_etapa_crm', 'inicio_manual'],
    description: 'Datos ficticios estándar compatibles con agenda, llegada o CRM.',
    context: {
      patientAlias: 'Prospecto demo #CRM-88 (datos ficticios)',
      appointmentCode: 'CITA-DEMO-950',
      appointmentStatus: 'Confirmada',
      hasNewAppointment: false,
      area: 'CRM Comercial',
      priority: 'Media',
      tag: 'Control',
      withinBusinessHours: true,
      sensitiveContent: false,
      hasPhoneConsent: true,
      approvalGranted: true
    }
  }
]);

// 5 agentes iniciales (4 activos + 1 en supervisión) para preservar retrocompatibilidad con ARM
export const INITIAL_AGENTS = Object.freeze([
  {
    id: 1,
    key: 'receptionist',
    name: 'Recepcionista virtual',
    short: 'RV',
    description: 'Asiste consultas administrativas de bienvenida y orientación de citas simuladas.',
    purpose: 'Coordina consultas administrativas y reservas simuladas.',
    area: 'Recepción',
    icon: 'user-check',
    color: 'emerald',
    status: 'active',
    channel: 'Inbox y Agenda',
    handled: 18,
    escalations: 2,
    capabilities: ['check_demo_availability', 'propose_slots', 'request_booking', 'route_to_reception', 'escalate_to_human'],
    forbiddenActions: ['interpret_symptoms', 'emit_diagnosis', 'modify_medical_record'],
    tools: ['Consultar horarios ficticios', 'Proponer turnos', 'Solicitar reserva', 'Derivar a una persona'],
    blocked: ['Interpretar síntomas', 'Emitir diagnósticos', 'Acceder a historias clínicas'],
    escalationTarget: 'Coordinador de Recepción',
    schedule: 'Lun-Sáb 08:00 - 20:00',
    maxAttempts: 2,
    retryDelay: 10,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-27T11:20:00.000Z',
    version: 1
  },
  {
    id: 2,
    key: 'followup',
    name: 'Seguimiento de pacientes',
    short: 'SP',
    description: 'Perfil demostrativo de Recuperación de pacientes para inasistencias y confirmaciones.',
    purpose: 'Organiza confirmaciones, recuperación de pacientes ausentes y recordatorios ya programados.',
    area: 'Agenda y Citas',
    icon: 'calendar',
    color: 'pine',
    status: 'active',
    channel: 'Agenda',
    handled: 14,
    escalations: 1,
    capabilities: ['read_demo_appointments', 'register_confirmation', 'prepare_reminder', 'create_reception_task', 'request_reschedule', 'register_simulated_approval', 'escalate_to_human'],
    forbiddenActions: ['decide_medical_control', 'prescribe_treatment', 'modify_medical_record'],
    tools: ['Leer citas de demostración', 'Registrar confirmación', 'Preparar recordatorio', 'Crear tarea para Recepción'],
    blocked: ['Decidir controles médicos', 'Modificar indicaciones clínicas'],
    escalationTarget: 'Coordinador de Recepción',
    schedule: 'Lun-Sáb 08:00 - 19:00',
    maxAttempts: 3,
    retryDelay: 15,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-27T11:20:00.000Z',
    version: 1
  },
  {
    id: 3,
    key: 'commercial',
    name: 'Asesor comercial',
    short: 'AC',
    description: 'Ordena seguimiento de prospectos y prioridades del embudo comercial.',
    purpose: 'Explica servicios administrativos y registra interés sin realizar indicaciones médicas.',
    area: 'CRM Comercial',
    icon: 'chart',
    color: 'teal',
    status: 'active',
    channel: 'CRM e Inbox',
    handled: 11,
    escalations: 1,
    capabilities: ['check_demo_availability', 'update_crm_stage', 'change_commercial_priority', 'apply_admin_tag', 'create_operational_task', 'escalate_to_human'],
    forbiddenActions: ['prescribe_treatment', 'emit_diagnosis', 'expose_sensitive_data'],
    tools: ['Consultar servicios ficticios', 'Actualizar etapa del CRM', 'Crear próxima acción'],
    blocked: ['Prometer resultados', 'Recomendar procedimientos clínicos'],
    escalationTarget: 'Supervisor Operativo',
    schedule: 'Lun-Vie 09:00 - 19:00',
    maxAttempts: 2,
    retryDelay: 30,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-27T11:20:00.000Z',
    version: 1
  },
  {
    id: 4,
    key: 'administrative',
    name: 'Coordinador administrativo',
    short: 'CA',
    description: 'Organiza reprogramaciones, lista de espera y derivaciones administrativas de Recepción o Caja.',
    purpose: 'Ordena reprogramaciones, lista de espera y tareas operativas.',
    area: 'Caja y Cobranzas',
    icon: 'cash',
    color: 'slate',
    status: 'active',
    channel: 'Agenda y Caja',
    handled: 9,
    escalations: 0,
    capabilities: ['request_reschedule', 'create_operational_task', 'check_demo_availability', 'route_to_caja', 'route_to_reception', 'register_internal_note', 'notify_internally'],
    forbiddenActions: ['execute_real_payment', 'delete_caja_transactions', 'modify_medical_record'],
    tools: ['Solicitar reprogramación', 'Crear tarea operativa', 'Revisar disponibilidad ficticia'],
    blocked: ['Registrar cobros', 'Consultar información clínica'],
    escalationTarget: 'Jefatura de Caja',
    schedule: 'Lun-Sáb 08:00 - 18:00',
    maxAttempts: 2,
    retryDelay: 20,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-27T11:20:00.000Z',
    version: 1
  },
  {
    id: 5,
    key: 'supervisor',
    name: 'Supervisor ARM',
    short: 'SA',
    description: 'Supervisa derivaciones humanas, bloqueos de seguridad y trazabilidad local.',
    purpose: 'Supervisa derivaciones, bloqueos y actividad de los demás agentes.',
    area: 'Supervisión Operativa',
    icon: 'shield',
    color: 'cobalt',
    status: 'supervision',
    channel: 'Centro ARM',
    handled: 5,
    escalations: 3,
    capabilities: ['review_audit', 'register_simulated_approval', 'escalate_to_human', 'notify_internally', 'register_internal_note'],
    forbiddenActions: ['emit_diagnosis', 'modify_medical_record', 'execute_real_payment', 'delete_caja_transactions'],
    tools: ['Revisar auditoría', 'Registrar aprobación simulada', 'Pausar agentes'],
    blocked: ['Autorizar decisiones clínicas', 'Modificar expedientes'],
    escalationTarget: 'Administrador del Sistema',
    schedule: '24/7 (solo supervisión)',
    maxAttempts: 1,
    retryDelay: 5,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-27T11:20:00.000Z',
    version: 1
  }
]);

export const INITIAL_AUTOMATIONS = Object.freeze([
  { id: 1, workflowId: 'wf-migrated-reminder', name: 'Recordatorio de cita', trigger: '24 h antes de cita confirmada', action: 'Prepara mensaje demostrativo por WhatsApp o SMS', agent: 'followup', active: true, lastRun: '27 oct · 09:30' },
  { id: 2, workflowId: 'wf-noshow-recovery', name: 'Recuperación de inasistencia', trigger: 'Cita marcada como No asistió', action: 'Propone reprogramación y crea seguimiento en Recepción', agent: 'receptionist', active: true, lastRun: '27 oct · 10:15' },
  { id: 3, workflowId: 'wf-security-guardrail', name: 'Escalado de consultas clínicas', trigger: 'Pregunta sobre síntomas, medicamentos o evolución', action: 'Bloquea respuesta automática y deriva a personal autorizado', agent: 'supervisor', active: true, lastRun: '27 oct · 11:05' }
]);

// Workflow precargado principal + flujos migrados y demostrativos
export const INITIAL_WORKFLOWS = Object.freeze([
  {
    id: 'wf-noshow-recovery',
    name: 'Recuperación inteligente de pacientes ausentes',
    description: 'Evalúa inasistencias tras 10 min simulados, verifica si ya reprogramó y solicita aprobación humana antes de preparar recordatorio y tarea para Recepción.',
    area: 'Recepción',
    status: 'active',
    version: 1,
    primaryAgentId: 2,
    escalationTarget: 'Coordinador de Recepción',
    createdBy: 'Administrador',
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-27T11:20:00.000Z',
    validatedAt: '2026-10-27T11:15:00.000Z',
    activatedAt: '2026-10-27T11:20:00.000Z',
    hasUnsavedChanges: false,
    publishedSnapshot: null,
    nodes: [
      { id: 'nw-1', type: 'trigger_event', label: 'Paciente no asistió', description: 'Disparador operativo al registrar inasistencia.', position: { x: 40, y: 56 }, config: { triggerKey: 'paciente_no_asistio', area: 'Recepción' }, validationState: 'valid' },
      { id: 'nw-2', type: 'wait_delay', label: 'Esperar 10 minutos', description: 'Espera de cortesía acelerada en demostración (~1.2 s).', position: { x: 290, y: 56 }, config: { durationMinutes: 10, acceleratedMs: 1200 }, validationState: 'valid' },
      { id: 'nw-3', type: 'condition_branch', label: '¿El paciente ya tiene una nueva cita?', description: 'Comprueba si el paciente reprogramó en recepción o autoservicio.', position: { x: 540, y: 56 }, config: { field: 'hasNewAppointment', operator: 'equals', expectedValue: 'true', branchSummary: 'Verificar nueva cita en agenda demo' }, validationState: 'valid' },
      { id: 'nw-4', type: 'end_success', label: 'Finalizar', description: 'El paciente ya cuenta con nueva cita; no requiere seguimiento.', position: { x: 820, y: 40 }, config: { outcome: 'no_action', summaryNote: 'Cita ya reprogramada; se evitó un recordatorio redundante.' }, validationState: 'valid' },
      { id: 'nw-5', type: 'agent_execute', label: 'Ejecutar con agente: “Recuperación de pacientes”', description: 'Perfil demostrativo Seguimiento / Recuperación de pacientes.', position: { x: 540, y: 230 }, config: { agentId: 2, requiredCapability: 'prepare_reminder', taskSummary: 'Evaluar contexto administrativo de inasistencia sobre agenda de demostración' }, validationState: 'valid' },
      { id: 'nw-6', type: 'action_reminder', label: 'Preparar recordatorio', description: 'Genera borrador demostrativo de mensaje cordial de reprogramación.', position: { x: 820, y: 230 }, config: { channel: 'WhatsApp (simulado)', template: 'Hola, notamos que no pudiste asistir hoy. Podemos ayudarte a elegir un nuevo horario en Clínica Oftalmológica.' }, validationState: 'valid' },
      { id: 'nw-7', type: 'human_approval', label: 'Solicitar aprobación humana', description: 'Recepción revisa y autoriza antes de generar seguimiento.', position: { x: 540, y: 392 }, config: { approverRole: 'Coordinador de Recepción', approvalPrompt: '¿Autorizar seguimiento de reprogramación en la demostración?', timeoutHours: 4, autoDecisionInDemo: 'approve' }, validationState: 'valid' },
      { id: 'nw-8', type: 'action_task', label: 'Crear tarea para Recepción', description: 'Registra tarea operativa para contacto telefónico o reasignación.', position: { x: 820, y: 392 }, config: { targetArea: 'Recepción', taskTitle: 'Llamar o coordinar nueva cita de paciente ausente', priority: 'Alta' }, validationState: 'valid' },
      { id: 'nw-9', type: 'end_success', label: 'Finalizar', description: 'Flujo de recuperación finalizado con trazabilidad local.', position: { x: 1090, y: 392 }, config: { outcome: 'completed', summaryNote: 'Seguimiento preparado con aprobación humana y tarea asignada.' }, validationState: 'valid' }
    ],
    edges: [
      { id: 'ew-1', sourceNodeId: 'nw-1', sourcePort: 'out', targetNodeId: 'nw-2', targetPort: 'in', label: '' },
      { id: 'ew-2', sourceNodeId: 'nw-2', sourcePort: 'out', targetNodeId: 'nw-3', targetPort: 'in', label: '' },
      { id: 'ew-3', sourceNodeId: 'nw-3', sourcePort: 'yes', targetNodeId: 'nw-4', targetPort: 'in', label: 'Sí' },
      { id: 'ew-4', sourceNodeId: 'nw-3', sourcePort: 'no', targetNodeId: 'nw-5', targetPort: 'in', label: 'No' },
      { id: 'ew-5', sourceNodeId: 'nw-5', sourcePort: 'out', targetNodeId: 'nw-6', targetPort: 'in', label: '' },
      { id: 'ew-6', sourceNodeId: 'nw-6', sourcePort: 'out', targetNodeId: 'nw-7', targetPort: 'in', label: '' },
      { id: 'ew-7', sourceNodeId: 'nw-7', sourcePort: 'out', targetNodeId: 'nw-8', targetPort: 'in', label: '' },
      { id: 'ew-8', sourceNodeId: 'nw-8', sourcePort: 'out', targetNodeId: 'nw-9', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'wf-security-guardrail',
    name: 'Filtro clínico y bloqueo por seguridad',
    description: 'Demuestra cómo el sistema detiene cualquier intento de automatizar síntomas o indicaciones médicas y deriva a una persona.',
    area: 'Supervisión Operativa',
    status: 'active',
    version: 1,
    primaryAgentId: 5,
    escalationTarget: 'Dirección Médica (revisión humana)',
    createdBy: 'Administrador',
    createdAt: '2026-10-21T10:00:00.000Z',
    updatedAt: '2026-10-27T11:05:00.000Z',
    validatedAt: '2026-10-27T11:00:00.000Z',
    activatedAt: '2026-10-27T11:05:00.000Z',
    hasUnsavedChanges: false,
    publishedSnapshot: null,
    nodes: [
      { id: 'sg-1', type: 'trigger_event', label: 'Mensaje recibido', description: 'Consulta entrante simulada en canal de atención.', position: { x: 40, y: 120 }, config: { triggerKey: 'mensaje_recibido', area: 'Atención al Paciente' }, validationState: 'valid' },
      { id: 'sg-2', type: 'condition_branch', label: '¿Incluye síntomas o pregunta clínica?', description: 'Detecta criterios médicos restringidos para proteger al paciente.', position: { x: 310, y: 120 }, config: { field: 'sensitiveContent', operator: 'equals', expectedValue: 'true', branchSummary: 'Detector de contenido clínico o cobro real' }, validationState: 'valid' },
      { id: 'sg-3', type: 'end_security_block', label: 'Bloquear por seguridad', description: 'Detiene respuesta automática y deriva a persona sin exponer datos.', position: { x: 620, y: 44 }, config: { mode: 'security_block', humanTarget: 'Dirección Médica (revisión humana)', blockReason: 'Se detectaron términos clínicos o solicitud de diagnóstico. Automatización detenida y derivada a personal autorizado.' }, validationState: 'valid' },
      { id: 'sg-4', type: 'agent_execute', label: 'Ejecutar con agente: Supervisor ARM', description: 'Derivación controlada sobre horarios y trámites administrativos.', position: { x: 620, y: 220 }, config: { agentId: 5, requiredCapability: 'notify_internally', taskSummary: 'Responder únicamente horarios administrativos de demostración' }, validationState: 'valid' },
      { id: 'sg-5', type: 'end_success', label: 'Finalizar', description: 'Consulta administrativa atendida sin riesgo clínico.', position: { x: 910, y: 220 }, config: { outcome: 'completed', summaryNote: 'Consulta administrativa orientada de forma segura.' }, validationState: 'valid' }
    ],
    edges: [
      { id: 'sge-1', sourceNodeId: 'sg-1', sourcePort: 'out', targetNodeId: 'sg-2', targetPort: 'in', label: '' },
      { id: 'sge-2', sourceNodeId: 'sg-2', sourcePort: 'yes', targetNodeId: 'sg-3', targetPort: 'in', label: 'Sí' },
      { id: 'sge-3', sourceNodeId: 'sg-2', sourcePort: 'no', targetNodeId: 'sg-4', targetPort: 'in', label: 'No' },
      { id: 'sge-4', sourceNodeId: 'sg-4', sourcePort: 'out', targetNodeId: 'sg-5', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'wf-migrated-reminder',
    name: 'Recordatorio preventivo de cita (migrado)',
    description: 'Regla migrada al constructor visual: verifica autorización y prepara recordatorio demostrativo.',
    area: 'Agenda y Citas',
    status: 'active',
    version: 1,
    primaryAgentId: 2,
    escalationTarget: 'Coordinador de Recepción',
    createdBy: 'Administrador',
    createdAt: '2026-10-18T08:30:00.000Z',
    updatedAt: '2026-10-27T09:30:00.000Z',
    validatedAt: '2026-10-27T09:20:00.000Z',
    activatedAt: '2026-10-27T09:30:00.000Z',
    hasUnsavedChanges: false,
    publishedSnapshot: null,
    nodes: [
      { id: 'mr-1', type: 'trigger_event', label: 'Cita creada', description: 'Al registrarse una cita en Agenda.', position: { x: 40, y: 120 }, config: { triggerKey: 'cita_creada', area: 'Agenda y Citas' }, validationState: 'valid' },
      { id: 'mr-2', type: 'condition_branch', label: '¿Autorización de recordatorio vigente?', description: 'Verifica consentimiento de demostración.', position: { x: 310, y: 120 }, config: { field: 'hasPhoneConsent', operator: 'equals', expectedValue: 'true', branchSummary: 'Verificar canal de contacto' }, validationState: 'valid' },
      { id: 'mr-3', type: 'action_reminder', label: 'Preparar recordatorio', description: 'Genera borrador demostrativo de confirmación.', position: { x: 610, y: 50 }, config: { channel: 'WhatsApp (simulado)', template: 'Recordatorio de cita confirmada en Clínica Oftalmológica.' }, validationState: 'valid' },
      { id: 'mr-4', type: 'end_success', label: 'Finalizar', description: 'Recordatorio listo en simulación.', position: { x: 900, y: 50 }, config: { outcome: 'completed', summaryNote: 'Recordatorio preparado correctamente.' }, validationState: 'valid' },
      { id: 'mr-5', type: 'action_task', label: 'Crear tarea para Recepción', description: 'Actualizar medio de contacto al llegar el paciente.', position: { x: 610, y: 220 }, config: { targetArea: 'Recepción', taskTitle: 'Solicitar autorización de recordatorio en recepción', priority: 'Media' }, validationState: 'valid' },
      { id: 'mr-6', type: 'end_success', label: 'Finalizar sin envío', description: 'Cierre sin preparar mensaje externo.', position: { x: 900, y: 220 }, config: { outcome: 'no_action', summaryNote: 'Sin autorización; tarea creada para Recepción.' }, validationState: 'valid' }
    ],
    edges: [
      { id: 'mre-1', sourceNodeId: 'mr-1', sourcePort: 'out', targetNodeId: 'mr-2', targetPort: 'in', label: '' },
      { id: 'mre-2', sourceNodeId: 'mr-2', sourcePort: 'yes', targetNodeId: 'mr-3', targetPort: 'in', label: 'Sí' },
      { id: 'mre-3', sourceNodeId: 'mr-3', sourcePort: 'out', targetNodeId: 'mr-4', targetPort: 'in', label: '' },
      { id: 'mre-4', sourceNodeId: 'mr-2', sourcePort: 'no', targetNodeId: 'mr-5', targetPort: 'in', label: 'No' },
      { id: 'mre-5', sourceNodeId: 'mr-5', sourcePort: 'out', targetNodeId: 'mr-6', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'wf-caja-followup',
    name: 'Coordinación administrativa de pago pendiente (Caja)',
    description: 'Coordina orientación administrativa para órdenes pendientes en Caja sin ejecutar cobros reales.',
    area: 'Caja y Cobranzas',
    status: 'active',
    version: 1,
    primaryAgentId: 4,
    escalationTarget: 'Jefatura de Caja',
    createdBy: 'Administrador',
    createdAt: '2026-10-22T09:00:00.000Z',
    updatedAt: '2026-10-27T10:40:00.000Z',
    validatedAt: '2026-10-27T10:35:00.000Z',
    activatedAt: '2026-10-27T10:40:00.000Z',
    hasUnsavedChanges: false,
    publishedSnapshot: null,
    nodes: [
      { id: 'cj-1', type: 'trigger_event', label: 'Pago pendiente', description: 'Detecta una orden pendiente en cola administrativa de Caja.', position: { x: 40, y: 120 }, config: { triggerKey: 'pago_pendiente', area: 'Caja y Cobranzas' }, validationState: 'valid' },
      { id: 'cj-2', type: 'condition_branch', label: '¿Dentro de horario de Caja?', description: 'Comprueba disponibilidad del equipo de Caja.', position: { x: 310, y: 120 }, config: { field: 'withinBusinessHours', operator: 'equals', expectedValue: 'true', branchSummary: 'Horario de atención de Caja' }, validationState: 'valid' },
      { id: 'cj-3', type: 'agent_execute', label: 'Ejecutar con agente: Coordinador admin', description: 'Prepara derivación operativa hacia ventanilla de Caja.', position: { x: 610, y: 50 }, config: { agentId: 4, requiredCapability: 'route_to_caja', taskSummary: 'Preparar orientación de pago presencial sin procesar cobros' }, validationState: 'valid' },
      { id: 'cj-4', type: 'action_task', label: 'Crear tarea para Caja', description: 'Notifica a Caja para atención presencial.', position: { x: 900, y: 50 }, config: { targetArea: 'Caja', taskTitle: 'Orientar orden pendiente en ventanilla de Caja', priority: 'Alta' }, validationState: 'valid' },
      { id: 'cj-5', type: 'end_success', label: 'Finalizar', description: 'Tarea asignada a Caja.', position: { x: 1180, y: 50 }, config: { outcome: 'completed', summaryNote: 'Caja notificada para gestión presencial.' }, validationState: 'valid' },
      { id: 'cj-6', type: 'action_internal_note', label: 'Registrar nota interna', description: 'Anota para seguimiento al siguiente turno hábil.', position: { x: 610, y: 220 }, config: { notifyArea: 'Caja', noteText: 'Orden pendiente fuera de horario; revisar a primera hora.' }, validationState: 'valid' },
      { id: 'cj-7', type: 'end_success', label: 'Finalizar sin acción externa', description: 'Cerrado hasta apertura de Caja.', position: { x: 900, y: 220 }, config: { outcome: 'no_action', summaryNote: 'Pospuesto al horario de atención de Caja.' }, validationState: 'valid' }
    ],
    edges: [
      { id: 'cje-1', sourceNodeId: 'cj-1', sourcePort: 'out', targetNodeId: 'cj-2', targetPort: 'in', label: '' },
      { id: 'cje-2', sourceNodeId: 'cj-2', sourcePort: 'yes', targetNodeId: 'cj-3', targetPort: 'in', label: 'Sí' },
      { id: 'cje-3', sourceNodeId: 'cj-3', sourcePort: 'out', targetNodeId: 'cj-4', targetPort: 'in', label: '' },
      { id: 'cje-4', sourceNodeId: 'cj-4', sourcePort: 'out', targetNodeId: 'cj-5', targetPort: 'in', label: '' },
      { id: 'cje-5', sourceNodeId: 'cj-2', sourcePort: 'no', targetNodeId: 'cj-6', targetPort: 'in', label: 'No' },
      { id: 'cje-6', sourceNodeId: 'cj-6', sourcePort: 'out', targetNodeId: 'cj-7', targetPort: 'in', label: '' }
    ]
  }
]);

// 8 plantillas de workflow (Sección 13) -> crean copia editable en estado Borrador
export const WORKFLOW_TEMPLATES = Object.freeze([
  {
    id: 'tpl-recordatorio-cita',
    name: 'Recordatorio de cita',
    area: 'Agenda y Citas',
    description: 'Verifica autorización de contacto, solicita aprobación y prepara recordatorio simulado.',
    primaryAgentId: 2,
    escalationTarget: 'Coordinador de Recepción',
    nodes: [
      { id: 't1-1', type: 'trigger_event', label: 'Cita creada', position: { x: 40, y: 120 }, config: { triggerKey: 'cita_creada', area: 'Agenda y Citas' } },
      { id: 't1-2', type: 'condition_branch', label: '¿Tiene autorización de recordatorio?', position: { x: 310, y: 120 }, config: { field: 'hasPhoneConsent', operator: 'equals', expectedValue: 'true' } },
      { id: 't1-3', type: 'action_reminder', label: 'Preparar recordatorio', position: { x: 610, y: 50 }, config: { channel: 'WhatsApp (simulado)', template: 'Recordatorio cordial de tu próxima cita oftalmológica.' } },
      { id: 't1-4', type: 'end_success', label: 'Finalizar', position: { x: 890, y: 50 }, config: { outcome: 'completed', summaryNote: 'Recordatorio preparado en simulación.' } },
      { id: 't1-5', type: 'action_task', label: 'Crear tarea para Recepción', position: { x: 610, y: 220 }, config: { targetArea: 'Recepción', taskTitle: 'Validar canal de contacto con el paciente', priority: 'Media' } },
      { id: 't1-6', type: 'end_success', label: 'Finalizar sin envío', position: { x: 890, y: 220 }, config: { outcome: 'no_action', summaryNote: 'Cerrado sin preparación externa.' } }
    ],
    edges: [
      { id: 'te1-1', sourceNodeId: 't1-1', sourcePort: 'out', targetNodeId: 't1-2', targetPort: 'in', label: '' },
      { id: 'te1-2', sourceNodeId: 't1-2', sourcePort: 'yes', targetNodeId: 't1-3', targetPort: 'in', label: 'Sí' },
      { id: 'te1-3', sourceNodeId: 't1-3', sourcePort: 'out', targetNodeId: 't1-4', targetPort: 'in', label: '' },
      { id: 'te1-4', sourceNodeId: 't1-2', sourcePort: 'no', targetNodeId: 't1-5', targetPort: 'in', label: 'No' },
      { id: 'te1-5', sourceNodeId: 't1-5', sourcePort: 'out', targetNodeId: 't1-6', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-recuperacion-inasistencia',
    name: 'Recuperación de inasistencia',
    area: 'Recepción',
    description: 'Espera de cortesía, valida si ya tiene cita, ejecuta agente y pide aprobación humana.',
    primaryAgentId: 2,
    escalationTarget: 'Coordinador de Recepción',
    nodes: [
      { id: 't2-1', type: 'trigger_event', label: 'Paciente no asistió', position: { x: 40, y: 120 }, config: { triggerKey: 'paciente_no_asistio', area: 'Recepción' } },
      { id: 't2-2', type: 'wait_delay', label: 'Esperar 10 minutos', position: { x: 300, y: 120 }, config: { durationMinutes: 10, acceleratedMs: 1200 } },
      { id: 't2-3', type: 'condition_branch', label: '¿Ya tiene nueva cita?', position: { x: 560, y: 120 }, config: { field: 'hasNewAppointment', operator: 'equals', expectedValue: 'true' } },
      { id: 't2-4', type: 'end_success', label: 'Finalizar', position: { x: 850, y: 40 }, config: { outcome: 'no_action', summaryNote: 'Ya reprogramada.' } },
      { id: 't2-5', type: 'agent_execute', label: 'Ejecutar con agente: Seguimiento', position: { x: 560, y: 270 }, config: { agentId: 2, requiredCapability: 'request_reschedule', taskSummary: 'Proponer alternativas administrativas de reprogramación' } },
      { id: 't2-6', type: 'human_approval', label: 'Solicitar aprobación humana', position: { x: 840, y: 270 }, config: { approverRole: 'Coordinador de Recepción', approvalPrompt: 'Confirmar tarea de seguimiento', timeoutHours: 4, autoDecisionInDemo: 'approve' } },
      { id: 't2-7', type: 'end_success', label: 'Finalizar', position: { x: 1120, y: 270 }, config: { outcome: 'completed', summaryNote: 'Seguimiento completado.' } }
    ],
    edges: [
      { id: 'te2-1', sourceNodeId: 't2-1', sourcePort: 'out', targetNodeId: 't2-2', targetPort: 'in', label: '' },
      { id: 'te2-2', sourceNodeId: 't2-2', sourcePort: 'out', targetNodeId: 't2-3', targetPort: 'in', label: '' },
      { id: 'te2-3', sourceNodeId: 't2-3', sourcePort: 'yes', targetNodeId: 't2-4', targetPort: 'in', label: 'Sí' },
      { id: 'te2-4', sourceNodeId: 't2-3', sourcePort: 'no', targetNodeId: 't2-5', targetPort: 'in', label: 'No' },
      { id: 'te2-5', sourceNodeId: 't2-5', sourcePort: 'out', targetNodeId: 't2-6', targetPort: 'in', label: '' },
      { id: 'te2-6', sourceNodeId: 't2-6', sourcePort: 'out', targetNodeId: 't2-7', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-solicitud-reprogramacion',
    name: 'Solicitud de reprogramación',
    area: 'Agenda y Citas',
    description: 'Evalúa disponibilidad administrativa y crea tarea de confirmación en Recepción.',
    primaryAgentId: 4,
    escalationTarget: 'Coordinador de Recepción',
    nodes: [
      { id: 't3-1', type: 'trigger_event', label: 'Cita modificada', position: { x: 40, y: 120 }, config: { triggerKey: 'cita_modificada', area: 'Agenda y Citas' } },
      { id: 't3-2', type: 'condition_branch', label: '¿Horario en turno habilitado?', position: { x: 310, y: 120 }, config: { field: 'withinBusinessHours', operator: 'equals', expectedValue: 'true' } },
      { id: 't3-3', type: 'agent_execute', label: 'Ejecutar con agente: Coordinador', position: { x: 610, y: 50 }, config: { agentId: 4, requiredCapability: 'request_reschedule', taskSummary: 'Proponer bloque horario administrativo disponible' } },
      { id: 't3-4', type: 'end_success', label: 'Finalizar', position: { x: 900, y: 50 }, config: { outcome: 'completed', summaryNote: 'Reprogramación propuesta.' } },
      { id: 't3-5', type: 'agent_escalate', label: 'Escalar a Recepción', position: { x: 610, y: 220 }, config: { escalationMode: 'human', targetRole: 'Coordinador de Recepción', targetAgentId: 5, reason: 'Solicitud fuera de horario estándar' } },
      { id: 't3-6', type: 'end_success', label: 'Finalizar', position: { x: 900, y: 220 }, config: { outcome: 'completed', summaryNote: 'Escalado a Recepción.' } }
    ],
    edges: [
      { id: 'te3-1', sourceNodeId: 't3-1', sourcePort: 'out', targetNodeId: 't3-2', targetPort: 'in', label: '' },
      { id: 'te3-2', sourceNodeId: 't3-2', sourcePort: 'yes', targetNodeId: 't3-3', targetPort: 'in', label: 'Sí' },
      { id: 'te3-3', sourceNodeId: 't3-3', sourcePort: 'out', targetNodeId: 't3-4', targetPort: 'in', label: '' },
      { id: 'te3-4', sourceNodeId: 't3-2', sourcePort: 'no', targetNodeId: 't3-5', targetPort: 'in', label: 'No' },
      { id: 'te3-5', sourceNodeId: 't3-5', sourcePort: 'out', targetNodeId: 't3-6', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-paciente-llego',
    name: 'Paciente llegó a la clínica',
    area: 'Recepción',
    description: 'Confirma asistencia al registrarse llegada y notifica internamente al área correspondiente.',
    primaryAgentId: 1,
    escalationTarget: 'Coordinador de Recepción',
    nodes: [
      { id: 't4-1', type: 'trigger_event', label: 'Paciente llegó', position: { x: 40, y: 120 }, config: { triggerKey: 'paciente_llego', area: 'Recepción' } },
      { id: 't4-2', type: 'action_internal_note', label: 'Notificar internamente', position: { x: 320, y: 120 }, config: { notifyArea: 'Recepción', noteText: 'Paciente registrado en ingreso presencial (demo).' } },
      { id: 't4-3', type: 'end_success', label: 'Finalizar', position: { x: 610, y: 120 }, config: { outcome: 'completed', summaryNote: 'Recepción avisada.' } }
    ],
    edges: [
      { id: 'te4-1', sourceNodeId: 't4-1', sourcePort: 'out', targetNodeId: 't4-2', targetPort: 'in', label: '' },
      { id: 'te4-2', sourceNodeId: 't4-2', sourcePort: 'out', targetNodeId: 't4-3', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-pago-pendiente',
    name: 'Pago pendiente',
    area: 'Caja y Cobranzas',
    description: 'Verifica horario de Caja y crea tarea interna de orientación sin procesar cobros.',
    primaryAgentId: 4,
    escalationTarget: 'Jefatura de Caja',
    nodes: [
      { id: 't5-1', type: 'trigger_event', label: 'Pago pendiente', position: { x: 40, y: 120 }, config: { triggerKey: 'pago_pendiente', area: 'Caja y Cobranzas' } },
      { id: 't5-2', type: 'action_task', label: 'Crear tarea para Caja', position: { x: 320, y: 120 }, config: { targetArea: 'Caja', taskTitle: 'Orientar regularización de pago en ventanilla', priority: 'Alta' } },
      { id: 't5-3', type: 'end_success', label: 'Finalizar', position: { x: 610, y: 120 }, config: { outcome: 'completed', summaryNote: 'Tarea registrada en Caja.' } }
    ],
    edges: [
      { id: 'te5-1', sourceNodeId: 't5-1', sourcePort: 'out', targetNodeId: 't5-2', targetPort: 'in', label: '' },
      { id: 'te5-2', sourceNodeId: 't5-2', sourcePort: 'out', targetNodeId: 't5-3', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-derivacion-caja',
    name: 'Derivación interna a Caja',
    area: 'Caja y Cobranzas',
    description: 'Enruta solicitudes de presupuesto o facturación hacia Caja manteniendo separación con Recepción.',
    primaryAgentId: 4,
    escalationTarget: 'Jefatura de Caja',
    nodes: [
      { id: 't6-1', type: 'trigger_event', label: 'Inicio manual', position: { x: 40, y: 120 }, config: { triggerKey: 'inicio_manual', area: 'Caja y Cobranzas' } },
      { id: 't6-2', type: 'action_route_area', label: 'Derivar a Caja', position: { x: 320, y: 120 }, config: { destinationArea: 'Caja', handoffNote: 'Atender orientación administrativa en ventanilla de Caja.' } },
      { id: 't6-3', type: 'end_success', label: 'Finalizar', position: { x: 610, y: 120 }, config: { outcome: 'completed', summaryNote: 'Derivación completada.' } }
    ],
    edges: [
      { id: 'te6-1', sourceNodeId: 't6-1', sourcePort: 'out', targetNodeId: 't6-2', targetPort: 'in', label: '' },
      { id: 'te6-2', sourceNodeId: 't6-2', sourcePort: 'out', targetNodeId: 't6-3', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-seguimiento-prospecto',
    name: 'Seguimiento de prospecto',
    area: 'CRM Comercial',
    description: 'Actualiza etapa y etiqueta del CRM comercial cuando cambia la prioridad de un prospecto.',
    primaryAgentId: 3,
    escalationTarget: 'Supervisor Operativo',
    nodes: [
      { id: 't7-1', type: 'trigger_event', label: 'Cambio de etapa en CRM', position: { x: 40, y: 120 }, config: { triggerKey: 'cambio_etapa_crm', area: 'CRM Comercial' } },
      { id: 't7-2', type: 'agent_execute', label: 'Ejecutar con agente: Asesor comercial', position: { x: 320, y: 120 }, config: { agentId: 3, requiredCapability: 'update_crm_stage', taskSummary: 'Ordenar siguiente paso comercial sin recomendaciones médicas' } },
      { id: 't7-3', type: 'action_crm_update', label: 'Actualizar CRM y etiqueta', position: { x: 620, y: 120 }, config: { operation: 'update_stage', stage: 'En seguimiento', priority: 'Alta', tag: 'Prospecto priorizado' } },
      { id: 't7-4', type: 'end_success', label: 'Finalizar', position: { x: 910, y: 120 }, config: { outcome: 'completed', summaryNote: 'CRM actualizado en simulación.' } }
    ],
    edges: [
      { id: 'te7-1', sourceNodeId: 't7-1', sourcePort: 'out', targetNodeId: 't7-2', targetPort: 'in', label: '' },
      { id: 'te7-2', sourceNodeId: 't7-2', sourcePort: 'out', targetNodeId: 't7-3', targetPort: 'in', label: '' },
      { id: 'te7-3', sourceNodeId: 't7-3', sourcePort: 'out', targetNodeId: 't7-4', targetPort: 'in', label: '' }
    ]
  },
  {
    id: 'tpl-mensaje-sensible',
    name: 'Mensaje sensible con revisión humana',
    area: 'Supervisión Operativa',
    description: 'Bloquea cualquier automatización ante síntomas o datos clínicos y deriva inmediatamente a revisión humana.',
    primaryAgentId: 5,
    escalationTarget: 'Dirección Médica (revisión humana)',
    nodes: [
      { id: 't8-1', type: 'trigger_event', label: 'Mensaje recibido', position: { x: 40, y: 120 }, config: { triggerKey: 'mensaje_recibido', area: 'Supervisión Operativa' } },
      { id: 't8-2', type: 'condition_branch', label: '¿Incluye datos clínicos o síntomas?', position: { x: 320, y: 120 }, config: { field: 'sensitiveContent', operator: 'equals', expectedValue: 'true' } },
      { id: 't8-3', type: 'end_security_block', label: 'Bloquear por seguridad', position: { x: 630, y: 50 }, config: { mode: 'security_block', humanTarget: 'Dirección Médica (revisión humana)', blockReason: 'Bloqueado por seguridad clínica: derivado a profesional autorizado.' } },
      { id: 't8-4', type: 'action_route_area', label: 'Derivar a Recepción', position: { x: 630, y: 220 }, config: { destinationArea: 'Recepción', handoffNote: 'Consulta administrativa sin contenido clínico.' } },
      { id: 't8-5', type: 'end_success', label: 'Finalizar', position: { x: 920, y: 220 }, config: { outcome: 'completed', summaryNote: 'Derivado a Recepción.' } }
    ],
    edges: [
      { id: 'te8-1', sourceNodeId: 't8-1', sourcePort: 'out', targetNodeId: 't8-2', targetPort: 'in', label: '' },
      { id: 'te8-2', sourceNodeId: 't8-2', sourcePort: 'yes', targetNodeId: 't8-3', targetPort: 'in', label: 'Sí' },
      { id: 'te8-3', sourceNodeId: 't8-2', sourcePort: 'no', targetNodeId: 't8-4', targetPort: 'in', label: 'No' },
      { id: 'te8-4', sourceNodeId: 't8-4', sourcePort: 'out', targetNodeId: 't8-5', targetPort: 'in', label: '' }
    ]
  }
]);

export const INITIAL_ASSIGNED_TASKS = Object.freeze([
  { id: 'task-1', area: 'Recepción', workflowId: 'wf-noshow-recovery', workflowName: 'Recuperación inteligente de pacientes ausentes', title: 'Confirmar reprogramación de paciente ejemplo #P-210', priority: 'Alta', status: 'pending', createdAt: '27 oct · 10:20' },
  { id: 'task-2', area: 'Recepción', workflowId: 'wf-migrated-reminder', workflowName: 'Recordatorio preventivo de cita (migrado)', title: 'Actualizar autorización de contacto de paciente ejemplo #P-218', priority: 'Media', status: 'pending', createdAt: '27 oct · 10:45' },
  { id: 'task-3', area: 'Caja', workflowId: 'wf-caja-followup', workflowName: 'Coordinación administrativa de pago pendiente (Caja)', title: 'Orientar orden pendiente #ORD-DEMO-112 en ventanilla de Caja', priority: 'Alta', status: 'pending', createdAt: '27 oct · 11:02' }
]);

export const INITIAL_AUDIT_EVENTS = Object.freeze([
  { id: 'aud-1', type: 'workflow_activated', typeLabel: 'Activación de workflow', timestamp: '2026-10-27T11:20:00.000Z', at: '27 oct · 11:20', role: 'admin', actorName: 'Administrador', entityType: 'workflow', entityId: 'wf-noshow-recovery', entityName: 'Recuperación inteligente de pacientes ausentes', result: 'Activo', summary: 'Workflow precargado validado y activado en versión v1.', version: 1, tone: 'good', agent: 'followup', action: 'Workflow activado (demo)', detail: 'Recuperación inteligente de pacientes ausentes · v1' },
  { id: 'aud-2', type: 'security_block', typeLabel: 'Bloqueo de seguridad', timestamp: '2026-10-27T11:05:00.000Z', at: '27 oct · 11:05', role: 'supervisor', actorName: 'Supervisor ARM', entityType: 'security', entityId: 'wf-security-guardrail', entityName: 'Filtro clínico y bloqueo por seguridad', result: 'Bloqueado y derivado', summary: 'Se detuvo respuesta automática ante pregunta de síntomas y se derivó a persona.', version: 1, tone: 'bad', agent: 'supervisor', action: 'Bloqueo clínico aplicado', detail: 'Se detuvo recomendación de diagnóstico y se derivó a supervisión humana.' },
  { id: 'aud-3', type: 'workflow_simulated', typeLabel: 'Simulación de workflow', timestamp: '2026-10-27T10:50:00.000Z', at: '27 oct · 10:50', role: 'admin', actorName: 'Administrador', entityType: 'workflow', entityId: 'wf-noshow-recovery', entityName: 'Recuperación inteligente de pacientes ausentes', result: 'Simulado (rama No)', summary: 'Recorrido simulado completado con aprobación humana demostrativa.', version: 1, tone: 'info', agent: 'receptionist', action: 'Simulación completada', detail: 'Se habría creado una tarea para Recepción (sin efectos reales).' },
  { id: 'aud-4', type: 'agent_created', typeLabel: 'Creación de agente', timestamp: '2026-10-27T10:15:00.000Z', at: '27 oct · 10:15', role: 'admin', actorName: 'Administrador', entityType: 'agent', entityId: '2', entityName: 'Seguimiento de pacientes', result: 'Registrado', summary: 'Agente demostrativo configurado con catálogo cerrado de capacidades.', version: 1, tone: 'good', agent: 'followup', action: 'Agente configurado', detail: 'Permisos limitados a agenda y recordatorios simulados.' }
]);

// =========================================================================
// Estado en memoria + almacenamiento versionado seguro
// =========================================================================

let state = null;
let undoStack = {}; // workflowId -> [{ nodes, edges, name, description }]
let redoStack = {};

const simRuntime = {
  run: null,
  timerId: null,
  speed: 1,
  listeners: new Set()
};

function deepClone(value) {
  return structuredClone(value);
}

function getSafeStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage && typeof globalThis.localStorage.getItem === 'function' && typeof globalThis.localStorage.setItem === 'function') {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function formatReadableNow() {
  try {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `Hoy · ${hh}:${mm} · demo`;
  } catch {
    return 'Ahora · demo';
  }
}

function createInitialState() {
  return {
    schemaVersion: AUTOMATIONS_SCHEMA_VERSION,
    agents: deepClone(INITIAL_AGENTS),
    workflows: deepClone(INITIAL_WORKFLOWS),
    audit: deepClone(INITIAL_AUDIT_EVENTS),
    quickAutomations: deepClone(INITIAL_AUTOMATIONS),
    assignedTasks: deepClone(INITIAL_ASSIGNED_TASKS),
    nextIds: { agent: 6, workflow: 10, node: 100, edge: 100, audit: 20, run: 1, task: 20 },
    lastSavedAt: '2026-10-27T11:20:00.000Z',
    lastResetAt: null,
    corruptRecoveredCount: 0
  };
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function cleanText(value, fallback = '', maxLen = 240) {
  const str = String(value ?? fallback).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return str ? str.slice(0, maxLen) : fallback;
}

function computeAgentShort(name) {
  const parts = cleanText(name, 'AG').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || 'AG').slice(0, 2).toUpperCase();
}

export function sanitizeAgent(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number.isFinite(Number(raw.id)) ? Number(raw.id) : index + 1;
  const name = cleanText(raw.name, `Agente demo ${id}`, 80);
  const validCapabilities = new Set(AGENT_CAPABILITIES_CATALOG.map(c => c.key));
  const validForbidden = new Set(AGENT_FORBIDDEN_CATALOG.map(f => f.key));
  const validIcons = new Set(AGENT_ICONS_CATALOG.map(i => i.key));
  const validColors = new Set(AGENT_COLORS_CATALOG.map(c => c.key));

  const capabilities = Array.isArray(raw.capabilities)
    ? [...new Set(raw.capabilities.filter(k => validCapabilities.has(k)))]
    : [];
  const forbiddenActions = Array.isArray(raw.forbiddenActions)
    ? [...new Set(raw.forbiddenActions.filter(k => validForbidden.has(k)))]
    : AGENT_FORBIDDEN_CATALOG.slice(0, 3).map(f => f.key);

  const capLabels = capabilities.map(k => AGENT_CAPABILITIES_CATALOG.find(c => c.key === k)?.label).filter(Boolean);
  const forbiddenLabels = forbiddenActions.map(k => AGENT_FORBIDDEN_CATALOG.find(f => f.key === k)?.label).filter(Boolean);

  const area = AGENT_AREAS_CATALOG.includes(raw.area) ? raw.area : AGENT_AREAS_CATALOG[0];
  const icon = validIcons.has(raw.icon) ? raw.icon : 'calendar';
  const color = validColors.has(raw.color) ? raw.color : 'emerald';
  const status = Object.hasOwn(AGENT_STATUS_LABELS, raw.status) ? raw.status : 'draft';
  const escalationTarget = ESCALATION_TARGETS_CATALOG.includes(raw.escalationTarget)
    ? raw.escalationTarget
    : ESCALATION_TARGETS_CATALOG[0];

  return {
    id,
    key: cleanText(raw.key || `agent_${id}`, `agent_${id}`, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
    name,
    short: cleanText(raw.short || computeAgentShort(name), 'AG', 3).toUpperCase(),
    description: cleanText(raw.description || raw.purpose, 'Perfil de agente demostrativo sin ejecución externa real.', 240),
    purpose: cleanText(raw.purpose || raw.description, 'Ejecución administrativa demostrativa controlada.', 240),
    area,
    icon,
    color,
    status,
    channel: cleanText(raw.channel, `${area} (demo)`, 60),
    handled: clampNumber(raw.handled, 0, 99999, 0),
    escalations: clampNumber(raw.escalations, 0, 99999, 0),
    capabilities,
    forbiddenActions,
    tools: capLabels.length ? capLabels : (Array.isArray(raw.tools) ? raw.tools.map(t => cleanText(t, '', 80)).filter(Boolean) : ['Lectura demostrativa']),
    blocked: forbiddenLabels.length ? forbiddenLabels : (Array.isArray(raw.blocked) ? raw.blocked.map(b => cleanText(b, '', 80)).filter(Boolean) : ['Emitir diagnósticos médicos']),
    escalationTarget,
    schedule: cleanText(raw.schedule, 'Lun-Sáb 08:00 - 18:00', 80),
    maxAttempts: clampNumber(raw.maxAttempts, 1, 10, 2),
    retryDelay: clampNumber(raw.retryDelay, 1, 240, 15),
    createdAt: cleanText(raw.createdAt, new Date().toISOString(), 40),
    updatedAt: cleanText(raw.updatedAt, new Date().toISOString(), 40),
    version: clampNumber(raw.version, 1, 999, 1)
  };
}

export function sanitizeWorkflowNode(raw, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const catalogSpec = getNodeTypeSpec(raw.type);
  if (!catalogSpec) return null;
  const pos = raw.position && typeof raw.position === 'object' ? raw.position : {};
  const config = raw.config && typeof raw.config === 'object' ? deepClone(raw.config) : deepClone(catalogSpec.defaultConfig);
  return {
    id: cleanText(raw.id, `node-${idx + 1}`, 48),
    type: catalogSpec.type,
    label: cleanText(raw.label ?? '', '', 100),
    description: cleanText(raw.description ?? '', '', 260),
    position: {
      x: clampNumber(pos.x, 0, 6000, 60 + idx * 40),
      y: clampNumber(pos.y, 0, 4000, 60 + idx * 30)
    },
    config,
    validationState: ['valid', 'warning', 'error'].includes(raw.validationState) ? raw.validationState : 'valid'
  };
}

export function sanitizeWorkflowEdge(raw, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const sourceNodeId = cleanText(raw.sourceNodeId, '', 48);
  const targetNodeId = cleanText(raw.targetNodeId, '', 48);
  if (!sourceNodeId || !targetNodeId) return null;
  const sourcePort = ['out', 'yes', 'no'].includes(raw.sourcePort) ? raw.sourcePort : 'out';
  const targetPort = 'in';
  const label = sourcePort === 'yes' ? 'Sí' : sourcePort === 'no' ? 'No' : cleanText(raw.label ?? '', '', 24);
  return {
    id: cleanText(raw.id, `edge-${idx + 1}`, 48),
    sourceNodeId,
    sourcePort,
    targetNodeId,
    targetPort,
    label
  };
}

export function sanitizeWorkflow(raw, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const id = cleanText(raw.id, `wf-${idx + 1}`, 60);
  const status = Object.hasOwn(WORKFLOW_STATES, raw.status) ? raw.status : 'draft';
  const nodes = Array.isArray(raw.nodes) ? raw.nodes.map((n, i) => sanitizeWorkflowNode(n, i)).filter(Boolean) : [];
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = Array.isArray(raw.edges)
    ? raw.edges.map((e, i) => sanitizeWorkflowEdge(e, i)).filter(e => e && nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId))
    : [];

  let publishedSnapshot = null;
  if (raw.publishedSnapshot && typeof raw.publishedSnapshot === 'object' && Array.isArray(raw.publishedSnapshot.nodes)) {
    publishedSnapshot = {
      version: clampNumber(raw.publishedSnapshot.version, 1, 999, 1),
      name: cleanText(raw.publishedSnapshot.name, 'Versión activa', 120),
      description: cleanText(raw.publishedSnapshot.description, '', 320),
      area: AGENT_AREAS_CATALOG.includes(raw.publishedSnapshot.area) ? raw.publishedSnapshot.area : 'Recepción',
      nodes: raw.publishedSnapshot.nodes.map((n, i) => sanitizeWorkflowNode(n, i)).filter(Boolean),
      edges: Array.isArray(raw.publishedSnapshot.edges) ? raw.publishedSnapshot.edges.map((e, i) => sanitizeWorkflowEdge(e, i)).filter(Boolean) : [],
      activatedAt: cleanText(raw.publishedSnapshot.activatedAt, new Date().toISOString(), 40)
    };
  }

  return {
    id,
    name: cleanText(raw.name ?? '', '', 120),
    description: cleanText(raw.description ?? '', '', 360),
    area: AGENT_AREAS_CATALOG.includes(raw.area) ? raw.area : 'Recepción',
    status,
    version: clampNumber(raw.version, 1, 999, 1),
    primaryAgentId: raw.primaryAgentId !== null && raw.primaryAgentId !== undefined ? Number(raw.primaryAgentId) : null,
    escalationTarget: ESCALATION_TARGETS_CATALOG.includes(raw.escalationTarget) ? raw.escalationTarget : ESCALATION_TARGETS_CATALOG[0],
    createdBy: cleanText(raw.createdBy, 'Administrador', 60),
    createdAt: cleanText(raw.createdAt, new Date().toISOString(), 40),
    updatedAt: cleanText(raw.updatedAt, new Date().toISOString(), 40),
    validatedAt: raw.validatedAt ? cleanText(raw.validatedAt, '', 40) : null,
    activatedAt: raw.activatedAt ? cleanText(raw.activatedAt, '', 40) : null,
    hasUnsavedChanges: Boolean(raw.hasUnsavedChanges),
    needsValidation: Boolean(raw.needsValidation),
    publishedSnapshot,
    nodes,
    edges
  };
}

export function sanitizeAuditEvent(raw, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const type = Object.hasOwn(AUDIT_EVENT_TYPES, raw.type) ? raw.type : 'workflow_saved';
  const meta = AUDIT_EVENT_TYPES[type];
  return {
    id: cleanText(raw.id, `aud-${idx + 1}`, 48),
    type,
    typeLabel: cleanText(raw.typeLabel, meta.label, 80),
    timestamp: cleanText(raw.timestamp, new Date().toISOString(), 40),
    at: cleanText(raw.at, formatReadableNow(), 40),
    role: cleanText(raw.role, 'admin', 32),
    actorName: cleanText(raw.actorName, 'Sistema demo', 60),
    entityType: cleanText(raw.entityType, 'workflow', 32),
    entityId: cleanText(raw.entityId, '-', 60),
    entityName: cleanText(raw.entityName, '-', 120),
    result: cleanText(raw.result, 'Registrado', 60),
    summary: cleanText(raw.summary, meta.label, 280),
    version: raw.version !== undefined && raw.version !== null ? clampNumber(raw.version, 1, 999, 1) : null,
    tone: ['good', 'success', 'info', 'warn', 'bad'].includes(raw.tone) ? raw.tone : meta.tone,
    agent: cleanText(raw.agent, 'supervisor', 40),
    action: cleanText(raw.action || meta.label, meta.label, 80),
    detail: cleanText(raw.detail || raw.summary, '', 260)
  };
}

export function sanitizeAutomationsState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const version = Number(raw.schemaVersion);
  if (!Number.isFinite(version) || version < 1 || version > AUTOMATIONS_SCHEMA_VERSION) return null;
  if (!Array.isArray(raw.agents) || !Array.isArray(raw.workflows)) return null;

  const base = createInitialState();
  const sanitizedAgents = raw.agents.map((a, i) => sanitizeAgent(a, i)).filter(Boolean);
  const sanitizedWorkflows = raw.workflows.map((w, i) => sanitizeWorkflow(w, i)).filter(Boolean);
  if (!sanitizedAgents.length || !sanitizedWorkflows.length) return null;

  // Evitar IDs duplicados tras sanitización
  const seenAgentIds = new Set();
  const uniqueAgents = [];
  let maxAgentId = 0;
  for (const ag of sanitizedAgents) {
    if (!seenAgentIds.has(ag.id)) {
      seenAgentIds.add(ag.id);
      uniqueAgents.push(ag);
      if (ag.id > maxAgentId) maxAgentId = ag.id;
    }
  }

  const seenWfIds = new Set();
  const uniqueWorkflows = [];
  for (const wf of sanitizedWorkflows) {
    if (!seenWfIds.has(wf.id)) {
      seenWfIds.add(wf.id);
      uniqueWorkflows.push(wf);
    }
  }

  const audit = Array.isArray(raw.audit)
    ? raw.audit.map((ev, i) => sanitizeAuditEvent(ev, i)).filter(Boolean).slice(0, 120)
    : base.audit;

  const quickAutomations = Array.isArray(raw.quickAutomations) && raw.quickAutomations.length >= 3
    ? raw.quickAutomations.slice(0, 12).map((q, i) => ({
        id: Number(q.id) || i + 1,
        workflowId: cleanText(q.workflowId, '', 60),
        name: cleanText(q.name, `Regla ${i + 1}`, 80),
        trigger: cleanText(q.trigger, 'Evento demo', 100),
        action: cleanText(q.action, 'Acción demostrativa', 140),
        agent: cleanText(q.agent, 'followup', 40),
        active: Boolean(q.active),
        lastRun: cleanText(q.lastRun, 'Nunca', 40)
      }))
    : base.quickAutomations;

  const assignedTasks = Array.isArray(raw.assignedTasks)
    ? raw.assignedTasks.slice(0, 60).map((t, i) => ({
        id: cleanText(t.id, `task-${i + 1}`, 48),
        area: ['Recepción', 'Caja', 'Operativa'].includes(t.area) ? t.area : 'Recepción',
        workflowId: cleanText(t.workflowId, '', 60),
        workflowName: cleanText(t.workflowName, 'Workflow demo', 120),
        title: cleanText(t.title, 'Tarea operativa demo', 160),
        priority: ['Alta', 'Media', 'Baja'].includes(t.priority) ? t.priority : 'Media',
        status: ['pending', 'completed'].includes(t.status) ? t.status : 'pending',
        createdAt: cleanText(t.createdAt, formatReadableNow(), 40)
      }))
    : base.assignedTasks;

  const nextIds = raw.nextIds && typeof raw.nextIds === 'object' ? {
    agent: Math.max(maxAgentId + 1, clampNumber(raw.nextIds.agent, 1, 999999, maxAgentId + 1)),
    workflow: clampNumber(raw.nextIds.workflow, 1, 999999, uniqueWorkflows.length + 10),
    node: clampNumber(raw.nextIds.node, 1, 999999, 200),
    edge: clampNumber(raw.nextIds.edge, 1, 999999, 200),
    audit: clampNumber(raw.nextIds.audit, 1, 999999, audit.length + 20),
    run: clampNumber(raw.nextIds.run, 1, 999999, 10),
    task: clampNumber(raw.nextIds.task, 1, 999999, assignedTasks.length + 20)
  } : { ...base.nextIds, agent: maxAgentId + 1 };

  return {
    schemaVersion: AUTOMATIONS_SCHEMA_VERSION,
    agents: uniqueAgents,
    workflows: uniqueWorkflows,
    audit,
    quickAutomations,
    assignedTasks,
    nextIds,
    lastSavedAt: cleanText(raw.lastSavedAt, new Date().toISOString(), 40),
    lastResetAt: raw.lastResetAt ? cleanText(raw.lastResetAt, '', 40) : null,
    corruptRecoveredCount: clampNumber(raw.corruptRecoveredCount, 0, 9999, 0)
  };
}

export function loadAutomationsState() {
  const storage = getSafeStorage();
  if (!storage) {
    state = createInitialState();
    return { state: deepClone(state), recoveredFromCorruption: false };
  }

  let rawText = null;
  try {
    rawText = storage.getItem(AUTOMATIONS_STORAGE_KEY);
  } catch {
    state = createInitialState();
    return { state: deepClone(state), recoveredFromCorruption: false };
  }

  if (!rawText) {
    state = createInitialState();
    saveAutomationsState(state);
    return { state: deepClone(state), recoveredFromCorruption: false };
  }

  try {
    const parsed = JSON.parse(rawText);
    const sanitized = sanitizeAutomationsState(parsed);
    if (!sanitized) {
      throw new Error('INVALID_SCHEMA_OR_STRUCTURE');
    }
    state = sanitized;
    return { state: deepClone(state), recoveredFromCorruption: false };
  } catch {
    state = createInitialState();
    state.corruptRecoveredCount = 1;
    const recoveryEvent = sanitizeAuditEvent({
      id: `aud-rec-${Date.now()}`,
      type: 'storage_recovered',
      role: 'system',
      actorName: 'Sistema de persistencia',
      entityType: 'system',
      entityId: AUTOMATIONS_STORAGE_KEY,
      entityName: 'Estado de automatizaciones',
      result: 'Recuperado',
      summary: 'Recuperación automática ante almacenamiento corrupto o estructura inválida.',
      tone: 'warn',
      agent: 'supervisor',
      action: 'Recuperación de almacenamiento',
      detail: 'Se restauró el estado inicial de demostración sin bloquear la aplicación.'
    });
    state.audit.unshift(recoveryEvent);
    saveAutomationsState(state);
    return { state: deepClone(state), recoveredFromCorruption: true };
  }
}

export function saveAutomationsState(nextState = state) {
  if (!nextState) return false;
  state = deepClone(nextState);
  state.lastSavedAt = new Date().toISOString();
  const storage = getSafeStorage();
  if (!storage) return true;
  try {
    // Nunca persistir objetos temporales del lienzo
    const payload = {
      schemaVersion: AUTOMATIONS_SCHEMA_VERSION,
      agents: state.agents,
      workflows: state.workflows,
      audit: state.audit.slice(0, 120),
      quickAutomations: state.quickAutomations,
      assignedTasks: state.assignedTasks,
      nextIds: state.nextIds,
      lastSavedAt: state.lastSavedAt,
      lastResetAt: state.lastResetAt,
      corruptRecoveredCount: state.corruptRecoveredCount
    };
    storage.setItem(AUTOMATIONS_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function ensureStateLoaded() {
  if (!state) {
    loadAutomationsState();
  }
  return state;
}

export function resetARMData() {
  stopWorkflowSimulation();
  undoStack = {};
  redoStack = {};
  state = createInitialState();
  saveAutomationsState(state);
  return deepClone(state);
}

export function resetAutomationsOnly(options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'resetDemo', 'Restablecer datos de automatizaciones y agentes');
  if (!perm.ok) return perm;

  stopWorkflowSimulation();
  undoStack = {};
  redoStack = {};
  state = createInitialState();
  state.lastResetAt = new Date().toISOString();
  appendAuditInternal({
    type: 'demo_reset',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'system',
    entityId: 'automations-demo',
    entityName: 'Módulo de automatizaciones y agentes',
    result: 'Restablecido',
    summary: 'Se restablecieron exclusivamente los datos de demostración de workflows y agentes.',
    tone: 'warn',
    agent: 'supervisor',
    action: 'Demo restablecido',
    detail: 'Agenda, Caja, Recepción, CRM y autenticación se conservaron intactos.'
  });
  saveAutomationsState(state);
  return { ok: true, state: deepClone(state) };
}

// =========================================================================
// Control de acceso por rol (Sección 15) + Auditoría
// =========================================================================

const ROLE_CAPABILITIES = Object.freeze({
  admin: {
    canOpenBuilder: true,
    viewWorkflows: true,
    createAgent: true,
    editAgent: true,
    toggleAgent: true,
    archiveAgent: true,
    createWorkflow: true,
    editWorkflow: true,
    validateWorkflow: true,
    simulateWorkflow: true,
    activateWorkflow: true,
    pauseWorkflow: true,
    archiveWorkflow: true,
    viewAudit: true,
    resetDemo: true,
    attendTasks: true
  },
  supervisor: {
    canOpenBuilder: true,
    viewWorkflows: true,
    createAgent: true,
    editAgent: true,
    toggleAgent: true,
    archiveAgent: false,
    createWorkflow: true,
    editWorkflow: true,
    validateWorkflow: true,
    simulateWorkflow: true,
    activateWorkflow: true,
    pauseWorkflow: true,
    archiveWorkflow: false,
    viewAudit: true,
    resetDemo: false,
    attendTasks: true
  },
  recepcion: {
    canOpenBuilder: false,
    viewWorkflows: true,
    createAgent: false,
    editAgent: false,
    toggleAgent: false,
    archiveAgent: false,
    createWorkflow: false,
    editWorkflow: false,
    validateWorkflow: false,
    simulateWorkflow: false,
    activateWorkflow: false,
    pauseWorkflow: false,
    archiveWorkflow: false,
    viewAudit: false,
    resetDemo: false,
    attendTasks: true
  },
  caja: {
    canOpenBuilder: false,
    viewWorkflows: true,
    createAgent: false,
    editAgent: false,
    toggleAgent: false,
    archiveAgent: false,
    createWorkflow: false,
    editWorkflow: false,
    validateWorkflow: false,
    simulateWorkflow: false,
    activateWorkflow: false,
    pauseWorkflow: false,
    archiveWorkflow: false,
    viewAudit: false,
    resetDemo: false,
    attendTasks: true
  },
  medico: {
    canOpenBuilder: false,
    viewWorkflows: false,
    createAgent: false,
    editAgent: false,
    toggleAgent: false,
    archiveAgent: false,
    createWorkflow: false,
    editWorkflow: false,
    validateWorkflow: false,
    simulateWorkflow: false,
    activateWorkflow: false,
    pauseWorkflow: false,
    archiveWorkflow: false,
    viewAudit: false,
    resetDemo: false,
    attendTasks: false
  },
  tecnico: {
    canOpenBuilder: false,
    viewWorkflows: false,
    createAgent: false,
    editAgent: false,
    toggleAgent: false,
    archiveAgent: false,
    createWorkflow: false,
    editWorkflow: false,
    validateWorkflow: false,
    simulateWorkflow: false,
    activateWorkflow: false,
    pauseWorkflow: false,
    archiveWorkflow: false,
    viewAudit: false,
    resetDemo: false,
    attendTasks: false
  }
});

export function getAutomationRolePermissions(role) {
  return deepClone(ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.tecnico);
}

export function canPerformAutomationAction(role, action) {
  const perms = ROLE_CAPABILITIES[role];
  if (!perms) return false;
  return Boolean(perms[action]);
}

function normalizeActor(options = {}) {
  return {
    role: cleanText(options.role || options.user?.role || 'admin', 'admin', 32),
    actorName: cleanText(options.actorName || options.user?.name || options.user?.roleLabel || 'Administrador', 'Administrador', 60)
  };
}

function appendAuditInternal(spec) {
  const st = ensureStateLoaded();
  const id = `aud-${st.nextIds.audit++}`;
  const event = sanitizeAuditEvent({
    id,
    timestamp: new Date().toISOString(),
    at: formatReadableNow(),
    ...spec
  });
  st.audit.unshift(event);
  if (st.audit.length > 120) st.audit.length = 120;
  return event;
}

export function recordAutomationAudit(spec) {
  ensureStateLoaded();
  const ev = appendAuditInternal(spec);
  saveAutomationsState(state);
  return deepClone(ev);
}

export function recordARMEvent(agentKey, action, result, tone = 'info', at = formatReadableNow()) {
  const st = ensureStateLoaded();
  const ag = st.agents.find(a => a.key === agentKey || String(a.id) === String(agentKey));
  if (ag) {
    ag.handled += 1;
    if (tone === 'warn' || tone === 'bad') ag.escalations += 1;
  }
  const ev = appendAuditInternal({
    type: tone === 'bad' ? 'security_block' : 'workflow_simulated',
    role: 'system',
    actorName: ag ? ag.name : 'Sistema ARM',
    entityType: 'agent',
    entityId: ag ? String(ag.id) : String(agentKey || 'arm'),
    entityName: ag ? ag.name : String(agentKey || 'ARM'),
    result: cleanText(result, 'Registrado', 120),
    summary: `${cleanText(action, 'Actividad ARM', 100)}: ${cleanText(result, '', 140)}`,
    tone,
    at,
    agent: ag ? ag.key : String(agentKey || 'arm'),
    action: cleanText(action, 'Actividad ARM', 80),
    detail: cleanText(result, '', 160)
  });
  saveAutomationsState(state);
  return deepClone(ev);
}

export function getAuditEvents(filter = {}) {
  const st = ensureStateLoaded();
  let list = st.audit;
  if (filter.type && filter.type !== 'all') {
    list = list.filter(ev => ev.type === filter.type);
  }
  if (filter.entityId) {
    list = list.filter(ev => ev.entityId === String(filter.entityId));
  }
  return deepClone(list);
}

function assertPermission(actor, action, attemptedSummary, entityType = 'system', entityId = '-') {
  if (canPerformAutomationAction(actor.role, action)) {
    return { ok: true };
  }
  appendAuditInternal({
    type: 'unauthorized_attempt',
    role: actor.role,
    actorName: actor.actorName,
    entityType,
    entityId: String(entityId),
    entityName: attemptedSummary,
    result: 'Denegado',
    summary: `Intento no autorizado (${actor.role}): ${attemptedSummary}.`,
    tone: 'bad',
    agent: 'supervisor',
    action: 'Intento no autorizado',
    detail: `${actor.actorName} intentó: ${attemptedSummary}`
  });
  saveAutomationsState(state);
  return {
    ok: false,
    code: 'UNAUTHORIZED',
    message: `El rol ${actor.role} no tiene permisos para: ${attemptedSummary}.`
  };
}

export function getWorkflowsForRole(role) {
  const st = ensureStateLoaded();
  if (role === 'admin' || role === 'supervisor') {
    return deepClone(st.workflows);
  }
  if (role === 'recepcion') {
    return deepClone(st.workflows.filter(w =>
      w.status !== 'archived' && (w.area === 'Recepción' || w.area === 'Agenda y Citas' || w.nodes.some(n => n.config?.targetArea === 'Recepción' || n.config?.destinationArea === 'Recepción'))
    ));
  }
  if (role === 'caja') {
    return deepClone(st.workflows.filter(w =>
      w.status !== 'archived' && (w.area === 'Caja y Cobranzas' || w.nodes.some(n => n.config?.targetArea === 'Caja' || n.config?.destinationArea === 'Caja'))
    ));
  }
  return [];
}

export function getAssignedTasksForRole(role) {
  const st = ensureStateLoaded();
  if (role === 'admin' || role === 'supervisor') return deepClone(st.assignedTasks);
  if (role === 'recepcion') return deepClone(st.assignedTasks.filter(t => t.area === 'Recepción'));
  if (role === 'caja') return deepClone(st.assignedTasks.filter(t => t.area === 'Caja'));
  return [];
}

export function completeAssignedAutomationTask(taskId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'attendTasks', 'Atender tarea asignada por workflow', 'task', taskId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const task = st.assignedTasks.find(t => t.id === taskId);
  if (!task) return { ok: false, code: 'NOT_FOUND', message: 'La tarea no existe.' };
  if (actor.role === 'recepcion' && task.area !== 'Recepción') {
    return assertPermission(actor, '__denied__', `Atender tarea de ${task.area}`, 'task', taskId);
  }
  if (actor.role === 'caja' && task.area !== 'Caja') {
    return assertPermission(actor, '__denied__', `Atender tarea de ${task.area}`, 'task', taskId);
  }

  task.status = 'completed';
  appendAuditInternal({
    type: 'workflow_saved',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'task',
    entityId: task.id,
    entityName: task.title,
    result: 'Atendida',
    summary: `Tarea operativa (${task.area}) marcada como atendida por ${actor.actorName}.`,
    tone: 'good',
    agent: 'receptionist',
    action: 'Tarea atendida',
    detail: task.title
  });
  saveAutomationsState(state);
  return { ok: true, task: deepClone(task) };
}

// =========================================================================
// Consultas y CRUD dinámico de Agentes (Sección 8)
// =========================================================================

export function getAgents(options = {}) {
  const st = ensureStateLoaded();
  const includeArchived = options.includeArchived !== false;
  const list = includeArchived ? st.agents : st.agents.filter(a => a.status !== 'archived');
  return deepClone(list);
}

export function getAgentById(idOrKey) {
  const st = ensureStateLoaded();
  const ag = st.agents.find(a => String(a.id) === String(idOrKey) || a.key === String(idOrKey));
  return ag ? deepClone(ag) : null;
}

export function isAgentActive(key) {
  const st = ensureStateLoaded();
  const ag = st.agents.find(a => a.key === key || String(a.id) === String(key));
  return ag ? ag.status === 'active' : true;
}

export function getARMSummary() {
  const st = ensureStateLoaded();
  const visible = st.agents.filter(a => a.status !== 'archived');
  return {
    total: visible.length,
    active: visible.filter(a => a.status === 'active').length,
    events: deepClone(st.audit),
    workflowsActive: st.workflows.filter(w => w.status === 'active').length,
    workflowsTotal: st.workflows.filter(w => w.status !== 'archived').length
  };
}

export function getActiveWorkflowsUsingAgent(agentId) {
  const st = ensureStateLoaded();
  const numId = Number(agentId);
  return deepClone(st.workflows.filter(wf =>
    wf.status === 'active' &&
    (wf.primaryAgentId === numId || wf.nodes.some(n => Number(n.config?.agentId) === numId || Number(n.config?.targetAgentId) === numId))
  ));
}

export function createAgent(payload = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'createAgent', 'Crear nuevo agente', 'agent', 'new');
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const name = cleanText(payload.name, '', 80);
  if (name.length < 3) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'El nombre del agente debe tener al menos 3 caracteres.' };
  }
  const capabilities = Array.isArray(payload.capabilities)
    ? payload.capabilities.filter(k => AGENT_CAPABILITIES_CATALOG.some(c => c.key === k))
    : [];
  if (!capabilities.length) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Selecciona al menos una capacidad permitida desde el catálogo.' };
  }
  const forbiddenActions = Array.isArray(payload.forbiddenActions)
    ? payload.forbiddenActions.filter(k => AGENT_FORBIDDEN_CATALOG.some(f => f.key === k))
    : [];
  if (!forbiddenActions.length) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Selecciona al menos una acción prohibida para delimitar seguridad.' };
  }

  const initialStatus = ['draft', 'paused', 'active'].includes(payload.status) ? payload.status : 'draft';
  const id = st.nextIds.agent++;
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'agente';
  const key = `${slugBase}_${id}`;

  const created = sanitizeAgent({
    id,
    key,
    name,
    short: computeAgentShort(name),
    description: payload.description || payload.purpose,
    purpose: payload.purpose || payload.description,
    area: payload.area,
    icon: payload.icon || 'calendar',
    color: payload.color || 'emerald',
    status: initialStatus,
    channel: `${payload.area || 'Recepción'} (workflow demo)`,
    handled: 0,
    escalations: 0,
    capabilities,
    forbiddenActions,
    escalationTarget: payload.escalationTarget || ESCALATION_TARGETS_CATALOG[0],
    schedule: payload.schedule || 'Lun-Sáb 08:00 - 18:00',
    maxAttempts: clampNumber(payload.maxAttempts, 1, 10, 2),
    retryDelay: clampNumber(payload.retryDelay, 1, 240, 15),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  }, id);

  st.agents.push(created);
  appendAuditInternal({
    type: 'agent_created',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'agent',
    entityId: String(created.id),
    entityName: created.name,
    result: AGENT_STATUS_LABELS[created.status] || created.status,
    summary: `Agente demostrativo "${created.name}" creado en estado ${AGENT_STATUS_LABELS[created.status] || created.status} (${created.capabilities.length} capacidades).`,
    version: created.version,
    tone: 'good',
    agent: created.key,
    action: 'Agente creado dinámicamente',
    detail: `Área: ${created.area} · Escala a: ${created.escalationTarget}`
  });
  saveAutomationsState(state);
  return { ok: true, agent: deepClone(created) };
}

export function updateAgent(agentId, patch = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editAgent', `Editar agente ${agentId}`, 'agent', agentId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const idx = st.agents.findIndex(a => String(a.id) === String(agentId) || a.key === String(agentId));
  if (idx === -1) return { ok: false, code: 'NOT_FOUND', message: 'Agente no encontrado.' };

  const current = st.agents[idx];
  const merged = sanitizeAgent({
    ...current,
    ...patch,
    id: current.id,
    key: current.key,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    version: current.version + 1
  }, idx);

  if (merged.name.length < 3) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'El nombre del agente debe tener al menos 3 caracteres.' };
  }
  if (!merged.capabilities.length) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'El agente debe conservar al menos una capacidad permitida.' };
  }

  st.agents[idx] = merged;
  appendAuditInternal({
    type: 'agent_updated',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'agent',
    entityId: String(merged.id),
    entityName: merged.name,
    result: `v${merged.version}`,
    summary: `Agente "${merged.name}" actualizado a versión v${merged.version}.`,
    version: merged.version,
    tone: 'info',
    agent: merged.key,
    action: 'Agente editado',
    detail: `Área: ${merged.area} · Capacidades: ${merged.capabilities.length}`
  });
  saveAutomationsState(state);
  return { ok: true, agent: deepClone(merged) };
}

export function duplicateAgent(agentId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'createAgent', `Duplicar agente ${agentId}`, 'agent', agentId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const source = st.agents.find(a => String(a.id) === String(agentId) || a.key === String(agentId));
  if (!source) return { ok: false, code: 'NOT_FOUND', message: 'Agente origen no encontrado.' };

  return createAgent({
    ...source,
    name: `${source.name} (Copia)`,
    status: 'draft',
    handled: 0,
    escalations: 0
  }, options);
}

export function toggleAgentStatus(agentId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'toggleAgent', `Cambiar estado de agente ${agentId}`, 'agent', agentId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const ag = st.agents.find(a => String(a.id) === String(agentId) || a.key === String(agentId));
  if (!ag) return { ok: false, code: 'NOT_FOUND', message: 'Agente no encontrado.' };
  if (ag.status === 'supervision') {
    return { ok: false, code: 'SUPERVISION_READONLY', message: 'Supervisor ARM permanece siempre en modo supervisión.' };
  }
  if (ag.status === 'archived') {
    return { ok: false, code: 'ARCHIVED_AGENT', message: 'Este agente está archivado.' };
  }

  const targetStatus = options.targetStatus && ['active', 'paused', 'draft'].includes(options.targetStatus)
    ? options.targetStatus
    : (ag.status === 'active' ? 'paused' : 'active');

  if (targetStatus === 'paused' && ag.status === 'active' && !options.allowWithActiveWorkflows) {
    const activeWfs = getActiveWorkflowsUsingAgent(ag.id);
    if (activeWfs.length > 0) {
      return {
        ok: false,
        code: 'AGENT_HAS_ACTIVE_WORKFLOWS',
        activeWorkflows: activeWfs.map(w => ({ id: w.id, name: w.name })),
        message: `El agente "${ag.name}" está asignado a ${activeWfs.length} workflow(s) activo(s) (${activeWfs.map(w => w.name).join(', ')}). Pausa o reasigna esos flujos antes de pausarlo.`
      };
    }
  }

  ag.status = targetStatus;
  ag.updatedAt = new Date().toISOString();
  appendAuditInternal({
    type: 'agent_status_changed',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'agent',
    entityId: String(ag.id),
    entityName: ag.name,
    result: AGENT_STATUS_LABELS[ag.status],
    summary: `Estado del agente "${ag.name}" cambiado a ${AGENT_STATUS_LABELS[ag.status]}.`,
    version: ag.version,
    tone: ag.status === 'active' ? 'good' : 'warn',
    agent: ag.key,
    action: ag.status === 'active' ? 'Agente activado' : 'Agente pausado',
    detail: `${ag.name} -> ${AGENT_STATUS_LABELS[ag.status]}`
  });
  saveAutomationsState(state);
  return { ok: true, agent: deepClone(ag) };
}

export function archiveAgent(agentId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'archiveAgent', `Archivar agente ${agentId}`, 'agent', agentId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const ag = st.agents.find(a => String(a.id) === String(agentId) || a.key === String(agentId));
  if (!ag) return { ok: false, code: 'NOT_FOUND', message: 'Agente no encontrado.' };
  if (ag.status === 'supervision') {
    return { ok: false, code: 'SUPERVISION_READONLY', message: 'No se puede archivar el perfil de supervisión.' };
  }

  const activeWfs = getActiveWorkflowsUsingAgent(ag.id);
  if (activeWfs.length > 0) {
    return {
      ok: false,
      code: 'AGENT_HAS_ACTIVE_WORKFLOWS',
      activeWorkflows: activeWfs.map(w => ({ id: w.id, name: w.name })),
      message: `No se puede archivar "${ag.name}" mientras esté asignado a workflows activos: ${activeWfs.map(w => w.name).join(', ')}. Reasigna o pausa primero dichos workflows.`
    };
  }

  ag.status = 'archived';
  ag.updatedAt = new Date().toISOString();
  appendAuditInternal({
    type: 'agent_status_changed',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'agent',
    entityId: String(ag.id),
    entityName: ag.name,
    result: 'Archivado',
    summary: `Agente "${ag.name}" archivado sin dependencias activas.`,
    version: ag.version,
    tone: 'warn',
    agent: ag.key,
    action: 'Agente archivado',
    detail: ag.name
  });
  saveAutomationsState(state);
  return { ok: true, agent: deepClone(ag) };
}

// =========================================================================
// Consultas de nodos y grafo
// =========================================================================

export function getNodeTypeSpec(type) {
  return NODE_CATALOG.find(n => n.type === type) || null;
}

export function getTriggerPresetSpec(triggerKey) {
  return TRIGGER_PRESETS.find(t => t.key === triggerKey) || TRIGGER_PRESETS[0];
}

export function getCompatibleScenariosForWorkflow(workflow) {
  if (!workflow || !Array.isArray(workflow.nodes)) return deepClone(SIMULATION_SCENARIOS);
  const triggerNode = workflow.nodes.find(n => n.type === 'trigger_event');
  const triggerKey = triggerNode?.config?.triggerKey || 'inicio_manual';
  const matched = SIMULATION_SCENARIOS.filter(s => s.compatibleTriggers.includes(triggerKey));
  if (!matched.length) {
    return deepClone(SIMULATION_SCENARIOS.filter(s => s.id === 'sc-generic-crm' || s.id === 'sc-security-clinical'));
  }
  return deepClone(matched);
}

// =========================================================================
// Undo / Redo por workflow (efímero, no persistido)
// =========================================================================

function pushUndoSnapshot(wf) {
  if (!wf) return;
  if (!undoStack[wf.id]) undoStack[wf.id] = [];
  undoStack[wf.id].push({
    name: wf.name,
    description: wf.description,
    area: wf.area,
    primaryAgentId: wf.primaryAgentId,
    escalationTarget: wf.escalationTarget,
    nodes: deepClone(wf.nodes),
    edges: deepClone(wf.edges)
  });
  if (undoStack[wf.id].length > 35) undoStack[wf.id].shift();
  redoStack[wf.id] = [];
}

export function canUndoWorkflow(workflowId) {
  return Boolean(undoStack[workflowId] && undoStack[workflowId].length > 0);
}

export function canRedoWorkflow(workflowId) {
  return Boolean(redoStack[workflowId] && redoStack[workflowId].length > 0);
}

export function undoWorkflowAction(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', 'Deshacer cambio en workflow', 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf || !undoStack[workflowId]?.length) return { ok: false, code: 'NOTHING_TO_UNDO', message: 'No hay acciones para deshacer.' };

  if (!redoStack[workflowId]) redoStack[workflowId] = [];
  redoStack[workflowId].push({
    name: wf.name,
    description: wf.description,
    area: wf.area,
    primaryAgentId: wf.primaryAgentId,
    escalationTarget: wf.escalationTarget,
    nodes: deepClone(wf.nodes),
    edges: deepClone(wf.edges)
  });

  const snap = undoStack[workflowId].pop();
  Object.assign(wf, deepClone(snap));
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

export function redoWorkflowAction(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', 'Rehacer cambio en workflow', 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf || !redoStack[workflowId]?.length) return { ok: false, code: 'NOTHING_TO_REDO', message: 'No hay acciones para rehacer.' };

  if (!undoStack[workflowId]) undoStack[workflowId] = [];
  undoStack[workflowId].push({
    name: wf.name,
    description: wf.description,
    area: wf.area,
    primaryAgentId: wf.primaryAgentId,
    escalationTarget: wf.escalationTarget,
    nodes: deepClone(wf.nodes),
    edges: deepClone(wf.edges)
  });

  const snap = redoStack[workflowId].pop();
  Object.assign(wf, deepClone(snap));
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

// Al editar un workflow Activo, conserva la versión activa publicada hasta republicar
function markWorkflowEdited(wf) {
  if (wf.status === 'active' && !wf.publishedSnapshot) {
    wf.publishedSnapshot = {
      version: wf.version,
      name: wf.name,
      description: wf.description,
      area: wf.area,
      nodes: deepClone(wf.nodes),
      edges: deepClone(wf.edges),
      activatedAt: wf.activatedAt || wf.updatedAt
    };
    wf.version += 1;
    appendAuditInternal({
      type: 'version_changed',
      role: 'system',
      actorName: 'Control de versiones',
      entityType: 'workflow',
      entityId: wf.id,
      entityName: wf.name,
      result: `Borrador v${wf.version}`,
      summary: `Edición iniciada sobre workflow activo: se conserva versión activa v${wf.publishedSnapshot.version} mientras se edita borrador v${wf.version}.`,
      version: wf.version,
      tone: 'info',
      agent: 'supervisor',
      action: 'Nueva versión en borrador',
      detail: `Activa v${wf.publishedSnapshot.version} protegida · Borrador v${wf.version}`
    });
  }
  wf.hasUnsavedChanges = true;
  if (wf.status === 'paused') {
    wf.needsValidation = true;
  } else if (wf.status === 'validated' || wf.status === 'error') {
    wf.status = 'draft';
    wf.needsValidation = true;
  }
  wf.updatedAt = new Date().toISOString();
}

// =========================================================================
// CRUD de Workflows y Plantillas (Sección 9 y 13)
// =========================================================================

export function getWorkflows(options = {}) {
  const st = ensureStateLoaded();
  const includeArchived = options.includeArchived !== false;
  return deepClone(includeArchived ? st.workflows : st.workflows.filter(w => w.status !== 'archived'));
}

export function getWorkflowById(id) {
  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === id);
  return wf ? deepClone(wf) : null;
}

export function createWorkflow(payload = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'createWorkflow', 'Crear nuevo workflow', 'workflow', 'new');
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wfNum = st.nextIds.workflow++;
  const wfId = `wf-${wfNum}`;
  const trigId = `n-${st.nextIds.node++}`;
  const triggerKey = payload.triggerKey || 'inicio_manual';
  const trigSpec = getTriggerPresetSpec(triggerKey);

  const created = sanitizeWorkflow({
    id: wfId,
    name: payload.name || `Nuevo workflow operativo ${wfNum}`,
    description: payload.description || 'Borrador de automatización visual para demostración clínica/administrativa.',
    area: payload.area || trigSpec.area || 'Recepción',
    status: 'draft',
    version: 1,
    primaryAgentId: payload.primaryAgentId ?? null,
    escalationTarget: payload.escalationTarget || ESCALATION_TARGETS_CATALOG[0],
    createdBy: actor.actorName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    validatedAt: null,
    activatedAt: null,
    hasUnsavedChanges: true,
    publishedSnapshot: null,
    nodes: payload.nodes || [
      {
        id: trigId,
        type: 'trigger_event',
        label: trigSpec.label,
        description: trigSpec.description,
        position: { x: 80, y: 140 },
        config: { triggerKey, area: payload.area || trigSpec.area },
        validationState: 'valid'
      }
    ],
    edges: payload.edges || []
  });

  st.workflows.unshift(created);
  appendAuditInternal({
    type: 'workflow_created',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: created.id,
    entityName: created.name,
    result: 'Borrador v1',
    summary: `Workflow "${created.name}" creado en estado Borrador.`,
    version: created.version,
    tone: 'good',
    agent: 'supervisor',
    action: 'Workflow creado',
    detail: created.name
  });
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(created) };
}

export function createWorkflowFromTemplate(templateId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'createWorkflow', `Crear workflow desde plantilla ${templateId}`, 'workflow', templateId);
  if (!perm.ok) return perm;

  const tpl = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return { ok: false, code: 'NOT_FOUND', message: 'Plantilla no encontrada.' };

  const st = ensureStateLoaded();
  const idMap = {};
  const clonedNodes = tpl.nodes.map(n => {
    const newId = `n-${st.nextIds.node++}`;
    idMap[n.id] = newId;
    return { ...deepClone(n), id: newId };
  });
  const clonedEdges = tpl.edges.map(e => ({
    ...deepClone(e),
    id: `e-${st.nextIds.edge++}`,
    sourceNodeId: idMap[e.sourceNodeId],
    targetNodeId: idMap[e.targetNodeId]
  }));

  return createWorkflow({
    name: `${tpl.name} (Borrador)`,
    description: tpl.description,
    area: tpl.area,
    primaryAgentId: tpl.primaryAgentId,
    escalationTarget: tpl.escalationTarget,
    nodes: clonedNodes,
    edges: clonedEdges
  }, options);
}

export function updateWorkflowMeta(workflowId, patch = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Actualizar metadatos de workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (wf.status === 'archived') return { ok: false, code: 'ARCHIVED', message: 'No puedes editar un workflow archivado; duplícalo primero.' };

  pushUndoSnapshot(wf);
  markWorkflowEdited(wf);
  if (patch.name !== undefined) wf.name = cleanText(patch.name, '', 120);
  if (patch.description !== undefined) wf.description = cleanText(patch.description, '', 360);
  if (patch.area !== undefined && AGENT_AREAS_CATALOG.includes(patch.area)) wf.area = patch.area;
  if (patch.primaryAgentId !== undefined) wf.primaryAgentId = patch.primaryAgentId ? Number(patch.primaryAgentId) : null;
  if (patch.escalationTarget !== undefined && ESCALATION_TARGETS_CATALOG.includes(patch.escalationTarget)) wf.escalationTarget = patch.escalationTarget;

  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

export function saveWorkflowDraft(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Guardar borrador ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (wf.status === 'archived') return { ok: false, code: 'ARCHIVED', message: 'Un workflow archivado no puede guardarse.' };

  // Guardar borrador NO lo activa (Regla 9)
  if (wf.status === 'active' && wf.hasUnsavedChanges) {
    // Mantiene publishedSnapshot como versión activa previa mientras el editor guarda cambios en borrador
  } else if (wf.status !== 'active') {
    wf.status = 'draft';
  }
  wf.hasUnsavedChanges = false;
  wf.updatedAt = new Date().toISOString();

  appendAuditInternal({
    type: 'workflow_saved',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: wf.id,
    entityName: wf.name || '(Sin nombre)',
    result: wf.publishedSnapshot ? `Borrador v${wf.version} guardado (activa v${wf.publishedSnapshot.version})` : `Borrador v${wf.version}`,
    summary: `Borrador de "${wf.name || wf.id}" guardado localmente en versión v${wf.version}.`,
    version: wf.version,
    tone: 'info',
    agent: 'supervisor',
    action: 'Borrador guardado',
    detail: `${wf.nodes.length} nodos · ${wf.edges.length} conexiones`
  });
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

export function duplicateWorkflow(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'createWorkflow', `Duplicar workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const src = st.workflows.find(w => w.id === workflowId);
  if (!src) return { ok: false, code: 'NOT_FOUND', message: 'Workflow origen no encontrado.' };

  const wfNum = st.nextIds.workflow++;
  const newId = `wf-${wfNum}`;
  const nodeMap = {};
  const nodes = src.nodes.map(n => {
    const nid = `n-${st.nextIds.node++}`;
    nodeMap[n.id] = nid;
    return { ...deepClone(n), id: nid };
  });
  const edges = src.edges.map(e => ({
    ...deepClone(e),
    id: `e-${st.nextIds.edge++}`,
    sourceNodeId: nodeMap[e.sourceNodeId],
    targetNodeId: nodeMap[e.targetNodeId]
  })).filter(e => e.sourceNodeId && e.targetNodeId);

  const dup = sanitizeWorkflow({
    ...deepClone(src),
    id: newId,
    name: `${src.name || 'Workflow'} (Copia)`,
    status: 'draft',
    version: 1,
    createdBy: actor.actorName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    validatedAt: null,
    activatedAt: null,
    hasUnsavedChanges: false,
    publishedSnapshot: null,
    nodes,
    edges
  });

  st.workflows.unshift(dup);
  appendAuditInternal({
    type: 'workflow_duplicated',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: dup.id,
    entityName: dup.name,
    result: 'Borrador v1',
    summary: `Workflow duplicado desde "${src.name}" hacia "${dup.name}" (estado Borrador).`,
    version: 1,
    tone: 'info',
    agent: 'supervisor',
    action: 'Workflow duplicado',
    detail: `Origen: ${src.name} -> Nuevo ID: ${dup.id}`
  });
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(dup) };
}

export function activateWorkflow(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'activateWorkflow', `Activar workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (wf.status === 'archived') return { ok: false, code: 'ARCHIVED', message: 'No puedes activar un workflow archivado.' };

  // Opción explícita del usuario para activar agentes en borrador vinculados
  if (options.activateLinkedAgents) {
    for (const node of wf.nodes) {
      if (node.type === 'agent_execute' && node.config?.agentId) {
        const ag = st.agents.find(a => a.id === Number(node.config.agentId));
        if (ag && (ag.status === 'draft' || ag.status === 'paused')) {
          ag.status = 'active';
          ag.updatedAt = new Date().toISOString();
          appendAuditInternal({
            type: 'agent_status_changed',
            role: actor.role,
            actorName: actor.actorName,
            entityType: 'agent',
            entityId: String(ag.id),
            entityName: ag.name,
            result: 'Activo',
            summary: `Agente "${ag.name}" activado al publicar el workflow.`,
            version: ag.version,
            tone: 'good',
            agent: ag.key,
            action: 'Agente activado',
            detail: ag.name
          });
        }
      }
    }
  }

  const report = validateWorkflowStructure(wf, st.agents, { mode: 'activate' });
  applyNodeValidationStates(wf, report);
  if (!report.valid) {
    wf.status = 'error';
    appendAuditInternal({
      type: 'validation_error',
      role: actor.role,
      actorName: actor.actorName,
      entityType: 'workflow',
      entityId: wf.id,
      entityName: wf.name || '(Sin nombre)',
      result: `${report.errors.length} error(es)`,
      summary: `Activación rechazada: ${report.errors[0]?.message || 'errores estructurales'}.`,
      version: wf.version,
      tone: 'bad',
      agent: 'supervisor',
      action: 'Activación bloqueada',
      detail: `${report.errors.length} errores bloqueantes`
    });
    saveAutomationsState(state);
    return { ok: false, code: 'VALIDATION_FAILED', validation: report, workflow: deepClone(wf), message: report.errors[0]?.message || 'El workflow contiene errores de validación.' };
  }

  wf.status = 'active';
  wf.hasUnsavedChanges = false;
  wf.needsValidation = false;
  wf.validatedAt = new Date().toISOString();
  wf.activatedAt = new Date().toISOString();
  wf.updatedAt = new Date().toISOString();
  wf.publishedSnapshot = null;

  appendAuditInternal({
    type: 'workflow_activated',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: wf.id,
    entityName: wf.name,
    result: `Activo v${wf.version}`,
    summary: `Workflow "${wf.name}" validado y publicado en versión v${wf.version}.`,
    version: wf.version,
    tone: 'good',
    agent: 'supervisor',
    action: 'Workflow activado',
    detail: `Versión publicada v${wf.version}`
  });
  saveAutomationsState(state);
  return { ok: true, validation: report, workflow: deepClone(wf) };
}

export function pauseWorkflow(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'pauseWorkflow', `Pausar workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (wf.status === 'archived') return { ok: false, code: 'ARCHIVED', message: 'El workflow ya está archivado.' };

  wf.status = 'paused';
  wf.updatedAt = new Date().toISOString();
  appendAuditInternal({
    type: 'workflow_paused',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: wf.id,
    entityName: wf.name,
    result: 'Pausado',
    summary: `Workflow "${wf.name}" pausado por ${actor.actorName}.`,
    version: wf.version,
    tone: 'warn',
    agent: 'supervisor',
    action: 'Workflow pausado',
    detail: wf.name
  });
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

export function archiveWorkflow(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'archiveWorkflow', `Archivar workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;
  if (!options.confirmed) {
    return { ok: false, code: 'CONFIRMATION_REQUIRED', message: 'Archivar un workflow requiere confirmación explícita.' };
  }

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };

  wf.status = 'archived';
  wf.hasUnsavedChanges = false;
  wf.needsValidation = false;
  wf.updatedAt = new Date().toISOString();
  appendAuditInternal({
    type: 'workflow_archived',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: wf.id,
    entityName: wf.name,
    result: 'Archivado',
    summary: `Workflow "${wf.name}" archivado con trazabilidad histórica conservada.`,
    version: wf.version,
    tone: 'warn',
    agent: 'supervisor',
    action: 'Workflow archivado',
    detail: `Historial y auditoría preservados · v${wf.version}`
  });
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

// =========================================================================
// Operaciones sobre Nodos y Conexiones (Sección 7)
// =========================================================================

export function addWorkflowNode(workflowId, nodeSpec = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Agregar nodo a ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (wf.status === 'archived') return { ok: false, code: 'ARCHIVED', message: 'No puedes modificar un workflow archivado.' };

  const spec = getNodeTypeSpec(nodeSpec.type);
  if (!spec) return { ok: false, code: 'INVALID_NODE_TYPE', message: 'Tipo de nodo inválido.' };

  pushUndoSnapshot(wf);
  const nid = `n-${st.nextIds.node++}`;
  const config = { ...deepClone(spec.defaultConfig), ...(nodeSpec.config ? deepClone(nodeSpec.config) : {}) };

  let label = nodeSpec.label ?? spec.label;
  let description = nodeSpec.description ?? spec.description;
  if (spec.type === 'trigger_event' && config.triggerKey) {
    const trig = getTriggerPresetSpec(config.triggerKey);
    if (!nodeSpec.label) label = trig.label;
    if (!nodeSpec.description) description = trig.description;
  }

  const pos = nodeSpec.position || {
    x: 80 + ((wf.nodes.length % 4) * 250),
    y: 70 + (Math.floor(wf.nodes.length / 4) * 165)
  };

  const node = sanitizeWorkflowNode({ id: nid, type: spec.type, label, description, position: pos, config, validationState: 'valid' });
  wf.nodes.push(node);
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, node: deepClone(node), workflow: deepClone(wf) };
}

export function moveWorkflowNode(workflowId, nodeId, position, options = {}) {
  const actor = normalizeActor(options);
  if (!canPerformAutomationAction(actor.role, 'editWorkflow')) {
    return assertPermission(actor, 'editWorkflow', `Mover nodo ${nodeId}`, 'workflow', workflowId);
  }
  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  const node = wf.nodes.find(n => n.id === nodeId);
  if (!node) return { ok: false, code: 'NODE_NOT_FOUND', message: 'Nodo no encontrado.' };

  if (options.recordUndo) pushUndoSnapshot(wf);
  node.position = {
    x: clampNumber(position.x, 12, 5600, node.position.x),
    y: clampNumber(position.y, 12, 3600, node.position.y)
  };
  markWorkflowEdited(wf);
  if (options.persist !== false) {
    saveAutomationsState(state);
  }
  return { ok: true, node: deepClone(node) };
}

export function updateWorkflowNode(workflowId, nodeId, patch = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Configurar nodo ${nodeId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  const node = wf.nodes.find(n => n.id === nodeId);
  if (!node) return { ok: false, code: 'NODE_NOT_FOUND', message: 'Nodo no encontrado.' };

  pushUndoSnapshot(wf);
  if (patch.label !== undefined) node.label = cleanText(patch.label, '', 100);
  if (patch.description !== undefined) node.description = cleanText(patch.description, '', 260);
  if (patch.config && typeof patch.config === 'object') {
    node.config = { ...node.config, ...deepClone(patch.config) };
  }
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, node: deepClone(node), workflow: deepClone(wf) };
}

export function duplicateWorkflowNode(workflowId, nodeId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Duplicar nodo ${nodeId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  const src = wf.nodes.find(n => n.id === nodeId);
  if (!src) return { ok: false, code: 'NODE_NOT_FOUND', message: 'Nodo origen no encontrado.' };

  return addWorkflowNode(workflowId, {
    type: src.type,
    label: `${src.label} (Copia)`,
    description: src.description,
    position: { x: src.position.x + 44, y: src.position.y + 44 },
    config: deepClone(src.config)
  }, options);
}

export function removeWorkflowNode(workflowId, nodeId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Eliminar nodo ${nodeId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  const exists = wf.nodes.some(n => n.id === nodeId);
  if (!exists) return { ok: false, code: 'NODE_NOT_FOUND', message: 'Nodo no encontrado.' };

  pushUndoSnapshot(wf);
  wf.nodes = wf.nodes.filter(n => n.id !== nodeId);
  wf.edges = wf.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId);
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

export function wouldCreateCycle(workflow, sourceNodeId, targetNodeId) {
  if (!workflow || sourceNodeId === targetNodeId) return true;
  // Si desde targetNodeId podemos alcanzar sourceNodeId, agregar source -> target cerraría un ciclo
  const adj = new Map();
  for (const e of workflow.edges || []) {
    if (!adj.has(e.sourceNodeId)) adj.set(e.sourceNodeId, []);
    adj.get(e.sourceNodeId).push(e.targetNodeId);
  }
  const visited = new Set();
  const queue = [targetNodeId];
  while (queue.length) {
    const curr = queue.shift();
    if (curr === sourceNodeId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const next of adj.get(curr) || []) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return false;
}

export function validateConnectionAttempt(workflow, sourceNodeId, sourcePort = 'out', targetNodeId, targetPort = 'in') {
  if (!workflow) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  const src = workflow.nodes.find(n => n.id === sourceNodeId);
  const tgt = workflow.nodes.find(n => n.id === targetNodeId);
  if (!src || !tgt) return { ok: false, code: 'NODE_NOT_FOUND', message: 'Nodo origen o destino inexistente.' };

  if (sourceNodeId === targetNodeId) {
    return { ok: false, code: 'SELF_CONNECTION', message: 'No se permite conectar un nodo consigo mismo.' };
  }

  const srcSpec = getNodeTypeSpec(src.type);
  const tgtSpec = getNodeTypeSpec(tgt.type);
  if (!srcSpec || !srcSpec.outputs.includes(sourcePort)) {
    return { ok: false, code: 'INVALID_SOURCE_PORT', message: `El nodo "${src.label}" no dispone de la salida "${sourcePort}".` };
  }
  if (!tgtSpec || !tgtSpec.inputs.includes(targetPort)) {
    return { ok: false, code: 'INVALID_TARGET_PORT', message: `El nodo "${tgt.label}" no admite conexiones de entrada.` };
  }

  const dup = workflow.edges.some(e =>
    e.sourceNodeId === sourceNodeId &&
    e.sourcePort === sourcePort &&
    e.targetNodeId === targetNodeId &&
    e.targetPort === targetPort
  );
  if (dup) {
    return { ok: false, code: 'DUPLICATE_CONNECTION', message: 'Esa conexión ya existe en el diagrama.' };
  }

  const outgoingUsed = workflow.edges.some(e => e.sourceNodeId === sourceNodeId && e.sourcePort === sourcePort);
  if (outgoingUsed) {
    return { ok: false, code: 'SOURCE_PORT_OCCUPIED', message: `La salida "${sourcePort === 'yes' ? 'Sí' : sourcePort === 'no' ? 'No' : 'Siguiente'}" ya está conectada. Elimínala antes de reconectar.` };
  }

  const incomingUsed = workflow.edges.some(e => e.targetNodeId === targetNodeId && e.targetPort === targetPort);
  if (incomingUsed) {
    return { ok: false, code: 'TARGET_PORT_OCCUPIED', message: `La entrada de "${tgt.label}" solo admite una conexión de origen.` };
  }

  if (wouldCreateCycle(workflow, sourceNodeId, targetNodeId)) {
    return { ok: false, code: 'CYCLE_DETECTED', message: 'Conexión rechazada: formaría un ciclo o bucle infinito.' };
  }

  return { ok: true };
}

export function connectWorkflowNodes(workflowId, edgeSpec = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Conectar nodos en ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };

  const sourcePort = edgeSpec.sourcePort || 'out';
  const targetPort = edgeSpec.targetPort || 'in';
  const check = validateConnectionAttempt(wf, edgeSpec.sourceNodeId, sourcePort, edgeSpec.targetNodeId, targetPort);
  if (!check.ok) return check;

  pushUndoSnapshot(wf);
  const label = sourcePort === 'yes' ? 'Sí' : sourcePort === 'no' ? 'No' : cleanText(edgeSpec.label ?? '', '', 24);
  const edge = {
    id: `e-${st.nextIds.edge++}`,
    sourceNodeId: edgeSpec.sourceNodeId,
    sourcePort,
    targetNodeId: edgeSpec.targetNodeId,
    targetPort,
    label
  };
  wf.edges.push(edge);
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, edge: deepClone(edge), workflow: deepClone(wf) };
}

export function removeWorkflowEdge(workflowId, edgeId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'editWorkflow', `Eliminar conexión ${edgeId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (!wf.edges.some(e => e.id === edgeId)) return { ok: false, code: 'EDGE_NOT_FOUND', message: 'Conexión no encontrada.' };

  pushUndoSnapshot(wf);
  wf.edges = wf.edges.filter(e => e.id !== edgeId);
  markWorkflowEdited(wf);
  saveAutomationsState(state);
  return { ok: true, workflow: deepClone(wf) };
}

export function autoLayoutWorkflowNodes(workflowId, options = {}) {
  const actor = normalizeActor(options);
  if (options.persist !== false) {
    const perm = assertPermission(actor, 'editWorkflow', `Autoordenar diagrama ${workflowId}`, 'workflow', workflowId);
    if (!perm.ok) return perm;
  }

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };
  if (!wf.nodes.length) return { ok: true, workflow: deepClone(wf) };

  if (options.persist !== false) pushUndoSnapshot(wf);

  // Diseño topológico por niveles + filas por rama Sí/No
  const nodeById = new Map(wf.nodes.map(n => [n.id, n]));
  const inDegree = new Map(wf.nodes.map(n => [n.id, 0]));
  const outEdges = new Map(wf.nodes.map(n => [n.id, []]));
  for (const e of wf.edges) {
    if (outEdges.has(e.sourceNodeId)) outEdges.get(e.sourceNodeId).push(e);
    if (inDegree.has(e.targetNodeId)) inDegree.set(e.targetNodeId, inDegree.get(e.targetNodeId) + 1);
  }

  const triggers = wf.nodes.filter(n => n.type === 'trigger_event');
  const roots = triggers.length ? triggers : wf.nodes.filter(n => inDegree.get(n.id) === 0);
  const visited = new Set();
  const colOf = new Map();
  const rowOf = new Map();
  const usedSlots = new Set();

  function assignPosition(nodeId, col, preferredRow) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    let r = preferredRow;
    while (usedSlots.has(`${col}:${r}`)) r += 1;
    usedSlots.add(`${col}:${r}`);
    colOf.set(nodeId, col);
    rowOf.set(nodeId, r);

    const edges = (outEdges.get(nodeId) || []).slice().sort((a, b) => (a.sourcePort === 'yes' ? -1 : 1));
    edges.forEach((edge, idx) => {
      const nextRow = edge.sourcePort === 'no' ? r + 1 : r + (idx > 0 ? idx : 0);
      assignPosition(edge.targetNodeId, col + 1, nextRow);
    });
  }

  roots.forEach((root, idx) => assignPosition(root.id, 0, idx));
  let orphanRow = (Math.max(0, ...Array.from(rowOf.values()), 0)) + 1;
  for (const n of wf.nodes) {
    if (!visited.has(n.id)) {
      assignPosition(n.id, 0, orphanRow++);
    }
  }

  for (const n of wf.nodes) {
    const col = colOf.get(n.id) ?? 0;
    const row = rowOf.get(n.id) ?? 0;
    const spec = nodeById.get(n.id);
    if (spec) {
      spec.position = {
        x: 40 + col * 265,
        y: 50 + row * 168
      };
    }
  }

  if (options.persist !== false) {
    markWorkflowEdited(wf);
    saveAutomationsState(state);
  }
  return { ok: true, workflow: deepClone(wf) };
}

// =========================================================================
// Motor de Validación Estructural y Seguridad Clínica/Financiera (Sección 10 y 14)
// =========================================================================

function containsRestrictedTerm(text) {
  const lower = String(text || '').toLowerCase();
  for (const kw of RESTRICTED_CLINICAL_FINANCIAL_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function applyNodeValidationStates(wf, report) {
  for (const n of wf.nodes) {
    const issues = report.nodeIssues[n.id] || [];
    if (issues.some(i => i.severity === 'error')) n.validationState = 'error';
    else if (issues.some(i => i.severity === 'warning')) n.validationState = 'warning';
    else n.validationState = 'valid';
  }
}

export function validateWorkflowStructure(workflow, agentsList = null, options = {}) {
  const st = ensureStateLoaded();
  const agents = Array.isArray(agentsList) ? agentsList : st.agents;
  const mode = options.mode === 'activate' ? 'activate' : 'validate';
  const items = [];
  let seq = 1;

  function addIssue({ code, severity, nodeId = null, edgeId = null, title, message, field = null }) {
    items.push({ id: `val-${seq++}`, code, severity, nodeId, edgeId, title, message, field });
  }

  if (!workflow || typeof workflow !== 'object') {
    addIssue({ code: 'WORKFLOW_MISSING', severity: 'error', title: 'Workflow inválido', message: 'No existe un diagrama válido.' });
    return summarizeValidation(items);
  }

  // 1. Nombre del workflow obligatorio
  if (!cleanText(workflow.name, '', 120) || cleanText(workflow.name, '', 120).length < 3) {
    addIssue({ code: 'WORKFLOW_NAME_REQUIRED', severity: 'error', title: 'Nombre requerido', message: 'El workflow debe tener un nombre descriptivo (mínimo 3 caracteres).', field: 'workflow.name' });
  }

  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const edges = Array.isArray(workflow.edges) ? workflow.edges : [];
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // 2. Exactamente un nodo de inicio (disparador)
  const triggers = nodes.filter(n => n.type === 'trigger_event');
  if (triggers.length === 0) {
    addIssue({ code: 'NO_TRIGGER_NODE', severity: 'error', title: 'Sin nodo disparador', message: 'El workflow debe tener exactamente un nodo disparador de inicio.' });
  } else if (triggers.length > 1) {
    triggers.slice(1).forEach(extra => {
      addIssue({ code: 'MULTIPLE_TRIGGER_NODES', severity: 'error', nodeId: extra.id, title: 'Múltiples disparadores', message: `Solo se permite un disparador de inicio; elimina "${extra.label || extra.id}".` });
    });
  }

  // 3. Inicio válido y conectado
  const mainTrigger = triggers[0] || null;
  if (mainTrigger) {
    const trigKey = mainTrigger.config?.triggerKey;
    if (!TRIGGER_PRESETS.some(t => t.key === trigKey)) {
      addIssue({ code: 'INVALID_TRIGGER_CONFIG', severity: 'error', nodeId: mainTrigger.id, field: 'triggerKey', title: 'Disparador inválido', message: 'Selecciona un disparador válido del catálogo.' });
    }
    const hasOut = edges.some(e => e.sourceNodeId === mainTrigger.id && e.sourcePort === 'out');
    if (!hasOut) {
      addIssue({ code: 'TRIGGER_UNCONNECTED', severity: 'error', nodeId: mainTrigger.id, title: 'Disparador sin salida', message: 'Conecta la salida del nodo disparador al siguiente paso.' });
    }
  }

  // 4. Duplicados / entradas múltiples / pasos tras nodo final
  const seenPairs = new Set();
  const inCounts = new Map();
  const outMap = new Map();
  for (const e of edges) {
    if (!nodeById.has(e.sourceNodeId) || !nodeById.has(e.targetNodeId)) {
      addIssue({ code: 'INCOMPLETE_CONNECTION', severity: 'error', edgeId: e.id, title: 'Conexión rota', message: 'Existe una conexión apuntando a un nodo inexistente.' });
      continue;
    }
    if (e.sourceNodeId === e.targetNodeId) {
      addIssue({ code: 'SELF_CONNECTION', severity: 'error', nodeId: e.sourceNodeId, edgeId: e.id, title: 'Autoconexión inválida', message: 'Un nodo no puede conectarse consigo mismo.' });
    }
    const pairKey = `${e.sourceNodeId}:${e.sourcePort}->${e.targetNodeId}:${e.targetPort}`;
    if (seenPairs.has(pairKey)) {
      addIssue({ code: 'DUPLICATE_CONNECTION', severity: 'error', nodeId: e.sourceNodeId, edgeId: e.id, title: 'Conexión duplicada', message: 'Existen conexiones duplicadas entre los mismos puertos.' });
    }
    seenPairs.add(pairKey);

    inCounts.set(e.targetNodeId, (inCounts.get(e.targetNodeId) || 0) + 1);
    if (!outMap.has(e.sourceNodeId)) outMap.set(e.sourceNodeId, []);
    outMap.get(e.sourceNodeId).push(e);

    const srcNode = nodeById.get(e.sourceNodeId);
    const tgtNode = nodeById.get(e.targetNodeId);
    if (tgtNode?.type === 'trigger_event') {
      addIssue({ code: 'CONNECTION_INTO_TRIGGER', severity: 'error', nodeId: tgtNode.id, edgeId: e.id, title: 'Entrada en disparador', message: 'Un nodo disparador no puede recibir conexiones de entrada.' });
    }
    if (srcNode && (srcNode.type === 'end_success' || srcNode.type === 'end_security_block')) {
      addIssue({ code: 'STEPS_AFTER_END_NODE', severity: 'error', nodeId: srcNode.id, edgeId: e.id, title: 'Pasos tras nodo final', message: `El nodo final "${srcNode.label || srcNode.id}" no debe tener conexiones posteriores.` });
    }
  }

  for (const [targetId, count] of inCounts.entries()) {
    if (count > 1) {
      addIssue({ code: 'MULTIPLE_INPUTS', severity: 'error', nodeId: targetId, title: 'Múltiples orígenes', message: 'La entrada de este nodo admite un solo origen.' });
    }
  }

  // 5. Detección de ciclos (DFS 3 colores)
  const color = new Map();
  function dfsCycle(nodeId) {
    color.set(nodeId, 'gray');
    for (const e of outMap.get(nodeId) || []) {
      const next = e.targetNodeId;
      if (color.get(next) === 'gray') {
        addIssue({ code: 'CYCLE_DETECTED', severity: 'error', nodeId, edgeId: e.id, title: 'Ciclo no permitido', message: `Se detectó un ciclo en el flujo hacia "${nodeById.get(next)?.label || next}".` });
      } else if (!color.has(next)) {
        dfsCycle(next);
      }
    }
    color.set(nodeId, 'black');
  }
  for (const n of nodes) {
    if (!color.has(n.id)) dfsCycle(n.id);
  }

  // 6. Alcanzabilidad (nodos huérfanos) desde el disparador
  const reachable = new Set();
  if (mainTrigger) {
    const queue = [mainTrigger.id];
    while (queue.length) {
      const id = queue.shift();
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const e of outMap.get(id) || []) {
        if (!reachable.has(e.targetNodeId)) queue.push(e.targetNodeId);
      }
    }
    for (const n of nodes) {
      if (n.id !== mainTrigger.id && !reachable.has(n.id)) {
        addIssue({ code: 'ORPHAN_NODE', severity: 'error', nodeId: n.id, title: 'Nodo huérfano', message: `El nodo "${n.label || n.type}" no está conectado al recorrido desde el disparador.` });
      }
    }
  }

  // 7. Salidas completas, ramas Sí/No, terminación de todos los caminos, propiedades y seguridad
  let hasReminderWithoutApproval = false;
  let hasApprovalNode = nodes.some(n => n.type === 'human_approval');

  for (const n of nodes) {
    const spec = getNodeTypeSpec(n.type);
    const outs = outMap.get(n.id) || [];

    if (!cleanText(n.label, '', 100)) {
      addIssue({ code: 'NODE_LABEL_REQUIRED', severity: 'error', nodeId: n.id, field: 'label', title: 'Nombre de nodo vacío', message: 'Todo nodo debe tener una etiqueta visible.' });
    }

    if (spec?.category === 'condition') {
      const hasYes = outs.some(e => e.sourcePort === 'yes');
      const hasNo = outs.some(e => e.sourcePort === 'no');
      if (!hasYes) {
        addIssue({ code: 'CONDITION_BRANCH_MISSING', severity: 'error', nodeId: n.id, title: 'Falta rama Sí', message: `La condición "${n.label || n.id}" debe conectar su salida "Sí".` });
      }
      if (!hasNo) {
        addIssue({ code: 'CONDITION_BRANCH_MISSING', severity: 'error', nodeId: n.id, title: 'Falta rama No', message: `La condición "${n.label || n.id}" debe conectar su salida "No".` });
      }
    } else if (spec && spec.outputs.length > 0 && n.type !== 'trigger_event') {
      if (!outs.some(e => e.sourcePort === 'out')) {
        addIssue({ code: 'PATH_DOES_NOT_END', severity: 'error', nodeId: n.id, title: 'Recorrido sin cierre', message: `El nodo "${n.label || n.id}" no termina en un nodo de Finalización ni continúa hacia otro paso.` });
      }
    }

    // Validación de propiedades y seguridad clínica/financiera
    const cfg = n.config || {};
    const combinedText = `${n.label} ${n.description} ${JSON.stringify(cfg)}`;
    if (n.type !== 'end_security_block') {
      const isGuardrailCondition = spec?.category === 'condition' &&
        cfg.field === 'sensitiveContent' &&
        outs.some(e => e.sourcePort === 'yes' && nodeById.get(e.targetNodeId)?.type === 'end_security_block');
      const restrictedKw = isGuardrailCondition ? null : containsRestrictedTerm(combinedText);
      if (restrictedKw) {
        addIssue({
          code: 'CLINICAL_FINANCIAL_RESTRICTED',
          severity: 'error',
          nodeId: n.id,
          title: 'Acción clínica o financiera bloqueada',
          message: `El nodo "${n.label}" referencia "${restrictedKw}", lo cual no puede automatizarse sin revisión humana o nodo Bloquear por seguridad.`
        });
      }
    }

    if (n.type === 'condition_branch') {
      if (!cfg.field || cfg.expectedValue === undefined || cfg.expectedValue === '') {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'field', title: 'Condición incompleta', message: 'Configura campo y valor esperado en la condición.' });
      }
    } else if (n.type === 'condition_group') {
      if (!Array.isArray(cfg.rules) || cfg.rules.length < 2) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'rules', title: 'Grupo incompleto', message: 'Un grupo AND/OR requiere al menos 2 criterios configurados.' });
      }
    } else if (n.type === 'wait_delay') {
      const mins = Number(cfg.durationMinutes);
      if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
        addIssue({ code: 'INVALID_TIMING_OR_LIMIT', severity: 'error', nodeId: n.id, field: 'durationMinutes', title: 'Espera inválida', message: 'La espera simulada debe estar entre 1 y 1440 minutos.' });
      }
    } else if (n.type === 'human_approval') {
      if (!cleanText(cfg.approverRole, '', 80) || !cleanText(cfg.approvalPrompt, '', 200)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'approverRole', title: 'Aprobación incompleta', message: 'Define el responsable aprobador y el mensaje de confirmación.' });
      }
      const th = Number(cfg.timeoutHours);
      if (!Number.isFinite(th) || th < 1 || th > 72) {
        addIssue({ code: 'INVALID_TIMING_OR_LIMIT', severity: 'error', nodeId: n.id, field: 'timeoutHours', title: 'Tiempo límite inválido', message: 'El tiempo de espera de aprobación debe estar entre 1 y 72 horas.' });
      }
    } else if (n.type === 'action_task') {
      if (!cleanText(cfg.targetArea, '', 60) || !cleanText(cfg.taskTitle, '', 160)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'taskTitle', title: 'Tarea incompleta', message: 'Especifica área de destino y título de la tarea interna.' });
      }
    } else if (n.type === 'action_reminder') {
      hasReminderWithoutApproval = !hasApprovalNode;
      if (!cleanText(cfg.channel, '', 60) || !cleanText(cfg.template, '', 240)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'template', title: 'Recordatorio incompleto', message: 'Indica el canal simulado y el texto del recordatorio.' });
      }
    } else if (n.type === 'action_crm_update') {
      if (!cleanText(cfg.stage, '', 60) && !cleanText(cfg.tag, '', 60)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'stage', title: 'CRM incompleto', message: 'Define etapa, prioridad o etiqueta a actualizar.' });
      }
    } else if (n.type === 'action_internal_note') {
      if (!cleanText(cfg.noteText, '', 240)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'noteText', title: 'Nota vacía', message: 'Escribe el contenido administrativo de la nota interna.' });
      }
    } else if (n.type === 'action_route_area') {
      if (!['Recepción', 'Caja'].includes(cfg.destinationArea)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'destinationArea', title: 'Área de derivación requerida', message: 'Selecciona Recepción o Caja para derivar.' });
      }
    } else if (n.type === 'end_security_block') {
      if (!cleanText(cfg.blockReason, '', 240)) {
        addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'blockReason', title: 'Motivo de bloqueo requerido', message: 'Explica el motivo del bloqueo sin incluir datos sensibles.' });
      }
    } else if (n.type === 'agent_execute') {
      const ag = agents.find(a => Number(a.id) === Number(cfg.agentId) || a.key === String(cfg.agentId));
      if (!ag) {
        addIssue({ code: 'AGENT_REQUIRED', severity: 'error', nodeId: n.id, field: 'agentId', title: 'Agente requerido', message: 'Selecciona o crea un agente para este paso.' });
      } else {
        if (ag.status === 'archived') {
          addIssue({ code: 'AGENT_ARCHIVED', severity: 'error', nodeId: n.id, field: 'agentId', title: 'Agente archivado', message: `El agente "${ag.name}" está archivado. Reasigna el nodo a otro agente.` });
        } else if (ag.status === 'draft' || ag.status === 'paused') {
          if (mode === 'activate') {
            addIssue({
              code: 'AGENT_NOT_ACTIVE',
              severity: 'error',
              nodeId: n.id,
              field: 'agentId',
              title: 'Agente inactivo para publicación',
              message: `El agente "${ag.name}" está en estado ${AGENT_STATUS_LABELS[ag.status]}; actívalo antes de publicar este workflow.`
            });
          } else {
            addIssue({
              code: 'AGENT_DRAFT_OR_PAUSED_WARNING',
              severity: 'warning',
              nodeId: n.id,
              field: 'agentId',
              title: 'Agente en borrador o pausado',
              message: `"${ag.name}" está en estado ${AGENT_STATUS_LABELS[ag.status]}: permitido para simulación, pero requerirá activación antes de publicar.`
            });
          }
        }
        const reqCap = cfg.requiredCapability;
        if (!reqCap) {
          addIssue({ code: 'REQUIRED_PROPERTIES_MISSING', severity: 'error', nodeId: n.id, field: 'requiredCapability', title: 'Capacidad requerida faltante', message: 'Selecciona la capacidad que ejecutará el agente.' });
        } else {
          if (Array.isArray(ag.forbiddenActions) && ag.forbiddenActions.includes(reqCap)) {
            addIssue({ code: 'AGENT_FORBIDDEN_CONFIGURED', severity: 'error', nodeId: n.id, field: 'requiredCapability', title: 'Acción prohibida en agente', message: `El agente "${ag.name}" tiene prohibida esta operación.` });
          }
          if (!Array.isArray(ag.capabilities) || !ag.capabilities.includes(reqCap)) {
            const capLabel = AGENT_CAPABILITIES_CATALOG.find(c => c.key === reqCap)?.label || reqCap;
            addIssue({ code: 'AGENT_CAPABILITY_MISSING', severity: 'error', nodeId: n.id, field: 'requiredCapability', title: 'Capacidad insuficiente en agente', message: `El agente "${ag.name}" no tiene habilitada la capacidad "${capLabel}".` });
          }
        }
        if (ag.maxAttempts < 1 || ag.maxAttempts > 10 || ag.retryDelay < 1) {
          addIssue({ code: 'INVALID_TIMING_OR_LIMIT', severity: 'error', nodeId: n.id, field: 'agentId', title: 'Límites de agente inválidos', message: 'Revisa máximo de intentos y espera entre reintentos del agente.' });
        }
      }
    }
  }

  // Información y recomendaciones no bloqueantes
  if (hasReminderWithoutApproval && !items.some(i => i.severity === 'error')) {
    addIssue({ code: 'RECOMMEND_HUMAN_APPROVAL', severity: 'info', title: 'Recomendación de supervisión', message: 'Sugerencia: incluir "Solicitar aprobación humana" antes de preparar recordatorios externos.' });
  }
  if (nodes.some(n => getNodeTypeSpec(n.type)?.executionMode === 'simulado')) {
    addIssue({ code: 'SIMULATED_NODES_INFO', severity: 'info', title: 'Pasos externos simulados', message: 'El diagrama incluye espera acelerada, recordatorio simulado o agente demostrativo; ninguna acción envía mensajes reales.' });
  }

  return summarizeValidation(items);
}

function summarizeValidation(items) {
  const errors = items.filter(i => i.severity === 'error');
  const warnings = items.filter(i => i.severity === 'warning');
  const infos = items.filter(i => i.severity === 'info');
  const nodeIssues = {};
  for (const item of items) {
    if (item.nodeId) {
      if (!nodeIssues[item.nodeId]) nodeIssues[item.nodeId] = [];
      nodeIssues[item.nodeId].push(item);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    items,
    nodeIssues,
    summary: errors.length === 0
      ? `Validación correcta (${warnings.length} advertencia(s), ${infos.length} aviso(s)).`
      : `${errors.length} error(es) bloqueante(s) y ${warnings.length} advertencia(s).`
  };
}

export function validateAndSaveWorkflowStatus(workflowId, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'validateWorkflow', `Validar workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };

  const report = validateWorkflowStructure(wf, st.agents, { mode: 'validate' });
  applyNodeValidationStates(wf, report);

  if (report.valid) {
    if (wf.status !== 'active' && wf.status !== 'paused') {
      wf.status = 'validated';
    }
    wf.needsValidation = false;
    wf.validatedAt = new Date().toISOString();
    appendAuditInternal({
      type: 'workflow_validated',
      role: actor.role,
      actorName: actor.actorName,
      entityType: 'workflow',
      entityId: wf.id,
      entityName: wf.name,
      result: 'Válido',
      summary: `Validación estructural superada (${report.warnings.length} advertencia(s)).`,
      version: wf.version,
      tone: 'good',
      agent: 'supervisor',
      action: 'Validación satisfactoria',
      detail: report.summary
    });
  } else {
    wf.status = 'error';
    wf.needsValidation = true;
    appendAuditInternal({
      type: 'validation_error',
      role: actor.role,
      actorName: actor.actorName,
      entityType: 'workflow',
      entityId: wf.id,
      entityName: wf.name || '(Sin nombre)',
      result: `${report.errors.length} error(es)`,
      summary: `Validación con errores: ${report.errors[0]?.message || ''}`,
      version: wf.version,
      tone: 'bad',
      agent: 'supervisor',
      action: 'Error de validación',
      detail: report.summary
    });
  }

  saveAutomationsState(state);
  return { ok: report.valid, validation: report, workflow: deepClone(wf) };
}

export function getWorkflowUiStateMeta(wf, validationReport = null, perms = {}) {
  if (!wf) {
    return {
      uiStateKey: 'draft',
      badgeLabel: WORKFLOW_STATES.draft.label,
      badgeTone: WORKFLOW_STATES.draft.badge,
      hasUnpublishedChanges: false,
      unpublishedLabel: '',
      isReadOnly: false,
      showActivateBtn: false,
      activateLabel: 'Activar',
      activateDisabled: true,
      activateReason: 'Sin workflow',
      showPublishedPill: false,
      publishedPillLabel: '',
      saveDisabled: true,
      validateDisabled: true,
      simulateDisabled: true,
      pauseDisabled: true,
      archiveDisabled: true,
      duplicateDisabled: true
    };
  }
  const hasErrors = wf.status === 'error' || (wf.status === 'validated' && Boolean(validationReport && !validationReport.valid));
  const isArchived = wf.status === 'archived';
  const isActive = wf.status === 'active';
  const isPaused = wf.status === 'paused';
  const isValidated = wf.status === 'validated';
  const hasPublishedSnapshot = Boolean(wf.publishedSnapshot);
  const hasUnpublishedChanges = !isArchived && hasPublishedSnapshot;

  let uiStateKey = 'draft';
  if (isArchived) uiStateKey = 'archived';
  else if (hasErrors) uiStateKey = 'error';
  else if (isActive && hasUnpublishedChanges) uiStateKey = 'active_unpublished';
  else if (isActive) uiStateKey = 'active_clean';
  else if (isPaused) uiStateKey = 'paused';
  else if (isValidated) uiStateKey = 'validated';

  const baseMeta = WORKFLOW_STATES[
    isArchived ? 'archived' : hasErrors ? 'error' : isActive ? 'active' : isPaused ? 'paused' : isValidated ? 'validated' : 'draft'
  ];

  let showActivateBtn = false;
  let activateLabel = 'Activar';
  let activateDisabled = true;
  let activateReason = '';

  if (uiStateKey === 'draft') {
    showActivateBtn = Boolean(perms.activateWorkflow);
    activateLabel = 'Activar';
    activateDisabled = true;
    activateReason = 'Valida el workflow antes de activarlo.';
  } else if (uiStateKey === 'validated') {
    showActivateBtn = Boolean(perms.activateWorkflow);
    activateLabel = 'Activar';
    activateDisabled = false;
    activateReason = '';
  } else if (uiStateKey === 'active_clean') {
    // Coherencia estricta: cuando está Activo sin cambios, nunca mostrar Activar activo
    showActivateBtn = false;
    activateLabel = '';
    activateDisabled = true;
    activateReason = 'El workflow ya está activo y publicado.';
  } else if (uiStateKey === 'active_unpublished') {
    showActivateBtn = Boolean(perms.activateWorkflow);
    activateLabel = 'Publicar nueva versión';
    activateDisabled = Boolean(wf.needsValidation) || Boolean(validationReport && !validationReport.valid);
    activateReason = activateDisabled ? 'Valida los cambios antes de publicar la nueva versión.' : '';
  } else if (uiStateKey === 'paused') {
    showActivateBtn = Boolean(perms.activateWorkflow);
    activateLabel = 'Reactivar';
    activateDisabled = Boolean(wf.needsValidation);
    activateReason = wf.needsValidation ? 'Workflow pausado con ediciones: vuelve a validar antes de reactivarlo.' : '';
  } else if (uiStateKey === 'error') {
    showActivateBtn = Boolean(perms.activateWorkflow);
    activateLabel = hasPublishedSnapshot ? 'Publicar nueva versión' : 'Activar';
    activateDisabled = true;
    activateReason = 'Corrige los errores bloqueantes y valida antes de activar o publicar.';
  } else if (uiStateKey === 'archived') {
    showActivateBtn = false;
    activateLabel = 'Archivado';
    activateDisabled = true;
    activateReason = 'Workflow archivado en solo lectura; duplícalo si necesitas editarlo.';
  }

  return {
    uiStateKey,
    badgeLabel: baseMeta.label,
    badgeTone: baseMeta.badge,
    hasUnpublishedChanges,
    unpublishedLabel: hasUnpublishedChanges
      ? `Cambios sin publicar · Activa v${wf.publishedSnapshot.version} protegida`
      : (isPaused && wf.needsValidation ? 'Editado en pausa · Requiere validar' : ''),
    isReadOnly: isArchived,
    showActivateBtn,
    activateLabel,
    activateDisabled,
    activateReason,
    showPublishedPill: uiStateKey === 'active_clean',
    publishedPillLabel: uiStateKey === 'active_clean' ? `Publicado · v${wf.version}` : '',
    saveDisabled: isArchived,
    validateDisabled: isArchived,
    simulateDisabled: isArchived,
    pauseDisabled: isArchived || isPaused,
    archiveDisabled: isArchived,
    duplicateDisabled: false
  };
}

// =========================================================================
// Motor de Simulación Animada (Sección 11 y 20)
// Sin modificar módulos operativos reales (Agenda, Caja, CRM, Turnos, Auth)
// =========================================================================

function emitSimUpdate() {
  const snap = getSimulationState();
  for (const fn of simRuntime.listeners) {
    try { fn(snap); } catch { /* ignore */ }
  }
}

export function subscribeSimulation(fn) {
  if (typeof fn === 'function') simRuntime.listeners.add(fn);
  return () => simRuntime.listeners.delete(fn);
}

export function getSimulationState() {
  return simRuntime.run ? deepClone(simRuntime.run) : null;
}

export function getSimulationNodeVisualMeta(sim, nodeId, nodeIssues = []) {
  if (!sim) {
    const hasErr = Array.isArray(nodeIssues) && nodeIssues.some(i => i?.severity === 'error');
    const hasWarn = !hasErr && Array.isArray(nodeIssues) && nodeIssues.some(i => i?.severity === 'warning');
    if (hasErr) return { state: 'blocked', badgeText: 'Error', isCurrent: false };
    if (hasWarn) return { state: 'warning', badgeText: 'Advertencia', isCurrent: false };
    return { state: '', badgeText: '', isCurrent: false };
  }

  const rawState = sim.nodeStates?.[nodeId] || 'skipped';
  const isCurrent = sim.activeNodeId === nodeId;

  if (sim.status === 'paused' && (isCurrent || rawState === 'running')) {
    return { state: 'paused', badgeText: 'Pausado', isCurrent: true };
  }

  if (rawState === 'running') {
    return { state: 'running', badgeText: 'Ejecutándose', isCurrent };
  }
  if (rawState === 'completed') {
    return { state: 'completed', badgeText: 'Completado', isCurrent: false };
  }
  if (rawState === 'waiting') {
    return { state: 'waiting', badgeText: 'Esperando', isCurrent };
  }
  if (rawState === 'blocked') {
    return { state: 'blocked', badgeText: 'Bloqueado', isCurrent };
  }
  if (rawState === 'warning') {
    return { state: 'warning', badgeText: 'Advertencia', isCurrent };
  }
  if (rawState === 'skipped') {
    return { state: 'skipped', badgeText: 'No ejecutado', isCurrent: false };
  }
  return { state: 'pending', badgeText: '', isCurrent: false };
}

function evaluateConditionRule(rule, ctx) {
  const field = rule.field;
  const expected = String(rule.expectedValue ?? '');
  const actual = String(ctx[field] ?? '');
  const op = rule.operator || 'equals';
  if (op === 'not_equals') return actual.toLowerCase() !== expected.toLowerCase();
  if (op === 'contains') return actual.toLowerCase().includes(expected.toLowerCase());
  return actual.toLowerCase() === expected.toLowerCase();
}

function describeSimulatedNodeOutcome(node, ctx, agents) {
  const cfg = node.config || {};
  switch (node.type) {
    case 'trigger_event': {
      const trig = getTriggerPresetSpec(cfg.triggerKey);
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Evento ficticio recibido: "${trig.label}" para ${ctx.patientAlias}.`,
        simulatedAction: `Inicio de recorrido con datos de demostración (${ctx.appointmentCode}).`,
        delayMs: 650
      };
    }
    case 'wait_delay': {
      const mins = Number(cfg.durationMinutes) || 10;
      const ms = clampNumber(cfg.acceleratedMs, 450, 2200, 1100);
      return {
        visualState: 'waiting',
        branchTaken: null,
        summary: `Espera simulada de ${mins} min (acelerada a ${(ms / 1000).toFixed(1)} s en demostración).`,
        simulatedAction: 'Temporizador acelerado ejecutado localmente sin programación externa.',
        delayMs: ms
      };
    }
    case 'condition_branch': {
      const passed = evaluateConditionRule(cfg, ctx);
      const branch = passed ? 'yes' : 'no';
      return {
        visualState: 'completed',
        branchTaken: branch,
        summary: `Condición evaluada (${cfg.field} = ${String(ctx[cfg.field])}) -> Rama "${passed ? 'Sí' : 'No'}".`,
        simulatedAction: `Desvío lógico hacia rama ${passed ? 'Sí' : 'No'} sobre datos ficticios.`,
        delayMs: 750
      };
    }
    case 'condition_group': {
      const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
      const combinator = cfg.combinator === 'OR' ? 'OR' : 'AND';
      const passed = combinator === 'OR'
        ? rules.some(r => evaluateConditionRule(r, ctx))
        : rules.every(r => evaluateConditionRule(r, ctx));
      return {
        visualState: 'completed',
        branchTaken: passed ? 'yes' : 'no',
        summary: `Grupo ${combinator} (${rules.length} reglas) evaluado -> Rama "${passed ? 'Sí' : 'No'}".`,
        simulatedAction: `Evaluación combinada ${combinator} sobre contexto de demostración.`,
        delayMs: 750
      };
    }
    case 'agent_execute': {
      const ag = agents.find(a => Number(a.id) === Number(cfg.agentId));
      const capLabel = AGENT_CAPABILITIES_CATALOG.find(c => c.key === cfg.requiredCapability)?.label || cfg.requiredCapability;
      const isDraftWarn = ag && (ag.status === 'draft' || ag.status === 'paused');
      return {
        visualState: isDraftWarn ? 'warning' : 'completed',
        branchTaken: null,
        summary: `Agente demostrativo "${ag ? ag.name : 'Desconocido'}" preparó paso usando capacidad "${capLabel}".`,
        simulatedAction: isDraftWarn
          ? `Ejecución simulada con agente en ${AGENT_STATUS_LABELS[ag.status]} (sin llamada real a IA).`
          : 'Acción demostrativa del agente evaluada con límites de catálogo (sin IA externa).',
        delayMs: 900
      };
    }
    case 'agent_escalate': {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Se habría escalado el caso a ${cfg.targetRole || 'Supervisor Operativo'}.`,
        simulatedAction: 'Acción externa no ejecutada: escalamiento mostrado únicamente en simulación.',
        delayMs: 750
      };
    }
    case 'action_reminder': {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Recordatorio preparado en la simulación para canal ${cfg.channel || 'simulado'}.`,
        simulatedAction: 'Recordatorio preparado en la simulación. Acción externa no ejecutada (no se envió WhatsApp/SMS/correo real).',
        delayMs: 800
      };
    }
    case 'human_approval': {
      return {
        visualState: 'waiting',
        branchTaken: null,
        requiresHumanPause: cfg.autoDecisionInDemo === 'pause_for_click',
        summary: `Solicitud de aprobación humana presentada a ${cfg.approverRole || 'Recepción'} (aprobada en demostración).`,
        simulatedAction: 'Aprobación humana simulada registrada antes de continuar.',
        delayMs: 1050
      };
    }
    case 'action_task': {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Se habría creado una tarea para ${cfg.targetArea || 'Recepción'}: "${cfg.taskTitle}".`,
        simulatedAction: `Se habría creado una tarea interna en ${cfg.targetArea || 'Recepción'} (sin alterar colas reales).`,
        delayMs: 750
      };
    }
    case 'action_internal_note': {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Se habría notificado a ${cfg.notifyArea || 'Recepción'} con nota interna.`,
        simulatedAction: `Se habría notificado a ${cfg.notifyArea || 'Recepción'} en la simulación.`,
        delayMs: 700
      };
    }
    case 'action_crm_update': {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Se habría actualizado CRM simulado (etapa: ${cfg.stage || '-'}, prioridad: ${cfg.priority || '-'}).`,
        simulatedAction: 'Cambio simulado en tablero CRM; los registros reales del módulo CRM no fueron modificados.',
        delayMs: 700
      };
    }
    case 'action_route_area': {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Se habría derivado administrativamente a ${cfg.destinationArea || 'Recepción'}.`,
        simulatedAction: `Derivación simulada hacia ${cfg.destinationArea || 'Recepción'} manteniendo separación operativa.`,
        delayMs: 700
      };
    }
    case 'end_security_block': {
      return {
        visualState: 'blocked',
        branchTaken: null,
        isSecurityBlock: true,
        summary: `Bloqueo por seguridad activado: ${cfg.blockReason || 'Contenido clínico o financiero restringido.'}`,
        simulatedAction: `Automatización detenida por seguridad y derivada a ${cfg.humanTarget || 'persona autorizada'}.`,
        delayMs: 750
      };
    }
    case 'end_success':
    default: {
      return {
        visualState: 'completed',
        branchTaken: null,
        summary: `Recorrido finalizado (${cfg.outcome === 'no_action' ? 'sin acción adicional' : 'completado'}): ${cfg.summaryNote || ''}`,
        simulatedAction: 'Fin de la simulación demostrativa.',
        delayMs: 550
      };
    }
  }
}

export function startWorkflowSimulation(workflowId, scenarioOptions = {}, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'simulateWorkflow', `Simular workflow ${workflowId}`, 'workflow', workflowId);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const wf = st.workflows.find(w => w.id === workflowId);
  if (!wf) return { ok: false, code: 'NOT_FOUND', message: 'Workflow no encontrado.' };

  const validation = validateWorkflowStructure(wf, st.agents, { mode: 'simulate' });
  applyNodeValidationStates(wf, validation);
  saveAutomationsState(state);

  if (!validation.valid) {
    appendAuditInternal({
      type: 'validation_error',
      role: actor.role,
      actorName: actor.actorName,
      entityType: 'workflow',
      entityId: wf.id,
      entityName: wf.name || '(Sin nombre)',
      result: `${validation.errors.length} error(es)`,
      summary: `Simulación bloqueada por error estructural: ${validation.errors[0]?.message || ''}`,
      version: wf.version,
      tone: 'bad',
      agent: 'supervisor',
      action: 'Simulación rechazada',
      detail: validation.summary
    });
    saveAutomationsState(state);
    return {
      ok: false,
      code: 'VALIDATION_FAILED',
      validation,
      firstErrorNodeId: validation.errors.find(e => e.nodeId)?.nodeId || null,
      message: validation.errors[0]?.message || 'Corrige los errores antes de simular.'
    };
  }

  stopWorkflowSimulation({ silent: true });

  const scenarios = getCompatibleScenariosForWorkflow(wf);
  const selectedScenario = scenarios.find(s => s.id === scenarioOptions.scenarioId)
    || deepClone(SIMULATION_SCENARIOS.find(s => s.id === scenarioOptions.scenarioId))
    || scenarios[0];

  const context = {
    ...deepClone(selectedScenario.context),
    ...(scenarioOptions.contextOverrides ? deepClone(scenarioOptions.contextOverrides) : {})
  };

  // Precalcular secuencia de pasos exacta por el grafo (máx 40 pasos anti-bucle)
  const triggerNode = wf.nodes.find(n => n.type === 'trigger_event');
  const plannedSteps = [];
  const traversedNodeIds = new Set();
  const traversedEdgeIds = new Set();
  let cursor = triggerNode;
  let guard = 0;

  while (cursor && guard < 40) {
    guard++;
    traversedNodeIds.add(cursor.id);
    const outcome = describeSimulatedNodeOutcome(cursor, context, st.agents);
    let nextEdge = null;
    if (outcome.branchTaken) {
      nextEdge = wf.edges.find(e => e.sourceNodeId === cursor.id && e.sourcePort === outcome.branchTaken) || null;
    } else {
      nextEdge = wf.edges.find(e => e.sourceNodeId === cursor.id && e.sourcePort === 'out') || null;
    }
    if (nextEdge) traversedEdgeIds.add(nextEdge.id);

    plannedSteps.push({
      stepIndex: plannedSteps.length + 1,
      nodeId: cursor.id,
      nodeType: cursor.type,
      nodeLabel: cursor.label,
      viaEdgeId: plannedSteps.length ? plannedSteps[plannedSteps.length - 1].outgoingEdgeId : null,
      outgoingEdgeId: nextEdge ? nextEdge.id : null,
      outgoingLabel: nextEdge ? nextEdge.label : '',
      visualState: outcome.visualState,
      branchTaken: outcome.branchTaken,
      isSecurityBlock: Boolean(outcome.isSecurityBlock),
      summary: outcome.summary,
      simulatedAction: outcome.simulatedAction,
      delayMs: outcome.delayMs
    });

    cursor = nextEdge ? wf.nodes.find(n => n.id === nextEdge.targetNodeId) || null : null;
  }

  const nodeStates = {};
  for (const n of wf.nodes) {
    nodeStates[n.id] = traversedNodeIds.has(n.id) ? 'pending' : 'skipped';
  }
  const edgeStates = {};
  for (const e of wf.edges) {
    edgeStates[e.id] = traversedEdgeIds.has(e.id) ? 'pending' : 'skipped';
  }

  simRuntime.run = {
    id: `run-${st.nextIds.run++}`,
    workflowId: wf.id,
    workflowName: wf.name,
    workflowVersion: wf.version,
    mode: 'simulated',
    disclaimer: SIMULATION_DISCLAIMER,
    scenario: deepClone(selectedScenario),
    context,
    status: 'running', // running | paused | completed | stopped
    speed: simRuntime.speed,
    currentIndex: -1,
    activeNodeId: null,
    activeEdgeId: null,
    plannedSteps,
    steps: [],
    nodeStates,
    edgeStates,
    actor,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    summaryText: ''
  };

  const manualStep = Boolean(scenarioOptions.manualStep);
  if (manualStep) {
    advanceOneSimulationStep();
    simRuntime.run.status = simRuntime.run.status === 'completed' ? 'completed' : 'paused';
    emitSimUpdate();
  } else {
    advanceOneSimulationStep();
    scheduleNextSimulationTick();
    emitSimUpdate();
  }

  return { ok: true, simulation: deepClone(simRuntime.run) };
}

function scheduleNextSimulationTick() {
  if (simRuntime.timerId) {
    clearTimeout(simRuntime.timerId);
    simRuntime.timerId = null;
  }
  const run = simRuntime.run;
  if (!run || run.status !== 'running') return;
  const currStep = run.plannedSteps[run.currentIndex];
  const baseMs = currStep ? currStep.delayMs : 700;
  const adjustedMs = Math.max(180, Math.round(baseMs / (simRuntime.speed || 1)));
  simRuntime.timerId = setTimeout(() => {
    simRuntime.timerId = null;
    if (!simRuntime.run || simRuntime.run.status !== 'running') return;
    advanceOneSimulationStep();
    if (simRuntime.run && simRuntime.run.status === 'running') {
      scheduleNextSimulationTick();
    }
    emitSimUpdate();
  }, adjustedMs);
}

function advanceOneSimulationStep() {
  const run = simRuntime.run;
  if (!run) return false;

  // Cerrar visualmente el paso anterior
  if (run.currentIndex >= 0 && run.currentIndex < run.plannedSteps.length) {
    const prev = run.plannedSteps[run.currentIndex];
    run.nodeStates[prev.nodeId] = prev.visualState === 'blocked' ? 'blocked' : (prev.visualState === 'warning' ? 'warning' : 'completed');
    if (prev.outgoingEdgeId) {
      run.edgeStates[prev.outgoingEdgeId] = 'traversed';
    }
  }

  const nextIdx = run.currentIndex + 1;
  if (nextIdx >= run.plannedSteps.length) {
    finalizeCompletedSimulation();
    return false;
  }

  run.currentIndex = nextIdx;
  const step = run.plannedSteps[nextIdx];
  run.activeNodeId = step.nodeId;
  run.activeEdgeId = step.outgoingEdgeId || null;

  // En ejecución actual: azul (running) o amarillo si espera aprobación/tiempo, rojo si bloqueo de seguridad
  if (step.nodeType === 'human_approval' || step.nodeType === 'wait_delay') {
    run.nodeStates[step.nodeId] = 'waiting';
  } else if (step.isSecurityBlock) {
    run.nodeStates[step.nodeId] = 'blocked';
  } else {
    run.nodeStates[step.nodeId] = 'running';
  }
  if (step.outgoingEdgeId) {
    run.edgeStates[step.outgoingEdgeId] = 'active';
  }

  run.steps.push({ ...deepClone(step), executedAt: formatReadableNow() });

  // Si es el último nodo (nodo final), completar tras mostrarlo o en el siguiente tick
  if (nextIdx === run.plannedSteps.length - 1 && (step.nodeType === 'end_success' || step.nodeType === 'end_security_block')) {
    // Mantener resaltado breve o completar si estamos en manual
    if (step.isSecurityBlock) {
      appendAuditInternal({
        type: 'security_block',
        role: run.actor.role,
        actorName: run.actor.actorName,
        entityType: 'workflow',
        entityId: run.workflowId,
        entityName: run.workflowName,
        result: 'Bloqueado en simulación',
        summary: step.summary,
        version: run.workflowVersion,
        tone: 'bad',
        agent: 'supervisor',
        action: 'Bloqueo de seguridad simulado',
        detail: step.simulatedAction
      });
      saveAutomationsState(state);
    }
  }
  return true;
}

function finalizeCompletedSimulation() {
  const run = simRuntime.run;
  if (!run) return;
  run.status = 'completed';
  run.activeNodeId = null;
  run.activeEdgeId = null;
  run.finishedAt = new Date().toISOString();
  const lastStep = run.steps[run.steps.length - 1];
  const actionsList = run.steps.map(s => s.simulatedAction).filter(Boolean);
  run.summaryText = lastStep?.isSecurityBlock
    ? `Simulación detenida por seguridad en ${run.steps.length} paso(s). Se protegió información sensible y se derivó a persona.`
    : `Simulación demostrativa completada en ${run.steps.length} paso(s) (${run.scenario.label}). Acciones simuladas: ${actionsList.slice(-2).join(' ')}`;

  appendAuditInternal({
    type: 'workflow_simulated',
    role: run.actor.role,
    actorName: run.actor.actorName,
    entityType: 'workflow',
    entityId: run.workflowId,
    entityName: run.workflowName,
    result: lastStep?.isSecurityBlock ? 'Bloqueo demostrado' : 'Completado',
    summary: `Simulación de "${run.workflowName}" (${run.scenario.label}) en ${run.steps.length} pasos sin cambios reales.`,
    version: run.workflowVersion,
    tone: lastStep?.isSecurityBlock ? 'warn' : 'info',
    agent: 'supervisor',
    action: 'Simulación ejecutada',
    detail: SIMULATION_DISCLAIMER
  });
  saveAutomationsState(state);
}

export function stepWorkflowSimulation() {
  const run = simRuntime.run;
  if (!run || run.status === 'completed' || run.status === 'stopped') return getSimulationState();
  if (simRuntime.timerId) {
    clearTimeout(simRuntime.timerId);
    simRuntime.timerId = null;
  }
  run.status = 'paused';
  advanceOneSimulationStep();
  emitSimUpdate();
  return getSimulationState();
}

export function pauseWorkflowSimulation() {
  const run = simRuntime.run;
  if (!run || run.status !== 'running') return getSimulationState();
  if (simRuntime.timerId) {
    clearTimeout(simRuntime.timerId);
    simRuntime.timerId = null;
  }
  run.status = 'paused';
  emitSimUpdate();
  return getSimulationState();
}

export function resumeWorkflowSimulation() {
  const run = simRuntime.run;
  if (!run || run.status !== 'paused') return getSimulationState();
  run.status = 'running';
  scheduleNextSimulationTick();
  emitSimUpdate();
  return getSimulationState();
}

export function setSimulationSpeed(speed) {
  simRuntime.speed = clampNumber(speed, 0.5, 4, 1);
  if (simRuntime.run) {
    simRuntime.run.speed = simRuntime.speed;
    if (simRuntime.run.status === 'running') {
      scheduleNextSimulationTick();
    }
    emitSimUpdate();
  }
  return simRuntime.speed;
}

export function restartWorkflowSimulation() {
  const run = simRuntime.run;
  if (!run) return null;
  return startWorkflowSimulation(run.workflowId, { scenarioId: run.scenario.id, contextOverrides: run.context }, { user: { role: run.actor.role, name: run.actor.actorName } });
}

export function stopWorkflowSimulation(options = {}) {
  if (simRuntime.timerId) {
    clearTimeout(simRuntime.timerId);
    simRuntime.timerId = null;
  }
  if (options.clearRun) {
    simRuntime.run = null;
  } else if (simRuntime.run && simRuntime.run.status !== 'completed') {
    simRuntime.run.status = 'stopped';
    simRuntime.run.activeNodeId = null;
    simRuntime.run.activeEdgeId = null;
    simRuntime.run.summaryText = 'Simulación detenida por el usuario.';
  }
  if (!options.silent) emitSimUpdate();
  return getSimulationState();
}

// =========================================================================
// Reglas rápidas compatibles (.automation-card)
// =========================================================================

export function getQuickAutomations() {
  return deepClone(ensureStateLoaded().quickAutomations);
}

export function toggleQuickAutomation(id, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'pauseWorkflow', `Cambiar estado regla rápida ${id}`, 'workflow', id);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const rule = st.quickAutomations.find(q => Number(q.id) === Number(id));
  if (!rule) return { ok: false, code: 'NOT_FOUND', message: 'Regla no encontrada.' };
  rule.active = !rule.active;
  appendAuditInternal({
    type: rule.active ? 'workflow_activated' : 'workflow_paused',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: rule.workflowId || String(rule.id),
    entityName: rule.name,
    result: rule.active ? 'Activa' : 'Pausada',
    summary: `Regla rápida "${rule.name}" ${rule.active ? 'activada' : 'pausada'}.`,
    tone: rule.active ? 'good' : 'warn',
    agent: rule.agent,
    action: rule.active ? 'Regla activada' : 'Regla pausada',
    detail: rule.name
  });
  saveAutomationsState(state);
  return { ok: true, rule: deepClone(rule) };
}

export function runQuickAutomationTest(id, options = {}) {
  const actor = normalizeActor(options);
  const perm = assertPermission(actor, 'simulateWorkflow', `Probar regla rápida ${id}`, 'workflow', id);
  if (!perm.ok) return perm;

  const st = ensureStateLoaded();
  const rule = st.quickAutomations.find(q => Number(q.id) === Number(id));
  if (!rule) return { ok: false, code: 'NOT_FOUND', message: 'Regla no encontrada.' };
  rule.lastRun = 'Ahora (simulado)';
  appendAuditInternal({
    type: 'workflow_simulated',
    role: actor.role,
    actorName: actor.actorName,
    entityType: 'workflow',
    entityId: rule.workflowId || String(rule.id),
    entityName: rule.name,
    result: 'Simulado',
    summary: `Prueba demostrativa ejecutada para "${rule.name}" sin efectos externos.`,
    tone: 'info',
    agent: rule.agent,
    action: 'Prueba de regla rápida',
    detail: 'Simulación ejecutada sin envío externo real'
  });
  saveAutomationsState(state);
  return { ok: true, rule: deepClone(rule) };
}
