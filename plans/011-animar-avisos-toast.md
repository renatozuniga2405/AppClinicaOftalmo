# 011 — Dar ciclo de vida a los avisos toast

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Feedback; Interruptibility; Accessibility
- **Estimated scope**: 3 archivos, 60–100 líneas

## Problem

El aviso global se hace visible al insertar texto y desaparece cuando el texto queda vacío. `display: none` se aplica inmediatamente, por lo que no existe entrada, salida ni posibilidad de retomar una animación interrumpida.

```js
// app/app.js:292 — current
function toast(text){$('#notice').textContent=text;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#notice').textContent='',4000)}
```

```js
// app/app.js:293-300 — current
function clearPublicNotice(){
  if(typeof toast!=='undefined'&&toast&&toast.timer){
    clearTimeout(toast.timer);
    toast.timer=null;
  }
  const n=$('#notice');
  if(n)n.textContent='';
}
```

```css
/* app/style.css:1929-1942 — current */
#notice {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--forest);
  color: white;
  border-radius: 9px;
  padding: 12px 20px;
  box-shadow: 0 6px 22px rgba(18, 55, 42, 0.25);
  z-index: 10;
}
#notice:empty { display: none; }
```

El nodo ya es semánticamente correcto en `app/index.html:2`: `<div id="notice" role="status" aria-live="polite"></div>`. No debe reemplazarse ni duplicarse.

## Target

- Entrada desde su borde inferior: `translateY(8px) scale(.98)` y `opacity: 0` a `transform: none` y `opacity: 1` en `220ms var(--motion-ease-out)`; `--motion-ease-out` equivale a `cubic-bezier(0.23, 1, 0.32, 1)`.
- Salida por la trayectoria inversa en `160ms var(--motion-ease-out)`.
- Usar transiciones CSS con `.is-visible`, no keyframes. Si llega un nuevo mensaje durante la salida, cancelar la limpieza y volver a `.is-visible` desde el estado computado actual.
- Si llega un nuevo mensaje mientras el toast ya está visible, actualizar texto y reiniciar los cuatro segundos sin repetir la entrada.
- Mantener el texto en el DOM durante la salida. Vaciarlo únicamente tras `transitionend` de `opacity` o un fallback de `190ms`.
- `clearPublicNotice()` debe seguir limpiando inmediatamente al entrar en rutas públicas; no debe dejar un aviso interno visible ni esperar la animación.
- Con reduced motion, quitar desplazamiento y escala, conservando un fundido de `160ms var(--motion-ease-color)` para aperturas/cierres normales. La limpieza de rutas públicas continúa siendo inmediata.

Patrón CSS objetivo:

```css
#notice {
  pointer-events: none;
  opacity: 0;
  transform: translateY(8px) scale(.98);
  transition: opacity 160ms var(--motion-ease-out), transform 160ms var(--motion-ease-out);
}

#notice.is-visible {
  opacity: 1;
  transform: none;
  transition-duration: 220ms;
}
```

`#notice:empty { display: none; }` puede mantenerse porque el texto solo se vaciará después de la salida.

## Repo conventions to follow

- Reutilizar `--motion-ease-out`, `--motion-ease-color` y las duraciones `160ms/220ms`; no crear tokens paralelos.
- Imitar el cierre cancelable de `closeMobileNavDialog()` en `app/app.js:1704-1728`: listener de fin, fallback y limpieza idempotente.
- Usar `motion.isMotionReduced()` para la preferencia de la aplicación y conservar selectores CSS equivalentes para sistema y `data-reduced-motion="on"`.
- Preservar `role="status"` y `aria-live="polite"`; la animación no debe causar anuncios duplicados.

## Steps

1. En `app/style.css`, añadir estado inicial, transición y `.is-visible` al `#notice`. Animar solo `transform` y `opacity`.
2. En `app/app.js`, separar la responsabilidad en `toast(text)`, un cierre visual normal y una limpieza inmediata. Mantener referencias a timer de permanencia, timer de fallback y listener activo para poder cancelarlos.
3. En `toast(text)`, cancelar cualquier salida pendiente, escribir el mensaje y añadir `.is-visible` en el siguiente frame solo si el aviso estaba vacío/oculto. Si ya estaba visible, cambiar únicamente el texto y reiniciar el temporizador de cuatro segundos.
4. En el cierre normal, retirar `.is-visible`, conservar el texto, esperar `transitionend` de `opacity` o `190ms`, y finalmente vaciar el nodo y limpiar listeners/timers.
5. Si llega otro `toast()` durante la salida, cancelar el vaciado pendiente y volver a `.is-visible`; el contenido nuevo nunca debe desaparecer por un callback antiguo.
6. Adaptar `clearPublicNotice()` para cancelar todos los timers/listeners, retirar `.is-visible` y vaciar el texto inmediatamente. Esto preserva el contrato probado para `#autoservicio` y `#pantalla-turnos`.
7. Añadir reglas tanto para `:root[data-reduced-motion="on"] #notice` como para `@media (prefers-reduced-motion: reduce)`: `transform: none !important` y transición exclusiva de opacidad de `160ms var(--motion-ease-color)`.
8. Extender `test_browser_functional.mjs` cerca de las comprobaciones de `#notice` y de limpieza pública (`2845-2871`) para cubrir entrada, salida diferida, sustitución durante salida y limpieza pública inmediata.

## Boundaries

- No crear una cola, múltiples toasts, botón de cierre ni gestos de arrastre.
- No cambiar el texto, los cuatro segundos de permanencia, el rol ARIA ni la posición responsive.
- No animar `bottom`, `right`, `left`, padding, sombra ni blur.
- No aplicar la salida animada a `clearPublicNotice()`; las rutas públicas requieren limpieza inmediata y ya tienen pruebas estrictas.
- No añadir dependencias.
- Si el nodo `#notice` deja de ser único o pierde `role="status"`, detenerse y reportar drift.

## Verification

- **Mechanical**: ejecutar `npm run check` y `npm test`; ambos deben terminar con código 0.
- **Feel check**: disparar una acción que muestre aviso; debe subir solo 8px, asentarse sin rebote, permanecer cuatro segundos y salir suavemente.
- Disparar dos avisos seguidos mientras está visible: el segundo no debe repetir la entrada. Disparar uno durante la salida: debe retomar desde la posición actual y permanecer visible cuatro segundos completos.
- A 10% de velocidad en DevTools, confirmar que el texto permanece hasta completar la salida y que solo cambian `transform` y `opacity`.
- Activar reduced motion desde Configuración y DevTools: no debe existir desplazamiento ni escala; debe conservarse únicamente el fundido.
- Navegar a `#autoservicio` y `#pantalla-turnos` con un aviso activo: `#notice` debe quedar vacío inmediatamente y `display: none` debe ser efectivo.
- **Done when**: no hay callbacks antiguos que borren mensajes nuevos, no hay avisos residuales en rutas públicas y el lector de pantalla anuncia cada texto una sola vez.

