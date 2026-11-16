-- Contactos: ocultar un contacto de la lista/exportación sin tocar las actas ni la asistencia
alter table asamblea_unidades add column if not exists excluir_contacto boolean not null default false;
