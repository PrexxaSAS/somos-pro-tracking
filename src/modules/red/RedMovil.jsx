import React, { useState, useEffect } from 'react';
import {
 Check, ChevronDown, ChevronUp, Lock, MoreHorizontal, Package, Pencil, Phone, Plus, Search, Trash2,
 Truck, User, UserPlus, Users,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ROLES } from '../../Constants';
import { BuscadorConductor, Pestanas, ListaVacia, iniciales } from '../conductor/PantallasConductor';
import { BotonFlotante, Chip } from '../gestion/ListasMovil';
import { Hoja, Etiqueta, Cabecera, VerMas } from '../configuracion/ConfiguracionMovil';

// Disenios 27 a 29: Conductores, Transportistas, Paqueterias y Usuarios en el
// celular. Cada pantalla dibuja lo que su modulo ya calcula y llama a sus
// mismas funciones. Lo que el disenio muestra y la aplicacion no tiene no se
// inventa: las paqueterias no se renombran, y los usuarios no tienen estado
// activo/inactivo ni ultimo acceso guardados; su "estado" es si tienen acceso
// (cuenta de ingreso) o no, que es lo que el escritorio ya distingue.

const corta = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const tarjeta = {
 background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
 padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, color: T.color.tinta,
};
const pie = {
 display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: T.color.tinta3,
 paddingTop: 10, borderTop: `1px solid ${T.color.divisor}`,
};
const botonIcono = {
 width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, flexShrink: 0, padding: 0,
 background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, color: T.color.tinta2, cursor: "pointer", textDecoration: "none",
};
const botonCabecera = {
 width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, padding: 0,
 background: T.color.marca, border: "none", borderRadius: T.radio.control, color: "#fff", cursor: "pointer",
};
const accionHoja = (peligro, inactiva) => ({
 display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "0 14px", borderRadius: 12,
 border: `1px solid ${T.color.borde2}`, background: T.color.superficie, fontFamily: "inherit", textAlign: "left",
 fontSize: 14, fontWeight: 600, cursor: inactiva ? "not-allowed" : "pointer",
 color: inactiva ? T.color.tinta4 : peligro ? T.color.mal : T.color.tinta,
});

function Avatar({ nombre, tam = 36, bg = T.color.marcaAvatar, color = T.color.marca, texto }) {
 return (
  <span style={{
   width: tam, height: tam, borderRadius: tam / 2, flexShrink: 0, display: "grid", placeItems: "center",
   background: bg, color, fontSize: tam > 32 ? 12.5 : 11.5, fontWeight: 800,
  }}>{texto || iniciales(nombre)}</span>
 );
}

const chipRuta = (transito) => transito > 0
 ? { bg: T.color.marcaSuave, color: T.color.marca, punto: T.estado.en_transito, texto: "En ruta" }
 : { bg: T.color.bienSuave, color: T.color.bien, punto: T.color.bienPunto, texto: "Disponible" };

