import React, { useRef } from 'react';

function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading,
  onLoadMoreConversations, // <- novo
  hasMoreConversations     // <- novo
}) {
  const listRef = useRef(null);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom && hasMoreConversations && typeof onLoadMoreConversations === 'function') {
      onLoadMoreConversations();
    }
  };

  return (
    <aside className="conversations-list">
      <header className="conversations-header">
        <h3>Conversas</h3>
      </header>
      <ul ref={listRef} onScroll={onScroll}>
        {loading && <p style={{padding:'8px 12px'}}>Carregando...</p>}
        {!loading && conversations.map(conv => (
          <li
            key={conv._id}
            onClick={() => onSelectConversation(conv)}
            className={conv._id === selectedConversationId ? 'active' : ''}
          >
            <img src={conv.contactPhotoUrl || '/default-avatar.png'} alt="avatar" className="conv-avatar" />
            <div className="conv-info">
              <span className="conv-name">{conv.lead?.nome || conv.leadNameSnapshot || conv.tempContactName || 'Conversa'}</span>
              <span className="conv-preview">{conv.lastMessage}</span>
            </div>
            {conv.unreadCount > 0 && conv.lastMessageDirection === 'incoming' && (
              <span className="unread-badge">{conv.unreadCount}</span>
            )}
          </li>
        ))}
        {!loading && hasMoreConversations && (
          <li className="load-more-hint">Carregando mais…</li>
        )}
      </ul>
    </aside>
  );
}
export default ConversationList;
