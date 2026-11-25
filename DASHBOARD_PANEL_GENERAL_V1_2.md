# DASHBOARD EJECUTIVO DEL PANEL GENERAL v1.2 — TRAZABILIDAD E INTEGRIDAD DE DATOS DEMO
## Clínica Oftalmológica · Sistema de Gestión Clínica, CRM y Automatización ARM

**Versión:** 1.2.0  
**Fecha de Corrección:** 18 de Noviembre de 2026  
**Módulo:** Panel General (`#dashboard`)  
**Estado:** Pendiente de auditoría independiente de verificación por Codex  

---

## 1. MODELO DE DATOS DEMO (`app/dashboard.js`)

En la versión v1.2 se eliminaron las distribuciones proporcionales sobre agregados planos (`SEDE_WEIGHTS_ARRAY`, `docAppWeights`) y los porcentajes fijos de alertas (`0.25`, `0.50`). El módulo [dashboard.js](file:///d:/ProyectosVS/AppClinicaOftalmo/app/dashboard.js) ahora construye y exporta **cinco colecciones deterministas e inmutables (`Object.freeze`)** sobre una línea de tiempo continua desde `2026-05-01` hasta `2026-10-27`:

1. **`DEMO_NEW_PATIENTS` (402 registros: 210 en ventana de 90 días actual + 192 en 90 días previos):**
   - `id`: Identificador único (`PAT-2026-XXXX`).
   - `patientCode`: Código ficticio de historia clínica (`HC-2026-XXXX`).
   - `patientName`: Nombre de paciente ficticio sin PII real.
   - `firstAttentionDate`: Fecha ISO válida (`YYYY-MM-DD`) de primera atención.
   - `sede`: Sede de primera atención (`'principal'` | `'norte'` | `'sur'`).
   - `firstAttentionDoctor`: Especialista de primera atención (`'Dra. Valeria Ríos'` | `'Dr. Diego Ramírez'` | `null`).
   - `firstAppointmentId`: Referencia a la cita de primera atención en `DEMO_APPOINTMENTS` cuando aplica, o `null` cuando corresponde a admisión/tamizaje técnico sin atribución médica.
   - `subsequentAppointmentId` / `subsequentDoctor`: Referencia opcional a una cita posterior con otro especialista (ej. `PAT-2026-0004`), demostrando que una cita posterior nunca sobrescribe ni altera al médico de primera atención.
   - `attributionStatus`: `'attributed'` | `'unattributed'`.

2. **`DEMO_APPOINTMENTS` (1,235 registros: 645 en ventana de 90 días actual + 590 en 90 días previos):**
   - `id`: Identificador único (`APT-2026-XXXX`).
   - `patientId`: Referencia al paciente ficticio.
   - `date` / `time`: Fecha ISO (`YYYY-MM-DD`) y hora (`HH:MM`).
   - `sede`: `'principal'` | `'norte'` | `'sur'`.
   - `doctor`: `'Dra. Valeria Ríos'` | `'Dr. Diego Ramírez'`.
   - `specialty`: `'general'` | `'retina'` | `'glaucoma'` | `'cornea'` | `'pediatrica'`.
   - `status`: `'Atendida'` | `'Pendiente'` | `'Cancelada'` | `'No asistió'`.
   - `confirmationStatus`: `'confirmada'` | `'pendiente_confirmacion'` | `'no_requiere'`.
   - `followUpStatus`: `'al_dia'` | `'pendiente_seguimiento'` | `'pendiente_reagendamiento'` | `'completado'`.
   - `requiresHumanIntervention`: Booleano explícito (`true` | `false`).
   - `operationalPriority`: `'alta'` | `'media'` | `'informativa'` | `'normal'`.

3. **`DEMO_SURGERIES` (242 registros: 128 en ventana de 90 días actual + 114 en 90 días previos):**
   - `id`: Identificador único (`SURG-2026-XXXX`).
   - `date`: Fecha ISO (`YYYY-MM-DD`).
   - `sede`: `'principal'` | `'norte'` | `'sur'`.
   - `doctor`: `'Dra. Valeria Ríos'` | `'Dr. Diego Ramírez'`.
   - `procedureId`: `'catarata'` | `'refractiva'` | `'retina'` | `'glaucoma'`.
   - `preopEvaluationStatus`: `'validada'` | `'pendiente_validacion'`.
   - `requiresHumanIntervention`: Booleano (`true` cuando `preopEvaluationStatus === 'pendiente_validacion'`).
   - `operationalPriority`: `'media'` | `'normal'`.

4. **`DEMO_TRANSACTIONS` (Transacciones financieras deterministas):**
   - `id`: Identificador único (`TRX-2026-XXXX`).
   - `date` / `time`: Fecha ISO (`YYYY-MM-DD`) y hora (`HH:MM`) de operación.
   - `sede`: `'principal'` | `'norte'` | `'sur'`.
   - `amount`: Importe positivo en Soles (`S/`).
   - `paymentStatus`: `'cobrado'` | `'pendiente'`.
   - `operationRef`: Referencia interna única (`CP-XXXX` para constancia interna de pago en estado `'cobrado'`, `OP-XXXX` para orden interna de pago en estado `'pendiente'`).
   - `specialist`: Especialista atribuible (`'Dra. Valeria Ríos'` | `'Dr. Diego Ramírez'` | `null`).
   - `appointmentId` / `surgeryId`: Vínculo verificable con la cita o cirugía cuando aplica.
   - `attributionStatus`: `'attributed'` | `'unattributed'`.

5. **`DEMO_CRM_RECORDS` (820 registros comerciales en ventana de 90 días actual):**
   - `id`: Identificador único (`LEAD-2026-XXXX`).
   - `date`, `sede`, `doctor`, `origin`.
   - `qualified`, `scheduled`, `attended`: Flags booleanos anidados (`attended => scheduled => qualified`).
   - `appointmentId`: Enlace 1 a 1 con una cita `'Atendida'` en `DEMO_APPOINTMENTS` cuando `attended === true`.
   - `followUpStatus`: `'pendiente_seguimiento'` | `'al_dia'` | `'completado'`.
   - `requiresHumanIntervention`: Booleano explícito (`true` para conversaciones en Inbox pendientes de calificación humana).
   - `operationalPriority`: `'alta'` | `'media'` | `'normal'`.

---

## 2. ORIGEN DE CADA KPI Y GRÁFICO

Todos los indicadores operan a través de `getFilteredDashboardRecords(period, sede, doctor)` sobre las ventanas definidas en `PERIOD_WINDOWS`:

| Indicador / Componente | Fuente Única de Verdad | Criterio de Cálculo | Clasificación |
| :--- | :--- | :--- | :---: |
| **KPI 01: Pacientes nuevos** | `DEMO_NEW_PATIENTS` | Conteo de registros con `firstAttentionDate` en el período, `sede` y `firstAttentionDoctor`. | Registrado / No atribuido |
| **KPI 02: Citas registradas** | `DEMO_APPOINTMENTS` | Conteo de citas con `date` en el período, `sede` y `doctor`. | Registrado |
| **KPI 03: Cirugías programadas** | `DEMO_SURGERIES` | Conteo de cirugías con `date` en el período, `sede` y `doctor`. | Registrado |
| **KPI 04: Ingresos del período** | `DEMO_TRANSACTIONS` | Suma de `amount` de transacciones filtradas por `date`, `sede` y `specialist`. | Registrado / No atribuido |
| **Gráfico 01: Evolución de citas** | `DEMO_APPOINTMENTS` | Partición de citas filtradas y citas con `status === 'Atendida'` por `win.trendBuckets`. | Registrado |
| **Gráfico 02: Estado de las citas** | `DEMO_APPOINTMENTS` | Conteo por estado (`Atendida`, `Pendiente`, `Cancelada`, `No asistió`). | Registrado |
| **Gráfico 03: Consultas por especialidad** | `DEMO_APPOINTMENTS` | Conteo de citas con `status === 'Atendida'` agrupadas por `specialty`. | Registrado |
| **Gráfico 04: Evolución de ingresos** | `DEMO_TRANSACTIONS` | Suma de `amount` (`cobrado` y `pendiente`) particionada por `win.revenueBuckets`. | Registrado |
| **Gráfico 05: Embudo CRM + ARM** | `DEMO_CRM_RECORDS` | Conteo de registros filtrados: total, `qualified`, `scheduled` y `attended`. | Registrado |
| **Gráfico 06: Cirugías por procedimiento** | `DEMO_SURGERIES` | Conteo de cirugías filtradas agrupadas por `procedureId`. | Registrado |
| **Ocupación de especialistas** | `DEMO_APPOINTMENTS` + `DEMO_SURGERIES` + `DOCTOR_SHIFT_CAPACITY` | Citas y cirugías reales del médico sobre su capacidad programada en la sede. | Registrado |
| **Rendimiento de agentes ARM** | `getARMSummary()` (`arm.js`) | Conteo en vivo de agentes/workflows + tasas fijas demostrativas (`84.2%` / `15.8%`). | Registrado + Estimado `(demo)` |

---

## 3. FÓRMULAS MATEMÁTICAS E INVARIANTES

1. **Pacientes Nuevos y Atribución de Primera Atención:**
   $$\text{Pacientes Nuevos}(P, S, \text{all}) = \text{Atribuidos}(P, S, \text{Ríos}) + \text{Atribuidos}(P, S, \text{Ramírez}) + \text{No Atribuidos}(P, S)$$

2. **Ingresos, Cobrado, Pendiente y Atribución Financiera:**
   $$\text{Ingresos Cobrados}(P, S, D) = \sum_{t \in T(P,S,D),\, t.\text{paymentStatus}=\text{'cobrado'}} t.\text{amount}$$
   $$\text{Importes Pendientes}(P, S, D) = \sum_{t \in T(P,S,D),\, t.\text{paymentStatus}=\text{'pendiente'}} t.\text{amount}$$
   $$\text{Ingresos Totales}(P, S, D) = \text{Ingresos Cobrados}(P, S, D) + \text{Importes Pendientes}(P, S, D)$$
   $$\text{Ingresos}(P, S, \text{all}) = \text{Atribuidos}(P, S, \text{Ríos}) + \text{Atribuidos}(P, S, \text{Ramírez}) + \text{No Atribuidos}(P, S)$$

3. **Partición Temporal de Series (Gráficos 01 y 04):**
   Dado que los intervalos $B_1, \dots, B_k$ de cada período forman una partición disjunta de la ventana $[t_{\text{inicio}}, t_{\text{fin}}]$:
   $$\sum_{i=1}^k \text{Programadas}(B_i) = \text{Total Citas}, \quad \sum_{i=1}^k \text{Atendidas}(B_i) = \text{Citas Atendidas}, \quad 0 \le \text{Atendidas}(B_i) \le \text{Programadas}(B_i)$$
   $$\sum_{i=1}^k \text{Barra Cobrado}(B_i) = \text{Ingresos Cobrados}, \quad \sum_{i=1}^k \text{Barra Pendiente}(B_i) = \text{Importes Pendientes}$$

---

## 4. REGLAS DE ATRIBUCIÓN Y REGISTROS NO ATRIBUIBLES

1. **Regla de primera atención médica (`DEMO_NEW_PATIENTS`):**
   - Un paciente nuevo solo se atribuye a un especialista cuando `firstAttentionDoctor` coincide con dicho profesional.
   - Una cita posterior con otro médico (`subsequentDoctor` / `subsequentAppointmentId`, como ocurre en `PAT-2026-0004`, atendido inicialmente por la Dra. Valeria Ríos y con control posterior con el Dr. Diego Ramírez) **no** transfiere ni duplica la atribución de paciente nuevo.
   - Los pacientes registrados en admisión o triaje optométrico sin médico de primera atención (`firstAttentionDoctor: null`, ej. `PAT-2026-0005` en Sede Norte) se contabilizan en el total de la sede (`doctor = 'all'`), pero **nunca** se asignan a un especialista al filtrar por médico.

2. **Regla de atribución de transacciones (`DEMO_TRANSACTIONS`):**
   - Una transacción solo se atribuye a un médico cuando posee `specialist` verificable.
   - Los cobros y órdenes de estudios diagnósticos técnicos o ambulatorios sin especialista (`specialist: null`, ej. `TRX-2026-0004` por `S/ 150.00` y `TRX-2026-0008` por `S/ 100.00` en `Hoy + Sede Sur`) forman parte del ingreso de la sede (`S/ 250.00` en `hoy | sur | all`), pero al seleccionar cualquier especialista sin transacciones atribuidas en esa sede (`hoy | sur | Dra. Valeria Ríos` o `hoy | sur | Dr. Diego Ramírez`), el ingreso atribuido al médico es exactamente **`S/ 0.00`** (`collected: 0`, `pending: 0`), informando en `unattributedInScope` y en el DOM el importe no atribuido en la sede.

---

## 5. SISTEMA DE ALERTAS BASADO EN ESTADOS EXPLÍCITOS

Cada alerta evalúa una condición explícita sobre los registros filtrados y expone `affectedRecordIds`:

| ID de Alerta | Colección Fuente | Campo y Estado Explícito | Prioridad |
| :--- | :--- | :--- | :---: |
| `confirm-pending` | `DEMO_APPOINTMENTS` | `status === 'Pendiente' && confirmationStatus === 'pendiente_confirmacion'` | `media` |
| `noshow-recovery` | `DEMO_APPOINTMENTS` | `status === 'No asistió' && followUpStatus === 'pendiente_reagendamiento'` | `alta` |
| `crm-followup` | `DEMO_CRM_RECORDS` | `followUpStatus === 'pendiente_seguimiento'` | `media` |
| `next-appointments` | `DEMO_APPOINTMENTS` | `status === 'Pendiente'` | `informativa` |
| `inbox-unattended` | `DEMO_CRM_RECORDS` | `requiresHumanIntervention === true` | `alta` |
| `surgical-readiness` | `DEMO_SURGERIES` | `preopEvaluationStatus === 'pendiente_validacion'` | `media` |

- Cuando una alerta muestra cantidad `0` (por ejemplo, `surgical-readiness` en `hoy | all | Dra. Valeria Ríos`, donde existe `1` cirugía programada pero su estado es `preopEvaluationStatus: 'validada'`), representa **exactamente cero registros afectados** (`affectedRecordIds.length === 0`).

---

## 6. CORRECCIÓN P2 — MOTION Y LEGIBILIDAD SVG

En [style.css](file:///d:/ProyectosVS/AppClinicaOftalmo/app/style.css):
- Se reemplazó `transition: all` en `.dash-tab-btn` por propiedades explícitas (`background-color`, `color`, `border-color`).
- Se eliminaron las transiciones sobre atributos geométricos SVG (`r` en `.chart-point circle` y `stroke-width` en `.donut-segment`), sustituyéndolas por `transform: scale(1.45)` con `transform-box: fill-box` y `opacity`.
- Se añadieron reglas explícitas `@media (prefers-reduced-motion: reduce)` y `:root[data-reduced-motion="on"]` para desactivar transiciones y transformaciones en los elementos del Dashboard.
- Se mejoró la legibilidad de etiquetas SVG en pantallas móviles (`<= 640px`) mediante `min-width: 560px` y `font-size: 13px` en `.dash-svg text`.

---

## 7. PRUEBAS REALIZADAS Y RESULTADO DE EJECUCIÓN

| Suite | Comando | Total Pruebas | Resultado | Detalle |
| :--- | :--- | :---: | :---: | :--- |
| **Verificación de Sintaxis JS** | `npm run check` | **10 archivos** | **10 / 10 PASS** | `app.js`, `auth.js`, `crm.js`, `automations.js`, `arm.js`, `palette.js`, `turnos.js`, `server.mjs`, `motion.js`, `dashboard.js`. |
| **Políticas Estáticas** | `npm run test:static` | **86 políticas** | **86 / 86 PASS** | Incluye validación estática de colecciones explícitas y ausencia de términos prohibidos en `dashboard.js`. |
| **Pruebas Unitarias** | `npm run test:unit` | **303 pruebas** | **303 / 303 PASS** | `269` (`test_roles.mjs`) + `34` (`test_dashboard.mjs`, incluyendo las 8 pruebas de integridad de origen y las 48 combinaciones). |
| **Pruebas en Navegador Real (Chrome CDP)** | `npm run test:browser` | **365 pruebas** | **365 / 365 PASS** | Incluye coherencia datos-métricas-DOM en `Hoy + Sede Sur + Dr. Ramírez`, propiedades CSS Motion, teclado ARIA y 4 viewports. |
| **Total Suite Integral** | `npm test` | **764 verificaciones** | **764 / 764 PASS** | Ejecución completa sin errores ni regresiones. |

---

## 8. LIMITACIONES CONOCIDAS DEL ENTORNO DEMO

1. **Persistencia y Sincronización Operativa en Sesión:**
   - Las cinco colecciones del Dashboard (`DEMO_NEW_PATIENTS`, `DEMO_APPOINTMENTS`, `DEMO_SURGERIES`, `DEMO_TRANSACTIONS`, `DEMO_CRM_RECORDS`) constituyen un repositorio analítico determinista en memoria (`Object.freeze`) alineado con los totales históricos del demo. Las altas de citas o cobros interactivos que el usuario realice durante la sesión en `#agenda` o `#caja` operan sobre las listas operativas del día en `app.js` y no mutan el histórico analítico de 90 días del Dashboard.
2. **Tasas Demostrativas en Panel de Agentes ARM:**
   - Mientras que el número de agentes activos (`4 / 5`) y workflows en ejecución (`4`) provienen en vivo de `getARMSummary()`, los indicadores de `Tasa de resolución (84.2%)` y `Derivaciones (15.8%)` son tasas demostrativas fijas identificadas explícitamente con la etiqueta `(demo)` y clasificadas en `sourceTraceability.estimatedIndicators`.
3. **Autorización en Cliente:**
   - La restricción del Dashboard Ejecutivo al rol `admin` y del Panel Operativo al rol `recepcion` se aplica en el cliente mediante `auth.js`. En un despliegue productivo con backend, el control de acceso y el filtrado de transacciones por sede/rol deben ejecutarse en el servidor.
