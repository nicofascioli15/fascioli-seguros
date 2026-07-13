-- ================================================
-- FASCIOLI — Módulo Mantenimiento (tanques de agua y extintores)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- CLIENTES DE MANTENIMIENTO (edificios)
create table if not exists mant_clientes (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null,
  direccion   text,
  contacto    text,
  tel         text,
  email       text,
  created_at  timestamp with time zone default now()
);

-- EXTINTORES
create table if not exists mant_extintores (
  id            uuid default gen_random_uuid() primary key,
  cliente_id    uuid references mant_clientes(id) on delete cascade,
  vencimiento   date,
  empresa       text,
  estado        text default 'Sin gestión',
  comentarios   text,
  reclamos      text,
  created_at    timestamp with time zone default now()
);

-- TANQUES DE AGUA
create table if not exists mant_tanques (
  id            uuid default gen_random_uuid() primary key,
  cliente_id    uuid references mant_clientes(id) on delete cascade,
  vencimiento   date,
  empresa       text,
  estado        text default 'Sin gestión',
  comentarios   text,
  reclamos      text,
  created_at    timestamp with time zone default now()
);

create index if not exists idx_mant_extintores_cliente on mant_extintores(cliente_id);
create index if not exists idx_mant_tanques_cliente     on mant_tanques(cliente_id);

-- ── RLS — solo usuarios autenticados ─────────────────────────────────────────
alter table mant_clientes   enable row level security;
alter table mant_extintores enable row level security;
alter table mant_tanques    enable row level security;

create policy "auth_all" on mant_clientes   for all using (auth.role() = 'authenticated');
create policy "auth_all" on mant_extintores for all using (auth.role() = 'authenticated');
create policy "auth_all" on mant_tanques    for all using (auth.role() = 'authenticated');
