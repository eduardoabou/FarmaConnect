import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_LOGIN_EMAIL_KEY = '@farmaconnect/saved-login-email';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function readSavedLoginEmail(): Promise<string> {
  const savedEmail = await AsyncStorage.getItem(SAVED_LOGIN_EMAIL_KEY);
  return savedEmail ? normalizeEmail(savedEmail) : '';
}

export async function saveLoginEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(SAVED_LOGIN_EMAIL_KEY, normalizeEmail(email));
}
