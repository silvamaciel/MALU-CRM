import React from 'react';
import { Modal, View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

function row(label: string, value?: string) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, opacity: 0.7 }}>{label}</Text>
      <Text style={{ fontWeight: '600' }}>{value || '—'}</Text>
    </View>
  );
}

export default function LeadPeek({
  visible,
  onClose,
  lead,
}: {
  visible: boolean;
  onClose: () => void;
  lead?: any;
}) {
  const t = useTheme();
  if (!lead) return null;

  const phone = lead.contato || '';
  const email = lead.email || '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: '#0008' }}>
        <Pressable
          onPress={() => {}}
          style={{
            marginTop: 'auto',
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            borderTopWidth: 1,
            borderColor: t.colors.border
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 54, height: 6, backgroundColor: t.colors.border, borderRadius: 3 }} />
          </View>

          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12 }}>{lead.nome}</Text>
          {row('E-mail', email)}
          {row('Telefone', phone)}
          {row('Origem', lead?.origem?.nome)}
          {row('Estágio', lead?.situacao?.nome)}
          {row('Comentário', lead?.comentario)}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {!!phone && (
              <>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                  style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: t.colors.border }}
                >
                  <Ionicons name="call" size={20} color={t.colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
                  style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: t.colors.border }}
                >
                  <Ionicons name="logo-whatsapp" size={20} color={t.colors.text} />
                </Pressable>
              </>
            )}
            {!!email && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${email}`)}
                style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: t.colors.border }}
              >
                <Ionicons name="mail" size={20} color={t.colors.text} />
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
