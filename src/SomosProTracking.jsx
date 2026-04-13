import { useState } from "react";

export default function SomosProTracking() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("cliente"); // Cliente por defecto
  const [rolLogueado, setRolLogueado] = useState(null);

  const manejarLogin = (e) => {
    e.preventDefault();
    // Aquí validaremos después contra Supabase.
    // Por ahora, simulamos el ingreso exitoso:
    setRolLogueado(tipo);
  };

  if (!rolLogueado) {
    return (
      <div style={{ padding: '40px', maxWidth: '350px', margin: 'auto', border: '1px solid #ccc', borderRadius: '10px' }}>
        <h2>Iniciar Sesión</h2>
        <form onSubmit={manejarLogin}>
          <label>¿Quién eres?</label>
          <select onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
            <option value="cliente">Cliente Interno</option>
            <option value="conductor">Conductor (Placa/Cédula)</option>
            <option value="transportista">Transportista (NIT)</option>
            <option value="operador">Operador (Cédula)</option>
            <option value="admin">Administrador</option>
          </select>
          
          <input type="text" placeholder="Usuario / ID / NIT" onChange={(e) => setUsuario(e.target.value)} style={{ display: 'block', margin: '10px 0', width: '90%', padding: '8px' }} />
          <input type="password" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', margin: '10px 0', width: '90%', padding: '8px' }} />
          
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer' }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Panel: {rolLogueado.toUpperCase()}</h1>
      <button onClick={() => setRolLogueado(null)}>Cerrar Sesión</button>
      <hr />
      <p>Bienvenido al sistema. Aquí construiremos el módulo específico para tu rol.</p>
    </div>
  );
}
