# Reporte de Verificación y Cierre Final del Prototipo

**Proyecto:** AppClinicaOftalmo  
**Última actualización verificada:** 11 de noviembre de 2026  
**Entorno de ejecución:** Windows · Node.js v22.18.0 · Google Chrome (vía Chrome DevTools Protocol pipe)  
**Comando unificado de pruebas:** `npm test`  
**Resultado global vigente:** **100% Superado (312 comprobaciones automáticas ejecutadas sin fallos; véase Sección 7 para el detalle actualizado)**

---

## 1. Clasificación Transparente de Comprobaciones

Para evitar confundir búsquedas de texto con pruebas de navegador o llamadas directas al DOM con eventos de teclado, la verificación del proyecto se divide explícitamente en cinco categorías:

| Categoría | Método / Herramienta | Archivo Ejecutor | Total | Pasadas | Fallidas |
|---|---|---|:---:|:---:|:---:|
| **1. Verificación de Sintaxis JS** | `node --check` sobre módulos ES | `run_all_tests.mjs` | 4 | 4 | 0 |
| **2. Comprobaciones Estáticas de Texto y Código** | Inspección de código fuente (`fs.readFile`) | `test_static_checks.mjs` | 36 | 36 | 0 |
| **3. Pruebas Unitarias de Funciones Exportadas** | Ejecución en Node.js de `auth.js` y `crm.js` | `test_roles.mjs` | 57 | 57 | 0 |
| **4. Pruebas Funcionales Reales en Navegador** | Google Chrome real vía CDP (`Input.dispatch*`) | `test_browser_functional.mjs` | 40 | 40 | 0 |
| **5. Verificaciones Responsivas Automatizadas** | Google Chrome real (`Emulation.setDeviceMetricsOverride`) | `test_browser_functional.mjs` | 21 | 21 | 0 |
| **TOTAL AUTOMATIZADO (`npm test`)** | `node run_all_tests.mjs` | — | **158** | **158** | **0** |

*(Adicionalmente, las revisiones de contraste cromático, jerarquía tipográfica e identidad visual marfil/verde bosque/ámbar corresponden a verificaciones visuales de diseño).*

---

## 2. Resolución de Brechas de Auditoría

### 2.1. Restablecimiento de la Sesión Activa (`resetDemoData` + `auth.restoreSessionAfterReset`)
- **Problema corregido:** Anteriormente `resetDemoData()` invocaba `auth.resetUsers()`, pero `sessionStorage` conservaba el objeto de sesión con nombre, rol, correo o estado modificado, o mantenía activa la sesión de un usuario temporal eliminado.
- **Solución implementada:**
  - Se creó y exportó `restoreSessionAfterReset()` en `app/auth.js`, invocada dentro de `resetDemoData()` en `app/app.js`.
  - Si la sesión activa corresponde por `id` a uno de los 5 usuarios de `INITIAL_USERS`, se sobrescribe `sessionStorage` con una copia limpia de dicho usuario inicial (`status: 'restored'`).
  - Si la sesión activa pertenece a un usuario temporal que no existe en `INITIAL_USERS`, se limpia `sessionStorage` (`clearSession()`), se reinicia `authStep = 1` y se redirige a la pantalla de login (`status: 'closed'`).
  - Además, el botón `#topbar-reset-demo` permanece disponible para el usuario inicial Administrador (`user.id === 1`) incluso si cambió temporalmente su propio rol durante la demostración.

### 2.2. Adaptación del Dashboard para Administrador
- **Problema corregido:** Cuando el Administrador visitaba `#dashboard`, veía el título `"Panel general de recepción"` y la nota `"Panel operativo de Recepción…"`.
- **Solución implementada:**
  - En `render()` (`app/app.js`), cuando `user.role === 'admin' && route === 'dashboard'`, el título cambia a **`"Panel general"`** y el subtítulo a **`"Resumen operativo y supervisión de la clínica."`**.
  - En `receptionDashboard()` y `stats()`, el Administrador ve la nota **`"Panel de supervisión de Administración. Acceso integral a operación, finanzas, catálogos y consulta clínica en modo lectura."`**, mientras que Recepción conserva intactos sus textos operativos.

