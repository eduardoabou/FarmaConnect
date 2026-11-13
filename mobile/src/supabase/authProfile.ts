import { secureStorage } from './secureStorage';

const profileKey = 'farmaconnect.auth-profile.v1';

export type CachedProfile = {
  userId: string;
  pharmacyId: string;
  pharmacyName: string;
};

export async function saveCachedProfile(profile: CachedProfile): Promise<void> {
  await secureStorage.setItem(profileKey, JSON.stringify(profile));
}

export async function readCachedProfile(
  userId: string,
): Promise<CachedProfile | null> {
  const stored = await secureStorage.getItem(profileKey);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<CachedProfile>;
    if (
      value.userId !== userId ||
      typeof value.pharmacyId !== 'string' ||
      typeof value.pharmacyName !== 'string'
    ) {
      return null;
    }
    return value as CachedProfile;
  } catch {
    return null;
  }
}

export async function clearCachedProfile(): Promise<void> {
  await secureStorage.removeItem(profileKey);
}
