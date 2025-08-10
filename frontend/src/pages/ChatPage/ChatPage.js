import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { listConversationsApi, getMessagesApi, sendMessageApi, createLeadFromConversationApi } from '../../api/chatApi';
import ConversationList from './componentes/ConversationList';
import ChatWindow from './componentes/ChatWindow';
import './ChatPage.css';

const PAGE_SIZE = 30; // tuning

function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [convCursor, setConvCursor] = useState(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgCursor, setMsgCursor] = useState(null); // timestamp/id do mais antigo
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const [loading, setLoading] = useState({ conversations: true, messages: false });
  const [view, setView] = useState('list');

  // ------- Conversations (infinite) -------
  const fetchConversations = useCallback(async (cursor = null) => {
    setLoading(prev => ({ ...prev, conversations: true }));
    try {
      // ajuste seu backend para aceitar {limit, cursor} via querystring
      const data = await listConversationsApi({ limit: PAGE_SIZE, cursor });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      const nextCursor = data?.nextCursor ?? (items.length === PAGE_SIZE ? items[items.length - 1]?._id : null);

      setConversations(prev => cursor ? [...prev, ...items] : items);
      setConvCursor(nextCursor);
      setHasMoreConversations(Boolean(nextCursor));
    } catch (e) {
      console.error('Erro ao carregar conversas', e);
    } finally {
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  }, []);

  useEffect(() => { fetchConversations(null); }, [fetchConversations]);

  const loadMoreConversations = async () => {
    if (!hasMoreConversations || loading.conversations) return;
    await fetchConversations(convCursor);
  };

  // ------- Messages (reverse infinite + polling leve) -------
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setView('chat');
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      const data = await getMessagesApi(conversation._id, { limit: PAGE_SIZE }); // ajuste backend
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setMessages(items);
      setMsgCursor(items[0]?.createdAt || items[0]?._id || null);
      setHasMoreMessages(items.length === PAGE_SIZE);
      setConversations(prev => prev.map(c => c._id === conversation._id ? { ...c, unreadCount: 0 } : c));
    } catch (e) {
      console.error('Erro ao carregar mensagens', e);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedConversation || !hasMoreMessages) return;
    try {
      const data = await getMessagesApi(selectedConversation._id, { limit: PAGE_SIZE, before: msgCursor });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      if (items.length === 0) { setHasMoreMessages(false); return; }
      setMessages(prev => [...items, ...prev]);
      setMsgCursor(items[0]?.createdAt || items[0]?._id || null);
      if (items.length < PAGE_SIZE) setHasMoreMessages(false);
    } catch (e) {
      console.error('Erro ao paginar mensagens', e);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedConversation || !content.trim()) return;
    try {
      const m = await sendMessageApi(selectedConversation._id, content);
      setMessages(prev => [...prev, m]);
    } catch (e) {
      console.error('Erro ao enviar mensagem', e);
    }
  };

  const handleCreateLead = async (conversationId) => {
    if (!conversationId) return;
    try {
      const newLead = await createLeadFromConversationApi(conversationId);
      toast.success(`Lead "${newLead.nome}" criado com sucesso!`);
      setConversations(prev => prev.map(conv =>
        conv._id === conversationId ? { ...conv, lead: newLead._id, leadNameSnapshot: newLead.nome, tempContactName: null } : conv
      ));
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(prev => ({ ...prev, lead: newLead._id, leadNameSnapshot: newLead.nome, tempContactName: null }));
      }
    } catch (error) {
      toast.error(error.error || error.message || 'Falha ao criar o lead.');
    }
  };

  // polling leve (somente append)
  useEffect(() => {
    if (!selectedConversation?._id) return;
    const id = selectedConversation._id;
    const interval = setInterval(async () => {
      try {
        const data = await getMessagesApi(id, { after: messages[messages.length - 1]?._id, limit: 10 });
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length) setMessages(prev => [...prev, ...items]);
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConversation, messages]);

  return (
    <div className={`admin-page chat-page view-${view}`}>
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversation?._id}
        onSelectConversation={handleSelectConversation}
        loading={loading.conversations}
        onLoadMoreConversations={loadMoreConversations}
        hasMoreConversations={hasMoreConversations}
      />
      <ChatWindow
        conversation={selectedConversation}
        messages={messages}
        loading={loading.messages}
        onSendMessage={handleSendMessage}
        onCreateLead={handleCreateLead}
        onBack={() => setView('list')}
        onLoadOlderMessages={loadOlderMessages}
        hasMoreMessages={hasMoreMessages}
      />
    </div>
  );
}
export default ChatPage;
