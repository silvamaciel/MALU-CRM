import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDiscardReasons } from '../../api/discardReasons';
import { useTheme } from '../theme';
import SelectModal, { SelectOption } from './SelectModal';
import Button from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  leadName?: string;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (v: { motivoDescarte: string; comentario?: string }) => void;
};

export default function DiscardLeadModal({
  visible,
  leadName,
  processing,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [reasonId, setReasonId] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [internalError, setInternalError] = useState('');

  const { data: reasons = [], isLoading, error, refetch } = useQuery({
    queryKey: ['discard-reasons'],
    queryFn: getDiscardReasons,
    enabled: visible,
  });

  const options: SelectOption[] = useMemo(
    () => (reasons || []).map((r: any) => ({ value: r._id, label: r.nome })),
    [reasons]
  );

  useEffect(() => {
    if (visible) {
      setReasonId(null);
      setComentario('');
      setInternalError('');
    }
  }, [visible]);

  function handleConfirm() {
    if (!reasonId) {
      setInternalError('Por favor, selecione um motivo do descarte.');
      return;
    }
    onSubmit({ motivoDescarte: reasonId, comentario: comentario?.trim() || undefined });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 64} // ajuste fino se preciso
      >
        {/* backdrop */}
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />

        {/* bottom sheet */}
        <View
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '85%',
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          >
            <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
              Descartar Lead{leadName ? `: ${leadName}` : ''}
            </Text>
            <Text style={{ color: t.colors.subtext, marginBottom: 12 }}>
              Selecione o motivo do descarte. O lead será movido para "Descartado".
            </Text>

            {isLoading ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator />
                <Text style={{ color: t.colors.subtext, marginTop: 8 }}>Carregando motivos...</Text>
              </View>
            ) : error ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ color: t.colors.danger, marginBottom: 8 }}>
                  Não foi possível carregar os motivos.
                </Text>
                <Button title="Tentar novamente" onPress={() => refetch()} />
              </View>
            ) : (
              <>
                <SelectModal
                  label="Motivo do descarte *"
                  value={reasonId}
                  onChange={(v) => setReasonId(v as string)}
                  options={options}
                  searchable
                />

                <Text style={{ color: t.colors.subtext, marginBottom: 6, marginTop: 8 }}>
                  Comentário (opcional)
                </Text>
                <TextInput
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Observações adicionais..."
                  placeholderTextColor={t.colors.subtext}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={{
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    borderRadius: t.radius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: t.colors.text,
                    backgroundColor: t.colors.surface,
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                  editable={!processing}
                />

                {(internalError || errorMessage) ? (
                  <Text style={{ color: t.colors.danger, marginTop: 8 }}>
                    {internalError || errorMessage}
                  </Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <Button title="Cancelar" variant="outline" onPress={onClose} disabled={processing} />
                  <Button
                    title={processing ? 'Descartando...' : 'Confirmar Descarte'}
                    onPress={handleConfirm}
                    disabled={processing || !options.length}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
