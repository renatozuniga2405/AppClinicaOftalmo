// Interfaz visual de Centro de Agentes ARM (#arm) y Constructor Visual de Workflows (#automations).
// Consume y reexporta el motor puro desde ./automations.js para mantener separación entre lógica y DOM.

import {
  AUTOMATIONS_STORAGE_KEY,
  AUTOMATIONS_SCHEMA_VERSION,
  SIMULATION_DISCLAIMER,
  WORKFLOW_STATES,
  AGENT_STATUS_LABELS,
  AGENT_AREAS_CATALOG,
  AGENT_ICONS_CATALOG,
  AGENT_COLORS_CATALOG,
  ESCALATION_TARGETS_CATALOG,
  AGENT_CAPABILITIES_CATALOG,
  AGENT_FORBIDDEN_CATALOG,
  TRIGGER_PRESETS,
  NODE_CATEGORIES,
  NODE_CATALOG,
  CONDITION_FIELDS_CATALOG,
  AUDIT_EVENT_TYPES,
  SIMULATION_SCENARIOS,
  INITIAL_AGENTS,
  INITIAL_AUTOMATIONS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_EVENTS,
  loadAutomationsState,
  saveAutomationsState,
  sanitizeAutomationsState,
  resetARMData,
  resetAutomationsOnly,
  getAutomationRolePermissions,
  canPerformAutomationAction,
  getWorkflowsForRole,
  getAssignedTasksForRole,
  completeAssignedAutomationTask,
  recordAutomationAudit,
  recordARMEvent,
  getAuditEvents,
  getAgents,
  getAgentById,
  isAgentActive,
  getARMSummary,
  getActiveWorkflowsUsingAgent,
  createAgent,
  updateAgent,
  duplicateAgent,
  toggleAgentStatus,
  archiveAgent,
  getNodeTypeSpec,
  getTriggerPresetSpec,
  getCompatibleScenariosForWorkflow,
  canUndoWorkflow,
  canRedoWorkflow,
  undoWorkflowAction,
  redoWorkflowAction,
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  createWorkflowFromTemplate,
  WORKFLOW_TEMPLATES,
  updateWorkflowMeta,
  saveWorkflowDraft,
  duplicateWorkflow,
  activateWorkflow,
  pauseWorkflow,
  archiveWorkflow,
  addWorkflowNode,
  moveWorkflowNode,
  updateWorkflowNode,
  duplicateWorkflowNode,
  removeWorkflowNode,
  wouldCreateCycle,
  validateConnectionAttempt,
  connectWorkflowNodes,
  removeWorkflowEdge,
  autoLayoutWorkflowNodes,
  validateWorkflowStructure,
  validateAndSaveWorkflowStatus,
  getWorkflowUiStateMeta,
  subscribeSimulation,
  getSimulationState,
  getSimulationNodeVisualMeta,
  startWorkflowSimulation,
  stepWorkflowSimulation,
  pauseWorkflowSimulation,
  resumeWorkflowSimulation,
  setSimulationSpeed,
  restartWorkflowSimulation,
  stopWorkflowSimulation,
  getQuickAutomations,
  toggleQuickAutomation,
  runQuickAutomationTest
} from './automations.js';
import * as motion from './motion.js';

export {
  AUTOMATIONS_STORAGE_KEY,
  AUTOMATIONS_SCHEMA_VERSION,
  SIMULATION_DISCLAIMER,
  WORKFLOW_STATES,
  AGENT_STATUS_LABELS,
  AGENT_AREAS_CATALOG,
  AGENT_ICONS_CATALOG,
  AGENT_COLORS_CATALOG,
  ESCALATION_TARGETS_CATALOG,
  AGENT_CAPABILITIES_CATALOG,
  AGENT_FORBIDDEN_CATALOG,
  TRIGGER_PRESETS,
  NODE_CATEGORIES,
  NODE_CATALOG,
  CONDITION_FIELDS_CATALOG,
  AUDIT_EVENT_TYPES,
  SIMULATION_SCENARIOS,
  INITIAL_AGENTS,
  INITIAL_AUTOMATIONS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_EVENTS,
  loadAutomationsState,
  saveAutomationsState,
  sanitizeAutomationsState,
  resetARMData,
  resetAutomationsOnly,
  getAutomationRolePermissions,
  canPerformAutomationAction,
  getWorkflowsForRole,
  getAssignedTasksForRole,
  completeAssignedAutomationTask,
  recordAutomationAudit,
  recordARMEvent,
  getAuditEvents,
  getAgents,
  getAgentById,
  isAgentActive,
  getARMSummary,
  getActiveWorkflowsUsingAgent,
  createAgent,
  updateAgent,
  duplicateAgent,
  toggleAgentStatus,
  archiveAgent,
  getNodeTypeSpec,
  getTriggerPresetSpec,
  getCompatibleScenariosForWorkflow,
  canUndoWorkflow,
  canRedoWorkflow,
  undoWorkflowAction,
  redoWorkflowAction,
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  createWorkflowFromTemplate,
  WORKFLOW_TEMPLATES,
  updateWorkflowMeta,
  saveWorkflowDraft,
  duplicateWorkflow,
  activateWorkflow,
  pauseWorkflow,
  archiveWorkflow,
  addWorkflowNode,
  moveWorkflowNode,
  updateWorkflowNode,
  duplicateWorkflowNode,
  removeWorkflowNode,
  wouldCreateCycle,
  validateConnectionAttempt,
  connectWorkflowNodes,
  removeWorkflowEdge,
  autoLayoutWorkflowNodes,
  validateWorkflowStructure,
  validateAndSaveWorkflowStatus,
  getWorkflowUiStateMeta,
  subscribeSimulation,
  getSimulationState,
  getSimulationNodeVisualMeta,
  startWorkflowSimulation,
  stepWorkflowSimulation,
  pauseWorkflowSimulation,
  resumeWorkflowSimulation,
  setSimulationSpeed,
  restartWorkflowSimulation,
  stopWorkflowSimulation,
  getQuickAutomations,
  toggleQuickAutomation,
  runQuickAutomationTest
};

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Estado puramente efímero de la interfaz (paneles de sesión en sessionStorage, resto en memoria)
const WF_PANEL_SESSION_KEY = 'clinica_wf_ui_panels_v1';

function readPanelPrefs() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return {};
    const raw = window.sessionStorage.getItem(WF_PANEL_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      catalogCollapsed: Boolean(parsed?.catalogCollapsed),
      propsCollapsed: Boolean(parsed?.propsCollapsed)
    };
  } catch {
    return {};
  }
}

function writePanelPrefs() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(WF_PANEL_SESSION_KEY, JSON.stringify({
      catalogCollapsed: Boolean(ui.catalogCollapsed),
      propsCollapsed: Boolean(ui.propsCollapsed)
    }));
  } catch {
    // ignore storage errors
  }
}

function isReducedMotionActive() {
  try {
    if (typeof document !== 'undefined' && document.documentElement?.getAttribute('data-reduced-motion') === 'on') {
      return true;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  } catch {
    // ignore
  }
  return false;
}

const ui = {
  selectedArmAgentId: null,
  activeWorkflowId: 'wf-noshow-recovery',
  selectedNodeId: null,
  selectedEdgeId: null,
  zoom: 0.9,
  panX: 16,
  panY: 16,
  catalogCollapsed: false,
  propsCollapsed: false,
  panelPrefsLoaded: false,
  catalogSearch: '',
  mobileCatalogOpen: false,
  mobilePropsOpen: false,
  dockTab: 'validation', // validation | simulation | audit
  auditFilter: 'all',
  selectedAuditEventId: null,
  selectedScenarioId: 'sc-noshow-no',
  lastValidation: null,
  connectingFrom: null, // { nodeId, port }
  pendingArchiveConfirm: false,
  pendingResetConfirm: false,
  pendingDeleteNodeId: null,
  moreMenuOpen: false,
  overviewMode: false,
  presentationMode: false,
  presentationOpenerId: null,
  simUnsubscribe: null,
  globalCleanupFns: [],
  fittedWorkflowId: null,
  lastRenderOptions: null
};

function detachAutomationsUiListeners() {
  if (typeof ui.simUnsubscribe === 'function') {
    ui.simUnsubscribe();
    ui.simUnsubscribe = null;
  }
  while (ui.globalCleanupFns.length) {
    const fn = ui.globalCleanupFns.pop();
    try { fn(); } catch { /* ignore */ }
  }
}

function clearTransientNotifications() {
  if (typeof window !== 'undefined' && typeof window.__clearPublicNotice === 'function') {
    window.__clearPublicNotice();
  }
  if (typeof document !== 'undefined') {
    const noticeEl = document.getElementById('notice');
    if (noticeEl) noticeEl.textContent = '';
  }
}

export function cleanupAutomationsRuntime() {
  const wasAutomationsMounted = Boolean(
    ui.simUnsubscribe || ui.globalCleanupFns.length || ui.presentationMode
  );
  if (wasAutomationsMounted) {
    clearTransientNotifications();
  }
  stopWorkflowSimulation({ silent: true, clearRun: false });
  detachAutomationsUiListeners();
  ui.connectingFrom = null;
  ui.moreMenuOpen = false;
  ui.pendingArchiveConfirm = false;
  ui.pendingResetConfirm = false;
  ui.pendingDeleteNodeId = null;
  ui.fittedWorkflowId = null;
  ui.overviewMode = false;
  ui.presentationMode = false;
  ui.presentationOpenerId = null;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('is-wf-presentation');
    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      }
    } catch { /* ignore */ }
  }
}

function getActorOpts(options = {}) {
  return {
    user: options.user || { role: 'admin', name: 'Administrador' },
    role: options.user?.role || 'admin',
    actorName: options.user?.name || options.user?.roleLabel || 'Administrador'
  };
}

function announceSR(text) {
  const el = $('#wf-sr-announce');
  if (el) el.textContent = text;
}

function getAgentIconSvg(iconKey) {
  const icons = {
    calendar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    'user-check': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="4"/><path d="M3 20a6 6 0 0 1 12 0M16 11l2 2 4-4"/></svg>',
    cash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z"/></svg>',
    message: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H7l-3 3V5z"/></svg>'
  };
  return icons[iconKey] || icons.calendar;
}

function getColorMeta(colorKey) {
  return AGENT_COLORS_CATALOG.find(c => c.key === colorKey) || AGENT_COLORS_CATALOG[0];
}

// =========================================================================
// Modal de Creación y Edición Dinámica de Agentes (Sección 8)
// =========================================================================

