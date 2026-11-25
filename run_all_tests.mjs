// Ejecutor integral de todas las pruebas del prototipo clínico oftalmológico
import { spawn } from 'node:child_process';

console.log('================================================================');
console.log('CLÍNICA OFTALMOLÓGICA - EJECUCIÓN INTEGRAL DE COMPROBACIONES');
console.log('================================================================\n');

async function runStep(stepName, cmd, args) {
  console.log(`>>> Ejecutando: ${stepName}...`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code === 0) {
        console.log(`\n[OK] ${stepName} finalizado exitosamente.\n`);
        resolve(true);
      } else {
        console.error(`\n[FALLO] ${stepName} terminó con código de error ${code}.\n`);
        process.exit(code);
      }
    });
    child.on('error', err => {
      console.error(`[ERROR] No se pudo iniciar ${stepName}:`, err);
      process.exit(1);
    });
  });
}

// 1. Verificación de sintaxis JavaScript
await runStep('1. Verificación de sintaxis JS (app.js)', 'node', ['--check', 'app/app.js']);
await runStep('2. Verificación de sintaxis JS (auth.js)', 'node', ['--check', 'app/auth.js']);
await runStep('3. Verificación de sintaxis JS (crm.js)', 'node', ['--check', 'app/crm.js']);
await runStep('4. Verificación de sintaxis JS (automations.js)', 'node', ['--check', 'app/automations.js']);
await runStep('5. Verificación de sintaxis JS (arm.js)', 'node', ['--check', 'app/arm.js']);
await runStep('6. Verificación de sintaxis JS (palette.js)', 'node', ['--check', 'app/palette.js']);
await runStep('7. Verificación de sintaxis JS (turnos.js)', 'node', ['--check', 'app/turnos.js']);
await runStep('8. Verificación de sintaxis JS (server.mjs)', 'node', ['--check', 'server.mjs']);
await runStep('9. Verificación de sintaxis JS (motion.js)', 'node', ['--check', 'app/motion.js']);
await runStep('10. Verificación de sintaxis JS (dashboard.js)', 'node', ['--check', 'app/dashboard.js']);

// 2. Comprobaciones estáticas de políticas y ausencia de términos bloqueados
await runStep('11. Comprobaciones estáticas de políticas (test_static_checks.mjs)', 'node', ['test_static_checks.mjs']);

// 3. Pruebas unitarias de roles, permisos RBAC y métricas CRM
await runStep('12. Pruebas unitarias de RBAC, CRM y ARM (test_roles.mjs)', 'node', ['test_roles.mjs']);
await runStep('13. Pruebas unitarias de Dashboard Ejecutivo (test_dashboard.mjs)', 'node', ['test_dashboard.mjs']);

// 4. Pruebas funcionales reales en navegador headless Google Chrome
await runStep('14. Pruebas funcionales en navegador Google Chrome (test_browser_functional.mjs)', 'node', ['test_browser_functional.mjs']);

console.log('================================================================');
console.log('¡TODAS LAS COMPROBACIONES Y PRUEBAS SE COMPLETARON CON ÉXITO!');
console.log('================================================================');