// ── 27b: hoja para filtrar por transportista ────────────────────────────────
function HojaTransportista({ opciones, valor, onElegir, total, onClose }) {
 const [busq, setBusq] = useState("");
 const q = busq.trim().toLowerCase();
 const lista = opciones.filter(o => !q || (o.nombre || "").toLowerCase().includes(q) || String(o.nit || "").includes(q));
 const elegido = opciones.find(o => o.nit === valor);
 const cuenta = valor ? (elegido?.n || 0) : total;
 const fila = (nit, nombre, n) => {
  const sel = (valor || "") === nit;
  return (
   <button key={nit || "todos"} onClick={() => onElegir(nit)} style={{
    display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "8px 2px",
    border: "none", borderBottom: `1px solid ${T.color.divisor}`, background: "transparent",
    fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: T.color.tinta,
   }}>
    <span style={{
     width: 20, height: 20, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center",
     border: `2px solid ${sel ? T.color.marca : T.color.borde2}`, background: sel ? T.color.marca : "transparent",
    }}>{sel && <Check size={12} color="#fff" />}</span>
    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: sel ? 700 : 500, lineHeight: 1.3 }}>{nombre}</span>
    <span style={{ fontSize: 12.5, color: T.color.tinta3, flexShrink: 0 }}>{n}</span>
   </button>
  );
 };
 return (
  <Hoja titulo="Filtrar por transportista" onClose={onClose}>
   {cerrar => (
    <>
     <button onClick={() => onElegir("")} style={{ alignSelf: "flex-end", border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: T.color.marca }}>Limpiar</button>
     <div style={{ position: "relative" }}>
      <Search size={16} style={{ position: "absolute", left: 12, top: 14, color: T.color.placeholder }} />
      <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar transportista"
       style={{ width: "100%", boxSizing: "border-box", height: 44, padding: "0 12px 0 36px", background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, borderRadius: 12, fontSize: 16, fontFamily: "inherit", color: T.color.tinta, outline: "none" }} />
     </div>
     <div>
      {!q && fila("", "Todos los transportistas", total)}
      {lista.map(o => fila(o.nit, o.nombre, o.n))}
      {lista.length === 0 && <div style={{ padding: "24px 4px", fontSize: 13.5, color: T.color.tinta3, textAlign: "center" }}>Ningun transportista coincide.</div>}
     </div>
     <button onClick={cerrar} style={{
      minHeight: 48, borderRadius: 12, border: "none", background: T.color.marca, color: "#fff",
      fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
     }}>{`Ver ${cuenta} ${cuenta === 1 ? "conductor" : "conductores"}`}</button>
    </>
   )}
  </Hoja>
 );
}

