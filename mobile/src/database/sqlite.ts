import { open } from '@op-engineering/op-sqlite';
import { initializeDatabase } from './migrations';
import type { SqlDatabase, SqlExecutor } from './types';

const DATABASE_NAME = 'farmaconnect.sqlite';
let databasePromise: Promise<SqlDatabase> | undefined;

// Open once per app session. Components must not close the shared connection.
export function getDatabase(): Promise<SqlDatabase> {
  if (!databasePromise) {
    databasePromise = openLocalDatabase(DATABASE_NAME).catch(error => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

// Separate filenames are used by device verification, never by user input.
export async function openLocalDatabase(name: string): Promise<SqlDatabase> {
  if (!/^[a-z0-9_-]+\.sqlite$/.test(name)) {
    throw new Error('Nome de banco local inválido.');
  }
  const native = open({ name });
  const database: SqlDatabase = {
    execute: (sql, params = []) => native.execute(sql, params),
    async transaction<T>(work: (tx: SqlExecutor) => Promise<T>) {
      let value: T;
      await native.transaction(async tx => {
        value = await work({
          execute: (sql, params = []) => tx.execute(sql, params),
        });
      });
      return value!;
    },
    close: () => native.closeAsync(),
  };

  try {
    await initializeDatabase(database);
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}
