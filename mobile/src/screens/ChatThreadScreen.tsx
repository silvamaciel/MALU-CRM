import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, FlatList, Text, Pressable, Alert } from 'react-native';
import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ui/theme';
import AppBar from '../ui/components/AppBar';
import MessageBubble from '../ui/components/MessageBubble';
import ChatComposer from '../ui/components/ChatComposer';
import LeadPeek from '../ui/components/LeadPeek';
import { Conversation, createLeadFromConversation, getMessages, sendMessage, Message } from '../api/chat';
import { getLeadById } from '../api/leads';
import { uniqById } from '../utils/arrays';

type Params = { conversation?: Conversation };
type MsgPage = { items: Message[]; nextBefore: string | null };

function displayName(c?: Conversation) {
  if (!c) return 'Contato';
  return c.leadNameSnapshot || c.tempContactName || (c.channelInternalId?.split('@')[0] ?? 'Contato');
}

export default function ChatThreadScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const conv = route.params?.conversation as Conversation;
  const qc = useQueryClient();

  const [peekOpen, setPeekOpen] = useState(false);

  const leadId = typeof conv?.lead === 'string' ? conv.lead : conv?.lead?._id;
  const { data: leadFull } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLeadById(leadId!),
    enabled: !!leadId,
  });

  // mensagens (primeiro carrega o bloco mais recente; fetchNextPage busca antigas com "before")
  const msgs = useInfiniteQuery({
    queryKey: ['chat', 'messages', conv?._id],
    initialPageParam: null as string | null,
    enabled: !!conv?._id,
    queryFn: ({ pageParam }) =>
      getMessages(conv!._id, pageParam ? { limit: 30, before: pageParam } : { limit: 30 }),
    getNextPageParam: (last: MsgPage) => last.nextBefore ?? null,
  });

  const inf = msgs.data as InfiniteData<MsgPage, string | null> | undefined;

  // dados achatados + DEDUPE
  const flatData: Message[] = useMemo(() => {
    const list = (inf?.pages ?? []).flatMap(p => p.items);
    return uniqById(list);
  }, [inf?.pages]);

  // polling de novas: pega o createdAt do último item atual
  const lastTs = flatData.length ? flatData[flatData.length - 1].createdAt : null;
  const poll = useQuery({
    queryKey: ['chat', 'messages', conv?._id, 'after', lastTs || ''],
    queryFn: async () => {
      if (!conv?._id || !lastTs) return [] as Message[];
      const res = await getMessages(conv._id, { limit: 50, after: lastTs });
      return res.items;
    },
    enabled: !!conv?._id && !!lastTs,
    refetchInterval: 3000,
  });

  // merge do polling sem duplicar
  useEffect(() => {
    const items = (poll.data as Message[] | undefined) || [];
    if (!items.length) return;

    const prev = qc.getQueryData(['chat', 'messages', conv?._id]) as
      | InfiniteData<MsgPage, string | null>
      | undefined;
    if (!prev) return;

    const pages = prev.pages;
    const lastPage = pages[pages.length - 1];
    const idSet = new Set(lastPage.items.map(m => String(m._id)));
    const onlyNew = items.filter(m => !idSet.has(String(m._id)));

    if (!onlyNew.length) return;

    const mergedLast: MsgPage = { ...lastPage, items: [...lastPage.items, ...onlyNew] };
    const next: InfiniteData<MsgPage, string | null> = {
      pageParams: prev.pageParams,
      pages: [...pages.slice(0, -1), mergedLast],
    };
    qc.setQueryData(['chat', 'messages', conv?._id], next);
  }, [poll.data, qc, conv?._id]);

  // enviar (também evita duplicar)
  const send = useMutation({
    mutationFn: (text: string) => sendMessage(conv!._id, text),
    onSuccess: (m) => {
      const prev = qc.getQueryData(['chat', 'messages', conv?._id]) as
        | InfiniteData<MsgPage, string | null>
        | undefined;
      if (!prev) return;

      const pages = prev.pages;
      const lastPage = pages[pages.length - 1];
      const already = lastPage.items.some(x => String(x._id) === String(m._id));
      if (already) return;

      const mergedLast: MsgPage = { ...lastPage, items: [...lastPage.items, m] };
      const next: InfiniteData<MsgPage, string | null> = {
        pageParams: prev.pageParams,
        pages: [...pages.slice(0, -1), mergedLast],
      };
      qc.setQueryData(['chat', 'messages', conv?._id], next);
    },
    onError: (e: any) => {
      Alert.alert('Erro', e?.response?.data?.message || e?.message || 'Falha ao enviar mensagem.');
    },
  });

  // criar lead a partir da conversa
  const createLead = useMutation({
    mutationFn: () => createLeadFromConversation(conv!._id),
    onSuccess: async (newLead: any) => {
      Alert.alert('Sucesso', 'Lead criado a partir da conversa.');
      nav.navigate('LeadsTab' as never, {
        screen: 'LeadDetail',
        params: { id: newLead._id },
      } as never);
    },
    onError: (e: any) => {
      Alert.alert('Erro', e?.response?.data?.message || e?.message || 'Não foi possível criar o lead.');
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar
        title={displayName(conv)}
        rightIcon={leadId ? 'information-circle-outline' : 'person-add'}
        onRightPress={() => {
          if (leadId) setPeekOpen(true);
          else createLead.mutate();
        }}
      />

      {msgs.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {msgs.hasNextPage && (
            <Pressable
              onPress={() => msgs.fetchNextPage()}
              disabled={msgs.isFetchingNextPage}
              style={{
                alignSelf: 'center',
                marginTop: 8, marginBottom: 4,
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 999, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface
              }}
            >
              <Text style={{ color: t.colors.text }}>
                {msgs.isFetchingNextPage ? 'Carregando...' : 'Ver mensagens antigas'}
              </Text>
            </Pressable>
          )}

          <FlatList
            data={flatData}
            keyExtractor={(it) => String(it._id)}
            renderItem={({ item }) => <MessageBubble msg={item} />}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </>
      )}

      <ChatComposer onSend={(txt) => send.mutate(txt)} sending={send.isPending} />

      <LeadPeek visible={peekOpen} onClose={() => setPeekOpen(false)} lead={leadFull} />
    </View>
  );
}
