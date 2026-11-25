# Contrato de Interacción y Experiencia de Usuario (UX Contract)

## 1. Evidencia de Negocio y Propósito del Prototipo
Prototipo demostrativo local de interfaz para clínica oftalmológica enfocado en la validación visual y funcional de roles y flujos operacionales. Este hito es puramente demostrativo en memoria y `sessionStorage`, sin backend, sin base de datos y sin facturación electrónica. No se deben ingresar datos reales personales ni clínicos.

---

## 2. Canonical UI Map

| Capacidad | Propietario | Decisión de Diseño | Verificación |
|---|---|---|---|
| **Select/Listbox** | HTML select en `app/app.js` | Nativo del sistema para accesibilidad y coherencia | Verificación funcional en pruebas |
| **Date Input** | HTML input date en `app/app.js` | Selector nativo de fecha, centrado en fecha demo `2026-10-27` | Verificación en controles de Agenda y CRM |
| **Formularios y Validación** | Funciones `field` y formularios nativos | Validación explícita en cliente, `novalidate`, foco inmediato en el primer campo erróneo | Validación de DNI único, fechas y montos de cobro |
| **Scrollbar** | CSS en `app/style.css` | Tokenizado, visible en fondos oscuros y claros | Verificación estática |
| **Notificaciones / Toast** | Función `toast` y `#notice` | Contenedor vivo no bloqueante con autocierre a 4s | Verificación en transiciones de ruta y guardado |
| **Modales de Diálogo** | Función `openModal` y `<dialog id="modal">` | Elemento dialog nativo con `showModal()`, cierre con tecla Escape y clic en backdrop | Verificación en formularios y constancias |
| **Almacenamiento y Estado** | Variables en memoria y `sessionStorage` | Estado volátil de demostración; recargar la pestaña restaura los datos iniciales | Verificación en recarga |

---

## 3. Matriz de Flujos y Restricciones por Rol

### 3.1. Panel General de Recepción (`#dashboard`)
- **Alcance Operativo:** Muestra únicamente la siguiente cita del día, citas de hoy, pendientes de confirmar, pacientes que llegaron a sala, pacientes en espera, accesos directos (Agenda, Pacientes, CRM), seguimientos próximos del CRM y carga de turnos por médico tratante (como disponibilidad operativa).
- **Exclusiones estrictas:** Se retiran importes o cantidades "Por cobrar", cifras de recaudación, movimientos financieros de Caja, cola técnica de estudios, resultados de exámenes, diagnósticos médicos e indicadores clínicos de atención.
- **Nota discreta obligatoria:** *“Panel operativo de Recepción. Los cobros se gestionan en Caja y la información clínica en los módulos autorizados.”*

### 3.2. Agenda y Citas / Mi Agenda Médica (`#agenda`)
- **Rol Recepción / Administrador:** Muestra agenda integral con turnos de 30 min, cambio de fecha y filtros de estado. Acciones operativas: confirmar cita, cancelar con motivo, reprogramar con detección de conflictos, registrar llegada y generar orden de pago interna, pasar a sala de espera (con pago validado). Botón `+ Nueva cita` habilitado.
- **Rol Médico Tratante:**
  - Título adaptado a **“Mi agenda médica”**.
  - Muestra exclusivamente las citas asignadas al médico autenticado (`a.doctor === user.name`).
  - Oculta el botón `+ Nueva cita`.
  - Oculta acciones de recepción: confirmar cita, cancelar, reprogramar, registrar llegada, generar orden de pago y pasar a espera.
  - Permite consultar el resumen de la cita, abrir la ficha clínica permitida y acceder directamente a Atención médica (`#consulta`) cuando la cita esté en el estado adecuado (`En espera`, `Llegó` o `Atendida`).
  - Oculta columnas financieras (pago) y métricas de CRM o recaudación.

### 3.3. Ficha y Directorio de Pacientes (`#pacientes` y `#pacientes/:id`)
- **Datos expuestos:** Filiación, documento de identidad (DNI de 8 dígitos), teléfono, correo, dirección, seguro/cobertura médica (con póliza obligatoria si no es Particular), contacto de auxilio/emergencia e historial de visitas.
- **Restricciones por rol:**
  - **Recepción y Administrador:** Pueden crear pacientes, editar datos de contacto, reservar citas y desactivar/reactivar la ficha.
  - **Médico y Técnico:** Ficha en **Modo consulta** de solo lectura para datos administrativos; se ocultan botones de edición, reserva y desactivación de pacientes.
  - **Caja:** **Sin acceso al directorio ni a la ficha.** Cualquier intento de navegar directamente a `#pacientes` o `#pacientes/:id` es interceptado por el Route Guard y redirigido a `#caja`.

### 3.4. Atención Médica y Consulta Clínica (`#consulta`)
- **Rol Médico:** Habilitado para revisar exámenes optométricos previos, registrar refracción final OD/OS, tono ocular, emitir impresión diagnóstica, estructurar el plan terapéutico con receta de lentes y presionar el botón `Guardar y Finalizar Atención Médica`.
- **Rol Administrador (Vista de Supervisión):**
  - Acceso exclusivamente de lectura y supervisión administrativa.
  - Muestra el aviso: *“Vista de supervisión. La edición clínica corresponde al médico tratante.”*
  - Todos los campos clínicos (refracción, diagnóstico, plan/tratamiento) se presentan deshabilitados y de solo lectura (`disabled readonly`).
  - Se oculta el botón de guardar o finalizar la atención clínica (sustituido por indicador visual de supervisión).
  - El Administrador **no figura como médico tratante**; se muestra el nombre del profesional asignado a la cita.

