-- ================================================
-- FASCIOLI — Módulo Obras
-- Trabajos puntuales en los edificios (pintura de fachada, rejas, impermeabilización...)
-- con contrato, plan de pagos (entrega inicial + avance + cuotas), leyes sociales con
-- tope contractual, garantía post-obra y cierre de obra ante BPS (ex formulario F9).
--
-- Usa los MISMOS edificios que Mantenimiento y Contratos (mant_clientes): si se crea
-- o elimina un edificio en cualquier módulo, se refleja en todos.
-- Ejecutar completo en SQL Editor de Supabase.
-- ================================================

-- CATÁLOGO DE EMPRESAS CONTRATISTAS (propio de Obras)
create table if not exists obras_empresas (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null unique,
  rut         text,
  contacto    text,
  tel         text,
  email       text,
  created_at  timestamp with time zone default now()
);

-- OBRAS
create table if not exists obras (
  id                    uuid default gen_random_uuid() primary key,
  cliente_id            uuid not null references mant_clientes(id) on delete cascade,
  titulo                text not null,
  descripcion           text,
  empresa               text,

  -- Régimen BPS (Ley 14.411)
  --  'contrato'       -> el edificio contrata a una empresa
  --  'administracion' -> el edificio contrata y administra directamente al personal
  --  'menor_cuantia'  -> hasta 85 jornales, sin permiso de construcción; la obra queda a nombre del contratista
  tipo_obra             text not null default 'contrato' check (tipo_obra in ('contrato','administracion','menor_cuantia')),
  titular_bps           text not null default 'edificio' check (titular_bps in ('edificio','empresa')),
  nro_obra_bps          text,
  fecha_inscripcion_bps date,

  -- Contrato y pagos a la empresa (pesos o dólares, según el contrato)
  moneda                text not null default 'UYU' check (moneda in ('UYU','USD')),
  precio_total          numeric,
  fecha_contrato        date,
  fecha_inicio          date,
  fecha_fin_prevista    date,
  fecha_fin_real        date,
  avance                integer not null default 0 check (avance between 0 and 100),
  estado                text not null default 'Presupuestada'
                          check (estado in ('Presupuestada','Contratada','En ejecución','Finalizada','Cancelada')),

  -- Leyes sociales: siempre en pesos. Tope máximo que asume el edificio según contrato
  -- (lo que se facture por encima lo absorbe la empresa).
  tope_leyes            numeric,

  -- Garantía post-obra (se cuenta desde la fecha de fin real)
  garantia_meses        integer not null default 12,

  -- Cierre de obra ante BPS (ex F9): hay 30 días corridos desde el fin de los trabajos
  cierre_bps_estado     text not null default 'Pendiente'
                          check (cierre_bps_estado in ('No aplica','Pendiente','Presentado','Aprobado')),
  cierre_bps_fecha      date,

  nota                  text,
  created_at            timestamp with time zone default now()
);
create index if not exists idx_obras_cliente on obras(cliente_id);

-- PLAN DE PAGOS a la empresa: entrega inicial, pagos por avance, cuotas, pago final...
create table if not exists obras_pagos (
  id             uuid default gen_random_uuid() primary key,
  obra_id        uuid not null references obras(id) on delete cascade,
  orden          integer not null default 0,
  concepto       text not null,
  tipo           text not null default 'cuota' check (tipo in ('entrega_inicial','avance','cuota','final','otro')),
  porcentaje     numeric,
  monto          numeric not null default 0,
  fecha_prevista date,
  condicion      text,
  pagado         boolean not null default false,
  fecha_pago     date,
  comprobante    text,
  created_at     timestamp with time zone default now()
);
create index if not exists idx_obras_pagos_obra on obras_pagos(obra_id);

-- LEYES SOCIALES facturadas (BPS / empresa), en pesos, por período
create table if not exists obras_leyes (
  id           uuid default gen_random_uuid() primary key,
  obra_id      uuid not null references obras(id) on delete cascade,
  periodo      date not null,
  monto        numeric not null default 0,
  pagado       boolean not null default false,
  fecha_pago   date,
  comprobante  text,
  nota         text,
  created_at   timestamp with time zone default now()
);
create index if not exists idx_obras_leyes_obra on obras_leyes(obra_id);

-- DOCUMENTOS (contrato, presupuesto, facturas, planillas BPS, constancia de cierre, fotos...)
create table if not exists obras_documentos (
  id            uuid default gen_random_uuid() primary key,
  obra_id       uuid not null references obras(id) on delete cascade,
  nombre        text not null,
  tipo          text,
  storage_path  text not null,
  tamanio_bytes bigint,
  created_at    timestamp with time zone default now()
);
create index if not exists idx_obras_documentos_obra on obras_documentos(obra_id);

-- BITÁCORA DE COMENTARIOS / NOVEDADES
create table if not exists obras_comentarios (
  id          uuid default gen_random_uuid() primary key,
  obra_id     uuid not null references obras(id) on delete cascade,
  fecha       date not null default current_date,
  texto       text not null,
  created_at  timestamp with time zone default now()
);
create index if not exists idx_obras_comentarios_obra on obras_comentarios(obra_id);

-- ── RLS — solo usuarios autenticados (igual que el resto de los módulos) ──────
alter table obras_empresas    enable row level security;
alter table obras             enable row level security;
alter table obras_pagos       enable row level security;
alter table obras_leyes       enable row level security;
alter table obras_documentos  enable row level security;
alter table obras_comentarios enable row level security;

-- (drop + create: así el script se puede volver a correr sin error)
drop policy if exists "auth_all" on obras_empresas;
drop policy if exists "auth_all" on obras;
drop policy if exists "auth_all" on obras_pagos;
drop policy if exists "auth_all" on obras_leyes;
drop policy if exists "auth_all" on obras_documentos;
drop policy if exists "auth_all" on obras_comentarios;

create policy "auth_all" on obras_empresas    for all using (auth.role() = 'authenticated');
create policy "auth_all" on obras             for all using (auth.role() = 'authenticated');
create policy "auth_all" on obras_pagos       for all using (auth.role() = 'authenticated');
create policy "auth_all" on obras_leyes       for all using (auth.role() = 'authenticated');
create policy "auth_all" on obras_documentos  for all using (auth.role() = 'authenticated');
create policy "auth_all" on obras_comentarios for all using (auth.role() = 'authenticated');

-- ── Asistente IA: historial separado por módulo ──────────────────────────────
-- 'modulo' separa la conversación de Seguros de la de Obras.
-- El default de usuario_id arregla que los mensajes no se guardaban (la app
-- insertaba sin usuario_id y la columna es obligatoria).
alter table asistente_mensajes add column if not exists modulo text not null default 'seguros';
alter table asistente_mensajes alter column usuario_id set default auth.uid();
create index if not exists asistente_mensajes_modulo_idx on asistente_mensajes (usuario_id, modulo, created_at);
