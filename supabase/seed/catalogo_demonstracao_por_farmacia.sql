-- Catálogo de demonstração dividido entre as três farmácias existentes.
-- Execute após as migrações 20260929000000_product_identifiers.sql e
-- 20261001000000_product_bulas.sql.
-- Os EANs abaixo são demonstrativos, válidos no formato EAN-13, e devem ser
-- substituídos pelos códigos oficiais dos fabricantes no catálogo real.

with catalogo(id, farmacia, name, category, price_cents, description, manufacturer, dosage, ean, internal_code, bula_path) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'Farmácia Aurora', 'Paracetamol 500mg', 'Medicamentos', 1290, 'Analgésico e antitérmico para dores leves e febre.', 'FarmaLab', '500mg - 20 comprimidos', '7890000000017', 'FC000001', 'demonstracao/FC000001.pdf'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'Farmácia Aurora', 'Dipirona Sódica 1g', 'Medicamentos', 1550, 'Analgésico e antitérmico para dor e febre.', 'MedPharma', '1g - 10 comprimidos', '7890000000024', 'FC000002', 'demonstracao/FC000002.pdf'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'Farmácia Aurora', 'Vitamina C 1000mg', 'Vitaminas', 2890, 'Suplemento vitamínico.', 'VitaLife', '1000mg - 30 cápsulas', '7890000000031', 'FC000003', 'demonstracao/FC000003.pdf'),
    ('20000000-0000-4000-8000-000000000001'::uuid, 'Farmácia Horizonte', 'Shampoo Anticaspa 200ml', 'Higiene', 2490, 'Shampoo dermatológico para caspa.', 'DermaClean', '200ml', '7890000000048', 'FC000004', null),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'Farmácia Horizonte', 'Protetor Solar FPS 50', 'Cosméticos', 4590, 'Proteção contra raios UVA e UVB.', 'SunCare', '120ml', '7890000000055', 'FC000005', null),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'Farmácia Horizonte', 'Álcool em Gel 70% 500ml', 'Higiene', 1890, 'Higienização das mãos.', 'CleanHands', '500ml', '7890000000062', 'FC000006', null),
    ('30000000-0000-4000-8000-000000000001'::uuid, 'Farmácia Vida', 'Termômetro Digital', 'Primeiros Socorros', 3290, 'Termômetro digital de leitura rápida.', 'MedTech', null, '7890000000079', 'FC000007', null),
    ('30000000-0000-4000-8000-000000000002'::uuid, 'Farmácia Vida', 'Multivitamínico Completo', 'Vitaminas', 5290, 'Complexo vitamínico e mineral.', 'VitaLife', '60 cápsulas', '7890000000086', 'FC000008', 'demonstracao/FC000008.pdf'),
    ('30000000-0000-4000-8000-000000000003'::uuid, 'Farmácia Vida', 'Fralda Infantil M', 'Infantil', 4290, 'Fraldas descartáveis de alta absorção.', 'BabyCare', 'Tamanho M', '7890000000093', 'FC000009', null),
    ('30000000-0000-4000-8000-000000000004'::uuid, 'Farmácia Vida', 'Curativo Adesivo Band-Aid', 'Primeiros Socorros', 890, 'Curativos para pequenos ferimentos.', 'MediCare', '30 unidades', '7890000000109', 'FC000010', null)
)
insert into public.products (id, pharmacy_id, name, category, price_cents, description, manufacturer, dosage, ean, internal_code, bula_path)
select catalogo.id, pharmacies.id, catalogo.name, catalogo.category, catalogo.price_cents, catalogo.description, catalogo.manufacturer, catalogo.dosage, catalogo.ean, catalogo.internal_code, catalogo.bula_path
from catalogo join public.pharmacies on pharmacies.name = catalogo.farmacia
on conflict (id) do update set
  pharmacy_id = excluded.pharmacy_id, name = excluded.name, category = excluded.category,
  price_cents = excluded.price_cents, description = excluded.description,
  manufacturer = excluded.manufacturer, dosage = excluded.dosage,
  ean = excluded.ean, internal_code = excluded.internal_code,
  bula_path = excluded.bula_path, deleted_at = null;

select setval('public.products_internal_code_seq', 10, true);
