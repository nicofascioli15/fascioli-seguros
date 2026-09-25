-- Obras v8: titular de la cuenta bancaria de la empresa (no siempre coincide con el nombre de la empresa).
alter table obras_empresas add column if not exists titular_cuenta text;
