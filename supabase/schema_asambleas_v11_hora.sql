-- Asambleas v11: horario de segunda convocatoria (ya aplicado en Supabase)
alter table asambleas add column if not exists hora text;
