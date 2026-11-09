-- ============================================================================
-- ASAMBLEAS con sus PROPIOS edificios, torres y aptos (PARTE 1 de 4)
-- No tiene nada que ver con los edificios de Seguros / Mantenimiento / Obras / Contratos.
-- Además deshace lo que la importación anterior había mezclado en esos edificios.
-- Corré las 4 partes EN ORDEN.
-- ============================================================================

-- 1) Tablas propias de Asambleas
create table if not exists asam_edificios (
  id          uuid default gen_random_uuid() primary key,
  codigo      text unique,                       -- código del sistema de gastos comunes (A01...)
  nombre      text not null,
  direccion   text,
  created_at  timestamp with time zone default now()
);
create table if not exists asam_torres (
  id           uuid default gen_random_uuid() primary key,
  edificio_id  uuid not null references asam_edificios(id) on delete cascade,
  codigo       text not null,
  nombre       text,
  created_at   timestamp with time zone default now(),
  unique (edificio_id, codigo)
);
create table if not exists asam_unidades (
  id                 uuid default gen_random_uuid() primary key,
  edificio_id        uuid not null references asam_edificios(id) on delete cascade,
  torre              text not null default '',
  unidad             text not null,
  propietario        text,
  propietario_tel    text,
  propietario_email  text,
  coeficiente        numeric,
  created_at         timestamp with time zone default now(),
  unique (edificio_id, torre, unidad)
);
create index if not exists asam_unidades_edificio_idx on asam_unidades(edificio_id);

alter table asam_edificios enable row level security;
alter table asam_torres    enable row level security;
alter table asam_unidades  enable row level security;
drop policy if exists "auth_all" on asam_edificios;
drop policy if exists "auth_all" on asam_torres;
drop policy if exists "auth_all" on asam_unidades;
create policy "auth_all" on asam_edificios for all using (auth.role() = 'authenticated');
create policy "auth_all" on asam_torres    for all using (auth.role() = 'authenticated');
create policy "auth_all" on asam_unidades  for all using (auth.role() = 'authenticated');

