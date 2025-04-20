// src/components/ConfirmModal/ConfirmModal.js
import React from 'react';
import './ConfirmModal.css'; // Criaremos este arquivo

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Ação", // Título padrão
  message = "Você tem certeza que deseja prosseguir?", // Mensagem padrão
  confirmText = "Confirmar", // Texto do botão de confirmação
  cancelText = "Cancelar", // Texto do botão de cancelar
  confirmButtonClass = "confirm-button-default", // Classe CSS para botão de confirmação
  isProcessing = false, // Estado para desabilitar botões durante ação
  errorMessage = null // Mensagem de erro opcional a ser exibida
}) {

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay-confirm" onClick={onClose}>
      <div className="modal-content-confirm" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>

        {/* Exibe erro se houver */}
        {errorMessage && (
            <p className="error-message-modal-confirm">{errorMessage}</p>
        )}

        <div className="modal-actions-confirm">
          <button
            type="button"
            onClick={onClose}
            className="button cancel-button-confirm"
            disabled={isProcessing}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`button ${confirmButtonClass}`} // Aplica classe customizada
            disabled={isProcessing}
          >
            {isProcessing ? 'Processando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;