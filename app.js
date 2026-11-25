import {renderCRM, renderInbox, getLeadsSummary, leads as crmLeads, resetCRMData, handleAppointmentBooked, handleAppointmentAttended, handleAppointmentRescheduled, handleAppointmentCancelled, handleAppointmentNoShow, getPendingNoShowRecoveries, executeNoShowRecovery} from './crm.js';
import {renderARM, renderAutomations, resetARMData, cleanupAutomationsRuntime, openRoleWorkflowsModal, recordAutomationAudit} from './arm.js';
import {renderExecutiveDashboardView, dashboardState} from './dashboard.js';
import * as auth from './auth.js';
import {buildPaletteIndex, searchPalette, isPaletteActionAuthorized} from './palette.js';
import {
  resetTurnosData,
  resetSharedTurnState,
  registerTurnosPatientDirectory,
  hydrateTurnStateFromSharedStorage,
  subscribeToTurnStateChanges,
  getTabOriginId,
  kioskUiState,
  getTurns,
  getTurnById,
  callNextTurn,
  getSelectedCounter,
  completeTurnAfterPayment,
  renderKioskView,
  renderReceptionTurnsView,
  renderCashTurnsView,
  renderAdminTurnsView,
  renderPublicDisplayView
} from './turnos.js';
import * as motion from './motion.js';
const $=s=>document.querySelector(s);
const today='2026-10-27';

const INITIAL_PATIENTS=[
{id:1,name:'María López García',doc:'00000001',phone:'900 000 001',email:'maria@example.test',address:'Av. Los Olivos 120, Lima',insurance:'Rímac EPS',policy:'POL-0001',emergencyName:'Rosa García',emergencyPhone:'900 100 001'},
{id:2,name:'Carlos Mendoza Ruiz',doc:'00000002',phone:'900 000 002',email:'carlos@example.test',address:'Jr. Las Palmeras 245, Lima',insurance:'Particular',policy:'',emergencyName:'Lucía Mendoza',emergencyPhone:'900 100 002'},
{id:3,name:'Ana Torres Medina',doc:'00000003',phone:'900 000 003',email:'ana@example.test',address:'Calle Los Cedros 310, Lima',insurance:'Pacífico EPS',policy:'POL-0003',emergencyName:'Mario Torres',emergencyPhone:'900 100 003'},
{id:4,name:'Luis Pérez Salazar',doc:'00000004',phone:'900 000 004',email:'luis@example.test',address:'Av. Primavera 480, Lima',insurance:'Particular',policy:'',emergencyName:'Elena Salazar',emergencyPhone:'900 100 004'},
{id:5,name:'Elena Soto Vargas',doc:'00000005',phone:'900 000 005',email:'elena@example.test',address:'Jr. Los Nogales 615, Lima',insurance:'Mapfre',policy:'POL-0005',emergencyName:'Raúl Soto',emergencyPhone:'900 100 005'}
];
let patients=JSON.parse(JSON.stringify(INITIAL_PATIENTS));

const INITIAL_APPOINTMENTS=[
  {id:1,pid:1,date:today,time:'09:00',doctor:'Dra. Valeria Ríos',service:'Consulta oftalmológica',amount:150,status:'En espera',paid:true,order:true,method:'Tarjeta (POS)',receiptType:'Constancia interna de pago',reference:'CP-0042',paidAt:today+' 08:52',cashier:'Recepción · Caja'},
  {id:2,pid:2,date:today,time:'09:30',doctor:'Dr. Diego Ramírez',service:'Control oftalmológico',amount:100,status:'Llegó',paid:false,order:true,reference:'OP-0002'},
  {id:3,pid:3,date:today,time:'10:00',doctor:'Dra. Valeria Ríos',service:'Consulta oftalmológica',amount:150,status:'Confirmada',paid:false},
  {id:4,pid:4,date:today,time:'10:30',doctor:'Dr. Diego Ramírez',service:'Consulta oftalmológica',amount:150,status:'Programada',paid:false},
  {id:5,pid:5,date:today,time:'11:00',doctor:'Dra. Valeria Ríos',service:'Control oftalmológico',amount:100,status:'Confirmada',paid:false},
  {id:6,pid:4,date:today,time:'08:30',doctor:'Dr. Diego Ramírez',service:'Tonometría ocular (PIO)',amount:60,status:'Atendida',paid:true,order:true,method:'Yape',receiptType:'Constancia interna de pago',reference:'CP-0040',paidAt:today+' 08:25',cashier:'Recepción · Caja'},
  {id:7,pid:3,date:today,time:'08:45',doctor:'Dra. Valeria Ríos',service:'Refracción computarizada',amount:70,status:'Atendida',paid:true,order:true,method:'Efectivo',receiptType:'Constancia interna de pago',reference:'CP-0041',paidAt:today+' 08:40',cashier:'Recepción · Caja',cashReceived:100,change:30}
];
let appointments=JSON.parse(JSON.stringify(INITIAL_APPOINTMENTS));

const INITIAL_SERVICES_CATALOG=[
  {id:1,name:'Consulta oftalmológica general',category:'Consulta',price:150,duration:30,active:true},
  {id:2,name:'Control oftalmológico / postoperatorio',category:'Control',price:100,duration:20,active:true},
  {id:3,name:'Tonometría ocular (PIO bilateral)',category:'Estudio',price:60,duration:15,active:true},
  {id:4,name:'Refracción computarizada con cicloplejia',category:'Estudio',price:70,duration:25,active:true},
  {id:5,name:'Topografía corneal (OD/OS)',category:'Estudio',price:120,duration:30,active:true},
  {id:6,name:'Paquimetría corneal ultrasónica',category:'Estudio',price:90,duration:20,active:true},
  {id:7,name:'Fondo de ojo con dilatación pupilar',category:'Estudio',price:110,duration:30,active:true}
];
let servicesCatalog=JSON.parse(JSON.stringify(INITIAL_SERVICES_CATALOG));
let route='agenda',query='',filter='Todas',patientFilter='all',adminFilter='all',date=today,collapsed=false,cashTab='pending';
let agendaView='day',agendaDoctor='all',agendaService='all';
let agendaDraggedId=null;
let authStep=1;
let authLoginMode='otp';
let authSelectedEmail='admin@clinicaoftalmo.pe';
let authOtpResult=null;
let authTimerInterval=null;
let authSecondsRemaining=60;
let profileMenuDocClick=null;

const PREFS_STORAGE_KEY='clinica_user_preferences_v1';
const DEFAULT_PREFS={theme:'verde',textSize:'normal',reducedMotion:'off'};
const THEME_PRESETS=[
  {
    id:'verde',
    name:'Verde clínico',
    desc:'Paleta clínica principal en verde profundo con acento ámbar.',
    swatches:[['Principal','#1b4d3e'],['Acento','#d97706'],['Fondo','#f8faf8'],['Superficie','#ffffff']]
  },
  {
    id:'azul',
    name:'Azul institucional',
    desc:'Escala azul médica de alto contraste y baja fatiga visual.',
    swatches:[['Principal','#1b4978'],['Acento','#0e7490'],['Fondo','#f4f7fb'],['Superficie','#ffffff']]
  },
  {
    id:'neutro',
    name:'Neutro cálido',
    desc:'Tonos neutros minerales cálidos para lectura serena.',
    swatches:[['Principal','#52453b'],['Acento','#b45309'],['Fondo','#f7f3ec'],['Superficie','#ffffff']]
  }
];

function sanitizePrefs(raw={}){
  const validThemes=new Set(['verde','azul','neutro']);
  const validSizes=new Set(['normal','large']);
  const validMotion=new Set(['off','on']);
  return {
    theme:validThemes.has(raw?.theme)?raw.theme:DEFAULT_PREFS.theme,
    textSize:validSizes.has(raw?.textSize)?raw.textSize:DEFAULT_PREFS.textSize,
    reducedMotion:validMotion.has(raw?.reducedMotion)?raw.reducedMotion:DEFAULT_PREFS.reducedMotion
  };
}

function readAllUserPreferences(){
  try{
    if(typeof localStorage==='undefined')return {};
    const parsed=JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY)||'{}');
    return parsed&&typeof parsed==='object'?parsed:{};
  }catch{
    return {};
  }
}

export function getUserPreferences(userId){
  if(!userId)return {...DEFAULT_PREFS};
  const all=readAllUserPreferences();
  return sanitizePrefs(all[String(userId)]);
}

export function saveUserPreferences(userId,patch){
  if(!userId)return {...DEFAULT_PREFS};
  const all=readAllUserPreferences();
  const next=sanitizePrefs({...getUserPreferences(userId),...(patch||{})});
  all[String(userId)]=next;
  try{
    if(typeof localStorage!=='undefined'){
      localStorage.setItem(PREFS_STORAGE_KEY,JSON.stringify(all));
    }
  }catch{}
  applyPreferencesToDom(next);
  return next;
}

export function resetAllUserPreferences(){
  try{
    if(typeof localStorage!=='undefined'){
      localStorage.removeItem(PREFS_STORAGE_KEY);
    }
  }catch{}
  applyPreferencesToDom(DEFAULT_PREFS);
}

function applyPreferencesToDom(prefs=DEFAULT_PREFS){
  if(typeof document==='undefined')return;
  const clean=sanitizePrefs(prefs);
  const root=document.documentElement;
  if(clean.theme==='verde')delete root.dataset.theme;
  else root.dataset.theme=clean.theme;
  if(clean.textSize==='normal')delete root.dataset.textSize;
  else root.dataset.textSize=clean.textSize;
  if(clean.reducedMotion==='off')delete root.dataset.reducedMotion;
  else root.dataset.reducedMotion=clean.reducedMotion;
}

function effectiveReducedMotion(prefs){
  const active=prefs||getUserPreferences(auth.getSession()?.id);
  const sysReduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return active.reducedMotion==='on'||Boolean(sysReduced);
}

applyPreferencesToDom(getUserPreferences(auth.getSession()?.id));
const INITIAL_CLINICAL_EXAMS=[
  {
    appointmentId:1,
    patientId:1,
    doctor:'Dra. Valeria Ríos',
    technician:'Tec. Andrés Villacorta',
    refractionOD:{sph:'-1.50',cyl:'-0.50',axis:'180',av:'20/20'},
    refractionOS:{sph:'-1.75',cyl:'-0.75',axis:'175',av:'20/20'},
    tonometryOD:15,
    tonometryOS:16,
    pachymetryOD:540,
    pachymetryOS:538,
    diagnosis:'Miopía leve con astigmatismo miópico bilateral.',
    treatmentPlan:'Lentes monofocales con filtro antirreflejante y descanso. Control anual.',
    updatedAt:today+' 08:45'
  }
];
let clinicalExams=JSON.parse(JSON.stringify(INITIAL_CLINICAL_EXAMS));
const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=n=>n.split(' ').slice(0,2).map(x=>x[0]).join('');
const patient=id=>patients.find(p=>p.id===id);
const badge=(s)=>`<span class="badge ${s==='Pagado'||s==='En espera'||s==='Atendida'||s==='Listo'?'green':s==='Llegó'||s==='Pendiente'||s==='En proceso'?'gold':s==='Confirmada'?'blue':s==='Cancelada'||s==='Inactivo'||s==='Bloqueado'?'red':''}">${esc(s)}</span>`;
const svg={
home:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
calendar:'<svg class="svg-icon" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>',
users:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
crm:'<svg class="svg-icon" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>',
inbox:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M8 9h8M8 13h5"></path></svg>',
clock:'<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 16 14"></polyline></svg>',
eye:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
eyeOff:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>',
doctor:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M12 11v4"></path><path d="M10 13h4"></path></svg>',
search:'<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
alert:'<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
plus:'<svg class="svg-icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
menu:'<svg class="svg-icon" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
check:'<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
cash:'<svg class="svg-icon" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>',
stethoscope:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path><circle cx="20" cy="10" r="2"></circle></svg>',
flask:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M10 2v7.31L4.67 19.33A2 2 0 0 0 6.4 22h11.2a2 2 0 0 0 1.73-2.67L14 9.31V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="7" y1="14.5" x2="17" y2="14.5"></line></svg>',
logOut:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
mail:'<svg class="svg-icon" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>',
key:'<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>',
tag:'<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>',
bot:'<svg class="svg-icon" viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="3"></rect><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"></path></svg>',
flow:'<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="18" r="3"></circle><path d="M9 6h4a5 5 0 0 1 5 5v4M6 9v9h9"></path></svg>'
};
const INITIAL_PRELIMINARY_STUDIES=[
{id:1,patientId:1,patient:'María López García',type:'Refracción computarizada',eye:'Bilateral',status:'Listo',doctor:'Dra. Valeria Ríos',notes:'Refracción con agudeza 20/20 bilateral.'},
{id:2,patientId:2,patient:'Carlos Mendoza Ruiz',type:'Topografía corneal',eye:'OD',status:'En proceso',doctor:'Dr. Diego Ramírez',notes:'Evaluación de astigmatismo irregular en curso.'},
{id:3,patientId:3,patient:'Ana Torres Medina',type:'Tonometría ocular (PIO)',eye:'Bilateral',status:'Pendiente',doctor:'Dra. Valeria Ríos',notes:'Descarte preventivo de PIO elevada.'},
{id:4,patientId:4,patient:'Luis Pérez Salazar',type:'Fondo de ojo con dilatación',eye:'OS',status:'Pendiente',doctor:'Dr. Diego Ramírez',notes:'Revisión de mácula y retina periférica.'}
];
let preliminaryStudies=JSON.parse(JSON.stringify(INITIAL_PRELIMINARY_STUDIES));

const INITIAL_DOCTORS=[
  {id:1,name:'Dra. Valeria Ríos',cmp:'54201',rne:'28410',specialty:'Oftalmología general y Córnea',shift:'Mañana (08:30–13:00)',active:true},
  {id:2,name:'Dr. Diego Ramírez',cmp:'49120',rne:'24119',specialty:'Oftalmología y Retina',shift:'Tarde (14:00–18:30)',active:true}
];
let doctors=JSON.parse(JSON.stringify(INITIAL_DOCTORS));

const INITIAL_TECHNICIANS=[
  {id:1,name:'Tec. Andrés Villacorta',code:'OPT-0142',specialty:'Optometría y Refracción computarizada',shift:'Mañana (08:30–13:30)',active:true},
  {id:2,name:'Tec. Mariana Palacios',code:'OPT-0210',specialty:'Tonometría ocular PIO y Paquimetría',shift:'Tarde (13:30–18:30)',active:true}
];
let technicians=JSON.parse(JSON.stringify(INITIAL_TECHNICIANS));
function getNavGroupsForRole(role){
  if(role==='admin'){
    return [
      {name:'OPERACIÓN',collapsible:true,defaultOpen:true,items:[['dashboard',svg.home,'Panel general'],['agenda',svg.calendar,'Agenda y citas'],['pacientes',svg.users,'Pacientes']]},
      {name:'CLÍNICA',collapsible:true,defaultOpen:true,items:[['consulta',svg.stethoscope,'Atención médica'],['estudios',svg.flask,'Cola de estudios']]},
      {name:'NEGOCIO',collapsible:true,defaultOpen:true,items:[['crm',svg.crm,'CRM de prospectos'],['inbox',svg.inbox,'Inbox de conversaciones'],['caja',svg.cash,'Caja y cobros']]},
      {name:'SUPERVISIÓN',collapsible:true,secondary:true,items:[
        ['arm',svg.bot,'Centro de agentes ARM'],
        ['automations',svg.flow,'Automatizaciones'],
        ['turnos-supervision',svg.clock,'Turnos presenciales']
      ]},
      {name:'CONFIGURACIÓN',collapsible:true,secondary:true,items:[
        ['admin-medicos',svg.doctor,'Médicos tratantes'],
        ['admin-tecnicos',svg.flask,'Técnicos de optometría'],
        ['admin-usuarios',svg.key,'Usuarios y accesos'],
        ['admin-servicios',svg.tag,'Servicios y tarifas']
      ]}
    ];
  }else if(role==='medico'){
    return [
      {name:'CLÍNICA',items:[['agenda',svg.calendar,'Mi agenda médica'],['consulta',svg.stethoscope,'Atención y diagnósticos'],['pacientes',svg.users,'Expedientes']]}
    ];
  }else if(role==='tecnico'){
    return [
      {name:'CLÍNICA',items:[['estudios',svg.flask,'Cola de estudios'],['pacientes',svg.users,'Pacientes']]}
    ];
  }else if(role==='recepcion'){
    return [
      {name:'OPERACIÓN',items:[['dashboard',svg.home,'Panel general'],['agenda',svg.calendar,'Agenda y citas'],['turnos-recepcion',svg.clock,'Turnos de recepción'],['pacientes',svg.users,'Pacientes']]},
      {name:'NEGOCIO',items:[['crm',svg.crm,'CRM de prospectos'],['inbox',svg.inbox,'Inbox de conversaciones']]}
    ];
  }else if(role==='caja'){
    return [
      {name:'NEGOCIO',items:[['caja',svg.cash,'Caja y cobros'],['turnos-caja',svg.clock,'Turnos de caja']]}
    ];
  }
  return [];
}
const titles={
  dashboard:['Panel general de recepción','Resumen del día y operación de la clínica.'],
  agenda:['Agenda y citas','Cada cita, en su momento. Cada paciente, bien atendido.'],
  pacientes:['Pacientes','La información esencial, siempre a mano.'],
  'paciente-detalle':['Ficha del paciente','Expediente operativo y registro de atención.'],
  crm:['CRM de prospectos','Cada contacto que llega por redes, Google o referidos se registra y atiende para convertirlo en cita oftalmológica.'],
  inbox:['Inbox de conversaciones','Mensajes y contexto comercial de cada contacto, reunidos por canal.'],
  arm:['Centro de agentes ARM','Supervisión de agentes, límites, derivaciones y actividad simulada.'],
  automations:['Automatizaciones','Reglas visuales y disparadores simulados para la operación.'],
  caja:['Caja y cobros','Órdenes, cobros y constancias en un solo lugar.'],
  consulta:['Atención médica y diagnósticos','Evaluación clínica, refracción, presión intraocular y prescripción.'],
  estudios:['Cola de estudios oftalmológicos','Mediciones técnicas, tonometría y refracción computarizada.'],
  'admin-medicos':['Mantenimiento de Médicos Tratantes','Gestión de profesionales, colegiatura CMP, especialidades y horarios.'],
  'admin-tecnicos':['Mantenimiento de Técnicos y Optometría','Registro de personal técnico, áreas de examen y turnos.'],
  'admin-usuarios':['Mantenimiento de Usuarios y Accesos','Cuentas individuales, asignación de roles RBAC y estados de acceso OTP.'],
  'admin-servicios':['Mantenimiento de Servicios y Tarifario','Catálogo oficial de prestaciones, tarifas en Soles (S/) y tiempos de atención.'],
  'turnos-recepcion':['Turnos Presenciales · Recepción','Gestión de cola R, llamado en ventanilla y validación de llegadas.'],
  'turnos-caja':['Turnos Presenciales · Caja','Gestión de cola C, órdenes vinculadas y registro de cobros.'],
  'turnos-supervision':['Supervisión de Turnos Presenciales','Monitoreo de colas R y C, métricas de atención e historial auditable.'],
  autoservicio:['Punto de Autoservicio','Emisión de tickets presenciales para Recepción y Caja.'],
  'pantalla-turnos':['Pantalla Pública de Llamados','Sala de espera: llamados por código y ventanilla.'],
  perfil:['Mi perfil','Datos personales, contraseña demostrativa y preferencias visuales de tu cuenta.']
};
let routeParams={};
let currentRenderRoute=null;
let pendingCommandAction=null;
let toastTimer=null;
let toastHideTimer=null;
let toastRafId=null;
let toastEndHandler=null;
let toastGeneration=0;

function dismissToast(immediate=false){
  const n=$('#notice');
  if(!n)return;

  if(toastTimer){
    clearTimeout(toastTimer);
    toastTimer=null;
  }
  if(toastRafId){
    cancelAnimationFrame(toastRafId);
    toastRafId=null;
  }

  const gen=toastGeneration;

  const finish=()=>{
    if(gen!==toastGeneration)return;
    if(toastHideTimer){
      clearTimeout(toastHideTimer);
      toastHideTimer=null;
    }
    if(toastEndHandler){
      n.removeEventListener('transitionend',toastEndHandler);
      toastEndHandler=null;
    }
    n.classList.remove('is-visible');
    n.textContent='';
  };

  if(immediate){
    toastGeneration++;
    if(toastHideTimer){
      clearTimeout(toastHideTimer);
      toastHideTimer=null;
    }
    if(toastEndHandler){
      n.removeEventListener('transitionend',toastEndHandler);
      toastEndHandler=null;
    }
    n.classList.remove('is-visible');
    n.textContent='';
    return;
  }

  if(!n.classList.contains('is-visible')&&!n.textContent){
    finish();
    return;
  }

  n.classList.remove('is-visible');

  if(toastEndHandler){
    n.removeEventListener('transitionend',toastEndHandler);
    toastEndHandler=null;
  }

  toastEndHandler=(e)=>{
    if(e.target!==n||e.propertyName!=='opacity')return;
    finish();
  };
  n.addEventListener('transitionend',toastEndHandler);

  if(toastHideTimer)clearTimeout(toastHideTimer);
  toastHideTimer=setTimeout(finish,190);
}

function toast(text){
  const n=$('#notice');
  if(!n)return;

  if(toastRafId){
    cancelAnimationFrame(toastRafId);
    toastRafId=null;
  }
  if(toastHideTimer){
    clearTimeout(toastHideTimer);
    toastHideTimer=null;
  }
  if(toastEndHandler){
    n.removeEventListener('transitionend',toastEndHandler);
    toastEndHandler=null;
  }
  if(toastTimer){
    clearTimeout(toastTimer);
    toastTimer=null;
  }

  const gen=++toastGeneration;
  const wasVisible=n.classList.contains('is-visible')&&Boolean(n.textContent.trim());
  n.textContent=text;

  if(wasVisible){
    n.classList.add('is-visible');
  }else{
    n.classList.remove('is-visible');
    toastRafId=requestAnimationFrame(()=>{
      toastRafId=null;
      if(gen===toastGeneration&&n.textContent===text){
        n.classList.add('is-visible');
      }
    });
  }

  toastTimer=setTimeout(()=>{
    if(gen===toastGeneration){
      dismissToast(false);
    }
  },4000);
  toast.timer=toastTimer;
}
toast.timer=null;

function clearPublicNotice(){
  if(toastTimer){
    clearTimeout(toastTimer);
    toastTimer=null;
  }
  toast.timer=null;
  dismissToast(true);
}
window.__clearPublicNotice=clearPublicNotice;

if (typeof window !== 'undefined' && window.__testMode === true) {
  window.__toastTestApi = Object.freeze({
    show: text => toast(text),
    dismiss: () => dismissToast(false),
    clear: () => clearPublicNotice()
  });
}
function search(placeholder){return `<div class="searchbox">${svg.search}<input id="search" aria-label="${placeholder}" placeholder="${placeholder}" value="${esc(query)}"><button id="clear" aria-label="Limpiar búsqueda" ${query?'':'hidden'}>×</button></div>`}

