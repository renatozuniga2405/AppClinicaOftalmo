// Test suite especializada para el Dashboard Ejecutivo del Panel General v1.3
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import {
  SPECIALTIES_CATALOG,
  SURGERIES_CATALOG,
  SEDES_CATALOG,
  PERIODS_CATALOG,
  DOCTORS_CATALOG,
  PERIOD_WINDOWS,
  DEMO_PATIENTS_CATALOG,
  DEMO_APPOINTMENTS,
  DEMO_NEW_PATIENTS,
  DEMO_SURGERIES,
  DEMO_STUDY_ORDERS,
  DEMO_TRANSACTIONS,
  DEMO_CRM_RECORDS,
  dashboardState,
  reconcileIntegerSeries,
  reconcilePairedSeries,
  computeVariationMeta,
  validateDashboardDatasetIntegrity,
  getFilteredDashboardRecords,
  getDashboardMetrics,
  renderAppointmentsTrendChart,
  renderAppointmentStatusDonut,
  renderSpecialtiesBarChart,
  renderRevenueChart,
  renderFunnelChart,
  renderSurgeriesBarChart,
  renderFiltersBar,
  renderMainKpiCards,
  renderAlertsPanel,
  renderGeneralTabContent,
  renderMedicalTabContent,
  renderCommercialTabContent
} from './app/dashboard.js';

const styleCss = await readFile('./app/style.css', 'utf8');
const dashboardJsSource = await readFile('./app/dashboard.js', 'utf8');

console.log('=== SUITE DE PRUEBAS DEL DASHBOARD EJECUTIVO PANEL GENERAL v1.3 ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Catálogos base y configuración
test('1.1 Catálogo de especialidades contiene las 5 ramas requeridas', () => {
  assert.equal(SPECIALTIES_CATALOG.length, 5);
  const ids = SPECIALTIES_CATALOG.map(s => s.id);
  assert(ids.includes('general'), 'Incluye Oftalmología general');
  assert(ids.includes('retina'), 'Incluye Retina');
  assert(ids.includes('glaucoma'), 'Incluye Glaucoma');
  assert(ids.includes('cornea'), 'Incluye Córnea');
  assert(ids.includes('pediatrica'), 'Incluye Oftalmología pediátrica');
});

test('1.2 Catálogo de cirugías contiene los 4 procedimientos aprobados', () => {
  assert.equal(SURGERIES_CATALOG.length, 4);
  const ids = SURGERIES_CATALOG.map(s => s.id);
  assert(ids.includes('catarata'), 'Incluye Catarata');
  assert(ids.includes('refractiva'), 'Incluye Cirugía refractiva');
  assert(ids.includes('retina'), 'Incluye Retina');
  assert(ids.includes('glaucoma'), 'Incluye Glaucoma');
});

test('1.3 Catálogos de sedes y períodos configurados correctamente', () => {
  assert.equal(SEDES_CATALOG.length, 4);
  assert.equal(PERIODS_CATALOG.length, 4);
  assert.equal(dashboardState.tab, 'general');
  assert.equal(dashboardState.period, 'hoy');
});

// 2. Cálculo determinista de KPIs desde fixtures relacionales válidos
test('2.1 Período Hoy calcula KPIs exactamente desde los registros válidos del 2026-10-27', () => {
  const m = getDashboardMetrics('hoy', 'all', 'all');
  // En 2026-10-27 existen 8 citas (3 Atendidas de primera atención, 4 Pendientes, 1 Cancelada)
  assert.equal(m.kpi.appointments.count, 8, 'Total citas hoy es 8');
  assert.equal(m.appointmentStatus.attended, 3, 'Citas atendidas hoy es 3');
  assert.equal(m.appointmentStatus.pending, 4, 'Citas pendientes hoy es 4');
  assert.equal(m.appointmentStatus.cancelled, 1, 'Citas canceladas hoy es 1');
  assert.equal(m.kpi.patientsNew.count, 3, 'Pacientes nuevos con 1.ª atención Atendida hoy es 3');
  assert.equal(m.kpi.patientsNew.pendingOrTechnicalInScope, 3, '3 pacientes registrados hoy sin 1.ª atención médica completada no se inflan como atendidos');
  assert.equal(m.kpi.surgeries.count, 2, 'Total cirugías hoy es 2');
  assert.equal(m.kpi.revenue.collected, 630, 'Cobrado hoy (3 citas atendidas 180+150+150 + 1 estudio 150) = S/ 630.00');
  assert.equal(m.kpi.revenue.pending, 2530, 'Pendiente hoy (4 citas pendientes 630 + 2 cirugías programadas 1800 + 1 estudio 100) = S/ 2,530.00');
  assert.equal(m.kpi.revenue.total, 3160, 'Total ingresos hoy = S/ 3,160.00');
});

test('2.2 Variaciones porcentuales calculadas correctamente desde las ventanas previas reales', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const expectedAppVar = ((m.kpi.appointments.count - m.kpi.appointments.previous) / m.kpi.appointments.previous) * 100;
  assert.equal(m.kpi.appointments.variation.toFixed(1), expectedAppVar.toFixed(1));

  const expectedRevVar = ((m.kpi.revenue.total - m.kpi.revenue.previous) / m.kpi.revenue.previous) * 100;
  assert.equal(m.kpi.revenue.variation.toFixed(1), expectedRevVar.toFixed(1));
});

test('2.3 Categorías de citas en gráfico de dona son mutuamente excluyentes y consistentes', () => {
  const m = getDashboardMetrics('30d', 'all', 'all');
  const { total, attended, pending, cancelled, noShow } = m.appointmentStatus;
  assert.equal(attended + pending + cancelled + noShow, total, 'Suma de partes igual al total de citas');
  assert(total > 0 && attended > 0 && pending > 0 && cancelled > 0 && noShow > 0, 'Existen registros reales de los 4 estados de cita');
});

test('2.4 Filtrado por Sede recalcula desde los registros manteniendo consistencia', () => {
  const allM = getDashboardMetrics('30d', 'all', 'all');
  const prinM = getDashboardMetrics('30d', 'principal', 'all');
  const norteM = getDashboardMetrics('30d', 'norte', 'all');

  assert(prinM.kpi.appointments.count < allM.kpi.appointments.count, 'Sede individual tiene menor volumen que el consolidado');
  assert(prinM.kpi.appointments.count > norteM.kpi.appointments.count, 'Sede Principal tiene mayor volumen que Sede Norte');
  assert(prinM.kpi.revenue.total < allM.kpi.revenue.total, 'Ingresos de sede individual menores al consolidado');
});

test('2.5 Filtrado por Especialista recalcula consultas y cirugías según registros reales de su especialidad', () => {
  const docRios = getDashboardMetrics('7d', 'all', 'Dra. Valeria Ríos');
  const docRamirez = getDashboardMetrics('7d', 'all', 'Dr. Diego Ramírez');

  const riosCornea = docRios.specialties.list.find(s => s.id === 'cornea')?.count || 0;
  const ramirezCornea = docRamirez.specialties.list.find(s => s.id === 'cornea')?.count || 0;
  assert(riosCornea > ramirezCornea, 'Dra. Ríos tiene mayor volumen en Córnea que Dr. Ramírez');

  const riosRetina = docRios.specialties.list.find(s => s.id === 'retina')?.count || 0;
  const ramirezRetina = docRamirez.specialties.list.find(s => s.id === 'retina')?.count || 0;
  assert(ramirezRetina > riosRetina, 'Dr. Ramírez tiene mayor volumen en Retina que Dra. Ríos');
});

test('2.6 Embudo comercial CRM + ARM evalúa cohorte estricta con tasas no decrecientes hacia adelante', () => {
  const m = getDashboardMetrics('30d', 'all', 'all');
  const { contacts, qualified, scheduled, attended, rates } = m.crmFunnel;

  assert(contacts >= qualified, 'Contactos >= Calificados');
  assert(qualified >= scheduled, 'Calificados >= Agendados');
  assert(scheduled >= attended, 'Agendados >= Atendidos');
  assert(rates.finalConversion > 0 && rates.finalConversion <= 100, 'Tasa de conversión final válida');
});

