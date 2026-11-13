import {
  createNormalLabelRaster,
  normalLabelRasterSize,
} from '../../src/printer/normalLabelRaster';

describe('normal label raster', () => {
  it('creates the B1 raster for Dipirona Sódica 1g', () => {
    const rows = createNormalLabelRaster({
      pharmacyName: 'Farmácia Aurora',
      productName: 'Dipirona Sódica 1g',
      price: 'R$ 15,50',
      details: '',
      printedAt: '30/09/2026',
      ean: '7890000000024',
      internalCode: 'FC000002',
      bulaUrl: 'https://example.supabase.co/storage/v1/object/public/bulas/demonstracao/FC000002.pdf',
    });

    expect(rows).toHaveLength(normalLabelRasterSize.height);
    expect(rows.every(row => row.length === normalLabelRasterSize.width)).toBe(
      true,
    );
    expect(rows.some(row => Array.from(row).some(pixel => pixel === 1))).toBe(
      true,
    );
    expect(
      rows.slice(10, 31).some(row =>
        Array.from(row.slice(350, 369)).some(pixel => pixel === 1),
      ),
    ).toBe(true);
    expect(
      rows.slice(90, 101).some(row =>
        Array.from(row.slice(0, 160)).some(pixel => pixel === 1),
      ),
    ).toBe(true);
    expect(
      rows.slice(152, 230).some(row =>
        Array.from(row.slice(160, 375)).some(pixel => pixel === 1),
      ),
    ).toBe(true);
    expect(
      rows.slice(130, 230).some(row =>
        Array.from(row.slice(10, 145)).some(pixel => pixel === 1),
      ),
    ).toBe(true);
    expect(
      rows.slice(140, 200).some(row =>
        Array.from(row.slice(100, 160)).some(pixel => pixel === 1),
      ),
    ).toBe(true);
    expect(
      rows.slice(230).every(row =>
        Array.from(row).every(pixel => pixel === 0),
      ),
    ).toBe(true);
  });
});
