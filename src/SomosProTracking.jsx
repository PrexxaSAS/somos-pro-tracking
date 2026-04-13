import React, { useState, useEffect, useRef } from 'react';
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
  950: "#1e0050", 900: "#3b0764", 800: "#4c1d95", 700: "#6d28d9",
  600: "#7c3aed", 500: "#8b5cf6", 400: "#a78bfa", 300: "#c4b5fd",
  200: "#ddd6fe", 100: "#ede9fe", 50:  "#f5f3ff",
};

const CIUDADES = [
  { code: "11001", name: "Bogotá D.C." }, { code: "05001", name: "Medellín" },
  { code: "76001", name: "Cali" }, { code: "08001", name: "Barranquilla" },
  { code: "13001", name: "Cartagena" }, { code: "68001", name: "Bucaramanga" }
];

const ESTADOS = {
  sin_asignar: { label: "Sin Asignar",  color: "#64748b", bg: "#f1f5f9", icon: "○" },
  pendiente:   { label: "Pendiente",    color: "#d97706", bg: "#fffbeb", icon: "◐" },
  en_transito: { label: "En Tránsito",  color: P[600],    bg: P[50],    icon: "▶" },
  entregado:   { label: "Entregado",    color: "#059669", bg: "#ecfdf5", icon: "✓" },
};

// --- COMPONENTES AUXILIARES ---
function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="white" stroke={P[600]} strokeWidth="4"/>
      <text x="50" y="37" textAnchor="middle" fontSize="17" fontWeight="600" fill={P[700]}>Somos</text>
      <text x="50" y="68" textAnchor="middle" fontSize="33" fontWeight="900" fill={P[700]}>PRO</text>
    </svg>
  );
}

function Btn({ children, onClick, variant = "primary", style = {}, type = "button" }) {
  const styles = {
    primary: { background: P[600], color: "#fff" },
    secondary: { background: P[50], color: P[700] }
  };
  return (
    <button type={type} onClick={onClick} style={{ 
      padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
      fontWeight: "bold", ...styles[variant], ...style 
    }}>{children}</button>
  );
}

// --- VISTAS DEL SISTEMA ---
const Login = ({ onLogin }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (u === "admin" && p === "1039456779") onLogin({ name: "Admin", role: "admin" });
    else alert("Credenciales incorrectas");
  };
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: P[50] }}>
      <form onSubmit={handleSubmit} style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <Logo size={60} />
        <h2 style={{ textAlign: "center", color: P[800] }}>Acceso PRO</h2>
        <input placeholder="Usuario" value={u} onChange={e => setU(e.target.value)} style={{ display: "block", margin: "10px 0", padding: "10px", width: "100%" }} />
        <input type="password" placeholder="Clave" value={p} onChange={e => setP(e.target.value)} style={{ display: "block", margin: "10px 0", padding: "10px", width: "100%" }} />
        <Btn type="submit" style={{ width: "100%" }}>Entrar</Btn>
      </form>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function SomosProTracking() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Sidebar Simple */}
      <aside style={{ width: "260px", background: P[950], color: "white", padding: "20px" }}>
        <Logo size={50} />
        <nav style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <Btn variant={tab === "dashboard" ? "primary" : "secondary"} onClick={() => setTab("dashboard")}>Dashboard</Btn>
          <Btn variant="secondary" onClick={() => setUser(null)} style={{ marginTop: "auto", color: "red" }}>Salir</Btn>
        </nav>
      </aside>

      {/* Contenido */}
      <main style={{ flex: 1, padding: "40px" }}>
        <header style={{ marginBottom: "30px" }}>
          <h1>Panel de Control</h1>
          <p>Bienvenido, {user.name}</p>
        </header>

        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <h3>Pedidos Hoy</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", color: P[600] }}>24</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
