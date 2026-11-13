import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../../src/database/migrations';
import type { SqlDatabase, SqlExecutor } from '../../src/database/types';

// Real SQLite engine, not mocked SQL/results. Only the native transport differs.
export async function openNodeDatabase(filename: string): Promise<SqlDatabase> {
  const sqlite = new DatabaseSync(filename);
  let pending: Promise<void> = Promise.resolve();
  const execute: SqlExecutor['execute'] = async (sql, params = []) => {
    const statement = sqlite.prepare(sql);
    if (statement.columns().length) {
      return { rows: statement.all(...params), rowsAffected: 0 };
    }
    const result = statement.run(...params);
    return { rows: [], rowsAffected: Number(result.changes) };
  };
  const db: SqlDatabase = {
    execute,
    transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      const run = pending.then(async () => {
        sqlite.exec('BEGIN');
        try {
          const result = await work({ execute });
          sqlite.exec('COMMIT');
          return result;
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      });
      pending = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    async close() {
      await pending;
      sqlite.close();
    },
  };
  await initializeDatabase(db);
  return db;
}
