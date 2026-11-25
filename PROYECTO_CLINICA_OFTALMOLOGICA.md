# Sistema de gestión para clínica oftalmológica

## Documento maestro del proyecto

Este archivo consolida las decisiones funcionales, visuales y técnicas tomadas durante el diseño de la aplicación web para una clínica oftalmológica. Su propósito es servir como fuente de referencia para continuar el prototipo, preparar el desarrollo y evitar que se pierdan acuerdos ya aprobados.

> Estado del proyecto: definición funcional avanzada y prototipo visual parcial en Figma. La última modificación solicitada —menú lateral contraíble y perfil del usuario en la esquina inferior izquierda— está definida, pero todavía no fue aplicada en Figma debido al límite de llamadas MCP del plan Starter.

---

## 1. Visión del producto

Construir una aplicación web moderna, amigable y fácil de entender para administrar la operación completa de una clínica oftalmológica de una sola sede.

La aplicación debe conectar en un mismo sistema:

- Captación y seguimiento de posibles pacientes.
- Conversaciones de WhatsApp.
- Agenda y reserva de citas.
- Registro y mantenimiento de pacientes.
- Disponibilidad de profesionales.
- Llegada del paciente y orden de pago.
- Cobro completo previo a la atención.
- Exámenes previos.
- Consulta médica, diagnóstico e indicaciones.
- Seguimientos y controles recomendados.
- Supervisión administrativa mediante indicadores.

La prioridad es reducir la doble digitación y mantener trazabilidad desde la primera conversación hasta la cita, el pago y la atención clínica.

## 2. Alcance vigente

### Incluido en la primera versión

- Una sola sede.
- Gestión de usuarios, roles y permisos.
- Agenda y citas.
- Profesionales y disponibilidad.
- Pacientes.
- Exámenes de la cita actual.
- Consulta médica.
- Caja interna.
- Dashboard administrativo.
- CRM de seguimiento.
- Conversaciones de WhatsApp integradas mediante Meta.
- Recordatorios y seguimiento de controles.
- Documentos internos de orden de pago, constancia de pago e indicaciones.

### Fuera de la primera versión

- Múltiples sedes.
- Facturación tributaria electrónica.
- Integración contable formal.
- Telefonía integrada.
- Importación automática de conversaciones históricas de WhatsApp.
- Agente automático funcional dentro del CRM.
- Diagnóstico automático por inteligencia artificial.
- Notas internas del equipo dentro de la consulta médica.

### Naturaleza y límites del prototipo demostrativo actual

El software disponible en este repositorio corresponde a un **prototipo demostrativo local** de interfaz de usuario:
- El código de verificación OTP es simulado (se muestra en pantalla para fines de prueba, sin envío de correos reales).
- Los roles y permisos son una demostración visual gestionada en cliente mediante JavaScript y `sessionStorage`.
- Todos los datos se almacenan exclusivamente en memoria volátil del navegador; recargar restablece los datos iniciales.
- No existe backend ni base de datos.
- No existe facturación electrónica ni integración con SUNAT; se emplean únicamente órdenes internas de pago (`OP-XXXX`) y constancias internas de pago (`CP-XXXX`).
- No existe integración real con WhatsApp; las conversaciones son maquetas ilustrativas.
- Está prohibido ingresar datos reales de pacientes o personal.
- La validación normativa y de credenciales (MINSA, SUSALUD, CMP, RNE) corresponde a una fase de desarrollo posterior.

## 3. Roles del sistema

### 3.1 Administrador

Responsabilidades:

- Ver el dashboard y los indicadores generales.
- Gestionar usuarios, roles y permisos.
- Gestionar profesionales, servicios, tarifas y disponibilidad.
- Configurar columnas y reglas del CRM.
- Supervisar Caja y autorizar correcciones sensibles.
- Configurar integraciones con Meta y WhatsApp Business Platform.
- Configurar, en el futuro, las reglas del agente del CRM.

Restricción importante:

