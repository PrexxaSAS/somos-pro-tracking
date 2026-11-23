-- ---------------------------------------------------------------------------
-- Informe de fletes semanal por correo.
--
-- Todos los lunes a las 6:00 a. m. hora Colombia (11:00 UTC; pg_cron trabaja
-- en UTC y Colombia no cambia de hora) se llama la funcion Edge
-- enviar-informe-fletes, que arma el CSV de las facturas de proveedor de la
-- semana anterior (lunes a domingo) y lo manda por correo.
--
-- Antes de correrlo:
--   1. Publicar la funcion enviar-informe-fletes con "Verify JWT" APAGADO
--      (la funcion valida por su cuenta: el secreto de pg_cron o un admin).
--   2. Cambiar abajo la URL del proyecto (PASO A).
--
-- Despues de correrlo:
--   3. Copiar el secreto que muestra la ultima consulta y guardarlo en
--      Edge Functions > Secrets como INFORME_FLETES_SECRET.
--   4. (Staging) Agregar el secreto INFORME_FLETES_PARA con tu correo, para
--      que las pruebas no le lleguen al destinatario real. En produccion no
--      hace falta: por defecto va a la.perez@prexxa.com.co.
--
-- Es seguro correrlo mas de una vez: no cambia el secreto ya creado.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- PASO A: la URL de la funcion en ESTE proyecto.
--   Staging:    https://dnahgbevwnbdhiqjlqyu.supabase.co/functions/v1/enviar-informe-fletes
--   Produccion: https://cfvvnvmezmrxehpaqayw.supabase.co/functions/v1/enviar-informe-fletes
do $$
declare
  url text := 'https://PROYECTO.supabase.co/functions/v1/enviar-informe-fletes';
begin
  if url like '%PROYECTO%' then
    raise exception 'Falta poner la URL del proyecto en el PASO A';
  end if;
  if exists (select 1 from vault.secrets where name = 'informe_fletes_url') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'informe_fletes_url'), url);
  else
    perform vault.create_secret(url, 'informe_fletes_url');
  end if;
  -- Secreto compartido con la funcion; se crea una sola vez.
  if not exists (select 1 from vault.secrets where name = 'informe_fletes_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'informe_fletes_secret');
  end if;
end $$;

-- La tarea: lunes 11:00 UTC = 6:00 a. m. Colombia. Si ya existe, se reemplaza.
select cron.unschedule('informe-fletes-semanal')
where exists (select 1 from cron.job where jobname = 'informe-fletes-semanal');

select cron.schedule(
  'informe-fletes-semanal',
  '0 11 * * 1',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'informe_fletes_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-informe-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'informe_fletes_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);

-- Comprobacion: la tarea programada.
select jobname, schedule, active from cron.job where jobname = 'informe-fletes-semanal';

-- PASO 3: este valor va en Edge Functions > Secrets como INFORME_FLETES_SECRET.
select decrypted_secret as informe_fletes_secret
from vault.decrypted_secrets where name = 'informe_fletes_secret';

-- ---------------------------------------------------------------------------
-- PRUEBA (opcional, correr aparte despues del paso 3): manda el informe ya,
-- igual que lo hara el lunes. La respuesta se ve unos segundos despues con:
--   select status_code, content from net._http_response order by created desc limit 1;
--
-- select net.http_post(
--   url := (select decrypted_secret from vault.decrypted_secrets where name = 'informe_fletes_url'),
--   headers := jsonb_build_object('Content-Type', 'application/json',
--     'x-informe-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'informe_fletes_secret')),
--   body := '{}'::jsonb, timeout_milliseconds := 60000);
--
-- Para quitar el envio semanal:
--   select cron.unschedule('informe-fletes-semanal');
-- ---------------------------------------------------------------------------
