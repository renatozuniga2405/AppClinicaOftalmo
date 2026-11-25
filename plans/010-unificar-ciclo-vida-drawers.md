# 010 — Unificar la entrada y salida de los drawers reales

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Physicality & origin; Interruptibility; Cohesion & tokens
- **Estimated scope**: 3 archivos, 100–150 líneas

## Problem

Los drawers reales de Agenda y CRM tienen una entrada inconsistente y se eliminan del DOM inmediatamente al cerrar. Agenda entra desde la derecha mediante un keyframe local, mientras CRM solo cambia opacidad. Ninguno conserva una salida visible ni permite que una reapertura durante el cierre retome el estado actual.

```css
/* app/style.css:1577-1593 — current */
.agenda-drawer-layer { position: fixed; inset: 0; z-index: 40; display: flex; justify-content: flex-end; }
.agenda-drawer-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 0; background: rgba(18,55,42,.32); backdrop-filter: blur(2px); }
.agenda-drawer { position: relative; width: min(440px, 100%); height: 100%; display: flex; flex-direction: column; background: #fff; color: var(--text); box-shadow: -18px 0 55px rgba(18,55,42,.18); animation: agendaDrawerIn .2s ease-out; }
@keyframes agendaDrawerIn { from { transform: translateX(24px); opacity:.5 } to { transform:none; opacity:1 } }
@media(prefers-reduced-motion: reduce) { .agenda-drawer { animation:none; } .agenda-card:hover { transform:none; } }
```

```js
// app/app.js:2222-2226 — current
document.querySelector('.agenda-drawer-layer')?.remove();
document.body.insertAdjacentHTML('beforeend', `<div class="agenda-drawer-layer">…</div>`);
const onKey=e=>{if(e.key==='Escape')close()};
const close=()=>{document.removeEventListener('keydown',onKey);document.querySelector('.agenda-drawer-layer')?.remove();if(opener&&document.contains(opener))opener.focus()};
```

```css
/* app/style.css:2411-2449 — current */
.crmdetail {
  position: fixed;
  top: 0;
  right: 0;
  animation: crmDrawerIn .16s ease-out;
}
.crm-drawer-backdrop { animation: crmBackdropIn .16s ease-out; }
@keyframes crmDrawerIn { from {opacity:.7} to {opacity:1} }
@keyframes crmBackdropIn { from {opacity:0} to {opacity:1} }
```

```js
// app/crm.js:972-977 — current
function closeLeadDetail(id){
  selected=null;
  location.hash='#crm';
  draw();
  document.querySelector(`[data-followup="${id}"]`)?.focus();
}
```

El elemento `.arm-detail-panel.arm-drawer` queda fuera: `app/style.css:9798-9806` lo redefine como `position: static`, sin sombra ni animación, porque es un panel integrado de la cuadrícula y no un drawer espacial.

## Target

Agenda y CRM deben compartir el mismo lenguaje y el mismo ciclo de vida:

- Entrada del panel: `translateX(16px)` y `opacity: .85` a `transform: none` y `opacity: 1` en `220ms` con `var(--motion-ease-drawer)`, cuyo valor existente es `cubic-bezier(0.32, 0.72, 0, 1)`.
- Salida: `translateX(12px)` y `opacity: 0` en `160ms` con `var(--motion-ease-out)`, cuyo valor existente es `cubic-bezier(0.23, 1, 0.32, 1)`.
- Backdrop: únicamente `opacity: 0 → 1`; no animar `backdrop-filter`. Entrada `220ms var(--motion-ease-drawer)`; salida `160ms var(--motion-ease-out)`.
- Implementar estados con transiciones CSS y una clase `.is-open`, no con keyframes. Las transiciones pueden retomar desde el valor computado si se interrumpen.
- Mantener el panel y el backdrop en el DOM hasta que termine la salida; usar `transitionend` sobre el panel y un fallback de `190ms`.
- Con `prefers-reduced-motion: reduce` o `data-reduced-motion="on"`, eliminar `transform` y conservar solo un fundido de opacidad de `160ms var(--motion-ease-color)`.

Patrón CSS objetivo:

```css
.agenda-drawer,
.crmdetail {
  opacity: .85;
  transform: translateX(16px);
  transition: opacity 160ms var(--motion-ease-out), transform 160ms var(--motion-ease-out);
}

.agenda-drawer-layer.is-open .agenda-drawer,
.crmworkspace.is-drawer-open .crmdetail {
  opacity: 1;
  transform: none;
  transition-duration: 220ms;
  transition-timing-function: var(--motion-ease-drawer);
}
```

Los selectores finales pueden ajustarse al contenedor real, pero deben conservar exactamente esos estados, propiedades y valores.

