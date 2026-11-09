-- ============================================================================
-- Asambleas v5: VOTACIÓN DESDE EL CELULAR (QR de la sala) + resultados a la vista
--  · Cada asamblea tiene un QR de sala (/v/CODIGO). El propietario lo escanea, pone el teléfono
--    con el que se registró en la tablet y queda vinculado a SUS unidades (y las que trae con poder).
--  · Ve todas las mociones como una sesión: la que se está votando y los resultados de las cerradas.
--  · El código de sala NO sirve para acreditar: eso solo se hace con la tablet (otro código).
-- ============================================================================

alter table asambleas add column if not exists codigo_sala text;
update asambleas set codigo_sala = upper(substr(md5(random()::text || id::text || 'sala'), 1, 6)) where codigo_sala is null;
alter table asambleas alter column codigo_sala set default upper(substr(md5(random()::text || clock_timestamp()::text || 'sala'), 1, 6));
create unique index if not exists asambleas_codigo_sala_idx on asambleas(codigo_sala);

-- Celular vinculado a cada unidad acreditada
alter table asamblea_unidades add column if not exists dispositivo text;

-- Resultados de las mociones de una asamblea (cantidad de unidades y coeficiente por voto)
create or replace function asam_resultados(p_asamblea uuid) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by (r->>'orden')::int, r->>'creada'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', m.id, 'orden', m.orden, 'creada', m.created_at, 'titulo', m.titulo, 'descripcion', m.descripcion,
      'mayoria', m.mayoria, 'base', m.base, 'estado', m.estado, 'aprobada', m.aprobada,
      'si', count(*) filter (where v.voto = 'si'),
      'no', count(*) filter (where v.voto = 'no'),
      'abstencion', count(*) filter (where v.voto = 'abstencion'),
      'si_coef', coalesce(sum(u.coeficiente) filter (where v.voto = 'si'), 0),
      'no_coef', coalesce(sum(u.coeficiente) filter (where v.voto = 'no'), 0),
      'abstencion_coef', coalesce(sum(u.coeficiente) filter (where v.voto = 'abstencion'), 0),
      'acreditadas', (select count(*) from asamblea_unidades x where x.asamblea_id = m.asamblea_id)
    ) as r
    from asamblea_mociones m
    left join asamblea_votos v on v.mocion_id = m.id
    left join asamblea_unidades u on u.id = v.unidad_id
    where m.asamblea_id = p_asamblea
    group by m.id
  ) t;
$$;

-- La tablet: ya no expone teléfonos y suma los resultados de las votaciones cerradas
create or replace function asam_tablet_estado(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  m_id uuid;
begin
  select * into a from asambleas where codigo_tablet = upper(trim(p_codigo));
  if not found then return null; end if;
  select id into m_id from asamblea_mociones where asamblea_id = a.id and estado = 'votando' order by orden, created_at limit 1;
  return jsonb_build_object(
    'asamblea', jsonb_build_object('id', a.id, 'edificio', (select nombre from asam_edificios where id = a.edificio_id),
      'fecha', a.fecha, 'tipo', a.tipo, 'estado', a.estado, 'modo_conteo', a.modo_conteo, 'total_unidades', a.total_unidades),
    'padron', coalesce((select jsonb_agg(jsonb_build_object('torre', u.torre, 'unidad', u.unidad, 'coeficiente', u.coeficiente))
      from asam_unidades u where u.edificio_id = a.edificio_id), '[]'::jsonb),
    'torres', coalesce((select jsonb_agg(jsonb_build_object('codigo', t.codigo, 'nombre', t.nombre))
      from asam_torres t where t.edificio_id = a.edificio_id), '[]'::jsonb),
    'acreditadas', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'unidad', x.unidad, 'propietario', x.propietario,
        'por_poder', x.por_poder, 'apoderado', x.apoderado, 'coeficiente', x.coeficiente))
      from asamblea_unidades x where x.asamblea_id = a.id), '[]'::jsonb),
    'votando', (select jsonb_build_object('id', m.id, 'titulo', m.titulo, 'descripcion', m.descripcion, 'mayoria', m.mayoria, 'base', m.base)
      from asamblea_mociones m where m.id = m_id),
    'votadas', coalesce((select jsonb_agg(v.unidad_id) from asamblea_votos v where v.mocion_id = m_id), '[]'::jsonb),
    'resultados', asam_resultados(a.id)
  );
