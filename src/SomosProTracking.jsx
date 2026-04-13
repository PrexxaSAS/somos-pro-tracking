
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

function Logo({ size = 40 }) {
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

const CIUDADES = [
  { code: "11001", name: "Bogotá D.C." },
  { code: "05001", name: "Medellín" },
  { code: "76001", name: "Cali" },
  { code: "08001", name: "Barranquilla" },
  { code: "13001", name: "Cartagena" },
  { code: "68001", name: "Bucaramanga" },
  { code: "17001", name: "Manizales" },
  { code: "63001", name: "Armenia" },
  { code: "66001", name: "Pereira" },
  { code: "54001", name: "Cúcuta" },
  { code: "73001", name: "Ibagué" },
  { code: "52001", name: "Pasto" },
  { code: "23001", name: "Montería" },
  { code: "41001", name: "Neiva" },
  { code: "50001", name: "Villavicencio" },
  { code: "15001", name: "Tunja" },
  { code: "20001", name: "Valledupar" },
  { code: "19001", name: "Popayán" },
  { code: "18001", name: "Florencia" },
  { code: "44001", name: "Riohacha" },
  { code: "70001", name: "Sincelejo" },
  { code: "86001", name: "Mocoa" },
  { code: "91001", name: "Leticia" },
  { code: "27001", name: "Quibdó" },
  { code: "94001", name: "Inírida" },
];

const PAQUETERIAS = [
  "Servientrega","Coordinadora","Deprisa","TCC","Envia",
  "Interrapidísimo","FedEx","DHL","Laar","Saferbo","Otra",
];

const ESTADOS = {
  sin_asignar: { label: "Sin Asignar",  color: "#64748b", bg: "#f1f5f9", icon: "○" },
  pendiente:   { label: "Pendiente",    color: "#d97706", bg: "#fffbeb", icon: "◐" },
  en_transito: { label: "En Tránsito",  color: P[600],    bg: P[50],    icon: "▶" },
  paqueteria:  { label: "Paquetería",   color: "#0891b2", bg: "#ecfeff", icon: "📦" },
  entregado:   { label: "Entregado",    color: "#059669", bg: "#ecfdf5", icon: "✓" },
  novedad:     { label: "Con Novedad",  color: "#dc2626", bg: "#fef2f2", icon: "!" },
};

const ROLES_LABEL = {
  admin: "Administrador",
  operador: "Operador",
  transportista: "Empresa Transportista",
  conductor: "Conductor",
  cliente: "Cliente Interno",
};

const DEMO_USERS = [
  { id: 1, name: "Carlos Mendoza",          email: "admin@empresa.com",     password: "admin123",  role: "admin" },
  { id: 2, name: "Laura Gómez",             email: "operador@empresa.com",  password: "op123",     role: "operador" },
  { id: 3, name: "Transportes Veloz S.A.S", email: "veloz@transporte.com",  password: "trans123",  role: "transportista", nit: "900123456-1", empresa: "Transportes Veloz S.A.S" },
  { id: 4, name: "Juan Pérez",              email: "conductor@veloz.com",   password: "cond123",   role: "conductor", placa: "ABC-123", nit_proveedor: "900123456-1", empresa: "Transportes Veloz S.A.S" },
  { id: 5, name: "Almacén Central",         email: "cliente@empresa.com",   password: "cli123",    role: "cliente" },
];

// También acepta el login del admin real que ya tenías configurado
const ADMIN_REAL = { id: 99, name: "Administrador", email: "admin", password: "1039456779", role: "admin" };

const DEMO_CONDUCTORES = [
  { id: 4, name: "Juan Pérez", placa: "ABC-123", nit_proveedor: "900123456-1", empresa: "Transportes Veloz S.A.S", activo: true },
];

const DEMO_PEDIDOS = [
  { id: "PED-001", cliente: "Inversiones ABC S.A.S",      ciudad_codigo: "11001", ciudad_nombre: "Bogotá D.C.",   direccion: "Cra 15 #93-47 Apto 302", conductor_id: 4,    placa: "ABC-123", nit_proveedor: "900123456-1", estado: "en_transito", fecha_creacion: "2026-04-10", fecha_entrega_estimada: "2026-04-12", fecha_entrega_real: null, soportes: [],             notas: "Frágil",             tipo: "propio",    paqueteria: null,        guia_paqueteria: null },
  { id: "PED-002", cliente: "Distribuidora del Sur Ltda",  ciudad_codigo: "76001", ciudad_nombre: "Cali",          direccion: "Av. 6N #23-10",          conductor_id: 4,    placa: "ABC-123", nit_proveedor: "900123456-1", estado: "pendiente",   fecha_creacion: "2026-04-11", fecha_entrega_estimada: "2026-04-14", fecha_entrega_real: null, soportes: [],             notas: "",                   tipo: "propio",    paqueteria: null,        guia_paqueteria: null },
  { id: "PED-003", cliente: "Tech Solutions Colombia",     ciudad_codigo: "05001", ciudad_nombre: "Medellín",      direccion: "El Poblado, Cra 43A #18", conductor_id: null, placa: null,      nit_proveedor: null,         estado: "sin_asignar", fecha_creacion: "2026-04-12", fecha_entrega_estimada: "2026-04-16", fecha_entrega_real: null, soportes: [],             notas: "",                   tipo: "propio",    paqueteria: null,        guia_paqueteria: null },
  { id: "PED-004", cliente: "Ferretería El Tornillo",      ciudad_codigo: "68001", ciudad_nombre: "Bucaramanga",   direccion: "Calle 35 #28-16",        conductor_id: null, placa: null,      nit_proveedor: null,         estado: "paqueteria",  fecha_creacion: "2026-04-09", fecha_entrega_estimada: "2026-04-13", fecha_entrega_real: null, soportes: [],             notas: "",                   tipo: "paqueteria", paqueteria: "Servientrega", guia_paqueteria: "SRV-2026-88741" },
  { id: "PED-005", cliente: "Papelería y Más S.A.S",       ciudad_codigo: "08001", ciudad_nombre: "Barranquilla",  direccion: "Vía 40 #73-25 Bodega 8", conductor_id: 4,    placa: "ABC-123", nit_proveedor: "900123456-1", estado: "entregado",   fecha_creacion: "2026-04-07", fecha_entrega_estimada: "2026-04-09", fecha_entrega_real: "2026-04-09", soportes: ["firma_receptor.jpg"], notas: "Entregado al portero", tipo: "propio", paqueteria: null, guia_paqueteria: null },
];

const inputStyle = {
  border: `1.5px solid ${P[200]}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#fafafa",
  width: "100%",
  boxSizing: "border-box",
};

//  COMPONENTES BASE

function Badge({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.sin_asignar;
  return (
    <span style={{
      background: e.bg, color: e.color,
      border: `1px solid ${e.color}40`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {e.icon} {e.label}
    </span>
  );
}

function Card({ children, style = {} }) {
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

function Btn({ children, onClick, variant = "primary", size = "md", style = {}, disabled = false, type = "button" }) {
  const sz = {
    sm: { padding: "6px 14px", fontSize: 12 },
    md: { padding: "10px 20px", fontSize: 14 },
    lg: { padding: "14px 28px", fontSize: 16 },
  };
  const vr = {
    primary:   { background: `linear-gradient(135deg,${P[700]},${P[600]})`, color: "#fff", boxShadow: `0 4px 14px ${P[600]}40` },
    secondary: { background: P[50], color: P[700], border: `1px solid ${P[200]}` },
    success:   { background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff" },
    danger:    { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
    ghost:     { background: "transparent", color: "#64748b" },
    dark:      { background: P[900], color: "#fff" },
  };
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 10, fontWeight: 700, fontFamily: "inherit",
        transition: "all .15s", display: "inline-flex",
        alignItems: "center", gap: 6,
        opacity: disabled ? 0.5 : 1,
        ...sz[size], ...vr[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", required, as = "input", options = [], style = {}, readOnly = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: P[700], textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
        </label>
      )}
      {as === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle} disabled={readOnly}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={3} style={{ ...inputStyle, resize: "vertical" }} readOnly={readOnly} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={{ ...inputStyle, background: readOnly ? "#f8f9fa" : "#fafafa" }} readOnly={readOnly} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }) {
  // Cierra al hacer clic en el fondo oscuro
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "#00000085",
        zIndex: 1000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, padding: 28,
        width: "100%", maxWidth: wide ? 760 : 560,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 64px #0004",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: P[800], fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{
            border: "none", background: P[50], cursor: "pointer",
            fontSize: 18, color: P[600], width: 32, height: 32,
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const clr = { success: "#059669", error: "#dc2626", info: P[600] };
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      background: clr[type] || P[700], color: "#fff",
      padding: "14px 22px", borderRadius: 14, fontWeight: 700,
      fontSize: 14, zIndex: 9999, boxShadow: "0 8px 32px #0004",
      maxWidth: 340, lineHeight: 1.5, animation: "fadein .3s",
    }}>
      {msg}
    </div>
  );
}

//  MAPA GOOGLE MAPS (iframe embed)
function MapaRastreo({ pedido, conductor }) {
  const [lat, setLat]       = useState(conductor?.lat || 4.7110);
  const [lng, setLng]       = useState(conductor?.lng || -74.0721);
  const [moving, setMoving] = useState(false);
  const timerRef            = useRef(null);

  const ciudad = CIUDADES.find(c => c.code === pedido?.ciudad_codigo);
  const destQ  = encodeURIComponent(`${pedido?.direccion || ""}, ${ciudad?.name || ""}, Colombia`);
  const mapUrl = `https://maps.google.com/maps?q=${destQ}&output=embed&z=14`;

  const startSim = () => {
    setMoving(true);
    timerRef.current = setInterval(() => {
      setLat(l => l + (Math.random() - 0.5) * 0.003);
      setLng(l => l + (Math.random() - 0.5) * 0.003);
    }, 2500);
  };
  const stopSim = () => {
    setMoving(false);
    clearInterval(timerRef.current);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div>
      {/* Barra de coordenadas */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, background: P[50], borderRadius: 10, padding: "9px 14px", fontSize: 13 }}>
          <span style={{ color: P[700], fontWeight: 700 }}>📍 Conductor: </span>
          <span style={{ color: "#64748b" }}>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          {moving && <span style={{ marginLeft: 10, color: "#059669", fontWeight: 700, fontSize: 11 }}>● EN MOVIMIENTO</span>}
        </div>
        <Btn size="sm" variant={moving ? "danger" : "success"} onClick={moving ? stopSim : startSim}>
          {moving ? "⏸ Detener" : "▶ Simular GPS"}
        </Btn>
      </div>

      {/* Iframe mapa */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: `2px solid ${P[200]}` }}>
        <iframe
          title="mapa-pedido"
          width="100%" height="300"
          style={{ border: "none", display: "block" }}
          src={mapUrl}
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Nota API Key */}
      <div style={{ marginTop: 10, background: "#fffbeb", borderRadius: 10, padding: "9px 14px", fontSize: 12, color: "#92400e" }}>
        ⚙️ <strong>Para rastreo GPS real:</strong> Añade tu Google Maps API Key en el código y activa la API "Maps Embed" en Google Cloud Console (tiene capa gratuita generosa).
      </div>

      {pedido && (
        <div style={{ marginTop: 8, background: "#f0fdf4", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "#166534" }}>
          🎯 <strong>Destino:</strong> {pedido.direccion}, {ciudad?.name} — DANE: <strong>{pedido.ciudad_codigo}</strong>
        </div>
      )}
    </div>
  );
}

