// Limite de la promesa de servicio de un pedido: la fecha de su CORTE mas los
// dias de promesa de la ciudad destino, en dias calendario (se cuentan sabados,
// domingos y festivos). Es la misma cuenta con la que la base guarda la fecha
// estimada al crear el pedido desde cartera (docs/cartera_a_pedidos.sql).
//
// La fecha del corte es pedidos.fecha_pedido. Los pedidos que no vienen de
// cartera pueden no tenerla; para esos se cuenta desde su fecha de creacion,
// que es lo unico que tienen.

// Se ancla al mediodia para que el cambio a UTC de toISOString no mueva el dia.
const sumarDias = (iso, dias) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().split("T")[0];
};

export function fechaBasePromesa(pedido) {
  const base = String(pedido?.fecha_pedido || pedido?.fecha_creacion || "").slice(0, 10);
  return base || null;
}

// Solo la promesa: null si la ciudad no tiene promesa o el pedido no tiene fecha.
export function limiteDePromesa(pedido, promesa) {
  const base = fechaBasePromesa(pedido);
  if (!promesa || !base) return null;
  return sumarDias(base, promesa.dias_plazo);
}

// La fecha limite que usa la app: la de la promesa y, si no hay promesa, la
// fecha estimada que se digito en el pedido.
export function limitePromesa(pedido, promesa) {
  return limiteDePromesa(pedido, promesa) || pedido?.fecha_estimada || null;
}
