# DASHBOARD EJECUTIVO DEL PANEL GENERAL v1.3 / v1.3.1 — MODELO RELACIONAL Y CERTIFICACIÓN DE INTEGRIDAD
## Clínica Oftalmológica · Integridad Relacional, Trazabilidad y Validación Independiente

**Versión:** 1.3.1 (actualización dirigida sobre v1.3.0)  
**Fecha de Corrección:** 18 de Noviembre de 2026  
**Módulo:** Panel General (`#dashboard`)  
**Estado:** Pendiente de verificación final y certificación independiente por Codex  

---

## 1. PRINCIPIO ARQUITECTÓNICO Y MODELO RELACIONAL DEMO

En la versión v1.3 se reemplazó por completo el enfoque inverso (`Totales -> Porcentajes -> Registros artificiales`) por una arquitectura relacional ascendente:

$$\text{Fixtures Relacionales Válidos} \longrightarrow \text{Consultas y Filtros} \longrightarrow \text{Agregaciones} \longrightarrow \text{Indicadores} \longrightarrow \text{Gráficos SVG}$$

Se eliminó definitivamente `populateSlice()`, `distributeSedeForIndex()`, las cuotas porcentuales (`60/25/15`, `52/37/11`, `riosShare`) y los identificadores huérfanos `PAT-HIST-*`.

### 1.1 Colecciones Exportadas en `app/dashboard.js`

| Colección | Registros Totales | Rol en el Modelo Relacional |
| :--- | :---: | :--- |
| `DEMO_PATIENTS_CATALOG` | **181** | Catálogo maestro de pacientes (24 recurrentes históricos previos a `2026-05-01` + 157 registrados en la línea de tiempo). |
| `DEMO_NEW_PATIENTS` | **157** | Registros de cohorte de nuevos pacientes (117 con primera atención médica efectivamente `Atendida` + 40 registrados sin primera atención médica completada). |
| `DEMO_APPOINTMENTS` | **378** | Citas de consulta externa de 30 minutos (`startTime`, `endTime`), sin solapamientos por especialista ni por paciente (`258` en ventana de 90 días actual + `120` en 90 días previos). |
| `DEMO_SURGERIES` | **64** | Procedimientos quirúrgicos en bloques de 60 minutos (`17:00–18:00`, `18:00–19:00`), vinculados obligatoriamente mediante `indicationAppointmentId` a una consulta `Atendida` del mismo paciente, especialista y sede (`46` en 90d actual + `18` en 90d previo). |
| `DEMO_STUDY_ORDERS` | **39** | Catálogo explícito de órdenes de estudio técnico de optometría (`ORD-TEC-0001`..`ORD-TEC-0039`), con fecha, sede, paciente y `specialist: null`. |
| `DEMO_TRANSACTIONS` | **464** | Transacciones financieras generadas 1 a 1 desde consultas no canceladas (`361`), cirugías (`64`) y órdenes de estudio técnico respaldadas en `DEMO_STUDY_ORDERS` sin especialista (`39`): `361 + 64 + 39 = 464`. |
| `DEMO_CRM_RECORDS` | **473** | Registros comerciales CRM + ARM en la ventana de 90 días, con canal de origen explícito (incluyendo `'No especificado'`) y atribución médica restringida a vínculos reales. |

---

## 2. FUENTE DE CADA INDICADOR

