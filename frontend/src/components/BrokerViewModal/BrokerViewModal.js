// src/components/BrokerViewModal/BrokerViewModal.jsx
import React from 'react';
import './BrokerFormModal.css';

export default function BrokerViewModal({ isOpen, data, onClose }) {
  if (!isOpen || !data) return null;
  return (
    <div className="form-modal-overlay" onClick={onClose}>
      <div className="form-modal-content" onClick={(e)=>e.stopPropagation()}>
        <h2>Detalhes do Corretor</h2>
        <div className="detail-grid">
          <div><strong>Nome:</strong> {data.nome}</div>
          <div><strong>Contato:</strong> {data.contato || '-'}</div>
          <div><strong>Email:</strong> {data.email || '-'}</div>
          <div><strong>CRECI:</strong> {data.creci || '-'}</div>
          <div><strong>Imobiliária:</strong> {data.nomeImobiliaria || 'Autônomo'}</div>
          <div><strong>CPF/CNPJ:</strong> {data.cpfCnpj || '-'}</div>
          <div><strong>Status:</strong> {data.ativo ? 'Ativo' : 'Inativo'}</div>
          {data.createdAt && (<div><strong>Cadastrado em:</strong> {new Date(data.createdAt).toLocaleDateString('pt-BR')}</div>)}
        </div>
        <div className="form-actions">
          <button className="button cancel-button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
