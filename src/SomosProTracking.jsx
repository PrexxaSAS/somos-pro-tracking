import { useState } from "react";

// URL de tu logo (asumiendo que está en la raíz de tu proyecto o accesible vía URL)
// Si la imagen está en tu proyecto, la ruta sería '/image_3.png'
const URL_LOGO = "https://raw.githubusercontent.com/PrexxaSAS/somos-pro-tracking/main/image_3.png"; 

export default function SomosProTracking() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("admin"); // Administrador por defecto para pruebas
  const [rolLogueado, setRolLogueado] = useState(null);
  const [error, setError] = useState("");

  const manejarLogin = (e) => {
    e.preventDefault();
    
    // Validación específica para el Administrador
    if (tipo === "admin" && usuario === "admin" && password === "1039456779") {
      setRolLogueado("admin");
      setError("");
    } else if (tipo !== "admin" && usuario && password) {
      // Para otros roles, permitimos la entrada simulada si llenan los campos
      setRolLogueado(tipo);
      setError("");
    } else {
      setError("Datos incorrectos. Por favor, verifica tu usuario, contraseña y perfil.");
    }
  };

  if (!rolLogueado) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
        
        {/* CABECERA: Logo y Título */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={URL_LOGO} alt="Somos PRO Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #7c3aed', marginBottom: '15px' }} />
          <h1 style={{ color: '#7c3aed', fontSize: '32px', fontWeight: 'bold', margin: '0' }}>PRO_Tracking</h1>
          <p style={{ color: '#6b7280', marginTop: '5px' }}>Ingresa a tu panel de control</p>
        </div>

        {/* FORMULARIO */}
        <div style={{ padding: '30px', maxWidth: '380px', width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          <h2 style={{ textAlign: 'center', color: '#1f2937', marginBottom: '20px' }}>Iniciar Sesión</h2>
          
          {error && <p style={{ color: '#ef4444', fontSize: '14px', background: '#fee2e2', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>{error}</p>}
          
          <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', color: '#4b5563', marginBottom: '5px', fontSize: '14px' }}>Selecciona tu perfil:</label>
              <select onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '16px' }}>
                <option value="admin">Administrador</option>
                <option value="operador">Operador</option>
                <option value="transportista">Transportista</option>
                <option value="conductor">Conductor</option>
                <option value="cliente">Cliente Interno</option>
              </select>
            </div>
            
            <input type="text" placeholder="Usuario / ID / NIT" onChange={(e) => setUsuario(e.target.value)} style={{ width: '94%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '16px' }} />
            <input type="password" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} style={{ width: '94%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '16px' }} />
            
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA POST-LOGIN (SIMPLIFICADA POR AHORA) ---
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ background: '#7c3aed', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={URL_LOGO} alt="Logo mini" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', padding: '2px' }} />
          <h2 style={{ margin: '0' }}>PRO_Tracking - Panel de {rolLogueado.toUpperCase()}</h2>
        </div>
        <button onClick={() => setRolLogueado(null)} style={{ background: 'white', color: '#7c3aed', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Sesión</button>
      </div>
      
      <div style={{ marginTop: '30px', padding: '20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        {rolLogueado === 'admin' ? (
          <div>
            <h3 style={{ color: '#1f2937' }}>Bienvenido Administrador</h3>
            <p style={{ color: '#4b5563' }}>Tienes acceso total a la gestión de PRO_Tracking.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{ padding: '10px 20px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Gestionar Usuarios</button>
              <button style={{ padding: '10px 20px', background: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Ver Reportes</button>
            </div>
          </div>
        ) : (
          <p style={{ color: '#4b5563' }}>Bienvenido al módulo de {rolLogueado}. Aquí construiremos tus herramientas de trabajo.</p>
        )}
      </div>
    </div>
  );
}
