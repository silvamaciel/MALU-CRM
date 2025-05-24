// src/pages/Empreendimento/EmpreendimentoDetailPage/EmpreendimentoDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEmpreendimentoById } from '../../../api/empreendimentoApi'; // Ajuste o caminho se necessário
import { toast } from 'react-toastify';
import './EmpreendimentoDetailPage.css';

function EmpreendimentoDetailPage() {
    const { id: empreendimentoId } = useParams();
    const navigate = useNavigate();
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEmpreendimento = useCallback(async () => {
        if (!empreendimentoId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getEmpreendimentoById(empreendimentoId);
            setEmpreendimento(data); // A API já retorna o objeto 'data' que é o empreendimento
        } catch (err) {
            const errMsg = err.error || err.message || "Erro ao carregar dados do empreendimento.";
            setError(errMsg);
            toast.error(errMsg);
            // Opcional: redirecionar se der 404 ou erro crítico
            if (err.status === 404) navigate('/empreendimentos'); 
        } finally {
            setLoading(false);
        }
    }, [empreendimentoId]);

    useEffect(() => {
        fetchEmpreendimento();
    }, [fetchEmpreendimento]);

    if (loading) {
        return <div className="admin-page loading"><p>Carregando detalhes do empreendimento...</p></div>;
    }

    if (error) {
        return <div className="admin-page error-page">
            <p className="error-message">{error}</p>
            <Link to="/empreendimentos" className="button">Voltar para Lista</Link>
        </div>;
    }

    if (!empreendimento) {
        return <div className="admin-page">
            <p>Empreendimento não encontrado.</p>
            <Link to="/empreendimentos" className="button">Voltar para Lista</Link>
        </div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
            return adjustedDate.toLocaleDateString('pt-BR');
        } catch (e) {
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

            <div className="page-content">
                <div className="details-grid"> {/* Usar grid para melhor layout */}
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
                        <>
                            <div className="detail-item full-span"> {/* Ocupa toda a largura da linha */}
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
                        </>
                    )}

                    {empreendimento.imagemPrincipal?.url && (
                         <div className="detail-item full-span">
                            <strong>Imagem Principal:</strong>
                            <img 
                                src={empreendimento.imagemPrincipal.url} 
                                alt={empreendimento.imagemPrincipal.altText || empreendimento.nome} 
                                style={{ maxWidth: '300px', marginTop: '10px', display: 'block' }} 
                            />
                            {empreendimento.imagemPrincipal.altText && <p><small>{empreendimento.imagemPrincipal.altText}</small></p>}
                        </div>
                    )}

                    {empreendimento.descricao && (
                        <div className="detail-item full-span">
                            <strong>Descrição:</strong>
                            <p style={{whiteSpace: 'pre-wrap'}}>{empreendimento.descricao}</p> {/* pre-wrap para manter quebras de linha */}
                        </div>
                    )}

                    <div className="detail-item">
                        <strong>Total de Unidades (do virtual):</strong>
                        {/* O campo virtual 'totalUnidades' deve vir populado do backend */}
                        <p>{typeof empreendimento.totalUnidades === 'number' ? empreendimento.totalUnidades : 'Calculando...'}</p>
                    </div>
                </div>

                {/* SEÇÃO DE UNIDADES - Será implementada aqui */}
                <div className="unidades-section" style={{marginTop: '30px'}}>
                    <h2>Unidades do Empreendimento</h2>
                    <button 
                        onClick={() => navigate(`/empreendimentos/${empreendimento._id}/unidades/novo`)} 
                        className="button primary-button"
                        style={{marginBottom: '15px'}}
                    >
                        Adicionar Nova Unidade
                    </button>
                    <p><i>A lista de unidades e o CRUD de unidades virão aqui...</i></p>
                    {/* Aqui chamaremos um componente <UnidadeListPage empreendimentoId={empreendimento._id} /> */}
                </div>
            </div>
        </div>
    );
}

export default EmpreendimentoDetailPage;