// 3. Renderizadores de gráficos SVG
test('3.1 Gráfico de Líneas (Evolución de citas) genera SVG con 2 series y tooltips', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const html = renderAppointmentsTrendChart(m.trends);
  assert(html.includes('<svg'), 'Contiene elemento SVG');
  assert(html.includes('polyline points='), 'Contiene polilíneas para las series');
  assert(html.includes('Programadas'), 'Contiene leyenda Programadas');
  assert(html.includes('Atendidas'), 'Contiene leyenda Atendidas');
  assert(html.includes('class="chart-point"'), 'Contiene puntos interactivos con tooltips');
});

test('3.2 Gráfico de Dona (Estado de citas) genera SVG con arcos, centro métrico y leyenda', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const html = renderAppointmentStatusDonut(m.appointmentStatus);
  assert(html.includes('class="donut-svg"'), 'Contiene SVG de dona');
  assert(html.includes('donut-segment'), 'Contiene segmentos de círculo');
  assert(html.includes('Total citas'), 'Contiene etiqueta de centro métrico');
  assert(html.includes('Atendidas'), 'Contiene leyenda Atendidas');
  assert(html.includes('Pendientes'), 'Contiene leyenda Pendientes');
  assert(html.includes('Canceladas'), 'Contiene leyenda Canceladas');
  assert(html.includes('No asistió'), 'Contiene leyenda No asistió');
});

test('3.3 Gráfico de Especialidades genera barras proporcionales y porcentajes', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const html = renderSpecialtiesBarChart(m.specialties);
  assert(html.includes('Consultas por especialidad'), 'Contiene título del gráfico');
  assert(html.includes('Oftalmología general'), 'Contiene especialidad General');
  assert(html.includes('Retina y Vítreo'), 'Contiene especialidad Retina');
  assert(html.includes('Glaucoma'), 'Contiene especialidad Glaucoma');
  assert(html.includes('dash-bar-track'), 'Contiene tracks de barras');
});

test('3.4 Gráfico de Ingresos genera barras compuestas para Cobrado y Pendiente', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const html = renderRevenueChart(m.revenueBuckets);
  assert(html.includes('Evolución de ingresos'), 'Contiene título del gráfico');
  assert(html.includes('Cobrado'), 'Contiene serie Cobrado');
  assert(html.includes('Pendiente'), 'Contiene serie Pendiente');
  assert(html.includes('class="revenue-bar"'), 'Contiene barras de ingresos');
});

test('3.5 Gráfico de Embudo CRM + ARM genera 4 etapas progresivas con tasas de paso', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const html = renderFunnelChart(m.crmFunnel);
  assert(html.includes('Embudo comercial CRM + ARM'), 'Contiene título del gráfico');
  assert(html.includes('1. Contactos recibidos'), 'Contiene etapa 1');
  assert(html.includes('2. Prospectos calificados'), 'Contiene etapa 2');
  assert(html.includes('3. Citas programadas'), 'Contiene etapa 3');
  assert(html.includes('4. Consultas realizadas'), 'Contiene etapa 4');
  assert(html.includes('Conversión final'), 'Contiene conversión final');
});

test('3.6 Gráfico de Cirugías por procedimiento genera barras clínicas sin datos identificables de pacientes', () => {
  const m = getDashboardMetrics('7d', 'all', 'all');
  const html = renderSurgeriesBarChart(m.surgeries);
  assert(html.includes('Cirugías por procedimiento'), 'Contiene título');
  assert(html.includes('Catarata'), 'Contiene Catarata');
  assert(html.includes('Cirugía refractiva'), 'Contiene Cirugía refractiva');
  assert(!html.includes('DNI'), 'No contiene identificadores de pacientes');
  assert(!html.includes('0000000'), 'No contiene documentos');
});

// 4. Componentes y Pestañas
test('4.1 Barra de filtros renderiza selectores de período, sede y especialista', () => {
  const html = renderFiltersBar(dashboardState, {});
  assert(html.includes('id="dash-filter-period"'), 'Contiene selector de período');
  assert(html.includes('id="dash-filter-sede"'), 'Contiene selector de sede');
  assert(html.includes('id="dash-filter-doctor"'), 'Contiene selector de especialista');
  assert(html.includes('data-dash-tab="general"'), 'Contiene tab General');
  assert(html.includes('data-dash-tab="medico"'), 'Contiene tab Médico');
  assert(html.includes('data-dash-tab="comercial"'), 'Contiene tab Comercial');
});

test('4.2 Tarjetas KPI principales incluyen los 4 indicadores requeridos con data-motion-key y notas de atribución', () => {
  const m = getDashboardMetrics('hoy', 'all', 'all');
  const html = renderMainKpiCards(m.kpi, dashboardState, { users: '', calendar: '', stethoscope: '', cash: '' });
  assert(html.includes('Pacientes nuevos'), 'KPI 01: Pacientes nuevos');
  assert(html.includes('data-motion-key="dashboard:pacientes-activos"'), 'Posee key pacientes-activos');
  assert(html.includes('Citas registradas'), 'KPI 02: Citas registradas');
  assert(html.includes('data-motion-key="dashboard:citas-hoy"'), 'Posee key citas-hoy');
  assert(html.includes('Cirugías programadas'), 'KPI 03: Cirugías');
  assert(html.includes('Ingresos del período'), 'KPI 04: Ingresos');
  assert(html.includes('href="#agenda"'), 'Acceso rápido a agenda');
  assert(html.includes('Cobrado:'), 'Diferencia cobrado vs pendiente');
  assert(html.includes('data-kpi-attribution="patients"'), 'Incluye desglose de atribución en Pacientes nuevos');
  assert(html.includes('data-kpi-attribution="revenue"'), 'Incluye desglose de atribución en Ingresos');
});

test('4.3 Panel de Alertas Inteligentes incluye prioridades y enlaces de acción rápida', () => {
  const m = getDashboardMetrics('hoy', 'all', 'all');
  const html = renderAlertsPanel(m.alerts, {});
  assert(html.includes('Alertas operativas de supervisión'), 'Título de alertas');
  assert(html.includes('href="#agenda"'), 'Enlace a agenda');
  assert(html.includes('href="#crm"'), 'Enlace a CRM');
  assert(html.includes('href="#inbox"'), 'Enlace a Inbox');
});

test('4.4 Pestaña General integra 4 KPIs, 4 Gráficos (Líneas, Dona, Ingresos, Especialidades) y Alertas', () => {
  const m = getDashboardMetrics('hoy', 'all', 'all');
  const html = renderGeneralTabContent(m, {});
  assert(html.includes('Evolución de citas médicas'), 'Incluye Gráfico 01');
  assert(html.includes('Estado de las citas'), 'Incluye Gráfico 02');
  assert(html.includes('Evolución de ingresos'), 'Incluye Gráfico 04');
  assert(html.includes('Consultas por especialidad'), 'Incluye Gráfico 03');
  assert(html.includes('Alertas operativas'), 'Incluye Alertas');
});

test('4.5 Pestaña Médico integra Consultas por Especialidad, Cirugías y Ocupación médica', () => {
  const m = getDashboardMetrics('hoy', 'all', 'all');
  const html = renderMedicalTabContent(m, {});
  assert(html.includes('Consultas por especialidad'), 'Incluye Gráfico 03');
  assert(html.includes('Cirugías por procedimiento'), 'Incluye Gráfico 06');
  assert(html.includes('Ocupación y turnos de especialistas'), 'Incluye Ocupación médica');
  assert(html.includes('Dra. Valeria Ríos'), 'Incluye Dra. Valeria Ríos');
  assert(html.includes('Dr. Diego Ramírez'), 'Incluye Dr. Diego Ramírez');
});

test('4.6 Pestaña Comercial integra Embudo CRM + ARM y rendimiento de agentes', () => {
  const m = getDashboardMetrics('hoy', 'all', 'all');
  const html = renderCommercialTabContent(m, {});
  assert(html.includes('Embudo comercial CRM + ARM'), 'Incluye Gráfico 05');
  assert(html.includes('Rendimiento de agentes ARM'), 'Incluye Rendimiento de agentes');
  assert(html.includes('Tasa de resolución'), 'Incluye métrica de resolución');
});

