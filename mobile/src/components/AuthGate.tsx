import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { createProductRepository } from '../database/repositories/products';
import { createSyncStateRepository } from '../database/repositories/syncState';
import { getDatabase } from '../database/sqlite';
import { LoginScreen } from '../screens/LoginScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import {
  clearCachedProfile,
  readCachedProfile,
  saveCachedProfile,
} from '../supabase/authProfile';
import { supabase } from '../supabase/client';
import { theme } from '../theme';

type PharmacyRelation = { name: string } | { name: string }[] | null;
type RemoteProfile = {
  pharmacy_id: string;
  pharmacies: PharmacyRelation;
};
type Profile = { pharmacyId: string; pharmacyName: string };

function nameFrom(profile: RemoteProfile): string {
  const pharmacy = Array.isArray(profile.pharmacies)
    ? profile.pharmacies[0]
    : profile.pharmacies;
  return pharmacy?.name ?? 'Sua farmácia';
}

export function AuthGate() {
  const [session, setSession] = useState<Session | null>();
  const [profile, setProfile] = useState<Profile | null>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setProfile(null);
      setError(undefined);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const refresh = () => supabase.auth.startAutoRefresh();
    refresh();
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') refresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    // The encrypted profile is enough to open the SQLite catalog. The remote
    // request below refreshes it later and must never delay offline startup.
    readCachedProfile(session.user.id)
      .then(cached => {
        if (active && cached) {
          setProfile({
            pharmacyId: cached.pharmacyId,
            pharmacyName: cached.pharmacyName,
          });
        }
      })
      .catch(() => {});
    supabase
      .from('profiles')
      .select('pharmacy_id, pharmacies(name)')
      .single()
      .then(
        async ({ data, error: queryError }) => {
          if (!active) return;
          if (!queryError && data) {
            const remote = data as RemoteProfile;
            const next = {
              pharmacyId: remote.pharmacy_id,
              pharmacyName: nameFrom(remote),
            };
            setProfile(next);
            saveCachedProfile({ userId: session.user.id, ...next }).catch(
              () => {},
            );
            return;
          }

          const cached = await readCachedProfile(session.user.id).catch(
            () => null,
          );
          if (!active) return;
          if (cached) {
            setProfile({
              pharmacyId: cached.pharmacyId,
              pharmacyName: cached.pharmacyName,
            });
          } else {
            setError('Sua conta não está vinculada a uma farmácia.');
          }
        },
        async () => {
          const cached = await readCachedProfile(session.user.id).catch(
            () => null,
          );
          if (!active) return;
          if (cached) {
            setProfile({
              pharmacyId: cached.pharmacyId,
              pharmacyName: cached.pharmacyName,
            });
          } else {
            setError('Sua conta não está vinculada a uma farmácia.');
          }
        },
      );
    return () => {
      active = false;
    };
  }, [session]);

  const signOut = async () => {
    try {
      if (profile) {
        const database = await getDatabase();
        await createProductRepository(database, profile.pharmacyId).clear();
        await createSyncStateRepository(database, profile.pharmacyId).clear();
      }
    } finally {
      await clearCachedProfile().catch(() => {});
      await supabase.auth.signOut();
    }
  };

  if (session === undefined) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }
  if (!session) return <LoginScreen />;
  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => signOut().catch(() => {})}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Sair</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (!profile) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text>Carregando sua farmácia…</Text>
      </SafeAreaView>
    );
  }
  return (
    <CatalogScreen
      pharmacyId={profile.pharmacyId}
      pharmacyName={profile.pharmacyName}
      onSignOut={() => signOut().catch(() => {})}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    padding: 28,
    gap: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  error: { fontSize: 16, textAlign: 'center', color: '#b42318' },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: { color: theme.colors.white, fontWeight: '700' },
});
