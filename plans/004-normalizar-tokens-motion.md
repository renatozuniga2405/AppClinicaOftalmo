# 004 — Normalizar tokens de movimiento

- **Status**: DONE
- **Commit**: NO-GIT (el workspace no contiene metadatos `.git`)
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 archivo, 20–35 líneas

## Problem

El repositorio define tokens globales, pero sidebar y preferencias escriben `.15s ease` y `.18s ease` directamente.

```css
/* app/style.css:51 — current */
--motion-duration-fast: 160ms;
--motion-duration-base: 260ms;
--motion-ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
--motion-ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
```

```css
/* app/style.css:5058 — current */
transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
```

## Target

Los cambios interactivos deben usar `var(--motion-duration-fast)` y un token explícito de color. Las nuevas entradas de popover deben usar la curva exacta de salida fuerte del catálogo.

```css
/* target tokens */
--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--motion-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--motion-ease-color: ease;
```

```css
/* target usage */
transition:
  border-color var(--motion-duration-fast) var(--motion-ease-color),
  background-color var(--motion-duration-fast) var(--motion-ease-color),
  box-shadow var(--motion-duration-fast) var(--motion-ease-color);
```

## Repo conventions to follow

- Todos los tokens viven en `:root`, junto a `app/style.css:51-61`.
- No eliminar tokens existentes: otros módulos ya dependen de ellos.
- Usar nombres `--motion-*`, no crear una segunda familia.

## Steps

1. Añadir los tres tokens objetivo junto a los tokens existentes.
2. Sustituir valores locales solo en `.shell`, `.shell > aside`, `.sidebar-search-btn`, `.navgroup > summary`, `.navgroup > summary i`, `nav a`, `.theme-option` y `.choice-option`.
3. Para color/fondo/borde usar `--motion-ease-color`; para movimiento en pantalla usar `--motion-ease-in-out`; para entradas usar `--motion-ease-out`.
4. No tocar la paleta `.cp-item`, que debe permanecer instantánea.

## Boundaries

- No hacer un reemplazo global de todas las duraciones del archivo.
- No modificar animaciones de Automations, CRM, Turnos o ARM.
- No cambiar colores ni sombras finales.

## Verification

- **Mechanical**: `npm run check`; `npm test`; buscar con `rg -n "\.15s ease|\.18s ease" app/style.css` y confirmar que no quedan coincidencias dentro de los selectores enumerados.
- **Feel check**: comparar sidebar y Preferencias antes/después a 10%; la respuesta debe seguir siendo sobria y sin rebote.
- **Done when**: los selectores en alcance solo referencian tokens globales.

