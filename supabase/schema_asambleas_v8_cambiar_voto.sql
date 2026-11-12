-- ============================================================================
-- Asambleas v8: CAMBIAR EL VOTO mientras la votación está abierta
-- Si la unidad ya había votado, el nuevo voto reemplaza al anterior.
-- ============================================================================

create or replace function asam_cel_votar(p_codigo text, p_dispositivo text, p_mocion uuid, p_votos jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  v jsonb;
  n int := 0;
begin
  select * into a from asambleas where codigo_sala = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  if not exists (select 1 from asamblea_mociones where id = p_mocion and asamblea_id = a.id and estado = 'votando') then
    return jsonb_build_object('error', 'La votación ya se cerró');
  end if;
  for v in select * from jsonb_array_elements(coalesce(p_votos, '[]'::jsonb)) loop
    if (v->>'voto') not in ('si', 'no', 'abstencion') then continue; end if;
    if not exists (select 1 from asamblea_unidades where id = (v->>'unidad_id')::uuid and asamblea_id = a.id
                   and dispositivo is not null and dispositivo = p_dispositivo) then continue; end if;
    insert into asamblea_votos (mocion_id, unidad_id, voto) values (p_mocion, (v->>'unidad_id')::uuid, v->>'voto')
    on conflict (mocion_id, unidad_id) do update set voto = excluded.voto, created_at = now();
    n := n + 1;
  end loop;
  if n = 0 then return jsonb_build_object('error', 'No se registró ningún voto'); end if;
  return jsonb_build_object('ok', true, 'registrados', n);
end $$;

create or replace function asam_tablet_votar(p_codigo text, p_mocion uuid, p_votos jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a asambleas%rowtype;
  v jsonb;
  n int := 0;
begin
  select * into a from asambleas where codigo_tablet = upper(trim(p_codigo));
  if not found then return jsonb_build_object('error', 'Código de asamblea inválido'); end if;
  if a.estado <> 'abierta' then return jsonb_build_object('error', 'La asamblea está cerrada'); end if;
  if not exists (select 1 from asamblea_mociones where id = p_mocion and asamblea_id = a.id and estado = 'votando') then
    return jsonb_build_object('error', 'La votación ya se cerró');
  end if;
  for v in select * from jsonb_array_elements(coalesce(p_votos, '[]'::jsonb)) loop
    if (v->>'voto') not in ('si', 'no', 'abstencion') then continue; end if;
    if not exists (select 1 from asamblea_unidades where id = (v->>'unidad_id')::uuid and asamblea_id = a.id) then continue; end if;
    insert into asamblea_votos (mocion_id, unidad_id, voto) values (p_mocion, (v->>'unidad_id')::uuid, v->>'voto')
    on conflict (mocion_id, unidad_id) do update set voto = excluded.voto, created_at = now();
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'registrados', n);
end $$;

grant execute on function asam_cel_votar(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function asam_tablet_votar(text, uuid, jsonb) to anon, authenticated;
