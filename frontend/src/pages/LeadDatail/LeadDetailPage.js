// src/pages/LeadDetail/LeadDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// API Functions
import { getLeadById, discardLead, updateLead, deleteLead, getLeadHistory } from '../../api/leads';
import { getSituacoes } from '../../api/situacoes';
// Modal Components
import DiscardLeadModal from '../../components/DiscardLeadModal/DiscardLeadModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
// Styles
import './LeadDetailPage.css';
// Toast Notifications
import { toast } from 'react-toastify';
// O <ToastContainer /> deve estar no App.js

// --- Função Auxiliar formatDate ---
const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    try {
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) { console.error("Erro ao formatar data:", e); return 'Data inválida'; }
};
// -----------------------------

function LeadDetailPage() { // <<< INÍCIO DO COMPONENTE
  // --- Hooks ---
  const { id } = useParams();
  const navigate = useNavigate();

  // --- States ---
  const [leadDetails, setLeadDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [situacoesList, setSituacoesList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateError, setReactivateError] = useState(null); // State para erro de reativação (exibição)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null); // Guarda o lead a ser deletado para msg
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!id) { setError("ID inválido."); setIsLoading(false); return; }
    setIsLoading(true); setIsLoadingHistory(true); setError(null);
    setHistoryError(null); setReactivateError(null);
    try {
      const [leadData, situacoesData, historyData] = await Promise.all([
        getLeadById(id), getSituacoes(), getLeadHistory(id)
      ]);
      setLeadDetails(leadData);
      setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
      setHistoryList(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
        console.error(`Erro ao buscar dados para lead ${id}:`, err);
        // Define um erro geral se algo falhar ao carregar dados principais
        const errorMessage = err.message || 'Falha ao carregar dados.';
        setError(errorMessage); // Define o erro principal da página
    
        // Define erros específicos para partes que podem ter falhado
        setHistoryError("Falha ao carregar histórico."); // Assume que histórico pode ter falhado
    
        // Limpa os dados para evitar mostrar informações inconsistentes
        setLeadDetails(null);
        setSituacoesList([]);
        setHistoryList([]);
    } finally {
        setIsLoading(false);
        setIsLoadingHistory(false);
    }
  }, [id]);

  // --- Effects ---
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]); // Roda ao montar e ao forçar refresh


  // --- Handlers (Todos definidos DENTRO do componente) ---
  const forceRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);

  // Handlers Descarte
  const handleOpenDiscardModal = useCallback(() => {
      if (!leadDetails) return;
      setDiscardError(null);
      setIsDiscardModalOpen(true);
  }, [leadDetails]); // Depende de leadDetails para pegar nome

  const handleCloseDiscardModal = useCallback(() => {
      if (!isDiscarding) {
          setIsDiscardModalOpen(false);
          setDiscardError(null);
      }
  }, [isDiscarding]);

  const handleConfirmDiscard = useCallback(async (discardData) => {
      if (!leadDetails) return;
      setIsDiscarding(true); setDiscardError(null);
      try {
          await discardLead(leadDetails._id, discardData);
          toast.success(`Lead "${leadDetails.nome}" descartado!`);
          handleCloseDiscardModal();
          forceRefresh(); // Atualiza a página de detalhes para mostrar novo status/motivo
      } catch (err) {
          const errorMsg = err.message || "Falha ao descartar."; console.error(err);
          setDiscardError(errorMsg); toast.error(errorMsg);
      } finally { setIsDiscarding(false); }
  }, [leadDetails, handleCloseDiscardModal, forceRefresh]); // Dependências corretas

  // Handler Reativar
  const handleReactivateLead = useCallback(async () => {
      if (!leadDetails || isReactivating || !situacoesList.length) return;
      const situacaoAtendimento = situacoesList.find(s => s.nome === "Em Atendimento"); // Nome Exato!
      if (!situacaoAtendimento) {
          const errorMsg = "Erro: Status 'Em Atendimento' não encontrado.";
          console.error(errorMsg); toast.error(errorMsg);
          setReactivateError(errorMsg); // Define erro para exibição na UI
          return;
      }
      setIsReactivating(true); setReactivateError(null); // Limpa erro anterior
      try {
          const leadReativado = await updateLead(leadDetails._id, { situacao: situacaoAtendimento._id });
          toast.success(`Lead "${leadReativado?.nome || id}" reativado!`);
          forceRefresh(); // Atualiza a página
      } catch (err) {
          const errorMsg = err.message || "Falha ao reativar.";
          console.error("Erro ao reativar lead:", err);
          setReactivateError(errorMsg); // Define erro para exibição na UI
          toast.error(errorMsg);
      } finally { setIsReactivating(false); }
  }, [leadDetails, isReactivating, situacoesList, id, forceRefresh]); // Adicionadas dependências

  // Handlers Exclusão
  const handleOpenDeleteModal = useCallback(() => {
      if (!leadDetails) return;
      setDeleteTargetLead(leadDetails); // Guarda lead para usar nome no modal
      setDeleteError(null);
      setIsDeleteModalOpen(true);
  }, [leadDetails]);

  const handleCloseDeleteModal = useCallback(() => {
      if (!isDeleting) {
          setDeleteTargetLead(null);
          setIsDeleteModalOpen(false);
          setDeleteError(null);
      }
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
      if (!deleteTargetLead) return;
      setIsDeleting(true); setDeleteError(null);
      try {
          await deleteLead(deleteTargetLead._id);
          toast.success(`Lead "${deleteTargetLead.nome}" excluído!`);
          handleCloseDeleteModal();
          navigate('/leads'); // Navega para lista após excluir
      } catch (err) {
          const errorMsg = err.message || "Falha ao excluir."; console.error(err);
          setDeleteError(errorMsg); toast.error(errorMsg);
          // Erro também é passado para o modal
      } finally { setIsDeleting(false); }
  }, [deleteTargetLead, handleCloseDeleteModal, navigate]);
  // --- Fim Handlers ---


  // --- Renderização Condicional Loading/Error ---
  if (isLoading && !leadDetails) { return <div className="lead-detail-page loading">Carregando...</div>; }
  if (error && !leadDetails) { return <div className="lead-detail-page error-page"><h2>Erro</h2><p className="error-message">{error}</p><Link to="/leads" className="button back-button">Voltar</Link></div>; }
  if (!leadDetails) { return <div className="lead-detail-page error-page">Lead não encontrado.</div>; }

  // --- Preparação de Dados para Exibição ---
  const situacaoNome = leadDetails.situacao?.nome || 'N/A';
  const origemNome = leadDetails.origem?.nome || 'N/A';
  const responsavelNome = leadDetails.responsavel?.nome || 'N/A';
  const responsavelPerfil = leadDetails.responsavel?.perfil || 'N/A';
  const isCurrentlyDiscarded = situacaoNome === "Descartado";


  // --- Renderização Principal ---
  return (
    <div className="lead-detail-page">
      {/* O ToastContainer fica no App.js */}

      {/* Cabeçalho com Ações */}
      <div className="detail-header">
        <h1>Detalhes do Lead: {leadDetails.nome}</h1>
        <div className="header-actions">
           <Link to="/leads" className="button back-button">Voltar</Link>
           {!isCurrentlyDiscarded && ( <Link to={`/leads/${id}/editar`} className="button edit-button">Editar</Link> )}
           {isCurrentlyDiscarded ? (
               <button onClick={handleReactivateLead} className="button reactivate-button" disabled={isReactivating}>
                   {isReactivating ? 'Reativando...' : 'Reativar Lead'}
               </button>
            ) : (
               <button onClick={handleOpenDiscardModal} className="button discard-button-detail">
                   Descartar Lead
               </button>
            )}
           <button onClick={handleOpenDeleteModal} className="button delete-button-detail">
              Excluir
           </button>
        </div>
      </div>
      {/* Exibe erro de reativação logo abaixo do header */}
      {reactivateError && <p className="error-message reactivation-error">{reactivateError}</p>}


      {/* Layout com Grid para Detalhes e Histórico */}
      <div className="detail-layout-grid">

          {/* Coluna 1: Detalhes do Lead */}
          <div className="lead-details-column">
              <h2>Informações do Lead</h2>
              <div className="detail-grid">
                {/* Nome */}
                <div className="detail-item"><span className="detail-label">Nome:</span><span className="detail-value">{leadDetails.nome}</span></div>
                {/* Email */}
                <div className="detail-item"><span className="detail-label">Email:</span><span className="detail-value">{leadDetails.email}</span></div>
                {/* Contato */}
                <div className="detail-item"><span className="detail-label">Contato:</span><span className="detail-value">{leadDetails.contato || 'N/I'}</span></div>
                {/* CPF */}
                <div className="detail-item"><span className="detail-label">CPF:</span><span className="detail-value">{leadDetails.cpf || 'N/I'}</span></div>
                {/* Nascimento */}
                <div className="detail-item"><span className="detail-label">Nascimento:</span><span className="detail-value">{formatDate(leadDetails.nascimento)}</span></div>
                {/* Endereço */}
                <div className="detail-item"><span className="detail-label">Endereço:</span><span className="detail-value">{leadDetails.endereco || 'N/I'}</span></div>
                {/* Situação */}
                <div className="detail-item"><span className="detail-label">Situação:</span><span className="detail-value">{situacaoNome}</span></div>
                {/* Origem */}
                <div className="detail-item"><span className="detail-label">Origem:</span><span className="detail-value">{origemNome}</span></div>
                {/* Responsável */}
                <div className="detail-item"><span className="detail-label">Responsável:</span><span className="detail-value">{responsavelNome} ({responsavelPerfil})</span></div>
                {/* Criação */}
                <div className="detail-item"><span className="detail-label">Criação:</span><span className="detail-value">{formatDate(leadDetails.createdAt)}</span></div>
                {/* Atualização */}
                <div className="detail-item"><span className="detail-label">Atualização:</span><span className="detail-value">{formatDate(leadDetails.updatedAt)}</span></div>
                {/* Motivo Descarte (Condicional) */}
                {leadDetails.motivoDescarte && (
                    <div className="detail-item discard-info">
                      <span className="detail-label">Motivo Descarte:</span>
                      <span className="detail-value">{leadDetails.motivoDescarte?.nome || '(Erro ao carregar nome)'}</span>
                    </div>
                )}
                {/* Comentário */}
                <div className="detail-item comentario">
                    <span className="detail-label">Comentário:</span>
                    <span className="detail-value comentario-value">{leadDetails.comentario || '-'}</span>
                </div>
              </div>
          </div>

          {/* Coluna 2: Histórico */}
          <div className="lead-history-column">
              <h2>Histórico de Alterações</h2>
              {isLoadingHistory && <p>Carregando histórico...</p>}
              {!isLoadingHistory && historyError && <p className="error-message">{historyError}</p>}
              {!isLoadingHistory && !historyError && (
                  <ul className="lead-history-list">
                      {historyList.length > 0 ? (
                          historyList.map(entry => (
                              <li key={entry._id} className="history-entry">
                                  <span className="history-timestamp">{formatDate(entry.createdAt)}</span>
                                  <strong className="history-action">{entry.action}:</strong>
                                  <span className="history-details">{entry.details || '-'}</span>
                                  {entry.user && <span className="history-user"> por {entry.user.nome || '?'}</span>}
                              </li>
                          ))
                      ) : ( <p>Nenhum histórico registrado.</p> )}
                  </ul>
              )}
          </div>

          {/* Coluna 3: Placeholder Conversas */}
          <div className="lead-conversations-column">
              <h2>Histórico de Conversas</h2>
              <p><i>(Funcionalidade futura)</i></p>
          </div>
      </div>


      {/* Modais */}
      <DiscardLeadModal
        isOpen={isDiscardModalOpen}
        onClose={handleCloseDiscardModal}
        onSubmit={handleConfirmDiscard}
        leadName={leadDetails?.nome}
        isProcessing={isDiscarding}
        errorMessage={discardError}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Excluir permanentemente o lead "${deleteTargetLead?.nome || ''}"? Ação irreversível.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteError}
      />

    </div> // Fim .lead-detail-page
  );

} // <<< FIM DO COMPONENTE

export default LeadDetailPage;