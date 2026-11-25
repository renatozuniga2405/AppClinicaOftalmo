# DASHBOARD EJECUTIVO DEL PANEL GENERAL v1.0
## Clínica Oftalmológica · Sistema de Gestión Clínica, CRM y Automatización ARM

**Versión:** 1.0.0  
**Fecha de Implementación:** 27 de Octubre de 2026  
**Entorno:** Vanilla ES Modules, CSS Moderno con Tokens y Variables de Diseño, SVG Vectorial Puro  
**Módulo:** Panel General (`#dashboard`)  

---

## 1. OBJETIVO DEL PROYECTO

Transformar el módulo existente **Panel General** (`#dashboard`) en un **Centro de Control Ejecutivo Integral y Moderno** para la clínica oftalmológica. El dashboard proporciona a la dirección médica, administración y supervisión una visibilidad analítica en tiempo real de:

- **Pacientes:** Nuevos expedientes, volumen acumulado y variaciones temporales.
- **Citas médicas:** Citas registradas, atenciones concluidas, citas pendientes y tasa de ausentismo/cancelación.
- **Actividad médica asistencial:** Consultas realizadas por especialidad oftalmológica y procedimientos quirúrgicos programados.
- **Finanzas operativas:** Ingresos registrados en el período con diferenciación estricta entre ingresos efectivamente cobrados e importes pendientes de cobro.
- **Gestión comercial CRM + ARM:** Embudo de conversión comercial, calificación de prospectos, agendamiento y tasa de retención.
- **Rendimiento de agentes ARM:** Estado de agentes de automatización supervisados, tasa de resolución autónoma y derivaciones humanas.
- **Alertas operativas inteligentes:** Detección de turnos por confirmar, inasistencias por recuperar, citas próximas y prospectos estancados.

---

## 2. ARQUITECTURA TÉCNICA Y COMPONENTES

La implementación se diseñó siguiendo una separación estricta de responsabilidades, reutilizando los tokens de diseño, el sistema de motion clínico y respetando todas las directivas de seguridad y políticas de términos del sistema.

### 2.1 Archivos Creados y Modificados

1. **`app/dashboard.js` (Nuevo):**
   - Módulo desacoplado de analítica y visualización.
   - Catálogos cerrados de especialidades (`SPECIALTIES_CATALOG`), cirugías (`SURGERIES_CATALOG`), sedes (`SEDES_CATALOG`) y períodos (`PERIODS_CATALOG`).
   - Repositorio determinista de datos (`RAW_PERIOD_DATA`).
   - Motor matemático puro de cálculo de métricas (`getDashboardMetrics`).
   - 6 funciones de renderizado de gráficos SVG vectoriales responsivos con tooltips y leyendas accesibles.
   - Renderizadores modulares para pestañas General, Médico y Comercial.

2. **`app/style.css` (Modificado):**
   - Agregadas las clases de diseño para el Dashboard Ejecutivo: `.executive-dashboard-container`, `.dash-controls-panel`, `.dash-filters-grid`, `.dash-kpi-grid`, `.dash-charts-grid`, `.donut-layout`, `.dash-bar-list`, `.funnel-steps-container`, `.dash-alerts-card`, `.doctor-occupancy-grid`, `.arm-kpi-summary`.
   - Soporte total para los 3 temas visuales (`Verde clínico`, `Azul institucional`, `Neutro cálido`).
   - Breakpoints responsivos para móvil (≤640px), tablet (≤900px) y escritorio (≥1280px).
   - Compatibilidad total con movimiento reducido (`:root[data-reduced-motion="on"]` y `@media (prefers-reduced-motion: reduce)`).

3. **`app/app.js` (Modificado):**
   - Importación de `renderExecutiveDashboardView` y `dashboardState`.
   - Adaptación condicional de `receptionDashboard()`: renderiza el Dashboard Ejecutivo para el rol `admin` y conserva la vista operativa con notas y métricas para `recepcion`.
   - Conexión del restablecimiento en `resetDemoData()` para restaurar filtros y pestañas a su estado inicial canónico.

4. **`package.json` y `run_all_tests.mjs` (Modificados):**
   - Inclusión de `node --check app/dashboard.js` en el script `"check"`.
   - Integración de la suite de pruebas `test_dashboard.mjs` en `"test:unit"` y en el orquestador integral `run_all_tests.mjs`.

