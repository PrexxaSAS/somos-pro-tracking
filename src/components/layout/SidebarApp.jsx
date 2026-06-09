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
  RotateCcw,
  Share2,
  Truck,
  User,
  Users,
  Warehouse,
} from 'lucide-react';
import { ROLES } from '../../Constants';

const MENUS = {
  admin: [
    ["dashboard", "Dashboard", BarChart3],
    ["pedidos", "Pedidos", Box],
    ["rastreo", "Rastreo GPS", MapPin],
    ["conductores", "Conductores", Users],
    ["transportistas", "Transportistas", Truck],
    ["resumen", "Resumen Transportador", ClipboardList],
    ["devoluciones", "Devoluciones", RotateCcw],
    ["recogidas", "Recogidas", PackageCheck],
    ["pqrs", "PQRS", HelpCircle],
    ["ciudades", "Ciudades / DANE", Building2],
    ["paqueterias", "Paqueterias", Warehouse],
    ["promesas", "Promesas de Servicio", CalendarClock],
    ["facturas", "Facturas Proveedor", FileText],
    ["usuarios", "Usuarios", User],
  ],
  operador: [
    ["dashboard", "Dashboard", BarChart3],
    ["pedidos", "Pedidos", Box],
    ["rastreo", "Rastreo GPS", MapPin],
    ["conductores", "Conductores", Users],
    ["resumen", "Resumen Transportador", ClipboardList],
    ["devoluciones", "Devoluciones", RotateCcw],
    ["recogidas", "Recogidas", PackageCheck],
    ["pqrs", "PQRS", HelpCircle],
    ["promesas", "Promesas de Servicio", CalendarClock],
    ["facturas", "Facturas Proveedor", FileText],
  ],
  transportista: [["mi_empresa", "Mi Empresa", Truck]],
  conductor: [["mis_pedidos", "Mis Pedidos", Box], ["mi_ubicacion", "Mi Ubicacion GPS", MapPin]],
  cliente: [["consultas", "Estado Pedidos", Box], ["devoluciones", "Mis Devoluciones", RotateCcw], ["recogidas", "Mis Recogidas", PackageCheck], ["pqrs", "PQRS", HelpCircle]],
};

export function SidebarApp({ user, activeTab, setActiveTab, onLogout, onShareApp, collapsed, setCollapsed, pqrs = [] }) {
  const items = MENUS[user.rol] || [];
  const width = collapsed ? 72 : 246;
  const canShareApp = ["admin", "operador", "transportista"].includes(user.rol);

  return (
    <aside style={{
      width,
      height: "100vh",
      background: "#fff",
      borderRight: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      transition: "width .2s ease",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 20,
      color: "#111827",
    }}>
      <div style={{ padding: collapsed ? "16px 10px" : "18px 12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#6d42d8",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 13,
          flexShrink: 0,
        }}>
          PRO
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>Somos PRO</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>Tracking</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Contraer menu"}
          style={{
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            color: "#6b7280",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: "12px 12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: "#f1f0f8",
            display: "grid",
            placeItems: "center",
            color: "#4f2ca8",
            fontWeight: 800,
          }}>
            {user.nombre?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nombre}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{ROLES[user.rol] || user.rol}</div>
          </div>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: "auto", padding: "6px 8px 12px" }}>
        {items.map(([id, label, Icon]) => {
          const active = activeTab === id;
          const badgeCount = id === "pqrs" ? (pqrs || []).filter(p => p.estado === "abierta").length : 0;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={collapsed ? label : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                minHeight: 36,
                padding: collapsed ? "9px 0" : "9px 12px",
                marginBottom: 3,
                background: active ? "#f0eef9" : "transparent",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                color: active ? "#3f2386" : "#374151",
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                textAlign: "left",
                justifyContent: collapsed ? "center" : "flex-start",
                position: "relative",
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 1.9} />
              {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
              {badgeCount > 0 && (
                <span style={{
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: 99,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  position: collapsed ? "absolute" : "static",
                  top: 2,
                  right: 8,
                }}>
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", padding: "10px 8px 14px", background: "#fff" }}>
        {canShareApp && onShareApp && (
          <button
            onClick={onShareApp}
            title="Compartir App"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 12,
              minHeight: 38,
              padding: collapsed ? "9px 0" : "9px 12px",
              border: "none",
              background: "transparent",
              borderRadius: 10,
              color: "#374151",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <Share2 size={17} />
            {!collapsed && "Compartir App"}
          </button>
        )}
        <button
          onClick={onLogout}
          title="Cerrar Sesion"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 12,
            minHeight: 38,
            padding: collapsed ? "9px 0" : "9px 12px",
            border: "none",
            background: "transparent",
            borderRadius: 10,
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <LogOut size={17} />
          {!collapsed && "Cerrar Sesion"}
        </button>
      </div>
    </aside>
  );
}
