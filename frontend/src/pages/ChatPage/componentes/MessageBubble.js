// src/pages/Chat/components/MessageBubble.js
import React from 'react';

function MessageBubble({ message }) {
    const isOutgoing = message.direction === 'outgoing';
    
    // Lógica para renderizar diferentes tipos de conteúdo
    const renderContent = () => {
        switch (message.contentType) {
            case 'image':
                return <img src={message.mediaUrl} alt={message.content || 'Imagem'} className="message-image" />;
            case 'audio':
                return <audio controls src={message.mediaUrl}>Seu navegador não suporta áudio.</audio>;
            case 'document':
                return <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">Baixar Documento</a>;
            default: // text
                return <p>{message.content}</p>;
        }
    };

    const messageTime = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });


    return (
        <div className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
            <div className="message-bubble">
                <p className="message-content">{message.content}</p>
                <span className="message-timestamp">{messageTime}</span>
            </div>
        </div>
    );
}
export default MessageBubble;