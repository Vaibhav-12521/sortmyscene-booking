import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'demo@sortmyscene.test', password: 'password123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else await register(form);
    } catch (e) {
      const detail = e.details?.[0]?.message;
      setError(detail ? `${e.message}: ${detail}` : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandRow}>
        <View style={styles.dot} />
        <Text style={styles.brand}>SortMyScene</Text>
      </View>
      <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
      <Text style={styles.sub}>
        {mode === 'login' ? 'Log in to book your seats.' : 'Sign up to start booking.'}
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.textDim}
          value={form.name}
          onChangeText={set('name')}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={set('email')}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textDim}
        secureTextEntry
        value={form.password}
        onChangeText={set('password')}
      />

      <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
        <Text style={styles.btnText}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
        <Text style={styles.switch}>
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Demo: demo@sortmyscene.test / password123</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  dot: { width: 10, height: 10, borderRadius: 3, backgroundColor: colors.accent },
  brand: { fontSize: 20, fontWeight: '800', color: colors.ink },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  sub: { color: colors.textSoft, marginTop: 6, marginBottom: 20 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.ink, marginBottom: 12,
  },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switch: { color: colors.accent, textAlign: 'center', marginTop: 18, fontWeight: '600' },
  hint: { color: colors.textDim, textAlign: 'center', marginTop: 14, fontSize: 12 },
  error: {
    backgroundColor: '#fbe9e7', color: colors.danger, padding: 11, borderRadius: 8, marginBottom: 14, fontSize: 13,
  },
});
