# 001 — Restaurar la entrada de Configuración

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Purpose & frequency
- **Estimated scope**: 1 archivo, menos de 10 líneas

## Problem

La entrada de Configuración se registra dos veces con la misma clave. La primera llamada consume `perfil:layout`; la segunda detecta que ya fue consumida y retorna sin animar.

```js
// app/app.js:1058 — current
if(motion.shouldAnimateModuleEntry('perfil','layout')){
  motion.animateModuleEntry('.profile-layout',{scope:'perfil',key:'layout',duration:240,distance:4});
}
```

```js
// app/motion.js:198 — current
if (!force && !shouldAnimateModuleEntry(scope, key)) {
  return null;
}
```

## Target

`animateModuleEntry()` debe ser la única responsable de comprobar y registrar la entrada. La pantalla debe entrar una sola vez por ámbito con `opacity: 0 → 1`, `translateY(4px) → 0`, `240ms` y el easing existente `cubic-bezier(0.16, 1, 0.3, 1)`.

```js
// target
motion.animateModuleEntry('.profile-layout', {
  scope: 'perfil',
  key: 'layout',
  duration: 240,
  distance: 4
});
```

## Repo conventions to follow

- El ciclo de vida y la cancelación viven en `app/motion.js:187-224`.
- La preferencia de movimiento reducido ya se resuelve dentro de `animateModuleEntry()`.
- No añadir una segunda comprobación en el consumidor.

## Steps

1. En `app/app.js`, sustituir el bloque de `app/app.js:1058-1060` por una llamada directa a `motion.animateModuleEntry()` con los valores indicados.
2. Buscar otros consumidores que envuelvan `animateModuleEntry()` con `shouldAnimateModuleEntry()`; corregir únicamente el encabezado general de `app/app.js:1620-1622` si se confirma el mismo defecto, sin ampliar el alcance a otras animaciones.
3. No cambiar `app/motion.js`: su control interno es la fuente de verdad correcta.

## Boundaries

- No cambiar el skeleton de carga ni las animaciones de métricas.
- No alterar el markup de Perfil o Preferencias.
- No añadir dependencias.
- Si las líneas citadas cambiaron, detenerse y reportar el drift.

## Reconciliación final

La entrada volvió a convivir con el skeleton general de módulos. `showModuleLoading()` se invoca para la ruta activa, salvo si el render comenzó con movimiento reducido. Su limpieza también es inmediata si esa preferencia se activa durante la carga, evitando dejar `aria-busy` temporalmente colgado aunque la aplicación vuelva a aplicar preferencias durante el cambio de ruta.

## Verification

- **Mechanical**: ejecutar `npm run check` y esperar código de salida 0; después `npm test` y esperar todas las suites aprobadas.
- **Feel check**: abrir `#perfil/preferencias` desde otra ruta y confirmar una única entrada de 240ms; cambiar opciones dentro de la página y comprobar que la entrada no se repite; volver a otra ruta y regresar para confirmar el comportamiento definido por el reseteo de ámbito. En DevTools a 10%, verificar que comienza a 4px y no hay salto final.
- **Reduced motion**: activar `prefers-reduced-motion` y confirmar aparición inmediata, opacidad 1 y transform `none`.
- **Done when**: la llamada devuelve una animación en la primera entrada y `null` en rerenders internos.