## Repo conventions to follow

- Los tokens requeridos ya existen en `app/style.css:52-62`: `--motion-duration-fast`, `--motion-ease-out`, `--motion-ease-drawer` y `--motion-ease-color`. No crear curvas duplicadas.
- Imitar el ciclo de vida del panel móvil en `app/app.js:1687-1728`: montar, añadir `.is-open` en el siguiente frame, retirar `.is-open`, esperar `transitionend` con fallback y finalmente cerrar o desmontar.
- Consultar `motion.isMotionReduced()` desde `app/motion.js:17-31`; no crear otra detección de accesibilidad.
- Restaurar el foco al disparador únicamente después de desmontar el drawer.

## Steps

1. En `app/style.css`, reemplazar `agendaDrawerIn`, `crmDrawerIn` y `crmBackdropIn` por transiciones de `opacity` y `transform` controladas por `.is-open`. No modificar dimensiones, posición, blur, sombras ni responsive.
2. En `agendaAppointmentDrawer()` de `app/app.js`, conservar una referencia local a `.agenda-drawer-layer`, montarla en estado inicial y añadir `.is-open` dentro del siguiente `requestAnimationFrame`.
3. Reemplazar el cierre inmediato de Agenda por un helper local idempotente. Debe retirar `.is-open`, bloquear cierres duplicados, esperar el `transitionend` de `.agenda-drawer` o `190ms`, retirar el listener de Escape, desmontar la capa y restaurar el foco.
4. Todas las rutas de cierre de Agenda —botón, backdrop, Escape, “Gestionar cita”, “No asistió”, “Reprogramar” y “Cancelar cita”— deben pasar por ese helper. Las acciones posteriores se ejecutan mediante callback después del desmontaje.
5. En `app/crm.js`, al terminar `draw()` con un lead seleccionado, montar `.crmdetail` y `.crm-drawer-backdrop` en estado inicial y activar `.is-open` en el siguiente frame. La clase puede residir en `.crmworkspace`, siempre que panel y backdrop compartan el estado.
6. Convertir `closeLeadDetail(id)` en un cierre visual idempotente: retirar `.is-open`, esperar la salida con fallback de `190ms` y solo entonces limpiar `selected`, actualizar `location.hash`, ejecutar `draw()` y devolver el foco a `[data-followup="${id}"]`.
7. Asegurar que botón y backdrop del CRM usen el mismo cierre y que una invocación duplicada no ejecute dos renders ni deje timers activos.
8. Añadir reglas equivalentes para `:root[data-reduced-motion="on"]` y `@media (prefers-reduced-motion: reduce)`: `transform: none !important`, manteniendo solo `opacity 160ms var(--motion-ease-color)`.
9. Extender las pruebas cercanas a Agenda (`test_browser_functional.mjs:553-559`) y CRM (`test_browser_functional.mjs:1886`) para comprobar que `.is-open` aparece al abrir, desaparece al iniciar cierre y el nodo se retira después de la salida.

## Boundaries

- No tocar `.arm-detail-panel.arm-drawer`: no es un drawer real en el layout vigente.
- No cambiar contenido, permisos, rutas, historial, foco esperado ni acciones de Agenda/CRM.
- No animar `right`, `width`, `height`, `inset`, `margin`, `padding` ni `backdrop-filter`.
- No añadir dependencias ni introducir una nueva capa global de motion.
- No convertir el cierre en una espera mayor de `190ms`; la acción debe seguir sintiéndose inmediata.
- Si `app/style.css:9798-9806` ya no mantiene ARM como panel estático al ejecutar este plan, detenerse y reportar drift.

## Verification

- **Mechanical**: ejecutar `npm run check` y `npm test`; ambos deben finalizar con código 0.
- **Feel check Agenda**: abrir y cerrar por botón, backdrop y Escape; repetir con cada acción del footer. El panel debe venir de la derecha y salir hacia la derecha, sin flash ni doble ejecución.
- **Feel check CRM**: abrir varios leads, cerrar por botón y backdrop, y alternar rápidamente. El hash no debe cambiar hasta que empiece el cierre visual y el foco debe volver a la tarjeta correcta.
- En DevTools, reducir la reproducción a 10% y confirmar que solo se animan `transform` y `opacity`; el blur y las dimensiones permanecen constantes.
- Activar reducción desde Configuración y desde DevTools: no debe haber desplazamiento lateral, pero sí un fundido de `160ms`.
- **Done when**: Agenda y CRM comparten valores y dirección, todas sus rutas de cierre esperan la salida sin superar el fallback, no quedan backdrops bloqueando la interfaz y ARM permanece estático.

