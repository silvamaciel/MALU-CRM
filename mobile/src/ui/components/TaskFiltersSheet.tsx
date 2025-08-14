import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import Input from './Input';
import SelectModal, { SelectOption } from './SelectModal';
import Button from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskFilters } from '../../api/tasks';

type Props = {
  visible: boolean;
  onClose: () => void;
  initial: TaskFilters;
  onApply: (f: TaskFilters) => void;
  onClear: () => void;
  assignees: SelectOption[];
};

export default function TaskFiltersSheet({ visible, onClose, initial, onApply, onClear, assignees }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState(initial.q || '');
  const [status, setStatus] = useState<TaskFilters['status']>(initial.status || 'Pendente');
  const [assignee, setAssignee] = useState<string | null>(initial.assignee || null);

  useEffect(() => {
    if (visible) {
      setQ(initial.q || '');
      setStatus(initial.status || 'Pendente');
      setAssignee(initial.assignee || null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 64}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} />
        <View style={{ backgroundColor: t.colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              Filtros de Tarefas
            </Text>
            <Input label="Buscar" value={q} onChangeText={setQ} placeholder="Título/descrição" />
            <SelectModal
              label="Status"
              value={status || 'Pendente'}
              onChange={(v) => setStatus(v as any)}
              options={[
                { value: 'Pendente', label: 'Pendentes' },
                { value: 'Concluída', label: 'Concluídas' },
                { value: 'Todas', label: 'Todas' },
              ]}
            />
            <SelectModal label="Responsável" value={assignee} onChange={setAssignee} options={assignees} searchable />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title="Limpar" variant="outline" onPress={() => { onClear(); onClose(); }} />
              <Button title="Aplicar" onPress={() => { onApply({ q, status, assignee }); onClose(); }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
