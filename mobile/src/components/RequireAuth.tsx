// src/components/RequireAuth.tsx
import React, { ReactElement } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({
  children,
  fallback
}: { children: ReactElement; fallback: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!user) return fallback;
  return children;
}