| Indicador / Gráfico | Colección Fuente | Regla de Cálculo en `getDashboardMetrics()` |
| :--- | :--- | :--- |
| **KPI 01: Pacientes nuevos** | `DEMO_NEW_PATIENTS` | Conteo exclusivo de pacientes con `firstAttentionCompleted === true` (respaldados por cita `Atendida`), filtrados por `firstAttentionDate`, `sede` y `firstAttentionDoctor`. Los pacientes sin primera atención médica completada se informan por separado (`pendingOrTechnicalInScope`). |
| **KPI 02: Citas registradas** | `DEMO_APPOINTMENTS` | Conteo de citas filtradas por `date`, `sede` y `doctor`. |
| **KPI 03: Cirugías programadas** | `DEMO_SURGERIES` | Conteo de cirugías filtradas por `date`, `sede` y `doctor`. |
| **KPI 04: Ingresos del período** | `DEMO_TRANSACTIONS` | Suma de `amount` de transacciones filtradas por `date`, `sede` y `specialist` (`cobrado` + `pendiente`). Las órdenes técnicas (`specialist: null`) nunca se asignan a médicos. |
| **Gráfico 01: Evolución de citas** | `DEMO_APPOINTMENTS` | Partición directa de citas programadas y `Atendidas` según `PERIOD_WINDOWS[period].trendBuckets`. |
| **Gráfico 02: Estado de las citas** | `DEMO_APPOINTMENTS` | Conteo por estado mutuamente excluyente (`Atendida`, `Pendiente`, `Cancelada`, `No asistió`). |
| **Gráfico 03: Consultas por especialidad** | `DEMO_APPOINTMENTS` | Conteo de citas con `status === 'Atendida'` agrupadas por `specialty`. |
| **Gráfico 04: Evolución de ingresos** | `DEMO_TRANSACTIONS` | Suma monetaria (`cobrado` y `pendiente`) particionada por `PERIOD_WINDOWS[period].revenueBuckets`. |
| **Gráfico 05: Embudo CRM + ARM** | `DEMO_CRM_RECORDS` | Conteo de registros filtrados: total contactos, `qualified`, `scheduled` y `attended`. |
| **Gráfico 06: Cirugías por procedimiento** | `DEMO_SURGERIES` | Conteo de cirugías filtradas agrupadas por `procedureId`. |
| **Alertas operativas (6)** | `DEMO_APPOINTMENTS`, `DEMO_SURGERIES`, `DEMO_CRM_RECORDS` | Evaluación directa de `confirmationStatus`, `followUpStatus`, `preopEvaluationStatus` y `requiresHumanIntervention` con exposición de `affectedRecordIds`. |

---

## 3. RESTRICCIONES Y REGLAS DE INTEGRIDAD RELACIONAL

El validador puro e independiente [`validateDashboardDatasetIntegrity()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1140-L1546) verifica 10 invariantes estrictos y falla ante cualquier registro inválido:

1. **Unicidad de IDs:** IDs y códigos únicos en las 7 colecciones (`id`, `patientCode`, `operationRef`); ningún paciente puede ser nuevo dos veces.
2. **Integridad de referencias:** Todo `patientId`, `firstAppointmentId`, `indicationAppointmentId`, `appointmentId`, `surgeryId` y `studyOrderId` apunta a una entidad existente (no basta un prefijo sintético sin registro en `DEMO_STUDY_ORDERS`).
3. **Correspondencia paciente-cita y cirugía-indicación:** La cita referenciada en `firstAppointmentId` o `indicationAppointmentId` pertenece exactamente al mismo `patientId`; toda cirugía exige `indicationAppointmentId` obligatorio con estado `Atendida`, mismo paciente, mismo especialista, sede compatible y precedencia temporal estricta (`indApp.date < s.date` o `indApp.date === s.date && indApp.endTime <= s.startTime`).
4. **Validez de primera atención:** Toda primera atención realizada (`firstAttentionCompleted === true`) exige cita existente con el mismo paciente, misma sede, mismo especialista, misma fecha, estado `Atendida` y ausencia de atención `Atendida` previa.
5. **Coherencia temporal:** Fechas calendario ISO válidas (`YYYY-MM-DD`), intervalos `startTime < endTime` válidos, transacciones en la fecha de su entidad fuente y leads agendados con `lead.date <= appointment.date`.
6. **Ausencia unificada de solapamientos no permitidos:** Ningún médico ni paciente posee eventos clínicos activos (consulta o cirugía, incluyendo `cita-cita`, `cirugía-cirugía` y `cita-cirugía`) con intervalos `[startTime, endTime)` solapados en la misma fecha; los intervalos consecutivos (`endA === startB`) son válidos.
7. **Atribución médica justificada:** Toda atribución a `Dra. Valeria Ríos` o `Dr. Diego Ramírez` en pacientes nuevos, transacciones o leads posee vínculo relacional verificable.
8. **Fuente exclusiva y coherencia de transacciones:** Toda transacción tiene exactamente una fuente (`appointmentId` XOR `surgeryId` XOR `studyOrderId`), importe positivo, `operationRef` acorde a `paymentStatus` (`CP-*` / `OP-*`), y coincidencia exacta de `patientId`, `sede`, `date` y `specialist` con la cita, cirugía u orden técnica referenciada (`specialist: null` en órdenes técnicas).
9. **Coherencia de registros CRM:** Jerarquía booleana `attended => scheduled => qualified`; orígenes explícitos (incluyendo `'No especificado'`, sin usar `'WhatsApp'` como comodín); leads agendados validan `patientId`, `sede`, `doctor` y fecha contra su cita; leads no agendados exigen `appointmentId: null`.
10. **Ausencia de atribuciones fabricadas:** Cero cuotas porcentuales o asignaciones sin respaldo documental.

---

## 4. ESTRATEGIA DE GENERACIÓN Y TOTALES ACTUALIZADOS (v1.3)

Los datos se construyen en [`buildRelationalDemoFixtures()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L359-L1104) a partir de turnos horarios disjuntos por jornada clínica (`08:00` a `15:30` para consulta externa y `17:00` a `19:00` para cirugía), derivando las primeras atenciones desde la primera cita cronológica `Atendida` de cada paciente nuevo y generando las transacciones desde las tarifas oficiales de cada consulta, cirugía u orden técnica:

