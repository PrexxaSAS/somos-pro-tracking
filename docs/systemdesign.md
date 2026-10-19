# Sistema de diseño — Somos PRO Tracking

Aplica a todas las pantallas internas (dashboard, listados, detalle). Referencia visual: `Dashboard Redesign.dc.html` (opción 2a), `Conductores.dc.html`, `Pedidos.dc.html`, `Usuarios.dc.html`, `Transportistas.dc.html`.

## 1. Fundamentos

**Tipografía**
- UI: `'Plus Jakarta Sans', system-ui, sans-serif` (Google Fonts, pesos 400/500/600/700/800).
- Datos técnicos (IDs, placas, NIT, cédulas, @usuarios): `'IBM Plex Mono', monospace` 500.
- Números en tablas y KPIs: `font-variant-numeric: tabular-nums`.

**Escala tipográfica**
- H1 página: 26px / 800 / letter-spacing -.02em
- Subtítulo página: 14px / 400 / #77738a
- Título de tarjeta: 15px / 700
- Cuerpo y tablas: 13px / 400–600
- Cabecera de tabla y etiquetas de grupo: 11px / 600 / uppercase / letter-spacing .06em / #a09cae
- Meta (secundario): 12px / #8a8697
- KPI grande (dashboard): 30px / 800 / -.03em
- KPI franja (listados): 26px / 800 / -.03em

**Color**
- Marca / acción primaria: `#5b35d5` · hover `#4b2ab8` · tinte `#f1edfd` · tinte avatar `#e9e3fc`
- Texto: primario `#17141f` · secundario `#4a4657` · terciario `#77738a` · deshabilitado `#8a8697` · placeholder `#a09cae` · muy tenue `#c9c5d6`
- Fondo app: `#f7f6fa` · superficie: `#fff` · relleno suave: `#f7f6fa` / `#f1f0f5` · hover fila: `#fbfafd`
- Bordes: tarjeta `#ecebf1` · control `#e6e4ec` · divisor fila `#f0eff4`
- Semánticos (fondo / texto / punto):
  - Error / vencido: `#fdecea` / `#c33a31` / `#e04a3f` (borde tarjeta alerta `#f3d3cf`)
  - Alerta / en riesgo / en gestión: `#fbf4e6` / `#8a6420` / `#d98b1c`
  - Éxito / activo / entregado: `#e5f5ee` / `#177a56` / `#1f9a6e`
  - Info / empresa transportista: `#e8f0fa` / `#24568f` / `#2d6fb8`
  - Neutro / sin asignar: `#f1f0f5` / `#4a4657` / `#a39db8`
  - Estados de pedido (barra): sin asignar `#a39db8`, pendiente `#d6d2e2`, en tránsito `#9b7ff5`, paquetería `#c3b1fa`, entregado `#5b35d5`, con novedad `#e04a3f`, solo facturar `#1f8a7a`, cliente recoge `#2d6fb8`
- Regla: el púrpura se reserva para marca, ítem activo y acción primaria. Rojo/ámbar/verde solo con significado operativo.

**Radios**: controles 8–10px · chips 999px · tarjetas 14px · logo 10px · avatar circular.
**Sombras**: ninguna en tarjetas (solo borde). Segmento activo: `0 1px 2px rgba(0,0,0,.08)`.
**Íconos**: Lucide (`lucide-static` font), 18px por defecto; 15–16px dentro de botones y celdas.

## 2. Estructura de página

```
[Sidebar 248px] [Main: padding 28px 36px 36px; gap 20px]
                 Header → Franja KPI → Tarjeta (filtros + tabla + pie)
```

**Sidebar** (`#fff`, borde derecho `#ecebf1`, padding 20px 14px)
- Logo: cuadro 36px `#5b35d5` con "PRO" 12px/800 blanco + "Somos PRO" 15px/700 + "Tracking" 12px gris.
- Grupos con etiqueta 11px uppercase: Operación · Red de transporte · Cartera · Configuración.
- Ítem: 14px, padding 7–8px 10px, radio 8px, ícono 18px `#8a8697`. Activo: fondo `#f1edfd`, texto e ícono `#5b35d5`, peso 600. Hover: `#f6f5f9`.
- Pie: tarjeta de usuario con borde `#ecebf1`, radio 12px, avatar con iniciales, nombre 13px/600, rol 12px, íconos compartir y salir (`#d9433a`).

