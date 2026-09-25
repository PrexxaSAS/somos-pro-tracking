import React from 'react';
import {
  BarChart3,
  Box,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  LogOut,
  MapPin,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  Share2,
  Truck,
  User,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { ROLES, CARTERA_ACTIVA } from '../../Constants';
import { T } from '../../design/tokens';

// El menu va agrupado por secciones: con quince opciones seguidas nadie encuentra
// nada. Cada rol ve solo sus grupos, y un grupo sin opciones no se dibuja.
export const MENUS = {
  admin: [
    ["Operacion", [
      ["dashboard", "Dashboard", BarChart3],
      ["pedidos", "Pedidos", Box],
      ["rastreo", "Rastreo GPS", MapPin],
      ["recogidas", "Recogidas", PackageCheck],
      ["devoluciones", "Devoluciones", RotateCcw],
      ["pqrs", "PQRS", HelpCircle],
    ]],
    ["Red de transporte", [
      ["conductores", "Conductores", Users],
      ["transportistas", "Transportistas", Truck],
      ["resumen", "Resumen transportador", ClipboardList],
      ["paqueterias", "Paqueterias", Warehouse],
    ]],
    ...(CARTERA_ACTIVA ? [["Cartera", [
      ["cartera_cargar", "Cargar pedidos", Box],
      ["cartera_pedidos", "Pedidos en cartera", Wallet],
      ["cartera_vencida", "Cartera vencida", FileText],
      ["cartera_sedes", "Sedes y cortes", Warehouse],
      ["cartera_asesores", "Asesores", Users],
    ]]] : []),
    ["Configuracion", [
      ["ciudades", "Ciudades / DANE", Building2],
      ["promesas", "Promesas de servicio", CalendarClock],
      ["facturas", "Facturas proveedor", FileText],
      ["usuarios", "Usuarios", User],
    ]],
  ],
  operador: [
    ["Operacion", [
      ["dashboard", "Dashboard", BarChart3],
      ["pedidos", "Pedidos", Box],
      ["rastreo", "Rastreo GPS", MapPin],
      ["recogidas", "Recogidas", PackageCheck],
      ["devoluciones", "Devoluciones", RotateCcw],
      ["pqrs", "PQRS", HelpCircle],
    ]],
    ["Red de transporte", [
      ["conductores", "Conductores", Users],
      ["resumen", "Resumen transportador", ClipboardList],
    ]],
    ...(CARTERA_ACTIVA ? [["Cartera", [
      ["cartera_cargar", "Cargar pedidos", Box],
      ["cartera_logistica", "Logistica cartera", Printer],
      ["cartera_pedidos", "Pedidos en cartera", Wallet],
      ["cartera_vencida", "Cartera vencida", FileText],
    ]]] : []),
    ["Configuracion", [
      ["promesas", "Promesas de servicio", CalendarClock],
      ["facturas", "Facturas proveedor", FileText],
    ]],
  ],
  cartera: CARTERA_ACTIVA ? [
    ["Cartera", [
      ["cartera_cargar", "Cargar pedidos", Box],
      ["cartera_pedidos", "Gestion de pedidos", Wallet],
      ["cartera_vencida", "Cartera vencida", FileText],
    ]],
  ] : [],
  transportista: [
    ["Mi operacion", [["mi_empresa", "Mi empresa", Truck]]],
  ],
  conductor: [
    ["Mi operacion", [
      ["mis_pedidos", "Mis pedidos", Box],
      ["mis_devoluciones", "Mis devoluciones", RotateCcw],
      ["mis_recogidas", "Mis recogidas", PackageCheck],
      ["mi_ubicacion", "Mi ubicacion GPS", MapPin],
    ]],
  ],
  cliente: [
    ["Mis solicitudes", [
      ["consultas", "Estado pedidos", Box],
      ["devoluciones", "Mis devoluciones", RotateCcw],
      ["recogidas", "Mis recogidas", PackageCheck],
      ["pqrs", "PQRS", HelpCircle],
      ...(CARTERA_ACTIVA ? [
        ["cartera_consultas", "Consultas cartera", Search],
        ["cartera_asesores", "Asesores", Users],
      ] : []),
    ]],
  ],
};

function Marca({ colapsado }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg,${T.color.marca},${T.color.marcaFuerte})`,
        color: "#fff", display: "grid", placeItems: "center",
        fontWeight: 800, fontSize: 12, letterSpacing: "-0.02em",
      }}>PRO</div>
      {!colapsado && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.color.tinta, lineHeight: 1.1 }}>Somos PRO</div>
          <div style={{ fontSize: 11, color: T.color.tinta3 }}>Tracking</div>
        </div>
      )}
    </div>
  );
}

export function SidebarApp({ user, activeTab, setActiveTab, onLogout, onShareApp, collapsed, setCollapsed }) {
  const grupos = MENUS[user.rol] || [];
  const inicial = (user.nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <aside style={{
      width: collapsed ? 72 : 264,
      // Altura fija a la ventana y pegado arriba: el menu se desplaza por dentro y el
      // bloque del usuario queda siempre visible, sin tener que bajar la pagina.
      height: "100vh",
      position: "sticky",
      top: 0,
      alignSelf: "flex-start",
      background: T.color.superficie,
      borderRight: `1px solid ${T.color.borde}`,
      display: "flex", flexDirection: "column",
      transition: "width .2s ease",
      flexShrink: 0,
    }}>
      <div style={{
        padding: collapsed ? "18px 14px" : "18px 16px",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between", gap: 8,
      }}>
        <Marca colapsado={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Contraer menu"}
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: T.color.tinta3, padding: 4, borderRadius: 8,
            display: collapsed ? "none" : "grid", placeItems: "center",
          }}>
          <ChevronLeft size={16} />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir menu"
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: T.color.tinta3, margin: "0 auto 6px", padding: 4,
            borderRadius: 8, display: "grid", placeItems: "center",
          }}>
          <ChevronRight size={16} />
        </button>
      )}

      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "4px 10px 16px" : "4px 12px 16px" }}>
        {grupos.map(([titulo, items]) => (
          <div key={titulo} style={{ marginBottom: 18 }}>
            {!collapsed && (
              <div style={{ ...T.texto.seccion, color: T.color.tinta3, padding: "0 10px 8px" }}>{titulo}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map(([tab, label, Icono]) => {
                const activo = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    title={collapsed ? label : undefined}
                    style={{
                      width: "100%",
                      display: "flex", alignItems: "center", gap: 10,
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px" : "9px 10px",
                      borderRadius: T.radio.control,
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      textAlign: "left", fontSize: 13.5,
                      fontWeight: activo ? 700 : 500,
                      color: activo ? T.color.marca : T.color.tinta2,
                      background: activo ? T.color.marcaSuave : "transparent",
                      transition: "background .12s, color .12s",
                    }}>
                    <Icono size={17} strokeWidth={activo ? 2.3 : 1.9} style={{ flexShrink: 0 }} />
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div style={{
        borderTop: `1px solid ${T.color.borde}`,
        padding: collapsed ? "12px 10px" : "12px",
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: T.radio.pastilla, flexShrink: 0,
            background: T.color.marcaSuave, color: T.color.marca,
            display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13,
          }}>{inicial}</div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: T.color.tinta, lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{user.nombre}</div>
              <div style={{ fontSize: 11.5, color: T.color.tinta3 }}>{ROLES[user.rol] || user.rol}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {onShareApp && (
              <button onClick={onShareApp} title="Compartir app" style={botonIcono}>
                <Share2 size={16} />
              </button>
            )}
            <button onClick={onLogout} title="Cerrar sesion" style={{ ...botonIcono, color: T.color.mal }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

const botonIcono = {
  border: "none", background: "transparent", cursor: "pointer",
  color: T.color.tinta3, padding: 7, borderRadius: 8,
  display: "grid", placeItems: "center",
};
