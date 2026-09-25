-- Obras v7: banco y número de cuenta de cada empresa (para tenerlo a mano al pagar).
alter table obras_empresas add column if not exists banco text;
alter table obras_empresas add column if not exists nro_cuenta text;
alter table obras_empresas add column if not exists titular_cuenta text;
