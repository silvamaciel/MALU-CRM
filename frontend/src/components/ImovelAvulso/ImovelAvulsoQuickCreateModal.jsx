import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { createImovelApi } from '../api/imovelAvulsoApi';
import { getUsuarios } from '../api/users';

const TIPO_IMOVEL_OPCOES = ['Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Outro'];

export default function ImovelAvulsoQuickCreateModal({ open, onClose, onCreated, defaultCidade = '', defaultUF = '' }) {
  const [loading, setLoading] = useState(false);
  const [responsaveis, setResponsaveis] = useState([]);

  const [form, setForm] = useState({
    titulo: '',
    construtoraNome: '',
    tipoImovel: TIPO_IMOVEL_OPCOES[0],
    preco: '',
    areaTotal: '',
    cidade: defaultCidade,
    uf: defaultUF,
    responsavel: '',
    marcarVendido: true,
  });

  // RESET: toda vez que abrir o modal, zera o formulário (usando os defaults de cidade/UF)
  useEffect(() => {
    if (open) {
      setForm({
        titulo: '',
        construtoraNome: '',
        tipoImovel: TIPO_IMOVEL_OPCOES[0],
        preco: '',
        areaTotal: '',
        cidade: defaultCidade,
        uf: defaultUF,
        responsavel: '',
        marcarVendido: true,
      });
    }
  }, [open, defaultCidade, defaultUF]);

  // Carrega responsáveis quando abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const resp = await getUsuarios({ ativo: true });
        const list = resp?.users || resp?.data || resp || [];
        setResponsaveis(list);
        if (list.length) {
          // define automaticamente o primeiro responsável, se ainda não houver um
          setForm(prev => prev.responsavel ? prev : { ...prev, responsavel: list[0]._id });
        }
      } catch {
        toast.error('Falha ao carregar responsáveis.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]:
        type === 'number' ? (value === '' ? '' : Number(value))
        : type === 'checkbox' ? checked
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.tipoImovel || !form.responsavel) {
      toast.warn('Preencha Título, Tipo e Responsável.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        titulo: form.titulo,
        tipoImovel: form.tipoImovel,
        preco: form.preco || 0,
        areaTotal: form.areaTotal || 0,
        status: form.marcarVendido ? 'Vendido' : 'Disponível',
        endereco: { cidade: form.cidade || '', uf: form.uf || '' },
        responsavel: form.responsavel,
        construtoraNome: form.construtoraNome || '',
        descricao: '',
        fotos: [],
      };

      const created = await createImovelApi(payload);
      toast.success('Imóvel criado!');
      onCreated?.(created); // espera { _id, ... }
      onClose?.();
    } catch (err) {
      toast.error(err?.error || err?.message || 'Falha ao criar imóvel.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="form-modal-overlay" onClick={() => onClose?.()}>
      <div className="form-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <h2>Novo Imóvel Avulso (rápido)</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group full-width">
            <label>Título*</label>
            <input name="titulo" value={form.titulo} onChange={handleChange} required disabled={loading} autoFocus />
          </div>

          <div className="form-group full-width">
            <label>Construtora (opcional)</label>
            <input
              name="construtoraNome"
              value={form.construtoraNome}
              onChange={handleChange}
              placeholder="Ex.: Construtora Exemplo Ltda"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo*</label>
              <select name="tipoImovel" value={form.tipoImovel} onChange={handleChange} disabled={loading}>
                {TIPO_IMOVEL_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Preço (R$)</label>
              <input type="number" name="preco" step="0.01" min="0" value={form.preco} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Área Total (m²)</label>
              <input type="number" name="areaTotal" step="0.01" min="0" value={form.areaTotal} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group">
              <label>UF</label>
              <input name="uf" maxLength={2} value={form.uf} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Responsável*</label>
              <select name="responsavel" value={form.responsavel} onChange={handleChange} required disabled={loading}>
                {responsaveis.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox">
              <input type="checkbox" name="marcarVendido" checked={form.marcarVendido} onChange={handleChange} disabled={loading} />
              Marcar este imóvel como <strong>Vendido</strong> ao salvar
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="button cancel-button" onClick={() => onClose?.()} disabled={loading}>Cancelar</button>
            <button type="submit" className="button submit-button" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
