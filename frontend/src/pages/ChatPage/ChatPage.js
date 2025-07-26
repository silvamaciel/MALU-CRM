// src/pages/Chat/ChatPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { listConversationsApi, getMessagesApi, sendMessageApi } from '../../api/chatApi';
import ConversationList from './componentes/ConversationList';
import ChatWindow from './componentes/ChatWindow';
import './ChatPage.css';

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState({ conversations: true, messages: false });

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

    return (
        <div className="admin-page chat-page">
            <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversation?._id}
                onSelectConversation={handleSelectConversation}
                loading={loading.conversations}
            />
            <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                loading={loading.messages}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
}

export default ChatPage;
