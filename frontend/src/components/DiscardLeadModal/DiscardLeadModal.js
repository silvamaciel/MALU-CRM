// src/components/DiscardLeadModal/DiscardLeadModal.js
import React, { useState, useEffect } from 'react';
import './DiscardLeadModal.css';

function DiscardLeadModal({ isOpen, onClose, onSubmit, leadName, isProcessing, errorMessage }) {
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [comentario, setComentario] = useState('');
  const [internalError, setInternalError] = useState('');

  // Limpa o formulário quando o modal é fechado ou reaberto
  useEffect(() => {
    if (isOpen) {
      setMotivoDescarte('');
      setComentario('');
      setInternalError(''); // Limpa erro interno ao abrir
    }
  }, [isOpen]);

  // Limpa erro interno se erro externo for resolvido
  useEffect(() => {
     if (!errorMessage) {
         setInternalError('');
     }
  }, [errorMessage]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivoDescarte.trim()) {
      setInternalError('O motivo do descarte é obrigatório.');
      return;
    }
    setInternalError(''); // Limpa erro interno antes de submeter
    onSubmit({ motivoDescarte, comentario });
  };

  if (!isOpen) {
    return null; // Não renderiza nada se não estiver aberto
  }

  return (
    <div className="modal-overlay" onClick={onClose}> {/* Fecha ao clicar fora */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Evita fechar ao clicar dentro */}
        <h2>Descartar Lead: {leadName || 'Lead'}</h2>
        <p>Por favor, informe o motivo do descarte. O lead será movido para a situação "Descartado".</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="motivoDescarte">Motivo do Descarte *</label>
            <input
              type="text"
              id="motivoDescarte"
              value={motivoDescarte}
              onChange={(e) => setMotivoDescarte(e.target.value)}
              required
              placeholder='Ex: Sem Interesse, Contato Inválido, Duplicado'
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label htmlFor="comentarioDescarte">Comentário Adicional</label>
            <textarea
              id="comentarioDescarte"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              maxLength={500}
            ></textarea>
          </div>

          {/* Mostra erro interno (ex: campo obrigatório) ou erro vindo do submit */}
          {(internalError || errorMessage) && (
             <p className="error-message-modal">{internalError || errorMessage}</p>
          )}


          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button cancel-button-modal" disabled={isProcessing}>
              Cancelar
            </button>
            <button type="submit" className="button confirm-discard-button" disabled={isProcessing}>
              {isProcessing ? 'Descartando...' : 'Confirmar Descarte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DiscardLeadModal;