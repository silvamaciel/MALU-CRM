// src/pages/PropostaContrato/PropostaContratoDetailPage/PropostaContratoDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
     getPropostaContratoByIdApi, 
     downloadPropostaContratoPdfApi,
     updatePropostaContratoApi,
     updatePropostaContratoStatusApi
     } from '../../../api/propostaContratoApi';

import './PropostaContratoDetailPage.css'; // Crie este CSS
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal';
import DiscardLeadModal from '../../../components/DiscardLeadModal/DiscardLeadModal';
import { getDiscardReasons } from '../../../api/discardReasons';


const STATUS_PROPOSTA_OPCOES = [
  "Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", 
  "Assinado", "Vendido", "Recusado", "Cancelado"
];

function PropostaContratoDetailPage() {
    const { propostaContratoId } = useParams();
    const navigate = useNavigate();

    const [propostaContrato, setPropostaContrato] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false); 
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [confirmStatusModal, setConfirmStatusModal] = useState({ isOpen: false, novoStatus: '', title: '', message: '' });

    const [isDistratoModalOpen, setIsDistratoModalOpen] = useState(false);
    const [motivosDescarte, setMotivosDescarte] = useState([]);
    const [isProcessingDistrato, setIsProcessingDistrato] = useState(false);
    const [distratoError, setDistratoError] = useState('');



    const fetchPropostaContrato = useCallback(async () => { 
    if (!propostaContratoId) return;
    setLoading(true);
    setError(null);
    try {
        const data = await getPropostaContratoByIdApi(propostaContratoId);
        setPropostaContrato(data);
    } catch (err) {
        const errorMsg = err.message || "Erro ao carregar dados da proposta/contrato.";
        setError(errorMsg);
        toast.error(errorMsg);
    } finally {
        setLoading(false);
    }
    }, [propostaContratoId]);

    useEffect(() => {
        fetchPropostaContrato();
    }, [fetchPropostaContrato]);
    //Handler para Baixar Pdf
    const handleDownloadPdf = async () => {
        if (!propostaContrato || !propostaContrato._id) return;

        setIsDownloadingPdf(true);
        toast.info("Gerando PDF, por favor aguarde...");
        try {
            const pdfBlob = await downloadPropostaContratoPdfApi(propostaContrato._id);

            // Cria um link temporário para o download
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            // Define o nome do arquivo
            const leadName = propostaContrato.lead?.nome?.replace(/\s+/g, '_') || 'Lead';
            const unidadeId = propostaContrato.unidade?.identificador?.replace(/\s+/g, '_') || propostaContrato.unidade?._id;
            link.setAttribute('download', `Proposta_${leadName}_Unidade_${unidadeId}.pdf`);

            document.body.appendChild(link);
            link.click(); // Simula o clique para iniciar o download

            link.parentNode.removeChild(link); // Remove o link temporário
            window.URL.revokeObjectURL(url); // Libera o objeto URL

            toast.success("Download do PDF iniciado!");

        } catch (err) {
            const errorMsg = err.error || err.message || "Falha ao gerar ou baixar o PDF.";
            toast.error(errorMsg);
            console.error("Erro no download do PDF:", err);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleChangeStatus = async (novoStatus) => {
        if (!propostaContrato || isUpdatingStatus || propostaContrato.statusPropostaContrato === novoStatus) return;

        setConfirmStatusModal({
            isOpen: true,
            novoStatus: novoStatus,
            title: `Confirmar Mudança de Status para "${novoStatus}"`,
            message: `Você tem certeza que deseja alterar o status desta proposta/contrato para "${novoStatus}"? Esta ação pode atualizar o status do Lead e da Unidade associados.`
        });
    };

    const handleConfirmStatusChange = async () => {
        const { novoStatus } = confirmStatusModal;
        if (!propostaContrato || !novoStatus) return;

        setIsUpdatingStatus(true);
        toast.info(`Atualizando status para ${novoStatus}...`);
        let dadosAdicionais = {};

        // Coletar dados adicionais se necessário para certos status
        if (novoStatus === "Assinado") {
            const dataAssinatura = prompt("Digite a data da assinatura (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
            if (!dataAssinatura) { // Usuário cancelou o prompt
                setIsUpdatingStatus(false);
                setConfirmStatusModal({ isOpen: false, novoStatus: '', title: '', message: '' });
                return;
            }
            dadosAdicionais.dataAssinaturaCliente = dataAssinatura;
        } else if (novoStatus === "Vendido") {
            const dataVenda = prompt("Digite a data da venda efetivada (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
             if (!dataVenda) {
                setIsUpdatingStatus(false);
                setConfirmStatusModal({ isOpen: false, novoStatus: '', title: '', message: '' });
                return;
            }
            dadosAdicionais.dataVendaEfetivada = dataVenda;
        }

        try {
            await updatePropostaContratoStatusApi(propostaContrato._id, novoStatus, dadosAdicionais);
            toast.success(`Status da Proposta/Contrato atualizado para "${novoStatus}"!`);
            fetchPropostaContrato(true); // Re-busca os dados para atualizar a UI e mostrar o toast de sucesso do fetch
        } catch (err) {
            toast.error(err.message || "Falha ao atualizar status.");
        } finally {
            setIsUpdatingStatus(false);
            setConfirmStatusModal({ isOpen: false, novoStatus: '', title: '', message: '' });
        }
    };

    useEffect(() => {
        const fetchMotivos = async () => {
                try {
                    const data = await getDiscardReasons(); // Assume que busca para a company correta ou são globais
                    setMotivosDescarte(data || []);
                } catch (error) {
                    console.error("Erro ao buscar motivos de descarte:", error);
                    toast.error("Falha ao carregar motivos de descarte.");
                }
            };
        fetchMotivos();
        }, []);


        const handleOpenDistratoModal = () => {
            if (!propostaContrato || propostaContrato.statusPropostaContrato !== "Vendido") {
                toast.warn('Apenas propostas/contratos com status "Vendido" podem ser distratadas.');
                return;
            }
            setDistratoError(''); // Limpa erros anteriores do modal
            setIsDistratoModalOpen(true);
        };

        const handleCloseDistratoModal = () => {
            setIsDistratoModalOpen(false);
            setDistratoError('');
        };

        const handleConfirmDistrato = async (discardData) => { // discardData virá do modal: { motivoDescarteId, comentario }
            if (!propostaContrato) return;

            setIsProcessingDistrato(true);
            setDistratoError('');
            toast.info("Registrando distrato...");

            // O comentário do modal pode ser ADICIONADO ao motivo principal
            const motivoPrincipal = discardData.motivoTexto || "Distrato solicitado pelo cliente"; // Pega o texto do motivo selecionado
            const comentarioFinalDistrato = `${motivoPrincipal}${discardData.comentario ? '\nObservações Adicionais: ' + discardData.comentario : ''}`;

            const dadosParaBackend = {
                novoStatus: "Distrato Realizado", // Status final da PropostaContrato
                motivoDistrato: comentarioFinalDistrato, // O motivo + comentário para PropostaContrato.motivoDistrato
                dataDistrato: new Date().toISOString().split('T')[0], // Data atual
                // Backend também precisará do motivoDescarteId para o Lead
                leadMotivoDescarteId: discardData.motivoDescarteId 
            };

            try {
                // A API updatePropostaContratoStatusApi precisa ser capaz de receber e passar leadMotivoDescarteId para o serviço
                await updatePropostaContratoStatusApi(propostaContrato._id, "Distrato Realizado", dadosParaBackend);
                toast.success("Distrato registrado com sucesso!");
                handleCloseDistratoModal();
                fetchPropostaContrato(true); // Atualiza os dados da proposta na página
            } catch (err) {
                const errorMsg = err.error || err.message || "Falha ao registrar distrato.";
                setDistratoError(errorMsg); // Mostra erro no modal
                toast.error(errorMsg);
            } finally {
                setIsProcessingDistrato(false);
            }
        };


    if (loading) {
        return <div className="admin-page loading"><p>Carregando Proposta/Contrato...</p></div>;
    }
    if (error) {
        return <div className="admin-page error-page"><p className="error-message">{error}</p><Link to="/reservas">Voltar para Reservas</Link></div>;
    }
    if (!propostaContrato) {
        return <div className="admin-page"><p>Proposta/Contrato não encontrada.</p><Link to="/reservas">Voltar para Reservas</Link></div>;
    }

     // Lógica para definir quais botões de status mostrar
    // Baseado no status atual, quais são as próximas ações válidas?
    let acoesDeStatusPermitidas = [];
    const statusAtual = propostaContrato.statusPropostaContrato;

    if (statusAtual === "Em Elaboração") {
        acoesDeStatusPermitidas = ["Aguardando Aprovações", "Aguardando Assinatura Cliente", "Cancelado"];
    } else if (statusAtual === "Aguardando Aprovações") {
        acoesDeStatusPermitidas = ["Aguardando Assinatura Cliente", "Recusado", "Cancelado"];
    } else if (statusAtual === "Aguardando Assinatura Cliente") {
        acoesDeStatusPermitidas = ["Assinado", "Recusado", "Cancelado"];
    } else if (statusAtual === "Assinado") {
        acoesDeStatusPermitidas = ["Vendido", "Cancelado"];
    }



    return (
        <div className="admin-page proposta-contrato-detail-page">
            <header className="page-header">
                <h1>Detalhes da Proposta/Contrato</h1>
                <div>
                    <Link to="/reservas" className="button-link" style={{ marginRight: '10px' }}>
                        Voltar para Reservas
                    </Link>

                    <Link 
                        to={`/propostas-contratos/${propostaContrato._id}/editar`}
                        className="button primary-button"
                        style={{marginRight: '10px'}}
                        // Desabilitar se status não permitir edição
                        // disabled={!["Em Elaboração", "Aguardando Aprovações"].includes(propostaContrato.statusPropostaContrato)}
                        >   
                        Editar Proposta/Contrato
                    </Link>

                    {/* Botão para baixar PDF */}
                    <button 
                        onClick={handleDownloadPdf}
                        className="button action-button"
                        disabled={isDownloadingPdf}
                        style={{marginRight: '10px'}}
                    >
                        {isDownloadingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                    </button>

                    {/* Botões de Ação Futuros */}
                    {/* <button className="button primary-button" style={{marginRight: '10px'}}>Editar</button> */}
                    {/* <button className="button action-button" style={{marginRight: '10px'}}>Baixar PDF</button> */}
                    {/* Dropdown para Mudar Status */}
                </div>
            </header>

            {/* SEÇÃO DE STATUS ATUAL E AÇÕES DE MUDANÇA DE STATUS VVVVV */}
            <div className="status-actions-section" style={{ padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '6px', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Situação Atual: <span className={`status-badge status-${String(statusAtual).toLowerCase().replace(/\s+/g, '-')}`}>{statusAtual}</span></h3>
                {propostaContrato.statusPropostaContrato === "Vendido" && (
                    <button
                        onClick={handleOpenDistratoModal}
                        className="button خطر-button small-button" // Ou um estilo apropriado
                        disabled={isProcessingDistrato || isUpdatingStatus} // Use um estado de loading apropriado
                    >
                        Registrar Distrato
                    </button>
                )}
                <div className="status-buttons-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {acoesDeStatusPermitidas.map(status => (
                        <button
                            key={status}
                            onClick={() => handleChangeStatus(status)}
                            className="button small-button action-button"
                            disabled={isUpdatingStatus}
                        >
                            Mover para: {status}
                        </button>
                    ))}
                </div>
                {isUpdatingStatus && <p style={{marginTop: '10px', fontStyle: 'italic'}}>Atualizando status...</p>}
            </div>

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

                <ConfirmModal
                isOpen={confirmStatusModal.isOpen}
                onClose={() => setConfirmStatusModal({ isOpen: false, novoStatus: '', title: '', message: '' })}
                onConfirm={handleConfirmStatusChange}
                title={confirmStatusModal.title}
                message={confirmStatusModal.message}
                confirmText="Sim, Confirmar"
                isProcessing={isUpdatingStatus}
                />
                <DiscardLeadModal
                isOpen={isDistratoModalOpen}
                onClose={handleCloseDistratoModal}
                onSubmit={handleConfirmDistrato} // Este handler agora faz mais do que só descartar
                leadName={`Proposta/Contrato para: ${propostaContrato?.lead?.nome || 'Lead Desconhecido'}`}
                isProcessing={isProcessingDistrato}
                errorMessage={distratoError}
                discardReasons={motivosDescarte} 
                initialComment={`Distrato referente à unidade ${propostaContrato?.unidade?.identificador} do empreendimento ${propostaContrato?.empreendimento?.nome}.`}
                />

                
                {/* TODO: Adicionar mais seções para Plano de Pagamento, Corretagem, etc. */}
            </div>
        </div>
    );
}

export default PropostaContratoDetailPage;