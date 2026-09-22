-- FASCIOLI — Módulo Obras v3: método de pago en cada pago (igual que las cuotas de Seguros)
alter table obras_pagos add column if not exists metodo text;
