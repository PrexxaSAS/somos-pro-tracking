import { supabase } from '../supabase';

// Helpers del pedido que necesitan tanto la pantalla como el hook de edicion.
// Viven aqui y no en SomosProTracking para que el hook no tenga que importar de
// la pantalla que lo usa, que seria un ciclo.

// Un 0 no es lo mismo que un campo vacio: sin esto, String(0) cae como cadena
// vacia y el input pinta su placeholder, que se lee como si fuera un dato real.
export function numTexto(v) {
 return v === null || v === undefined || v === "" ? "" : String(v);
}

// Las fotos de soporte pesan y no viajan en la consulta del listado, para no
// agotar el egress de Supabase: se piden solo al abrir el pedido.
export async function cargarSoportesPedido(pedidoId) {
 const { data, error } = await supabase.from('pedidos').select('soportes_data').eq('id', pedidoId).single();
 if (error) throw error;
 return Array.isArray(data?.soportes_data) ? data.soportes_data : [];
}
