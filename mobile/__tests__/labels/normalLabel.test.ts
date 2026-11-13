import {
  createNormalLabel,
  normalLabelSettings,
} from '../../src/labels/normalLabel';

const product = {
  id: '10000000-0000-4000-8000-000000000001',
  pharmacyId: '11111111-1111-4111-8111-111111111111',
  name: 'Paracetamol 500mg',
  category: 'Medicamentos',
  priceCents: 1290,
  description: '',
  manufacturer: 'FarmaLab',
  dosage: '500mg - 20 comprimidos',
  ean: '7890000000017',
  internalCode: 'FC000001',
  bulaPath: 'demonstracao/FC000001.pdf',
  updatedAt: '2026-09-29T00:00:00.000Z',
  deletedAt: null,
};

test('monta a etiqueta normal com dados do produto e preço em reais', () => {
  const label = createNormalLabel(
    product,
    'Farmácia Aurora',
    'https://example.supabase.co/storage/v1/object/public/bulas/demonstracao/FC000001.pdf',
  );
  expect(label.pharmacyName).toBe('Farmácia Aurora');
  expect(label.productName).toBe('Paracetamol 500mg');
  expect(label.price).toBe('R$ 12,90');
  expect(label.details).toContain('500mg - 20 comprimidos');
  expect(label.details).toContain('FarmaLab');
  expect(label.ean).toBe('7890000000017');
  expect(label.internalCode).toBe('FC000001');
  expect(label.bulaUrl).toContain('/bulas/demonstracao/FC000001.pdf');
  expect(normalLabelSettings).toEqual({ widthMm: 50, heightMm: 30, dpi: 203 });
});
