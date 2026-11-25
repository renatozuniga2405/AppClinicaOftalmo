# 005 — Hacer perceptible y performante el colapso del sidebar

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Purpose & frequency; Performance
- **Estimated scope**: 2 archivos, 60–100 líneas

## Problem

El botón reconstruye `#app`; la transición declarada en el shell nuevo nunca ve el estado anterior. Además, animar `grid-template-columns` recalcularía layout en cada frame.

```js
// app/app.js:1624 — current
$('#collapse').onclick=()=>{collapsed=!collapsed;render();};
```

```css
/* app/style.css:299 — current */
.shell {
  grid-template-columns: 242px minmax(0, 1fr);
  transition: grid-template-columns .18s ease;
}
.shell.collapsed { grid-template-columns: 74px minmax(0, 1fr); }
```

## Target

El cambio de estado debe conservar los nodos actuales. En Chrome compatible, usar `document.startViewTransition()` para capturar y componer el cambio sin interpolar `grid-template-columns`; el fallback debe ser instantáneo. Duración `180ms`, curva `cubic-bezier(0.77, 0, 0.175, 1)`. Reduced motion debe saltar al estado final.

```js
// target pattern
const applyCollapsedState = () => {
  collapsed = !collapsed;
  document.querySelector('.shell')?.classList.toggle('collapsed', collapsed);
  syncSidebarCollapsedUi();
};
if (motion.isMotionReduced() || !document.startViewTransition) applyCollapsedState();
else document.startViewTransition(applyCollapsedState);
```

```css
/* target */
.shell { transition: none; }
.shell > aside { view-transition-name: clinic-sidebar; }
main { view-transition-name: clinic-main; }
::view-transition-group(clinic-sidebar),
::view-transition-group(clinic-main) {
  animation-duration: 180ms;
  animation-timing-function: var(--motion-ease-in-out);
}
```

## Repo conventions to follow

- Estado `collapsed` permanece como booleano en `app/app.js`.
- Actualizar `aria-expanded`, `aria-label`, `title`, `data-tooltip` y el texto del botón, no solo la clase visual.
- Reutilizar `hideCollapsedTooltip()` y `syncCollapsedTooltipHandlers()` después del cambio.

## Steps

1. Crear `syncSidebarCollapsedUi()` cerca del binding del sidebar. Debe actualizar clase, atributos y etiqueta del botón sin llamar a `render()`.
2. Reemplazar el handler actual por el patrón de View Transition, con fallback inmediato y respeto a `motion.isMotionReduced()`.
3. Eliminar `transition: grid-template-columns` de `.shell`.
4. Añadir nombres y reglas de View Transition solo para sidebar y `main`, con 180ms y `--motion-ease-in-out` del plan 004.
5. Manejar clics repetidos: mientras exista una transición activa, finalizarla o saltar al nuevo estado; nunca acumular promesas ni bloquear el botón.

## Boundaries

- No reconstruir `#app` al colapsar.
- No cambiar rutas, contenido de módulos ni estado de formularios.
- No animar width, grid-template-columns, margin, padding, left o right.
- No añadir polyfills ni dependencias.

## Verification

- **Mechanical**: `npm run check` y `npm test`; ambos con código 0.
- **Feel check**: escribir en un formulario, contraer y expandir, y confirmar que el valor y foco no se pierden. Pulsar rápidamente 10 veces: el estado final debe coincidir con el último clic y no debe haber flashes. En DevTools Performance, confirmar ausencia de animación frame-a-frame de `grid-template-columns`.
- **Reduced motion/fallback**: deshabilitar View Transitions o activar reduced motion; el cambio debe ser inmediato y funcional.
- **Done when**: colapsar no ejecuta `render()` y no anima propiedades de layout.

## Reconciliación final

La duración efectiva se mantiene en `100ms`. En Chrome real, `180ms` produjo un fallo de hit-testing: al abrir Buscar durante la expansión, el clic llegó a `.shell` en vez de `#sidebar-search-btn`, incluso con la raíz excluida y `pointer-events:none` sobre la capa de View Transition. Se prioriza interacción correcta y se finaliza además cualquier transición activa cuando la apertura de la paleta sí recibe el evento.

