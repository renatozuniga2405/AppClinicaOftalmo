import fs from 'node:fs';
import path from 'node:path';
import fixWebmDuration from 'fix-webm-duration';

const source=path.resolve('output/demo-video/Clinica_Oftalmologica_Flujo_CRM_ARM.webm');
const target=path.resolve('output/demo-video/Clinica_Oftalmologica_Flujo_CRM_ARM_final.webm');
const input=fs.readFileSync(source);
const durationMs=12*1850+11*350+250;
const fixed=await fixWebmDuration(new Blob([input],{type:'video/webm'}),durationMs,{logger:message=>console.log(message)});
fs.writeFileSync(target,Buffer.from(await fixed.arrayBuffer()));
console.log(JSON.stringify({target,durationMs,size:fixed.size},null,2));
