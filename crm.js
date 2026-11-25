import {isAgentActive, recordARMEvent} from './arm.js';
import * as motion from './motion.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=n=>(n||'').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
const today='2026-10-27';

const INITIAL_COLUMNS=[
  {id:1,key:'nuevo',name:'Nuevo',color:'#3e95d3',helper:'Contacto sin atender'},
  {id:2,key:'contactado',name:'Contactado',color:'#c99a25',helper:'En conversación'},
  {id:3,key:'interesado',name:'Interés confirmado',color:'#9a70c8',helper:'Necesidad y decisión confirmadas'},
  {id:4,key:'cita_agendada',name:'Cita agendada',color:'#2e7d32',helper:'Fecha confirmada'},
  {id:7,key:'asistio',name:'Asistió',color:'#20835d',helper:'Cita atendida en clínica'},
  {id:8,key:'no_asistio',name:'No asistió',color:'#d97706',helper:'Inasistencia registrada'},
  {id:9,key:'seguimiento',name:'Seguimiento',color:'#2563a8',helper:'Recuperación y reagendamiento'},
  {id:5,key:'convertido',name:'Convertido',color:'#1b4d3e',helper:'Ya es paciente'},
  {id:6,key:'perdido',name:'Perdido',color:'#888888',helper:'Sin interés o descartado'}
];
let columns=JSON.parse(JSON.stringify(INITIAL_COLUMNS));
let bookedColumn=4;
let convertedColumn=5;

const INITIAL_LEADS=[
  {id:1,pid:3,name:'Ana Torres Medina',phone:'900 000 003',origin:'WhatsApp',owner:'Recepción Sede',reason:'Consulta oftalmológica general',stage:2,stageEnteredAt:'2026-10-26',lastActivityAt:'2026-10-27 10:38',nextAction:'Confirmar turno disponible',nextDate:'2026-10-28',unread:2,activities:[{text:'Lead recibido por WhatsApp.',at:'2026-10-26 10:30',action:'Ingreso de prospecto',module:'Inbox',fromStage:null,toStage:'Contactado',simulated:true}],messages:[{side:'in',text:'Hola, quisiera saber si tienen citas esta semana.',at:'10:30'},{side:'out',text:'Sí, tenemos turnos por la mañana y por la tarde. ¿Qué horario prefieres?',at:'10:34'},{side:'in',text:'Por la mañana, de ser posible.',at:'10:38'}]},
  {id:2,pid:4,name:'Luis Pérez Salazar',phone:'900 000 004',origin:'Google',owner:'Recepción Sede',reason:'Evaluación refractiva LASIK',stage:1,stageEnteredAt:'2026-10-27',lastActivityAt:'2026-10-27 08:45',nextAction:'Llamar para coordinar cita',nextDate:'2026-10-27',unread:1,activities:[{text:'Formulario web de descarte completado.',at:'2026-10-27 08:45',action:'Registro web',module:'CRM',fromStage:null,toStage:'Nuevo',simulated:true}],messages:[{side:'in',text:'Completé el formulario para evaluación LASIK. ¿Cuál sería el siguiente paso?',at:'08:45'}]},
  {id:3,pid:1,name:'María López García',phone:'900 000 001',origin:'Instagram',owner:'Asesoría Comercial',reason:'Descarte de glaucoma y PIO',stage:3,stageEnteredAt:'2026-10-25',lastActivityAt:'2026-10-26 15:20',nextAction:'Enviar opciones de especialistas',nextDate:'2026-10-26',unread:0,activities:[{text:'Consultó por costos de control oftalmológico.',at:'2026-10-26 15:20',action:'Interés registrado',module:'Inbox',fromStage:'Contactado',toStage:'Interés confirmado',simulated:true}],messages:[{side:'in',text:'Quisiera consultar por un descarte de glaucoma.',at:'Ayer 15:20'},{side:'out',text:'Claro, podemos ayudarte con una evaluación y medición de presión ocular.',at:'Ayer 15:24'}]},
  {id:4,pid:2,name:'Carlos Mendoza Ruiz',phone:'900 000 002',origin:'Referido',owner:'Dr. Diego Ramírez',reason:'Control de miopía / astigmatismo',stage:4,stageEnteredAt:'2026-10-26',lastActivityAt:'2026-10-26 11:10',appointmentId:2,nextAction:'Asistir a su cita programada',nextDate:'2026-10-27',unread:0,activities:[{text:'Cita agendada para control oftalmológico.',at:'2026-10-26 11:10',action:'Reserva confirmada',module:'Agenda',fromStage:'Interés confirmado',toStage:'Cita agendada',simulated:false}],messages:[{side:'out',text:'Tu cita quedó reservada para hoy a las 09:30.',at:'Ayer 11:10'},{side:'in',text:'Perfecto, muchas gracias.',at:'Ayer 11:12'}]},
  {id:5,pid:5,name:'Elena Soto Vargas',phone:'900 000 005',origin:'WhatsApp',owner:'Dra. Valeria Ríos',reason:'Evaluación de cataratas',stage:5,stageEnteredAt:'2026-10-25',lastActivityAt:'2026-10-25 17:00',appointmentId:5,nextAction:'Seguimiento post-consulta',nextDate:'2026-10-30',unread:0,activities:[{text:'Convertida en paciente regular de la clínica.',at:'2026-10-25 17:00',action:'Conversión registrada',module:'CRM',fromStage:'Cita agendada',toStage:'Convertido',simulated:false}],messages:[{side:'out',text:'Te esperamos para tu control. Recuerda traer tus exámenes anteriores.',at:'Lun 17:00'}]},
  {id:6,pid:null,name:'Jorge Benavides Paz',phone:'900 111 222',origin:'Facebook',owner:'Recepción Sede',reason:'Consulta sobre lentes de contacto',stage:1,stageEnteredAt:'2026-10-24',lastActivityAt:'2026-10-24 09:15',nextAction:'Contactar vía Facebook Messenger',nextDate:'2026-10-27',unread:3,activities:[{text:'Mensaje recibido por campaña de Facebook Ads.',at:'2026-10-24 09:15',action:'Lead entrante',module:'Inbox',fromStage:null,toStage:'Nuevo',simulated:true}],messages:[{side:'in',text:'Vi la publicidad sobre lentes de contacto.',at:'09:15'},{side:'in',text:'¿También realizan la evaluación de medida?',at:'09:16'}]}
];
let leads=JSON.parse(JSON.stringify(INITIAL_LEADS));

const DEFAULT_VALUES={1:150,2:150,3:150,4:100,5:100,6:150};
const OWNERS=['Recepción Sede','Asesoría Comercial','Lic. Roberto Casas','Dra. Valeria Ríos','Dr. Diego Ramírez','Katia Morales'];
const LOSS_REASONS=['Sin respuesta del contacto','Costo del servicio','Horario no disponible','Eligió otra clínica','Solo consulta informativa','Otro motivo'];
const hydrateLeadValues=()=>leads.forEach(l=>{
  if(!Number.isFinite(l.estimatedValue))l.estimatedValue=DEFAULT_VALUES[l.id]??150;
  if(!l.stageEnteredAt)l.stageEnteredAt=today;
  if(!l.lastActivityAt)l.lastActivityAt=String(l.activities?.at(-1)?.at||`${today} 11:20`);
  if(!l.owner)l.owner='Recepción Sede';
});
hydrateLeadValues();

export function resetCRMData(){
  if(crmCloseTimer){
    clearTimeout(crmCloseTimer);
    crmCloseTimer=null;
  }
  crmIsClosing=false;
  columns=JSON.parse(JSON.stringify(INITIAL_COLUMNS));
  leads=JSON.parse(JSON.stringify(INITIAL_LEADS));
  hydrateLeadValues();
  motion.resetMotionScope('crm');
  selected=null;
  if(typeof location!=='undefined'&&location.hash.startsWith('#crm/')){
    location.hash='#crm';
  }
  crmView='board';
  query='';
  stageFilter='all';
  originFilter='all';
  crmHeat='all';
  followUpFilter='all';
  analysisOwner='all';
  analysisPeriod='all';
  inboxSelected=1;
  inboxQuery='';
  inboxChannel='all';
  inboxHeat='all';
}

let selected=null,crmView='board',query='',stageFilter='all',originFilter='all',crmHeat='all',followUpFilter='all',analysisOwner='all',analysisPeriod='all',api,draggedLeadId=null,inboxSelected=1,inboxQuery='',inboxChannel='all',inboxHeat='all';
const origins=['WhatsApp','Instagram','Google','Facebook','Referido','Presencial'];
const ATTENDED_STAGE=7,NO_SHOW_STAGE=8,FOLLOW_UP_STAGE=9,LOST_STAGE=6;

// Umbrales iniciales (en días del reloj de demostración) para detectar estancamiento por etapa
export const STAGE_THRESHOLDS={
  1:2, // Nuevo: máximo 2 días sin primer contacto
  2:3, // Contactado: máximo 3 días sin avanzar a interés o cita
  3:3, // Interés confirmado: máximo 3 días para agendar cita
  4:5, // Cita agendada: ventana máxima hasta la fecha de atención
  7:2, // Asistió: máximo 2 días para cierre o seguimiento
  8:1, // No asistió: máximo 1 día sin gestionar recuperación
  9:3  // Seguimiento: máximo 3 días para reagendar
};
const DEFAULT_STAGE_THRESHOLD=3;

const extractDateIso=value=>{
  const match=String(value||'').match(/\d{4}-\d{2}-\d{2}/);
  return match?match[0]:today;
};
const parseIsoUtc=iso=>{
  const [y,m,d]=String(iso||today).split('-').map(Number);
  return Date.UTC(y||2026,(m||1)-1,d||1);
};
export const diffDemoDays=(fromIso,toIso=today)=>Math.max(0,Math.round((parseIsoUtc(toIso)-parseIsoUtc(fromIso))/86400000));
const isTerminalStage=stage=>{
  const col=columns.find(c=>c.id===stage);
  return stage===convertedColumn||stage===LOST_STAGE||col?.key==='convertido'||col?.key==='perdido';
};
export const getStageMaxDays=stage=>STAGE_THRESHOLDS[stage]??DEFAULT_STAGE_THRESHOLD;
export const getLeadStageEnteredAt=l=>l.stageEnteredAt||extractDateIso(l.activities?.[0]?.at);
export const getLeadDaysInStage=(l,refDate=today)=>diffDemoDays(getLeadStageEnteredAt(l),refDate);
export function getFollowUpClassification(l,refDate=today){
  const daysInStage=getLeadDaysInStage(l,refDate);
  if(isTerminalStage(l.stage))return {key:'closed',label:'Cerrado',tone:'muted',isStagnant:false,daysInStage,maxDays:null};
  const maxDays=getStageMaxDays(l.stage);
  const nextDate=l.nextDate||null;
  const lastActDate=extractDateIso(l.lastActivityAt||l.activities?.at(-1)?.at||getLeadStageEnteredAt(l));
  const daysSinceActivity=diffDemoDays(lastActDate,refDate);
  if(nextDate&&nextDate<refDate){
    return {key:'overdue',label:'Vencido',tone:'danger',isStagnant:true,daysInStage,daysSinceActivity,maxDays};
  }
  if(daysInStage>maxDays||daysSinceActivity>maxDays){
    return {key:'stagnant',label:'Estancado',tone:'warning',isStagnant:true,daysInStage,daysSinceActivity,maxDays};
  }
  if(nextDate===refDate||daysInStage===maxDays){
    return {key:'attention',label:'Atención',tone:'accent',isStagnant:false,daysInStage,daysSinceActivity,maxDays};
  }
  return {key:'normal',label:'Normal',tone:'success',isStagnant:false,daysInStage,daysSinceActivity,maxDays};
}

export const CRM_SERVICE_VALUE_LABEL='Valor estimado del servicio';
export const CRM_VALUE_ORIGIN_INITIAL='Referencia inicial · aún no cobrada';
export const CRM_VALUE_ORIGIN_LINKED='Tarifa de la cita vinculada · aún no cobrada';

const linkedAppointment=l=>api?.appointments?.find(a=>a.id===l.appointmentId&&a.status!=='Cancelada');

export function getLeadServiceValueInfo(lead,appointmentsList=api?.appointments||[]){
  const linked=lead?.appointmentId
    ?appointmentsList.find(a=>a.id===lead.appointmentId&&a.status!=='Cancelada')||null
    :null;
  const amount=Number(linked?.amount??lead?.estimatedValue??0);
  return {
    hasLinkedAppointment:Boolean(linked),
    linkedAppointment:linked,
    amount,
    label:CRM_SERVICE_VALUE_LABEL,
    originNote:linked?CRM_VALUE_ORIGIN_LINKED:CRM_VALUE_ORIGIN_INITIAL
  };
}

const leadValue=l=>getLeadServiceValueInfo(l).amount;
const formattedValue=value=>`S/ ${Number(value||0).toLocaleString('es-PE')}`;
const plusTenMinutes=time=>{const [hour,minute]=String(time||'09:00').split(':').map(Number),total=hour*60+minute+10;return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};

