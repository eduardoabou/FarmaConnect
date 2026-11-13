import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { readSavedLoginEmail, saveLoginEmail } from '../auth/savedLoginEmail';
import { supabase } from '../supabase/client';

const colors = {
  primary: '#3188A6', primaryDark: '#236B83', paleBlue: '#DDF2FA', background: '#F2F8FA',
  white: '#FFFFFF', text: '#34434A', muted: '#718087', border: '#C9DFE8',
};

export function LoginScreen() {
  const scrollView = useRef<ScrollViewInstance>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    readSavedLoginEmail().then(savedEmail => {
      if (mounted) setEmail(savedEmail);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const login = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setError(undefined);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (loginError) {
      const code = loginError.code ?? 'auth_error';
      console.warn('FarmaConnect Auth:', code);
      if (code === 'email_not_confirmed') setError('Confirme o e-mail desta conta no Supabase antes de entrar.');
      else if (code === 'invalid_credentials') setError('E-mail ou senha inválidos. Código: invalid_credentials.');
      else setError(`Não foi possível entrar. Código: ${code}.`);
    } else {
      saveLoginEmail(normalizedEmail).catch(() => undefined);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.background}>
        <View style={styles.topGlow} />
        <View style={styles.topWave} />
        <View style={styles.topCircle} />
        <Text style={styles.watermarkCross}>+</Text>
        <View style={styles.bottomWave} />
        <View style={styles.bottomCircle} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoiding}>
        <ScrollView ref={scrollView} bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.logo} accessibilityElementsHidden>
              <View style={styles.logoCrossVertical} />
              <View style={styles.logoCrossHorizontal} />
              <View style={styles.logoCapsule}>
                <View style={styles.logoCapsuleBlue} />
                <View style={styles.logoCapsuleGray} />
              </View>
            </View>
            <Text style={styles.title} accessibilityRole="header">FarmaConnect</Text>
            <Text style={styles.subtitle}>Entre para acessar sua farmácia</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputShell}>
                <Text style={styles.fieldIcon} accessibilityElementsHidden>✉</Text>
                <TextInput accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Digite seu e-mail" placeholderTextColor={colors.muted} style={styles.input} value={email} onChangeText={setEmail} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputShell}>
                <Text style={styles.fieldIcon} accessibilityElementsHidden>🔒</Text>
                <TextInput accessibilityLabel="Senha" secureTextEntry={!passwordVisible} placeholder="Digite sua senha" placeholderTextColor={colors.muted} style={styles.input} value={password} onChangeText={setPassword} onFocus={() => setTimeout(() => scrollView.current?.scrollToEnd({ animated: true }), 120)} />
                <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} hitSlop={8} onPress={() => setPasswordVisible(visible => !visible)} style={styles.eyeButton}>
                  <View style={styles.eyeOutline}><View style={styles.eyePupil} /></View>
                  {!passwordVisible ? <View style={styles.eyeSlash} /> : null}
                </Pressable>
              </View>
            </View>

            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={loading || !email || !password}
              onPress={() => { login().catch(() => setError('Não foi possível entrar.')); }}
              style={({ pressed }) => [styles.button, (loading || !email || !password) && styles.buttonDisabled, pressed && styles.buttonPressed]}
            >
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Entrar</Text>}
            </Pressable>
            <Text style={styles.secure}>🔒  Acesso seguro</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  background: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  topGlow: { position: 'absolute', top: -130, left: -80, width: 560, height: 390, borderRadius: 280, backgroundColor: colors.paleBlue },
  topWave: { position: 'absolute', top: 190, left: -110, width: 600, height: 210, borderRadius: 300, borderWidth: 34, borderColor: '#EAF7FC', transform: [{ rotate: '13deg' }] },
  topCircle: { position: 'absolute', top: 230, left: 28, width: 78, height: 78, borderRadius: 39, backgroundColor: '#D7EFF8' },
  watermarkCross: { position: 'absolute', top: 38, right: 28, color: colors.white, fontSize: 164, fontWeight: '200', opacity: 0.38 },
  bottomWave: { position: 'absolute', bottom: -125, left: -90, width: 590, height: 245, borderRadius: 300, backgroundColor: '#D9F1FA', transform: [{ rotate: '-14deg' }] },
  bottomCircle: { position: 'absolute', bottom: 74, right: 28, width: 70, height: 70, borderRadius: 35, backgroundColor: '#D6EEF7' },
  keyboardAvoiding: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: 'rgba(255, 255, 255, 0.96)', borderRadius: 30, paddingHorizontal: 28, paddingVertical: 32, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 22, elevation: 7 },
  logo: { width: 88, height: 88, alignSelf: 'center', marginBottom: 14 },
  logoCrossVertical: { position: 'absolute', top: 3, left: 31, width: 27, height: 82, borderRadius: 10, backgroundColor: colors.primary },
  logoCrossHorizontal: { position: 'absolute', top: 30, left: 4, width: 81, height: 28, borderRadius: 10, backgroundColor: colors.primary },
  logoCapsule: { position: 'absolute', top: 36, left: 19, width: 53, height: 23, flexDirection: 'row', overflow: 'hidden', borderRadius: 13, borderWidth: 4, borderColor: colors.white, transform: [{ rotate: '-42deg' }] },
  logoCapsuleBlue: { flex: 1, backgroundColor: colors.primaryDark },
  logoCapsuleGray: { flex: 1, backgroundColor: '#B7C4CA' },
  title: { color: colors.primary, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 5, marginBottom: 28 },
  fieldGroup: { marginBottom: 18 },
  label: { color: '#5F7480', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  inputShell: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.white, paddingLeft: 16 },
  fieldIcon: { width: 31, color: colors.primary, fontSize: 20, textAlign: 'center' },
  input: { flex: 1, minHeight: 56, paddingHorizontal: 12, color: colors.text, fontSize: 16.8 },
  eyeButton: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center' },
  eyeOutline: { width: 22, height: 14, borderWidth: 2, borderColor: '#7E9DAA', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eyePupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7E9DAA' },
  eyeSlash: { position: 'absolute', width: 27, height: 2, borderRadius: 2, backgroundColor: '#7E9DAA', transform: [{ rotate: '-42deg' }] },
  button: { minHeight: 58, marginTop: 4, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.24, shadowRadius: 11, elevation: 5 },
  buttonPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.58 },
  buttonText: { color: colors.white, fontSize: 19, fontWeight: '800' },
  secure: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 25 },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20, marginTop: -3, marginBottom: 12 },
});
