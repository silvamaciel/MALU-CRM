import React, { useState } from 'react';
import { registrarBaixaApi } from '../../../api/financeiroApi';
import { toast } from 'react-toastify';

export default function ModalBaixaPagamento({ open, onClose, parcela, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [valor, setValor] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [dataTransacao, setDataTransacao] = useState(() => new Date().toISOString().slice(0,10));
  const [observacao, setObservacao] = useState('');

  if (!open || !parcela) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { valor: Number(valor), metodoPagamento, dataTransacao, observacao };
      await registrarBaixaApi(parcela._id, payload);
      toast.success('Baixa registrada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Falha ao registrar baixa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Dar baixa na parcela</h3>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Valor
            <input type="number" step="0.01" value={valor} onChange={e=>setValor(e.target.value)} required />
          </label>
          <label>
            Método de Pagamento
            <select value={metodoPagamento} onChange={e=>setMetodoPagamento(e.target.value)}>
              <option>PIX</option>
              <option>Transferência</option>
              <option>Dinheiro</option>
              <option>Cartão</option>
              <option>Boleto</option>
            </select>
          </label>
          <label>
            Data da Transação
            <input type="date" value={dataTransacao} onChange={e=>setDataTransacao(e.target.value)} required />
          </label>
          <label className="col-span-2">
            Observação
            <textarea rows={3} value={observacao} onChange={e=>setObservacao(e.target.value)} />
          </label>

          <div className="modal-actions col-span-2">
            <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary" disabled={loading}>{loading ? 'Salvando…' : 'Confirmar Baixa'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
