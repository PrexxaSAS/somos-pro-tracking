import React, { useRef, useState } from 'react';
import { P } from '../../Constants';
import { Btn, Modal } from '../../Subcomponentes';
import { comprimirImagen } from '../../utils/images';
import { generarPDFSoportes } from '../../utils/pdf';

export function CargadorFotos({ pedido, onGuardar, onClose, showToast }) {
  const [fotos, setFotos] = useState([]);
  const camRef = useRef(null);
  const fileRef = useRef(null);
  const MAX = 3;

  const procesar = async (files) => {
    const arr = Array.from(files || []).slice(0, MAX - fotos.length);
    const nuevas = [];

    for (const file of arr) {
      if (!file.type.startsWith("image/")) {
        showToast("Solo se permiten imagenes", "error");
        continue;
      }

      showToast("Comprimiendo imagen...", "info");
      const data = await comprimirImagen(file);
      nuevas.push({ data, nombre: file.name });
    }

    setFotos(prev => [...prev, ...nuevas].slice(0, MAX));
  };

  return (
    <Modal title="Cargar Soportes de Entrega" onClose={onClose} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:P[50],borderRadius:10,padding:12,fontSize:13,color:P[800]}}>
          Carga hasta <strong>3 fotos</strong>. Se genera un PDF unico con todas las imagenes para el cliente interno.
        </div>

        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <Btn variant="primary" onClick={() => camRef.current?.click()} disabled={fotos.length >= MAX}>
            Tomar Foto
          </Btn>
          <Btn variant="secondary" onClick={() => fileRef.current?.click()} disabled={fotos.length >= MAX}>
            Subir desde PC / Galeria
          </Btn>
          <span style={{fontSize:12,color:"#94a3b8"}}>{fotos.length}/{MAX} foto(s) cargada(s)</span>
        </div>

        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{display:"none"}}
          onChange={event => procesar(event.target.files)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{display:"none"}}
          onChange={event => procesar(event.target.files)}
        />

        {fotos.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {fotos.map((foto, index) => (
              <div key={index} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`2px solid ${P[200]}`}}>
                <img src={foto.data} alt={`soporte${index}`} style={{width:"100%",height:110,objectFit:"cover",display:"block"}} />
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:11,padding:"3px 8px",fontWeight:600}}>
                  Soporte {index + 1} - {foto.nombre}
                </div>
                <button
                  onClick={() => setFotos(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                  style={{position:"absolute",top:4,right:4,background:"#ef4444",border:"none",color:"#fff",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:14,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
          {fotos.length > 0 && (
            <Btn variant="secondary" onClick={() => generarPDFSoportes(pedido, fotos)}>
              Preview PDF
            </Btn>
          )}
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="success"
            disabled={fotos.length === 0}
            onClick={() => {
              if (fotos.length === 0) {
                showToast("Carga al menos una foto", "error");
                return;
              }
              onGuardar(fotos);
            }}
          >
            Guardar {fotos.length} soporte(s) y marcar entregado
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
