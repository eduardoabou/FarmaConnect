import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDatabase } from '../database/sqlite';
import { theme } from '../theme';

export function DatabaseGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'opening' | 'ready' | 'error'>('opening');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getDatabase().then(
      () => {
        if (active) {
          setState('ready');
        }
      },
      error => {
        console.error('FarmaConnect: falha ao abrir dados locais.', error);
        if (active) {
          setState('error');
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state === 'ready') {
    return children;
  }
  return (
    <SafeAreaView style={styles.container}>
      {state === 'opening' ? (
        <>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.text}>Preparando seu aplicativo…</Text>
        </>
      ) : (
        <>
          <Text style={styles.text} accessibilityRole="alert">
            Não foi possível abrir os dados deste aparelho. Tente novamente.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => {
              setState('opening');
              setAttempt(value => value + 1);
            }}
          >
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 52,
    padding: 16,
  },
  buttonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
});
