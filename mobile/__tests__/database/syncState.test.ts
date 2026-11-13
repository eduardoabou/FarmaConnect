import { createSyncStateRepository } from '../../src/database/repositories/syncState';
import { openNodeDatabase } from './nodeDatabase';

const aurora = '11111111-1111-4111-8111-111111111111';
const horizonte = '22222222-2222-4222-8222-222222222222';

test('guarda a última sincronização separadamente por farmácia', async () => {
  const database = await openNodeDatabase(':memory:');
  try {
    const auroraState = createSyncStateRepository(database, aurora);
    const horizonteState = createSyncStateRepository(database, horizonte);

    expect(await auroraState.lastSyncedAt()).toBeNull();
    await auroraState.markSynchronized('2026-09-28T21:00:00-03:00');
    expect(await auroraState.lastSyncedAt()).toBe('2026-09-29T00:00:00.000Z');
    expect(await horizonteState.lastSyncedAt()).toBeNull();

    await auroraState.clear();
    expect(await auroraState.lastSyncedAt()).toBeNull();
  } finally {
    await database.close();
  }
});
