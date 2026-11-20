-- ---------------------------------------------------------------------------
-- Observaciones de las PQRS, como un chat.
--
-- Antes cada PQRS tenia UNA respuesta (pqrs.respuesta): logistica escribia "ya
-- lo estamos gestionando" y despues no podia contar que ya se soluciono. Ahora
-- cada PQRS lleva un hilo de observaciones: logistica (operador o admin) y el
-- cliente interno que la radico pueden escribir mientras este abierta o en
-- gestion. Cerrada, el hilo queda de solo lectura (si se reabre, se sigue).
--
-- La primera observacion de logistica pasa la PQRS a 'en_gestion' y, si aun
-- no tenia respuesta, la copia en pqrs.respuesta para que los listados e
-- informes que la usan la sigan viendo.
--
-- Quien ve el hilo: quien puede ver la PQRS (las politicas de pqrs aplican).
-- El autor y la fecha los pone la base, no la pantalla.
--
-- Correr en los dos proyectos ANTES de publicar la version que lo usa.
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

create table if not exists public.pqrs_observaciones (
  id           uuid primary key default gen_random_uuid(),
  pqrs_id      text not null references public.pqrs(id) on delete cascade,
  mensaje      text not null check (btrim(mensaje) <> ''),
  autor_id     uuid references public.usuarios(id) on delete set null,
  autor_nombre text,
  autor_rol    text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pqrs_observaciones_pqrs on public.pqrs_observaciones (pqrs_id, created_at);

alter table public.pqrs_observaciones enable row level security;

drop policy if exists "pqrs_obs_select" on public.pqrs_observaciones;
create policy "pqrs_obs_select"
on public.pqrs_observaciones
for select
to authenticated
using (exists (select 1 from public.pqrs p where p.id = pqrs_observaciones.pqrs_id));

drop policy if exists "pqrs_obs_insert" on public.pqrs_observaciones;
create policy "pqrs_obs_insert"
on public.pqrs_observaciones
for insert
to authenticated
with check (
  (select public.current_user_role()) in ('admin', 'operador', 'cliente')
  and exists (
    select 1 from public.pqrs p
     where p.id = pqrs_observaciones.pqrs_id
       and p.estado in ('abierta', 'en_gestion')
  )
);

grant select, insert on public.pqrs_observaciones to authenticated;

-- Autor y fecha los pone la base.
create or replace function public.pqrs_observacion_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.usuarios%rowtype;
begin
  select * into u from public.usuarios where auth_user_id = auth.uid() limit 1;
  new.autor_id := u.id;
  new.autor_nombre := coalesce(nullif(btrim(u.nombre), ''), u."user");
  new.autor_rol := u.rol;
  new.created_at := now();
  new.mensaje := btrim(new.mensaje);
  return new;
end;
$$;

drop trigger if exists trg_pqrs_observacion_autor on public.pqrs_observaciones;
create trigger trg_pqrs_observacion_autor
before insert on public.pqrs_observaciones
for each row execute function public.pqrs_observacion_autor();

-- La observacion de logistica pone la PQRS en gestion y, la primera vez, deja
-- la respuesta en pqrs para lo que ya la leia.
create or replace function public.pqrs_observacion_gestion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.autor_rol in ('admin', 'operador') then
    update public.pqrs
       set estado = 'en_gestion'
     where id = new.pqrs_id and estado = 'abierta';
    update public.pqrs
       set respuesta = new.mensaje,
           gestionado_por = new.autor_nombre,
           fecha_gestion = (now() at time zone 'America/Bogota')::date
     where id = new.pqrs_id
       and btrim(coalesce(respuesta, '')) = ''
       and fecha_gestion is null
       and btrim(coalesce(gestionado_por, '')) = '';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pqrs_observacion_gestion on public.pqrs_observaciones;
create trigger trg_pqrs_observacion_gestion
after insert on public.pqrs_observaciones
for each row execute function public.pqrs_observacion_gestion();

-- Comprobacion
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'pqrs_observaciones'
order by policyname;
