import React, { useState } from 'react';
import { supabase } from '../../supabase';
import logoSrc from '../../../Logo.png';

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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f7f7f8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#111827",
    }}>
      <div style={{ width: "100%", maxWidth: 384 }}>
        <section style={{
          background: "#fff",
          border: "1px solid #dedee3",
          borderRadius: 18,
          boxShadow: "0 2px 8px rgba(17, 24, 39, 0.08)",
          padding: "56px 32px 40px",
        }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <img
              src={logoSrc}
              alt="SomosPro"
              style={{ width: 76, height: 76, objectFit: "contain", display: "block", margin: "0 auto 6px" }}
            />
            <h1 style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: 0,
              color: "#18213f",
            }}>
              Somos<span style={{ color: "#7c1fff" }}>Pro</span>
            </h1>
            <p style={{ margin: "26px 0 0", color: "#5f6673", fontSize: 14 }}>
              Sistema de Gestion de Transporte
            </p>
          </div>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: "#555f70", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                Usuario
              </span>
              <input
                value={u}
                onChange={(e) => setU(e.target.value)}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                style={{
                  width: "100%",
                  height: 46,
                  border: "1px solid #dedee3",
                  borderRadius: 10,
                  padding: "0 16px",
                  boxSizing: "border-box",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                  color: "#111827",
                  background: "#fff",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: "#555f70", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                Contrasena
              </span>
              <input
                value={p}
                onChange={(e) => setP(e.target.value)}
                type="password"
                placeholder="********"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  height: 46,
                  border: "1px solid #dedee3",
                  borderRadius: 10,
                  padding: "0 16px",
                  boxSizing: "border-box",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                  color: "#111827",
                  background: "#fff",
                }}
              />
            </label>
            {err && <p style={{
              color: "#b91c1c",
              fontSize: 13,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              padding: "10px 12px",
              borderRadius: 10,
              margin: 0,
              lineHeight: 1.45,
            }}>{err}</p>}
            <button
              type="submit"
              disabled={cargando}
              style={{
                height: 48,
                marginTop: 6,
                border: "none",
                borderRadius: 9,
                background: cargando ? "#a78bfa" : "linear-gradient(90deg, #8a22ff 0%, #7626f5 100%)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "inherit",
                cursor: cargando ? "not-allowed" : "pointer",
                boxShadow: "0 8px 18px rgba(124, 31, 255, 0.18)",
              }}
            >
              {cargando ? "Entrando..." : "Entrar al Sistema"}
            </button>
          </form>
        </section>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, margin: "28px 0 0" }}>
          © 2026 SomosPro
        </p>
      </div>
    </div>
  );
}
