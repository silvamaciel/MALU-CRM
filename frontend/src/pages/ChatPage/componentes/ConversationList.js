// src/pages/Chat/components/ConversationList.js
import React from 'react';

function ConversationList({ conversations, selectedConversationId, onSelectConversation, loading }) {
    return (
        <aside className="conversations-list">
            <header>
                <h3>Conversas</h3>
                {/* Filtro de instância pode ser adicionado aqui */}
            </header>
            <ul>
                {loading ? <p>Carregando...</p> :
                    conversations.map(conv => (
                        <li key={conv._id} onClick={() => onSelectConversation(conv)} className={conv._id === selectedConversationId ? 'active' : ''}>
                            <img src={conv.contactPhotoUrl || '/default-avatar.png'} alt="avatar" className="conv-avatar" />
                            <div className="conv-info">
                                <span className="conv-name">{conv.lead?.nome || conv.leadNameSnapshot || conv.tempContactName || 'Conversa'}</span>
                                <span className="conv-preview">{conv.lastMessage}</span>
                            </div>
                            {conv.unreadCount > 0 && conv.lastMessageDirection === 'incoming' && (
                                <span className="unread-badge">{conv.unreadCount}</span>
                            )}
                        </li>
                    ))
                }
            </ul>
        </aside>
    );
}
export default ConversationList;