// src/pages/Chat/components/MessageBubble.js
import React from 'react';

function MessageBubble({ message }) {
    const isOutgoing = message.direction === 'outgoing';
    
    // Lógica para renderizar diferentes tipos de conteúdo
    const renderContent = () => {
        switch (message.contentType) {
            case 'image':
                return (
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <img src={message.mediaUrl} alt={message.content || 'Imagem recebida'} className="message-image" />
                        {message.content && message.content !== 'Imagem' && <p className="message-caption">{message.content}</p>}
                    </a>
                );
            case 'audio':
                return (
                    <audio controls src={message.mediaUrl} className="message-audio">
                        Seu navegador não suporta o elemento de áudio.
                    </audio>
                );
            case 'document':
                return (
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="message-document">
                        📄 <span>{message.content || 'Baixar Documento'}</span>
                    </a>
                );
            default: // text
                return <p className="message-text">{message.content}</p>;
        }
    };


    return (
        <div className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
            <div className="message-bubble">
                {renderContent()}
                <span className="message-timestamp">
                    {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
}
export default MessageBubble;