import React, { useMemo, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useTheme } from '../theme';

export type SelectOption = { value: string; label: string };

export default function SelectModal({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  searchable = true,
}: {
  label?: string;
  value?: string | null;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const current = options.find(o => o.value === value)?.label || '';

  const filtered = useMemo(() => {
    if (!q) return options;
    const qn = q.toLowerCase();
    return options.filter(o => o.label?.toLowerCase()?.includes(qn));
  }, [options, q]);

  return (
    <View style={{ marginBottom: t.spacing.md }}>
      {label ? <Text style={{ color: t.colors.subtext, marginBottom: 6 }}>{label}</Text> : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md,
          paddingHorizontal: t.spacing.md, paddingVertical: 12, backgroundColor: t.colors.surface
        }}>
        <Text style={{ color: current ? t.colors.text : t.colors.subtext }}>
          {current || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
          <View style={{
            paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md,
            borderBottomWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.bg
          }}>
            <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700' }}>{label || 'Selecionar'}</Text>
          </View>

          {searchable && (
            <View style={{ padding: t.spacing.md }}>
              <TextInput
                placeholder="Buscar..."
                placeholderTextColor={t.colors.subtext}
                value={q}
                onChangeText={setQ}
                style={{
                  borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md,
                  paddingHorizontal: t.spacing.md, paddingVertical: 10, color: t.colors.text,
                  backgroundColor: t.colors.surface,
                }}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onChange(item.value); setOpen(false); }}
                style={{ paddingHorizontal: t.spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderColor: t.colors.border }}>
                <Text style={{ color: t.colors.text }}>{item.label}</Text>
              </Pressable>
            )}
          />

          <View style={{ padding: t.spacing.md }}>
            <Pressable
              onPress={() => setOpen(false)}
              style={{
                borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md,
                paddingVertical: 12, alignItems: 'center'
              }}>
              <Text style={{ color: t.colors.text }}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
