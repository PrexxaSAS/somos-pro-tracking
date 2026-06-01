-- Ejecutar en Supabase SQL Editor del proyecto de STAGING:
-- somos-pro-tracking-prueba
--
-- Crea la estructura real inferida desde produccion, sin datos reales.
-- Nota: RLS queda desactivado inicialmente para validar funcionamiento base.
-- Luego se activara y probara tabla por tabla en staging.

create extension if not exists pgcrypto;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  "user" text not null unique,
  pass text not null,
  rol text not null default 'operador',
  nit text,
  empresa text,
  cedula text,
  placa text,
  celular text,
  nit_proveedor text,
  created_at timestamptz default now(),
  conductor_id uuid
);

create table if not exists public.ciudades (
  code text primary key,
  name text not null
);

create table if not exists public.transportistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text not null unique,
  contacto text,
  tel text,
  usuario_id uuid references public.usuarios(id),
  created_at timestamptz default now()
);

create table if not exists public.conductores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cedula text,
  placa text,
  celular text,
  nit_proveedor text,
  empresa text,
  activo boolean not null default true,
  usuario_id uuid references public.usuarios(id),
  created_at timestamptz default now()
);

create table if not exists public.paqueterias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table if not exists public.pedidos (
  id text primary key,
  guia_interna text,
  cliente text not null,
  ciudad_codigo text,
  ciudad_nombre text,
  direccion text,
  cajas integer default 0,
  factura text,
  conductor_id uuid references public.conductores(id),
  placa text,
  nit_proveedor text,
  estado text default 'sin_asignar',
  estado_despacho text default 'despachado',
  novedad boolean default false,
  fecha_creacion date default current_date,
  fecha_estimada date,
  fecha_real date,
  tipo text default 'propio',
  empresa_transporte text,
  paqueteria text,
  guia_paqueteria text,
  soportes text[] default '{}',
  soportes_data jsonb default '[]'::jsonb,
  notas text,
  ciudad_origen_codigo text,
  ciudad_origen_nombre text,
  direccion_origen text,
  created_at timestamptz default now()
);

create table if not exists public.devoluciones (
  id text primary key,
  guia text not null,
  factura text not null,
  pedido_ref text not null,
  unidades integer default 0,
  volumen_m3 numeric,
  peso_kg numeric,
  dir_recogida text,
  ciudad_codigo text,
  ciudad_nombre text,
  motivo text,
  conductor_id uuid,
  placa text,
  nit_proveedor text,
  estado text default 'sin_asignar',
  novedad boolean default false,
  paqueteria text,
  guia_paqueteria text,
  soporte_data text,
  soporte_nombre text,
  fecha_creacion date default current_date,
  fecha_real date,
  solicitado_por text,
  created_at timestamptz default now()
);

create table if not exists public.recogidas (
  id text primary key,
  guia text not null,
  dir_recogida text,
  ciudad_recogida_cod text,
  ciudad_recogida_nombre text,
  dir_entrega text,
  ciudad_entrega_cod text,
  ciudad_entrega_nombre text,
  unidades integer default 0,
  volumen_m3 numeric,
  peso_kg numeric,
  observaciones text,
  conductor_id uuid,
  placa text,
  nit_proveedor text,
  estado text default 'sin_asignar',
  novedad boolean default false,
  paqueteria text,
  guia_paqueteria text,
  doc_data text,
  doc_nombre text,
  fecha_creacion date default current_date,
  fecha_real date,
  solicitado_por text,
  created_at timestamptz default now()
);

create table if not exists public.pqrs (
  id text primary key,
  factura text not null,
  pedido_ref text not null,
  motivo text not null,
  descripcion text,
  estado text default 'abierta',
  solicitado_por text,
  gestionado_por text,
  respuesta text,
  fecha_creacion date default current_date,
  fecha_gestion date,
  created_at timestamptz default now()
);

create table if not exists public.facturas_proveedor (
  id uuid primary key default gen_random_uuid(),
  numero_factura text not null,
  transportista_id uuid references public.transportistas(id),
  fecha_factura date not null,
  valor_total numeric not null default 0,
  observaciones text,
  created_at timestamptz default now()
);

create table if not exists public.factura_guias (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid references public.facturas_proveedor(id) on delete cascade,
  pedido_id text references public.pedidos(id),
  created_at timestamptz default now()
);

create table if not exists public.transportadoras (
  id uuid primary key default gen_random_uuid(),
  nit text not null unique,
  razon_social text not null,
  created_at timestamptz default now()
);

-- Tabla usada por el codigo, aunque no aparecio en el export de produccion.
create table if not exists public.promesas_servicio (
  ciudad_codigo text primary key references public.ciudades(code),
  dias_plazo integer not null default 2,
  created_at timestamptz default now()
);
