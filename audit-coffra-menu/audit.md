# Auditoría del menú de Coffra aplicada a Clínica Oftalmológica

Fecha: 3 de noviembre de 2026.

## Paso 1 — Navegación principal compacta

Estado: saludable.

Evidencia: `01-rail-overview.png`.

- Coffra utiliza una barra fija de 76 px con accesos de 46 px.
- El módulo activo se distingue con una superficie verde de alto contraste.
- Todos los accesos tienen nombre accesible aunque el texto no esté visible.
- El contenido del menú tiene scroll propio y la cuenta permanece al final.
- Riesgo: los iconos sin una etiqueta visible dependen de tooltip, memoria o lector de pantalla.

## Paso 2 — Menú de cuenta

Estado: saludable con alcance limitado.

Evidencia: `02-account-menu.png`.

- El avatar abre un menú contextual sin abandonar el área de trabajo.
- Las acciones se agrupan por apariencia, perfil y sesión.
- El cierre y la interacción por teclado no pueden certificarse únicamente con la captura.

## Paso 3 — Respuesta móvil observada en estilos y DOM

Estado: saludable.

- Por debajo de 760 px, Coffra reemplaza la barra lateral por una barra inferior de cinco posiciones.
- Cuatro accesos son directos y el quinto control abre “Más”.
- Los objetivos táctiles tienen aproximadamente 54 px de alto.

## Decisión aplicada al proyecto

- Se conserva el menú agrupado de la clínica como modo expandido.
- El modo contraído muestra todos los módulos autorizados como una barra de iconos con etiquetas al pasar o enfocar.
- El módulo activo obtiene mayor contraste.
- En móvil, la barra lateral se sustituye por navegación inferior y un selector “Más”.
- Los enlaces siguen derivándose del rol activo; no se duplican ni amplían permisos.

## Límites

- No se copiaron activos, marca, tipografía ni lógica financiera de Coffra.
- No se certifica accesibilidad completa del sitio de referencia; solo se verificaron estructura visible, nombres accesibles, tamaños y estados capturados.
