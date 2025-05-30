// src/pages/PropostaContrato/PropostaContratoDetailPage/PropostaContratoDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPropostaContratoByIdApi, /* updatePropostaContratoStatusApi, exportPropostaContratoPdfApi */ } from '../../../api/propostaContratoApi';
import './PropostaContratoDetailPage.css'; // Crie este CSS

function PropostaContratoDetailPage() {
    const { propostaContratoId } = useParams();
    const navigate = useNavigate();

    const [propostaContrato, setPropostaContrato] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPropostaContrato = useCallback(async () => {
        if (!propostaContratoId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPropostaContratoByIdApi(propostaContratoId);
            setPropostaContrato(data);
        } catch (err) {
            setError(err.message || "Erro ao carregar dados da proposta/contrato.");
            toast.error(err.message || "Erro ao carregar dados da proposta/contrato.");
        } finally {
            setLoading(false);
        }
    }, [propostaContratoId]);

    useEffect(() => {
        fetchPropostaContrato();
    }, [fetchPropostaContrato]);

    // TODO: Handlers para mudar status, baixar PDF, editar

    if (loading) {
        return <div className="admin-page loading"><p>Carregando Proposta/Contrato...</p></div>;
    }
    if (error) {
        return <div className="admin-page error-page"><p className="error-message">{error}</p><Link to="/reservas">Voltar para Reservas</Link></div>;
    }
    if (!propostaContrato) {
        return <div className="admin-page"><p>Proposta/Contrato não encontrada.</p><Link to="/reservas">Voltar para Reservas</Link></div>;
    }

    return (
        <div className="admin-page proposta-contrato-detail-page">
            <header className="page-header">
                <h1>Detalhes da Proposta/Contrato</h1>
                <div>
                    <Link to="/reservas" className="button-link" style={{ marginRight: '10px' }}>
                        Voltar para Reservas
                    </Link>
                    {/* Botões de Ação Futuros */}
                    {/* <button className="button primary-button" style={{marginRight: '10px'}}>Editar</button> */}
                    {/* <button className="button action-button" style={{marginRight: '10px'}}>Baixar PDF</button> */}
                    {/* Dropdown para Mudar Status */}
                </div>
            </header>

            <div className="page-content">
                <div className="info-section">
                    <h3>Informações Gerais</h3>
                    <p><strong>Lead:</strong> {propostaContrato.lead?.nome || 'N/A'}</p>
                    <p><strong>Unidade:</strong> {propostaContrato.unidade?.identificador} (Empreendimento: {propostaContrato.empreendimento?.nome || 'N/A'})</p>
                    <p><strong>Valor da Proposta:</strong> {propostaContrato.valorPropostaContrato?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p><strong>Status:</strong> {propostaContrato.statusPropostaContrato}</p>
                    <p><strong>Data da Proposta:</strong> {propostaContrato.dataProposta ? new Date(propostaContrato.dataProposta).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    <p><strong>Responsável pela Negociação:</strong> {propostaContrato.responsavelNegociacao?.nome || 'N/A'}</p>
                </div>

                <div className="contrato-preview-section">
                    <h3>Conteúdo do Contrato</h3>
                    <div 
                        className="html-preview-container"
                        dangerouslySetInnerHTML={{ __html: propostaContrato.corpoContratoHTMLGerado || '<p>Conteúdo do contrato não disponível.</p>' }}
                    />
                </div>
                {/* TODO: Adicionar mais seções para Plano de Pagamento, Corretagem, etc. */}
            </div>
        </div>
    );
}

export default PropostaContratoDetailPage;