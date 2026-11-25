import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchBrowser} from '../tests/cdp.mjs';

const root=path.resolve('.');
const outDir=path.join(root,'output','demo-video');
const framesDir=path.join(outDir,'frames');
fs.rmSync(framesDir,{recursive:true,force:true});
fs.mkdirSync(framesDir,{recursive:true});

const appUrl=pathToFileURL(path.join(root,'app','index.html')).href;
const browser=await launchBrowser({width:1440,height:900});
const scenes=[];

async function login(){
  await browser.goto(appUrl);
  await browser.click('[data-auth-email="admin@clinicaoftalmo.pe"]');
  await browser.click('#auth-email-form button[type="submit"]');
  await browser.click('#autofill-otp');
  await browser.click('#auth-otp-form button[type="submit"]');
  await browser.wait(180);
}

async function caption(title,subtitle=''){
  await browser.eval(`(() => {
    document.getElementById('demo-video-caption')?.remove();
    const notice=document.getElementById('notice');if(notice)notice.textContent='';
    const el=document.createElement('div');
    el.id='demo-video-caption';
    el.innerHTML='<strong>'+${JSON.stringify(title)}+'</strong><span>'+${JSON.stringify(subtitle)}+'</span>';
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'28px',transform:'translateX(-50%)',zIndex:'9999',display:'flex',flexDirection:'column',gap:'4px',width:'min(760px,calc(100vw - 56px))',padding:'15px 20px',border:'1px solid rgba(255,255,255,.2)',borderRadius:'14px',background:'rgba(13,47,37,.94)',boxShadow:'0 16px 45px rgba(0,0,0,.28)',color:'#fff',fontFamily:'Inter,Arial,sans-serif',textAlign:'left',pointerEvents:'none'});
    el.querySelector('strong').style.cssText='font-size:18px;letter-spacing:-.01em';
    el.querySelector('span').style.cssText='font-size:12px;color:#d9ebe2';
    document.body.append(el);
  })()`);
  await browser.wait(120);
}

async function capture(title,subtitle=''){
  await caption(title,subtitle);
  const result=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  const file=`frame-${String(scenes.length+1).padStart(2,'0')}.png`;
  fs.writeFileSync(path.join(framesDir,file),Buffer.from(result.data,'base64'));
  scenes.push({file,title,subtitle});
}

async function setHash(hash){
  await browser.eval(`location.hash=${JSON.stringify(hash)}`);
  await browser.wait(170);
}

