# 012 — Conectar espacialmente los pasos del kiosco

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Missed opportunity; Spatial consistency; Performance
- **Estimated scope**: 3 archivos, 70–110 líneas

## Problem

Cada avance o retroceso vuelve a construir todo el terminal y el contenido del paso aparece directamente en su posición final. El indicador superior cambia de estado, pero el cuerpo no comunica si el usuario avanzó o retrocedió.

```js
// app/turnos.js:2102 — current
container.innerHTML = `
  <div class="public-screen-shell kiosk-shell" id="kiosk-terminal-app">
    …
    <main class="kiosk-main-content">
      ${kioskUiState.step === 1 ? `
        <section class="kiosk-step-view kiosk-step-document" …>
```

```js
// app/turnos.js:2544-2606 — current pattern
kioskUiState.step = 2;
renderKioskView(container, ctx);
// …
kioskUiState.step = 3;
renderKioskView(container, ctx);
// …
kioskUiState.step = 1;
renderKioskView(container, ctx);
```

```css
/* app/style.css:6212-6216 — current */
.kiosk-step-view {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
}
```

Además, el indicador de progreso usa una transición demasiado amplia:

```css
/* app/style.css:6153-6164 — current */
.kiosk-progress-item {
  …
  transition: all 0.2s ease;
}
```

## Target

- Animar únicamente el `.kiosk-step-view` recién montado; no animar el shell, header, teclado, altura del contenedor ni el paso anterior.
- Avance `1→2`, `2→3` y `3→4`: `translateX(10px)` y `opacity: 0` a `transform: none` y `opacity: 1` en `200ms var(--motion-ease-out)`, cuyo valor es `cubic-bezier(0.23, 1, 0.32, 1)`.
- Retroceso `3→2` y `2→1`: `translateX(-10px)` con el mismo destino en `180ms var(--motion-ease-out)`.
- Reinicio `4→1`: solo opacidad, `160ms var(--motion-ease-color)`; no recorrer tres pasos hacia atrás.
- No añadir espera de salida. El contenido nuevo se monta inmediatamente y recibe una transición de entrada; los controles deben ser utilizables desde el primer frame.
- Guardar el último paso renderizado en `container.dataset.kioskRenderedStep`. Compararlo con `kioskUiState.step` antes de sustituir `innerHTML`; no añadir estado persistente de negocio ni modificar `kioskUiState`.
- La primera carga no debe animarse, porque no existe una relación espacial previa.
- Con reduced motion, todas las direcciones usan solo `opacity 0 → 1` en `160ms var(--motion-ease-color)`; sin desplazamiento.
- Reemplazar `transition: all` del progreso por `background-color`, `color` y `box-shadow`, cada una en `160ms var(--motion-ease-color)`.

Patrón objetivo:

```css
.kiosk-step-view.is-step-entering {
  opacity: 0;
  transition: opacity 200ms var(--motion-ease-out), transform 200ms var(--motion-ease-out);
}
.kiosk-step-view.is-step-forward { transform: translateX(10px); }
.kiosk-step-view.is-step-backward { transform: translateX(-10px); transition-duration: 180ms; }
.kiosk-step-view.is-step-reset { transform: none; transition: opacity 160ms var(--motion-ease-color); }
.kiosk-step-view.is-step-visible { opacity: 1; transform: none; }
```

## Repo conventions to follow

- `app/turnos.js` ya importa `* as motion` en la primera línea; usar `motion.isMotionReduced()` si hace falta una decisión de ciclo de vida, sin duplicar `matchMedia`.
- Reutilizar `--motion-ease-out` y `--motion-ease-color` de `app/style.css:59-62`.
- El patrón de añadir una clase final en el siguiente frame ya se usa en `app/app.js:1687-1699` para el panel móvil.
- Mantener ambas vías de accesibilidad: `:root[data-reduced-motion="on"]` y `@media (prefers-reduced-motion: reduce)`.

## Steps

1. Al inicio de `renderKioskView(container, ctx)` en `app/turnos.js`, leer `Number(container.dataset.kioskRenderedStep || 0)` antes de reemplazar el contenido y guardar el valor actual de `kioskUiState.step`.
2. Clasificar la transición: sin clase para primera carga o mismo paso; `forward` para `1→2`, `2→3`, `3→4`; `backward` para `3→2`, `2→1`; `reset` para `4→1`. Cualquier salto no contemplado debe usar `reset`, nunca inferir una gran traslación.
3. Después de asignar `container.innerHTML`, actualizar `container.dataset.kioskRenderedStep` y localizar el único `.kiosk-step-view` activo.
4. Si existe transición, añadir `.is-step-entering` y la clase direccional correspondiente; en el siguiente `requestAnimationFrame`, añadir `.is-step-visible`. No retrasar el binding de eventos ni usar `setTimeout` para habilitar controles.
5. Limpiar las clases transitorias tras `transitionend` de `opacity`, con fallback máximo de `230ms`, solo para no acumular estado visual. Si el nodo fue reemplazado antes, el callback debe terminar sin error.
6. En `app/style.css`, añadir las reglas exactas de dirección, opacidad, transform y duración. No usar keyframes ni View Transitions para este flujo.
7. Sustituir `transition: all 0.2s ease` de `.kiosk-progress-item` por las tres propiedades explícitas y los tokens indicados.
8. Añadir selectores equivalentes de reduced motion por sistema y preferencia de la app: `transform: none !important` y transición exclusiva de opacidad `160ms var(--motion-ease-color)`.
9. Extender el bloque de autoservicio de `test_browser_functional.mjs:2284-2807`: comprobar primera carga sin clase, `1→2` forward, `2→3` forward, `3→2` backward, `4→1` reset y ausencia de transform bajo `data-reduced-motion="on"`.

## Boundaries

- No cambiar validaciones de DNI, selección de área, generación, duplicados, impresión, temporizadores ni estado compartido.
- No animar el paso anterior ni mantener dos formularios simultáneos en el DOM; evita doble exposición y foco duplicado.
- No usar `document.startViewTransition()`: el kiosco debe conservar comportamiento determinista en Chrome sin depender de captura visual global.
- No animar width, height, margin, padding, left, right ni contenido interno individual.
- No bloquear clics durante los `200ms`; la transición es informativa, no una espera.
- No añadir librerías.
- Si `renderKioskView()` deja de reemplazar `container.innerHTML`, detenerse y reevaluar el mecanismo en vez de conservar este plan literalmente.

## Verification

- **Mechanical**: ejecutar `npm run check` y `npm test`; ambos deben finalizar con código 0.
- **Feel check**: recorrer documento → área → confirmación → ticket y volver desde los pasos 3 y 2. La dirección debe ser inequívoca sin sentirse como un carrusel.
- Confirmar que errores y cambios internos que vuelven a renderizar el mismo paso no repiten la entrada.
- Confirmar que el reinicio tras finalizar ticket usa solo fundido; nunca debe desplazarse 10px hacia la izquierda como si fuera un simple retroceso.
- A 10% en DevTools, verificar que solo cambian `transform` y `opacity` en `.kiosk-step-view`; header, shell y altura no se mueven.
- Activar reduced motion desde Configuración y DevTools: todos los cambios deben ser fundidos de `160ms`, sin desplazamiento horizontal.
- Probar 1024×768, 768×1024 y 390×844; no debe aparecer scroll horizontal ni cambiar el tamaño de los objetivos táctiles.
- **Done when**: cada cambio real de paso tiene la dirección correcta, los rerenders del mismo paso permanecen quietos, los eventos están disponibles inmediatamente y la suite completa conserva sus resultados.

## Implementation & Certification Notes

- **Archivos modificados**:
  - `app/turnos.js`: Detección de paso inicial (`prevStep === 0` cuando el shell no existía), clasificación direccional (`forward` 1→2, 2→3, 3→4; `backward` 3→2, 2→1; `reset` 4→1; `null` para mismo paso o carga inicial), aplicación de `.is-step-entering` y dirección en el montaje, transición a `.is-step-visible` vía `requestAnimationFrame`, y limpieza idempotente de clases en `transitionend` de `opacity` (con fallback de 230ms).
  - `app/style.css`:
    - Sustitución de `transition: all 0.2s ease` en `.kiosk-progress-item` por `transition: background-color 160ms var(--motion-ease-color), color 160ms var(--motion-ease-color), box-shadow 160ms var(--motion-ease-color);`.
    - Estilos de `.kiosk-step-view.is-step-entering`, `.is-step-forward` (`translateX(10px)` / 200ms `var(--motion-ease-out)`), `.is-step-backward` (`translateX(-10px)` / 180ms `var(--motion-ease-out)`), `.is-step-reset` (`transform: none; transition: opacity 160ms var(--motion-ease-color);`), y `.is-step-visible` (`opacity: 1; transform: none;`). No se añadió `will-change`.
    - Reglas de movimiento reducido (`transform: none !important; transition: opacity 160ms var(--motion-ease-color) !important;`) bajo `:root[data-reduced-motion="on"]` y `@media (prefers-reduced-motion: reduce)`.
  - `test_browser_functional.mjs`: Extensión de la suite del kiosco de autoservicio para verificar:
    - Montaje inicial sin animación (`prevStep === 0`).
    - Transiciones direccionales 1→2, 2→3 y 3→2.
    - Reinicio 4→1: `transform === 'none'`, `transitionProperty === 'opacity'` (sin `transform` ni `all`), duración `0.16s`, curva efectiva coincidente con `--motion-ease-color`, opacidad en pleno vuelo `0 < opacity < 1`, y limpieza posterior de clases transitorias quedando visible (`opacity === 1`).
    - Movimiento reducido por ambas vías (`:root[data-reduced-motion="on"]` y `@media (prefers-reduced-motion: reduce)`): ausencia total de desplazamiento (`transform: none`), transición exclusiva de opacidad `160ms`, curva efectiva coincidente con `--motion-ease-color`, opacidad parcial en pleno vuelo, verificación de estado asentado (`!isEntering`, `!hasDirectionClass`, `!isVisible`, `opacity === 1`, `transform === 'none'`) y comprobación explícita de restauración de `data-reduced-motion` y `prefers-reduced-motion` (`matchMedia('(prefers-reduced-motion: reduce)').matches === false`, `hasAttribute('data-reduced-motion') === false` y `dataset.reducedMotion === undefined`).
  - `scratch/feel_check_plan012.mjs`: Script autónomo de verificación con servidor HTTP dinámico en puerto 0 y Chrome CDP, con aserciones estrictas replicando las mismas comprobaciones en ambas vías de movimiento reducido (curva efectiva de `--motion-ease-color`, propiedad exclusiva `opacity`, duración `0.16s`, opacidad parcial, `transform: none`, limpieza final de todas las clases transitorias, estado visible final y comprobación explícita de restauración de `data-reduced-motion` y `prefers-reduced-motion`), finalizando con código de salida 1 ante cualquier incumplimiento.
- **Resultados de verificación**:
  - `npm run check`: PASSED (10/10 archivos de sintaxis JS, exit code 0)
  - `npm run test:static`: PASSED (84/84 comprobaciones de directivas, exit code 0)
  - `npm run test:unit`: PASSED (290/290 pruebas: 269 en test_roles.mjs + 21 en test_dashboard.mjs, exit code 0)
  - `node scratch/feel_check_plan012.mjs`: PASSED (10 secciones verificadas con aserciones reales, exit code 0)
  - `npm run test:browser`: PASSED (360/360 pruebas funcionales en Chrome, exit code 0)
  - `npm test`: PASSED (suite integral completa, exit code 0)



