import type { SqlDatabase } from '../types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pharmacyId(value: string): string {
  if (!uuidPattern.test(value)) throw new Error('Identificador UUID inválido.');
  return value.toLowerCase();
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Data inválida.');
  return date.toISOString();
}

export function createSyncStateRepository(
  database: SqlDatabase,
  pharmacy: string,
) {
  const id = pharmacyId(pharmacy);
  return {
    async lastSyncedAt(): Promise<string | null> {
      return database.transaction(async tx => {
        const result = await tx.execute(
          'SELECT last_synced_at FROM sync_state WHERE pharmacy_id = ?',
          [id],
        );
        return result.rows[0] ? String(result.rows[0].last_synced_at) : null;
      });
    },

    async markSynchronized(value: string): Promise<string> {
      const syncedAt = timestamp(value);
      await database.transaction(async tx => {
        await tx.execute(
          `INSERT INTO sync_state (pharmacy_id, last_synced_at) VALUES (?, ?)
           ON CONFLICT(pharmacy_id) DO UPDATE SET
             last_synced_at = excluded.last_synced_at`,
          [id, syncedAt],
        );
      });
      return syncedAt;
    },

    async clear(): Promise<void> {
      await database.transaction(async tx => {
        await tx.execute('DELETE FROM sync_state WHERE pharmacy_id = ?', [id]);
      });
    },
  };
}
