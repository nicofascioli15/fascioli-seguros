-- Diagnóstico rápido: ¿los contratos de Ascensores siguen en la base?
select
  count(*) as total_ascensores,
  count(*) filter (where renovado is null)  as renovado_nulo,
  count(*) filter (where renovado = false)  as renovado_false,
  count(*) filter (where renovado = true)   as renovado_true,
  count(*) filter (where fecha_firma_original is null) as sin_firma_original
from contratos
where categoria = 'ascensor';
