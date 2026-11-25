# 002 — Hacer instantánea la selección del menú de comandos

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 archivo, menos de 15 líneas

## Problem

Cada flecha cambia `.is-selected`, pero el resultado tarda 120ms en alcanzar su estado visual. En una paleta de alta frecuencia esto produce una estela perceptiva al navegar rápido.

```css
/* app/style.css:5577 — current */
.cp-item {
  transition: background .12s, border-color .12s;
}
```

```js
// app/app.js:3998 — current
options.forEach((btn,idx)=>{
  const selected=idx===paletteState.selectedIndex;
  btn.classList.toggle('is-selected',selected);
  btn.setAttribute('aria-selected',String(selected));
});
```

## Target

El estado seleccionado, el borde, el fondo, el icono y el marcador deben cambiar en el mismo frame que `ArrowUp`/`ArrowDown`. La apertura, cierre, escritura, limpieza y expansión de resultados también deben continuar sin animación.

```css
/* target */
.cp-item { transition: none; }
```

## Repo conventions to follow

- La paleta usa `aria-selected` y `.is-selected` en `app/app.js:3987-4010`; conservar ambos.
- El producto es un dashboard clínico y la paleta puede usarse más de 100 veces al día.
- El feedback de hover puede seguir siendo inmediato; no crear una animación alternativa.

## Steps

1. En `app/style.css:5589`, eliminar la transición de `.cp-item` o establecerla explícitamente en `none`.
2. No añadir transiciones a `.cp-item-icon`, `.cp-item-badge`, `.cp-selected-marker` ni a los grupos de resultados.
3. Confirmar que no haya otra regla posterior que vuelva a introducir una transición en `.cp-item`.

## Boundaries

- No cambiar ranking, búsqueda, selección, scroll ni accesibilidad ARIA.
- No animar apertura/cierre del diálogo.
- No modificar `app/palette.js`.
- No añadir dependencias.

## Verification

- **Mechanical**: ejecutar `npm run check` y `npm test`; ambos deben finalizar con código 0.
- **Feel check**: abrir con Ctrl+K, mantener pulsada ArrowDown y luego ArrowUp; el borde izquierdo, fondo e icono deben permanecer exactamente en el resultado activo sin retraso. Repetir a velocidad normal y a 10% en DevTools: no debe aparecer ninguna pista de animación.
- **Reduced motion**: el comportamiento debe ser idéntico con y sin reducción de movimiento.
- **Done when**: una captura por frame muestra que la selección cambia completa en un solo frame.