//  GUÍA IMPRIMIBLE
function GuiaImprimible({ pedido, conductores, onClose }) {
  const cond   = conductores.find(c => c.id === pedido.conductor_id);
  const ciudad = CIUDADES.find(c => c.code === pedido.ciudad_codigo);
  const fecha  = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Modal title={`Guía de Entrega — ${pedido.id}`} onClose={onClose} wide>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</Btn>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
      </div>

      <div id="guia-print" style={{ border: `2px solid ${P[200]}`, borderRadius: 12, padding: 28 }}>
        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, marginBottom: 20, borderBottom: `3px solid ${P[600]}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo size={64} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: P[800] }}>SOMOS PRO TRACKING</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Sistema de Gestión de Transporte</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: P[600], color: "#fff", borderRadius: 10, padding: "8px 18px", fontSize: 20, fontWeight: 900 }}>
              {pedido.id}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Fecha: {fecha}</div>
          </div>
        </div>

        {/* Tipo de envío */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Badge estado={pedido.estado} />
          {pedido.tipo === "paqueteria" && (
            <span style={{ background: "#ecfeff", color: "#0891b2", border: "1px solid #67e8f9", borderRadius: 8, padding: "4px 14px", fontWeight: 700, fontSize: 13 }}>
              📦 Paquetería: {pedido.paqueteria}
            </span>
          )}
        </div>

        {/* Datos principales */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Destinatario */}
          <div style={{ background: P[50], borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P[700], textTransform: "uppercase", marginBottom: 10, letterSpacing: 1 }}>
              📦 Destinatario
            </div>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Cliente:", pedido.cliente],
                  ["Dirección:", pedido.direccion],
                  ["Ciudad:", ciudad?.name || "—"],
                  ["Código DANE:", pedido.ciudad_codigo],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 700, color: "#475569", paddingBottom: 6, paddingRight: 8, whiteSpace: "nowrap" }}>{k}</td>
                    <td style={{ color: "#1e293b" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transportista */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P[700], textTransform: "uppercase", marginBottom: 10, letterSpacing: 1 }}>
              🚚 Transportista
            </div>
            {pedido.tipo === "paqueteria" ? (
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <tbody>
                  {[["Empresa:", pedido.paqueteria], ["Guía N°:", pedido.guia_paqueteria]].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 700, paddingBottom: 6, paddingRight: 8 }}>{k}</td>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, color: P[700] }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Conductor:", cond?.name || "Por asignar"],
                    ["Placa:", pedido.placa || "—"],
                    ["Empresa:", cond?.empresa || "—"],
                    ["NIT:", pedido.nit_proveedor || "—"],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 700, paddingBottom: 6, paddingRight: 8, whiteSpace: "nowrap" }}>{k}</td>
                      <td style={{ fontFamily: "monospace" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fechas */}
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 20, display: "flex", gap: 32, fontSize: 13, flexWrap: "wrap" }}>
          <span><strong>Fecha estimada:</strong> {pedido.fecha_entrega_estimada || "—"}</span>
          <span><strong>Fecha real de entrega:</strong> {pedido.fecha_entrega_real || "Pendiente"}</span>
        </div>

        {/* Notas */}
        {pedido.notas && (
          <div style={{ background: "#fffbeb", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 13, color: "#92400e" }}>
            📝 <strong>Notas:</strong> {pedido.notas}
          </div>
        )}

        {/* Soportes */}
        {pedido.soportes?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: P[700], marginBottom: 6, fontSize: 13 }}>📎 Soportes registrados:</div>
            {pedido.soportes.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "#64748b" }}>• {s}</div>
            ))}
          </div>
        )}

        {/* Firmas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 28 }}>
          {["Despachado por", "Recibido por", "Conductor"].map(f => (
            <div key={f} style={{ textAlign: "center" }}>
              <div style={{ height: 52, borderBottom: "2px solid #cbd5e1", marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{f}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Firma / Cédula / Fecha</div>
            </div>
          ))}
        </div>

        {/* Pie */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Generado por Somos PRO Tracking · {fecha}</div>
          <div style={{ width: 56, height: 56, border: "2px solid #cbd5e1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
            QR<br/>Pedido
          </div>
        </div>
      </div>

      {/* CSS para imprimir */}
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #guia-print, #guia-print * { visibility: visible !important; }
          #guia-print { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
        }
      `}</style>
    </Modal>
  );
}

