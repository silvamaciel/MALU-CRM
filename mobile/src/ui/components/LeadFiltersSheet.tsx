import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import Input from './Input';
import SelectModal from './SelectModal';
import Button from './Button';

export type LeadFiltersUI = {
  q?: string;
  situacao?: string | null;
  origem?: string | null;
  responsavel?: string | null;
};

export default function LeadFiltersSheet({
  visible,
  onClose,
  initial,
  onApply,
  onClear,
  situacoes,
  origens,
  usuarios,
}: {
  visible: boolean;
  onClose: () => void;
  initial: LeadFiltersUI;
  onApply: (f: LeadFiltersUI) => void;
  onClear: () => void;
  situacoes: Array<{ value: string; label: string }>;
  origens: Array<{ value: string; label: string }>;
  usuarios: Array<{ value: string; label: string }>;
}) {
  const t = useTheme();
  const [q, setQ] = useState(initial.q || '');
  const [situacao, setSituacao] = useState<string | null>(initial.situacao || null);
  const [origem, setOrigem] = useState<string | null>(initial.origem || null);
  const [responsavel, setResponsavel] = useState<string | null>(initial.responsavel || null);

  useEffect(() => {
    if (visible) {
      setQ(initial.q || '');
      setSituacao(initial.situacao || null);
      setOrigem(initial.origem || null);
      setResponsavel(initial.responsavel || null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 16,
          maxHeight: '70%',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: t.colors.text, marginBottom: 10 }}>
          Filtros de Leads
        </Text>
        <ScrollView>
          <Input label="Buscar" placeholder="Nome, e-mail, telefone..." value={q} onChangeText={setQ} />
          <SelectModal label="Situação" value={situacao} onChange={setSituacao} options={situacoes} />
          <SelectModal label="Origem" value={origem} onChange={setOrigem} options={origens} />
          <SelectModal label="Responsável" value={responsavel} onChange={setResponsavel} options={usuarios} />
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Button
            variant="outline"
            title="Limpar"
            onPress={() => {
              onClear();
              onClose();
            }}
          />
          <Button
            title="Aplicar"
            onPress={() => {
              onApply({ q, situacao, origem, responsavel });
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
