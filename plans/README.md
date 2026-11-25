# Planes de mejora de animaciones

Planes de movimiento para Configuración, navegación, feedback operativo, drawers y kiosco. El workspace no contiene metadatos `.git`, por lo que todos los planes están estampados como `NO-GIT`.

| Nº | Plan | Severidad | Estado | Dependencias |
|---:|---|---|---|---|
| 001 | Restaurar la entrada de Configuración | MEDIUM | DONE | — |
| 002 | Hacer instantánea la selección del menú de comandos | HIGH | DONE | — |
| 003 | Conservar feedback no espacial con movimiento reducido | MEDIUM | DONE | 002 |
| 004 | Normalizar tokens de movimiento | LOW | DONE | — |
| 005 | Hacer perceptible y performante el colapso del sidebar | MEDIUM | DONE | 003, 004 |
| 006 | Añadir presión a las tarjetas de Preferencias | LOW | DONE | 003, 004 |
| 007 | Conectar espacialmente el menú del perfil | MEDIUM | DONE | 003, 004 |
| 008 | Revelar los banners de Configuración | LOW | DONE | 003, 004 |
| 009 | Conectar el panel móvil “Más módulos” | MEDIUM | DONE | 003, 004 |
| 010 | Unificar la entrada y salida de los drawers reales | MEDIUM | DONE | 003, 004 |
| 011 | Dar ciclo de vida a los avisos toast | MEDIUM | DONE | 003, 004 |
| 012 | Conectar espacialmente los pasos del kiosco | MEDIUM | DONE | 003, 004 |

## Orden recomendado

1. **001** y **002**: corrigen fallos deterministas y la interacción de mayor frecuencia.
2. **003** y **004**: establecen las reglas comunes de accesibilidad y tokens.
3. **005**: corrige el ciclo de vida del sidebar sin animar layout.
4. **007** y **009**: añaden movimiento espacial a popovers/paneles ocasionales.
5. **006** y **008**: pulido táctil y feedback de estado.
6. **010**: unifica primero el patrón de montaje/salida de los drawers de Agenda y CRM.
7. **011**: aplica el mismo principio de ciclo de vida cancelable al aviso global, preservando la limpieza inmediata de rutas públicas.
8. **012**: añade continuidad a los pasos del kiosco después de que los patrones de transición y reduced motion estén asentados.

## Regla de ejecución

Ejecutar un plan por vez. Después de cada plan, correr `npm run check` y `npm test`, realizar el feel check descrito y actualizar su estado a `DONE` únicamente cuando las comprobaciones mecánicas y visuales hayan sido observadas. Si el código difiere de los extractos actuales, detenerse y reportar drift en vez de improvisar.
