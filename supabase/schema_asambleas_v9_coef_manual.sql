-- Asambleas v9: el coeficiente NO se toma del padrón al registrarse.
-- Lo carga la administración en cada asamblea (pestaña "Coeficientes" del modo sala), solo si se usa.
do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('asam_tablet_acreditar', 'asam_cel_acreditar') loop
    def := pg_get_functiondef(f.oid);
    if position('u.coeficiente,' in def) > 0 then
      execute replace(def, 'u.coeficiente,', 'null::numeric,');
    end if;
  end loop;
end $$;
