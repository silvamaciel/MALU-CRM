import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import AppBar from '../ui/components/AppBar';
import Button from '../ui/components/Button';
import { useTheme } from '../ui/theme';
import {
  getLeadById,
  getLeadHistory,
  deleteLead,
  updateLead,
  listSituacoes,
  discardLead,
} from '../api/leads';
import { CountryCode, onlyDigits, countryCfg, formatNat } from '../utils/phoneIntl';
import ActionFab from '../ui/components/ActionFab';
import DiscardLeadModal from '../ui/components/DiscardLeadModal';

function inferCountryFromE164(e164: string): CountryCode {
  if (e164?.startsWith('+1')) return 'US';
  if (e164?.startsWith('+351')) return 'PT';
  if (e164?.startsWith('+55')) return 'BR';
  if (e164?.startsWith('+52')) return 'MX';
  if (e164?.startsWith('+54')) return 'AR';
  if (e164?.startsWith('+56')) return 'CL';
  return 'BR';
}
function natFromE164(e164: string, cc: CountryCode) {
  const ddiDigits = onlyDigits(countryCfg(cc).code);
  const all = onlyDigits(e164 || '');
  return all.startsWith(ddiDigits) ? all.slice(ddiDigits.length) : all;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: t.colors.subtext, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: t.colors.text }}>{value || '—'}</Text>
    </View>
  );
}