| Período (`all` sedes, `all` médicos) | Pacientes Nuevos (1.ª atención `Atendida`) | Sin 1.ª Atención Médica | Citas Registradas (`Atendidas` / `Pendientes` / `Canceladas` / `No asistió`) | Cirugías Programadas | Ingresos Totales (`Cobrado` + `Pendiente`) | Contactos CRM (`Calificados` / `Agendados` / `Atendidos`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`hoy` (`2026-10-27`)** | **3** (prev: 3) | 3 | **8** (`3` / `4` / `1` / `0`, prev: 10) | **2** (prev: 1) | **S/ 3,160.00** (`S/ 630.00` + `S/ 2,530.00`, prev: S/ 2,480.00) | **14** (`12` / `8` / `3`) |
| **`7d` (`21–27 Oct`)** | **18** (prev: 12) | 8 | **58** (`40` / `12` / `4` / `2`, prev: 40) | **10** (prev: 7) | **S/ 19,150.00** (`S/ 14,840.00` + `S/ 4,310.00`, prev: S/ 13,780.00) | **106** (`87` / `58` / `40`) |
| **`30d` (`28 Sep–27 Oct`)** | **47** (prev: 22) | 17 | **148** (`106` / `29` / `7` / `6`, prev: 70) | **27** (prev: 12) | **S/ 51,120.00** (`S/ 43,160.00` + `S/ 7,960.00`, prev: S/ 23,450.00) | **271** (`222` / `148` / `106`) |
| **`90d` (`30 Jul–27 Oct`)** | **83** (prev: 34) | 28 | **258** (`186` / `50` / `12` / `10`, prev: 120) | **46** (prev: 18) | **S/ 88,180.00** (`S/ 75,850.00` + `S/ 12,330.00`, prev: S/ 37,550.00) | **473** (`387` / `258` / `186`) |

---

## 5. COMPARACIÓN CON HALLAZGOS ANTERIORES (v1.2 -> v1.3)

| Hallazgo de Auditoría en v1.2 | Causa en v1.2 | Solución Estructural en v1.3 |
| :--- | :--- | :--- |
| **P1-01: Generador histórico inverso (`populateSlice`)** | Generaba registros a partir de totales predefinidos usando cuotas `60/25/15`, `52/37/11` y `riosShare`. | Eliminado `populateSlice()` y todas las cuotas porcentuales; los totales emergen de la agregación de entidades válidas. |
| **P1-02: Citas con pacientes inexistentes y solapamientos** | Usaba IDs huérfanos `PAT-HIST-*`, sin `endTime`, y repetía horarios del mismo médico en la misma fecha. | Creado `DEMO_PATIENTS_CATALOG` (`181` pacientes); cada cita tiene `startTime` y `endTime` en ranuras disjuntas sin solapamientos. |
| **P1-03: Primeras atenciones vinculadas a citas pendientes/canceladas** | `PAT-2026-0001` y `PAT-2026-0004` referenciaban citas `Pendiente`/`Cancelada` como primera atención realizada. | `DEMO_NEW_PATIENTS` deriva la primera atención exclusivamente de la primera cita `Atendida` del paciente; pacientes con cita pendiente/cancelada quedan con `firstAttentionCompleted: false`. |
| **P1-04: Inconsistencias en cirugías, transacciones y CRM** | `TRX-2026-0002` tenía sede distinta a su cita; cirugías sin paciente/hora/indicación; leads sin cita recibían médico por `riosShare` y canal `'WhatsApp'` por defecto. | Transacciones generadas 1 a 1 desde citas/cirugías/órdenes técnicas coherentes; cirugías con `patientId`, horario e `indicationAppointmentId`; leads no agendados sin paciente previo mantienen `doctor: null` y canal explícito. |
| **P2-01: Transiciones de `width` en barras** | `.dash-bar-fill`, `.funnel-bar` y `.occupancy-fill` usaban `transition: width`. | Reemplazado por `transform-origin: left center; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);` en [style.css](file:///d:/ProyectosVS/AppClinicaOftalmo/app/style.css#L10942-L11200). |
| **P2-02: Estados `:hover` sin media query de puntero** | Reglas `:hover` del Dashboard se aplicaban sin verificar capacidad de puntero. | Todas las reglas `:hover` del Dashboard están encapsuladas dentro de `@media (hover: hover) and (pointer: fine)` en [style.css](file:///d:/ProyectosVS/AppClinicaOftalmo/app/style.css#L11202-L11226). |

---

## 6. CORRECCIÓN DIRIGIDA v1.3.1 — CERTIFICACIÓN DE INTEGRIDAD Y PRIVACIDAD

### 6.1 Endurecimiento de `validateDashboardDatasetIntegrity()`

En [`validateDashboardDatasetIntegrity()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1140-L1546) se cerraron todos los huecos de validación detectados sin modificar los totales del dataset válido v1.3:

- **Cirugías con indicación obligatoria (3.1):** `indicationAppointmentId` ya no es opcional; toda cirugía exige cita indicadora existente, mismo `patientId`, mismo `doctor`, misma `sede`, estado `Atendida` y precedencia temporal estricta (`indApp.date < s.date` o `indApp.date === s.date && indApp.endTime <= s.startTime`).
- **Transacciones de citas (3.2):** Validan cita existente y no cancelada, coincidencia de `patientId`, `sede`, `specialist === app.doctor`, `date === app.date` y coherencia de `paymentStatus` con `operationRef` (`CP-*` / `OP-*`).
- **Transacciones quirúrgicas (3.3):** Validan cirugía existente y no cancelada, coincidencia de `patientId`, `sede`, `specialist === surg.doctor`, `date === surg.date`, importe positivo y estado financiero válido.
- **Fuente exclusiva y catálogo de órdenes técnicas (3.4):** Toda transacción debe tener exactamente una fuente (`appointmentId` XOR `surgeryId` XOR `studyOrderId`). Se incorporó y exportó [`DEMO_STUDY_ORDERS`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1112) (39 órdenes `ORD-TEC-0001`..`ORD-TEC-0039`) para validar identidad, paciente, sede, fecha y `specialist: null` contra registros existentes en lugar de aceptar prefijos sin respaldo.
- **CRM y citas (3.5):** Para leads agendados se verifica `patientId === app.patientId`, `sede`, `doctor`, `lead.date <= app.date` y `attended => app.status === 'Atendida'`; para no agendados se exige `appointmentId === null` y vínculo previo verificable si `doctor !== null`.
- **Solapamientos unificados de intervalos (3.6):** Un único barrido sobre intervalos semiabiertos `[startTime, endTime)` de citas activas y cirugías detecta solapamientos `cita-cita`, `cirugía-cirugía` y `cita-cirugía` tanto por especialista como por paciente, permitiendo intervalos consecutivos (`endA === startB`).

### 6.2 Privacidad en el Panel General por rol (`admin` vs `recepcion`)

- **Administrador General (`#dashboard`):** Visualiza exclusivamente métricas ejecutivas agregadas, gráficos SVG y conteos operativos en [`renderExecutiveDashboardView()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L2892-L3029) sin listar nombres ni DNI de pacientes.
- **Recepción (`#dashboard`):** En [`receptionDashboard()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/app.js#L2136-L2171) el resumen del día abrevia los nombres (`María L. G.`) mediante [`formatDashboardPersonName()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/app.js#L2122-L2127) y enmascara parcialmente el documento (`••••0001`) mediante [`maskDashboardDoc()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/app.js#L2129-L2134). Desde esta vista, Recepción cuenta con accesos directos a [`#agenda`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/app.js#L2193) y `#crm`, y puede abrir el detalle de una cita mediante el botón `Ver cita ↗` (`data-dashboard-appointment`), que despliega el drawer de cita en Agenda. Recepción no posee ni requiere un enlace directo a `#pacientes/:id` desde `#dashboard`; el acceso a la ficha de pacientes se realiza a través de las rutas autorizadas del menú (`#pacientes`) y la interacción asistida en Agenda.

### 6.3 Desglose de `getDashboardMetrics()` y matriz de pruebas negativas v1.3.1

- Cálculo e indicadores: [`getDashboardMetrics()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1704-L2111).
- Filtros y consultas sobre colecciones: [`getFilteredDashboardRecords()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1618-L1698).

Las 12 pruebas negativas obligatorias sobre copias aisladas verificadas en [`test_dashboard.mjs`](file:///d:/ProyectosVS/AppClinicaOftalmo/test_dashboard.mjs#L686-L921) rechazan:
1. Cirugía con `indicationAppointmentId: null`.
2. Cirugía cuya cita indicadora pertenece a otro especialista.
3. Cirugía cuya cita indicadora tiene estado distinto de `Atendida` (`Pendiente` / `Cancelada`).
4. Cirugía con consulta indicadora el mismo día pero en horario posterior al inicio quirúrgico.
5. Transacción quirúrgica con `patientId` distinto al de su cirugía.
6. Transacción quirúrgica con `date` distinta a la fecha quirúrgica.
7. Transacción con múltiples fuentes simultáneas (`appointmentId` y `surgeryId`).
8. Transacción sin fuente (`appointmentId`, `surgeryId` y `studyOrderId` nulos).
9. Transacción vinculada a cita con `date` o `patientId` contradictorios.
10. Lead CRM agendado con `patientId` distinto al de su cita.
11. Solapamiento temporal `[startTime, endTime)` `cita-cirugía` del mismo especialista en la misma fecha.
12. Solapamiento temporal `cita-cirugía` o `cita-cita` del mismo paciente en la misma fecha.

Como pruebas positivas, el dataset completo v1.3.1 aprueba con `0` errores, los eventos consecutivos sin traslape (`16:30–17:00` seguido de `17:00–18:00`) son aceptados y las órdenes `ORD-TEC-*` sin registro en `DEMO_STUDY_ORDERS` son rechazadas.

---

## 7. CORRECCIÓN DIRIGIDA v1.3.2 — INTEGRIDAD ESTRICTA DEL VALIDADOR Y ESTABILIDAD

### 7.1 P1-01: Eliminación de inyección implícita de órdenes técnicas

En [`validateDashboardDatasetIntegrity()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1140-L1612):
1. **Separación estricta de llamadas:** Se distingue la invocación sin argumentos (`validateDashboardDatasetIntegrity()`), que utiliza el dataset oficial completo por defecto, de cualquier invocación con dataset explícito (`validateDashboardDatasetIntegrity(dataset)`).
2. **Exigencia de las siete colecciones requeridas:** Todo dataset explícito debe proveer obligatoriamente las 7 colecciones como arreglos válidos:
   - `patientsCatalog`
   - `newPatients`
   - `appointments`
   - `surgeries`
   - `studyOrders`
   - `transactions`
   - `crmRecords`
3. **Cero inyección o rescate global:** Se eliminó la inyección condicional de `DEMO_STUDY_ORDERS` ante datasets parciales. Si falta `studyOrders` o cualquier otra colección, el validador rechaza de inmediato con el error específico `[0. Estructura] Colección obligatoria ausente o inválida: <nombre>`, sin mutar el objeto recibido.
4. **Validación contra colecciones vacías:** Un dataset con `studyOrders: []` que posea transacciones técnicas falla al validar las transacciones con el error `[2. Referencias] Transacción <id> referencia studyOrderId inexistente "<id>"`.

### 7.2 P1-02: Validación de pacientes nuevos contra catálogo maestro

1. **Construcción exclusiva de `patientById`:** El índice de búsqueda de pacientes se construye única y exclusivamente desde `patientsCatalog`. Se eliminó el bucle que agregaba a `patientById` registros de `newPatients` no existentes en el maestro.
2. **Existencia previa obligatoria:** Cada registro en `newPatients` debe existir en `patientsCatalog`. Si `patientsCatalog` está vacío o carece del ID, el validador emite `[2. Referencias] Paciente nuevo <id> no existe en el catálogo maestro patientsCatalog`.
3. **Correspondencia de atributos e identificador maestro:** Se valida que `patientCode` y `patientName` coincidan con el catálogo maestro. Si el registro nuevo incluye una propiedad de identificador maestro explícito (`masterPatientId`, `catalogPatientId`), debe coincidir con el registro maestro o emite `[3. Correspondencia] Paciente nuevo <id> apunta a identificador maestro ajeno`.
4. **Consistencia de primera atención:** Se verifica que `firstAppointmentId` pertenezca al mismo paciente (`firstApp.patientId === np.id`).

### 7.3 Estabilización de prueba de navegador CRM

En [`test_browser_functional.mjs`](file:///d:/ProyectosVS/AppClinicaOftalmo/test_browser_functional.mjs#L28-L75):
- Se sustituyó la espera de tiempo fijo arbitrario (`wait(180)`) por la función asíncrona `waitForCrmDrawerUnmounted(targetTab, timeoutMs = 2500)`.
- La sincronización consulta una condición DOM observable con intervalo corto y timeout máximo: solo declara éxito cuando `#crmdetail` ya no existe.
- La versión v1.3.2 todavía conservaba esperas fijas para observar estados intermedios; esa dependencia se elimina en el hotfix v1.3.3 descrito a continuación.

### 7.4 Matriz de nuevas pruebas de validación v1.3.2 (test_dashboard.mjs)

| Prueba | Caso Evaluado | Condición de Entrada | Error Esperado / Resultado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **6.9.1** | Llamada oficial sin argumentos | `validateDashboardDatasetIntegrity()` | `valid: true, errors: []` | **PASS** |
| **6.9.2** | Dataset explícito sin `studyOrders` | `{ patientsCatalog, ..., transactions, crmRecords }` | `valid: false`, `Colección obligatoria ausente o inválida: studyOrders` | **PASS** |
| **6.9.3** | Dataset explícito con `studyOrders: []` y transacciones | `{ ..., studyOrders: [], transactions: [...] }` | `valid: false`, `studyOrderId inexistente` | **PASS** |
| **6.9.4** | Dataset explícito completo y válido | `{ patientsCatalog, newPatients, appointments, surgeries, studyOrders, transactions, crmRecords }` | `valid: true, errors: []` | **PASS** |
| **6.10.1** | `patientsCatalog: []` con paciente en `newPatients` | Catálogo maestro vacío con registro nuevo | `valid: false`, `no existe en el catálogo maestro patientsCatalog` | **PASS** |
| **6.10.2** | Paciente nuevo con ID inexistente | `newPatients` incluye `PAT-INEXISTENTE-9999` | `valid: false`, `PAT-INEXISTENTE-9999 no existe en el catálogo maestro` | **PASS** |
| **6.10.3** | Paciente nuevo con identificador maestro ajeno | `newPatient` con `masterPatientId` de otro paciente | `valid: false`, `apunta a identificador maestro ajeno` | **PASS** |
| **6.10.4** | Primera atención con cita de otro paciente | `firstAppointmentId` de paciente distinto | `valid: false`, `firstAppointmentId pertenece a ..., no a ...` | **PASS** |

---

## 8. HOTFIX v1.3.3 — INTEGRIDAD ESTRICTA Y ESTABILIDAD DE PRUEBAS

### 8.1 Diferenciación estricta de `undefined`

[`validateDashboardDatasetIntegrity()`](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js#L1140) considera llamada oficial únicamente aquella realizada sin argumentos (`arguments.length === 0`). Una llamada explícita con `undefined`, `null`, `{}` o un dataset incompleto se rechaza sin completar colecciones desde variables globales. Los datasets explícitos completos se validan exclusivamente con los registros recibidos y permanecen sin modificaciones.

### 8.2 Contrato obligatorio de `patientName`

`patientName` es obligatorio tanto en `patientsCatalog` como en `newPatients`, porque el constructor relacional lo genera para todos los pacientes y los registros derivados lo utilizan como identidad visible. El validador rechaza valores ausentes, cadenas vacías y cadenas compuestas solo por espacios. Para cada paciente nuevo también exige coincidencia exacta con el catálogo maestro.

### 8.3 Drawer CRM sin pausas fijas de éxito

La prueba funcional utiliza condiciones observables con timeout máximo:

- `waitForCrmDrawerState(..., 'open')` espera que `#crmdetail` exista, tenga cabecera y el estado abierto.
- `startCrmDrawerClose()` captura en la misma operación DOM la retirada de `.is-open` al iniciar el cierre.
- `waitForCrmDrawerUnmounted()` solo finaliza cuando `#crmdetail` deja de existir y lanza un error descriptivo al vencer el timeout.
- El modo de movimiento reducido verifica ausencia de desplazamiento y transición de `opacity` cuando el drawer permanece montado, sin exigir una opacidad parcial en un milisegundo específico.

No se modificó `crm.js` ni el comportamiento visual del drawer.

### 8.4 Pruebas agregadas

El caso 6.11 de [`test_dashboard.mjs`](file:///d:/ProyectosVS/AppClinicaOftalmo/test_dashboard.mjs#L1111) cubre:

- llamada sin argumentos;
- `undefined`, `null` y `{}` explícitos;
- dataset incompleto y dataset completo;
- inmutabilidad de las entradas;
- `patientName` ausente, vacío, compuesto por espacios o ausente en el catálogo maestro.

Las 22 mutaciones negativas dirigidas de v1.3.1/v1.3.2 permanecen cubiertas.

### 8.5 Archivos modificados

- `app/dashboard.js`
- `test_dashboard.mjs`
- `test_browser_functional.mjs`
- `DASHBOARD_PANEL_GENERAL_V1_3.md`

---

## 9. RESULTADOS DE VALIDACIÓN Y PRUEBAS AUTOMATIZADAS

| Suite | Comando | Verificaciones | Resultado |
| :--- | :--- | :---: | :---: |
| **Sintaxis JS** | `npm run check` | **10 / 10** | PASS |
| **Políticas Estáticas** | `npm run test:static` | **87 / 87** | PASS |
| **Pruebas Unitarias RBAC, CRM y ARM** | `node test_roles.mjs` | **269 / 269** | PASS |
| **Pruebas Unitarias Dashboard v1.3.3** | `node test_dashboard.mjs` | **39 / 39** | PASS |
| **Pruebas en Navegador Real (Chrome CDP)** | `npm run test:browser` | **366 / 366** | PASS |
| **Total Suite Integral** | `npm test` | **771 / 771** | **PASS** |

---

## 10. LIMITACIONES DEL MODO DEMO Y CERTIFICACIÓN

1. **Separación entre estado operativo interactivo y dataset analítico:** Las colecciones del Dashboard (`DEMO_PATIENTS_CATALOG`, `DEMO_NEW_PATIENTS`, `DEMO_APPOINTMENTS`, `DEMO_SURGERIES`, `DEMO_STUDY_ORDERS`, `DEMO_TRANSACTIONS`, `DEMO_CRM_RECORDS`) son inmutables (`Object.freeze`) para garantizar determinismo y auditabilidad. Las acciones interactivas durante la sesión en `#agenda` o `#caja` operan sobre las listas en memoria de `app.js`.
2. **Indicadores demostrativos de agentes ARM:** En la pestaña Comercial, el conteo de agentes activos y workflows proviene de `getARMSummary()`, mientras que `84.2%` (Tasa de resolución) y `15.8%` (Derivaciones) se mantienen como tasas demostrativas fijas etiquetadas como `(demo)` y declaradas en `sourceTraceability.estimatedIndicators`.
3. **Alcance de seguridad:** El prototipo frontend no sustituye autenticación, autorización, auditoría, persistencia ni protección de datos implementadas en servidor para un sistema clínico de producción.
4. **Certificación independiente:** La suite automatizada completa v1.3.3 ha finalizado con cero errores y 771 comprobaciones exitosas. Conforme a las normas del proyecto, la certificación final y vinculante de integridad corresponde exclusivamente a la auditoría independiente de Codex.
