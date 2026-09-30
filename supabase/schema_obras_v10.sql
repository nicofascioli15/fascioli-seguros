-- Obras v10: varias cuentas bancarias por empresa (banco, moneda, número, titular).
alter table obras_empresas add column if not exists cuentas jsonb not null default '[]'::jsonb;

-- Pasa la cuenta que ya estaba cargada (banco / nro_cuenta / titular_cuenta) a la lista nueva, en pesos.
update obras_empresas
set cuentas = jsonb_build_array(jsonb_build_object(
  'banco', coalesce(banco, ''), 'moneda', '$', 'nro_cuenta', coalesce(nro_cuenta, ''), 'titular', coalesce(titular_cuenta, '')
))
where (coalesce(banco, '') <> '' or coalesce(nro_cuenta, '') <> '')
  and (cuentas is null or jsonb_array_length(cuentas) = 0);
