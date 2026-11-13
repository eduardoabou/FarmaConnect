import {
  ensureDemoCatalog,
  DEMO_PHARMACY_ID,
} from '../../src/database/demoCatalog';
import { createProductRepository } from '../../src/database/repositories/products';
import { openNodeDatabase } from './nodeDatabase';

test('importa o catálogo de demonstração uma única vez no SQLite local', async () => {
  const database = await openNodeDatabase(':memory:');
  try {
    await ensureDemoCatalog(database);
    const repository = createProductRepository(database, DEMO_PHARMACY_ID);
    expect(await repository.count()).toBe(10);
    const alcoholProducts = await repository.list({ search: 'alcool' });
    expect(alcoholProducts[0].name).toBe(
      'Álcool em Gel 70% 500ml',
    );
    expect(alcoholProducts[0].bulaPath).toBeNull();
    await ensureDemoCatalog(database);
    expect(await repository.count()).toBe(10);
  } finally {
    await database.close();
  }
});