-- 2) Edificios (228) desde edifs.csv
insert into asam_edificios (codigo, nombre, direccion) values
  ('A01', 'Edificio Av. Italia 7191', 'Av. Italia 7191'),
  ('A03', 'Edificio Retamosa', 'Retamosa 1773'),
  ('A04', 'Edificio Castelvetrano I', 'Colombes 1371'),
  ('A05', 'Edificio Avenida Italia 3117', 'Avenida Italia 3117'),
  ('A06', 'Edificio Missouri', 'Missouri 1571'),
  ('A07', 'Edificio Orinoco', 'Orinoco 5319'),
  ('A08', 'Edificio Minas', 'Minas 1729'),
  ('A09', 'Edificio Velsen 4575', 'Velsen 4575'),
  ('A10', 'Edificio Sirius', 'Orinoco 5141'),
  ('A11', 'Edificio Nasadrano', 'Humberto I 4138'),
  ('A12', 'Edificio 18 Dic.1511', 'Av. 18 de Diciembre 1511'),
  ('A13', 'Edificio Ibia I', 'Mahoma 4331'),
  ('A14', 'Edificio la Paz', 'La Paz 2139'),
  ('A15', 'Edificio Mones Roses', 'Mones Roses 6353'),
  ('A16', 'Edificio Cap. Camarat', 'Blixen 4460/70/80'),
  ('A17', 'Edificio Le Mans', 'Fco. Solano Lopez 1884'),
  ('A18', 'Edificio Tella', 'Bilbao 3773'),
  ('A19', 'Edificio Orion', 'Avenida Italia 4381'),
  ('A20', 'Edificio Adomar', 'Colonia 1464bis'),
  ('A21', 'Edificio Ñande Roga', 'Av.Rivera 6153'),
  ('A22', 'Edificio Shungo', 'Rambla O`higgins 5179'),
  ('A23', 'Edificio Litore', 'Rivera 4612'),
  ('A24', 'Edificio Plaza Fabini', 'Acegua 4688/4690'),
  ('A25', 'Edificio Rossell y Rius', 'Rossell y Rius 1533'),
  ('A26', 'Edificio Cooper y Fedra', 'Cooper 2299'),
  ('A27', 'Edificio Bel Air', 'Michigan 1371'),
  ('A28', 'Edificio Aconcagua', 'Aconcagua 5421'),
  ('A29', 'Edificio Aleti de Bilbao', 'Francisco Bilbao 3734'),
  ('A30', 'Edificio Maximo Tajes', 'Maximo Tajes 6744'),
  ('A31', 'Edificio Michigan I', 'Michigan 1375'),
  ('A32', 'Edificio Patria - Rene 1696 Block', 'Rene 1696'),
  ('A33', 'Edificio Requena', 'Requena 1622'),
  ('A34', 'Edificio Garrido', 'Rivera 3679'),
  ('A35', 'Edificio Hipolito Yrigoyen 1514', 'H.Yrigoyen 1514'),
  ('A36', 'Edificio de los Pocitos', 'Gabriel Pereira 3264'),
  ('A37', 'Edificio Pilares del Centro', 'Andes 1293'),
  ('A38', 'Edificio Punta Brava', 'Av. Rivera 4157'),
  ('A39', 'Edificio Sea Park', 'Concepcion del Uruguay 1569'),
  ('A40', 'Edificio Terrazas del Molino', 'Alejandro Gallinal 1411'),
  ('A41', 'Edificio Solano Garcia 2631', 'Solano Garcia 2631'),
  ('A42', 'Edificio Solar de Verdi', 'Concepcion del Uruguay 1557'),
  ('A43', 'Edificio Margus', 'Mississipi 1501'),
  ('A44', 'Edificio Citadino Prado', 'Agraciada 2885 / Jujuy 2780'),
  ('A45', 'Edificio la Riviera', 'Rivera 4741'),
  ('A46', 'Edificio Ensenada', 'Rbla.Rep.de Chile 4629'),
  ('A47', 'Edificio Requena I (Royal Cordon)', 'Requena 1660'),
  ('A48', 'Edificio Acegua', 'Acegua 4740'),
  ('A49', 'Edificio Ciudad de Paris', 'Ciudad de Paris 6151'),
  ('A50', 'Edificio Residencial Propios', 'Av.Batlle y Ordoñez 2810'),
  ('A51', 'Edificio del Repecho', 'Rambla Republica de Chile 4541'),
  ('A52', 'Edificio Verdi 4272', 'Verdi 4272'),
  ('A53', 'Edificio Patria Renne 1652 1660 B11', 'Rene 1652/1660'),
  ('A54', 'Edificio Gallinal 1642', 'A. Gallinal 1642'),
  ('A55', 'Edificio Terrazas de Propios', 'Av.Batlle y Ordonez 1688'),
  ('A56', 'Edificio Colombes Iii', 'Colombes 1687'),
  ('A57', 'Edificio Rio Negro', 'Rio Negro 1076'),
  ('A58', 'Edificio Tampico', 'Cebollati 1679'),
  ('A59', 'Edificio Playa Oriente Ii', '26 de Marzo 1320'),
  ('A60', 'Edificio Isla de las Gaviotas', 'Rambla Rep. Chile 4525'),
  ('A61', 'Edificio Provi I', 'Av. Italia 5134'),
  ('A62', 'Edificio Quadra', 'Constituyente 1767'),
  ('A63', 'Edificio Ramver', 'Hipolito Yrigoyen 1407 Bis'),
  ('A64', 'Edificio Portonovo', 'Candelaria 1637'),
  ('A65', 'Edificio 720', 'Roque Graseras 720'),
  ('A66', 'Edificio las Palmas', 'Avenida Italia 3840'),
  ('A67', 'Edificio Millan', 'Millan 2864 Bis'),
  ('A68', 'Cooperativa 19 de Junio', 'Pilcomayo 5301'),
  ('A69', 'Edificio Parque Shopping', 'Placido Ellauri 3480 Bis'),
  ('A70', 'Edificio Tiffany Ii', 'C.del Uruguay 1539'),
  ('A71', 'Edificio Colombes Ii', 'Colombes 1731'),
  ('A72', 'Edificio Echevarriarza', 'Echevarriarza 3374'),
  ('A73', 'Edificio El Ombu', 'Felipe Sanguinetti 2153'),
  ('A74', 'Edificio Ria de Betanzos', 'Emilio Raña 3017'),
  ('A75', 'Edificio Rocamar', 'Rbla. Rep. de Chile 4447'),
  ('A76', 'Edificio Lomas del Mar', 'Espinosa 1367'),
  ('A77', 'Cooperativa Jose Pedro Varela', 'Conc.del Uruguay 1409/1415'),
  ('A78', 'Edificio Malena', 'Concepcion del Uruguay 1449'),
  ('A79', 'Edificio los Cedros', 'Av. Italia 3867'),
  ('A80', 'Edificio Ambrosio Velazco', 'Ambrosio Velazco 1471'),
  ('A81', 'Edificio Fidias Ii', 'San Jose 871'),
  ('A82', 'Edificio Asamblea 4586', 'Asamblea 4586'),
  ('A83', 'Cooperativa Playa Honda', 'Alberto Zum Felde 1585'),
  ('A84', 'Edificio los Fontanes', 'Amsterdam 1449 A'),
  ('A85', 'Edificio Belgrano I', 'Luis Alberto de Herrera 2143'),
  ('A86', 'Edificio Kalimera', 'Concepcion del Uruguay 1615'),
  ('A87', 'Edificio Taboba', 'Taboba 3881'),
  ('A88', 'Edificio Enrique I', 'Av. Rivera 4189/91'),
  ('A89', 'Edificio Country del Molino', 'Acquistapache 1835'),
  ('A90', 'Edificio Pireo Ii', 'Alejandro Beisso 1641'),
  ('A91', 'Edificio Terrazas de Legrand', 'Av. Legrand 5104'),
  ('A92', 'Edificio Rostand Place', 'Rostand 1587'),
  ('A93', 'Edificio Mauritalia Ii', 'Estanislao Lopez 4873'),
  ('A94', 'Edificio Tiber', 'Tiburcio Gomez 1350'),
  ('A95', 'Edificio Riviera', 'Avenida Rivera 4707'),
  ('A96', 'Edificio Castro Quintela', 'Luis Alberto de Herrera'),
  ('A97', 'Edificio Merides', 'Las Heras 1890'),
  ('A98', 'Edificio Gallinal 1384', 'Alejandro Gallinal 1384'),
  ('A99', 'Edificio Altea', 'Avenida Italia 3148'),
  ('C01', 'Edificio Santiago de Anca 1362', 'Santiago de Anca 1362'),
  ('C02', 'Edificio Buganvilias', 'Rivera 4723'),
  ('C03', 'Edificio Monteforte Ii', 'Rivera 2858'),
  ('C04', 'Cooperativa Coviba', 'Siracusa 2186'),
  ('C05', 'Edificio Residencial Artigas', 'Bulevar Artigas 1645'),
  ('C06', 'Edificio Green Design', 'Joaquin Nuñez 2970'),
  ('C07', 'Edificio Siracusa Park', 'Siracusa 2472'),
  ('C08', 'Edificio Remo', '26 de Marzo 1383'),
  ('C09', 'Edificio Playa Honda Ii', 'A.Gallinal 1559'),
  ('C10', 'Cooperativa Copina', 'Carace 505'),
  ('C11', 'Edificio Beira Mar', 'Orinoco 5315'),
  ('C12', 'Edificio Cagancha', 'Cagancha 2234'),
  ('C13', 'Edificio Arizona', 'Arizona 4761'),
  ('C14', 'Edificio Giulianova', 'Av. Italia 3499'),
  ('C15', 'Edificio Pilcomayo 5329', 'Pilcomayo 5325/29 Bis'),
  ('C16', 'Edificio Agraciada I', 'Av.Agraciada 2318'),
  ('C17', 'Edificio San Luis', 'Estanislao Lopez 4833'),
  ('C18', 'Edificio Vera', '8 de Octubre 4444'),
  ('C19', 'Edificio Porongos 2856', 'Porongos 2856'),
  ('C20', 'Edificio Almeria', 'Hipolito Yrigoyen 1452'),
  ('C21', 'Edificio Gaboto 1814', 'Gaboto 1814'),
  ('C22', 'Edificio Altos del Molino', 'Aconcagua 5350'),
  ('C23', 'Edificio Tulipan I', 'Juan Benito Blanco 3311'),
  ('C24', 'Edificio Rivera y Rimac', 'Rivera y Rimac'),
  ('C25', 'Edificio Almeria 4565,67,69,71', 'Almeria 4565,67,69,71'),
  ('C26', 'Edificio Ischia Ii', 'Avenida Rivera 5031'),
  ('C27', 'Edificio Cairoli', 'Cairoli 2069'),
  ('C28', 'Edificio Torre Granada', 'Estanislao Lopez 4685 Al 4693'),
  ('C29', 'Edificio Capri', 'Avenida Bolivia 2239'),
  ('C30', 'Edificio Candieira', 'Candelaria 1616'),
  ('C31', 'Edificio la Defense', 'Defensa 1861'),
  ('C32', 'Edificio Oikos', 'Colombes 1328'),
  ('C33', 'Edificio Pagola', 'Manuel V. Pagola Nro 3336'),
  ('C34', 'Edificio El Ceibo', 'Almeria 4844'),
  ('C35', 'Edificio Velsen 4441', 'Velsen 4441'),
  ('C36', 'Edificio Tristan Narvaja', 'Emilio Frugoni 892'),
  ('C37', 'Edificio Puertito I', 'Pedro Bustamante 1225'),
  ('C38', 'Edificio Barroso', 'Barroso 3780'),
  ('C39', 'Cooperativa Covideo', 'Hugo Antuña 3436'),
  ('C40', 'Edificio Abayuba', 'Ramon Anador 3856'),
  ('C41', 'Edificio Ayui', 'Pedro Bustamante 1221'),
  ('C42', 'Edificio Fleming', 'Alejandro Fleming 1650'),
  ('C43', 'Edificio la Palmera', 'Rambla O Higgins 5197'),
  ('C44', 'Edificio Sorrento', '18 de Diciembre 1469'),
  ('C45', 'Edificio Paysandu', 'Paysandu 1997'),
  ('C46', 'Edificio Kimberly', 'Cno de los Hormigueros'),
  ('C47', 'Edificio Zonis', 'Bulevar Artigas 3975'),
  ('C48', 'Edificio San Andres', 'Bulevar Artigas 581'),
  ('C49', 'Edificio Araguaney', 'Aconcagua 4912/16'),
  ('C50', 'Edificio Bruno Mendez 3712/3716', 'Bruno Mendez 3712/3716'),
  ('C51', 'Edificio Marly', 'Las Heras 1990'),
  ('C52', 'Edificio Bernardina (Nonas)', 'Bernardina F.Rivera'),
  ('C53', 'Edificio Kentavros', 'Itapua 2214'),
  ('C54', 'Edificio Green Village Park', 'Avenida Bolivia 1991'),
  ('C55', 'Edificio Paraguay 1382', 'Paraguay 1382'),
  ('C56', 'Edificio Ventura Design', 'Constituyente 1740'),
  ('C57', 'Edificio Plaza Seregni', 'Joaquin Requena 1670'),
  ('C58', 'Edificio Marisdea', 'Juan Benito Blanco 923'),
  ('C59', 'Edificio Torre de las Gaviotas', 'Ambrosio Velazco 1553'),
  ('C60', 'Edificio Tourmalet', 'Alejandro Chucarro 1178'),
  ('C61', 'Edificio Fenicio Ii', 'Donizetti 1394'),
  ('C62', 'Edificio Sur', 'Horacio Quiroga 6440'),
  ('C63', 'Edificio Belgrano 2862', 'Belgrano 2862'),
  ('C64', 'Edificio Anclamar', 'Rambla Republica de Chile 4531'),
  ('C65', 'Edificio Tenax', 'Juan Manuel Blanes 1028'),
  ('C66', 'Edificio Resistencia', 'Resistencia 1619'),
  ('C67', 'Edificio Verdi 4399', 'Verdi 4399'),
  ('C68', 'Edificio Nasazzi', 'Av Agraciada 3094'),
  ('C69', 'Edificio Sepee', 'Sepee 1723'),
  ('C70', 'Edificio 6 de Octubre', 'Luis A de Herrera 3565'),
  ('C71', 'Edificio Tao', 'Abacu 2151'),
  ('C72', 'Edificio Capitan Tahiti', 'Rbla Republica de Chile 4487'),
  ('C73', 'Edificio Alamo', 'Plutarco 3981'),
  ('C74', 'Edificio Marikar', 'Humberto I 4096'),
  ('C75', 'Edificio Zone One', 'Ituzaingo 1409'),
  ('C76', 'Edificio Patria G.Gloria 1683', 'Grito de Gloria 1683'),
  ('C77', 'Edificio Belgrano 2858 Bis', 'Belgrano 2858 Bis'),
  ('C78', 'Edificio 29 de Abril', 'Juan Paullier 2523/2547'),
  ('C79', 'Edificio Estivao', 'Estivao 1820'),
  ('C80', 'Edificio Novara Lofts', 'Asuncion 1661'),
  ('C81', 'Edificio Velzen', 'Velsen 4466'),
  ('C82', 'Edificio Oeste', 'Buxareo 1138/40'),
  ('C83', 'Edificio Zorrilla de San Martin', 'Republica 2222'),
  ('C84', 'Edificio Amezaga', 'Juan Jose de Amezaga 1726 / 1728'),
  ('C85', 'Edificio Ramon Anador 3812/14', 'Ramon Anador'),
  ('C86', 'Edificio Azul de la Playa', 'Rambla O Higgins 5145'),
  ('C87', 'Edificio Rivera 4575', 'Rivera 4575'),
  ('C88', 'Edificio Hipolito Yrigoyen 1584', 'Hipolito Yrigoyen 1584'),
  ('C89', 'Edificio Torres Parque Atahualpa', 'Bicudo 3844'),
  ('C90', 'Edificio Il Duomo', 'Avenida Sarmiento 2674'),
  ('C91', 'Edificio Mood Plaza', 'Asamblea 4532'),
  ('C92', 'Edificio Av Italia 3133', 'Av Italia 3133'),
  ('C93', 'Edificio Ibia Iii', 'Av Italia 4281'),
  ('C94', 'Edificio Andrea S', 'General Jose Maria Paz 1565'),
  ('C95', 'Edificio Marsala I', 'Rivera 3618'),
  ('C96', 'Edificio Durazno', 'Durazno 1817'),
  ('C97', 'Edificio Costa de Marfil', '21 de Setiembre 3128'),
  ('C98', 'Edificio San Vicente', 'Pastoriza 1350'),
  ('C99', 'Edificio Pereira', 'Gabriel Pereira 2955/57'),
  ('D01', 'Edificio Canstatt 2906', 'Canstatt 2906'),
  ('D02', 'Edificio Villa Ibirapita', 'Reyes 1422'),
  ('D03', 'Edificio Azul', 'Colombes 1311'),
  ('D04', 'Edificio Flavia', 'Rivera 4415'),
  ('D05', 'Edificio Mont Blanc', 'Magallanes 1498'),
  ('D06', 'Edificio Giardino Dei Fiumi', 'Cuareim 1506'),
  ('D07', 'Edificio Asamblea 4371', 'Asamblea 4371'),
  ('D08', 'Edificio Amati', 'Almeria 4564'),
  ('D09', 'Edificio Marsala Xii', 'Rambla O Higgins 5061'),
  ('D10', 'Edificio Palmar', 'Palmar 2468'),
  ('D11', 'Edificio Rivus Rambla', 'Acapulco 16'),
  ('D12', 'Edificio Residencial Erwy', 'Luis. P. Ponce 1284'),
  ('D13', 'Edificio Marsala Xiv', 'Rambla O Higgins 5057'),
  ('D14', 'Edificio Centauro', 'Mahoma 4367'),
  ('D15', 'Edificio Pilcomayo 5026', 'Pilcomayo 5026'),
  ('D16', 'Edificio Orticochea', 'Maria Orticoechea 4259'),
  ('D17', 'Edificio Terra Vista Ii', 'Rambla O Higgins 5085'),
  ('D18', 'Edificio Meet', 'Pilcomayo 5373'),
  ('D19', 'Edificio Moate Iv', 'Almiron 5073/5089'),
  ('G75', 'Edificio Rocamar Dolares', 'Rambla Republica de Chile'),
  ('H17', 'Edificio Terra Vista Ii Dolares', 'Rambla O Higgins 5085'),
  ('H33', 'Edificio Pagola Dolares', 'Manuel V. Pagola Nro 3336'),
  ('H82', 'Edificio Oeste (Dolares)', 'Buxareo 1138/40'),
  ('H84', 'Edificio Amezaga (Dolares)', 'Juan Jose de Amezaga 1726 / 1728'),
  ('H86', 'Edificio Azul de la Playa (Dolares)', 'Rambla O Higgins 5145'),
  ('H90', 'Edificio Il Duomo (Dolares)', 'Avenida Sarmiento 2674'),
  ('M22', 'Edificio Shungo Fachada', 'Rambla O Higgins 5179'),
  ('M46', 'Edificio Ensenada Garages/Cocheras', 'Rambla Republica de Chile 4629'),
  ('M63', 'Edificio Belgrano 2862 Cuota Extra', 'Belgrano 2862'),
  ('M88', 'Edificio Enrique I Cuota Extra', 'Rivera 4189'),
  ('X98', 'Testing 2', 'Aca Va la Direccion')
