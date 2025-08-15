import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function Chip({
  text,
  onClear,
}: {
  text: string;
  onClear: () => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        gap: 6,
      }}
    >
      <Text style={{ color: t.colors.text }}>{text}</Text>
      <Pressable onPress={onClear} hitSlop={8}>
        <Ionicons name="close" size={14} color={t.colors.subtext} />
      </Pressable>
    </View>
  );
}