export default function LeadDetailScreen() {
  const { params } = useRoute<any>();
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const t = useTheme();

  const id: string = params?.id;

  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => getLeadById(id),
    enabled: !!id,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['lead-history', id],
    queryFn: () => getLeadHistory(id),
    enabled: !!id,
  });

  // Situações -> descobrir o 1º estágio (exceto "Descartado")
  const { data: stageOptions = [] } = useQuery({
    queryKey: ['situacoes'],
    queryFn: listSituacoes,
  });

  const firstStageId = useMemo(() => {
    const arr = Array.isArray(stageOptions) ? stageOptions : [];
    // normaliza
    const norm = arr.map((s: any) => ({
      id: s?.value ?? s?._id,
      name: s?.label ?? s?.nome ?? '',
      ordem: s?.ordem ?? 9999,
    }));
    // ignora "Descartado"
    const filtered = norm.filter((s) => !s.name.toLowerCase().includes('descart'));
    // ordena por ordem e nome
    filtered.sort((a, b) => (a.ordem - b.ordem) || a.name.localeCompare(b.name));
    return filtered[0]?.id ?? null;
  }, [stageOptions]);

  const phone = useMemo(() => {
    const e164 = String(lead?.contato || lead?.telefone || '');
    if (!e164) return null;
    const cc = inferCountryFromE164(e164);
    const nat = natFromE164(e164, cc);
    return {
      e164,
      cc,
      nat,
      natDisplay: formatNat(cc, nat),
      waNumber: onlyDigits(e164),
    };
  }, [lead]);

  const isDescartadoNow =
    typeof lead?.situacao === 'string'
      ? String(lead?.situacao).toLowerCase().includes('descart')
      : String(lead?.situacao?.nome || '').toLowerCase().includes('descart');

  const [showDiscard, setShowDiscard] = useState(false);

  // Abrir discador / WhatsApp / e-mail
  async function openPhone() {
    if (!phone?.e164) return;
    const url = `tel:${phone.e164}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) return Alert.alert('Ops', 'Não foi possível abrir o discador.');
    Linking.openURL(url);
  }
  async function openWhatsApp() {
    if (!phone?.waNumber) return;
    const appUrl = `whatsapp://send?phone=${phone.waNumber}`;
    const webUrl = `https://wa.me/${phone.waNumber}`;
    const canApp = await Linking.canOpenURL(appUrl);
    Linking.openURL(canApp ? appUrl : webUrl).catch(() =>
      Alert.alert('Ops', 'Não foi possível abrir o WhatsApp.')
    );
  }
  async function openEmail() {
    if (!lead?.email) return;
    const url = `mailto:${lead.email}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) return Alert.alert('Ops', 'Nenhum app de e-mail encontrado.');
    Linking.openURL(url);
  }

  // Excluir
  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      Alert.alert('Pronto', 'Lead excluído.');
      nav.goBack();
    },
    onError: (e: any) =>
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha ao excluir.'),
  });
  function confirmDelete() {
    Alert.alert('Excluir lead', 'Tem certeza que deseja excluir este lead?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }

  // Reativar (sem modal): volta para o 1º estágio
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!firstStageId) throw new Error('Estágio inicial não encontrado.');
      return updateLead(id, { situacao: firstStageId, comentario: 'Lead reativado' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-history', id] });
      Alert.alert('Pronto', 'Lead reativado para o primeiro estágio.');
      refetch();
    },
    onError: (e: any) =>
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha ao reativar.'),
  });
  function handleReactivate() {
    if (!firstStageId) {
      Alert.alert('Atenção', 'Não encontrei um estágio inicial para reativar.');
      return;
    }
    reactivateMutation.mutate();
  }

  // Descartar (com modal)
  const discardMutation = useMutation({
    mutationFn: (payload: { motivoDescarte: string; comentario?: string }) =>
      discardLead(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-history', id] });
      Alert.alert('Pronto', 'Lead descartado.');
      setShowDiscard(false);
      refetch();
    },
    onError: (e: any) =>
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha ao descartar.'),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <AppBar title="Detalhes do Lead" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }
  if (!lead) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <AppBar title="Detalhes do Lead" />
        <View style={{ padding: 16 }}>
          <Text style={{ color: t.colors.text }}>Lead não encontrado.</Text>
          <View style={{ height: 12 }} />
          <Button title="Voltar" onPress={() => nav.goBack()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar title="Lead" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: t.colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
          {lead.nome}
        </Text>

        <Row label="E-mail" value={lead.email} />
        <Row
          label="Telefone"
          value={phone ? `${phone.natDisplay}  (${countryCfg(phone.cc).code})` : '—'}
        />
        <Row
          label="Situação"
          value={typeof lead.situacao === 'string' ? lead.situacao : lead.situacao?.nome}
        />
        <Row label="Origem" value={typeof lead.origem === 'string' ? lead.origem : lead.origem?.nome} />
        <Row
          label="Responsável"
          value={typeof lead.responsavel === 'string' ? lead.responsavel : lead.responsavel?.nome}
        />
        <Row label="Observações" value={lead.comentario || lead.observacoes} />

        {/* Histórico */}
        <View style={{ marginTop: 28 }}>
          <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            Histórico
          </Text>

          {loadingHistory ? (
            <ActivityIndicator />
          ) : history?.length ? (
            history.slice(0, 20).map((h: any, idx: number) => (
              <View
                key={h._id || idx}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: t.colors.border,
                }}
              >
                <Text style={{ color: t.colors.text, fontWeight: '600' }}>
                  {h?.acao || h?.tipo || 'Evento'}
                </Text>
                {!!h?.mensagem && (
                  <Text style={{ color: t.colors.subtext, marginTop: 2 }}>
                    {h.mensagem}
                  </Text>
                )}
                {!!h?.createdAt && (
                  <Text style={{ color: t.colors.subtext, marginTop: 2, fontSize: 12 }}>
                    {new Date(h.createdAt).toLocaleString()}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: t.colors.subtext }}>Sem histórico ainda.</Text>
          )}
        </View>

        {/* Atualizar */}
        <View style={{ marginVertical: 20 }}>
          <Pressable
            onPress={() => {
              refetch();
              qc.invalidateQueries({ queryKey: ['lead-history', id] });
            }}
            style={{
              alignSelf: 'center',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.md,
            }}
          >
            <Text style={{ color: t.colors.text }}>Atualizar</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* FABs flutuantes à direita */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 24,
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        {/* editar / (descartar OU reativar) / excluir */}
        <ActionFab icon="pencil" onPress={() => nav.navigate('LeadForm', { id })} />
        {isDescartadoNow ? (
          <ActionFab
            iconLib="mci"
            icon="recycle"
            variant="warning"
            onPress={handleReactivate}
          />
        ) : (
          <ActionFab
            icon="close-circle"
            variant="danger"
            onPress={() => setShowDiscard(true)}
          />
        )}
        <ActionFab icon="trash" variant="danger" onPress={confirmDelete} />

        <View style={{ height: 6 }} />

        {/* ligar / whatsapp / e-mail */}
        <ActionFab icon="call" onPress={openPhone} disabled={!phone?.e164} />
        <ActionFab icon="logo-whatsapp" variant="outline" onPress={openWhatsApp} disabled={!phone?.waNumber} />
        <ActionFab icon="mail" variant="outline" onPress={openEmail} disabled={!lead?.email} />
      </View>

      {/* Modal de Descarte (só para descartar) */}
      <DiscardLeadModal
        visible={showDiscard}
        leadName={lead?.nome}
        processing={discardMutation.isPending}
        errorMessage={null}
        onClose={() => setShowDiscard(false)}
        onSubmit={(v) => {
          if (!v.motivoDescarte) {
            Alert.alert('Atenção', 'Selecione um motivo do descarte.');
            return;
          }
          discardMutation.mutate({ motivoDescarte: v.motivoDescarte, comentario: v.comentario });
        }}
      />
    </View>
  );
}