function authView(){
  if(authTimerInterval){
    clearInterval(authTimerInterval);
    authTimerInterval=null;
  }
  if(authStep===1){
    $('#app').innerHTML=`
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-brand">
            <span class="eye"></span>
            <span class="word">Clínica<span style="color:#f6c464">.</span></span>
          </div>
          <div class="auth-header">
            <h1>Acceso al Sistema Clínico</h1>
            <p>${authLoginMode==='otp'
              ?'Ingresa tu correo para recibir un código de un solo uso (OTP) y validar tu rol en la sede.'
              :'Inicia sesión con tu correo registrado y tu contraseña demostrativa local.'}</p>
          </div>

          <div class="auth-roles-section">
            <div class="auth-roles-label">
              <span>Accesos rápidos de demostración (1 clic)</span>
              <small>Elige un perfil</small>
            </div>
            <div class="auth-roles-grid">
              ${auth.USERS.map(u=>`
                <button type="button" class="role-chip-btn ${authSelectedEmail===u.email?'active':''}" data-auth-email="${esc(u.email)}">
                  <span class="role-title">${esc(u.roleLabel)}</span>
                  <small>${esc(u.name.split(' ')[0])} (${esc(u.role)})</small>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="auth-mode-switch" role="tablist" aria-label="Método de inicio de sesión">
            <button type="button" role="tab" id="auth-mode-otp" class="auth-mode-btn ${authLoginMode==='otp'?'active':''}" aria-selected="${authLoginMode==='otp'}">Con código OTP</button>
            <button type="button" role="tab" id="auth-mode-password" class="auth-mode-btn ${authLoginMode==='password'?'active':''}" aria-selected="${authLoginMode==='password'}">Con contraseña</button>
          </div>

          ${authLoginMode==='otp'?`
            <form id="auth-email-form" class="auth-form" novalidate>
              <div class="auth-field">
                <label for="auth-email-input">${svg.mail} Correo electrónico registrado</label>
                <input id="auth-email-input" class="auth-input" type="email" autocomplete="username" placeholder="usuario@clinicaoftalmo.pe" value="${esc(authSelectedEmail)}" required>
              </div>
              <div id="auth-form-error" class="error" role="alert" style="margin:0"></div>
              <button type="submit" class="auth-btn auth-btn-primary">
                Enviar código de acceso ${svg.key}
              </button>
            </form>
          `:`
            <form id="auth-password-form" class="auth-form" method="post" novalidate>
              <div class="auth-field">
                <label for="auth-email-input">${svg.mail} Correo electrónico registrado</label>
                <input id="auth-email-input" class="auth-input" type="email" autocomplete="username" placeholder="usuario@clinicaoftalmo.pe" value="${esc(authSelectedEmail)}" required>
              </div>
              <div class="auth-field">
                <label for="auth-password-input">${svg.key} Contraseña local</label>
                <div class="password-field-wrap">
                  <input id="auth-password-input" class="auth-input" type="password" autocomplete="current-password" placeholder="Ingresa tu contraseña de demostración" required>
                  <button type="button" class="pw-toggle-btn" id="toggle-auth-password" aria-pressed="false" aria-label="Mostrar contraseña">${svg.eye} Ver</button>
                </div>
              </div>
              <div id="auth-form-error" class="error" role="alert" style="margin:0"></div>
              <button type="submit" class="auth-btn auth-btn-primary">
                Iniciar sesión con contraseña ${svg.key}
              </button>
            </form>
          `}

          <div class="auth-public-demo">
            <span>Pantallas públicas presenciales (demostración):</span>
            <div class="auth-public-actions">
              <button type="button" class="role-chip-btn" id="auth-open-kiosk">Punto de autoservicio</button>
              <button type="button" class="role-chip-btn" id="auth-open-public-display">Pantalla pública de llamados</button>
            </div>
          </div>

          <div class="auth-footer">
            <span>${authLoginMode==='otp'
              ?'Sede Principal · Autenticación Passwordless simulada con códigos OTP de 6 dígitos.'
              :'Sede Principal · Verificación simulada en memoria local para demostración.'}</span>
          </div>
        </div>
      </div>
    `;

    $('#auth-mode-otp').onclick=()=>{authLoginMode='otp';authView();};
    $('#auth-mode-password').onclick=()=>{authLoginMode='password';authView();};
    if($('#auth-open-kiosk'))$('#auth-open-kiosk').onclick=()=>{location.hash='#autoservicio';};
    if($('#auth-open-public-display'))$('#auth-open-public-display').onclick=()=>{location.hash='#pantalla-turnos';};

    document.querySelectorAll('[data-auth-email]').forEach(btn=>{
      btn.onclick=()=>{
        authSelectedEmail=btn.dataset.authEmail;
        if($('#auth-email-input'))$('#auth-email-input').value=authSelectedEmail;
        document.querySelectorAll('.role-chip-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        $('#auth-form-error').textContent='';
      };
    });

    if($('#auth-email-form')){
      $('#auth-email-form').onsubmit=e=>{
        e.preventDefault();
        const email=$('#auth-email-input').value.trim();
        if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          $('#auth-form-error').textContent='Ingresa un correo electrónico válido.';
          return;
        }
        const res=auth.requestOtp(email);
        if(!res.success){
          $('#auth-form-error').textContent=res.error;
          return;
        }
        authOtpResult=res;
        authSelectedEmail=email;
        authStep=2;
        authSecondsRemaining=60;
        toast(`Código OTP generado para ${email}.`);
        authView();
      };
    }

    if($('#toggle-auth-password')&&$('#auth-password-input')){
      $('#toggle-auth-password').onclick=()=>{
        const input=$('#auth-password-input');
        const btn=$('#toggle-auth-password');
        const show=input.type==='password';
        input.type=show?'text':'password';
        btn.setAttribute('aria-pressed',String(show));
        btn.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
        btn.innerHTML=`${show?svg.eyeOff:svg.eye} ${show?'Ocultar':'Ver'}`;
      };
    }

    if($('#auth-password-form')){
      $('#auth-password-form').onsubmit=e=>{
        e.preventDefault();
        const email=$('#auth-email-input').value.trim();
        const secret=$('#auth-password-input').value;
        if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          $('#auth-form-error').textContent='Ingresa un correo electrónico válido.';
          $('#auth-email-input').focus();
          return;
        }
        if(!secret){
          $('#auth-form-error').textContent='Ingresa tu contraseña de demostración.';
          $('#auth-password-input').focus();
          return;
        }
        const res=auth.loginWithPassword(email,secret);
        $('#auth-password-input').value='';
        if(!res.success){
          $('#auth-form-error').textContent=res.error;
          return;
        }
        const loggedUser=res.user;
        authLoginMode='otp';
        location.hash='#'+auth.getDefaultRoute(loggedUser.role);
        toast(`Sesión iniciada: ${loggedUser.name} (${loggedUser.roleLabel})`);
        render();
      };
    }

  } else if(authStep===2){
    $('#app').innerHTML=`
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-brand">
            <span class="eye"></span>
            <span class="word">Clínica<span style="color:#f6c464">.</span></span>
          </div>
          <div class="auth-header">
            <h1>Verifica tu código de acceso</h1>
            <p>Hemos generado un código de 6 dígitos para:<br><b style="color:var(--primary)">${esc(authSelectedEmail)}</b></p>
          </div>

          <div class="simulated-inbox">
            <div class="simulated-inbox-header">
              <span class="simulated-inbox-title">📨 Bandeja de correo simulada</span>
              <span class="simulated-inbox-timer" id="otp-timer-display">Válido por 5:00 min</span>
            </div>
            <div class="simulated-inbox-content">
              <div>
                <small style="color:var(--muted);display:block">Código para ${esc(authOtpResult?.user?.name||'Usuario')}:</small>
                <span class="simulated-inbox-code" id="display-otp-code">${esc(authOtpResult?.code||'------')}</span>
              </div>
              <button type="button" class="simulated-inbox-btn" id="autofill-otp">Usar código</button>
            </div>
          </div>

          <form id="auth-otp-form" class="auth-form" novalidate>
            <div class="otp-container">
              <input type="text" maxlength="1" class="otp-box" id="otp-0" autocomplete="off" autofocus>
              <input type="text" maxlength="1" class="otp-box" id="otp-1" autocomplete="off">
              <input type="text" maxlength="1" class="otp-box" id="otp-2" autocomplete="off">
              <input type="text" maxlength="1" class="otp-box" id="otp-3" autocomplete="off">
              <input type="text" maxlength="1" class="otp-box" id="otp-4" autocomplete="off">
              <input type="text" maxlength="1" class="otp-box" id="otp-5" autocomplete="off">
            </div>

            <div id="auth-otp-error" class="error" role="alert" style="margin:0;text-align:center"></div>

            <button type="submit" class="auth-btn auth-btn-primary">
              Verificar e ingresar al sistema
            </button>
            <button type="button" class="auth-btn auth-btn-outline" id="auth-back-btn">
              ← Cambiar correo o rol
            </button>
          </form>

          <div class="auth-footer" style="display:flex;justify-content:space-between;align-items:center">
            <span id="countdown-label">Reenviar código en <b id="countdown-val">60s</b></span>
            <button type="button" class="linkbutton" id="resend-otp-btn" style="display:none">Reenviar código</button>
          </div>
        </div>
      </div>
    `;

    const boxes=[0,1,2,3,4,5].map(i=>$('#otp-'+i));
    boxes[0]?.focus();

    boxes.forEach((box,idx)=>{
      box.oninput=e=>{
        const val=e.target.value.replace(/\D/g,'');
        box.value=val?val[0]:'';
        if(val) box.classList.add('filled');
        else box.classList.remove('filled');
        if(val && idx < 5) boxes[idx+1].focus();
      };
      box.onkeydown=e=>{
        if(e.key==='Backspace' && !box.value && idx > 0){
          boxes[idx-1].focus();
        }
      };
      box.onpaste=e=>{
        e.preventDefault();
        const text=(e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
        text.split('').forEach((char,i)=>{
          if(boxes[i]){
            boxes[i].value=char;
            boxes[i].classList.add('filled');
          }
        });
        if(boxes[text.length<6?text.length:5]) boxes[text.length<6?text.length:5].focus();
      };
    });

    $('#autofill-otp').onclick=()=>{
      const code=authOtpResult?.code||'';
      code.split('').forEach((char,i)=>{
        if(boxes[i]){
          boxes[i].value=char;
          boxes[i].classList.add('filled');
        }
      });
      boxes[5]?.focus();
      $('#auth-otp-error').textContent='';
    };

    $('#auth-back-btn').onclick=()=>{
      authStep=1;
      authView();
    };

    authSecondsRemaining=60;
    authTimerInterval=setInterval(()=>{
      authSecondsRemaining--;
      const valEl=$('#countdown-val');
      if(valEl) valEl.textContent=`${authSecondsRemaining}s`;
      if(authSecondsRemaining<=0){
        clearInterval(authTimerInterval);
        authTimerInterval=null;
        if($('#countdown-label')) $('#countdown-label').style.display='none';
        if($('#resend-otp-btn')) $('#resend-otp-btn').style.display='inline';
      }
    },1000);

    if($('#resend-otp-btn')){
      $('#resend-otp-btn').onclick=()=>{
        const res=auth.requestOtp(authSelectedEmail);
        if(res.success){
          authOtpResult=res;
          toast('Nuevo código OTP generado.');
          authStep=2;
          authView();
        }
      };
    }

    $('#auth-otp-form').onsubmit=e=>{
      e.preventDefault();
      const enteredCode=boxes.map(b=>b.value).join('');
      if(enteredCode.length<6){
        $('#auth-otp-error').textContent='Ingresa los 6 dígitos del código.';
        return;
      }
      const verifyRes=auth.verifyOtp(authSelectedEmail,enteredCode);
      if(!verifyRes.success){
        $('#auth-otp-error').textContent=verifyRes.error;
        boxes.forEach(b=>{b.classList.remove('filled');});
        return;
      }
      if(authTimerInterval){
        clearInterval(authTimerInterval);
        authTimerInterval=null;
      }
      const loggedUser=verifyRes.user;
      location.hash='#'+auth.getDefaultRoute(loggedUser.role);
      toast(`Sesión iniciada: ${loggedUser.name} (${loggedUser.roleLabel})`);
      render();
    };
  }
}

function renderPasswordRulesHtml(checks){
  const rows=[
    ['minLength','Al menos 8 caracteres'],
    ['hasUpper','Al menos 1 letra mayúscula'],
    ['hasLower','Al menos 1 letra minúscula'],
    ['hasDigit','Al menos 1 número'],
    ['differentFromCurrent','Distinta a la contraseña actual'],
    ['matchesConfirmation','Coincide con la confirmación']
  ];
  return rows.map(([key,label])=>{
    const met=Boolean(checks[key]);
    return `<div class="pw-rule ${met?'is-met':''}" data-rule="${key}">
      <span class="pw-rule-label"><span aria-hidden="true">${met?'✓':'○'}</span><span>${label}</span></span>
      <span class="pw-rule-state">${met?'Cumple':'Pendiente'}</span>
    </div>`;
  }).join('');
}

function profileView(user,section='general'){
  const prefs=getUserPreferences(user.id);
  const sysReduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const accountStateLabel=user.active===false?'Inactiva':'Activa';

  $('#view').innerHTML=`
    <div class="profile-layout">
      <section class="profile-summary-card" aria-labelledby="profile-summary-name">
        <div class="profile-summary-banner">
          <div class="profile-avatar-xl" id="profile-summary-avatar">${esc(user.avatar)}</div>
          <h2 id="profile-summary-name">${esc(user.name)}</h2>
          <p id="profile-summary-login">${esc(user.email)}</p>
          <span class="role-badge role-badge-${user.role}">${esc(user.roleLabel)}</span>
        </div>
        <div class="profile-summary-body">
          <div class="profile-meta-row">
            <small>Estado de la cuenta</small>
            <span>${badge(accountStateLabel)}</span>
          </div>
          <div class="profile-meta-row">
            <small>Departamento / Sede</small>
            <strong>${esc(user.department||'Sede Principal')}</strong>
          </div>
          <div class="profile-meta-row">
            <small>Teléfono</small>
            <strong id="profile-summary-phone">${esc(user.phone||'—')}</strong>
          </div>
          <div class="profile-meta-row">
            <small>Correo de contacto</small>
            <strong id="profile-summary-contact-email">${esc(user.contactEmail||user.email)}</strong>
          </div>
        </div>
      </section>

      <div class="profile-sections">
        <section class="profile-card ${section==='general'?'is-highlighted':''}" aria-labelledby="profile-personal-heading">
          <div class="profile-card-head">
            <div>
              <h2 id="profile-personal-heading">${svg.doctor} Datos personales</h2>
              <p>Actualiza tu nombre visible y medios de contacto. Los atributos de acceso y rol permanecen protegidos.</p>
            </div>
            <span class="profile-readonly-badge">Rol y permisos protegidos</span>
          </div>

          <form id="profile-personal-form" method="post" novalidate>
            <div class="profile-form-grid">
              <div class="field field-full">
                <label for="profile-name">Nombre visible <span aria-hidden="true">*</span></label>
                <input id="profile-name" name="name" type="text" autocomplete="name" value="${esc(user.name)}" aria-describedby="profile-name-error" required>
                <span class="field-error" id="profile-name-error" role="alert"></span>
              </div>

              <div class="field">
                <label for="profile-phone">Teléfono <span aria-hidden="true">*</span></label>
                <input id="profile-phone" name="phone" type="tel" autocomplete="tel" inputmode="numeric" value="${esc(user.phone||'')}" placeholder="987 654 321" aria-describedby="profile-phone-hint profile-phone-error" required>
                <span class="field-hint" id="profile-phone-hint">Número de 9 dígitos para coordinación interna.</span>
                <span class="field-error" id="profile-phone-error" role="alert"></span>
              </div>

              <div class="field">
                <label for="profile-contact-email">Correo de contacto <span aria-hidden="true">*</span></label>
                <input id="profile-contact-email" name="contactEmail" type="email" autocomplete="email" value="${esc(user.contactEmail||user.email)}" aria-describedby="profile-contact-email-error" required>
                <span class="field-error" id="profile-contact-email-error" role="alert"></span>
              </div>

              <div class="field">
                <label for="profile-role-readonly">Rol actual (solo lectura)</label>
                <input id="profile-role-readonly" name="roleReadonly" type="text" value="${esc(user.roleLabel)}" readonly disabled>
                <span class="field-hint">Solo Administración puede cambiar roles RBAC.</span>
              </div>

              <div class="field">
                <label for="profile-status-readonly">Estado de la cuenta (solo lectura)</label>
                <input id="profile-status-readonly" name="statusReadonly" type="text" value="${accountStateLabel}" readonly disabled>
              </div>

              <div class="field field-full">
                <label for="profile-login-email-readonly">Correo de acceso (solo lectura)</label>
                <input id="profile-login-email-readonly" name="loginEmailReadonly" type="email" value="${esc(user.email)}" readonly disabled>
                <span class="field-hint">Este identificador corporativo se utiliza para el acceso OTP y contraseña local.</span>
              </div>
            </div>

            <div class="form-status-banner" id="profile-personal-feedback" role="status" aria-live="polite" hidden></div>

            <div class="profile-form-actions">
              <span class="field-hint">Los cambios en nombre visible e iniciales se reflejan de inmediato en la cabecera.</span>
              <button type="submit" class="primary" id="profile-save-personal">Guardar datos personales</button>
            </div>
          </form>
        </section>

        <section class="profile-card" aria-labelledby="profile-password-heading">
          <div class="profile-card-head">
            <div>
              <h2 id="profile-password-heading">${svg.key} Contraseña simulada</h2>
              <p>Actualiza la credencial demostrativa almacenada en memoria local durante esta sesión.</p>
            </div>
          </div>

          <div class="note" id="pw-sim-note" style="margin:0 0 16px;">
            ${svg.alert}
            <span><b>Cambio simulado para esta demostración. No utiliza un servidor de autenticación.</b></span>
          </div>

          <form id="profile-password-form" method="post" novalidate>
            <div class="profile-form-grid">
              <div class="field field-full">
                <label for="pw-current">Contraseña actual <span aria-hidden="true">*</span></label>
                <div class="password-field-wrap">
                  <input id="pw-current" name="currentPassword" type="password" autocomplete="current-password" aria-describedby="pw-current-error" required>
                  <button type="button" class="pw-toggle-btn" id="toggle-pw-current" data-pw-target="pw-current" aria-pressed="false" aria-label="Mostrar contraseña actual">${svg.eye} Ver</button>
                </div>
                <span class="field-error" id="pw-current-error" role="alert"></span>
              </div>

              <div class="field">
                <label for="pw-new">Nueva contraseña <span aria-hidden="true">*</span></label>
                <div class="password-field-wrap">
                  <input id="pw-new" name="newPassword" type="password" autocomplete="new-password" aria-describedby="pw-rules pw-new-error" required>
                  <button type="button" class="pw-toggle-btn" id="toggle-pw-new" data-pw-target="pw-new" aria-pressed="false" aria-label="Mostrar nueva contraseña">${svg.eye} Ver</button>
                </div>
                <span class="field-error" id="pw-new-error" role="alert"></span>
              </div>

              <div class="field">
                <label for="pw-confirm">Confirmar nueva contraseña <span aria-hidden="true">*</span></label>
                <div class="password-field-wrap">
                  <input id="pw-confirm" name="confirmPassword" type="password" autocomplete="new-password" aria-describedby="pw-confirm-error" required>
                  <button type="button" class="pw-toggle-btn" id="toggle-pw-confirm" data-pw-target="pw-confirm" aria-pressed="false" aria-label="Mostrar confirmación de nueva contraseña">${svg.eye} Ver</button>
                </div>
                <span class="field-error" id="pw-confirm-error" role="alert"></span>
              </div>
            </div>

            <div class="pw-rules" id="pw-rules" aria-live="polite">
              ${renderPasswordRulesHtml(auth.evaluatePasswordPolicy('','','').checks)}
            </div>

            <div class="form-status-banner" id="profile-password-feedback" role="alert" hidden></div>

            <div class="profile-form-actions">
              <span class="field-hint">Por seguridad, las contraseñas no se muestran ni se guardan en sessionStorage.</span>
              <button type="submit" class="primary" id="profile-save-password">Actualizar contraseña simulada</button>
            </div>
          </form>
        </section>

        <section class="profile-card ${section==='preferencias'?'is-highlighted':''}" id="perfil-preferencias" aria-labelledby="pref-heading">
          <div class="profile-card-head">
            <div>
              <h2 id="pref-heading" tabindex="-1">${svg.eye} Preferencias visuales</h2>
              <p>Configura tema, escala de lectura y movimiento para este usuario en este navegador.</p>
            </div>
            <span class="profile-readonly-badge" id="pref-active-summary">Tema: ${esc(THEME_PRESETS.find(t=>t.id===prefs.theme)?.name||'Verde clínico')}</span>
          </div>

          <fieldset class="pref-group">
            <legend>Tema visual predefinido</legend>
            <div class="theme-grid" role="radiogroup" aria-label="Temas visuales disponibles">
              ${THEME_PRESETS.map(theme=>{
                const checked=prefs.theme===theme.id;
                return `<label class="theme-option ${checked?'is-selected':''}" data-theme-card="${theme.id}">
                  <input type="radio" class="visually-hidden" name="pref-theme" value="${theme.id}" ${checked?'checked':''}>
                  <span class="theme-option-head">
                    <strong>${theme.name}</strong>
                    <span class="theme-selected-tag">${checked?'✓ Activo':'Disponible'}</span>
                  </span>
                  <span class="theme-desc">${theme.desc}</span>
                  <span class="theme-swatches">
                    ${theme.swatches.map(([swLabel,swHex])=>`<span class="swatch-chip"><span class="swatch-dot" style="background:${swHex}"></span><span>${swLabel}</span></span>`).join('')}
                  </span>
                </label>`;
              }).join('')}
            </div>
          </fieldset>

          <fieldset class="pref-group">
            <legend>Tamaño de texto</legend>
            <div class="choice-grid" role="radiogroup" aria-label="Tamaño de texto">
              ${[['normal','Normal','Densidad estándar de 14 px para pantallas clínicas.'],['large','Grande','Tipografía ampliada de 16 px para mayor legibilidad.']].map(([val,label,desc])=>{
                const checked=prefs.textSize===val;
                return `<label class="choice-option ${checked?'is-selected':''}">
                  <input type="radio" class="visually-hidden" name="pref-text-size" value="${val}" ${checked?'checked':''}>
                  <span class="choice-option-copy">
                    <strong>${label}</strong>
                    <small>${desc}</small>
                  </span>
                  <span class="theme-selected-tag">${checked?'✓ Activo':'Elegir'}</span>
                </label>`;
              }).join('')}
            </div>
          </fieldset>

          <fieldset class="pref-group">
            <legend>Reducir movimiento</legend>
            <div class="choice-grid" role="radiogroup" aria-label="Reducir movimiento">
              ${[['off','Desactivado','Respeta automáticamente la preferencia del sistema.'],['on','Activado','Suprime animaciones y desplazamientos decorativos manteniendo el foco visible.']].map(([val,label,desc])=>{
                const checked=prefs.reducedMotion===val;
                return `<label class="choice-option ${checked?'is-selected':''}">
                  <input type="radio" class="visually-hidden" name="pref-reduced-motion" value="${val}" ${checked?'checked':''}>
                  <span class="choice-option-copy">
                    <strong>${label}</strong>
                    <small>${desc}</small>
                  </span>
                  <span class="theme-selected-tag">${checked?'✓ Activo':'Elegir'}</span>
                </label>`;
              }).join('')}
            </div>
            ${sysReduced?'<p class="field-hint" style="margin-top:8px;">Tu navegador o sistema operativo tiene activa la reducción de movimiento y también se respeta automáticamente.</p>':''}
          </fieldset>
        </section>
      </div>
    </div>
  `;

  const bannerTimers=new Map();
  const clearBannerExit=el=>{
    const pending=bannerTimers.get(el);
    if(!pending)return;
    clearTimeout(pending.timer);
    el.removeEventListener('transitionend',pending.onEnd);
    bannerTimers.delete(el);
  };
  const setBanner=(id,kind,msg)=>{
    const el=$('#'+id);
    if(!el)return;
    clearBannerExit(el);
    if(!msg){
      if(el.hidden){
        el.className='form-status-banner';
        el.textContent='';
        return;
      }
      el.classList.remove('is-visible');
      el.setAttribute('aria-hidden','true');
      const onEnd=e=>{
        if(e&&e.target!==el)return;
        if(e&&e.propertyName!=='opacity')return;
        clearBannerExit(el);
        if(!el.classList.contains('is-visible')){
          // Conserva el espacio ya ocupado para que el botón inferior no salte
          // mientras el usuario continúa editando el formulario.
          el.classList.add('is-reserved');
        }
      };
      el.addEventListener('transitionend',onEnd);
      const exitDuration=motion.isMotionReduced()?220:150;
      const timer=setTimeout(()=>onEnd(),exitDuration);
      bannerTimers.set(el,{timer,onEnd});
      return;
    }
    const wasVisible=el.classList.contains('is-visible');
    el.hidden=false;
    el.removeAttribute('aria-hidden');
    el.className=`form-status-banner is-${kind}${wasVisible?' is-visible':''}`;
    el.innerHTML=`<span aria-hidden="true">${kind==='success'?'✓':'!'}</span><span>${esc(msg)}</span>`;
    if(!wasVisible){
      requestAnimationFrame(()=>{
        el.classList.add('is-visible');
      });
    }
  };

  const personalInputs={
    name:$('#profile-name'),
    phone:$('#profile-phone'),
    contactEmail:$('#profile-contact-email')
  };
  const personalErrMap={
    name:$('#profile-name-error'),
    phone:$('#profile-phone-error'),
    contactEmail:$('#profile-contact-email-error')
  };

  Object.entries(personalInputs).forEach(([key,input])=>{
    input.addEventListener('input',()=>{
      input.removeAttribute('aria-invalid');
      personalErrMap[key].textContent='';
      setBanner('profile-personal-feedback','success','');
    });
    input.addEventListener('blur',()=>{
      const check=auth.validatePersonalProfile({
        name:personalInputs.name.value,
        phone:personalInputs.phone.value,
        contactEmail:personalInputs.contactEmail.value
      });
      if(check.fieldErrors[key]){
        input.setAttribute('aria-invalid','true');
        personalErrMap[key].textContent=check.fieldErrors[key];
      }
    });
  });

  $('#profile-personal-form').onsubmit=e=>{
    e.preventDefault();
    Object.entries(personalInputs).forEach(([k,el])=>{
      el.removeAttribute('aria-invalid');
      personalErrMap[k].textContent='';
    });
    const res=auth.updateOwnProfile(user.id,{
      name:personalInputs.name.value,
      phone:personalInputs.phone.value,
      contactEmail:personalInputs.contactEmail.value
    });
    if(!res.success){
      const errEntries=Object.entries(res.fieldErrors||{});
      errEntries.forEach(([k,msg])=>{
        if(personalInputs[k]){
          personalInputs[k].setAttribute('aria-invalid','true');
          personalErrMap[k].textContent=msg;
        }
      });
      const firstInvalid=errEntries[0]?.[0];
      if(firstInvalid&&personalInputs[firstInvalid])personalInputs[firstInvalid].focus();
      setBanner('profile-personal-feedback','error',res.error||'Revisa los datos personales ingresados.');
      return;
    }
    const updated=res.user;
    if($('#profile .avatar'))$('#profile .avatar').textContent=updated.avatar;
    if($('#profile .word b'))$('#profile .word b').textContent=updated.name;
    if($('#topbar-profile-link .avatar'))$('#topbar-profile-link .avatar').textContent=updated.avatar;
    if($('#topbar-profile-link .topbar-user-name'))$('#topbar-profile-link .topbar-user-name').textContent=updated.name;
    $('#profile-summary-avatar').textContent=updated.avatar;
    $('#profile-summary-name').textContent=updated.name;
    $('#profile-summary-phone').textContent=updated.phone;
    $('#profile-summary-contact-email').textContent=updated.contactEmail;
    personalInputs.name.value=updated.name;
    personalInputs.phone.value=updated.phone;
    personalInputs.contactEmail.value=updated.contactEmail;
    setBanner('profile-personal-feedback','success','Datos personales actualizados en esta demostración.');
    toast(`Perfil actualizado: ${updated.name}`);
  };

  document.querySelectorAll('.pw-toggle-btn[data-pw-target]').forEach(btn=>{
    btn.onclick=()=>{
      const target=$('#'+btn.dataset.pwTarget);
      if(!target)return;
      const show=target.type==='password';
      target.type=show?'text':'password';
      btn.setAttribute('aria-pressed',String(show));
      const baseLabel=btn.dataset.pwTarget==='pw-current'?'contraseña actual':btn.dataset.pwTarget==='pw-new'?'nueva contraseña':'confirmación de nueva contraseña';
      btn.setAttribute('aria-label',`${show?'Ocultar':'Mostrar'} ${baseLabel}`);
      btn.innerHTML=`${show?svg.eyeOff:svg.eye} ${show?'Ocultar':'Ver'}`;
    };
  });

  const pwCurrent=$('#pw-current');
  const pwNew=$('#pw-new');
  const pwConfirm=$('#pw-confirm');
  const refreshPwRules=()=>{
    const res=auth.evaluatePasswordPolicy(pwNew.value,pwConfirm.value,pwCurrent.value);
    $('#pw-rules').innerHTML=renderPasswordRulesHtml(res.checks);
  };
  [pwCurrent,pwNew,pwConfirm].forEach(el=>{
    el.addEventListener('input',()=>{
      el.removeAttribute('aria-invalid');
      const errEl=$('#'+el.id+'-error');
      if(errEl)errEl.textContent='';
      setBanner('profile-password-feedback','error','');
      refreshPwRules();
    });
  });

  $('#profile-password-form').onsubmit=e=>{
    e.preventDefault();
    ['pw-current','pw-new','pw-confirm'].forEach(fid=>{
      $('#'+fid).removeAttribute('aria-invalid');
      $('#'+fid+'-error').textContent='';
    });
    const res=auth.changeOwnPassword(user.id,{
      currentPassword:pwCurrent.value,
      newPassword:pwNew.value,
      confirmPassword:pwConfirm.value
    });
    if(!res.success){
      const fid=res.field==='new'?'pw-new':res.field==='confirm'?'pw-confirm':'pw-current';
      $('#'+fid).setAttribute('aria-invalid','true');
      $('#'+fid+'-error').textContent=res.error;
      $('#'+fid).focus();
      setBanner('profile-password-feedback','error',res.error);
      return;
    }
    pwCurrent.value='';
    pwNew.value='';
    pwConfirm.value='';
    ['pw-current','pw-new','pw-confirm'].forEach(fid=>{
      $('#'+fid).type='password';
    });
    document.querySelectorAll('.pw-toggle-btn[data-pw-target]').forEach(btn=>{
      btn.setAttribute('aria-pressed','false');
      const baseLabel=btn.dataset.pwTarget==='pw-current'?'contraseña actual':btn.dataset.pwTarget==='pw-new'?'nueva contraseña':'confirmación de nueva contraseña';
      btn.setAttribute('aria-label',`Mostrar ${baseLabel}`);
      btn.innerHTML=`${svg.eye} Ver`;
    });
    refreshPwRules();
    setBanner('profile-password-feedback','success','Contraseña simulada actualizada para esta demostración.');
    toast('Contraseña simulada actualizada correctamente.');
  };

  document.querySelectorAll('input[name="pref-theme"]').forEach(radio=>{
    radio.onchange=()=>{
      if(!radio.checked)return;
      const saved=saveUserPreferences(user.id,{theme:radio.value});
      document.querySelectorAll('[data-theme-card]').forEach(card=>{
        const selected=card.dataset.themeCard===saved.theme;
        card.classList.toggle('is-selected',selected);
        const tag=card.querySelector('.theme-selected-tag');
        if(tag)tag.textContent=selected?'✓ Activo':'Disponible';
      });
      const themeLabel=THEME_PRESETS.find(t=>t.id===saved.theme)?.name||'Verde clínico';
      if($('#pref-active-summary'))$('#pref-active-summary').textContent=`Tema: ${themeLabel}`;
      toast(`Tema aplicado: ${themeLabel}`);
    };
  });

  document.querySelectorAll('input[name="pref-text-size"]').forEach(radio=>{
    radio.onchange=()=>{
      if(!radio.checked)return;
      const saved=saveUserPreferences(user.id,{textSize:radio.value});
      document.querySelectorAll('input[name="pref-text-size"]').forEach(r=>{
        const wrap=r.closest('.choice-option');
        if(!wrap)return;
        wrap.classList.toggle('is-selected',r.checked);
        const tag=wrap.querySelector('.theme-selected-tag');
        if(tag)tag.textContent=r.checked?'✓ Activo':'Elegir';
      });
      toast(`Tamaño de texto: ${saved.textSize==='large'?'Grande':'Normal'}`);
    };
  });

  document.querySelectorAll('input[name="pref-reduced-motion"]').forEach(radio=>{
    radio.onchange=()=>{
      if(!radio.checked)return;
      const saved=saveUserPreferences(user.id,{reducedMotion:radio.value});
      document.querySelectorAll('input[name="pref-reduced-motion"]').forEach(r=>{
        const wrap=r.closest('.choice-option');
        if(!wrap)return;
        wrap.classList.toggle('is-selected',r.checked);
        const tag=wrap.querySelector('.theme-selected-tag');
        if(tag)tag.textContent=r.checked?'✓ Activo':'Elegir';
      });
      toast(`Reducir movimiento: ${saved.reducedMotion==='on'?'Activado':'Desactivado'}`);
    };
  });

  if(section==='preferencias'&&$('#perfil-preferencias')){
    requestAnimationFrame(()=>{
      $('#perfil-preferencias')?.scrollIntoView({behavior:effectiveReducedMotion(prefs)?'auto':'smooth',block:'start'});
      $('#pref-heading')?.focus({preventScroll:true});
    });
  }

  motion.animateModuleEntry('.profile-layout',{scope:'perfil',key:'layout',duration:240,distance:4});
}

function doctorConsultationView(user){
  const isAdmin = user.role === 'admin';
  const waitingPatients=appointments.filter(a=>a.date===today && (a.status==='En espera'||a.status==='Llegó'||(a.status==='Atendida'&&clinicalExams.some(e=>e.appointmentId===a.id)))).sort((a,b)=>a.time.localeCompare(b.time));
  const selectedAppId=Number(routeParams?.appId)||waitingPatients[0]?.id||null;
  const currentApp=appointments.find(a=>a.id===selectedAppId)||waitingPatients[0]||null;
  const p=currentApp?patient(currentApp.pid):null;
  const exam=currentApp?clinicalExams.find(e=>e.appointmentId===currentApp.id):null;
  const doctorName = currentApp?.doctor || (user.role === 'medico' ? user.name : 'Dra. Valeria Ríos');

  $('#view').innerHTML=`
    <div class="clinical-grid">
      <section class="panel">
        <div class="panelhead">
          <div>
            <h2>${svg.doctor} Cola de atención</h2>
            <p>${waitingPatients.length} pacientes listos para consulta</p>
          </div>
          <span class="badge green">En turno</span>
        </div>
        <div class="compact-list">
          ${waitingPatients.map(a=>{
            const isSel=a.id===currentApp?.id;
            const pt=patient(a.pid);
            return `
              <div class="clinical-queue-card ${isSel?'selected':''}" data-doctor-app="${a.id}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <b>${a.time} · ${esc(pt.name)}</b>
                  ${badge(a.status)}
                </div>
                <small style="color:var(--muted)">${esc(a.service)} · ${esc(a.doctor)} · DNI ${pt.doc}</small>
              </div>
            `;
          }).join('')||'<div class="empty">No hay pacientes en espera en este momento.</div>'}
        </div>
      </section>

      <div>
        ${currentApp&&p?`
          <section class="panel">
            <div class="panelhead">
              <div>
                <h2>${svg.stethoscope} Consulta médica: ${esc(p.name)}</h2>
                <p>DNI ${p.doc} · ${currentApp.time} · ${esc(currentApp.service)} · ${badge(currentApp.status)}</p>
              </div>
              <a class="linkbutton" href="#pacientes/${p.id}">Ver ficha clínica ↗</a>
            </div>

            <div style="padding:20px">
              ${isAdmin ? `
                <div class="note" style="margin-bottom:14px;background:#eef6f3;border-left:4px solid var(--forest);padding:10px 14px;border-radius:6px;font-size:13px;color:var(--forest)">
                  <b>Vista de supervisión. La edición clínica corresponde al médico tratante.</b>
                </div>
              ` : ''}

              <div class="clinical-exam-box">
                <div class="clinical-exam-title">
                  <span>${svg.eye} Exámenes preliminares registrados por Optometría</span>
                  <span class="badge ${exam?'green':'gold'}">${exam?'Completados':'Pendiente de técnico'}</span>
                </div>
                <p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">
                  Técnico a cargo: <b>${esc(exam?.technician||'Tec. Andrés Villacorta')}</b> · ${exam?.updatedAt||'Registro en tiempo real'}
                </p>

                <table class="refraction-table">
                  <thead>
                    <tr>
                      <th>Ojo</th>
                      <th>Esfera (SPH)</th>
                      <th>Cilindro (CYL)</th>
                      <th>Eje (AXIS)</th>
                      <th>Agudeza Visual (AV)</th>
                      <th>PIO (Tonometría)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><b>OD (Derecho)</b></td>
                      <td><input id="ref-od-sph" value="${esc(exam?.refractionOD?.sph||'-1.50')}" ${isAdmin?'disabled readonly':''}></td>
                      <td><input id="ref-od-cyl" value="${esc(exam?.refractionOD?.cyl||'-0.50')}" ${isAdmin?'disabled readonly':''}></td>
                      <td><input id="ref-od-axis" value="${esc(exam?.refractionOD?.axis||'180')}°" ${isAdmin?'disabled readonly':''}></td>
                      <td><input id="ref-od-av" value="${esc(exam?.refractionOD?.av||'20/20')}" ${isAdmin?'disabled readonly':''}></td>
                      <td><b class="tnum">${exam?.tonometryOD||15} mmHg</b> <small style="color:var(--forest)">Normal</small></td>
                    </tr>
                    <tr>
                      <td><b>OS (Izquierdo)</b></td>
                      <td><input id="ref-os-sph" value="${esc(exam?.refractionOS?.sph||'-1.75')}" ${isAdmin?'disabled readonly':''}></td>
                      <td><input id="ref-os-cyl" value="${esc(exam?.refractionOS?.cyl||'-0.75')}" ${isAdmin?'disabled readonly':''}></td>
                      <td><input id="ref-os-axis" value="${esc(exam?.refractionOS?.axis||'175')}°" ${isAdmin?'disabled readonly':''}></td>
                      <td><input id="ref-os-av" value="${esc(exam?.refractionOS?.av||'20/20')}" ${isAdmin?'disabled readonly':''}></td>
                      <td><b class="tnum">${exam?.tonometryOS||16} mmHg</b> <small style="color:var(--forest)">Normal</small></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <form id="doctor-consult-form" novalidate>
                <div class="field full" style="margin-bottom:14px">
                  <label for="doctor-diagnosis"><b>Impresión Diagnóstica (CIE-10 / Oftalmología)</b></label>
                  <input id="doctor-diagnosis" value="${esc(exam?.diagnosis||'Miopía leve y astigmatismo miópico bilateral. Fondo de ojo normal.')}" placeholder="Ej: Miopía simple OD/OS, Descarte de Glaucoma" ${isAdmin?'disabled readonly':''}>
                </div>

                <div class="field full" style="margin-bottom:18px">
                  <label for="doctor-plan"><b>Plan terapéutico, prescripción de lentes y tratamiento</b></label>
                  <textarea id="doctor-plan" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:8px;padding:10px;font-family:inherit;font-size:13.5px" ${isAdmin?'disabled readonly':''}>${esc(exam?.treatmentPlan||'Uso de lentes aéreos con filtro antirreflejante y protección digital para visión lejana y descanso. Lágrimas artificiales c/8h si hay resequedad. Control oftalmológico anual.')}</textarea>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:16px">
                  <div>
                    <span style="font-size:12px;color:var(--muted)">Médico tratante: <b>${esc(doctorName)}</b></span>
                  </div>
                  ${isAdmin ? `
                    <span class="badge blue" style="padding:8px 12px">Vista de supervisión (Solo lectura)</span>
                  ` : `
                    <button type="submit" class="primary" style="display:inline-flex;align-items:center;gap:6px">
                      ${svg.check} Guardar y Finalizar Atención Médica
                    </button>
                  `}
                </div>
              </form>
            </div>
          </section>
        `:`
          <div class="panel" style="padding:40px;text-align:center">
            <h3>No hay pacientes seleccionados</h3>
            <p style="color:var(--muted);margin-top:8px">Selecciona un paciente de la cola izquierda para comenzar su atención médica.</p>
          </div>
        `}
      </div>
    </div>
  `;

  if(motion.shouldAnimateModuleEntry('consulta','queue')){
    motion.animateStagger('.clinical-queue-card',{scope:'consulta',maxItems:6});
  }

  document.querySelectorAll('[data-doctor-app]').forEach(card=>{
    card.onclick=()=>{
      routeParams={appId:card.dataset.doctorApp};
      doctorConsultationView(user);
    };
  });

  if($('#doctor-consult-form') && !isAdmin){
    $('#doctor-consult-form').onsubmit=e=>{
      e.preventDefault();
      const diag=$('#doctor-diagnosis').value.trim();
      const plan=$('#doctor-plan').value.trim();
      if(!diag) return toast('Indica el diagnóstico clínico.');
      currentApp.status='Atendida';
      recordChange(currentApp,'Consulta médica finalizada',`${diag} · Tratamiento indicado.`);
      handleAppointmentAttended(currentApp);
      let existing=clinicalExams.find(ex=>ex.appointmentId===currentApp.id);
      if(!existing){
        existing={appointmentId:currentApp.id,patientId:currentApp.pid,doctor:user.name,technician:'Tec. Andrés Villacorta'};
        clinicalExams.push(existing);
      }
      existing.refractionOD={
        sph:($('#ref-od-sph')?.value||'-1.50').trim(),
        cyl:($('#ref-od-cyl')?.value||'-0.50').trim(),
        axis:($('#ref-od-axis')?.value||'180').replace(/°/g,'').trim(),
        av:($('#ref-od-av')?.value||'20/20').trim()
      };
      existing.refractionOS={
        sph:($('#ref-os-sph')?.value||'-1.75').trim(),
        cyl:($('#ref-os-cyl')?.value||'-0.75').trim(),
        axis:($('#ref-os-axis')?.value||'175').replace(/°/g,'').trim(),
        av:($('#ref-os-av')?.value||'20/20').trim()
      };
      existing.diagnosis=diag;
      existing.treatmentPlan=plan;
      existing.updatedAt=today+' '+new Date().toTimeString().slice(0,5);
      routeParams={appId:currentApp.id};
      render();
      toast('Atención médica registrada y cerrada con éxito.');
    };
  }
}

function technicianStudiesView(user){
  $('#view').innerHTML=`
    <div class="toolbar">
      ${search('Buscar paciente o tipo de estudio…')}
      <select id="technician-filter" aria-label="Filtrar por estado">
        <option value="Todos">Todos los estados</option>
        <option value="Pendiente">Pendientes de medición</option>
        <option value="En proceso">En proceso</option>
        <option value="Listo">Completados (Listo para médico)</option>
      </select>
    </div>

    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svg.flask} Cola de estudios oftalmológicos</h2>
          <p>Mediciones técnicas preliminares para la atención médica del día.</p>
        </div>
        <span class="badge blue">${preliminaryStudies.length} estudios en flujo</span>
      </div>

      <div class="studies-worklist" style="padding:16px">
        ${preliminaryStudies.filter(s=>{
          if(filter!=='Todas'&&filter!=='Todos'&&s.status!==filter) return false;
          return (s.patient+' '+s.type+' '+(s.notes||'')).toLowerCase().includes(query.toLowerCase());
        }).map(s=>`
          <div class="study-card-item">
            <div class="study-card-left">
              <span class="avatar">${initials(s.patient)}</span>
              <div class="study-card-meta">
                <h4>${esc(s.patient)}</h4>
                <p><b>${esc(s.type)}</b> (${s.eye}) · Médico solicitante: ${esc(s.doctor)}</p>
                <small style="color:var(--muted)">Observaciones: ${esc(s.notes||'Sin observaciones adicionales')}</small>
              </div>
            </div>
            <div class="study-actions">
              ${badge(s.status)}
              <button class="primary" data-study-id="${s.id}">
                ${s.status==='Listo'?'Modificar mediciones':'Registrar mediciones →'}
              </button>
            </div>
          </div>
        `).join('')||'<div class="empty">No hay estudios con los filtros seleccionados.</div>'}
      </div>
      <div class="footerline">Optometría y técnica: Los resultados quedan disponibles de inmediato en la pantalla de consulta del médico tratante.</div>
    </section>
  `;

  if(motion.shouldAnimateModuleEntry('estudios','list')){
    motion.animateStagger('.study-card-item',{scope:'estudios',maxItems:6});
  }

  $('#technician-filter').onchange=e=>{
    filter=e.target.value;
    technicianStudiesView(user);
  };

  document.querySelectorAll('[data-study-id]').forEach(btn=>{
    btn.onclick=()=>{
      const sid=Number(btn.dataset.studyId);
      const study=preliminaryStudies.find(s=>s.id===sid);
      if(!study) return;
      openModal(`Registrar mediciones: ${esc(study.type)}`, `
        <div class="person" style="margin-bottom:16px">
          <span class="avatar">${initials(study.patient)}</span>
          <div>
            <b>${esc(study.patient)}</b>
            <p>${esc(study.type)} · Ojo: ${study.eye}</p>
          </div>
        </div>
        <form id="study-measure-form" novalidate>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div>
              <label for="od-val"><b>Ojo Derecho (OD)</b></label>
              <input id="od-val" placeholder="Ej: 15 mmHg o -1.50 cil -0.50" value="15 mmHg" required>
            </div>
            <div>
              <label for="os-val"><b>Ojo Izquierdo (OS)</b></label>
              <input id="os-val" placeholder="Ej: 16 mmHg o -1.75 cil -0.75" value="16 mmHg" required>
            </div>
          </div>
          <div class="field full" style="margin-bottom:14px">
            <label for="study-notes">Notas técnicas / Calibración del equipo</label>
            <input id="study-notes" value="${esc(study.notes||'Medición con tonómetro de aplanación. Sin incidentes.')}">
          </div>
        </form>
      `, `
        <button id="cancel-study">Cancelar</button>
        <button class="primary" id="save-study" form="study-measure-form" type="submit">Marcar como Listo para Médico</button>
      `);

      $('#cancel-study').onclick=()=>$('#modal').close();
      $('#study-measure-form').onsubmit=e=>{
        e.preventDefault();
        study.status='Listo';
        study.notes=$('#study-notes').value.trim();
        $('#modal').close();
        technicianStudiesView(user);
        toast(`Mediciones guardadas. Estudio marcado como listo para ${study.doctor}.`);
      };
    };
  });
}

function render(){
  const motionWasReduced=motion.isMotionReduced();
  let user=auth.getSession();
  if(!user){
    const urlParams=new URLSearchParams(window.location.search);
    const testRole=urlParams.get('testUser')||urlParams.get('testRole');
    if(testRole){
      const targetUser=auth.USERS.find(u=>u.role===testRole||u.email.toLowerCase().includes(testRole.toLowerCase()));
      if(targetUser){
        auth.saveSession(targetUser);
        user=targetUser;
      }
    }else if(urlParams.get('testStep')==='otp'){
      authStep=2;
      authSelectedEmail='v.rios@clinicaoftalmo.pe';
      authOtpResult=auth.requestOtp(authSelectedEmail);
    }
  }
  if(!user){
    closeCommandPalette({restoreFocus:false});
    hideCollapsedTooltip();
    const publicHash=location.hash.slice(1).split('?')[0];
    document.body.classList.toggle('is-public-tv',publicHash==='pantalla-turnos');
    if(publicHash==='autoservicio'||publicHash==='pantalla-turnos'){
      applyPreferencesToDom(DEFAULT_PREFS);
      clearPublicNotice();
      window.scrollTo(0,0);
      if(publicHash==='autoservicio'){
        renderKioskView($('#app'),{patients,appointments,today,session:null,getDefaultRoute:auth.getDefaultRoute,openModal,clearNotice:clearPublicNotice});
      }else{
        if($('#modal')?.open)$('#modal').close();
        renderPublicDisplayView($('#app'),{session:null,getDefaultRoute:auth.getDefaultRoute,clearNotice:clearPublicNotice});
      }
      return;
    }
    applyPreferencesToDom(DEFAULT_PREFS);
    authView();
    return;
  }
  const signedPublicHash=location.hash.slice(1).split('?')[0];
  document.body.classList.toggle('is-public-tv',signedPublicHash==='pantalla-turnos');
  if(signedPublicHash==='autoservicio'||signedPublicHash==='pantalla-turnos'){
    closeCommandPalette({restoreFocus:false});
    hideCollapsedTooltip();
    if($('#mobile-nav-dialog')?.open)$('#mobile-nav-dialog').close();
    applyPreferencesToDom(signedPublicHash==='pantalla-turnos'?DEFAULT_PREFS:getUserPreferences(user.id));
    clearPublicNotice();
    window.scrollTo(0,0);
    if(signedPublicHash==='autoservicio'){
      renderKioskView($('#app'),{patients,appointments,today,session:user,getDefaultRoute:auth.getDefaultRoute,openModal,clearNotice:clearPublicNotice});
    }else{
      if($('#modal')?.open)$('#modal').close();
      renderPublicDisplayView($('#app'),{session:user,getDefaultRoute:auth.getDefaultRoute,clearNotice:clearPublicNotice});
    }
    return;
  }
  document.body.classList.remove('is-public-tv');
  applyPreferencesToDom(getUserPreferences(user.id));

  const rawHash=location.hash.slice(1);
  let patientDetailId=null;
  let profileSection='general';
  if(rawHash.startsWith('pacientes/')||rawHash.startsWith('paciente/')){
    const pid=Number(rawHash.split('/')[1]);
    if(pid&&patient(pid)){
      route='paciente-detalle';
      patientDetailId=pid;
    }else{
      route='pacientes';
      history.replaceState(null,'','#pacientes');
    }
  }else if(rawHash.startsWith('perfil')){
    route='perfil';
    profileSection=rawHash==='perfil/preferencias'?'preferencias':'general';
  }else if(rawHash.startsWith('crm/')){
    route='crm';
  }else if(rawHash.startsWith('inbox')){
    route='inbox';
  }else if(rawHash.startsWith('arm')){
    route='arm';
  }else if(rawHash.startsWith('automations')){
    route='automations';
  }else if(rawHash.startsWith('caja')){
    route='caja';
    const parts=rawHash.split('/');
    if(parts[1]==='cuadre')cashTab='reconciliation';
    else if(parts[1]==='movimientos')cashTab='paid';
    else if(parts[1]==='por-cobrar')cashTab='pending';
  }else if(rawHash.startsWith('consulta')){
    route='consulta';
  }else if(rawHash.startsWith('estudios')){
    route='estudios';
  }else if(rawHash.startsWith('turnos-recepcion')){
    route='turnos-recepcion';
  }else if(rawHash.startsWith('turnos-caja')){
    route='turnos-caja';
  }else if(rawHash.startsWith('turnos-supervision')){
    route='turnos-supervision';
  }else{
    route=rawHash||auth.getDefaultRoute(user.role);
  }

  // Protección de rutas por Rol (Route Guard)
  if(!auth.canAccess(user.role,route)){
    if(route==='automations'||route==='arm'){
      recordAutomationAudit({type:'unauthorized_attempt',role:user.role,actorName:user.name||user.roleLabel,entityType:'route',entityId:'#'+route,entityName:'Acceso a #'+route,result:'Denegado',summary:`Navegación bloqueada hacia #${route} para el rol ${user.role}.`});
    }
    const defaultRoute=auth.getDefaultRoute(user.role);
    route=defaultRoute;
    history.replaceState(null,'','#'+defaultRoute);
    toast(`Acceso restringido para ${user.roleLabel}. Redirigido a tu módulo.`);
  }

  if(currentRenderRoute&&currentRenderRoute!==route){
    motion.resetMotionScope(currentRenderRoute);
    motion.resetMotionScope(route);
  }
  currentRenderRoute=route;

  const navGroups=getNavGroupsForRole(user.role);
  const nav=navGroups.flatMap(g=>g.items);
  const mobilePrimaryIds={
    admin:['dashboard','agenda','pacientes','inbox'],
    recepcion:['dashboard','agenda','pacientes','inbox'],
    medico:['agenda','consulta','pacientes'],
    tecnico:['estudios','pacientes'],
    caja:['caja','turnos-caja']
  }[user.role]||[];
  const mobilePrimary=mobilePrimaryIds.map(id=>nav.find(item=>item[0]===id)).filter(Boolean);
  const mobileMore=nav.filter(([id])=>!mobilePrimaryIds.includes(id));

  let [title,sub]=titles[route]||['Ficha del paciente','Expediente y registro operativo de atención.'];
  if(user.role==='admin'&&route==='dashboard'){
    title='Panel general';
    sub='Resumen operativo y supervisión de la clínica.';
  }
  if(user.role==='medico'&&route==='agenda'){
    title='Mi agenda médica';
    sub='Citas asignadas a tu consulta y flujo de atención clínica.';
  }
  document.title=`${title} | Clínica oftalmológica`;
  const eyebrow=(route==='perfil')?'CUENTA PERSONAL':(route==='crm'||route==='inbox'||route==='caja')?'NEGOCIO':(route==='consulta'||route==='estudios')?'CLÍNICA':(route==='paciente-detalle')?'EXPEDIENTE DEL PACIENTE':(route==='arm'||route==='automations'||route.startsWith('admin-'))?'ADMINISTRACIÓN':'OPERACIÓN';

  const canCreateAppointment=['admin','recepcion'].includes(user.role);
  const canCreatePatient=['admin','recepcion'].includes(user.role);
  const showNewBtn = (route==='agenda'&&canCreateAppointment) ||
                     (route==='pacientes'&&canCreatePatient) ||
                     (route==='crm'&&['admin','recepcion'].includes(user.role)) ||
                     (route==='caja'&&['admin','caja'].includes(user.role)) ||
                     (route.startsWith('admin-')&&user.role==='admin');

  const newBtnLabel = route==='agenda'?'Nueva cita':route==='pacientes'?'Registrar paciente':route==='crm'?'Nuevo prospecto':route==='caja'?'Registrar cobro':route==='admin-medicos'?'Nuevo médico':route==='admin-tecnicos'?'Nuevo técnico':route==='admin-usuarios'?'Nuevo usuario':route==='admin-servicios'?'Nuevo servicio':'';

  const isWfRoute = route === 'automations';
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('is-wf-route', isWfRoute);
    if (!isWfRoute) document.body.classList.remove('is-wf-presentation');
  }
  if (typeof window !== 'undefined') {
    if (!isWfRoute || window.innerWidth > 960 || window.innerWidth <= 680) {
      window.__wfTabletCollapsedApplied = false;
    } else if (!window.__wfTabletCollapsedApplied) {
      collapsed = true;
      window.__wfTabletCollapsedApplied = true;
    }
  }

  hideCollapsedTooltip();

  $('#app').innerHTML=`
    <div class="shell ${collapsed?'collapsed':''}">
      <aside>
        <div class="brand">
          <span class="eye"></span>
          <span class="word">Clínica<span style="color:#f6c464">.</span></span>
        </div>
        <search class="sidebar-search-wrap" aria-label="Búsqueda rápida global">
          <button type="button" class="sidebar-search-btn" id="sidebar-search-btn" aria-label="Buscar módulos, pacientes, citas o acciones (Control + K)" title="Buscar (Ctrl+K)" data-tooltip="Buscar (Ctrl+K)">
            <span class="icon" aria-hidden="true">${svg.search}</span>
            <span class="word sidebar-search-text">Buscar</span>
            <kbd class="word sidebar-search-kbd">Ctrl+K</kbd>
          </button>
        </search>
        <button class="collapse" id="collapse" aria-label="${collapsed?'Expandir':'Contraer'} menú" aria-expanded="${!collapsed}" title="${collapsed?'Expandir menú':'Contraer menú'}" data-tooltip="${collapsed?'Expandir menú':'Contraer menú'}">
          ${svg.menu} <span class="word">${collapsed?'Expandir':'Contraer'} menú</span>
        </button>
        <nav aria-label="Módulos de la clínica">
          ${navGroups.map(group=>{
            const groupActive=group.items.some(([id])=>route===id||(route==='paciente-detalle'&&id==='pacientes'));
            const links=group.items.map(([id,icon,name])=>{
              const isActive=route===id||(route==='paciente-detalle'&&id==='pacientes');
              return `<a href="#${id}" class="${isActive?'active':''}" ${isActive?'aria-current="page"':''} aria-label="${name}" title="${name}" data-label="${name}" data-tooltip="${name}">
                <span class="icon" aria-hidden="true">${icon}</span>
                <span class="word">${name}</span>
              </a>`;
            }).join('');
            const groupOpen=collapsed||group.defaultOpen||groupActive;
            if(group.collapsible)return `<details class="navgroup ${groupActive?'current':''}" data-nav-group="${group.name}" data-nav-mode="${group.secondary?'secondary':'primary'}" ${groupOpen?'open':''}>
              <summary><span>${group.name}</span><i aria-hidden="true">›</i></summary>
              <div class="navgroup-items">${links}</div>
            </details>`;
            return `<div class="navlabel">${group.name}</div><div class="navgroup-items navgroup-static">${links}</div>`;
          }).join('')}
        </nav>
        <div class="sidebarbottom">
          <button type="button" class="profile" id="profile" aria-haspopup="menu" aria-expanded="false" aria-controls="profilemenu" aria-label="${esc(user.name)} · ${esc(user.roleLabel)} · Opciones de perfil" title="${esc(user.name)} · ${esc(user.roleLabel)}" data-tooltip="${esc(user.name)} · ${esc(user.roleLabel)}">
            <span class="avatar">${esc(user.avatar)}</span>
            <span class="word">
              <b>${esc(user.name)}</b>
              <span class="role-badge role-badge-${user.role}">${esc(user.roleLabel)}</span>
            </span>
          </button>
          <div class="profilemenu" id="profilemenu" role="menu" aria-label="Menú personal de usuario" hidden>
            <button type="button" role="menuitem" data-action="profile">${svg.doctor} Mi perfil</button>
            <button type="button" role="menuitem" data-action="preferences">${svg.eye} Preferencias</button>
            <div class="profilemenu-sep" role="separator"></div>
            <button type="button" role="menuitem" data-action="session">${svg.logOut} Cerrar sesión</button>
          </div>
        </div>
      </aside>

      <nav class="mobile-tabbar" aria-label="Navegación rápida" style="--mobile-items:${mobilePrimary.length+(mobileMore.length?1:0)}">
        ${mobilePrimary.map(([id,icon,name])=>{
          const isActive=route===id||(route==='paciente-detalle'&&id==='pacientes');
          const shortName=id==='dashboard'?'Inicio':id==='pacientes'?'Pacientes':id==='consulta'?'Atención':id==='estudios'?'Estudios':name.split(' ')[0];
          return `<a href="#${id}" class="${isActive?'active':''}" ${isActive?'aria-current="page"':''}><span aria-hidden="true">${icon}</span><small>${shortName}</small></a>`;
        }).join('')}
        ${mobileMore.length?`<button id="mobile-more" class="${mobileMore.some(([id])=>route===id)?'active':''}" aria-haspopup="dialog" aria-controls="mobile-nav-dialog">${svg.menu}<small>Más</small></button>`:''}
      </nav>
      ${mobileMore.length?`<dialog class="mobile-nav-dialog" id="mobile-nav-dialog" aria-labelledby="mobile-nav-title">
        <header><div><span class="agenda-kicker">NAVEGACIÓN</span><h2 id="mobile-nav-title">Más módulos</h2></div><button id="mobile-nav-close" aria-label="Cerrar menú">×</button></header>
        <div class="mobile-more-links"><button type="button" id="mobile-more-search" class="mobile-more-search-btn">${svg.search}<span>Buscador global y acciones</span><kbd>/</kbd></button>${navGroups.map(group=>{
          const items=group.items.filter(([id])=>!mobilePrimaryIds.includes(id));
          return items.length?`<section><h3>${group.name}</h3>${items.map(([id,icon,name])=>`<a href="#${id}" class="${route===id?'active':''}" ${route===id?'aria-current="page"':''}><span aria-hidden="true">${icon}</span><b>${name}</b></a>`).join('')}</section>`:'';
        }).join('')}<section><h3>CUENTA</h3><a href="#perfil" class="${route==='perfil'&&profileSection==='general'?'active':''}"><span aria-hidden="true">${svg.doctor}</span><b>Mi perfil</b></a><a href="#perfil/preferencias" class="${route==='perfil'&&profileSection==='preferencias'?'active':''}"><span aria-hidden="true">${svg.eye}</span><b>Preferencias</b></a></section></div>
      </dialog>`:''}

      <main>
        <header class="topbar">
          <div>
            <b>Clínica oftalmológica</b><small> &nbsp; / &nbsp; Sede principal</small>
          </div>
          <div class="topbar-user">
            <button type="button" class="topbar-search-btn" id="topbar-search-btn" aria-label="Buscar o abrir paleta de comandos (Control + K)" title="Buscar módulos, pacientes, citas o acciones (Ctrl+K o /)">
              ${svg.search}<span>Buscar</span><kbd class="topbar-search-kbd">Ctrl+K</kbd>
            </button>
            ${(user.role==='admin'||user.id===1)?'<button class="reset-demo-btn" id="topbar-reset-demo" title="Restablecer datos demo al escenario inicial">↺ Restablecer demo</button>':''}
            <a href="#perfil" id="topbar-profile-link" class="topbar-profile-link ${route==='perfil'?'active':''}" ${route==='perfil'?'aria-current="page"':''} title="Abrir Mi perfil y preferencias">
              <span class="avatar" aria-hidden="true">${esc(user.avatar)}</span>
              <span class="topbar-user-info">
                <span class="topbar-user-name">${esc(user.name)}</span>
                <span class="topbar-user-role">${esc(user.roleLabel)}</span>
              </span>
            </a>
            <button class="logout-icon-btn" id="topbar-logout" title="Cerrar sesión">${svg.logOut} Salir</button>
          </div>
        </header>

        <div class="content">
          <div class="eyebrow">${eyebrow}</div>
          <div class="heading">
            <div>
              <h1>${title}</h1>
              <p>${sub}</p>
            </div>
            <div class="heading-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${(user.role==='recepcion'||user.role==='caja')?'<button id="role-workflows-btn" type="button">Flujos y tareas asignadas</button>':''}
              ${showNewBtn?`<button class="primary" id="new">${svg.plus} ${newBtnLabel}</button>`:''}
            </div>
          </div>
          <div id="view"></div>
        </div>
      </main>
    </div>
  `;

  motion.animateModuleEntry('.heading',{scope:route,key:'heading',duration:280,distance:6});

  const collapseBtn=$('#collapse');
  if(collapseBtn){
    collapseBtn.onclick=()=>{
      if(activeCollapseTransition){
        try{activeCollapseTransition.skipTransition();}catch{}
        activeCollapseTransition=null;
      }
      const applyCollapsedState=()=>{
        collapsed=!collapsed;
        syncSidebarCollapsedUi();
      };
      if(motion.isMotionReduced()||typeof document.startViewTransition!=='function'){
        applyCollapsedState();
        return;
      }
      try{
        const vt=document.startViewTransition(()=>{
          applyCollapsedState();
        });
        activeCollapseTransition=vt;
        vt.finished.finally(()=>{
          if(activeCollapseTransition===vt)activeCollapseTransition=null;
        });
      }catch{
        applyCollapsedState();
      }
    };
  }
  if($('#sidebar-search-btn'))$('#sidebar-search-btn').onclick=()=>openCommandPalette($('#sidebar-search-btn'));
  if($('#topbar-search-btn'))$('#topbar-search-btn').onclick=()=>openCommandPalette($('#topbar-search-btn'));
  let mobileNavCloseTimer=null;
  const openMobileNavDialog=()=>{
    const d=$('#mobile-nav-dialog');
    if(!d)return;
    if(mobileNavCloseTimer){
      clearTimeout(mobileNavCloseTimer);
      mobileNavCloseTimer=null;
    }
    if(d.open)return;
    d.showModal();
    if(motion.isMotionReduced()){
      d.classList.add('is-open');
    }else{
      requestAnimationFrame(()=>{
        d.classList.add('is-open');
      });
    }
  };

  const closeMobileNavDialog=(callback=null)=>{
    const d=$('#mobile-nav-dialog');
    if(!d||!d.open){
      if(typeof callback==='function')callback();
      return;
    }
    if(mobileNavCloseTimer){
      clearTimeout(mobileNavCloseTimer);
      mobileNavCloseTimer=null;
    }
    d.classList.remove('is-open');
    if(motion.isMotionReduced()){
      try{d.close();}catch{}
      if(typeof callback==='function')callback();
      return;
    }
    const onEnd=e=>{
      if(e&&e.target!==d)return;
      d.removeEventListener('transitionend',onEnd);
      if(mobileNavCloseTimer){
        clearTimeout(mobileNavCloseTimer);
        mobileNavCloseTimer=null;
      }
      try{if(d.open)d.close();}catch{}
      if(typeof callback==='function')callback();
    };
    d.addEventListener('transitionend',onEnd);
    mobileNavCloseTimer=setTimeout(onEnd,180);
  };

  const mobileNavDialogEl=$('#mobile-nav-dialog');
  if(mobileNavDialogEl){
    mobileNavDialogEl.addEventListener('close',()=>{
      if(mobileNavCloseTimer){
        clearTimeout(mobileNavCloseTimer);
        mobileNavCloseTimer=null;
      }
      mobileNavDialogEl.classList.remove('is-open');
    });
    mobileNavDialogEl.addEventListener('click',e=>{
      if(e.target===mobileNavDialogEl){
        closeMobileNavDialog();
      }
    });
  }

  if($('#mobile-more'))$('#mobile-more').onclick=()=>openMobileNavDialog();
  if($('#mobile-nav-close'))$('#mobile-nav-close').onclick=()=>closeMobileNavDialog();
  if($('#mobile-more-search'))$('#mobile-more-search').onclick=()=>{
    closeMobileNavDialog(()=>{
      openCommandPalette($('#topbar-search-btn')||$('#mobile-more'));
    });
  };
  document.querySelectorAll('.mobile-more-links a').forEach(link=>link.onclick=()=>closeMobileNavDialog());
  syncCollapsedTooltipHandlers();
  document.querySelectorAll('.navgroup').forEach(group=>group.addEventListener('toggle',()=>{
    if(collapsed||!group.open||group.dataset.navMode!=='secondary')return;
    document.querySelectorAll('.navgroup[data-nav-mode="secondary"][open]').forEach(other=>{if(other!==group)other.open=false;});
  }));

  if(profileMenuDocClick){
    document.removeEventListener('click',profileMenuDocClick);
    profileMenuDocClick=null;
  }

  const profileBtn=$('#profile');
  const profileMenu=$('#profilemenu');
  const profileItems=Array.from(profileMenu.querySelectorAll('[role="menuitem"]'));

  let profileCloseTimer=null;
  const setProfileMenuOpen=(open,{focusIndex=null,returnFocus=false,immediate=false}={})=>{
    if(profileCloseTimer){
      clearTimeout(profileCloseTimer);
      profileCloseTimer=null;
    }
    profileBtn.setAttribute('aria-expanded',String(open));
    if(open){
      hideCollapsedTooltip();
      profileMenu.hidden=false;
      if(motion.isMotionReduced()){
        profileMenu.classList.add('is-open');
      }else{
        requestAnimationFrame(()=>{
          profileMenu.classList.add('is-open');
        });
      }
      if(focusIndex!==null&&profileItems[focusIndex]){
        profileItems[focusIndex].focus();
      }
    }else{
      profileMenu.classList.remove('is-open');
      if(immediate||motion.isMotionReduced()){
        profileMenu.hidden=true;
      }else{
        const onEnd=e=>{
          if(e&&e.target!==profileMenu)return;
          profileMenu.removeEventListener('transitionend',onEnd);
          if(profileCloseTimer){
            clearTimeout(profileCloseTimer);
            profileCloseTimer=null;
          }
          if(!profileMenu.classList.contains('is-open')){
            profileMenu.hidden=true;
          }
        };
        profileMenu.addEventListener('transitionend',onEnd);
        profileCloseTimer=setTimeout(onEnd,140);
      }
      if(returnFocus){
        profileBtn.focus();
      }
    }
  };

  profileBtn.onclick=e=>{
    e.stopPropagation();
    const isCurrentlyOpen=!profileMenu.hidden&&profileMenu.classList.contains('is-open');
    const nextOpen=!isCurrentlyOpen;
    setProfileMenuOpen(nextOpen,{focusIndex:nextOpen?0:null});
  };

  profileBtn.onkeydown=e=>{
    if(e.key==='ArrowDown'){
      e.preventDefault();
      setProfileMenuOpen(true,{focusIndex:0});
    }else if(e.key==='ArrowUp'){
      e.preventDefault();
      setProfileMenuOpen(true,{focusIndex:profileItems.length-1});
    }else if(e.key==='Escape'&&(!profileMenu.hidden||profileMenu.classList.contains('is-open'))){
      e.preventDefault();
      setProfileMenuOpen(false,{returnFocus:true,immediate:true});
    }
  };

  profileMenu.onkeydown=e=>{
    const idx=profileItems.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){
      e.preventDefault();
      profileItems[(idx+1)%profileItems.length]?.focus();
    }else if(e.key==='ArrowUp'){
      e.preventDefault();
      profileItems[(idx-1+profileItems.length)%profileItems.length]?.focus();
    }else if(e.key==='Home'){
      e.preventDefault();
      profileItems[0]?.focus();
    }else if(e.key==='End'){
      e.preventDefault();
      profileItems[profileItems.length-1]?.focus();
    }else if(e.key==='Escape'){
      e.preventDefault();
      setProfileMenuOpen(false,{returnFocus:true,immediate:true});
    }else if(e.key==='Tab'){
      setProfileMenuOpen(false,{immediate:true});
    }
  };

  profileMenuDocClick=e=>{
    if(!profileMenu.hidden&&!profileMenu.contains(e.target)&&e.target!==profileBtn&&!profileBtn.contains(e.target)){
      setProfileMenuOpen(false);
    }
  };
  document.addEventListener('click',profileMenuDocClick);

  const performLogout=()=>{
    auth.clearSession();
    authStep=1;
    authLoginMode='otp';
    applyPreferencesToDom(DEFAULT_PREFS);
    location.hash='';
    setProfileMenuOpen(false,{immediate:true});
    render();
    toast('Sesión cerrada correctamente.');
  };

  profileItems.forEach(b=>b.onclick=()=>{
    const act=b.dataset.action;
    setProfileMenuOpen(false,{immediate:true});
    if(act==='profile'){
      if(location.hash==='#perfil')render();
      else location.hash='#perfil';
    }else if(act==='preferences'){
      if(location.hash==='#perfil/preferencias')render();
      else location.hash='#perfil/preferencias';
    }else if(act==='session'){
      performLogout();
    }
  });

  if($('#topbar-reset-demo')){
    $('#topbar-reset-demo').onclick=()=>confirmResetDemo();
  }
  if($('#role-workflows-btn')){
    $('#role-workflows-btn').onclick=()=>openRoleWorkflowsModal({user:auth.getSession(),toast,openModal});
  }

  if($('#topbar-logout')){
    $('#topbar-logout').onclick=()=>performLogout();
  }

  if(route==='dashboard')receptionDashboard();
  if(route==='agenda')agenda();
  if(route==='pacientes')patientList();
  if(route==='paciente-detalle')patientDetailView(patientDetailId);
  if(route==='caja')cash();
  if(route==='crm')crm();
  if(route==='inbox')inbox();
  if(route!=='automations')cleanupAutomationsRuntime();
  if(route==='arm')armCenter();
  if(route==='automations')automationsView();
  if(route==='consulta')doctorConsultationView(user);
  if(route==='estudios')technicianStudiesView(user);
  if(route==='admin-medicos')adminDoctorsView();
  if(route==='admin-tecnicos')adminTechniciansView();
  if(route==='admin-usuarios')adminUsersView();
  if(route==='admin-servicios')adminServicesView();
  if(route==='turnos-recepcion')renderReceptionTurnsView($('#view'),{
    user,
    appointments,
    onAppointmentUpdated:(app,prev)=>recordChange(app,'Llegada validada desde turno presencial',`${prev} → Llegó`),
    onTransferToCashOrder:appId=>{
      const a=appointments.find(x=>x.id===Number(appId));
      if(a&&!a.paid){a.order=true;a.reference=a.reference||`OP-${String(a.id).padStart(4,'0')}`;}
    },
    openModal,
    toast
  });
  if(route==='turnos-caja')renderCashTurnsView($('#view'),{
    user,
    appointments,
    onOpenOrder:appId=>{
      const a=appointments.find(x=>x.id===Number(appId));
      if(a)receipt(a);
    },
    onRegisterPayment:appId=>payModal(Number(appId)),
    openModal,
    toast
  });
  if(route==='turnos-supervision')renderAdminTurnsView($('#view'),{user,openModal,toast});
  if(route==='perfil')profileView(user,profileSection);
  if(!motionWasReduced)motion.showModuleLoading($('#view'),{scope:route});

  if($('#new'))$('#new').onclick=()=>{
    if(route==='pacientes')patientForm();
    else if(route==='crm')window.dispatchEvent(new CustomEvent('crm:newlead'));
    else if(route==='caja')payModal();
    else if(route==='admin-medicos')doctorForm();
    else if(route==='admin-tecnicos')technicianForm();
    else if(route==='admin-usuarios')userForm();
    else if(route==='admin-servicios')serviceForm();
    else appointmentForm();
  };

  bindSearch();
  if(pendingCommandAction){
    const runAction=pendingCommandAction;
    pendingCommandAction=null;
    runAction();
  }
}
function bindSearch(){if(!$('#search'))return;$('#search').oninput=e=>{query=e.target.value;$('#clear').hidden=!query;updateResults()};$('#clear').onclick=()=>{query='';$('#search').value='';$('#clear').hidden=true;updateResults();$('#search').focus()}}
function updateResults(){
  if(route==='pacientes')patientRows();
  else if(route==='caja')cashRows();
  else if(route==='admin-medicos')adminDoctorRows();
  else if(route==='admin-tecnicos')adminTechnicianRows();
  else if(route==='admin-usuarios')adminUserRows();
  else if(route==='admin-servicios')adminServiceRows();
  else if(route==='agenda')renderAgendaCanvas();
  else appointmentRows();
}
function stats(){const user=auth.getSession();const isAdmin=user&&user.role==='admin';const list=appointments.filter(a=>a.date===date&&a.status!=='Cancelada');const arrivedOrWaiting=list.filter(a=>a.status==='En espera'||a.status==='Llegó');const pending=list.filter(a=>a.status==='Programada');const leadsCount=getLeadsSummary().length;return `<div class="stats"><div class="stat tone-success"><div class="stat-head"><span>Citas de hoy</span><div class="stat-icon">${svg.calendar}</div></div><strong data-motion-key="dashboard:citas-hoy">${list.length.toString().padStart(2,'0')}</strong><small>${arrivedOrWaiting.length} en sede · ${list.length-arrivedOrWaiting.length} por llegar</small></div><div class="stat"><div class="stat-head"><span>Pacientes activos</span><div class="stat-icon">${svg.users}</div></div><strong data-motion-key="dashboard:pacientes-activos">${patients.filter(p=>p.active!==false).length.toString().padStart(2,'0')}</strong><small>Expedientes en clínica</small></div><div class="stat ${pending.length?'tone-warning':''}"><div class="stat-head"><span>Por confirmar</span><div class="stat-icon">${svg.alert}</div></div><strong data-motion-key="dashboard:por-confirmar">${pending.length.toString().padStart(2,'0')}</strong><small>${pending.length?(isAdmin?'Pendientes de confirmación':'Seguimiento de recepción'):'Todas confirmadas'}</small></div><div class="stat tone-accent"><div class="stat-head"><span>Prospectos en CRM</span><div class="stat-icon">${svg.crm}</div></div><strong data-motion-key="dashboard:prospectos-crm">${leadsCount.toString().padStart(2,'0')}</strong><small>Seguimientos en curso</small></div></div>`}

