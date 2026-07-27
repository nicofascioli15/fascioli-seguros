-- ================================================
-- FASCIOLI — Módulo Contratos v5
-- Corrige la fecha de firma de los contratos de Ascensores ya importados.
--
-- El Excel original calculaba una "Ultima Renovación vigente" con la fórmula:
--   Renovaciones acumuladas = MAX(0, INT(YEARFRAC(fecha_firma, HOY, 1) / vigencia_años))
--   Ultima renovación vigente = EDATE(fecha_firma, 12 * vigencia_años * renovaciones_acumuladas)
-- Es decir: en la práctica estos contratos se vienen renovando solos, año tras año,
-- y la fecha de firma ORIGINAL (la de hace 5, 10, 20 años) ya no representa el
-- período vigente actual.
--
-- La importación anterior (import_ascensores_2026.sql) cargó la fecha de firma
-- ORIGINAL tal cual figuraba en el Excel, en vez de la fecha de la última
-- renovación. Como el sistema ahora calcula el vencimiento de forma estática
-- (fecha_firma_inicio + vigencia_años, sin volver a renovarse solo), esos
-- contratos aparecían "Vencido" siendo que en los hechos siguen vigentes.
--
-- Este script recalcula, con la misma lógica de la planilla, la fecha de la
-- última renovación real de cada edificio (a la fecha de hoy, 27/07/2026) y la
-- deja cargada como fecha_firma_inicio. De acá en más el sistema NO vuelve a
-- recalcular esto solo: cuando el contrato se venza, hay que usar el botón
-- "Renovar" para cargar el nuevo período a mano.
--
-- Afecta 108 de los 126 contratos de Ascensores importados (los otros 18 ya
-- tenían la fecha de firma dentro del período vigente actual, sin cambios).
--
-- Ejecutar completo en SQL Editor de Supabase — es seguro correrlo más de una vez.
-- ================================================

