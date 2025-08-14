import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function AppBar({
  title,
  rightIcon,
  onRightPress,
}: { title: string; rightIcon?: keyof typeof Ionicons.glyphMap; onRightPress?: () => void }) {
  const t = useTheme();
  return (
    <View style={{
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
      backgroundColor: t.colors.bg,
      borderBottomWidth: 1, borderBottomColor: t.colors.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <Text style={{ color: t.colors.text, fontSize: 20, fontWeight: '700' }}>{title}</Text>
      {rightIcon ? (
        <Pressable onPress={onRightPress} hitSlop={12} style={{ padding: 6 }}>
          <Ionicons name={rightIcon} size={22} color={t.colors.text} />
        </Pressable>
      ) : <View style={{ width: 22 }} />}
    </View>
  );
}
