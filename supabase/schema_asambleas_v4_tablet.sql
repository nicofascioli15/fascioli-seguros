-- ============================================================================
-- Asambleas v4: TABLET SIN USUARIO
-- La tablet entra con un código propio de cada asamblea (ej: /t/7K3QX9) y SOLO puede
-- acreditar unidades y votar en ESA asamblea. No ve ni puede tocar nada más del sistema.
-- Todo pasa por estas 3 funciones, que controlan el código y el estado de la asamblea.
-- ============================================================================

-- Código de la tablet (6 caracteres, uno por asamblea)
alter table asambleas add column if not exists codigo_tablet text;
update asambleas set codigo_tablet = upper(substr(md5(random()::text || id::text), 1, 6)) where codigo_tablet is null;
alter table asambleas alter column codigo_tablet set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
create unique index if not exists asambleas_codigo_tablet_idx on asambleas(codigo_tablet);

-- La firma de la tablet se guarda en la base (imagen) y "firmo" para saberlo sin traer la imagen
alter table asamblea_unidades add column if not exists firma_data text;
alter table asamblea_unidades add column if not exists firmo boolean not null default false;
update asamblea_unidades set firmo = true where firma_path is not null and firmo = false;

-- 1) Estado para la tablet
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
        'por_poder', x.por_poder, 'apoderado', x.apoderado, 'coeficiente', x.coeficiente,
        'tel', case when x.por_poder then x.apoderado_tel else x.propietario_tel end))
      from asamblea_unidades x where x.asamblea_id = a.id), '[]'::jsonb),
    'votando', (select jsonb_build_object('id', m.id, 'titulo', m.titulo, 'descripcion', m.descripcion, 'mayoria', m.mayoria, 'base', m.base)
      from asamblea_mociones m where m.id = m_id),
    'votadas', coalesce((select jsonb_agg(v.unidad_id) from asamblea_votos v where v.mocion_id = m_id), '[]'::jsonb)
  );
end $$;

-- 2) Acreditarse (propietario presente o por poder) con firma
create or replace function asam_tablet_acreditar(p_codigo text, p_torre text, p_unidad text, p_nombre text, p_tel text, p_por_poder boolean, p_firma text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  u asam_unidades%rowtype;
  etiqueta text;
  nuevo uuid;
begin
  select * into a from asambleas where codigo_tablet = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  select * into u from asam_unidades where edificio_id = a.edificio_id and torre = coalesce(p_torre, '') and unidad = p_unidad;
  if not found then return jsonb_build_object('error', 'La unidad no está en el padrón del edificio'); end if;
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_tel), '') = '' then return jsonb_build_object('error', 'Faltan nombre o teléfono'); end if;
  if p_firma is null or length(p_firma) < 200 then return jsonb_build_object('error', 'Falta la firma'); end if;
  if length(p_firma) > 800000 then return jsonb_build_object('error', 'La firma es demasiado grande'); end if;
  etiqueta := case when u.torre <> '' then u.torre || '-' || u.unidad else u.unidad end;
  if exists (select 1 from asamblea_unidades where asamblea_id = a.id and unidad = etiqueta) then
    return jsonb_build_object('error', 'La unidad ' || etiqueta || ' ya está registrada');
  end if;
  insert into asamblea_unidades (asamblea_id, unidad, propietario, propietario_tel, coeficiente, por_poder, apoderado, apoderado_tel, firma_data, firmo)
  values (a.id, etiqueta,
          case when p_por_poder then null else trim(p_nombre) end,
          case when p_por_poder then null else trim(p_tel) end,
          u.coeficiente, coalesce(p_por_poder, false),
          case when p_por_poder then trim(p_nombre) else null end,
          case when p_por_poder then trim(p_tel) else null end,
          p_firma, true)
  returning id into nuevo;
  return jsonb_build_object('ok', true, 'id', nuevo, 'unidad', etiqueta);
end $$;

-- 3) Votar (una persona por todas sus unidades). p_votos = [{"unidad_id": "...", "voto": "si|no|abstencion"}]
create or replace function asam_tablet_votar(p_codigo text, p_mocion uuid, p_votos jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  v jsonb;
  n int := 0;
  total int := 0;
begin
  select * into a from asambleas where codigo_tablet = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  if not exists (select 1 from asamblea_mociones where id = p_mocion and asamblea_id = a.id and estado = 'votando') then
    return jsonb_build_object('error', 'La votación ya se cerró');
  end if;
  for v in select * from jsonb_array_elements(coalesce(p_votos, '[]'::jsonb)) loop
    total := total + 1;
    if (v->>'voto') not in ('si', 'no', 'abstencion') then continue; end if;
    if not exists (select 1 from asamblea_unidades where id = (v->>'unidad_id')::uuid and asamblea_id = a.id) then continue; end if;
    insert into asamblea_votos (mocion_id, unidad_id, voto) values (p_mocion, (v->>'unidad_id')::uuid, v->>'voto')
    on conflict (mocion_id, unidad_id) do nothing;
    if found then n := n + 1; end if;
  end loop;
  if n < total then return jsonb_build_object('ok', true, 'registrados', n, 'aviso', 'Alguna unidad ya había votado'); end if;
  return jsonb_build_object('ok', true, 'registrados', n);
end $$;

revoke all on function asam_tablet_estado(text) from public;
revoke all on function asam_tablet_acreditar(text, text, text, text, text, boolean, text) from public;
revoke all on function asam_tablet_votar(text, uuid, jsonb) from public;
grant execute on function asam_tablet_estado(text) to anon, authenticated;
grant execute on function asam_tablet_acreditar(text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function asam_tablet_votar(text, uuid, jsonb) to anon, authenticated;
