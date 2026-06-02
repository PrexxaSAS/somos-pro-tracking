import React, { useState } from 'react';
import { P } from '../../Constants';
import { Logo, Btn, Field, Card } from '../../Subcomponentes';
import { supabase } from '../../supabase';

export function Login({ onLogin }) {
  const [u,   setU]   = useState("");
  const [p,   setP]   = useState("");
  const [err, setErr] = useState("");

  const login = async (e) => {
    e.preventDefault();
    setErr("");
    setCargando(true);
    const username = u.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@somospro.local`,
        password: p,
      });
      if (error) throw error;
      const { data: found, error: profileError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!found) throw new Error("Usuario autenticado sin perfil asignado. Ejecuta nuevamente el script de vinculacion Auth.");
      setCargando(false);
      onLogin(found);
    } catch (authError) {
      console.error("Error de login:", authError);
      setCargando(false);
      setErr(authError.message || "Usuario o contrasena incorrectos.");
    }
  };
  const [cargando, setCargando] = useState(false);

  const demos = [
    { l: "Admin",        u: "admin",   p: "admin123" },
    { l: "Operador",     u: "operador",p: "op123" },
    { l: "Transportista",u: "transprueba", p: "trans123" },
    { l: "Conductor",    u: "driver1", p: "cond123" },
    { l: "Cliente",      u: "cliente", p: "cli123" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${P[950]} 0%,${P[700]} 55%,${P[500]} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: `radial-gradient(circle at 15% 85%,${P[800]}60 0%,transparent 50%),radial-gradient(circle at 85% 15%,${P[400]}30 0%,transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", marginBottom: 16, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.3))" }}><Logo size={90} /></div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 6px" }}>Somos PRO Tracking</h1>
          <p style={{ color: P[300], fontSize: 14, margin: 0 }}>Sistema de Gestion de Transporte</p>
        </div>
        <Card style={{ boxShadow: `0 28px 64px ${P[950]}80` }}>
          <h2 style={{ margin: "0 0 22px", fontSize: 18, color: P[800], fontWeight: 800 }}>Iniciar Sesion</h2>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Usuario" value={u} onChange={setU} placeholder="admin" />
            <Field label="Contrasena" value={p} onChange={setP} type="password" placeholder="********" />
            {err && <p style={{ color: "#dc2626", fontSize: 13, background: "#fef2f2", padding: "9px 12px", borderRadius: 8, margin: 0 }}>{err}</p>}
            <Btn type="submit" size="lg" style={{ justifyContent: "center", marginTop: 4 }}>Entrar al Sistema</Btn>
          </form>
          <div style={{ marginTop: 22, borderTop: `1px solid ${P[100]}`, paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 700 }}>ACCESOS DE DEMO:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {demos.map(d => (
                <button key={d.l} type="button" onClick={() => { setU(d.u); setP(d.p); }}
                  style={{ border: `1px solid ${P[200]}`, background: P[50], borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: P[700], fontWeight: 700 }}>
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