// 5. Utilidades, 48 combinaciones, variaciones y accesibilidad
test('5.1 reconcileIntegerSeries y reconcilePairedSeries preservan totales exactos sin negativos', () => {
  const dist = reconcileIntegerSeries([0.60, 0.25, 0.15], 7);
  assert.equal(dist.reduce((a, b) => a + b, 0), 7, 'Suma exacta igual a 7');
  assert(dist.every(v => Number.isInteger(v) && v >= 0), 'Todos enteros no negativos');

  const zeroDist = reconcileIntegerSeries([10, 20, 30], 0);
  assert.deepEqual(zeroDist, [0, 0, 0], 'Target 0 devuelve ceros');

  const paired = reconcilePairedSeries([2, 3, 1, 1, 0, 0], [2, 0, 0, 0, 0, 0], 4, 2);
  assert.equal(paired.scheduled.reduce((a, b) => a + b, 0), 4, 'Programadas suma 4');
  assert.equal(paired.attended.reduce((a, b) => a + b, 0), 2, 'Atendidas suma 2');
  assert(paired.attended.every((v, i) => v <= paired.scheduled[i]), 'Atendidas nunca supera Programadas en ningún punto');
});

test('5.2 computeVariationMeta distingue base cero, variación neutra (0.0%), positiva y negativa', () => {
  const zeroToZero = computeVariationMeta(0, 0);
  assert.equal(zeroToZero.hasValidBase, true);
  assert.equal(zeroToZero.state, 'neutral');
  assert.equal(zeroToZero.label, '0.0%');

  const zeroToPositive = computeVariationMeta(2, 0);
  assert.equal(zeroToPositive.hasValidBase, false);
  assert.equal(zeroToPositive.state, 'neutral');
  assert.equal(zeroToPositive.label, 'Sin base previa');

  const sameVal = computeVariationMeta(10, 10);
  assert.equal(sameVal.state, 'neutral');
  assert.equal(sameVal.isNeutral, true);
  assert.equal(sameVal.label, '0.0%');

  const invertedUp = computeVariationMeta(15, 10, { invertPolarity: true });
  assert.equal(invertedUp.state, 'down');
  assert.equal(invertedUp.isPositive, false);
});

test('5.3 Invariantes matemáticos estrictos en las 48 combinaciones (4 períodos × 4 sedes × 3 opciones de médico)', () => {
  const periods = PERIODS_CATALOG.map(p => p.id);
  const sedes = SEDES_CATALOG.map(s => s.id);
  const doctors = DOCTORS_CATALOG.map(d => d.id);
  let checked = 0;

  for (const p of periods) {
    for (const s of sedes) {
      for (const d of doctors) {
        checked++;
        const m = getDashboardMetrics(p, s, d);
        const key = `${p}|${s}|${d}`;
        const a = m.appointmentStatus;

        assert.equal(a.attended + a.pending + a.cancelled + a.noShow, a.total, `Suma de estados = total en ${key}`);
        assert.equal(a.total, m.kpi.appointments.count, `Total estados = KPI citas en ${key}`);

        assert.equal(m.specialties.total, a.attended, `Especialidades = atendidas en ${key}`);
        assert(m.specialties.total <= m.kpi.appointments.count, `Consultas atendidas <= citas registradas en ${key}`);

        assert.equal(m.surgeries.total, m.kpi.surgeries.count, `Procedimientos = KPI cirugías en ${key}`);

        const sumSched = m.trends.scheduled.reduce((x, y) => x + y, 0);
        const sumAtt = m.trends.attended.reduce((x, y) => x + y, 0);
        assert.equal(sumSched, a.total, `Serie programadas = total citas en ${key}`);
        assert.equal(sumAtt, a.attended, `Serie atendidas = citas atendidas en ${key}`);
        assert(m.trends.attended.every((v, idx) => v >= 0 && v <= m.trends.scheduled[idx]), `Atendidas <= Programadas por punto en ${key}`);

        const sumCol = m.revenueBuckets.collected.reduce((x, y) => x + y, 0);
        const sumPen = m.revenueBuckets.pending.reduce((x, y) => x + y, 0);
        assert.equal(sumCol, m.kpi.revenue.collected, `Barras cobrado = KPI cobrado en ${key}`);
        assert.equal(sumPen, m.kpi.revenue.pending, `Barras pendiente = KPI pendiente en ${key}`);
        assert.equal(m.kpi.revenue.collected + m.kpi.revenue.pending, m.kpi.revenue.total, `Cobrado + pendiente = total en ${key}`);

        const sumDocApps = m.doctorOccupancy.reduce((x, y) => x + y.appointments, 0);
        const sumDocSurgs = m.doctorOccupancy.reduce((x, y) => x + y.surgeries, 0);
        assert.equal(sumDocApps, m.kpi.appointments.count, `Citas de especialistas = KPI citas en ${key}`);
        assert.equal(sumDocSurgs, m.kpi.surgeries.count, `Cirugías de especialistas = KPI cirugías en ${key}`);

        const noShowAlert = m.alerts.find(al => al.id === 'noshow-recovery');
        const confirmAlert = m.alerts.find(al => al.id === 'confirm-pending');
        const surgAlert = m.alerts.find(al => al.id === 'surgical-readiness');
        assert.equal(noShowAlert.count, a.noShow, `Alerta no asistió = Dona noShow en ${key}`);
        assert(confirmAlert.count <= a.pending, `Alerta por confirmar <= pendientes en ${key}`);
        assert(surgAlert.count <= m.kpi.surgeries.count, `Alerta prequirúrgica <= cirugías en ${key}`);

        const f = m.crmFunnel;
        assert(f.contacts >= f.qualified && f.qualified >= f.scheduled && f.scheduled >= f.attended && f.attended >= 0, `Embudo monótono en ${key}`);
        assert(f.attended <= a.attended, `Embudo atendidos <= consultas atendidas en ${key}`);

        const rates = [
          a.attendanceRate,
          f.rates.qualification,
          f.rates.booking,
          f.rates.attendance,
          f.rates.finalConversion,
          m.averageOccupancyRate,
          ...m.doctorOccupancy.map(doc => doc.rate)
        ];
        assert(rates.every(r => !Number.isNaN(r) && r >= 0 && r <= 100), `Tasas entre 0 y 100 en ${key}`);
      }
    }
  }
  assert.equal(checked, 48, 'Se verificaron exactamente las 48 combinaciones');
});

test('5.4 Aditividad exacta entre sedes y partición atribuida + no atribuida entre especialistas', () => {
  for (const p of ['hoy', '7d', '30d', '90d']) {
    const allSedes = getDashboardMetrics(p, 'all', 'all');
    const prin = getDashboardMetrics(p, 'principal', 'all');
    const norte = getDashboardMetrics(p, 'norte', 'all');
    const sur = getDashboardMetrics(p, 'sur', 'all');

    assert.equal(prin.kpi.patientsNew.count + norte.kpi.patientsNew.count + sur.kpi.patientsNew.count, allSedes.kpi.patientsNew.count, `Suma de pacientes nuevos por sede = Todas las sedes en ${p}`);
    assert.equal(prin.kpi.appointments.count + norte.kpi.appointments.count + sur.kpi.appointments.count, allSedes.kpi.appointments.count, `Suma de citas por sede = Todas las sedes en ${p}`);
    assert.equal(prin.kpi.surgeries.count + norte.kpi.surgeries.count + sur.kpi.surgeries.count, allSedes.kpi.surgeries.count, `Suma de cirugías por sede = Todas las sedes en ${p}`);
    assert.equal(prin.kpi.revenue.total + norte.kpi.revenue.total + sur.kpi.revenue.total, allSedes.kpi.revenue.total, `Suma de ingresos por sede = Todas las sedes en ${p}`);

    for (const s of ['all', 'principal', 'norte', 'sur']) {
      const both = getDashboardMetrics(p, s, 'all');
      const rios = getDashboardMetrics(p, s, 'Dra. Valeria Ríos');
      const ramirez = getDashboardMetrics(p, s, 'Dr. Diego Ramírez');
      assert.equal(rios.kpi.appointments.count + ramirez.kpi.appointments.count, both.kpi.appointments.count, `Ríos + Ramírez citas = Total en ${p}|${s}`);
      assert.equal(rios.kpi.surgeries.count + ramirez.kpi.surgeries.count, both.kpi.surgeries.count, `Ríos + Ramírez cirugías = Total en ${p}|${s}`);
      assert.equal(rios.kpi.patientsNew.count + ramirez.kpi.patientsNew.count, both.kpi.patientsNew.count, `Ríos + Ramírez primeras atenciones Atendidas = Total en ${p}|${s}`);
      assert.equal(rios.kpi.revenue.total + ramirez.kpi.revenue.total, both.kpi.revenue.attributedTotal, `Ríos + Ramírez ingresos = Ingresos atribuidos en ${p}|${s}`);
      assert.equal(rios.kpi.revenue.total + ramirez.kpi.revenue.total + both.kpi.revenue.unattributedTotal, both.kpi.revenue.total, `Atribuidos + No atribuidos = Ingresos totales en ${p}|${s}`);
      assert.equal(rios.crmFunnel.contacts + ramirez.crmFunnel.contacts + both.crmFunnel.unattributedInScope, both.crmFunnel.contacts, `Ríos + Ramírez + No atribuidos CRM = Total contactos en ${p}|${s}`);
    }
  }
});

