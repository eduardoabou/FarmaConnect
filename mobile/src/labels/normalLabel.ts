import type { Product } from '../models/Product';

// Central point for the physical label assumptions. Confirm the roll dimensions
// on the NIIMBOT B1 before converting this preview to a print bitmap.
export const normalLabelSettings = {
  widthMm: 50,
  heightMm: 30,
  dpi: 203,
} as const;

export type NormalLabel = {
  pharmacyName: string;
  productName: string;
  price: string;
  details: string;
  printedAt: string;
  ean: string | null;
  internalCode: string;
  bulaUrl: string | null;
};

export function createNormalLabel(
  product: Product,
  pharmacyName: string,
  bulaUrl: string | null = null,
): NormalLabel {
  return {
    pharmacyName: pharmacyName.trim() || 'FarmaConnect',
    productName: product.name.trim(),
    price: new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(product.priceCents / 100),
    details: [product.dosage, product.manufacturer].filter(Boolean).join(' • '),
    printedAt: new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
    }).format(new Date()),
    ean: product.ean,
    internalCode: product.internalCode ?? product.id,
    bulaUrl,
  };
}