// ── 27a: Conductores ────────────────────────────────────────────────────────
// `filas` llega con asignados, transito y transportista ya calculados por el
// modulo. Editar solo aparece si `onEditar` (admin); el operador ve la lista.
export function ConductoresMovil({ filas, transportistas = [], onNuevo, onEditar, onVerPedidos }) {
 const [busq, setBusq] = useState("");
 const [empresa, setEmpresa] = useState("");
 const [vista, setVista] = useState("todos");
 const [hoja, setHoja] = useState(false);
 const [tope, setTope] = useState(40);
 useEffect(() => { setTope(40); }, [busq, empresa, vista]);

 const q = busq.trim().toLowerCase();
 const base = filas.filter(c => (!empresa || c.nit_proveedor === empresa) && (!q ||
  [c.nombre, c.cedula, c.placa].some(v => String(v || "").toLowerCase().includes(q))));
 const grupos = { todos: base, ruta: base.filter(c => c.transito > 0), libres: base.filter(c => c.transito === 0) };
 const lista = grupos[vista];
 const transito = filas.reduce((s, c) => s + c.transito, 0);
 const opciones = transportistas.filter(t => t?.nit)
  .map(t => ({ nit: t.nit, nombre: t.nombre || t.empresa || t.nit, n: filas.filter(c => c.nit_proveedor === t.nit).length }))
  .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"));
 const nombreEmpresa = opciones.find(o => o.nit === empresa)?.nombre;

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${filas.length} ${filas.length === 1 ? "conductor" : "conductores"} · ${transito} ${transito === 1 ? "pedido" : "pedidos"} en transito`} titulo="Conductores"
    derecha={onNuevo && <button onClick={onNuevo} title="Registrar conductor" style={botonCabecera}><UserPlus size={17} /></button>} />
   <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1, minWidth: 0 }}><BuscadorConductor valor={busq} onChange={setBusq} placeholder="Nombre, cedula o placa" /></div>
    <button onClick={() => setHoja(true)} style={{
     display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 12px", flexShrink: 0, maxWidth: 150,
     borderRadius: T.radio.control, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
     background: empresa ? T.color.marcaSuave : T.color.superficie, color: empresa ? T.color.marca : T.color.tinta2,
     border: `1px solid ${empresa ? T.color.marcaSuave : T.color.borde2}`,
    }}><Truck size={15} style={{ flexShrink: 0 }} /><span style={corta}>{nombreEmpresa || "Transportista"}</span></button>
   </div>
   <Pestanas valor={vista} onChange={setVista} opciones={[
    { clave: "todos", label: "Todos", n: grupos.todos.length },
    { clave: "ruta", label: "En ruta", n: grupos.ruta.length },
    { clave: "libres", label: "Disponibles", n: grupos.libres.length },
   ]}/>
   {lista.length === 0 ? (
    <ListaVacia>{filas.length === 0 ? "Sin conductores registrados." : "Ningun conductor coincide con el filtro."}</ListaVacia>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     {lista.slice(0, tope).map(c => (
      <article key={c.id} style={tarjeta}>
       <div role="button" tabIndex={0} onClick={() => onVerPedidos && c.placa && onVerPedidos(c)}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: onVerPedidos && c.placa ? "pointer" : "default" }}>
        <Avatar nombre={c.nombre} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
         <span style={{ fontSize: 14, fontWeight: 700, ...corta }}>{c.nombre}</span>
         <span style={{ fontSize: 12, color: T.color.tinta3, ...corta }}>
          <span style={{ fontFamily: T.fuente.mono }}>{c.placa || "Sin placa"}</span>{` · ${c.transportista || "Sin transportista"}`}
         </span>
        </div>
        <Chip {...chipRuta(c.transito)} />
       </div>
       <div style={pie}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: c.transito ? 700 : 500, color: c.transito ? T.color.marca : T.color.tinta3 }}>
         <Truck size={14} />{`${c.transito} en transito`}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Package size={14} style={{ color: T.color.placeholder }} />{`${c.asignados} asignados`}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
         {c.celular && <a href={`tel:${c.celular}`} title="Llamar" style={{ ...botonIcono, background: T.color.marcaSuave, border: "none", color: T.color.marca }}><Phone size={15} /></a>}
         {onEditar && <button onClick={() => onEditar(c)} title="Editar" style={botonIcono}><Pencil size={14} /></button>}
        </span>
       </div>
      </article>
     ))}
     {lista.length > tope && <VerMas onClick={() => setTope(t => t + 40)} />}
    </div>
   )}
   {hoja && (
    <HojaTransportista opciones={opciones} valor={empresa} onElegir={setEmpresa} total={filas.length} onClose={() => setHoja(false)} />
   )}
  </div>
 );
}

// ── 27c: Transportistas ─────────────────────────────────────────────────────
// Cada empresa es una tarjeta; sus conductores se despliegan dentro, como el
// acordeon de escritorio. `empresas` llega con sus conductores ya filtrados.
export function TransportistasMovil({ empresas, pedidos = [], onNueva, onEditarEmpresa, onInscribir, onEditarConductor }) {
 const [busq, setBusq] = useState("");
 const [vista, setVista] = useState("todas");
 const [abiertas, setAbiertas] = useState(() => new Set());
 const q = busq.trim().toLowerCase();
 const base = empresas.filter(e => !q || [e.nombre, e.nit, e.contacto].some(v => String(v || "").toLowerCase().includes(q))
  || e.conductores.some(c => [c.nombre, c.placa].some(v => String(v || "").toLowerCase().includes(q))));
 const grupos = { todas: base, con: base.filter(e => e.conductores.length > 0), sin: base.filter(e => e.conductores.length === 0) };
 const lista = grupos[vista];
 const conductores = empresas.reduce((s, e) => s + e.conductores.length, 0);
 const alternar = (nit) => setAbiertas(p => { const s = new Set(p); if (s.has(nit)) s.delete(nit); else s.add(nit); return s; });
 const enTransito = (c) => pedidos.filter(p => String(p.conductor_id) === String(c.id) && p.estado === "en_transito").length;

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${empresas.length} ${empresas.length === 1 ? "empresa" : "empresas"} · ${conductores} ${conductores === 1 ? "conductor" : "conductores"}`} titulo="Transportistas"
    derecha={<button onClick={onNueva} title="Nueva empresa" style={botonCabecera}><Plus size={18} /></button>} />
   <BuscadorConductor valor={busq} onChange={setBusq} placeholder="Empresa, NIT o contacto" />
   <Pestanas valor={vista} onChange={setVista} opciones={[
    { clave: "todas", label: "Todas", n: grupos.todas.length },
    { clave: "con", label: "Con conductores", n: grupos.con.length },
    { clave: "sin", label: "Sin conductores", n: grupos.sin.length },
   ]}/>
   {lista.length === 0 ? (
    <ListaVacia>{empresas.length === 0 ? "Sin empresas registradas." : "Ninguna empresa coincide con el filtro."}</ListaVacia>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     {lista.map(e => {
      const abierta = abiertas.has(e.nit);
      const n = e.conductores.length;
      return (
       <article key={e.nit || e.id} style={{ ...tarjeta, borderColor: abierta ? T.color.marcaBorde || T.color.borde : T.color.borde }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
         <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: T.color.marcaSuave, color: T.color.marca }}><Truck size={17} /></span>
         <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, ...corta }}>{e.nombre}</span>
          <span style={{ fontSize: 12, color: T.color.tinta3, fontFamily: T.fuente.mono }}>{`NIT ${e.nit}`}</span>
         </div>
         <button onClick={() => onEditarEmpresa(e)} title="Editar empresa" style={botonIcono}><Pencil size={14} /></button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12.5, color: T.color.tinta2 }}>
         <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}><User size={14} style={{ color: T.color.placeholder, flexShrink: 0 }} /><span style={corta}>{e.contacto || "Sin contacto"}</span></span>
         {e.tel
          ? <a href={`tel:${e.tel}`} style={{ display: "flex", alignItems: "center", gap: 5, color: T.color.tinta2, textDecoration: "none" }}><Phone size={14} style={{ color: T.color.placeholder }} />{e.tel}</a>
          : <span style={{ display: "flex", alignItems: "center", gap: 5, color: T.color.tinta4 }}><Phone size={14} />Sin telefono</span>}
        </div>
        <button onClick={() => n ? alternar(e.nit) : onInscribir(e)} style={{
         ...pie, border: "none", borderTop: `1px solid ${T.color.divisor}`, background: "transparent", width: "100%",
         cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "10px 0 0",
         color: n ? T.color.tinta : T.color.marca,
        }}>
         <Users size={15} />{n ? `${n} ${n === 1 ? "conductor" : "conductores"}` : "Sin conductores · inscribir"}
         {n > 0 && (abierta ? <ChevronUp size={16} style={{ marginLeft: "auto" }} /> : <ChevronDown size={16} style={{ marginLeft: "auto" }} />)}
        </button>
        {abierta && (
         <div style={{ display: "flex", flexDirection: "column", gap: 2, background: T.color.superficie2, borderRadius: 10, padding: 6 }}>
          {e.conductores.map(c => {
           const t = enTransito(c);
           return (
            <button key={c.id} onClick={() => onEditarConductor(c)} style={{
             display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", border: "none", background: "transparent",
             fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: T.color.tinta, borderRadius: 8,
            }}>
             <Avatar nombre={c.nombre} tam={30} />
             <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, ...corta }}>{c.nombre}</span>
              <span style={{ fontSize: 11.5, color: T.color.tinta3, ...corta }}><span style={{ fontFamily: T.fuente.mono }}>{c.placa || "Sin placa"}</span>{c.cedula ? ` · CC ${c.cedula}` : ""}</span>
             </span>
             <span style={{
              fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: T.radio.pastilla, flexShrink: 0, whiteSpace: "nowrap",
              background: t ? T.color.marcaSuave : T.color.bienSuave, color: t ? T.color.marca : T.color.bien,
             }}>{t ? `${t} en transito` : "Disponible"}</span>
            </button>
           );
          })}
          <button onClick={() => onInscribir(e)} style={{
           display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, marginTop: 4,
           borderRadius: 9, border: `1px dashed ${T.color.borde2}`, background: T.color.superficie, color: T.color.marca,
           fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}><UserPlus size={15} /> Inscribir conductor</button>
         </div>
        )}
       </article>
      );
     })}
    </div>
   )}
  </div>
 );
}