- Ser administrador no concede permiso para editar diagnósticos, resultados o historia clínica. En Atención médica cuenta únicamente con una **vista de supervisión de solo lectura**: campos clínicos bloqueados (`disabled readonly`), no figura como médico tratante y no puede guardar ni finalizar consultas clínicas.

### 3.2 Recepción

Responsabilidades:

- Atender conversaciones y seguimientos del CRM.
- Buscar y mantener pacientes.
- Reservar, confirmar, reprogramar o cancelar citas.
- Registrar la llegada del paciente.
- Emitir una orden interna de pago.
- Verificar que el pago esté completo antes de derivar al paciente a atención.

No debe acceder a información clínica que no sea necesaria para su trabajo. Su panel general es estrictamente operativo (sin cobros de caja ni cola de estudios).

### 3.3 Médico

Responsabilidades:

- Ver los datos necesarios del paciente en Modo consulta.
- En Agenda accede a su vista específica **“Mi agenda médica”**, donde visualiza únicamente sus citas asignadas, sin botón de nueva cita ni acciones de recepción (confirmar, cancelar, reprogramar, registrar llegada o pasar a espera).
- Revisar los resultados cargados por el técnico en la cita actual.
- Consultar antecedentes clínicos permitidos.
- Registrar diagnóstico, plan, tratamiento e indicaciones.
- Emitir recetas u órdenes cuando corresponda.
- Sugerir una próxima cita o control.
- Generar un documento sencillo de indicaciones para el paciente.
- Cerrar y finalizar la atención médica.

No se incluyeron notas internas para el equipo porque se decidió dejarlas fuera.

### 3.4 Técnico u optometrista

Responsabilidades:

- Acceder a la cola de estudios oftalmológicos.
- Registrar mediciones, pruebas y notas técnicas.
- Consultar la ficha del paciente únicamente en Modo consulta (sin editar datos administrativos ni reservar citas).

Restricción importante:

- No puede navegar por toda la historia clínica.
- No emite el diagnóstico final.

### 3.5 Caja

Caja es un rol independiente de Recepción.

Responsabilidades:

- Acceder exclusivamente a `#caja` y sus subsecciones internas (`#caja/por-cobrar`, `#caja/movimientos`, `#caja/cuadre`).
- Ver atenciones pendientes de cobro con datos mínimos indispensables (nombre, DNI, orden, servicio, importe).
- Buscar una orden por número de referencia o datos básicos del paciente.
- Registrar el pago completo con cálculo reactivo de vuelto para efectivo.
- Seleccionar el medio de pago.
- Emitir e imprimir una orden interna de pago (`OP-XXXX`) o constancia interna de pago (`CP-XXXX`), sin enlace al expediente completo del paciente.
- Consultar movimientos y arqueo/cuadre de caja por medio de cobro.

Restricciones:

- Redirección automática a `#caja` si intenta abrir `#pacientes`, `#pacientes/:id`, `#agenda`, `#crm`, `#consulta`, `#estudios` o `#admin-*`.
- No accede a diagnósticos, exámenes, resultados, recetas ni historia clínica.
- No ve ni modifica dirección, correo, póliza, contacto de auxilio ni historial completo del paciente.
- Sólo ve paciente, cita, servicio, importe, pagos, saldo y datos necesarios para cobrar.
- Las correcciones sensibles requieren autorización administrativa.

## 4. Módulos funcionales

### 4.1 Autenticación, usuarios y permisos

- Inicio y cierre de sesión.
- Usuarios individuales para cada trabajador.
- Roles base y permisos adicionales.
- Estado activo o inactivo de la cuenta.
- Auditoría de acciones sensibles.
- Separación entre permisos operativos, administrativos y clínicos.

### 4.2 Dashboard administrativo

Visible únicamente para el administrador en la primera versión.

Indicadores previstos:

- Citas del día por estado.
- Pacientes que llegaron y están en espera.
- Atenciones completadas.
- Cancelaciones e inasistencias.
- Porcentaje de ocupación de agenda.
- Ocupación por profesional.
- Controles sugeridos todavía no reservados.
- Total cobrado por día o periodo.
- Importe pendiente de cobro.
- Devoluciones o anulaciones internas.
- Cobros por servicio o profesional.
- Seguimientos pendientes y concretados.

