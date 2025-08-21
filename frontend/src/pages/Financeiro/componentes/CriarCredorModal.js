import React, { useState } from 'react';
import { criarCredorApi } from '../../../api/financeiroApi';
import { toast } from 'react-toastify';

export default function CriarCredorModal({ open, onClose, onSuccess }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Fornecedor');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await criarCredorApi({ nome, tipo });
      toast.success('Credor criado!');
      onSuccess?.();
      onClose();
      setNome(''); setTipo('Fornecedor');
    } catch (err) {
      toast.error(err?.message || 'Falha ao criar credor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Novo Credor</h3>
        <form onSubmit={handleSubmit} className="form-grid">
          <label className="col-span-2">
            Nome
            <input value={nome} onChange={e=>setNome(e.target.value)} required />
          </label>
          <label>
            Tipo
            <select value={tipo} onChange={e=>setTipo(e.target.value)}>
              <option>Fornecedor</option>
              <option>Corretor</option>
              <option>Prestador</option>
            </select>
          </label>
          <div className="modal-actions col-span-2">
            <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary" disabled={loading}>{loading ? 'Salvando…' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