**Header**: H1 + subtítulo a la izquierda; acciones a la derecha (`gap 10px`). Botón primario siempre último.

**Franja KPI**: una sola tarjeta blanca, `grid repeat(auto-fit, minmax(150px,1fr))`, celdas con `border-left #f0eff4`, padding 16px 20px. Etiqueta 13px con punto de color 6px + valor 26px. Si las celdas son filtros, activo = fondo `#f1edfd`, valor `#5b35d5`.

**Tarjeta de listado**
1. Barra de filtros (padding 14px 18px, borde inferior): búsqueda 260px (fondo `#f7f6fa`) → selects → segmento → "Limpiar" (aparece solo con filtros) → a la derecha contador "N ítems · orden A–Z".
2. Tabla como CSS grid; envuelta en `overflow-x:auto; overflow-y:hidden` con `min-width` ≈ 940px.
3. Pie: contador a la izquierda, paginación a la derecha (30px, activo `#5b35d5`).

**Tabla**
- Cabecera 11px uppercase, padding 10px 18px.
- Fila: padding 12px 18px (denso 8px), borde inferior `#f0eff4`, hover `#fbfafd`, cursor pointer.
- Primera columna: avatar 36px con iniciales (`#e9e3fc`/`#5b35d5`) + nombre 600 + meta 12px.
- IDs y placas en chip mono: `#f7f6fa`, borde `#ecebf1`, radio 6px, 12px.
- Estado: chip 999px con punto 6px, colores semánticos.
- Números alineados a la derecha, 700, tabular.
- Última columna 44px: menú "···" (32px, hover `#f1f0f5`).
- Listas ordenadas A–Z con `localeCompare('es')`.
- Filas anidadas (maestro-detalle): fondo `#fbfafd`, padding-left 50px, grid más estrecho.

## 3. Componentes

**Botones** (altura 38px header / 36px filtros / 30px en fila; 13px/600; radio 10px; gap 8px con ícono 16px)
- Primario: `#5b35d5` texto blanco, hover `#4b2ab8`.
- Secundario: `#fff`, borde `#e6e4ec`, texto `#4a4657`, ícono `#8a8697`, hover `#f6f5f9`.
- Terciario/enlace: texto `#5b35d5` 600 con ícono flecha.
- Destructivo: solo en hover del ícono (`#fdecea`/`#c33a31`); nunca botón rojo grande en tabla.
- Oscuro (CTA en paneles de atención): `#17141f` texto blanco.

**Segmento**: contenedor `#f7f6fa` borde `#e6e4ec` radio 10px padding 3px; opción 6px 12px radio 7px; activa `#fff` + sombra.
**Select**: como botón secundario, ícono a la izquierda y chevron a la derecha.
**Búsqueda**: ícono lupa 16px `#a09cae`, placeholder descriptivo ("Buscar nombre, cédula o placa").
**Pestañas de estado** (Pedidos): fila con borde inferior `#e6e4ec`, `flex-wrap`; pestaña 13px/600 con badge de conteo; activa texto `#17141f` + borde inferior 2px `#5b35d5`.
**Chip de conteo**: 12px/700, padding 3px 9px, 999px; con valor >0 `#f1edfd`/`#5b35d5`, si 0 `#f1f0f5`/`#8a8697`.
**Tarjeta de alerta** (fuera de promesa): borde `#f3d3cf`, ícono en cuadro 30px `#fdecea`, título 15px/700, badge de conteo rojo, lista accionable con chip de días de retraso.
**Estado vacío**: texto 14px `#77738a` centrado, padding 48px, con enlace de acción cuando aplique.
**Gráficos**: dona con `conic-gradient` + máscara radial (grosor 13–14px); barra apilada 14px radio 7px con `gap 2px`; leyenda en grid 4 columnas.

## 4. Principios

- Jerarquía de lectura: cifras → excepciones → detalle. Alertas nunca compiten con la marca.
- Listados en tabla, no en tarjetas. Misma barra de filtros y misma columna de acciones en todas las páginas.
- Datos verbatim del sistema; sin decorar con íconos o estadísticas que no existan.
- Relaciones padre-hijo (empresa → conductores) se muestran anidadas, no como dos listas.
- Todo estilo va inline; sin hojas de estilo por clase. Únicas reglas globales: fuentes, reset de `body`, color de `a`.
- Tweak estándar en listados: `dense` (boolean) que reduce el padding de fila a 8px.