5. **`test_dashboard.mjs` (Nuevo):**
   - Suite completa de 21 pruebas unitarias sobre catálogos, cálculos deterministas, consistencia de porcentajes, variaciones, generadores de gráficos SVG y renderizadores de componentes.

6. **`test_browser_functional.mjs` (Modificado):**
   - Incorporación de la sub-suite 2.1 que valida la interacción real en navegador Google Chrome: contenedor ejecutivo, 3 pestañas, 4 KPIs, 6 gráficos, filtros y persistencia.

---

## 3. DISTRIBUCIÓN DE INDICADORES POR PESTAÑAS

El Panel General se organiza en un encabezado con barra de controles y tres pestañas temáticas:

### 3.1 Encabezado y Barra de Filtros
- **Título:** Panel General
- **Subtítulo:** Resumen operativo y supervisión de la clínica
- **Selector de Período:** Hoy, Últimos 7 días, Últimos 30 días, Últimos 90 días
- **Selector de Sede:** Todas las sedes, Sede Principal (San Isidro), Sede Norte (Los Olivos), Sede Sur (Surco)
- **Selector de Especialista:** Todos los especialistas, Dra. Valeria Ríos, Dr. Diego Ramírez
- **Metadatos:** Fecha y hora de actualización (`Actualizado: 27/10/2026 12:00`) y distintivo permanente `Modo demostración · Datos simulados`

### 3.2 Pestaña 1: GENERAL
Visión ejecutiva del funcionamiento integral de la clínica:
1. **4 Tarjetas KPI Principales:**
   - **KPI 01: Pacientes nuevos:** Total del período, variación porcentual calculada vs. período anterior, icono de pacientes.
   - **KPI 02: Citas registradas:** Total de citas, variación porcentual calculada, enlace directo para abrir Agenda (`#agenda`).
   - **KPI 03: Cirugías programadas:** Cantidad de procedimientos quirúrgicos en agenda, variación porcentual y estado de cobertura de quirófanos.
   - **KPI 04: Ingresos del período:** Importe registrado en formato monetario (`S/`), variación porcentual calculada y desglose explícito de ingresos cobrados vs. importes pendientes.
2. **GRÁFICO 01: Evolución de citas médicas:**
   - Gráfico de líneas con 2 series diferenciadas: Citas Programadas (verde clínico `#1b4d3e`) y Citas Atendidas (azul institucional `#2563eb`).
   - Puntos interactivos con tooltips y etiquetas temporales en el Eje X.
3. **GRÁFICO 02: Estado de las citas:**
   - Gráfico de dona con 4 categorías mutuamente excluyentes: Atendidas (`#20835d`), Pendientes (`#2563eb`), Canceladas (`#ef4444`) y No asistió (`#d97706`).
   - Centro métrico con el total de citas del período.
   - Leyenda lateral con cantidades y porcentajes calculados sobre el 100%.
4. **GRÁFICO 04: Evolución de ingresos:**
   - Gráfico de barras compuestas con diferenciación por intervalo temporal entre ingresos cobrados e importes pendientes de cobro.
5. **Panel de Alertas Prioritarias:**
   - Alertas operativas de alta y media prioridad con accesos directos a `#agenda`, `#crm` e `#inbox`.
6. **Nota de Supervisión:**
   - Declaración de acceso y supervisión administrativa de acuerdo con las políticas del sistema.

### 3.3 Pestaña 2: MÉDICO
Supervisión de la productividad, especialidades y capacidad asistencial:
1. **Mini KPIs Asistenciales:** Consultas realizadas, tasa de asistencia médica, cirugías en agenda y ocupación promedio.
2. **GRÁFICO 03: Consultas por especialidad:**
   - Barras proporcionales por rama oftalmológica: Oftalmología general, Retina y Vítreo, Glaucoma, Córnea y Segmento Anterior, y Oftalmología pediátrica.
3. **GRÁFICO 06: Cirugías por procedimiento:**
   - Barras clínicas por procedimiento: Catarata (Facoemulsificación), Cirugía refractiva (LASIK/PRK), Retina quirúrgica (Vitrectomía/Láser) y Glaucoma quirúrgico (Trabeculectomía/Válvula).
   - Absoluta privacidad: no incluye nombres, DNI ni datos clínicos identificables de pacientes.
