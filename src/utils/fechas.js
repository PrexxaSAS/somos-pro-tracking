// La fecha de hoy como la ve quien usa la aplicacion, no como la ve UTC.
//
// new Date().toISOString() devuelve siempre UTC, y Colombia es UTC-5: desde las
// 7 de la noche esa cadena ya trae el dia siguiente. Con ese atajo, una entrega
// registrada a las 8 p.m. quedaba fechada manana, y el cargue de cartera
// buscaba los cortes del dia equivocado.
//
// Estas dos funciones leen el dia, el mes y el anio locales, que es justamente
// lo que ve el usuario en su reloj.
//
// Ojo: NO sirven para convertir una fecha que ya existe. El patron
//   new Date("2026-09-23") -> setDate(+n) -> toISOString().split("T")[0]
// funciona bien porque sus dos desfases se cancelan, igual que el que ancla la
// cadena a "T12:00:00". Esos quedaron como estaban.

const comoISO = (d) =>
 `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Hoy, o el dia que cae a esa distancia de hoy: hoyMas(1) es manana y
// hoyMas(-7) es hace una semana.
export const hoyMas = (dias) => {
 const d = new Date();
 if (dias) d.setDate(d.getDate() + Number(dias));
 return comoISO(d);
};

export const hoyLocal = () => comoISO(new Date());

// Dia local (aaaa-mm-dd) de un instante guardado en UTC, como created_at. Un
// pedido subido a las 8 p.m. es de ese dia, no del siguiente.
export const diaLocal = (iso) => {
 const d = iso ? new Date(iso) : null;
 return d && !isNaN(d) ? comoISO(d) : "";
};

// Filtro por fecha de ingreso de los listados de pedidos: un atajo o "rango"
// con desde y hasta elegidos (cualquiera de los dos puede quedar abierto).
export const RANGOS_FECHA = [
 { id: "todo", label: "Todas las fechas", corto: "Todo" },
 { id: "hoy", label: "Hoy", corto: "Hoy" },
 { id: "7", label: "Ultimos 7 dias", corto: "7 dias", dias: 7 },
 { id: "30", label: "Ultimos 30 dias", corto: "30 dias", dias: 30 },
 { id: "90", label: "Ultimos 90 dias", corto: "90 dias", dias: 90 },
 { id: "rango", label: "Elegir fechas...", corto: "Fechas" },
];

// Primer y ultimo dia incluidos (aaaa-mm-dd), o null si ese lado esta abierto.
export const limitesFecha = (rango, desde, hasta) => {
 if (rango === "hoy") return { desde: hoyLocal(), hasta: null };
 if (rango === "rango") return { desde: desde || null, hasta: hasta || null };
 const r = RANGOS_FECHA.find(x => x.id === rango);
 return { desde: r?.dias ? hoyMas(-r.dias) : null, hasta: null };
};

export const diaEnLimites = (dia, l) => (!l.desde || dia >= l.desde) && (!l.hasta || dia <= l.hasta);

// Los mismos limites como instantes, para filtrar created_at en la base: desde
// la medianoche local del primer dia hasta antes de la del dia siguiente al ultimo.
export const limitesInstante = (l) => {
 const medianoche = (dia) => new Date(`${dia}T00:00:00`);
 return {
  desde: l.desde ? medianoche(l.desde).toISOString() : null,
  antesDe: l.hasta ? new Date(medianoche(l.hasta).getTime() + 86400000).toISOString() : null,
 };
};