### 2.3. Prueba Real de Cierre con Tecla `Escape` y Retorno de Foco
- **Problema corregido:** La prueba anterior invocaba `modal.close()` desde JavaScript en lugar de enviar una pulsación de teclado real.
- **Solución implementada:**
  - En `openModal()` (`app/app.js`), se registra el elemento activo (`opener = document.activeElement`) antes de `showModal()` y en `m.onclose` se restaura el foco (`opener.focus()`).
  - En `test_browser_functional.mjs`, se abre el modal haciendo clic real en `#topbar-reset-demo`, se envía la tecla `Escape` real a Chrome mediante CDP `Input.dispatchKeyEvent` (`rawKeyDown` + `keyUp`, `windowsVirtualKeyCode: 27`), y se comprueba que `#modal.open === false` y `document.activeElement.id === 'topbar-reset-demo'`.

---

## 3. Mediciones Reales en los 3 Viewports (Chrome CDP)

Las siguientes mediciones fueron obtenidas directamente del DOM renderizado en Google Chrome mediante `Emulation.setDeviceMetricsOverride` y `getBoundingClientRect()` a través de todas las vistas principales (`#dashboard`, `#agenda`, `#pacientes`, `#pacientes/1`, `#crm`, `#crm/2`, `#inbox`, `#caja`, `#consulta`, `#estudios`, `#admin-usuarios`):

| Viewport | `documentElement` (`scrollWidth` / `clientWidth`) | Ancho Menú Lateral (`aside`) | Contenedor `.tablewrap` (`clientWidth` / `scrollWidth`) | Contenedor `#crmboard` (`clientWidth` / `scrollWidth`) | Drawer Lateral `#crmdetail` (`left`, `right`, `width`) | Modal Reset (`left`, `right`, acciones visibles) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Escritorio (`1280 × 800`)** | `1270px / 1270px` (0px overflow) | `240px` (expandido) | `958px / 958px` (en `#pacientes/1`: `576px / 625px`) | `960px / 1480px` (scroll interno) | `left: 830px, right: 1270px, width: 440px` | `left: 355px, right: 915px, visible: true` |
| **Tablet (`768 × 1024`)** | `768px / 768px` (0px overflow) | `210px` (adaptado) | `512px / 811px` (scroll interno) | `514px / 1480px` (scroll interno) | `left: 328px, right: 768px, width: 440px` | `left: 104px, right: 664px, visible: true` |
| **Móvil (`375 × 667`)** | `375px / 375px` (0px overflow) | `65px` (compacto por iconos) | `280px / 811px` (scroll interno) | `282px / 1480px` (scroll interno) | `left: 0px, right: 375px, width: 375px` | `left: 17px, right: 358px, visible: true` |

### Aclaración sobre Contenedores con Scroll Interno
- **Sin desbordamiento global:** En los 3 viewports se cumple estrictamente `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (`overflow = 0px`).
- **Contenedores que usan scroll horizontal local:**
  1. **`.tablewrap`**: Encapsula el desplazamiento horizontal de las tablas de datos en `#agenda`, `#pacientes`, `#pacientes/1`, `#caja` y `#admin-*` en pantallas medianas y móviles.
  2. **`#crmboard` (`.kanban`)**: Encapsula el desplazamiento horizontal de las 6 columnas del embudo comercial (`1480px` de ancho interno).
  3. **`.clinical-exam-box`**: Encapsula el desplazamiento horizontal de la tabla de refracción (`.refraction-table`) en `#consulta` en resoluciones estrechas.

---

## 4. Salida Real y Completa de `npm test`

