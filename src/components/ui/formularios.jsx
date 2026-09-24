import React, { useState } from 'react';
import { Camera, Check, Eye, EyeOff, MessageSquare, X } from 'lucide-react';
import { T } from '../../design/tokens';

// Piezas de los modulos de creacion, segun docs/systemdesign.md seccion 3.
// La idea: todos los formularios de creacion se arman con estas cuatro piezas, de
// modo que el ancho, el pie fijo y el aspecto de los campos sean siempre iguales.

// ── Modal de formulario ─────────────────────────────────────────────────────
// ancho "S" = 480px (una columna) · "M" = 640px (dos columnas).
// El cuerpo hace scroll y el pie queda fijo: en un formulario largo el boton de
// guardar nunca se pierde de vista.
export function ModalForm({
 titulo, descripcion, ancho = "S", onClose, children,
 textoPrimario = "Guardar", onPrimario, guardando = false,
 textoCancelar = "Cancelar", primarioDeshabilitado = false,
}) {
 return (
  <div
   onClick={e => { if (e.target === e.currentTarget) onClose(); }}
   style={{
    position: "fixed", inset: 0, background: "rgba(23,20,31,.45)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
   }}>
   <div style={{
    background: T.color.superficie, borderRadius: 16,
    width: "100%", maxWidth: ancho === "M" ? 640 : 480,
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 64px rgba(23,20,31,.22)",
   }}>
    <header style={{
     display: "flex", alignItems: "flex-start", justifyContent: "space-between",
     gap: 16, padding: "22px 24px 16px",
    }}>
     <div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.color.tinta, letterSpacing: "-0.01em" }}>
       {titulo}
      </h3>
      {descripcion && (
       <p style={{ margin: "4px 0 0", fontSize: 13, color: T.color.tinta3 }}>{descripcion}</p>
      )}
     </div>
     <button onClick={onClose} title="Cerrar" style={{
      border: "none", background: "transparent", cursor: "pointer",
      color: T.color.tinta4, padding: 4, borderRadius: 8,
      display: "grid", placeItems: "center", flexShrink: 0,
     }}><X size={18} /></button>
    </header>

    <div style={{ padding: "0 24px 20px", overflowY: "auto", overflowX: "hidden" }}>
     <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
     </div>
    </div>

    <footer style={{
     display: "flex", justifyContent: "flex-end", gap: 10,
     padding: "16px 24px", borderTop: `1px solid ${T.color.borde}`, flexShrink: 0,
    }}>
     <button onClick={onClose} disabled={guardando} style={{
      height: 38, padding: "0 16px", borderRadius: T.radio.boton,
      border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
      color: T.color.tinta2, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
      cursor: guardando ? "not-allowed" : "pointer",
     }}>{textoCancelar}</button>
     {onPrimario && (
      <button onClick={onPrimario} disabled={guardando || primarioDeshabilitado} style={{
       height: 38, padding: "0 18px", borderRadius: T.radio.boton, border: "none",
       background: T.color.marca, color: "#fff", fontFamily: "inherit",
       fontSize: 13, fontWeight: 600,
       cursor: (guardando || primarioDeshabilitado) ? "not-allowed" : "pointer",
       opacity: (guardando || primarioDeshabilitado) ? 0.6 : 1,
      }}>{guardando ? "Guardando..." : textoPrimario}</button>
     )}
    </footer>
   </div>
  </div>
 );
}

// ── Estructura del formulario ───────────────────────────────────────────────

// Separador con rotulo: agrupa campos sin recuadros ni cajas anidadas.
export function Seccion({ titulo }) {
 return (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
   <span style={{ ...T.texto.seccion, color: T.color.placeholder, whiteSpace: "nowrap" }}>{titulo}</span>
   <span style={{ flex: 1, height: 1, background: T.color.borde }} />
  </div>
 );
}

// Franja de contexto: la empresa a la que quedara vinculado algo, o la guia que
// se generara sola. Es informacion, no un error: nunca va en rojo.
export function FranjaInfo({ icono, children }) {
 return (
  <div style={{
   display: "flex", alignItems: "center", gap: 10,
   padding: "10px 12px", borderRadius: T.radio.control,
   background: T.color.superficie2, border: `1px solid ${T.color.borde}`,
   fontSize: 13, color: T.color.tinta2,
  }}>
   {icono && <span style={{ color: T.color.tinta4, display: "grid", placeItems: "center", flexShrink: 0 }}>{icono}</span>}
   <span>{children}</span>
  </div>
 );
}