test('5.5 Mensaje quirúrgico coherente cuando cirugías = 0 y etiqueta "Sin base previa" cuando previous = 0', () => {
  const mZeroSurg = getDashboardMetrics('hoy', 'sur', 'Dra. Valeria Ríos');
  assert.equal(mZeroSurg.kpi.surgeries.count, 0);
  assert.equal(mZeroSurg.kpi.surgeries.status, 'Sin cirugías programadas en la selección');

  const mNoPrevBase = getDashboardMetrics('hoy', 'all', 'Dr. Diego Ramírez');
  assert.equal(mNoPrevBase.kpi.surgeries.count, 1);
  assert.equal(mNoPrevBase.kpi.surgeries.previous, 0);
  assert.equal(mNoPrevBase.kpi.surgeries.hasValidBase, false);
  assert.equal(mNoPrevBase.kpi.surgeries.label, 'Sin base previa');
});

test('5.6 Eje Y del Gráfico 01 no genera marcas duplicadas en selecciones de bajo volumen (Hoy + Sede Sur)', () => {
  const m = getDashboardMetrics('hoy', 'sur', 'Dra. Valeria Ríos');
  const svgHtml = renderAppointmentsTrendChart(m.trends);
  const yTicks = [...svgHtml.matchAll(/text-anchor="end"[^>]*>(\d+)<\/text>/g)].map(match => Number(match[1]));
  const uniqueTicks = new Set(yTicks);
  assert.equal(yTicks.length, 5, 'Genera 5 marcas de escala vertical');
  assert.equal(uniqueTicks.size, yTicks.length, `Las marcas del eje Y son estrictamente únicas: ${yTicks.join(', ')}`);
});

test('5.7 Accesibilidad WAI-ARIA en pestañas, barras de ingresos SVG y aislamiento CSS .dash-funnel-rate', () => {
  const filtersHtml = renderFiltersBar(dashboardState, {});
  assert(filtersHtml.includes('aria-controls="dash-panel-general"'), 'Tab General posee aria-controls');
  assert(filtersHtml.includes('id="dash-tab-medico"'), 'Tab Médico posee id');

  const m = getDashboardMetrics('hoy', 'all', 'all');
  const revHtml = renderRevenueChart(m.revenueBuckets);
  assert(revHtml.includes('role="img" aria-label="08:00–10:00 · Cobrado:'), 'Barras de ingresos poseen role="img" y aria-label');

  const funnelHtml = renderFunnelChart(m.crmFunnel);
  assert(funnelHtml.includes('class="dash-funnel-rate"'), 'Usa clase aislada .dash-funnel-rate');
  assert(!funnelHtml.includes('class="funnel-rate"'), 'Elimina colisión con clase .funnel-rate de CRM');

  const generalHtml = renderGeneralTabContent(m, {});
  const medHtml = renderMedicalTabContent(m, {});
  const comHtml = renderCommercialTabContent(m, {});
  assert(generalHtml.includes('data-motion-key="dashboard:citas-hoy"'), 'Pestaña General contiene los 4 KPIs ejecutivos principales');
  assert(!medHtml.includes('data-motion-key="dashboard:citas-hoy"'), 'Pestaña Médico no duplica los 4 KPIs ejecutivos generales');
  assert(!comHtml.includes('data-motion-key="dashboard:citas-hoy"'), 'Pestaña Comercial no duplica los 4 KPIs ejecutivos generales');
});

// ============================================================================
// 6. VALIDACIÓN AUTOMÁTICA DE INTEGRIDAD RELACIONAL Y PRUEBAS NEGATIVAS (v1.3)
// ============================================================================

test('6.1 Validador independiente aprueba el dataset de producción con 0 errores y conteos exactos', () => {
  const res = validateDashboardDatasetIntegrity();
  assert.equal(res.valid, true, `Errores encontrados: ${res.errors.join(' | ')}`);
  assert.equal(res.errors.length, 0);

  assert.equal(DEMO_PATIENTS_CATALOG.length, 181, 'DEMO_PATIENTS_CATALOG = 181');
  assert.equal(DEMO_NEW_PATIENTS.length, 157, 'DEMO_NEW_PATIENTS = 157');
  assert.equal(DEMO_APPOINTMENTS.length, 378, 'DEMO_APPOINTMENTS = 378');
  assert.equal(DEMO_SURGERIES.length, 64, 'DEMO_SURGERIES = 64');
  assert.equal(DEMO_STUDY_ORDERS.length, 39, 'DEMO_STUDY_ORDERS = 39');
  assert.equal(DEMO_TRANSACTIONS.length, 464, 'DEMO_TRANSACTIONS = 464');
  assert.equal(DEMO_CRM_RECORDS.length, 473, 'DEMO_CRM_RECORDS = 473');

  const appTrx = DEMO_TRANSACTIONS.filter(t => t.appointmentId !== null).length;
  const surgTrx = DEMO_TRANSACTIONS.filter(t => t.surgeryId !== null).length;
  const orderTrx = DEMO_TRANSACTIONS.filter(t => t.studyOrderId !== null).length;
  assert.equal(appTrx, 361, 'Transacciones de consulta = 361');
  assert.equal(surgTrx, 64, 'Transacciones quirúrgicas = 64');
  assert.equal(orderTrx, 39, 'Transacciones de estudio técnico = 39');
  assert.equal(appTrx + surgTrx + orderTrx, 464, '361 + 64 + 39 = 464');

  // Confirmar eliminación total de populateSlice y cuotas artificiales en dashboard.js
  assert(!dashboardJsSource.includes('populateSlice'), 'Eliminado generador defectuoso populateSlice()');
  assert(!dashboardJsSource.includes('distributeSedeForIndex'), 'Eliminada distribución por cuotas distributeSedeForIndex()');
  assert(!dashboardJsSource.includes('riosShare'), 'Eliminado riosShare');
  assert(!dashboardJsSource.includes('PAT-HIST-'), 'Eliminados IDs ficticios huérfanos PAT-HIST-');
});

