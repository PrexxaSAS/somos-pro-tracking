import React, { useState, useEffect } from 'react';
import { 
  Layout, Users, Package, Truck, ClipboardList, 
  Settings, LogOut, Plus, Search, Filter, 
  ChevronRight, AlertCircle, CheckCircle2, Clock,
  MapPin, Calendar, MoreVertical, Edit2, Trash2,
  ArrowRight, Download, Eye, ShieldCheck, UserPlus,
  BarChart3, PieChart, Activity, Menu, X, Bell
} from 'lucide-react';

// --- CONSTANTES Y ESTILOS ---
const P = {
  950: "#1e0050",
  900: "#3b0764",
  800: "#4c1d95",
  700: "#6d28d9",
  600: "#7c3aed",
  500: "#8b5cf6",
  400: "#a78bfa",
  300: "#c4b5fd",
  200: "#ddd6fe",
  100: "#ede9fe",
  50:  "#f5f3ff",
};

// ... (Aquí va todo el código que ya tienes de Logo, CIUDADES, y Sub-componentes)
// NOTA: Para no saturar el chat, asumo que mantienes las 1000 líneas iniciales.
// He verificado la estructura interna y el error está al FINAL.

// --- CONTINUACIÓN DEL CÓDIGO HACIA EL FINAL ---

/* [ASUME QUE AQUÍ ESTÁN TODOS LOS COMPONENTES: Sidebar, Dashboard, Usuarios, etc.] */

export default function SomosProTracking() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  // Estados de datos
  const [pedidos, setPedidos] = useState([
    { id: "PRO-1001", cliente: "Ferretería El Martillo", origen: "Bogotá", destino: "Medellín", estado: "en_ruta", fecha: "2024-03-20" },
    { id: "PRO-1002", cliente: "Almacenes Éxito", origen: "Cali", destino: "Pereira", estado: "entregado", fecha: "2024-03-19" },
  ]);

  const [conductores, setConductores] = useState([
    { id: 1, nombre: "Juan Pérez", vehiculo: "Camión Turbo NHR", placa: "XYZ-123", estado: "activo" },
  ]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const renderContent = () => {
    if (!user) return null;
    
    switch (tab) {
      case "dashboard":         return <Dashboard pedidos={pedidos} conductores={conductores} /> ;
      case "pedidos":           return <Pedidos pedidos={pedidos} setPedidos={setPedidos} conductores={conductores} showToast={showToast} user={user} />;
      case "conductores":       return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={{ role: "admin", name: "Admin" }} />;
      case "usuarios":          return <Usuarios />;
      case "mi_empresa":        return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={user} />;
      case "mis_conductores":   return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={user} />;
      case "mis_pedidos":       return <VistaConductor pedidos={pedidos} setPedidos={setPedidos} user={user} conductores={conductores} showToast={showToast} />;
      case "mi_ubicacion":      return <MiUbicacion />;
      case "mis_pedidos_cliente": return <VistaCliente pedidos={pedidos} conductores={conductores} showToast={showToast} />;
      default:                  return <Dashboard pedidos={pedidos} conductores={conductores} />;
    }
  };

  if (!user) {
    return (
      <Login 
        onLogin={(userData) => {
          setUser(userData);
          // Redirección inicial según rol
          if (userData.role === 'conductor') setTab('mis_pedidos');
          else if (userData.role === 'cliente') setTab('mis_pedidos_cliente');
          else setTab('dashboard');
        }} 
      />
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f7f5ff" }}>
      <Sidebar
        user={user}
        activeTab={tab}
        setActiveTab={setTab}
        onLogout={() => setUser(null)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px", maxWidth: "100%", boxSizing: "border-box" }}>
        {renderContent()}
      </main>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "white", padding: "12px 20px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 9999, animation: "fadein 0.3s ease-out"
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
