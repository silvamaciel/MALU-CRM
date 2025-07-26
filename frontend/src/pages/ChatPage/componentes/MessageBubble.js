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

    return (
        <div className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
            <div className="message-bubble">
                {renderContent()}
                <span className="message-timestamp">{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
}
export default MessageBubble;