try{
  await browser.setViewport(1440,900);
  await login();

  await setHash('#crm');
  await capture('1 · El prospecto entra al CRM','Luis Pérez comienza en Nuevo, sin cita y con valor estimado visible.');

  await setHash('#crm/2');
  await browser.select('#leadstage','2');
  await browser.click('#followupform button[type="submit"]');
  await browser.wait(120);
  await setHash('#crm');
  await capture('2 · Recepción registra el primer contacto','La tarjeta pasa a Contactado y la prioridad cambia de Fría a Tibia.');

  await setHash('#inbox/2');
  await browser.click('[data-inbox-scenario="commercial"]');
  await browser.wait(150);
  await capture('3 · Inbox confirma el interés comercial','El mensaje es simulado, evita recomendaciones médicas y actualiza el CRM.');

  await browser.click('[data-inbox-scenario="appointment"]');
  await browser.eval(`(() => {const el=document.querySelector('#dateinput');el.value='2026-10-28';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await browser.select('#time','09:00');
  await browser.click('button[type="submit"][form="form"]');
  await browser.wait(180);
  await capture('4 · La cita queda reservada','Inbox confirma fecha, hora y profesional; la etapa cambia a Cita agendada.');

  await setHash('#crm/2');
  await capture('5 · CRM enlaza la cita con la oportunidad','El seguimiento conserva valor, prioridad, fecha y bitácora en una sola ficha.');

  await setHash('#agenda');
  const agendaDate=await browser.eval(`document.querySelector('.agenda-period-control strong')?.textContent||''`);
  if(!agendaDate.includes('28'))await browser.click('#next');
  await browser.wait(130);
  const bookedId=await browser.eval(`(() => {const button=[...document.querySelectorAll('[data-appointment]')].find(el=>el.closest('tr')?.innerText.includes('Luis Pérez Salazar')&&el.closest('tr')?.innerText.includes('09:00'));return button?.dataset.appointment||null})()`);
  if(!bookedId)throw new Error('No se encontró la cita recién creada de Luis Pérez.');
  await browser.click(`[data-appointment="${bookedId}"]`);
  await browser.wait(120);
  await capture('6 · Agenda muestra el seguimiento operativo','Recepción revisa profesional, servicio, duración, documento y estado.');

  await browser.click('.drawer-noshow');
  await browser.wait(100);
  await capture('7 · La inasistencia requiere confirmación','Como la cita aún no ocurrió en el reloj del demo, el avance temporal se declara explícitamente.');

  await browser.click('#confirmnoshow');
  await browser.wait(140);
  await capture('8 · La cita queda en No asistió','El historial usa la fecha del demo y deja pendiente la recuperación ARM de +10 minutos.');

  await browser.click('#done');
  await setHash('#crm');
  await browser.select('#crmfilter','8');
  await browser.wait(100);
  await capture('9 · La etapa No asistió permanece visible','La tarjeta no desaparece: conserva valor, cita y próxima acción pendiente.');

  await setHash('#arm');
  await capture('10 · ARM espera una ejecución explícita','El sistema todavía no ha enviado mensajes ni movido la tarjeta a Seguimiento.');

  await browser.click('[data-arm-recovery="2"]');
  await browser.wait(140);
  await capture('11 · Se simula el salto de diez minutos','ARM registra la acción, prepara el mensaje y crea la tarea de reagendamiento.');

  await setHash('#crm');
  await browser.select('#crmfilter','9');
  await browser.wait(100);
  await capture('12 · La oportunidad pasa a Seguimiento','El flujo termina con trazabilidad completa y sin integraciones externas reales.');

  const manifest={width:1440,height:900,sceneDurationMs:2200,transitionMs:350,scenes};
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(manifest,null,2));

  const frameData=scenes.map(scene=>({
    ...scene,
    src:'data:image/png;base64,'+fs.readFileSync(path.join(framesDir,scene.file)).toString('base64')
  }));
  const html=`<!doctype html><html><body style="margin:0;background:#0d2f25"><canvas id="c" width="1440" height="900"></canvas><script>
  const scenes=${JSON.stringify(frameData)};
  const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
  const images=[];
  async function load(){for(const scene of scenes){const img=new Image();img.src=scene.src;await img.decode();images.push(img)}}
  let recorder,chunks=[],done;
  async function startRecording(){
    await load();
    const stream=canvas.captureStream(30);
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm';
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5500000});
    chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();return mime;
  }
  async function renderScene(i){
    const hold=1850,fade=350,fps=30,frame=1000/fps;
    const started=performance.now();
    while(performance.now()-started<hold){ctx.drawImage(images[i],0,0,canvas.width,canvas.height);await new Promise(r=>setTimeout(r,frame))}
    if(i<images.length-1){const t0=performance.now();while(performance.now()-t0<fade){const p=Math.min(1,(performance.now()-t0)/fade);ctx.globalAlpha=1;ctx.drawImage(images[i],0,0,canvas.width,canvas.height);ctx.globalAlpha=p;ctx.drawImage(images[i+1],0,0,canvas.width,canvas.height);ctx.globalAlpha=1;await new Promise(r=>setTimeout(r,frame))}}
    return i;
  }
  async function finishRecording(){
    await new Promise(r=>setTimeout(r,250));recorder.stop();await done;
    const mime=recorder.mimeType;const blob=new Blob(chunks,{type:mime});const buffer=new Uint8Array(await blob.arrayBuffer());
    let binary='';const size=0x8000;for(let i=0;i<buffer.length;i+=size)binary+=String.fromCharCode(...buffer.subarray(i,i+size));
    return {mime,size:buffer.length,base64:btoa(binary)};
  }
  <\/script></body></html>`;
  const playerPath=path.join(outDir,'renderer.html');
  fs.writeFileSync(playerPath,html);
  await browser.goto(pathToFileURL(playerPath).href);
  await browser.eval('startRecording()');
  for(let i=0;i<scenes.length;i++)await browser.eval(`renderScene(${i})`);
  const rendered=await browser.eval('finishRecording()');
  const videoPath=path.join(outDir,'Clinica_Oftalmologica_Flujo_CRM_ARM.webm');
  fs.writeFileSync(videoPath,Buffer.from(rendered.base64,'base64'));
  console.log(JSON.stringify({videoPath,size:rendered.size,mime:rendered.mime,frames:scenes.length},null,2));
} finally {
  await browser.close();
}
