import React, { useEffect, useState, useCallback, useRef } from 'react';
import ChatWindow from '../../ChatPage/componentes/ChatWindow';
import { listConversationsApi, getMessagesApi, sendMessageApi, createLeadFromConversationApi } from '../../../api/chatApi';

export default function LeadChatModal({ leadId, isOpen, onClose }) {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const nextBeforeRef = useRef(null); // cursor para carregar antigas
    const pollingRef = useRef(null);    // opcional: polling de novas

    const loadConversation = useCallback(async () => {
        setLoading(true);
        try {
            const { items } = await listConversationsApi({ leadId, limit: 1 });
            const conv = items?.[0] || null;
            setConversation(conv);

            if (conv?._id) {
                // pega o último bloco de mensagens (sem before/after)
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

    // abre o modal e carrega a conversa do lead
    useEffect(() => {
        if (isOpen && leadId) loadConversation();
        return () => {
            // limpa polling ao fechar modal
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        };
    }, [isOpen, leadId, loadConversation]);

    useEffect(() => {
        if (!isOpen || !conversation?._id) return;
        pollingRef.current = setInterval(async () => {
            // pega mensagens novas com after = última mensagem atual
            const last = messages[messages.length - 1];
            const { items: novas } = await getMessagesApi(conversation._id, { after: last?._id });
            if (novas?.length) setMessages(prev => [...prev, ...novas]);
        }, 5000);
        return () => clearInterval(pollingRef.current);
    }, [isOpen, conversation?._id, messages]);

    const handleLoadOlder = useCallback(async () => {
        if (!conversation?._id || !nextBeforeRef.current) return;
        const { items: older, nextBefore } = await getMessagesApi(conversation._id, {
            limit: 30,
            before: nextBeforeRef.current,
        });
        // prepend mantendo ordem ASC
        setMessages(prev => [...older, ...prev]);
        nextBeforeRef.current = nextBefore || null;
        setHasMoreMessages(Boolean(nextBefore));
    }, [conversation]);

    const handleSendMessage = useCallback(async (text) => {
        if (!conversation?._id) return;
        const sent = await sendMessageApi(conversation._id, text);
        setMessages(prev => [...prev, sent]); // append
    }, [conversation]);

    const handleCreateLeadFromConv = useCallback(async () => {
        // normalmente não precisa aqui, pois já temos leadId.
        if (!conversation?._id) return;
        await createLeadFromConversationApi(conversation._id);
        await loadConversation();
    }, [conversation, loadConversation]);

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
