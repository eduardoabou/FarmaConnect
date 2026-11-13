export const BULA_BUCKET = 'bulas';

type PublicStorage = {
  from(bucket: string): {
    getPublicUrl(path: string): { data: { publicUrl: string } };
  };
};

export function isBulaPath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('..') &&
    value.toLowerCase().endsWith('.pdf')
  );
}

// Storage is public-read by design: the resulting URL is placed in a QR Code
// and must open in any phone browser, with or without the FarmaConnect app.
export function getBulaPublicUrl(
  storage: PublicStorage,
  bulaPath: string | null,
): string | null {
  if (!bulaPath || !isBulaPath(bulaPath)) return null;
  return storage.from(BULA_BUCKET).getPublicUrl(bulaPath).data.publicUrl;
}
