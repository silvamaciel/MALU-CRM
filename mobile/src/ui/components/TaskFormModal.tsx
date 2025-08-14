import React, { useEffect, useState } from 'react';
import { Modal, View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import Input from './Input';
import SelectModal, { SelectOption } from './SelectModal';
import Button from './Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (v: { title: string; description?: string; dueDate?: string; leadId?: string; assignedTo?: string }) => void;
  initial?: Partial<{ title: string; description: string; dueDate: string; leadId: string; assignedTo: string }>;
  leads?: SelectOption[];
  assignees?: SelectOption[];
  processing?: boolean;
};

export default function TaskFormModal({ visible, onClose, onSubmit, initial, leads = [], assignees = [], processing }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [leadId, setLeadId] = useState<string | null>(initial?.leadId || null);
  const [assignedTo, setAssignedTo] = useState<string | null>(initial?.assignedTo || null);
  const [showPicker, setShowPicker] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(initial?.dueDate ? new Date(initial.dueDate) : null);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || '');
      setDescription(initial?.description || '');
      setLeadId(initial?.leadId || null);
      setAssignedTo(initial?.assignedTo || null);
      setDueDate(initial?.dueDate ? new Date(initial.dueDate) : null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + 64}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View style={{ backgroundColor: t.colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Nova Tarefa</Text>
            <Input label="Título *" value={title} onChangeText={setTitle} />
            <Input label="Descrição" value={description} onChangeText={setDescription} multiline style={{ height: 90, textAlignVertical: 'top' }} />
            <SelectModal label="Lead" value={leadId} onChange={setLeadId} options={leads} searchable />
            <SelectModal label="Responsável" value={assignedTo} onChange={setAssignedTo} options={assignees} searchable />

            <View style={{ marginTop: 8 }}>
              <Button title={dueDate ? `Vence: ${dueDate.toLocaleString()}` : 'Definir prazo'} variant="outline" onPress={() => setShowPicker(true)} />
              {showPicker && (
                <DateTimePicker
                  value={dueDate || new Date()}
                  onChange={(e, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDueDate(d); }}
                  mode="datetime"
                />
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title="Cancelar" variant="outline" onPress={onClose} disabled={processing} />
              <Button
                title={processing ? 'Salvando...' : 'Salvar'}
                onPress={() => {
                  if (!title.trim()) return;
                  onSubmit({
                    title: title.trim(),
                    description: description?.trim() || undefined,
                    dueDate: dueDate ? dueDate.toISOString() : undefined,
                    leadId: leadId || undefined,
                    assignedTo: assignedTo || undefined,
                  });
                }}
                disabled={processing}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