test('6.2 Pruebas negativas: validateDashboardDatasetIntegrity rechaza los 6 escenarios inválidos obligatorios', () => {
  const baseDataset = {
    patientsCatalog: DEMO_PATIENTS_CATALOG,
    newPatients: DEMO_NEW_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    surgeries: DEMO_SURGERIES,
    studyOrders: DEMO_STUDY_ORDERS,
    transactions: DEMO_TRANSACTIONS,
    crmRecords: DEMO_CRM_RECORDS
  };

  // Negativo 1: Cita con paciente inexistente
  const badAppNoPatient = {
    ...DEMO_APPOINTMENTS[0],
    id: 'APT-BAD-0001',
    patientId: 'PAT-INEXISTENTE-9999',
    date: '2026-10-28',
    startTime: '08:00',
    endTime: '08:30'
  };
  const r1 = validateDashboardDatasetIntegrity({
    ...baseDataset,
    appointments: [...DEMO_APPOINTMENTS, badAppNoPatient]
  });
  assert.equal(r1.valid, false, 'Rechaza cita con paciente inexistente');
  assert(r1.errors.some(e => e.includes('PAT-INEXISTENTE-9999')));

  // Negativo 2: Primera atención vinculada a cita Cancelada o Pendiente
  const cancelledApp = DEMO_APPOINTMENTS.find(a => a.status === 'Cancelada');
  const badNewPatCancelled = {
    id: cancelledApp.patientId,
    patientCode: 'HC-BAD-0002',
    patientName: 'Paciente Inválido',
    firstAttentionDate: cancelledApp.date,
    sede: cancelledApp.sede,
    firstAttentionDoctor: cancelledApp.doctor,
    firstAppointmentId: cancelledApp.id,
    firstAttentionCompleted: true
  };
  const r2 = validateDashboardDatasetIntegrity({
    ...baseDataset,
    newPatients: [...DEMO_NEW_PATIENTS.filter(p => p.id !== cancelledApp.patientId), badNewPatCancelled]
  });
  assert.equal(r2.valid, false, 'Rechaza primera atención cuya cita está Cancelada');
  assert(r2.errors.some(e => e.includes('debe ser "Atendida"')));

  // Negativo 3: Primera atención con médico diferente del médico de la cita
  const validCompletedPat = DEMO_NEW_PATIENTS.find(p => p.firstAttentionCompleted);
  const wrongDoc = validCompletedPat.firstAttentionDoctor === 'Dra. Valeria Ríos' ? 'Dr. Diego Ramírez' : 'Dra. Valeria Ríos';
  const r3 = validateDashboardDatasetIntegrity({
    ...baseDataset,
    newPatients: DEMO_NEW_PATIENTS.map(p => p.id === validCompletedPat.id ? { ...p, firstAttentionDoctor: wrongDoc } : p)
  });
  assert.equal(r3.valid, false, 'Rechaza primera atención con especialista distinto al de la cita');
  assert(r3.errors.some(e => e.includes('no coincide con médico de cita')));

  // Negativo 4: Dos citas solapadas del mismo médico en la misma fecha (intervalo parcial 08:15-08:45 contra 08:00-08:30)
  const targetApp = DEMO_APPOINTMENTS.find(a => a.date === '2026-10-27' && a.startTime === '08:00');
  const overlappingApp = {
    ...targetApp,
    id: 'APT-OVERLAP-9999',
    patientId: DEMO_PATIENTS_CATALOG[0].id,
    startTime: '08:15',
    endTime: '08:45'
  };
  const r4 = validateDashboardDatasetIntegrity({
    ...baseDataset,
    appointments: [...DEMO_APPOINTMENTS, overlappingApp]
  });
  assert.equal(r4.valid, false, 'Rechaza dos citas solapadas del mismo médico');
  assert(r4.errors.some(e => e.includes('citas solapadas')));

  // Negativo 5: Transacción con sede incompatible con la cita referenciada
  const linkedTrx = DEMO_TRANSACTIONS.find(t => t.appointmentId !== null);
  const wrongSede = linkedTrx.sede === 'principal' ? 'sur' : 'principal';
  const r5 = validateDashboardDatasetIntegrity({
    ...baseDataset,
    transactions: DEMO_TRANSACTIONS.map(t => t.id === linkedTrx.id ? { ...t, sede: wrongSede } : t)
  });
  assert.equal(r5.valid, false, 'Rechaza transacción con sede incompatible con la cita');
  assert(r5.errors.some(e => e.includes('incompatible con cita')));

  // Negativo 6: Lead no agendado con especialista asignado sin vínculo válido de cita ni paciente
  const badLead = {
    id: 'LEAD-BAD-9999',
    date: '2026-10-27',
    sede: 'principal',
    doctor: 'Dra. Valeria Ríos',
    origin: 'Google',
    qualified: false,
    scheduled: false,
    attended: false,
    patientId: null,
    appointmentId: null
  };
  const r6 = validateDashboardDatasetIntegrity({
    ...baseDataset,
    crmRecords: [...DEMO_CRM_RECORDS, badLead]
  });
  assert.equal(r6.valid, false, 'Rechaza lead con especialista sin vínculo válido');
  assert(r6.errors.some(e => e.includes('sin vínculo válido')));
});

test('6.3 Integridad de primeras atenciones: cita posterior con otro especialista no altera médico de 1.ª atención', () => {
  // En 2026-10-27, patHoy2 fue atendido por 1.ª vez a las 08:30 por Dra. Valeria Ríos y tiene interconsulta Pendiente a las 12:30 con Dr. Diego Ramírez
  const patWithSubsequent = DEMO_NEW_PATIENTS.find(p =>
    p.firstAttentionDate === '2026-10-27' &&
    p.firstAttentionCompleted === true &&
    p.firstAttentionDoctor === 'Dra. Valeria Ríos' &&
    p.subsequentDoctor === 'Dr. Diego Ramírez'
  );
  assert(patWithSubsequent, 'Existe paciente en Hoy con 1.ª atención Atendida con Dra. Ríos e interconsulta posterior con Dr. Ramírez');

  const mRamirezHoy = getDashboardMetrics('hoy', 'all', 'Dr. Diego Ramírez');
  assert(!mRamirezHoy.kpi.patientsNew.recordIds.includes(patWithSubsequent.id), 'La cita posterior con Dr. Ramírez no atribuye la 1.ª atención a Dr. Ramírez');
});

test('6.4 Especialista sin transacciones atribuidas recibe S/ 0.00 aunque existan cobros no asignados en la sede', () => {
  const surAll = getDashboardMetrics('hoy', 'sur', 'all');
  const surRios = getDashboardMetrics('hoy', 'sur', 'Dra. Valeria Ríos');
  const surRamirez = getDashboardMetrics('hoy', 'sur', 'Dr. Diego Ramírez');

  assert.equal(surAll.kpi.revenue.total, 250, 'Hoy + Sede Sur registra S/ 250.00 en estudios técnicos sin atribución médica');
  assert.equal(surAll.kpi.revenue.collected, 150);
  assert.equal(surAll.kpi.revenue.pending, 100);
  assert.equal(surAll.kpi.revenue.unattributedTotal, 250);

  assert.equal(surRios.kpi.revenue.total, 0, 'Dra. Ríos recibe S/ 0.00 atribuidos en Hoy + Sede Sur');
  assert.equal(surRios.kpi.revenue.unattributedInScope, 250);
  assert.equal(surRamirez.kpi.revenue.total, 0, 'Dr. Ramírez recibe S/ 0.00 atribuidos en Hoy + Sede Sur');
  assert.equal(surRamirez.kpi.revenue.unattributedInScope, 250);
});

test('6.5 Verificación independiente de las 48 combinaciones sin usar funciones de agregación de producción', () => {
  const dateRanges = {
    hoy: ['2026-10-27', '2026-10-27'],
    '7d': ['2026-10-21', '2026-10-27'],
    '30d': ['2026-09-28', '2026-10-27'],
    '90d': ['2026-07-30', '2026-10-27']
  };

  for (const [periodId, [fromIso, toIso]] of Object.entries(dateRanges)) {
    for (const sedeObj of SEDES_CATALOG) {
      for (const docObj of DOCTORS_CATALOG) {
        const s = sedeObj.id;
        const d = docObj.id;

        // Cálculo independiente directo sobre los arreglos fuente
        let expPats = 0;
        for (const p of DEMO_NEW_PATIENTS) {
          if (!p.firstAttentionCompleted) continue;
          if (p.firstAttentionDate < fromIso || p.firstAttentionDate > toIso) continue;
          if (s !== 'all' && p.sede !== s) continue;
          if (d !== 'all' && p.firstAttentionDoctor !== d) continue;
          expPats++;
        }

        let expApps = 0;
        let expAtt = 0;
        for (const a of DEMO_APPOINTMENTS) {
          if (a.date < fromIso || a.date > toIso) continue;
          if (s !== 'all' && a.sede !== s) continue;
          if (d !== 'all' && a.doctor !== d) continue;
          expApps++;
          if (a.status === 'Atendida') expAtt++;
        }

        let expSurgs = 0;
        for (const sg of DEMO_SURGERIES) {
          if (sg.date < fromIso || sg.date > toIso) continue;
          if (s !== 'all' && sg.sede !== s) continue;
          if (d !== 'all' && sg.doctor !== d) continue;
          expSurgs++;
        }

        let expCol = 0;
        let expPen = 0;
        for (const t of DEMO_TRANSACTIONS) {
          if (t.date < fromIso || t.date > toIso) continue;
          if (s !== 'all' && t.sede !== s) continue;
          if (d !== 'all' && t.specialist !== d) continue;
          if (t.paymentStatus === 'cobrado') expCol += t.amount;
          else expPen += t.amount;
        }

        const m = getDashboardMetrics(periodId, s, d);
        assert.equal(m.kpi.patientsNew.count, expPats, `Independiente pacientes nuevos en ${periodId}|${s}|${d}`);
        assert.equal(m.kpi.appointments.count, expApps, `Independiente citas en ${periodId}|${s}|${d}`);
        assert.equal(m.appointmentStatus.attended, expAtt, `Independiente atendidas en ${periodId}|${s}|${d}`);
        assert.equal(m.kpi.surgeries.count, expSurgs, `Independiente cirugías en ${periodId}|${s}|${d}`);
        assert.equal(m.kpi.revenue.collected, expCol, `Independiente cobrado en ${periodId}|${s}|${d}`);
        assert.equal(m.kpi.revenue.pending, expPen, `Independiente pendiente en ${periodId}|${s}|${d}`);
        assert.equal(m.kpi.revenue.total, expCol + expPen, `Independiente total en ${periodId}|${s}|${d}`);
      }
    }
  }
});

