import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

type Props = {
  lead: any;
  onPress?: () => void;
};

export default function LeadListItem({ lead, onPress }: Props) {
  const t = useTheme();

  const nome = lead?.nome ?? 'Sem nome';
  const email = lead?.email ?? '';
  const contato =
    lead?.contato ||
    lead?.telefone ||
    lead?.phone ||
    '';
  const situacao =
    typeof lead?.situacao === 'string'
      ? lead.situacao
      : lead?.situacao?.nome || '';

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        padding: 12,
        borderWidth: 1,
        borderColor: t.colors.border,
        marginTop: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: t.colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Ionicons name="person-outline" size={18} color={t.colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
            {nome}
          </Text>
          {!!email && (
            <Text style={{ color: t.colors.subtext, marginTop: 2 }} numberOfLines={1}>
              {email}
            </Text>
          )}
          {!!contato && (
            <Text style={{ color: t.colors.subtext, marginTop: 2 }} numberOfLines={1}>
              {contato}
            </Text>
          )}
        </View>

        {!!situacao && (
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: t.colors.muted + '33',
              marginLeft: 8,
            }}
          >
            <Text style={{ color: t.colors.subtext, fontSize: 12 }}>{situacao}</Text>
          </View>
        )}

        <Ionicons
          name="chevron-forward"
          size={18}
          color={t.colors.subtext}
          style={{ marginLeft: 6 }}
        />
      </View>
    </Pressable>
  );
}
