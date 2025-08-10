import React, { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';

function ChatWindow({
  conversation,
  messages,
  loading,
  onSendMessage,
  onCreateLead,
  onBack,
  onLoadOlderMessages, // <- novo
  hasMoreMessages      // <- novo
}) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true); // autoscroll só se o usuário estiver no rodapé

  const handleSubmit = (e) => {
    e.preventDefault();
    const txt = newMessage.trim();
    if (!txt) return;
    onSendMessage(txt);
    setNewMessage('');
  };

  // controla stick-to-bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    stickToBottom.current = nearBottom;

    // infinito reverso: carregar mensagens antigas ao atingir topo
    if (el.scrollTop < 40 && hasMoreMessages && typeof onLoadOlderMessages === 'function') {
      const prevHeight = el.scrollHeight;
      onLoadOlderMessages().then(() => {
        // preserva posição após prepend
        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop = newHeight - prevHeight;
        });
      });
    }
  }, [hasMoreMessages, onLoadOlderMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (stickToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!conversation) {
    return <main className="chat-window no-chat-selected"><p>Selecione uma conversa para começar</p></main>;
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        {typeof onBack === 'function' && (
          <button onClick={onBack} className="back-button">← Voltar</button>
        )}
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

      <div className="messages-area" ref={scrollRef} onScroll={handleScroll}>
        {loading && <p>Carregando mensagens...</p>}
        {!loading && hasMoreMessages && (
          <div className="load-older-hint">⬆️ Deslize para cima para carregar mensagens anteriores</div>
        )}
        {!loading && messages.map(msg => <MessageBubble key={msg._id} message={msg} />)}
        <div ref={messagesEndRef} />
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