export const ESSENTIAL_STAGE_KEYS=['cita_agendada','asistio','no_asistio','seguimiento','convertido','perdido'];
export const PROTECTED_STAGE_NOTICE='Esta etapa está vinculada a Agenda, CRM o ARM y no puede retirarse';

export function isEssentialColumn(colOrId){
  const col=typeof colOrId==='object'&&colOrId?colOrId:columns.find(c=>c.id===Number(colOrId));
  if(!col)return false;
  if(ESSENTIAL_STAGE_KEYS.includes(col.key))return true;
  return [bookedColumn,ATTENDED_STAGE,NO_SHOW_STAGE,FOLLOW_UP_STAGE,convertedColumn,LOST_STAGE].includes(col.id);
}

function resolveValidStageId(preferredId,fallbackKey=null){
  const byId=columns.find(c=>c.id===Number(preferredId));
  if(byId)return byId.id;
  if(fallbackKey){
    const byKey=columns.find(c=>c.key===fallbackKey);
    if(byKey)return byKey.id;
  }
  return null;
}

function queueLeadAfterNoShow(l,a,sourceModule='Agenda',skipActivity=false){
  const noShowId=resolveValidStageId(NO_SHOW_STAGE,'no_asistio');
  if(!l||!noShowId||l.noShowQueuedAppointmentId===a?.id||l.noShowHandledAppointmentId===a?.id)return false;
  const noShowCol=columns.find(c=>c.id===noShowId);
  const previousName=columns.find(c=>c.id===l.stage)?.name||'Sin etapa';
  if(l.stage!==noShowId){
    l.stage=noShowId;
    l.stageEnteredAt=a?.date||today;
  }
  l.attendanceOutcome='noshow';
  if(!skipActivity){
    activity(l,`Cita marcada como No asistió desde ${sourceModule}.`,`${a?.date||today} · ${a?.time||'09:00'} · demo`,{
      action:'Marcada como No asistió',
      module:sourceModule,
      fromStage:previousName,
      toStage:noShowCol?.name||'No asistió',
      simulated:false
    });
  }
  l.nextAction='Esperar recuperación ARM simulada';
  l.nextDate=a?.date||today;
  l.noShowQueuedAppointmentId=a?.id;
  l.pendingRecovery={appointmentId:a?.id,date:a?.date||today,time:a?.time||'09:00',readyLabel:`${a?.date||today} · ${plusTenMinutes(a?.time)} · demo (+10 min)`};
  return true;
}

function recoverLeadAfterNoShow(l){
  const followUpId=resolveValidStageId(FOLLOW_UP_STAGE,'seguimiento');
  if(!l?.pendingRecovery||!followUpId||l.noShowHandledAppointmentId===l.pendingRecovery.appointmentId)return false;
  const followUpCol=columns.find(c=>c.id===followUpId);
  const previousName=columns.find(c=>c.id===l.stage)?.name||'No asistió';
  const recovery=l.pendingRecovery;
  l.messages??=[];
  l.messages.push({side:'out',text:'Hola, notamos que no pudiste asistir a tu cita. Podemos ayudarte a elegir un nuevo horario.',at:'10 min después · simulado'});
  l.stage=followUpId;
  l.stageEnteredAt=today;
  l.nextAction='Contactar para reagendar cita';
  l.nextDate=today;
  l.noShowHandledAppointmentId=recovery.appointmentId;
  l.recoveryExecutedCount=(l.recoveryExecutedCount||0)+1;
  delete l.noShowQueuedAppointmentId;
  delete l.pendingRecovery;
  activity(l,`ARM preparó un mensaje simulado y una tarea de reagendamiento 10 minutos después. Etapa: ${previousName} → ${followUpCol?.name||'Seguimiento'}.`,recovery.readyLabel,{
    action:'Ejecución ARM +10 min (reagendamiento)',
    module:'Centro ARM',
    fromStage:previousName,
    toStage:followUpCol?.name||'Seguimiento',
    simulated:true
  });
  recordARMEvent('receptionist','Recuperación de inasistencia preparada',`${name(l)} · mensaje simulado y tarea de reagendamiento.`,'warning',recovery.readyLabel);
  return true;
}

export function handleAppointmentBooked(appointment,sourceModule='Agenda'){
  const bookedId=resolveValidStageId(bookedColumn,'cita_agendada');
  if(!appointment?.pid||!bookedId)return null;
  const bookedCol=columns.find(c=>c.id===bookedId);
  const activeLead=leads.find(l=>l.appointmentId===appointment.id)||leads.find(l=>l.pid===appointment.pid&&!isTerminalStage(l.stage));
  if(!activeLead)return null;
  activeLead.appointmentId=appointment.id;
  if(Number(appointment.amount)>0)activeLead.estimatedValue=Number(appointment.amount);
  activeLead.nextAction='Asistir a la cita programada';
  activeLead.nextDate=appointment.date||activeLead.nextDate;
  if(activeLead.stage!==bookedId){
    applyStageTransition(activeLead,bookedId,{
      sourceModule,
      action:'Cita médica agendada',
      actionLabel:`Cita registrada desde ${sourceModule}: ${appointment.date} a las ${appointment.time} (${appointment.doctor}).`
    });
  }else{
    const bookedName=bookedCol?.name||'Cita agendada';
    activity(activeLead,`Cita registrada desde ${sourceModule}: ${appointment.date} a las ${appointment.time}.`,timestamp(),{
      action:'Cita médica agendada',
      module:sourceModule,
      fromStage:bookedName,
      toStage:bookedName,
      simulated:false
    });
  }
  return activeLead;
}

export function handleAppointmentAttended(appointment){
  const attendedId=resolveValidStageId(ATTENDED_STAGE,'asistio');
  if(!appointment?.id||!attendedId)return null;
  const l=leads.find(item=>item.appointmentId===appointment.id||(item.pid===appointment.pid&&item.stage===bookedColumn&&!isTerminalStage(item.stage)));
  if(!l)return null;
  l.attendanceOutcome='attended';
  if(l.stage!==attendedId&&!isTerminalStage(l.stage)){
    applyStageTransition(l,attendedId,{
      sourceModule:'Atención médica',
      action:'Asistencia registrada en consulta',
      actionLabel:`Atención médica finalizada (${appointment.date} · ${appointment.doctor}).`
    });
  }
  return l;
}

export function handleAppointmentRescheduled(appointment,detailText=''){
  if(!appointment?.id)return null;
  const l=leads.find(item=>item.appointmentId===appointment.id);
  if(!l)return null;
  l.nextAction='Asistir a la cita reprogramada';
  l.nextDate=appointment.date||l.nextDate;
  const stageName=columns.find(c=>c.id===l.stage)?.name||'Sin etapa';
  activity(l,`Cita reprogramada desde Agenda: ${detailText||`${appointment.date} ${appointment.time}`}.`,timestamp(),{
    action:'Cita reprogramada en Agenda',
    module:'Agenda',
    fromStage:stageName,
    toStage:stageName,
    simulated:false
  });
  return l;
}

export function handleAppointmentCancelled(appointment,reason=''){
  if(!appointment?.id)return null;
  const l=leads.find(item=>item.appointmentId===appointment.id);
  if(!l)return null;
  if(!Number.isFinite(Number(l.estimatedValue))||Number(l.estimatedValue)<=0){
    l.estimatedValue=Number(appointment.amount||0);
  }
  l.nextAction='Coordinar nueva fecha tras cancelación';
  if(l.pendingRecovery?.appointmentId===appointment.id){
    delete l.pendingRecovery;
    delete l.noShowQueuedAppointmentId;
  }
  const followUpId=resolveValidStageId(FOLLOW_UP_STAGE,'seguimiento');
  const previousCol=columns.find(c=>c.id===l.stage);
  const previousName=previousCol?.name||'Cita agendada';
  const followUpCol=followUpId?columns.find(c=>c.id===followUpId):null;
  const cleanReason=String(reason||'').trim().replace(/\.+$/,'');
  const detailText=`Cita cancelada en Agenda${cleanReason?`. Motivo de cancelación: ${cleanReason}.`:'.'} Oportunidad y valor conservados.`;

  if(followUpCol&&l.stage!==followUpCol.id&&!isTerminalStage(l.stage)){
    applyStageTransition(l,followUpCol.id,{
      sourceModule:'Agenda',
      action:'Cita cancelada en Agenda',
      actionLabel:detailText
    });
  }else{
    const targetName=followUpCol?.name||previousName;
    activity(l,detailText,timestamp(),{
      action:'Cita cancelada en Agenda',
      module:'Agenda',
      fromStage:previousName,
      toStage:targetName,
      simulated:false
    });
  }
  return l;
}

export function handleAppointmentNoShow(appointment){
  const l=leads.find(item=>item.appointmentId===appointment?.id);
  return queueLeadAfterNoShow(l,appointment,'Agenda');
}

export function getPendingNoShowRecoveries(){
  return leads.filter(l=>l.pendingRecovery).map(l=>({leadId:l.id,name:name(l),...l.pendingRecovery}));
}

export function executeNoShowRecovery(leadId){
  return recoverLeadAfterNoShow(leads.find(l=>l.id===leadId));
}

function syncAppointments(){
  const attendedId=resolveValidStageId(ATTENDED_STAGE,'asistio');
  leads.forEach(l=>{
    const a=linkedAppointment(l);
    if(!a)return;
    if(a.status==='No asistió')queueLeadAfterNoShow(l,a,'Agenda');
    if(a.status==='Atendida'&&attendedId&&!isTerminalStage(l.stage)&&l.stage!==attendedId){
      const attendedName=columns.find(c=>c.id===attendedId)?.name||'Asistió';
      applyStageTransition(l,attendedId,{
        sourceModule:'Agenda',
        action:'Asistencia sincronizada desde Agenda',
        actionLabel:`Etapa: ${columns.find(c=>c.id===l.stage)?.name||'Sin etapa'} → ${attendedName}, sincronizada desde Agenda.`
      });
    }
  });
}

function leadHeat(l){
  if(l.stage===convertedColumn)return {key:'converted',label:'Convertida',score:100,icon:'✓'};
  let score=({1:8,2:28,3:52,4:78,7:92,8:72,9:64,6:0}[l.stage]??20);
  if(l.appointmentId)score+=12;
  if(l.pid)score+=6;
  if(l.nextDate===today)score+=8;
  if((l.messages?.length||0)>=3)score+=5;
  if(score>=60)return {key:'hot',label:'Caliente',score,icon:'●'};
  if(score>=30)return {key:'warm',label:'Tibia',score,icon:'●'};
  return {key:'cold',label:'Fría',score,icon:'●'};
}

const timestamp=()=>`${today} 11:20`;
const leadOwner=l=>l.owner||'Recepción Sede';
const activity=(l,text,at=timestamp(),meta={})=>{
  const cleanAt=String(at||timestamp());
  l.lastActivityAt=cleanAt.replace(' · ',' ').replace(' · demo','');
  (l.activities??=[]).push({
    text,
    at:cleanAt,
    action:meta.action||text,
    module:meta.module||'CRM',
    fromStage:meta.fromStage??null,
    toStage:meta.toStage??null,
    simulated:Boolean(meta.simulated)
  });
};
const person=l=>l.pid&&api?.patients?api.patients.find(p=>p.id===l.pid):null;
const name=l=>person(l)?.name||l.name;
const phone=l=>person(l)?.phone||l.phone;
const leadOptions=(value,includeBooked=false)=>columns.filter(c=>includeBooked||c.id!==bookedColumn).map(c=>`<option value="${c.id}" ${String(c.id)===String(value)?'selected':''}>${esc(c.name)}</option>`).join('');

function modal(title,body,actions){api.modal(title,body,actions)}
function feedback(text,id){$('#crm-error').textContent=text;if(id){$('#'+id).setAttribute('aria-invalid','true');$('#'+id).focus()}}

function originBadge(origin){
  const originIcons = {
    'WhatsApp': '#25d366',
    'Instagram': '#c13584',
    'Google': '#4285f4',
    'Facebook': '#1877f2',
    'Referido': '#e67e22',
    'Presencial': '#1b4d3e'
  };
  const color = originIcons[origin] || '#555';
  return `<span class="origin-badge" style="border-color:${color};color:${color}">${esc(origin||'Canal web')}</span>`;
}

export function getLeadsSummary(){
  return leads.map(l=>{
    const col=columns.find(c=>c.id===l.stage);
    const p=l.pid&&api?.patients?api.patients.find(x=>x.id===l.pid):null;
    return {
      id:l.id,
      name:p?.name||l.name,
      reason:l.reason,
      origin:l.origin||'WhatsApp',
      stageName:col?col.name:'Seguimiento',
      stageColor:col?col.color:'#3e95d3',
      estimatedValue:leadValue(l),
      appointmentDate:linkedAppointment(l)?.date||null,
      nextAction:l.nextAction||'Contactar paciente',
      nextDate:l.nextDate||'Pendiente'
    };
  });
}

export {leads, columns};

