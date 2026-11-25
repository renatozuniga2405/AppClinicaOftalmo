# 009 — Conectar el panel móvil “Más módulos”

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Missed opportunity; Physicality & origin
- **Estimated scope**: 2 archivos, 50–80 líneas

## Problem

El diálogo móvil se abre y cierra directamente con `showModal()`/`close()` y aparece en su estado final sobre la barra inferior.

```js
// app/app.js:1627 — current
if($('#mobile-more'))$('#mobile-more').onclick=()=>$('#mobile-nav-dialog').showModal();
if($('#mobile-nav-close'))$('#mobile-nav-close').onclick=()=>$('#mobile-nav-dialog').close();
```

```css
/* app/style.css:3751 — current */
.mobile-nav-dialog[open] {
  position: fixed;
  inset: auto 10px calc(78px + env(safe-area-inset-bottom));
}
```

## Target

El panel debe entrar desde su conexión con la barra inferior usando `opacity 0 → 1` y `translateY(100%) → 0` recortado por su contenedor o, preferentemente para no recorrer toda su altura, `translateY(12px) scale(0.97) → none`. Duración `220ms`, curva drawer exacta `cubic-bezier(0.32, 0.72, 0, 1)`, origen `bottom center`. Salida `160ms` con la misma trayectoria inversa. Backdrop: opacidad `0 → 1`, sin animar blur.

## Repo conventions to follow

- Añadir `--motion-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` junto a los tokens globales si el plan 004 aún no lo añadió.
- Usar transiciones CSS y clases, no keyframes.
- Mantener `<dialog>`, focus trap nativo y `closedby="any"` cuando esté disponible.

## Steps

1. Crear helpers `openMobileNavDialog()` y `closeMobileNavDialog()` en `app/app.js`.
2. Al abrir: `showModal()`, añadir una clase inicial y, en el siguiente frame, `.is-open`.
3. Al cerrar: retirar `.is-open`, esperar `transitionend` o 180ms de fallback, después llamar `close()`.
4. Sustituir todos los cierres actuales —botón, enlace y apertura de buscador— por el helper, preservando la acción posterior mediante callback.
5. CSS: añadir transform, opacity, origen y transiciones exactas; animar solo opacidad del backdrop.
6. Con reduced motion, usar `showModal()`/`close()` inmediatos.

## Boundaries

- No cambiar navegación, grupos, enlaces ni responsive breakpoint.
- No animar `bottom`, `inset`, width, height ni `backdrop-filter`.
- No añadir librerías.

## Verification

- **Mechanical**: `npm run check` y `npm test`.
- **Feel check**: a 390×844 abrir desde “Más”, cerrar por botón, Escape, backdrop, enlace y buscador. Debe sentirse conectado a la barra inferior. Alternar rápidamente y confirmar que nunca queda un backdrop bloqueando la app.
- **Reduced motion**: apertura/cierre instantáneos.
- **Done when**: `dialog.open` y la clase visual nunca divergen al finalizar cualquier ruta de cierre.