on conflict (codigo) do update set nombre = excluded.nombre, direccion = excluded.direccion;

-- 3) Torres / sectores (36) desde torres.csv
insert into asam_torres (edificio_id, codigo, nombre)
select e.id, v.codigo, v.nombre from (values
  ('A34', 'A', 'Apartamentos'),
  ('A34', 'L', 'Local'),
  ('A34', 'S', 'Sub Suelo'),
  ('A37', 'A', 'Apartamentos'),
  ('A37', 'C', 'Cocheras'),
  ('A44', 'C', 'Cocheras'),
  ('A74', 'L', 'Local'),
  ('A77', 'A', 'Concep. del Uruguay 1409'),
  ('A77', 'B', 'Concep. del Uruguay 1415'),
  ('A81', 'A', 'Apartamentos'),
  ('A81', 'C', 'Cocheras'),
  ('A81', 'E', 'Entrepiso'),
  ('A81', 'S', 'Subsuelo'),
  ('A81', 'Z', 'Garage Colectivo'),
  ('C01', 'S', 'Subsuelo'),
  ('C01', 'SS', 'Subsuelo'),
  ('C29', 'G', 'Cochera'),
  ('C48', 'A', 'Aptos'),
  ('C48', 'G', 'Garage'),
  ('C55', 'S', 'Sub Suelo'),
  ('C56', 'A', 'A'),
  ('C56', 'B', 'B'),
  ('C58', 'L', 'Locales'),
  ('C58', 'S', 'Subsuelo'),
  ('C72', 'A', '302a'),
  ('C72', 'B', '302b'),
  ('C75', 'C', 'Cochera'),
  ('C75', 'G', 'Garage'),
  ('C75', 'L', 'Local'),
  ('C88', 'S', 'Subsuelo'),
  ('C89', 'A', 'Torre A'),
  ('C89', 'B', 'Torre B'),
  ('C89', 'C', 'Torre C'),
  ('C89', 'D', 'Torre D'),
  ('D05', 'L', 'Local'),
  ('X98', 'A', 'Torre A')
) as v(edif, codigo, nombre)
join asam_edificios e on e.codigo = v.edif
on conflict (edificio_id, codigo) do update set nombre = excluded.nombre;