export function renderCRM(options){
  if(crmCloseTimer){
    clearTimeout(crmCloseTimer);
    crmCloseTimer=null;
  }
  crmIsClosing=false;
  api=options;
  syncAppointments();
  window.removeEventListener('crm:newlead', newLead);
  window.addEventListener('crm:newlead', newLead);
  if(!window.__crmHashBound){
    window.__crmHashBound=true;
    window.addEventListener('hashchange',()=>{
      if(!location.hash.startsWith('#crm')){
        if(crmCloseTimer){
          clearTimeout(crmCloseTimer);
          crmCloseTimer=null;
        }
        crmIsClosing=false;
      }
    });
  }
  const hashParts=location.hash.slice(1).split('/');
  if(hashParts[0]==='crm'&&hashParts[1]){
    const lid=Number(hashParts[1]);
    selected=leads.some(l=>l.id===lid)?lid:null;
    crmView='board';
  }else{
    selected=null;
  }
  draw();
}

export function computePipelineKPIs(leadList=leads,appList=api?.appointments||[],refDate=today){
  const convertedCol=columns.find(c=>c.key==='convertido'||c.name.toLowerCase().includes('convertido'))?.id||convertedColumn;
  const lostCol=columns.find(c=>c.key==='perdido'||c.name.toLowerCase().includes('perdido'))?.id||LOST_STAGE;
  const newCol=columns.find(c=>c.key==='nuevo')?.id||1;

  // 1. Prospectos activos: oportunidades fuera de "Convertido" y "Perdido"
  const activeLeads=leadList.filter(l=>l.stage!==convertedCol&&l.stage!==lostCol);

  // 2. Valor potencial activo: suma del valor estimado de prospectos activos
  const getVal=l=>{
    const app=appList?.find(a=>a.id===l.appointmentId&&a.status!=='Cancelada');
    return Number(app?.amount??l.estimatedValue??0);
  };
  const activeValue=activeLeads.reduce((sum,l)=>sum+getVal(l),0);

  // 3. Conversión a cita: contactados que consiguieron cita / prospectos que ya recibieron contacto
  const wasContacted=l=>{
    if(l.stage!==newCol&&l.stage!==lostCol)return true;
    return Boolean(l.contacted||l.appointmentId||(l.messages||[]).some(m=>m.side==='out'));
  };
  const obtainedAppointment=l=>{
    const linked=l.appointmentId?appList?.find(a=>a.id===l.appointmentId):null;
    if(l.appointmentId&&(!linked||linked.status!=='Cancelada'))return true;
    return [bookedColumn,ATTENDED_STAGE,NO_SHOW_STAGE,FOLLOW_UP_STAGE].includes(l.stage);
  };
  const contactedLeads=leadList.filter(wasContacted);
  const bookedFromContacted=contactedLeads.filter(obtainedAppointment);
  const conversionRate=contactedLeads.length>0?Math.round((bookedFromContacted.length/contactedLeads.length)*100):0;

  // 4. Asistencia: atendidas / resueltas como Asistió o No asistió (sin futuras/pendientes)
  let attendanceAttendedCount=0;
  let attendanceNoShowCount=0;
  leadList.forEach(l=>{
    const rawApp=l.appointmentId?appList?.find(a=>a.id===l.appointmentId):null;
    const resolvedNoShow=
      l.stage===NO_SHOW_STAGE||
      l.attendanceOutcome==='noshow'||
      Boolean(l.pendingRecovery)||
      (rawApp&&rawApp.status==='No asistió')||
      Boolean(l.noShowHandledAppointmentId&&(!l.appointmentId||l.appointmentId===l.noShowHandledAppointmentId));
    const resolvedAttended=
      l.stage===ATTENDED_STAGE||
      l.attendanceOutcome==='attended'||
      (rawApp&&rawApp.status==='Atendida');
    if(resolvedAttended&&!resolvedNoShow)attendanceAttendedCount++;
    else if(resolvedNoShow)attendanceNoShowCount++;
  });
  const attendanceResolvedCount=attendanceAttendedCount+attendanceNoShowCount;
  const attendanceRate=attendanceResolvedCount>0?Math.round((attendanceAttendedCount/attendanceResolvedCount)*100):0;

  // 5. Oportunidades estancadas: activos con próxima acción vencida o tiempo en etapa excedido
  const stagnantLeads=activeLeads.filter(l=>getFollowUpClassification(l,refDate).isStagnant);

  // 6. Recuperaciones ARM pendientes: prospectos en "No asistió" sin ejecutar recuperación
  const pendingRecoveryLeads=leadList.filter(l=>l.stage===NO_SHOW_STAGE&&Boolean(l.pendingRecovery));

  return {
    total:leadList.length,
    activeCount:activeLeads.length,
    activeValue,
    conversionRate,
    conversionBookedCount:bookedFromContacted.length,
    conversionContactedCount:contactedLeads.length,
    attendanceRate,
    attendanceAttendedCount,
    attendanceResolvedCount,
    stagnantCount:stagnantLeads.length,
    pendingRecoveryCount:pendingRecoveryLeads.length
  };
}

export function computePipelineAnalytics(leadList=leads,appList=api?.appointments||[],filters={}){
  const origin=filters.origin??originFilter;
  const owner=filters.owner??analysisOwner;
  const period=filters.period??analysisPeriod;
  const refDate=filters.refDate??today;

  const filtered=leadList.filter(l=>{
    if(origin!=='all'&&(l.origin||'WhatsApp')!==origin)return false;
    if(owner!=='all'&&leadOwner(l)!==owner)return false;
    if(period!=='all'){
      const refIso=getLeadStageEnteredAt(l);
      const age=diffDemoDays(refIso,refDate);
      if(period==='today'&&age!==0)return false;
      if(period==='last3'&&age>2)return false;
      if(period==='last7'&&age>6)return false;
    }
    return true;
  });

  const getVal=l=>{
    const app=appList?.find(a=>a.id===l.appointmentId&&a.status!=='Cancelada');
    return Number(app?.amount??l.estimatedValue??0);
  };

  const mainStageDefs=[
    {id:columns.find(c=>c.key==='nuevo')?.id||1,rank:0},
    {id:columns.find(c=>c.key==='contactado')?.id||2,rank:1},
    {id:columns.find(c=>c.key==='interesado')?.id||3,rank:2},
    {id:bookedColumn,rank:3},
    {id:ATTENDED_STAGE,rank:4},
    {id:convertedColumn,rank:5}
  ];

  const leadRank=l=>{
    if(l.stage===convertedColumn)return 5;
    if(l.stage===ATTENDED_STAGE)return 4;
    if([bookedColumn,NO_SHOW_STAGE,FOLLOW_UP_STAGE].includes(l.stage))return 3;
    if(l.stage===3||columns.find(c=>c.id===l.stage)?.key==='interesado')return 2;
    if(l.stage===2||columns.find(c=>c.id===l.stage)?.key==='contactado')return 1;
    if(l.stage===LOST_STAGE){
      if(l.appointmentId)return 3;
      if((l.messages||[]).some(m=>m.side==='out'))return 1;
      return 0;
    }
    return 0;
  };

  const totalFiltered=filtered.length;
  let prevReached=totalFiltered;
  const funnel=mainStageDefs.map((def,idx)=>{
    const col=columns.find(c=>c.id===def.id);
    const currentItems=filtered.filter(l=>l.stage===def.id);
    const reached=filtered.filter(l=>leadRank(l)>=def.rank).length;
    const stepRate=idx===0
      ?(totalFiltered>0?100:null)
      :(prevReached>0?Math.round((reached/prevReached)*100):null);
    const denominator=idx===0?totalFiltered:prevReached;
    prevReached=reached;
    return {
      id:def.id,
      name:col?.name||`Etapa ${def.id}`,
      color:col?.color||'#1b4d3e',
      currentCount:currentItems.length,
      estimatedValue:currentItems.reduce((s,l)=>s+getVal(l),0),
      reachedCount:reached,
      denominator,
      stepAdvanceRate:stepRate
    };
  });

  const branches=[NO_SHOW_STAGE,FOLLOW_UP_STAGE,LOST_STAGE].map(id=>{
    const col=columns.find(c=>c.id===id);
    const items=filtered.filter(l=>l.stage===id);
    return {
      id,
      name:col?.name||`Etapa ${id}`,
      color:col?.color||'#888888',
      currentCount:items.length,
      estimatedValue:items.reduce((s,l)=>s+getVal(l),0),
      shareRate:totalFiltered>0?Math.round((items.length/totalFiltered)*100):null
    };
  });

  const stageDurations=columns.map(col=>{
    const items=filtered.filter(l=>l.stage===col.id);
    const avgDays=items.length>0
      ?Number((items.reduce((sum,l)=>sum+getLeadDaysInStage(l,refDate),0)/items.length).toFixed(1))
      :null;
    const maxThreshold=isTerminalStage(col.id)?null:getStageMaxDays(col.id);
    return {id:col.id,name:col.name,color:col.color,count:items.length,avgDays,maxThreshold};
  });

  const lostLeads=filtered.filter(l=>l.stage===LOST_STAGE);
  const lossMap=new Map();
  lostLeads.forEach(l=>{
    const reason=l.lossReason||'Motivo no especificado';
    lossMap.set(reason,(lossMap.get(reason)||0)+1);
  });
  const lossReasons=Array.from(lossMap.entries()).map(([reason,count])=>({
    reason,
    count,
    rate:lostLeads.length>0?Math.round((count/lostLeads.length)*100):0
  })).sort((a,b)=>b.count-a.count);

  let attended=0,noShows=0,recovered=0;
  filtered.forEach(l=>{
    const rawApp=l.appointmentId?appList?.find(a=>a.id===l.appointmentId):null;
    const isNoShow=
      l.stage===NO_SHOW_STAGE||
      l.attendanceOutcome==='noshow'||
      Boolean(l.pendingRecovery)||
      (rawApp&&rawApp.status==='No asistió')||
      Boolean(l.noShowHandledAppointmentId)||
      (l.recoveryExecutedCount||0)>0;
    const isAttended=
      l.stage===ATTENDED_STAGE||
      l.attendanceOutcome==='attended'||
      (rawApp&&rawApp.status==='Atendida');
    if(isNoShow){
      noShows++;
      if(Boolean(l.noShowHandledAppointmentId)||(l.recoveryExecutedCount||0)>0)recovered++;
    }else if(isAttended){
      attended++;
    }
  });
  const resolvedAttendance=attended+noShows;
  const noShowRate=resolvedAttendance>0?Math.round((noShows/resolvedAttendance)*100):null;
  const recoveryRate=noShows>0?Math.round((recovered/noShows)*100):null;

  const channelSet=new Set([...origins,...filtered.map(l=>l.origin||'WhatsApp')]);
  const channelDistribution=Array.from(channelSet).map(ch=>{
    const items=filtered.filter(l=>(l.origin||'WhatsApp')===ch);
    return {
      channel:ch,
      count:items.length,
      shareRate:totalFiltered>0?Math.round((items.length/totalFiltered)*100):0,
      estimatedValue:items.reduce((s,l)=>s+getVal(l),0)
    };
  }).filter(c=>c.count>0).sort((a,b)=>b.count-a.count);

  return {
    sampleCount:totalFiltered,
    totalEstimatedValue:filtered.reduce((s,l)=>s+getVal(l),0),
    funnel,
    branches,
    stageDurations,
    lossTotal:lostLeads.length,
    lossReasons,
    attendance:{attended,noShows,resolved:resolvedAttendance,noShowRate,recovered,recoveryRate},
    channelDistribution
  };
}

