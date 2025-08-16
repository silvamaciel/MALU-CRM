import { api } from './http';

export type Conversation = {
  _id: string;
  lead?: any;
  leadNameSnapshot?: string;
  tempContactName?: string | null;
  channelInternalId?: string; // JID completo
  lastMessage?: string;
  lastMessageDirection?: 'incoming' | 'outgoing';
  lastMessageAt?: string;
  unreadCount?: number;
};

export type Message = {
  _id: string;
  conversation: string;
  direction: 'incoming' | 'outgoing';
  senderId?: string;
  content: string;
  status?: string;
  createdAt: string;
};

type ConvPage = { items: Conversation[]; nextCursor: string | null };
type MsgPage  = { items: Message[]; nextBefore: string | null };

// Lista conversas com cursor
export async function listConversations(
  limit: number = 30,
  cursor: string | null = null
): Promise<ConvPage> {
  const { data } = await api.get('/chat/conversations', {
    params: { limit, cursor: cursor ?? undefined },
  });

  const root = (data as any)?.data ?? data ?? {};
  const items: Conversation[] =
    root.items || root.conversations || root.data || [];
  const nextCursor: string | null = root.nextCursor ?? null;

  return { items, nextCursor };
}

// Lista mensagens (before/after)
export async function getMessages(
  conversationId: string,
  params?: { limit?: number; before?: string; after?: string }
): Promise<MsgPage> {
  const { data } = await api.get(
    `/chat/conversations/${conversationId}/messages`,
    { params }
  );

  const root = (data as any)?.data ?? data ?? {};
  const items: Message[] = root.items || root.data || [];
  const nextBefore: string | null = root.nextBefore ?? null;

  return { items, nextBefore };
}

// Envia mensagem
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  const { data } = await api.post(
    `/chat/conversations/${conversationId}/messages`,
    { content }
  );
  return (data as any)?.data ?? data;
}

// Cria lead a partir da conversa (ajuste a rota se for diferente no seu backend)
export async function createLeadFromConversation(
  conversationId: string
): Promise<any> {
  const { data } = await api.post(
    `/chat/conversations/${conversationId}/create-lead`
  );
  return (data as any)?.data ?? data;
}
