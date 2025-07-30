// src/pages/Chat/ChatPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { listConversationsApi, getMessagesApi, sendMessageApi, createLeadFromConversationApi } from '../../api/chatApi';
import ConversationList from './componentes/ConversationList';
import ChatWindow from './componentes/ChatWindow';
import './ChatPage.css';

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState({ conversations: true, messages: false });

    const [view, setView] = useState('list');

    const fetchConversations = useCallback(async () => {
        setLoading(prev => ({ ...prev, conversations: true }));
        try {
            const data = await listConversationsApi();
            setConversations(data || []);
        } catch (error) {
            console.error("Erro ao carregar conversas", error);
        } finally {
            setLoading(prev => ({ ...prev, conversations: false }));
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        setView('chat');
        setLoading(prev => ({ ...prev, messages: true }));
        try {
            const data = await getMessagesApi(conversation._id);
            setMessages(data || []);
            setConversations(prev =>
                prev.map(c =>
                    c._id === conversation._id ? { ...c, unreadCount: 0 } : c
                )
            );
        } catch (error) {
            console.error("Erro ao carregar mensagens", error);
        } finally {
            setLoading(prev => ({ ...prev, messages: false }));
        }
    };

    const handleSendMessage = async (content) => {
        if (!selectedConversation || !content.trim()) return;
        try {
            const sentMessage = await sendMessageApi(selectedConversation._id, content);
            setMessages(prev => [...prev, sentMessage]);
        } catch (error) {
            console.error("Erro ao enviar mensagem", error);
        }
    };

    const handleCreateLead = async (conversationId) => {
        if (!conversationId) return;
        try {
            const newLead = await createLeadFromConversationApi(conversationId);
            toast.success(`Lead "${newLead.nome}" criado com sucesso!`);
            // Atualiza a conversa na lista para refletir a mudança
            setConversations(prev => prev.map(conv =>
                conv._id === conversationId
                    ? { ...conv, lead: newLead._id, leadNameSnapshot: newLead.nome, tempContactName: null }
                    : conv
            ));
            // Atualiza a conversa selecionada, se for a atual
            if (selectedConversation?._id === conversationId) {
                setSelectedConversation(prev => ({ ...prev, lead: newLead._id, leadNameSnapshot: newLead.nome, tempContactName: null }));
            }
        } catch (error) {
            toast.error(error.error || error.message || "Falha ao criar o lead.");
        }
    };

    const isMobile = window.innerWidth <= 768;

    useEffect(() => {
        if (!selectedConversation?._id) return;

        const interval = setInterval(async () => {
            try {
                const data = await getMessagesApi(selectedConversation._id);

                if (!Array.isArray(data)) return;

                const lastCurrent = messages[messages.length - 1];
                const lastNew = data[data.length - 1];

                if (!lastCurrent || !lastNew) {
                    // Se não tem mensagens atuais ou novas, atualiza direto
                    setMessages(data);
                    return;
                }

                const currentId = lastCurrent._id?.toString();
                const newId = lastNew._id?.toString();

                if (currentId !== newId) {
                    setMessages(data);
                }
            } catch (error) {
                console.error("Erro no polling inteligente:", error);
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [selectedConversation, messages]);


    return (
        <div className={`admin-page chat-page view-${view}`}>
            <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversation?._id}
                onSelectConversation={async (c) => {
                    setView('chat');
                    await handleSelectConversation(c);
                }}
                loading={loading.conversations}
            />
            <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                loading={loading.messages}
                onSendMessage={handleSendMessage}
                onCreateLead={handleCreateLead}
                onBack={() => setView('list')}
            />
        </div>
    );
}

export default ChatPage;
