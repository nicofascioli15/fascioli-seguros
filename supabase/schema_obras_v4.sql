-- FASCIOLI — Módulo Obras v4: método de pago en las leyes sociales (igual que las cuotas)
alter table obras_leyes add column if not exists metodo text;
