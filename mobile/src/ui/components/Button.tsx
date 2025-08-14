import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
};

export default function Button({ title, onPress, loading, variant = 'primary', style, disabled }: Props) {
  const t = useTheme();
  const base = {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: t.radius.md,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: t.colors.border,
    backgroundColor: variant === 'primary' ? t.colors.primary : 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.6 : 1,
  };
  const color =
    variant === 'primary' ? t.colors.primaryText : t.colors.text;

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[base, style]}>
      {loading ? <ActivityIndicator /> : <Text style={{ color, fontWeight: '700' }}>{title}</Text>}
    </Pressable>
  );
}