Regla: una cita reservada no equivale a dinero cobrado. Agenda y Caja deben medirse por separado.

### 4.3 Agenda y citas

Datos mínimos de una reserva:

- Paciente.
- Teléfono o correo de contacto.
- Fecha y hora.
- Profesional asignado.
- Servicio o tipo de consulta.
- Motivo breve.
- Primera consulta o control.
- Nota operativa opcional.

Estados iniciales de la cita:

- Programada.
- Confirmada.
- Llegó.
- En espera.
- Atendida.
- Cancelada.
- Inasistencia.

La agenda sólo debe mostrar espacios válidos según horarios, ausencias, bloqueos y citas existentes.

### 4.4 Profesionales y disponibilidad

El administrador podrá:

- Registrar y editar profesionales.
- Definir especialidad.
- Asociar servicios.
- Activar o desactivar al profesional.
- Configurar días de atención.
- Configurar horarios por día.
- Definir duración de las citas.
- Registrar vacaciones, ausencias y cambios puntuales.

Si se modifica un horario que ya tiene citas, el sistema debe advertir el conflicto y permitir resolverlo sin perder reservas.

### 4.5 Pacientes

Recepción podrá:

- Listar pacientes.
- Buscar por nombre, documento o teléfono.
- Consultar la ficha básica.
- Registrar un paciente.
- Editar sus datos.
- Eliminar o desactivar.
- Consultar citas programadas y anteriores sin exponer información clínica restringida.
- Registrar y editar dirección, seguro o cobertura, número de póliza y contacto de emergencia.

Reglas:

- El documento debe validarse para evitar duplicados.
- Si el paciente tiene citas, pagos u otros registros vinculados, no se elimina físicamente: se desactiva para preservar la trazabilidad.
- Los antecedentes oftalmológicos, alergias, diagnósticos y resultados forman parte del expediente clínico y no son editables desde Recepción.

### 4.6 Exámenes previos

- El técnico abre la cita actual.
- Registra mediciones y pruebas.
- Agrega notas técnicas.
- Adjunta archivos cuando corresponda.
- El médico puede revisar esos resultados desde la consulta.

### 4.7 Consulta médica

- Datos esenciales del paciente.
- Resultados de la cita actual.
- Antecedentes relevantes permitidos.
- Diagnóstico.
- Plan o tratamiento.
- Indicaciones.
- Receta u orden, cuando corresponda.
- Sugerencia de próxima cita o control.
- Documento sencillo de indicaciones para el paciente.
- Cierre de la atención.

### 4.8 Caja interna

Pantallas mínimas:

1. Atenciones por cobrar.
2. Registrar pago.
3. Movimientos de caja.
4. Apertura y cierre.

La primera versión utiliza registro interno; no emite comprobantes tributarios.

Decisión vigente sobre pagos:

- Se exige pago completo antes de pasar a la atención.
- No se permiten pagos parciales en la primera versión.
- El saldo debe quedar en cero para habilitar el siguiente paso.

### 4.9 CRM y WhatsApp

El CRM centraliza conversaciones y seguimientos de pacientes o posibles pacientes.

La bandeja debe mostrar:

- Conversaciones de WhatsApp enviadas y recibidas.
- Recordatorios automáticos.
- Mensajes manuales de Recepción.
- Estado del mensaje: pendiente, enviado, entregado, leído o fallido.
- Responsable actual: humano o, en una fase futura, agente.
- Motivo del seguimiento.
- Próxima acción y fecha.
- Historial de cambios y contactos.

Las llamadas quedan fuera de la integración inicial; si se realizan, se pueden registrar manualmente como actividad.

## 5. Tablero Kanban del CRM

Actualización autorizada el 27 de octubre de 2026: Recepción también puede crear, renombrar, reordenar, cambiar color y retirar columnas. Se mantienen las reglas de traslado de tarjetas e identificadores estables. El CRM incluye contactos aún no registrados como pacientes; deben vincularse o registrarse antes de guardar una reserva. La implementación local es una demostración en memoria, sin WhatsApp conectado.

