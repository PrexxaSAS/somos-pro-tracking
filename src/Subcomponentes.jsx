import React from 'react';
import { P, ESTADOS_PEDIDO, ROLES } from './Constants';

export function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="white" stroke={P[600]} strokeWidth="4"/>
      <text x="50" y="37" textAnchor="middle" fontSize="17" fontWeight="600"
            fill={P[700]} fontFamily="Georgia,serif" letterSpacing="0.5">Somos</text>
      <text x="50" y="68" textAnchor="middle" fontSize="33" fontWeight="900"
            fill={P[700]} fontFamily="Georgia,serif">PRO</text>
    </svg>
  );
}

export function Badge({ estado }) {
  const e = ESTADOS_PEDIDO[estado] || ESTADOS_PEDIDO.sin_asignar;
  return (
    <span style={{
      background: e.bg, color: e.color,
      border: `1px solid ${e.color}50`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {e.label}
    </span>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      boxShadow: `0 2px 20px ${P[600]}0d`,
      padding: 24, border: `1px solid ${P[100]}`, ...style,
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", style = {}, disabled = false, type = "button" }) {
  const sz = {
    sm: { padding: "6px 14px", fontSize: 12 },
    md: { padding: "10px 18px", fontSize: 14 },
    lg: { padding: "13px 26px", fontSize: 15 },
  };
  const vr = {
    primary:   { background: `linear-gradient(135deg,${P[700]},${P[600]})`, color: "#fff", boxShadow: `0 3px 10px ${P[600]}40` },
    secondary: { background: P[50], color: P[700], border: `1px solid ${P[200]}` },
    success:   { background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff" },
    danger:    { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
    ghost:     { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" },
  };
  return (
    <button type={type} onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      border: "none", cursor: disabled ? "not-allowed" : "pointer",
      borderRadius: 10, fontWeight: 700, fontFamily: "inherit",
      transition: "all .15s", display: "inline-flex",
      alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1,
      ...sz[size], ...vr[variant], ...style,
    }}>
      {children}
    </button>
  );
}

export function Field({ label, value, onChange, type = "text", placeholder = "", required, as = "input", options = [], style = {}, readOnly = false }) {
  const base = {
    border: `1.5px solid ${P[200]}`, borderRadius: 10,
    padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
    outline: "none", background: readOnly ? "#f8f9fa" : "#fafafa",
    width: "100%", boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: P[700], textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
        </label>
      )}
      {as === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={base} disabled={readOnly}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={3}
          style={{ ...base, resize: "vertical" }} readOnly={readOnly} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={base} readOnly={readOnly} />
      )}
    </div>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "#00000088",
        zIndex: 1000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, padding: 28,
        width: "100%", maxWidth: wide ? 720 : 520,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 64px #0004",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: P[800], fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{
            border: "none", background: P[50], cursor: "pointer",
            fontSize: 20, color: P[600], width: 34, height: 34,
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ msg, type, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, []);
  const clr = { success: "#059669", error: "#dc2626", info: P[600] };
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      background: clr[type] || P[700], color: "#fff",
      padding: "14px 22px", borderRadius: 14,
      fontWeight: 700, fontSize: 14, zIndex: 9999,
      boxShadow: "0 8px 32px #0004", maxWidth: 340,
      lineHeight: 1.5, animation: "fadein .3s",
    }}>
      {msg}
    </div>
  );
}

export function Sidebar({ user, activeTab, setActiveTab, onLogout, collapsed, setCollapsed }) {
  const menus = {
    admin:        [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"],["transportistas","🏢","Transportistas"],["usuarios","👥","Usuarios"]],
    operador:     [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"]],
    transportista:[["mi_empresa","🏢","Mi Empresa"]],
    conductor:    [["mis_pedidos","📦","Mis Pedidos"],["mi_ubicacion","📍","Mi Ubicación GPS"]],
    cliente:      [["consultas","🔍","Estado Pedidos"]],
  };
  const items = menus[user.rol] || [];

  return (
    <div style={{
      width: collapsed ? 60 : 230,
      minHeight: "100vh",
      background: `linear-gradient(180deg,${P[950]} 0%,${P[800]} 100%)`,
      display: "flex", flexDirection: "column",
      transition: "width .25s", flexShrink: 0,
    }}>
      <div style={{ padding: collapsed ? "16px 10px" : "18px 16px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", borderBottom: `1px solid ${P[700]}50` }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={32} />
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, lineHeight: 1.1 }}>Somos PRO</div>
              <div style={{ color: P[400], fontSize: 10 }}>Tracking</div>
            </div>
          </div>
        )}
        {collapsed && <Logo size={34} />}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: `${P[700]}60`, border: "none", color: P[300], cursor: "pointer", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${P[700]}40` }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg,${P[500]},${P[400]})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 15, marginBottom: 8 }}>
            {user.nombre[0].toUpperCase()}
          </div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{user.nombre}</div>
          <div style={{ color: P[400], fontSize: 11, marginTop: 2 }}>{ROLES[user.rol] || user.rol}</div>
        </div>
      )}

      <nav style={{ flex: 1, padding: "10px 0" }}>
        {items.map(([t, icon, label]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            width: "100%", padding: collapsed ? "11px" : "11px 16px",
            background: activeTab === t ? `${P[600]}60` : "none",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            color: activeTab === t ? "#fff" : P[400],
            fontWeight: activeTab === t ? 700 : 500,
            fontSize: 13, fontFamily: "inherit",
            borderLeft: activeTab === t ? `3px solid ${P[300]}` : "3px solid transparent",
            justifyContent: collapsed ? "center" : "flex-start",
            transition: "all .15s",
          }}>
            <span style={{ fontSize: 17 }}>{icon}</span>
            {!collapsed && label}
          </button>
        ))}
      </nav>

      <button onClick={onLogout} style={{ padding: collapsed ? "12px" : "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#f87171", fontSize: 13, fontFamily: "inherit", fontWeight: 600, borderTop: `1px solid ${P[700]}40`, justifyContent: collapsed ? "center" : "flex-start" }}>
        <span>🚪</span>{!collapsed && "Cerrar Sesión"}
      </button>
    </div>
  );
}
