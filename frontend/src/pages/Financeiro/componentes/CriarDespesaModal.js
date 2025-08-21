import React, { useState } from 'react';
import { criarDespesaApi, listarCredoresApi } from '../../../api/financeiroApi';
import { toast } from 'react-toastify';
import { useEffect } from 'react';

export default function CriarDespesaModal({ open, onClose, onSuccess }) {
  const [descricao, setDescricao] = useState('');
  const [credor, setCredor] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [loading, setLoading] = useState(false);
  const [credores, setCredores] = useState([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await listarCredoresApi();
        setCredores(data || []);
      } catch (e) {
        toast.error('Não foi possível carregar credores.');
      }
    })();
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await criarDespesaApi({ descricao, credor, valor: Number(valor), dataVencimento });
      toast.success('Despesa criada!');
      onSuccess?.();
      onClose();
      setDescricao(''); setCredor(''); setValor(''); setDataVencimento('');
    } catch (err) {
      toast.error(err?.message || 'Falha ao criar despesa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Adicionar Despesa</h3>
        <form onSubmit={handleSubmit} className="form-grid">
          <label className="col-span-2">
            Descrição
            <input value={descricao} onChange={e=>setDescricao(e.target.value)} required />
          </label>
          <label>
            Credor
            <select value={credor} onChange={e=>setCredor(e.target.value)} required>
              <option value="" disabled>Selecione</option>
              {credores.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
            </select>
          </label>
          <label>
            Valor
            <input type="number" step="0.01" value={valor} onChange={e=>setValor(e.target.value)} required />
          </label>
          <label>
            Vencimento
            <input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} required />
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
