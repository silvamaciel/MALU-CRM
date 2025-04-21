// src/components/DiscardLeadModal/DiscardLeadModal.js
import React, { useState, useEffect } from 'react';
import { getDiscardReasons } from '../../api/discardReasons'; // <-- Importar API
import './DiscardLeadModal.css';

function DiscardLeadModal({ isOpen, onClose, onSubmit, leadName, isProcessing, errorMessage }) {
  // State interno do modal
  const [motivoDescarteId, setMotivoDescarteId] = useState(''); // <-- Guarda o ID
  const [comentario, setComentario] = useState('');
  const [internalError, setInternalError] = useState('');

  // State para lista de motivos
  const [reasonsList, setReasonsList] = useState([]);
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  const [reasonsError, setReasonsError] = useState(null);

  // Efeito para buscar motivos QUANDO o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Resetar campos ao abrir
      setMotivoDescarteId('');
      setComentario('');
      setInternalError('');
      setReasonsError(null); // Limpar erro de busca anterior

      const fetchReasons = async () => {
        setIsLoadingReasons(true);
        try {
          const data = await getDiscardReasons();
          setReasonsList(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Erro buscando motivos no modal:", error);
          setReasonsError("Não foi possível carregar os motivos.");
          setReasonsList([]);
        } finally {
          setIsLoadingReasons(false);
        }
      };
      fetchReasons();
    }
  }, [isOpen]); // Depende de isOpen

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivoDescarteId) { // Valida se um ID foi selecionado
      setInternalError('Por favor, selecione um motivo do descarte.');
      return;
    }
    setInternalError('');
    // Envia o ID do motivo e o comentário
    onSubmit({ motivoDescarte: motivoDescarteId, comentario }); // <-- Envia ID
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Descartar Lead: {leadName || 'Lead'}</h2>
        <p>Selecione o motivo do descarte. O lead será movido para "Descartado".</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="motivoDescarte">Motivo do Descarte *</label>
            {/* <<< TROCA Input por Select >>> */}
            <select
              id="motivoDescarte"
              value={motivoDescarteId}
              onChange={(e) => setMotivoDescarteId(e.target.value)}
              required
              disabled={isLoadingReasons || isProcessing}
            >
              <option value="" disabled>
                {isLoadingReasons ? "Carregando..." : "Selecione um motivo..."}
              </option>
              {/* Popula com os motivos buscados */}
              {!isLoadingReasons && reasonsList.map(reason => (
                <option key={reason._id} value={reason._id}>
                  {reason.nome}
                </option>
              ))}
            </select>
            {/* Mostra erro se não conseguir carregar motivos */}
            {!isLoadingReasons && reasonsError && <small className="error-reason-load">{reasonsError}</small>}
          </div>

          <div className="form-group">
            <label htmlFor="comentarioDescarte">Comentário Adicional</label>
            <textarea
              id="comentarioDescarte"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isProcessing}
            ></textarea>
          </div>

          {(internalError || errorMessage) && (
             <p className="error-message-modal">{internalError || errorMessage}</p>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button cancel-button-modal" disabled={isProcessing}>
              Cancelar
            </button>
            {/* Desabilita submit se motivos não carregaram ou erro */}
            <button
                type="submit"
                className="button confirm-discard-button"
                disabled={isProcessing || isLoadingReasons || reasonsError || !reasonsList.length}
             >
              {isProcessing ? 'Descartando...' : 'Confirmar Descarte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DiscardLeadModal;

