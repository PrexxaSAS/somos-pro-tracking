import React, { useState, useEffect } from 'react';
import { LayoutGrid, LogOut, Menu, Share2, X } from 'lucide-react';
import { ROLES } from '../../Constants';
import { T } from '../../design/tokens';
import { ALTO_BARRA } from '../../design/responsive';
import { MENUS } from './SidebarApp';

// En el celular no cabe un menu lateral de quince opciones. Las cuatro pantallas
// de uso diario pasan a una barra inferior, siempre al alcance del pulgar, y el
// resto vive en una hoja que sube desde abajo.

const DIRECTAS = 4;  // cuatro destinos fijos; la quinta casilla abre la hoja

// Las cuatro pantallas de uso diario de cada rol. La barra no se ordena sola
// por el menu: ahi van las que se abren todos los dias, no las cuatro primeras.
const PRINCIPALES = {
 admin: ["dashboard", "pedidos", "rastreo", "conductores"],
 operador: ["dashboard", "pedidos", "rastreo", "conductores"],
 cliente: ["consultas", "devoluciones", "recogidas", "pqrs"],
};

// En una casilla de ~70px no cabe "Mi ubicacion GPS".
const CORTO = {
 dashboard: "Inicio",
 rastreo: "Rastreo",
 mis_pedidos: "Pedidos",
 mis_devoluciones: "Devoluciones",
 mis_recogidas: "Recogidas",
 mi_ubicacion: "Ubicacion",
 mi_empresa: "Empresa",
 consultas: "Pedidos",
 devoluciones: "Devoluciones",
 recogidas: "Recogidas",
 cartera_pedidos: "Pedidos",
 cartera_cargar: "Cargar",
 cartera_vencida: "Vencida",
 cartera_consultas: "Cartera",
 cartera_logistica: "Logistica",
 transportistas: "Transporte",
 resumen: "Resumen",
 facturas: "Facturas",
 promesas: "Promesas",
 ciudades: "Ciudades",
};

// El dashboard es la portada de la app: en la barra se anuncia como tal.
const ICONO = { dashboard: LayoutGrid };

const aplanar = (grupos) => grupos.flatMap(([, items]) => items);

function Casilla({ icono: Icono, etiqueta, activo, onClick }) {
 return (
  <button onClick={onClick} style={{
   flex: 1, minWidth: 0, border: "none", background: "transparent",
   display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
   gap: 3, padding: "8px 2px 6px", cursor: "pointer", fontFamily: "inherit",
   color: activo ? T.color.marca : T.color.tinta3,
  }}>
   <Icono size={21} strokeWidth={activo ? 2.3 : 1.8} />
   <span style={{
    fontSize: 10.5, fontWeight: activo ? 700 : 500, lineHeight: 1.2,
    maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
   }}>{etiqueta}</span>
  </button>
 );
}