-- 4) Las asambleas pasan a usar los edificios de Asambleas
alter table asambleas add column if not exists edificio_id uuid references asam_edificios(id) on delete restrict;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'asambleas' and column_name = 'cliente_id') then
    -- por el código que les había puesto la importación anterior
    if exists (select 1 from information_schema.columns where table_name = 'mant_clientes' and column_name = 'codigo') then
      update asambleas a set edificio_id = e.id
      from mant_clientes m join asam_edificios e on e.codigo = m.codigo
      where m.id = a.cliente_id and a.edificio_id is null;
    end if;
    -- y si no, por el nombre (sin "Edificio", tildes ni mayúsculas)
    update asambleas a set edificio_id = e.id
    from mant_clientes m, asam_edificios e
    where m.id = a.cliente_id and a.edificio_id is null
      and lower(trim(regexp_replace(translate(m.nombre,'ÁÉÍÓÚÜáéíóúüÑñ','AEIOUUaeiouuNn'),'^(edificio|edif\.?)\s+','','i'))) = lower(trim(regexp_replace(translate(e.nombre,'ÁÉÍÓÚÜáéíóúüÑñ','AEIOUUaeiouuNn'),'^(edificio|edif\.?)\s+','','i')));
    alter table asambleas drop column cliente_id;
  end if;
