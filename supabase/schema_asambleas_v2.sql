-- Asambleas v2: teléfono de quien se acredita (propietario presente o apoderado), para el autorregistro en la tablet.
alter table asamblea_unidades add column if not exists propietario_tel text;
alter table asamblea_unidades add column if not exists apoderado_tel text;
