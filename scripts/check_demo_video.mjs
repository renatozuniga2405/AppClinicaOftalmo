import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {launchBrowser} from '../tests/cdp.mjs';

const videoPath=path.resolve('output/demo-video/Clinica_Oftalmologica_Flujo_CRM_ARM_final.webm');
const wrapperPath=path.resolve('output/demo-video/check-video.html');
fs.writeFileSync(wrapperPath,`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#102f27;height:100%}video{width:100%;height:100%;object-fit:contain}</style><video controls preload="metadata" src="${pathToFileURL(videoPath).href}"></video>`);
const browser=await launchBrowser({width:1280,height:800});
try{
  await browser.goto(pathToFileURL(wrapperPath).href);
  const metadata=await browser.eval(`new Promise((resolve,reject)=>{const video=document.querySelector('video');const read=()=>resolve({duration:video.duration,width:video.videoWidth,height:video.videoHeight,readyState:video.readyState});if(video.readyState>=1)read();else{video.addEventListener('loadedmetadata',read,{once:true});video.addEventListener('error',()=>reject(new Error('Error de decodificación del video')),{once:true});setTimeout(()=>reject(new Error('Tiempo agotado leyendo metadatos')),8000)}})`);
  console.log(JSON.stringify(metadata,null,2));
  if(!metadata||!Number.isFinite(metadata.duration)||metadata.duration<=0)throw new Error('Chrome no pudo leer la duración del video.');
  console.log(JSON.stringify(metadata,null,2));
} finally {
  await browser.close();
}