```text
> test
> node run_all_tests.mjs

================================================================
CLÍNICA OFTALMOLÓGICA - EJECUCIÓN INTEGRAL DE COMPROBACIONES
================================================================

>>> Ejecutando: 1. Verificación de sintaxis JS (app.js)...
[OK] 1. Verificación de sintaxis JS (app.js) finalizado exitosamente.

>>> Ejecutando: 2. Verificación de sintaxis JS (auth.js)...
[OK] 2. Verificación de sintaxis JS (auth.js) finalizado exitosamente.

>>> Ejecutando: 3. Verificación de sintaxis JS (crm.js)...
[OK] 3. Verificación de sintaxis JS (crm.js) finalizado exitosamente.

>>> Ejecutando: 4. Verificación de sintaxis JS (server.mjs)...
[OK] 4. Verificación de sintaxis JS (server.mjs) finalizado exitosamente.

>>> Ejecutando: 5. Comprobaciones estáticas de políticas (test_static_checks.mjs)...
=== SUITE DE COMPROBACIONES ESTÁTICAS DE POLÍTICAS Y DIRECTIVAS ===

--- 1. Ausencia total de términos regulatorios y fiscales no autorizados ---
✓ PASS: app.js no contiene afirmaciones normativas "MINSA/SUSALUD"
✓ PASS: app.js no contiene "Boleta de Venta"
✓ PASS: app.js no contiene "Factura Electrónica"
✓ PASS: app.js no contiene series B001
✓ PASS: app.js no contiene series F001
✓ PASS: app.js no contiene la frase "comprobante legal"
✓ PASS: app.js no contiene RUC ficticio

--- 2. Unificación estricta de Caja: cero usos de "comprobante" ---
✓ PASS: app.js no contiene "comprobante" (encontrados: 0)
✓ PASS: crm.js no contiene "comprobante" (encontrados: 0)
✓ PASS: auth.js no contiene "comprobante" (encontrados: 0)
✓ PASS: app.js implementa "Constancia interna de pago"
✓ PASS: app.js implementa "Orden interna de pago"
✓ PASS: app.js implementa correlativo interno CP-
✓ PASS: app.js implementa correlativo interno OP-

--- 3. Verificación de Route Guard y protección de rutas en app.js ---
✓ PASS: Route guard protege paciente-detalle
✓ PASS: Route guard protege todas las rutas por rol

--- 4. Panel operativo de Recepción y adaptación para Administrador ---
✓ PASS: Panel de recepción no tiene métrica "Por cobrar"
✓ PASS: Panel de recepción tiene métrica "Llegaron"
✓ PASS: Panel de recepción tiene métrica "Por confirmar"
✓ PASS: Panel de recepción tiene nota informativa discreta
✓ PASS: Dashboard adapta título a "Panel general" para Administrador
✓ PASS: Dashboard adapta subtítulo para Administrador
✓ PASS: Dashboard adapta nota informativa para Administrador

--- 5. Rol Administrador en Atención Médica y Restablecimiento Demo ---
✓ PASS: Consulta médica muestra mensaje de supervisión para Admin
✓ PASS: Consulta médica deshabilita campos clínicos para Admin
✓ PASS: Admin no se muestra como médico tratante
✓ PASS: app.js implementa función resetDemoData()
✓ PASS: resetDemoData() invoca auth.restoreSessionAfterReset()
✓ PASS: auth.js exporta restoreSessionAfterReset()
✓ PASS: app.js implementa diálogo de confirmación para restablecer demo
✓ PASS: Botón restablecer demo visible solo para Admin

--- 6. Fidelidad de canales en CRM e Inbox ---
✓ PASS: CRM muestra canal real del prospecto en lugar de WhatsApp genérico
✓ PASS: crm.js exporta función resetCRMData

--- 7. Agenda específica para Médico ---
✓ PASS: Título de agenda para médico cambia a "Mi agenda médica"
✓ PASS: Botón "+ Nueva cita" está restringido para Médico
✓ PASS: Médico solo ve sus citas asignadas en agenda

========================================
TOTAL COMPROBACIONES ESTÁTICAS: 36
PASADAS: 36
FALLIDAS: 0
========================================
[OK] 5. Comprobaciones estáticas de políticas (test_static_checks.mjs) finalizado exitosamente.

>>> Ejecutando: 6. Pruebas unitarias de RBAC y CRM (test_roles.mjs)...
=== TEST SUITE: RBAC, RUTAS Y COHERENCIA VISUAL/FUNCIONAL ===

--- 1. Permisos y Route Guard en auth.js ---
✓ PASS: Caja puede acceder a "caja"
✓ PASS: Caja NO puede acceder a "pacientes"
✓ PASS: Caja NO puede acceder a "paciente-detalle"
✓ PASS: Caja NO puede acceder a "agenda"
✓ PASS: Caja NO puede acceder a "crm"
✓ PASS: Caja NO puede acceder a "consulta"
✓ PASS: Caja NO puede acceder a "estudios"
✓ PASS: Caja NO puede acceder a "admin-medicos"
✓ PASS: Médico puede acceder a "agenda"
✓ PASS: Médico puede acceder a "consulta"
✓ PASS: Médico puede acceder a "pacientes"
✓ PASS: Médico puede acceder a "paciente-detalle"
✓ PASS: Médico NO puede acceder a "crm"
✓ PASS: Médico NO puede acceder a "caja"
✓ PASS: Médico NO puede acceder a "admin-usuarios"
✓ PASS: Técnico puede acceder a "estudios"
✓ PASS: Técnico puede acceder a "pacientes"
✓ PASS: Técnico puede acceder a "paciente-detalle"
✓ PASS: Técnico NO puede acceder a "agenda"
✓ PASS: Técnico NO puede acceder a "caja"
✓ PASS: Recepción puede acceder a "dashboard"
✓ PASS: Recepción puede acceder a "agenda"
✓ PASS: Recepción puede acceder a "pacientes"
✓ PASS: Recepción puede acceder a "crm"
✓ PASS: Recepción NO puede acceder a "caja"
✓ PASS: Recepción NO puede acceder a "consulta"
✓ PASS: Admin puede acceder a "dashboard"
✓ PASS: Admin puede acceder a "consulta"
✓ PASS: Admin puede acceder a "admin-servicios"

--- 2. Métricas y flujos CRM ---
✓ PASS: Métrica CRM Convertidos: exactamente los que están en columna Convertido (1)
✓ PASS: Métrica CRM Activos: excluye Convertido y Perdido (3)
✓ PASS: Tasa de conversión calculada dinámicamente: 1/5 * 100 = 20%
✓ PASS: Seguimientos de hoy: filtra por fecha demo 2026-10-27 (2)
✓ PASS: Al mover tarjeta a Convertido, Convertidos aumenta a 2
✓ PASS: Al mover tarjeta a Convertido, Activos disminuye a 2
✓ PASS: Nueva tasa de conversión es 2/5 * 100 = 40%
✓ PASS: Vincular prospecto a paciente NO lo marca automáticamente como Convertido
✓ PASS: Prospecto queda asociado con su pid

--- 3. Permisos de Inbox omnicanal ---
✓ PASS: Admin puede acceder a Inbox
✓ PASS: Recepción puede acceder a Inbox
✓ PASS: Médico NO puede acceder a Inbox
✓ PASS: Técnico NO puede acceder a Inbox
✓ PASS: Caja NO puede acceder a Inbox

--- 4. Funciones de restablecimiento de datos demo y sesión activa ---
✓ PASS: Sesión activa refleja nombre modificado antes del reset
✓ PASS: Tras reset, sesión activa restaura el nombre inicial "Lic. Roberto Casas"
✓ PASS: Sesión activa refleja rol modificado antes del reset
✓ PASS: Tras reset, sesión activa restaura rol inicial "admin"
✓ PASS: Usuario agregado temporalmente (total 6)
✓ PASS: Sesión activa iniciada con usuario temporal
✓ PASS: auth.resetUsers() restaura a los 5 usuarios iniciales
✓ PASS: Tras reset con usuario temporal, la sesión se cierra (null)
✓ PASS: Admin original presente tras reset
✓ PASS: crm.resetCRMData() restaura los 6 prospectos iniciales
✓ PASS: Prospectos de WhatsApp presentes
✓ PASS: Prospecto de Google presente
✓ PASS: Prospecto de Instagram presente
✓ PASS: Prospecto de Facebook presente

========================================
TOTAL PRUEBAS: 57
PASADAS: 57
FALLIDAS: 0
========================================
[OK] 6. Pruebas unitarias de RBAC y CRM (test_roles.mjs) finalizado exitosamente.

>>> Ejecutando: 7. Pruebas funcionales en navegador Google Chrome (test_browser_functional.mjs)...
=== SUITE DE PRUEBAS FUNCIONALES E INTERACTIVAS EN NAVEGADOR REAL (CHROME CDP) ===

--- 1. Flujo de inicio de sesión con OTP simulado ---
✓ PASS: Renderiza pantalla inicial de login con los 5 accesos rápidos de rol
✓ PASS: Genera código OTP de 6 dígitos en bandeja simulada (825171)
✓ PASS: Inicia sesión correctamente como Recepción tras validar OTP

--- 2. Adaptación del Dashboard para Recepción y Administrador ---
✓ PASS: Recepción ve el título "Panel general de recepción"
✓ PASS: Recepción conserva su nota "Panel operativo de Recepción..."
✓ PASS: Administrador ve el título "Panel general"
✓ PASS: Administrador ve el subtítulo de supervisión
✓ PASS: Administrador NO ve la frase "Panel operativo de Recepción"
✓ PASS: Administrador ve la nota de supervisión administrativa

--- 3. Cierre real con tecla Escape y retorno de foco ---
✓ PASS: El clic en #topbar-reset-demo abre el modal de confirmación
✓ PASS: La pulsación real de la tecla Escape cierra el modal nativo
✓ PASS: El foco regresa al botón que abrió el modal (#topbar-reset-demo)

--- 4. Restablecimiento de sesión activa al confirmar "Restablecer demo" ---
✓ PASS: Caso 4.1a: El Administrador modifica su propio nombre y se refleja en sesión y topbar
✓ PASS: Caso 4.1b: Al restablecer la demo, el nombre del Administrador en sesión y UI vuelve a "Lic. Roberto Casas"
✓ PASS: Caso 4.2a: El Administrador modifica su propio rol a "recepcion"
✓ PASS: Caso 4.2b: Al restablecer la demo, el rol en sesión y UI vuelve a "admin" (Administrador General)
✓ PASS: Caso 4.3a: Inicia sesión mediante OTP con el usuario temporal creado
✓ PASS: Caso 4.3b: Al restablecer la demo con un usuario temporal activo, la sesión se cierra y vuelve a la pantalla de acceso
✓ PASS: Caso 4.4: La sesión final coincide exactamente con el usuario inicial sin atributos residuales

--- 5.1 CRM: Arrastre real de tarjeta, contadores, historial y prioridad compartida con Inbox ---
✓ PASS: Estado inicial CRM: Luis Pérez está en "Nuevo" (contador=2, Contactado=1, prioridad=Fría)
✓ PASS: Tras arrastrar, Luis Pérez desaparece de "Nuevo" y aparece en "Contactado"
✓ PASS: Contadores de columnas actualizados (Nuevo: 1, Contactado: 2)
✓ PASS: Prioridad de Luis Pérez recalculada en CRM (● Tibia)
✓ PASS: El historial de actividades en el drawer registra "Etapa: Nuevo → Contactado"
✓ PASS: El drawer muestra el canal real "Canal: Google" sin usar "Simulación WhatsApp"
✓ PASS: La prioridad de Luis Pérez en Inbox coincide con CRM (● Tibia)

--- 5.2 Inbox: Selección de conversación, respuesta simulada y filtro por prioridad Caliente ---
✓ PASS: La respuesta simulada aparece en el hilo de conversación y en la vista previa lateral
✓ PASS: El encabezado del hilo muestra el canal real (Google)
✓ PASS: El filtro "Caliente" en Inbox muestra únicamente contactos Calientes (1 encontrado)

--- 5.3 Agenda de Recepción: Reprogramación a horario libre, cancelación con motivo e integridad de pagos ---
✓ PASS: La cita #4 se reprograma al horario libre 11:30 y registra el cambio en el historial
✓ PASS: La cita #3 cambia a estado "Cancelada" y conserva el motivo en el historial
✓ PASS: La cancelación de la cita no altera el estado de pago

--- 5.4 Caja: Registro de pago en efectivo, vuelto, constancia CP-XXXX y bloqueo de rutas clínicas ---
✓ PASS: Caja calcula el vuelto en tiempo real para pago en efectivo (S/ 50.00)
✓ PASS: Genera Constancia interna de pago CP-6288 con monto S/ 100.00, medio Efectivo y vuelto S/ 50.00
✓ PASS: La constancia emitida en Caja NO incluye botón para abrir el expediente del paciente
✓ PASS: Caja es redirigido a #caja al intentar abrir rutas clínicas o administrativas (#caja, #caja, #caja, #caja, #caja, #caja)

--- 5.5 Médico vs Administrador: Edición y cierre de consulta clínica vs modo supervisión ---
✓ PASS: Médico ve "Mi agenda médica" sin botón "+ Nueva cita" y solo con sus propias citas
✓ PASS: El Médico edita campos clínicos, finaliza la consulta y el estado pasa a "Atendida" conservando los datos en sesión
✓ PASS: El Administrador en #consulta ve los datos clínicos en modo solo lectura (disabled/readonly) y sin botón para guardar o finalizar

--- 5.6 Técnico Oftalmológico: Estudios y expediente en modo consulta ---
✓ PASS: Técnico accede a #pacientes/1 en "Modo consulta" sin botones de edición ni reserva

--- 6. Verificación responsiva real en navegador (1280×800, 768×1024, 375×667) ---
✓ PASS: Escritorio (1280×800): Cero desbordamiento horizontal global en Agenda, Pacientes, CRM, Inbox, Caja y Consulta (scrollWidth=1270, clientWidth=1270)
✓ PASS: Escritorio (1280×800): Menú lateral accesible (240px) y contenido principal sin recorte (mainRight=1270px)
✓ PASS: Escritorio (1280×800): Tablas mantienen scroll interno en .tablewrap (clientWidth=958px, scrollWidth=958px)
✓ PASS: Escritorio (1280×800): Tablero CRM mantiene scroll interno en #crmboard (clientWidth=960px, scrollWidth=1480px)
✓ PASS: Escritorio (1280×800): Drawer lateral CRM dentro del viewport (left=830px, right=1270px, width=440px) y botón de cierre accesible
✓ PASS: Escritorio (1280×800): Modal de restablecimiento muestra acciones visibles dentro del viewport (left=355px, right=915px)
✓ PASS: Escritorio (1280×800): Controles principales con dimensiones utilizables (#new: 118×41px)
✓ PASS: Tablet (768×1024): Cero desbordamiento horizontal global en Agenda, Pacientes, CRM, Inbox, Caja y Consulta (scrollWidth=768, clientWidth=768)
✓ PASS: Tablet (768×1024): Menú lateral accesible (210px) y contenido principal sin recorte (mainRight=768px)
✓ PASS: Tablet (768×1024): Tablas mantienen scroll interno en .tablewrap (clientWidth=512px, scrollWidth=811px)
✓ PASS: Tablet (768×1024): Tablero CRM mantiene scroll interno en #crmboard (clientWidth=514px, scrollWidth=1480px)
✓ PASS: Tablet (768×1024): Drawer lateral CRM dentro del viewport (left=328px, right=768px, width=440px) y botón de cierre accesible
✓ PASS: Tablet (768×1024): Modal de restablecimiento muestra acciones visibles dentro del viewport (left=104px, right=664px)
✓ PASS: Tablet (768×1024): Controles principales con dimensiones utilizables (#new: 118×41px)
✓ PASS: Móvil (375×667): Cero desbordamiento horizontal global en Agenda, Pacientes, CRM, Inbox, Caja y Consulta (scrollWidth=375, clientWidth=375)
✓ PASS: Móvil (375×667): Menú lateral accesible (65px) y contenido principal sin recorte (mainRight=375px)
✓ PASS: Móvil (375×667): Tablas mantienen scroll interno en .tablewrap (clientWidth=280px, scrollWidth=811px)
✓ PASS: Móvil (375×667): Tablero CRM mantiene scroll interno en #crmboard (clientWidth=282px, scrollWidth=1480px)
✓ PASS: Móvil (375×667): Drawer lateral CRM dentro del viewport (left=0px, right=375px, width=375px) y botón de cierre accesible
✓ PASS: Móvil (375×667): Modal de restablecimiento muestra acciones visibles dentro del viewport (left=17px, right=358px)
✓ PASS: Móvil (375×667): Controles principales con dimensiones utilizables (#new: 118×41px)

========================================
TOTAL PRUEBAS NAVEGADOR REAL: 61
PASADAS: 61
FALLIDAS: 0
========================================
[OK] 7. Pruebas funcionales en navegador Google Chrome (test_browser_functional.mjs) finalizado exitosamente.

================================================================
¡TODAS LAS COMPROBACIONES Y PRUEBAS SE COMPLETARON CON ÉXITO!
================================================================
```