Columnas iniciales aprobadas:

1. Nueva conversación.
2. En atención.
3. Pendiente de agendar.
4. Cita agendada.
5. Cerrado sin cita.

El administrador podrá:

- Crear columnas.
- Renombrarlas.
- Reordenarlas.
- Cambiar su color.
- Retirarlas.

Reglas críticas:

- Si una columna contiene tarjetas, antes de retirarla se debe elegir otra columna de destino.
- El sistema conserva el historial de movimientos.
- Las automatizaciones se enlazan con identificadores internos, no con el nombre visible de la columna.
- Decir “quiero una cita” no crea una reserva.
- Una tarjeta pasa automáticamente a “Cita agendada” únicamente después de confirmar y guardar una cita real.
- Una misma persona puede tener varios seguimientos en diferentes momentos sin duplicar su ficha de paciente.

## 6. Integración con Meta y WhatsApp

La integración correcta es con Meta para activar WhatsApp Business Platform; no se trata de integrar Facebook Messenger.

Pantalla administrativa prevista:

- Autorizar la cuenta de Meta.
- Seleccionar la cuenta de WhatsApp Business.
- Vincular el número de la clínica.
- Ver el estado de la conexión.
- Probar envío y recepción con un contacto autorizado.
- Gestionar plantillas de mensajes.
- Consultar el estado de aprobación de las plantillas.
- Configurar reglas de envío.
- Consultar errores y fallos.

Reglas de mensajería:

- Obtener el consentimiento del paciente.
- Usar plantillas aprobadas cuando la empresa inicia una conversación fuera de la ventana permitida.
- No enviar diagnósticos ni resultados clínicos sensibles por recordatorios automáticos.
- “Entregado” o “leído” no significa que una cita esté confirmada.
- Las conversaciones históricas no se importan automáticamente; el historial comienza desde la activación de la integración.

## 7. Recordatorios y seguimiento de controles

Modelo combinado aprobado:

- Los recordatorios de citas salen automáticamente.
- Recepción dispone de una bandeja con confirmaciones, no respuestas y fallos.
- Recepción puede intervenir manualmente sin duplicar mensajes.
- Si una cita se cancela o reprograma, los recordatorios se actualizan.
- Los controles sugeridos se revisan antes de contactar al paciente.
- Cuando el paciente reserva, el seguimiento correspondiente se cierra o actualiza automáticamente.

Este módulo es uno de los principales valores agregados del producto porque busca reducir inasistencias y recuperar controles pendientes.

## 8. Agente del CRM — demostración futura

Se diseñó únicamente como demostración visual; todavía no debe responder ni actuar de forma real.

Comportamiento futuro previsto:

- El administrador define en qué etapas o conversaciones puede participar el agente.
- Cada conversación indica si la atiende un humano o el agente.
- Si Recepción toma la conversación, el agente se pausa para evitar respuestas dobles.
- Si el paciente pide atención humana, se deriva a Recepción.
- El agente sólo vuelve a intervenir cuando una persona lo habilita.
- Los recordatorios automáticos se mantienen separados del agente conversacional.

## 9. Flujos principales

### 9.1 Conversación de WhatsApp a cita

1. Ingresa una conversación nueva.
2. Recepción identifica o registra al contacto.
3. La tarjeta avanza por el Kanban.
4. El paciente manifiesta interés y pasa a “Pendiente de agendar”.
5. Recepción pulsa “Agendar cita”.
6. El formulario abre con el paciente vinculado.
7. Se eligen servicio, profesional, fecha y horario.
8. Al pulsar “Confirmar reserva”, el servidor valida nuevamente la disponibilidad.
9. Si la operación se guarda correctamente, se crea la cita y la tarjeta pasa a “Cita agendada”.

### 9.2 Conflicto entre dos recepcionistas

