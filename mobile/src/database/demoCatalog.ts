import type { Product } from '../models/Product';
import type { SqlDatabase } from './types';
import { createProductRepository } from './repositories/products';

// Temporary local catalog for stage 3. It is not an authenticated pharmacy or
// a source of production data. Supabase synchronization will replace it.
export const DEMO_PHARMACY_ID = '8d2f3c7a-4b5e-4f11-9c20-1a2b3c4d5e6f';

const importedAt = '2026-09-28T00:00:00.000Z';
const demoEans = [
  '7890000000017',
  '7890000000024',
  '7890000000031',
  '7890000000048',
  '7890000000055',
  '7890000000062',
  '7890000000079',
  '7890000000086',
  '7890000000093',
  '7890000000109',
] as const;

const demoProductsWithBula = new Set([
  'FC000001',
  'FC000002',
  'FC000003',
  'FC000008',
]);

type DemoRow = readonly [
  string,
  string,
  string,
  number,
  string,
  string,
  string | null,
];

const rows: readonly DemoRow[] = [
  [
    '00000000-0000-4000-8000-000000000001',
    'Paracetamol 500mg',
    'Medicamentos',
    1290,
    'Analgésico e antitérmico para alívio de dores leves a moderadas e febre.',
    'FarmaLab',
    '500mg - 20 comprimidos',
  ],
  [
    '00000000-0000-4000-8000-000000000002',
    'Dipirona Sódica 1g',
    'Medicamentos',
    1550,
    'Analgésico e antitérmico potente para tratamento de dor e febre.',
    'MedPharma',
    '1g - 10 comprimidos',
  ],
  [
    '00000000-0000-4000-8000-000000000003',
    'Vitamina C 1000mg',
    'Vitaminas',
    2890,
    'Suplemento vitamínico para fortalecimento do sistema imunológico.',
    'VitaLife',
    '1000mg - 30 cápsulas',
  ],
  [
    '00000000-0000-4000-8000-000000000004',
    'Shampoo Anticaspa 200ml',
    'Higiene',
    2490,
    'Shampoo dermatológico para tratamento e prevenção da caspa.',
    'DermaClean',
    '200ml',
  ],
  [
    '00000000-0000-4000-8000-000000000005',
    'Protetor Solar FPS 50',
    'Cosméticos',
    4590,
    'Proteção solar de amplo espectro contra raios UVA e UVB.',
    'SunCare',
    '120ml',
  ],
  [
    '00000000-0000-4000-8000-000000000006',
    'Termômetro Digital',
    'Primeiros Socorros',
    3290,
    'Termômetro digital de alta precisão com leitura rápida.',
    'MedTech',
    null,
  ],
  [
    '00000000-0000-4000-8000-000000000007',
    'Álcool em Gel 70% 500ml',
    'Higiene',
    1890,
    'Álcool em gel para higienização das mãos.',
    'CleanHands',
    '500ml',
  ],
  [
    '00000000-0000-4000-8000-000000000008',
    'Multivitamínico Completo',
    'Vitaminas',
    5290,
    'Complexo vitamínico com vitaminas e minerais essenciais.',
    'VitaLife',
    '60 cápsulas',
  ],
  [
    '00000000-0000-4000-8000-000000000009',
    'Fralda Infantil M',
    'Infantil',
    4290,
    'Fraldas descartáveis com alta absorção e proteção.',
    'BabyCare',
    'Tamanho M',
  ],
  [
    '00000000-0000-4000-8000-000000000010',
    'Curativo Adesivo Band-Aid',
    'Primeiros Socorros',
    890,
    'Curativos adesivos estéreis para pequenos ferimentos.',
    'MediCare',
    '30 unidades',
  ],
];

const products: readonly Omit<Product, 'pharmacyId'>[] = rows.map(
  (
    [id, name, category, priceCents, description, manufacturer, dosage],
    index,
  ) => ({
    id,
    name,
    category,
    priceCents,
    description,
    manufacturer,
    dosage,
    ean: demoEans[index] ?? null,
    internalCode: `FC${String(index + 1).padStart(6, '0')}`,
    bulaPath: demoProductsWithBula.has(
      `FC${String(index + 1).padStart(6, '0')}`,
    )
      ? `demonstracao/FC${String(index + 1).padStart(6, '0')}.pdf`
      : null,
    updatedAt: importedAt,
    deletedAt: null,
  }),
);

export async function ensureDemoCatalog(
  database: SqlDatabase,
  pharmacyId = DEMO_PHARMACY_ID,
): Promise<void> {
  const repository = createProductRepository(database, pharmacyId);
  if ((await repository.count()) > 0) {
    return;
  }
  await repository.saveBatch(
    products.map(product => ({
      ...product,
      // Keep the source row suffix too: the pharmacy suffix alone would give
      // every demo product the same UUID.
      id: `${product.id.slice(0, -12)}${pharmacyId
        .replace(/-/g, '')
        .slice(-10)}${product.id.slice(-2)}`,
      pharmacyId,
    })),
  );
}
