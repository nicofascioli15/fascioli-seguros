-- ============================================================================
-- Asambleas v6: REGISTRO DESDE EL CELULAR (propietario presente)
--  · Con el QR de la sala, el propietario que todavía no se registró puede registrarse
--    él mismo (apto, datos y firma con el dedo). Solo como PROPIETARIO PRESENTE:
--    los poderes se registran en la tablet con la administración.
--  · Si no está registrado, no puede votar.
-- ============================================================================

-- Estado del celular: suma el padrón (solo números de unidad) y cuáles ya están registradas
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
    'resultados', asam_resultados(a.id),
    'padron', coalesce((select jsonb_agg(jsonb_build_object('torre', u.torre, 'unidad', u.unidad))
      from asam_unidades u where u.edificio_id = a.edificio_id), '[]'::jsonb),
    'torres', coalesce((select jsonb_agg(jsonb_build_object('codigo', t.codigo, 'nombre', t.nombre))
      from asam_torres t where t.edificio_id = a.edificio_id), '[]'::jsonb),
    'registradas', coalesce((select jsonb_agg(x.unidad) from asamblea_unidades x where x.asamblea_id = a.id), '[]'::jsonb)
  );
end $$;

-- Registrarse desde el celular como propietario presente (queda vinculado a ese celular)
create or replace function asam_cel_acreditar(p_codigo text, p_torre text, p_unidad text, p_nombre text, p_tel text, p_firma text, p_dispositivo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  u asam_unidades%rowtype;
  etiqueta text;
  nuevo uuid;
begin
  select * into a from asambleas where codigo_sala = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  if coalesce(length(p_dispositivo), 0) < 16 then return jsonb_build_object('error', 'Dispositivo no válido'); end if;
  select * into u from asam_unidades where edificio_id = a.edificio_id and torre = coalesce(p_torre, '') and unidad = p_unidad;
  if not found then return jsonb_build_object('error', 'La unidad no está en el padrón del edificio'); end if;
  if coalesce(trim(p_nombre), '') = '' or length(regexp_replace(coalesce(p_tel, ''), '\D', '', 'g')) < 6 then
    return jsonb_build_object('error', 'Faltan nombre o teléfono');
  end if;
  if p_firma is null or length(p_firma) < 200 then return jsonb_build_object('error', 'Falta la firma'); end if;
  if length(p_firma) > 800000 then return jsonb_build_object('error', 'La firma es demasiado grande'); end if;
  etiqueta := case when u.torre <> '' then u.torre || '-' || u.unidad else u.unidad end;
  if exists (select 1 from asamblea_unidades where asamblea_id = a.id and unidad = etiqueta) then
    return jsonb_build_object('error', 'La unidad ' || etiqueta || ' ya está registrada. Si es un error, avisale a la administración.');
  end if;
  insert into asamblea_unidades (asamblea_id, unidad, propietario, propietario_tel, coeficiente, por_poder, firma_data, firmo, dispositivo)
  values (a.id, etiqueta, trim(p_nombre), trim(p_tel), u.coeficiente, false, p_firma, true, p_dispositivo)
  returning id into nuevo;
  return jsonb_build_object('ok', true, 'id', nuevo, 'unidad', etiqueta);
end $$;

revoke all on function asam_cel_acreditar(text, text, text, text, text, text, text) from public;
grant execute on function asam_cel_estado(text, text) to anon, authenticated;
grant execute on function asam_cel_acreditar(text, text, text, text, text, text, text) to anon, authenticated;
