import React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

type Props = {
  icon?: string;
  iconLib?: 'ion' | 'mci' | 'emoji';
  emoji?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'warning';
};

export default function ActionFab({
  icon = 'add',
  iconLib = 'ion',
  emoji = '♻️',
  onPress,
  disabled,
  variant = 'primary',
}: Props) {
  const t = useTheme();

  const bg =
    variant === 'danger' ? t.colors.danger :
    variant === 'warning' ? t.colors.warning :
    variant === 'outline' ? t.colors.surface :
    t.colors.primary;

  const fg =
    variant === 'outline' ? t.colors.text :
    variant === 'warning' ? t.colors.warningText :
    t.colors.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
        opacity: disabled ? 0.5 : 1,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: t.colors.border,
      }}
    >
      {iconLib === 'emoji' ? (
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      ) : iconLib === 'mci' ? (
        <MaterialCommunityIcons name={icon as any} size={22} color={fg} />
      ) : (
        <Ionicons name={icon as any} size={22} color={fg} />
      )}
    </Pressable>
  );
}
