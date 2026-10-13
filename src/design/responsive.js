import { useState, useEffect } from 'react';

// Un solo punto de corte para toda la app. Los estilos van en linea, asi que no
// hay media queries disponibles: la pantalla pregunta por el ancho y dibuja lo
// que toca.
export const CORTE_MOVIL = 768;

export function useEsMovil(corte = CORTE_MOVIL) {
 const consulta = `(max-width: ${corte}px)`;
 const [esMovil, setEsMovil] = useState(
  () => typeof window !== "undefined" && window.matchMedia(consulta).matches
 );

 useEffect(() => {
  const mq = window.matchMedia(consulta);
  const alCambiar = e => setEsMovil(e.matches);
  setEsMovil(mq.matches);
  // Safari antiguo no acepta addEventListener sobre MediaQueryList.
  if (mq.addEventListener) mq.addEventListener("change", alCambiar);
  else mq.addListener(alCambiar);
  return () => {
   if (mq.removeEventListener) mq.removeEventListener("change", alCambiar);
   else mq.removeListener(alCambiar);
  };
 }, [consulta]);

 return esMovil;
}

// Alto de la barra de navegacion inferior. Las pantallas lo reservan como
// espacio al pie para que el contenido no quede debajo de la barra.
export const ALTO_BARRA = 62;