end $$;

-- Celular 1) entrar con el teléfono con el que se registró en la tablet
create or replace function asam_cel_ingresar(p_codigo text, p_tel text, p_dispositivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  tel text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
  n int;
begin
  select * into a from asambleas where codigo_sala = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  if length(tel) < 6 or coalesce(length(p_dispositivo), 0) < 16 then return jsonb_build_object('error', 'Poné tu teléfono'); end if;
  update asamblea_unidades x set dispositivo = p_dispositivo
  where x.asamblea_id = a.id
    and right(regexp_replace(coalesce(case when x.por_poder then x.apoderado_tel else x.propietario_tel end, ''), '\D', '', 'g'), 8) = right(tel, 8);
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('error', 'No encontramos unidades registradas con ese teléfono. Primero registrate en la tablet con la administración.'); end if;
  return jsonb_build_object('ok', true, 'unidades', n);
end $$;

-- Celular 2) estado de la sesión: mis unidades, la moción en votación y los resultados
create or replace function asam_cel_estado(p_codigo text, p_dispositivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  m_id uuid;
begin
  select * into a from asambleas where codigo_sala = upper(trim(p_codigo));
  if not found then return null; end if;
  select id into m_id from asamblea_mociones where asamblea_id = a.id and estado = 'votando' order by orden, created_at limit 1;
  return jsonb_build_object(
    'asamblea', jsonb_build_object('id', a.id, 'edificio', (select nombre from asam_edificios where id = a.edificio_id),
      'fecha', a.fecha, 'tipo', a.tipo, 'estado', a.estado, 'modo_conteo', a.modo_conteo),
    'mis_unidades', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'unidad', x.unidad, 'por_poder', x.por_poder,
        'nombre', case when x.por_poder then x.apoderado else x.propietario end,
        'voto', (select v.voto from asamblea_votos v where v.mocion_id = m_id and v.unidad_id = x.id)) order by x.unidad)
      from asamblea_unidades x where x.asamblea_id = a.id and p_dispositivo is not null and x.dispositivo = p_dispositivo), '[]'::jsonb),
    'votando', (select jsonb_build_object('id', m.id, 'titulo', m.titulo, 'descripcion', m.descripcion, 'mayoria', m.mayoria, 'base', m.base)
      from asamblea_mociones m where m.id = m_id),
    'resultados', asam_resultados(a.id)
  );
end $$;

-- Celular 3) votar por mis unidades
create or replace function asam_cel_votar(p_codigo text, p_dispositivo text, p_mocion uuid, p_votos jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  v jsonb;
  n int := 0;
  total int := 0;
begin
  select * into a from asambleas where codigo_sala = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  if not exists (select 1 from asamblea_mociones where id = p_mocion and asamblea_id = a.id and estado = 'votando') then
    return jsonb_build_object('error', 'La votación ya se cerró');
  end if;
  for v in select * from jsonb_array_elements(coalesce(p_votos, '[]'::jsonb)) loop
    total := total + 1;
    if (v->>'voto') not in ('si', 'no', 'abstencion') then continue; end if;
    if not exists (select 1 from asamblea_unidades where id = (v->>'unidad_id')::uuid and asamblea_id = a.id
                   and dispositivo is not null and dispositivo = p_dispositivo) then continue; end if;
    insert into asamblea_votos (mocion_id, unidad_id, voto) values (p_mocion, (v->>'unidad_id')::uuid, v->>'voto')
    on conflict (mocion_id, unidad_id) do nothing;
    if found then n := n + 1; end if;
  end loop;
  if n = 0 then return jsonb_build_object('error', 'No se registró ningún voto (¿ya habías votado?)'); end if;
  return jsonb_build_object('ok', true, 'registrados', n);
end $$;

revoke all on function asam_resultados(uuid) from public;
revoke all on function asam_cel_ingresar(text, text, text) from public;
revoke all on function asam_cel_estado(text, text) from public;
revoke all on function asam_cel_votar(text, text, uuid, jsonb) from public;
grant execute on function asam_resultados(uuid) to authenticated;
grant execute on function asam_tablet_estado(text) to anon, authenticated;
grant execute on function asam_cel_ingresar(text, text, text) to anon, authenticated;
grant execute on function asam_cel_estado(text, text) to anon, authenticated;
grant execute on function asam_cel_votar(text, text, uuid, jsonb) to anon, authenticated;
