jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readSavedLoginEmail, saveLoginEmail } from '../../src/auth/savedLoginEmail';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
});

test('salva somente o e-mail normalizado do ultimo login', async () => {
  await saveLoginEmail('  TESTE01@FARMACONNECT.DEV ');
  expect(storage.setItem).toHaveBeenCalledWith(
    '@farmaconnect/saved-login-email',
    'teste01@farmaconnect.dev',
  );
});

test('recupera o e-mail salvo sem qualquer dado de senha', async () => {
  storage.getItem.mockResolvedValue(' TESTE02@FARMACONNECT.DEV ');
  await expect(readSavedLoginEmail()).resolves.toBe('teste02@farmaconnect.dev');
  expect(storage.getItem).toHaveBeenCalledWith('@farmaconnect/saved-login-email');
});
