# 006 — Añadir presión a las tarjetas de Preferencias

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: LOW
- **Category**: Physicality
- **Estimated scope**: 1 archivo, 15–25 líneas

## Problem

Las tarjetas seleccionables responden al hover y al estado final, pero no comunican el instante de presión.

```css
/* app/style.css:5048 y 5148 — current */
.theme-option { transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
.choice-option { transition: border-color .15s ease, background .15s ease; }
```

## Target

Durante `:active`, ambas tarjetas deben usar `transform: scale(0.97)` con `140ms cubic-bezier(0.23, 1, 0.32, 1)`. No debe existir movimiento con reduced motion.

```css
/* target */
.theme-option,
.choice-option {
  transition: transform 140ms var(--motion-ease-out), /* más propiedades existentes */;
}
.theme-option:active,
.choice-option:active { transform: scale(0.97); }
```

## Repo conventions to follow

- Usar el token `--motion-ease-out` del plan 004.
- Mantener intactos foco visible, checked e `is-selected`.

## Steps

1. Añadir `transform 140ms var(--motion-ease-out)` a las listas de transición de ambos selectores.
2. Añadir el selector combinado `:active` con `scale(0.97)`.
3. En ambas vías de reduced motion, anular el transform de estas tarjetas.

## Boundaries

- No añadir rebote, keyframes, elevación ni sonido.
- No cambiar el tamaño final ni el layout.
- No aplicar el efecto a tarjetas informativas.

## Verification

- **Mechanical**: `npm run check` y `npm test`.
- **Feel check**: mantener clic o toque sobre cada tipo de tarjeta; debe sentirse una presión corta, no un salto. A 10%, confirmar origen central y escala mínima 0.97.
- **Reduced motion**: `transform` debe permanecer `none`.
- **Done when**: mouse, touch y teclado conservan selección y foco; solo la presión directa escala.