function doctorMatchNames(user){
  if(!user)return [];
  const orig=auth.INITIAL_USERS.find(u=>u.id===user.id)?.name;
  return [user.name,orig].filter(Boolean);
}

function doctorAgendaStats(user){
  const names=doctorMatchNames(user);
  const myApps = appointments.filter(a=>a.date===date&&a.status!=='Cancelada'&&(a.doctor===user.name||names.includes(a.doctor)));
  const waiting = myApps.filter(a=>a.status==='En espera'||a.status==='Llegó');
  const attended = myApps.filter(a=>a.status==='Atendida');
  const pending = myApps.filter(a=>['Programada','Confirmada'].includes(a.status));
  return `<div class="stats">
    <div class="stat tone-success"><div class="stat-head"><span>Mis citas de hoy</span><div class="stat-icon">${svg.calendar}</div></div><strong data-motion-key="agenda:mis-citas">${myApps.length.toString().padStart(2,'0')}</strong><small>Turno asignado</small></div>
    <div class="stat tone-accent"><div class="stat-head"><span>En espera / Llegó</span><div class="stat-icon">${svg.doctor}</div></div><strong data-motion-key="agenda:en-espera">${waiting.length.toString().padStart(2,'0')}</strong><small>Listos para consulta</small></div>
    <div class="stat ${pending.length?'tone-warning':''}"><div class="stat-head"><span>Por ingresar</span><div class="stat-icon">${svg.clock}</div></div><strong data-motion-key="agenda:por-ingresar">${pending.length.toString().padStart(2,'0')}</strong><small>Próximos turnos</small></div>
    <div class="stat"><div class="stat-head"><span>Atendidas</span><div class="stat-icon">${svg.check}</div></div><strong data-motion-key="agenda:atendidas">${attended.length.toString().padStart(2,'0')}</strong><small>Consultas concluidas</small></div>
  </div>`;
}

