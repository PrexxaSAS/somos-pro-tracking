import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { limitePromesa } from '../../utils/promesa';

// El orden de la ruta del conductor. Lo usan Mis entregas (numero de parada)
// y Mi ubicacion (siguiente parada), asi que vive en un solo sitio para que
// las dos pantallas digan lo mismo.
//
// La regla:
//   1. Si el conductor ordeno a mano, sus pedidos van primero, en su orden.
//   2. Los demas -- todos, si nunca reordeno; los que le asignaron despues, si
//      si lo hizo -- van por urgencia: primero la promesa que vence antes.
//   3. A igual promesa, el mas antiguo primero. Sin promesa, al final.
// El orden a mano se guarda en ruta_conductor (docs/ruta_conductor.sql).

// La fecha limite: la promesa de la ciudad contada desde la fecha del corte
// o, sin promesa, la fecha estimada que se digita pedido a pedido.
export const limitePedido = (p, promesas = []) =>
 limitePromesa(p, promesas.find(x => x.ciudad_codigo === p.ciudad_codigo));

const porUrgencia = (promesas) => (a, b) => {
 const la = limitePedido(a, promesas), lb = limitePedido(b, promesas);
 if (la && lb && la !== lb) return la < lb ? -1 : 1;
 if (la && !lb) return -1;
 if (!la && lb) return 1;
 const ca = String(a.fecha_creacion || a.created_at || "");
 const cb = String(b.fecha_creacion || b.created_at || "");
 return ca.localeCompare(cb);
};

// ruta: { [pedido_id]: orden }
export const ordenarRuta = (activos, ruta = {}, promesas = []) => {
 const aMano = activos.filter(p => ruta[p.id] != null).sort((a, b) => ruta[a.id] - ruta[b.id]);
 const resto = activos.filter(p => ruta[p.id] == null).sort(porUrgencia(promesas));
 return [...aMano, ...resto];
};

export function useRutaConductor(conductorId) {
 const [ruta, setRuta] = useState({});
 // Si la tabla todavia no existe (falta correr el SQL), la ruta va por
 // urgencia y el boton de reordenar no se ofrece: mejor eso que dejar
 // reordenar y que no se guarde.
 const [disponible, setDisponible] = useState(false);

 const cargar = useCallback(async () => {
  if (!conductorId || !supabase) return;
  const { data, error } = await supabase.from('ruta_conductor')
   .select('pedido_id,orden').eq('conductor_id', conductorId);
  if (error) { setDisponible(false); setRuta({}); return; }
  setDisponible(true);
  setRuta(Object.fromEntries((data || []).map(r => [r.pedido_id, r.orden])));
 }, [conductorId]);

 useEffect(() => { cargar(); }, [cargar]);

 // Guarda el orden completo de los pedidos activos y borra las filas de los
 // que ya no estan en la lista (entregados o reasignados).
 const guardar = async (ordenados) => {
  const filas = ordenados.map((p, i) => ({ conductor_id: conductorId, pedido_id: p.id, orden: i + 1 }));
  const anterior = ruta;
  setRuta(Object.fromEntries(filas.map(f => [f.pedido_id, f.orden])));
  const { error } = await supabase.from('ruta_conductor')
   .upsert(filas, { onConflict: 'conductor_id,pedido_id' });
  if (error) { setRuta(anterior); return error; }
  const ids = filas.map(f => f.pedido_id);
  let q = supabase.from('ruta_conductor').delete().eq('conductor_id', conductorId);
  if (ids.length) q = q.not('pedido_id', 'in', `(${ids.map(x => `"${x}"`).join(',')})`);
  await q;
  return null;
 };

 const restablecer = async () => {
  const anterior = ruta;
  setRuta({});
  const { error } = await supabase.from('ruta_conductor').delete().eq('conductor_id', conductorId);
  if (error) { setRuta(anterior); return error; }
  return null;
 };

 const aMano = Object.keys(ruta).length > 0;
 return { ruta, disponible, aMano, guardar, restablecer, recargar: cargar };
}
