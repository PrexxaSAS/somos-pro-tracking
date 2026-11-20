-- ---------------------------------------------------------------------------
-- Mensajes nuevos en las PQRS (requiere docs/pqrs_observaciones.sql).
--
-- Cada usuario guarda hasta cuando leyo cada PQRS (pqrs_lecturas). Un mensaje
-- es nuevo para el si lo escribio "el otro lado" despues de esa lectura:
--   - logistica (admin u operador) ve como nuevos los del cliente interno;
--   - el cliente interno ve como nuevos los de logistica, en SUS PQRS.
-- Al abrir la PQRS se marca leida. Las politicas de pqrs y de sus
-- observaciones aplican: cada quien cuenta solo lo que puede ver.
--
-- Tambien publica pqrs_observaciones en Realtime para avisar en vivo a quien
-- tenga QTracking abierto.
--
-- Correr en los dos proyectos ANTES de publicar la version que lo usa.
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

create or replace function public.usuario_actual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.usuarios where auth_user_id = auth.uid() limit 1
$$;

create table if not exists public.pqrs_lecturas (
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  pqrs_id     text not null references public.pqrs(id) on delete cascade,
  leido_hasta timestamptz not null default now(),
  primary key (usuario_id, pqrs_id)
);

alter table public.pqrs_lecturas enable row level security;

drop policy if exists "pqrs_lecturas_propias" on public.pqrs_lecturas;
create policy "pqrs_lecturas_propias"
on public.pqrs_lecturas
for all
to authenticated
using (usuario_id = (select public.usuario_actual_id()))
with check (usuario_id = (select public.usuario_actual_id()));

grant select, insert, update on public.pqrs_lecturas to authenticated;

-- Marca la PQRS como leida hasta ahora para quien llama.
create or replace function public.marcar_pqrs_leida(p_pqrs text)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.pqrs_lecturas (usuario_id, pqrs_id, leido_hasta)
  values (public.usuario_actual_id(), p_pqrs, now())
  on conflict (usuario_id, pqrs_id) do update set leido_hasta = excluded.leido_hasta
$$;

-- PQRS con mensajes nuevos para quien llama, y cuantos.
create or replace function public.pqrs_no_leidas()
returns table (pqrs_id text, cantidad integer, ultimo timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  with yo as (
    select public.usuario_actual_id() as id,
           public.current_user_role() in ('admin', 'operador') as logistica
  )
  select o.pqrs_id, count(*)::integer, max(o.created_at)
    from public.pqrs_observaciones o
    cross join yo
    left join public.pqrs_lecturas l on l.pqrs_id = o.pqrs_id and l.usuario_id = yo.id
   where o.autor_id is distinct from yo.id
     and (o.autor_rol in ('admin', 'operador')) <> yo.logistica
     and o.created_at > coalesce(l.leido_hasta, '-infinity'::timestamptz)
   group by o.pqrs_id
$$;

grant execute on function public.marcar_pqrs_leida(text) to authenticated;
grant execute on function public.pqrs_no_leidas() to authenticated;

-- Avisos en vivo.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pqrs_observaciones'
  ) then
    alter publication supabase_realtime add table public.pqrs_observaciones;
  end if;
end $$;

-- Comprobacion
select proname from pg_proc
 where pronamespace = 'public'::regnamespace and proname in ('marcar_pqrs_leida', 'pqrs_no_leidas')
 order by proname;
