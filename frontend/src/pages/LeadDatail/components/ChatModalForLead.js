import React, { useEffect, useRef, useState, useCallback } from "react";
import ChatWindow from "../../../pages/ChatPage/componentes/ChatWindow";
import {
  listConversationsApi,
  getMessagesApi,
  sendMessageApi,
  createLeadFromConversationApi,
} from "../../../api/chatApi";
import "./ChatModalForLead.css";

function ChatModalForLead({ isOpen, onClose, leadId }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const nextBeforeRef = useRef(null); // cursor de paginação (antes do mais antigo carregado)

  // Carrega conversa vinculada ao lead
  const fetchConversation = useCallback(async () => {
    setLoadingConv(true);
    try {
      const { items } = await listConversationsApi({ leadId });
      const conv = Array.isArray(items) && items.length ? items[0] : null;
      setConversation(conv || null);
      return conv;
    } finally {
      setLoadingConv(false);
    }
  }, [leadId]);

  // Primeira carga de mensagens
  const fetchInitialMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const { items, nextBefore } = await getMessagesApi(convId, { limit: 30 });
      const sorted = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(sorted);
      setHasMoreMessages(Boolean(nextBefore));
      nextBeforeRef.current = nextBefore || null;
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Paginar mensagens antigas (prepend)
  const onLoadOlderMessages = useCallback(async () => {
    if (!conversation?._id || !hasMoreMessages || loadingMsgs) return;
    setLoadingMsgs(true);
    try {
      const { items, nextBefore } = await getMessagesApi(conversation._id, {
        limit: 30,
        before: nextBeforeRef.current || undefined,
      });
      const merged = [...items, ...messages];
      const sorted = merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(sorted);
      setHasMoreMessages(Boolean(nextBefore));
      nextBeforeRef.current = nextBefore || null;
    } finally {
      setLoadingMsgs(false);
    }
  }, [conversation?._id, hasMoreMessages, loadingMsgs, messages]);

  // Enviar mensagem
  const onSendMessage = useCallback(
    async (text) => {
      if (!conversation?._id || !text?.trim()) return;
      const msg = await sendMessageApi(conversation._id, text.trim());
      setMessages((prev) => [...prev, msg]);
    },
    [conversation?._id]
  );

  // Criar lead a partir da conversa (provavelmente não vai ser usado nesse modal,
  // mas mantive suporte do ChatWindow)
  const onCreateLead = useCallback(
    async (conversationId) => {
      await createLeadFromConversationApi(conversationId);
      // Recarrega conversa para refletir vínculo atualizado
      const conv = await fetchConversation();
      if (conv?._id) await fetchInitialMessages(conv._id);
    },
    [fetchConversation, fetchInitialMessages]
  );

  // Boot do modal
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isOpen || !leadId) return;
      setConversation(null);
      setMessages([]);
      setHasMoreMessages(true);
      nextBeforeRef.current = null;

      const conv = await fetchConversation();
      if (!alive) return;
      if (conv?._id) await fetchInitialMessages(conv._id);
    })();
    return () => {
      alive = false;
    };
  }, [isOpen, leadId, fetchConversation, fetchInitialMessages]);

  if (!isOpen) return null;

  return (
    <div className="lead-chat-modal-overlay" role="dialog" aria-modal="true">
      <div className="lead-chat-modal">
        <header className="lead-chat-modal-header">
          <h3>Chat do Lead</h3>
          <button className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        <div className="lead-chat-modal-body">
          <ChatWindow
            conversation={conversation}
            messages={messages}
            loading={loadingConv || loadingMsgs}
            onSendMessage={onSendMessage}
            onCreateLead={onCreateLead}
            onBack={null}             
            onLoadOlderMessages={onLoadOlderMessages}
            hasMoreMessages={hasMoreMessages}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatModalForLead;