end $$;
create index if not exists asambleas_edificio_idx on asambleas(edificio_id);

-- 5) Limpieza: se borran los edificios que la importación anterior CREÓ de más en
--    Seguros/Mantenimiento/Obras/Contratos (tienen código, se crearon con la importación
--    y no tienen nada cargado). Los edificios que ya existían quedan como estaban.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'mant_clientes' and column_name = 'codigo') then
    delete from mant_clientes m
    where m.codigo is not null
      and m.created_at >= '2026-11-09'
      and not exists (select 1 from mant_extintores x where x.cliente_id = m.id)
      and not exists (select 1 from mant_tanques    x where x.cliente_id = m.id)
      and not exists (select 1 from mant_bomberos   x where x.cliente_id = m.id)
      and not exists (select 1 from contratos       x where x.cliente_id = m.id)
      and not exists (select 1 from obras           x where x.cliente_id = m.id);
    drop index if exists mant_clientes_codigo_unico;
    alter table mant_clientes drop column codigo;
  end if;
end $$;
drop table if exists edificio_unidades;
drop table if exists edificio_torres;

-- Control
select (select count(*) from asam_edificios) as edificios_asambleas,
       (select count(*) from asam_torres) as torres,
       (select count(*) from asambleas where edificio_id is null) as asambleas_sin_edificio;