//  MODAL DETALLE PEDIDO (compartido por varios roles)
function ModalDetalle({ pedido, conductores, onClose, setPedidos, showToast, canEdit }) {
  const [estado,     setEstado]     = useState(pedido.estado);
  const [condId,     setCondId]     = useState(pedido.conductor_id?.toString() || "");
  const [fechaReal,  setFechaReal]  = useState(pedido.fecha_entrega_real || "");
  const [soporte,    setSoporte]    = useState("");
  const [verMapa,    setVerMapa]    = useState(false);
  const [modGuia,    setModGuia]    = useState(false);

  const cond = conductores.find(c => c.id === parseInt(condId || pedido.conductor_id));

  const guardar = () => {
    const c = conductores.find(c => c.id === parseInt(condId));
    setPedidos(prev => prev.map(p =>
      p.id === pedido.id
        ? { ...p, estado, conductor_id: c?.id || null, placa: c?.placa || null, nit_proveedor: c?.nit_proveedor || null, fecha_entrega_real: fechaReal || null }
        : p
    ));
    showToast("✓ Cambios guardados correctamente", "success");
    onClose();
  };

  const subirSoporte = () => {
    if (!soporte.trim()) { showToast("Escribe el nombre del soporte", "error"); return; }
    setPedidos(prev => prev.map(p =>
      p.id === pedido.id ? { ...p, soportes: [...(p.soportes || []), soporte.trim()] } : p
    ));
    setSoporte("");
    showToast("📎 Soporte registrado", "success");
  };

  return (
    <Modal title={`Pedido ${pedido.id}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Info cliente */}
        <div style={{ background: P[50], borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: P[800], marginBottom: 10 }}>{pedido.cliente}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8, fontSize: 13, color: "#64748b" }}>
            <span>📍 {pedido.direccion}</span>
            <span>🏙️ {pedido.ciudad_nombre} <span style={{ fontFamily: "monospace", color: P[500], fontSize: 11 }}>({pedido.ciudad_codigo})</span></span>
            <span>📅 Estimado: {pedido.fecha_entrega_estimada || "—"}</span>
            <span>✅ Entrega real: {pedido.fecha_entrega_real || "Pendiente"}</span>
          </div>
          {pedido.notas && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>📝 {pedido.notas}</p>}
        </div>

        {/* Paquetería */}
        {pedido.tipo === "paqueteria" && (
          <div style={{ background: "#ecfeff", borderRadius: 10, padding: 14, border: "1px solid #67e8f9", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "#0891b2" }}>📦 {pedido.paqueteria}</span>
            <span style={{ color: "#0e7490" }}>Guía: <strong style={{ fontFamily: "monospace" }}>{pedido.guia_paqueteria}</strong></span>
          </div>
        )}

        {/* Estado + conductor (solo editable para admin/operador) */}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Estado" value={estado} onChange={setEstado} as="select"
              options={Object.entries(ESTADOS).map(([k, v]) => ({ value: k, label: v.label }))} />
            {pedido.tipo !== "paqueteria" && (
              <Field label="Conductor" value={condId} onChange={setCondId} as="select"
                options={[{ value: "", label: "— Sin asignar —" }, ...conductores.map(c => ({ value: c.id.toString(), label: `${c.name} · ${c.placa}` }))]} />
            )}
          </div>
        )}

        {/* Conductor actual (solo lectura para conductor/cliente) */}
        {!canEdit && cond && (
          <div style={{ background: "#eff6ff", borderRadius: 10, padding: 12 }}>
            <span style={{ fontSize: 13, color: "#1e40af" }}>🚗 <strong>{cond.name}</strong> — Placa: <strong>{pedido.placa}</strong></span>
          </div>
        )}

        {/* Fecha real */}
        <Field label="Fecha de Entrega Real" value={fechaReal} onChange={setFechaReal} type="date" />

        {/* Mapa */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: P[800] }}>🗺️ Rastreo / Ubicación de Entrega</span>
            <Btn size="sm" variant={verMapa ? "danger" : "secondary"} onClick={() => setVerMapa(!verMapa)}>
              {verMapa ? "Ocultar Mapa" : "Ver Mapa"}
            </Btn>
          </div>
          {verMapa && <MapaRastreo pedido={pedido} conductor={cond} />}
        </div>

        {/* Soportes */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: P[800], marginBottom: 10 }}>📎 Soportes de Entrega (fotos / documentos)</div>
          {pedido.soportes?.length === 0
            ? <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>Sin soportes cargados aún.</p>
            : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {pedido.soportes.map((s, i) => (
                  <div key={i} style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#15803d", display: "flex", gap: 6, alignItems: "center" }}>
                    📷 {s}
                    <button
                      onClick={() => showToast(`Descargando: ${s}`, "info")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d", fontSize: 14, padding: 0 }}
                    >⬇</button>
                  </div>
                ))}
              </div>
            )
          }
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={soporte}
              onChange={e => setSoporte(e.target.value)}
              placeholder="Nombre del soporte, ej: firma_cliente.jpg"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === "Enter" && subirSoporte()}
            />
            <Btn variant="success" size="sm" onClick={subirSoporte}>📎 Cargar</Btn>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 0" }}>
            En la versión con Supabase Storage, el conductor sube fotos directamente desde la cámara de su celular.
          </p>
        </div>

        {/* Guía imprimible */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Btn variant="secondary" size="sm" onClick={() => setModGuia(true)}>🖨️ Ver Guía / Planilla</Btn>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
            {canEdit && <Btn onClick={guardar}>💾 Guardar Cambios</Btn>}
          </div>
        </div>
      </div>

      {modGuia && <GuiaImprimible pedido={pedido} conductores={conductores} onClose={() => setModGuia(false)} />}
    </Modal>
  );
}

//  MODAL CSV
function ModalCSV({ onClose, onImportar }) {
  const [txt,  setTxt]  = useState("");
  const [prev, setPrev] = useState([]);
  const [err,  setErr]  = useState("");

  const plantilla = `id,cliente,codigo_dane,ciudad,direccion,fecha_entrega,tipo,paqueteria,guia_paqueteria,notas
PED-010,Empresa Ejemplo S.A.S,11001,Bogotá D.C.,Cra 10 #20-30 Of 201,2026-05-10,propio,,,Fragil
PED-011,Comercio del Norte Ltda,05001,Medellín,Av El Poblado 43A-15,2026-05-12,paqueteria,Servientrega,SRV-2026-12345,`;

  const parsear = (texto) => {
    const lineas = texto.trim().split("\n").filter(l => l.trim());
    if (lineas.length < 2) throw new Error("El archivo debe tener encabezado y al menos una fila de datos.");
    const hdrs = lineas[0].split(",").map(h => h.trim().toLowerCase().replace(/ /g, "_"));
    return lineas.slice(1).map((l, idx) => {
      const cols = l.split(",").map(c => c.trim());
      const obj  = {};
      hdrs.forEach((h, i) => { obj[h] = cols[i] || ""; });
      const ciudad = CIUDADES.find(c => c.code === obj.codigo_dane || c.name.toLowerCase() === (obj.ciudad || "").toLowerCase());
      const esPaq  = obj.tipo === "paqueteria";
      return {
        id:                   obj.id || `IMP-${Date.now()}-${idx}`,
        cliente:              obj.cliente || "Sin nombre",
        ciudad_codigo:        ciudad?.code || obj.codigo_dane || "",
        ciudad_nombre:        ciudad?.name || obj.ciudad || "",
        direccion:            obj.direccion || "",
        fecha_entrega_estimada: obj.fecha_entrega || obj.fecha || "",
        notas:                obj.notas || "",
        tipo:                 esPaq ? "paqueteria" : "propio",
        paqueteria:           esPaq ? (obj.paqueteria || null) : null,
        guia_paqueteria:      esPaq ? (obj.guia_paqueteria || null) : null,
        conductor_id: null, placa: null, nit_proveedor: null,
        estado:               esPaq ? "paqueteria" : "sin_asignar",
        fecha_creacion:       new Date().toISOString().split("T")[0],
        fecha_entrega_real:   null,
        soportes:             [],
      };
    });
  };

  const previsualizar = () => {
    setErr("");
    try {
      const rows = parsear(txt);
      setPrev(rows);
    } catch (e) {
      setErr(e.message);
      setPrev([]);
    }
  };

  return (
    <Modal title="Importar Pedidos desde Archivo CSV" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#fffbeb", borderRadius: 10, padding: 12, fontSize: 13, color: "#92400e" }}>
          <strong>📄 Columnas esperadas:</strong> id, cliente, codigo_dane, ciudad, direccion, fecha_entrega, tipo (propio / paqueteria), paqueteria, guia_paqueteria, notas
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: P[700], margin: "0 0 6px" }}>PLANTILLA DE EJEMPLO:</p>
          <pre style={{ background: P[50], borderRadius: 8, padding: 12, fontSize: 11, color: "#334155", overflow: "auto", margin: 0, border: `1px solid ${P[200]}` }}>{plantilla}</pre>
          <Btn size="sm" variant="secondary" style={{ marginTop: 8 }} onClick={() => setTxt(plantilla)}>📋 Usar esta plantilla</Btn>
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: P[700], margin: "0 0 6px" }}>PEGA EL CONTENIDO DE TU ARCHIVO CSV:</p>
          <textarea
            value={txt}
            onChange={e => setTxt(e.target.value)}
            rows={6}
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder="id,cliente,codigo_dane,..."
          />
        </div>

        {err && <p style={{ color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, fontSize: 13, margin: 0 }}>⚠️ {err}</p>}

        <Btn variant="secondary" onClick={previsualizar}>👁 Previsualizar ({txt.trim().split("\n").length - 1} fila(s))</Btn>

        {prev.length > 0 && (
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, border: "1px solid #86efac" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#15803d", fontSize: 13 }}>✓ {prev.length} pedido(s) listos para importar:</p>
            {prev.map(p => (
              <div key={p.id} style={{ fontSize: 12, color: "#334155" }}>
                • <strong>{p.id}</strong> — {p.cliente} → {p.ciudad_nombre || p.ciudad_codigo}
                {p.tipo === "paqueteria" && <span style={{ color: "#0891b2", marginLeft: 6 }}>📦 {p.paqueteria}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={prev.length === 0} onClick={() => onImportar(prev)}>
            📥 Importar {prev.length > 0 ? `(${prev.length})` : ""}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

//  SIDEBAR
function Sidebar({ user, activeTab, setActiveTab, onLogout, collapsed, setCollapsed }) {
  const menus = {
    admin:        [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"],["transportistas","🏢","Transportistas"],["usuarios","👥","Usuarios"]],
    operador:     [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"]],
    transportista:[["mi_empresa","🏢","Mi Empresa"],["mis_conductores","🚗","Mis Conductores"]],
    conductor:    [["mis_pedidos","📦","Mis Pedidos"],["mi_ubicacion","📍","Mi Ubicación GPS"]],
    cliente:      [["mis_pedidos_cliente","📦","Estado de Pedidos"]],
  };
  const items = menus[user.role] || [];

  return (
    <div style={{
      width: collapsed ? 60 : 228,
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${P[950]} 0%, ${P[800]} 100%)`,
      display: "flex", flexDirection: "column",
      transition: "width .25s", flexShrink: 0,
    }}>
      {/* Logo + toggle */}
      <div style={{ padding: collapsed ? "16px 10px" : "18px 16px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", borderBottom: `1px solid ${P[700]}50` }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={34} />
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, lineHeight: 1.1 }}>Somos PRO</div>
              <div style={{ color: P[400], fontSize: 10 }}>Tracking</div>
            </div>
          </div>
        )}
        {collapsed && <Logo size={36} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: `${P[700]}60`, border: "none", color: P[300], cursor: "pointer", fontSize: 14, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: collapsed ? 0 : 4 }}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Info usuario */}
      {!collapsed && (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${P[700]}40` }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg,${P[500]},${P[400]})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 15, marginBottom: 8 }}>
            {user.name[0].toUpperCase()}
          </div>
          <p style={{ color: "#fff", fontSize: 13, margin: 0, fontWeight: 700 }}>{user.name}</p>
          <p style={{ color: P[400], fontSize: 11, margin: "2px 0 0" }}>{ROLES_LABEL[user.role]}</p>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 0" }}>
        {items.map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            width: "100%", padding: collapsed ? "11px" : "11px 16px",
            background: activeTab === tab ? `${P[600]}60` : "none",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            color: activeTab === tab ? "#fff" : P[400],
            fontWeight: activeTab === tab ? 700 : 500,
            fontSize: 13, fontFamily: "inherit",
            borderLeft: activeTab === tab ? `3px solid ${P[300]}` : "3px solid transparent",
            justifyContent: collapsed ? "center" : "flex-start",
            transition: "all .15s",
          }}>
            <span style={{ fontSize: 17 }}>{icon}</span>
            {!collapsed && label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button onClick={onLogout} style={{
        padding: collapsed ? "12px" : "12px 16px",
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        color: "#f87171", fontSize: 13, fontFamily: "inherit", fontWeight: 600,
        borderTop: `1px solid ${P[700]}40`,
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        <span>🚪</span>{!collapsed && "Cerrar Sesión"}
      </button>
    </div>
  );
}

//  DASHBOARD
function Dashboard({ pedidos, conductores }) {
  const stats = [
    { l: "Total Pedidos",  v: pedidos.length,                                        c: P[600],    i: "📦" },
    { l: "Sin Asignar",    v: pedidos.filter(p => p.estado === "sin_asignar").length, c: "#64748b", i: "○" },
    { l: "En Tránsito",    v: pedidos.filter(p => p.estado === "en_transito").length, c: P[600],    i: "▶" },
    { l: "Paquetería",     v: pedidos.filter(p => p.tipo === "paqueteria").length,    c: "#0891b2", i: "📦" },
    { l: "Entregados",     v: pedidos.filter(p => p.estado === "entregado").length,   c: "#059669", i: "✓" },
    { l: "Con Novedad",    v: pedidos.filter(p => p.estado === "novedad").length,     c: "#dc2626", i: "!" },
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", color: P[800], fontWeight: 900, fontSize: 22 }}>📊 Dashboard</h2>

      {/* Tarjetas resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 14, marginBottom: 30 }}>
        {stats.map(s => (
          <Card key={s.l} style={{ textAlign: "center", padding: 18, borderTop: `3px solid ${s.c}` }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{s.i}</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 5 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Tabla reciente */}
      <h3 style={{ color: P[800], marginBottom: 14, fontWeight: 800 }}>Pedidos Recientes</h3>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: P[50] }}>
                {["N° Pedido","Cliente","Ciudad / DANE","Estado","Conductor / Guía","Fecha Est."].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: P[700], fontSize: 11, whiteSpace: "nowrap", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 8).map((p, i) => {
                const cond = conductores.find(c => c.id === p.conductor_id);
                return (
                  <tr key={p.id} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 800, color: P[700] }}>{p.id}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontSize: 13, color: "#334155" }}>{p.ciudad_nombre}</div>
                      <div style={{ fontFamily: "monospace", color: P[500], fontSize: 10 }}>{p.ciudad_codigo}</div>
                    </td>
                    <td style={{ padding: "11px 14px" }}><Badge estado={p.estado} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#64748b" }}>
                      {p.tipo === "paqueteria"
                        ? <span style={{ color: "#0891b2" }}>📦 {p.paqueteria} — {p.guia_paqueteria}</span>
                        : cond ? `${cond.name} · ${p.placa}` : <span style={{ color: "#ef4444" }}>Sin asignar</span>
                      }
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>{p.fecha_entrega_estimada || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

//  PEDIDOS (Admin / Operador)
function Pedidos({ pedidos, setPedidos, conductores, showToast }) {
  const [filtro,      setFiltro]      = useState("todos");
  const [busq,        setBusq]        = useState("");
  const [modNuevo,    setModNuevo]    = useState(false);
  const [modDetalle,  setModDetalle]  = useState(null);
  const [modGuia,     setModGuia]     = useState(null);
  const [modCSV,      setModCSV]      = useState(false);

  const emptyForm = { id: "", cliente: "", ciudad_codigo: "", direccion: "", fecha_entrega_estimada: "", notas: "", conductor_id: "", tipo: "propio", paqueteria: "", guia_paqueteria: "" };
  const [form, setForm] = useState(emptyForm);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const filtrados = pedidos.filter(p => {
    const okF = filtro === "todos" || p.estado === filtro || (filtro === "paqueteria" && p.tipo === "paqueteria");
    const q   = busq.toLowerCase();
    const okB = !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
    return okF && okB;
  });

  const guardar = () => {
    if (!form.id.trim() || !form.cliente.trim() || !form.ciudad_codigo) {
      showToast("N° Pedido, Cliente y Ciudad son obligatorios", "error");
      return;
    }
    if (pedidos.find(p => p.id === form.id.trim())) {
      showToast("Ya existe un pedido con ese número", "error");
      return;
    }
    const ciudad = CIUDADES.find(c => c.code === form.ciudad_codigo);
    const cond   = conductores.find(c => c.id === parseInt(form.conductor_id));
    const esPaq  = form.tipo === "paqueteria";
    const nuevo = {
      id:                     form.id.trim(),
      cliente:                form.cliente.trim(),
      ciudad_codigo:          form.ciudad_codigo,
      ciudad_nombre:          ciudad?.name || "",
      direccion:              form.direccion.trim(),
      fecha_entrega_estimada: form.fecha_entrega_estimada,
      notas:                  form.notas.trim(),
      tipo:                   form.tipo,
      paqueteria:             esPaq ? form.paqueteria : null,
      guia_paqueteria:        esPaq ? form.guia_paqueteria.trim() : null,
      conductor_id:           cond ? cond.id : null,
      placa:                  cond ? cond.placa : null,
      nit_proveedor:          cond ? cond.nit_proveedor : null,
      estado:                 esPaq ? "paqueteria" : (cond ? "pendiente" : "sin_asignar"),
      fecha_creacion:         new Date().toISOString().split("T")[0],
      fecha_entrega_real:     null,
      soportes:               [],
    };
    setPedidos(prev => [nuevo, ...prev]);
    setModNuevo(false);
    setForm(emptyForm);
    showToast(`✓ Pedido ${nuevo.id} creado`, "success");
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, color: P[800], fontWeight: 900, fontSize: 22 }}>📦 Pedidos</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="secondary" size="sm" onClick={() => setModCSV(true)}>📤 Importar CSV</Btn>
          <Btn size="sm" onClick={() => setModNuevo(true)}>+ Nuevo Pedido</Btn>
        </div>
      </div>

      {/* Filtros */}
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={busq}
            onChange={e => setBusq(e.target.value)}
            placeholder="🔍 Buscar por N° pedido, cliente o ciudad..."
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="paqueteria_tipo">Solo Paquetería</option>
          </select>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Mostrando <strong>{filtrados.length}</strong> de <strong>{pedidos.length}</strong> pedidos
        </div>
      </Card>

      {/* Tabla */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: P[50] }}>
                {["N° Pedido","Cliente","Ciudad / DANE","Dirección","Estado","Conductor / Paquetería","Acciones"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: P[700], fontSize: 11, whiteSpace: "nowrap", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No hay pedidos que coincidan con los filtros</td></tr>
              )}
              {filtrados.map((p, i) => {
                const cond = conductores.find(c => c.id === p.conductor_id);
                return (
                  <tr key={p.id} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 800, color: P[700] }}>{p.id}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ color: "#334155" }}>{p.ciudad_nombre}</div>
                      <div style={{ fontFamily: "monospace", color: P[500], fontSize: 10 }}>{p.ciudad_codigo}</div>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.direccion}</td>
                    <td style={{ padding: "11px 14px" }}><Badge estado={p.estado} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>
                      {p.tipo === "paqueteria"
                        ? <span style={{ color: "#0891b2" }}>📦 {p.paqueteria}<br/><span style={{ fontFamily: "monospace", fontSize: 11 }}>{p.guia_paqueteria}</span></span>
                        : cond
                          ? <span style={{ color: "#334155" }}>{cond.name}<br/><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{p.placa}</span></span>
                          : <span style={{ color: "#ef4444" }}>Sin asignar</span>
                      }
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn size="sm" variant="secondary" onClick={() => setModDetalle(p)}>Ver</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => setModGuia(p)} style={{ fontSize: 16, padding: "4px 8px" }}>🖨️</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nuevo Pedido */}
      {modNuevo && (
        <Modal title="Nuevo Pedido" onClose={() => setModNuevo(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="N° de Pedido" value={form.id} onChange={f("id")} required placeholder="PED-012" />
              <Field label="Fecha Entrega Estimada" value={form.fecha_entrega_estimada} onChange={f("fecha_entrega_estimada")} type="date" />
            </div>
            <Field label="Nombre del Cliente / Destinatario" value={form.cliente} onChange={f("cliente")} required placeholder="Empresa Destino S.A.S" />
            <Field
              label="Ciudad de Entrega (Código DANE)"
              value={form.ciudad_codigo}
              onChange={f("ciudad_codigo")}
              required as="select"
              options={[
                { value: "", label: "— Seleccione ciudad —" },
                ...CIUDADES.map(c => ({ value: c.code, label: `${c.name} — ${c.code}` })),
              ]}
            />
            <Field label="Dirección de Entrega" value={form.direccion} onChange={f("direccion")} placeholder="Cra 15 #93-47 Apto 302" />

            <Field label="Tipo de Envío" value={form.tipo} onChange={f("tipo")} as="select"
              options={[
                { value: "propio",     label: "🚚 Transporte Propio" },
                { value: "paqueteria", label: "📦 Paquetería Tercero" },
              ]}
            />

            {form.tipo === "paqueteria" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Empresa Paquetería" value={form.paqueteria} onChange={f("paqueteria")} as="select"
                  options={[{ value: "", label: "— Seleccione —" }, ...PAQUETERIAS.map(p => ({ value: p, label: p }))]} />
                <Field label="N° Guía Paquetería" value={form.guia_paqueteria} onChange={f("guia_paqueteria")} placeholder="SRV-2026-XXXXX" />
              </div>
            ) : (
              <Field label="Asignar Conductor (opcional)" value={form.conductor_id} onChange={f("conductor_id")} as="select"
                options={[{ value: "", label: "— Sin asignar —" }, ...conductores.map(c => ({ value: c.id, label: `${c.name} · ${c.placa}` }))]} />
            )}

            <Field label="Notas / Observaciones" value={form.notas} onChange={f("notas")} as="textarea" placeholder="Información adicional, instrucciones especiales..." />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModNuevo(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Guardar Pedido</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modDetalle && <ModalDetalle pedido={modDetalle} conductores={conductores} onClose={() => setModDetalle(null)} setPedidos={setPedidos} showToast={showToast} canEdit={true} />}
      {modGuia    && <GuiaImprimible pedido={modGuia} conductores={conductores} onClose={() => setModGuia(null)} />}
      {modCSV     && (
        <ModalCSV
          onClose={() => setModCSV(false)}
          onImportar={rows => {
            setPedidos(prev => [...rows, ...prev]);
            setModCSV(false);
            showToast(`✓ ${rows.length} pedido(s) importados`, "success");
          }}
        />
      )}
    </div>
  );
}

//  RASTREO GPS (pantalla dedicada)
function RastreoGPS({ pedidos, conductores }) {
  const enTransito = pedidos.filter(p => p.conductor_id);
  const [sel, setSel] = useState(enTransito[0] || null);
  const cond = conductores.find(c => c.id === sel?.conductor_id);

  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900, fontSize: 22 }}>🗺️ Rastreo GPS en Tiempo Real</h2>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,300px) 1fr", gap: 20, alignItems: "start" }}>

        {/* Lista pedidos */}
        <Card style={{ padding: 14 }}>
          <p style={{ fontWeight: 700, color: P[700], fontSize: 11, textTransform: "uppercase", margin: "0 0 12px", letterSpacing: 1 }}>Pedidos con conductor</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
            {enTransito.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>No hay pedidos con conductor asignado.</p>}
            {enTransito.map(p => (
              <button key={p.id} onClick={() => setSel(p)} style={{
                width: "100%", padding: "10px 12px",
                background: sel?.id === p.id ? P[50] : "#fafafa",
                border: `1.5px solid ${sel?.id === p.id ? P[400] : "#e2e8f0"}`,
                borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}>
                <div style={{ fontWeight: 700, color: P[700], fontSize: 13 }}>{p.id}</div>
                <div style={{ fontSize: 12, color: "#64748b", margin: "2px 0" }}>{p.cliente}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.ciudad_nombre}</div>
                <div style={{ marginTop: 4 }}><Badge estado={p.estado} /></div>
              </button>
            ))}
          </div>
        </Card>

        {/* Mapa */}
        <Card>
          {sel ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 800, color: P[800], fontSize: 16 }}>{sel.id} — {sel.cliente}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>📍 {sel.direccion}, {sel.ciudad_nombre}</div>
                {cond && <div style={{ fontSize: 13, color: P[600], marginTop: 2 }}>🚗 {cond.name} · Placa: {sel.placa}</div>}
              </div>
              <MapaRastreo pedido={sel} conductor={cond} />
            </>
          ) : (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Selecciona un pedido de la lista para ver su mapa de entrega.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

//  CONDUCTORES
function Conductores({ conductores, setConductores, pedidos, showToast }) {
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ name: "", placa: "", nit_proveedor: "", empresa: "" });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const guardar = () => {
    if (!form.name.trim() || !form.placa.trim()) { showToast("Nombre y placa son obligatorios", "error"); return; }
    setConductores(prev => [...prev, { ...form, id: Date.now(), activo: true, lat: 4.711, lng: -74.072 }]);
    setModal(false);
    setForm({ name: "", placa: "", nit_proveedor: "", empresa: "" });
    showToast("✓ Conductor registrado", "success");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, color: P[800], fontWeight: 900, fontSize: 22 }}>🚗 Conductores</h2>
        <Btn onClick={() => setModal(true)}>+ Registrar Conductor</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {conductores.map(c => {
          const asig    = pedidos.filter(p => p.conductor_id === c.id).length;
          const transit = pedidos.filter(p => p.conductor_id === c.id && p.estado === "en_transito").length;
          return (
            <Card key={c.id} style={{ borderTop: `3px solid ${P[500]}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg,${P[700]},${P[500]})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>🚗</div>
                <div>
                  <div style={{ fontWeight: 800, color: P[800] }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Placa: <strong style={{ fontFamily: "monospace" }}>{c.placa}</strong></div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>🏢 {c.empresa || "—"}</span>
                <span>📋 NIT: {c.nit_proveedor || "—"}</span>
                <span>📦 Asignados: <strong>{asig}</strong> · En tránsito: <strong style={{ color: P[600] }}>{transit}</strong></span>
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ background: c.activo ? "#ecfdf5" : "#fef2f2", color: c.activo ? "#059669" : "#dc2626", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                  {c.activo ? "✓ Activo" : "✗ Inactivo"}
                </span>
              </div>
            </Card>
          );
        })}
        {conductores.length === 0 && <p style={{ color: "#94a3b8" }}>No hay conductores registrados aún.</p>}
      </div>

      {modal && (
        <Modal title="Registrar Conductor" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre completo" value={form.name} onChange={f("name")} required placeholder="Juan Pérez" />
            <Field label="Placa del vehículo" value={form.placa} onChange={f("placa")} required placeholder="ABC-123" />
            <Field label="NIT del proveedor de transporte" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1" />
            <Field label="Empresa de transporte" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ S.A.S" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Guardar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

//  TRANSPORTISTAS
function Transportistas({ conductores, setConductores, showToast, user, todosLos }) {
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ name: "", placa: "" });
  const esMiEmpresa = user.role === "transportista";
  const miNit       = user.nit || "";
  const misConds    = esMiEmpresa ? conductores.filter(c => c.nit_proveedor === miNit) : conductores;

  const inscribir = () => {
    if (!form.name.trim() || !form.placa.trim()) { showToast("Nombre y placa son obligatorios", "error"); return; }
    setConductores(prev => [...prev, { ...form, id: Date.now(), nit_proveedor: miNit, empresa: user.empresa || user.name, activo: true, lat: 4.711, lng: -74.072 }]);
    setModal(false);
    setForm({ name: "", placa: "" });
    showToast("✓ Conductor inscrito", "success");
  };

  return (
    <div>
      {esMiEmpresa && (
        <Card style={{ background: `linear-gradient(135deg,${P[950]},${P[700]})`, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo size={48} />
            <div>
              <h2 style={{ margin: 0, color: "#fff", fontWeight: 900 }}>{user.empresa || user.name}</h2>
              <p style={{ margin: "4px 0 0", color: P[300], fontSize: 13 }}>NIT: {miNit} · {misConds.filter(c => c.activo).length} conductor(es) activo(s)</p>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ margin: 0, color: P[800], fontWeight: 800 }}>{esMiEmpresa ? "Mis Conductores" : "Todos los Conductores"}</h3>
        {esMiEmpresa && <Btn onClick={() => setModal(true)}>+ Inscribir Conductor</Btn>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {misConds.map(c => (
          <Card key={c.id} style={{ borderLeft: `3px solid ${P[400]}` }}>
            <div style={{ fontWeight: 800, color: P[800] }}>🚗 {c.name}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Placa: <strong style={{ fontFamily: "monospace" }}>{c.placa}</strong></div>
            {!esMiEmpresa && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Empresa: {c.empresa}</div>}
            <span style={{ display: "inline-block", marginTop: 10, background: "#ecfdf5", color: "#059669", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              ✓ Activo
            </span>
          </Card>
        ))}
        {misConds.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>No hay conductores inscritos aún.</p>}
      </div>

      {modal && (
        <Modal title="Inscribir Conductor" onClose={() => setModal(false)}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
            Empresa: <strong>{user.empresa}</strong> · NIT: <strong>{miNit}</strong>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre completo del conductor" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
            <Field label="Placa del vehículo" value={form.placa} onChange={v => setForm(p => ({ ...p, placa: v }))} required placeholder="XYZ-456" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={inscribir}>Inscribir</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

//  VISTA CONDUCTOR (celular-first)
function VistaConductor({ pedidos, setPedidos, user, conductores, showToast }) {
  const [modalDet, setModalDet] = useState(null);
  const misPeds   = pedidos.filter(p => p.conductor_id === user.id);
  const pendCount = misPeds.filter(p => ["pendiente","en_transito"].includes(p.estado)).length;

  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg,${P[800]},${P[600]})`, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={44} />
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontWeight: 900 }}>👋 {user.name}</h2>
            <p style={{ margin: "3px 0 0", color: P[300], fontSize: 13 }}>
              Placa: {user.placa} · {pendCount} pedido(s) activo(s) de {misPeds.length} total
            </p>
          </div>
        </div>
      </Card>

      {misPeds.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p>No tienes pedidos asignados por el momento.</p>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {misPeds.map(p => (
          <Card key={p.id} style={{ cursor: "pointer", borderLeft: `4px solid ${ESTADOS[p.estado]?.color || "#ccc"}` }}
            onClick={() => setModalDet(p)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, color: P[700], fontSize: 18 }}>{p.id}</div>
              <Badge estado={p.estado} />
            </div>
            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 8, fontSize: 15 }}>{p.cliente}</div>
            <div style={{ fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
              <span>📍 {p.direccion}</span>
              <span>🏙️ {p.ciudad_nombre}</span>
              <span>📅 Entrega estimada: {p.fecha_entrega_estimada || "—"}</span>
              {p.soportes?.length > 0 && <span style={{ color: "#059669" }}>📎 {p.soportes.length} soporte(s) cargado(s)</span>}
            </div>
            <Btn size="sm" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} variant="secondary">
              Ver detalle / Cargar soporte →
            </Btn>
          </Card>
        ))}
      </div>

      {modalDet && (
        <ModalDetalle
          pedido={modalDet}
          conductores={conductores}
          onClose={() => setModalDet(null)}
          setPedidos={setPedidos}
          showToast={showToast}
          canEdit={false}
        />
      )}
    </div>
  );
}

//  MI UBICACIÓN (conductor, usa GPS del celular)
function MiUbicacion() {
  const [lat,      setLat]      = useState(null);
  const [lng,      setLng]      = useState(null);
  const [sharing,  setSharing]  = useState(false);
  const [watchId,  setWatchId]  = useState(null);
  const [errGPS,   setErrGPS]   = useState("");

  const iniciar = () => {
    setErrGPS("");
    if (!navigator.geolocation) { setErrGPS("Tu dispositivo no soporta GPS."); return; }
    const id = navigator.geolocation.watchPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setSharing(true); },
      err => { setErrGPS(`Error GPS: ${err.message}`); setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    setWatchId(id);
  };

  const detener = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setSharing(false);
    setWatchId(null);
  };

  useEffect(() => () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); }, [watchId]);

  const mapUrl = lat && lng
    ? `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=16`
    : `https://maps.google.com/maps?q=4.711,-74.072&output=embed&z=11`;

  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900, fontSize: 22 }}>📍 Mi Ubicación GPS</h2>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, fontSize: 14 }}>
            {lat && lng
              ? <><strong>Lat:</strong> {lat.toFixed(6)} · <strong>Lng:</strong> {lng.toFixed(6)}</>
              : <span style={{ color: "#94a3b8" }}>Presiona el botón para activar tu GPS</span>
            }
            {sharing && <span style={{ marginLeft: 12, color: "#059669", fontWeight: 700, fontSize: 12 }}>● Compartiendo</span>}
          </div>
          <Btn variant={sharing ? "danger" : "success"} onClick={sharing ? detener : iniciar}>
            {sharing ? "⏸ Detener GPS" : "▶ Activar GPS"}
          </Btn>
        </div>
        {errGPS && <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0 0" }}>⚠️ {errGPS}</p>}
      </Card>

      <div style={{ borderRadius: 14, overflow: "hidden", border: `2px solid ${P[200]}` }}>
        <iframe title="mi-ubicacion" src={mapUrl} width="100%" height="360" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" />
      </div>

      <Card style={{ marginTop: 14, background: P[50], border: `1px solid ${P[200]}` }}>
        <p style={{ margin: 0, fontSize: 13, color: P[800] }}>
          📱 <strong>Para el conductor:</strong> Al pulsar "Activar GPS", tu celular comparte tu ubicación. Mantén la app abierta durante la ruta para que el operador pueda verte en tiempo real.
        </p>
      </Card>
    </div>
  );
}

//  VISTA CLIENTE INTERNO
function VistaCliente({ pedidos, conductores, showToast }) {
  const [busq,     setBusq]     = useState("");
  const [modalDet, setModalDet] = useState(null);

  const filtrados = pedidos.filter(p => {
    const q = busq.toLowerCase();
    return !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900, fontSize: 22 }}>📦 Estado de Pedidos</h2>

      <Card style={{ padding: 14, marginBottom: 16 }}>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar por N° pedido, cliente o ciudad..."
          style={inputStyle}
        />
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.length === 0 && <p style={{ color: "#94a3b8", textAlign: "center", padding: 32 }}>No hay pedidos que coincidan.</p>}
        {filtrados.map(p => {
          const cond = conductores.find(c => c.id === p.conductor_id);
          return (
            <Card key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: 18 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900, color: P[700], fontSize: 16 }}>{p.id}</span>
                  <Badge estado={p.estado} />
                  {p.tipo === "paqueteria" && <span style={{ fontSize: 11, color: "#0891b2", fontWeight: 700 }}>📦 {p.paqueteria}</span>}
                </div>
                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>{p.cliente}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  🏙️ {p.ciudad_nombre} · 📍 {p.direccion}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {p.tipo === "paqueteria"
                    ? `Guía: ${p.guia_paqueteria}`
                    : cond ? `🚗 ${cond.name} · ${p.placa}` : "Sin conductor asignado"
                  }
                  {" · "}📅 {p.fecha_entrega_estimada || "—"}
                  {p.fecha_entrega_real && <span style={{ color: "#059669" }}> · ✅ {p.fecha_entrega_real}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.soportes?.length > 0 && (
                  <Btn size="sm" variant="success" onClick={() => showToast(`📎 Descargando ${p.soportes.length} soporte(s)…`, "info")}>
                    ⬇ Soportes ({p.soportes.length})
                  </Btn>
                )}
                <Btn size="sm" variant="secondary" onClick={() => setModalDet(p)}>Ver</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {modalDet && (
        <ModalDetalle pedido={modalDet} conductores={conductores} onClose={() => setModalDet(null)} setPedidos={() => {}} showToast={showToast} canEdit={false} />
      )}
    </div>
  );
}

//  USUARIOS (solo Admin)
function Usuarios() {
  const roleColors = { admin: P[600], operador: P[400], transportista: "#0891b2", conductor: "#059669", cliente: "#d97706" };
  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900, fontSize: 22 }}>👥 Usuarios del Sistema</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {[...DEMO_USERS, ADMIN_REAL].map(u => (
          <Card key={u.id} style={{ borderTop: `3px solid ${roleColors[u.role] || P[400]}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg,${roleColors[u.role]},${roleColors[u.role]}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>
                {u.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "#1e293b" }}>{u.name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>
              </div>
            </div>
            <span style={{ background: `${roleColors[u.role]}18`, color: roleColors[u.role], borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              {ROLES_LABEL[u.role]}
            </span>
            {u.nit && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>NIT: {u.nit}</p>}
          </Card>
        ))}
      </div>
      <Card style={{ marginTop: 20, background: "#fffbeb", border: "1px solid #fcd34d" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
          ⚙️ <strong>Nota:</strong> Para gestionar usuarios reales (crear, editar, desactivar) necesitas conectar Supabase Auth con este componente. Los datos de arriba son de demostración.
        </p>
      </Card>
    </div>
  );
}

//  LOGIN
function Login({ onLogin }) {
  const [email, setEmail]   = useState("");
  const [pass,  setPass]    = useState("");
  const [tipo,  setTipo]    = useState("");
  const [err,   setErr]     = useState("");

  // Acepta tanto login por email como por usuario+tipo (compatibilidad con tu código anterior)
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setErr("");

    // Login admin original (usuario "admin" + contraseña numérica)
    if (email === "admin" && pass === "1039456779") {
      onLogin(ADMIN_REAL);
      return;
    }

    // Login por email/password de los usuarios demo
    const u = DEMO_USERS.find(u => u.email === email && u.password === pass);
    if (u) { onLogin(u); return; }

    setErr("Correo/usuario o contraseña incorrectos. Verifica tus datos.");
  };

  const demos = [
    { l: "👑 Admin",       e: "admin@empresa.com",    p: "admin123" },
    { l: "⚙️ Operador",    e: "operador@empresa.com", p: "op123" },
    { l: "🏢 Transportista", e: "veloz@transporte.com", p: "trans123" },
    { l: "🚗 Conductor",   e: "conductor@veloz.com",  p: "cond123" },
    { l: "📦 Cliente",     e: "cliente@empresa.com",  p: "cli123" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${P[950]} 0%, ${P[700]} 55%, ${P[500]} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Decoración de fondo */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `radial-gradient(circle at 15% 85%, ${P[800]}60 0%, transparent 50%), radial-gradient(circle at 85% 15%, ${P[400]}30 0%, transparent 50%)`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Logo y título */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", marginBottom: 16, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.3))" }}>
            <Logo size={90} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: -0.5 }}>
            Somos PRO Tracking
          </h1>
          <p style={{ color: P[300], fontSize: 14, margin: 0 }}>Sistema de Gestión de Transporte</p>
        </div>

        <Card style={{ boxShadow: `0 28px 64px ${P[950]}80` }}>
          <h2 style={{ margin: "0 0 22px", fontSize: 18, color: P[800], fontWeight: 800 }}>Iniciar Sesión</h2>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Correo electrónico o usuario" value={email} onChange={setEmail} placeholder="usuario@empresa.com" />
            <Field label="Contraseña" value={pass} onChange={setPass} type="password" placeholder="••••••••" />

            {err && (
              <p style={{ color: "#dc2626", fontSize: 13, background: "#fef2f2", padding: "9px 12px", borderRadius: 8, margin: 0 }}>
                ⚠️ {err}
              </p>
            )}

            <Btn type="submit" size="lg" style={{ justifyContent: "center", marginTop: 4 }}>
              Entrar al Sistema →
            </Btn>
          </form>

          {/* Accesos demo */}
          <div style={{ marginTop: 22, borderTop: `1px solid ${P[100]}`, paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 700 }}>ACCESOS DE DEMOSTRACIÓN:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {demos.map(d => (
                <button
                  key={d.l}
                  type="button"
                  onClick={() => { setEmail(d.e); setPass(d.p); }}
                  style={{ border: `1px solid ${P[200]}`, background: P[50], borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: P[700], fontWeight: 700 }}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

//  COMPONENTE RAÍZ — SomosProTracking
export default function SomosProTracking() {
  const [user,       setUser]       = useState(null);
  const [tab,        setTab]        = useState("");
  const [pedidos,    setPedidos]    = useState(DEMO_PEDIDOS);
  const [conductores,setConductores]= useState(DEMO_CONDUCTORES);
  const [collapsed,  setCollapsed]  = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  const handleLogin = (u) => {
    setUser(u);
    const defaultTab = {
      admin:        "dashboard",
      operador:     "dashboard",
      transportista:"mi_empresa",
      conductor:    "mis_pedidos",
      cliente:      "mis_pedidos_cliente",
    };
    setTab(defaultTab[u.role] || "dashboard");
  };

  // Colapsar sidebar en móvil automáticamente
  useEffect(() => {
    const check = () => setCollapsed(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!user) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    const props = { pedidos, setPedidos, conductores, setConductores, showToast, user };
    switch (tab) {
      case "dashboard":         return <Dashboard pedidos={pedidos} conductores={conductores} />;
      case "pedidos":           return <Pedidos {...props} />;
      case "rastreo":           return <RastreoGPS pedidos={pedidos} conductores={conductores} />;
      case "conductores":       return <Conductores conductores={conductores} setConductores={setConductores} pedidos={pedidos} showToast={showToast} />;
      case "transportistas":    return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={{ role: "admin", name: "Admin" }} />;
      case "usuarios":          return <Usuarios />;
      case "mi_empresa":        return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={user} />;
      case "mis_conductores":   return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={user} />;
      case "mis_pedidos":       return <VistaConductor pedidos={pedidos} setPedidos={setPedidos} user={user} conductores={conductores} showToast={showToast} />;
      case "mi_ubicacion":      return <MiUbicacion />;
      case "mis_pedidos_cliente": return <VistaCliente pedidos={pedidos} conductores={conductores} showToast={showToast} />;
      default:                  return <Dashboard pedidos={pedidos} conductores={conductores} />;
    }
  };

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
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
