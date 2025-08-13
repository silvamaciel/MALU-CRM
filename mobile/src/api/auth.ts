import http from './http';
import * as SecureStore from 'expo-secure-store';

interface LoginCredentials {
  email: string;
  senha?: string; // For password-based login
  googleCode?: string; // For Google Sign-In
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    _id: string;
    nome: string;
    email: string;
  };
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse['user']> => {
  try {
    const { data } = await http.post<AuthResponse>('/auth/login', credentials);

    // Store tokens securely
    await SecureStore.setItemAsync('accessToken', data.token);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);

    return data.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    // Optional: Call a backend endpoint to invalidate the refresh token
    // await http.post('/auth/logout', { refreshToken: await SecureStore.getItemAsync('refreshToken') });

    // Clear tokens from secure store
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};