function formatDashboardPersonName(name){
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length===0)return 'Sin identificar';
  if(parts.length===1)return parts[0];
  return `${parts[0]} ${parts.slice(1).map(p=>p[0].toUpperCase()+'.').join(' ')}`;
}

function maskDashboardDoc(doc){
  const clean=String(doc||'').trim();
  if(!clean)return '••••';
  if(clean.length<=4)return '•'.repeat(Math.max(2,clean.length));
  return `${'•'.repeat(clean.length-4)}${clean.slice(-4)}`;
}

function receptionDashboard(){
  const user=auth.getSession();
  const isAdmin=user&&user.role==='admin';
  if(isAdmin){
    renderExecutiveDashboardView($('#view'), dashboardState, svg, {
      supervisionNote: 'Panel de supervisión de Administración. Acceso integral a operación, finanzas, catálogos y consulta clínica en modo lectura.',
      onFilterChange: ()=>receptionDashboard(),
      onTabChange: ()=>receptionDashboard()
    });
    return;
  }
  const list=appointments.filter(a=>a.date===today&&a.status!=='Cancelada').sort((a,b)=>a.time.localeCompare(b.time));
  const waiting=list.filter(a=>a.status==='En espera');
  const arrived=list.filter(a=>a.status==='Llegó');
  const pendingConfirm=list.filter(a=>a.status==='Programada');
  const nextApp=list.find(a=>['Programada','Confirmada','Llegó','En espera'].includes(a.status));
  const leadsSummary=getLeadsSummary();
  const leadsList=leadsSummary.slice(0,3);
  const leadsCount=leadsSummary.length;
  const dateFormatted=new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(today+'T12:00:00')).toUpperCase();
  const heroBanner=`<section class="iris-band"><div class="iris-inner"><div class="iris-content"><span class="iris-date">${dateFormatted}</span><h2 class="iris-title">${nextApp?`Siguiente: ${esc(formatDashboardPersonName(patient(nextApp.pid).name))}`:'Agenda del día al día'}</h2><p class="iris-desc">${nextApp?`${esc(nextApp.service)} · ${nextApp.time} · ${esc(nextApp.doctor)}`:'No quedan citas pendientes hoy. Puedes adelantar confirmaciones o revisar el CRM de prospectos.'}</p><div class="iris-actions"><a class="iris-btn-light" href="#agenda">${svg.calendar} Abrir agenda del día</a><a class="iris-btn-outline" href="#crm">${svg.crm} Seguimiento CRM</a></div></div><dl class="iris-metrics"><div class="iris-metric"><dt>En espera</dt><dd>${waiting.length}</dd></div><div class="iris-metric"><dt>Llegaron</dt><dd>${arrived.length}</dd></div><div class="iris-metric"><dt>Por confirmar</dt><dd>${pendingConfirm.length}</dd></div></dl></div></section>`;
  const dashboardNote='Panel operativo de Recepción. Los cobros se gestionan en Caja y la información clínica en los módulos autorizados. En esta vista resumida los identificadores se muestran abreviados; el detalle completo se consulta en Agenda o Pacientes.';

  $('#view').innerHTML=`${heroBanner}${stats()}<div class="twocol"><section class="panel"><div class="panelhead"><div><h2>${svg.calendar} Agenda de hoy</h2><p>Próximas citas y estados operativos del día.</p></div><a class="linkbutton" href="#agenda">Ver agenda completa →</a></div><div class="compact-list">${list.map(a=>`<div class="compact-item"><span class="compact-time">${a.time}</span><span class="avatar">${initials(patient(a.pid).name)}</span><div class="compact-meta"><b>${esc(formatDashboardPersonName(patient(a.pid).name))}</b><small>${esc(a.doctor)} · ${esc(a.service)} · DNI ${esc(maskDashboardDoc(patient(a.pid).doc))}</small></div>${badge(a.status)}<button class="linkbutton" data-dashboard-appointment="${a.id}">Ver cita ↗</button></div>`).join('')||'<div class="empty">No hay citas registradas para hoy.</div>'}</div></section><div><section class="panel"><div class="panelhead"><h2>${svg.crm} Seguimientos del CRM</h2><a class="linkbutton" href="#crm">Ir al CRM →</a></div><div class="study-list">${leadsList.map(l=>`<div class="crm-lead-item"><div class="crm-lead-info"><b>${esc(formatDashboardPersonName(l.name))}</b><p>${esc(l.reason)}</p><small>${svg.clock} <span>${esc(l.nextAction)} (${esc(l.nextDate)})</span></small></div><span class="badge" style="border-left: 3px solid ${esc(l.stageColor)}">${esc(l.stageName)}</span></div>`).join('')||'<p class="empty">Sin seguimientos pendientes.</p>'}</div></section><section class="panel"><div class="panelhead"><h2>${svg.doctor} Médicos tratantes</h2><span class="badge">Turno hoy</span></div><div class="doctor-grid">${doctors.map(d=>{const docAppointments=list.filter(a=>a.doctor===d.name).length;return `<div class="doctor-card"><div class="doctor-info"><span class="avatar">${initials(d.name)}</span><div class="doctor-meta"><b>${esc(d.name)}</b><small>${esc(d.specialty)}</small></div></div><span class="badge-load ${docAppointments>2?'busy':'free'}">${docAppointments} citas hoy</span></div>`;}).join('')}</div></section><div class="note">${dashboardNote}</div></div></div>`;

  if(motion.shouldAnimateModuleEntry('dashboard','view')){
    motion.animateStagger('.iris-metrics .iris-metric',{scope:'dashboard',maxItems:3});
    motion.animateStagger('.stats .stat',{scope:'dashboard',maxItems:4});
  }
  motion.animateNumber('#view [data-motion-key="dashboard:citas-hoy"]',{to:list.length,padZeros:2,scope:'dashboard'});
  motion.animateNumber('#view [data-motion-key="dashboard:pacientes-activos"]',{to:patients.filter(p=>p.active!==false).length,padZeros:2,scope:'dashboard'});
  motion.animateNumber('#view [data-motion-key="dashboard:por-confirmar"]',{to:pendingConfirm.length,padZeros:2,scope:'dashboard'});
  motion.animateNumber('#view [data-motion-key="dashboard:prospectos-crm"]',{to:leadsCount,padZeros:2,scope:'dashboard'});

  document.querySelectorAll('[data-dashboard-appointment]').forEach(b=>b.onclick=()=>appointmentDetail(Number(b.dataset.dashboardAppointment)));
}

const dateFromIso=value=>new Date(value+'T12:00:00');
const isoDate=value=>value.toISOString().slice(0,10);
const formatAgendaDate=(value,options={weekday:'long',day:'numeric',month:'long'})=>new Intl.DateTimeFormat('es-PE',options).format(dateFromIso(value));
const statusTone=status=>({'Programada':'scheduled','Confirmada':'confirmed','Llegó':'arrived','En espera':'waiting','Atendida':'attended','Cancelada':'cancelled'}[status]||'scheduled');

function filteredAppointments(rangeStart=null,rangeEnd=null){
  const user=auth.getSession();
  const isDoctor=user&&user.role==='medico';
  const doctorNames=doctorMatchNames(user);
  return appointments.filter(a=>{
    if(rangeStart&&a.date<rangeStart)return false;
    if(rangeEnd&&a.date>rangeEnd)return false;
    if(isDoctor&&a.doctor!==user.name&&!doctorNames.includes(a.doctor))return false;
    if(filter!=='Todas'&&a.status!==filter)return false;
    if(agendaDoctor!=='all'&&a.doctor!==agendaDoctor)return false;
    if(agendaService!=='all'&&a.service!==agendaService)return false;
    return patient(a.pid).name.toLowerCase().includes(query.toLowerCase());
  }).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}

function agenda(summary=false){
  const user=auth.getSession();
  const isDoctor=user&&user.role==='medico';
  // Los indicadores ejecutivos pertenecen a la operación del día. En las
  // vistas de semana y mes se ocultan para dar todo el ancho al calendario.
  const topStats=agendaView==='day'?(isDoctor?doctorAgendaStats(user):stats()):'';
  $('#view').innerHTML=`
    ${topStats}
    <section class="agenda-commandbar" aria-label="Controles de agenda">
      <div class="agenda-view-switch" role="group" aria-label="Vista de agenda">
        ${[['day','Día'],['week','Semana'],['month','Mes']].map(([id,label])=>`<button data-agenda-view="${id}" class="${agendaView===id?'active':''}" aria-pressed="${agendaView===id}">${label}</button>`).join('')}
      </div>
      <div class="agenda-period-control">
        <button id="prev" aria-label="Periodo anterior">‹</button>
        <button id="today">Hoy</button>
        <button id="next" aria-label="Periodo siguiente">›</button>
        <strong>${agendaPeriodLabel()}</strong>
      </div>
      <div class="agenda-filters">
        ${search('Buscar paciente…')}
        ${isDoctor?'':`<select id="agenda-doctor" aria-label="Filtrar por profesional"><option value="all">Todos los profesionales</option>${doctors.filter(d=>d.active!==false).map(d=>`<option value="${esc(d.name)}" ${agendaDoctor===d.name?'selected':''}>${esc(d.name)}</option>`).join('')}</select>`}
        <select id="agenda-service" aria-label="Filtrar por servicio"><option value="all">Todos los servicios</option>${[...new Set(appointments.map(a=>a.service))].map(s=>`<option ${agendaService===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
        <select id="state" aria-label="Filtrar citas por estado">${['Todas','Programada','Confirmada','Llegó','En espera','Atendida','Cancelada'].map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
    </section>
    <div id="agenda-canvas"></div>`;

  if(agendaView==='day'){
    if(isDoctor){
      if(motion.shouldAnimateModuleEntry('agenda','stats')){
        motion.animateStagger('.stats .stat',{scope:'agenda',maxItems:4});
      }
      const names=doctorMatchNames(user);
      const myApps=appointments.filter(a=>a.date===date&&a.status!=='Cancelada'&&(a.doctor===user.name||names.includes(a.doctor)));
      const waiting=myApps.filter(a=>a.status==='En espera'||a.status==='Llegó');
      const attended=myApps.filter(a=>a.status==='Atendida');
      const pending=myApps.filter(a=>['Programada','Confirmada'].includes(a.status));
      motion.animateNumber('#view [data-motion-key="agenda:mis-citas"]',{to:myApps.length,padZeros:2,scope:'agenda'});
      motion.animateNumber('#view [data-motion-key="agenda:en-espera"]',{to:waiting.length,padZeros:2,scope:'agenda'});
      motion.animateNumber('#view [data-motion-key="agenda:por-ingresar"]',{to:pending.length,padZeros:2,scope:'agenda'});
      motion.animateNumber('#view [data-motion-key="agenda:atendidas"]',{to:attended.length,padZeros:2,scope:'agenda'});
    }else{
      if(motion.shouldAnimateModuleEntry('agenda','stats')){
        motion.animateStagger('.stats .stat',{scope:'agenda',maxItems:4});
      }
      const list=appointments.filter(a=>a.date===date&&a.status!=='Cancelada');
      const pending=list.filter(a=>a.status==='Programada');
      const leadsCount=getLeadsSummary().length;
      motion.animateNumber('#view [data-motion-key="dashboard:citas-hoy"]',{to:list.length,padZeros:2,scope:'agenda'});
      motion.animateNumber('#view [data-motion-key="dashboard:pacientes-activos"]',{to:patients.filter(p=>p.active!==false).length,padZeros:2,scope:'agenda'});
      motion.animateNumber('#view [data-motion-key="dashboard:por-confirmar"]',{to:pending.length,padZeros:2,scope:'agenda'});
      motion.animateNumber('#view [data-motion-key="dashboard:prospectos-crm"]',{to:leadsCount,padZeros:2,scope:'agenda'});
    }
  }

  renderAgendaCanvas(summary);
  bindAgendaControls(summary);
}

function agendaPeriodLabel(){
  const d=dateFromIso(date);
  if(agendaView==='day')return formatAgendaDate(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if(agendaView==='month')return new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric'}).format(d);
  const start=new Date(d);start.setDate(d.getDate()-((d.getDay()+6)%7));
  const end=new Date(start);end.setDate(start.getDate()+6);
  return `${new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short'}).format(start)} – ${new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric'}).format(end)}`;
}

function agendaCompactSummary(){
  const d=dateFromIso(date);let start,end;
  if(agendaView==='month'){start=new Date(d.getFullYear(),d.getMonth(),1,12);end=new Date(d.getFullYear(),d.getMonth()+1,0,12);}else{start=new Date(d);start.setDate(d.getDate()-((d.getDay()+6)%7));end=new Date(start);end.setDate(start.getDate()+6);}
  const list=filteredAppointments(isoDate(start),isoDate(end));
  const active=list.filter(a=>a.status!=='Cancelada');
  return `<div class="agenda-pulse" aria-label="Resumen del periodo"><div><span>Citas del periodo</span><strong>${active.length}</strong></div><div><span>Confirmadas</span><strong>${active.filter(a=>a.status==='Confirmada').length}</strong></div><div><span>En sede</span><strong>${active.filter(a=>['Llegó','En espera'].includes(a.status)).length}</strong></div><div><span>Canceladas</span><strong>${list.filter(a=>a.status==='Cancelada').length}</strong></div></div>`;
}

function bindAgendaControls(summary){
  document.querySelectorAll('[data-agenda-view]').forEach(b=>b.onclick=()=>{agendaView=b.dataset.agendaView;agenda(summary)});
  $('#state').onchange=e=>{filter=e.target.value;agenda(summary)};
  if($('#agenda-doctor'))$('#agenda-doctor').onchange=e=>{agendaDoctor=e.target.value;agenda(summary)};
  $('#agenda-service').onchange=e=>{agendaService=e.target.value;agenda(summary)};
  bindSearch();
  $('#today').onclick=()=>{date=today;agenda(summary)};
  ['prev','next'].forEach(id=>$('#'+id).onclick=()=>{const d=dateFromIso(date);const amount=agendaView==='month'?1:agendaView==='week'?7:1;if(agendaView==='month')d.setMonth(d.getMonth()+(id==='next'?amount:-amount));else d.setDate(d.getDate()+(id==='next'?amount:-amount));date=isoDate(d);agenda(summary)});
}

function renderAgendaCanvas(summary=false){
  if(agendaView==='month')return monthAgenda();
  if(agendaView==='week')return weekAgenda();
  dayAgenda(summary);
}

function dayAgenda(summary=false){
  const user=auth.getSession(),isDoctor=user&&user.role==='medico';
  const tableHeader=isDoctor?`<thead><tr><th>Hora</th><th>Paciente</th><th>Servicio asignado</th><th>Estado clínico</th><th>Acción</th></tr></thead>`:`<thead><tr><th>Hora</th><th>Paciente</th><th>Profesional y servicio</th><th>Atención</th><th>Pago</th><th>Acción</th></tr></thead>`;
  $('#agenda-canvas').innerHTML=`<section class="panel agenda-day-panel"><div class="panelhead"><div><span class="agenda-kicker">JORNADA CLÍNICA</span><h2>${isDoctor?'Mis citas asignadas':'Citas programadas'}</h2><p>${formatAgendaDate(date,{weekday:'long',day:'numeric',month:'long'})}</p></div><span class="badge">Turnos de 30 minutos</span></div><div class="tablewrap"><table>${tableHeader}<tbody id="rows"></tbody></table></div><div class="footerline">Selecciona una cita para abrir su seguimiento sin salir de la agenda.</div></section>`;
  appointmentRows();
}

function appointmentRows(){
  const user=auth.getSession(),isDoctor=user&&user.role==='medico';
  const list=filteredAppointments(date,date);

  if(isDoctor){
    $('#rows').innerHTML=list.map(a=>`<tr>
      <td><b>${a.time}</b><small>30 min</small></td>
      <td><div class="person"><span class="avatar">${initials(patient(a.pid).name)}</span><span><b>${esc(patient(a.pid).name)}</b><small>DNI ${patient(a.pid).doc}</small></span></div></td>
      <td><b>${esc(a.service)}</b></td>
      <td>${badge(a.status)}</td>
      <td><button class="linkbutton" data-appointment="${a.id}" data-agenda-appointment="${a.id}">Ver cita ↗</button></td>
    </tr>`).join('')||'<tr><td colspan="5" class="empty">No tienes citas asignadas para esta fecha con estos filtros.</td></tr>';
  }else{
    $('#rows').innerHTML=list.map(a=>`<tr>
      <td><b>${a.time}</b><small>30 min</small></td>
      <td><div class="person"><span class="avatar">${initials(patient(a.pid).name)}</span><span><b>${esc(patient(a.pid).name)}</b><small>DNI ${patient(a.pid).doc}</small></span></div></td>
      <td>${a.doctor}<small>${a.service}</small></td>
      <td>${badge(a.status)}</td>
      <td>${badge(a.paid?'Pagado':'Pendiente')}</td>
      <td><button class="linkbutton" data-appointment="${a.id}" data-agenda-appointment="${a.id}">Ver cita ↗</button></td>
    </tr>`).join('')||'<tr><td colspan="6" class="empty">No hay citas con estos filtros. Puedes elegir otra fecha o registrar una nueva cita.</td></tr>';
  }
  bindAgendaAppointments();
}

function weekAgenda(){
  const anchor=dateFromIso(date),start=new Date(anchor);start.setDate(anchor.getDate()-((anchor.getDay()+6)%7));
  const days=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return isoDate(d)});
  const list=filteredAppointments(days[0],days[6]);
  $('#agenda-canvas').innerHTML=`<section class="agenda-week" aria-label="Agenda semanal">${days.map(day=>{const items=list.filter(a=>a.date===day);return `<article class="agenda-week-day ${day===today?'is-today':''}" data-agenda-drop-date="${day}"><header><span>${new Intl.DateTimeFormat('es-PE',{weekday:'short'}).format(dateFromIso(day))}</span><strong>${dateFromIso(day).getDate()}</strong><small>${items.length} cita${items.length===1?'':'s'}</small></header><div class="agenda-week-list">${items.map(agendaCard).join('')||`<button class="agenda-empty-day" data-book-date="${day}">＋ Agendar</button>`}</div></article>`}).join('')}</section>`;
  bindAgendaAppointments();bindBookDates();bindAgendaDragAndDrop();
}

function monthAgenda(){
  const anchor=dateFromIso(date),year=anchor.getFullYear(),month=anchor.getMonth();
  const first=new Date(year,month,1,12),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(first.getDate()-offset);
  const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return isoDate(d)});
  const list=filteredAppointments(days[0],days[41]);
  const selected=list.filter(a=>a.date===date);
  $('#agenda-canvas').innerHTML=`<div class="agenda-month-layout"><section class="clinical-calendar"><div class="calendar-weekdays">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${days.map(day=>{const items=list.filter(a=>a.date===day);const inMonth=dateFromIso(day).getMonth()===month;return `<button class="calendar-day ${inMonth?'':'outside'} ${day===date?'selected':''} ${day===today?'is-today':''}" data-calendar-day="${day}" data-agenda-drop-date="${day}" aria-label="${formatAgendaDate(day)}: ${items.length} citas"><span class="calendar-number">${dateFromIso(day).getDate()}</span><span class="calendar-load">${items.slice(0,3).map(a=>`<i class="${statusTone(a.status)}" title="${esc(a.status)}"></i>`).join('')}</span>${items.slice(0,2).map(a=>`<span class="calendar-event ${statusTone(a.status)} ${canDragAppointment(a)?'is-draggable':''}" ${canDragAppointment(a)?`draggable="true" data-drag-appointment="${a.id}"`:''}><b>${a.time}</b> ${esc(patient(a.pid).name.split(' ')[0])}</span>`).join('')}${items.length>2?`<small>+${items.length-2} más</small>`:''}</button>`}).join('')}</div></section><aside class="selected-day-panel"><div class="selected-day-head"><span class="agenda-kicker">DÍA SELECCIONADO</span><h2>${formatAgendaDate(date,{weekday:'long',day:'numeric',month:'long'})}</h2><p>${selected.length} cita${selected.length===1?'':'s'} registrada${selected.length===1?'':'s'}</p></div><div class="selected-day-list">${selected.map(agendaCard).join('')||'<div class="empty compact-empty">No hay citas para este día.</div>'}</div>${['admin','recepcion'].includes(auth.getSession()?.role)?`<button class="primary selected-day-new" data-book-date="${date}">${svg.plus} Nueva cita para este día</button>`:''}</aside></div>`;
  document.querySelectorAll('[data-calendar-day]').forEach(b=>b.onclick=()=>{date=b.dataset.calendarDay;monthAgenda()});bindAgendaAppointments();bindBookDates();bindAgendaDragAndDrop();
}

function canDragAppointment(a){return Boolean(a&&editableAppointment(a)&&['admin','recepcion'].includes(auth.getSession()?.role))}
function agendaCard(a){return `<button class="agenda-card status-${statusTone(a.status)} ${canDragAppointment(a)?'is-draggable':''}" data-appointment="${a.id}" data-agenda-appointment="${a.id}" ${canDragAppointment(a)?`draggable="true" data-drag-appointment="${a.id}"`:''}><span class="agenda-card-time">${a.time}</span><span><b>${esc(patient(a.pid).name)}</b><small>${esc(a.doctor)} · ${esc(a.service)}</small></span>${badge(a.status)}</button>`}
function bindAgendaAppointments(){document.querySelectorAll('[data-agenda-appointment]').forEach(b=>b.onclick=()=>agendaAppointmentDrawer(Number(b.dataset.agendaAppointment)))}
function bindBookDates(){document.querySelectorAll('[data-book-date]').forEach(b=>b.onclick=()=>{date=b.dataset.bookDate;appointmentForm()})}

function bindAgendaDragAndDrop(){
  document.querySelectorAll('[data-drag-appointment]').forEach(card=>{
    card.ondragstart=e=>{agendaDraggedId=Number(card.dataset.dragAppointment);card.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(agendaDraggedId))};
    card.ondragend=()=>{agendaDraggedId=null;card.classList.remove('is-dragging');document.querySelectorAll('.is-drop-target').forEach(x=>x.classList.remove('is-drop-target'))};
  });
  document.querySelectorAll('[data-agenda-drop-date]').forEach(target=>{
    target.ondragover=e=>{if(!agendaDraggedId)return;e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('is-drop-target')};
    target.ondragleave=e=>{if(!target.contains(e.relatedTarget))target.classList.remove('is-drop-target')};
    target.ondrop=e=>{e.preventDefault();target.classList.remove('is-drop-target');moveAppointmentToDate(Number(e.dataTransfer.getData('text/plain')||agendaDraggedId),target.dataset.agendaDropDate)};
  });
}

function moveAppointmentToDate(id,newDate){
  const a=appointments.find(x=>x.id===id);agendaDraggedId=null;
  if(!canDragAppointment(a))return toast('Esta cita ya no admite cambio de fecha desde el calendario.');
  if(!newDate||newDate===a.date)return;
  if(appointments.some(x=>x.id!==a.id&&x.status!=='Cancelada'&&x.date===newDate&&x.time===a.time&&x.doctor===a.doctor))return toast(`No se movió: ${a.doctor} ya tiene una cita a las ${a.time} ese día.`);
  const previous=a.date;
  recordChange(a,'Cita reprogramada desde el calendario',`${previous} ${a.time} → ${newDate} ${a.time}`);
  a.date=newDate;date=newDate;
  handleAppointmentRescheduled(a,`${previous} ${a.time} → ${newDate} ${a.time}`);
  agenda();
  toast(`Cita movida al ${formatAgendaDate(newDate,{day:'numeric',month:'long'})}. Se conservaron la hora, el profesional y el pago.`);
}

function agendaAppointmentDrawer(id){
  const a=appointments.find(x=>x.id===id),p=patient(a.pid),user=auth.getSession();if(!a||!p)return;
  const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.querySelector('.agenda-drawer-layer')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div class="agenda-drawer-layer"><button class="agenda-drawer-backdrop" aria-label="Cerrar detalle de cita"></button><aside class="agenda-drawer" role="dialog" aria-modal="true" aria-labelledby="agenda-drawer-title"><header><div><span class="agenda-kicker">SEGUIMIENTO DE CITA</span><h2 id="agenda-drawer-title">${esc(p.name)}</h2><p>${formatAgendaDate(a.date)} · ${a.time}</p></div><button class="agenda-drawer-close" aria-label="Cerrar detalle">×</button></header><div class="agenda-drawer-body"><div class="agenda-drawer-status">${badge(a.status)} ${badge(a.paid?'Pagado':'Pendiente')}</div><dl class="agenda-detail-list"><div><dt>Profesional</dt><dd>${esc(a.doctor)}</dd></div><div><dt>Servicio</dt><dd>${esc(a.service)}</dd></div><div><dt>Duración</dt><dd>30 minutos</dd></div><div><dt>Documento</dt><dd>DNI ${esc(p.doc)}</dd></div></dl>${changeHistory(a)||'<div class="note">Sin cambios registrados durante esta sesión.</div>'}</div><footer><button class="drawer-full-detail">Gestionar cita</button>${editableAppointment(a)&&['admin','recepcion'].includes(user?.role)?'<button class="warning drawer-noshow">No asistió</button><button class="drawer-reschedule">Reprogramar</button><button class="danger drawer-cancel">Cancelar cita</button>':''}</footer></aside></div>`);
  const layer=document.querySelector('.agenda-drawer-layer');
  const drawer=layer?.querySelector('.agenda-drawer');
  const backdrop=layer?.querySelector('.agenda-drawer-backdrop');

  if(motion.isMotionReduced()){
    layer?.classList.add('is-open');
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
  }else{
    requestAnimationFrame(()=>{
      layer?.classList.add('is-open');
      drawer?.classList.add('is-open');
      backdrop?.classList.add('is-open');
    });
  }

  let isClosing=false;
  let closeTimer=null;

  const onKey=e=>{
    if(e.key==='Escape'){
      e.preventDefault();
      close();
    }
  };

  const close=(callback=null, { immediate = false } = {})=>{
    if(isClosing)return;
    isClosing=true;
    document.removeEventListener('keydown',onKey);

    const finish=()=>{
      if(closeTimer){
        clearTimeout(closeTimer);
        closeTimer=null;
      }
      layer?.remove();
      if(typeof callback==='function'){
        callback();
      }else if(opener&&document.contains(opener)){
        opener.focus();
      }
    };

    if(immediate||!layer||!drawer){
      finish();
      return;
    }

    layer.classList.remove('is-open');
    drawer.classList.remove('is-open');
    backdrop?.classList.remove('is-open');

    const onEnd=e=>{
      if(e&&e.target!==drawer)return;
      drawer.removeEventListener('transitionend',onEnd);
      finish();
    };

    drawer.addEventListener('transitionend',onEnd);
    closeTimer=setTimeout(onEnd,190);
  };

  if(backdrop)backdrop.onclick=()=>close();
  const closeBtn=layer?.querySelector('.agenda-drawer-close');
  if(closeBtn)closeBtn.onclick=()=>close();
  const fullDetailBtn=layer?.querySelector('.drawer-full-detail');
  if(fullDetailBtn)fullDetailBtn.onclick=()=>close(()=>appointmentDetail(id));
  const noshowBtn=layer?.querySelector('.drawer-noshow');
  if(noshowBtn)noshowBtn.onclick=()=>close(()=>markAppointmentNoShow(id));
  const rescheduleBtn=layer?.querySelector('.drawer-reschedule');
  if(rescheduleBtn)rescheduleBtn.onclick=()=>close(()=>rescheduleAppointment(id));
  const cancelBtn=layer?.querySelector('.drawer-cancel');
  if(cancelBtn)cancelBtn.onclick=()=>close(()=>cancelAppointment(id));

  document.addEventListener('keydown',onKey);
  closeBtn?.focus();
}