4. **Ocupación y Turnos de Especialistas:**
   - Tarjetas de monitoreo para Dra. Valeria Ríos y Dr. Diego Ramírez con porcentaje de carga asistencial sobre capacidad máxima y volumen de cirugías asignadas.
5. **Alertas Médicas Operativas:**
   - Notificaciones sobre evaluaciones prequirúrgicas por validar y confirmación de turnos quirúrgicos.

### 3.4 Pestaña 3: COMERCIAL / CRM + ARM
Monitoreo de la captación de prospectos, seguimiento y efectividad de automatizaciones:
1. **Mini KPIs Comerciales:** Contactos recibidos, prospectos calificados, citas agendadas y tasa de conversión final.
2. **GRÁFICO 05: Embudo comercial CRM + ARM:**
   - Visualización de embudo progresivo con las 4 etapas acordadas: Contactos recibidos → Prospectos calificados → Citas programadas → Consultas realizadas.
   - Tasas de paso entre etapas y volumen de pérdida (dropoff).
   - Tasa de conversión final acumulada de la cohorte.
3. **Rendimiento de Agentes ARM:**
   - Integración directa con el Centro ARM en tiempo real (`getARMSummary()`):
     - Agentes activos supervisados vs total configurado.
     - Workflows automatizados en ejecución.
     - Tasa de resolución autónoma (84.2%).
     - Tasa de derivación supervisada al equipo humano (15.8%).
4. **Alertas Comerciales:**
   - Inasistencias registradas que esperan reagendamiento, prospectos con seguimiento por vencer y conversaciones de WhatsApp/redes que requieren atención.

---

## 4. DEFINICIONES Y FÓRMULAS DE CÁLCULO

Para garantizar la estabilidad y consistencia de los datos, todos los cálculos son deterministas y se evalúan desde una única fuente:

1. **Variación Porcentual de KPIs:**
   $$\text{Variación (\%)} = \frac{\text{Valor Actual} - \text{Valor Anterior}}{\text{Valor Anterior}} \times 100$$
   - Si $\text{Valor Actual} \ge \text{Valor Anterior}$, se presenta con prefijo `+` y estilo positivo (`.is-up`).
   - Si $\text{Valor Actual} < \text{Valor Anterior}$, se presenta con estilo de advertencia o descenso (`.is-down`).

2. **Distribución del Estado de Citas:**
   $$\text{Total} = \text{Atendidas} + \text{Pendientes} + \text{Canceladas} + \text{No asistió}$$
   $$\text{Porcentaje Categórico} = \frac{\text{Cantidad de la Categoría}}{\text{Total de Citas}} \times 100$$
   *Garantía:* Las categorías son mutuamente excluyentes y la suma de porcentajes equivale al 100.0%.

3. **Tasas del Embudo Comercial:**
   - **Tasa de Calificación:** $\frac{\text{Prospectos Calificados}}{\text{Contactos Recibidos}} \times 100$
   - **Tasa de Agendamiento:** $\frac{\text{Citas Programadas}}{\text{Prospectos Calificados}} \times 100$
   - **Tasa de Asistencia:** $\frac{\text{Consultas Realizadas}}{\text{Citas Programadas}} \times 100$
   - **Conversión Final de Cohorte:** $\frac{\text{Consultas Realizadas}}{\text{Contactos Recibidos}} \times 100$

4. **Desglose de Ingresos:**
   $$\text{Ingresos Registrados} = \text{Ingresos Efectivamente Cobrados} + \text{Importes Pendientes de Cobro}$$
   *Garantía:* Se evita estrictamente confundir facturación o tarifas teóricas con recaudación real.

---

## 5. FILTROS Y CONSISTENCIA MULTIDIMENSIONAL

El dashboard recalcula en memoria todos los componentes al modificar cualquiera de los 3 filtros:

1. **Período Temporal:**
   - `hoy`: Se alinea estrictamente con el dataset canónico (7 citas del día, 5 pacientes activos, S/ 880.00 en ingresos).
   - `7d`: 52 citas, 18 pacientes nuevos, 11 cirugías, S/ 8,450.00 en ingresos.
   - `30d`: 218 citas, 74 pacientes nuevos, 44 cirugías, S/ 36,200.00 en ingresos.
   - `90d`: 645 citas, 210 pacientes nuevos, 128 cirugías, S/ 108,500.00 en ingresos.

