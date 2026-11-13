import type { Product } from '../../models/Product';
import type { SqlDatabase, SqlRow, SqlValue } from '../types';

export interface ProductFilter {
  search?: string;
  category?: string;
}

export interface ProductPage extends ProductFilter {
  limit?: number;
  offset?: number;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new Error('Identificador UUID inválido.');
  }
  return value.toLowerCase();
}

function timestamp(value: string): string {
  if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('A data deve incluir hora e fuso horário.');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error('Data inválida.');
  }
  return parsed.toISOString();
}

function nonempty(value: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Nome e categoria são obrigatórios.');
  }
  return value.trim();
}

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function fromRow(row: SqlRow): Product {
  return {
    id: String(row.id),
    pharmacyId: String(row.pharmacy_id),
    name: String(row.name),
    category: String(row.category),
    priceCents: Number(row.price_cents),
    description: String(row.description),
    manufacturer: String(row.manufacturer),
    dosage: row.dosage === null ? null : String(row.dosage),
    ean: row.ean === null || row.ean === undefined ? null : String(row.ean),
    internalCode:
      row.internal_code === null || row.internal_code === undefined
        ? null
        : String(row.internal_code),
    bulaPath:
      row.bula_path === null || row.bula_path === undefined
        ? null
        : String(row.bula_path),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  };
}

export function createProductRepository(
  database: SqlDatabase,
  pharmacy: string,
) {
  const pharmacyId = uuid(pharmacy);

  function where(filter: ProductFilter) {
    let sql = 'pharmacy_id = ? AND deleted_at IS NULL';
    const params: SqlValue[] = [pharmacyId];
    if (filter.search?.trim()) {
      const term = searchable(filter.search.trim());
      // instr treats %, _ and quotes literally; values always use parameters.
      sql +=
        ' AND (instr(search_name, ?) > 0 OR instr(search_category, ?) > 0)';
      params.push(term, term);
    }
    if (filter.category !== undefined) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    return { sql, params };
  }

  return {
    async list(filter: ProductPage = {}): Promise<Product[]> {
      const { limit = 100, offset = 0 } = filter;
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 500 ||
        !Number.isSafeInteger(offset) ||
        offset < 0
      ) {
        throw new Error('Paginação inválida.');
      }
      const clause = where(filter);
      return database.transaction(async tx => {
        const result = await tx.execute(
          `SELECT * FROM products WHERE ${clause.sql}
           ORDER BY search_name, id LIMIT ? OFFSET ?`,
          [...clause.params, limit, offset],
        );
        return result.rows.map(fromRow);
      });
    },

    async count(filter: ProductFilter = {}): Promise<number> {
      const clause = where(filter);
      return database.transaction(async tx => {
        const result = await tx.execute(
          `SELECT COUNT(*) AS total FROM products WHERE ${clause.sql}`,
          clause.params,
        );
        return Number(result.rows[0].total);
      });
    },

    async getById(id: string): Promise<Product | null> {
      const productId = uuid(id);
      return database.transaction(async tx => {
        const result = await tx.execute(
          'SELECT * FROM products WHERE id = ? AND pharmacy_id = ? AND deleted_at IS NULL',
          [productId, pharmacyId],
        );
        return result.rows[0] ? fromRow(result.rows[0]) : null;
      });
    },

    async categories(): Promise<string[]> {
      return database.transaction(async tx => {
        const result = await tx.execute(
          `SELECT DISTINCT category FROM products
           WHERE pharmacy_id = ? AND deleted_at IS NULL ORDER BY category`,
          [pharmacyId],
        );
        return result.rows.map(row => String(row.category));
      });
    },

    // Internal persistence API for imports/future sync. No product-editing UI.
    async saveBatch(products: readonly Product[]): Promise<void> {
      const validated = products.map(product => {
        if (uuid(product.pharmacyId) !== pharmacyId) {
          throw new Error('Produto de outra farmácia.');
        }
        if (
          !Number.isSafeInteger(product.priceCents) ||
          product.priceCents < 0
        ) {
          throw new Error(
            'Preço deve ser um inteiro não negativo em centavos.',
          );
        }
        if (
          typeof product.description !== 'string' ||
          typeof product.manufacturer !== 'string' ||
          (product.dosage !== null && typeof product.dosage !== 'string') ||
          (product.ean !== null && typeof product.ean !== 'string') ||
          (product.internalCode !== null &&
            typeof product.internalCode !== 'string') ||
          (product.bulaPath !== null && typeof product.bulaPath !== 'string')
        ) {
          throw new Error('Informações do produto inválidas.');
        }
        return {
          ...product,
          id: uuid(product.id),
          pharmacyId,
          name: nonempty(product.name),
          category: nonempty(product.category),
          updatedAt: timestamp(product.updatedAt),
          deletedAt:
            product.deletedAt === null ? null : timestamp(product.deletedAt),
        };
      });

      await database.transaction(async tx => {
        for (const product of validated) {
          const existing = await tx.execute(
            'SELECT pharmacy_id FROM products WHERE id = ?',
            [product.id],
          );
          if (existing.rows[0] && existing.rows[0].pharmacy_id !== pharmacyId) {
            throw new Error('O identificador já pertence a outra farmácia.');
          }
          await tx.execute(
            `INSERT INTO products (
              id, pharmacy_id, name, category, price_cents, description,
              manufacturer, dosage, ean, internal_code, bula_path, updated_at, deleted_at,
              search_name, search_category
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, category = excluded.category,
              price_cents = excluded.price_cents, description = excluded.description,
              manufacturer = excluded.manufacturer, dosage = excluded.dosage,
              ean = excluded.ean, internal_code = excluded.internal_code,
              bula_path = excluded.bula_path,
              updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
              search_name = excluded.search_name, search_category = excluded.search_category`,
            [
              product.id,
              pharmacyId,
              product.name,
              product.category,
              product.priceCents,
              product.description,
              product.manufacturer,
              product.dosage,
              product.ean,
              product.internalCode,
              product.bulaPath,
              product.updatedAt,
              product.deletedAt,
              searchable(product.name),
              searchable(product.category),
            ],
          );
        }
      });
    },

    // Intended for local cleanup on future logout/account changes.
    async clear(): Promise<void> {
      await database.transaction(async tx => {
        await tx.execute('DELETE FROM products WHERE pharmacy_id = ?', [
          pharmacyId,
        ]);
      });
    },
  };
}