export function openAgentBuilderModal(config = {}) {
  const { mode = 'create', agentId = null, options = {}, onSaved = null } = config;
  const openModalFn = options.openModal;
  const toastFn = options.toast || (() => {});
  const actor = getActorOpts(options);
  const existing = agentId ? getAgentById(agentId) : null;

  if (mode === 'edit' && !existing) {
    toastFn('No se encontró el agente solicitado.');
    return;
  }

  const defaultCaps = existing ? existing.capabilities : ['read_demo_appointments', 'prepare_reminder', 'create_reception_task', 'escalate_to_human'];
  const defaultForbidden = existing ? existing.forbiddenActions : ['emit_diagnosis', 'interpret_symptoms', 'modify_medical_record', 'execute_real_payment'];

  const bodyHtml = `
    <div class="agent-builder-form" id="agent-builder-form">
      <div class="wf-sim-static-note">Perfil demostrativo local. Los agentes operan dentro de capacidades cerradas y nunca ejecutan cobros ni diagnósticos reales.</div>
      <div class="form-grid" style="margin-top:10px">
        <div class="field">
          <label for="ab-name">Nombre del agente *</label>
          <input id="ab-name" value="${esc(existing?.name || '')}" placeholder="Ej. Coordinador de seguimiento preventivo">
        </div>
        <div class="field">
          <label for="ab-area">Área clínica / administrativa *</label>
          <select id="ab-area">
            ${AGENT_AREAS_CATALOG.map(a => `<option value="${esc(a)}" ${existing?.area === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid" style="margin-top:8px">
        <div class="field">
          <label for="ab-desc">Descripción breve *</label>
          <input id="ab-desc" value="${esc(existing?.description || '')}" placeholder="Alcance del perfil demostrativo">
        </div>
        <div class="field">
          <label for="ab-purpose">Objetivo operativo *</label>
          <input id="ab-purpose" value="${esc(existing?.purpose || '')}" placeholder="Qué pasos resuelve sin salir del demo">
        </div>
      </div>
      <div class="form-grid-3" style="margin-top:8px">
        <div class="field">
          <label for="ab-icon">Icono de catálogo</label>
          <select id="ab-icon">
            ${AGENT_ICONS_CATALOG.map(ic => `<option value="${esc(ic.key)}" ${existing?.icon === ic.key ? 'selected' : ''}>${esc(ic.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="ab-color">Color institucional</label>
          <select id="ab-color">
            ${AGENT_COLORS_CATALOG.map(cl => `<option value="${esc(cl.key)}" ${existing?.color === cl.key ? 'selected' : ''}>${esc(cl.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="ab-status">${mode === 'create' ? 'Estado inicial *' : 'Estado del agente'}</label>
          <select id="ab-status">
            <option value="draft" ${(!existing || existing.status === 'draft') ? 'selected' : ''}>Borrador</option>
            <option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Activo</option>
            <option value="paused" ${existing?.status === 'paused' ? 'selected' : ''}>Pausado</option>
          </select>
        </div>
      </div>
      <div class="form-grid-3" style="margin-top:8px">
        <div class="field">
          <label for="ab-escalation">Responsable de escalamiento *</label>
          <select id="ab-escalation">
            ${ESCALATION_TARGETS_CATALOG.map(t => `<option value="${esc(t)}" ${existing?.escalationTarget === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="ab-schedule">Horario operativo</label>
          <input id="ab-schedule" value="${esc(existing?.schedule || 'Lun-Sáb 08:00 - 18:00')}">
        </div>
        <div class="form-grid-2-inline">
          <div class="field">
            <label for="ab-attempts">Máx. intentos</label>
            <input id="ab-attempts" type="number" min="1" max="10" value="${esc(existing?.maxAttempts ?? 2)}">
          </div>
          <div class="field">
            <label for="ab-retry">Espera (min)</label>
            <input id="ab-retry" type="number" min="1" max="240" value="${esc(existing?.retryDelay ?? 15)}">
          </div>
        </div>
      </div>

      <div class="ab-catalog-section">
        <div class="ab-catalog-title">Capacidades permitidas (catálogo cerrado) *</div>
        <div class="ab-check-grid">
          ${AGENT_CAPABILITIES_CATALOG.map(cap => `
            <label class="ab-check-item">
              <input type="checkbox" name="ab-cap" value="${esc(cap.key)}" ${defaultCaps.includes(cap.key) ? 'checked' : ''}>
              <span><strong>${esc(cap.label)}</strong> <small class="muted">(${esc(cap.category)}${cap.simulatedOnly ? ' · simulado' : ''})</small></span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="ab-catalog-section ab-forbidden-section">
        <div class="ab-catalog-title">Acciones estrictamente prohibidas (catálogo de seguridad) *</div>
        <div class="ab-check-grid">
          ${AGENT_FORBIDDEN_CATALOG.map(fb => `
            <label class="ab-check-item is-forbidden">
              <input type="checkbox" name="ab-forb" value="${esc(fb.key)}" ${defaultForbidden.includes(fb.key) ? 'checked' : ''}>
              <span>${esc(fb.label)}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="ab-error" id="ab-error" role="alert" style="display:none"></div>
      <div class="modal-actions" style="margin-top:12px">
        <button class="btn" type="button" id="ab-cancel">Cancelar</button>
        <button class="btn primary" type="button" id="ab-save">${mode === 'create' ? 'Crear y seleccionar agente' : 'Guardar cambios del agente'}</button>
      </div>
    </div>
  `;

  if (typeof openModalFn === 'function') {
    openModalFn(mode === 'create' ? 'Crear agente demostrativo dinámico' : `Editar agente: ${existing.name}`, bodyHtml, '', true);
  } else {
    // Fallback por si renderARM/renderAutomations fue llamado sin openModal
    const host = document.createElement('div');
    host.className = 'wf-inline-modal-backdrop';
    host.innerHTML = `<div class="wf-inline-modal"><div class="wf-inline-modal-head"><strong>${mode === 'create' ? 'Crear agente' : 'Editar agente'}</strong></div>${bodyHtml}</div>`;
    document.body.appendChild(host);
    host.dataset.fallbackModal = '1';
  }

  const closeModal = () => {
    const dlg = $('#modal');
    if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
    document.querySelectorAll('[data-fallback-modal="1"]').forEach(el => el.remove());
  };

  const cancelBtn = $('#ab-cancel');
  if (cancelBtn) cancelBtn.onclick = closeModal;

  const saveBtn = $('#ab-save');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const errBox = $('#ab-error');
      const caps = Array.from(document.querySelectorAll('input[name="ab-cap"]:checked')).map(el => el.value);
      const forb = Array.from(document.querySelectorAll('input[name="ab-forb"]:checked')).map(el => el.value);
      const payload = {
        name: $('#ab-name')?.value || '',
        area: $('#ab-area')?.value || AGENT_AREAS_CATALOG[0],
        description: $('#ab-desc')?.value || '',
        purpose: $('#ab-purpose')?.value || '',
        icon: $('#ab-icon')?.value || 'calendar',
        color: $('#ab-color')?.value || 'emerald',
        status: $('#ab-status')?.value || 'draft',
        escalationTarget: $('#ab-escalation')?.value || ESCALATION_TARGETS_CATALOG[0],
        schedule: $('#ab-schedule')?.value || 'Lun-Sáb 08:00 - 18:00',
        maxAttempts: Number($('#ab-attempts')?.value || 2),
        retryDelay: Number($('#ab-retry')?.value || 15),
        capabilities: caps,
        forbiddenActions: forb
      };

      const res = mode === 'create'
        ? createAgent(payload, actor)
        : updateAgent(existing.id, payload, actor);

      if (!res.ok) {
        if (errBox) {
          errBox.style.display = 'block';
          errBox.textContent = res.message || 'Completa los campos obligatorios del agente.';
        }
        return;
      }

      closeModal();
      toastFn(mode === 'create'
        ? `Agente "${res.agent.name}" creado y registrado en ARM.`
        : `Agente "${res.agent.name}" actualizado.`);
      if (typeof onSaved === 'function') onSaved(res.agent);
    };
  }
}

// =========================================================================
// Modal de Tareas y Workflows relacionados para Recepción y Caja (Sección 15)
// =========================================================================

export function openRoleWorkflowsModal(options = {}) {
  const user = options.user || { role: 'recepcion', name: 'Personal' };
  const toastFn = options.toast || (() => {});
  const openModalFn = options.openModal;
  if (typeof openModalFn !== 'function') return;

  const drawContent = () => {
    const relatedWorkflows = getWorkflowsForRole(user.role);
    const assignedTasks = getAssignedTasksForRole(user.role);
    return `
      <div class="role-wf-modal">
        <div class="wf-sim-static-note">Vista operativa de solo lectura: puedes consultar los flujos de tu área y atender las tareas asignadas, sin modificar definiciones ni crear agentes.</div>
        <h4 style="margin:12px 0 6px">Tareas asignadas a ${user.role === 'caja' ? 'Caja' : 'Recepción'} (${assignedTasks.length})</h4>
        <div class="role-task-list">
          ${assignedTasks.length ? assignedTasks.map(t => `
            <div class="role-task-item ${t.status === 'completed' ? 'is-done' : ''}">
              <div>
                <strong>${esc(t.title)}</strong>
                <div class="muted">${esc(t.workflowName)} · Prioridad ${esc(t.priority)} · ${esc(t.createdAt)}</div>
              </div>
              ${t.status === 'completed'
                ? '<span class="badge">Atendida</span>'
                : `<button class="btn primary sm" type="button" data-attend-role-task="${esc(t.id)}">Atender tarea</button>`}
            </div>
          `).join('') : '<div class="muted">No hay tareas pendientes en tu bandeja.</div>'}
        </div>
        <h4 style="margin:14px 0 6px">Workflows relacionados (${relatedWorkflows.length})</h4>
        <div class="role-wf-list">
          ${relatedWorkflows.map(w => {
            const stMeta = WORKFLOW_STATES[w.status] || WORKFLOW_STATES.draft;
            return `
              <div class="role-wf-card">
                <div class="row-between">
                  <strong>${esc(w.name)}</strong>
                  <span class="badge">${esc(stMeta.label)} · v${w.version}</span>
                </div>
                <div class="muted" style="margin-top:4px">${esc(w.description)}</div>
                <div class="muted" style="margin-top:4px;font-size:11.5px">${w.nodes.length} pasos: ${esc(w.nodes.map(n => n.label).join(' -> '))}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  openModalFn(`Flujos y tareas asignadas (${user.role === 'caja' ? 'Caja' : 'Recepción'})`, drawContent(), '', true);
  const bindTasks = () => {
    document.querySelectorAll('[data-attend-role-task]').forEach(btn => {
      btn.onclick = () => {
        const res = completeAssignedAutomationTask(btn.dataset.attendRoleTask, { user });
        if (!res.ok) {
          toastFn(res.message);
          return;
        }
        toastFn('Tarea marcada como atendida.');
        openModalFn(`Flujos y tareas asignadas (${user.role === 'caja' ? 'Caja' : 'Recepción'})`, drawContent(), '', true);
        bindTasks();
      };
    });
  };
  bindTasks();
}

// =========================================================================
// Vista 1: Centro de Agentes ARM (#arm)
// =========================================================================

export function renderARM(options = {}) {
  const { toast = () => {}, startTour = () => {}, pendingRecoveries = () => [], executeRecovery = () => {}, user = { role: 'admin', name: 'Administrador' }, openModal = null } = options;
  const view = $('#view');
  if (!view) return;

  const perms = getAutomationRolePermissions(user.role);
  const allAgents = getAgents({ includeArchived: false });
  const visibleEvents = getAuditEvents().slice(0, 12);
  const workflows = getWorkflows({ includeArchived: false });

  const hashMatch = String(location.hash || '').match(/^#arm\/(\d+)/);
  if (hashMatch) {
    ui.selectedArmAgentId = Number(hashMatch[1]);
  }

  if (!ui.selectedArmAgentId || !allAgents.some(a => a.id === ui.selectedArmAgentId)) {
    ui.selectedArmAgentId = allAgents[0]?.id || null;
  }
  const activeAgent = allAgents.find(a => a.id === ui.selectedArmAgentId) || allAgents[0];
  const activeCount = allAgents.filter(a => a.status === 'active').length;
  const recoveries = pendingRecoveries();

  const statusLabel = status => AGENT_STATUS_LABELS[status] || status;
  const assignedWorkflows = activeAgent
    ? workflows.filter(w => w.primaryAgentId === activeAgent.id || w.nodes.some(n => Number(n.config?.agentId) === activeAgent.id))
    : [];

  view.innerHTML = `
    <div class="arm-page-shell">
      <div class="arm-banner arm-demo-note">
        <div>
          <strong>Centro de Agentes ARM (perfiles demostrativos locales)</strong>
          <p>Supervisión de agentes con datos y acciones ficticias. No hay modelos de IA, canales externos ni decisiones clínicas conectadas. Los agentes operan bajo catálogo cerrado de capacidades.</p>
        </div>
        <div class="arm-banner-actions">
          ${perms.createAgent ? '<button class="btn primary" id="arm-new-agent" type="button">+ Crear agente</button>' : ''}
          ${perms.canOpenBuilder ? '<button class="btn" id="arm-open-workflows" type="button">Abrir workflows visuales</button>' : ''}
          <button class="btn" id="arm-tour" type="button">Ver recorrido guiado</button>
        </div>
      </div>

      <div class="stats arm-stats arm-kpis">
        <div class="stat arm-kpi"><span>Agentes activos</span><strong data-motion-key="arm:active-agents">${String(activeCount).padStart(2, '0')}</strong><small>${allAgents.length} agentes configurados</small></div>
        <div class="stat arm-kpi"><span>Intervenciones simuladas</span><strong data-motion-key="arm:interventions">${allAgents.reduce((acc, a) => acc + (a.handled || 0), 0)}</strong><small>Registro demostrativo</small></div>
        <div class="stat arm-kpi"><span>Derivaciones humanas</span><strong data-motion-key="arm:escalations">${allAgents.reduce((acc, a) => acc + (a.escalations || 0), 0)}</strong><small>Supervisión segura</small></div>
        <div class="stat arm-kpi"><span>Eventos auditados</span><strong data-motion-key="arm:audit-events">${getAuditEvents().length}</strong><small>Bitácora local</small></div>
      </div>

      ${recoveries.length ? `
        <div class="panel arm-recovery-panel">
          <div class="panel-head">
            <div>
              <h3>Recuperación de inasistencias lista para supervisar (${recoveries.length})</h3>
              <p>Pacientes que no asistieron en el demo y requieren autorización humana antes de crear seguimiento.</p>
            </div>
            <span class="badge warn">Aprobación requerida</span>
          </div>
          <div class="arm-recovery-queue">
            ${recoveries.slice(0, 4).map(item => {
              const recId = item.leadId ?? item.id;
              const displayName = item.name || item.patientName || `Paciente #${recId}`;
              const subLabel = [item.date, item.time, item.readyLabel].filter(Boolean).join(' · ');
              return `
                <div class="arm-recovery-item">
                  <div>
                    <strong>${esc(displayName)}</strong>
                    <div class="muted">${esc(subLabel)}</div>
                    ${item.reason ? `<div class="arm-recovery-reason">${esc(item.reason)}</div>` : ''}
                  </div>
                  <button class="btn primary" data-arm-recovery="${esc(recId)}" type="button">Aprobar y crear seguimiento</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="arm-layout">
        <div class="arm-agent-list arm-agents-panel">
          ${allAgents.map(ag => {
            const col = getColorMeta(ag.color);
            const countWfs = workflows.filter(w => w.primaryAgentId === ag.id || w.nodes.some(n => Number(n.config?.agentId) === ag.id)).length;
            return `
              <button class="arm-agent-card ${activeAgent && ag.id === activeAgent.id ? 'is-selected' : ''}" data-arm-agent="${ag.id}" type="button">
                <div class="arm-agent-head">
                  <span class="arm-avatar" style="background:${col.soft};color:${col.hex}">${esc(ag.short)}</span>
                  <div>
                    <strong>${esc(ag.name)}</strong>
                    <span>${esc(ag.area || ag.channel)} · ${countWfs} flujo(s)</span>
                  </div>
                  <span class="arm-status is-${esc(ag.status)}">${esc(statusLabel(ag.status))}</span>
                </div>
                <p>${esc(ag.purpose)}</p>
                <div class="arm-agent-foot">
                  <span>${ag.handled} eventos</span>
                  <span>Escala a: ${esc(ag.escalationTarget)}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>

        ${activeAgent ? `
          <div class="panel arm-detail-panel arm-drawer">
            <div class="panel-head">
              <div>
                <div class="row-gap">
                  <h3>${esc(activeAgent.name)}</h3>
                  <span class="arm-status is-${esc(activeAgent.status)}">${esc(statusLabel(activeAgent.status))}</span>
                </div>
                <p>${esc(activeAgent.description || activeAgent.purpose)}</p>
              </div>
              <div class="arm-detail-actions">
                ${activeAgent.status !== 'supervision' && perms.toggleAgent
                  ? `<button class="btn" id="arm-toggle-agent" type="button">${activeAgent.status === 'active' ? 'Pausar agente' : 'Reactivar agente'}</button>`
                  : ''}
                ${perms.editAgent ? `<button class="btn" id="arm-edit-agent" type="button">Editar</button>` : ''}
                ${perms.createAgent ? `<button class="btn" id="arm-dup-agent" type="button">Duplicar</button>` : ''}
                ${activeAgent.status !== 'supervision' && perms.archiveAgent
                  ? `<button class="btn" id="arm-archive-agent" type="button">Archivar</button>`
                  : ''}
                <button class="btn icon-sm arm-drawer-close" id="arm-close-detail" type="button" aria-label="Cerrar detalle">×</button>
              </div>
            </div>
            <div class="arm-detail-body">
              <div class="arm-detail-grid">
                <div class="arm-rule-box is-allowed">
                  <h4>Acciones permitidas (${activeAgent.tools.length})</h4>
                  <ul>${activeAgent.tools.map(tool => `<li>${esc(tool)}</li>`).join('')}</ul>
                </div>
                <div class="arm-rule-box is-blocked">
                  <h4>Límites explícitos (${activeAgent.blocked.length})</h4>
                  <ul>${activeAgent.blocked.map(rule => `<li>${esc(rule)}</li>`).join('')}</ul>
                </div>
              </div>
              <div class="arm-meta-strip">
                <span><strong>Área:</strong> ${esc(activeAgent.area)}</span>
                <span><strong>Escalamiento humano:</strong> ${esc(activeAgent.escalationTarget)}</span>
                <span><strong>Horario:</strong> ${esc(activeAgent.schedule)}</span>
                <span><strong>Reintentos:</strong> máx. ${activeAgent.maxAttempts} cada ${activeAgent.retryDelay} min</span>
              </div>
              ${assignedWorkflows.length ? `
                <div class="arm-assigned-wfs">
                  <strong>Workflows vinculados (${assignedWorkflows.length}):</strong>
                  ${assignedWorkflows.map(w => `<span class="badge">${esc(w.name)} (${esc(WORKFLOW_STATES[w.status]?.label || w.status)})</span>`).join(' ')}
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <div class="panel arm-audit-panel">
          <div class="panel-head">
            <div>
              <h3>Auditoría reciente</h3>
              <p>Trazabilidad de agentes, workflows y bloqueos preventivos.</p>
            </div>
          </div>
          <div class="arm-events">
            ${visibleEvents.map(ev => `
              <div class="arm-event">
                <span class="arm-event-dot is-${esc(ev.tone)}"></span>
                <div>
                  <strong>${esc(ev.action || ev.typeLabel)}</strong>
                  <div class="arm-event-meta">${esc(ev.detail || ev.summary)}</div>
                  <small>${esc(ev.at)} · ${esc(ev.actorName || ev.role)}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  if (motion.shouldAnimateModuleEntry('arm', 'kpis')) {
    motion.animateStagger('.arm-stats .stat', { scope: 'arm', maxItems: 4 });
    motion.animateStagger('.arm-agent-list .arm-agent-card', { scope: 'arm', maxItems: 6 });
  }
  const handledCount = allAgents.reduce((acc, a) => acc + (a.handled || 0), 0);
  const escalationsCount = allAgents.reduce((acc, a) => acc + (a.escalations || 0), 0);
  const auditEventsCount = getAuditEvents().length;
  motion.animateNumber('#view [data-motion-key="arm:active-agents"]', { to: activeCount, padZeros: 2, scope: 'arm' });
  motion.animateNumber('#view [data-motion-key="arm:interventions"]', { to: handledCount, scope: 'arm' });
  motion.animateNumber('#view [data-motion-key="arm:escalations"]', { to: escalationsCount, scope: 'arm' });
  motion.animateNumber('#view [data-motion-key="arm:audit-events"]', { to: auditEventsCount, scope: 'arm' });

  $('#arm-tour').onclick = () => startTour('dashboard');
  const openWfsBtn = $('#arm-open-workflows');
  if (openWfsBtn) openWfsBtn.onclick = () => { location.hash = '#automations'; };

  const newAgentBtn = $('#arm-new-agent');
  if (newAgentBtn) {
    newAgentBtn.onclick = () => openAgentBuilderModal({
      mode: 'create',
      options,
      onSaved: ag => {
        ui.selectedArmAgentId = ag.id;
        renderARM(options);
      }
    });
  }

  document.querySelectorAll('[data-arm-agent]').forEach(btn => {
    btn.onclick = () => {
      ui.selectedArmAgentId = Number(btn.dataset.armAgent);
      renderARM(options);
    };
  });

  document.querySelectorAll('[data-arm-recovery]').forEach(btn => {
    btn.onclick = () => {
      const rawId = btn.dataset.armRecovery;
      const numId = Number(rawId);
      const item = recoveries.find(r => String(r.leadId ?? r.id) === String(rawId));
      const ok = executeRecovery(Number.isFinite(numId) ? numId : rawId);
      if (ok) {
        const displayName = (typeof ok === 'object' && (ok.patientName || ok.name)) || item?.name || item?.patientName || `Seguimiento #${rawId}`;
        recordARMEvent('followup', `Seguimiento aprobado para ${displayName}`, `Aprobación humana registrada (${item?.date || ''} ${item?.time || ''})`, 'good');
        toast(`Aprobación registrada y seguimiento creado para ${displayName}.`);
        renderARM(options);
      }
    };
  });

  const closeDetailBtn = $('#arm-close-detail');
  if (closeDetailBtn) {
    closeDetailBtn.onclick = () => {
      if (String(location.hash || '').startsWith('#arm/')) {
        location.hash = '#arm';
      } else {
        ui.selectedArmAgentId = allAgents[0]?.id || null;
        renderARM(options);
      }
    };
  }

  const actor = getActorOpts(options);
  const toggleBtn = $('#arm-toggle-agent');
  if (toggleBtn && activeAgent) {
    toggleBtn.onclick = () => {
      const res = toggleAgentStatus(activeAgent.id, actor);
      if (!res.ok) {
        toast(res.message);
        return;
      }
      toast(`${res.agent.name} -> ${AGENT_STATUS_LABELS[res.agent.status]}.`);
      renderARM(options);
    };
  }

  const editBtn = $('#arm-edit-agent');
  if (editBtn && activeAgent) {
    editBtn.onclick = () => openAgentBuilderModal({
      mode: 'edit',
      agentId: activeAgent.id,
      options,
      onSaved: () => renderARM(options)
    });
  }

  const dupBtn = $('#arm-dup-agent');
  if (dupBtn && activeAgent) {
    dupBtn.onclick = () => {
      const res = duplicateAgent(activeAgent.id, actor);
      if (!res.ok) {
        toast(res.message);
        return;
      }
      ui.selectedArmAgentId = res.agent.id;
      toast(`Agente duplicado como "${res.agent.name}".`);
      renderARM(options);
    };
  }

  const archBtn = $('#arm-archive-agent');
  if (archBtn && activeAgent) {
    archBtn.onclick = () => {
      const res = archiveAgent(activeAgent.id, actor);
      if (!res.ok) {
        toast(res.message);
        return;
      }
      toast(`Agente "${activeAgent.name}" archivado.`);
      ui.selectedArmAgentId = null;
      renderARM(options);
    };
  }
}

// =========================================================================
// Geometría SVG para Conexiones Bézier Cúbicas (Rendimiento directo en DOM)
// =========================================================================

const NODE_WIDTH = 212;
const NODE_HEIGHT_DEFAULT = 98;

function getNodeDomSize(nodeEl) {
  if (nodeEl && nodeEl.offsetWidth > 0 && nodeEl.offsetHeight > 0) {
    return { w: nodeEl.offsetWidth, h: nodeEl.offsetHeight };
  }
  return { w: NODE_WIDTH, h: NODE_HEIGHT_DEFAULT };
}

function getPortPoint(wf, nodeId, port, isOutput) {
  const node = wf.nodes.find(n => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  const domEl = document.querySelector(`[data-wf-node-id="${CSS.escape(nodeId)}"]`);
  const { w, h } = getNodeDomSize(domEl);
  if (!isOutput) {
    return { x: node.position.x, y: node.position.y + Math.round(h / 2) };
  }
  if (port === 'yes') {
    return { x: node.position.x + w, y: node.position.y + Math.round(h * 0.34) };
  }
  if (port === 'no') {
    return { x: node.position.x + w, y: node.position.y + Math.round(h * 0.72) };
  }
  return { x: node.position.x + w, y: node.position.y + Math.round(h / 2) };
}

function computeBezierGeometry(p1, p2, sourcePort) {
  const dx = p2.x - p1.x;
  let path = '';
  let labelX = Math.round((p1.x + p2.x) / 2);
  let labelY = Math.round((p1.y + p2.y) / 2) - 10;

  if (dx >= 28) {
    const offset = Math.min(130, Math.max(46, Math.abs(dx) * 0.45));
    path = `M ${p1.x} ${p1.y} C ${p1.x + offset} ${p1.y}, ${p2.x - offset} ${p2.y}, ${p2.x} ${p2.y}`;
  } else {
    // Retorno ordenado sin cruzar por encima de los encabezados de los nodos
    const loopDrop = p2.y >= p1.y ? Math.round((p2.y - p1.y) / 2) : -72;
    const midY = p1.y + (Math.abs(loopDrop) < 42 ? 84 : loopDrop);
    path = `M ${p1.x} ${p1.y} C ${p1.x + 76} ${p1.y}, ${p1.x + 76} ${midY}, ${Math.round((p1.x + p2.x) / 2)} ${midY} S ${p2.x - 76} ${p2.y}, ${p2.x} ${p2.y}`;
    labelY = midY - 10;
  }
  if (sourcePort === 'yes' && dx >= 28) labelY -= 4;
  if (sourcePort === 'no' && dx >= 28) labelY += 14;
  return { path, labelX, labelY };
}

function patchConnectedEdgesDom(wf, movedNodeId) {
  const svg = $('#wf-edges-svg');
  if (!svg) return;
  for (const edge of wf.edges) {
    if (edge.sourceNodeId !== movedNodeId && edge.targetNodeId !== movedNodeId) continue;
    const p1 = getPortPoint(wf, edge.sourceNodeId, edge.sourcePort, true);
    const p2 = getPortPoint(wf, edge.targetNodeId, edge.targetPort, false);
    const geom = computeBezierGeometry(p1, p2, edge.sourcePort);
    const group = svg.querySelector(`[data-edge-id="${CSS.escape(edge.id)}"]`);
    if (group) {
      group.querySelectorAll('path').forEach(pathEl => pathEl.setAttribute('d', geom.path));
      const labelG = group.querySelector('.wf-edge-label-group');
      if (labelG) labelG.setAttribute('transform', `translate(${geom.labelX}, ${geom.labelY})`);
    }
  }
}

function computeAutoFitView(wf, fitOptions = {}) {
  const mode = fitOptions.mode || 'edit';
  const viewport = $('#wf-canvas-viewport');
  if (!viewport || !wf || !wf.nodes.length) return { zoom: 0.9, panX: 16, panY: 16 };
  const vw = Math.max(320, viewport.clientWidth || 720);
  const vh = Math.max(260, viewport.clientHeight || 440);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of wf.nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, n.position.y + NODE_HEIGHT_DEFAULT);
  }
  const pad = mode === 'overview' ? 28 : 36;
  const contentW = Math.max(260, maxX - minX + pad * 2);
  const contentH = Math.max(160, maxY - minY + pad * 2);
  const scaleX = vw / contentW;
  const scaleY = vh / contentH;
  const rawFit = Math.min(scaleX, scaleY);
  const minZoom = mode === 'overview' ? 0.25 : mode === 'presentation' ? 0.5 : 0.58;
  const maxZoom = mode === 'presentation' ? 1.15 : 1.08;
  const zoom = Math.max(minZoom, Math.min(maxZoom, rawFit));
  const scaledW = (maxX - minX) * zoom;
  const scaledH = (maxY - minY) * zoom;

  let panX;
  let panY;
  if (mode !== 'overview' && (scaledW + 24 > vw || scaledH + 24 > vh)) {
    const focusNode = (ui.selectedNodeId && wf.nodes.find(n => n.id === ui.selectedNodeId)) || wf.nodes[0];
    if (scaledW + 24 > vw && focusNode) {
      const idealPanX = Math.round(vw / 2 - (focusNode.position.x + NODE_WIDTH / 2) * zoom);
      const minPanX = Math.round(vw - maxX * zoom - 20);
      const maxPanX = Math.round(20 - minX * zoom);
      panX = Math.max(minPanX, Math.min(maxPanX, idealPanX));
    } else {
      panX = scaledW + 24 > vw ? Math.round(16 - minX * zoom) : Math.round((vw - scaledW) / 2 - minX * zoom);
    }
    if (scaledH + 24 > vh && focusNode) {
      const idealPanY = Math.round(vh / 2 - (focusNode.position.y + NODE_HEIGHT_DEFAULT / 2) * zoom);
      const minPanY = Math.round(vh - maxY * zoom - 20);
      const maxPanY = Math.round(20 - minY * zoom);
      panY = Math.max(minPanY, Math.min(maxPanY, idealPanY));
    } else {
      panY = scaledH + 24 > vh ? Math.round(16 - minY * zoom) : Math.round((vh - scaledH) / 2 - minY * zoom);
    }
  } else {
    panX = scaledW + 24 > vw
      ? Math.round(12 - minX * zoom)
      : Math.round((vw - scaledW) / 2 - minX * zoom);
    panY = scaledH + 24 > vh
      ? Math.round(12 - minY * zoom)
      : Math.round((vh - scaledH) / 2 - minY * zoom);
  }
  return { zoom: Number(zoom.toFixed(2)), panX, panY };
}

function centerNodeInViewport(wf, nodeId) {
  const viewport = $('#wf-canvas-viewport');
  const node = wf?.nodes.find(n => n.id === nodeId);
  if (!viewport || !node) return;
  const vw = viewport.clientWidth || 720;
  const vh = viewport.clientHeight || 420;
  ui.panX = Math.round(vw / 2 - (node.position.x + NODE_WIDTH / 2) * ui.zoom);
  ui.panY = Math.round(vh / 2 - (node.position.y + NODE_HEIGHT_DEFAULT / 2) * ui.zoom);
  applyStageTransform();
}

function updateOverviewBadgeDom() {
  const badge = $('#wf-overview-badge');
  if (badge) {
    badge.classList.toggle('is-hidden', !ui.overviewMode);
  }
  const ovBtn = $('#wf-overview-btn');
  if (ovBtn) {
    ovBtn.classList.toggle('is-active', Boolean(ui.overviewMode));
  }
}

function applyStageTransform() {
  const stage = $('#wf-canvas-stage');
  if (stage) {
    stage.style.transform = `translate(${ui.panX}px, ${ui.panY}px) scale(${ui.zoom})`;
  }
  const pct = `${Math.round(ui.zoom * 100)}%`;
  const zLabel = $('#wf-zoom-label');
  if (zLabel) zLabel.textContent = pct;
  const pzLabel = $('#wf-pres-zoom-label');
  if (pzLabel) pzLabel.textContent = pct;
  updateOverviewBadgeDom();
}

// =========================================================================
// Vista 2: Constructor Visual de Workflows (#automations)
// =========================================================================

export function renderAutomations(options = {}) {
  const { toast = () => {}, user = { role: 'admin', name: 'Administrador' }, openModal = null } = options;
  const view = $('#view');
  if (!view) return;

  detachAutomationsUiListeners();
  ui.lastRenderOptions = options;

  const perms = getAutomationRolePermissions(user.role);
  const actor = getActorOpts(options);
  const allWorkflows = getWorkflows({ includeArchived: true });
  const visibleWorkflows = allWorkflows.filter(w => w.status !== 'archived');
  const agents = getAgents({ includeArchived: false });

  if (!ui.activeWorkflowId || !allWorkflows.some(w => w.id === ui.activeWorkflowId)) {
    ui.activeWorkflowId = visibleWorkflows[0]?.id || allWorkflows[0]?.id || null;
  }
  const wf = allWorkflows.find(w => w.id === ui.activeWorkflowId) || allWorkflows[0];
  if (!wf) return;

  if (ui.selectedNodeId && !wf.nodes.some(n => n.id === ui.selectedNodeId)) {
    ui.selectedNodeId = null;
  }

  const validation = validateWorkflowStructure(wf, getAgents({ includeArchived: true }), { mode: 'validate' });
  ui.lastValidation = validation;
  const sim = getSimulationState();
  const scenarios = getCompatibleScenariosForWorkflow(wf);
  if (!scenarios.some(s => s.id === ui.selectedScenarioId)) {
    ui.selectedScenarioId = scenarios[0]?.id || SIMULATION_SCENARIOS[0].id;
  }

  const stMeta = WORKFLOW_STATES[wf.status] || WORKFLOW_STATES.draft;
  const uiState = getWorkflowUiStateMeta(wf, validation, perms);
  if (!ui.panelPrefsLoaded) {
    const prefs = readPanelPrefs();
    ui.catalogCollapsed = Boolean(prefs.catalogCollapsed);
    ui.propsCollapsed = Boolean(prefs.propsCollapsed);
    ui.panelPrefsLoaded = true;
  }
  const isReadOnlyWorkflow = !perms.editWorkflow || uiState.isReadOnly;
  const reducedMotion = isReducedMotionActive();
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('is-wf-presentation', Boolean(ui.presentationMode));
  }
  const quickRules = getQuickAutomations();
  const simScenarioLabel = scenarios.find(s => s.id === ui.selectedScenarioId)?.label || scenarios[0]?.label || 'Escenario';

  view.innerHTML = `
    <div class="wf-studio ${ui.presentationMode ? 'is-presentation' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${sim?.status === 'paused' ? 'is-sim-paused' : ''}" id="wf-studio" data-role="${esc(user.role)}" data-ui-state="${esc(uiState.uiStateKey)}">
      <div id="wf-sr-announce" class="sr-only" aria-live="polite"></div>

      ${ui.presentationMode ? `
        <header class="wf-pres-bar panel" id="wf-presentation-bar" aria-label="Controles de presentación del workflow">
          <div class="wf-pres-title-group">
            <span class="badge">Presentación</span>
            <h2 id="wf-pres-wf-name">${esc(wf.name || '(Sin nombre)')}</h2>
            <span class="wf-state-pill is-${esc(uiState.badgeTone)}" id="wf-status-badge">${esc(uiState.badgeLabel)}</span>
            <span class="wf-version-pill" id="wf-version-badge">v${wf.version}</span>
            ${uiState.hasUnpublishedChanges ? `<span class="wf-unsaved-pill is-protected" id="wf-unpublished-pill">${esc(uiState.unpublishedLabel)}</span>` : ''}
          </div>
          <div class="wf-pres-sim-group">
            <label for="wf-pres-scenario" class="sr-only">Escenario de demostración</label>
            <select id="wf-pres-scenario" aria-label="Escenario de demostración">
              ${scenarios.map(s => `<option value="${esc(s.id)}" ${ui.selectedScenarioId === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select>
            ${perms.simulateWorkflow ? `
              <button class="btn sm primary" id="wf-pres-start" type="button" ${uiState.simulateDisabled ? 'disabled' : ''}>Simular</button>
              <button class="btn sm" id="wf-pres-pause" type="button" ${sim?.status !== 'running' ? 'disabled' : ''}>Pausar</button>
              <button class="btn sm primary" id="wf-pres-resume" type="button" ${sim?.status !== 'paused' ? 'disabled' : ''}>Continuar</button>
              <button class="btn sm" id="wf-pres-step" type="button" ${uiState.simulateDisabled ? 'disabled' : ''}>Siguiente paso</button>
              <button class="btn sm" id="wf-pres-restart" type="button" ${!sim ? 'disabled' : ''}>Reiniciar</button>
              <button class="btn sm" id="wf-pres-stop" type="button" ${!sim ? 'disabled' : ''}>Detener</button>
              <label for="wf-pres-speed" class="sr-only">Velocidad</label>
              <select id="wf-pres-speed" style="width:auto" aria-label="Velocidad de simulación">
                <option value="0.75" ${(sim?.speed || 1) === 0.75 ? 'selected' : ''}>0.75x</option>
                <option value="1" ${(sim?.speed || 1) === 1 ? 'selected' : ''}>1x</option>
                <option value="1.5" ${(sim?.speed || 1) === 1.5 ? 'selected' : ''}>1.5x</option>
                <option value="2" ${(sim?.speed || 1) === 2 ? 'selected' : ''}>2x</option>
              </select>
            ` : ''}
          </div>
          <div class="wf-pres-exit-group">
            <button class="btn sm" id="wf-pres-zoom-out" type="button" aria-label="Alejar presentación">−</button>
            <span class="wf-zoom-label" id="wf-pres-zoom-label">${Math.round(ui.zoom * 100)}%</span>
            <button class="btn sm" id="wf-pres-zoom-in" type="button" aria-label="Acercar presentación">+</button>
            <button class="btn sm" id="wf-pres-fit" type="button">Autoajustar</button>
            <button class="btn danger" id="wf-exit-present-btn" type="button">Salir de presentación (Esc)</button>
          </div>
        </header>
        <div class="wf-pres-disclaimer" id="wf-pres-disclaimer" role="status">
          <strong>${esc(SIMULATION_DISCLAIMER)}</strong>
          <span id="wf-pres-sim-status">
            ${sim ? `Estado: <b>${esc(sim.status)}</b> · Escenario: ${esc(sim.scenario.label)} · Paso ${sim.steps.length} de ${sim.plannedSteps.length}` : `Listo para presentar · Escenario: ${esc(simScenarioLabel)}`}
          </span>
        </div>
      ` : ''}

      <!-- Barra superior -->
      <header class="wf-topbar panel">
        <div class="wf-topbar-row">
          <div class="wf-selector-group">
            <label class="sr-only" for="wf-selector">Workflow activo</label>
            <select id="wf-selector" aria-label="Seleccionar workflow">
              ${allWorkflows.map(w => `
                <option value="${esc(w.id)}" ${w.id === wf.id ? 'selected' : ''}>
                  ${esc(w.name || '(Sin nombre)')} · ${(WORKFLOW_STATES[w.status]?.label || w.status)} (v${w.version})
                </option>
              `).join('')}
            </select>
            ${perms.createWorkflow ? `<button class="btn" id="wf-new-btn" type="button">+ Nuevo workflow</button>` : ''}
            ${perms.createWorkflow ? `<button class="btn" id="wf-templates-btn" type="button">Plantillas (${WORKFLOW_TEMPLATES.length})</button>` : ''}
          </div>

          <div class="wf-meta-badges">
            <span class="wf-state-pill is-${esc(uiState.badgeTone)}" id="${ui.presentationMode ? 'wf-edit-status-badge' : 'wf-status-badge'}">${esc(uiState.badgeLabel)}</span>
            <span class="wf-version-pill" id="${ui.presentationMode ? 'wf-edit-version-badge' : 'wf-version-badge'}">v${wf.version}</span>
            ${uiState.showPublishedPill ? `<span class="wf-saved-pill is-published" id="wf-published-indicator">${esc(uiState.publishedPillLabel)}</span>` : ''}
            ${uiState.unpublishedLabel ? `<span class="wf-unsaved-pill is-protected" id="${ui.presentationMode ? 'wf-edit-unpublished-pill' : 'wf-unpublished-pill'}" title="La versión activa previa continúa protegida hasta publicar">${esc(uiState.unpublishedLabel)}</span>` : ''}
            ${wf.hasUnsavedChanges ? '<span class="wf-unsaved-pill" id="wf-unsaved-pill">Cambios sin guardar</span>' : '<span class="wf-saved-pill" id="wf-saved-pill">Guardado local</span>'}
          </div>

          <div class="wf-primary-actions">
            ${perms.editWorkflow ? `<button class="btn" id="wf-save-btn" type="button" ${uiState.saveDisabled ? 'disabled' : ''}>Guardar borrador</button>` : ''}
            ${perms.validateWorkflow ? `<button class="btn" id="wf-validate-btn" type="button" ${uiState.validateDisabled ? 'disabled' : ''}>Validar</button>` : ''}
            ${perms.simulateWorkflow ? `<button class="btn primary" id="wf-simulate-btn" type="button" ${uiState.simulateDisabled ? 'disabled' : ''}>Simular</button>` : ''}
            <button class="btn" id="wf-present-btn" type="button" title="Abrir flujo en modo presentación limpia">Presentar workflow</button>
            ${uiState.uiStateKey === 'active_clean' && perms.pauseWorkflow ? `<button class="btn" id="wf-pause-quick-btn" type="button">Pausar</button>` : ''}
            ${uiState.showActivateBtn ? `<button class="btn primary-outline" id="wf-activate-btn" type="button" ${uiState.activateDisabled ? 'disabled' : ''} title="${esc(uiState.activateReason || uiState.activateLabel)}">${esc(uiState.activateLabel)}</button>` : ''}

            <div class="wf-more-wrap">
              <button class="btn" id="wf-more-toggle" type="button" aria-expanded="${ui.moreMenuOpen}" aria-haspopup="menu">Más ▾</button>
              <div class="wf-more-menu" id="wf-more-menu" ${ui.moreMenuOpen ? '' : 'hidden'} role="menu">
                <button type="button" id="wf-present-menu-btn" role="menuitem">Presentar workflow</button>
                ${perms.createWorkflow ? `<button type="button" id="wf-duplicate-btn" role="menuitem">Duplicar workflow</button>` : ''}
                ${perms.pauseWorkflow ? `<button type="button" id="wf-pause-btn" role="menuitem" ${uiState.pauseDisabled ? 'disabled' : ''}>Pausar workflow</button>` : ''}
                ${perms.archiveWorkflow ? `<button type="button" id="wf-archive-btn" role="menuitem" ${uiState.archiveDisabled ? 'disabled' : ''}>Archivar workflow</button>` : ''}
                <button type="button" id="wf-library-btn" role="menuitem">Biblioteca de workflows</button>
                <button type="button" id="wf-history-btn" role="menuitem">Ver historial de cambios</button>
                ${perms.resetDemo ? `<button type="button" id="wf-reset-btn" class="is-danger" role="menuitem">Restablecer demo</button>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="wf-topbar-row wf-topbar-sub">
          <div class="wf-title-fields">
            <input id="wf-name-input" class="wf-name-input" value="${esc(wf.name)}" placeholder="Nombre del workflow" aria-label="Nombre del workflow" ${isReadOnlyWorkflow ? 'readonly' : ''}>
            <input id="wf-desc-input" class="wf-desc-input" value="${esc(wf.description)}" placeholder="Descripción breve del alcance administrativo o preventivo" aria-label="Descripción breve del workflow" ${isReadOnlyWorkflow ? 'readonly' : ''}>
          </div>
          <div class="wf-validation-top-summary ${validation.valid ? 'is-ok' : 'is-error'}" id="wf-validation-top-summary">
            ${validation.valid
              ? `<span>✓ Estructura válida · ${validation.warnings.length} advertencia(s)</span>`
              : `<button type="button" class="wf-error-jump" id="wf-jump-first-error" data-focus-first-error="1">! ${validation.errors.length} error(es) bloqueante(s) · Ver primero</button>`}
          </div>
        </div>

        ${ui.pendingArchiveConfirm ? `
          <div class="wf-inline-confirm" id="wf-archive-confirm-bar">
            <span>¿Archivar "<strong>${esc(wf.name)}</strong>"? Se conservará su historial en auditoría y no eliminará eventos previos.</span>
            <div class="row-gap">
              <button class="btn" type="button" id="wf-cancel-archive">Cancelar</button>
              <button class="btn danger" type="button" id="wf-confirm-archive">Confirmar archivado</button>
            </div>
          </div>
        ` : ''}

        ${ui.pendingResetConfirm ? `
          <div class="wf-inline-confirm is-warn" id="wf-reset-confirm-bar">
            <span>¿Restablecer exclusivamente los datos de demostración de workflows, agentes y auditoría? (Agenda, Caja, Recepción y CRM permanecerán intactos).</span>
            <div class="row-gap">
              <button class="btn" type="button" id="wf-cancel-reset">Cancelar</button>
              <button class="btn danger" type="button" id="wf-confirm-reset">Restablecer automatizaciones</button>
            </div>
          </div>
        ` : ''}
      </header>

      <!-- Cuerpo principal de 3 columnas -->
      <div class="wf-workspace ${ui.catalogCollapsed ? 'is-catalog-collapsed' : ''} ${ui.propsCollapsed ? 'is-props-collapsed' : ''}">
        <!-- Panel izquierdo: Catálogo de nodos -->
        <aside class="wf-catalog panel ${ui.mobileCatalogOpen ? 'is-drawer-open' : ''}" id="wf-catalog-panel" aria-label="Catálogo de nodos">
          <div class="wf-panel-head">
            <div>
              <h3>Catálogo de nodos</h3>
              <small class="muted">Arrastra o haz clic en Añadir</small>
            </div>
            <button class="btn icon-sm" id="wf-toggle-catalog" type="button" title="${ui.catalogCollapsed ? 'Expandir catálogo' : 'Plegar catálogo'}" aria-label="Plegar o expandir catálogo de nodos">${ui.catalogCollapsed ? '»' : '«'}</button>
          </div>
          <div class="wf-catalog-body">
            <input id="wf-catalog-search" class="wf-catalog-search" type="search" value="${esc(ui.catalogSearch)}" placeholder="Buscar disparador, condición, agente..." aria-label="Buscar nodos en el catálogo">
            <div class="wf-catalog-list" id="wf-catalog-list">
              ${renderCatalogHtml(isReadOnlyWorkflow)}
            </div>
          </div>
        </aside>

        <!-- Lienzo central interactivo + móvil lectura -->
        <section class="wf-canvas-panel panel" id="wf-canvas-panel">
          <div class="wf-canvas-toolbar">
            <div class="row-gap">
              <button class="btn sm wf-tablet-only" id="wf-drawer-catalog-btn" type="button">Catálogo</button>
              <button class="btn sm" id="wf-zoom-out" type="button" aria-label="Alejar lienzo">−</button>
              <span class="wf-zoom-label" id="wf-zoom-label">${Math.round(ui.zoom * 100)}%</span>
              <button class="btn sm" id="wf-zoom-in" type="button" aria-label="Acercar lienzo">+</button>
              <button class="btn sm" id="wf-fit-btn" type="button" title="Autoajustar con lectura cómoda (mín. 58%)">Autoajustar</button>
              <button class="btn sm ${ui.overviewMode ? 'is-active' : ''}" id="wf-overview-btn" type="button" title="Ver todo el flujo completo de una sola vista">Ver flujo completo</button>
              <button class="btn sm" id="wf-auto-layout-btn" type="button" title="Ordenar nodos automáticamente" ${isReadOnlyWorkflow ? 'disabled' : ''}>Ordenar</button>
              <button class="btn sm" id="wf-center-sel-btn" type="button" ${!ui.selectedNodeId ? 'disabled' : ''}>Centrar seleccionado</button>
            </div>
            <div class="row-gap">
              <span class="wf-overview-badge ${ui.overviewMode ? '' : 'is-hidden'}" id="wf-overview-badge">Vista general del flujo completo</span>
              <button class="btn sm" id="wf-undo-btn" type="button" ${(!canUndoWorkflow(wf.id) || isReadOnlyWorkflow) ? 'disabled' : ''}>Deshacer</button>
              <button class="btn sm" id="wf-redo-btn" type="button" ${(!canRedoWorkflow(wf.id) || isReadOnlyWorkflow) ? 'disabled' : ''}>Rehacer</button>
              <button class="btn sm wf-tablet-only" id="wf-drawer-props-btn" type="button">Propiedades</button>
            </div>
          </div>

          <div class="wf-sim-banner ${sim ? '' : 'is-hidden'}" id="wf-sim-banner" role="status">
            ${renderSimBannerHtml(sim)}
          </div>

          <div class="wf-connect-hint ${ui.connectingFrom ? '' : 'is-hidden'}" id="wf-connect-hint">
            <span>Modo conexión: selecciona el nodo destino para conectar desde <strong>${esc(ui.connectingFrom ? (wf.nodes.find(n => n.id === ui.connectingFrom.nodeId)?.label || '') : '')}</strong> (${ui.connectingFrom?.port === 'yes' ? 'Sí' : ui.connectingFrom?.port === 'no' ? 'No' : 'Salida'}).</span>
            <button class="btn sm" id="wf-cancel-connect" type="button">Cancelar</button>
          </div>

          <!-- Lienzo Desktop / Tablet -->
          <div class="wf-canvas-viewport" id="wf-canvas-viewport" tabindex="0" role="region" aria-label="Lienzo visual del workflow">
            <div class="wf-canvas-stage" id="wf-canvas-stage" style="transform: translate(${ui.panX}px, ${ui.panY}px) scale(${ui.zoom})">
              <svg class="wf-svg-layer" id="wf-edges-svg" viewBox="0 0 2400 1400" width="2400" height="1400">
                <defs>
                  <marker id="wf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b"></path>
                  </marker>
                  <marker id="wf-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f766e"></path>
                  </marker>
                  <marker id="wf-arrow-yes" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#15803d"></path>
                  </marker>
                  <marker id="wf-arrow-no" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#b45309"></path>
                  </marker>
                </defs>
                ${wf.edges.map(edge => renderEdgeSvgHtml(wf, edge, sim)).join('')}
                <path id="wf-draft-edge" class="wf-draft-edge" d="" style="display:none"></path>
              </svg>

              <div class="wf-nodes-layer" id="wf-nodes-layer">
                ${wf.nodes.map(node => renderNodeCardHtml(node, wf, validation, sim, isReadOnlyWorkflow)).join('')}
              </div>
            </div>
          </div>

          <!-- Vista simplificada de solo lectura en móviles <= 680px -->
          <div class="wf-mobile-flow-view" aria-label="Vista móvil de solo lectura">
            <div class="wf-sim-static-note">Vista móvil simplificada (solo lectura). Usa tablet o escritorio para editar conexiones en el lienzo.</div>
            ${wf.nodes.map((node, i) => `
              <div class="wf-mobile-step">
                <span class="wf-mobile-num">${i + 1}</span>
                <div>
                  <strong>${esc(node.label)}</strong>
                  <div class="muted">${esc(getNodeTypeSpec(node.type)?.label || node.type)} · ${esc(node.description || '')}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Leyenda visual compacta -->
          <div class="wf-legend" id="wf-legend" aria-label="Leyenda de estados visuales">
            <span class="wf-legend-item"><i class="dot is-running"></i>Ejecutándose</span>
            <span class="wf-legend-item"><i class="dot is-paused"></i>Pausado</span>
            <span class="wf-legend-item"><i class="dot is-completed"></i>Completado</span>
            <span class="wf-legend-item"><i class="dot is-waiting"></i>Esperando / Aprobación</span>
            <span class="wf-legend-item"><i class="dot is-blocked"></i>Error / Bloqueo</span>
            <span class="wf-legend-item"><i class="dot is-skipped"></i>No ejecutado</span>
            <span class="wf-legend-item"><i class="dot is-warning"></i>Advertencia</span>
            <span class="wf-legend-item wf-legend-branch"><i class="dot is-yes"></i>Rama Sí</span>
            <span class="wf-legend-item wf-legend-branch"><i class="dot is-no"></i>Rama No</span>
          </div>
        </section>

        <!-- Panel derecho: Propiedades contextuales -->
        <aside class="wf-props panel ${ui.mobilePropsOpen ? 'is-drawer-open' : ''}" id="wf-props-panel" aria-label="Propiedades del nodo o workflow">
          ${renderPropertiesPanelHtml(wf, validation, isReadOnlyWorkflow)}
        </aside>
      </div>

      <!-- Panel inferior / cajón de resultados -->
      <section class="wf-dock panel" id="wf-bottom-dock" aria-label="Resultados de validación, simulación y auditoría">
        <div class="wf-dock-head">
          <div class="wf-dock-tabs" role="tablist">
            <button class="wf-dock-tab ${ui.dockTab === 'validation' ? 'is-active' : ''}" data-dock-tab="validation" role="tab" type="button">
              Validación <span class="badge ${validation.valid ? '' : 'warn'}">${validation.errors.length + validation.warnings.length}</span>
            </button>
            <button class="wf-dock-tab ${ui.dockTab === 'simulation' ? 'is-active' : ''}" data-dock-tab="simulation" role="tab" type="button">
              Simulación ${sim ? `<span class="badge">${esc(sim.status)}</span>` : ''}
            </button>
            <button class="wf-dock-tab ${ui.dockTab === 'audit' ? 'is-active' : ''}" data-dock-tab="audit" role="tab" type="button">
              Auditoría reciente <span class="badge">${getAuditEvents().length}</span>
            </button>
          </div>
          <div class="wf-dock-summary muted" id="wf-dock-summary">
            ${esc(validation.summary)}
          </div>
        </div>

        <div class="wf-dock-body" id="wf-dock-body">
          ${renderDockBodyHtml(wf, validation, sim, scenarios)}
        </div>
      </section>

      <!-- Reglas rápidas heredadas visibles y sincronizadas (compatibilidad .automation-card) -->
      <section class="wf-quick-rules-strip" aria-label="Reglas rápidas de automatización (acceso directo)">
        <div class="wf-quick-strip-head">
          <strong>Reglas rápidas conectadas al constructor (${quickRules.length})</strong>
          <span class="muted">Sincronizadas con los flujos del lienzo · Ejecución demostrativa sin efectos externos reales</span>
        </div>
        <div class="automation-list">
          ${quickRules.map(rule => `
            <article class="automation-card ${rule.active ? '' : 'is-paused'}" data-automation-card="${rule.id}">
              <div class="automation-icon">⚡</div>
              <div class="automation-main">
                <div class="row-between">
                  <strong>${esc(rule.name)}</strong>
                  <span class="badge">${rule.active ? 'Activa (demo)' : 'Pausada'}</span>
                </div>
                <div class="muted">${esc(rule.trigger)} · ${esc(rule.action)}</div>
                <small class="muted">Última ejecución: ${esc(rule.lastRun)}</small>
              </div>
              <div class="automation-actions">
                <button class="btn sm" data-automation-test="${rule.id}" type="button">Probar</button>
                <button class="btn sm" data-automation-toggle="${rule.id}" type="button">${rule.active ? 'Pausar' : 'Activar'}</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  // Posicionar correctamente cada curva SVG con medidas reales de los nodos en DOM
  requestAnimationFrame(() => {
    wf.nodes.forEach(n => patchConnectedEdgesDom(wf, n.id));
    if (ui.fittedWorkflowId !== wf.id) {
      ui.fittedWorkflowId = wf.id;
      const fitted = computeAutoFitView(wf, {
        mode: ui.presentationMode ? 'presentation' : ui.overviewMode ? 'overview' : 'edit'
      });
      ui.zoom = fitted.zoom;
      ui.panX = fitted.panX;
      ui.panY = fitted.panY;
      applyStageTransform();
    }
    if (motion.shouldAnimateModuleEntry('automations', `wf:${wf.id}`)) {
      motion.animateWorkflowDiagramEntry({
        nodes: '#wf-nodes-layer .wf-node',
        edges: '#wf-edges-layer .wf-edge-path',
        scope: 'automations'
      });
    }
  });

  bindAutomationsEvents(wf, options, validation, scenarios);
}

// =========================================================================
// Helpers de HTML para Catálogo, Nodos, SVG, Propiedades y Cajón
// =========================================================================

function renderCatalogHtml(isReadOnly) {
  const q = ui.catalogSearch.trim().toLowerCase();
  const categoriesHtml = NODE_CATEGORIES.map(cat => {
    if (cat.key === 'trigger') {
      const triggers = TRIGGER_PRESETS.filter(t => !q || t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || 'disparador'.includes(q));
      if (!triggers.length) return '';
      return `
        <div class="wf-cat-group">
          <div class="wf-cat-title" style="--cat-color:${cat.color}"><span>${esc(cat.label)}</span><small>${triggers.length}</small></div>
          ${triggers.map(trig => `
            <div class="wf-cat-item" draggable="${!isReadOnly}" data-node-type="trigger_event" data-trigger-key="${esc(trig.key)}">
              <div class="wf-cat-item-head">
                <strong>${esc(trig.label)}</strong>
                <span class="wf-mode-tag is-${esc(trig.executionMode)}">${trig.executionMode === 'simulado' ? 'Simulado' : 'Funcional'}</span>
              </div>
              <p>${esc(trig.description)}</p>
              ${!isReadOnly ? `<button class="btn sm wf-add-btn" type="button" data-add-node-type="trigger_event" data-trigger-key="${esc(trig.key)}">+ Añadir al flujo</button>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    const nodes = NODE_CATALOG.filter(n => n.category === cat.key && (!q || n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)));
    if (!nodes.length) return '';
    return `
      <div class="wf-cat-group">
        <div class="wf-cat-title" style="--cat-color:${cat.color}"><span>${esc(cat.label)}</span><small>${nodes.length}</small></div>
        ${nodes.map(n => `
          <div class="wf-cat-item" draggable="${!isReadOnly}" data-node-type="${esc(n.type)}">
            <div class="wf-cat-item-head">
              <strong>${esc(n.label)}</strong>
              <span class="wf-mode-tag is-${esc(n.executionMode)}">${n.executionMode === 'simulado' ? 'Simulado' : 'Funcional'}</span>
            </div>
            <p>${esc(n.description)}</p>
            ${!isReadOnly ? `<button class="btn sm wf-add-btn" type="button" data-add-node-type="${esc(n.type)}">+ Añadir al flujo</button>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  return categoriesHtml || '<div class="muted" style="padding:12px">Ningún nodo coincide con la búsqueda.</div>';
}

function renderEdgeSvgHtml(wf, edge, sim) {
  const p1 = getPortPoint(wf, edge.sourceNodeId, edge.sourcePort, true);
  const p2 = getPortPoint(wf, edge.targetNodeId, edge.targetPort, false);
  const { path, labelX, labelY } = computeBezierGeometry(p1, p2, edge.sourcePort);
  const simState = sim ? (sim.edgeStates[edge.id] || 'skipped') : '';
  const isSelected = ui.selectedEdgeId === edge.id;
  const marker = simState === 'active' || simState === 'traversed'
    ? 'url(#wf-arrow-active)'
    : edge.sourcePort === 'yes' ? 'url(#wf-arrow-yes)' : edge.sourcePort === 'no' ? 'url(#wf-arrow-no)' : 'url(#wf-arrow)';
  const labelText = edge.sourcePort === 'yes' ? 'Sí' : edge.sourcePort === 'no' ? 'No' : (edge.label || '');

  return `
    <g class="wf-edge-group ${edge.sourcePort === 'yes' ? 'is-yes' : edge.sourcePort === 'no' ? 'is-no' : ''} ${simState ? `is-sim-${simState}` : ''} ${isSelected ? 'is-selected' : ''}" data-edge-id="${esc(edge.id)}">
      <path class="wf-edge-hit" d="${path}"></path>
      <path class="wf-edge-path" d="${path}" marker-end="${marker}"></path>
      ${labelText ? `
        <g class="wf-edge-label-group" transform="translate(${labelX}, ${labelY})">
          <rect x="-15" y="-11" width="30" height="20" rx="10" class="wf-edge-label-bg"></rect>
          <text x="0" y="3" text-anchor="middle" class="wf-edge-label-text">${esc(labelText)}</text>
        </g>
      ` : ''}
    </g>
  `;
}

function renderNodeCardHtml(node, wf, validation, sim, isReadOnly) {
  const spec = getNodeTypeSpec(node.type);
  const cat = NODE_CATEGORIES.find(c => c.key === spec?.category) || NODE_CATEGORIES[0];
  const issues = validation.nodeIssues[node.id] || [];
  const hasErr = issues.some(i => i.severity === 'error');
  const hasWarn = !hasErr && issues.some(i => i.severity === 'warning');
  const isSelected = ui.selectedNodeId === node.id;
  const simVisual = sim ? getSimulationNodeVisualMeta(sim, node.id, issues) : null;
  const noSimVisual = !sim ? getSimulationNodeVisualMeta(null, node.id, issues) : null;
  const simNodeState = simVisual ? simVisual.state : '';
  const isSimCurrent = Boolean(simVisual?.isCurrent);

  let subtitle = '';
  if (node.type === 'agent_execute') {
    const ag = getAgentById(node.config?.agentId);
    subtitle = ag ? `Agente: ${ag.name} (${AGENT_STATUS_LABELS[ag.status] || ag.status})` : 'Sin agente asignado';
  } else if (node.type === 'wait_delay') {
    subtitle = `Espera: ${node.config?.durationMinutes || 10} min (acelerada)`;
  } else if (node.type === 'action_task') {
    subtitle = `Área: ${node.config?.targetArea || 'Recepción'}`;
  } else if (node.type === 'action_reminder') {
    subtitle = `${node.config?.channel || 'WhatsApp (simulado)'}`;
  } else if (node.type === 'human_approval') {
    subtitle = `Aprueba: ${node.config?.approverRole || 'Recepción'}`;
  } else if (node.type === 'end_security_block') {
    subtitle = `Deriva: ${node.config?.humanTarget || 'Revisión humana'}`;
  } else if (node.type === 'trigger_event') {
    subtitle = `Evento: ${getTriggerPresetSpec(node.config?.triggerKey).label}`;
  } else {
    subtitle = spec?.shortLabel || node.type;
  }

  // Verificar conexiones salientes incompletas para indicarlo visualmente
  const outs = wf.edges.filter(e => e.sourceNodeId === node.id);
  const missingPorts = (spec?.outputs || []).filter(p => !outs.some(e => e.sourcePort === p));

  const stateBadgeText = simVisual ? simVisual.badgeText : (noSimVisual?.badgeText || '');
  const stateBadgeTone = simNodeState || noSimVisual?.state || '';

  return `
    <div class="wf-node is-cat-${esc(cat.key)} ${isSelected ? 'is-selected' : ''} ${hasErr ? 'has-error' : hasWarn ? 'has-warning' : ''} ${missingPorts.length ? 'has-incomplete' : ''} ${simNodeState ? `is-sim-${simNodeState}` : ''} ${isSimCurrent ? 'is-sim-current' : ''}"
      data-wf-node-id="${esc(node.id)}"
      data-sim-state="${esc(simNodeState)}"
      style="left:${node.position.x}px;top:${node.position.y}px;--cat-color:${cat.color}"
      tabindex="0"
      role="button"
      aria-label="Nodo ${esc(node.label)}. Tipo ${esc(spec?.label || node.type)}. ${esc(stateBadgeText)}">
      <div class="wf-node-head">
        <span class="wf-node-cat">${esc(cat.label)}</span>
        <span class="wf-mode-tag is-${esc(spec?.executionMode || 'funcional')}">${spec?.executionMode === 'simulado' ? 'Simulado' : 'Demo'}</span>
      </div>
      <div class="wf-node-body">
        <div class="wf-node-title">${esc(node.label || spec?.label)}</div>
        <div class="wf-node-sub">${esc(subtitle)}</div>
      </div>
      ${stateBadgeText ? `<div class="wf-node-state-badge is-${esc(stateBadgeTone)}">${esc(stateBadgeText)}</div>` : ''}
      ${!isReadOnly ? `
        <div class="wf-node-quick-btns">
          <button class="wf-node-mini-btn" type="button" data-node-dup="${esc(node.id)}" title="Duplicar nodo" aria-label="Duplicar nodo">⧉</button>
          <button class="wf-node-mini-btn is-del" type="button" data-node-del="${esc(node.id)}" title="Eliminar nodo" aria-label="Eliminar nodo">✕</button>
        </div>
      ` : ''}

      ${spec?.inputs.includes('in') ? `<button class="wf-port wf-port-in" type="button" data-port-dir="in" data-port-name="in" data-node-id="${esc(node.id)}" title="Puerto de entrada" aria-label="Entrada de ${esc(node.label)}"></button>` : ''}

      ${spec?.outputs.includes('out') ? `<button class="wf-port wf-port-out ${missingPorts.includes('out') ? 'is-open' : ''}" type="button" data-port-dir="out" data-port-name="out" data-node-id="${esc(node.id)}" title="Conectar salida" aria-label="Salida de ${esc(node.label)}"></button>` : ''}

      ${spec?.outputs.includes('yes') ? `<button class="wf-port wf-port-out wf-port-yes ${missingPorts.includes('yes') ? 'is-open' : ''}" type="button" data-port-dir="out" data-port-name="yes" data-node-id="${esc(node.id)}" title="Conectar rama Sí" aria-label="Salida Sí de ${esc(node.label)}">Sí</button>` : ''}
      ${spec?.outputs.includes('no') ? `<button class="wf-port wf-port-out wf-port-no ${missingPorts.includes('no') ? 'is-open' : ''}" type="button" data-port-dir="out" data-port-name="no" data-node-id="${esc(node.id)}" title="Conectar rama No" aria-label="Salida No de ${esc(node.label)}">No</button>` : ''}
    </div>
  `;
}

function renderPropertiesPanelHtml(wf, validation, isReadOnly) {
  const node = ui.selectedNodeId ? wf.nodes.find(n => n.id === ui.selectedNodeId) : null;
  const agents = getAgents({ includeArchived: false });
  const archivedBanner = wf.status === 'archived'
    ? '<div class="wf-node-issue is-warning" id="wf-archived-readonly-note"><strong>Archivado (solo lectura):</strong> No permite edición, validación ni simulación. Usa "Duplicar workflow" para crear un borrador editable.</div>'
    : '';

  if (!node) {
    const primaryAgent = wf.primaryAgentId ? getAgentById(wf.primaryAgentId) : null;
    const wfStateMeta = getWorkflowUiStateMeta(wf, validation);
    return `
      <div class="wf-panel-head">
        <div class="wf-props-head-text">
          <h3>Resumen del workflow</h3>
          <small class="muted">Selecciona un nodo para editar sus propiedades</small>
        </div>
        <div class="row-gap">
          <button class="btn icon-sm wf-desktop-props-toggle" id="wf-toggle-props" type="button" title="${ui.propsCollapsed ? 'Expandir propiedades' : 'Plegar propiedades'}" aria-label="Plegar o expandir panel de propiedades">${ui.propsCollapsed ? '«' : '»'}</button>
          <button class="btn sm wf-tablet-only" id="wf-close-props-drawer" type="button">Cerrar</button>
        </div>
      </div>
      <div class="wf-props-body">
        ${archivedBanner}
        <div class="wf-prop-field">
          <label for="wf-prop-wf-area">Área principal</label>
          <select id="wf-prop-wf-area" ${isReadOnly ? 'disabled' : ''}>
            ${AGENT_AREAS_CATALOG.map(a => `<option value="${esc(a)}" ${wf.area === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-wf-agent">Agente principal sugerido</label>
          <select id="wf-prop-wf-agent" ${isReadOnly ? 'disabled' : ''}>
            <option value="">Sin agente fijo</option>
            ${agents.map(a => `<option value="${a.id}" ${Number(wf.primaryAgentId) === a.id ? 'selected' : ''}>${esc(a.name)} (${esc(AGENT_STATUS_LABELS[a.status])})</option>`).join('')}
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-wf-esc">Responsable de escalamiento</label>
          <select id="wf-prop-wf-esc" ${isReadOnly ? 'disabled' : ''}>
            ${ESCALATION_TARGETS_CATALOG.map(t => `<option value="${esc(t)}" ${wf.escalationTarget === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>

        <div class="wf-overview-stats">
          <div><span>Estado</span><strong>${esc(wfStateMeta.badgeLabel)}</strong></div>
          <div><span>Versión</span><strong>v${wf.version}</strong></div>
          <div><span>Nodos</span><strong>${wf.nodes.length}</strong></div>
          <div><span>Conexiones</span><strong>${wf.edges.length}</strong></div>
          <div><span>Agente líder</span><strong>${esc(primaryAgent ? primaryAgent.name : 'No asignado')}</strong></div>
          <div><span>Modificado</span><strong>${esc((wf.updatedAt || '').slice(0, 10))}</strong></div>
        </div>

        <div class="wf-overview-val ${validation.valid ? 'is-ok' : 'is-err'}">
          <strong>Resumen de validación</strong>
          <p>${esc(validation.summary)}</p>
        </div>

        <div class="wf-edges-list">
          <strong>Conexiones del diagrama (${wf.edges.length})</strong>
          ${wf.edges.map(e => {
            const s = wf.nodes.find(n => n.id === e.sourceNodeId)?.label || e.sourceNodeId;
            const t = wf.nodes.find(n => n.id === e.targetNodeId)?.label || e.targetNodeId;
            return `
              <div class="wf-edge-row">
                <span>${esc(s)} ${e.label ? `[${esc(e.label)}]` : '→'} ${esc(t)}</span>
                ${!isReadOnly ? `<button class="btn sm" type="button" data-remove-edge="${esc(e.id)}" aria-label="Eliminar conexión">✕</button>` : ''}
              </div>
            `;
          }).join('') || '<div class="muted">Sin conexiones aún.</div>'}
        </div>
      </div>
    `;
  }

  const spec = getNodeTypeSpec(node.type);
  const issues = validation.nodeIssues[node.id] || [];
  const cfg = node.config || {};
  const nodeEdges = wf.edges.filter(e => e.sourceNodeId === node.id || e.targetNodeId === node.id);

  return `
    <div class="wf-panel-head">
      <div class="wf-props-head-text">
        <h3>Propiedades del nodo</h3>
        <small class="muted">${esc(spec?.label || node.type)} · <code>${esc(node.id)}</code></small>
      </div>
      <div class="row-gap">
        <button class="btn icon-sm wf-desktop-props-toggle" id="wf-toggle-props" type="button" title="${ui.propsCollapsed ? 'Expandir propiedades' : 'Plegar propiedades'}" aria-label="Plegar o expandir panel de propiedades">${ui.propsCollapsed ? '«' : '»'}</button>
        <button class="btn sm wf-tablet-only" id="wf-close-props-drawer" type="button">Cerrar</button>
      </div>
    </div>
    <div class="wf-props-body">
      ${archivedBanner}
      <div class="wf-help-card">
        <div class="row-between">
          <strong>Ayuda contextual</strong>
          <span class="wf-mode-tag is-${esc(spec?.executionMode || 'funcional')}">${spec?.executionMode === 'simulado' ? 'Simulado' : 'Funcional'}</span>
        </div>
        <p>${esc(spec?.helpText || '')}</p>
      </div>

      ${issues.length ? `
        <div class="wf-node-errors" role="alert">
          ${issues.map(i => `<div class="wf-node-issue is-${esc(i.severity)}"><strong>${esc(i.title)}:</strong> ${esc(i.message)}</div>`).join('')}
        </div>
      ` : ''}

      <div class="wf-prop-field">
        <label for="wf-prop-label">Nombre / etiqueta *</label>
        <input id="wf-prop-label" value="${esc(node.label)}" ${isReadOnly ? 'readonly' : ''}>
      </div>

      <div class="wf-prop-field">
        <label for="wf-prop-desc">Descripción</label>
        <textarea id="wf-prop-desc" rows="2" ${isReadOnly ? 'readonly' : ''}>${esc(node.description || '')}</textarea>
      </div>

      ${renderSpecificNodeConfigHtml(node, cfg, agents, isReadOnly)}

      <div class="wf-edges-list">
        <strong>Conexiones del nodo (${nodeEdges.length})</strong>
        ${nodeEdges.map(e => {
          const otherId = e.sourceNodeId === node.id ? e.targetNodeId : e.sourceNodeId;
          const otherLabel = wf.nodes.find(n => n.id === otherId)?.label || otherId;
          const dir = e.sourceNodeId === node.id ? `Salida ${e.label || ''} →` : `← Entrada desde`;
          return `
            <div class="wf-edge-row">
              <span>${dir} ${esc(otherLabel)}</span>
              ${!isReadOnly ? `<button class="btn sm" type="button" data-remove-edge="${esc(e.id)}" aria-label="Quitar conexión">✕</button>` : ''}
            </div>
          `;
        }).join('') || '<div class="muted">Sin conexiones en este nodo.</div>'}
      </div>

      ${!isReadOnly ? `
        <div class="wf-props-footer">
          <button class="btn sm" id="wf-prop-dup-node" type="button">Duplicar nodo</button>
          <button class="btn sm danger" id="wf-prop-del-node" type="button">Eliminar nodo</button>
        </div>
        ${ui.pendingDeleteNodeId === node.id ? `
          <div class="wf-inline-confirm" style="margin-top:8px">
            <span>¿Eliminar nodo y sus conexiones?</span>
            <div class="row-gap">
              <button class="btn sm" type="button" id="wf-cancel-del-node">No</button>
              <button class="btn sm danger" type="button" id="wf-confirm-del-node">Sí, eliminar</button>
            </div>
          </div>
        ` : ''}
      ` : ''}
    </div>
  `;
}

function renderSpecificNodeConfigHtml(node, cfg, agents, isReadOnly) {
  switch (node.type) {
    case 'trigger_event':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-triggerKey">Evento disparador</label>
          <select id="wf-prop-triggerKey" ${isReadOnly ? 'disabled' : ''}>
            ${TRIGGER_PRESETS.map(t => `<option value="${esc(t.key)}" ${cfg.triggerKey === t.key ? 'selected' : ''}>${esc(t.label)} (${t.executionMode})</option>`).join('')}
          </select>
        </div>
      `;

    case 'condition_branch': {
      const fSpec = CONDITION_FIELDS_CATALOG.find(f => f.key === cfg.field) || CONDITION_FIELDS_CATALOG[0];
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-cond-field">Campo a evaluar</label>
          <select id="wf-prop-cond-field" ${isReadOnly ? 'disabled' : ''}>
            ${CONDITION_FIELDS_CATALOG.map(f => `<option value="${esc(f.key)}" ${cfg.field === f.key ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid-2-inline">
          <div class="wf-prop-field">
            <label for="wf-prop-cond-op">Operador</label>
            <select id="wf-prop-cond-op" ${isReadOnly ? 'disabled' : ''}>
              <option value="equals" ${cfg.operator === 'equals' ? 'selected' : ''}>Es igual a</option>
              <option value="not_equals" ${cfg.operator === 'not_equals' ? 'selected' : ''}>Es distinto de</option>
              <option value="contains" ${cfg.operator === 'contains' ? 'selected' : ''}>Contiene</option>
            </select>
          </div>
          <div class="wf-prop-field">
            <label for="wf-prop-cond-val">Valor esperado</label>
            <select id="wf-prop-cond-val" ${isReadOnly ? 'disabled' : ''}>
              ${fSpec.options.map(o => `<option value="${esc(o.value)}" ${String(cfg.expectedValue) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
    }

    case 'condition_group': {
      const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-group-comb">Operador lógico del grupo</label>
          <select id="wf-prop-group-comb" ${isReadOnly ? 'disabled' : ''}>
            <option value="AND" ${cfg.combinator !== 'OR' ? 'selected' : ''}>AND (todas deben cumplirse)</option>
            <option value="OR" ${cfg.combinator === 'OR' ? 'selected' : ''}>OR (al menos una se cumple)</option>
          </select>
        </div>
        <div class="wf-group-rules">
          <strong>Criterios (${rules.length})</strong>
          ${rules.map((r, i) => `
            <div class="wf-rule-chip">
              <span>${esc(CONDITION_FIELDS_CATALOG.find(f => f.key === r.field)?.label || r.field)} = ${esc(r.expectedValue)}</span>
              ${!isReadOnly && rules.length > 1 ? `<button class="btn sm" type="button" data-remove-group-rule="${i}">✕</button>` : ''}
            </div>
          `).join('')}
          ${!isReadOnly ? `<button class="btn sm" type="button" id="wf-add-group-rule">+ Añadir criterio</button>` : ''}
        </div>
      `;
    }

    case 'wait_delay':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-wait-mins">Espera operativa (minutos simulados)</label>
          <input id="wf-prop-wait-mins" type="number" min="1" max="1440" value="${esc(cfg.durationMinutes ?? 10)}" ${isReadOnly ? 'readonly' : ''}>
          <small class="muted">En demostración se acelera a ~${((cfg.acceleratedMs || 1200) / 1000).toFixed(1)} segundos.</small>
        </div>
      `;

    case 'human_approval':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-app-role">Responsable aprobador</label>
          <select id="wf-prop-app-role" ${isReadOnly ? 'disabled' : ''}>
            ${ESCALATION_TARGETS_CATALOG.map(t => `<option value="${esc(t)}" ${cfg.approverRole === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-app-prompt">Mensaje de solicitud humana</label>
          <textarea id="wf-prop-app-prompt" rows="2" ${isReadOnly ? 'readonly' : ''}>${esc(cfg.approvalPrompt || '')}</textarea>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-app-timeout">Tiempo límite (horas)</label>
          <input id="wf-prop-app-timeout" type="number" min="1" max="72" value="${esc(cfg.timeoutHours ?? 4)}" ${isReadOnly ? 'readonly' : ''}>
        </div>
      `;

    case 'agent_execute': {
      const selAg = agents.find(a => a.id === Number(cfg.agentId));
      const hasCap = selAg && selAg.capabilities.includes(cfg.requiredCapability);
      return `
        <div class="wf-prop-field">
          <label for="wf-node-agent-select">Agente asignado *</label>
          <select id="wf-node-agent-select" ${isReadOnly ? 'disabled' : ''}>
            <option value="">-- Seleccionar agente --</option>
            ${agents.map(a => `<option value="${a.id}" ${Number(cfg.agentId) === a.id ? 'selected' : ''}>${esc(a.name)} (${esc(AGENT_STATUS_LABELS[a.status])})</option>`).join('')}
          </select>
          ${!isReadOnly ? `
            <div class="wf-agent-btn-pair">
              <button class="btn sm primary" id="wf-create-agent-btn" type="button">+ Crear nuevo agente</button>
              <button class="btn sm" id="wf-manage-agents-btn" type="button">Administrar agentes</button>
            </div>
          ` : ''}
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-req-cap">Capacidad requerida del catálogo *</label>
          <select id="wf-prop-req-cap" ${isReadOnly ? 'disabled' : ''}>
            ${AGENT_CAPABILITIES_CATALOG.map(c => `<option value="${esc(c.key)}" ${cfg.requiredCapability === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-agent-task">Consigna operativa del paso</label>
          <textarea id="wf-prop-agent-task" rows="2" ${isReadOnly ? 'readonly' : ''}>${esc(cfg.taskSummary || '')}</textarea>
        </div>
        ${selAg ? `
          <div class="wf-agent-mini-card">
            <div class="row-between">
              <strong>${esc(selAg.name)}</strong>
              <span class="badge ${selAg.status === 'active' ? '' : 'warn'}">${esc(AGENT_STATUS_LABELS[selAg.status])}</span>
            </div>
            <div class="muted" style="font-size:12px;margin-top:4px">Área: ${esc(selAg.area)} · Escala a: ${esc(selAg.escalationTarget)}</div>
            <div style="font-size:12px;margin-top:6px">
              <strong>Capacidades:</strong> ${esc(selAg.tools.slice(0, 4).join(', '))}${selAg.tools.length > 4 ? ` (+${selAg.tools.length - 4})` : ''}
            </div>
            ${!hasCap ? `<div class="wf-node-issue is-error" style="margin-top:6px">Este agente no posee la capacidad "${esc(AGENT_CAPABILITIES_CATALOG.find(c => c.key === cfg.requiredCapability)?.label || cfg.requiredCapability)}".</div>` : ''}
            ${(selAg.status === 'draft' || selAg.status === 'paused') && !isReadOnly
              ? `<button class="btn sm primary" style="margin-top:8px;width:100%" id="wf-activate-inline-agent" type="button">Activar agente "${esc(selAg.name)}"</button>`
              : ''}
          </div>
        ` : '<div class="wf-node-issue is-error">Asigna o crea un agente para este paso.</div>'}
      `;
    }

    case 'agent_escalate':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-esc-target">Responsable de escalamiento</label>
          <select id="wf-prop-esc-target" ${isReadOnly ? 'disabled' : ''}>
            ${ESCALATION_TARGETS_CATALOG.map(t => `<option value="${esc(t)}" ${cfg.targetRole === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-esc-reason">Motivo de derivación</label>
          <input id="wf-prop-esc-reason" value="${esc(cfg.reason || '')}" ${isReadOnly ? 'readonly' : ''}>
        </div>
      `;

    case 'action_task':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-task-area">Área destino *</label>
          <select id="wf-prop-task-area" ${isReadOnly ? 'disabled' : ''}>
            <option value="Recepción" ${cfg.targetArea === 'Recepción' ? 'selected' : ''}>Recepción</option>
            <option value="Caja" ${cfg.targetArea === 'Caja' ? 'selected' : ''}>Caja</option>
            <option value="Operativa" ${cfg.targetArea === 'Operativa' ? 'selected' : ''}>Operativa</option>
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-task-title">Título de la tarea *</label>
          <input id="wf-prop-task-title" value="${esc(cfg.taskTitle || '')}" ${isReadOnly ? 'readonly' : ''}>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-task-prio">Prioridad</label>
          <select id="wf-prop-task-prio" ${isReadOnly ? 'disabled' : ''}>
            <option value="Alta" ${cfg.priority === 'Alta' ? 'selected' : ''}>Alta</option>
            <option value="Media" ${cfg.priority === 'Media' ? 'selected' : ''}>Media</option>
            <option value="Baja" ${cfg.priority === 'Baja' ? 'selected' : ''}>Baja</option>
          </select>
        </div>
      `;

    case 'action_reminder':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-rem-channel">Canal simulado *</label>
          <select id="wf-prop-rem-channel" ${isReadOnly ? 'disabled' : ''}>
            <option value="WhatsApp (simulado)" ${cfg.channel === 'WhatsApp (simulado)' ? 'selected' : ''}>WhatsApp (simulado)</option>
            <option value="SMS (simulado)" ${cfg.channel === 'SMS (simulado)' ? 'selected' : ''}>SMS (simulado)</option>
            <option value="Correo (simulado)" ${cfg.channel === 'Correo (simulado)' ? 'selected' : ''}>Correo (simulado)</option>
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-rem-tpl">Borrador de mensaje (no se envía en demo) *</label>
          <textarea id="wf-prop-rem-tpl" rows="3" ${isReadOnly ? 'readonly' : ''}>${esc(cfg.template || '')}</textarea>
        </div>
      `;

    case 'action_crm_update':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-crm-stage">Etapa CRM sugerida</label>
          <input id="wf-prop-crm-stage" value="${esc(cfg.stage || '')}" ${isReadOnly ? 'readonly' : ''}>
        </div>
        <div class="form-grid-2-inline">
          <div class="wf-prop-field">
            <label for="wf-prop-crm-prio">Prioridad</label>
            <select id="wf-prop-crm-prio" ${isReadOnly ? 'disabled' : ''}>
              <option value="Alta" ${cfg.priority === 'Alta' ? 'selected' : ''}>Alta</option>
              <option value="Media" ${cfg.priority === 'Media' ? 'selected' : ''}>Media</option>
              <option value="Baja" ${cfg.priority === 'Baja' ? 'selected' : ''}>Baja</option>
            </select>
          </div>
          <div class="wf-prop-field">
            <label for="wf-prop-crm-tag">Etiqueta</label>
            <input id="wf-prop-crm-tag" value="${esc(cfg.tag || '')}" ${isReadOnly ? 'readonly' : ''}>
          </div>
        </div>
      `;

    case 'action_internal_note':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-note-area">Notificar internamente a</label>
          <select id="wf-prop-note-area" ${isReadOnly ? 'disabled' : ''}>
            <option value="Recepción" ${cfg.notifyArea === 'Recepción' ? 'selected' : ''}>Recepción</option>
            <option value="Caja" ${cfg.notifyArea === 'Caja' ? 'selected' : ''}>Caja</option>
            <option value="Supervisión" ${cfg.notifyArea === 'Supervisión' ? 'selected' : ''}>Supervisión</option>
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-note-text">Texto de la nota interna *</label>
          <textarea id="wf-prop-note-text" rows="2" ${isReadOnly ? 'readonly' : ''}>${esc(cfg.noteText || '')}</textarea>
        </div>
      `;

    case 'action_route_area':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-route-area">Área destino (estricta separación)</label>
          <select id="wf-prop-route-area" ${isReadOnly ? 'disabled' : ''}>
            <option value="Recepción" ${cfg.destinationArea === 'Recepción' ? 'selected' : ''}>Recepción</option>
            <option value="Caja" ${cfg.destinationArea === 'Caja' ? 'selected' : ''}>Caja</option>
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-route-note">Nota administrativa de derivación</label>
          <input id="wf-prop-route-note" value="${esc(cfg.handoffNote || '')}" ${isReadOnly ? 'readonly' : ''}>
        </div>
      `;

    case 'end_success':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-end-outcome">Tipo de cierre</label>
          <select id="wf-prop-end-outcome" ${isReadOnly ? 'disabled' : ''}>
            <option value="completed" ${cfg.outcome !== 'no_action' ? 'selected' : ''}>Finalizar correctamente</option>
            <option value="no_action" ${cfg.outcome === 'no_action' ? 'selected' : ''}>Finalizar sin acción adicional</option>
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-end-note">Resumen de cierre</label>
          <textarea id="wf-prop-end-note" rows="2" ${isReadOnly ? 'readonly' : ''}>${esc(cfg.summaryNote || '')}</textarea>
        </div>
      `;

    case 'end_security_block':
      return `
        <div class="wf-prop-field">
          <label for="wf-prop-sec-target">Derivar revisión humana a *</label>
          <select id="wf-prop-sec-target" ${isReadOnly ? 'disabled' : ''}>
            ${ESCALATION_TARGETS_CATALOG.map(t => `<option value="${esc(t)}" ${cfg.humanTarget === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="wf-prop-field">
          <label for="wf-prop-sec-reason">Explicación pública segura (sin datos clínicos) *</label>
          <textarea id="wf-prop-sec-reason" rows="3" ${isReadOnly ? 'readonly' : ''}>${esc(cfg.blockReason || '')}</textarea>
        </div>
      `;

    default:
      return '';
  }
}

function renderSimBannerHtml(sim) {
  if (!sim) return '';
  return `
    <div class="wf-sim-banner-inner">
      <div>
        <strong>${esc(SIMULATION_DISCLAIMER)}</strong>
        <span class="wf-sim-banner-sub">Estado: <b>${esc(sim.status)}</b> · Escenario: ${esc(sim.scenario.label)} · Paso ${sim.steps.length} de ${sim.plannedSteps.length}</span>
      </div>
      <div class="row-gap">
        ${sim.status === 'running' ? '<button class="btn sm" id="wf-banner-pause" type="button">Pausar</button>' : ''}
        ${sim.status === 'paused' ? '<button class="btn sm primary" id="wf-banner-resume" type="button">Continuar</button>' : ''}
        ${(sim.status === 'running' || sim.status === 'paused') ? '<button class="btn sm" id="wf-banner-step" type="button">Siguiente paso</button>' : ''}
        <button class="btn sm" id="wf-banner-stop" type="button">Detener</button>
      </div>
    </div>
  `;
}

function renderDockBodyHtml(wf, validation, sim, scenarios) {
  if (ui.dockTab === 'validation') {
    if (!validation.items.length) {
      return '<div class="wf-dock-empty">Sin incidencias. El diagrama es estructuralmente válido para simular y activar.</div>';
    }
    return `
      <div class="wf-val-list">
        ${validation.items.map(item => `
          <div class="wf-val-item is-${esc(item.severity)}">
            <div>
              <span class="wf-val-tag">${item.severity === 'error' ? 'Error' : item.severity === 'warning' ? 'Advertencia' : 'Info'}</span>
              <strong>${esc(item.title)}:</strong> ${esc(item.message)}
            </div>
            ${item.nodeId ? `<button class="btn sm" type="button" data-focus-error-node="${esc(item.nodeId)}">Enfocar nodo</button>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (ui.dockTab === 'simulation') {
    const selScenario = scenarios.find(s => s.id === ui.selectedScenarioId) || scenarios[0];
    return `
      <div class="wf-sim-dock">
        <div class="wf-sim-controls-panel">
          <div class="wf-sim-static-note" id="wf-sim-disclaimer">${esc(SIMULATION_DISCLAIMER)}</div>
          <div class="wf-prop-field" style="margin-top:8px">
            <label for="wf-sim-scenario">Escenario ficticio compatible</label>
            <select id="wf-sim-scenario">
              ${scenarios.map(s => `<option value="${esc(s.id)}" ${s.id === selScenario.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select>
          </div>
          <div class="wf-sim-data-preview">
            <strong>Datos ficticios de entrada:</strong>
            <span>${esc(selScenario.context.patientAlias)} · ${esc(selScenario.context.appointmentCode)} · Nueva cita: <b>${selScenario.context.hasNewAppointment ? 'Sí' : 'No'}</b> · Sensible: <b>${selScenario.context.sensitiveContent ? 'Sí' : 'No'}</b></span>
          </div>
          <div class="wf-sim-btns">
            <button class="btn sm primary" id="wf-sim-start" type="button">Iniciar</button>
            <button class="btn sm" id="wf-sim-pause" type="button" ${sim?.status !== 'running' ? 'disabled' : ''}>Pausar</button>
            <button class="btn sm" id="wf-sim-resume" type="button" ${sim?.status !== 'paused' ? 'disabled' : ''}>Continuar</button>
            <button class="btn sm" id="wf-sim-step" type="button" ${(!sim || sim.status === 'completed' || sim.status === 'stopped') ? '' : ''}>Siguiente paso</button>
            <button class="btn sm" id="wf-sim-restart" type="button" ${!sim ? 'disabled' : ''}>Reiniciar</button>
            <button class="btn sm" id="wf-sim-stop" type="button" ${(!sim || sim.status === 'stopped') ? 'disabled' : ''}>Detener</button>
            <select id="wf-sim-speed" aria-label="Velocidad de simulación" style="width:auto">
              ${[0.5, 1, 2, 4].map(sp => `<option value="${sp}" ${(sim?.speed || 1) === sp ? 'selected' : ''}>${sp}x</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="wf-sim-trace-panel">
          ${sim ? `
            <div class="wf-sim-summary-box ${sim.status === 'completed' ? 'is-complete' : ''}" id="wf-sim-summary">
              <strong>Recorrido (${sim.steps.length}/${sim.plannedSteps.length} · ${esc(sim.status)}):</strong>
              <span>${esc(sim.summaryText || 'Simulación en curso sobre grafo validado...')}</span>
            </div>
            <div class="wf-sim-steps" id="wf-sim-steps">
              ${sim.steps.map(st => `
                <div class="wf-sim-step is-${esc(st.visualState)}">
                  <span class="wf-sim-step-num">${st.stepIndex}</span>
                  <div>
                    <strong>${esc(st.nodeLabel)}</strong>
                    <div>${esc(st.summary)}</div>
                    <small class="muted">${esc(st.simulatedAction)}</small>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="muted" style="padding:10px">Pulsa <b>Simular</b> o <b>Iniciar</b> para recorrer paso a paso las ramas del diagrama con datos ficticios.</div>'}
        </div>
      </div>
    `;
  }

  // Auditoría reciente
  const events = getAuditEvents({ type: ui.auditFilter });
  const visibleEvents = events.slice(0, 20);
  const selectedEv = ui.selectedAuditEventId
    ? getAuditEvents().find(ev => ev.id === ui.selectedAuditEventId) || null
    : null;
  return `
    <div class="wf-audit-dock">
      <div class="wf-audit-filter-bar">
        <div class="row-gap">
          <label for="wf-audit-filter">Filtrar por tipo:</label>
          <select id="wf-audit-filter" style="width:auto">
            <option value="all" ${ui.auditFilter === 'all' ? 'selected' : ''}>Todos los eventos (${getAuditEvents().length})</option>
            ${Object.entries(AUDIT_EVENT_TYPES).map(([k, v]) => `<option value="${esc(k)}" ${ui.auditFilter === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}
          </select>
        </div>
        <small class="muted">Mostrando ${visibleEvents.length} de ${events.length} registro(s)</small>
      </div>
      ${selectedEv ? `
        <div class="wf-audit-detail-box" id="wf-audit-detail-box" role="region" aria-label="Detalle del evento de auditoría">
          <div class="row-between">
            <strong>Detalle del registro · <code>${esc(selectedEv.id)}</code></strong>
            <button class="btn sm" type="button" id="wf-close-audit-detail">Cerrar detalle</button>
          </div>
          <div class="wf-audit-detail-grid">
            <div><span>Fecha y hora</span><strong>${esc(selectedEv.at)}</strong></div>
            <div><span>Tipo</span><strong>${esc(selectedEv.typeLabel)}</strong></div>
            <div><span>Usuario / Rol</span><strong>${esc(selectedEv.actorName)} (${esc(selectedEv.role)})</strong></div>
            <div><span>Entidad</span><strong>${esc(selectedEv.entityName)}${selectedEv.version ? ` v${selectedEv.version}` : ''}</strong></div>
            <div><span>Resultado</span><strong>${esc(selectedEv.result)}</strong></div>
            <div><span>Acción</span><strong>${esc(selectedEv.action || selectedEv.typeLabel)}</strong></div>
          </div>
          <div class="wf-audit-detail-desc">
            <span>Descripción completa:</span>
            <p>${esc(selectedEv.summary)}</p>
            ${selectedEv.detail ? `<small class="muted">Metadatos: ${esc(selectedEv.detail)}</small>` : ''}
          </div>
        </div>
      ` : ''}
      <div class="wf-audit-table-wrap">
        <table class="wf-audit-table">
          <thead>
            <tr><th>Fecha y hora</th><th>Tipo</th><th>Usuario / Rol</th><th>Entidad</th><th>Resultado</th><th>Acción</th></tr>
          </thead>
          <tbody>
            ${visibleEvents.map(ev => `
              <tr class="${selectedEv?.id === ev.id ? 'is-selected' : ''}">
                <td>${esc(ev.at)}</td>
                <td><span class="badge ${ev.tone === 'bad' ? 'warn' : ''}">${esc(ev.typeLabel)}</span></td>
                <td>${esc(ev.actorName)} (${esc(ev.role)})</td>
                <td>${esc(ev.entityName)}${ev.version ? ` v${ev.version}` : ''}</td>
                <td>${esc(ev.result)}</td>
                <td><button class="btn sm" type="button" data-audit-detail="${esc(ev.id)}">Ver detalle</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="wf-audit-compact-list" aria-label="Listado compacto de auditoría">
        ${visibleEvents.map(ev => `
          <article class="wf-audit-compact-card ${selectedEv?.id === ev.id ? 'is-selected' : ''}">
            <div class="row-between">
              <span class="badge ${ev.tone === 'bad' ? 'warn' : ''}">${esc(ev.typeLabel)}</span>
              <span class="muted">${esc(ev.at)}</span>
            </div>
            <div class="wf-audit-compact-main">
              <strong>${esc(ev.entityName)}${ev.version ? ` v${ev.version}` : ''}</strong>
              <span>${esc(ev.result)} · ${esc(ev.actorName)} (${esc(ev.role)})</span>
            </div>
            <div class="row-between">
              <small class="muted">${esc(ev.summary)}</small>
              <button class="btn sm" type="button" data-audit-detail="${esc(ev.id)}">Ver detalle</button>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

// Parcheo incremental durante ticks de simulación (sin re-render completo del módulo!)
function patchSimulationVisualDom(wf, sim) {
  if (!wf) return;
  const studioEl = $('#wf-studio');
  if (studioEl) {
    studioEl.classList.toggle('is-sim-paused', sim?.status === 'paused');
  }
  const banner = $('#wf-sim-banner');
  if (banner) {
    banner.classList.toggle('is-hidden', !sim);
    banner.innerHTML = renderSimBannerHtml(sim);
    bindSimBannerQuickButtons();
  }

  document.querySelectorAll('[data-wf-node-id]').forEach(el => {
    const nid = el.dataset.wfNodeId;
    const issues = ui.lastValidation?.nodeIssues?.[nid] || [];
    const vis = getSimulationNodeVisualMeta(sim, nid, issues);
    const ns = sim ? vis.state : '';
    el.dataset.simState = ns;
    el.classList.remove('is-sim-running', 'is-sim-paused', 'is-sim-completed', 'is-sim-waiting', 'is-sim-blocked', 'is-sim-warning', 'is-sim-skipped', 'is-sim-pending', 'is-sim-current');
    if (ns) el.classList.add(`is-sim-${ns}`);
    if (vis.isCurrent) el.classList.add('is-sim-current');

    const badgeLabel = vis.badgeText;
    const badgeTone = vis.state;
    let badgeEl = el.querySelector('.wf-node-state-badge');
    if (badgeLabel) {
      if (!badgeEl) {
        badgeEl = document.createElement('div');
        el.appendChild(badgeEl);
      }
      badgeEl.className = `wf-node-state-badge is-${badgeTone}`;
      badgeEl.textContent = badgeLabel;
    } else if (badgeEl) {
      badgeEl.remove();
    }

    const wfNode = wf.nodes.find(n => n.id === nid);
    if (wfNode) {
      const nodeSpec = getNodeTypeSpec(wfNode.type);
      el.setAttribute('aria-label', `Nodo ${wfNode.label || nodeSpec?.label || wfNode.type}. Tipo ${nodeSpec?.label || wfNode.type}. ${badgeLabel}`.trim());
    }
  });

  document.querySelectorAll('#wf-edges-svg [data-edge-id]').forEach(g => {
    const eid = g.dataset.edgeId;
    const es = sim ? (sim.edgeStates[eid] || 'skipped') : '';
    g.classList.remove('is-sim-active', 'is-sim-traversed', 'is-sim-skipped', 'is-sim-pending');
    if (es) g.classList.add(`is-sim-${es}`);
    const mainPath = g.querySelector('.wf-edge-path');
    if (mainPath) {
      mainPath.setAttribute('marker-end', (es === 'active' || es === 'traversed')
        ? 'url(#wf-arrow-active)'
        : g.classList.contains('is-yes') ? 'url(#wf-arrow-yes)' : g.classList.contains('is-no') ? 'url(#wf-arrow-no)' : 'url(#wf-arrow)');
    }
  });

  const simTabBtn = document.querySelector('[data-dock-tab="simulation"]');
  if (simTabBtn) {
    simTabBtn.innerHTML = `Simulación ${sim ? `<span class="badge">${esc(sim.status)}</span>` : ''}`;
  }
  const auditTabBadge = document.querySelector('[data-dock-tab="audit"] .badge');
  if (auditTabBadge) {
    auditTabBadge.textContent = String(getAuditEvents().length);
  }

  if (sim && sim.steps.length) {
    const last = sim.steps[sim.steps.length - 1];
    announceSR(`Paso ${last.stepIndex}: ${last.nodeLabel}. ${last.summary}`);
  }

  if (ui.presentationMode) {
    const pStatus = $('#wf-pres-sim-status');
    if (pStatus) {
      pStatus.innerHTML = sim
        ? `Estado: <b>${esc(sim.status)}</b> · Escenario: ${esc(sim.scenario.label)} · Paso ${sim.steps.length} de ${sim.plannedSteps.length}`
        : 'Listo para presentar';
    }
    const pp = $('#wf-pres-pause');
    const pr = $('#wf-pres-resume');
    const pst = $('#wf-pres-restart');
    const psp = $('#wf-pres-stop');
    if (pp) pp.disabled = sim?.status !== 'running';
    if (pr) pr.disabled = sim?.status !== 'paused';
    if (pst) pst.disabled = !sim;
    if (psp) psp.disabled = !sim;
    if (sim?.activeNodeId) {
      centerNodeInViewport(wf, sim.activeNodeId);
    } else if (sim?.status === 'completed') {
      const fitted = computeAutoFitView(wf, { mode: 'presentation' });
      ui.zoom = fitted.zoom;
      ui.panX = fitted.panX;
      ui.panY = fitted.panY;
      applyStageTransform();
    }
  }

  if (ui.dockTab === 'simulation') {
    const dockBody = $('#wf-dock-body');
    if (dockBody) {
      const scenarios = getCompatibleScenariosForWorkflow(wf);
      const validation = ui.lastValidation || validateWorkflowStructure(wf);
      dockBody.innerHTML = renderDockBodyHtml(wf, validation, sim, scenarios);
      bindDockEvents(wf, ui.lastRenderOptions || {}, scenarios);
    }
  }
}

function bindSimBannerQuickButtons() {
  const bp = $('#wf-banner-pause');
  if (bp) bp.onclick = () => pauseWorkflowSimulation();
  const br = $('#wf-banner-resume');
  if (br) br.onclick = () => resumeWorkflowSimulation();
  const bs = $('#wf-banner-step');
  if (bs) bs.onclick = () => stepWorkflowSimulation();
  const bt = $('#wf-banner-stop');
  if (bt) bt.onclick = () => stopWorkflowSimulation({ clearRun: true });
}

// =========================================================================
// Enlace de eventos e interacción completa del constructor
// =========================================================================

function bindAutomationsEvents(wf, options, validation, scenarios) {
  const toast = options.toast || (() => {});
  const actor = getActorOpts(options);
  const perms = getAutomationRolePermissions(actor.role);
  const isReadOnlyWorkflow = !perms.editWorkflow || wf.status === 'archived';

  // Suscripción reactiva para la simulación sin re-render completo
  ui.simUnsubscribe = subscribeSimulation(sim => {
    const currentWf = getWorkflowById(ui.activeWorkflowId) || wf;
    patchSimulationVisualDom(currentWf, sim);
  });
  bindSimBannerQuickButtons();

  // Selector de workflow y botones superiores
  const selector = $('#wf-selector');
  if (selector) {
    selector.onchange = () => {
      clearTransientNotifications();
      ui.activeWorkflowId = selector.value;
      ui.selectedNodeId = null;
      ui.connectingFrom = null;
      ui.overviewMode = false;
      ui.fittedWorkflowId = null;
      renderAutomations(options);
    };
  }

  const newBtn = $('#wf-new-btn');
  if (newBtn) {
    newBtn.onclick = () => {
      const res = createWorkflow({}, actor);
      if (!res.ok) { toast(res.message); return; }
      ui.activeWorkflowId = res.workflow.id;
      ui.selectedNodeId = res.workflow.nodes[0]?.id || null;
      toast(`Nuevo workflow "${res.workflow.name}" creado en Borrador.`);
      renderAutomations(options);
    };
  }

  const tplBtn = $('#wf-templates-btn');
  if (tplBtn) {
    tplBtn.onclick = () => openTemplatesModal(options);
  }

  const nameInput = $('#wf-name-input');
  if (nameInput && !isReadOnlyWorkflow) {
    nameInput.onchange = () => {
      updateWorkflowMeta(wf.id, { name: nameInput.value }, actor);
      renderAutomations(options);
    };
  }

  const descInput = $('#wf-desc-input');
  if (descInput && !isReadOnlyWorkflow) {
    descInput.onchange = () => {
      updateWorkflowMeta(wf.id, { description: descInput.value }, actor);
      renderAutomations(options);
    };
  }

  const saveBtn = $('#wf-save-btn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const latestName = $('#wf-name-input')?.value;
      const latestDesc = $('#wf-desc-input')?.value;
      if (latestName !== wf.name || latestDesc !== wf.description) {
        updateWorkflowMeta(wf.id, { name: latestName, description: latestDesc }, actor);
      }
      const res = saveWorkflowDraft(wf.id, actor);
      if (!res.ok) { toast(res.message); return; }
      toast('Borrador guardado en almacenamiento local.');
      renderAutomations(options);
    };
  }

  const valBtn = $('#wf-validate-btn');
  if (valBtn) {
    valBtn.onclick = () => {
      const res = validateAndSaveWorkflowStatus(wf.id, actor);
      ui.dockTab = 'validation';
      if (!res.ok) {
        const firstErrNode = res.validation?.errors?.find(e => e.nodeId)?.nodeId || null;
        if (firstErrNode) ui.selectedNodeId = firstErrNode;
        toast(res.validation?.errors?.[0]?.message || 'Validación con errores.');
      } else {
        toast('Validación estructural superada.');
      }
      announceSR(res.validation?.summary || 'Validación ejecutada');
      renderAutomations(options);
      if (!res.ok && ui.selectedNodeId) centerNodeInViewport(getWorkflowById(wf.id), ui.selectedNodeId);
    };
  }

  const simBtn = $('#wf-simulate-btn');
  if (simBtn) {
    simBtn.onclick = () => {
      const res = startWorkflowSimulation(wf.id, { scenarioId: ui.selectedScenarioId }, actor);
      if (!res.ok) {
        ui.dockTab = 'validation';
        if (res.firstErrorNodeId) ui.selectedNodeId = res.firstErrorNodeId;
        toast(res.message);
        renderAutomations(options);
        if (res.firstErrorNodeId) centerNodeInViewport(getWorkflowById(wf.id), res.firstErrorNodeId);
        return;
      }
      ui.dockTab = 'simulation';
      renderAutomations(options);
    };
  }

  const actBtn = $('#wf-activate-btn');
  if (actBtn) {
    actBtn.onclick = () => {
      let res = activateWorkflow(wf.id, actor);
      if (!res.ok && res.validation?.errors?.some(e => e.code === 'AGENT_NOT_ACTIVE') && perms.toggleAgent) {
        // Activar automáticamente solo si administrador presiona confirmar en el aviso o reintentar
        toast(res.message);
        ui.dockTab = 'validation';
        const firstErrNode = res.validation.errors.find(e => e.nodeId)?.nodeId;
        if (firstErrNode) ui.selectedNodeId = firstErrNode;
        renderAutomations(options);
        return;
      }
      if (!res.ok) {
        ui.dockTab = 'validation';
        const firstErrNode = res.validation?.errors?.find(e => e.nodeId)?.nodeId;
        if (firstErrNode) ui.selectedNodeId = firstErrNode;
        toast(res.message);
        renderAutomations(options);
        return;
      }
      toast(`Workflow "${res.workflow.name}" activado en versión v${res.workflow.version}.`);
      renderAutomations(options);
    };
  }

  // Menú secundario
  const moreToggle = $('#wf-more-toggle');
  const moreMenu = $('#wf-more-menu');
  if (moreToggle && moreMenu) {
    moreToggle.onclick = e => {
      e.stopPropagation();
      ui.moreMenuOpen = !ui.moreMenuOpen;
      moreMenu.hidden = !ui.moreMenuOpen;
      moreToggle.setAttribute('aria-expanded', String(ui.moreMenuOpen));
    };
    const closeMenu = ev => {
      if (!moreMenu.hidden && !ev.target.closest('.wf-more-wrap')) {
        ui.moreMenuOpen = false;
        moreMenu.hidden = true;
        moreToggle.setAttribute('aria-expanded', 'false');
      }
    };
    const handleKeydown = ev => {
      if (ev.key === 'Escape' && !moreMenu.hidden) {
        ui.moreMenuOpen = false;
        moreMenu.hidden = true;
        moreToggle.setAttribute('aria-expanded', 'false');
        moreToggle.focus();
      }
    };
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', handleKeydown);
    ui.globalCleanupFns.push(() => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', handleKeydown);
    });
  }

  const dupWfBtn = $('#wf-duplicate-btn');
  if (dupWfBtn) {
    dupWfBtn.onclick = () => {
      ui.moreMenuOpen = false;
      const res = duplicateWorkflow(wf.id, actor);
      if (!res.ok) { toast(res.message); return; }
      ui.activeWorkflowId = res.workflow.id;
      ui.selectedNodeId = null;
      toast(`Workflow duplicado: "${res.workflow.name}" (Borrador v1).`);
      renderAutomations(options);
    };
  }

  const enterPresentationMode = openerId => {
    clearTransientNotifications();
    ui.presentationOpenerId = openerId || 'wf-present-btn';
    ui.presentationMode = true;
    ui.overviewMode = false;
    ui.moreMenuOpen = false;
    ui.fittedWorkflowId = null;
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    try {
      const rootEl = document.documentElement;
      if (rootEl && typeof rootEl.requestFullscreen === 'function' && !document.fullscreenElement) {
        Promise.resolve(rootEl.requestFullscreen()).catch(() => {});
      }
    } catch { /* fallback CSS limpio */ }
    renderAutomations(options);
  };

  const exitPresentationMode = () => {
    clearTransientNotifications();
    const openerId = ui.presentationOpenerId || 'wf-present-btn';
    ui.presentationMode = false;
    ui.presentationOpenerId = null;
    ui.fittedWorkflowId = null;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('is-wf-presentation');
    }
    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        Promise.resolve(document.exitFullscreen()).catch(() => {});
      }
    } catch { /* ignore */ }
    renderAutomations(options);
    requestAnimationFrame(() => {
      const openerEl = document.getElementById(openerId) || $('#wf-present-btn');
      openerEl?.focus();
    });
  };

  if (ui.presentationMode) {
    const onEscPres = ev => {
      if (ev.key === 'Escape' && ui.presentationMode && !document.querySelector('dialog[open]')) {
        ev.preventDefault();
        exitPresentationMode();
      }
    };
    document.addEventListener('keydown', onEscPres);
    ui.globalCleanupFns.push(() => document.removeEventListener('keydown', onEscPres));
  }

  const presentBtn = $('#wf-present-btn');
  if (presentBtn) {
    presentBtn.onclick = () => {
      if (ui.presentationMode) exitPresentationMode();
      else enterPresentationMode('wf-present-btn');
    };
  }
  const presentMenuBtn = $('#wf-present-menu-btn');
  if (presentMenuBtn) {
    presentMenuBtn.onclick = () => enterPresentationMode('wf-more-toggle');
  }
  const exitPresBtn = $('#wf-exit-present-btn');
  if (exitPresBtn) {
    exitPresBtn.onclick = () => exitPresentationMode();
  }

  const presScenario = $('#wf-pres-scenario');
  if (presScenario) {
    presScenario.onchange = () => {
      ui.selectedScenarioId = presScenario.value;
      renderAutomations(options);
    };
  }
  const presStart = $('#wf-pres-start');
  if (presStart) {
    presStart.onclick = () => {
      const res = startWorkflowSimulation(wf.id, { scenarioId: ui.selectedScenarioId }, actor);
      if (!res.ok) toast(res.message);
    };
  }
  const presPause = $('#wf-pres-pause');
  if (presPause) presPause.onclick = () => pauseWorkflowSimulation();
  const presResume = $('#wf-pres-resume');
  if (presResume) presResume.onclick = () => resumeWorkflowSimulation();
  const presStep = $('#wf-pres-step');
  if (presStep) {
    presStep.onclick = () => {
      const currentSim = getSimulationState();
      if (!currentSim || currentSim.status === 'completed' || currentSim.status === 'stopped') {
        startWorkflowSimulation(wf.id, { scenarioId: ui.selectedScenarioId, manualStep: true }, actor);
      } else {
        stepWorkflowSimulation();
      }
    };
  }
  const presRestart = $('#wf-pres-restart');
  if (presRestart) presRestart.onclick = () => restartWorkflowSimulation();
  const presStop = $('#wf-pres-stop');
  if (presStop) presStop.onclick = () => stopWorkflowSimulation({ clearRun: true });
  const presSpeed = $('#wf-pres-speed');
  if (presSpeed) presSpeed.onchange = () => setSimulationSpeed(Number(presSpeed.value || 1));
  const presZoomOut = $('#wf-pres-zoom-out');
  if (presZoomOut) presZoomOut.onclick = () => { ui.zoom = Math.max(0.35, Number((ui.zoom - 0.1).toFixed(2))); applyStageTransform(); };
  const presZoomIn = $('#wf-pres-zoom-in');
  if (presZoomIn) presZoomIn.onclick = () => { ui.zoom = Math.min(1.6, Number((ui.zoom + 0.1).toFixed(2))); applyStageTransform(); };
  const presFit = $('#wf-pres-fit');
  if (presFit) {
    presFit.onclick = () => {
      const fitted = computeAutoFitView(wf, { mode: 'presentation' });
      ui.zoom = fitted.zoom; ui.panX = fitted.panX; ui.panY = fitted.panY; applyStageTransform();
    };
  }

  const pauseQuickBtn = $('#wf-pause-quick-btn');
  if (pauseQuickBtn) {
    pauseQuickBtn.onclick = () => {
      const res = pauseWorkflow(wf.id, actor);
      if (!res.ok) { toast(res.message); return; }
      toast(`Workflow "${res.workflow.name}" pausado.`);
      renderAutomations(options);
    };
  }

  const pauseWfBtn = $('#wf-pause-btn');
  if (pauseWfBtn) {
    pauseWfBtn.onclick = () => {
      ui.moreMenuOpen = false;
      const res = pauseWorkflow(wf.id, actor);
      if (!res.ok) { toast(res.message); return; }
      toast(`Workflow "${res.workflow.name}" pausado.`);
      renderAutomations(options);
    };
  }

  const archWfBtn = $('#wf-archive-btn');
  if (archWfBtn) {
    archWfBtn.onclick = () => {
      ui.moreMenuOpen = false;
      ui.pendingArchiveConfirm = true;
      renderAutomations(options);
    };
  }

  const cancelArch = $('#wf-cancel-archive');
  if (cancelArch) cancelArch.onclick = () => { ui.pendingArchiveConfirm = false; renderAutomations(options); };

  const confirmArch = $('#wf-confirm-archive');
  if (confirmArch) {
    confirmArch.onclick = () => {
      ui.pendingArchiveConfirm = false;
      const res = archiveWorkflow(wf.id, { ...actor, confirmed: true });
      if (!res.ok) { toast(res.message); renderAutomations(options); return; }
      ui.activeWorkflowId = res.workflow.id;
      toast(`Workflow "${res.workflow.name}" archivado (solo lectura) con auditoría preservada.`);
      renderAutomations(options);
    };
  }

  const libBtn = $('#wf-library-btn');
  if (libBtn) libBtn.onclick = () => { ui.moreMenuOpen = false; openWorkflowLibraryModal(options); };

  const histBtn = $('#wf-history-btn');
  if (histBtn) {
    histBtn.onclick = () => {
      ui.moreMenuOpen = false;
      ui.dockTab = 'audit';
      renderAutomations(options);
    };
  }

  const resetBtn = $('#wf-reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      ui.moreMenuOpen = false;
      ui.pendingResetConfirm = true;
      renderAutomations(options);
    };
  }

  const cancelReset = $('#wf-cancel-reset');
  if (cancelReset) cancelReset.onclick = () => { ui.pendingResetConfirm = false; renderAutomations(options); };

  const confirmReset = $('#wf-confirm-reset');
  if (confirmReset) {
    confirmReset.onclick = () => {
      ui.pendingResetConfirm = false;
      const res = resetAutomationsOnly(actor);
      if (!res.ok) { toast(res.message); return; }
      ui.activeWorkflowId = 'wf-noshow-recovery';
      ui.selectedNodeId = null;
      toast('Datos de automatizaciones y agentes restablecidos.');
      renderAutomations(options);
    };
  }

  const focusFirstErr = document.querySelector('[data-focus-first-error]');
  if (focusFirstErr) {
    focusFirstErr.onclick = () => {
      const firstId = validation.errors.find(e => e.nodeId)?.nodeId;
      ui.dockTab = 'validation';
      if (firstId) ui.selectedNodeId = firstId;
      renderAutomations(options);
      if (firstId) centerNodeInViewport(wf, firstId);
    };
  }

  // Catálogo izquierdo y Panel de Propiedades derecho (plegado persistido en sesión)
  const catToggle = $('#wf-toggle-catalog');
  if (catToggle) {
    catToggle.onclick = () => {
      ui.catalogCollapsed = !ui.catalogCollapsed;
      writePanelPrefs();
      renderAutomations(options);
    };
  }

  const propsToggle = $('#wf-toggle-props');
  if (propsToggle) {
    propsToggle.onclick = () => {
      ui.propsCollapsed = !ui.propsCollapsed;
      writePanelPrefs();
      renderAutomations(options);
    };
  }

  const catSearch = $('#wf-catalog-search');
  if (catSearch) {
    catSearch.oninput = () => {
      ui.catalogSearch = catSearch.value;
      const list = $('#wf-catalog-list');
      if (list) {
        list.innerHTML = renderCatalogHtml(isReadOnlyWorkflow);
        bindCatalogAddAndDragEvents(wf, options, actor, isReadOnlyWorkflow);
      }
    };
  }
  bindCatalogAddAndDragEvents(wf, options, actor, isReadOnlyWorkflow);

  // Drawers en Tablet
  const dCatBtn = $('#wf-drawer-catalog-btn');
  if (dCatBtn) {
    dCatBtn.onclick = () => {
      ui.mobileCatalogOpen = !ui.mobileCatalogOpen;
      if (ui.mobileCatalogOpen) ui.mobilePropsOpen = false;
      renderAutomations(options);
    };
  }
  const dPropsBtn = $('#wf-drawer-props-btn');
  if (dPropsBtn) {
    dPropsBtn.onclick = () => {
      ui.mobilePropsOpen = !ui.mobilePropsOpen;
      if (ui.mobilePropsOpen) ui.mobileCatalogOpen = false;
      renderAutomations(options);
    };
  }
  const closePropsDrawer = $('#wf-close-props-drawer');
  if (closePropsDrawer) {
    closePropsDrawer.onclick = () => { ui.mobilePropsOpen = false; renderAutomations(options); };
  }

  // Controles de zoom, pan, fit, vista general completa, undo/redo
  $('#wf-zoom-out').onclick = () => {
    ui.overviewMode = false;
    ui.zoom = Math.max(0.45, Number((ui.zoom - 0.1).toFixed(2)));
    applyStageTransform();
  };
  $('#wf-zoom-in').onclick = () => {
    ui.overviewMode = false;
    ui.zoom = Math.min(1.5, Number((ui.zoom + 0.1).toFixed(2)));
    applyStageTransform();
  };
  $('#wf-fit-btn').onclick = () => {
    ui.overviewMode = false;
    const fitted = computeAutoFitView(wf, { mode: 'edit' });
    ui.zoom = fitted.zoom;
    ui.panX = fitted.panX;
    ui.panY = fitted.panY;
    applyStageTransform();
  };
  const overviewBtn = $('#wf-overview-btn');
  if (overviewBtn) {
    overviewBtn.onclick = () => {
      ui.overviewMode = true;
      const fitted = computeAutoFitView(wf, { mode: 'overview' });
      ui.zoom = fitted.zoom;
      ui.panX = fitted.panX;
      ui.panY = fitted.panY;
      applyStageTransform();
    };
  }
  $('#wf-auto-layout-btn').onclick = () => {
    ui.overviewMode = false;
    const res = autoLayoutWorkflowNodes(wf.id, actor);
    if (!res.ok) { toast(res.message); return; }
    toast('Diagrama ordenado automáticamente.');
    renderAutomations(options);
    requestAnimationFrame(() => {
      const fitted = computeAutoFitView(getWorkflowById(wf.id), { mode: 'edit' });
      ui.zoom = fitted.zoom; ui.panX = fitted.panX; ui.panY = fitted.panY; applyStageTransform();
    });
  };
  $('#wf-center-sel-btn').onclick = () => {
    ui.overviewMode = false;
    if (ui.selectedNodeId) centerNodeInViewport(wf, ui.selectedNodeId);
  };
  $('#wf-undo-btn').onclick = () => {
    const res = undoWorkflowAction(wf.id, actor);
    if (res.ok) renderAutomations(options);
  };
  $('#wf-redo-btn').onclick = () => {
    const res = redoWorkflowAction(wf.id, actor);
    if (res.ok) renderAutomations(options);
  };

  const cancelConnBtn = $('#wf-cancel-connect');
  if (cancelConnBtn) {
    cancelConnBtn.onclick = () => {
      ui.connectingFrom = null;
      $('#wf-connect-hint')?.classList.add('is-hidden');
    };
  }

  // Interacción en el lienzo: selección, arrastre directo DOM sin re-render, pan, puertos
  bindCanvasEvents(wf, options, actor, isReadOnlyWorkflow);

  // Panel derecho: Propiedades contextuales
  bindPropertiesPanelEvents(wf, options, actor, isReadOnlyWorkflow);

  // Panel inferior: pestañas y eventos
  document.querySelectorAll('[data-dock-tab]').forEach(tab => {
    tab.onclick = () => {
      ui.dockTab = tab.dataset.dockTab;
      document.querySelectorAll('[data-dock-tab]').forEach(t => t.classList.toggle('is-active', t.dataset.dockTab === ui.dockTab));
      const body = $('#wf-dock-body');
      if (body) {
        body.innerHTML = renderDockBodyHtml(wf, ui.lastValidation, getSimulationState(), scenarios);
        bindDockEvents(wf, options, scenarios);
      }
    };
  });
  bindDockEvents(wf, options, scenarios);

  // Reglas rápidas (.automation-card) compatibles
  document.querySelectorAll('[data-automation-test]').forEach(btn => {
    btn.onclick = () => {
      const res = runQuickAutomationTest(btn.dataset.automationTest, actor);
      if (!res.ok) { toast(res.message); return; }
      toast(`Prueba simulada de "${res.rule.name}" completada sin envíos reales.`);
      renderAutomations(options);
    };
  });
  document.querySelectorAll('[data-automation-toggle]').forEach(btn => {
    btn.onclick = () => {
      const res = toggleQuickAutomation(btn.dataset.automationToggle, actor);
      if (!res.ok) { toast(res.message); return; }
      toast(`Regla "${res.rule.name}" ${res.rule.active ? 'activada' : 'pausada'}.`);
      renderAutomations(options);
    };
  });
}

function bindCatalogAddAndDragEvents(wf, options, actor, isReadOnlyWorkflow) {
  const toast = options.toast || (() => {});
  const viewport = $('#wf-canvas-viewport');

  document.querySelectorAll('[data-add-node-type]').forEach(btn => {
    btn.onclick = ev => {
      ev.stopPropagation();
      const type = btn.dataset.addNodeType;
      const trigKey = btn.dataset.triggerKey;
      const res = addWorkflowNode(wf.id, {
        type,
        config: trigKey ? { triggerKey: trigKey } : undefined
      }, actor);
      if (!res.ok) { toast(res.message); return; }
      ui.selectedNodeId = res.node.id;
      ui.mobileCatalogOpen = false;
      toast(`Nodo "${res.node.label}" añadido al flujo.`);
      renderAutomations(options);
    };
  });

  if (!isReadOnlyWorkflow) {
    document.querySelectorAll('.wf-cat-item[draggable="true"]').forEach(card => {
      card.ondragstart = e => {
        e.dataTransfer.setData('application/x-wf-node', JSON.stringify({
          type: card.dataset.nodeType,
          triggerKey: card.dataset.triggerKey || null
        }));
        e.dataTransfer.effectAllowed = 'copy';
      };
    });

    if (viewport) {
      viewport.ondragover = e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      };
      viewport.ondrop = e => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('application/x-wf-node');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const rect = viewport.getBoundingClientRect();
          const x = Math.max(20, Math.round((e.clientX - rect.left - ui.panX) / ui.zoom - NODE_WIDTH / 2));
          const y = Math.max(20, Math.round((e.clientY - rect.top - ui.panY) / ui.zoom - 40));
          const res = addWorkflowNode(wf.id, {
            type: parsed.type,
            position: { x, y },
            config: parsed.triggerKey ? { triggerKey: parsed.triggerKey } : undefined
          }, actor);
          if (!res.ok) { toast(res.message); return; }
          ui.selectedNodeId = res.node.id;
          toast(`Nodo "${res.node.label}" soltado en el lienzo.`);
          renderAutomations(options);
        } catch { /* ignore */ }
      };
    }
  }
}

function bindCanvasEvents(wf, options, actor, isReadOnlyWorkflow) {
  const toast = options.toast || (() => {});
  const viewport = $('#wf-canvas-viewport');

  // Panning cuando el usuario arrastra sobre el fondo del lienzo
  if (viewport) {
    viewport.onpointerdown = e => {
      if (e.target.closest('[data-wf-node-id]') || e.target.closest('.wf-port') || e.target.closest('.wf-edge-group')) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const basePanX = ui.panX;
      const basePanY = ui.panY;
      let moved = false;

      const onMove = ev => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        ui.panX = basePanX + dx;
        ui.panY = basePanY + dy;
        applyStageTransform();
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!moved) {
          ui.selectedNodeId = null;
          ui.selectedEdgeId = null;
          renderAutomations(options);
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  // Click y teclado sobre nodos + arrastre directo DOM (Regla 20 rendimiento)
  document.querySelectorAll('[data-wf-node-id]').forEach(nodeEl => {
    const nodeId = nodeEl.dataset.wfNodeId;

    nodeEl.onclick = e => {
      if (e.target.closest('.wf-port') || e.target.closest('[data-node-dup]') || e.target.closest('[data-node-del]')) return;
      e.stopPropagation();
      if (ui.connectingFrom && ui.connectingFrom.nodeId !== nodeId && !isReadOnlyWorkflow) {
        const res = connectWorkflowNodes(wf.id, {
          sourceNodeId: ui.connectingFrom.nodeId,
          sourcePort: ui.connectingFrom.port,
          targetNodeId: nodeId,
          targetPort: 'in'
        }, actor);
        ui.connectingFrom = null;
        if (!res.ok) {
          toast(res.message);
          $('#wf-connect-hint')?.classList.add('is-hidden');
          return;
        }
        toast('Nodos conectados correctamente.');
        renderAutomations(options);
        return;
      }
      ui.selectedNodeId = nodeId;
      renderAutomations(options);
    };

    nodeEl.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ui.selectedNodeId = nodeId;
        renderAutomations(options);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isReadOnlyWorkflow) {
        e.preventDefault();
        ui.selectedNodeId = nodeId;
        ui.pendingDeleteNodeId = nodeId;
        renderAutomations(options);
      } else if (!isReadOnlyWorkflow && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const nodeObj = wf.nodes.find(n => n.id === nodeId);
        if (!nodeObj) return;
        const step = e.shiftKey ? 24 : 12;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        moveWorkflowNode(wf.id, nodeId, { x: nodeObj.position.x + dx, y: nodeObj.position.y + dy }, { ...actor, persist: true });
        nodeObj.position.x += dx;
        nodeObj.position.y += dy;
        nodeEl.style.left = `${nodeObj.position.x}px`;
        nodeEl.style.top = `${nodeObj.position.y}px`;
        patchConnectedEdgesDom(wf, nodeId);
      }
    };

    if (!isReadOnlyWorkflow) {
      nodeEl.onpointerdown = e => {
        if (e.target.closest('.wf-port') || e.target.closest('button')) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        const nodeObj = wf.nodes.find(n => n.id === nodeId);
        if (!nodeObj) return;
        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const origX = nodeObj.position.x;
        const origY = nodeObj.position.y;
        let hasDragged = false;
        let rafPending = false;

        const onMove = ev => {
          const dx = Math.round((ev.clientX - startClientX) / ui.zoom);
          const dy = Math.round((ev.clientY - startClientY) / ui.zoom);
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged = true;
          if (!hasDragged) return;
          nodeObj.position.x = Math.max(12, origX + dx);
          nodeObj.position.y = Math.max(12, origY + dy);
          nodeEl.style.left = `${nodeObj.position.x}px`;
          nodeEl.style.top = `${nodeObj.position.y}px`;
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(() => {
              rafPending = false;
              patchConnectedEdgesDom(wf, nodeId);
            });
          }
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if (hasDragged) {
            moveWorkflowNode(wf.id, nodeId, { x: nodeObj.position.x, y: nodeObj.position.y }, { ...actor, recordUndo: true, persist: true });
            ui.selectedNodeId = nodeId;
            renderAutomations(options);
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };
    }
  });

  // Botones rápidos en nodos (duplicar / eliminar)
  document.querySelectorAll('[data-node-dup]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const res = duplicateWorkflowNode(wf.id, btn.dataset.nodeDup, actor);
      if (!res.ok) { toast(res.message); return; }
      ui.selectedNodeId = res.node.id;
      renderAutomations(options);
    };
  });
  document.querySelectorAll('[data-node-del]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const nid = btn.dataset.nodeDel;
      ui.selectedNodeId = nid;
      ui.pendingDeleteNodeId = nid;
      renderAutomations(options);
    };
  });

  // Puertos: soporta clic-origen + clic-destino Y drag-de-puerto-a-puerto
  if (!isReadOnlyWorkflow) {
    document.querySelectorAll('.wf-port[data-port-dir="out"]').forEach(portBtn => {
      portBtn.onclick = e => {
        e.stopPropagation();
        ui.connectingFrom = { nodeId: portBtn.dataset.nodeId, port: portBtn.dataset.portName };
        const hint = $('#wf-connect-hint');
        if (hint) {
          hint.classList.remove('is-hidden');
          const nLabel = wf.nodes.find(n => n.id === ui.connectingFrom.nodeId)?.label || '';
          const span = hint.querySelector('span');
          if (span) span.innerHTML = `Modo conexión: selecciona el nodo destino para conectar desde <strong>${esc(nLabel)}</strong> (${ui.connectingFrom.port === 'yes' ? 'Sí' : ui.connectingFrom.port === 'no' ? 'No' : 'Salida'}).`;
        }
      };

      portBtn.onpointerdown = e => {
        e.stopPropagation();
        const srcId = portBtn.dataset.nodeId;
        const srcPort = portBtn.dataset.portName;
        const startPt = getPortPoint(wf, srcId, srcPort, true);
        const draftPath = $('#wf-draft-edge');
        const viewportEl = $('#wf-canvas-viewport');
        let dragged = false;

        const onMove = ev => {
          const rect = viewportEl.getBoundingClientRect();
          const tx = (ev.clientX - rect.left - ui.panX) / ui.zoom;
          const ty = (ev.clientY - rect.top - ui.panY) / ui.zoom;
          if (Math.hypot(tx - startPt.x, ty - startPt.y) > 10) dragged = true;
          if (dragged && draftPath) {
            draftPath.style.display = 'block';
            draftPath.setAttribute('d', computeBezierGeometry(startPt, { x: tx, y: ty }, srcPort).path);
          }
        };

        const onUp = ev => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if (draftPath) draftPath.style.display = 'none';
          if (!dragged) return;
          const hit = document.elementFromPoint(ev.clientX, ev.clientY);
          const targetPortEl = hit?.closest?.('.wf-port[data-port-dir="in"]');
          const targetNodeEl = hit?.closest?.('[data-wf-node-id]');
          const targetId = targetPortEl?.dataset?.nodeId || targetNodeEl?.dataset?.wfNodeId;
          if (targetId && targetId !== srcId) {
            const res = connectWorkflowNodes(wf.id, { sourceNodeId: srcId, sourcePort: srcPort, targetNodeId: targetId, targetPort: 'in' }, actor);
            ui.connectingFrom = null;
            if (!res.ok) toast(res.message);
            else toast('Conexión creada.');
            renderAutomations(options);
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };
    });

    document.querySelectorAll('.wf-port[data-port-dir="in"]').forEach(inBtn => {
      inBtn.onclick = e => {
        e.stopPropagation();
        if (!ui.connectingFrom) return;
        const res = connectWorkflowNodes(wf.id, {
          sourceNodeId: ui.connectingFrom.nodeId,
          sourcePort: ui.connectingFrom.port,
          targetNodeId: inBtn.dataset.nodeId,
          targetPort: 'in'
        }, actor);
        ui.connectingFrom = null;
        if (!res.ok) {
          toast(res.message);
          $('#wf-connect-hint')?.classList.add('is-hidden');
          return;
        }
        toast('Nodos conectados correctamente.');
        renderAutomations(options);
      };
    });
  }
}

function bindPropertiesPanelEvents(wf, options, actor, isReadOnlyWorkflow) {
  const toast = options.toast || (() => {});
  const node = ui.selectedNodeId ? wf.nodes.find(n => n.id === ui.selectedNodeId) : null;

  document.querySelectorAll('[data-remove-edge]').forEach(btn => {
    btn.onclick = () => {
      const res = removeWorkflowEdge(wf.id, btn.dataset.removeEdge, actor);
      if (!res.ok) { toast(res.message); return; }
      toast('Conexión eliminada.');
      renderAutomations(options);
    };
  });

  if (!node) {
    const areaSel = $('#wf-prop-wf-area');
    if (areaSel) areaSel.onchange = () => { updateWorkflowMeta(wf.id, { area: areaSel.value }, actor); renderAutomations(options); };
    const agentSel = $('#wf-prop-wf-agent');
    if (agentSel) agentSel.onchange = () => { updateWorkflowMeta(wf.id, { primaryAgentId: agentSel.value ? Number(agentSel.value) : null }, actor); renderAutomations(options); };
    const escSel = $('#wf-prop-wf-esc');
    if (escSel) escSel.onchange = () => { updateWorkflowMeta(wf.id, { escalationTarget: escSel.value }, actor); renderAutomations(options); };
    return;
  }

  const labelEl = $('#wf-prop-label');
  if (labelEl && !isReadOnlyWorkflow) {
    labelEl.onchange = () => { updateWorkflowNode(wf.id, node.id, { label: labelEl.value }, actor); renderAutomations(options); };
  }
  const descEl = $('#wf-prop-desc');
  if (descEl && !isReadOnlyWorkflow) {
    descEl.onchange = () => { updateWorkflowNode(wf.id, node.id, { description: descEl.value }, actor); renderAutomations(options); };
  }

  const dupBtn = $('#wf-prop-dup-node');
  if (dupBtn) {
    dupBtn.onclick = () => {
      const res = duplicateWorkflowNode(wf.id, node.id, actor);
      if (!res.ok) { toast(res.message); return; }
      ui.selectedNodeId = res.node.id;
      renderAutomations(options);
    };
  }
  const delBtn = $('#wf-prop-del-node');
  if (delBtn) {
    delBtn.onclick = () => {
      ui.pendingDeleteNodeId = node.id;
      renderAutomations(options);
    };
  }
  const cancelDel = $('#wf-cancel-del-node');
  if (cancelDel) cancelDel.onclick = () => { ui.pendingDeleteNodeId = null; renderAutomations(options); };
  const confirmDel = $('#wf-confirm-del-node');
  if (confirmDel) {
    confirmDel.onclick = () => {
      ui.pendingDeleteNodeId = null;
      const res = removeWorkflowNode(wf.id, node.id, actor);
      if (!res.ok) { toast(res.message); return; }
      ui.selectedNodeId = null;
      toast('Nodo y conexiones eliminados.');
      renderAutomations(options);
    };
  }

  const patchCfg = patch => {
    updateWorkflowNode(wf.id, node.id, { config: patch }, actor);
    renderAutomations(options);
  };

  // Enlaces específicos por tipo de nodo
  const trigSel = $('#wf-prop-triggerKey');
  if (trigSel) {
    trigSel.onchange = () => {
      const t = getTriggerPresetSpec(trigSel.value);
      updateWorkflowNode(wf.id, node.id, { label: t.label, description: t.description, config: { triggerKey: trigSel.value, area: t.area } }, actor);
      renderAutomations(options);
    };
  }

  const cf = $('#wf-prop-cond-field');
  if (cf) cf.onchange = () => {
    const fSpec = CONDITION_FIELDS_CATALOG.find(x => x.key === cf.value) || CONDITION_FIELDS_CATALOG[0];
    patchCfg({ field: cf.value, expectedValue: fSpec.options[0]?.value || '' });
  };
  const co = $('#wf-prop-cond-op');
  if (co) co.onchange = () => patchCfg({ operator: co.value });
  const cv = $('#wf-prop-cond-val');
  if (cv) cv.onchange = () => patchCfg({ expectedValue: cv.value });

  const gc = $('#wf-prop-group-comb');
  if (gc) gc.onchange = () => patchCfg({ combinator: gc.value });
  const addGr = $('#wf-add-group-rule');
  if (addGr) addGr.onclick = () => {
    const rules = Array.isArray(node.config?.rules) ? [...node.config.rules] : [];
    rules.push({ field: 'priority', operator: 'equals', expectedValue: 'Alta' });
    patchCfg({ rules });
  };
  document.querySelectorAll('[data-remove-group-rule]').forEach(b => {
    b.onclick = () => {
      const idx = Number(b.dataset.removeGroupRule);
      const rules = (node.config?.rules || []).filter((_, i) => i !== idx);
      patchCfg({ rules });
    };
  });

  const wm = $('#wf-prop-wait-mins');
  if (wm) wm.onchange = () => patchCfg({ durationMinutes: Number(wm.value || 10) });

  const apr = $('#wf-prop-app-role');
  if (apr) apr.onchange = () => patchCfg({ approverRole: apr.value });
  const appP = $('#wf-prop-app-prompt');
  if (appP) appP.onchange = () => patchCfg({ approvalPrompt: appP.value });
  const appT = $('#wf-prop-app-timeout');
  if (appT) appT.onchange = () => patchCfg({ timeoutHours: Number(appT.value || 4) });

  const agSel = $('#wf-node-agent-select');
  if (agSel) agSel.onchange = () => patchCfg({ agentId: agSel.value ? Number(agSel.value) : null });
  const reqCap = $('#wf-prop-req-cap');
  if (reqCap) reqCap.onchange = () => patchCfg({ requiredCapability: reqCap.value });
  const agTask = $('#wf-prop-agent-task');
  if (agTask) agTask.onchange = () => patchCfg({ taskSummary: agTask.value });

  const createAgBtn = $('#wf-create-agent-btn');
  if (createAgBtn) {
    createAgBtn.onclick = () => openAgentBuilderModal({
      mode: 'create',
      options,
      onSaved: newAg => {
        // Selecciona automáticamente el nuevo agente en el nodo sin perder el workflow actual
        updateWorkflowNode(wf.id, node.id, {
          label: `Ejecutar con agente: "${newAg.name}"`,
          config: {
            agentId: newAg.id,
            requiredCapability: newAg.capabilities[0] || node.config?.requiredCapability || 'prepare_reminder'
          }
        }, actor);
        renderAutomations(options);
      }
    });
  }

  const manageAgBtn = $('#wf-manage-agents-btn');
  if (manageAgBtn) {
    manageAgBtn.onclick = () => {
      const currentAgId = Number(node.config?.agentId || 0);
      if (currentAgId) ui.selectedArmAgentId = currentAgId;
      location.hash = '#arm';
    };
  }

  const inlineActAg = $('#wf-activate-inline-agent');
  if (inlineActAg && node.config?.agentId) {
    inlineActAg.onclick = () => {
      const res = toggleAgentStatus(node.config.agentId, { ...actor, targetStatus: 'active' });
      if (!res.ok) { toast(res.message); return; }
      toast(`Agente "${res.agent.name}" activado.`);
      renderAutomations(options);
    };
  }

  const escT = $('#wf-prop-esc-target');
  if (escT) escT.onchange = () => patchCfg({ targetRole: escT.value });
  const escR = $('#wf-prop-esc-reason');
  if (escR) escR.onchange = () => patchCfg({ reason: escR.value });

  const ta = $('#wf-prop-task-area');
  if (ta) ta.onchange = () => patchCfg({ targetArea: ta.value });
  const tt = $('#wf-prop-task-title');
  if (tt) tt.onchange = () => patchCfg({ taskTitle: tt.value });
  const tp = $('#wf-prop-task-prio');
  if (tp) tp.onchange = () => patchCfg({ priority: tp.value });

  const rc = $('#wf-prop-rem-channel');
  if (rc) rc.onchange = () => patchCfg({ channel: rc.value });
  const rt = $('#wf-prop-rem-tpl');
  if (rt) rt.onchange = () => patchCfg({ template: rt.value });

  const cs = $('#wf-prop-crm-stage');
  if (cs) cs.onchange = () => patchCfg({ stage: cs.value });
  const cp = $('#wf-prop-crm-prio');
  if (cp) cp.onchange = () => patchCfg({ priority: cp.value });
  const ct = $('#wf-prop-crm-tag');
  if (ct) ct.onchange = () => patchCfg({ tag: ct.value });

  const na = $('#wf-prop-note-area');
  if (na) na.onchange = () => patchCfg({ notifyArea: na.value });
  const nt = $('#wf-prop-note-text');
  if (nt) nt.onchange = () => patchCfg({ noteText: nt.value });

  const ra = $('#wf-prop-route-area');
  if (ra) ra.onchange = () => patchCfg({ destinationArea: ra.value });
  const rn = $('#wf-prop-route-note');
  if (rn) rn.onchange = () => patchCfg({ handoffNote: rn.value });

  const eo = $('#wf-prop-end-outcome');
  if (eo) eo.onchange = () => patchCfg({ outcome: eo.value });
  const en = $('#wf-prop-end-note');
  if (en) en.onchange = () => patchCfg({ summaryNote: en.value });

  const st = $('#wf-prop-sec-target');
  if (st) st.onchange = () => patchCfg({ humanTarget: st.value });
  const sr = $('#wf-prop-sec-reason');
  if (sr) sr.onchange = () => patchCfg({ blockReason: sr.value });
}

function bindDockEvents(wf, options, scenarios) {
  const toast = options.toast || (() => {});
  const actor = getActorOpts(options);

  document.querySelectorAll('[data-focus-error-node]').forEach(btn => {
    btn.onclick = () => {
      const nid = btn.dataset.focusErrorNode;
      ui.selectedNodeId = nid;
      renderAutomations(options);
      centerNodeInViewport(wf, nid);
    };
  });

  const scSel = $('#wf-sim-scenario');
  if (scSel) {
    scSel.onchange = () => {
      ui.selectedScenarioId = scSel.value;
      const body = $('#wf-dock-body');
      if (body && ui.dockTab === 'simulation') {
        body.innerHTML = renderDockBodyHtml(wf, ui.lastValidation, getSimulationState(), scenarios);
        bindDockEvents(wf, options, scenarios);
      }
    };
  }

  const sStart = $('#wf-sim-start');
  if (sStart) {
    sStart.onclick = () => {
      const res = startWorkflowSimulation(wf.id, { scenarioId: ui.selectedScenarioId }, actor);
      if (!res.ok) {
        ui.dockTab = 'validation';
        if (res.firstErrorNodeId) ui.selectedNodeId = res.firstErrorNodeId;
        toast(res.message);
        renderAutomations(options);
        return;
      }
    };
  }
  const sPause = $('#wf-sim-pause');
  if (sPause) sPause.onclick = () => pauseWorkflowSimulation();
  const sResume = $('#wf-sim-resume');
  if (sResume) sResume.onclick = () => resumeWorkflowSimulation();
  const sStep = $('#wf-sim-step');
  if (sStep) {
    sStep.onclick = () => {
      const currentSim = getSimulationState();
      if (!currentSim || currentSim.status === 'completed' || currentSim.status === 'stopped') {
        startWorkflowSimulation(wf.id, { scenarioId: ui.selectedScenarioId, manualStep: true }, actor);
      } else {
        stepWorkflowSimulation();
      }
    };
  }
  const sRestart = $('#wf-sim-restart');
  if (sRestart) sRestart.onclick = () => restartWorkflowSimulation();
  const sStop = $('#wf-sim-stop');
  if (sStop) sStop.onclick = () => stopWorkflowSimulation();
  const sSpeed = $('#wf-sim-speed');
  if (sSpeed) sSpeed.onchange = () => setSimulationSpeed(Number(sSpeed.value || 1));

  const auditFilter = $('#wf-audit-filter');
  if (auditFilter) {
    auditFilter.onchange = () => {
      ui.auditFilter = auditFilter.value;
      const body = $('#wf-dock-body');
      if (body) {
        body.innerHTML = renderDockBodyHtml(wf, ui.lastValidation, getSimulationState(), scenarios);
        bindDockEvents(wf, options, scenarios);
      }
    };
  }

  document.querySelectorAll('[data-audit-detail]').forEach(btn => {
    btn.onclick = () => {
      ui.selectedAuditEventId = btn.dataset.auditDetail;
      const body = $('#wf-dock-body');
      if (body) {
        body.innerHTML = renderDockBodyHtml(wf, ui.lastValidation, getSimulationState(), scenarios);
        bindDockEvents(wf, options, scenarios);
      }
    };
  });

  const closeAuditDetail = $('#wf-close-audit-detail');
  if (closeAuditDetail) {
    closeAuditDetail.onclick = () => {
      ui.selectedAuditEventId = null;
      const body = $('#wf-dock-body');
      if (body) {
        body.innerHTML = renderDockBodyHtml(wf, ui.lastValidation, getSimulationState(), scenarios);
        bindDockEvents(wf, options, scenarios);
      }
    };
  }
}

function openTemplatesModal(options) {
  const { openModal, toast = () => {} } = options;
  const actor = getActorOpts(options);
  if (typeof openModal !== 'function') return;

  const html = `
    <div class="wf-sim-static-note">Selecciona una de las ${WORKFLOW_TEMPLATES.length} plantillas clínicas/administrativas para crear una copia editable en estado Borrador.</div>
    <div class="wf-templates-grid">
      ${WORKFLOW_TEMPLATES.map(tpl => `
        <article class="wf-template-card">
          <div class="row-between">
            <strong>${esc(tpl.name)}</strong>
            <span class="badge">${esc(tpl.area)}</span>
          </div>
          <p class="muted">${esc(tpl.description)}</p>
          <div class="row-between" style="margin-top:8px">
            <small class="muted">${tpl.nodes.length} nodos · ${tpl.edges.length} conexiones</small>
            <button class="btn primary sm" type="button" data-use-template="${esc(tpl.id)}">Usar plantilla</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
  openModal('Plantillas de workflows demostrativos', html, '', true);

  document.querySelectorAll('[data-use-template]').forEach(btn => {
    btn.onclick = () => {
      const res = createWorkflowFromTemplate(btn.dataset.useTemplate, actor);
      const dlg = $('#modal');
      if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
      if (!res.ok) { toast(res.message); return; }
      ui.activeWorkflowId = res.workflow.id;
      ui.selectedNodeId = res.workflow.nodes[0]?.id || null;
      toast(`Workflow "${res.workflow.name}" creado en estado Borrador.`);
      renderAutomations(options);
    };
  });
}

function openWorkflowLibraryModal(options) {
  const { openModal, toast = () => {} } = options;
  const actor = getActorOpts(options);
  if (typeof openModal !== 'function') return;
  const all = getWorkflows({ includeArchived: true });
  const html = `
    <div class="wf-library-list">
      ${all.map(w => `
        <div class="role-wf-card">
          <div class="row-between">
            <div>
              <strong>${esc(w.name || '(Sin nombre)')}</strong>
              <span class="badge">${esc(WORKFLOW_STATES[w.status]?.label || w.status)} · v${w.version}</span>
            </div>
            <div class="row-gap">
              <button class="btn sm" type="button" data-lib-open="${esc(w.id)}">Abrir</button>
              <button class="btn sm" type="button" data-lib-dup="${esc(w.id)}">Duplicar</button>
            </div>
          </div>
          <div class="muted" style="margin-top:4px">${esc(w.description)} (${w.nodes.length} nodos)</div>
        </div>
      `).join('')}
    </div>
  `;
  openModal(`Biblioteca de workflows (${all.length})`, html, '', true);
  document.querySelectorAll('[data-lib-open]').forEach(b => {
    b.onclick = () => {
      ui.activeWorkflowId = b.dataset.libOpen;
      ui.selectedNodeId = null;
      const dlg = $('#modal');
      if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
      renderAutomations(options);
    };
  });
  document.querySelectorAll('[data-lib-dup]').forEach(b => {
    b.onclick = () => {
      const res = duplicateWorkflow(b.dataset.libDup, actor);
      const dlg = $('#modal');
      if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
      if (!res.ok) { toast(res.message); return; }
      ui.activeWorkflowId = res.workflow.id;
      toast(`Workflow duplicado: "${res.workflow.name}".`);
      renderAutomations(options);
    };
  });
}
