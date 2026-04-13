import { useState } from "react";

export default function SomosProTracking() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("cliente");
  const [rolLogueado, setRolLogueado] = useState(null);
  const [error, setError] = useState("");

  const manejarLogin = (e) => {
    e.preventDefault();
    
    // Lógica específica para el Administrador
    if (tipo === "admin" && usuario === "admin" && password === "1039456779") {
      setRolLogueado("admin");
      setError("");
    } else if (tipo !== "admin") {
      // Por ahora, dejamos entrar a otros roles sin clave para que puedas probar
      setRolLogueado(tipo);
      setError("");
    } else {
      setError("Usuario o contraseña de Administrador incorrectos.");
    }
  };

  if (!rolLogueado) {
    return (
      <div style={{ padding: '40px', maxWidth: '350px', margin: 'auto', border: '1px solid #7c3aed', borderRadius: '10px' }}>
        <h2>Iniciar Sesión</h2>
        {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
        <form onSubmit={manejarLogin}>
          <label>Selecciona tu perfil:</label>
          <select onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
            <option value="admin">Administrador</option>
            <option value="operador">Operador</option>
            <option value="transportista">Transportista</option>
            <option value="conductor">Conductor</option>
            <option value="cliente">Cliente Interno</option>
          </select>
          <input type="text" placeholder="Usuario / ID / NIT" onChange={(e) => setUsuario(e.target.value)} style={{ display: 'block', margin: '10px 0', width: '90%', padding: '8px' }} />
          <input type="password" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', margin: '10px 0', width: '90%', padding: '8px' }} />
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer' }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ background: '#7c3aed', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', borderRadius: '8px' }}>
        <h2>Panel de {rolLogueado.toUpperCase()}</h2>
        <button onClick={() => setRolLogueado(null)} style={{ cursor: 'pointer' }}>Cerrar Sesión</button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        {rolLogueado === 'admin' ? (
          <div>
            <h3>Bienvenido Administrador</h3>
            <p>Tienes acceso a todo el sistema.</p>
            <button style={{ padding: '10px', marginRight: '10px' }}>Gestionar Usuarios</button>
            <button style={{ padding: '10px' }}>Ver Reportes</button>
          </div>
        ) : (
          <p>Bienvenido al módulo de {rolLogueado}.</p>
        )}
      </div>
    </div>
  );
}
