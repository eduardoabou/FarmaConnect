export interface Product {
  id: string;
  pharmacyId: string;
  name: string;
  category: string;
  // BRL minor units: R$ 12,90 is stored as 1290, never a floating point price.
  priceCents: number;
  description: string;
  manufacturer: string;
  dosage: string | null;
  ean: string | null;
  internalCode: string | null;
  // Object key in the public `bulas` bucket. PDFs themselves stay remote.
  bulaPath: string | null;
  updatedAt: string;
  deletedAt: string | null;
}
