import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { useTheme } from '../theme';

export default function Input({ label, ...props }: { label?: string } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing.md }}>
      {label ? <Text style={{ color: t.colors.subtext, marginBottom: 6 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.colors.subtext}
        {...props}
        style={[{
          borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md,
          paddingHorizontal: t.spacing.md, paddingVertical: 10, color: t.colors.text,
          backgroundColor: t.colors.surface,
        }, props.style]}
      />
    </View>
  );
}
