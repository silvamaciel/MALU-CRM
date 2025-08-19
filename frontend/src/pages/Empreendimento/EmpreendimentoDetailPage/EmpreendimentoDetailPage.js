import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEmpreendimentoById } from '../../../api/empreendimentoApi';
import { toast } from 'react-toastify';
import UnidadeList from './UnidadeList';
import './EmpreendimentoDetailPage.css';

function EmpreendimentoDetailPage() {
  const { id: empreendimentoId } = useParams();
  const navigate = useNavigate();
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Abas: 'detalhes' | 'unidades'
  const [activeTab, setActiveTab] = useState('detalhes');

  const fetchEmpreendimento = useCallback(async () => {
    if (!empreendimentoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEmpreendimentoById(empreendimentoId);
      setEmpreendimento(data);
    } catch (err) {
      const errMsg = err.error || err.message || 'Erro ao carregar dados do empreendimento.';
      setError(errMsg);
      toast.error(errMsg);
      if (err.status === 404) navigate('/empreendimentos');
    } finally {
      setLoading(false);
    }
  }, [empreendimentoId, navigate]);

  useEffect(() => {
    fetchEmpreendimento();
  }, [fetchEmpreendimento]);

  if (loading) {
    return (
      <div className="admin-page loading">
        <p>Carregando detalhes do empreendimento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page error-page">
        <p className="error-message">{error}</p>
        <Link to="/empreendimentos" className="button">Voltar para Lista</Link>
      </div>
    );
  }

  if (!empreendimento) {
    return (
      <div className="admin-page">
        <p>Empreendimento não encontrado.</p>
        <Link to="/empreendimentos" className="button">Voltar para Lista</Link>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
      return adjustedDate.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="admin-page empreendimento-detail-page">
      <header className="page-header">
        <h1>{empreendimento.nome}</h1>
        <div>
          <Link to="/empreendimentos" className="button-link" style={{ marginRight: '10px' }}>
            Voltar para Lista
          </Link>
          <Link to={`/empreendimentos/${empreendimento._id}/editar`} className="button primary-button">
            Editar Empreendimento
          </Link>
        </div>
      </header>

      {/* Container fixo: quem rola são os painéis/tabela */}
      <div className="page-content">
        {/* Tabs */}
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'detalhes' ? 'is-active' : ''}`}
            aria-selected={activeTab === 'detalhes'}
            onClick={() => setActiveTab('detalhes')}
          >
            Detalhes
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'unidades' ? 'is-active' : ''}`}
            aria-selected={activeTab === 'unidades'}
            onClick={() => setActiveTab('unidades')}
          >
            Unidades
          </button>
        </div>

        {/* Painéis */}
        <div className="panels">
          {/* Painel: DETALHES (scroll interno) */}
          <section className={`panel ${activeTab === 'detalhes' ? 'is-visible' : 'is-hidden'}`} aria-labelledby="tab-detalhes">
            <div className="panel-scroll">
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Construtora/Incorporadora:</strong>
                  <p>{empreendimento.construtoraIncorporadora || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <strong>Tipo:</strong>
                  <p>{empreendimento.tipo}</p>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <p>{empreendimento.statusEmpreendimento}</p>
                </div>
                <div className="detail-item">
                  <strong>Data Prevista de Entrega:</strong>
                  <p>{formatDate(empreendimento.dataPrevistaEntrega)}</p>
                </div>

                {empreendimento.localizacao && (
                  <div className="detail-item full-span">
                    <strong>Localização:</strong>
                    <p>
                      {empreendimento.localizacao.logradouro || ''}
                      {empreendimento.localizacao.numero && `, ${empreendimento.localizacao.numero}`}
                      {empreendimento.localizacao.bairro && ` - ${empreendimento.localizacao.bairro}`}
                      <br />
                      {empreendimento.localizacao.cidade || ''} / {empreendimento.localizacao.uf || ''}
                      {empreendimento.localizacao.cep && ` - CEP: ${empreendimento.localizacao.cep}`}
                    </p>
                    {(empreendimento.localizacao.latitude && empreendimento.localizacao.longitude) && (
                      <p><small>Lat: {empreendimento.localizacao.latitude}, Long: {empreendimento.localizacao.longitude}</small></p>
                    )}
                  </div>
                )}

                {empreendimento.imagemPrincipal?.url && (
                  <div className="detail-item full-span">
                    <strong>Imagem Principal:</strong>
                    <img
                      src={empreendimento.imagemPrincipal.url}
                      alt={empreendimento.imagemPrincipal.altText || empreendimento.nome}
                    />
                    {empreendimento.imagemPrincipal.altText && <p><small>{empreendimento.imagemPrincipal.altText}</small></p>}
                  </div>
                )}

                {empreendimento.descricao && (
                  <div className="detail-item full-span">
                    <strong>Descrição:</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{empreendimento.descricao}</p>
                  </div>
                )}

                <div className="detail-item">
                  <strong>Total de Unidades (do virtual):</strong>
                  <p>{typeof empreendimento.totalUnidades === 'number' ? empreendimento.totalUnidades : 'Calculando...'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Painel: UNIDADES (scroll apenas na tabela) */}
          <section className={`panel ${activeTab === 'unidades' ? 'is-visible' : 'is-hidden'}`} aria-labelledby="tab-unidades">
            <div className="unidades-section">
              <div className="units-table-scroll">
                <UnidadeList
                  empreendimentoId={empreendimento._id}
                  empreendimentoNome={empreendimento.nome}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default EmpreendimentoDetailPage;
