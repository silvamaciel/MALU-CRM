import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function LeadCardItem({
  lead,
  onPress,
}: {
  lead: any;
  onPress?: () => void;
}) {
  const t = useTheme();

  const nome = lead?.nome ?? 'Sem nome';
  const email = lead?.email ?? '';
  const contato = lead?.contato || lead?.telefone || '';
  const situacao =
    typeof lead?.situacao === 'string'
      ? lead.situacao
      : lead?.situacao?.nome || '';
  const origem =
    typeof lead?.origem === 'string'
      ? lead.origem
      : lead?.origem?.nome || '';

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 14,
        marginTop: 12,
      }}
    >
      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: t.colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="person-outline" size={20} color={t.colors.primary} />
        </View>

        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            style={{ color: t.colors.text, fontWeight: '700', fontSize: 16, lineHeight: 20 }}
            numberOfLines={2}
          >
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

        <Ionicons name="chevron-forward" size={18} color={t.colors.subtext} />
      </View>

      {/* Chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {!!situacao && (
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: t.colors.primary + '1A',
            }}
          >
            <Text style={{ color: t.colors.primary, fontSize: 12, fontWeight: '600' }}>
              {situacao}
            </Text>
          </View>
        )}
        {!!origem && (
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: t.colors.muted + '33',
            }}
          >
            <Text style={{ color: t.colors.subtext, fontSize: 12 }}>{origem}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
