import React, { useEffect, useMemo, useState } from 'react';
import { getEmpreendimentos } from '../../../api/empreendimentoApi';
import { getLeads } from '../../../api/leads';
import { getParcelasApi } from '../../../api/financeiroApi';

/**
 * Modal simples de metadados pós-seleção de arquivo.
 * Abre apenas quando necessário e carrega listas só quando open=true.
 */
export default function UploadMetaModal({
  open,
  categoria,
  onCancel,
  onConfirm, // (metadata) => void  <- você envia depois com o file pendente
}) {
  const [loading, setLoading] = useState(false);

  // Seleções
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [leads, setLeads] = useState([]);
  const [parcelas, setParcelas] = useState([]);

  const [selectedId, setSelectedId] = useState('');
  const [pasta, setPasta] = useState(''); // subpasta opcional

  // Que categorias pedem metadados?
  const requiresEmp = categoria === 'Materiais Empreendimentos';
  const requiresLead = categoria === 'Documentos Leads';
  const requiresContrato = categoria === 'Contratos';
  const requiresParcela = categoria === 'Recibos';

  // Subpastas por categoria
  const subfolders = useMemo(() => {
    if (requiresEmp) return ['Imagens', 'Plantas'];
    if (requiresLead) return ['Documentos'];
    return [];
  }, [requiresEmp, requiresLead]);

  // Carrega listas apenas quando abre
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        if (requiresEmp) {
          const resp = await getEmpreendimentos(1, 50, {});
          const rows = resp?.data || resp?.empreendimentos || resp?.rows || [];
          if (!cancelled) {
            setEmpreendimentos(rows);
            if (rows[0]?._id) setSelectedId(rows[0]._id);
            setPasta('Imagens');
          }
        }
        if (requiresLead) {
          const resp = await getLeads({ page: 1, limit: 50 });
          const rows = resp?.data || resp?.leads || resp || [];
          if (!cancelled) {
            setLeads(rows);
            if (rows[0]?._id) setSelectedId(rows[0]._id);
            setPasta('Documentos');
          }
        }
        if (requiresParcela) {
          const { data: rows } = await getParcelasApi({ page: 1, limit: 50 });
          if (!cancelled) {
            setParcelas(rows || []);
            if (rows?.[0]?._id) setSelectedId(rows[0]._id);
          }
        }
        if (requiresContrato) {
          // sem fetch; usuário digita o ID
          setSelectedId('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, requiresEmp, requiresLead, requiresParcela, requiresContrato]);

  if (!open) return null;

  const canConfirm = (() => {
    if (requiresEmp || requiresLead || requiresParcela || requiresContrato) {
      return Boolean(selectedId);
    }
    return true;
  })();

  const handleConfirm = () => {
    // Monta metadata no formato esperado pelo backend
    let primaryAssociation;
    if (requiresEmp) primaryAssociation = { kind: 'Empreendimento', item: selectedId };
    if (requiresLead) primaryAssociation = { kind: 'Lead', item: selectedId };
    if (requiresParcela) primaryAssociation = { kind: 'Parcela', item: selectedId };
    if (requiresContrato) primaryAssociation = { kind: 'PropostaContrato', item: selectedId };

    const metadata = {
      categoria,
      ...(primaryAssociation ? { primaryAssociation } : {}),
      ...(subfolders.length ? { pasta } : {}),
    };
    onConfirm(metadata);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="modal-header">
          <h3>Definir metadados</h3>
          <button className="button-link" onClick={onCancel} aria-label="Fechar">×</button>
        </header>

        <div className="modal-body">
          <p style={{ marginTop: 0, color: '#666' }}>
            Categoria: <b>{categoria}</b>
          </p>

          {requiresEmp && (
            <div className="form-group">
              <label>Empreendimento</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loading}
              >
                {empreendimentos.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.nome || e.nomeEmpreendimento || e.titulo || e._id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {requiresLead && (
            <div className="form-group">
              <label>Lead</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loading}
              >
                {leads.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.nome || l.name || l.phone || l._id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {requiresParcela && (
            <div className="form-group">
              <label>Parcela</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loading}
              >
                {parcelas.map((p) => (
                  <option key={p._id} value={p._id}>
                    {(p?.descricao || `Parcela ${p?.numero ?? ''}`) +
                      (p?.valor ? ` — R$ ${Number(p.valor).toLocaleString('pt-BR')}` : '')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {requiresContrato && (
            <div className="form-group">
              <label>ID da Proposta/Contrato</label>
              <input
                type="text"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                placeholder="Ex.: 66e2f9c1b3f5..."
              />
            </div>
          )}

          {subfolders.length > 0 && (
            <div className="form-group">
              <label>Tipo de pasta</label>
              <select value={pasta} onChange={(e) => setPasta(e.target.value)}>
                {subfolders.map((sf) => (
                  <option key={sf} value={sf}>{sf}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="button primary-button" onClick={handleConfirm} disabled={!canConfirm || loading}>
            Confirmar
          </button>
        </footer>
      </div>
    </div>
  );
}
