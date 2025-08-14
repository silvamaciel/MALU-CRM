import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../ui/components/Badge';
import { useTheme } from '../ui/theme';

export default function LeadItem({
  item, onDetail, onEdit
}: { item: any; onDetail: () => void; onEdit: () => void }) {
  const t = useTheme();
  const title = item?.nome || item?.title || item?.name || String(item?._id || item?.id);
  const email = item?.email ? String(item.email) : '';
  const phone = item?.telefone ? String(item.telefone) : '';
  const status = item?.situacao?.nome || item?.status || '';

  return (
    <Pressable onPress={onDetail} style={{
      paddingVertical: 12, borderBottomWidth: 1, borderColor: t.colors.border
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{title}</Text>
          {!!email && <Text style={{ color: t.colors.subtext }} numberOfLines={1}>{email}</Text>}
          {!!phone && <Text style={{ color: t.colors.subtext }} numberOfLines={1}>{phone}</Text>}
          {!!status && <View style={{ marginTop: 6 }}><Badge text={status} tone="muted" /></View>}
        </View>
        <Pressable onPress={onEdit} hitSlop={10}>
          <Ionicons name="create-outline" size={20} color={t.colors.subtext} />
        </Pressable>
      </View>
    </Pressable>
  );
}