test('6.6 Correcciones P2 de Motion: ausencia de transition: width en barras y hover protegido por @media (hover: hover) and (pointer: fine)', () => {
  const dashCssSection = styleCss.slice(styleCss.indexOf('DASHBOARD DEL PANEL GENERAL'));
  assert(!/transition:\s*all\b/.test(dashCssSection), 'Sección CSS del Dashboard no contiene transition: all');
  assert(!/transition:[^;]*\bwidth\b/.test(dashCssSection), 'Sección CSS del Dashboard no contiene transition: width en barras');
  assert(!/transition:[^;]*\br\b/.test(dashCssSection), 'Sección CSS del Dashboard no anima el atributo geométrico SVG r');
  assert(!/transition:[^;]*stroke-width/.test(dashCssSection), 'Sección CSS del Dashboard no anima el atributo geométrico SVG stroke-width');
  assert(dashCssSection.includes('@media (hover: hover) and (pointer: fine)'), 'Estados :hover del Dashboard están protegidos bajo @media (hover: hover) and (pointer: fine)');
  assert(dashCssSection.includes('@media (prefers-reduced-motion: reduce)'), 'Incluye soporte explícito para prefers-reduced-motion: reduce');
});

test('6.7 Certificación v1.3.1: matriz de 12 pruebas negativas obligatorias sobre copias aisladas', () => {
  const cloneDataset = () => ({
    patientsCatalog: DEMO_PATIENTS_CATALOG.map(r => ({ ...r })),
    newPatients: DEMO_NEW_PATIENTS.map(r => ({ ...r })),
    appointments: DEMO_APPOINTMENTS.map(r => ({ ...r })),
    surgeries: DEMO_SURGERIES.map(r => ({ ...r })),
    studyOrders: DEMO_STUDY_ORDERS.map(r => ({ ...r })),
    transactions: DEMO_TRANSACTIONS.map(r => ({ ...r })),
    crmRecords: DEMO_CRM_RECORDS.map(r => ({ ...r }))
  });

  const sampleSurg = DEMO_SURGERIES[0];
  const sampleSurgIndApp = DEMO_APPOINTMENTS.find(a => a.id === sampleSurg.indicationAppointmentId);
  const sampleSurgTrx = DEMO_TRANSACTIONS.find(t => t.surgeryId === sampleSurg.id);
  const sampleAppTrx = DEMO_TRANSACTIONS.find(t => t.appointmentId !== null);
  const sampleScheduledLead = DEMO_CRM_RECORDS.find(l => l.scheduled === true);
  const otherDoctor = sampleSurg.doctor === 'Dra. Valeria Ríos' ? 'Dr. Diego Ramírez' : 'Dra. Valeria Ríos';
  const otherPatient = DEMO_PATIENTS_CATALOG.find(p => p.id !== sampleSurg.patientId && p.id !== sampleAppTrx.patientId && p.id !== sampleScheduledLead.patientId);

  // Caso 1: Cirugía con indicationAppointmentId: null
  {
    const ds = cloneDataset();
    ds.surgeries[0].indicationAppointmentId = null;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #1: rechaza cirugía con indicationAppointmentId: null');
    assert(res.errors.some(e => e.includes('carece de indicationAppointmentId obligatorio')));
  }

  // Caso 2: Cirugía cuya cita indicadora tiene otro doctor
  {
    const ds = cloneDataset();
    const altApp = ds.appointments.find(a =>
      a.patientId === sampleSurg.patientId &&
      a.doctor !== sampleSurg.doctor
    ) || null;
    if (altApp) {
      ds.surgeries[0].indicationAppointmentId = altApp.id;
    } else {
      // Buscar una cirugía donde inyectamos una cita Atendida del mismo paciente con otro doctor en horario libre
      const altId = 'APT-ALT-DOC-9001';
      ds.appointments.push({
        id: altId,
        patientId: sampleSurg.patientId,
        date: '2026-04-10',
        time: '08:00',
        startTime: '08:00',
        endTime: '08:30',
        sede: sampleSurg.sede,
        doctor: otherDoctor,
        specialty: 'general',
        status: 'Atendida',
        confirmationStatus: 'confirmada',
        followUpStatus: 'completado',
        requiresHumanIntervention: false,
        operationalPriority: 'normal'
      });
      ds.surgeries[0].indicationAppointmentId = altId;
    }
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #2: rechaza cirugía cuya cita indicadora tiene otro doctor');
    assert(res.errors.some(e => e.includes('especialista') && e.includes('cita indicadora')));
  }

  // Caso 3: Cirugía cuya cita indicadora está Pendiente o Cancelada
  {
    const ds = cloneDataset();
    const appIdx = ds.appointments.findIndex(a => a.id === sampleSurgIndApp.id);
    ds.appointments[appIdx].status = 'Pendiente';
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #3: rechaza cirugía cuya cita indicadora está Pendiente');
    assert(res.errors.some(e => e.includes('debe ser "Atendida"')));
  }

  // Caso 4: Cirugía con consulta indicadora el mismo día pero en hora posterior al inicio quirúrgico
  {
    const ds = cloneDataset();
    const lateIndId = 'APT-LATE-IND-9002';
    ds.appointments.push({
      id: lateIndId,
      patientId: sampleSurg.patientId,
      date: sampleSurg.date,
      time: '19:00',
      startTime: '19:00',
      endTime: '19:30',
      sede: sampleSurg.sede,
      doctor: sampleSurg.doctor,
      specialty: 'general',
      status: 'Atendida',
      confirmationStatus: 'confirmada',
      followUpStatus: 'completado',
      requiresHumanIntervention: false,
      operationalPriority: 'normal'
    });
    ds.surgeries[0].indicationAppointmentId = lateIndId;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #4: rechaza cirugía con indicación el mismo día en hora posterior');
    assert(res.errors.some(e => e.includes('precedencia temporal estricta')));
  }

  // Caso 5: Transacción quirúrgica con patientId distinto al de la cirugía
  {
    const ds = cloneDataset();
    const trxIdx = ds.transactions.findIndex(t => t.id === sampleSurgTrx.id);
    ds.transactions[trxIdx].patientId = otherPatient.id;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #5: rechaza transacción quirúrgica con patientId distinto');
    assert(res.errors.some(e => e.includes('Transacción quirúrgica') && e.includes('patientId')));
  }

  // Caso 6: Transacción quirúrgica con date distinta a la cirugía
  {
    const ds = cloneDataset();
    const trxIdx = ds.transactions.findIndex(t => t.id === sampleSurgTrx.id);
    ds.transactions[trxIdx].date = '2026-10-27';
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #6: rechaza transacción quirúrgica con fecha distinta');
    assert(res.errors.some(e => e.includes('Transacción quirúrgica') && e.includes('fecha')));
  }

  // Caso 7: Transacción con appointmentId y surgeryId simultáneos
  {
    const ds = cloneDataset();
    const trxIdx = ds.transactions.findIndex(t => t.id === sampleAppTrx.id);
    ds.transactions[trxIdx].surgeryId = sampleSurg.id;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #7: rechaza transacción con appointmentId y surgeryId simultáneos');
    assert(res.errors.some(e => e.includes('múltiples fuentes simultáneas')));
  }

  // Caso 8: Transacción sin appointmentId, surgeryId ni studyOrderId
  {
    const ds = cloneDataset();
    const trxIdx = ds.transactions.findIndex(t => t.id === sampleAppTrx.id);
    ds.transactions[trxIdx].appointmentId = null;
    ds.transactions[trxIdx].surgeryId = null;
    ds.transactions[trxIdx].studyOrderId = null;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #8: rechaza transacción sin ninguna fuente verificable');
    assert(res.errors.some(e => e.includes('carece de fuente verificable')));
  }

  // Caso 9: Transacción de cita con date o patientId distinto al de la cita
  {
    const ds = cloneDataset();
    const trxIdx = ds.transactions.findIndex(t => t.id === sampleAppTrx.id);
    ds.transactions[trxIdx].date = '2026-10-28';
    ds.transactions[trxIdx].patientId = otherPatient.id;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #9: rechaza transacción de cita con date y patientId distintos');
    assert(res.errors.some(e => e.includes('incompatible con cita') && e.includes('patientId')));
    assert(res.errors.some(e => e.includes('incompatible con la cita') && e.includes('fecha')));
  }

  // Caso 10: Lead CRM agendado con patientId distinto al de su cita
  {
    const ds = cloneDataset();
    const leadIdx = ds.crmRecords.findIndex(l => l.id === sampleScheduledLead.id);
    ds.crmRecords[leadIdx].patientId = otherPatient.id;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #10: rechaza lead CRM agendado con patientId distinto al de su cita');
    assert(res.errors.some(e => e.includes('Lead agendado') && e.includes('incompatible con su cita')));
  }

  // Caso 11: Solapamiento entre cita y cirugía del mismo médico en la misma fecha
  {
    const ds = cloneDataset();
    ds.appointments.push({
      id: 'APT-OVERLAP-SURG-DOC-9003',
      patientId: otherPatient.id,
      date: sampleSurg.date,
      time: '17:30',
      startTime: '17:30',
      endTime: '18:00',
      sede: sampleSurg.sede,
      doctor: sampleSurg.doctor,
      specialty: 'general',
      status: 'Pendiente',
      confirmationStatus: 'confirmada',
      followUpStatus: 'al_dia',
      requiresHumanIntervention: false,
      operationalPriority: 'normal'
    });
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #11: rechaza solapamiento cita-cirugía del mismo médico en la misma fecha');
    assert(res.errors.some(e => e.includes('Especialista') && e.includes('eventos solapados')));
  }

  // Caso 12: Solapamiento de dos eventos del mismo paciente en la misma fecha (cita-cirugía y cita-cita)
  {
    const ds = cloneDataset();
    // 12a. Cita-Cirugía para el mismo paciente con otro médico en la misma fecha/hora
    ds.appointments.push({
      id: 'APT-OVERLAP-SURG-PAT-9004',
      patientId: sampleSurg.patientId,
      date: sampleSurg.date,
      time: '17:15',
      startTime: '17:15',
      endTime: '17:45',
      sede: sampleSurg.sede,
      doctor: otherDoctor,
      specialty: 'general',
      status: 'Pendiente',
      confirmationStatus: 'confirmada',
      followUpStatus: 'al_dia',
      requiresHumanIntervention: false,
      operationalPriority: 'normal'
    });
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Negativo #12a: rechaza solapamiento cita-cirugía del mismo paciente');
    assert(res.errors.some(e => e.includes('Paciente') && e.includes('eventos solapados')));

    // 12b. Cita-Cita para el mismo paciente con otro médico en horario superpuesto
    const dsCitaCita = cloneDataset();
    const patApp = dsCitaCita.appointments.find(a => a.status !== 'Cancelada');
    const altDoc = patApp.doctor === 'Dra. Valeria Ríos' ? 'Dr. Diego Ramírez' : 'Dra. Valeria Ríos';
    dsCitaCita.appointments.push({
      id: 'APT-OVERLAP-PAT-9005',
      patientId: patApp.patientId,
      date: patApp.date,
      time: patApp.startTime,
      startTime: patApp.startTime,
      endTime: patApp.endTime,
      sede: patApp.sede,
      doctor: altDoc,
      specialty: 'general',
      status: 'Pendiente',
      confirmationStatus: 'confirmada',
      followUpStatus: 'al_dia',
      requiresHumanIntervention: false,
      operationalPriority: 'normal'
    });
    const res2 = validateDashboardDatasetIntegrity(dsCitaCita);
    assert.equal(res2.valid, false, 'Negativo #12b: rechaza solapamiento cita-cita del mismo paciente');
    assert(res2.errors.some(e => e.includes('Paciente') && e.includes('citas solapadas')));
  }
});