---

## 5. Limitaciones Declaradas del Prototipo

1. **Persistencia:** Toda la información reside en memoria de la sesión (`sessionStorage` y estado en memoria de JavaScript). No existen bases de datos SQL/NoSQL ni backend productivo.
2. **Seguridad:** Los controles de ruta y rol están diseñados para la demostración funcional del cliente en navegador; no sustituyen autorización en servidor.
3. **Mensajería:** Los canales de mensajería (`WhatsApp`, `Instagram`, `Google`, `Facebook`, `Referido`) muestran el canal real de cada contacto sobre conversaciones simuladas en memoria.
4. **Documentos de Caja:** Las órdenes (`OP-XXXX`) y constancias internas de pago (`CP-XXXX`) son documentos administrativos demostrativos sin valor tributario ni integración con SUNAT.

---

## 6. Ampliación Verificada: Pipeline Comercial CRM (Entregas 1–4)

### 6.1. Capacidades Incorporadas
- **Entrega 1 (Indicadores del Pipeline):** Franja superior de 6 KPIs (`Prospectos activos`, `Valor potencial activo`, `Conversión a cita`, `Asistencia`, `Oportunidades estancadas` y `Recuperaciones ARM pendientes`) con grilla 3×2 en escritorio, 2×3 en tablet y 1×6 en móvil, con cálculo dinámico ante arrastre, edición, reserva, asistencia y recuperación ARM.
- **Entrega 2 (Control de Estancamiento):** Seguimiento por tarjeta con `stageEnteredAt`, días acumulados respecto al reloj demo (`2026-10-27`), última actividad (`lastActivityAt`), próxima acción, responsable, valor estimado y cita vinculada. Clasificación visual diferenciada (`Normal`, `Atención`, `Estancado`, `Vencido`) sin confundirla con prioridad comercial (`Caliente / Tibia / Fría / Convertida`), preservando `stageEnteredAt` en ediciones sin cambio de etapa y agregando filtro `#crmfollowup`.
- **Entrega 3 (“Análisis del pipeline”):** Vista secundaria dentro de `#crm` (`Tablero` / `Análisis`) sin añadir opciones al menú lateral. Presenta **Avance acumulado del pipeline actual** (con porcentaje de avance actual estimado sobre la etapa vigente y aviso explícito de que no representa historial de conversiones), tiempos promedio, motivos de pérdida, tasa de inasistencia, recuperación tras inasistencia y distribución por canal con filtros por canal, responsable y periodo calculado según la fecha de entrada a la etapa actual (`stageEnteredAt`), declaración explícita de muestra demostrativa/valores no reales y manejo seguro de ausencia de datos (`Sin datos suficientes`).
- **Entrega 4 y Ajuste Final (Conexión Operativa, Etapas Protegidas y Cancelación):** Sincronización bidireccional en tiempo real entre Inbox (actividad y confirmación de interés), Agenda (reserva, reprogramación, cancelación que traslada a `Seguimiento` con próxima acción `"Coordinar nueva fecha tras cancelación"`, conserva oportunidad/valor/historial y registra bitácora sin generar ARM ni marcar `No asistió`), Atención médica (`Atendida` → `Asistió`) y Centro ARM (cola pendiente en `No asistió` y ejecución única `+10 min` → `Seguimiento`), con bloqueo de retiro en las 6 etapas esenciales (`Cita agendada`, `Asistió`, `No asistió`, `Seguimiento`, `Convertido`, `Perdido`), libertad para crear y retirar columnas comerciales y resguardo para no asignar etapas inexistentes.

