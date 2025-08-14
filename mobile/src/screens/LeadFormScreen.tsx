import React, { useEffect, useMemo, useState } from 'react';
import { View, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Input from '../ui/components/Input';
import Button from '../ui/components/Button';
import SelectModal from '../ui/components/SelectModal';
import AppBar from '../ui/components/AppBar';
import { useTheme } from '../ui/theme';
import { createLead, getLeadById, listOrigens, listSituacoes, listUsuarios, updateLead } from '../api/leads';
import PhoneInput from '../ui/components/PhoneInput';
import { CountryCode, onlyDigits, validNat, toE164, countryCfg } from '../utils/phoneIntl';
import DiscardLeadModal from '../ui/components/DiscardLeadModal';

type Option = { value: string; label: string };

export default function LeadFormScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<any>();
  const id = params?.id ? String(params.id) : null;
  const t = useTheme();
  const qc = useQueryClient();

  // Carregar dados do lead (edição)
  const { data: existing } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => getLeadById(id!),
    enabled: !!id,
    retry: false,
  });

  // Listas para selects
  const { data: situacoes = [] as Option[] } = useQuery({ queryKey: ['situacoes'], queryFn: listSituacoes });
  const { data: origens   = [] as Option[] } = useQuery({ queryKey: ['origens'],   queryFn: listOrigens   });
  const { data: usuarios  = [] as Option[] } = useQuery({ queryKey: ['usuarios'],  queryFn: listUsuarios  });

  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('BR');
  const [phoneDigits, setPhoneDigits] = useState(''); // dígitos nacionais (sem DDI)
  const [situacao, setSituacao] = useState<string | null>(null);
  const [origem, setOrigem] = useState<string | null>(null);
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState(''); // mapeia para "comentario" no backend

  // Controle de descarte (quando situação = Descarnado)
  const [showDiscard, setShowDiscard] = useState(false);
  const [discardReasonId, setDiscardReasonId] = useState<string | null>(null);
  const [discardComment, setDiscardComment] = useState<string>('');
  const [prevSituacao, setPrevSituacao] = useState<string | null>(null); // para restaurar se cancelar modal

  // util
  const isDescartado = (idOrNull: string | null) => {
    if (!idOrNull) return false;
    const label = (situacoes.find(s => s.value === idOrNull)?.label || '').toLowerCase();
    return label.includes('descart'); // "Descartado"
  };

  // Preenche form quando carregar um lead existente
  useEffect(() => {
    if (existing && id) {
      setNome(existing?.nome || existing?.name || '');
      setEmail(existing?.email || '');

      // Telefones: preferir "contato" (E.164) vindo do backend; fallback para "telefone"
      const rawContato = String(existing?.contato || existing?.telefone || '');

      // Inferir país pelo DDI
      let inferred: CountryCode = 'BR';
      if (rawContato.startsWith('+1')) inferred = 'US';
      else if (rawContato.startsWith('+351')) inferred = 'PT';
      else if (rawContato.startsWith('+55')) inferred = 'BR';
      else if (rawContato.startsWith('+52')) inferred = 'MX';
      else if (rawContato.startsWith('+54')) inferred = 'AR';
      else if (rawContato.startsWith('+56')) inferred = 'CL';
      setPhoneCountry(inferred);

      // Remover DDI para preencher os dígitos nacionais
      const ddiDigits = onlyDigits(countryCfg(inferred).code); // ex.: '+55' -> '55'
      const allDigits = onlyDigits(rawContato);
      const nat = allDigits.startsWith(ddiDigits) ? allDigits.slice(ddiDigits.length) : allDigits;
      setPhoneDigits(nat);

      const sitId = typeof existing?.situacao === 'string' ? existing.situacao : existing?.situacao?._id || null;
      setSituacao(sitId);
      setPrevSituacao(sitId);

      setOrigem(typeof existing?.origem === 'string' ? existing.origem : existing?.origem?._id || null);
      setResponsavel(typeof existing?.responsavel === 'string' ? existing.responsavel : existing?.responsavel?._id || null);
      // backend usa "comentario"
      setObservacoes(existing?.comentario || existing?.observacoes || '');
    }
  }, [existing, id]);

  // Quando usuário alterar a situação no Select
  const handleChangeSituacao = (newId: string | null) => {
    // se sair de "Descartado", limpamos motivo/comentário
    if (situacao && isDescartado(situacao) && newId && !isDescartado(newId)) {
      setDiscardReasonId(null);
      setDiscardComment('');
    }

    // Durante EDIÇÃO, se escolher "Descartado", abrimos modal (mas não salvamos ainda)
    if (id && newId && isDescartado(newId)) {
      setPrevSituacao(situacao); // guarda anterior para reverter se cancelar
      setSituacao(newId);        // reflete visualmente a seleção
      setShowDiscard(true);      // abre modal para pegar motivo/comentário
      return;
    }

    // fluxo normal
    setSituacao(newId);
    setPrevSituacao(newId);
  };

  const saving = useMutation({
    mutationFn: async () => {
      const n = (nome || '').trim();
      const e = (email || '').trim();
      const tDigits = onlyDigits(phoneDigits); // só dígitos nacionais

      if (!n) throw new Error('Informe o nome do lead.');
      if (!situacao) throw new Error('Selecione a situação.');

      // CREATE: exige contato; UPDATE: contato é opcional (só valida se informado)
      if (!id && !tDigits) {
        throw new Error('Informe o telefone com DDD.');
      }
      if (tDigits && !validNat(phoneCountry, tDigits)) {
        throw new Error('Telefone inválido para o país selecionado.');
      }
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        throw new Error('E-mail inválido.');
      }

      // Se for DESCARTADO no UPDATE, garantir motivo antes de enviar
      if (id && isDescartado(situacao) && !discardReasonId) {
        // abre modal e aborta o envio agora; ao confirmar o modal chamamos mutate() de novo
        setShowDiscard(true);
        throw new Error('Selecione o motivo do descarte.'); // será mostrado e modal já estará aberto
      }

      // contato no formato internacional E.164 (se informado)
      const contatoStr = tDigits ? toE164(phoneCountry, tDigits) : undefined;

      if (id) {
        const payload: any = {
          nome: n,
          email: e || null,
          comentario: (discardComment || observacoes || '').trim() || undefined, // prioriza comentário do descarte
          situacao: situacao || undefined,
          origem: origem || undefined,
          responsavel: responsavel || undefined,
        };
        if (contatoStr) payload.contato = contatoStr;
        if (isDescartado(situacao)) {
          payload.motivoDescarte = discardReasonId; // obrigatório pelo backend no update
        }
        return updateLead(id, payload);
      } else {
        // CREATE — backend exige nome + contato
        const contatoRequired = toE164(phoneCountry, tDigits); // +55...
        return createLead({
          nome: n,
          email: e || null,
          comentario: (observacoes || '').trim() || undefined,
          contato: contatoRequired,
          situacao: situacao!, // obrigatório
          origem: origem || undefined,
          responsavel: responsavel || undefined,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      if (id) qc.invalidateQueries({ queryKey: ['lead', id] });
      Alert.alert('Sucesso', id ? 'Lead atualizado!' : 'Lead criado!');
      nav.goBack();
    },
    onError: (e: any) => {
      // se o erro foi só para abrir o modal, não precisa alertar forte
      const msg = e?.response?.data?.error || e?.message;
      if (msg?.includes('Selecione o motivo do descarte')) return;
      Alert.alert('Erro', msg || 'Falha ao salvar lead.');
    },
  });

  // Quando confirmar modal de descarte no EDITAR:
  const handleConfirmDiscard = (v: { motivoDescarte: string; comentario?: string }) => {
    setDiscardReasonId(v.motivoDescarte);
    setDiscardComment(v.comentario || '');
    setShowDiscard(false);
    // dispara o salvar novamente já com motivo
    setTimeout(() => saving.mutate(), 0);
  };

  // Se cancelar o modal, reverte situação
  const handleCancelDiscard = () => {
    setShowDiscard(false);
    setSituacao(prevSituacao || null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar title={id ? 'Editar Lead' : 'Novo Lead'} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Input label="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Maria Silva" />
          <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="maria@exemplo.com" />

          <PhoneInput
            label="Telefone"
            country={phoneCountry}
            digits={phoneDigits}
            onChange={({ country, digits }) => {
              setPhoneCountry(country);
              setPhoneDigits(digits);
            }}
          />

          <SelectModal
            label="Situação *"
            value={situacao || null}
            onChange={handleChangeSituacao}
            options={situacoes}
          />

          <SelectModal label="Origem" value={origem || null} onChange={setOrigem} options={origens} />
          <SelectModal label="Responsável" value={responsavel || null} onChange={setResponsavel} options={usuarios} />

          <Input
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Notas livres..."
            multiline
            style={{ height: 100, textAlignVertical: 'top' }}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 24 }}>
            <Button title="Cancelar" variant="outline" onPress={() => nav.goBack()} />
            <Button
              title={saving.isPending ? 'Salvando...' : (id ? 'Salvar' : 'Criar')}
              onPress={() => {
                // se for editar e situação é "Descartado" mas ainda não temos motivo, abra modal
                if (id && isDescartado(situacao) && !discardReasonId) {
                  setShowDiscard(true);
                  return;
                }
                saving.mutate();
              }}
              loading={saving.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Descarte (apenas quando editar e selecionar "Descartado") */}
      <DiscardLeadModal
        visible={showDiscard}
        leadName={nome}
        processing={saving.isPending}
        errorMessage={null}
        onClose={handleCancelDiscard}
        onSubmit={handleConfirmDiscard}
      />
    </View>
  );
}
