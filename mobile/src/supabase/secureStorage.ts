import * as Keychain from 'react-native-keychain';

function serviceFor(key: string): string {
  return `com.farmaconnect.secure.${encodeURIComponent(key)}`;
}

const options = {
  storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
};

// Compatible with Supabase's async storage contract. Android Keystore encrypts
// the session token; no password is retained by the application.
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service: serviceFor(key),
    });
    return result ? result.password : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    const result = await Keychain.setGenericPassword('farmaconnect', value, {
      ...options,
      service: serviceFor(key),
    });
    if (!result) throw new Error('Não foi possível proteger a sessão.');
  },

  async removeItem(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: serviceFor(key) });
  },
};
