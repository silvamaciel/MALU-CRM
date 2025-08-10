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
            const { items: convs, nextCursor } = await listConversationsApi({ limit: PAGE_SIZE, cursor });
            setConversations(prev => cursor ? [...prev, ...convs] : convs);
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
            const { items: msgs, nextBefore } = await getMessagesApi(conversation._id, { limit: PAGE_SIZE });
            setMessages(msgs);
            setMsgCursor(nextBefore || msgs[0]?.createdAt || msgs[0]?._id || null);
            setHasMoreMessages(Boolean(nextBefore) || msgs.length === PAGE_SIZE);
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
            const { items: older, nextBefore } = await getMessagesApi(selectedConversation._id, { limit: PAGE_SIZE, before: msgCursor });
            if (!older.length) { setHasMoreMessages(false); return; }
            setMessages(prev => [...older, ...prev]);
            setMsgCursor(nextBefore || older[0]?.createdAt || older[0]?._id || null);
            if (!nextBefore || older.length < PAGE_SIZE) setHasMoreMessages(false);
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
                const lastId = messages[messages.length - 1]?._id;
                const { items: news } = await getMessagesApi(id, { after: lastId, limit: 10 });
                if (news.length) setMessages(prev => [...prev, ...news]);
            } catch (e) { }
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
