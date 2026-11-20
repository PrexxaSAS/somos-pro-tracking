-- ---------------------------------------------------------------------------
-- Devolucion de pedidos desde logistica al asesor (su auxiliar).
--
-- EL FLUJO:
-- 1. Logistica (operador o admin) devuelve un pedido de cartera que aun no
--    salio (en Pedidos esta Sin asignar y sin conductor; puede estar impreso).
--    Escribe el motivo y marca los campos que la auxiliar podra corregir
--    (datos del plano y, si se marca, las cantidades de las referencias).
--    El pedido sale de Pedidos, libera su cupo en el corte y en cartera queda
--    en estado 'devuelto'. El correo llega al correo registrado del asesor,
--    que es el de su auxiliar.
-- 2. La auxiliar (usuario cliente interno, "auxiliar responsable" del asesor)
--    ve el pedido en "Pedidos devueltos", corrige SOLO los campos marcados y lo
--    reenvia.
-- 3. El reenvio repite el flujo del plano: con plazo queda aprobado y toma el
--    siguiente corte con cupo (la base crea de nuevo el pedido en Pedidos);
--    de contado queda pendiente para que cartera lo revise.
--
-- Correr en los dos proyectos ANTES de publicar la version que lo usa.
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

-- 1. Estado 'devuelto' y datos de la devolucion -----------------------------
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'pedidos_cartera'
      and con.contype = 'c' and pg_get_constraintdef(con.oid) ilike '%estado_cartera%'
  loop
    execute format('alter table public.pedidos_cartera drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.pedidos_cartera
  add constraint pedidos_cartera_estado_cartera_check
  check (estado_cartera in ('pendiente','preaprobado','cartera_vencida','aprobado','rechazado','devuelto'));

alter table public.pedidos_cartera
  add column if not exists campos_corregir  text[],
  add column if not exists fecha_devolucion timestamptz,
  add column if not exists devuelto_por     uuid references public.usuarios(id) on delete set null;

-- 2. Auxiliar responsable de cada asesor -------------------------------------
alter table public.asesores
  add column if not exists auxiliar_id uuid references public.usuarios(id) on delete set null;

-- El asesor que registra una auxiliar (cliente interno) queda a su cargo.
create or replace function public.asesor_auxiliar_por_defecto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auxiliar_id is null and public.current_user_role() = 'cliente' then
    select id into new.auxiliar_id from public.usuarios where auth_user_id = auth.uid() limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asesor_auxiliar on public.asesores;
create trigger trg_asesor_auxiliar
before insert on public.asesores
for each row execute function public.asesor_auxiliar_por_defecto();

-- Ayudas -----------------------------------------------------------------------
create or replace function public.usuario_actual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.usuarios where auth_user_id = auth.uid() limit 1
$$;

-- "01" y "1" son el mismo asesor: el plano a veces trae el codigo con ceros.
create or replace function public.codigo_asesor_normal(v text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(ltrim(btrim(coalesce(v, '')), '0'), ''), case when btrim(coalesce(v, '')) = '' then '' else '0' end)
$$;

-- 3. Asignacion de corte en la base --------------------------------------------
-- Las mismas reglas de crearAsignadorCortes (ModuloCartera.jsx): la sede por el
-- DANE origen, sus cortes por hora, desde hoy hasta 30 dias, saltando los cortes
-- cuya hora ya paso, y el primero abierto con cupo. Suma el cupo en el acto.
create or replace function public.asignar_corte_cartera(p_dane_origen text, out corte_id uuid, out fecha_corte timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sede   public.sedes%rowtype;
  v_cs     record;
  v_cp     public.cortes_programados%rowtype;
  v_hoy    date := (now() at time zone 'America/Bogota')::date;
  v_fecha  date;
  v_inicio timestamptz;
  d        integer;
begin
  corte_id := null; fecha_corte := null;
  if coalesce(btrim(p_dane_origen), '') = '' then return; end if;

  select * into v_sede from public.sedes
   where activa and lpad(btrim(coalesce(dane_code, '')), 5, '0') = lpad(btrim(p_dane_origen), 5, '0')
   limit 1;
  if not found then return; end if;

  for d in 0..29 loop
    v_fecha := v_hoy + d;
    for v_cs in select * from public.cortes_sede where sede_id = v_sede.id order by hora_corte loop
      v_inicio := (v_fecha + v_cs.hora_corte) at time zone 'America/Bogota';
      continue when v_inicio <= now();

      select * into v_cp from public.cortes_programados
       where sede_id = v_sede.id and corte_sede_id = v_cs.id and fecha = v_fecha
       for update;
      if not found then
        insert into public.cortes_programados (sede_id, corte_sede_id, fecha, hora_corte, capacidad_max, pedidos_asignados, estado)
        values (v_sede.id, v_cs.id, v_fecha, v_cs.hora_corte, coalesce(v_cs.capacidad_corte, 20), 0, 'abierto')
        on conflict (sede_id, corte_sede_id, fecha) do nothing;
        select * into v_cp from public.cortes_programados
         where sede_id = v_sede.id and corte_sede_id = v_cs.id and fecha = v_fecha
         for update;
      end if;

      if v_cp.estado = 'abierto' and coalesce(v_cp.pedidos_asignados, 0) < coalesce(v_cp.capacidad_max, 0) then
        update public.cortes_programados set pedidos_asignados = coalesce(pedidos_asignados, 0) + 1 where id = v_cp.id;
        corte_id := v_cp.id;
        fecha_corte := v_inicio;
        return;
      end if;
    end loop;
  end loop;
end;
$$;

-- 4. Logistica devuelve un pedido ----------------------------------------------
-- p_numero: el numero del pedido (pedidos.id = pedidos_cartera.numero_pedido).
-- Devuelve el id del pedido en cartera, para enviar el correo.
create or replace function public.devolver_pedido_logistica(p_numero text, p_motivo text, p_campos text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text := btrim(coalesce(p_numero, ''));
  v_ped    public.pedidos%rowtype;
  v_pc     public.pedidos_cartera%rowtype;
  v_campos text[];
begin
  if coalesce(public.current_user_role() not in ('admin', 'operador'), true) then
    raise exception 'Solo logistica puede devolver pedidos al asesor';
  end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Escribe el motivo de la devolucion';
  end if;
  select array_agg(distinct c) into v_campos
    from unnest(coalesce(p_campos, '{}')) c
   where c in ('cliente', 'nit', 'direccion', 'sector_dane', 'codigo_mensaje', 'observacion', 'cantidades');
  if coalesce(array_length(v_campos, 1), 0) = 0 then
    raise exception 'Marca al menos un campo para corregir';
  end if;

  select * into v_pc from public.pedidos_cartera where btrim(numero_pedido) = v_numero for update;
  if not found then
    raise exception 'El pedido % no viene de cartera: no se puede devolver al asesor', v_numero;
  end if;
  if v_pc.estado_cartera <> 'aprobado' then
    raise exception 'El pedido % no esta aprobado en cartera', v_numero;
  end if;

  select * into v_ped from public.pedidos where id = v_numero for update;
  if found then
    if v_ped.estado <> 'sin_asignar' or v_ped.conductor_id is not null then
      raise exception 'El pedido % ya tiene conductor o ya salio: no se puede devolver', v_numero;
    end if;
    delete from public.pedidos where id = v_numero;
  end if;

  if v_pc.corte_id is not null then
    update public.cortes_programados
       set pedidos_asignados = greatest(0, coalesce(pedidos_asignados, 0) - 1)
     where id = v_pc.corte_id;
  end if;

  update public.pedidos_cartera
     set estado_cartera   = 'devuelto',
         motivo_rechazo   = btrim(p_motivo),
         campos_corregir  = v_campos,
         fecha_devolucion = now(),
         devuelto_por     = public.usuario_actual_id(),
         corte_id         = null,
         fecha_corte      = null,
         estado_impresion = 'no_impreso',
         fecha_impresion  = null
   where id = v_pc.id;

  insert into public.historial_cartera (pedido_id, decision, usuario_id, motivo)
  values (v_pc.id, 'devuelto', public.usuario_actual_id(),
          btrim(p_motivo) || ' · Corregir: ' || array_to_string(v_campos, ', '));

  return v_pc.id;
end;
$$;

-- 5. Pedidos devueltos que ve cada quien -----------------------------------------
-- La auxiliar: los de los asesores a su cargo. Admin y operador: todos.
create or replace function public.mis_pedidos_devueltos()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(pc) || jsonb_build_object(
           'asesor_nombre', a.nombre,
           'lineas', coalesce((select jsonb_agg(to_jsonb(d) order by d.referencia)
                                 from public.pedidos_cartera_detalle d where d.pedido_id = pc.id), '[]'::jsonb))
    from public.pedidos_cartera pc
    left join public.asesores a
      on public.codigo_asesor_normal(a.codigo) = public.codigo_asesor_normal(pc.vendedor)
   where pc.estado_cartera = 'devuelto'
     and (
       public.current_user_role() in ('admin', 'operador')
       or (public.current_user_role() = 'cliente' and a.auxiliar_id = public.usuario_actual_id())
     )
   order by pc.fecha_devolucion desc nulls last
$$;

-- 6. La auxiliar corrige y reenvia ---------------------------------------------------
-- p_cambios: {"direccion": "...", ..., "lineas": [{"id": "...", "cantidad_pedida": 5}]}.
-- Solo se aplican los campos marcados. Las cantidades cambian el valor de cada
-- linea en proporcion (se conserva el precio que trajo el plano) y el total.
-- Devuelve {"estado": "aprobado"|"pendiente", "sin_corte": bool, "fecha_corte": ...}.
create or replace function public.reenviar_pedido_devuelto(p_id uuid, p_cambios jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pc      public.pedidos_cartera%rowtype;
  v_rol     text := public.current_user_role();
  v_usuario uuid := public.usuario_actual_id();
  v_ok      boolean;
  v_campo   text;
  v_corte_id    uuid;
  v_fecha_corte timestamptz;
  v_linea       jsonb;
  v_cant        integer;
  v_estado  text;
begin
  select * into v_pc from public.pedidos_cartera where id = p_id for update;
  if not found or v_pc.estado_cartera <> 'devuelto' then
    raise exception 'El pedido ya no esta devuelto';
  end if;

  v_ok := v_rol in ('admin', 'operador') or (
    v_rol = 'cliente' and exists (
      select 1 from public.asesores a
       where a.auxiliar_id = v_usuario
         and public.codigo_asesor_normal(a.codigo) = public.codigo_asesor_normal(v_pc.vendedor)));
  if not coalesce(v_ok, false) then
    raise exception 'Este pedido no es de un asesor a tu cargo';
  end if;

  -- Solo los campos marcados por logistica.
  foreach v_campo in array coalesce(v_pc.campos_corregir, '{}') loop
    continue when not (coalesce(p_cambios, '{}'::jsonb) ? v_campo);
    case v_campo
      when 'cliente'        then v_pc.cliente        := btrim(p_cambios->>'cliente');
      when 'nit'            then v_pc.nit            := btrim(p_cambios->>'nit');
      when 'direccion'      then v_pc.direccion      := btrim(p_cambios->>'direccion');
      when 'sector_dane'    then v_pc.sector_dane    := btrim(p_cambios->>'sector_dane');
      when 'codigo_mensaje' then v_pc.codigo_mensaje := btrim(p_cambios->>'codigo_mensaje');
      when 'observacion'    then v_pc.observacion    := btrim(p_cambios->>'observacion');
      else null;
    end case;
  end loop;

  if 'cantidades' = any(coalesce(v_pc.campos_corregir, '{}')) and jsonb_typeof(p_cambios->'lineas') = 'array' then
    for v_linea in select * from jsonb_array_elements(p_cambios->'lineas') loop
      begin
        v_cant := (v_linea->>'cantidad_pedida')::integer;
      exception when others then
        raise exception 'Cantidad no valida: %', v_linea->>'cantidad_pedida';
      end;
      if v_cant is null or v_cant < 0 then
        raise exception 'Las cantidades deben ser 0 o mas';
      end if;
      update public.pedidos_cartera_detalle
         set valor_total = case when coalesce(cantidad_pedida, 0) > 0
                                then round(coalesce(valor_total, 0) * v_cant / cantidad_pedida, 2)
                                else round(coalesce(precio, 0) * v_cant, 2) end,
             cantidad_pedida = v_cant
       where id = (v_linea->>'id')::uuid and pedido_id = v_pc.id;
    end loop;
    select coalesce(sum(valor_total), 0) into v_pc.valor_total
      from public.pedidos_cartera_detalle where pedido_id = v_pc.id;
  end if;

  update public.pedidos_cartera
     set valor_total = v_pc.valor_total,
         cliente = v_pc.cliente, nit = v_pc.nit, direccion = v_pc.direccion,
         sector_dane = v_pc.sector_dane, codigo_mensaje = v_pc.codigo_mensaje, observacion = v_pc.observacion,
         campos_corregir = null, motivo_rechazo = null
   where id = v_pc.id;

  insert into public.historial_cartera (pedido_id, decision, usuario_id, motivo)
  values (v_pc.id, 'reenviado', v_usuario, 'Corregido y reenviado');

  -- Como si se acabara de subir en el plano: con plazo, aprobado con corte; de
  -- contado, pendiente para cartera. Al pasar a aprobado, la base crea de nuevo
  -- el pedido en Pedidos (trg_cartera_crear_pedido).
  if coalesce(v_pc.plazo, 0) > 0 then
    select c.corte_id, c.fecha_corte into v_corte_id, v_fecha_corte from public.asignar_corte_cartera(v_pc.dane_origen) c;
    update public.pedidos_cartera
       set estado_cartera = 'aprobado', fecha_aprobacion = now(), aprobado_por = v_usuario,
           estado_impresion = 'no_impreso', corte_id = v_corte_id, fecha_corte = v_fecha_corte
     where id = v_pc.id;
    insert into public.historial_cartera (pedido_id, decision, usuario_id, motivo)
    values (v_pc.id, 'aprobado', v_usuario, 'Aprobado al reenviar: el pedido tiene plazo');
    v_estado := 'aprobado';
  else
    update public.pedidos_cartera set estado_cartera = 'pendiente' where id = v_pc.id;
    v_estado := 'pendiente';
  end if;

  return jsonb_build_object('estado', v_estado,
                            'sin_corte', v_estado = 'aprobado' and v_corte_id is null,
                            'fecha_corte', v_fecha_corte);
end;
$$;

revoke all on function public.asignar_corte_cartera(text) from public, anon, authenticated;
revoke all on function public.devolver_pedido_logistica(text, text, text[]) from public, anon;
revoke all on function public.mis_pedidos_devueltos() from public, anon;
revoke all on function public.reenviar_pedido_devuelto(uuid, jsonb) from public, anon;
grant execute on function public.devolver_pedido_logistica(text, text, text[]) to authenticated;
grant execute on function public.mis_pedidos_devueltos() to authenticated;
grant execute on function public.reenviar_pedido_devuelto(uuid, jsonb) to authenticated;

-- Comprobacion
select proname from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('asignar_corte_cartera','devolver_pedido_logistica','mis_pedidos_devueltos','reenviar_pedido_devuelto','usuario_actual_id')
 order by proname;
