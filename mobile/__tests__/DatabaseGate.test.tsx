import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { DatabaseGate } from '../src/components/DatabaseGate';
import { getDatabase } from '../src/database/sqlite';
import type { SqlDatabase } from '../src/database/types';

jest.mock('../src/database/sqlite', () => ({ getDatabase: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));

test('só libera o conteúdo quando a inicialização local termina', async () => {
  let finish!: (db: SqlDatabase) => void;
  jest.mocked(getDatabase).mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  let app!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(
      <DatabaseGate>
        <Text testID="ready">Conteúdo</Text>
      </DatabaseGate>,
    );
  });
  expect(app.root.findAllByProps({ testID: 'ready' })).toHaveLength(0);
  await ReactTestRenderer.act(async () => {
    finish({} as SqlDatabase);
  });
  expect(app.root.findAllByProps({ testID: 'ready' }).length).toBeGreaterThan(
    0,
  );
  await ReactTestRenderer.act(async () => {
    app.unmount();
  });
});

test('mostra falha recuperável e permite tentar abrir novamente', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest
    .mocked(getDatabase)
    .mockRejectedValueOnce(new Error('Falha de abertura'));
  let app!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      app = ReactTestRenderer.create(
        <DatabaseGate>
          <Text testID="ready">Conteúdo</Text>
        </DatabaseGate>,
      );
    });
    expect(app.root.findAllByProps({ testID: 'ready' })).toHaveLength(0);
    expect(
      app.root.findAllByProps({ accessibilityRole: 'button' }).length,
    ).toBeGreaterThan(0);
    jest.mocked(getDatabase).mockResolvedValueOnce({} as SqlDatabase);
    await ReactTestRenderer.act(async () => {
      app.root
        .findAllByProps({ accessibilityRole: 'button' })[0]
        .props.onPress();
    });
    expect(app.root.findAllByProps({ testID: 'ready' }).length).toBeGreaterThan(
      0,
    );
  } finally {
    await ReactTestRenderer.act(async () => {
      app.unmount();
    });
    errorLog.mockRestore();
  }
});