function renderAnalysisView(){
  const data=computePipelineAnalytics();
  const ownerList=[...new Set([...OWNERS,...leads.map(leadOwner)])];

  return `
    <div class="note analysis-sample-note">
      <b>Análisis del pipeline (muestra demostrativa en memoria):</b> Se calculan métricas locales sobre <b>${data.sampleCount} ${data.sampleCount===1?'oportunidad':'oportunidades'}</b> al reloj demo (<code>${today}</code>). Los importes corresponden únicamente a <b>valor estimado referencial</b> (S/ ${data.totalEstimatedValue.toLocaleString('es-PE')} en esta vista) y no representan ingresos reales ni facturación.
    </div>

    <div class="toolbar analysis-toolbar" aria-label="Filtros del análisis del pipeline">
      <select id="analysis-origin" aria-label="Filtrar análisis por canal">
        <option value="all">Todos los canales</option>
        ${origins.map(o=>`<option value="${o}" ${originFilter===o?'selected':''}>${o}</option>`).join('')}
      </select>
      <select id="analysis-owner" aria-label="Filtrar análisis por responsable">
        <option value="all">Todos los responsables</option>
        ${ownerList.map(o=>`<option value="${esc(o)}" ${analysisOwner===o?'selected':''}>${esc(o)}</option>`).join('')}
      </select>
      <div class="analysis-period-control">
        <select id="analysis-period" aria-label="Filtrar análisis por fecha de entrada a la etapa actual">
          <option value="all" ${analysisPeriod==='all'?'selected':''}>Todo el periodo del demo</option>
          <option value="today" ${analysisPeriod==='today'?'selected':''}>Entró a etapa hoy</option>
          <option value="last3" ${analysisPeriod==='last3'?'selected':''}>Entró a etapa en los últimos 3 días</option>
          <option value="last7" ${analysisPeriod==='last7'?'selected':''}>Entró a etapa en los últimos 7 días</option>
        </select>
        <small class="analysis-period-hint">El periodo se calcula con la fecha de entrada a la etapa actual.</small>
      </div>
      <button id="analysis-reset-filters">Limpiar filtros</button>
    </div>

    <div class="analysis-grid">
      <section class="panel analysis-card analysis-wide">
        <div class="panelhead">
          <div>
            <h2>Avance acumulado del pipeline actual</h2>
            <small class="analysis-scale-caption">Porcentaje de avance actual (escala horizontal 0 %–100 % según etapa actual) · Importes = valor estimado, no ingresos reales</small>
            <p class="analysis-funnel-note">Los porcentajes se estiman a partir de la etapa actual de cada oportunidad. No representan un historial de conversiones.</p>
          </div>
          <span class="badge">Muestra demo (${data.sampleCount})</span>
        </div>
        <div class="panelbody">
          ${data.sampleCount===0?'<div class="empty">Sin datos suficientes para construir el avance acumulado con los filtros seleccionados.</div>':`
            <div class="funnel-list">
              ${data.funnel.map((row,idx)=>`
                <div class="funnel-row">
                  <div class="funnel-meta">
                    <span class="funnel-stage-label"><i class="dot" style="background:${row.color}"></i><b>${esc(row.name)}</b></span>
                    <small>${row.currentCount} en etapa · ${formattedValue(row.estimatedValue)} estimados</small>
                  </div>
                  <div class="analysis-bar-track" aria-label="${esc(row.name)}: ${row.stepAdvanceRate!==null?`Porcentaje de avance actual ${row.stepAdvanceRate}%`:'Sin datos suficientes'}">
                    <div class="analysis-bar-fill" style="width:${row.stepAdvanceRate??0}%;background:${row.color}"></div>
                  </div>
                  <div class="funnel-rate">
                    ${row.stepAdvanceRate!==null
                      ?`<b>${row.stepAdvanceRate} %</b><small>${idx===0?`${row.reachedCount} total`:`${row.reachedCount} de ${row.denominator}`}</small>`
                      :`<b>Sin datos suficientes</b><small>Sin avance previo</small>`}
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="analysis-branches">
              <h3>Rutas alternas y cierres fuera del flujo lineal</h3>
              <div class="branch-cards">
                ${data.branches.map(b=>`
                  <div class="branch-pill">
                    <span><i class="dot" style="background:${b.color}"></i><b>${esc(b.name)}</b></span>
                    <strong>${b.currentCount} ${b.currentCount===1?'oportunidad':'oportunidades'}</strong>
                    <small>${formattedValue(b.estimatedValue)} estimados · ${b.shareRate!==null?`${b.shareRate} % del total`:'Sin datos suficientes'}</small>
                  </div>
                `).join('')}
              </div>
            </div>
          `}
        </div>
      </section>

      <section class="panel analysis-card">
        <div class="panelhead">
          <div>
            <h2>Tiempo promedio por etapa</h2>
            <small class="analysis-scale-caption">Calculado en días respecto al reloj demo (${today}) vs umbral configurado</small>
          </div>
        </div>
        <div class="panelbody">
          ${data.sampleCount===0?'<div class="empty">Sin datos suficientes</div>':`
            <div class="metric-rows">
              ${data.stageDurations.map(s=>`
                <div class="metric-row">
                  <div>
                    <span class="funnel-stage-label"><i class="dot" style="background:${s.color}"></i><b>${esc(s.name)}</b></span>
                    <small>${s.count} ${s.count===1?'oportunidad':'oportunidades'}${s.maxThreshold!==null?` · umbral ${s.maxThreshold}d`:''}</small>
                  </div>
                  <div class="metric-val">
                    ${s.avgDays!==null?`<b>${s.avgDays} días</b>`:`<span class="insufficient-pill">Sin datos suficientes</span>`}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </section>

      <section class="panel analysis-card">
        <div class="panelhead">
          <div>
            <h2>Asistencia y recuperación ARM</h2>
            <small class="analysis-scale-caption">Resolución real en Agenda/CRM y recuperaciones +10 min en ARM</small>
          </div>
        </div>
        <div class="panelbody">
          <div class="analysis-stat-pair">
            <div class="analysis-subcard">
              <span>Tasa de inasistencia</span>
              ${data.attendance.noShowRate!==null
                ?`<strong>${data.attendance.noShowRate} %</strong><small>${data.attendance.noShows} de ${data.attendance.resolved} citas resueltas (excluye pendientes)</small>`
                :`<strong class="insufficient-val">Sin datos suficientes</strong><small>0 citas resueltas como Asistió o No asistió</small>`}
            </div>
            <div class="analysis-subcard">
              <span>Recuperación tras inasistencia</span>
              ${data.attendance.recoveryRate!==null
                ?`<strong>${data.attendance.recoveryRate} %</strong><small>${data.attendance.recovered} de ${data.attendance.noShows} ejecutadas vía ARM</small>`
                :`<strong class="insufficient-val">Sin datos suficientes</strong><small>Sin inasistencias registradas en la muestra</small>`}
            </div>
          </div>

          <h3 class="analysis-subtitle">Motivos de pérdida</h3>
          ${data.lossTotal===0
            ?`<div class="empty compact-empty">Sin datos suficientes · Ninguna oportunidad marcada como Perdido en esta selección.</div>`
            :`<div class="metric-rows">
              ${data.lossReasons.map(r=>`
                <div class="metric-row">
                  <div style="flex:1">
                    <b>${esc(r.reason)}</b>
                    <div class="analysis-bar-track small-track"><div class="analysis-bar-fill" style="width:${r.rate}%;background:#888888"></div></div>
                  </div>
                  <div class="metric-val"><b>${r.count} (${r.rate} %)</b></div>
                </div>
              `).join('')}
            </div>`}
        </div>
      </section>

      <section class="panel analysis-card analysis-wide">
        <div class="panelhead">
          <div>
            <h2>Distribución por canal de origen</h2>
            <small class="analysis-scale-caption">Escala 0 %–100 % sobre ${data.sampleCount} oportunidades filtradas · Valores estimados no constituyen ingresos reales</small>
          </div>
        </div>
        <div class="panelbody">
          ${data.channelDistribution.length===0
            ?'<div class="empty">Sin datos suficientes para los filtros aplicados.</div>'
            :`<div class="channel-dist-list">
              ${data.channelDistribution.map(ch=>`
                <div class="channel-dist-row">
                  <div class="channel-dist-head">
                    ${originBadge(ch.channel)}
                    <span><b>${ch.count}</b> ${ch.count===1?'oportunidad':'oportunidades'} (${ch.shareRate} %)</span>
                    <small>${formattedValue(ch.estimatedValue)} estimados</small>
                  </div>
                  <div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:${ch.shareRate}%;background:var(--primary)"></div></div>
                </div>
              `).join('')}
            </div>`}
        </div>
      </section>
    </div>
  `;
}

function crmKPIs(){
  const kpi=computePipelineKPIs();
  return `<div class="stats crm-stats-strip crm-pipeline-kpis" aria-label="Indicadores del pipeline CRM">
    <div class="stat tone-accent">
      <div class="stat-head">
        <span>Prospectos activos</span>
        <div class="stat-icon"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
      </div>
      <strong data-motion-key="crm:active-count">${String(kpi.activeCount).padStart(2,'0')}</strong>
      <small>${kpi.activeCount} de ${kpi.total} oportunidades en curso</small>
    </div>
    <div class="stat tone-success">
      <div class="stat-head">
        <span>Valor potencial activo</span>
        <div class="stat-icon"><svg class="svg-icon" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
      </div>
      <strong data-motion-key="crm:active-value">${formattedValue(kpi.activeValue)}</strong>
      <small>Estimado demo · sin ingreso real</small>
    </div>
    <div class="stat">
      <div class="stat-head">
        <span>Conversión a cita</span>
        <div class="stat-icon"><svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
      </div>
      <strong data-motion-key="crm:conversion-rate">${kpi.conversionRate} %</strong>
      <small>${kpi.conversionContactedCount?`${kpi.conversionBookedCount} de ${kpi.conversionContactedCount} prospectos`:'Sin prospectos contactados aún'}</small>
    </div>
    <div class="stat ${kpi.attendanceResolvedCount?'tone-success':''}">
      <div class="stat-head">
        <span>Asistencia</span>
        <div class="stat-icon"><svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      </div>
      <strong data-motion-key="crm:attendance-rate">${kpi.attendanceRate} %</strong>
      <small>${kpi.attendanceResolvedCount?`${kpi.attendanceAttendedCount} de ${kpi.attendanceResolvedCount} citas resueltas`:'Sin citas resueltas aún'}</small>
    </div>
    <div class="stat ${kpi.stagnantCount?'tone-danger':''}">
      <div class="stat-head">
        <span>Oportunidades estancadas</span>
        <div class="stat-icon"><svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
      </div>
      <strong data-motion-key="crm:stagnant-count">${String(kpi.stagnantCount).padStart(2,'0')}</strong>
      <small>${kpi.stagnantCount?'Acción vencida o plazo excedido':'Todas dentro del plazo esperado'}</small>
    </div>
    <div class="stat ${kpi.pendingRecoveryCount?'tone-warning':''}">
      <div class="stat-head">
        <span>Recuperaciones ARM pendientes</span>
        <div class="stat-icon"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
      </div>
      <strong data-motion-key="crm:pending-recovery">${String(kpi.pendingRecoveryCount).padStart(2,'0')}</strong>
      <small>${kpi.pendingRecoveryCount?'En No asistió esperando +10 min':'Sin recuperaciones por ejecutar'}</small>
    </div>
  </div>`;
}

function draw(){
  const current=leads.find(l=>l.id===selected);
  $('#view').innerHTML=`
    <div class="crm-top-header">
      <div class="note" style="margin:0;flex:1">
        <b>Demostración de CRM comercial:</b> Gestión de canales de contacto (WhatsApp, Google, Redes y Referidos). El objetivo es calificar al interesado y convertirlo en paciente con una cita oftalmológica en agenda.
      </div>
      <div class="crm-view-switch" role="tablist" aria-label="Vista del módulo CRM">
        <button role="tab" type="button" id="crm-tab-board" data-crm-view="board" aria-selected="${crmView==='board'}" class="${crmView==='board'?'active':''}">Tablero</button>
        <button role="tab" type="button" id="crm-tab-analysis" data-crm-view="analysis" aria-selected="${crmView==='analysis'}" class="${crmView==='analysis'?'active':''}">Análisis</button>
      </div>
    </div>
    ${crmKPIs()}
    ${crmView==='analysis'?renderAnalysisView():`
    <div class="toolbar">
      <div class="searchbox">
        <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input id="crmsearch" aria-label="Buscar prospecto por nombre, teléfono o motivo" placeholder="Buscar por nombre, teléfono o motivo…" value="${esc(query)}">
        <button id="crmclear" aria-label="Limpiar búsqueda" ${query?'':'hidden'}>×</button>
      </div>
      <select id="crmorigin" aria-label="Filtrar por canal de origen">
        <option value="all">Todos los orígenes</option>
        ${origins.map(o=>`<option value="${o}" ${originFilter===o?'selected':''}>${o}</option>`).join('')}
      </select>
      <select id="crmfilter" aria-label="Filtrar seguimientos por etapa">
        <option value="all">Todas las etapas</option>
        ${leadOptions(stageFilter,true)}
      </select>
      <select id="crmheat" aria-label="Filtrar prospectos por prioridad comercial">
        <option value="all">Todas las prioridades</option>
        <option value="hot" ${crmHeat==='hot'?'selected':''}>Calientes</option>
        <option value="warm" ${crmHeat==='warm'?'selected':''}>Tibias</option>
        <option value="cold" ${crmHeat==='cold'?'selected':''}>Frías</option>
        <option value="converted" ${crmHeat==='converted'?'selected':''}>Convertidas</option>
      </select>
      <select id="crmfollowup" aria-label="Filtrar por estado de seguimiento">
        <option value="all">Todos los seguimientos</option>
        <option value="normal" ${followUpFilter==='normal'?'selected':''}>Normal (en plazo)</option>
        <option value="attention" ${followUpFilter==='attention'?'selected':''}>Atención (por vencer)</option>
        <option value="stagnant" ${followUpFilter==='stagnant'?'selected':''}>Estancado (excede umbral)</option>
        <option value="overdue" ${followUpFilter==='overdue'?'selected':''}>Vencido (fecha pasada)</option>
      </select>
      <button id="columns">Configurar columnas</button>
      <button class="primary" id="newlead">＋ Nuevo prospecto</button>
    </div>
    <div class="crmworkspace ${current?'withdetail':''}">
      <div id="crmboard" class="kanban"></div>
      ${current?`<button class="crm-drawer-backdrop" id="crmbackdrop" aria-label="Cerrar seguimiento"></button><section class="crmdetail" aria-labelledby="detailtitle" aria-modal="true" role="dialog" tabindex="-1" id="crmdetail"></section>`:''}
    </div>
    `}
  `;

  if(crmView==='board'&&motion.shouldAnimateModuleEntry('crm','board')){
    motion.animateStagger('.crm-pipeline-kpis .stat',{scope:'crm',maxItems:6});
    motion.animateStagger('.crm-column',{scope:'crm',maxItems:6});
  }
  const kpiForMotion=computePipelineKPIs();
  motion.animateNumber('#view [data-motion-key="crm:active-count"]',{to:kpiForMotion.activeCount,padZeros:2,scope:'crm'});
  motion.animateNumber('#view [data-motion-key="crm:active-value"]',{to:kpiForMotion.activeValue,customFormatter:formattedValue,scope:'crm'});
  motion.animateNumber('#view [data-motion-key="crm:conversion-rate"]',{to:kpiForMotion.conversionRate,suffix:' %',scope:'crm'});
  motion.animateNumber('#view [data-motion-key="crm:attendance-rate"]',{to:kpiForMotion.attendanceRate,suffix:' %',scope:'crm'});
  motion.animateNumber('#view [data-motion-key="crm:stagnant-count"]',{to:kpiForMotion.stagnantCount,padZeros:2,scope:'crm'});
  motion.animateNumber('#view [data-motion-key="crm:pending-recovery"]',{to:kpiForMotion.pendingRecoveryCount,padZeros:2,scope:'crm'});

  document.querySelectorAll('[data-crm-view]').forEach(btn=>btn.onclick=()=>{
    crmView=btn.dataset.crmView;
    if(crmView==='analysis'){
      if(crmCloseTimer){
        clearTimeout(crmCloseTimer);
        crmCloseTimer=null;
      }
      crmIsClosing=false;
      selected=null;
    }
    draw();
  });

  if(crmView==='analysis'){
    $('#analysis-origin').onchange=e=>{originFilter=e.target.value;draw();};
    $('#analysis-owner').onchange=e=>{analysisOwner=e.target.value;draw();};
    $('#analysis-period').onchange=e=>{analysisPeriod=e.target.value;draw();};
    $('#analysis-reset-filters').onclick=()=>{originFilter='all';analysisOwner='all';analysisPeriod='all';draw();};
    return;
  }

  $('#crmfilter').value=stageFilter;
  $('#crmheat').value=crmHeat;
  $('#crmorigin').value=originFilter;
  $('#crmfollowup').value=followUpFilter;
  board();
  if(current){
    detail(current);
    const ws=document.querySelector('.crmworkspace');
    const detailEl=document.querySelector('.crmdetail');
    const backdropEl=document.querySelector('.crm-drawer-backdrop');
    requestAnimationFrame(()=>{
      ws?.classList.add('is-drawer-open');
      detailEl?.classList.add('is-open');
      backdropEl?.classList.add('is-open');
    });
  }

  $('#crmsearch').oninput=e=>{query=e.target.value;$('#crmclear').hidden=!query;board();};
  $('#crmclear').onclick=()=>{query='';$('#crmsearch').value='';$('#crmclear').hidden=true;board();$('#crmsearch').focus();};
  $('#crmorigin').onchange=e=>{originFilter=e.target.value;board();};
  $('#crmfilter').onchange=e=>{stageFilter=e.target.value;board();};
  $('#crmheat').onchange=e=>{crmHeat=e.target.value;board();};
  $('#crmfollowup').onchange=e=>{followUpFilter=e.target.value;board();};
  $('#columns').onclick=manageColumns;
  $('#newlead').onclick=newLead;
  if($('#crmbackdrop'))$('#crmbackdrop').onclick=()=>closeLeadDetail(current.id);
}

let crmCloseTimer=null;
let crmIsClosing=false;

function closeLeadDetail(id, { immediate = false } = {}){
  if(crmIsClosing)return;
  const ws=document.querySelector('.crmworkspace');
  const detailEl=document.querySelector('.crmdetail');
  const backdropEl=document.querySelector('.crm-drawer-backdrop');

  if(crmCloseTimer){
    clearTimeout(crmCloseTimer);
    crmCloseTimer=null;
  }

  const finish=()=>{
    if(crmCloseTimer){
      clearTimeout(crmCloseTimer);
      crmCloseTimer=null;
    }
    crmIsClosing=false;
    selected=null;
    if(location.hash.startsWith('#crm')){
      location.hash='#crm';
      draw();
      document.querySelector(`[data-followup="${id}"]`)?.focus();
    }
  };

  if(immediate||!detailEl||!ws){
    finish();
    return;
  }

  crmIsClosing=true;
  ws.classList.remove('is-drawer-open');
  detailEl.classList.remove('is-open');
  backdropEl?.classList.remove('is-open');

  const onEnd=e=>{
    if(e&&e.target!==detailEl)return;
    detailEl.removeEventListener('transitionend',onEnd);
    finish();
  };

  detailEl.addEventListener('transitionend',onEnd);
  crmCloseTimer=setTimeout(onEnd,190);
}

function board(){
  const filtered=leads.filter(l=>{
    if(stageFilter!=='all'&&l.stage!==Number(stageFilter))return false;
    if(originFilter!=='all'&&l.origin!==originFilter)return false;
    if(crmHeat!=='all'&&leadHeat(l).key!==crmHeat)return false;
    if(followUpFilter!=='all'&&getFollowUpClassification(l).key!==followUpFilter)return false;
    const text=(name(l)+' '+phone(l)+' '+l.reason+' '+(l.origin||'')+' '+leadOwner(l)).toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const displayColumns = columns.filter(c=>stageFilter==='all'||String(c.id)===stageFilter);

  $('#crmboard').innerHTML=displayColumns.map(c=>{
    const items=filtered.filter(l=>l.stage===c.id);
    const stageValue=items.reduce((sum,l)=>sum+leadValue(l),0);
    return `<section class="column" data-stage="${c.id}">
      <div class="column-header-block">
        <h2>
          <span class="dot" style="background:${c.color}"></span>
          <span class="column-title">${esc(c.name)}</span>
          <span class="badge column-count">${items.length}</span>
        </h2>
        <small class="column-helper">${esc(c.helper||'Etapa del pipeline')}</small>
        <strong class="column-value">${formattedValue(stageValue)} estimados</strong>
      </div>
      <div class="column-body" data-drop-stage="${c.id}" aria-label="Soltar prospectos en ${esc(c.name)}">
        ${items.map(l=>{
          const followUp=getFollowUpClassification(l);
          const isOverdue=followUp.key==='overdue';
          const isDueToday=l.nextDate===today;
          const enteredAt=getLeadStageEnteredAt(l);
          const linked=linkedAppointment(l);
          const valInfo=getLeadServiceValueInfo(l);
          const heat=leadHeat(l);
          return `<button class="lead ${selected===l.id?'selected':''}" data-followup="${l.id}" draggable="true" aria-label="${esc(name(l))}. Etapa ${esc(c.name)}. Estado ${esc(followUp.label)}. Arrastra para cambiar de etapa">
            <div class="lead-head">
              <span class="avatar lead-avatar">${initials(name(l))}</span>
              <div class="lead-head-text">
                <strong>${esc(name(l))}</strong>
                ${originBadge(l.origin||'WhatsApp')}
              </div>
            </div>
            <p class="lead-reason">${esc(l.reason)}</p>
            <div class="lead-commercial-data">
              <span class="lead-value-item">
                <span class="lead-value-top">
                  <small>${valInfo.label}</small>
                  <b>${formattedValue(valInfo.amount)}</b>
                </span>
                <small class="lead-value-sub">${valInfo.originNote}</small>
              </span>
              <span><small>Cita</small><b>${linked?`${esc(linked.date)} · ${esc(linked.time)}`:'Sin agendar'}</b></span>
              <span><small>Responsable</small><b>${esc(leadOwner(l))}</b></span>
              <span><small>En etapa (${esc(enteredAt)})</small><b>${followUp.daysInStage} ${followUp.daysInStage===1?'día':'días'}${followUp.maxDays!==null?` / máx ${followUp.maxDays}d`:''}</b></span>
              <span><small>Última actividad</small><b>${esc(l.lastActivityAt||enteredAt)}</b></span>
            </div>
            <div class="lead-tags">
              <span class="lead-tag ${l.pid?'tag-registered':'tag-unregistered'}">
                ${l.pid?'● Paciente registrado':'○ Contacto sin ficha'}
              </span>
              <span class="heat-badge heat-${heat.key}">${heat.icon} ${heat.label}</span>
              <span class="followup-badge followup-${followUp.key}" title="Seguimiento respecto a reloj demo (${today})">${esc(followUp.label)}</span>
            </div>
            <div class="lead-action-box ${(isDueToday||isOverdue)?'due-box':''}">
              <small><b>Próxima acción:</b> ${esc(l.nextAction||'Por definir')}</small>
              <small class="lead-date ${(isDueToday||isOverdue)?'due-date urgent':''}">${esc(l.nextDate||'Sin fecha programada')}${isOverdue?' (Vencida)':''}</small>
            </div>
          </button>`;
        }).join('')||'<p class="columnempty">Sin prospectos en esta etapa.</p>'}
      </div>
    </section>`;
  }).join('');

  document.querySelectorAll('[data-followup]').forEach(b=>b.onclick=()=>{
    if(crmCloseTimer){
      clearTimeout(crmCloseTimer);
      crmCloseTimer=null;
    }
    crmIsClosing=false;
    selected=Number(b.dataset.followup);
    location.hash='#crm/'+selected;
    draw();
    $('#crmdetail')?.focus();
  });
  document.querySelectorAll('[data-followup]').forEach(card=>{
    card.ondragstart=e=>{
      draggedLeadId=Number(card.dataset.followup);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain',String(draggedLeadId));
    };
    card.ondragend=()=>{
      draggedLeadId=null;
      card.classList.remove('dragging');
      document.querySelectorAll('[data-drop-stage]').forEach(zone=>zone.classList.remove('dragover'));
    };
  });
  document.querySelectorAll('[data-drop-stage]').forEach(zone=>{
    zone.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';zone.classList.add('dragover');};
    zone.ondragleave=e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('dragover');};
    zone.ondrop=e=>{
      e.preventDefault();
      zone.classList.remove('dragover');
      const leadId=Number(e.dataTransfer.getData('text/plain')||draggedLeadId);
      moveLeadToStage(leadId,Number(zone.dataset.dropStage));
    };
  });
}

function applyStageTransition(l,targetStage,{sourceModule='CRM',actionLabel=null,action=null,resetEntry=true,simulated=false}={}){
  const target=columns.find(c=>c.id===targetStage);
  const previous=columns.find(c=>c.id===l?.stage);
  if(!l||!target||l.stage===targetStage)return {changed:false,previous,target};
  l.stage=targetStage;
  if(resetEntry)l.stageEnteredAt=today;
  if(targetStage===ATTENDED_STAGE){
    l.attendanceOutcome='attended';
    delete l.pendingRecovery;
    delete l.noShowQueuedAppointmentId;
  }
  activity(l,actionLabel||`Etapa: ${previous?.name||'Sin etapa'} → ${target.name}`,timestamp(),{
    action:action||`Cambio de etapa (${previous?.name||'Sin etapa'} → ${target.name})`,
    module:sourceModule,
    fromStage:previous?.name||null,
    toStage:target.name,
    simulated
  });
  if(targetStage===NO_SHOW_STAGE){
    const appointment=api?.appointments?.find(a=>a.id===l.appointmentId&&a.status!=='Cancelada');
    queueLeadAfterNoShow(l,appointment||{id:`manual-${l.id}`,date:today,time:'09:00'},sourceModule,true);
  }else if(previous?.id===NO_SHOW_STAGE&&targetStage!==FOLLOW_UP_STAGE){
    delete l.pendingRecovery;
    delete l.noShowQueuedAppointmentId;
  }
  return {changed:true,previous,target};
}

function moveLeadToStage(leadId,targetStage){
  const l=leads.find(item=>item.id===leadId);
  const target=columns.find(c=>c.id===targetStage);
  if(!l||!target||l.stage===targetStage)return;
  const appointment=api?.appointments?.find(a=>a.id===l.appointmentId&&a.status!=='Cancelada');
  if(targetStage===bookedColumn&&!appointment){
    api.toast('Para pasar a Cita agendada, primero registra la cita desde el detalle.');
    return;
  }
  applyStageTransition(l,targetStage,{sourceModule:'CRM (Arrastre)'});
  selected=null;
  location.hash='#crm';
  draw();
  api.toast(`${name(l)} pasó a ${target.name}.`);
}

function detail(l){
  const p=person(l);
  const a=api.appointments.find(a=>a.id===l.appointmentId);
  const valInfo=getLeadServiceValueInfo(l);
  const followUp=getFollowUpClassification(l);
  const enteredAt=getLeadStageEnteredAt(l);
  const stageObj=columns.find(c=>c.id===l.stage);

  $('#crmdetail').innerHTML=`
    <div class="drawerhead">
      <div>
        <span class="eyebrow">SEGUIMIENTO · COMERCIAL</span>
        <h2 id="detailtitle">${esc(name(l))}</h2>
        <div class="drawer-contact-row">
          <a href="tel:${esc(phone(l))}" class="contact-link"><b>📞 ${esc(phone(l))}</b></a>
          <span>·</span>
          ${originBadge(l.origin||'WhatsApp')}
          <span class="followup-badge followup-${followUp.key}">${esc(followUp.label)}</span>
        </div>
      </div>
      <button id="closedetail" aria-label="Cerrar seguimiento">×</button>
    </div>
    <div class="drawerbody">
      <div class="drawer-status-strip">
        <span>Responsable: <b>${esc(leadOwner(l))}</b></span>
        <span class="badge ${l.pid?'green':''}">${l.pid?'Expediente vinculado':'Contacto nuevo'}</span>
      </div>

      <div class="drawer-metrics-grid" aria-label="Control de tiempos de etapa">
        <div>
          <small>Entrada a etapa</small>
          <b id="detail-stage-entered">${esc(enteredAt)}</b>
        </div>
        <div>
          <small>Tiempo en etapa</small>
          <b id="detail-days-stage">${followUp.daysInStage} ${followUp.daysInStage===1?'día':'días'}${followUp.maxDays!==null?` (máx ${followUp.maxDays}d)`:''}</b>
        </div>
        <div>
          <small>Última actividad</small>
          <b id="detail-last-activity">${esc(l.lastActivityAt||enteredAt)}</b>
        </div>
        <div>
          <small>Umbral etapa</small>
          <b>${esc(stageObj?.name||'Etapa')}: ${followUp.maxDays!==null?`${followUp.maxDays} días`:'Sin límite'}</b>
        </div>
      </div>

      <div class="drawer-value-summary" aria-label="Valor estimado del servicio del prospecto">
        <div class="drawer-value-main">
          <small>${valInfo.label}</small>
          <b id="detail-service-value">${formattedValue(valInfo.amount)}</b>
        </div>
        <small id="detail-service-value-origin" class="field-hint crm-value-hint">${valInfo.originNote}</small>
      </div>

      <div class="detailsection">
        <h2>Etapa y próxima acción</h2>
        <form id="followupform" novalidate>
          <div class="field">
            <label for="leadstage">Etapa del prospecto</label>
            <select id="leadstage">${leadOptions(l.stage,true)}</select>
          </div>
          <div class="field" id="leadlossreason-wrap" ${l.stage===LOST_STAGE?'':'hidden'}>
            <label for="leadlossreason">Motivo de pérdida</label>
            <select id="leadlossreason">
              <option value="">Selecciona motivo de pérdida…</option>
              ${LOSS_REASONS.map(r=>`<option value="${esc(r)}" ${l.lossReason===r?'selected':''}>${esc(r)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="leadorigin">Canal de procedencia</label>
            <select id="leadorigin">
              ${origins.map(o=>`<option value="${o}" ${(l.origin||'WhatsApp')===o?'selected':''}>${o}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="leadowner">Responsable del seguimiento</label>
            <select id="leadowner">
              ${[...new Set([leadOwner(l),...OWNERS])].map(o=>`<option value="${esc(o)}" ${leadOwner(l)===o?'selected':''}>${esc(o)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="leadreason">Interés / Motivo de consulta</label>
            <input id="leadreason" value="${esc(l.reason)}" aria-describedby="crm-error">
          </div>
          <div class="field">
            <label for="leadvalue">${valInfo.label} (S/)</label>
            <input id="leadvalue" type="number" min="0" step="10" value="${esc(valInfo.amount)}" aria-describedby="leadvalue-hint crm-error">
            <small id="leadvalue-hint" class="field-hint crm-value-hint">${valInfo.originNote}</small>
          </div>
          <div class="field">
            <label for="nextaction">Próxima acción comercial</label>
            <input id="nextaction" value="${esc(l.nextAction||'')}" aria-describedby="crm-error" placeholder="Por ejemplo: coordinar cita por teléfono">
          </div>
          <div class="field">
            <label for="nextdate">Fecha programada</label>
            <input type="date" id="nextdate" value="${esc(l.nextDate||'')}" aria-describedby="crm-error">
          </div>
          <div id="crm-error" class="error" role="alert"></div>
          <button class="primary" type="submit" style="width:100%;margin-top:12px">Guardar cambios del prospecto</button>
        </form>
      </div>

      ${a?`
        <div class="detailsection linked-app-section">
          <h2>📅 Cita vinculada en Agenda</h2>
          <div class="linked-app-card">
            <p><b>${a.date} · ${a.time}</b> (30 min)</p>
            <p>${esc(a.service)} · ${esc(a.doctor)}</p>
            <p>Atención: <span class="badge ${a.status==='Atendida'?'green':a.status==='Cancelada'?'red':a.status==='Llegó'?'gold':'blue'}">${esc(a.status)}</span> · Pago: <span class="badge ${a.paid?'green':''}">${a.paid?'Pagado':'Pendiente'}</span></p>
            ${a.status==='Cancelada'&&a.cancelReason?`<p><small>Motivo de cancelación: ${esc(a.cancelReason)}</small></p>`:''}
          </div>
        </div>
      `:''}

      <div class="detailsection">
        <h2>Conversación de muestra</h2>
        <span class="badge">Canal: ${esc(l.origin || 'Contacto')} · Simulación sin envío</span>
        ${(l.messages && l.messages.length) ? l.messages.map(m=>`
          <div class="bubble ${m.side==='out'?'outgoing':''}">${esc(m.text)}</div>
        `).join('') : `
          <div class="bubble">Hola, quisiera consultar disponibilidad y costo para una evaluación oftalmológica.</div>
          <div class="bubble outgoing">¡Hola! Con gusto. Contamos con turnos disponibles en nuestra sede principal con la Dra. Valeria Ríos y el Dr. Diego Ramírez.</div>
          <div class="bubble">Me interesa para esta semana por la mañana.</div>
        `}
        <p class="smallcopy">Mensajes de demostración del canal ${esc(l.origin || 'de contacto')}. Prototipo en memoria sin envío real de mensajes.</p>
      </div>

      <div class="detailsection">
        <h2>Bitácora de actividades</h2>
        <div class="activitylist">
          ${l.activities?.length?[...l.activities].reverse().map(x=>`<p><b>${esc(x.action||x.text)}</b>${x.action&&x.action!==x.text?`<br>${esc(x.text)}`:''}<small>${esc(x.at)} · Origen: ${esc(x.module||'CRM')}${x.fromStage&&x.toStage?` · ${esc(x.fromStage)} → ${esc(x.toStage)}`:''}${x.simulated?' · Acción simulada (sin envío externo)':''}</small></p>`).join(''):'<p>Sin actividades registradas.</p>'}
        </div>
        <form id="activityform" novalidate style="margin-top:14px">
          <div class="field">
            <label for="activitytext">Agregar nota o registro de llamada</label>
            <input id="activitytext" placeholder="Ej: Llamada atendida, paciente confirma interés en consulta…" aria-describedby="activityerror">
          </div>
          <div id="activityerror" class="error" role="alert"></div>
          <button type="submit">Añadir nota</button>
        </form>
      </div>
    </div>

    <div class="drawerfooter">
      ${!l.pid?`
        <button id="convertandbook" class="primary" style="width:100%">
          ＋ Crear ficha de paciente y agendar
        </button>
        <button id="linkexisting" class="linkbutton" style="width:100%;margin-top:8px">
          Vincular a paciente existente
        </button>
      `: a && a.status!=='Cancelada'?`
        <button id="booklead" class="primary" style="width:100%">
          Cita ya vinculada (Abrir agenda)
        </button>
        <button id="viewpatientrecord" class="linkbutton" style="width:100%;margin-top:8px">
          Ver ficha completa del paciente →
        </button>
      `:`
        <button id="booklead" class="primary" style="width:100%" ${p?.active===false?'disabled':''}>
          📅 Agendar cita para ${esc(p?.name||'el paciente')}
        </button>
        <button id="viewpatientrecord" class="linkbutton" style="width:100%;margin-top:8px">
          Ver ficha completa del paciente →
        </button>
      `}
      ${l.stage !== convertedColumn ? `
        <button id="markasconverted" class="linkbutton" style="width:100%;margin-top:8px;color:var(--forest);font-weight:600">
          ✓ Marcar como Convertido
        </button>
      ` : ''}
      ${p?.active===false?'<p class="error" style="margin-top:8px">Paciente desactivado en la clínica. Reactívalo desde su ficha para agendar.</p>':''}
    </div>
  `;

  $('#closedetail').onclick=()=>{
    closeLeadDetail(l.id);
  };

  $('#leadstage').onchange=e=>{
    const wrap=$('#leadlossreason-wrap');
    if(wrap)wrap.hidden=Number(e.target.value)!==LOST_STAGE;
  };

  $('#followupform').onsubmit=e=>{
    e.preventDefault();
    const stage=Number($('#leadstage').value);
    const origin=$('#leadorigin').value;
    const owner=$('#leadowner').value||leadOwner(l);
    const reason=$('#leadreason').value.trim();
    const estimatedValue=Number($('#leadvalue').value);
    const nextAction=$('#nextaction').value.trim();
    const nextDate=$('#nextdate').value;
    const lossReason=$('#leadlossreason')?$('#leadlossreason').value:'';

    if(!reason)return feedback('Indica el motivo o interés del prospecto.','leadreason');
    if(!Number.isFinite(estimatedValue)||estimatedValue<0)return feedback('Indica un valor estimado válido.','leadvalue');
    if(stage===bookedColumn&&stage!==l.stage&&(!a||a.status==='Cancelada')){
      return feedback('Para mover a "Cita agendada", agenda primero la cita desde el botón inferior.','leadstage');
    }
    if(stage===LOST_STAGE&&!lossReason){
      return feedback('Selecciona un motivo de pérdida para registrar la salida del embudo.','leadlossreason');
    }
    if(Boolean(nextAction)!==Boolean(nextDate)){
      return feedback('Completa la próxima acción y su fecha, o deja ambos campos vacíos.',!nextAction?'nextaction':'nextdate');
    }

    const changed=stage!==l.stage;
    Object.assign(l,{origin,owner,reason,estimatedValue,nextAction,nextDate,lossReason:stage===LOST_STAGE?lossReason:''});
    if(changed){
      applyStageTransition(l,stage,{sourceModule:'CRM (Edición manual)'});
    }else{
      activity(l,'Seguimiento actualizado sin cambio de etapa.',timestamp(),{
        action:'Edición de seguimiento sin cambio de etapa',
        module:'CRM',
        fromStage:columns.find(c=>c.id===l.stage)?.name||null,
        toStage:columns.find(c=>c.id===l.stage)?.name||null,
        simulated:false
      });
    }
    draw();
    api.toast('Prospecto actualizado en el CRM.');
  };

  $('#activityform').onsubmit=e=>{
    e.preventDefault();
    const text=$('#activitytext').value.trim();
    if(text.length<4){
      $('#activityerror').textContent='Describe la actividad con al menos 4 caracteres.';
      $('#activitytext').focus();
      return;
    }
    activity(l,text);
    draw();
    api.toast('Actividad agregada.');
  };

  if($('#convertandbook')){
    $('#convertandbook').onclick=()=>{
      convertAndBook(l);
    };
  }

  if($('#linkexisting')){
    $('#linkexisting').onclick=()=>{
      linkPatient(l);
    };
  }

  if($('#booklead')){
    $('#booklead').onclick=()=>{
      if(a && a.status!=='Cancelada'){
        location.hash='#agenda';
        return;
      }
      book(l);
    };
  }

  if($('#viewpatientrecord')){
    $('#viewpatientrecord').onclick=()=>{
      if(l.pid && api.openPatient){
        api.openPatient(l.pid);
      }
    };
  }

  if($('#markasconverted')){
    $('#markasconverted').onclick=()=>{
      const convStage = columns.find(c=>c.id===convertedColumn);
      applyStageTransition(l, convStage ? convStage.id : convertedColumn, {
        sourceModule: 'CRM',
        actionLabel: 'Prospecto marcado explícitamente como Convertido.'
      });
      draw();
      api.toast('Prospecto trasladado a etapa Convertido.');
    };
  }
}

function convertAndBook(l){
  modal('Crear ficha de paciente', `
    <p>Registra al prospecto <b>${esc(l.name)}</b> en el directorio de pacientes para poder agendar su cita oftalmológica.</p>
    <div class="note" style="margin:16px 0">
      Se completarán los datos iniciales con la información del CRM. Podrás complementar DNI y seguro.
    </div>
  `, `<button id="done">Cancelar</button><button id="proceedconvert" class="primary">Crear ficha de paciente</button>`);

  $('#proceedconvert').onclick=()=>{
    api.register({name:l.name, phone:l.phone}, p=>{
      l.pid=p.id;
      activity(l,`Ficha de paciente creada: ${p.name} (DNI ${p.doc}).`,timestamp(),{action:'Registro de paciente',module:'Pacientes'});
      api.toast('Ficha de paciente creada. Abriendo reserva de cita...');
      book(l);
    });
  };
}

function book(l){
  api.book(l.pid,a=>{
    l.appointmentId=a.id;
    l.estimatedValue=Number(a.amount)||l.estimatedValue;
    l.nextAction='Asistir a la cita programada';
    l.nextDate=a.date||l.nextDate;
    const bookedId=resolveValidStageId(bookedColumn,'cita_agendada');
    const destination=bookedId?columns.find(c=>c.id===bookedId):null;
    if(destination){
      if(l.stage!==destination.id){
        applyStageTransition(l,destination.id,{
          sourceModule:'Agenda',
          action:'Cita médica agendada',
          actionLabel:`Cita médica agendada: ${a.date} a las ${a.time} (${a.doctor}).`
        });
      }else{
        activity(l,`Cita médica agendada: ${a.date} a las ${a.time} (${a.doctor}).`,timestamp(),{
          action:'Cita médica agendada',
          module:'Agenda',
          fromStage:destination.name,
          toStage:destination.name,
          simulated:false
        });
      }
    }
    draw();
    api.toast(destination?`Cita agendada y seguimiento actualizado a ${destination.name}.`:'Cita médica registrada en Agenda.');
  });
}

function newLead(){
  modal('Nuevo prospecto para CRM', `
    <form id="newleadform" novalidate>
      <div class="field">
        <label for="contacttype">Tipo de prospecto</label>
        <select id="contacttype">
          <option value="contact">Contacto nuevo (sin ficha en clínica)</option>
          <option value="patient">Paciente existente</option>
        </select>
      </div>
      <div class="field">
        <label for="leadchannel">Canal de procedencia</label>
        <select id="leadchannel">
          ${origins.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
      <div id="contactfields">
        <div class="field">
          <label for="contactname">Nombres y apellidos</label>
          <input id="contactname" aria-describedby="crm-error" placeholder="Ej: Andrea Salazar">
        </div>
        <div class="field">
          <label for="contactphone">Teléfono celular · 9 dígitos</label>
          <input type="tel" id="contactphone" aria-describedby="crm-error" placeholder="900 000 000">
        </div>
      </div>
      <div class="field" id="existingfield" hidden>
        <label for="existingpatient">Seleccionar paciente</label>
        <select id="existingpatient">
          ${api.patients.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${esc(p.name)} · DNI ${p.doc}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="newreason">Interés clínico / Motivo</label>
        <input id="newreason" aria-describedby="crm-error" placeholder="Ej: Consulta general, LASIK, Cataratas...">
      </div>
      <div class="field">
        <label for="newvalue">${CRM_SERVICE_VALUE_LABEL} (S/)</label>
        <input id="newvalue" type="number" min="0" step="10" value="150" aria-describedby="newvalue-hint crm-error">
        <small id="newvalue-hint" class="field-hint crm-value-hint">${CRM_VALUE_ORIGIN_INITIAL}</small>
      </div>
      <div class="field">
        <label for="newowner">Responsable</label>
        <select id="newowner">
          ${OWNERS.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="initialstage">Etapa inicial</label>
        <select id="initialstage">
          ${columns.filter(c=>c.id!==bookedColumn).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div id="crm-error" class="error" role="alert"></div>
    </form>
  `, `<button id="done">Cancelar</button><button form="newleadform" class="primary" type="submit">Crear prospecto</button>`);

  $('#contacttype').onchange=e=>{
    const existing=e.target.value==='patient';
    $('#contactfields').hidden=existing;
    $('#existingfield').hidden=!existing;
  };

  $('#newleadform').onsubmit=e=>{
    e.preventDefault();
    const existing=$('#contacttype').value==='patient';
    const origin=$('#leadchannel').value;
    const reason=$('#newreason').value.trim();
    const estimatedValue=Number($('#newvalue').value);
    const contactName=$('#contactname').value.trim();
    const contactPhone=$('#contactphone').value.replace(/\s/g,'');
    const initialStage=Number($('#initialstage').value)||1;
    let pid=existing?Number($('#existingpatient').value):null;

    if(!existing&&contactName.length<3)return feedback('Escribe el nombre completo del contacto.','contactname');
    if(!existing&&!/^\d{9}$/.test(contactPhone))return feedback('Escribe un teléfono válido de 9 dígitos.','contactphone');
    if(existing&&!person({pid}))return feedback('Selecciona un paciente activo.','existingpatient');
    if(!reason)return feedback('Indica el interés clínico o motivo del contacto.','newreason');
    if(!Number.isFinite(estimatedValue)||estimatedValue<0)return feedback('Indica un valor estimado válido.','newvalue');

    if(!existing){
      const match=api.patients.find(p=>p.phone.replace(/\s/g,'')===contactPhone);
      if(match)return feedback('Este teléfono pertenece a un paciente ya registrado. Selecciona "Paciente existente".','contactphone');
    }

    const l={
      id:Math.max(0,...leads.map(l=>l.id))+1,
      pid,
      name:existing?person({pid}).name:contactName,
      phone:existing?person({pid}).phone:contactPhone,
      origin,
      owner:$('#newowner')?.value||'Recepción Sede',
      reason,
      estimatedValue,
      stage:initialStage,
      stageEnteredAt:today,
      lastActivityAt:timestamp(),
      nextAction:'Contactar para agendar',
      nextDate:today,
      activities:[{text:`Prospecto registrado vía ${origin}.`,at:timestamp(),action:'Alta de prospecto',module:'CRM',fromStage:null,toStage:columns.find(c=>c.id===initialStage)?.name||'Nuevo',simulated:false}]
    };

    leads.push(l);
    selected=l.id;
    $('#modal').close();
    query='';
    stageFilter='all';
    originFilter='all';
    followUpFilter='all';
    draw();
    api.toast('Prospecto ingresado al CRM con éxito.');
  };
}

function linkPatient(l){
  modal('Vincular a paciente existente', `
    <p>Vincular a <b>${esc(l.name)}</b> (${esc(l.phone)}) con una ficha médica ya registrada.</p>
    <div class="field" style="margin:16px 0">
      <label for="linkpatient">Paciente registrado</label>
      <select id="linkpatient">
        ${api.patients.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${esc(p.name)} · DNI ${p.doc}</option>`).join('')}
      </select>
    </div>
  `, `<button id="done">Volver</button><button id="confirmlink" class="primary">Confirmar vínculo</button>`);

  $('#confirmlink').onclick=()=>{
    const p=api.patients.find(p=>p.id===Number($('#linkpatient').value));
    if(!p)return;
    l.pid=p.id;
    activity(l,`Vinculado a la ficha de ${p.name} (DNI ${p.doc}).`);
    $('#modal').close();
    draw();
    api.toast('Prospecto vinculado como paciente.');
  };
}

function manageColumns(){
  modal('Configurar etapas del embudo CRM', `
    <p>Personaliza las columnas del embudo. Puedes reordenar, cambiar colores, renombrar o añadir nuevas etapas.</p>
    <div class="columnsettings">
      ${columns.map((c,i)=>{
        const protectedStage=isEssentialColumn(c);
        return `
        <div class="columnsetting" data-column-id="${c.id}">
          <span class="columnsetting-main">
            <span class="dot" style="display:inline-block;background:${c.color}"></span>
            <b>${esc(c.name)}</b>
            ${c.id===bookedColumn?'<small class="badge green">Destino de citas agendadas</small>':''}
          </span>
          <div class="columnsetting-actions">
            <button data-move="${c.id}" data-dir="-1" ${i===0?'disabled':''} aria-label="Mover a la izquierda">←</button>
            <button data-move="${c.id}" data-dir="1" ${i===columns.length-1?'disabled':''} aria-label="Mover a la derecha">→</button>
            <button data-editcolumn="${c.id}">Editar</button>
            <button data-removecolumn="${c.id}" class="danger" ${protectedStage||columns.length<2?'disabled aria-disabled="true"':''} title="${protectedStage?PROTECTED_STAGE_NOTICE:''}">Retirar</button>
          </div>
          ${protectedStage?`<small class="columnsetting-lock">${PROTECTED_STAGE_NOTICE}</small>`:''}
        </div>
      `;
      }).join('')}
    </div>
  `, `<button id="done">Cerrar</button><button id="addcolumn" class="primary">＋ Nueva etapa</button>`);

  $('#addcolumn').onclick=()=>editColumn();
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{
    const i=columns.findIndex(c=>c.id===Number(b.dataset.move)),j=i+Number(b.dataset.dir);
    if(j<0||j>=columns.length)return;
    [columns[i],columns[j]]=[columns[j],columns[i]];
    draw();
    manageColumns();
  });
  document.querySelectorAll('[data-editcolumn]').forEach(b=>b.onclick=()=>editColumn(Number(b.dataset.editcolumn)));
  document.querySelectorAll('[data-removecolumn]').forEach(b=>b.onclick=()=>removeColumn(Number(b.dataset.removecolumn)));
}

function editColumn(id){
  const c=columns.find(c=>c.id===id);
  modal(c?'Editar etapa':'Nueva etapa de embudo', `
    <form id="columnform" novalidate>
      <div class="field">
        <label for="columnname">Nombre de la etapa</label>
        <input id="columnname" value="${esc(c?.name||'')}" aria-describedby="crm-error">
      </div>
      <div class="field">
        <label for="columnhelper">Descripción / Objetivo</label>
        <input id="columnhelper" value="${esc(c?.helper||'')}" aria-describedby="crm-error" placeholder="Ej: Contacto interesado en cita">
      </div>
      <div class="field">
        <label for="columncolor">Color identificador</label>
        <input type="color" id="columncolor" value="${c?.color||'#3e95d3'}">
      </div>
      <div id="crm-error" class="error" role="alert"></div>
    </form>
  `, `<button id="done">Cancelar</button><button class="primary" form="columnform" type="submit">Guardar etapa</button>`);

  $('#columnform').onsubmit=e=>{
    e.preventDefault();
    const title=$('#columnname').value.trim();
    const helper=$('#columnhelper').value.trim();
    const color=$('#columncolor').value;

    if(!title||title.length>40)return feedback('Escribe un nombre de 1 a 40 caracteres.','columnname');
    if(columns.some(x=>x.id!==id&&x.name.toLowerCase()===title.toLowerCase())){
      return feedback('Ya existe una etapa con este nombre.','columnname');
    }

    if(c){
      c.name=title;
      c.helper=helper;
      c.color=color;
    }else{
      columns.push({id:Math.max(...columns.map(x=>x.id))+1,name:title,helper,color});
    }

    draw();
    manageColumns();
    api.toast('Etapa guardada.');
  };
}

export function attemptRemoveColumn(id,targetId=null){
  const c=columns.find(x=>x.id===Number(id));
  if(!c)return {removed:false,reason:'La etapa indicada no existe.'};
  if(isEssentialColumn(c)){
    return {removed:false,reason:PROTECTED_STAGE_NOTICE};
  }
  if(columns.length<2){
    return {removed:false,reason:'Debe conservarse al menos una etapa en el tablero.'};
  }
  if(targetId===null||targetId==='')return {removed:false,requiresTarget:true,reason:'Selecciona una etapa de destino.'};
  const target=columns.find(x=>x.id===Number(targetId)&&x.id!==c.id);
  if(!target)return {removed:false,reason:'Selecciona una etapa de destino válida.'};
  const items=leads.filter(l=>l.stage===c.id);
  items.forEach(l=>{
    activity(l,`Etapa retirada: ${c.name} → ${target.name}`);
    l.stage=target.id;
  });
  columns=columns.filter(x=>x.id!==c.id);
  if(stageFilter===String(c.id))stageFilter='all';
  return {removed:true,movedCount:items.length,targetId:target.id};
}

function removeColumn(id){
  const c=columns.find(c=>c.id===id);
  if(!c)return false;
  if(isEssentialColumn(c)){
    api?.toast?.(PROTECTED_STAGE_NOTICE);
    return false;
  }
  const items=leads.filter(l=>l.stage===id);
  const destinations=columns.filter(x=>x.id!==id);

  modal('Retirar etapa del embudo', `
    <h2>${esc(c.name)}</h2>
    <p style="margin:15px 0">
      Hay ${items.length} prospecto(s) en esta etapa. Selecciona a qué columna deseas trasladarlos antes de retirarla.
    </p>
    <form id="removeform" novalidate>
      <div class="field">
        <label for="destination">Trasladar prospectos a:</label>
        <select id="destination" aria-describedby="crm-error">
          <option value="">Selecciona etapa de destino…</option>
          ${destinations.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}
        </select>
      </div>
      <div id="crm-error" class="error" role="alert"></div>
    </form>
  `, `<button id="done" autofocus>Conservar etapa</button><button class="danger" form="removeform" type="submit">Retirar y trasladar</button>`);

  $('#done').focus();
  $('#removeform').onsubmit=e=>{
    e.preventDefault();
    const res=attemptRemoveColumn(id,$('#destination').value);
    if(!res.removed)return feedback(res.reason,'destination');
    draw();
    manageColumns();
    api.toast('Etapa retirada y prospectos trasladados.');
  };
  return true;
}

export function renderInbox(options){
  api=options;
  syncAppointments();
  const hashParts=location.hash.slice(1).split('/');
  if(hashParts[0]==='inbox'&&hashParts[1]){
    const lid=Number(hashParts[1]);
    if(leads.some(l=>l.id===lid))inboxSelected=lid;
  }
  const visible=leads.filter(l=>{
    const haystack=`${name(l)} ${phone(l)} ${l.reason} ${l.origin}`.toLowerCase();
    const heat=leadHeat(l);
    return (inboxChannel==='all'||l.origin===inboxChannel)&&(inboxHeat==='all'||heat.key===inboxHeat)&&haystack.includes(inboxQuery.toLowerCase());
  }).sort((a,b)=>leadHeat(b).score-leadHeat(a).score);
  let current=leads.find(l=>l.id===inboxSelected);
  if(!current||!visible.includes(current))current=visible[0]||null;
  if(current){inboxSelected=current.id;current.unread=0;}
  $('#view').innerHTML=`
    <div class="inbox-note"><b>Inbox omnicanal de demostración.</b> Conversaciones simuladas por canal de procedencia (${origins.slice(0,4).join(', ')}). Los mensajes se guardan solo durante esta sesión.</div>
    <div class="inbox-toolbar">
      <div class="searchbox"><input id="inboxsearch" aria-label="Buscar conversación" placeholder="Buscar contacto o motivo…" value="${esc(inboxQuery)}"></div>
      <select id="inboxchannel" aria-label="Filtrar conversaciones por canal"><option value="all">Todos los canales</option>${origins.map(o=>`<option value="${o}" ${inboxChannel===o?'selected':''}>${o}</option>`).join('')}</select>
      <select id="inboxheat" aria-label="Filtrar conversaciones por prioridad comercial"><option value="all">Todas las prioridades</option><option value="hot" ${inboxHeat==='hot'?'selected':''}>Calientes · cerca de agendar</option><option value="warm" ${inboxHeat==='warm'?'selected':''}>Tibias · interés activo</option><option value="cold" ${inboxHeat==='cold'?'selected':''}>Frías · contacto inicial</option><option value="converted" ${inboxHeat==='converted'?'selected':''}>Convertidas</option></select>
    </div>
    <div class="inbox-layout">
      <aside class="inbox-list" aria-label="Conversaciones">
        <div class="inbox-list-head"><b>Conversaciones</b><span>${visible.length}</span></div>
        ${visible.map(l=>{const last=l.messages?.at(-1),heat=leadHeat(l);return `<button class="inbox-conversation ${l.id===current?.id?'active':''}" data-inbox-lead="${l.id}"><span class="avatar">${initials(name(l))}</span><span class="inbox-preview"><span><b>${esc(name(l))}</b><small>${esc(last?.at||'')}</small></span><em>${esc(last?.text||'Sin mensajes todavía')}</em><span>${originBadge(l.origin)}<span class="heat-badge heat-${heat.key}">${heat.icon} ${heat.label}</span>${l.unread?`<i>${l.unread}</i>`:''}</span></span></button>`;}).join('')||'<p class="columnempty">No hay conversaciones con este filtro.</p>'}
      </aside>
      <section class="inbox-thread" aria-live="polite">
        ${current?`<header><div><h2>${esc(name(current))}</h2><p>${esc(current.reason)} · ${esc(phone(current))}</p></div>${originBadge(current.origin)}</header><div class="inbox-messages">${(current.messages||[]).map(m=>`<div class="inbox-message ${m.side==='out'?'outgoing':''}"><p>${esc(m.text)}</p><small>${esc(m.at)}</small></div>`).join('')||'<div class="inbox-empty">Aún no hay mensajes en esta conversación.</div>'}</div><form id="inboxreply" class="inbox-composer" novalidate><label class="sr-only" for="inboxtext">Escribir respuesta simulada</label><textarea id="inboxtext" class="resize-none" rows="2" placeholder="Escribe una respuesta de demostración para ${esc(current.origin)}…"></textarea><button class="primary" type="submit">Enviar</button></form>`:'<div class="inbox-empty">Selecciona una conversación para verla.</div>'}
      </section>
      <aside class="inbox-context">${current?`<span class="eyebrow">CONTEXTO DEL CONTACTO</span><h2>${esc(name(current))}</h2><p>${esc(current.reason)}</p><div class="heat-summary heat-${leadHeat(current).key}"><b>${leadHeat(current).icon} ${leadHeat(current).label}</b><small>Prioridad calculada por etapa, cita, seguimiento y actividad.</small></div><dl><div><dt>Etapa</dt><dd>${esc(columns.find(c=>c.id===current.stage)?.name||'Sin etapa')}</dd></div><div><dt>Próxima acción</dt><dd>${esc(current.nextAction||'Por definir')}</dd></div><div><dt>Fecha</dt><dd>${esc(current.nextDate||'Sin fecha')}</dd></div><div><dt>Última actividad</dt><dd id="inbox-last-activity">${esc(current.lastActivityAt||'Sin actividad')}</dd></div><div><dt>Estado de conversación</dt><dd>${esc(current.conversationState||'Atención comercial')}</dd></div></dl><div style="display:grid;gap:8px"><a class="linkbutton" href="#crm/${current.id}">Abrir en CRM →</a><button type="button" id="inbox-confirm-interest" ${current.stage===3||isTerminalStage(current.stage)?'disabled':''}>✓ Confirmar interés</button></div><section class="inbox-scenarios" aria-labelledby="scenario-title"><span class="agenda-kicker">SIMULADOR GUIADO</span><h3 id="scenario-title">Probar escenario</h3><p>Respuestas predefinidas. No se conecta con IA ni canales externos.</p><div><button data-inbox-scenario="appointment" ${current.pid?'':'disabled'}>Agendar cita</button><button data-inbox-scenario="commercial">Consulta comercial</button><button class="warning" data-inbox-scenario="escalation">Derivación humana</button></div>${current.pid?'':'<small>Primero vincula este contacto con un paciente para reservar.</small>'}</section>`:''}</aside>
    </div>`;
  $('#inboxsearch').oninput=e=>{inboxQuery=e.target.value;renderInbox(options);};
  $('#inboxchannel').onchange=e=>{inboxChannel=e.target.value;renderInbox(options);};
  $('#inboxheat').onchange=e=>{inboxHeat=e.target.value;renderInbox(options);};
  const messageList=$('.inbox-messages');
  if(messageList)messageList.scrollTop=messageList.scrollHeight;
  document.querySelectorAll('[data-inbox-lead]').forEach(b=>b.onclick=()=>{
    inboxSelected=Number(b.dataset.inboxLead);
    location.hash='#inbox/'+inboxSelected;
    renderInbox(options);
  });
  if(current&&$('#inbox-confirm-interest'))$('#inbox-confirm-interest').onclick=()=>{
    if(current.stage===3||isTerminalStage(current.stage))return;
    applyStageTransition(current,3,{
      sourceModule:'Inbox',
      action:'Interés confirmado en Inbox',
      actionLabel:'Interés del prospecto confirmado desde Inbox.'
    });
    current.nextAction='Coordinar cita con Recepción';
    current.nextDate=today;
    current.conversationState='Interés confirmado';
    renderInbox(options);
    api.toast('Oportunidad movida a Interés confirmado.');
  };
  if(current&&$('#inboxreply'))$('#inboxreply').onsubmit=e=>{
    e.preventDefault();
    const text=$('#inboxtext').value.trim();
    if(!text)return;
    const hhmm=new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(new Date());
    const stageName=columns.find(c=>c.id===current.stage)?.name||'Sin etapa';
    (current.messages??=[]).push({side:'out',text,at:`${hhmm} · simulado`});
    activity(current,`Respuesta registrada en ${current.origin} (simulación).`,`${today} ${hhmm}`,{
      action:`Respuesta enviada en ${current.origin}`,
      module:'Inbox',
      fromStage:stageName,
      toStage:stageName,
      simulated:true
    });
    renderInbox(options);
    api.toast('Respuesta agregada a la conversación simulada.');
  };
  if(current)document.querySelectorAll('[data-inbox-scenario]').forEach(button=>button.onclick=()=>runInboxScenario(button.dataset.inboxScenario,current,options));
}

function runInboxScenario(type,lead,options){
  const currentStageName=columns.find(item=>item.id===lead.stage)?.name||'Sin etapa';
  if(type==='appointment'){
    if(!lead.pid)return options.toast('Vincula el contacto con un paciente antes de reservar.');
    if(!isAgentActive('receptionist')){
      recordARMEvent('receptionist','Acción bloqueada',`No se inició la reserva para ${name(lead)} porque el agente está pausado.`,'warning');
      return options.toast('Recepcionista virtual pausado. Reactívalo desde Centro ARM.');
    }
    (lead.messages??=[]).push({side:'out',text:'Puedo ayudarte a reservar. Seleccionemos un profesional y un horario disponible.',at:'Ahora · simulado'});
    lead.conversationState='Atendida por agente simulado';
    activity(lead,'Escenario de reserva iniciado por Recepcionista virtual.',timestamp(),{
      action:'Reserva asistida iniciada',
      module:'Inbox',
      fromStage:currentStageName,
      toStage:currentStageName,
      simulated:true
    });
    recordARMEvent('receptionist','Reserva iniciada',`Se solicitaron opciones de horario para ${name(lead)}.`,'info');
    renderInbox(options);
    options.book(lead.pid,saved=>{
      const bookedId=resolveValidStageId(bookedColumn,'cita_agendada');
      const bookedCol=bookedId?columns.find(c=>c.id===bookedId):null;
      const previous=columns.find(item=>item.id===lead.stage)?.name||'Sin etapa';
      lead.appointmentId=saved.id;
      lead.estimatedValue=Number(saved.amount)||lead.estimatedValue;
      lead.nextAction='Asistir a la cita programada';
      lead.nextDate=saved.date;
      lead.conversationState='Cita confirmada en demostración';
      if(bookedCol&&lead.stage!==bookedCol.id){
        lead.stage=bookedCol.id;
        lead.stageEnteredAt=today;
      }
      (lead.messages??=[]).push({side:'out',text:`Tu cita quedó registrada para el ${saved.date} a las ${saved.time} con ${saved.doctor}.`,at:'Ahora · simulado'});
      activity(lead,`Cita agendada desde Inbox: ${saved.date} a las ${saved.time}.`,timestamp(),{
        action:'Reserva guardada desde Inbox',
        module:'Inbox',
        fromStage:previous,
        toStage:bookedCol?.name||previous,
        simulated:true
      });
      recordARMEvent('receptionist','Cita registrada',`${name(lead)} · ${saved.date} ${saved.time} · ${saved.doctor}.`,'success');
      location.hash=`#inbox/${lead.id}`;
      renderInbox(options);
      options.toast('Cita creada y sincronizada con CRM y Agenda.');
    });
    return;
  }
  if(type==='commercial'){
    if(!isAgentActive('commercial')){
      recordARMEvent('commercial','Acción bloqueada',`No se atendió la consulta comercial de ${name(lead)} porque el agente está pausado.`,'warning');
      return options.toast('Asesor comercial pausado. Reactívalo desde Centro ARM.');
    }
    const targetStage=columns.find(item=>item.key==='interesado')?.id||3;
    const targetName=columns.find(item=>item.id===targetStage)?.name||'Interés confirmado';
    (lead.messages??=[]).push({side:'in',text:'¿Qué incluye la evaluación oftalmológica?',at:'Ahora'},{side:'out',text:'La demostración registra tu interés y deriva la explicación del servicio al equipo de la clínica. No realiza recomendaciones médicas.',at:'Ahora · simulado'});
    lead.nextAction='Coordinar evaluación con Recepción';
    lead.nextDate=today;
    lead.conversationState='Interés comercial registrado';
    if(lead.stage!==targetStage){
      applyStageTransition(lead,targetStage,{
        sourceModule:'Inbox',
        action:'Consulta comercial atendida (interés confirmado)',
        actionLabel:'Consulta comercial atendida con información predefinida.',
        simulated:true
      });
    }else{
      activity(lead,'Consulta comercial atendida con información predefinida.',timestamp(),{
        action:'Consulta comercial atendida',
        module:'Inbox',
        fromStage:currentStageName,
        toStage:targetName,
        simulated:true
      });
    }
    recordARMEvent('commercial','Consulta comercial atendida',`${name(lead)} pasó a interés activo sin recomendación clínica.`,'success');
    renderInbox(options);
    options.toast('Escenario comercial registrado en CRM.');
    return;
  }
  if(type==='escalation'){
    if(!isAgentActive('receptionist')){
      recordARMEvent('receptionist','Acción bloqueada',`La conversación de ${name(lead)} requiere intervención humana; el agente está pausado.`,'warning');
      return options.toast('Agente pausado. La conversación queda pendiente de atención humana.');
    }
    (lead.messages??=[]).push({side:'in',text:'Tengo una pérdida súbita de visión y dolor ocular intenso.',at:'Ahora'},{side:'out',text:'Este canal de demostración no evalúa síntomas. Detengo el flujo y derivo la conversación al personal de la clínica para atención humana inmediata.',at:'Ahora · simulado'});
    lead.conversationState='Derivada a atención humana';
    lead.nextAction='Atención humana prioritaria';
    lead.nextDate=today;
    lead.unread=1;
    activity(lead,'Escenario sensible predefinido: flujo automático detenido y derivado.',timestamp(),{
      action:'Derivación prioritaria a personal humano',
      module:'Inbox',
      fromStage:currentStageName,
      toStage:currentStageName,
      simulated:true
    });
    recordARMEvent('receptionist','Flujo automático detenido',`${name(lead)} fue derivado sin emitir diagnóstico ni recomendación.`,'warning');
    recordARMEvent('supervisor','Derivación prioritaria registrada',`Revisión humana requerida para la conversación de ${name(lead)}.`,'warning');
    renderInbox(options);
    options.toast('Conversación derivada a atención humana.');
  }
}