function openModal(title,body,actions='',wide=false){const m=$('#modal');const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;if(wide)m.classList.add('wide-modal');else m.classList.remove('wide-modal');m.innerHTML=`<div class="modalhead"><h2 id="modal-title">${title}</h2><button id="close" aria-label="Cerrar ventana">×</button></div><div class="modalbody">${body}</div><div class="modalactions">${actions||'<button id="done">Entendido</button>'}</div>`;m.onclose=()=>{m.classList.remove('wide-modal');if(opener&&document.contains(opener))opener.focus();};$('#close').onclick=()=>m.close();if($('#done'))$('#done').onclick=()=>m.close();if(!m.open)m.showModal();}
function info(title,text){openModal(title,`<p>${text}</p>`)}

const DEMO_TOUR=[
  {route:'dashboard',eyebrow:'PASO 1 DE 5',title:'Panel general',text:'Comienza con la operación del día y los seguimientos comerciales que requieren atención.'},
  {route:'inbox/1',eyebrow:'PASO 2 DE 5',title:'Conversación entrante',text:'Abre el escenario guiado de Ana Torres para convertir una conversación simulada en una cita.'},
  {route:'agenda',eyebrow:'PASO 3 DE 5',title:'Agenda conectada',text:'La cita creada desde Inbox aparece en la agenda y conserva paciente, profesional, servicio y horario.'},
  {route:'crm/1',eyebrow:'PASO 4 DE 5',title:'CRM sincronizado',text:'El seguimiento cambia a Cita agendada únicamente después de guardar correctamente la reserva.'},
  {route:'arm',eyebrow:'PASO 5 DE 5',title:'Supervisión ARM',text:'Finaliza revisando agentes, límites, estados y la auditoría local de las acciones simuladas.'}
];

function startDemoTour(){openDemoTourStep(0)}
function openDemoTourStep(index){
  const step=DEMO_TOUR[index];
  if(!step)return;
  location.hash='#'+step.route;
  setTimeout(()=>{
    openModal(step.title,`<div class="tour-step"><span class="agenda-kicker">${step.eyebrow}</span><div class="tour-progress" aria-label="Paso ${index+1} de ${DEMO_TOUR.length}">${DEMO_TOUR.map((_,i)=>`<i class="${i<=index?'active':''}"></i>`).join('')}</div><p>${step.text}</p></div>`,`<button id="tour-close">Cerrar recorrido</button>${index?'<button id="tour-back">Anterior</button>':''}<button class="primary" id="tour-next">${index===DEMO_TOUR.length-1?'Finalizar':'Siguiente'}</button>`);
    $('#tour-close').onclick=()=>$('#modal').close();
    if($('#tour-back'))$('#tour-back').onclick=()=>{$('#modal').close();openDemoTourStep(index-1)};
    $('#tour-next').onclick=()=>{$('#modal').close();if(index===DEMO_TOUR.length-1){toast('Recorrido guiado completado.');location.hash='#arm';}else openDemoTourStep(index+1)};
  },0);
}

export function resetDemoData(){
  patients.length=0;
  patients.push(...JSON.parse(JSON.stringify(INITIAL_PATIENTS)));
  appointments.length=0;
  appointments.push(...JSON.parse(JSON.stringify(INITIAL_APPOINTMENTS)));
  servicesCatalog.length=0;
  servicesCatalog.push(...JSON.parse(JSON.stringify(INITIAL_SERVICES_CATALOG)));
  clinicalExams.length=0;
  clinicalExams.push(...JSON.parse(JSON.stringify(INITIAL_CLINICAL_EXAMS)));
  preliminaryStudies.length=0;
  preliminaryStudies.push(...JSON.parse(JSON.stringify(INITIAL_PRELIMINARY_STUDIES)));
  doctors.length=0;
  doctors.push(...JSON.parse(JSON.stringify(INITIAL_DOCTORS)));
  technicians.length=0;
  technicians.push(...JSON.parse(JSON.stringify(INITIAL_TECHNICIANS)));
  auth.resetUsers();
  resetAllUserPreferences();
  const sessionRes=auth.restoreSessionAfterReset();
  resetCRMData();
  resetARMData();
  dashboardState.tab='general';
  dashboardState.period='hoy';
  dashboardState.sede='all';
  dashboardState.doctor='all';
  registerTurnosPatientDirectory(patients);
  resetSharedTurnState();
  motion.resetAllMotionScopes();
  query='';
  filter='Todas';
  patientFilter='all';
  adminFilter='all';
  cashTab='pending';
  date=today;
  routeParams={};
  if(sessionRes.status==='closed'||!sessionRes.user){
    authStep=1;
    location.hash='';
  }
  applyPreferencesToDom(getUserPreferences(sessionRes.user?.id));
  return sessionRes;
}

if(typeof window!=='undefined'){
  window.__resetDemoData=()=>{
    const res=resetDemoData();
    render();
    return res;
  };
}

function confirmResetDemo(){
  openModal(
    'Restablecer datos de demostración',
    `
    <div class="note" style="margin-bottom:16px;">
      <b>Herramienta de Demostración Comercial</b><br>
      Esta acción restablecerá todo el entorno local a su estado de prueba original:
      <ul style="margin:8px 0 0 18px; line-height:1.6;">
        <li><b>Agenda y Citas:</b> Vuelve a las 7 citas iniciales del día con sus estados y pagos.</li>
        <li><b>Directorio de Pacientes:</b> Restaura los 5 expedientes base y reactiva cualquier paciente desactivado.</li>
        <li><b>CRM Omnicanal:</b> Reubica las tarjetas en sus etapas base y restaura prioridades comerciales.</li>
        <li><b>Inbox de Conversaciones:</b> Restaura el hilo de mensajes simulados por canal (WhatsApp, Instagram, Google, Facebook).</li>
        <li><b>Centro ARM:</b> Reactiva los agentes, restaura las automatizaciones y devuelve la auditoría al escenario inicial.</li>
        <li><b>Caja y Cobros:</b> Restaura las órdenes pendientes y constancias internas registradas.</li>
        <li><b>Catálogos, Usuarios y Perfil:</b> Restaura tarifario, médicos, técnicos, perfiles personales, contraseñas base y preferencias visuales.</li>
      </ul>
    </div>
    <p style="font-size:13px; color:var(--c-muted,#666);">
      <span class="badge red">Demostración local</span> Esta acción solo está disponible para el Administrador. No afecta bases de datos de producción ni servicios externos.
    </p>
    `,
    `
    <button id="cancel-reset">Cancelar</button>
    <button class="primary" id="confirm-reset" style="background:var(--c-danger,#c0392b); border-color:var(--c-danger,#c0392b);">↺ Sí, restablecer datos demo</button>
    `
  );

  $('#cancel-reset').onclick=()=>$('#modal').close();
  $('#confirm-reset').onclick=()=>{
    const sessionRes=resetDemoData();
    $('#modal').close();
    render();
    toast(sessionRes.status==='closed'?'Datos de demostración restablecidos. La sesión temporal fue cerrada.':'Datos de demostración restablecidos al escenario inicial.');
  };
}

function receptionOrder(a){
  openModal('Orden interna de pago',`
    <div class="receipt">
      <span class="eyebrow">CLÍNICA OFTALMOLÓGICA · RECEPCIÓN</span>
      <h2>Orden interna de pago OP-${String(a.id).padStart(4,'0')}</h2>
      <p>Documento interno para control operativo · Sin valor fiscal ni tributario</p>
      <hr>
      <b>${esc(patient(a.pid).name)}</b>
      <p>${a.service}<br>${a.date} · ${a.time}</p>
      <hr>
      <h2>Total: ${money(a.amount)}</h2>
      ${badge(a.paid?'Pagado':'Pendiente')}
      <p>${a.paid?'Pago registrado por Caja.':'El pago se realiza en Caja antes de ingresar a la sala de espera.'}</p>
    </div>
  `,`<button id="print">Imprimir orden</button><button id="done">Cerrar</button>`);
  $('#print').onclick=()=>window.print();
}

const field=(id,label,type='text',value='',full=false)=>`<div class="field ${full?'full':''}"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" value="${esc(value)}" aria-describedby="form-error"></div>`;
function error(text,id){$('#form-error').textContent=text;if(id){$('#'+id).setAttribute('aria-invalid','true');$('#'+id).focus()}}

