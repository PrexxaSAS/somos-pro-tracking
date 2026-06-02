export function mensajeError(error, contexto = "operacion") {
  const raw = String(error?.message || error || "").trim();
  const code = String(error?.code || "").trim();
  const texto = raw.toLowerCase();

  if (!raw) return "No se pudo completar la operacion. Intenta nuevamente.";
  if (code === "PGRST116" || texto.includes("cannot coerce the result to a single json object")) {
    return "No se encontro el registro esperado o hay datos duplicados. Recarga la pagina e intenta nuevamente.";
  }
  if (texto.includes("row-level security") || texto.includes("violates row-level security") || code === "42501") {
    return "No tienes permisos para realizar esta accion con tu rol actual.";
  }
  if (texto.includes("jwt") || texto.includes("session") || texto.includes("sesion") || texto.includes("unauthorized") || code === "401") {
    return "Tu sesion no es valida o expiro. Cierra sesion e ingresa nuevamente.";
  }
  if (texto.includes("duplicate key") || code === "23505") {
    return "Ya existe un registro con esos datos. Revisa identificacion, guia, usuario o numero de factura.";
  }
  if (texto.includes("foreign key") || code === "23503") {
    return "No se puede completar porque hay informacion relacionada. Revisa las guias, conductores o facturas asociadas.";
  }
  if (texto.includes("failed to fetch") || texto.includes("network") || texto.includes("fetch")) {
    return "No se pudo conectar con el servidor. Revisa internet e intenta nuevamente.";
  }
  if (texto.includes("edge function returned a non-2xx") || texto.includes("failed to send a request to the edge function")) {
    return "No se pudo ejecutar la funcion segura. Revisa la configuracion de Supabase Edge Functions.";
  }

  return `No se pudo completar ${contexto}: ${raw}`;
}
