-- ---------------------------------------------------------------------------
-- Se elimina la funcion de cartera vencida.
--
-- QUE ERA:
-- public.cartera_clientes guardaba una lista de NIT con saldo vencido, que se
-- reemplazaba entera cada vez que se cargaba el CSV de cartera vencida. Al
-- cargar pedidos se cruzaba esa lista contra el NIT del pedido y, si el cliente
-- aparecia con vencidos, el pedido entraba como 'cartera_vencida' y quedaba
-- esperando una decision.
--
-- QUE CAMBIA:
-- Ese cruce desaparece. Al cargar, el pedido con plazo entra aprobado y el que
-- no trae plazo entra pendiente; nada lo frena por el saldo del cliente.
--
-- LO QUE NO SE TOCA:
-- El valor 'cartera_vencida' se queda en el check de pedidos_cartera y en las
-- etiquetas de la aplicacion. Quitarlo obligaria a reescribir los pedidos que
-- ya quedaron con ese estado, y esos son historia: se siguen viendo con su
-- nombre, solo que ya no se produce ninguno nuevo.
--
-- Ejecutar en el SQL Editor: primero PRUEBA, y luego PRODUCCION.
-- ---------------------------------------------------------------------------

-- Cuantos pedidos quedan con ese estado (informativo, no borra nada).
select count(*) as pedidos_con_estado_cartera_vencida
from public.pedidos_cartera
where estado_cartera = 'cartera_vencida';

-- Las politicas se van con la tabla, pero se nombran para dejar constancia.
drop policy if exists cartera_lectura                on public.cartera_clientes;
drop policy if exists cartera_escritura              on public.cartera_clientes;
drop policy if exists cartera_operador_vencida_insert on public.cartera_clientes;
drop policy if exists cartera_operador_vencida_delete on public.cartera_clientes;

drop table if exists public.cartera_clientes;
