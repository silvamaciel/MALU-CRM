// src/pages/LeadDetail/LeadDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// API Functions - getLeadHistory já estava importado
import { getLeadById, discardLead, updateLead, deleteLead, getLeadHistory } from '../../api/leads';
import { getSituacoes } from '../../api/situacoes';
// Modal Components
import DiscardLeadModal from '../../components/DiscardLeadModal/DiscardLeadModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
// Styles
import './LeadDetailPage.css';
// Toast Notifications (opcional)
import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css'; // Import do CSS deve estar no App.js

// --- Função Auxiliar formatDate ---
const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    try {
        return new Date(dateString).toLocaleString('pt-BR', { // Usando toLocaleString para data e hora
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return 'Data inválida';
    }
};
// -----------------------------

function LeadDetailPage() {
  // --- Hooks ---
  const { id } = useParams();
  const navigate = useNavigate();

  // --- States ---
  // Lead Details
  const [leadDetails, setLeadDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Loading geral inicial
  const [error, setError] = useState(null); // Erro ao carregar lead/situações

  // Situações (para Reativar)
  const [situacoesList, setSituacoesList] = useState([]);

  // Histórico (state já existia, agora será usado)
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Loading específico do histórico
  const [historyError, setHistoryError] = useState(null); // Erro específico do histórico

  // Modals e Ações (Descarte, Reativação, Exclusão - estados mantidos)
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false); /*...*/
  const [discardTargetLead, setDiscardTargetLead] = useState(null); /*...*/ // Necessário? Não, usamos leadDetails
  const [isDiscarding, setIsDiscarding] = useState(false); /*...*/
  const [discardError, setDiscardError] = useState(null); /*...*/
  const [isReactivating, setIsReactivating] = useState(false); /*...*/
  const [reactivateError, setReactivateError] = useState(null); /*...*/
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); /*...*/
  const [deleteTargetLead, setDeleteTargetLead] = useState(null); /*...*/ // Necessário? Não, usamos leadDetails
  const [isDeleting, setIsDeleting] = useState(false); /*...*/
  const [deleteError, setDeleteError] = useState(null); /*...*/

  // Refresh Trigger
  const [refreshKey, setRefreshKey] = useState(0); // Para forçar re-busca de tudo

  // --- Data Fetching ---
  // Busca Lead, Situações E Histórico
  const fetchData = useCallback(async () => {
    if (!id) { setError("ID inválido."); setIsLoading(false); return; }

    // Reseta estados antes de buscar
    setIsLoading(true);
    setIsLoadingHistory(true);
    setError(null);
    setHistoryError(null);
    setReactivateError(null); // Limpa erros de ações anteriores

    try {
      // Busca tudo em paralelo
      const [leadData, situacoesData, historyData] = await Promise.all([
        getLeadById(id),
        getSituacoes(),
        getLeadHistory(id) // <<< ADICIONADO: Busca o histórico >>>
      ]);
      setLeadDetails(leadData);
      setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
      setHistoryList(Array.isArray(historyData) ? historyData : []); // <<< Salva o histórico >>>

    } catch (err) {
      console.error(`Erro ao buscar dados para lead ${id}:`, err);
      // Se o lead não carregou, é um erro principal
      if (!leadDetails) { setError(err.message || 'Falha ao carregar dados.'); }
      // Pode setar erros específicos se a busca de histórico falhar separadamente
      if (!Array.isArray(historyList)) setHistoryError("Falha ao carregar histórico.");
      // Limpa states em caso de erro grave
      setLeadDetails(null); setSituacoesList([]); setHistoryList([]);
    } finally {
      setIsLoading(false); // Finaliza loading geral
      setIsLoadingHistory(false); // Finaliza loading do histórico
    }
  }, [id]); // Depende apenas do ID para buscar tudo

  // Efeito para buscar dados na montagem e quando refreshKey mudar
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]); // Usar refreshKey para forçar re-busca após ações

  // --- Handlers (Ações e Modais) ---
  const forceRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);

  // Handlers Descarte
  const handleOpenDiscardModal = () => { /* ... state updates ... */ };
  const handleCloseDiscardModal = () => { /* ... state updates ... */ };
  const handleConfirmDiscard = async (discardData) => { /* ... try/catch -> await discardLead -> toast -> forceRefresh() ... */ };

  // Handler Reativar
  const handleReactivateLead = async () => { /* ... try/catch -> await updateLead -> toast -> forceRefresh() ... */ };

  // Handlers Exclusão
  const handleOpenDeleteModal = () => { /* ... state updates ... */ };
  const handleCloseDeleteModal = () => { /* ... state updates ... */ };
  const handleConfirmDelete = async () => { /* ... try/catch -> await deleteLead -> toast -> navigate('/leads') ... */ };
  // (Implementações completas dos handlers omitidas para brevidade - devem chamar forceRefresh() ou navigate())
  // ...


  // --- Renderização ---

  // Loading Inicial
  if (isLoading && !leadDetails) {
    return <div className="lead-detail-page loading">Carregando...</div>;
  }
  // Erro Fatal (Lead não carregou)
  if (error && !leadDetails) {
    return <div className="lead-detail-page error-page"> /* ... */ </div>;
  }
  // Lead não encontrado (após loading e sem erro fatal)
  if (!leadDetails) {
    return <div className="lead-detail-page error-page">Lead não encontrado.</div>;
  }

  // Preparação de dados (igual antes)
  const situacaoNome = leadDetails.situacao?.nome || 'N/A';
  const origemNome = leadDetails.origem?.nome || 'N/A';
  const responsavelNome = leadDetails.responsavel?.nome || 'N/A';
  const responsavelPerfil = leadDetails.responsavel?.perfil || 'N/A';
  const isCurrentlyDiscarded = situacaoNome === "Descartado";


  return (
    <div className="lead-detail-page">
      {/* <ToastContainer /> */}

      {/* Cabeçalho com Ações (Mantido) */}
      <div className="detail-header">
          <h1>Detalhes do Lead: {leadDetails.nome}</h1>
          <div className="header-actions">
             <Link to="/leads" className="button back-button">Voltar</Link>
             {!isCurrentlyDiscarded && ( <Link to={`/leads/${id}/editar`} className="button edit-button">Editar</Link> )}
             {isCurrentlyDiscarded ? ( <button onClick={handleReactivateLead} className="button reactivate-button" disabled={isReactivating}>{isReactivating ? '...' : 'Reativar'}</button> )
              : ( <button onClick={handleOpenDiscardModal} className="button discard-button-detail">Descartar</button> )}
             <button onClick={handleOpenDeleteModal} className="button delete-button-detail">Excluir</button>
          </div>
      </div>
      {/* Erro reativação (Mantido) */}
      {reactivateError && <p className="error-message reactivation-error">{reactivateError}</p>}


      {/* --- Bloco 1: Detalhes Completos do Lead --- */}
      <div className="lead-details-section">
            <h2>Informações do Lead</h2>
            <div className="detail-grid"> {/* O grid original com TODOS os detalhes */}
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
                        <span className="detail-value">{leadDetails.motivoDescarte?.nome}</span>
                    </div>
                )}
                {/* Comentário (Ocupa largura total se necessário) */}
                <div className="detail-item comentario">
                    <span className="detail-label">Comentário:</span>
                    <span className="detail-value comentario-value">{leadDetails.comentario || 'Nenhum comentário.'}</span>
                </div>
            </div> {/* Fim .detail-grid */}
      </div>
      {/* --- Fim Bloco 1 --- */}


      {/* --- Bloco 2: Grid de Subseções (Histórico e Conversas) --- */}
      <div className="lead-subsections-grid">

          {/* Coluna 1: Histórico de Alterações */}
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
                                  <span className="history-details">{entry.details || '(Sem detalhes)'}</span>
                                  {entry.user && <span className="history-user"> por {entry.user.nome || 'Usuário desconhecido'}</span>}
                              </li>
                          ))
                      ) : (
                          <p>Nenhum histórico registrado.</p>
                      )}
                  </ul>
              )}
          </div>

          {/* Coluna 2: Histórico de Conversas (Placeholder) */}
          <div className="lead-conversations-column">
              <h2>Histórico de Conversas</h2>
              <p><i>(Funcionalidade a ser implementada futuramente)</i></p>
              {/* Aqui você adicionaria a lógica e a UI para as conversas depois */}
          </div>

      </div>
      {/* --- Fim Bloco 2 --- */}


      {/* Modais (Mantidos no final) */}
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
          title="Confirmar Exclusão Permanente"
          message={`Tem certeza que deseja excluir permanentemente o lead "${leadDetails?.nome || ''}"? Esta ação não pode ser desfeita.`}
          confirmText="Sim, Excluir"
          cancelText="Cancelar"
          confirmButtonClass="confirm-button-delete"
          isProcessing={isDeleting}
          errorMessage={deleteError}
      />

    </div> // Fim .lead-detail-page
  );

}


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
    setTimeout(() => {
      navigate("/leads");
    }, 1000); // Navega para lista após descarte
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
  const situacaoAtendimento = situacoesList.find(
    (s) => s.nome === "Em Atendimento"
  );
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
    navigate("/leads"); // Navega para lista após excluir
  } catch (err) {
    console.error("Erro ao confirmar exclusão:", err);
    setDeleteError(err.message || "Falha ao excluir.");
  } finally {
    setIsDeleting(false);
  }
};

export default LeadDetailPage;