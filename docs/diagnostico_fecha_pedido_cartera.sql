-- ---------------------------------------------------------------------------
-- Por que un pedido aprobado por cartera sale en Pedidos sin fecha ni hora.
--
-- La fecha y la hora del pedido son las de su CORTE (trg_cartera_crear_pedido,
-- docs/cartera_a_pedidos.sql). Si el pedido se aprobo sin corte, nacen vacias.
-- Un aprobado queda sin corte cuando:
--   a) no hay una sede ACTIVA con el DANE origen del pedido;
--   b) la sede existe pero no tiene cortes configurados;
--   c) quien cargo o aprobo no puede leer sedes / cortes_sede (permisos), y la
--      asignacion no encuentra ninguna sede aunque exista.
--   d) la base tiene una version vieja de trg_cartera_crear_pedido.
--
-- Solo lectura. Correr en el proyecto donde se ve el problema (staging).
-- ---------------------------------------------------------------------------

-- 1. Los ultimos aprobados: su DANE origen, su corte y lo que quedo en Pedidos.
--    corte_id vacio = se aprobo sin corte (ver 2 y 3).
select pc.numero_pedido, pc.dane_origen, pc.corte_id, pc.fecha_corte,
       p.fecha_pedido, p.hora_pedido
from public.pedidos_cartera pc
left join public.pedidos p on p.id = pc.numero_pedido
where pc.estado_cartera = 'aprobado'
order by pc.created_at desc
limit 20;

-- 2. Por DANE origen de los aprobados sin corte: hay sede? esta activa? tiene cortes?
select lpad(left(regexp_replace(coalesce(pc.dane_origen,''), '[^0-9]', '', 'g'), 5), 5, '0') as dane_origen,
       count(*)                                    as aprobados_sin_corte,
       s.nombre                                    as sede,
       s.activa,
       (select count(*) from public.cortes_sede c where c.sede_id = s.id) as cortes
from public.pedidos_cartera pc
left join public.sedes s
  on lpad(btrim(coalesce(s.dane_code,'')), 5, '0')
   = lpad(left(regexp_replace(coalesce(pc.dane_origen,''), '[^0-9]', '', 'g'), 5), 5, '0')
where pc.estado_cartera = 'aprobado' and pc.corte_id is null
group by 1, s.id, s.nombre, s.activa
order by 2 desc;
--    sede vacia        -> caso a: crear la sede con ese DANE (o corregir su DANE).
--    activa = false    -> caso a: activarla.
--    cortes = 0        -> caso b: agregarle cortes.
--    todo bien aqui    -> caso c o d: mira 3 y 4.

-- 3. Quien puede leer sedes y cortes_sede (politicas de seguridad).
--    El rol que carga (cartera, operador o admin) debe aparecer con SELECT en las dos.
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename in ('sedes', 'cortes_sede', 'cortes_programados')
order by tablename, cmd;

-- 4. La version del trigger: debe tomar la fecha y hora del corte.
--    true = version actual; false = correr de nuevo docs/cartera_a_pedidos.sql.
select pg_get_functiondef('public.cartera_crear_pedido'::regproc) like '%cuando := new.fecha_corte%' as version_actual;
