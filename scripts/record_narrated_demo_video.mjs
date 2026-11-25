import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../tests/cdp.mjs';

const root = path.resolve('.');
const outDir = path.join(root, 'output', 'demo-video');
const framesDir = path.join(outDir, 'frames');
const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
const audioPath = path.join(outDir, 'narracion-helena.mp3');
const rawVideoPath = path.join(outDir, 'Clinica_Oftalmologica_Flujo_CRM_ARM_narrado.webm');

if (!fs.existsSync(audioPath)) throw new Error('No se encontró la locución narracion-helena.mp3.');
for (const scene of manifest.scenes) {
  const framePath = path.join(framesDir, scene.file);
  if (!fs.existsSync(framePath)) throw new Error(`Falta el fotograma ${scene.file}.`);
}

const frameData = manifest.scenes.map(scene => ({
  ...scene,
  src: 'data:image/png;base64,' + fs.readFileSync(path.join(framesDir, scene.file)).toString('base64')
}));

const html = `<!doctype html><html><body style="margin:0;background:#0d2f25">
<canvas id="c" width="${manifest.width}" height="${manifest.height}"></canvas>
<audio id="voice" preload="auto" src="${pathToFileURL(audioPath).href}"></audio>
<script>
const scenes=${JSON.stringify(frameData)};
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const audio=document.getElementById('voice');
const images=[];
let recorder,chunks=[],done,audioContext,audioDestination,totalDurationMs,holdMs;

async function loadAssets(){
  for(const scene of scenes){const img=new Image();img.src=scene.src;await img.decode();images.push(img)}
  if(audio.readyState<1)await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',reject,{once:true})});
  const transitionMs=350,tailMs=650;
  totalDurationMs=Math.ceil(audio.duration*1000)+tailMs;
  holdMs=(totalDurationMs-(images.length-1)*transitionMs)/images.length;
  return {audioDuration:audio.duration,totalDurationMs,holdMs};
}

async function startRecording(){
  const meta=await loadAssets();
  ctx.drawImage(images[0],0,0,canvas.width,canvas.height);
  const canvasStream=canvas.captureStream(30);
  audioContext=new AudioContext();
  const source=audioContext.createMediaElementSource(audio);
  audioDestination=audioContext.createMediaStreamDestination();
  source.connect(audioDestination);
  const combined=new MediaStream([...canvasStream.getVideoTracks(),...audioDestination.stream.getAudioTracks()]);
  const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')?'video/webm;codecs=vp8,opus':'video/webm';
  recorder=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:5500000,audioBitsPerSecond:160000});
  chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  done=new Promise(resolve=>recorder.onstop=resolve);
  recorder.start();
  await audioContext.resume();
  await audio.play();
  return {...meta,mime,audioTracks:combined.getAudioTracks().length,videoTracks:combined.getVideoTracks().length};
}

async function renderScene(i){
  const transitionMs=350,fps=30,frame=1000/fps;
  const started=performance.now();
  while(performance.now()-started<holdMs){ctx.globalAlpha=1;ctx.drawImage(images[i],0,0,canvas.width,canvas.height);await new Promise(r=>setTimeout(r,frame))}
  if(i<images.length-1){const t0=performance.now();while(performance.now()-t0<transitionMs){const p=Math.min(1,(performance.now()-t0)/transitionMs);ctx.globalAlpha=1;ctx.drawImage(images[i],0,0,canvas.width,canvas.height);ctx.globalAlpha=p;ctx.drawImage(images[i+1],0,0,canvas.width,canvas.height);ctx.globalAlpha=1;await new Promise(r=>setTimeout(r,frame))}}
  return i;
}

async function finishRecording(){
  while(!audio.ended)await new Promise(r=>setTimeout(r,50));
  await new Promise(r=>setTimeout(r,600));
  recorder.stop();await done;
  await audioContext.close();
  const mime=recorder.mimeType,blob=new Blob(chunks,{type:mime}),buffer=new Uint8Array(await blob.arrayBuffer());
  let binary='';const size=0x8000;for(let i=0;i<buffer.length;i+=size)binary+=String.fromCharCode(...buffer.subarray(i,i+size));
  return {mime,size:buffer.length,base64:btoa(binary),totalDurationMs};
}
<\/script></body></html>`;

const rendererPath = path.join(outDir, 'renderer-narrated.html');
fs.writeFileSync(rendererPath, html);
const browser = await launchBrowser({ width: manifest.width, height: manifest.height });

try {
  await browser.goto(pathToFileURL(rendererPath).href);
  const started = await browser.eval('startRecording()');
  if (started.audioTracks !== 1 || started.videoTracks !== 1) {
    throw new Error(`Flujo multimedia incompleto: audio=${started.audioTracks}, video=${started.videoTracks}.`);
  }
  for (let i = 0; i < manifest.scenes.length; i++) await browser.eval(`renderScene(${i})`);
  const rendered = await browser.eval('finishRecording()');
  fs.writeFileSync(rawVideoPath, Buffer.from(rendered.base64, 'base64'));
  fs.writeFileSync(path.join(outDir, 'narrated-metadata.json'), JSON.stringify({
    ...started,
    renderedBytes: rendered.size,
    output: rawVideoPath
  }, null, 2));
  console.log(JSON.stringify({ rawVideoPath, ...started, size: rendered.size }, null, 2));
} finally {
  await browser.close();
}
