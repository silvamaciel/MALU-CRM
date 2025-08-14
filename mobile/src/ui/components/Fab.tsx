import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function Fab({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute', right: 16, bottom: 24,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: t.colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6
      }}>
      <Ionicons name="add" size={28} color={t.colors.primaryText} />
    </Pressable>
  );
}