### 3.5. CRM de Prospectos (`#crm`)
- **Métricas Dinámicas del Tablero:**
  - *Prospectos activos:* Tarjetas que no estén en la columna "Convertido" ni en "Perdido".
  - *Convertidos:* Tarjetas que se encuentren estrictamente en la columna "Convertido".
  - *Tasa de conversión:* `(Convertidos / Total de prospectos) * 100`.
  - *Seguimientos de hoy:* Tarjetas cuya fecha de próxima acción coincida con la fecha de demostración (`2026-10-27`).
  - Cálculo reactivo: cualquier movimiento de tarjeta entre columnas actualiza inmediatamente los indicadores numéricos.
- **Reglas de Conversión:**
  - Vincular un contacto a un paciente no marca automáticamente la tarjeta como convertida.
  - La etapa "Cita agendada" solo se alcanza tras guardar efectivamente una cita médica.
  - La etapa "Convertido" requiere una acción de conversión explícita posterior.
  - Se preservan las herramientas de edición de columnas, panel lateral de conversación simulada y bitácora de actividad.

### 3.6. Módulo de Caja y Cobros (`#caja`)
- **Control de Rutas Estricto:** Rol `caja` restringido únicamente a `#caja` y sus subpestañas (`#caja/por-cobrar`, `#caja/movimientos`, `#caja/cuadre`). Bloqueo de `#pacientes`, `#agenda`, `#crm`, `#consulta`, `#estudios` y `#admin-*`.
- **Datos Mínimos Visibles:** Solo los campos necesarios para liquidar la orden: nombre del paciente, DNI, número de orden interna, servicio/concepto, importe total, estado de pago y medio de cobro.
- **Documentos Internos Demostrativos:**
  - No se emplean los términos "Boleta de Venta", "Factura Electrónica" ni "Comprobante legal".
  - Se utilizan únicamente **Orden interna de pago** (`OP-XXXX`) y **Constancia interna de pago** (`CP-XXXX`).
  - No se muestran series oficiales tributarias (como B001 o F001) ni números RUC sin justificación.
  - Se eliminan de las constancias de Caja cualquier enlace o botón que dirija al expediente clínico completo del paciente (`#gotopatient`).
- **Funcionalidades Financieras Conservadas:** Múltiples medios de pago (Efectivo, Tarjeta POS, Yape, Plin, Transferencia bancaria), calculadora de vuelto en efectivo, movimientos correlativos y arqueo/cuadre de caja por medio de cobro.

### 3.7. Centro ARM y Automatizaciones (`#arm`, `#automations`)
- **Permiso:** Exclusivo del rol Administrador. Recepción, Médico, Técnico y Caja son redirigidos a su ruta inicial si intentan acceder directamente.
- **Naturaleza del módulo:** Supervisión local y determinista. No existen modelos de IA, herramientas externas ni decisiones clínicas conectadas.
- **Estados de agente:** `Activo`, `Pausado` y `Requiere supervisión`, siempre comunicados con texto y color.
- **Pausa reversible:** Pausar un agente bloquea inmediatamente los escenarios que dependen de él. Reactivarlo restituye su disponibilidad. Ambas acciones quedan en la auditoría local.
- **Detalle lateral:** Drawer modal canónico con función, acciones permitidas, límites explícitos y actividad reciente.
- **Automatizaciones:** Tres reglas de demostración —recordatorio, reprogramación y derivación— que solo registran pruebas locales. No envían mensajes ni modifican servicios externos.
- **Auditoría:** Cada evento muestra agente, acción, resultado y hora local. Restablecer demo devuelve agentes, reglas y bitácora al escenario inicial.

### 3.8. Escenarios conectados desde Inbox
- **Reserva guiada:** Disponible para un contacto vinculado a paciente. Solo cambia el CRM a `Cita agendada` después de guardar exitosamente la cita en Agenda.
- **Consulta comercial:** Usa respuestas predefinidas, actualiza el interés y no emite recomendaciones clínicas.
- **Derivación humana:** Un escenario sensible predefinido detiene el flujo automático, evita diagnósticos y marca la conversación para atención humana prioritaria.
- **Trazabilidad:** Inbox, CRM, Agenda y auditoría ARM comparten el mismo cambio en memoria durante la sesión.

---

## 4. Retiro de Afirmaciones Regulatorias no Verificadas
Se reemplazan todas las frases que afirman acreditación o cumplimiento normativo auditado (MINSA, SUSALUD, colegiaturas CMP o registros RNE) por formulaciones neutrales de prototipo:
- *“Datos profesionales de demostración. Los campos CMP y RNE ilustran la estructura del registro; la validación normativa y de credenciales corresponde a una implementación posterior.”*
- *“Información clínica ficticia para fines de prototipo.”*
- *“Solo se admiten pagos completos por política de admisión. Todo cobro emite constancia interna de pago administrativo de demostración.”*

---

## 5. Resumen de Restricciones del Prototipo
1. **OTP simulado:** Visualización local de código sin conexión a proveedores de correo.
2. **Roles visuales:** Navegación y guardas de interfaz en memoria; no sustituye autenticación segura.
3. **Persistencia volátil:** Almacenamiento en variables JavaScript locales y `sessionStorage`.
4. **Sin backend:** Ejecución 100% en el navegador del cliente.
5. **Sin facturación electrónica:** Sin validez tributaria ante SUNAT.
6. **Sin mensajería real:** Los canales de WhatsApp son maquetas demostrativas.
7. **Prohibido el uso de datos reales:** Utilizar exclusivamente identidades y datos de muestra.
