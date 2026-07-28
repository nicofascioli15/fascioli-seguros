-- ================================================
-- FASCIOLI — Módulo Contratos v7
-- Elimina la categoría "Obras" de Contratos: se va a manejar como módulo aparte,
-- con su propia card en el Hub (fuera de este módulo).
--
-- Borra, en orden: los contratos de categoría 'obra' (sus documentos adjuntos se
-- borran solos por el ON DELETE CASCADE de contratos_documentos → contratos), el
-- catálogo de empresas y de tipos de esa categoría, y por último la categoría misma.
--
-- Nota: si había archivos subidos a Storage para estos contratos, acá se borra el
-- registro en la base pero el archivo en el bucket "documentos" queda huérfano
-- (mismo comportamiento que hoy al eliminar cualquier contrato individual desde
-- la app) — si eso importa, avisá y lo resolvemos aparte.
--
-- Ejecutar completo en SQL Editor de Supabase — es seguro correrlo más de una vez.
-- ================================================

delete from contratos where categoria = 'obra';
delete from contratos_empresas where categoria = 'obra';
delete from contratos_tipos where categoria = 'obra';
delete from contratos_categorias where slug = 'obra';
