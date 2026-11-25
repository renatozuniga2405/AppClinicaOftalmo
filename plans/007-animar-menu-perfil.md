# 007 — Conectar espacialmente el menú del perfil

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 2 archivos, 45–70 líneas

## Problem

El popover alterna `hidden`, cuyo CSS usa `display:none`; aparece y desaparece sin transición ni origen relacionado con el botón.

```js
// app/app.js:1649 — current
const setProfileMenuOpen=(open,{focusIndex=null,returnFocus=false}={})=>{
  if(open)hideCollapsedTooltip();
  profileMenu.hidden=!open;
  profileBtn.setAttribute('aria-expanded',String(open));
};
```

```css
/* app/style.css:541 — current */
.profilemenu[hidden] { display: none; }
```

## Target

Entrada: `opacity 0 → 1`, `translateY(4px) scale(0.97) → none`, `160ms`, `cubic-bezier(0.23, 1, 0.32, 1)`, origen `bottom left`. Salida: los mismos valores en sentido inverso durante `125ms`. En sidebar colapsado el origen debe ser `bottom left` desde la posición lateral. La transición debe poder invertirse sin reiniciar visualmente desde cero.

## Repo conventions to follow

- Usar clases de estado y transiciones CSS, no keyframes.
- Usar `--motion-ease-out` y `--motion-duration-fast`.
- Mantener la gestión de foco y teclado existente en `app/app.js:1660-1699`.

## Steps

1. Añadir a `.profilemenu` opacidad, transform, `transform-origin: bottom left`, visibility y transiciones exactas.
2. Introducir `.profilemenu.is-open` como estado final; mantener `[hidden]` solamente tras terminar la salida.
3. Modificar `setProfileMenuOpen()`: al abrir, retirar `hidden`, forzar un frame y añadir `is-open`; al cerrar, retirar `is-open` y establecer `hidden` después de `transitionend` con fallback de 150ms.
4. Cancelar cualquier timer de cierre al reabrir; clics rápidos deben retargetear desde el estado actual.
5. Con reduced motion, alternar `hidden` inmediatamente sin transform.

## Boundaries

- No cambiar items, permisos, eventos de teclado ni retorno de foco.
- No usar `scale(0)`.
- No animar altura o posición absoluta.

## Verification

- **Mechanical**: `npm run check` y `npm test`.
- **Feel check**: abrir/cerrar con clic, Escape, ArrowDown y ArrowUp; el menú debe surgir del botón. Alternar rápidamente y comprobar que no parpadea ni queda invisible pero enfocable. Revisar expandido y colapsado a 10%.
- **Done when**: salida termina antes de aplicar `hidden`; foco y ARIA siguen correctos.