function appointmentForm(pid,onSaved){if(pid&&patient(pid)?.active===false){info("Paciente inactivo","Reactiva la ficha del paciente antes de reservar una cita.");return;}if(!patients.some(p=>p.active!==false)){info("Sin pacientes activos","Registra o reactiva un paciente para reservar una cita.");return;}openModal('Reservar una cita',`<p style="margin-bottom:20px">Selecciona paciente, profesional y un horario disponible.</p><form id="form" novalidate><div class="fields"><div class="field full"><label for="pid">Paciente</label><select id="pid">${patients.filter(p=>p.active!==false).map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label for="doctor">Profesional</label><select id="doctor">${doctors.filter(d=>d.active!==false).map(d=>`<option value="${esc(d.name)}">${esc(d.name)} · ${esc(d.specialty)}</option>`).join('')||'<option>Sin médicos activos</option>'}</select></div><div class="field"><label for="service">Servicio · Tarifa</label><select id="service">${servicesCatalog.filter(s=>s.active!==false).map(s=>`<option value="${s.price}">${esc(s.name)} · S/ ${s.price}</option>`).join('')||'<option value="150">Consulta oftalmológica · S/ 150</option>'}</select></div>${field('dateinput','Fecha','date',date)}<div class="field"><label for="time">Hora</label><select id="time">${Array.from({length:8},(_,i)=>`${String(9+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`).map(t=>`<option>${t}</option>`).join('')}</select></div></div><div id="form-error" class="error" role="alert"></div></form><div class="note">La disponibilidad se valida dentro de esta demostración. La reserva simultánea entre usuarios requiere el servidor.</div>`,`<button id="cancel">Cancelar</button><button class="primary" type="submit" form="form">Confirmar reserva</button>`);$('#cancel').onclick=()=>$('#modal').close();$('#form').onsubmit=e=>{e.preventDefault();const day=$('#dateinput').value,doctor=$('#doctor').value,time=$('#time').value;if(!patient(Number(document.getElementById("pid").value))||patient(Number(document.getElementById("pid").value)).active===false)return error('Selecciona un paciente activo.','pid');if(!day)return error('Elige una fecha para la cita.','dateinput');if(appointments.some(a=>a.status!=="Cancelada"&&a.date===day&&a.time===time&&a.doctor===doctor))return error('Este horario ya está ocupado. Elige otro horario o profesional.','time');const selectedPrice=Number($('#service').value);const matchedService=servicesCatalog.find(s=>s.price===selectedPrice&&s.active!==false);const serviceName=matchedService?matchedService.name:($('#service').options[$('#service').selectedIndex]?.text?.split(' · ')[0]||'Consulta oftalmológica');const savedApp={id:Math.max(...appointments.map(a=>a.id))+1,pid:Number($('#pid').value),date:day,time,doctor,service:serviceName,amount:selectedPrice,status:'Programada',paid:false};appointments.push(savedApp);if(!onSaved)handleAppointmentBooked(savedApp,'Agenda');date=day;$('#modal').close();render();toast('Reserva registrada en la demostración.');if(onSaved)onSaved(savedApp)};}
const editableAppointment=a=>['Programada','Confirmada'].includes(a.status);
function changeHistory(a){return a.changes?.length?`<h2 style="margin:22px 0 12px">Cambios durante esta sesión</h2><div class="timeline">${a.changes.map(c=>`<p><b>${esc(c.action)}</b><br>${esc(c.detail)}<br><small>Recepción · ${esc(c.when)}</small></p>`).join('')}</div>`:''}
function recordChange(a,action,detail,when=`27/10/2026 · 11:20 · demo`){(a.changes??=[]).push({action,detail,when})}

function appointmentDetail(id){
  const a=appointments.find(a=>a.id===id),p=patient(a.pid);
  const user=auth.getSession();
  const isDoctor=user&&user.role==='medico';

  if(isDoctor){
    const canConsult=['En espera','Llegó','Atendida'].includes(a.status);
    openModal(
      'Detalle de la cita',
      `
      <div class="person">
        <span class="avatar">${initials(p.name)}</span>
        <div>
          <h2>${esc(p.name)}</h2>
          <p>DNI ${p.doc}</p>
        </div>
      </div>
      <div class="detailgrid">
        <div><small>Fecha y hora</small>${a.date} · ${a.time}</div>
        <div><small>Médico asignado</small>${a.doctor}</div>
        <div><small>Servicio</small>${a.service}</div>
        <div><small>Estado clínico</small>${badge(a.status)}</div>
      </div>
      <div class="note">
        ${canConsult?'El paciente está en sede y listo para ingresar al flujo de atención clínica.':`Cita programada. Recepción confirmará la llegada del paciente.`}
      </div>
      ${changeHistory(a)}
      `,
      `
      <a class="linkbutton" href="#pacientes/${a.pid}">Ver ficha clínica ↗</a>
      ${canConsult?`<button class="primary" id="medico-goto-consult">Atender paciente en consulta</button>`:''}
      <button id="done">Cerrar</button>
      `
    );
    if($('#medico-goto-consult')){
      $('#medico-goto-consult').onclick=()=>{
        $('#modal').close();
        routeParams={appId:a.id};
        location.hash='#consulta';
      };
    }
    return;
  }

  // Flujo operativo de Recepción y Administrador
  openModal(
    'Detalle de la cita',
    `<div class="person"><span class="avatar">${initials(p.name)}</span><div><h2>${esc(p.name)}</h2><p>DNI ${p.doc}</p></div></div><div class="detailgrid"><div><small>Fecha y hora</small>${a.date} · ${a.time}</div><div><small>Profesional</small>${a.doctor}</div><div><small>Servicio</small>${a.service}</div><div><small>Importe</small>${money(a.amount)}</div><div><small>Atención</small>${badge(a.status)}</div><div><small>Pago</small>${badge(a.paid?'Pagado':'Pendiente')}</div></div><div class="note">${a.status==='Cancelada'?'Cita cancelada. Su horario está disponible. '+(a.paid?'El pago se conserva; su revisión corresponde a Caja.':'No se registró ningún cobro.'):a.paid?'Pago completo registrado por Caja.':'Se requiere el pago completo antes de pasar al paciente a espera.'}</div>${changeHistory(a)}`,
    `${editableAppointment(a)?'<button id="cancelappointment" class="danger">Cancelar cita</button><button id="reschedule">Reprogramar</button><button id="noshow" class="warning">Marcar no asistió</button>':''}${a.status!=='Cancelada'&&a.status!=='No asistió'?`<button id="receipt">${a.order?'Ver orden':'Registrar llegada y generar orden'}</button>`:''}${a.paid&&a.status==='Llegó'?'<button class="primary" id="wait">Pasar a espera</button>':''}${a.status==='Programada'?'<button class="primary" id="confirm">Confirmar cita</button>':''}`
  );
  if($('#receipt'))$('#receipt').onclick=()=>{a.order=true;if(editableAppointment(a))a.status='Llegó';render();receptionOrder(a)};
  if($('#wait'))$('#wait').onclick=()=>{if(!a.paid||a.status!=='Llegó')return;a.status='En espera';$('#modal').close();render();toast('Paciente en espera. La consulta aún no ha sido atendida.')};
  if($('#confirm'))$('#confirm').onclick=()=>{if(a.status!=='Programada')return;a.status='Confirmada';render();appointmentDetail(id);toast('Cita confirmada.')};
  if($('#noshow'))$('#noshow').onclick=()=>markAppointmentNoShow(id);
  if($('#reschedule'))$('#reschedule').onclick=()=>rescheduleAppointment(id);
  if($('#cancelappointment'))$('#cancelappointment').onclick=()=>cancelAppointment(id);
}

function markAppointmentNoShow(id){
  const a=appointments.find(item=>item.id===id);
  if(!editableAppointment(a))return;
  const demoNow=new Date(`${today}T11:20:00-05:00`);
  const appointmentAt=new Date(`${a.date}T${a.time}:00-05:00`);
  const isFuture=appointmentAt>demoNow;
  openModal('Confirmar inasistencia',`<h2>${esc(patient(a.pid).name)}</h2><p>${formatAgendaDate(a.date)} · ${esc(a.time)} · ${esc(a.doctor)}</p><div class="note ${isFuture?'warning-note':''}" style="margin-top:16px">${isFuture?'La hora de esta cita todavía no ha pasado en el reloj del demo. Para probar el escenario, se adelantará únicamente el reloj de esta simulación.':'La cita se conservará y pasará a la etapa No asistió. No se modificará el estado de pago.'}</div><p style="margin-top:16px">ARM no enviará mensajes todavía. La recuperación se ejecutará manualmente desde el Centro ARM.</p>`,`<button id="keepappointment">Volver a la cita</button><button class="warning" id="confirmnoshow">${isFuture?'Simular que la hora ya pasó':'Confirmar inasistencia'}</button>`);
  $('#keepappointment').onclick=()=>appointmentDetail(id);
  $('#confirmnoshow').onclick=()=>{
    const eventTime=isFuture?`${a.date.split('-').reverse().join('/')} · ${a.time} · demo`:`27/10/2026 · 11:20 · demo`;
    recordChange(a,'Inasistencia registrada','Pendiente de ejecutar recuperación ARM +10 min.',eventTime);
    a.status='No asistió';
    const queued=handleAppointmentNoShow(a);
    render();
    appointmentDetail(id);
    toast(queued?'Inasistencia registrada. La recuperación quedó pendiente en ARM.':'Inasistencia registrada en Agenda.');
  };
}

function rescheduleAppointment(id){const a=appointments.find(a=>a.id===id);if(!editableAppointment(a))return;openModal('Reprogramar cita',`<p style="margin-bottom:20px">${esc(patient(a.pid).name)} · ${a.service}</p><form id="form" novalidate><div class="fields">${field('newdate','Nueva fecha','date',a.date)}<div class="field"><label for="newtime">Nuevo horario</label><select id="newtime" aria-describedby="form-error">${Array.from({length:8},(_,i)=>`${String(9+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`).map(t=>`<option ${t===a.time?'selected':''}>${t}</option>`).join('')}</select></div><div class="field full"><label for="newdoctor">Profesional</label><select id="newdoctor"><option ${a.doctor==='Dra. Valeria Ríos'?'selected':''}>Dra. Valeria Ríos</option><option ${a.doctor==='Dr. Diego Ramírez'?'selected':''}>Dr. Diego Ramírez</option></select></div></div><div class="error" id="form-error" role="alert"></div></form><div class="note">Se conservan paciente, servicio, importe y estado de pago. ${a.paid?'Cualquier revisión financiera corresponde a Caja.':''}</div>`,`<button id="back">Volver a la cita</button><button class="primary" form="form" type="submit">Guardar reprogramación</button>`);$('#back').onclick=()=>appointmentDetail(id);$('#form').onsubmit=e=>{e.preventDefault();if(!editableAppointment(a))return error('Esta cita ya no admite reprogramación.');const day=$('#newdate').value,time=$('#newtime').value,doctor=$('#newdoctor').value;if(!day)return error('Elige una fecha.','newdate');if(day===a.date&&time===a.time&&doctor===a.doctor)return error('Elige una nueva fecha, hora o profesional.','newtime');if(appointments.some(b=>b.id!==id&&b.status!=='Cancelada'&&b.date===day&&b.time===time&&b.doctor===doctor))return error('El horario está ocupado. Elige otro horario o profesional.','newtime');recordChange(a,'Cita reprogramada',`${a.date} ${a.time} · ${a.doctor} → ${day} ${time} · ${doctor}`);Object.assign(a,{date:day,time,doctor});handleAppointmentRescheduled(a,`${day} ${time} · ${doctor}`);date=day;filter='Todas';render();appointmentDetail(id);toast('Cita reprogramada. El pago se conserva.')};}
function cancelAppointment(id){const a=appointments.find(a=>a.id===id);if(!editableAppointment(a))return;openModal('Cancelar cita',`<h2>${esc(patient(a.pid).name)}</h2><p>${a.date} · ${a.time} · ${a.doctor}</p><p style="margin:16px 0">El horario se liberará. La cita y sus registros se conservarán.</p><form id="form" novalidate>${field('reason','Motivo de cancelación','text','',true)}<div class="error" id="form-error" role="alert"></div></form><div class="note">${a.paid?'Esta cita tiene un pago registrado. Cancelarla no genera una devolución. Su revisión corresponde a Caja.':'El estado de pago no se modifica.'}</div>`,`<button id="keepappointment" autofocus>Conservar cita</button><button class="danger" type="submit" form="form">Confirmar cancelación</button>`);$('#keepappointment').onclick=()=>appointmentDetail(id);$('#keepappointment').focus();$('#form').onsubmit=e=>{e.preventDefault();if(!editableAppointment(a))return error('Esta cita ya no admite cancelación.');const reason=$('#reason').value.trim();if(reason.length<5)return error('Indica el motivo con al menos 5 caracteres.','reason');recordChange(a,'Cita cancelada',reason);a.status='Cancelada';a.cancelReason=reason;handleAppointmentCancelled(a,reason);render();appointmentDetail(id);toast('Cita cancelada. Se conservaron sus registros y su pago.')};}
function methodBadge(m){const str=String(m||'Efectivo');const cls=str.includes('Yape')?'method-yape':str.includes('Plin')?'method-plin':str.includes('Tarjeta')?'method-card':str.includes('Transferencia')?'method-transfer':'method-cash';const icon=str.includes('Yape')||str.includes('Plin')?'📱':str.includes('Tarjeta')?'💳':str.includes('Transferencia')?'🏛️':'💵';return `<span class="method-badge ${cls}">${icon} ${esc(str)}</span>`;}

function receipt(a){
  const p=patient(a.pid);
  const isPaid=Boolean(a.paid);
  const ref=a.reference||(isPaid?`CP-${String(a.id).padStart(4,'0')}`:`OP-${String(a.id).padStart(4,'0')}`);
  const receiptTitle=isPaid?'Constancia interna de pago':'Orden interna de pago';
  const currentUser=auth.getSession();
  const isCaja=currentUser&&currentUser.role==='caja';

  openModal(receiptTitle,`
    <div class="receipt">
      <div class="receipt-header">
        <span class="eyebrow">CLÍNICA OFTALMOLÓGICA · DOCUMENTO INTERNO</span>
        <h2 class="receipt-title">${esc(receiptTitle)}</h2>
        <div class="receipt-code">${esc(ref)}</div>
        <p class="receipt-clinic-meta">Control administrativo interno · Sede principal</p>
      </div>
      <hr>
      <div class="receipt-row"><span>Paciente:</span><b>${esc(p?.name||'Paciente')}</b></div>
      <div class="receipt-row"><span>Documento:</span><b>DNI ${esc(p?.doc||'—')}</b></div>
      <div class="receipt-row"><span>Servicio / Concepto:</span><span>${esc(a.service)}</span></div>
      ${a.doctor?`<div class="receipt-row"><span>Profesional tratante:</span><span>${esc(a.doctor)}</span></div>`:''}
      <div class="receipt-row"><span>Fecha y hora:</span><span class="tnum">${esc(a.paidAt||a.date+' · '+a.time)}</span></div>
      ${isPaid?`<div class="receipt-row"><span>Medio de pago:</span><span>${methodBadge(a.method)}</span></div>`:''}
      ${isPaid&&a.method==='Efectivo'&&a.cashReceived?`
        <div class="receipt-row"><span>Efectivo entregado:</span><span class="tnum">${money(a.cashReceived)}</span></div>
        <div class="receipt-row"><span>Vuelto entregado:</span><b class="tnum" style="color:var(--forest)">${money(a.change||0)}</b></div>
      `:''}
      <div class="receipt-row"><span>Registro interno:</span><span>${esc(a.cashier||'Caja · Prototipo')}</span></div>
      <hr>
      <div class="receipt-total-row">
        <span>TOTAL ${isPaid?'PAGADO':'POR COBRAR'}</span>
        <strong class="receipt-total-val">${money(a.amount)}</strong>
      </div>
      <div style="text-align:center;margin-top:10px">${badge(isPaid?'Pagado':'Pendiente')}</div>
      <p style="font-size:11px;color:var(--muted);text-align:center;margin-top:12px">
        ${isPaid?'Documento interno demostrativo sin valor tributario. Constancia de pago administrativo.':'Orden interna para gestión de cobro en Caja antes de pasar a la sala de espera.'}
      </p>
    </div>
  `, `
    <button id="printreceipt" class="primary">🖨️ Imprimir ${isPaid?'constancia':'orden'}</button>
    ${(!isCaja && p)?`<button id="gotopatient" class="linkbutton">Ver expediente del paciente →</button>`:''}
    <button id="done">Cerrar</button>
  `);
  $('#printreceipt').onclick=()=>window.print();
  if($('#gotopatient')){
    $('#gotopatient').onclick=()=>{
      const m=$('#modal');
      m.close();
      location.hash=`#pacientes/${a.pid}`;
    };
  }
}

function patientStats(){const activeAppCount=new Set(appointments.filter(a=>!['Atendida','Cancelada'].includes(a.status)).map(a=>a.pid)).size;const insuredCount=patients.filter(p=>p.insurance&&p.insurance!=='Particular').length;const noAppCount=patients.filter(p=>!appointments.some(a=>a.pid===p.id)).length;return `<div class="stats"><div class="stat"><div class="stat-head"><span>Pacientes registrados</span><div class="stat-icon">${svg.users}</div></div><strong data-motion-key="pacientes:registrados">${patients.length.toString().padStart(2,'0')}</strong><small>Expedientes en la clínica</small></div><div class="stat tone-success"><div class="stat-head"><span>Con cita próxima</span><div class="stat-icon">${svg.calendar}</div></div><strong data-motion-key="pacientes:con-cita">${activeAppCount.toString().padStart(2,'0')}</strong><small>Turno activo en agenda</small></div><div class="stat tone-accent"><div class="stat-head"><span>Con cobertura EPS</span><div class="stat-icon">${svg.check}</div></div><strong data-motion-key="pacientes:cobertura">${insuredCount.toString().padStart(2,'0')}</strong><small>Seguros y convenios</small></div><div class="stat ${noAppCount?'tone-warning':''}"><div class="stat-head"><span>Sin citas previas</span><div class="stat-icon">${svg.alert}</div></div><strong data-motion-key="pacientes:sin-citas">${noAppCount.toString().padStart(2,'0')}</strong><small>Pendientes de agendar</small></div></div>`;}
function patientList(){
  const activeAppCount=new Set(appointments.filter(a=>!['Atendida','Cancelada'].includes(a.status)).map(a=>a.pid)).size;
  const insuredCount=patients.filter(p=>p.insurance&&p.insurance!=='Particular').length;
  const noAppCount=patients.filter(p=>!appointments.some(a=>a.pid===p.id)).length;
  $('#view').innerHTML=`${patientStats()}<div class="toolbar">${search('Buscar por nombre, DNI, teléfono o email…')}<select id="patientfilter" aria-label="Filtrar pacientes por estado"><option value="all" ${patientFilter==='all'?'selected':''}>Todos los estados</option><option value="active" ${patientFilter==='active'?'selected':''}>Solo activos</option><option value="inactive" ${patientFilter==='inactive'?'selected':''}>Solo inactivos</option></select></div><section class="panel"><div class="panelhead"><div><h2>${svg.users} Directorio de pacientes</h2><p>Expedientes registrados y datos de contacto.</p></div><span class="badge" id="patientbadge">${patients.length} expedientes</span></div><div class="tablewrap"><table><thead><tr><th>Paciente</th><th>Documento</th><th>Contacto</th><th>Cobertura</th><th>Citas</th><th>Acción</th></tr></thead><tbody id="rows"></tbody></table></div><div class="footerline">Recepción consulta datos operativos y de contacto. Los antecedentes clínicos confidenciales se resguardan en el expediente médico.</div></section>`;
  if(motion.shouldAnimateModuleEntry('pacientes','kpis')){
    motion.animateStagger('.stats .stat',{scope:'pacientes',maxItems:4});
  }
  motion.animateNumber('#view [data-motion-key="pacientes:registrados"]',{to:patients.length,padZeros:2,scope:'pacientes'});
  motion.animateNumber('#view [data-motion-key="pacientes:con-cita"]',{to:activeAppCount,padZeros:2,scope:'pacientes'});
  motion.animateNumber('#view [data-motion-key="pacientes:cobertura"]',{to:insuredCount,padZeros:2,scope:'pacientes'});
  motion.animateNumber('#view [data-motion-key="pacientes:sin-citas"]',{to:noAppCount,padZeros:2,scope:'pacientes'});
  patientRows();
  $('#patientfilter').onchange=e=>{patientFilter=e.target.value;patientRows();};
}
function patientRows(){
  let list=patients.filter(p=>{if(patientFilter==='active'&&p.active===false)return false;if(patientFilter==='inactive'&&p.active!==false)return false;return (p.name+' '+p.doc+' '+p.phone+' '+(p.email||'')).toLowerCase().includes(query.toLowerCase());});
  if($('#patientbadge'))$('#patientbadge').textContent=`${list.length} ${list.length===1?'expediente':'expedientes'}`;
  $('#rows').innerHTML=list.map(p=>{const pApps=appointments.filter(a=>a.pid===p.id);const nextApp=pApps.find(a=>!['Atendida','Cancelada'].includes(a.status)&&a.date>=today);return `<tr><td><div class="person"><span class="avatar">${initials(p.name)}</span><div><b>${esc(p.name)}</b><small>${badge(p.active===false?'Inactivo':'Activo')}</small></div></div></td><td><b>DNI ${p.doc}</b></td><td><b>${esc(p.phone)}</b><small>${esc(p.email||'Sin correo')}</small></td><td><span class="badge ${p.insurance==='Particular'||!p.insurance?'':'green'}">${esc(p.insurance||'Particular')}</span>${p.policy?`<small>Póliza: ${esc(p.policy)}</small>`:''}</td><td><b>${pApps.length} ${pApps.length===1?'cita':'citas'}</b><small>${nextApp?`Próxima: ${nextApp.date} (${nextApp.time})`:'Sin cita activa'}</small></td><td><a href="#pacientes/${p.id}" class="linkbutton">Ver ficha ↗</a></td></tr>`;}).join('')||'<tr><td colspan="6" class="empty">No se encontraron pacientes con estos filtros. Prueba otro término o cambia el filtro de estado.</td></tr>';
  if(motion.shouldAnimateModuleEntry('pacientes','rows')){
    motion.animateStagger('#rows tr',{scope:'pacientes',maxItems:8});
  }
}
function patientDetail(id){location.hash=`#pacientes/${id}`;}

function patientDetailView(id){
  const p=patient(id);
  if(!p){location.hash='#pacientes';return;}
  const user=auth.getSession();
  const canManagePatient=user&&['admin','recepcion'].includes(user.role);
  const pApps=appointments.filter(a=>a.pid===id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const nextApp=pApps.find(a=>!['Atendida','Cancelada'].includes(a.status)&&a.date>=today);
  const insured=p.insurance&&p.insurance!=='Particular';

  $('#view').innerHTML=`
    <div class="patient-detail-nav">
      <a href="#pacientes" class="linkbutton">← Volver al directorio de pacientes</a>
      <span class="patient-id-badge">ID PAC-${String(p.id).padStart(4,'0')}</span>
    </div>
    <section class="patient-hero">
      <div class="patient-hero-left">
        <span class="patient-avatar-large">${initials(p.name)}</span>
        <div class="patient-hero-meta">
          <div class="patient-hero-title-row">
            <h2>${esc(p.name)}</h2>
            ${badge(p.active===false?'Inactivo':'Activo')}
          </div>
          <div class="patient-hero-tags">
            <span class="patient-tag"><b>DNI:</b> ${p.doc}</span>
            <span class="patient-tag ${insured?'tag-insured':''}"><b>Cobertura:</b> ${esc(p.insurance||'Particular')}</span>
            ${p.policy?`<span class="patient-tag"><b>Póliza:</b> ${esc(p.policy)}</span>`:''}
          </div>
        </div>
      </div>
      <div class="patient-hero-actions">
        ${canManagePatient ? `
          <button id="editpatient" class="patient-action-btn">${svg.plus} Editar datos</button>
          ${p.active!==false?`<button class="primary patient-action-btn" id="bookpatient">${svg.calendar} Reservar cita</button>`:''}
          <button id="togglepatient" class="patient-action-btn ${p.active===false?'primary':'danger'}">${p.active===false?'Reactivar':'Desactivar'}</button>
        ` : `
          <span class="badge blue" style="padding:6px 10px">Modo consulta</span>
        `}
      </div>
    </section>
    <div class="patient-kpis">
      <div class="patient-kpi-item ${nextApp?'kpi-active':''}">
        <div class="kpi-head"><dt>Próxima cita</dt><div class="kpi-icon">${svg.calendar}</div></div>
        <dd>${nextApp?`${nextApp.date} · ${nextApp.time}`:'Sin cita activa'}</dd>
        <small>${nextApp?`${esc(nextApp.doctor)}`:'Disponible para agendar'}</small>
      </div>
      <div class="patient-kpi-item">
        <div class="kpi-head"><dt>Historial de visitas</dt><div class="kpi-icon">${svg.clock}</div></div>
        <dd>${pApps.length} ${pApps.length===1?'cita':'citas'}</dd>
        <small>${pApps.filter(a=>a.status==='Atendida').length} consultas atendidas</small>
      </div>
      <div class="patient-kpi-item ${insured?'kpi-insured':''}">
        <div class="kpi-head"><dt>Cobertura médica</dt><div class="kpi-icon">${svg.check}</div></div>
        <dd>${esc(p.insurance||'Particular')}</dd>
        <small>${p.policy?`Póliza ${esc(p.policy)}`:'Atención particular'}</small>
      </div>
      <div class="patient-kpi-item">
        <div class="kpi-head"><dt>Contacto de auxilio</dt><div class="kpi-icon">${svg.users}</div></div>
        <dd>${esc(p.emergencyName||'Sin registrar')}</dd>
        <small>${p.emergencyPhone?esc(p.emergencyPhone):'Sin teléfono registrado'}</small>
      </div>
    </div>
    <div class="patient-twocol">
      <div class="patient-main-col">
        <section class="panel">
          <div class="panelhead">
            <div>
              <h2>${svg.calendar} Historial de citas y atenciones (${pApps.length})</h2>
              <p>Registro cronológico de consultas, controles y procedimientos.</p>
            </div>
            ${canManagePatient && p.active!==false?`<button class="linkbutton" id="quickbook">${svg.plus} Nueva cita</button>`:''}
          </div>
          ${pApps.length?`
            <div class="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Servicio y profesional</th>
                    <th>Atención</th>
                    <th>Pago</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${pApps.map(a=>`<tr>
                    <td><b>${a.date}</b><small>${a.time} (30 min)</small></td>
                    <td><b>${esc(a.service)}</b><small>${esc(a.doctor)}</small></td>
                    <td>${badge(a.status)}</td>
                    <td>${badge(a.paid?'Pagado':'Pendiente')}</td>
                    <td><button class="linkbutton" data-history-appointment="${a.id}">Ver cita ↗</button></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          `:`
            <div class="empty">
              <p>Este paciente no tiene citas registradas en el sistema.</p>
              ${canManagePatient && p.active!==false?`<button class="primary" id="bookempty" style="margin-top:10px">${svg.calendar} Agendar primera cita</button>`:''}
            </div>
          `}
          <div class="footerline">Recepción gestiona turnos y cobros. Antecedentes médicos reservados en expediente clínico.</div>
        </section>
        <div class="note">
          <b>Información clínica ficticia para fines de prototipo:</b> Este expediente operativo almacena datos de demostración de filiación, citas y cobros. Los diagnósticos oftalmológicos, recetas de refracción (OD/OI) y presión intraocular se encuentran reservados al profesional médico tratante. La validación normativa y de credenciales corresponde a una implementación posterior.
        </div>
      </div>
      <div class="patient-side-col">
        <div class="patient-card-block">
          <h3>${svg.users} Datos de contacto</h3>
          <div class="patient-card-row"><span>Teléfono móvil</span><b><a href="tel:${esc(p.phone)}" class="contact-link">${esc(p.phone)}</a></b></div>
          <div class="patient-card-row"><span>Correo electrónico</span><span>${p.email?`<a href="mailto:${esc(p.email)}" class="contact-link">${esc(p.email)}</a>`:'<small style="color:var(--muted)">Sin registrar</small>'}</span></div>
          <div class="patient-card-row"><span>Dirección</span><span>${esc(p.address||'Sin registrar')}</span></div>
        </div>
        <div class="patient-card-block">
          <h3>${svg.eye} Cobertura médica y seguro</h3>
          <div class="patient-card-row"><span>Entidad aseguradora</span><b>${esc(p.insurance||'Particular')}</b></div>
          <div class="patient-card-row"><span>Número de póliza</span><span>${esc(p.policy||'No aplica')}</span></div>
          <div class="patient-card-row"><span>Condición</span><span class="badge ${insured?'green':''}">${insured?'Convenio vigente':'Tarifa particular'}</span></div>
        </div>
        <div class="patient-card-block">
          <h3>${svg.alert} Contacto de auxilio / emergencia</h3>
          <div class="patient-card-row"><span>Contacto</span><b>${esc(p.emergencyName||'Sin registrar')}</b></div>
          <div class="patient-card-row"><span>Teléfono directo</span><span>${p.emergencyPhone?`<a href="tel:${esc(p.emergencyPhone)}" class="contact-link">${esc(p.emergencyPhone)}</a>`:'<small style="color:var(--muted)">Sin registrar</small>'}</span></div>
        </div>
        ${p.active===false?`
          <div class="patient-card-block alert-block">
            <h3>${svg.alert} Paciente inactivo</h3>
            <p>La ficha se encuentra desactivada operativamente. No admite nuevas reservas en agenda hasta ser reactivada. Sus citas pasadas y pagos siguen resguardados.</p>
          </div>
        `:''}
      </div>
    </div>
  `;

  if($('#editpatient')) $('#editpatient').onclick=()=>patientForm(id);
  if($('#bookpatient')) $('#bookpatient').onclick=()=>appointmentForm(id);
  if($('#quickbook')) $('#quickbook').onclick=()=>appointmentForm(id);
  if($('#bookempty')) $('#bookempty').onclick=()=>appointmentForm(id);
  if($('#togglepatient')) $('#togglepatient').onclick=()=>patientStatus(id);
  document.querySelectorAll('[data-history-appointment]').forEach(b=>b.onclick=()=>appointmentDetail(Number(b.dataset.historyAppointment)));
}
function patientStatus(id){const p=patient(id);if(p.active===false){p.active=true;render();toast('Paciente reactivado en la demostración.');return;}const count=appointments.filter(a=>a.pid===id).length;openModal('Desactivar paciente',`<h2>${esc(p.name)}</h2><p style="margin-top:15px">Se impedirá crear nuevas reservas para este paciente. Su ficha, sus ${count} citas registradas y sus pagos se conservarán.</p><div class="note" style="margin-top:18px">Las citas existentes no se cancelan ni se modifican. Podrás reactivar la ficha cuando corresponda. No se elimina ningún registro.</div>`,`<button id="keepactive" autofocus>Conservar activo</button><button id="deactivate" class="danger">Desactivar paciente</button>`);$('#keepactive').onclick=()=>{if(route==='paciente-detalle')patientDetailView(id);$('#modal').close();};$('#keepactive').focus();$('#deactivate').onclick=()=>{p.active=false;$('#modal').close();render();toast('Paciente desactivado. Sus registros se conservan.')};}
function patientForm(id,onSaved,seed={}){const p=patient(id)||seed;const coverage=p.insurance||'Particular';openModal(id?'Editar ficha del paciente':'Registrar paciente',`<form id="form" novalidate><div class="fields">${field('name','Nombres y apellidos','text',p.name,true)}${field('doc','DNI · 8 dígitos','text',p.doc)}${field('phone','Teléfono · 9 dígitos','tel',p.phone)}${field('email','Correo electrónico · Opcional','email',p.email,true)}${field('address','Dirección · Opcional','text',p.address,true)}<div class="field"><label for="insurance">Seguro o cobertura</label><select id="insurance" name="insurance" aria-describedby="form-error"><option ${coverage==='Particular'?'selected':''}>Particular</option><option ${coverage==='Rímac EPS'?'selected':''}>Rímac EPS</option><option ${coverage==='Pacífico EPS'?'selected':''}>Pacífico EPS</option><option ${coverage==='Mapfre'?'selected':''}>Mapfre</option><option ${coverage==='Otro'?'selected':''}>Otro</option></select></div>${field('policy','Número de póliza','text',p.policy)}${field('emergencyName','Contacto de emergencia · Opcional','text',p.emergencyName)}${field('emergencyPhone','Teléfono de emergencia · Opcional','tel',p.emergencyPhone)}</div><div class="error" id="form-error" role="alert"></div></form><div class="note">Recepción registra únicamente datos administrativos y de contacto. Los antecedentes oftalmológicos y alergias se gestionarán en el expediente clínico.</div>`,`<button id="cancel">Cancelar</button><button class="primary" form="form" type="submit">Guardar paciente</button>`);$('#cancel').onclick=()=>$('#modal').close();$('#form').onsubmit=e=>{e.preventDefault();let name=$('#name').value.trim(),doc=$('#doc').value.trim(),phone=$('#phone').value.replace(/\s/g,''),email=$('#email').value.trim(),address=$('#address').value.trim(),insurance=$('#insurance').value,policy=$('#policy').value.trim(),emergencyName=$('#emergencyName').value.trim(),emergencyPhone=$('#emergencyPhone').value.replace(/\s/g,'');if(name.length<3)return error('Escribe el nombre completo del paciente.','name');if(!/^\d{8}$/.test(doc))return error('El DNI debe tener exactamente 8 dígitos.','doc');if(patients.some(x=>x.doc===doc&&x.id!==id))return error('Ya existe un paciente con este DNI. Busca su ficha para evitar duplicados.','doc');if(!/^\d{9}$/.test(phone))return error('Escribe un teléfono de 9 dígitos.','phone');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error('Revisa el correo electrónico.','email');if(insurance!=='Particular'&&!policy)return error('Registra el número de póliza para esta cobertura.','policy');if(emergencyName&&!emergencyPhone)return error('Registra el teléfono del contacto de emergencia.','emergencyPhone');if(emergencyPhone&&!/^\d{9}$/.test(emergencyPhone))return error('El teléfono de emergencia debe tener 9 dígitos.','emergencyPhone');if(emergencyPhone&&!emergencyName)return error('Registra el nombre del contacto de emergencia.','emergencyName');const data={name,doc,phone,email,address,insurance,policy:insurance==='Particular'?'':policy,emergencyName,emergencyPhone};if(id)Object.assign(p,data);else patients.push({id:Math.max(...patients.map(x=>x.id))+1,...data});$('#modal').close();render();toast('Ficha guardada en la demostración.');if(onSaved)onSaved(id?p:patients[patients.length-1])};}
function cashKPIs(){
  const paidToday=appointments.filter(a=>a.order&&a.paid&&a.date===today);
  const totalPaid=paidToday.reduce((acc,a)=>acc+a.amount,0);
  const pending=appointments.filter(a=>a.order&&!a.paid);
  const totalPending=pending.reduce((acc,a)=>acc+a.amount,0);
  const avgTicket=paidToday.length?Math.round(totalPaid/paidToday.length):0;

  return `<div class="stats crm-stats-strip cash-kpis">
    <div class="stat tone-success">
      <div class="stat-head">
        <span>Cobrado hoy</span>
        <div class="stat-icon">${svg.cash}</div>
      </div>
      <strong data-motion-key="cash:total-paid">${money(totalPaid)}</strong>
      <small>${paidToday.length} pagos confirmados hoy</small>
    </div>
    <div class="stat ${pending.length?'tone-warning':''}">
      <div class="stat-head">
        <span>Por cobrar</span>
        <div class="stat-icon">${svg.alert}</div>
      </div>
      <strong data-motion-key="cash:total-pending">${money(totalPending)}</strong>
      <small>${pending.length} ${pending.length===1?'orden en espera':'órdenes en espera'}</small>
    </div>
    <div class="stat tone-accent">
      <div class="stat-head">
        <span>Movimientos hoy</span>
        <div class="stat-icon">${svg.calendar}</div>
      </div>
      <strong data-motion-key="cash:moves-count">${paidToday.length.toString().padStart(2,'0')}</strong>
      <small>Constancias emitidas</small>
    </div>
    <div class="stat">
      <div class="stat-head">
        <span>Ticket promedio</span>
        <div class="stat-icon">${svg.users}</div>
      </div>
      <strong data-motion-key="cash:avg-ticket">${money(avgTicket)}</strong>
      <small>Promedio por consulta/estudio</small>
    </div>
  </div>`;
}

function cash(){
  const paidToday=appointments.filter(a=>a.order&&a.paid&&a.date===today);
  const totalPaid=paidToday.reduce((acc,a)=>acc+a.amount,0);
  const pending=appointments.filter(a=>a.order&&!a.paid);
  const totalPending=pending.reduce((acc,a)=>acc+a.amount,0);
  const avgTicket=paidToday.length?Math.round(totalPaid/paidToday.length):0;

  $('#view').innerHTML=`
    <div class="note" style="margin-bottom:20px">
      <b>Módulo de Caja y Cobros:</b> Concilia las órdenes de atención emitidas desde Agenda, registra cobros por Efectivo (con cálculo de vuelto), Tarjetas (POS), Yape / Plin o Transferencia bancaria y emite la orden interna de pago o constancia interna de pago.
    </div>
    ${cashKPIs()}
    <div class="toolbar">
      ${search('Buscar por paciente, DNI, concepto o constancia…')}
      <div class="tabs">
        <button id="tab-pending" class="${cashTab==='pending'?'active':''}">Por cobrar</button>
        <button id="tab-paid" class="${cashTab==='paid'?'active':''}">Movimientos (${appointments.filter(a=>a.order&&a.paid).length})</button>
        <button id="tab-reconciliation" class="${cashTab==='reconciliation'?'active':''}">Cuadre de caja</button>
      </div>
      <button class="primary" id="directpay">${svg.plus} Registrar cobro</button>
    </div>
    <div id="cashcontent"></div>
  `;

  if(motion.shouldAnimateModuleEntry('caja','kpis')){
    motion.animateStagger('.cash-kpis .stat',{scope:'caja',maxItems:4});
  }
  motion.animateNumber('#view [data-motion-key="cash:total-paid"]',{to:totalPaid,scope:'caja',customFormatter:money});
  motion.animateNumber('#view [data-motion-key="cash:total-pending"]',{to:totalPending,scope:'caja',customFormatter:money});
  motion.animateNumber('#view [data-motion-key="cash:moves-count"]',{to:paidToday.length,padZeros:2,scope:'caja'});
  motion.animateNumber('#view [data-motion-key="cash:avg-ticket"]',{to:avgTicket,scope:'caja',customFormatter:money});

  cashRows();

  $('#tab-pending').onclick=()=>{cashTab='pending';location.hash='#caja/por-cobrar';};
  $('#tab-paid').onclick=()=>{cashTab='paid';location.hash='#caja/movimientos';};
  $('#tab-reconciliation').onclick=()=>{cashTab='reconciliation';location.hash='#caja/cuadre';};
  $('#directpay').onclick=()=>payModal();
}

function cashRows(){
  const container=$('#cashcontent');
  if(!container)return;

  if(cashTab==='reconciliation'){
    reconciliationView(container);
    return;
  }

  const isPending=cashTab==='pending';
  const list=appointments.filter(a=>{
    if(!a.order)return false;
    if(isPending&&a.paid)return false;
    if(!isPending&&!a.paid)return false;
    const p=patient(a.pid);
    const searchTarget=`${p?.name||''} ${p?.doc||''} ${a.service||''} ${a.reference||''} OP-${String(a.id).padStart(4,'0')}`.toLowerCase();
    return searchTarget.includes(query.toLowerCase());
  }).sort((a,b)=>(b.paidAt||b.date+b.time).localeCompare(a.paidAt||a.date+a.time));

  container.innerHTML=`
    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svg.cash} ${isPending?'Órdenes pendientes de pago':'Movimientos y cobros registrados'}</h2>
          <p>${isPending?'Pacientes que han registrado su llegada y requieren pago completo previo a consulta.':'Registro correlativo de cobros completados y constancias emitidas.'}</p>
        </div>
        <span class="badge ${isPending?(list.length?'gold':'green'):'green'}">${list.length} ${list.length===1?'constancia':'constancias'}</span>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Paciente</th>
              <th>Concepto y Médico</th>
              <th>Importe</th>
              ${!isPending?'<th>Método</th><th>Fecha y hora</th>':'<th>Estado</th>'}
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a=>{
              const p=patient(a.pid);
              const ref=a.reference||`OP-${String(a.id).padStart(4,'0')}`;
              return `<tr>
                <td><b class="tnum">${esc(ref)}</b></td>
                <td>
                  <div class="person">
                    <span class="avatar">${initials(p?.name||'Paciente')}</span>
                    <div>
                      <b>${esc(p?.name||'Paciente')}</b>
                      <small>DNI ${p?.doc||'—'}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <b>${esc(a.service)}</b>
                  <small>${esc(a.doctor||'Clínica oftalmológica')}</small>
                </td>
                <td><b class="tnum" style="font-size:14px;color:var(--forest)">${money(a.amount)}</b></td>
                ${!isPending?`
                  <td>${methodBadge(a.method)}</td>
                  <td><small class="tnum">${esc(a.paidAt||a.date+' '+a.time)}</small></td>
                `:`
                  <td>${badge('Pendiente')}</td>
                `}
                <td>
                  ${isPending?`
                    <button class="primary" data-pay="${a.id}">Cobrar 💳</button>
                  `:`
                    <button class="linkbutton" data-receipt="${a.id}">Constancia ↗</button>
                  `}
                </td>
              </tr>`;
            }).join('')||`<tr><td colspan="7" class="empty">${isPending?'No hay órdenes pendientes de cobro en este momento. Todas las llegadas están al día.':'No se encontraron movimientos con los filtros aplicados.'}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="footerline">Solo se admiten pagos completos por política de admisión. Todo cobro emite constancia interna de pago administrativo de demostración.</div>
    </section>
  `;

  document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>payModal(Number(b.dataset.pay)));
  document.querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>{
    const a=appointments.find(x=>x.id===Number(b.dataset.receipt));
    if(a)receipt(a);
  });
}

function reconciliationView(container){
  const paidToday=appointments.filter(a=>a.order&&a.paid&&a.date===today);
  const totalGeneral=paidToday.reduce((acc,a)=>acc+a.amount,0);

  const byCash=paidToday.filter(a=>a.method==='Efectivo');
  const totalCash=byCash.reduce((acc,a)=>acc+a.amount,0);

  const byPOS=paidToday.filter(a=>a.method&&a.method.includes('Tarjeta'));
  const totalPOS=byPOS.reduce((acc,a)=>acc+a.amount,0);

  const byWallet=paidToday.filter(a=>a.method&&(a.method.includes('Yape')||a.method.includes('Plin')));
  const totalWallet=byWallet.reduce((acc,a)=>acc+a.amount,0);

  const byTransfer=paidToday.filter(a=>a.method&&a.method.includes('Transferencia'));
  const totalTransfer=byTransfer.reduce((acc,a)=>acc+a.amount,0);

  container.innerHTML=`
    <div class="reconciliation-panel">
      <div class="reconciliation-hero">
        <div>
          <span class="eyebrow" style="color:rgba(255,255,255,0.8)">ARQUEO Y CUADRE DE CAJA</span>
          <h2 style="color:white;font-size:22px;margin:4px 0">Cierre de Turno · ${new Intl.DateTimeFormat('es-PE',{dateStyle:'full'}).format(new Date(today+'T12:00:00'))}</h2>
          <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0">Conciliación de pagos recaudados por medio de cobro.</p>
        </div>
        <div class="reconciliation-hero-right">
          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;opacity:0.8">Total Recaudado</span>
          <strong style="font-size:30px;display:block">${money(totalGeneral)}</strong>
          <small style="opacity:0.85">${paidToday.length} ${paidToday.length===1?'constancia liquidada':'constancias liquidadas'}</small>
        </div>
      </div>

      <div class="reconciliation-grid">
        <div class="reconciliation-card card-cash">
          <div class="rec-card-head">
            <span>💵 Efectivo en gaveta</span>
            <span class="rec-count">${byCash.length} pagos</span>
          </div>
          <strong class="rec-amount">${money(totalCash)}</strong>
          <small>Efectivo recibido en soles</small>
        </div>

        <div class="reconciliation-card card-card">
          <div class="rec-card-head">
            <span>💳 Tarjetas POS</span>
            <span class="rec-count">${byPOS.length} pagos</span>
          </div>
          <strong class="rec-amount">${money(totalPOS)}</strong>
          <small>Lotes POS Visa / Mastercard</small>
        </div>

        <div class="reconciliation-card card-wallet">
          <div class="rec-card-head">
            <span>📱 Billeteras (Yape / Plin)</span>
            <span class="rec-count">${byWallet.length} pagos</span>
          </div>
          <strong class="rec-amount">${money(totalWallet)}</strong>
          <small>Transferencias móviles inmediatas</small>
        </div>

        <div class="reconciliation-card card-transfer">
          <div class="rec-card-head">
            <span>🏛️ Transferencias</span>
            <span class="rec-count">${byTransfer.length} pagos</span>
          </div>
          <strong class="rec-amount">${money(totalTransfer)}</strong>
          <small>Abonos bancarios verificados</small>
        </div>
      </div>

      <section class="panel" style="margin-top:20px">
        <div class="panelhead">
          <div>
            <h2>Detalle correlativo de cobros del día</h2>
            <p>Lista cronológica de liquidaciones para respaldo del reporte de cierre.</p>
          </div>
          <button class="primary" id="printreconciliation">🖨️ Imprimir reporte de cierre</button>
        </div>
        <div class="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Constancia de pago</th>
                <th>Paciente</th>
                <th>Concepto</th>
                <th>Medio</th>
                <th>Importe</th>
                <th>Cajero</th>
              </tr>
            </thead>
            <tbody>
              ${paidToday.map(a=>`
                <tr>
                  <td><b>${esc(a.paidAt?a.paidAt.split(' ')[1]:a.time)}</b></td>
                  <td><span class="tnum">${esc(a.reference||'OP-'+String(a.id).padStart(4,'0'))}</span></td>
                  <td><b>${esc(patient(a.pid)?.name||'Paciente')}</b></td>
                  <td>${esc(a.service)}</td>
                  <td>${methodBadge(a.method)}</td>
                  <td><b style="color:var(--forest)">${money(a.amount)}</b></td>
                  <td><small>${esc(a.cashier||'Recepción · Caja')}</small></td>
                </tr>
              `).join('')||'<tr><td colspan="7" class="empty">No hay cobros liquidados hoy.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  $('#printreconciliation').onclick=()=>window.print();
}

function payModal(appointmentId, presetPatientId){
  let a=appointmentId?appointments.find(x=>x.id===appointmentId):null;
  let p=a?patient(a.pid):presetPatientId?patient(presetPatientId):null;
  let defaultAmount=a?a.amount:150;
  let defaultConcept=a?a.service:'Consulta oftalmológica general';

  openModal(
    a?'Registrar cobro de orden':'Registrar nuevo cobro',
    `
    <form id="payform" novalidate>
      <div class="fields">
        ${!a?`
          <div class="field full">
            <label for="pay-pid">Paciente *</label>
            <select id="pay-pid">
              ${patients.map(pt=>`<option value="${pt.id}" ${(p?.id===pt.id)?'selected':''}>${esc(pt.name)} · DNI ${pt.doc}</option>`).join('')}
            </select>
          </div>
          <div class="field full">
            <label for="pay-catalog">Elegir del catálogo oftalmológico (opcional)</label>
            <select id="pay-catalog">
              <option value="">-- Seleccionar servicio del tarifario --</option>
              ${servicesCatalog.filter(s=>s.active!==false).map(s=>`<option value="${s.id}">${s.name} · ${money(s.price)}</option>`).join('')}
            </select>
          </div>
        `:`
          <div class="field full" style="background:#f1f5f3;padding:12px;border-radius:8px">
            <small style="color:var(--muted);display:block;margin-bottom:2px">PACIENTE Y ORDEN</small>
            <b style="font-size:15px;color:var(--forest)">${esc(p?.name||'Paciente')}</b> · DNI ${p?.doc||'—'}
            <div style="font-size:12px;color:var(--muted);margin-top:4px">Orden: <b>OP-${String(a.id).padStart(4,'0')}</b> · Horario: ${a.date} ${a.time} · ${esc(a.doctor||'')}</div>
          </div>
        `}

        <div class="field full">
          <label for="pay-concept">Concepto del cobro *</label>
          <input id="pay-concept" value="${esc(defaultConcept)}" placeholder="Ej: Consulta oftalmológica general" aria-describedby="pay-error">
        </div>

        <div class="field">
          <label for="pay-amount">Importe total (S/) *</label>
          <input id="pay-amount" type="number" step="0.01" min="1" value="${defaultAmount}" aria-describedby="pay-error">
        </div>

        <div class="field">
          <label for="pay-method">Medio de pago *</label>
          <select id="pay-method">
            <option value="Efectivo" selected>💵 Efectivo</option>
            <option value="Tarjeta (POS)">💳 Tarjeta débito / crédito (POS)</option>
            <option value="Yape">📱 Yape (Billetera BCP)</option>
            <option value="Plin">📱 Plin (Billetera digital)</option>
            <option value="Transferencia bancaria">🏛️ Transferencia bancaria</option>
          </select>
        </div>

        <div id="method-dynamic" class="field full" style="margin-top:0"></div>

        <div class="field full">
          <label for="pay-receipt-type">Tipo de documento de cobro</label>
          <select id="pay-receipt-type">
            <option value="Constancia interna de pago" selected>Constancia interna de pago</option>
            <option value="Orden interna de pago">Orden interna de pago</option>
          </select>
        </div>
      </div>
      <div id="pay-error" class="error" role="alert"></div>
    </form>
    `,
    `
    <button id="pay-cancel">Cancelar</button>
    <button id="pay-submit" class="primary" form="payform" type="submit">Confirmar cobro</button>
    `,
    true
  );

  const updateMethodFields=()=>{
    const method=$('#pay-method').value;
    const amount=Number($('#pay-amount').value)||0;
    const box=$('#method-dynamic');

    if(method==='Efectivo'){
      box.innerHTML=`
        <div class="cash-calc-box">
          <div>
            <label for="pay-received">Monto recibido del paciente (S/)</label>
            <input id="pay-received" type="number" step="0.50" min="${amount}" value="${amount}" placeholder="Ej: 200">
          </div>
          <div class="cash-change-display">
            <span>Vuelto a entregar:</span>
            <b id="pay-change-val">S/ 0.00</b>
          </div>
        </div>
      `;
      const updateChange=()=>{
        const received=Number($('#pay-received').value)||0;
        const curAmount=Number($('#pay-amount').value)||0;
        const diff=Math.max(0,received-curAmount);
        $('#pay-change-val').textContent=money(diff);
      };
      $('#pay-received').oninput=updateChange;
      $('#pay-amount').oninput=updateChange;
    }else if(method==='Tarjeta (POS)'){
      box.innerHTML=`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label for="pay-ref">N° de Operación / Voucher POS</label>
            <input id="pay-ref" placeholder="Ej: POS-10492">
          </div>
          <div>
            <label for="pay-cardtype">Tipo de tarjeta</label>
            <select id="pay-cardtype">
              <option>Visa Débito</option>
              <option>Visa Crédito</option>
              <option>Mastercard Débito</option>
              <option>Mastercard Crédito</option>
              <option>Amex</option>
            </select>
          </div>
        </div>
      `;
    }else if(method==='Yape'||method==='Plin'){
      box.innerHTML=`
        <div>
          <label for="pay-ref">Código de validación / Aprobación de la app (6 dígitos)</label>
          <input id="pay-ref" placeholder="Ej: 948271" maxlength="10">
        </div>
      `;
    }else if(method==='Transferencia bancaria'){
      box.innerHTML=`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label for="pay-bank">Entidad bancaria</label>
            <select id="pay-bank">
              <option>BCP</option>
              <option>BBVA</option>
              <option>Interbank</option>
              <option>Scotiabank</option>
              <option>Banco de la Nación</option>
            </select>
          </div>
          <div>
            <label for="pay-ref">N° de Constancia de transferencia</label>
            <input id="pay-ref" placeholder="Ej: OP-8492041">
          </div>
        </div>
      `;
    }
  };

  updateMethodFields();
  $('#pay-method').onchange=updateMethodFields;

  if($('#pay-catalog')){
    $('#pay-catalog').onchange=e=>{
      const sId=Number(e.target.value);
      const serv=servicesCatalog.find(s=>s.id===sId);
      if(serv){
        $('#pay-concept').value=serv.name;
        $('#pay-amount').value=serv.price;
        updateMethodFields();
      }
    };
  }

  $('#pay-cancel').onclick=()=>$('#modal').close();

  $('#payform').onsubmit=e=>{
    e.preventDefault();
    const concept=$('#pay-concept').value.trim();
    const amount=Number($('#pay-amount').value);
    const method=$('#pay-method').value;
    const receiptType=$('#pay-receipt-type').value;

    if(!concept)return error('Indica el concepto o servicio a cobrar.','pay-concept');
    if(!amount||amount<=0)return error('Indica un monto mayor a cero.','pay-amount');

    let cashReceived=0;
    let change=0;
    let ref='';

    if(method==='Efectivo'){
      cashReceived=Number($('#pay-received')?.value)||amount;
      if(cashReceived<amount){
        return error(`El monto recibido (S/ ${cashReceived}) no puede ser menor al total (S/ ${amount}).`,'pay-received');
      }
      change=cashReceived-amount;
      ref=`EFECT-${Date.now().toString().slice(-4)}`;
    }else{
      ref=$('#pay-ref')?.value?.trim()||`${method.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    }

    const pid=a?a.pid:Number($('#pay-pid').value);
    const timeNow=new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'}).format(new Date());
    const paidAt=`${today} ${timeNow}`;
    const reference=`${receiptType.includes('Constancia')?'CP-':'OP-'}${String(Math.floor(1000+Math.random()*9000))}`;
    const activeUser=auth.getSession();
    const cashierName=activeUser?activeUser.name:'Caja · Prototipo';

    if(a){
      Object.assign(a,{
        paid:true,
        order:true,
        service:concept,
        amount,
        method,
        reference,
        receiptType,
        paidAt,
        cashier:cashierName,
        cashReceived,
        change
      });
    }else{
      a={
        id:Math.max(...appointments.map(x=>x.id))+1,
        pid,
        date:today,
        time:timeNow,
        doctor:'Sede Principal',
        service:concept,
        amount,
        status:'Atendida',
        order:true,
        paid:true,
        method,
        reference,
        receiptType,
        paidAt,
        cashier:cashierName,
        cashReceived,
        change
      };
      appointments.push(a);
    }

    $('#modal').close();
    if(a){
      completeTurnAfterPayment(a.id,{operatorName:cashierName});
    }
    render();
    toast(`Cobro de ${money(amount)} registrado.`);
    receipt(a);
  };
}
function crm(){renderCRM({patients,appointments,modal:openModal,toast,book:appointmentForm,register:(contact,saved)=>patientForm(undefined,saved,contact),openPatient:id=>{location.hash=`#pacientes/${id}`;}})}
function inbox(){renderInbox({patients,appointments,modal:openModal,toast,book:appointmentForm})}
function armCenter(){renderARM({toast,startTour:startDemoTour,pendingRecoveries:getPendingNoShowRecoveries,executeRecovery:executeNoShowRecovery,user:auth.getSession(),openModal})}
function automationsView(){renderAutomations({toast,user:auth.getSession(),openModal})}
// ==========================================
// MANTENIMIENTO: MÉDICOS TRATANTES
// ==========================================
function adminDoctorsView(){
  const activeCount = doctors.filter(d=>d.active!==false).length;
  const morningCount = doctors.filter(d=>d.active!==false && (d.shift||'').includes('Mañana')).length;
  const afternoonCount = doctors.filter(d=>d.active!==false && (d.shift||'').includes('Tarde')).length;
  const todayApps = appointments.filter(a=>a.date===today && a.status!=='Cancelada').length;

  $('#view').innerHTML = `
    <div class="stats">
      <div class="stat tone-accent">
        <div class="stat-head"><span>Médicos registrados</span><div class="stat-icon">${svg.doctor}</div></div>
        <strong>${doctors.length.toString().padStart(2,'0')}</strong>
        <small>${activeCount} habilitados para consulta</small>
      </div>
      <div class="stat tone-success">
        <div class="stat-head"><span>Turno Mañana</span><div class="stat-icon">${svg.clock}</div></div>
        <strong>${morningCount.toString().padStart(2,'0')}</strong>
        <small>08:30 a 13:00</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Turno Tarde</span><div class="stat-icon">${svg.clock}</div></div>
        <strong>${afternoonCount.toString().padStart(2,'0')}</strong>
        <small>14:00 a 18:30</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Citas en curso hoy</span><div class="stat-icon">${svg.calendar}</div></div>
        <strong>${todayApps.toString().padStart(2,'0')}</strong>
        <small>Distribuidas en el staff</small>
      </div>
    </div>

    <div class="toolbar">
      ${search('Buscar médico por nombre, CMP, RNE o subespecialidad…')}
      <select id="admin-doc-filter" aria-label="Filtrar médicos">
        <option value="all" ${adminFilter==='all'?'selected':''}>Todos los médicos</option>
        <option value="active" ${adminFilter==='active'?'selected':''}>Solo habilitados (activos)</option>
        <option value="inactive" ${adminFilter==='inactive'?'selected':''}>Solo inactivos / suspendidos</option>
        <option value="morning" ${adminFilter==='morning'?'selected':''}>Turno mañana</option>
        <option value="afternoon" ${adminFilter==='afternoon'?'selected':''}>Turno tarde</option>
      </select>
    </div>

    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svg.doctor} Directorio de médicos tratantes</h2>
          <p>Cuerpo médico colegiado autorizado para consulta, cirugías y emisión de recetas.</p>
        </div>
        <span class="badge" id="admin-doc-badge">${doctors.length} médicos</span>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Médico / Profesional</th>
              <th>Colegiatura CMP / RNE</th>
              <th>Especialidad clínica</th>
              <th>Turno asignado</th>
              <th>Citas hoy</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="footerline">Datos profesionales de demostración. Los campos CMP y RNE ilustran la estructura del registro; la validación normativa y de credenciales corresponde a una implementación posterior.</div>
    </section>
  `;

  adminDoctorRows();

  $('#admin-doc-filter').onchange = e => {
    adminFilter = e.target.value;
    adminDoctorRows();
  };
}

function adminDoctorRows(){
  let list = doctors.filter(d => {
    if(adminFilter==='active' && d.active===false) return false;
    if(adminFilter==='inactive' && d.active!==false) return false;
    if(adminFilter==='morning' && !(d.shift||'').includes('Mañana')) return false;
    if(adminFilter==='afternoon' && !(d.shift||'').includes('Tarde')) return false;
    const term = (d.name + ' ' + (d.cmp||'') + ' ' + (d.rne||'') + ' ' + (d.specialty||'')).toLowerCase();
    return term.includes(query.toLowerCase());
  });

  if($('#admin-doc-badge')) $('#admin-doc-badge').textContent = `${list.length} ${list.length===1?'médico':'médicos'}`;

  $('#rows').innerHTML = list.map(d => {
    const docApps = appointments.filter(a => a.doctor === d.name && a.date === today && a.status !== 'Cancelada').length;
    const isMorning = (d.shift||'').includes('Mañana');
    return `
      <tr>
        <td>
          <div class="person">
            <span class="avatar">${initials(d.name)}</span>
            <div>
              <b>${esc(d.name)}</b>
              <small>Sede Central</small>
            </div>
          </div>
        </td>
        <td>
          <span class="cmp-badge">CMP ${esc(d.cmp||'—')}</span>
          ${d.rne ? `<span class="cmp-badge" style="margin-left:4px">RNE ${esc(d.rne)}</span>` : ''}
        </td>
        <td><b>${esc(d.specialty)}</b></td>
        <td>
          <span class="shift-badge ${isMorning?'shift-morning':'shift-afternoon'}">
            ${svg.clock} ${esc(d.shift||'No asignado')}
          </span>
        </td>
        <td><b>${docApps}</b> <small>citas hoy</small></td>
        <td>${badge(d.active===false?'Inactivo':'Activo')}</td>
        <td>
          <div class="admin-actions-cell">
            <button class="admin-action-btn" data-edit-doc="${d.id}">Editar</button>
            <button class="admin-action-btn ${d.active===false?'btn-toggle-activate':'btn-toggle-deactivate'}" data-toggle-doc="${d.id}">
              ${d.active===false?'Reactivar':'Desactivar'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" class="empty">No se encontraron médicos con los filtros aplicados.</td></tr>';

  document.querySelectorAll('[data-edit-doc]').forEach(b => {
    b.onclick = () => doctorForm(Number(b.dataset.editDoc));
  });

  document.querySelectorAll('[data-toggle-doc]').forEach(b => {
    b.onclick = () => {
      const doc = doctors.find(d => d.id === Number(b.dataset.toggleDoc));
      if(!doc) return;
      doc.active = doc.active === false;
      render();
      toast(doc.active ? `Médico ${doc.name} reactivado.` : `Médico ${doc.name} desactivado.`);
    };
  });
}

function doctorForm(id){
  const doc = id ? doctors.find(d => d.id === id) : {
    name: '',
    cmp: '',
    rne: '',
    specialty: 'Oftalmología general',
    shift: 'Mañana (08:30–13:00)',
    active: true
  };

  openModal(
    id ? 'Editar médico tratante' : 'Registrar nuevo médico',
    `
    <form id="doc-form" novalidate>
      <div class="fields">
        ${field('doc-name','Nombres y apellidos completos *','text',doc.name,true)}
        ${field('doc-cmp','N° Colegiatura CMP (4-6 dígitos) *','text',doc.cmp||'')}
        ${field('doc-rne','N° Registro de Especialista RNE (opcional)','text',doc.rne||'')}
        <div class="field full">
          <label for="doc-specialty">Especialidad / Subespecialidad clínica *</label>
          <input id="doc-specialty" value="${esc(doc.specialty||'')}" placeholder="Ej: Oftalmología general y Córnea" required>
        </div>
        <div class="field full">
          <label for="doc-shift">Turno y horario asistencial *</label>
          <select id="doc-shift">
            <option value="Mañana (08:30–13:00)" ${(doc.shift||'').includes('Mañana')?'selected':''}>Mañana (08:30–13:00)</option>
            <option value="Tarde (14:00–18:30)" ${(doc.shift||'').includes('Tarde')?'selected':''}>Tarde (14:00–18:30)</option>
            <option value="Jornada completa (08:30–18:30)" ${(doc.shift||'').includes('completa')?'selected':''}>Jornada completa (08:30–18:30)</option>
          </select>
        </div>
      </div>
      <div id="form-error" class="error" role="alert"></div>
    </form>
    <div class="note">El profesional habilitado aparecerá de inmediato para agendamiento en Recepción y asignación de consultas.</div>
    `,
    `
    <button id="doc-cancel">Cancelar</button>
    <button class="primary" type="submit" form="doc-form">Guardar médico</button>
    `
  );

  $('#doc-cancel').onclick = () => $('#modal').close();

  $('#doc-form').onsubmit = e => {
    e.preventDefault();
    const name = $('#doc-name').value.trim();
    const cmp = $('#doc-cmp').value.trim();
    const rne = $('#doc-rne').value.trim();
    const specialty = $('#doc-specialty').value.trim();
    const shift = $('#doc-shift').value;

    if(name.length < 3) return error('Indica los nombres y apellidos del médico.','doc-name');
    if(!/^\d{4,6}$/.test(cmp)) return error('El CMP debe tener entre 4 y 6 dígitos numéricos.','doc-cmp');
    if(specialty.length < 3) return error('Indica la especialidad clínica del médico.','doc-specialty');

    if(id){
      Object.assign(doc, {name, cmp, rne, specialty, shift});
    }else{
      const newId = Math.max(...doctors.map(d=>d.id), 0) + 1;
      doctors.push({id: newId, name, cmp, rne, specialty, shift, active: true});
    }

    $('#modal').close();
    render();
    toast(id ? `Médico ${name} actualizado con éxito.` : `Médico ${name} incorporado al staff.`);
  };
}

// ==========================================
// MANTENIMIENTO: TÉCNICOS Y OPTOMETRÍA
// ==========================================
function adminTechniciansView(){
  const activeCount = technicians.filter(t=>t.active!==false).length;
  const morningCount = technicians.filter(t=>t.active!==false && (t.shift||'').includes('Mañana')).length;
  const afternoonCount = technicians.filter(t=>t.active!==false && (t.shift||'').includes('Tarde')).length;
  const studiesInFlow = preliminaryStudies.length;

  $('#view').innerHTML = `
    <div class="stats">
      <div class="stat tone-accent">
        <div class="stat-head"><span>Técnicos registrados</span><div class="stat-icon">${svg.flask}</div></div>
        <strong>${technicians.length.toString().padStart(2,'0')}</strong>
        <small>${activeCount} habilitados en sede</small>
      </div>
      <div class="stat tone-success">
        <div class="stat-head"><span>Turno Mañana</span><div class="stat-icon">${svg.clock}</div></div>
        <strong>${morningCount.toString().padStart(2,'0')}</strong>
        <small>08:30 a 13:30</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Turno Tarde</span><div class="stat-icon">${svg.clock}</div></div>
        <strong>${afternoonCount.toString().padStart(2,'0')}</strong>
        <small>13:30 a 18:30</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Estudios en flujo hoy</span><div class="stat-icon">${svg.eye}</div></div>
        <strong>${studiesInFlow.toString().padStart(2,'0')}</strong>
        <small>Mediciones técnicas</small>
      </div>
    </div>

    <div class="toolbar">
      ${search('Buscar técnico por nombre, código OPT o área…')}
      <select id="admin-tec-filter" aria-label="Filtrar técnicos">
        <option value="all" ${adminFilter==='all'?'selected':''}>Todos los técnicos</option>
        <option value="active" ${adminFilter==='active'?'selected':''}>Solo habilitados (activos)</option>
        <option value="inactive" ${adminFilter==='inactive'?'selected':''}>Solo inactivos / suspendidos</option>
      </select>
    </div>

    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svg.flask} Personal de optometría y exámenes diagnósticos</h2>
          <p>Técnicos encargados de refracción computarizada, tonometría PIO, topografía y paquimetría.</p>
        </div>
        <span class="badge" id="admin-tec-badge">${technicians.length} técnicos</span>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Personal técnico</th>
              <th>Código interno</th>
              <th>Área de competencia</th>
              <th>Turno asignado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="footerline">Personal capacitado para calibración de equipos oftalmológicos y pruebas diagnósticas preliminares.</div>
    </section>
  `;

  adminTechnicianRows();

  $('#admin-tec-filter').onchange = e => {
    adminFilter = e.target.value;
    adminTechnicianRows();
  };
}

function adminTechnicianRows(){
  let list = technicians.filter(t => {
    if(adminFilter==='active' && t.active===false) return false;
    if(adminFilter==='inactive' && t.active!==false) return false;
    const term = (t.name + ' ' + (t.code||'') + ' ' + (t.specialty||'')).toLowerCase();
    return term.includes(query.toLowerCase());
  });

  if($('#admin-tec-badge')) $('#admin-tec-badge').textContent = `${list.length} ${list.length===1?'técnico':'técnicos'}`;

  $('#rows').innerHTML = list.map(t => {
    const isMorning = (t.shift||'').includes('Mañana');
    return `
      <tr>
        <td>
          <div class="person">
            <span class="avatar">${initials(t.name)}</span>
            <div>
              <b>${esc(t.name)}</b>
              <small>Área de Diagnóstico</small>
            </div>
          </div>
        </td>
        <td><span class="cmp-badge">${esc(t.code||'OPT-0000')}</span></td>
        <td><b>${esc(t.specialty)}</b></td>
        <td>
          <span class="shift-badge ${isMorning?'shift-morning':'shift-afternoon'}">
            ${svg.clock} ${esc(t.shift||'No asignado')}
          </span>
        </td>
        <td>${badge(t.active===false?'Inactivo':'Activo')}</td>
        <td>
          <div class="admin-actions-cell">
            <button class="admin-action-btn" data-edit-tec="${t.id}">Editar</button>
            <button class="admin-action-btn ${t.active===false?'btn-toggle-activate':'btn-toggle-deactivate'}" data-toggle-tec="${t.id}">
              ${t.active===false?'Reactivar':'Desactivar'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="empty">No se encontraron técnicos con los filtros aplicados.</td></tr>';

  document.querySelectorAll('[data-edit-tec]').forEach(b => {
    b.onclick = () => technicianForm(Number(b.dataset.editTec));
  });

  document.querySelectorAll('[data-toggle-tec]').forEach(b => {
    b.onclick = () => {
      const tec = technicians.find(t => t.id === Number(b.dataset.toggleTec));
      if(!tec) return;
      tec.active = tec.active === false;
      render();
      toast(tec.active ? `Técnico ${tec.name} reactivado.` : `Técnico ${tec.name} desactivado.`);
    };
  });
}

function technicianForm(id){
  const tec = id ? technicians.find(t => t.id === id) : {
    name: '',
    code: 'OPT-' + String(Math.floor(100 + Math.random()*900)),
    specialty: 'Optometría y Refracción computarizada',
    shift: 'Mañana (08:30–13:30)',
    active: true
  };

  openModal(
    id ? 'Editar técnico u optometrista' : 'Registrar nuevo técnico',
    `
    <form id="tec-form" novalidate>
      <div class="fields">
        ${field('tec-name','Nombres y apellidos completos *','text',tec.name,true)}
        ${field('tec-code','Código interno de personal (ej: OPT-0240) *','text',tec.code)}
        <div class="field full">
          <label for="tec-specialty">Área de competencia / Equipos asignados *</label>
          <input id="tec-specialty" value="${esc(tec.specialty||'')}" placeholder="Ej: Tonometría ocular PIO, Paquimetría y Campimetría" required>
        </div>
        <div class="field full">
          <label for="tec-shift">Turno asignado *</label>
          <select id="tec-shift">
            <option value="Mañana (08:30–13:30)" ${(tec.shift||'').includes('Mañana')?'selected':''}>Mañana (08:30–13:30)</option>
            <option value="Tarde (13:30–18:30)" ${(tec.shift||'').includes('Tarde')?'selected':''}>Tarde (13:30–18:30)</option>
            <option value="Jornada completa (08:30–18:30)" ${(tec.shift||'').includes('completa')?'selected':''}>Jornada completa (08:30–18:30)</option>
          </select>
        </div>
      </div>
      <div id="form-error" class="error" role="alert"></div>
    </form>
    <div class="note">El técnico habilitado podrá registrar mediciones previas de optometría y visualizarlas en la cola de estudios.</div>
    `,
    `
    <button id="tec-cancel">Cancelar</button>
    <button class="primary" type="submit" form="tec-form">Guardar técnico</button>
    `
  );

  $('#tec-cancel').onclick = () => $('#modal').close();

  $('#tec-form').onsubmit = e => {
    e.preventDefault();
    const name = $('#tec-name').value.trim();
    const code = $('#tec-code').value.trim();
    const specialty = $('#tec-specialty').value.trim();
    const shift = $('#tec-shift').value;

    if(name.length < 3) return error('Indica los nombres y apellidos del técnico.','tec-name');
    if(!code) return error('Indica el código de identificación OPT.','tec-code');
    if(specialty.length < 3) return error('Indica las competencias técnicas o equipos asignados.','tec-specialty');

    if(id){
      Object.assign(tec, {name, code, specialty, shift});
    }else{
      const newId = Math.max(...technicians.map(t=>t.id), 0) + 1;
      technicians.push({id: newId, name, code, specialty, shift, active: true});
    }

    $('#modal').close();
    render();
    toast(id ? `Técnico ${name} actualizado con éxito.` : `Técnico ${name} registrado con éxito.`);
  };
}

// ==========================================
// MANTENIMIENTO: USUARIOS Y ACCESOS (RBAC + OTP)
// ==========================================
function adminUsersView(){
  const allUsers = auth.getUsers();
  const activeCount = allUsers.filter(u=>u.active!==false).length;
  const adminCount = allUsers.filter(u=>u.role==='admin').length;
  const medCount = allUsers.filter(u=>u.role==='medico').length;
  const blockedCount = allUsers.filter(u=>u.active===false).length;

  $('#view').innerHTML = `
    <div class="stats">
      <div class="stat tone-accent">
        <div class="stat-head"><span>Cuentas de usuario</span><div class="stat-icon">${svg.key}</div></div>
        <strong>${allUsers.length.toString().padStart(2,'0')}</strong>
        <small>${activeCount} activas · ${blockedCount} suspendidas</small>
      </div>
      <div class="stat tone-success">
        <div class="stat-head"><span>Médicos con login</span><div class="stat-icon">${svg.stethoscope}</div></div>
        <strong>${medCount.toString().padStart(2,'0')}</strong>
        <small>Acceso a historias clínicas</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Administradores</span><div class="stat-icon">${svg.users}</div></div>
        <strong>${adminCount.toString().padStart(2,'0')}</strong>
        <small>Gestión total de sede</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Seguridad de acceso</span><div class="stat-icon">${svg.mail}</div></div>
        <strong>OTP</strong>
        <small>Validación por correo</small>
      </div>
    </div>

    <div class="toolbar">
      ${search('Buscar usuario por nombre, correo corporativo o departamento…')}
      <select id="admin-user-filter" aria-label="Filtrar usuarios por rol">
        <option value="all" ${adminFilter==='all'?'selected':''}>Todos los roles</option>
        <option value="admin" ${adminFilter==='admin'?'selected':''}>Administradores</option>
        <option value="medico" ${adminFilter==='medico'?'selected':''}>Médicos Oftalmólogos</option>
        <option value="tecnico" ${adminFilter==='tecnico'?'selected':''}>Técnicos de Optometría</option>
        <option value="recepcion" ${adminFilter==='recepcion'?'selected':''}>Recepción y Admisión</option>
        <option value="caja" ${adminFilter==='caja'?'selected':''}>Caja y Cobros</option>
        <option value="inactive" ${adminFilter==='inactive'?'selected':''}>Cuentas bloqueadas / inactivas</option>
      </select>
    </div>

    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svg.key} Cuentas del sistema y roles de seguridad RBAC</h2>
          <p>Cada usuario ingresa mediante código numérico de 6 dígitos (OTP) enviado a su correo institucional.</p>
        </div>
        <span class="badge" id="admin-user-badge">${allUsers.length} cuentas</span>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo de validación OTP</th>
              <th>Rol asignado</th>
              <th>Departamento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="footerline">Control de accesos basado en roles (RBAC). Las cuentas suspendidas no pueden recibir códigos OTP ni iniciar sesión.</div>
    </section>
  `;

  adminUserRows();

  $('#admin-user-filter').onchange = e => {
    adminFilter = e.target.value;
    adminUserRows();
  };
}

function adminUserRows(){
  const allUsers = auth.getUsers();
  let list = allUsers.filter(u => {
    if(adminFilter==='inactive' && u.active!==false) return false;
    if(adminFilter!=='all' && adminFilter!=='inactive' && u.role!==adminFilter) return false;
    const term = (u.name + ' ' + u.email + ' ' + u.roleLabel + ' ' + (u.department||'')).toLowerCase();
    return term.includes(query.toLowerCase());
  });

  if($('#admin-user-badge')) $('#admin-user-badge').textContent = `${list.length} ${list.length===1?'cuenta':'cuentas'}`;

  $('#rows').innerHTML = list.map(u => {
    return `
      <tr>
        <td>
          <div class="person">
            <span class="avatar">${esc(u.avatar)}</span>
            <div>
              <b>${esc(u.name)}</b>
              <small>ID #${u.id}</small>
            </div>
          </div>
        </td>
        <td>
          <span style="font-family:monospace;font-size:12.5px;color:var(--text)">${esc(u.email)}</span>
        </td>
        <td><span class="role-badge role-badge-${u.role}">${esc(u.roleLabel)}</span></td>
        <td>${esc(u.department||'Sede Principal')}</td>
        <td>${badge(u.active===false?'Bloqueado':'Activo')}</td>
        <td>
          <div class="admin-actions-cell">
            <button class="admin-action-btn" data-edit-user="${u.id}">Editar</button>
            <button class="admin-action-btn ${u.active===false?'btn-toggle-activate':'btn-toggle-deactivate'}" data-toggle-user="${u.id}">
              ${u.active===false?'Desbloquear':'Suspender'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="empty">No se encontraron usuarios con los filtros aplicados.</td></tr>';

  document.querySelectorAll('[data-edit-user]').forEach(b => {
    b.onclick = () => userForm(Number(b.dataset.editUser));
  });

  document.querySelectorAll('[data-toggle-user]').forEach(b => {
    b.onclick = () => {
      const u = auth.toggleUserStatus(Number(b.dataset.toggleUser));
      if(!u) return;
      render();
      toast(u.active ? `Cuenta ${u.email} desbloqueada.` : `Cuenta ${u.email} suspendida temporalmente.`);
    };
  });
}

function userForm(id){
  const allUsers = auth.getUsers();
  const u = id ? allUsers.find(x => x.id === id) : {
    name: '',
    email: '',
    role: 'recepcion',
    department: 'Recepción y Admisión',
    active: true
  };

  openModal(
    id ? 'Editar cuenta de usuario' : 'Registrar nuevo usuario del sistema',
    `
    <form id="user-form" novalidate>
      <div class="fields">
        ${field('user-name','Nombres y apellidos completos *','text',u.name,true)}
        ${field('user-email','Correo corporativo (recibirá el OTP de acceso) *','email',u.email,true)}
        <div class="field full">
          <label for="user-role">Rol asignado en el sistema *</label>
          <select id="user-role">
            <option value="admin" ${u.role==='admin'?'selected':''}>Administrador General (Acceso total y configuración)</option>
            <option value="medico" ${u.role==='medico'?'selected':''}>Médico Oftalmólogo (Consultas, diagnósticos y recetas)</option>
            <option value="tecnico" ${u.role==='tecnico'?'selected':''}>Técnico / Optometrista (Cola de exámenes y estudios)</option>
            <option value="recepcion" ${u.role==='recepcion'?'selected':''}>Recepción y Admisión (Agenda, pacientes y CRM)</option>
            <option value="caja" ${u.role==='caja'?'selected':''}>Cajero de Turno (Caja, cobros y constancias de pago)</option>
          </select>
        </div>
        <div class="field full">
          <label for="user-dept">Departamento o servicio sede *</label>
          <input id="user-dept" value="${esc(u.department||'Sede Principal')}" placeholder="Ej: Consulta Externa / Cirugía" required>
        </div>
      </div>
      <div id="form-error" class="error" role="alert"></div>
    </form>
    <div class="note">Al crear o actualizar la cuenta, el usuario podrá ingresar inmediatamente digitando su correo en la pantalla de inicio de sesión.</div>
    `,
    `
    <button id="user-cancel">Cancelar</button>
    <button class="primary" type="submit" form="user-form">Guardar cuenta</button>
    `
  );

  $('#user-cancel').onclick = () => $('#modal').close();

  $('#user-form').onsubmit = e => {
    e.preventDefault();
    const name = $('#user-name').value.trim();
    const email = $('#user-email').value.trim().toLowerCase();
    const role = $('#user-role').value;
    const department = $('#user-dept').value.trim();

    if(name.length < 3) return error('Indica los nombres y apellidos del usuario.','user-name');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Ingresa un correo electrónico válido.','user-email');
    if(allUsers.some(x => x.email === email && x.id !== id)) return error('Ya existe una cuenta con este correo corporativo.','user-email');

    if(id){
      auth.updateUser(id, {name, email, role, department});
    }else{
      auth.addUser({name, email, role, department});
    }

    $('#modal').close();
    render();
    toast(id ? `Cuenta ${email} actualizada.` : `Usuario ${name} registrado. Ya puede iniciar sesión con OTP.`);
  };
}

// ==========================================
// MANTENIMIENTO: SERVICIOS Y TARIFARIO
// ==========================================
function adminServicesView(){
  const activeCount = servicesCatalog.filter(s=>s.active!==false).length;
  const categories = [...new Set(servicesCatalog.map(s=>s.category))];
  const avgPrice = activeCount ? Math.round(servicesCatalog.filter(s=>s.active!==false).reduce((a,b)=>a+b.price,0)/activeCount) : 0;

  $('#view').innerHTML = `
    <div class="stats">
      <div class="stat tone-accent">
        <div class="stat-head"><span>Servicios en catálogo</span><div class="stat-icon">${svg.tag}</div></div>
        <strong>${servicesCatalog.length.toString().padStart(2,'0')}</strong>
        <small>${activeCount} disponibles para cobro</small>
      </div>
      <div class="stat tone-success">
        <div class="stat-head"><span>Categorías clínicas</span><div class="stat-icon">${svg.eye}</div></div>
        <strong>${categories.length.toString().padStart(2,'0')}</strong>
        <small>Consultas, estudios, controles</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Tarifa promedio</span><div class="stat-icon">${svg.cash}</div></div>
        <strong>${money(avgPrice)}</strong>
        <small>Arancel institucional</small>
      </div>
      <div class="stat">
        <div class="stat-head"><span>Moneda oficial</span><div class="stat-icon">${svg.check}</div></div>
        <strong>PEN (S/)</strong>
        <small>Soles peruanos con IGV</small>
      </div>
    </div>

    <div class="toolbar">
      ${search('Buscar servicio oftalmológico por nombre o categoría…')}
      <select id="admin-serv-filter" aria-label="Filtrar servicios por categoría">
        <option value="all" ${adminFilter==='all'?'selected':''}>Todas las categorías</option>
        <option value="Consulta" ${adminFilter==='Consulta'?'selected':''}>Consultas médicas</option>
        <option value="Control" ${adminFilter==='Control'?'selected':''}>Controles y post-operatorios</option>
        <option value="Estudio" ${adminFilter==='Estudio'?'selected':''}>Exámenes y estudios</option>
        <option value="Procedimiento" ${adminFilter==='Procedimiento'?'selected':''}>Procedimientos clínicos</option>
        <option value="inactive" ${adminFilter==='inactive'?'selected':''}>Servicios descontinuados / inactivos</option>
      </select>
    </div>

    <section class="panel">
      <div class="panelhead">
        <div>
          <h2>${svg.tag} Catálogo oficial de prestaciones y tarifario</h2>
          <p>Configuración de precios oficiales en Soles, tiempos de atención médica y disponibilidad en Caja.</p>
        </div>
        <span class="badge" id="admin-serv-badge">${servicesCatalog.length} prestaciones</span>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Prestación / Servicio</th>
              <th>Categoría</th>
              <th>Tarifa oficial</th>
              <th>Duración estimada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="footerline">Tarifario de demostración para control interno de órdenes y constancias de pago. La integración con facturación electrónica y liquidaciones EPS corresponde a una fase posterior.</div>
    </section>
  `;

  adminServiceRows();

  $('#admin-serv-filter').onchange = e => {
    adminFilter = e.target.value;
    adminServiceRows();
  };
}

function adminServiceRows(){
  let list = servicesCatalog.filter(s => {
    if(adminFilter==='inactive' && s.active===false) return false;
    if(adminFilter!=='all' && adminFilter!=='inactive' && s.category!==adminFilter) return false;
    const term = (s.name + ' ' + s.category).toLowerCase();
    return term.includes(query.toLowerCase());
  });

  if($('#admin-serv-badge')) $('#admin-serv-badge').textContent = `${list.length} ${list.length===1?'prestación':'prestaciones'}`;

  const catClass = cat => {
    const c = (cat||'').toLowerCase();
    if(c.includes('consulta')) return 'cat-consulta';
    if(c.includes('estudio')) return 'cat-estudio';
    if(c.includes('control')) return 'cat-control';
    return 'cat-procedimiento';
  };

  $('#rows').innerHTML = list.map(s => {
    return `
      <tr>
        <td>
          <b>${esc(s.name)}</b>
          <small style="color:var(--muted);display:block">Código prestacional: SRV-${String(s.id).padStart(4,'0')}</small>
        </td>
        <td>
          <span class="category-badge ${catClass(s.category)}">${esc(s.category)}</span>
        </td>
        <td><span class="price-tag">${money(s.price)}</span></td>
        <td>
          <span class="duration-chip">${svg.clock} ${s.duration||30} min</span>
        </td>
        <td>${badge(s.active===false?'Inactivo':'Activo')}</td>
        <td>
          <div class="admin-actions-cell">
            <button class="admin-action-btn" data-edit-serv="${s.id}">Editar</button>
            <button class="admin-action-btn ${s.active===false?'btn-toggle-activate':'btn-toggle-deactivate'}" data-toggle-serv="${s.id}">
              ${s.active===false?'Reactivar':'Desactivar'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="empty">No se encontraron servicios con los filtros aplicados.</td></tr>';

  document.querySelectorAll('[data-edit-serv]').forEach(b => {
    b.onclick = () => serviceForm(Number(b.dataset.editServ));
  });

  document.querySelectorAll('[data-toggle-serv]').forEach(b => {
    b.onclick = () => {
      const s = servicesCatalog.find(item => item.id === Number(b.dataset.toggleServ));
      if(!s) return;
      s.active = s.active === false;
      render();
      toast(s.active ? `Servicio "${s.name}" reactivado.` : `Servicio "${s.name}" desactivado del catálogo.`);
    };
  });
}

function serviceForm(id){
  const serv = id ? servicesCatalog.find(s => s.id === id) : {
    name: '',
    category: 'Consulta',
    price: 150,
    duration: 30,
    active: true
  };

  openModal(
    id ? 'Editar prestación del tarifario' : 'Registrar nuevo servicio clínico',
    `
    <form id="serv-form" novalidate>
      <div class="fields">
        ${field('serv-name','Nombre oficial de la prestación médica *','text',serv.name,true)}
        <div class="field">
          <label for="serv-cat">Categoría clínica *</label>
          <select id="serv-cat">
            <option value="Consulta" ${serv.category==='Consulta'?'selected':''}>Consulta médica especializada</option>
            <option value="Control" ${serv.category==='Control'?'selected':''}>Control médico / Postoperatorio</option>
            <option value="Estudio" ${serv.category==='Estudio'?'selected':''}>Examen diagnóstico y medición</option>
            <option value="Procedimiento" ${serv.category==='Procedimiento'?'selected':''}>Procedimiento clínico / Láser</option>
          </select>
        </div>
        <div class="field">
          <label for="serv-price">Tarifa en Soles (PEN S/) *</label>
          <input id="serv-price" type="number" step="1" min="1" value="${serv.price}" required>
        </div>
        <div class="field full">
          <label for="serv-duration">Duración estimada en consultorio / equipo (minutos) *</label>
          <select id="serv-duration">
            <option value="15" ${serv.duration===15?'selected':''}>15 minutos (Control rápido / Tonometría)</option>
            <option value="20" ${serv.duration===20?'selected':''}>20 minutos (Paquimetría / Refracción)</option>
            <option value="30" ${serv.duration===30||!serv.duration?'selected':''}>30 minutos (Consulta oftalmológica estándar)</option>
            <option value="45" ${serv.duration===45?'selected':''}>45 minutos (Examen integral / Dilatación)</option>
            <option value="60" ${serv.duration===60?'selected':''}>60 minutos (Procedimiento prolongado)</option>
          </select>
        </div>
      </div>
      <div id="form-error" class="error" role="alert"></div>
    </form>
    <div class="note">El precio actualizado aplicará de inmediato al emitir boletas, facturas u órdenes de cobro en Caja.</div>
    `,
    `
    <button id="serv-cancel">Cancelar</button>
    <button class="primary" type="submit" form="serv-form">Guardar prestación</button>
    `
  );

  $('#serv-cancel').onclick = () => $('#modal').close();

  $('#serv-form').onsubmit = e => {
    e.preventDefault();
    const name = $('#serv-name').value.trim();
    const category = $('#serv-cat').value;
    const price = Number($('#serv-price').value);
    const duration = Number($('#serv-duration').value);

    if(name.length < 3) return error('Indica el nombre oficial del servicio.','serv-name');
    if(!price || price <= 0) return error('Indica una tarifa válida mayor a S/ 0.','serv-price');

    if(id){
      Object.assign(serv, {name, category, price, duration});
    }else{
      const newId = Math.max(...servicesCatalog.map(s=>s.id), 0) + 1;
      servicesCatalog.push({id: newId, name, category, price, duration, active: true});
    }

    $('#modal').close();
    render();
    toast(id ? `Servicio "${name}" actualizado con éxito.` : `Servicio "${name}" agregado al tarifario.`);
  };
}

let collapsedTooltipEl=null;
function ensureCollapsedTooltip(){
  if(!collapsedTooltipEl){
    collapsedTooltipEl=document.createElement('div');
    collapsedTooltipEl.id='sidebar-tooltip';
    collapsedTooltipEl.className='sidebar-tooltip';
    collapsedTooltipEl.setAttribute('role','tooltip');
    collapsedTooltipEl.hidden=true;
    document.body.appendChild(collapsedTooltipEl);
  }
  return collapsedTooltipEl;
}
function hideCollapsedTooltip(){
  if(collapsedTooltipEl){
    collapsedTooltipEl.hidden=true;
    collapsedTooltipEl.textContent='';
  }
}
function showCollapsedTooltipFor(target){
  if(!collapsed||!target)return;
  const text=target.dataset.tooltip||target.getAttribute('title')||'';
  if(!text)return;
  const menu=$('#profilemenu');
  if(target.id==='profile'&&menu&&!menu.hidden){hideCollapsedTooltip();return;}
  const tip=ensureCollapsedTooltip();
  tip.textContent=text;
  tip.hidden=false;
  const r=target.getBoundingClientRect();
  const maxTop=Math.max(12,window.innerHeight-40);
  const top=Math.min(maxTop,Math.max(12,Math.round(r.top+r.height/2)));
  tip.style.left=`${Math.round(r.right+12)}px`;
  tip.style.top=`${top}px`;
}
function syncCollapsedTooltipHandlers(){
  if(!collapsed){hideCollapsedTooltip();return;}
  const targets=document.querySelectorAll('.shell.collapsed aside [data-tooltip]');
  targets.forEach(el=>{
    el.addEventListener('mouseenter',()=>showCollapsedTooltipFor(el));
    el.addEventListener('mouseleave',()=>hideCollapsedTooltip());
    el.addEventListener('focus',()=>showCollapsedTooltipFor(el));
    el.addEventListener('blur',()=>hideCollapsedTooltip());
  });
}

let activeCollapseTransition=null;
function syncSidebarCollapsedUi(){
  const shell=document.querySelector('.shell');
  if(shell)shell.classList.toggle('collapsed',collapsed);
  const collapseBtn=$('#collapse');
  if(collapseBtn){
    const label=collapsed?'Expandir menú':'Contraer menú';
    collapseBtn.setAttribute('aria-label',label);
    collapseBtn.setAttribute('aria-expanded',String(!collapsed));
    collapseBtn.setAttribute('title',label);
    collapseBtn.setAttribute('data-tooltip',label);
    const wordSpan=collapseBtn.querySelector('.word');
    if(wordSpan)wordSpan.textContent=label;
  }
  document.querySelectorAll('.navgroup').forEach(groupEl=>{
    if(collapsed){
      if(groupEl.dataset.prevOpen===undefined){
        groupEl.dataset.prevOpen=String(groupEl.open);
      }
      groupEl.open=true;
    }else{
      if(groupEl.dataset.prevOpen!==undefined){
        groupEl.open=groupEl.dataset.prevOpen==='true';
        delete groupEl.dataset.prevOpen;
      }else{
        const isPrimary=groupEl.dataset.navMode==='primary';
        const isActive=groupEl.classList.contains('current');
        groupEl.open=isPrimary||isActive;
      }
    }
  });
  hideCollapsedTooltip();
  syncCollapsedTooltipHandlers();
}

function navigateToHash(targetHash,onReady=null){
  pendingCommandAction=onReady;
  const cleanTarget=targetHash.startsWith('#')?targetHash:'#'+targetHash;
  if(location.hash===cleanTarget){
    render();
  }else{
    location.hash=cleanTarget;
  }
}

const paletteState={
  opener:null,
  query:'',
  expandedGroups:{},
  selectedIndex:0,
  flatItems:[],
  index:null,
  skipRestoreFocus:false,
  statusTimer:null,
  listenersBound:false
};

function isEditableElement(el){
  if(!(el instanceof HTMLElement))return false;
  const tag=el.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return true;
  if(el.isContentEditable)return true;
  return Boolean(el.closest('[contenteditable="true"], [role="textbox"], .editor'));
}

function buildLivePaletteIndex(user){
  return buildPaletteIndex({
    user,
    canAccess:auth.canAccess,
    patients,
    appointments,
    leadsSummary:getLeadsSummary(),
    leadsRaw:crmLeads,
    doctorMatchNames:doctorMatchNames(user),
    preliminaryStudies,
    pendingRecoveriesCount:auth.canAccess(user.role,'arm')?getPendingNoShowRecoveries().length:0,
    today
  });
}

function highlightMatchHtml(text,rawQuery){
  const safe=esc(text);
  const q=String(rawQuery||'').trim();
  if(!q)return safe;
  const normQ=q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(!normQ)return safe;
  const chars=Array.from(String(text||''));
  const normChars=chars.map(c=>c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  const normJoined=normChars.join('');
  const idx=normJoined.indexOf(normQ);
  if(idx<0)return safe;
  // Mapear índice de cadena normalizada al original aproximando 1:1 en caracteres latinos
  let matchLen=0;
  let acc=0;
  for(let i=idx;i<normChars.length&&acc<normQ.length;i++){
    acc+=normChars[i].length;
    matchLen++;
  }
  const before=esc(chars.slice(0,idx).join(''));
  const hit=esc(chars.slice(idx,idx+matchLen).join(''));
  const after=esc(chars.slice(idx+matchLen).join(''));
  return `${before}<mark class="cp-mark">${hit}</mark>${after}`;
}

function updatePaletteSelectionUI({scroll=true}={}){
  const dlg=$('#command-palette');
  const input=$('#cp-input');
  const options=Array.from(dlg?.querySelectorAll('.cp-item[role="option"]')||[]);
  if(!options.length){
    paletteState.selectedIndex=-1;
    input?.removeAttribute('aria-activedescendant');
    return;
  }
  const max=options.length-1;
  paletteState.selectedIndex=Math.max(0,Math.min(max,paletteState.selectedIndex));
  options.forEach((btn,idx)=>{
    const selected=idx===paletteState.selectedIndex;
    btn.classList.toggle('is-selected',selected);
    btn.setAttribute('aria-selected',String(selected));
    const marker=btn.querySelector('.cp-selected-marker');
    if(marker)marker.textContent=selected?'↵':'';
    if(selected){
      input?.setAttribute('aria-activedescendant',btn.id);
      if(scroll&&typeof btn.scrollIntoView==='function'){
        btn.scrollIntoView({block:'nearest'});
      }
    }
  });
}

function schedulePaletteStatusAnnouncement(result){
  clearTimeout(paletteState.statusTimer);
  paletteState.statusTimer=setTimeout(()=>{
    const el=$('#cp-status');
    if(!el)return;
    if(!result.groups.length){
      el.textContent=result.query.trim()
        ?`Sin resultados autorizados para ${result.query.trim()}.`
        :'Sin elementos disponibles para mostrar.';
      return;
    }
    el.textContent=`${result.visibleCount} resultados visibles en ${result.groups.length} ${result.groups.length===1?'grupo':'grupos'}. Usa flechas arriba y abajo para moverte y Enter para abrir.`;
  },160);
}

function renderCommandPaletteResults({resetSelection=false}={}){
  const dlg=$('#command-palette');
  if(!dlg||!paletteState.index)return;
  const result=searchPalette(paletteState.index,paletteState.query,{
    expandedGroups:paletteState.expandedGroups
  });

  const flat=[];
  const container=$('#cp-results');
  const clearBtn=$('#cp-clear');
  if(clearBtn)clearBtn.hidden=!paletteState.query;

  if(!result.groups.length){
    paletteState.flatItems=[];
    paletteState.selectedIndex=-1;
    $('#cp-input')?.removeAttribute('aria-activedescendant');
    container.innerHTML=`
      <div class="cp-empty" role="note">
        <span class="cp-empty-icon" aria-hidden="true">${svg.search}</span>
        <strong>Sin resultados autorizados${paletteState.query.trim()?` para «${esc(paletteState.query.trim())}»`:''}</strong>
        <p>Prueba buscar por nombre de módulo, paciente autorizado, prospecto, cita o acción frecuente de tu rol.</p>
        ${paletteState.query?`<button type="button" class="linkbutton" id="cp-empty-clear">Limpiar búsqueda</button>`:''}
      </div>
    `;
    const emptyClear=$('#cp-empty-clear');
    if(emptyClear){
      emptyClear.onclick=()=>{
        paletteState.query='';
        const inp=$('#cp-input');
        if(inp){inp.value='';inp.focus();}
        paletteState.expandedGroups={};
        renderCommandPaletteResults({resetSelection:true});
      };
    }
    schedulePaletteStatusAnnouncement(result);
    return;
  }

  let optionIdx=0;
  container.innerHTML=result.groups.map(group=>{
    const itemsHtml=group.items.map(item=>{
      const idx=optionIdx++;
      flat.push(item);
      const iconHtml=svg[item.iconKey]||svg.search;
      return `
        <button type="button" id="cp-opt-${idx}" class="cp-item" role="option" aria-selected="false" data-cp-idx="${idx}">
          <span class="cp-item-icon" aria-hidden="true">${iconHtml}</span>
          <span class="cp-item-main">
            <span class="cp-item-title-row">
              <strong class="cp-item-title">${highlightMatchHtml(item.title,paletteState.query)}</strong>
              ${item.badgeText?`<span class="cp-item-badge">${esc(item.badgeText)}</span>`:''}
            </span>
            <span class="cp-item-desc">${highlightMatchHtml(item.description,paletteState.query)}</span>
          </span>
          <span class="cp-item-action">
            <span class="cp-action-hint">${esc(item.actionLabel)}</span>
            <span class="cp-selected-marker" aria-hidden="true"></span>
          </span>
        </button>
      `;
    }).join('');

    return `
      <section class="cp-group" data-cp-group="${group.key}" role="group" aria-labelledby="cp-group-${group.key}">
        <div class="cp-group-head">
          <h3 id="cp-group-${group.key}" class="cp-group-title">${group.label}</h3>
          <span class="cp-group-count">${group.total} ${group.total===1?'resultado':'resultados'}</span>
        </div>
        <div class="cp-group-list">${itemsHtml}</div>
        ${group.remaining>0?`<button type="button" class="cp-more-btn" data-cp-more="${group.key}">Ver más resultados (${group.remaining} más)</button>`:''}
      </section>
    `;
  }).join('');

  paletteState.flatItems=flat;
  if(resetSelection||paletteState.selectedIndex<0||paletteState.selectedIndex>=flat.length){
    const bestIdx=result.bestMatchId?flat.findIndex(item=>item.id===result.bestMatchId):-1;
    paletteState.selectedIndex=bestIdx>=0?bestIdx:0;
  }
  updatePaletteSelectionUI({scroll:false});
  schedulePaletteStatusAnnouncement(result);

  container.querySelectorAll('.cp-item').forEach(btn=>{
    const idx=Number(btn.dataset.cpIdx);
    btn.onclick=()=>{
      paletteState.selectedIndex=idx;
      executeCommandPaletteItem(paletteState.flatItems[idx]);
    };
    btn.onfocus=()=>{
      paletteState.selectedIndex=idx;
      updatePaletteSelectionUI({scroll:false});
    };
  });

  container.querySelectorAll('[data-cp-more]').forEach(btn=>{
    btn.onclick=()=>{
      const gKey=btn.dataset.cpMore;
      paletteState.expandedGroups[gKey]=true;
      renderCommandPaletteResults();
      $('#cp-input')?.focus();
    };
  });
}

function closeCommandPalette({restoreFocus=true}={}){
  const dlg=$('#command-palette');
  if(!dlg||!dlg.open)return;
  paletteState.skipRestoreFocus=!restoreFocus;
  clearTimeout(paletteState.statusTimer);
  dlg.close();
}

function executeCommandPaletteItem(item){
  const user=auth.getSession();
  if(!user||!item)return;

  if(item.kind==='page'){
    if(!auth.canAccess(user.role,item.route)){
      toast(`Acceso restringido para ${user.roleLabel}.`);
      return;
    }
    closeCommandPalette({restoreFocus:false});
    navigateToHash('#'+item.route);
    return;
  }

  if(item.kind==='patient'){
    if(!auth.canAccess(user.role,'pacientes')||!auth.canAccess(user.role,'paciente-detalle')){
      toast(`Acceso restringido para ${user.roleLabel}.`);
      return;
    }
    closeCommandPalette({restoreFocus:false});
    navigateToHash('#pacientes/'+item.patientId);
    return;
  }

  if(item.kind==='lead'){
    if(!auth.canAccess(user.role,'crm')){
      toast(`Acceso restringido al CRM para ${user.roleLabel}.`);
      return;
    }
    closeCommandPalette({restoreFocus:false});
    navigateToHash('#crm/'+item.leadId);
    return;
  }

  if(item.kind==='appointment'){
    if(!auth.canAccess(user.role,'agenda')){
      toast(`Acceso restringido a Agenda para ${user.roleLabel}.`);
      return;
    }
    const appItem=appointments.find(a=>a.id===item.appointmentId);
    if(!appItem){
      toast('La cita seleccionada ya no se encuentra disponible.');
      return;
    }
    if(user.role==='medico'){
      const names=doctorMatchNames(user);
      if(appItem.doctor!==user.name&&!names.includes(appItem.doctor)){
        toast('Solo puedes consultar tus citas médicas asignadas.');
        return;
      }
    }
    closeCommandPalette({restoreFocus:false});
    date=appItem.date;
    filter='Todas';
    navigateToHash('#agenda',()=>appointmentDetail(appItem.id));
    return;
  }

  if(item.kind==='action'){
    if(!isPaletteActionAuthorized(user.role,item.actionId,auth.canAccess)){
      toast(`Acción no autorizada para ${user.roleLabel}.`);
      return;
    }
    closeCommandPalette({restoreFocus:false});
    switch(item.actionId){
      case 'new-appointment':
        appointmentForm();
        break;
      case 'new-patient':
        patientForm();
        break;
      case 'new-lead':
        navigateToHash('#crm',()=>window.dispatchEvent(new CustomEvent('crm:newlead')));
        break;
      case 'open-crm':
        navigateToHash('#crm');
        break;
      case 'open-inbox':
        navigateToHash('#inbox');
        break;
      case 'open-arm':
        navigateToHash('#arm',()=>{
          document.querySelector('.arm-recovery-queue, .arm-agents-panel')?.scrollIntoView({behavior:'auto',block:'start'});
        });
        break;
      case 'manage-doctors':
        navigateToHash('#admin-medicos');
        break;
      case 'manage-technicians':
        navigateToHash('#admin-tecnicos');
        break;
      case 'manage-users':
        navigateToHash('#admin-usuarios');
        break;
      case 'manage-services':
        navigateToHash('#admin-servicios');
        break;
      case 'focus-patient-search':
        navigateToHash('#pacientes',()=>{
          $('#search')?.focus();
        });
        break;
      case 'open-my-agenda':
        navigateToHash('#agenda');
        break;
      case 'continue-consult':{
        const names=doctorMatchNames(user);
        const nextApp=appointments.find(a=>a.date===today&&(a.doctor===user.name||names.includes(a.doctor))&&['En espera','Llegó'].includes(a.status));
        routeParams=nextApp?{appId:nextApp.id}:{};
        navigateToHash('#consulta',()=>{
          routeParams={};
          document.querySelector('.clinical-queue-card.selected')?.scrollIntoView({block:'nearest'});
        });
        break;
      }
      case 'open-studies-queue':
        navigateToHash('#estudios');
        break;
      case 'continue-study':{
        const nextStudy=preliminaryStudies.find(s=>s.status==='En proceso'||s.status==='En espera')||preliminaryStudies[0];
        navigateToHash('#estudios',()=>{
          if(nextStudy){
            document.querySelector(`[data-study-id="${nextStudy.id}"]`)?.click();
          }
        });
        break;
      }
      case 'cash-pending':
        cashTab='pending';
        navigateToHash('#caja/por-cobrar');
        break;
      case 'cash-movements':
        cashTab='paid';
        navigateToHash('#caja/movimientos');
        break;
      case 'cash-pay':{
        const pendingOrder=appointments.find(a=>a.order&&!a.paid);
        cashTab='pending';
        if(pendingOrder){
          navigateToHash('#caja/por-cobrar',()=>payModal(pendingOrder.id));
        }else{
          navigateToHash('#caja/por-cobrar',()=>toast('No hay órdenes pendientes de pago. Puedes usar «+ Registrar cobro» en Caja.'));
        }
        break;
      }
      case 'open-turns-recepcion':
        navigateToHash('#turnos-recepcion');
        break;
      case 'call-next-recepcion':
        navigateToHash('#turnos-recepcion',()=>{
          const res=callNextTurn({area:'R',role:user.role,operatorName:user.name,counterName:getSelectedCounter('recepcion')});
          toast(res.ok?`Turno ${res.turn.code} llamado a ${res.turn.counter}.`:res.error);
          render();
        });
        break;
      case 'cash-open-turns':
        navigateToHash('#turnos-caja');
        break;
      case 'cash-call-next-turn':
        navigateToHash('#turnos-caja',()=>{
          const res=callNextTurn({area:'C',role:user.role,operatorName:user.name,counterName:getSelectedCounter('caja')});
          toast(res.ok?`Turno ${res.turn.code} llamado a ${res.turn.counter}.`:res.error);
          render();
        });
        break;
      case 'open-turns-supervision':
        navigateToHash('#turnos-supervision');
        break;
    }
  }
}

function bindCommandPaletteEvents(dlg){
  if(paletteState.listenersBound)return;
  paletteState.listenersBound=true;

  dlg.addEventListener('close',()=>{
    clearTimeout(paletteState.statusTimer);
    const shouldRestore=!paletteState.skipRestoreFocus;
    const opener=paletteState.opener;
    paletteState.skipRestoreFocus=false;
    paletteState.opener=null;
    if(shouldRestore&&opener&&document.contains(opener)&&typeof opener.focus==='function'){
      opener.focus();
    }
  });

  // Fallback obligatorio para navegadores sin soporte de closedby="any"
  dlg.addEventListener('click',e=>{
    if(e.target===dlg){
      closeCommandPalette({restoreFocus:true});
      return;
    }
    const surface=dlg.querySelector('.cp-surface');
    if(!surface)return;
    const rect=surface.getBoundingClientRect();
    const inside=rect.top<=e.clientY&&e.clientY<=rect.top+rect.height&&rect.left<=e.clientX&&e.clientX<=rect.left+rect.width;
    if(!inside){
      closeCommandPalette({restoreFocus:true});
    }
  });

  dlg.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){
      if(!paletteState.flatItems.length)return;
      e.preventDefault();
      paletteState.selectedIndex=(paletteState.selectedIndex+1)%paletteState.flatItems.length;
      updatePaletteSelectionUI({scroll:true});
      return;
    }
    if(e.key==='ArrowUp'){
      if(!paletteState.flatItems.length)return;
      e.preventDefault();
      paletteState.selectedIndex=(paletteState.selectedIndex-1+paletteState.flatItems.length)%paletteState.flatItems.length;
      updatePaletteSelectionUI({scroll:true});
      return;
    }
    if(e.key==='Enter'&&!e.shiftKey){
      const activeEl=document.activeElement;
      if(activeEl?.closest?.('#cp-close, #cp-clear, .cp-more-btn, #cp-empty-clear'))return;
      if(paletteState.selectedIndex>=0&&paletteState.flatItems[paletteState.selectedIndex]){
        e.preventDefault();
        executeCommandPaletteItem(paletteState.flatItems[paletteState.selectedIndex]);
      }
    }
  });
}

function openCommandPalette(explicitOpener=null){
  const curHash=location.hash.slice(1).split('?')[0];
  if(curHash==='autoservicio'||curHash==='pantalla-turnos')return;
  const user=auth.getSession();
  const dlg=$('#command-palette');
  if(!user||!dlg)return;
  if($('#modal')?.open)return;
  if(activeCollapseTransition){
    try{activeCollapseTransition.skipTransition();}catch{}
    activeCollapseTransition=null;
  }
  if($('#mobile-nav-dialog')?.open)$('#mobile-nav-dialog').close();
  hideCollapsedTooltip();

  if(dlg.open){
    closeCommandPalette({restoreFocus:true});
    return;
  }

  const opener=(explicitOpener instanceof HTMLElement&&document.contains(explicitOpener))
    ?explicitOpener
    :(document.activeElement instanceof HTMLElement?document.activeElement:null);

  paletteState.opener=opener;
  paletteState.query='';
  paletteState.expandedGroups={};
  paletteState.selectedIndex=0;
  paletteState.skipRestoreFocus=false;
  paletteState.index=buildLivePaletteIndex(user);

  dlg.innerHTML=`
    <div class="cp-surface">
      <header class="cp-header">
        <div class="cp-title-row">
          <div class="cp-title-meta">
            <span class="cp-kicker">NAVEGACIÓN RÁPIDA</span>
            <h2 id="cp-title" class="cp-title">Buscador global de la clínica</h2>
          </div>
          <span class="cp-role-pill">${esc(user.roleLabel)}</span>
          <button type="button" id="cp-close" class="cp-close-btn" aria-label="Cerrar buscador">×</button>
        </div>
        <search class="cp-searchbar" aria-label="Buscar dentro de la paleta de comandos">
          <span class="cp-search-icon" aria-hidden="true">${svg.search}</span>
          <input type="text" id="cp-input" class="cp-input" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="cp-results" placeholder="Buscar páginas, pacientes, prospectos, citas o acciones…" autocomplete="off" spellcheck="false">
          <button type="button" id="cp-clear" class="cp-clear-btn" aria-label="Limpiar búsqueda" hidden>Limpiar</button>
        </search>
      </header>
      <div id="cp-status" class="visually-hidden" role="status" aria-live="polite"></div>
      <div id="cp-results" class="cp-results" role="listbox" aria-label="Resultados agrupados según permisos"></div>
      <footer class="cp-footer" aria-label="Ayuda de atajos de teclado">
        <div class="cp-shortcuts">
          <span><kbd>↑</kbd><kbd>↓</kbd> Flechas: mover</span>
          <span><kbd>Enter</kbd> Enter: abrir</span>
          <span><kbd>Esc</kbd> Escape: cerrar</span>
          <span><kbd>Ctrl</kbd> o <kbd>⌘</kbd> + <kbd>K</kbd>: abrir desde cualquier módulo</span>
        </div>
      </footer>
    </div>
  `;

  bindCommandPaletteEvents(dlg);

  const input=$('#cp-input');
  $('#cp-close').onclick=()=>closeCommandPalette({restoreFocus:true});
  $('#cp-clear').onclick=()=>{
    paletteState.query='';
    paletteState.expandedGroups={};
    paletteState.selectedIndex=0;
    input.value='';
    renderCommandPaletteResults({resetSelection:true});
    input.focus();
  };
  input.oninput=e=>{
    paletteState.query=e.target.value;
    paletteState.selectedIndex=0;
    renderCommandPaletteResults({resetSelection:true});
  };

  renderCommandPaletteResults({resetSelection:true});
  dlg.showModal();
  input.focus();
}

document.addEventListener('keydown',e=>{
  const curHash=location.hash.slice(1).split('?')[0];
  if(curHash==='autoservicio'||curHash==='pantalla-turnos')return;
  const user=auth.getSession();
  if(!user)return;
  const keyLower=typeof e.key==='string'?e.key.toLowerCase():'';
  const isModK=(e.ctrlKey||e.metaKey)&&!e.altKey&&keyLower==='k';
  if(isModK){
    e.preventDefault();
    openCommandPalette(document.activeElement);
    return;
  }
  const dlg=$('#command-palette');
  if(dlg?.open)return;
  if($('#modal')?.open||$('#mobile-nav-dialog')?.open)return;
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!isEditableElement(e.target)&&!isEditableElement(document.activeElement)){
    e.preventDefault();
    openCommandPalette(document.activeElement);
  }
});

registerTurnosPatientDirectory(patients);
hydrateTurnStateFromSharedStorage();
subscribeToTurnStateChanges(ev=>{
  if(!ev||ev.originId===getTabOriginId())return;
  const curHash=String(location.hash||'').slice(1).split('?')[0];
  if(
    curHash==='pantalla-turnos'||
    curHash==='turnos-recepcion'||
    curHash==='turnos-caja'||
    curHash==='turnos-supervision'
  ){
    render();
    return;
  }
  if(curHash==='autoservicio'){
    if(ev.action==='reset'||(kioskUiState.step===1&&!kioskUiState.dni&&!kioskUiState.isAnonymous)){
      render();
    }
  }
});

window.addEventListener('hashchange',()=>{query='';filter='Todas';adminFilter='all';render()});
window.addEventListener('resize', () => {
  if (typeof window !== 'undefined' && route === 'automations') {
    if (window.innerWidth <= 960 && window.innerWidth > 680 && !window.__wfTabletCollapsedApplied) {
      collapsed = true;
      window.__wfTabletCollapsedApplied = true;
      const shellEl = document.querySelector('.shell');
      if (shellEl) syncSidebarCollapsedUi();
    } else if (window.innerWidth > 960) {
      window.__wfTabletCollapsedApplied = false;
    }
  }
});
render();
if (typeof window !== 'undefined') window.__appReady = true;









