// src/pages/Chat/components/ChatWindow.js
import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble'; // Criaremos este a seguir

function ChatWindow({ conversation, messages, loading, onSendMessage }) {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
    };

    if (!conversation) {
        return <main className="chat-window no-chat-selected"><p>Selecione uma conversa para começar</p></main>;
    }
    
    return (
        <main className="chat-window">
            <header className="chat-header">
                <img src={conversation.contactPhotoUrl || '/default-avatar.png'} alt="avatar" className="chat-avatar" />
                <div className="chat-header-info">
                    <h4>{conversation.lead?.nome || conversation.leadNameSnapshot || conversation.tempContactName}</h4>
                    <span>Instância: {conversation.instanceName || 'N/A'} | Status do Lead: {conversation.lead?.situacao?.nome || 'N/A'}</span>
                </div>
                <div className="chat-header-actions">
                    {/* Ícones de Ações aqui */}
                </div>
            </header>
            <div className="messages-area">
                {loading ? <p>Carregando mensagens...</p> :
                    messages.map(msg => <MessageBubble key={msg._id} message={msg} />)
                }
                <div ref={messagesEndRef} />
            </div>
            <form className="message-input-area" onSubmit={handleSubmit}>
                {/* Ícone de anexo aqui */}
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." />
                <button type="submit">Enviar</button>
            </form>
        </main>
    );


}
export default ChatWindow;