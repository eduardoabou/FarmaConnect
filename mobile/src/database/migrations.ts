import type { SqlDatabase } from './types';

export interface Migration {
  version: number;
  statements: readonly string[];
}

// Published migrations must stay unchanged. Add a new version for future changes.
export const migrations: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE products (
        id TEXT PRIMARY KEY NOT NULL,
        pharmacy_id TEXT NOT NULL CHECK(length(pharmacy_id) = 36),
        name TEXT NOT NULL CHECK(length(trim(name)) > 0),
        category TEXT NOT NULL CHECK(length(trim(category)) > 0),
        price_cents INTEGER NOT NULL
          CHECK(typeof(price_cents) = 'integer' AND price_cents >= 0),
        description TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        dosage TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        search_name TEXT NOT NULL,
        search_category TEXT NOT NULL
      )`,
      `CREATE INDEX products_pharmacy_active_name
        ON products(pharmacy_id, deleted_at, search_name, id)`,
      `CREATE INDEX products_pharmacy_active_category
        ON products(pharmacy_id, deleted_at, category)`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE sync_state (
        pharmacy_id TEXT PRIMARY KEY NOT NULL CHECK(length(pharmacy_id) = 36),
        last_synced_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 3,
    statements: [
      'ALTER TABLE products ADD COLUMN ean TEXT',
      'ALTER TABLE products ADD COLUMN internal_code TEXT',
      'CREATE UNIQUE INDEX products_internal_code_unique ON products(internal_code) WHERE internal_code IS NOT NULL',
      'CREATE UNIQUE INDEX products_ean_unique ON products(ean) WHERE ean IS NOT NULL',
    ],
  },
  {
    version: 4,
    statements: [
      'ALTER TABLE products ADD COLUMN bula_path TEXT',
    ],
  },
];

export const SCHEMA_VERSION = migrations[migrations.length - 1].version;

export async function migrate(
  database: SqlDatabase,
  versions: readonly Migration[] = migrations,
): Promise<void> {
  if (!versions.length || versions.some((item, i) => item.version !== i + 1)) {
    throw new Error('A sequência de migrações é inválida.');
  }

  await database.transaction(async tx => {
    const result = await tx.execute('PRAGMA user_version');
    const currentVersion = Number(result.rows[0]?.user_version);
    if (!Number.isInteger(currentVersion) || currentVersion < 0) {
      throw new Error('Não foi possível identificar a versão do banco.');
    }
    if (currentVersion > versions[versions.length - 1].version) {
      throw new Error('O banco exige uma versão mais recente do aplicativo.');
    }

    for (const migration of versions) {
      if (migration.version <= currentVersion) {
        continue;
      }
      for (const statement of migration.statements) {
        await tx.execute(statement);
      }
      // Only trusted, validated migration versions enter this PRAGMA.
      await tx.execute(`PRAGMA user_version = ${migration.version}`);
    }
  });
}

export async function initializeDatabase(database: SqlDatabase): Promise<void> {
  await database.execute('PRAGMA foreign_keys = ON');
  await database.execute('PRAGMA busy_timeout = 5000');
  await database.execute('PRAGMA journal_mode = WAL');
  await migrate(database);
}
