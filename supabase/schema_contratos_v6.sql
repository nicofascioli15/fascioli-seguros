-- ================================================
-- FASCIOLI — Módulo Contratos v6
-- Separa "fecha de firma original" (primer período, nunca se toca) de
-- "fecha_firma_inicio" (que representa la última renovación confirmada — el
-- ancla desde la que se calcula el ciclo vigente y el auto-renovado).
--
-- Antes solo existía fecha_firma_inicio, y el script v5 la corrigió para que
-- reflejara la última renovación real (necesario para que el vencimiento se
-- calculara bien). Pero al hacer eso se perdió el dato de la firma original
-- de cada contrato. Esta migración agrega fecha_firma_original y la completa:
--   - Por defecto = fecha_firma_inicio (para los contratos que no tuvieron
--     ninguna renovación de por medio, y para cualquier contrato nuevo).
--   - Para los 108 contratos de Ascensores que sí venían con renovaciones
--     acumuladas (los mismos que corrigió v5), se deja la fecha de firma
--     ORIGINAL real, tal cual figura en el Excel.
--
-- Ejecutar completo en SQL Editor de Supabase — es seguro correrlo más de una vez.
-- ================================================

alter table contratos add column if not exists fecha_firma_original date;

-- Base por defecto: si no hay dato mejor, la firma original es la fecha que ya está cargada.
update contratos set fecha_firma_original = fecha_firma_inicio where fecha_firma_original is null;

