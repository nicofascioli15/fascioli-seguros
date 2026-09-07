-- ================================================
-- Historial del Asistente Virtual
-- Ejecutar en el SQL Editor de Supabase
-- ================================================

create table if not exists asistente_mensajes (
  id          uuid default gen_random_uuid() primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  texto       text not null,
  documentos  jsonb,
  created_at  timestamp with time zone default now()
);

create index if not exists asistente_mensajes_usuario_idx on asistente_mensajes (usuario_id, created_at);

alter table asistente_mensajes enable row level security;

-- Cada usuario solo puede ver y modificar sus propios mensajes del asistente
-- (el historial de uno no se mezcla ni se comparte con el de otro empleado).
create policy "asistente_mensajes_propios" on asistente_mensajes
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