export function Fila({ children, columnas = 2 }) {
 return (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnas},1fr)`, gap: 14 }}>
   {children}
  </div>
 );
}

// ── Campos ──────────────────────────────────────────────────────────────────

const etiqueta = {
 fontSize: 12, fontWeight: 600, color: T.color.tinta2,
 display: "flex", alignItems: "center", gap: 4,
};

const baseEntrada = {
 width: "100%", boxSizing: "border-box", height: 40,
 padding: "0 12px", border: `1px solid ${T.color.borde2}`,
 borderRadius: T.radio.control, fontSize: 13.5, fontFamily: "inherit",
 color: T.color.tinta, background: T.color.superficie, outline: "none",
};

function Etiqueta({ children, obligatorio, opcional }) {
 if (!children) return null;
 return (
  <label style={etiqueta}>
   {children}
   {obligatorio && <span style={{ color: T.color.malPunto }}>*</span>}
   {opcional && <span style={{ color: T.color.tinta4, fontWeight: 400 }}>· opcional</span>}
  </label>
 );
}

// Envoltura comun: etiqueta arriba, control abajo, ayuda debajo.
function Campo({ label, obligatorio, opcional, ayuda, children, style }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, ...style }}>
   <Etiqueta obligatorio={obligatorio} opcional={opcional}>{label}</Etiqueta>
   {children}
   {ayuda && <span style={{ fontSize: 12, color: T.color.tinta4 }}>{ayuda}</span>}
  </div>
 );
}

// El foco morado se hace con eventos porque todo el estilo va inline: no hay
// hoja de estilos donde declarar :focus.
const conFoco = (extra = {}) => ({
 onFocus: e => { e.target.style.borderColor = T.color.marca; e.target.style.boxShadow = `0 0 0 3px ${T.color.marcaSuave}`; },
 onBlur: e => { e.target.style.borderColor = T.color.borde2; e.target.style.boxShadow = "none"; },
 ...extra,
});

export function Texto({ label, valor, onChange, placeholder, obligatorio, opcional, ayuda, tipo = "text", prefijo, mono, deshabilitado, style }) {
 return (
  <Campo label={label} obligatorio={obligatorio} opcional={opcional} ayuda={ayuda} style={style}>
   <div style={{ position: "relative" }}>
    {prefijo && (
     <span style={{
      position: "absolute", left: 12, top: 0, height: 40, display: "flex", alignItems: "center",
      fontSize: 13, color: T.color.tinta4, pointerEvents: "none",
     }}>{prefijo}</span>
    )}
    <input
     type={tipo}
     value={valor}
     onChange={e => onChange(e.target.value)}
     placeholder={placeholder}
     disabled={deshabilitado}
     {...conFoco()}
     style={{
      ...baseEntrada,
      paddingLeft: prefijo ? 12 + prefijo.length * 8 + 6 : 12,
      fontFamily: mono ? T.fuente.mono : "inherit",
      background: deshabilitado ? T.color.superficie2 : T.color.superficie,
      color: deshabilitado ? T.color.tinta4 : T.color.tinta,
     }}/>
   </div>
  </Campo>
 );
}

export function Clave({ label = "Contrasena", valor, onChange, obligatorio, ayuda, placeholder = "........" }) {
 const [visible, setVisible] = useState(false);
 return (
  <Campo label={label} obligatorio={obligatorio} ayuda={ayuda}>
   <div style={{ position: "relative" }}>
    <input
     type={visible ? "text" : "password"}
     value={valor}
     onChange={e => onChange(e.target.value)}
     placeholder={placeholder}
     autoComplete="new-password"
     {...conFoco()}
     style={{ ...baseEntrada, paddingRight: 40 }}/>
    <button type="button" onClick={() => setVisible(!visible)}
     title={visible ? "Ocultar" : "Mostrar"}
     style={{
      position: "absolute", right: 6, top: 5, width: 30, height: 30,
      border: "none", background: "transparent", cursor: "pointer",
      color: T.color.tinta4, display: "grid", placeItems: "center", borderRadius: 7,
     }}>
     {visible ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
   </div>
  </Campo>
 );
}

export function Selector({ label, valor, onChange, opciones = [], obligatorio, opcional, ayuda, placeholder, deshabilitado, style }) {
 return (
  <Campo label={label} obligatorio={obligatorio} opcional={opcional} ayuda={ayuda} style={style}>
   <select
    value={valor}
    onChange={e => onChange(e.target.value)}
    disabled={deshabilitado}
    {...conFoco()}
    style={{
     ...baseEntrada, cursor: deshabilitado ? "not-allowed" : "pointer",
     background: deshabilitado ? T.color.superficie2 : T.color.superficie,
     color: valor ? T.color.tinta : T.color.placeholder,
    }}>
    {placeholder && <option value="">{placeholder}</option>}
    {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
   </select>
  </Campo>
 );
}

export function AreaTexto({ label, valor, onChange, placeholder, obligatorio, opcional, filas = 3 }) {
 return (
  <Campo label={label} obligatorio={obligatorio} opcional={opcional}>
   <textarea
    value={valor}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={filas}
    {...conFoco()}
    style={{ ...baseEntrada, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.5 }}/>
  </Campo>
 );
}

// Adjuntar un archivo: la zona ocupa el ancho del campo y muestra el nombre del
// archivo elegido, para que se vea que quedo cargado.
export function Adjunto({ label, nombre, onArchivo, acepta = "image/*,.pdf", opcional = true }) {
 const ref = React.useRef(null);
 return (
  <Campo label={label} opcional={opcional}>
   <button type="button" onClick={() => ref.current && ref.current.click()} style={{
    ...baseEntrada, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", color: nombre ? T.color.tinta : T.color.tinta4,
    borderStyle: nombre ? "solid" : "dashed",
   }}>
    {nombre || "Adjuntar archivo"}
   </button>
   <input ref={ref} type="file" accept={acepta} style={{ display: "none" }}
    onChange={e => { const f = e.target.files?.[0]; if (f) onArchivo(f); }}/>
  </Campo>
 );
}


// ── Modulos de gestion (editar, asignar, cerrar) ────────────────────────────

// Encabezado con el identificador y el estado, cuerpo con el resumen y las
// secciones editables, y un pie donde la accion que cierra el estado (entregar,
// completar, cerrar) va siempre de ultima y en verde.
export function ModalGestion({
 titulo, id, estado, descripcion, ancho = "M", onClose, children,
 enlaces, textoGuardar = "Guardar", onGuardar, guardando = false, guardarDeshabilitado = false,
 textoCierre, onCierre, cierreDeshabilitado = false, textoCancelar = "Cancelar",
}) {
 return (
  <div
   onClick={e => { if (e.target === e.currentTarget) onClose(); }}
   style={{
    position: "fixed", inset: 0, background: "rgba(23,20,31,.45)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
   }}>
   <div style={{
    background: T.color.superficie, borderRadius: 16,
    width: "100%", maxWidth: ancho === "M" ? 640 : 480,
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 64px rgba(23,20,31,.22)",
   }}>
    <header style={{
     display: "flex", alignItems: "flex-start", justifyContent: "space-between",
     gap: 16, padding: "22px 24px 16px",
    }}>
     <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
       <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.color.tinta, letterSpacing: "-0.01em" }}>
        {titulo}
       </h3>
       {id && <span style={{ fontFamily: T.fuente.mono, fontSize: 13, color: T.color.marca }}>{id}</span>}
       {estado}
      </div>
      {descripcion && (
       <p style={{ margin: "4px 0 0", fontSize: 13, color: T.color.tinta3 }}>{descripcion}</p>
      )}
     </div>
     <button onClick={onClose} title="Cerrar" style={{
      border: "none", background: "transparent", cursor: "pointer",
      color: T.color.tinta4, padding: 4, borderRadius: 8,
      display: "grid", placeItems: "center", flexShrink: 0,
     }}><X size={18} /></button>
    </header>

    <div style={{ padding: "0 24px 20px", overflowY: "auto", overflowX: "hidden" }}>
     <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
     </div>
    </div>

    <footer style={{
     display: "flex", alignItems: "center", justifyContent: "space-between",
     gap: 12, padding: "14px 24px", borderTop: `1px solid ${T.color.borde}`,
     flexShrink: 0, flexWrap: "wrap",
    }}>
     <div style={{ display: "flex", gap: 14 }}>{enlaces}</div>
     <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
      <button onClick={onClose} disabled={guardando} style={{
       height: 38, padding: "0 16px", borderRadius: T.radio.boton,
       border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
       color: T.color.tinta2, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
       cursor: guardando ? "not-allowed" : "pointer",
      }}>{textoCancelar}</button>
      {onGuardar && (
       <button onClick={onGuardar} disabled={guardando || guardarDeshabilitado} style={{
        height: 38, padding: "0 18px", borderRadius: T.radio.boton, border: "none",
        background: T.color.marca, color: "#fff", fontFamily: "inherit",
        fontSize: 13, fontWeight: 600,
        cursor: (guardando || guardarDeshabilitado) ? "not-allowed" : "pointer",
        opacity: (guardando || guardarDeshabilitado) ? 0.5 : 1,
       }}>{guardando ? "Guardando..." : textoGuardar}</button>
      )}
      {onCierre && (
       <button onClick={onCierre} disabled={guardando || cierreDeshabilitado} style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        height: 38, padding: "0 18px", borderRadius: T.radio.boton, border: "none",
        background: T.color.bienPunto, color: "#fff", fontFamily: "inherit",
        fontSize: 13, fontWeight: 600,
        cursor: (guardando || cierreDeshabilitado) ? "not-allowed" : "pointer",
        opacity: (guardando || cierreDeshabilitado) ? 0.5 : 1,
       }}><Check size={15} /> {textoCierre}</button>
      )}
     </div>
    </footer>
   </div>
  </div>
 );
}

// Enlace terciario del pie (Ver guia, Ver mapa).
export function EnlacePie({ icono, children, onClick }) {
 return (
  <button onClick={onClick} style={{
   display: "inline-flex", alignItems: "center", gap: 6,
   border: "none", background: "transparent", cursor: "pointer",
   fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: T.color.marca, padding: 0,
  }}>{icono}{children}</button>
 );
}

// Tarjeta de resumen: los datos que no se editan, en tres columnas.
export function Resumen({ titulo, datos = [], children }) {
 return (
  <div style={{
   background: T.color.superficie2, border: `1px solid ${T.color.borde}`,
   borderRadius: T.radio.tarjeta, padding: 16,
   display: "flex", flexDirection: "column", gap: 14,
  }}>
   {titulo && (
    <div style={{ fontSize: 14, fontWeight: 700, color: T.color.tinta }}>{titulo}</div>
   )}
   {datos.length > 0 && (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px 16px" }}>
     {datos.map(d => (
      <div key={d.label} style={{ minWidth: 0 }}>
       <div style={{ fontSize: 12, color: T.color.tinta3, marginBottom: 3 }}>{d.label}</div>
       <div style={{
        fontSize: 13, fontWeight: 600,
        color: d.falta ? T.color.malPunto : T.color.tinta,
        fontFamily: d.mono ? T.fuente.mono : "inherit",
        overflow: "hidden", textOverflow: "ellipsis",
       }}>{d.valor}</div>
      </div>
     ))}
    </div>
   )}
   {children}
  </div>
 );
}

// Franja ambar para el motivo o la novedad, dentro del resumen.
export function FranjaAviso({ etiqueta, children }) {
 return (
  <div style={{
   display: "flex", alignItems: "flex-start", gap: 8,
   background: T.color.ojoSuave, border: "1px solid #f0dfc0",
   borderRadius: T.radio.control, padding: "9px 12px",
   fontSize: 13, color: T.color.ojo,
  }}>
   <MessageSquare size={14} style={{ marginTop: 2, flexShrink: 0 }} />
   <span>{etiqueta && <strong>{etiqueta}: </strong>}{children}</span>
  </div>
 );
}

// Casilla de una linea, para marcar la novedad dentro de su seccion.
export function CasillaNovedad({ marcada, onChange, children, deshabilitada }) {
 return (
  <label style={{
   display: "flex", alignItems: "center", gap: 10,
   padding: "11px 13px", borderRadius: T.radio.control,
   border: `1px solid ${marcada ? T.color.malBorde : T.color.borde2}`,
   background: marcada ? T.color.malSuave : T.color.superficie,
   cursor: deshabilitada ? "not-allowed" : "pointer",
   fontSize: 13, color: marcada ? T.color.mal : T.color.tinta2,
   opacity: deshabilitada ? 0.6 : 1,
  }}>
   <input type="checkbox" checked={marcada} disabled={deshabilitada}
    onChange={e => onChange(e.target.checked)}
    style={{ width: 15, height: 15, accentColor: T.color.malPunto, cursor: "inherit" }}/>
   {children}
  </label>
 );
}

// Zona de carga de fotos con contador.
export function ZonaFotos({ actuales = 0, maximo = 3, onClick, deshabilitada, ayuda }) {
 return (
  <button onClick={onClick} disabled={deshabilitada} style={{
   display: "flex", alignItems: "center", gap: 12, width: "100%",
   padding: "12px 14px", borderRadius: T.radio.control,
   border: `1px ${actuales ? "solid" : "dashed"} ${T.color.borde2}`,
   background: T.color.superficie, fontFamily: "inherit",
   cursor: deshabilitada ? "not-allowed" : "pointer", textAlign: "left",
   opacity: deshabilitada ? 0.6 : 1,
  }}>
   <span style={{
    width: 34, height: 34, borderRadius: T.radio.chico, flexShrink: 0,
    background: T.color.marcaSuave, color: T.color.marca,
    display: "grid", placeItems: "center",
   }}><Camera size={16} /></span>
   <span style={{ flex: 1, minWidth: 0 }}>
    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.color.tinta }}>
     Cargar fotos de entrega
    </span>
    <span style={{ display: "block", fontSize: 12, color: T.color.tinta3 }}>
     {ayuda || `${actuales === 0 ? "Sin soportes aun" : actuales + " cargada(s)"} · maximo ${maximo} · JPG o PNG`}
    </span>
   </span>
   <span style={{ fontSize: 12.5, fontWeight: 700, color: T.color.tinta3, fontVariantNumeric: "tabular-nums" }}>
    {actuales}/{maximo}
   </span>
  </button>
 );
}
