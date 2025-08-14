import { api, setAccessToken, setCreds } from './http';

export type User = { _id: string; nome?: string; email: string; role?: string };

export async function login(email: string, senha: string): Promise<User> {
  const { data } = await api.post('/auth/login', { email, senha });

  // ⚠️ Captura robusta do token: cobre accessToken | token | jwt | access_token | data.token
  const token =
    data?.accessToken ??
    data?.token ??
    data?.jwt ??
    data?.access_token ??
    data?.data?.token ??
    null;

  if (!token) {
    // Mostra no console em dev pra diagnosticar formato inesperado
    console.log('[MOBILE] Login response (sem token detectado):', JSON.stringify(data)?.slice(0, 800));
    throw new Error('Login bem-sucedido, mas token não veio na resposta.');
  }

  await setAccessToken(token);
  await setCreds(email, senha); // para re-login automático
  return data.user ?? { _id: 'unknown', email }; // fallback simples se backend não retornar user
}

export async function logout() {
  await setAccessToken(null);
  await setCreds(null, null);
}
