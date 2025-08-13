import http from './http';

/**
 * Registers the user's push notification token with the backend.
 * @param token The push token from Expo/FCM/APNS.
 */
export const registerPushToken = async (token: string): Promise<void> => {
  try {
    await http.post('/users/me/push-token', { token });
    console.log('Push token registered successfully.');
  } catch (error) {
    console.error('Failed to register push token:', error);
    throw error;
  }
};
