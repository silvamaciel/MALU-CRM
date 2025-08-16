import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { useTheme } from '../theme';

function initials(s?: string | null) {
  const str = (s || '').trim();
  if (!str) return '•';
  const parts = str.split(' ').filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || first.toUpperCase();
}

function shortName(c: any) {
  if (c?.leadNameSnapshot) return c.leadNameSnapshot;
  if (c?.tempContactName) return c.tempContactName;
  if (c?.channelInternalId) return String(c.channelInternalId).split('@')[0];
  return 'Contato';
}

function timeLabel(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationItem({
  conv,
  onPress,
}: {
  conv: any;
  onPress: () => void;
}) {
  const t = useTheme();
  const title = shortName(conv);
  const sub = conv?.lastMessage || '';
  const unread = conv?.unreadCount || 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: t.colors.primary + '33',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ color: t.colors.primary, fontWeight: '700' }}>
          {initials(title)}
        </Text>
      </View>

      {/* Textos */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ flex: 1, color: t.colors.text, fontWeight: '700', fontSize: 16 }}>
            {title}
          </Text>
          <Text style={{ color: t.colors.subtext, marginLeft: 8, fontSize: 12 }}>
            {timeLabel(conv?.lastMessageAt)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: t.colors.subtext }}>
            {sub}
          </Text>
          {unread > 0 && (
            <View style={{
              marginLeft: 8, minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primary
            }}>
              <Text style={{ color: t.colors.primaryText, fontSize: 12, fontWeight: '700' }}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
