-- ---------------------------------------------------------------------------
-- Resumen diario de pedidos por asesor, por correo a cada auxiliar.
--
-- De lunes a sabado a las 6:00 p. m. hora Colombia (23:00 UTC; pg_cron
-- trabaja en UTC y Colombia no cambia de hora) se llama la funcion Edge
-- resumen-pedidos-asesores, que manda a cada auxiliar los pedidos de sus
-- asesores que se movieron ese dia, con el estado en que quedaron.
--
-- Antes de correrlo:
--   1. Publicar la funcion resumen-pedidos-asesores con "Verify JWT" APAGADO
--      (la funcion valida por su cuenta: el secreto de pg_cron o un admin).
--   2. Cambiar abajo la URL del proyecto (PASO A).
--
-- Despues de correrlo:
--   3. Copiar el secreto que muestra la ultima consulta y guardarlo en
--      Edge Functions > Secrets como RESUMEN_ASESORES_SECRET.
--   4. (Staging) Agregar el secreto RESUMEN_ASESORES_PARA con tu correo: todos
--      los resumenes te llegan a ti y no a las auxiliares. En produccion NO.
--   5. En Usuarios, ponerle correo a cada auxiliar (rol cliente). Sin correo,
--      el resumen va al correo registrado de cada asesor.
--
-- Necesita pg_cron, pg_net y vault (los mismos del informe de fletes).
-- Es seguro correrlo mas de una vez: no cambia el secreto ya creado.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- PASO A: la URL de la funcion en ESTE proyecto.
--   Staging:    https://dnahgbevwnbdhiqjlqyu.supabase.co/functions/v1/resumen-pedidos-asesores
--   Produccion: https://cfvvnvmezmrxehpaqayw.supabase.co/functions/v1/resumen-pedidos-asesores
do $$
declare
  url text := 'https://PROYECTO.supabase.co/functions/v1/resumen-pedidos-asesores';
begin
  if url like '%PROYECTO%' then
    raise exception 'Falta poner la URL del proyecto en el PASO A';
  end if;
  if exists (select 1 from vault.secrets where name = 'resumen_asesores_url') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'resumen_asesores_url'), url);
  else
    perform vault.create_secret(url, 'resumen_asesores_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'resumen_asesores_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'resumen_asesores_secret');
  end if;
end $$;

-- La tarea: lunes a sabado 23:00 UTC = 6:00 p. m. Colombia.
select cron.unschedule('resumen-pedidos-asesores')
where exists (select 1 from cron.job where jobname = 'resumen-pedidos-asesores');

select cron.schedule(
  'resumen-pedidos-asesores',
  '0 23 * * 1-6',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'resumen_asesores_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-resumen-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'resumen_asesores_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

-- Comprobacion: la tarea programada.
select jobname, schedule, active from cron.job where jobname = 'resumen-pedidos-asesores';

-- PASO 3: este valor va en Edge Functions > Secrets como RESUMEN_ASESORES_SECRET.
select decrypted_secret as resumen_asesores_secret
from vault.decrypted_secrets where name = 'resumen_asesores_secret';

-- ---------------------------------------------------------------------------
-- PRUEBA (opcional, correr aparte despues del paso 3): manda el resumen de hoy
-- ya mismo. La respuesta (cuantos pedidos, cuantos correos, cuantos quedaron
-- sin asesor o sin correo) se ve unos segundos despues con:
--   select status_code, content from net._http_response order by created desc limit 1;
--
-- select net.http_post(
--   url := (select decrypted_secret from vault.decrypted_secrets where name = 'resumen_asesores_url'),
--   headers := jsonb_build_object('Content-Type', 'application/json',
--     'x-resumen-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'resumen_asesores_secret')),
--   body := '{}'::jsonb, timeout_milliseconds := 120000);
--
-- Para quitar el envio diario:
--   select cron.unschedule('resumen-pedidos-asesores');
-- ---------------------------------------------------------------------------