1. Dos recepcionistas visualizan el mismo horario como disponible.
2. La primera confirma y guarda la reserva.
3. La segunda intenta confirmar el mismo intervalo.
4. El servidor detecta que el horario ya fue ocupado.
5. La segunda reserva no se guarda.
6. Se muestra un aviso claro y se conservan los datos para elegir otro horario.

La validación debe realizarse en el servidor y reforzarse con una restricción transaccional; comprobar el horario sólo al abrir el formulario no es suficiente.

### 9.3 Llegada, orden de pago y atención

1. El paciente llega a Recepción.
2. Recepción confirma la cita y registra la llegada.
3. Recepción genera una orden interna de pago con referencia, paciente, servicio e importe.
4. La orden queda como “Pendiente de pago”.
5. El paciente se dirige a Caja.
6. Caja busca la orden y cobra el total.
7. Caja registra medio de pago y confirma el cobro.
8. Caja emite una constancia interna con estado “Pagado”.
9. Recepción verifica el saldo en cero.
10. El paciente pasa a exámenes previos o a espera de consulta.

Estados separados:

- Estado de atención: llegó, en espera, atendida, etc.
- Estado de pago: pendiente o pagado.

El pago no marca la consulta como atendida; solamente habilita el avance del paciente.

### 9.4 Atención clínica

1. El técnico abre la cita actual y carga los exámenes.
2. El médico revisa esos resultados y los antecedentes permitidos.
3. Registra diagnóstico, tratamiento e indicaciones.
4. Puede recomendar un próximo control.
5. Genera el documento de indicaciones.
6. Cierra la atención.

## 10. Documentos e impresión

### Orden de pago

- Se genera en Recepción.
- Incluye referencia, paciente, cita, servicio, importe y estado pendiente.
- Cuenta con acción “Imprimir orden”.
- La vista de impresión no muestra botones ni controles de la aplicación.

### Constancia de pago

- Se genera en Caja después del cobro completo.
- Incluye referencia, importe, medio de pago, fecha y estado pagado.
- Cuenta con acción “Imprimir constancia”.
- Es un documento interno, no un comprobante tributario.

### Documento de indicaciones

- Se genera al cerrar la consulta médica.
- Presenta las indicaciones destinadas al paciente.

### Ticket térmico de autoservicio (80 mm) y comportamiento de impresión

- Se emite en el punto táctil de autoservicio (`#autoservicio`) para organizar las colas presenciales de Recepción y Caja.
- Incluye el formato térmico monocromático de 80 mm (72 mm útiles) con hoja de estilo `@media print` dedicada, aislando el contenido del ticket y ocultando la interfaz del terminal, cabeceras, botones y notas.
- En el entorno de navegador web, la emisión invoca `window.print()`, lo que abre el diálogo nativo de impresión del sistema operativo.
- El frontend no puede verificar si el papel salió físicamente, si la impresora está en línea o si el usuario canceló la impresión. Por ello, la interfaz adopta una máquina de estados honesta (`idle`, `requesting`, `requested`, `error`), indicando con veracidad que la impresión fue solicitada y ofreciendo la opción de reintentar sin duplicar el turno.
- La impresión silenciosa y desatendida en un kiosco físico de producción requiere configurar el navegador del terminal con flags dedicadas (ej. `--kiosk-printing` en navegadores basados en Chromium) o integrar controladores y servicios locales de impresión térmica.

## 11. Diseño visual aprobado

Dirección visual:

- Moderna.
- Amigable.
- Clara para usuarios no técnicos.
- Detallada sin resultar confusa.
- Con acciones y estados fáciles de reconocer.

Paleta base:

- Azul profundo para navegación y títulos.
- Verde petróleo para acciones principales.
- Blanco para tarjetas y superficies principales.
- Gris azulado claro para el fondo general.
- Rojo reservado para errores y acciones destructivas.
- Los estados se identifican mediante texto y color, no sólo con color.

## 12. Menú y perfil del usuario

### Diseño acordado

- Menú lateral común para todos los roles.
- Botón en la parte superior para contraer o expandir el menú.
- Al contraerse, el menú no desaparece: conserva los iconos.
- El acceso al perfil permanece en la esquina inferior izquierda, siguiendo un patrón similar al de ChatGPT.
- El menú de perfil se abre hacia arriba.

