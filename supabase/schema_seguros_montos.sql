-- Seguros: monto de cada cuota de la póliza y monto efectivamente cobrado en cada pago.
alter table polizas add column if not exists monto_cuota numeric;
alter table pagos   add column if not exists monto numeric;