### 6.2. Consolidado Tras Cierre de Pipeline (`npm test`)
- **Sintaxis JS (`node --check`):** 5 / 5 módulos aprobados (`app.js`, `auth.js`, `crm.js`, `arm.js`, `server.mjs`).
- **Comprobaciones Estáticas (`test_static_checks.mjs`):** 50 / 50 aprobadas.
- **Pruebas Unitarias (`test_roles.mjs`):** 101 / 101 aprobadas.
- **Pruebas Reales en Google Chrome CDP (`test_browser_functional.mjs`):** 111 / 111 aprobadas (incluye protección de etapas en `#columns`, cancelación → `Seguimiento`, aclaración de Análisis/periodo y mediciones de cero desbordamiento global en Desktop `1280×800`, Tablet `768×1024` y Móvil `375×667`).
- **Total de aquella etapa:** **267 / 267 comprobaciones aprobadas sin fallos.**

---

## 7. Ampliación Verificada: Módulo Personal “Mi perfil”, Contraseña Simulada y Preferencias Visuales

### 7.1. Capacidades Incorporadas
- **Acceso accesible y protección de ruta (`#perfil`, `#perfil/preferencias`):**
  - La tarjeta de usuario en la parte inferior del menú lateral (`#profile`) abre un menú accesible (`role="menu"`) con **Mi perfil**, **Preferencias** y **Cerrar sesión**, operable con teclado (`Enter`/`Space`, `ArrowDown`, `ArrowUp`, `Home`, `End`, `Escape` con retorno de foco).
  - La barra superior incorpora un acceso directo a perfil (`#topbar-profile-link`) disponible para los 5 roles (incluido **Caja** en móvil `375×667`).
  - Sin sesión activa, cualquier intento de abrir `#perfil` o `#perfil/preferencias` redirige a la pantalla de acceso.
