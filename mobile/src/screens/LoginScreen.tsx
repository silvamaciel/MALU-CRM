import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    try {
      setLoading(true);
      await login(email, senha);
      // Não precisa navegar aqui: o AppNavigator troca para as tabs quando user != null
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 16, gap: 12, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 8 }}>Entrar</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <Button title={loading ? 'Entrando...' : 'Entrar'} onPress={onSubmit} disabled={loading} />
    </View>
  );
}
