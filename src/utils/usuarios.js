// El usuario de acceso se vuelve el correo interno de Supabase Auth
// (usuario@somospro.local), y un correo no admite tildes, ñ ni espacios: con
// "hernan.muñoz" la creacion fallaba con "invalid format". Se limpia mientras
// se escribe: minusculas, sin tildes (ñ -> n) y solo letras, numeros, punto,
// guion y guion bajo.
export function limpiarUsuario(valor) {
 return String(valor || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9._-]/g, "");
}
