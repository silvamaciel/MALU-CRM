import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Get the API URL from environment variables
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor ---
// Adds the access token to every request if it exists
http.interceptors.request.use(
  async (config) => {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// Handles token refreshing
http.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 Unauthorized and not a retry request
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark this request as a retry

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          // If no refresh token, logout the user
          // (you'd typically redirect to login screen here)
          console.log('No refresh token available, logging out.');
          return Promise.reject(error);
        }

        // Call the refresh token endpoint
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

        // Store the new tokens securely
        await SecureStore.setItemAsync('accessToken', newAccessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        }

        // Update the authorization header for the original request
        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Retry the original request with the new token
        return http(originalRequest);
      } catch (refreshError) {
        // If the refresh token request fails, logout the user
        console.error('Token refresh failed:', refreshError);
        // (redirect to login)
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    // For any other errors, just pass them on
    return Promise.reject(error);
  }
);

export default http;
