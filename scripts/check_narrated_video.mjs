import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../tests/cdp.mjs';

const videoPath = path.resolve('output/demo-video/Clinica_Oftalmologica_Flujo_CRM_ARM_narrado_final.webm');
const wrapperPath = path.resolve('output/demo-video/check-narrated-video.html');
fs.writeFileSync(wrapperPath, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#102f27;height:100%}video{width:100%;height:100%;object-fit:contain}</style><video controls preload="auto" src="${pathToFileURL(videoPath).href}"></video>`);

const browser = await launchBrowser({ width: 1280, height: 800 });
try {
  await browser.goto(pathToFileURL(wrapperPath).href);
  const metadata = await browser.eval(`new Promise((resolve,reject)=>{
    const video=document.querySelector('video');
    const read=async()=>{
      try{
        await video.play();
        await new Promise(r=>setTimeout(r,350));
        const stream=video.captureStream();
        const context=new AudioContext(),source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();
        analyser.fftSize=1024;source.connect(analyser);
        const samples=new Uint8Array(analyser.fftSize);let peak=0;
        for(let i=0;i<18;i++){
          analyser.getByteTimeDomainData(samples);
          for(const value of samples)peak=Math.max(peak,Math.abs(value-128));
          await new Promise(r=>setTimeout(r,70));
        }
        await context.close();
        resolve({duration:video.duration,width:video.videoWidth,height:video.videoHeight,readyState:video.readyState,audioTracks:stream.getAudioTracks().length,videoTracks:stream.getVideoTracks().length,audioPeak:peak,currentTime:video.currentTime,paused:video.paused});
      }catch(error){reject(error)}
    };
    if(video.readyState>=2)read();
    else{video.addEventListener('canplay',read,{once:true});video.addEventListener('error',()=>reject(new Error('Error de decodificación del video')),{once:true});setTimeout(()=>reject(new Error('Tiempo agotado leyendo el video')),8000)}
  })`);
  console.log(JSON.stringify(metadata, null, 2));
  if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) throw new Error('La duración del video no es válida.');
  if (metadata.width !== 1440 || metadata.height !== 900) throw new Error('La resolución no coincide con 1440x900.');
  if (metadata.audioTracks !== 1 || metadata.videoTracks !== 1) throw new Error('El archivo no contiene una pista de audio y una de video.');
  if (metadata.audioPeak < 2) throw new Error('La pista de audio existe, pero no se detectó señal audible.');
  if (metadata.currentTime <= 0 || metadata.paused) throw new Error('Chrome no consiguió reproducir el archivo.');
} finally {
  await browser.close();
}