Opciones del menú de perfil:

- Mi perfil.
- Cambiar contraseña.
- Cerrar sesión.

Campos editables por el propio usuario:

- Foto.
- Nombre de uso.
- Teléfono de contacto.

Acción separada:

- Cambiar contraseña, solicitando contraseña actual y nueva contraseña.

Campos administrados únicamente por Administración:

- Nombre oficial.
- Correo de acceso.
- Rol.
- Permisos.
- Estado de la cuenta.

Estado de este cambio:

- Debe aplicarse en todas las cartillas que tienen menú lateral.
- Las vistas limpias de documentos e impresión no deben incorporar el menú.
- La propuesta está preparada, pero Figma todavía conserva el menú anterior porque el límite del plan Starter bloqueó los intentos de guardado.

## 13. Cartillas y pantallas del prototipo

### Recepción

Orden vigente del bloque principal:

1. `01 · Recepción · Menú y CRM`.
2. `02 · Recepción · CRM y WhatsApp`.
3. `03 · Recepción · Reservar cita`.
4. `04 · Recepción · Horario no disponible`.
5. `05 · Recepción · Agenda y citas`.

Complementos del flujo de recepción:

- `05A · Documento orden de pago`.
- `05B · Impresión de la orden de pago`.
- `05C · Pago confirmado en recepción`.
- `05D · Recepción · Pacientes`.
- `05E · Pacientes · Registrar`.
- `05F · Pacientes · Editar ficha`.
- `05G · Pacientes · Eliminar o desactivar`.

### Administración

- `06 · Administración · Menú y opciones`.
- `07 · Administración · Integración de WhatsApp`.
- `08 · Administración · Agente del CRM`.

El mapa administrativo coloca Supervisión antes de Operación y Dashboard como primera opción.

### Caja

- `09 · Caja · Atenciones por cobrar`.
- `10 · Caja · Registrar pago`.
- `11 · Caja · Movimientos`.
- `12 · Caja · Apertura y cierre`.

## 14. Reglas de datos y consistencia

- La base transaccional es la fuente de verdad para citas, pagos y atenciones.
- Las citas se guardan únicamente después de validar profesional, intervalo y estado activo.
- Debe existir una restricción que impida reservar dos veces el mismo intervalo del profesional.
- Confirmación de cita, cobro y envío deben admitir claves idempotentes para evitar duplicados por reintentos.
- Cada cambio sensible conserva usuario, rol, fecha, estado anterior y estado nuevo.
- El envío de WhatsApp puede ser eventual; una falla de mensajería no anula la cita.
- Las sugerencias de control no se convierten automáticamente en reservas.
- Los registros clínicos y financieros vinculados no se eliminan físicamente sin una política explícita de retención.

## 15. Seguridad y privacidad

- Cuenta individual para cada trabajador.
- Principio de mínimo privilegio.
- Separación de permisos clínicos y administrativos.
- Caja sin acceso clínico.
- Técnico limitado a la cita actual.
- Recepción limitada a información operativa.
- Auditoría de modificaciones sensibles.
- Credenciales de Meta y otros proveedores almacenadas fuera del código.
- No registrar secretos, contraseñas ni contenido clínico sensible en logs técnicos.
- Copias de seguridad y restauración verificadas antes de producción.

## 16. Hitos recomendados de implementación

### M1 — Núcleo operativo

- Autenticación.
- Usuarios y permisos básicos.
- Pacientes.
- Profesionales y disponibilidad.
- Agenda y citas.
- Validación concurrente contra doble reserva.

### M2 — Llegada y Caja

- Registro de llegada.
- Orden de pago.
- Cobro completo.
- Constancia interna.
- Impresión.
- Movimientos, apertura y cierre.
- Habilitación de atención sólo con saldo cero.

### M3 — Flujo clínico

- Exámenes previos.
- Consulta médica.
- Diagnóstico, tratamiento e indicaciones.
- Documento para el paciente.
- Control sugerido.

