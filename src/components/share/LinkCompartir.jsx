import React, { useState } from 'react';
import { P } from '../../Constants';
import { Btn, Modal } from '../../Subcomponentes';

export function LinkCompartir({ onClose }) {
  const url = window.location.href.split("?")[0].replace(/#.*$/, "");
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }).catch(() => {
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return (
    <Modal title="Compartir App con Conductores" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:20,alignItems:"center"}}>
        <div style={{background:P[50],borderRadius:12,padding:14,fontSize:13,color:P[800],textAlign:"center",width:"100%"}}>
          Comparte este enlace o codigo QR con tus conductores para que accedan a la app desde su celular.
        </div>

        <div style={{textAlign:"center"}}>
          <img
            src={qrUrl}
            alt="QR App"
            style={{width:200,height:200,borderRadius:12,border:`2px solid ${P[200]}`}}
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <p style={{fontSize:12,color:"#94a3b8",margin:"8px 0 0"}}>Escanear con la camara del celular</p>
        </div>

        <div style={{width:"100%"}}>
          <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 8px",textTransform:"uppercase"}}>Enlace directo</p>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,background:"#f1f5f9",borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:"monospace",color:"#334155",wordBreak:"break-all"}}>
              {url}
            </div>
            <Btn variant={copiado ? "success" : "secondary"} onClick={copiar} style={{flexShrink:0}}>
              {copiado ? "Copiado" : "Copiar"}
            </Btn>
          </div>
        </div>

        <div style={{background:"#fffbeb",borderRadius:10,padding:14,fontSize:13,color:"#92400e",width:"100%"}}>
          <strong>Instrucciones para el conductor:</strong>
          <ol style={{margin:"8px 0 0",paddingLeft:18,lineHeight:1.8}}>
            <li>Abre el enlace desde el navegador del celular (Chrome o Safari)</li>
            <li>Ingresa con usuario y contrasena asignados</li>
            <li>En Chrome Android: toca "Anadir a pantalla de inicio" para instalar como app</li>
            <li>En Safari iOS: toca el boton compartir y luego "Anadir a pantalla de inicio"</li>
          </ol>
        </div>

        <Btn variant="secondary" onClick={onClose} style={{width:"100%",justifyContent:"center"}}>Cerrar</Btn>
      </div>
    </Modal>
  );
}
