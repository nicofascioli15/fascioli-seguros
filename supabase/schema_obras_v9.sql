-- Obras v9: nuevo tipo de pago "Pago total" (un solo pago por el total, sin cuotas).
alter table obras_pagos drop constraint if exists obras_pagos_tipo_check;
alter table obras_pagos add constraint obras_pagos_tipo_check
  check (tipo in ('entrega_inicial','avance','cuota','final','total','otro'));
