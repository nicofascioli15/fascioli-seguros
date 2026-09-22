-- FASCIOLI — Módulo Obras v5: quién hace el cierre (F9), separado de a nombre de quién está la obra
alter table obras add column if not exists cierre_responsable text;
alter table obras drop constraint if exists obras_cierre_responsable_check;
alter table obras add constraint obras_cierre_responsable_check check (cierre_responsable in ('edificio','empresa'));
