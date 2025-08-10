// src/pages/Chat/componentes/ChatWindow.js
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import MessageBubble from './MessageBubble';

function ChatWindow({
  conversation,
  messages,
  loading,
  onSendMessage,
  onCreateLead,
  onBack,
  onLoadOlderMessages,    // <-- já existe no ChatPage
  hasMoreMessages         // <-- já existe no ChatPage
}) {
  const [newMessage, setNewMessage] = useState('');
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  // Scroll pro bottom quando muda a conversa (primeiro paint)
  const lastConvIdRef = useRef(null);
  useLayoutEffect(() => {
    if (!conversation?._id) return;
    if (lastConvIdRef.current !== conversation._id) {
      lastConvIdRef.current = conversation._id;
      // jump instantâneo no primeiro render da conversa
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
    }
  }, [conversation]);

  // Scroll suave quando chegam novas mensagens no fim
  useEffect(() => {
    // só faz smooth se a lista já estiver ancorada lá embaixo
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Paginação ao subir (mantém âncora)
  const loadingOlderRef = useRef(false);
  const prevDimsRef = useRef({ scrollHeight: 0, scrollTop: 0 });

  const tryLoadOlder = async () => {
    if (!hasMoreMessages || loadingOlderRef.current) return;
    const el = listRef.current;
    if (!el) return;

    loadingOlderRef.current = true;
    prevDimsRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };

    await onLoadOlderMessages?.(); // ChatPage faz o prepend

    // reancora após o prepend
    requestAnimationFrame(() => {
      const el2 = listRef.current;
      if (!el2) return;
      const delta = el2.scrollHeight - prevDimsRef.current.scrollHeight;
      el2.scrollTop = prevDimsRef.current.scrollTop + delta;
      loadingOlderRef.current = false;
    });
  };

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop <= 16) tryLoadOlder();
  };

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
        {typeof onBack === 'function' && <button onClick={onBack} className="back-button">← Voltar</button>}
        <img src={conversation.contactPhotoUrl || '/default-avatar.png'} alt="avatar" className="chat-avatar" />
        <div className="chat-header-info">
          <h4>{conversation.lead?.nome || conversation.leadNameSnapshot || conversation.tempContactName}</h4>
          <span>Instância: {conversation.instanceName || 'N/A'} | Status do Lead: {conversation.lead?.situacao?.nome || 'N/A'}</span>
        </div>
        <div className="chat-header-actions">
          {!conversation.lead && (
            <button onClick={() => onCreateLead(conversation._id)} className="button primary-button small-button">
              Criar Lead
            </button>
          )}
        </div>
      </header>

      <div className="messages-area" ref={listRef} onScroll={onScroll}>
        {hasMoreMessages && (
          <div className="load-older-hint">Deslize para cima para carregar mensagens anteriores</div>
        )}
        {loading ? <p>Carregando mensagens...</p> :
          messages.map(m => <MessageBubble key={m._id} message={m} />)
        }
        <div ref={bottomRef} />
      </div>

      <form className="message-input-area" onSubmit={handleSubmit}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button type="submit">Enviar</button>
      </form>
    </main>
  );
}

export default ChatWindow;
