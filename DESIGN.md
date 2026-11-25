# Clínica · Diseño de la aplicación

Registro: producto operativo. Referencias: documento maestro §11–12, auditoría de Atoms.dev ("Vista Clara") e img_referencia_1.png. Se adopta la identidad visual verde bosque profundo, acentos ámbar cálido y superficies marfil limpias, con navegación refinada y tarjetas de lectura tranquila. La agenda y el panel general constituyen el centro operativo, con jerarquía editorial y widgets especializados de oftalmología.

## Tokens y propiedad
La fuente ejecutable es `app/style.css`, bloque `:root`. Correspondencia:
- Navegación / Fondo oscuro: `--navy` / `--forest #12372a`
- Acción principal: `--primary #1b4d3e`, `--primary-hover #143b2f`
- Fondo general: `--bg #f8faf8`
- Superficie limpia: `--surface #ffffff`
- Texto principal: `--text #192a20`
- Texto secundario / muted: `--muted #556b5e`
- Líneas y bordes: `--line #e3ebe5`
- Estados:
  - Éxito / Pagado / Atendida: `--success #15803d`, fondo `--success-bg #dcfce7`
  - Aviso / En espera / Pendiente: `--warning #b45309`, fondo `--warning-bg #fef3c7`
  - Acento ámbar: `--amber #d97706`, fondo `--amber-soft #fef3c7`
  - Peligro / Cancelada: `--danger #b91c1c`, fondo `--danger-bg #fee2e2`
- Scrollbar: `--scroll #a8baa9`

Tipografía: Segoe UI local y Arial de respaldo; títulos 28px/650, subtítulos editoriales en mayúsculas tracking amplio, cuerpo 14px, datos numéricos tabulares (tnum) 13px, etiquetas 11–12px. Los importes usan Intl es-PE/PEN. Radios 8px en controles y 12–16px en paneles y banner orbital; bordes sutiles de 1px.

## Componentes y adaptación
- **Menú lateral**: 240px, contraído 78px; iconografía vectorial SVG nítida. Perfil inferior de Recepción con apertura superior.
- **Hero Banner Orbital («Iris-band»)**: Banner con degradado verde bosque (#12372a a #1a4d3b), indicador de próxima cita del día, accesos rápidos y contadores rápidos de estado.
- **Panel General (Dashboard)**: Cuadrícula de KPIs contextuales, columna principal con lista compacta de agenda, y columna lateral con widgets de seguimiento CRM, disponibilidad médica y cola de estudios oftalmológicos.
- **Foco visible y accesibilidad**: Foco visible de 3px, controles semánticos, contraste conforme y respeto por `prefers-reduced-motion`.
- **Centro ARM**: Mantiene la identidad verde del producto y utiliza una línea vertical de supervisión como firma visual. Cada evento identifica acción, resultado, agente y hora. Las capacidades y los límites se presentan en bloques separados; ningún estado depende solo del color.
- **Drawers operativos**: CRM, Agenda y ARM comparten panel lateral derecho de hasta 440–460px, fondo atenuado, cierre explícito, foco inicial dentro del panel y transformación a ancho completo en móvil.

