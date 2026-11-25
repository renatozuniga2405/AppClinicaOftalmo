# 003 — Conservar feedback no espacial con movimiento reducido

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 archivo, 30–50 líneas

## Problem

Las reglas de reducción de movimiento eliminan indiscriminadamente todas las transiciones, incluidas color, fondo y borde. Eso retira feedback gradual que no desplaza contenido.

```css
/* app/style.css:5238 — current */
:root[data-reduced-motion="on"] .shell,
:root[data-reduced-motion="on"] .shell > aside,
:root[data-reduced-motion="on"] .cp-item,
:root[data-reduced-motion="on"] button,
:root[data-reduced-motion="on"] nav a,
:root[data-reduced-motion="on"] .theme-option,
:root[data-reduced-motion="on"] .choice-option {
  transition: none !important;
  animation: none !important;
}
```

## Target

Con reduced motion deben desaparecer traslaciones, escalados, giros, skeletons y entradas; las transiciones de `background-color`, `border-color`, `color`, `box-shadow` y `opacity` pueden permanecer en `160ms ease`. La paleta de comandos seguirá instantánea por el plan 002.

```css
/* target pattern */
@media (prefers-reduced-motion: reduce) {
  .shell, .shell > aside, .navgroup > summary i {
    animation: none !important;
    transition-property: none !important;
    transform: none !important;
  }
  .theme-option, .choice-option, nav a {
    animation: none !important;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
  }
}
```

## Repo conventions to follow

- Deben mantenerse dos vías equivalentes: `:root[data-reduced-motion="on"]` y `@media (prefers-reduced-motion: reduce)`.
- Las utilidades específicas de motion en `app/style.css:10145-10170` ya llevan contenido a su estado final; no duplicarlas.
- Las transformaciones de hover bajo reducción deben seguir anuladas.

## Steps

1. Separar en ambas secciones los elementos con movimiento espacial de los que solo cambian color/borde/opacidad.
2. Mantener `transition: none`, `animation: none` y `transform: none` para `.shell`, el chevron, entradas, skeletons y cualquier elemento que se desplace o escale.
3. Permitir únicamente color, fondo, borde, sombra u opacidad en `nav a`, `.theme-option`, `.choice-option` y botones sin transformación.
4. No reintroducir transición en `.cp-item`, porque el plan 002 exige selección instantánea.

## Boundaries

- No cambiar la preferencia guardada ni `isMotionReduced()`.
- No restaurar desplazamientos para usuarios con reduced motion.
- No usar selectores globales nuevos.

## Verification

- **Mechanical**: `npm run check` y `npm test`, ambos con código 0.
- **Feel check**: activar reducción desde Configuración y también desde DevTools. Cambiar tema y tamaño: fondo/borde deben conservar feedback sin movimiento. Contraer sidebar y abrir menús: no debe existir traslación, escala ni giro.
- **Done when**: DevTools muestra solo propiedades no espaciales en transición bajo ambas vías de reduced motion.