test('6.8 Certificación v1.3.1: pruebas positivas con dataset intacto, intervalos consecutivos y rechazo de orden técnica sin respaldo', () => {
  const cleanRes = validateDashboardDatasetIntegrity();
  assert.equal(cleanRes.valid, true, 'Positivo #1: dataset completo v1.3.1 válido con 0 errores');
  assert.equal(cleanRes.errors.length, 0);

  // Positivo #2: Eventos consecutivos sin solapamiento (consulta 16:30-17:00 antes de cirugía 17:00-18:00 el mismo día)
  const patFree = DEMO_PATIENTS_CATALOG.find(p => p.cohortType === 'recurrente_historico');
  const indApp = {
    id: 'APT-CONSEC-8001',
    patientId: patFree.id,
    date: '2026-10-30',
    time: '16:30',
    startTime: '16:30',
    endTime: '17:00',
    sede: 'principal',
    doctor: 'Dra. Valeria Ríos',
    specialty: 'general',
    status: 'Atendida',
    confirmationStatus: 'confirmada'
  };
  const consecSurg = {
    id: 'SURG-CONSEC-8001',
    patientId: patFree.id,
    indicationAppointmentId: indApp.id,
    date: '2026-10-30',
    time: '17:00',
    startTime: '17:00',
    endTime: '18:00',
    sede: 'principal',
    doctor: 'Dra. Valeria Ríos',
    procedureId: 'catarata',
    surgicalStatus: 'Programada',
    preopEvaluationStatus: 'validada'
  };
  const consecRes = validateDashboardDatasetIntegrity({
    patientsCatalog: [patFree],
    newPatients: [],
    appointments: [indApp],
    surgeries: [consecSurg],
    studyOrders: [],
    transactions: [],
    crmRecords: []
  });
  assert.equal(consecRes.valid, true, `Positivo #2: consulta 16:30-17:00 consecutiva a cirugía 17:00-18:00 es válida (${consecRes.errors.join('; ')})`);

  // Rechazo de prefijo ORD-TEC-* sin registro existente en studyOrders
  const unbackedOrderRes = validateDashboardDatasetIntegrity({
    patientsCatalog: DEMO_PATIENTS_CATALOG,
    newPatients: DEMO_NEW_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    surgeries: DEMO_SURGERIES,
    studyOrders: DEMO_STUDY_ORDERS,
    transactions: [
      ...DEMO_TRANSACTIONS,
      {
        id: 'TRX-FAKE-ORD-9999',
        date: '2026-10-27',
        time: '10:00',
        sede: 'sur',
        patientId: DEMO_PATIENTS_CATALOG[0].id,
        amount: 100,
        paymentStatus: 'cobrado',
        operationRef: 'CP-9999',
        specialist: null,
        appointmentId: null,
        surgeryId: null,
        studyOrderId: 'ORD-TEC-9999'
      }
    ],
    crmRecords: DEMO_CRM_RECORDS
  });
  assert.equal(unbackedOrderRes.valid, false, 'Rechaza prefijo ORD-TEC-* sin orden técnica existente en DEMO_STUDY_ORDERS');
  assert(unbackedOrderRes.errors.some(e => e.includes('ORD-TEC-9999')));
});

test('6.9 Certificación v1.3.2 (P1-01): eliminación de inyección implícita y exigencia estricta de las 7 colecciones', () => {
  // 1. Dataset oficial sin argumentos: válido
  const officialRes = validateDashboardDatasetIntegrity();
  assert.equal(officialRes.valid, true, 'Dataset oficial sin argumentos es válido');
  assert.equal(officialRes.errors.length, 0);

  // 2. Dataset explícito sin studyOrders: inválido
  const explicitWithoutOrders = {
    patientsCatalog: DEMO_PATIENTS_CATALOG,
    newPatients: DEMO_NEW_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    surgeries: DEMO_SURGERIES,
    transactions: DEMO_TRANSACTIONS,
    crmRecords: DEMO_CRM_RECORDS
  };
  const resWithoutOrders = validateDashboardDatasetIntegrity(explicitWithoutOrders);
  assert.equal(resWithoutOrders.valid, false, 'Dataset explícito sin studyOrders es inválido');
  assert(resWithoutOrders.errors.some(e => e.includes('studyOrders')), 'Error específico indicando falta de studyOrders');

  // 3. Dataset explícito con studyOrders: [] y transacciones técnicas: inválido
  const explicitEmptyOrdersWithTrx = {
    patientsCatalog: DEMO_PATIENTS_CATALOG,
    newPatients: DEMO_NEW_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    surgeries: DEMO_SURGERIES,
    studyOrders: [],
    transactions: DEMO_TRANSACTIONS,
    crmRecords: DEMO_CRM_RECORDS
  };
  const resEmptyOrders = validateDashboardDatasetIntegrity(explicitEmptyOrdersWithTrx);
  assert.equal(resEmptyOrders.valid, false, 'Dataset explícito con studyOrders: [] y transacciones técnicas es inválido');
  assert(resEmptyOrders.errors.some(e => e.includes('studyOrderId inexistente')), 'Error específico indicando studyOrderId inexistente');

  // 4. Dataset explícito con órdenes válidas: válido
  const explicitValid = {
    patientsCatalog: DEMO_PATIENTS_CATALOG,
    newPatients: DEMO_NEW_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    surgeries: DEMO_SURGERIES,
    studyOrders: DEMO_STUDY_ORDERS,
    transactions: DEMO_TRANSACTIONS,
    crmRecords: DEMO_CRM_RECORDS
  };
  const resValid = validateDashboardDatasetIntegrity(explicitValid);
  assert.equal(resValid.valid, true, 'Dataset explícito con las 7 colecciones válidas es válido');
  assert.equal(resValid.errors.length, 0);
});