update contratos set fecha_firma_inicio = '2022-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Deja Vu');
update contratos set fecha_firma_inicio = '2025-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Retamosa');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Sirius');
update contratos set fecha_firma_inicio = '2023-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'La Paz');
update contratos set fecha_firma_inicio = '2025-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cap Camarat');
update contratos set fecha_firma_inicio = '2023-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Le mans');
update contratos set fecha_firma_inicio = '2026-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tella');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Orion');
update contratos set fecha_firma_inicio = '2025-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Adomar');
update contratos set fecha_firma_inicio = '2025-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ñande Roga');
update contratos set fecha_firma_inicio = '2026-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Shungo');
update contratos set fecha_firma_inicio = '2024-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Plaza Fabini');
update contratos set fecha_firma_inicio = '2025-08-09' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Bel Air');
update contratos set fecha_firma_inicio = '2025-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Aconcagua');
update contratos set fecha_firma_inicio = '2024-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Aleti de Bilbao');
update contratos set fecha_firma_inicio = '2025-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Requena');
update contratos set fecha_firma_inicio = '2025-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'De los pocitos');
update contratos set fecha_firma_inicio = '2025-07-30' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Punta Brava');
update contratos set fecha_firma_inicio = '2025-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Sea Park');
update contratos set fecha_firma_inicio = '2023-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Terrazas del Molino');
update contratos set fecha_firma_inicio = '2024-10-24' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Solar de Verdi');
update contratos set fecha_firma_inicio = '2024-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Citadino Prado');
update contratos set fecha_firma_inicio = '2024-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ensenada');
update contratos set fecha_firma_inicio = '2026-01-27' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ciudad de Paris');
update contratos set fecha_firma_inicio = '2025-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Residencial Propios');
update contratos set fecha_firma_inicio = '2024-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Del Repecho');
update contratos set fecha_firma_inicio = '2024-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Terrazas de Propios');
update contratos set fecha_firma_inicio = '2026-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Colombes III');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tampico');
update contratos set fecha_firma_inicio = '2023-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Isla de las Gaviotas');
update contratos set fecha_firma_inicio = '2024-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Provi I');
update contratos set fecha_firma_inicio = '2026-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Quadra');
update contratos set fecha_firma_inicio = '2022-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ramver');
update contratos set fecha_firma_inicio = '2025-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Portonovo');
update contratos set fecha_firma_inicio = '2022-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = '720');
update contratos set fecha_firma_inicio = '2026-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Las Palmas');
update contratos set fecha_firma_inicio = '2026-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa 19 de Junio');
update contratos set fecha_firma_inicio = '2025-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Parque Shopping');
update contratos set fecha_firma_inicio = '2024-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tiffany II');
update contratos set fecha_firma_inicio = '2025-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Colombes II');
update contratos set fecha_firma_inicio = '2025-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Echevarriarza');
update contratos set fecha_firma_inicio = '2024-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'El Ombu');
update contratos set fecha_firma_inicio = '2024-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ria de Betanzos');
update contratos set fecha_firma_inicio = '2021-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Rocamar');
update contratos set fecha_firma_inicio = '2024-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Lomas del Mar');
update contratos set fecha_firma_inicio = '2023-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa Jose Pedro Varela');
update contratos set fecha_firma_inicio = '2025-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Malena');
update contratos set fecha_firma_inicio = '2026-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ambrosio Velazco');
update contratos set fecha_firma_inicio = '2026-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Los Fontanes');
update contratos set fecha_firma_inicio = '2026-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Belgrano I');
update contratos set fecha_firma_inicio = '2022-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Kalimera');
update contratos set fecha_firma_inicio = '2024-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Pireo II');
update contratos set fecha_firma_inicio = '2026-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Terrazas de Legrand');
update contratos set fecha_firma_inicio = '2026-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Mauritalia II');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Merides');
update contratos set fecha_firma_inicio = '2026-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Gallinal 1384');
update contratos set fecha_firma_inicio = '2024-09-28' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Altea');
update contratos set fecha_firma_inicio = '2026-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Buganvilias');
update contratos set fecha_firma_inicio = '2025-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Monteforte II');
update contratos set fecha_firma_inicio = '2026-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Residencial Artigas');
update contratos set fecha_firma_inicio = '2026-03-21' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Green Design');
update contratos set fecha_firma_inicio = '2025-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Remo');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Playa Honda II');
update contratos set fecha_firma_inicio = '2026-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa Copina');
update contratos set fecha_firma_inicio = '2025-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Beiramar');
update contratos set fecha_firma_inicio = '2026-04-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Arizona');
update contratos set fecha_firma_inicio = '2026-06-30' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Giulianova');
update contratos set fecha_firma_inicio = '2024-11-19' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Agraciada I');
update contratos set fecha_firma_inicio = '2026-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Almería');
update contratos set fecha_firma_inicio = '2025-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Altos del Molino');
update contratos set fecha_firma_inicio = '2026-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tulipan I');
update contratos set fecha_firma_inicio = '2026-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ischia II');
update contratos set fecha_firma_inicio = '2026-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torre Granada');
update contratos set fecha_firma_inicio = '2026-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Capri');
update contratos set fecha_firma_inicio = '2025-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'La Defense');
update contratos set fecha_firma_inicio = '2025-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Pagola');
update contratos set fecha_firma_inicio = '2025-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'El Ceibo');
update contratos set fecha_firma_inicio = '2025-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tristan Narvaja');
update contratos set fecha_firma_inicio = '2024-11-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Puertito I');
update contratos set fecha_firma_inicio = '2025-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Cooperativa Covideo');
update contratos set fecha_firma_inicio = '2025-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Abayubá');
update contratos set fecha_firma_inicio = '2024-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ayuí');
update contratos set fecha_firma_inicio = '2023-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Fleming');
update contratos set fecha_firma_inicio = '2025-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Sorrento');
update contratos set fecha_firma_inicio = '2023-08-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Kimberly');
update contratos set fecha_firma_inicio = '2025-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'San Andres');
update contratos set fecha_firma_inicio = '2024-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Marly');
update contratos set fecha_firma_inicio = '2026-01-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Bernardina');
update contratos set fecha_firma_inicio = '2025-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Paraguay');
update contratos set fecha_firma_inicio = '2026-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ventura Design');
update contratos set fecha_firma_inicio = '2025-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Citadino Plaza Seregni');
update contratos set fecha_firma_inicio = '2024-08-28' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Marisdea');
update contratos set fecha_firma_inicio = '2025-06-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torre de Las Gaviotas');
update contratos set fecha_firma_inicio = '2025-09-14' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Tourmalet');
update contratos set fecha_firma_inicio = '2021-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Nasazzi');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Capitan Tahití');
update contratos set fecha_firma_inicio = '2026-06-14' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Zone One');
update contratos set fecha_firma_inicio = '2025-10-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = '29 de Abril');
update contratos set fecha_firma_inicio = '2025-03-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torres Parque Atahualpa');
update contratos set fecha_firma_inicio = '2024-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Il Duomo');
update contratos set fecha_firma_inicio = '2025-08-23' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Mood Plaza');
update contratos set fecha_firma_inicio = '2026-02-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Ibia III');
update contratos set fecha_firma_inicio = '2025-09-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Torre Marsala I');
update contratos set fecha_firma_inicio = '2025-07-24' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Costa de Marfil');
update contratos set fecha_firma_inicio = '2025-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'San Vicente');
update contratos set fecha_firma_inicio = '2025-05-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Pereira');
update contratos set fecha_firma_inicio = '2024-12-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Azul');
update contratos set fecha_firma_inicio = '2024-07-01' where categoria = 'ascensor' and cliente_id = (select id from mant_clientes where nombre = 'Mont Blanc');
