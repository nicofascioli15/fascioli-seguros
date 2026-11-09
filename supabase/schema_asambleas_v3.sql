-- Asambleas v3: firma en la tablet (libro de asistencia) y padrón sin nombres de propietarios.
alter table asamblea_unidades add column if not exists firma_path text;

-- Los nombres de propietarios del padrón pueden estar desactualizados: se borran.
-- En la asamblea cada persona escribe sus datos al registrarse.
update asam_unidades set propietario = null, propietario_tel = null, propietario_email = null
where propietario is not null or propietario_tel is not null or propietario_email is not null;
