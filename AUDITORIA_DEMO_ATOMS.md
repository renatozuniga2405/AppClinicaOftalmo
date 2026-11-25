# Auditoría comparativa · Demo Atoms vs. prototipo local

Fecha: 27 de octubre de 2026. Alcance: experiencia de Recepción en Panel general, Agenda, Pacientes, ficha de paciente y CRM. Evidencia capturada en navegador durante esta revisión; no se modificaron datos del demo.

## Veredicto

Conviene adoptar la identidad visual de Vista Clara, pero no copiar su arquitectura funcional ni sus permisos. El demo remoto tiene una presentación más coherente y madura; el prototipo local conserva reglas operativas más seguras para Recepción, Caja y trazabilidad.

## Recorrido auditado

1. **Panel general — visualmente fuerte, funcionalmente fuera de alcance.** Buena jerarquía, banner editorial, métricas y accesos rápidos. Sin embargo, expone pendientes de caja, cola de estudios y disponibilidad médica al rol Recepción. El resumen administrativo y Caja se habían separado expresamente.
2. **Agenda — sólida como patrón visual, riesgosa como modelo de permisos.** La línea de tiempo, filtros, duración, profesional y estados se leen mejor que la tabla local. El menú permite a Recepción marcar atendida, registrar inasistencia, pasar a espera y eliminar citas. Debe conservarse la regla local: llegada, orden de pago, espera solo con pago completo, y reprogramación/cancelación con historial; nunca borrado destructivo.
3. **Pacientes — tabla clara, datos inconsistentes.** La estructura de búsqueda, métricas y filas es reutilizable. `Edwin Huanca` aparece tres veces con los mismos datos, evidencia de duplicación. Falta un control de identidad equivalente a la validación de DNI del prototipo local.
4. **Ficha de paciente — buena composición, exceso de información para Recepción.** La cabecera, próxima cita, historial y contacto son buenos patrones. Antecedentes clínicos, estudios, resumen financiero y pestaña Cobros no corresponden a Recepción. Deben ocultarse por rol; el pago solo puede mostrarse como estado operativo, no como caja o balance.
5. **CRM — buen tablero comercial, detalle insuficiente.** El Kanban, origen, fecha y responsable mejoran la lectura. El detalle es un formulario modal y no incluye conversación, historial de actividades ni panel persistente. Tampoco se observó administración de columnas. El CRM local ya cubre esos puntos y protege `Cita agendada` hasta guardar una reserva válida.

## Lenguaje visual que sí conviene adaptar

- Fondo marfil cálido y superficies blancas, con verde bosque profundo como color principal.
- Titulares serif editoriales combinados con sans serif neutral para datos y controles.
- Etiquetas en mayúsculas con espaciado amplio; números grandes y compactos.
- Sidebar verde con patrón orbital sutil, indicador vertical ámbar y navegación más respirada.
- Tarjetas con borde fino, radio medio y casi sin sombra.
- Botones principales verde oscuro, botones secundarios blancos y estados en píldoras suaves.
- Agenda como lista cronológica: hora, duración, avatar, paciente, servicio, profesional y motivo.
- Iconografía consistente de una biblioteca real; eliminar símbolos Unicode improvisados.

## Qué conservar del prototipo local

- Menú de Recepción limitado a Agenda, Pacientes y Seguimiento.
- Caja como módulo separado.
- Desactivación/reactivación de pacientes conservando registros.
- Cancelación y reprogramación con historial; las citas no se eliminan.
- Pago intacto y paso a espera condicionado al pago completo.
- CRM con contactos no pacientes, conversión controlada, conversación ficticia, próxima acción, actividades, panel lateral y columnas editables.
- Mensajes honestos de demostración, sin afirmar tiempo real, autenticación o persistencia inexistentes.

## Brechas para adaptar el estilo

1. Crear tokens nuevos para marfil, verde bosque, ámbar y tipografía editorial, actualizando `DESIGN.md` y `app/style.css` juntos.
2. Sustituir iconos de texto por una biblioteca coherente.
3. Rediseñar shell, sidebar, encabezados, tarjetas de métricas y estados sin cambiar permisos.
4. Convertir Agenda a línea de tiempo preservando las acciones locales verificadas.
5. Revestir Pacientes y su ficha con el nuevo lenguaje, excluyendo antecedentes, estudios y caja para Recepción.
6. Aplicar el acabado visual al CRM local, conservando el panel lateral y la configuración de columnas que el demo no ofrece.
7. Probar reflujo móvil, teclado, foco, contraste y zoom antes de considerar terminada la migración.

## Límites de evidencia

Las pantallas y controles visibles fueron inspeccionados en navegador. No se comprobó el backend, la persistencia, la sincronización multiusuario ni permisos reales del demo. Las frases “tiempo real” y “guardado en base de datos” son copy de interfaz, no evidencia técnica.