-- Ahora sí, para los edificios cuya fecha_firma_inicio fue corregida en v5 (última renovación),
-- se deja acá la fecha de firma original real, tomada del Excel.
update contratos set fecha_firma_original = '2017-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Deja Vu');
update contratos set fecha_firma_original = '2019-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Retamosa');
update contratos set fecha_firma_original = '2011-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Sirius');
update contratos set fecha_firma_original = '2020-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'La Paz');
update contratos set fecha_firma_original = '2010-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cap Camarat');
update contratos set fecha_firma_original = '2003-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Le mans');
update contratos set fecha_firma_original = '2014-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tella');
update contratos set fecha_firma_original = '2019-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Orion');
update contratos set fecha_firma_original = '2012-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Adomar');
update contratos set fecha_firma_original = '2020-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ñande Roga');
update contratos set fecha_firma_original = '2004-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Shungo');
update contratos set fecha_firma_original = '2003-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Plaza Fabini');
update contratos set fecha_firma_original = '2007-08-09' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Bel Air');
update contratos set fecha_firma_original = '1997-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Aconcagua');
update contratos set fecha_firma_original = '2015-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Aleti de Bilbao');
update contratos set fecha_firma_original = '2016-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Requena');
update contratos set fecha_firma_original = '2023-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'De los pocitos');
update contratos set fecha_firma_original = '2021-07-30' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Punta Brava');
update contratos set fecha_firma_original = '2017-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Sea Park');
update contratos set fecha_firma_original = '2003-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Terrazas del Molino');
update contratos set fecha_firma_original = '2019-10-24' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Solar de Verdi');
update contratos set fecha_firma_original = '2016-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Citadino Prado');
update contratos set fecha_firma_original = '1999-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ensenada');
update contratos set fecha_firma_original = '2020-01-27' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ciudad de Paris');
update contratos set fecha_firma_original = '1997-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Residencial Propios');
update contratos set fecha_firma_original = '2009-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Del Repecho');
update contratos set fecha_firma_original = '2015-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Terrazas de Propios');
update contratos set fecha_firma_original = '2006-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Colombes III');
update contratos set fecha_firma_original = '1997-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tampico');
update contratos set fecha_firma_original = '2003-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Isla de las Gaviotas');
update contratos set fecha_firma_original = '2006-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Provi I');
update contratos set fecha_firma_original = '2016-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Quadra');
update contratos set fecha_firma_original = '2012-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ramver');
update contratos set fecha_firma_original = '2011-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Portonovo');
update contratos set fecha_firma_original = '2012-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = '720');
update contratos set fecha_firma_original = '2001-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Las Palmas');
update contratos set fecha_firma_original = '2014-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa 19 de Junio');
update contratos set fecha_firma_original = '2022-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Parque Shopping');
update contratos set fecha_firma_original = '2015-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tiffany II');
update contratos set fecha_firma_original = '2001-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Colombes II');
update contratos set fecha_firma_original = '2020-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Echevarriarza');
update contratos set fecha_firma_original = '1991-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'El Ombu');
update contratos set fecha_firma_original = '2012-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ria de Betanzos');
update contratos set fecha_firma_original = '2001-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Rocamar');
update contratos set fecha_firma_original = '2009-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Lomas del Mar');
update contratos set fecha_firma_original = '2008-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa Jose Pedro Varela');
update contratos set fecha_firma_original = '1997-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Malena');
update contratos set fecha_firma_original = '2022-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ambrosio Velazco');
update contratos set fecha_firma_original = '2004-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Los Fontanes');
update contratos set fecha_firma_original = '2016-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Belgrano I');
update contratos set fecha_firma_original = '2002-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Kalimera');
update contratos set fecha_firma_original = '2015-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Pireo II');
update contratos set fecha_firma_original = '2017-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Terrazas de Legrand');
update contratos set fecha_firma_original = '2016-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Mauritalia II');
update contratos set fecha_firma_original = '2019-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Merides');
update contratos set fecha_firma_original = '2006-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Gallinal 1384');
update contratos set fecha_firma_original = '1992-09-28' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Altea');
update contratos set fecha_firma_original = '2016-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Buganvilias');
update contratos set fecha_firma_original = '2011-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Monteforte II');
update contratos set fecha_firma_original = '2004-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Residencial Artigas');
update contratos set fecha_firma_original = '2024-03-21' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Green Design');
update contratos set fecha_firma_original = '2011-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Remo');
update contratos set fecha_firma_original = '2014-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Playa Honda II');
update contratos set fecha_firma_original = '1996-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa Copina');
update contratos set fecha_firma_original = '2003-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Beiramar');
update contratos set fecha_firma_original = '2021-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Arizona');
update contratos set fecha_firma_original = '1977-06-30' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Giulianova');
update contratos set fecha_firma_original = '2022-11-19' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Agraciada I');
update contratos set fecha_firma_original = '1996-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Almería');
update contratos set fecha_firma_original = '2010-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Altos del Molino');
update contratos set fecha_firma_original = '2002-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tulipan I');
update contratos set fecha_firma_original = '2001-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ischia II');
update contratos set fecha_firma_original = '1996-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torre Granada');
update contratos set fecha_firma_original = '2023-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Capri');
update contratos set fecha_firma_original = '2022-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'La Defense');
update contratos set fecha_firma_original = '1999-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Pagola');
update contratos set fecha_firma_original = '2007-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'El Ceibo');
update contratos set fecha_firma_original = '2021-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tristan Narvaja');
update contratos set fecha_firma_original = '2009-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Puertito I');
update contratos set fecha_firma_original = '2019-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa Covideo');
update contratos set fecha_firma_original = '2022-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Abayubá');
update contratos set fecha_firma_original = '2010-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ayuí');
update contratos set fecha_firma_original = '2013-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Fleming');
update contratos set fecha_firma_original = '2022-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Sorrento');
update contratos set fecha_firma_original = '2013-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Kimberly');
update contratos set fecha_firma_original = '2017-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'San Andres');
update contratos set fecha_firma_original = '2003-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Marly');
update contratos set fecha_firma_original = '2017-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Bernardina');
update contratos set fecha_firma_original = '1995-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Paraguay');
update contratos set fecha_firma_original = '2018-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ventura Design');
update contratos set fecha_firma_original = '2017-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Citadino Plaza Seregni');
update contratos set fecha_firma_original = '2020-08-28' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Marisdea');
update contratos set fecha_firma_original = '2003-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torre de Las Gaviotas');
update contratos set fecha_firma_original = '1977-09-14' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tourmalet');
update contratos set fecha_firma_original = '2006-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Nasazzi');
update contratos set fecha_firma_original = '2021-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Capitan Tahití');
update contratos set fecha_firma_original = '2021-06-14' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Zone One');
update contratos set fecha_firma_original = '2011-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = '29 de Abril');
update contratos set fecha_firma_original = '2016-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torres Parque Atahualpa');
update contratos set fecha_firma_original = '2004-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Il Duomo');
update contratos set fecha_firma_original = '2023-08-23' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Mood Plaza');
update contratos set fecha_firma_original = '2000-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ibia III');
update contratos set fecha_firma_original = '1991-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torre Marsala I');
update contratos set fecha_firma_original = '2019-07-24' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Costa de Marfil');
update contratos set fecha_firma_original = '2003-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'San Vicente');
update contratos set fecha_firma_original = '2013-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Pereira');
update contratos set fecha_firma_original = '2008-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Azul');
update contratos set fecha_firma_original = '1994-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Mont Blanc');
