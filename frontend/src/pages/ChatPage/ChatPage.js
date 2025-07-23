import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listConversationsApi, getMessagesApi, sendMessageApi } from '../../api/chatApi';
import { toast } from 'react-toastify';
import './ChatPage.css';

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const fetchConversations = useCallback(async () => {
        setLoadingConversations(true);
        try {
            const data = await listConversationsApi();
            setConversations(data || []);
        } catch (error) {
            toast.error("Erro ao carregar conversas.");
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleSelectConversation = async (convId) => {
        setSelectedConversationId(convId);
        setLoadingMessages(true);
        try {
            const data = await getMessagesApi(convId);
            setMessages(data || []);
            // Atualiza a contagem de não lidas na lista localmente
            setConversations(prev => prev.map(c => c._id === convId ? { ...c, unreadCount: 0 } : c));
        } catch (error) {
            toast.error("Erro ao carregar mensagens.");
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId) return;

        const originalMessage = newMessage;
        setNewMessage(''); // Limpa o input otimisticamente
        try {
            const sentMessage = await sendMessageApi(selectedConversationId, originalMessage);
            setMessages(prev => [...prev, sentMessage]); // Adiciona a nova mensagem à lista
        } catch (error) {
            toast.error("Erro ao enviar mensagem.");
            setNewMessage(originalMessage); // Devolve o texto ao input em caso de erro
        }
    };

    const selectedConvDetails = conversations.find(c => c._id === selectedConversationId);

    return (
        <div className="admin-page chat-page">
            <aside className="conversations-list">
                <header><h3>Conversas</h3></header>
                <ul>
                    {loadingConversations ? <p>Carregando...</p> :
                        conversations.map(conv => (
                            <li key={conv._id} onClick={() => handleSelectConversation(conv._id)} className={conv._id === selectedConversationId ? 'active' : ''}>
                                <div className="conv-info">
                                    <span className="conv-name">{conv.lead?.nome}</span>
                                    <span className="conv-preview">{conv.lastMessage}</span>
                                </div>
                                {conv.unreadCount > 0 && <span className="unread-badge">{conv.unreadCount}</span>}
                            </li>
                        ))
                    }
                </ul>
            </aside>
            <main className="chat-window">
                {selectedConversationId ? (
                    <>
                        <header className="chat-header">
                            <h4>{selectedConvDetails?.lead?.nome || 'Carregando...'}</h4>
                        </header>
                        <div className="messages-area">
                            {loadingMessages ? <p>Carregando mensagens...</p> :
                                messages.map(msg => (
                                    <div key={msg._id} className={`message-bubble ${msg.direction}`}>
                                        <p>{msg.content}</p>
                                        <span className="message-timestamp">{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))
                            }
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="message-input-area" onSubmit={handleSendMessage}>
                            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." />
                            <button type="submit">Enviar</button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <p>Selecione uma conversa para começar</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default ChatPage;