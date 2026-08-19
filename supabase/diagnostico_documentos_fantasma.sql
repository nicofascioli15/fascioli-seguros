-- ================================================
-- Diagnóstico: documentos "fantasma"
--
-- Antes de este arreglo, si la subida al storage fallaba (por ejemplo por una
-- tilde o paréntesis en el nombre del archivo), igual se guardaba el registro
-- en la base como si el documento existiera. Esos registros apuntan a un
-- archivo que en realidad nunca llegó a subirse, y por eso "Descargar" tira
-- error ("Invalid key" o similar).
--
-- Esta consulta busca, en las 5 tablas de documentos de la app, cuáles
-- storage_path tienen tildes, ñ, u otros caracteres fuera de lo esperado
-- (que ya no deberían aparecer en subidas nuevas) — son los candidatos a
-- ser fantasmas y conviene volver a subirlos.
--
-- Solo lee, no borra ni modifica nada. Ejecutar en el SQL Editor de Supabase.
-- ================================================

select 'documentos' as tabla, id, nombre, storage_path, created_at
from documentos
where storage_path ~ '[^\x00-\x7F]'
union all
select 'mant_documentos' as tabla, id, nombre, storage_path, created_at
from mant_documentos
where storage_path ~ '[^\x00-\x7F]'
union all
select 'contratos_documentos' as tabla, id, nombre, storage_path, created_at
from contratos_documentos
where storage_path ~ '[^\x00-\x7F]'
order by created_at desc;
