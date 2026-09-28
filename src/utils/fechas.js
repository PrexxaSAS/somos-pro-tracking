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