// ── 28: Paqueterias ─────────────────────────────────────────────────────────
// Lista simple; "+" abre una hoja con un solo campo y el "···" de cada fila,
// las acciones. Eliminar se bloquea si hay pedidos que la usan, con la razon.
export function PaqueteriasMovil({ lista, usos, onAgregar, onEliminar }) {
 const [hojaNueva, setHojaNueva] = useState(false);
 const [nombre, setNombre] = useState("");
 const [fila, setFila] = useState(null);
 const repetida = Boolean(nombre.trim()) && lista.includes(nombre.trim());

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${lista.length} ${lista.length === 1 ? "empresa" : "empresas"} · orden A-Z`} titulo="Paqueterias"
    derecha={<button onClick={() => { setNombre(""); setHojaNueva(true); }} title="Agregar paqueteria" style={botonCabecera}><Plus size={18} /></button>} />
   <span style={{ fontSize: 13, color: T.color.tinta3, lineHeight: 1.45 }}>Empresas externas que aparecen al marcar un envio como paqueteria.</span>
   {lista.length === 0 ? (
    <ListaVacia>Sin empresas registradas. Agrega la primera con el +.</ListaVacia>
   ) : (
    <div style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12, overflow: "hidden" }}>
     {lista.map(p => {
      const n = usos(p);
      return (
       <div key={p} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 10px 8px 14px", borderBottom: `1px solid ${T.color.divisor}` }}>
        <Avatar texto={String(p || "?").charAt(0).toUpperCase()} tam={34} />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
         <span style={{ fontSize: 14, fontWeight: 600, ...corta }}>{p}</span>
         <span style={{ fontSize: 12, color: T.color.tinta3, display: "flex", alignItems: "center", gap: 4 }}>
          {n ? <><Lock size={11} />{`${n} ${n === 1 ? "pedido" : "pedidos"} · no se puede eliminar`}</> : "Sin pedidos"}
         </span>
        </span>
        <button onClick={() => setFila(p)} title="Acciones" style={{ ...botonIcono, background: "transparent", border: "none" }}><MoreHorizontal size={17} /></button>
       </div>
      );
     })}
    </div>
   )}
   {hojaNueva && (
    <Hoja titulo="Agregar paqueteria" onClose={() => setHojaNueva(false)}>
     {cerrar => (
      <>
       <span style={{ fontSize: 13, color: T.color.tinta3, marginTop: -6 }}>Quedara disponible al marcar un envio como paqueteria.</span>
       <Etiqueta>Nombre de la empresa</Etiqueta>
       <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus placeholder="Coordinadora"
        onKeyDown={async e => { if (e.key === "Enter" && !repetida && await onAgregar(nombre)) cerrar(); }}
        style={{
         height: 48, width: "100%", boxSizing: "border-box", padding: "0 14px", borderRadius: 12, fontSize: 15, fontFamily: "inherit",
         border: `1px solid ${repetida ? T.color.mal : T.color.borde2}`, color: T.color.tinta, outline: "none",
        }} />
       <span style={{ fontSize: 12, color: repetida ? T.color.mal : T.color.tinta4 }}>
        {repetida ? "Esa paqueteria ya existe." : "Ej.: Servientrega, TCC, Coordinadora"}
       </span>
       <div style={{ display: "flex", gap: 8 }}>
        <button onClick={cerrar} style={{ ...accionHoja(false), flex: 1, justifyContent: "center" }}>Cancelar</button>
        <button disabled={repetida || !nombre.trim()} onClick={async () => { if (await onAgregar(nombre)) cerrar(); }} style={{
         flex: 1, minHeight: 52, borderRadius: 12, border: "none", background: T.color.marca, color: "#fff", fontFamily: "inherit",
         fontSize: 14, fontWeight: 600, cursor: repetida || !nombre.trim() ? "not-allowed" : "pointer", opacity: repetida || !nombre.trim() ? 0.5 : 1,
        }}>Agregar</button>
       </div>
      </>
     )}
    </Hoja>
   )}
   {fila && (
    <Hoja titulo={fila} onClose={() => setFila(null)}>
     {cerrar => {
      const n = usos(fila);
      return (
       <>
        <span style={{ fontSize: 13, color: T.color.tinta3, marginTop: -6 }}>{n ? `${n} ${n === 1 ? "pedido asociado" : "pedidos asociados"}` : "Sin pedidos asociados"}</span>
        <button disabled={n > 0} onClick={async () => { if (await onEliminar(fila)) cerrar(); }} style={accionHoja(true, n > 0)}>
         {n > 0 ? <Lock size={17} /> : <Trash2 size={17} />}
         <span style={{ display: "flex", flexDirection: "column" }}>
          Eliminar
          {n > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: T.color.tinta4 }}>No disponible: tiene pedidos asociados</span>}
         </span>
        </button>
       </>
      );
     }}
    </Hoja>
   )}
  </div>
 );
}

// ── 29: Usuarios ────────────────────────────────────────────────────────────
export function UsuariosMovil({ usuarios, colorRol, acceso, setAcceso, onNuevo, onEditar, onEliminar }) {
 const [busq, setBusq] = useState("");
 const [rol, setRol] = useState("todos");
 const [fila, setFila] = useState(null);
 const [tope, setTope] = useState(40);
 useEffect(() => { setTope(40); }, [busq, rol, acceso]);
 const q = busq.trim().toLowerCase();
 const buscados = usuarios.filter(u => {
  const conAcceso = Boolean(u.auth_user_id);
  const okAcceso = acceso === "todos" || (acceso === "con" && conAcceso) || (acceso === "sin" && !conAcceso);
  const okBusq = !q || [u.nombre, u.user, u.cedula, u.nit, u.empresa].some(v => String(v || "").toLowerCase().includes(q));
  return okAcceso && okBusq;
 });
 const lista = rol === "todos" ? buscados : buscados.filter(u => u.rol === rol);
 const conAcceso = usuarios.filter(u => u.auth_user_id).length;
 const roles = Object.entries(ROLES).map(([k, v]) => ({ clave: k, label: v, n: buscados.filter(u => u.rol === k).length }))
  .filter(r => r.n > 0 || r.clave === rol).sort((a, b) => b.n - a.n);
 const vinculo = (u) => [u.empresa, u.nit && `NIT ${u.nit}`, u.cedula && `CC ${u.cedula}`, u.placa].filter(Boolean).join(" · ");

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"} · ${conAcceso} con acceso`} titulo="Usuarios"
    derecha={<button onClick={onNuevo} title="Nuevo usuario" style={botonCabecera}><UserPlus size={17} /></button>} />
   <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1, minWidth: 0 }}><BuscadorConductor valor={busq} onChange={setBusq} placeholder="Nombre, usuario u organizacion" /></div>
    <label style={{
     position: "relative", display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 10px", flexShrink: 0,
     borderRadius: T.radio.control, fontSize: 13, fontWeight: 600, cursor: "pointer",
     background: acceso !== "todos" ? T.color.marcaSuave : T.color.superficie, color: acceso !== "todos" ? T.color.marca : T.color.tinta2,
     border: `1px solid ${acceso !== "todos" ? T.color.marcaSuave : T.color.borde2}`,
    }}>
     {acceso === "con" ? "Con acceso" : acceso === "sin" ? "Sin acceso" : "Acceso"}<ChevronDown size={14} />
     <select value={acceso} onChange={e => setAcceso(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
      <option value="todos">Todos</option>
      <option value="con">Con acceso</option>
      <option value="sin">Sin acceso</option>
     </select>
    </label>
   </div>
   <Pestanas valor={rol} onChange={setRol} opciones={[{ clave: "todos", label: "Todos", n: buscados.length }, ...roles]} />
   {lista.length === 0 ? (
    <ListaVacia>Ningun usuario coincide con el filtro.</ListaVacia>
   ) : (
    <div style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12, overflow: "hidden" }}>
     {lista.slice(0, tope).map(u => {
      const color = colorRol[u.rol] || T.color.tinta3;
      const sin = !u.auth_user_id;
      return (
       <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px 10px 14px", borderBottom: `1px solid ${T.color.divisor}`, opacity: sin ? 0.6 : 1 }}>
        <Avatar nombre={u.nombre} bg={`${color}18`} color={color} />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 1 }}>
         <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, ...corta }}>{u.nombre}</span>
          <span style={{ fontFamily: T.fuente.mono, fontSize: 11.5, color: T.color.tinta3, ...corta }}>{`@${u.user}`}</span>
         </span>
         <span style={{ fontSize: 12, color: T.color.tinta3, ...corta }}>
          <span style={{ color, fontWeight: 600 }}>{ROLES[u.rol] || u.rol}</span>{vinculo(u) ? ` · ${vinculo(u)}` : ""}{sin ? " · Sin acceso" : ""}
         </span>
        </span>
        <button onClick={() => setFila(u)} title="Acciones" style={{ ...botonIcono, background: "transparent", border: "none" }}><MoreHorizontal size={17} /></button>
       </div>
      );
     })}
    </div>
   )}
   {lista.length > tope && <VerMas onClick={() => setTope(t => t + 40)} />}
   {fila && (
    <Hoja titulo={fila.nombre} onClose={() => setFila(null)}>
     {cerrar => (
      <>
       <span style={{ fontSize: 13, color: T.color.tinta3, marginTop: -6 }}>
        <span style={{ fontFamily: T.fuente.mono }}>{`@${fila.user}`}</span>{` · ${ROLES[fila.rol] || fila.rol}`}{fila.empresa ? ` · ${fila.empresa}` : ""}
       </span>
       {(fila.cedula || fila.placa || fila.nit) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "10px 12px", background: T.color.superficie2, borderRadius: 10 }}>
         <span style={{ color: T.color.tinta3 }}>Identificacion</span>
         <span style={{ fontFamily: T.fuente.mono, color: T.color.tinta2, textAlign: "right" }}>{[fila.nit && `NIT ${fila.nit}`, fila.cedula && `CC ${fila.cedula}`, fila.placa].filter(Boolean).join(" · ")}</span>
        </div>
       )}
       <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "10px 12px", background: T.color.superficie2, borderRadius: 10 }}>
        <span style={{ color: T.color.tinta3 }}>Acceso al sistema</span>
        <span style={{ fontWeight: 600, color: fila.auth_user_id ? T.color.bien : T.color.tinta3 }}>{fila.auth_user_id ? "Con acceso" : "Sin acceso"}</span>
       </div>
       <button onClick={() => { cerrar(); onEditar(fila); }} style={accionHoja(false)}><Pencil size={17} /> Editar usuario y contrasena</button>
       {fila.user !== "admin" && (
        <button onClick={async () => { if (await onEliminar(fila)) cerrar(); }} style={accionHoja(true)}><Trash2 size={17} /> Eliminar usuario</button>
       )}
      </>
     )}
    </Hoja>
   )}
  </div>
 );
}