// Hoja inferior con el usuario y las opciones que no cupieron en la barra.
export function HojaMas({ user, grupos, activeTab, onIr, onLogout, onShareApp, onClose }) {
 const [dentro, setDentro] = useState(false);
 const inicial = (user.nombre || "?").trim().charAt(0).toUpperCase();

 // Un fotograma de margen para que la hoja se vea subir y no aparecer de golpe.
 useEffect(() => {
  const id = requestAnimationFrame(() => setDentro(true));
  return () => cancelAnimationFrame(id);
 }, []);

 // Con la hoja abierta el fondo no debe desplazarse.
 useEffect(() => {
  const previo = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previo; };
 }, []);

 const cerrar = () => { setDentro(false); setTimeout(onClose, 180); };

 return (
  <div onClick={cerrar} style={{
   position: "fixed", inset: 0, zIndex: 120,
   background: dentro ? "rgba(23,20,31,.45)" : "rgba(23,20,31,0)",
   transition: "background .18s ease",
   display: "flex", flexDirection: "column", justifyContent: "flex-end",
  }}>
   <div onClick={e => e.stopPropagation()} style={{
    background: T.color.superficie,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "86vh", display: "flex", flexDirection: "column",
    transform: dentro ? "translateY(0)" : "translateY(100%)",
    transition: "transform .2s ease",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
   }}>
    <div style={{ display: "grid", placeItems: "center", padding: "10px 0 4px", flexShrink: 0 }}>
     <span style={{ width: 40, height: 4, borderRadius: 2, background: T.color.tenue }} />
    </div>

    <div style={{
     display: "flex", alignItems: "center", gap: 12,
     padding: "10px 20px 16px", flexShrink: 0,
    }}>
     <div style={{
      width: 42, height: 42, borderRadius: T.radio.pastilla, flexShrink: 0,
      background: T.color.marcaSuave, color: T.color.marca,
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16,
     }}>{inicial}</div>
     <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{
       fontSize: 15, fontWeight: 700, color: T.color.tinta, lineHeight: 1.25,
       overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{user.nombre}</div>
      <div style={{ fontSize: 12.5, color: T.color.tinta3 }}>{ROLES[user.rol] || user.rol}</div>
     </div>
     {onShareApp && (
      <button onClick={() => { cerrar(); setTimeout(onShareApp, 190); }} title="Compartir app"
       style={{ ...botonIcono, color: T.color.tinta3 }}>
       <Share2 size={19} />
      </button>
     )}
     <button onClick={onLogout} title="Cerrar sesion" style={{ ...botonIcono, color: T.color.mal }}>
      <LogOut size={19} />
     </button>
    </div>

    <div style={{ overflowY: "auto", padding: "0 14px 8px", borderTop: `1px solid ${T.color.borde}` }}>
     {grupos.map(([titulo, items]) => (
      <div key={titulo} style={{ paddingTop: 16 }}>
       <div style={{ ...T.texto.seccion, color: T.color.placeholder, padding: "0 8px 8px" }}>{titulo}</div>
       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {items.map(([tab, label, Icono]) => {
         const activo = activeTab === tab;
         return (
          <button key={tab} onClick={() => { cerrar(); setTimeout(() => onIr(tab), 190); }} style={{
           display: "flex", alignItems: "center", gap: 10, minWidth: 0,
           padding: "11px 10px", borderRadius: T.radio.control, border: "none",
           background: activo ? T.color.marcaSuave : "transparent",
           color: activo ? T.color.marca : T.color.tinta2,
           fontFamily: "inherit", fontSize: 13.5, fontWeight: activo ? 700 : 500,
           textAlign: "left", cursor: "pointer",
          }}>
           <Icono size={18} strokeWidth={activo ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
           <span style={{ minWidth: 0, lineHeight: 1.25 }}>{label}</span>
          </button>
         );
        })}
       </div>
      </div>
     ))}
    </div>

    <div style={{ padding: "12px 20px 16px", flexShrink: 0 }}>
     <button onClick={cerrar} style={{
      width: "100%", height: 46, borderRadius: T.radio.control, border: "none",
      background: T.color.superficie2, color: T.color.tinta2,
      fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
     }}>Cerrar</button>
    </div>
   </div>
  </div>
 );
}

export function NavegacionMovil({ user, activeTab, setActiveTab, onLogout, onShareApp }) {
 const [hoja, setHoja] = useState(false);
 const grupos = MENUS[user.rol] || [];
 const todas = aplanar(grupos);
 if (!todas.length) return null;

 // La hoja esta siempre: aunque el rol tenga pocas pantallas, es el unico sitio
 // desde donde cerrar sesion en el celular.
 const elegidas = PRINCIPALES[user.rol];
 const directas = elegidas
  ? elegidas.map(tab => todas.find(([t]) => t === tab)).filter(Boolean)
  : todas.slice(0, DIRECTAS);

 // La hoja solo repite lo que no esta en la barra, y los grupos que quedan
 // vacios no se dibujan.
 const enBarra = new Set(directas.map(([tab]) => tab));
 const restantes = grupos
  .map(([titulo, items]) => [titulo, items.filter(([tab]) => !enBarra.has(tab))])
  .filter(([, items]) => items.length > 0);

 return (
  <>
   <nav style={{
    position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100,
    background: T.color.superficie,
    borderTop: `1px solid ${T.color.borde}`,
    display: "flex", alignItems: "stretch",
    minHeight: ALTO_BARRA,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
   }}>
    {directas.map(([tab, label, Icono]) => (
     <Casilla
      key={tab}
      icono={ICONO[tab] || Icono}
      etiqueta={CORTO[tab] || label}
      activo={activeTab === tab}
      onClick={() => setActiveTab(tab)}
     />
    ))}
    <Casilla
     icono={hoja ? X : Menu}
     etiqueta="Mas"
     activo={hoja || !enBarra.has(activeTab)}
     onClick={() => setHoja(true)}
    />
   </nav>

   {hoja && (
    <HojaMas
     user={user}
     grupos={restantes}
     activeTab={activeTab}
     onIr={setActiveTab}
     onLogout={onLogout}
     onShareApp={onShareApp}
     onClose={() => setHoja(false)}
    />
   )}
  </>
 );
}

const botonIcono = {
 border: "none", background: "transparent", cursor: "pointer",
 padding: 8, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0,
};
