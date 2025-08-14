import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme';

export default function Badge({ text, tone = 'muted' }: { text: string; tone?: 'success'|'warning'|'danger'|'muted' }) {
  const t = useTheme();
  const bg = t.colors[tone] ?? t.colors.muted;
  const fg = tone === 'muted' ? t.colors.text : '#fff';
  return (
    <View style={{
      backgroundColor: bg, alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: t.radius.pill
    }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
