import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

export default function MessageBubble({ msg }: { msg: any }) {
  const t = useTheme();
  const mine = msg.direction === 'outgoing';
  const time = new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ paddingHorizontal: 12, marginVertical: 6 }}>
      <View
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
          backgroundColor: mine ? t.colors.primary : t.colors.surface,
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderWidth: mine ? 0 : 1,
          borderColor: t.colors.border,
        }}
      >
        <Text style={{ color: mine ? t.colors.primaryText : t.colors.text, fontSize: 15 }}>
          {msg.content}
        </Text>
        <Text style={{ color: mine ? t.colors.primaryText + 'CC' : t.colors.subtext, fontSize: 11, alignSelf: 'flex-end', marginTop: 4 }}>
          {time}
        </Text>
      </View>
    </View>
  );
}