test('6.10 Certificación v1.3.2 (P1-02): validación estricta de pacientes nuevos contra catálogo maestro', () => {
  const baseDataset = () => ({
    patientsCatalog: DEMO_PATIENTS_CATALOG.map(p => ({ ...p })),
    newPatients: DEMO_NEW_PATIENTS.map(p => ({ ...p })),
    appointments: DEMO_APPOINTMENTS.map(a => ({ ...a })),
    surgeries: DEMO_SURGERIES.map(s => ({ ...s })),
    studyOrders: DEMO_STUDY_ORDERS.map(o => ({ ...o })),
    transactions: DEMO_TRANSACTIONS.map(t => ({ ...t })),
    crmRecords: DEMO_CRM_RECORDS.map(c => ({ ...c }))
  });

  // Negativo 1: patientsCatalog: [] con un paciente en newPatients
  {
    const ds = baseDataset();
    ds.patientsCatalog = [];
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Rechaza patientsCatalog: [] con paciente en newPatients');
    assert(res.errors.some(e => e.includes('no existe en el catálogo maestro patientsCatalog')), 'Error indicando ausencia en catálogo maestro');
  }

  // Negativo 2: Paciente nuevo con ID inexistente
  {
    const ds = baseDataset();
    ds.newPatients.push({
      id: 'PAT-INEXISTENTE-9999',
      patientCode: 'HC-9999',
      patientName: 'Paciente Huérfano',
      firstAttentionDate: '2026-10-27',
      sede: 'principal',
      firstAttentionDoctor: null,
      firstAppointmentId: null,
      firstAttentionCompleted: false,
      firstAttentionStatus: 'sin_primera_atencion_completada',
      subsequentAppointmentId: null,
      subsequentDoctor: null,
      attributionStatus: 'unattributed'
    });
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Rechaza paciente nuevo con ID inexistente en catálogo maestro');
    assert(res.errors.some(e => e.includes('PAT-INEXISTENTE-9999') && e.includes('no existe en el catálogo maestro')));
  }

  // Negativo 3: Paciente nuevo cuyo identificador maestro apunta a otro paciente
  {
    const ds = baseDataset();
    const targetNp = ds.newPatients[0];
    const otherPat = ds.patientsCatalog.find(p => p.id !== targetNp.id);
    targetNp.masterPatientId = otherPat.id;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Rechaza paciente nuevo cuyo identificador maestro apunta a otro paciente');
    assert(res.errors.some(e => e.includes('identificador maestro ajeno') || e.includes('discordante')));
  }

  // Negativo 4: Primera atención con cita perteneciente a otro paciente
  {
    const ds = baseDataset();
    const completedNp = ds.newPatients.find(p => p.firstAttentionCompleted && p.firstAppointmentId);
    const otherApp = ds.appointments.find(a => a.status === 'Atendida' && a.patientId !== completedNp.id);
    completedNp.firstAppointmentId = otherApp.id;
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, 'Rechaza primera atención con cita perteneciente a otro paciente');
    assert(res.errors.some(e => e.includes('pertenece a') && e.includes('no a')));
  }
});

test('6.11 Hotfix v1.3.3: distingue argumentos explícitos, preserva la entrada y exige patientName', () => {
  const baseDataset = () => ({
    patientsCatalog: DEMO_PATIENTS_CATALOG.map(p => ({ ...p })),
    newPatients: DEMO_NEW_PATIENTS.map(p => ({ ...p })),
    appointments: DEMO_APPOINTMENTS.map(a => ({ ...a })),
    surgeries: DEMO_SURGERIES.map(s => ({ ...s })),
    studyOrders: DEMO_STUDY_ORDERS.map(o => ({ ...o })),
    transactions: DEMO_TRANSACTIONS.map(t => ({ ...t })),
    crmRecords: DEMO_CRM_RECORDS.map(c => ({ ...c }))
  });

  const officialRes = validateDashboardDatasetIntegrity();
  assert.equal(officialRes.valid, true, 'La llamada sin argumentos usa el dataset oficial válido');
  assert.equal(officialRes.errors.length, 0);

  const explicitUndefined = validateDashboardDatasetIntegrity(undefined);
  assert.equal(explicitUndefined.valid, false, 'undefined explícito no se interpreta como llamada por defecto');
  assert(explicitUndefined.errors.some(e => e.includes('[0. Estructura]') && e.includes('no es un objeto válido')));

  const explicitNull = validateDashboardDatasetIntegrity(null);
  assert.equal(explicitNull.valid, false, 'null explícito es inválido');
  assert(explicitNull.errors.some(e => e.includes('[0. Estructura]') && e.includes('no es un objeto válido')));

  const explicitEmpty = validateDashboardDatasetIntegrity({});
  assert.equal(explicitEmpty.valid, false, 'Un objeto vacío no recibe colecciones globales');
  assert.equal(explicitEmpty.errors.length, 7, 'Reporta exactamente las siete colecciones obligatorias ausentes');
  assert(explicitEmpty.errors.every(e => e.includes('[0. Estructura]')));

  const incomplete = baseDataset();
  delete incomplete.studyOrders;
  const incompleteBefore = JSON.stringify(incomplete);
  const incompleteRes = validateDashboardDatasetIntegrity(incomplete);
  assert.equal(incompleteRes.valid, false, 'Un dataset incompleto es inválido');
  assert(incompleteRes.errors.some(e => e.includes('Colección obligatoria ausente o inválida: studyOrders')));
  assert.equal(JSON.stringify(incomplete), incompleteBefore, 'El dataset incompleto permanece sin modificaciones');

  const complete = baseDataset();
  const completeBefore = JSON.stringify(complete);
  const completeRes = validateDashboardDatasetIntegrity(complete);
  assert.equal(completeRes.valid, true, 'Un dataset explícito completo sigue siendo válido');
  assert.equal(completeRes.errors.length, 0);
  assert.equal(JSON.stringify(complete), completeBefore, 'El dataset completo permanece sin modificaciones');

  for (const invalidName of [undefined, '', '   ']) {
    const ds = baseDataset();
    if (invalidName === undefined) delete ds.newPatients[0].patientName;
    else ds.newPatients[0].patientName = invalidName;
    const before = JSON.stringify(ds);
    const res = validateDashboardDatasetIntegrity(ds);
    assert.equal(res.valid, false, `Rechaza patientName inválido: ${String(invalidName)}`);
    assert(res.errors.some(e => e.includes(ds.newPatients[0].id) && e.includes('patientName obligatorio')));
    assert.equal(JSON.stringify(ds), before, 'No muta el registro con patientName inválido');
  }

  const missingMasterName = baseDataset();
  const masterId = missingMasterName.newPatients[0].id;
  delete missingMasterName.patientsCatalog.find(p => p.id === masterId).patientName;
  const missingMasterRes = validateDashboardDatasetIntegrity(missingMasterName);
  assert.equal(missingMasterRes.valid, false, 'Rechaza patientName ausente en el catálogo maestro');
  assert(missingMasterRes.errors.some(e => e.includes(`Paciente maestro ${masterId}`) && e.includes('patientName obligatorio')));
});

console.log('\n========================================');
console.log(`TOTAL PRUEBAS DASHBOARD: ${passed + failed}`);
console.log(`PASADAS: ${passed}`);
console.log(`FALLIDAS: ${failed}`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