- **Datos personales e invariantes de seguridad demostrativa:**
  - Avatar dinámico por iniciales (`calcInitials`), edición de **Nombre visible**, **Teléfono** (9 dígitos) y **Correo de contacto**, con validación por campo (`aria-invalid` + `role="alert"`) y sincronización inmediata hacia cabecera, tarjeta lateral y sesión activa (`sessionStorage`).
  - Bloqueo estricto de lectura (`readonly` / `disabled`) sobre **Rol actual**, **Correo de acceso** y **Estado de la cuenta**, sin ampliar módulos restringidos ni persistir datos en backend externo.
- **Cambio simulado de contraseña en memoria:**
  - Validación por requisitos (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, distinta a la actual y coincidencia con confirmación), botones accesibles **Mostrar / Ocultar** (`aria-pressed`), nota obligatoria (`"Cambio simulado para esta demostración. No utiliza un servidor de autenticación."`) y limpieza total de inputs al guardar.
  - Almacenamiento únicamente en memoria mediante resumen local con sal; nunca se expone ni registra en `sessionStorage`, `localStorage`, DOM, código visible ni salidas de prueba. Compatible con reingreso en pestaña `Con contraseña` sin alterar el flujo por defecto `Con código OTP`.
- **Preferencias visuales y accesibilidad (`localStorage`: `clinica_user_preferences_v1`):**
  - **3 temas predefinidos** mediante variables CSS compartidas (`Verde clínico`, `Azul institucional`, `Neutro cálido`), con 4 muestras visuales (`Principal`, `Acento`, `Fondo`, `Superficie`) e indicador textual no basado solo en color.
  - **Tamaño de texto:** `Normal` (`14px`) / `Grande` (`16px`).
  - **Reducir movimiento:** `Desactivado` / `Activado` + soporte automático `@media (prefers-reduced-motion: reduce)` conservando anillos de foco visibles.
  - Aislamiento por usuario en `localStorage`, persistencia tras recarga real del navegador y limpieza completa al confirmar **`Restablecer demo`**.

### 7.2. Consolidado Final Actual (`npm test`)
- **Sintaxis JS (`node --check`):** 5 / 5 módulos aprobados (`app.js`, `auth.js`, `crm.js`, `arm.js`, `server.mjs`).
- **Comprobaciones Estáticas (`test_static_checks.mjs`):** 55 / 55 aprobadas.
- **Pruebas Unitarias (`test_roles.mjs`):** 113 / 113 aprobadas.
- **Pruebas Funcionales, Accesibilidad, Contraste WCAG AA y Responsividad en Google Chrome CDP (`test_browser_functional.mjs`):** 139 / 139 aprobadas (incluye contraste calculado sobre `#perfil`, `#agenda`, `#crm`, `#inbox` y `#caja` en los 3 temas y layout responsivo en `1280×800`, `768×1024` y `375×667`).
- **Total acumulado vigente:** **312 / 312 comprobaciones aprobadas sin fallos.**
