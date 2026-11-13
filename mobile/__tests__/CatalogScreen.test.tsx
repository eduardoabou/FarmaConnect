import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { CatalogScreen, formatPrice } from '../src/screens/CatalogScreen';
import { getDatabase } from '../src/database/sqlite';
import { ensureDemoCatalog } from '../src/database/demoCatalog';
import { createProductRepository } from '../src/database/repositories/products';
import { createSyncStateRepository } from '../src/database/repositories/syncState';
import { printWithConnectedPrinter } from '../src/printer/printerSession';

jest.useFakeTimers();
jest.mock('../src/database/sqlite', () => ({ getDatabase: jest.fn() }));
jest.mock('../src/database/demoCatalog', () => ({
  DEMO_PHARMACY_ID: '8d2f3c7a-4b5e-4f11-9c20-1a2b3c4d5e6f',
  ensureDemoCatalog: jest.fn(),
}));
jest.mock('../src/database/repositories/products', () => ({
  createProductRepository: jest.fn(),
}));
jest.mock('../src/database/repositories/syncState', () => ({
  createSyncStateRepository: jest.fn(),
}));
jest.mock('../src/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('../src/printer/printerSession', () => ({
  PrinterNotConnectedError: class PrinterNotConnectedError extends Error {},
  getPrinterManager: jest.fn(() => ({ stopDeviceScan: jest.fn() })),
  printWithConnectedPrinter: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({ isConnected: false }),
  },
}));

const product = {
  id: '00000000-0000-4000-8000-000000000001',
  pharmacyId: '8d2f3c7a-4b5e-4f11-9c20-1a2b3c4d5e6f',
  name: 'Paracetamol 500mg',
  category: 'Medicamentos',
  priceCents: 1290,
  description: 'Descrição de teste.',
  manufacturer: 'FarmaLab',
  dosage: '500mg - 20 comprimidos',
  ean: '7890000000017',
  internalCode: 'FC000001',
  bulaPath: null,
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDatabase).mockResolvedValue({} as never);
  jest.mocked(ensureDemoCatalog).mockResolvedValue();
  jest.mocked(createProductRepository).mockReturnValue({
    categories: jest.fn().mockResolvedValue(['Medicamentos']),
    count: jest.fn().mockResolvedValue(1),
    list: jest.fn().mockResolvedValue([product]),
  } as never);
  jest.mocked(createSyncStateRepository).mockReturnValue({
    lastSyncedAt: jest.fn().mockResolvedValue(null),
  } as never);
});

test('mostra catálogo local, repassa a busca e abre o INFO', async () => {
  let app!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(<CatalogScreen />);
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(150);
    await Promise.resolve();
  });
  expect(
    app.root.findAllByProps({ children: 'Paracetamol 500mg' }).length,
  ).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => {
    app.root.findByType(TextInput).props.onChangeText('para');
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(150);
    await Promise.resolve();
  });
  const repository = jest.mocked(createProductRepository).mock.results[1].value;
  expect(repository.list).toHaveBeenLastCalledWith({
    search: 'para',
    category: undefined,
    limit: 100,
  });

  await ReactTestRenderer.act(async () => {
    app.root
      .findAllByProps({
        accessibilityLabel: 'Informações sobre Paracetamol 500mg',
      })[0]
      .props.onPress();
  });
  expect(
    app.root.findAllByProps({
      accessibilityLabel: 'Informações do produto',
    }).length,
  ).toBeGreaterThan(0);
  expect(
    app.root.findAllByProps({ children: 'Descrição de teste.' }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(async () => app.unmount());
});

test('formata o preço em centavos para reais', () => {
  expect(formatPrice(1290)).toBe('R$ 12,90');
});

test('identifica no catálogo os produtos com bula', async () => {
  jest.mocked(createProductRepository).mockReturnValue({
    categories: jest.fn().mockResolvedValue(['Medicamentos']),
    count: jest.fn().mockResolvedValue(1),
    list: jest.fn().mockResolvedValue([
      { ...product, bulaPath: 'demonstracao/FC000001.pdf' },
    ]),
  } as never);

  let app!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(<CatalogScreen />);
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(150);
    await Promise.resolve();
  });

  expect(
    app.root.findAllByProps({
      accessibilityLabel: 'Produto com QR Code da bula disponível',
    }),
  ).not.toHaveLength(0);
  await ReactTestRenderer.act(async () => app.unmount());
});

test('envia a etiqueta diretamente ao tocar em IMPRIMIR', async () => {
  let app!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(
      <CatalogScreen pharmacyName="Farmácia Aurora" />,
    );
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(150);
    await Promise.resolve();
  });

  await ReactTestRenderer.act(async () => {
    app.root
      .findByProps({
        accessibilityLabel: 'Imprimir etiqueta de Paracetamol 500mg',
      })
      .props.onPress();
    await Promise.resolve();
  });

  expect(printWithConnectedPrinter).toHaveBeenCalledWith(
    expect.objectContaining({
      productName: 'Paracetamol 500mg',
      pharmacyName: 'Farmácia Aurora',
      ean: '7890000000017',
      internalCode: 'FC000001',
      bulaUrl: null,
    }),
  );
  expect(
    app.root.findAllByProps({ children: 'Prévia da etiqueta normal' }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(async () => app.unmount());
});

test('envia todas as etiquetas da farmácia pelo menu', async () => {
  let app!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(
      <CatalogScreen pharmacyName="Farmácia Aurora" />,
    );
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(150);
    await Promise.resolve();
  });

  await ReactTestRenderer.act(async () => {
    app.root.findByProps({ accessibilityLabel: 'Abrir menu' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'Imprimir todas as etiquetas' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(printWithConnectedPrinter).toHaveBeenCalledWith(
    expect.objectContaining({
      productName: 'Paracetamol 500mg',
      pharmacyName: 'Farmácia Aurora',
    }),
  );
  await ReactTestRenderer.act(async () => app.unmount());
});
