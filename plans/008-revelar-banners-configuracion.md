# 008 — Revelar los banners de Configuración

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: LOW
- **Category**: Missed opportunity
- **Estimated scope**: 2 archivos, 30–50 líneas

## Problem

Los mensajes de éxito/error alternan directamente `hidden` y `display:none`, por lo que aparecen de forma abrupta.

```js
// app/app.js:855 — current
if(!msg){ el.hidden=true; return; }
el.hidden=false;
el.className=`form-status-banner is-${kind}`;
```

```css
/* app/style.css:4912 — current */
.form-status-banner[hidden] { display: none; }
```

## Target

Entrada ocasional: `opacity 0 → 1`, `translateY(4px) → 0`, `160ms`, `cubic-bezier(0.23, 1, 0.32, 1)`. Salida: opacidad a 0 durante `125ms`, sin bloquear interacción. Reduced motion conserva un fundido de `200ms ease` sin desplazamiento, tal como permite el catálogo.

## Repo conventions to follow

- Usar clases de estado y transición CSS, no keyframes.
- Conservar `role="alert"`, contenido y colores.
- Reutilizar `--motion-ease-out`.

## Steps

1. Añadir estado base con opacidad 0 y `translateY(4px)`, y `.is-visible` con estado final.
2. Actualizar `setBanner()` para retirar `hidden`, escribir contenido y añadir `.is-visible` en el siguiente frame.
3. Al ocultar, retirar `.is-visible` y aplicar `hidden` tras `transitionend`, cancelando timers anteriores.
4. En reduced motion, usar solo `opacity 200ms ease` y `transform:none`.

## Boundaries

- No cambiar validación, mensajes, colores ni ubicación del banner.
- No animar altura, margin o padding.
- No sustituir el toast global.

## Verification

- **Mechanical**: `npm run check` y `npm test`.
- **Feel check**: provocar error y éxito en perfil y contraseña; confirmar una sola entrada por mensaje, sin salto final. Repetir rápidamente para descartar timers huérfanos.
- **Reduced motion**: debe existir solo fundido, sin desplazamiento.
- **Done when**: el banner no queda oculto durante su entrada ni presente en el árbol interactivo después de su salida.

## Reconciliación final

La salida recupera los `125ms`. Una vez concluido el fundido, el banner conserva de forma invisible el espacio que ya ocupaba, con `aria-hidden` y sin eventos de puntero. Así no desplaza el botón de envío mientras el usuario continúa editando y tampoco queda expuesto a tecnologías de asistencia.

