-- Obras v6: comprobantes adjuntos a cada cuota y a cada mes de leyes sociales.
-- Si se borra la cuota o el mes, el archivo no se pierde: queda en Documentos de la obra.
alter table obras_documentos add column if not exists pago_id uuid references obras_pagos(id) on delete set null;
alter table obras_documentos add column if not exists ley_id  uuid references obras_leyes(id) on delete set null;
create index if not exists obras_documentos_pago_idx on obras_documentos(pago_id);
create index if not exists obras_documentos_ley_idx  on obras_documentos(ley_id);
