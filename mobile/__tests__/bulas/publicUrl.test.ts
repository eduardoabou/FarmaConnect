import {
  BULA_BUCKET,
  getBulaPublicUrl,
  isBulaPath,
} from '../../src/bulas/publicUrl';

test('aceita somente caminhos relativos de PDF para bulas', () => {
  expect(isBulaPath('demonstracao/FC000002.pdf')).toBe(true);
  expect(isBulaPath('/demonstracao/FC000002.pdf')).toBe(false);
  expect(isBulaPath('../segredo.pdf')).toBe(false);
  expect(isBulaPath('demonstracao/texto.txt')).toBe(false);
});

test('recupera a URL pública do bucket bulas sem armazenar o PDF', () => {
  const getPublicUrl = jest.fn().mockReturnValue({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/bulas/demonstracao/FC000002.pdf' },
  });
  const storage = { from: jest.fn().mockReturnValue({ getPublicUrl }) };

  expect(getBulaPublicUrl(storage, 'demonstracao/FC000002.pdf')).toContain(
    '/bulas/demonstracao/FC000002.pdf',
  );
  expect(storage.from).toHaveBeenCalledWith(BULA_BUCKET);
  expect(getBulaPublicUrl(storage, null)).toBeNull();
});
