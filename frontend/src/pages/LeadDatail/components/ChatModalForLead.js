// src/pages/LeadDetail/components/LeadChat.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import ChatWindow from '../../ChatPage/componentes/ChatWindow';
import {
  listConversationsApi,
  getMessagesApi,
  sendMessageApi,
  createLeadFromConversationApi,
} from '../../../api/chatApi';



import './ChatModalForLead.css'
/**
 * Props:
 * - leadId: string (obrigatório)
 * - variant: 'panel' | 'modal' (default = 'panel')
 * - isOpen: boolean (usado SOMENTE no variant='modal'; default true no panel)
 * - onClose: () => void (apenas para modal)
 */
export default function LeadChat({
  leadId,
  variant = 'panel',
  isOpen = true,
  onClose,
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const nextBeforeRef = useRef(null); // cursor p/ antigas
  const pollingRef = useRef(null);    // polling novas

  // ---- helper: normaliza avatar para conversation.contactPhotoUrl
  const normalizeConversation = (raw) => {
    if (!raw) return raw;
    const normalized = {
      ...raw,
      contactPhotoUrl:
        raw.contactPhotoUrl ??
        raw.contactphotourl ??            // possível key vinda em minúsculas
        raw.profilePicUrl ??              // alguns provedores usam isso
        raw.contact?.photoUrl ??          // aninhado
        raw.contact?.profilePicUrl ??     // aninhado em outros SDKs
        raw.meta?.contactPhotoUrl ??      // guardado em meta
        null,
    };
    return normalized;
  };

  const loadConversation = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { items } = await listConversationsApi({ leadId, limit: 1 });
      const raw = items?.[0] || null;
      const conv = normalizeConversation(raw);
      setConversation(conv);

      if (conv?._id) {
        const { items: msgs, nextBefore } = await getMessagesApi(conv._id, { limit: 30 });
        setMessages(msgs || []);
        nextBeforeRef.current = nextBefore || null;
        setHasMoreMessages(Boolean(nextBefore));
      } else {
        setMessages([]);
        nextBeforeRef.current = null;
        setHasMoreMessages(false);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // carrega ao abrir / trocar lead
  useEffect(() => {
    const shouldLoad = variant === 'panel' ? Boolean(leadId) : (isOpen && leadId);
    if (shouldLoad) loadConversation();
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [variant, isOpen, leadId, loadConversation]);

  // polling de novas mensagens (a cada 5s)
  useEffect(() => {
    const shouldPoll = (variant === 'panel' || isOpen) && conversation?._id;
    if (!shouldPoll) return;
    pollingRef.current = setInterval(async () => {
      const last = messages[messages.length - 1];
      const { items: novas } = await getMessagesApi(conversation._id, { after: last?._id });
      if (novas?.length) setMessages(prev => [...prev, ...novas]);
    }, 5000);
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, isOpen, conversation?._id, messages]);

  const handleLoadOlder = useCallback(async () => {
    if (!conversation?._id || !nextBeforeRef.current) return;
    const { items: older, nextBefore } = await getMessagesApi(conversation._id, {
      limit: 30,
      before: nextBeforeRef.current,
    });
    setMessages(prev => [...older, ...prev]); // prepend
    nextBeforeRef.current = nextBefore || null;
    setHasMoreMessages(Boolean(nextBefore));
  }, [conversation]);

  const handleSendMessage = useCallback(async (text) => {
    if (!conversation?._id) return;
    const sent = await sendMessageApi(conversation._id, text);
    setMessages(prev => [...prev, sent]);
  }, [conversation]);

  const handleCreateLeadFromConv = useCallback(async () => {
    if (!conversation?._id) return;
    await createLeadFromConversationApi(conversation._id);
    await loadConversation();
  }, [conversation, loadConversation]);

  // --- render ---
  if (variant === 'modal') {
    if (!isOpen) return null;
    return (
      <div className="modal-overlay chat-modal">
        <div className="modal-card">
          <div className="modal-header">
            <h3>Conversa do Lead</h3>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            <ChatWindow
              conversation={conversation}
              messages={messages}
              loading={loading}
              onSendMessage={handleSendMessage}
              onCreateLead={handleCreateLeadFromConv}
              onLoadOlderMessages={handleLoadOlder}
              hasMoreMessages={hasMoreMessages}
            />
          </div>
        </div>
      </div>
    );
  }

  // inline (painel)
  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2>Chat</h2>
        <div className="chat-panel-actions">
          <button className="button outline-button" onClick={loadConversation} disabled={loading}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="chat-panel-body">
        <ChatWindow
          conversation={conversation}
          messages={messages}
          loading={loading}
          onSendMessage={handleSendMessage}
          onCreateLead={handleCreateLeadFromConv}
          onLoadOlderMessages={handleLoadOlder}
          hasMoreMessages={hasMoreMessages}
        />
      </div>
    </div>
  );
}
