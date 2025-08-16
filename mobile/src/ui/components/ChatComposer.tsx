import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function ChatComposer({
  onSend,
  sending,
}: {
  onSend: (text: string) => void;
  sending?: boolean;
}) {
  const t = useTheme();
  const [text, setText] = useState('');

  return (
    <View style={{
      flexDirection: 'row',
      padding: 8,
      borderTopWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.bg,
      alignItems: 'center'
    }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Mensagem"
        placeholderTextColor={t.colors.subtext}
        style={{
          flex: 1,
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 8,
          color: t.colors.text,
        }}
        multiline
      />
      <Pressable
        onPress={() => {
          const v = text.trim();
          if (!v || sending) return;
          setText('');
          onSend(v);
        }}
        style={{
          marginLeft: 10,
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: t.colors.primary,
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        {sending ? <ActivityIndicator color={t.colors.primaryText} /> : <Ionicons name="send" size={20} color={t.colors.primaryText} />}
      </Pressable>
    </View>
  );
}
