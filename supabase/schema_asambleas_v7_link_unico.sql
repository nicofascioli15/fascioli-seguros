-- ============================================================================
-- Asambleas v7: UN SOLO LINK / QR para todo (registrarse, con poder o no, y votar)
-- Mientras la asamblea está abierta. Sirve igual en el celular de cada uno o en una tablet
-- que se pasa de mano en mano.
-- ============================================================================

drop function if exists asam_cel_acreditar(text, text, text, text, text, text, text);

create or replace function asam_cel_acreditar(p_codigo text, p_torre text, p_unidad text, p_nombre text, p_tel text, p_firma text, p_dispositivo text, p_por_poder boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  u asam_unidades%rowtype;
  etiqueta text;
  nuevo uuid;
  poder boolean := coalesce(p_por_poder, false);
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
  insert into asamblea_unidades (asamblea_id, unidad, propietario, propietario_tel, coeficiente, por_poder, apoderado, apoderado_tel, firma_data, firmo, dispositivo)
  values (a.id, etiqueta,
          case when poder then null else trim(p_nombre) end,
          case when poder then null else trim(p_tel) end,
          u.coeficiente, poder,
          case when poder then trim(p_nombre) else null end,
          case when poder then trim(p_tel) else null end,
          p_firma, true, p_dispositivo)
  returning id into nuevo;
  return jsonb_build_object('ok', true, 'id', nuevo, 'unidad', etiqueta);
end $$;

revoke all on function asam_cel_acreditar(text, text, text, text, text, text, text, boolean) from public;
grant execute on function asam_cel_acreditar(text, text, text, text, text, text, text, boolean) to anon, authenticated;