### M4 — CRM e integraciones

- Tablero Kanban.
- Conversaciones de WhatsApp.
- Integración con Meta.
- Recordatorios.
- Seguimientos de controles.
- Dashboard administrativo.
- Gestión de fallos de mensajería.

## 17. Preguntas todavía abiertas

- Campos oftalmológicos exactos que deben registrar técnico y médico.
- Servicios iniciales y tarifas.
- Medios de pago permitidos.
- Política de descuentos, anulaciones y devoluciones.
- Formato definitivo de orden, constancia e indicaciones.
- Plazos de retención de datos clínicos, financieros y conversaciones.
- Frecuencia exacta de recordatorios.
- Indicadores obligatorios del primer dashboard.
- Proveedor de infraestructura y base de datos.
- Momento de incorporar facturación electrónica.
- Alcance y controles del agente del CRM cuando deje de ser demostración.

## 18. Estado de Figma y continuidad

Archivo de Figma:

- ID: `3Q86bQ06My3BhRYCQAnX8W`.
- Enlace: <https://www.figma.com/design/3Q86bQ06My3BhRYCQAnX8W?node-id=50-333>

Estado comprobado:

- El archivo contiene las cartillas de Recepción, Administración, Caja y Pacientes descritas arriba.
- El cambio del menú contraíble y perfil inferior fue preparado para 17 pantallas.
- Dos intentos de actualización fueron rechazados por el límite MCP del plan Starter.
- No se debe afirmar que ese último cambio está guardado en Figma.

Error recibido:

```text
You've reached the Figma MCP tool call limit on the Starter plan.
```

Archivo local preparado para reintentar:

- `work/figma-navigation-profile-pending.js`.

Procedimiento para retomar:

1. Confirmar que el límite MCP de Figma se haya restablecido o que el plan permita nuevas llamadas.
2. Revisar que el archivo y las 17 cartillas sigan disponibles.
3. Ejecutar la actualización preparada.
4. Confirmar que Figma guardó realmente los cambios.
5. Revisar visualmente menú expandido, menú contraído y perfil inferior.
6. Verificar enlaces del prototipo y que las vistas de impresión permanezcan limpias.

La recomendación planteada para continuar con mayor capacidad fue Figma Professional con un puesto Full para el usuario editor. Los límites y precios deben volver a verificarse antes de contratar.

## 19. Google Stitch

Se evaluó como alternativa, pero no se configuró.

- Puede utilizarse para generar interfaces y prototipos.
- Existe una vía de conexión mediante MCP.
- No quedó conectado en este entorno.
- No se verificó que pueda migrar de forma idéntica todas las capas, componentes y enlaces del archivo de Figma.
- Si se retoma esta alternativa, se debe probar primero una sola pantalla: Pacientes con menú contraíble y perfil inferior.

La decisión actual es esperar a Figma y continuar desde el último cambio pendiente.

## 20. Artefactos disponibles

- Documento de diseño del sistema: `work/system-design-doc/Clinica_Oftalmologica_Diseno_de_Sistema.docx`.
- Diagrama de arquitectura: `work/system-design-doc/arquitectura-clinica-oftalmologica.png`.
- Generador del documento: `work/system-design-doc/build_system_design.py`.
- Actualización pendiente de Figma: `work/figma-navigation-profile-pending.js`.
- Archivos de estado y evidencia del prototipo: `work/clinic-figma-*.json`.

## 21. Regla para continuar el proyecto

El próximo trabajo en Figma debe comenzar exactamente por el cambio pendiente:

1. Aplicar el botón superior de contraer o expandir el menú lateral.
2. Mantener iconos visibles cuando el menú esté contraído.
3. Añadir el perfil del usuario abajo a la izquierda.
4. Incorporar “Mi perfil”, “Cambiar contraseña” y “Cerrar sesión”.
5. Aplicar el patrón a todas las cartillas con menú, sin alterar las vistas limpias de impresión.

Después de completar y verificar ese cambio, se podrá continuar con las pantallas todavía no detalladas o iniciar la preparación del desarrollo funcional.