2. **Sede Operativa:**
   - `all`: Consolidado de toda la red clínica.
   - `principal`: Sede Principal en San Isidro (60% del volumen quirúrgico y ambulatorio).
   - `norte`: Sede Norte en Los Olivos (25% del volumen).
   - `sur`: Sede Sur en Surco (15% del volumen).

3. **Especialista Tratante:**
   - `all`: Todos los médicos de la clínica.
   - `Dra. Valeria Ríos`: Especialista en Córnea, Segmento Anterior y Cirugía de Catarata.
   - `Dr. Diego Ramírez`: Especialista en Retina, Vítreo, Glaucoma y Cirugía Refractiva.

---

## 6. SEGURIDAD, ROLES Y ACCESOS

El dashboard se integra con la matriz RBAC de `auth.js`:

- **Administrador (`admin`):**
  Acceso total al Dashboard Ejecutivo con las tres pestañas, filtros cruzados, métricas financieras y visualizaciones quirúrgicas y comerciales.
- **Recepción (`recepcion`):**
  Al ingresar a `#dashboard` visualiza el panel operativo de recepción (hero de turnos, agenda de citas de hoy, seguimiento de confirmaciones y CRM de prospectos) sin acceso a métricas financieras sensibles ni caja.
- **Médico (`medico`):**
  Accede a su agenda médica personal asignada y consultas en curso (`#agenda` y `#consulta`).
- **Técnico (`tecnico`):**
  Accede a la cola de estudios oftalmológicos (`#estudios`).
- **Caja (`caja`):**
  Accede a la gestión de cobros y turnos de caja (`#caja`).

---

## 7. CUMPLIMIENTO ESTRICTO DE POLÍTICAS DE CÓDIGO

La implementación cumple con todas las directivas del proyecto:
1. **Cero uso de "comprobante":** Se emplean exclusivamente "constancia interna de pago", "orden interna de pago", "recibo" y "cobro".
2. **Cero términos normativos/fiscales ficticios:** Ausencia de MINSA, SUSALUD, Boleta de Venta, Factura Electrónica, series B001/F001 y RUC ficticio.
3. **Cero términos de IA no autorizados:** Ausencia total en código de "copilot", "asistente inteligente" e "inteligencia artificial"; se utilizan denominaciones técnicas aprobadas como "agentes ARM", "agentes de automatización" y "flujos automatizados".
4. **Accesibilidad y Motion:** Soporte pleno de `padZeros`, animaciones sobrias con control de entrada única por sesión y desactivación total con movimiento reducido.

---

## 8. RESULTADOS DE PRUEBAS Y VALIDACIÓN

Se verificó el funcionamiento mediante 4 suites automatizadas:

| Suite | Comando | Total Pruebas | Resultado |
|---|---|:---:|:---:|
| Verificación de Sintaxis JS | `npm run check` | 10 archivos | **10 / 10 PASS (100%)** |
| Comprobaciones Estáticas | `npm run test:static` | 84 comprobaciones | **84 / 84 PASS (100%)** |
| Pruebas Unitarias RBAC, CRM, ARM y Dashboard | `npm run test:unit` | 297 pruebas | **297 / 297 PASS (100%)** |
| Pruebas Funcionales en Navegador Real (Chrome CDP) | `npm run test:browser` | 364 pruebas | **364 / 364 PASS (100%)** |
| **Total Global de Comprobaciones** | `npm test` | **755 verificaciones** | **755 / 755 PASS (100%)** |

---

## 9. INTEGRACIONES FUTURAS PENDIENTES

Cuando se conecte una infraestructura de backend real:
1. **Endpoint REST/GraphQL de Analítica:** Reemplazar `RAW_PERIOD_DATA` en `getDashboardMetrics` por llamadas asíncronas a un servicio como `GET /api/v1/analytics/dashboard?period=&sede=&doctor=`.
2. **Suscripción en Tiempo Real:** Conectar WebSockets o SSE a `receptionDashboard` para actualizar contadores conforme se registran cobros en Caja o llegadas en Kiosco.
3. **Exportación de Reportes Ejecutivos:** Habilitar descarga en PDF de las 3 vistas mediante generación server-side o CSS print.
