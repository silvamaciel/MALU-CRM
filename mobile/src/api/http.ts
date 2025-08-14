import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL; // ex: https://api.seudominio.com/api

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// helpers de storage
export async function getAccessToken() { return SecureStore.getItemAsync('accessToken'); }
export async function setAccessToken(t: string | null) {
  if (t) return SecureStore.setItemAsync('accessToken', t);
  return SecureStore.deleteItemAsync('accessToken');
}
export async function getCreds() {
  const email = await SecureStore.getItemAsync('email');
  const senha = await SecureStore.getItemAsync('senha');
  return { email, senha };
}
export async function setCreds(email?: string | null, senha?: string | null) {
  if (email) await SecureStore.setItemAsync('email', email); else await SecureStore.deleteItemAsync('email');
  if (senha) await SecureStore.setItemAsync('senha', senha); else await SecureStore.deleteItemAsync('senha');
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Re-login silencioso quando o JWT expirar (401)
let reloginInFlight: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!reloginInFlight) {
        reloginInFlight = (async () => {
          const { email, senha } = await getCreds();
          if (!email || !senha) throw error;
          const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { email, senha });
          await setAccessToken(data.accessToken);
        })().finally(() => { reloginInFlight = null; });
      }

      await reloginInFlight;
      return api(original);
    }
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // não tentar re-login se a falha foi no próprio login
    if (original?.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!reloginInFlight) {
        reloginInFlight = (async () => {
          const { email, senha } = await getCreds();
          if (!email || !senha) throw error;
          const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { email, senha });
          await setAccessToken(data.accessToken);
        })().finally(() => { reloginInFlight = null; });
      }
      await reloginInFlight;
      return api(original);
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (__DEV__) {
      // log leve pra garantir que estamos mandando o header
      // evite logar o token inteiro
      console.log('[MOBILE] Authorization aplicado em', config.url);
    }
  }
  config.headers.Accept = 'application/json';
  return config;
});
