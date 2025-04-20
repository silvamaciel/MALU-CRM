// src/pages/LeadDetail/LeadDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
// Hooks e componentes de roteamento
import { useParams, Link, useNavigate } from 'react-router-dom';
// Funções da API (incluindo deleteLead)
import { getLeadById, discardLead, updateLead, deleteLead } from '../../api/leads';
import { getSituacoes } from '../../api/situacoes';
// Componentes de Modal
import DiscardLeadModal from '../../components/DiscardLeadModal/DiscardLeadModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'; // Importar ConfirmModal
// Estilos da página
import './LeadDetailPage.css';
// Biblioteca opcional para notificações
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// Função auxiliar para formatar data
const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    try {
        // Formato mais completo incluindo hora
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return 'Data inválida';
    }
};

function LeadDetailPage() {
  // Hooks
  const { id } = useParams();
  const navigate = useNavigate();

  // State do lead
  const [leadDetails, setLeadDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Erro ao carregar dados

  // State das Situações (para reativar)
  const [situacoesList, setSituacoesList] = useState([]);

  // State do Modal de Descarte
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);

  // State para Reativação
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateError, setReactivateError] = useState(null);

  // State para Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Função para buscar Lead e Situações
  const fetchData = useCallback(async () => {
    if (!id) {
      setError("ID do lead inválido.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null); // Limpa erros gerais
    setReactivateError(null); // Limpa erro de reativação
    setDiscardError(null); // Limpa erro de descarte (embora seja no modal)
    setDeleteError(null); // Limpa erro de exclusão (embora seja no modal)

    try {
      const [leadData, situacoesData] = await Promise.all([
        getLeadById(id),
        getSituacoes()
      ]);
      setLeadDetails(leadData);
      setSituacoesList(situacoesData || []);
    } catch (err) {
      console.error(`Erro ao buscar dados para lead ${id}:`, err);
      setError(err.message || 'Falha ao carregar dados.');
      setLeadDetails(null);
      setSituacoesList([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Busca inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers Modal Descarte ---
  const handleOpenDiscardModal = () => {
      if (!leadDetails) return;
      setDiscardError(null);
      setIsDiscardModalOpen(true);
  };
  const handleCloseDiscardModal = () => {
      if (!isDiscarding) {
          setIsDiscardModalOpen(false);
          setDiscardError(null);
      }
  };
  const handleConfirmDiscard = async (discardData) => {
    if (!leadDetails) return;
    setIsDiscarding(true);
    setDiscardError(null);
    try {
      await discardLead(leadDetails._id, discardData);
      handleCloseDiscardModal();
      console.log(`Lead "${leadDetails.nome}" descartado. Redirecionando...`);
      // toast.success(`Lead "${leadDetails.nome}" descartado! Redirecionando...`);
      setTimeout(() => { navigate('/leads'); }, 1000); // Navega para lista após descarte
    } catch (err) {
      console.error("Erro ao confirmar descarte:", err);
      setDiscardError(err.message || "Falha ao descartar.");
    } finally {
      setIsDiscarding(false);
    }
   };
  // --- Fim Handlers Modal Descarte ---

  // --- Handler Reativar Lead ---
  const handleReactivateLead = async () => {
    if (!leadDetails || isReactivating || !situacoesList.length) return;
    const situacaoAtendimento = situacoesList.find(s => s.nome === "Em Atendimento");
    if (!situacaoAtendimento) {
        const errorMsg = "Erro: Status 'Em Atendimento' não encontrado.";
        console.error(errorMsg);
        setReactivateError(errorMsg);
        return;
    }
    setIsReactivating(true);
    setReactivateError(null);
    try {
      await updateLead(leadDetails._id, { situacao: situacaoAtendimento._id });
      console.log(`Lead "${leadDetails.nome}" reativado.`);
      // toast.success(`Lead "${leadDetails.nome}" reativado!`);
      fetchData(); // Recarrega dados da página
    } catch (err) {
      console.error("Erro ao reativar lead:", err);
      setReactivateError(err.message || "Falha ao reativar.");
    } finally {
      setIsReactivating(false);
    }
  };
  // --- Fim Handler Reativar ---

  // --- Handlers Modal Exclusão ---
  const handleOpenDeleteModal = () => {
    if (!leadDetails) return;
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setDeleteError(null);
    }
  };
  const handleConfirmDelete = async () => {
    if (!leadDetails) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLead(leadDetails._id);
      handleCloseDeleteModal();
      console.log(`Lead "${leadDetails.nome}" excluído.`);
      // toast.success(`Lead "${leadDetails.nome}" excluído permanentemente!`);
      navigate('/leads'); // Navega para lista após excluir
    } catch (err) {
      console.error("Erro ao confirmar exclusão:", err);
      setDeleteError(err.message || "Falha ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };
  // --- Fim Handlers Modal Exclusão ---


  // --- Renderização Condicional Loading/Error ---
  if (isLoading) {
    return <div className="lead-detail-page loading">Carregando detalhes do lead...</div>;
  }
  if (error && !leadDetails) {
    return (
      <div className="lead-detail-page error-page">
        <h2>Erro ao Carregar Lead</h2>
        <p className="error-message">{error}</p>
        <Link to="/leads" className="button back-button">Voltar para a Lista</Link>
      </div>
    );
  }
  if (!leadDetails) {
    return <div className="lead-detail-page error-page">Lead não encontrado ou dados indisponíveis.</div>;
  }
  // --- Fim Renderização Condicional ---

  // --- Preparação de Dados para Exibição ---
  const situacaoNome = leadDetails.situacao?.nome || 'N/A';
  const origemNome = leadDetails.origem?.nome || 'N/A';
  const responsavelNome = leadDetails.responsavel?.nome || 'N/A';
  const responsavelPerfil = leadDetails.responsavel?.perfil || 'N/A';
  const isCurrentlyDiscarded = situacaoNome === "Descartado"; // Verifica se está descartado


  // --- Renderização Principal ---
  return (
    <div className="lead-detail-page">
      {/* <ToastContainer position="top-right" autoClose={3000} /> */}

      {/* Cabeçalho */}
      <div className="detail-header">
          <h1>Detalhes do Lead: {leadDetails.nome}</h1>
          <div className="header-actions">
             {/* Botão Voltar */}
             <Link to="/leads" className="button back-button">Voltar</Link>

             {/* Botão Editar (opcionalmente oculto se descartado) */}
             {!isCurrentlyDiscarded && (
                 <Link to={`/leads/${leadDetails._id}/editar`} className="button edit-button">Editar</Link>
             )}

             {/* Botão Descartar OU Reativar */}
             {isCurrentlyDiscarded ? (
                 <button onClick={handleReactivateLead} className="button reactivate-button" disabled={isReactivating}>
                     {isReactivating ? 'Reativando...' : 'Reativar Lead'}
                 </button>
             ) : (
                 <button onClick={handleOpenDiscardModal} className="button discard-button-detail">
                     Descartar Lead
                 </button>
             )}

             {/* Botão Excluir */}
             <button onClick={handleOpenDeleteModal} className="button delete-button-detail">
                Excluir
             </button>
          </div>
      </div>

      {/* Mensagem de erro de reativação */}
      {reactivateError && <p className="error-message reactivation-error">{reactivateError}</p>}

       {/* Grid de Detalhes */}
        <div className="detail-grid">
          {/* Nome */}
          <div className="detail-item">
            <span className="detail-label">Nome Completo:</span>
            <span className="detail-value">{leadDetails.nome}</span>
          </div>
           {/* Email */}
          <div className="detail-item">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{leadDetails.email}</span>
          </div>
          {/* Contato */}
          <div className="detail-item">
            <span className="detail-label">Contato:</span>
            <span className="detail-value">{leadDetails.contato || 'Não informado'}</span>
          </div>
          {/* CPF */}
          <div className="detail-item">
            <span className="detail-label">CPF:</span>
            <span className="detail-value">{leadDetails.cpf || 'Não informado'}</span>
          </div>
          {/* Nascimento */}
          <div className="detail-item">
            <span className="detail-label">Data de Nascimento:</span>
            <span className="detail-value">{formatDate(leadDetails.nascimento)}</span>
          </div>
          {/* Endereço */}
          <div className="detail-item">
            <span className="detail-label">Endereço:</span>
            <span className="detail-value">{leadDetails.endereco || 'Não informado'}</span>
          </div>
          {/* Situação */}
          <div className="detail-item">
            <span className="detail-label">Situação Atual:</span>
            <span className="detail-value">{situacaoNome}</span>
          </div>
          {/* Origem */}
          <div className="detail-item">
            <span className="detail-label">Origem:</span>
            <span className="detail-value">{origemNome}</span>
          </div>
          {/* Responsável */}
          <div className="detail-item">
            <span className="detail-label">Responsável:</span>
            <span className="detail-value">{responsavelNome} ({responsavelPerfil})</span>
          </div>
          {/* Criação */}
          <div className="detail-item">
            <span className="detail-label">Data de Criação:</span>
            <span className="detail-value">{formatDate(leadDetails.createdAt)}</span>
          </div>
          {/* Atualização */}
           <div className="detail-item">
            <span className="detail-label">Última Atualização:</span>
            <span className="detail-value">{formatDate(leadDetails.updatedAt)}</span>
          </div>
           {/* Motivo Descarte (Condicional) */}
           {leadDetails.motivoDescarte && (
               <div className="detail-item discard-info">
                 <span className="detail-label">Motivo do Descarte:</span>
                 <span className="detail-value">{leadDetails.motivoDescarte}</span>
               </div>
           )}
           {/* Comentário */}
           <div className="detail-item comentario">
               <span className="detail-label">Comentário:</span>
               <span className="detail-value comentario-value">{leadDetails.comentario || 'Nenhum comentário.'}</span>
           </div>
        </div>

      {/* Modal de Descarte */}
      <DiscardLeadModal
        isOpen={isDiscardModalOpen}
        onClose={handleCloseDiscardModal}
        onSubmit={handleConfirmDiscard}
        leadName={leadDetails?.nome}
        isProcessing={isDiscarding}
        errorMessage={discardError}
      />

      {/* Modal de Exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão Permanente"
        message={`Tem certeza que deseja excluir permanentemente o lead "${leadDetails?.nome || ''}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete" // Botão vermelho
        isProcessing={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}

export default LeadDetailPage;