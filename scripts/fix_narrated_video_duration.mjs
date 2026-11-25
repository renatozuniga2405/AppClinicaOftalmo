import fs from 'node:fs';
import path from 'node:path';
import fixWebmDuration from 'fix-webm-duration';

const source = path.resolve('output/demo-video/Clinica_Oftalmologica_Flujo_CRM_ARM_narrado.webm');
const target = path.resolve('output/demo-video/Clinica_Oftalmologica_Flujo_CRM_ARM_narrado_final.webm');
const metadata = JSON.parse(fs.readFileSync(path.resolve('output/demo-video/narrated-metadata.json'), 'utf8'));
const input = fs.readFileSync(source);
const fixed = await fixWebmDuration(
  new Blob([input], { type: 'video/webm' }),
  metadata.totalDurationMs,
  { logger: message => console.log(message) }
);

fs.writeFileSync(target, Buffer.from(await fixed.arrayBuffer()));
console.log(JSON.stringify({ target, durationMs: metadata.totalDurationMs, size: fixed.size }, null, 2));
