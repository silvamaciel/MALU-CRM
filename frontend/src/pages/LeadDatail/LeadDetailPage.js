// src/pages/LeadDetail/LeadDetailPage.js

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getLeadById,
  discardLead,
  updateLead,
  deleteLead,
  getLeadHistory,
} from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";

import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import ReservaFormModal from "./ReservaFormModal";
import LeadHeaderActions from "./components/LeadHeaderActions";
import LeadInfo from "./components/LeadInfo";
import LeadHistory from "./components/LeadHistory";
import TaskList from '../../components/TaskList/TaskList';

import "./LeadDetailPage.css";
import "../../components/TaskList/styleTaskList.css"
import { toast } from "react-toastify";

function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [reactivateError, setReactivateError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);

  const forceRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);

  const fetchData = useCallback(async () => {
    if (!id) {
      setError("ID inválido.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsLoadingHistory(true);
    try {
      const [leadData, situacoesData, historyData] = await Promise.all([
        getLeadById(id),
        getLeadStages(),
        getLeadHistory(id),
      ]);
      setLeadDetails(leadData);
      setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
      setHistoryList(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      const errorMessage = err.message || "Falha ao carregar dados.";
      setError(errorMessage);
      setHistoryError("Falha ao carregar histórico.");
      setLeadDetails(null);
      setSituacoesList([]);
      setHistoryList([]);
    } finally {
      setIsLoading(false);
      setIsLoadingHistory(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleOpenDiscardModal = () => {
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
    setIsDiscarding(true);
    setDiscardError(null);
    try {
      await discardLead(leadDetails._id, discardData);
      toast.success(`Lead "${leadDetails.nome}" descartado!`);
      handleCloseDiscardModal();
      forceRefresh();
    } catch (err) {
      const errorMsg = err.message || "Falha ao descartar.";
      setDiscardError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleReactivateLead = async () => {
    if (!situacoesList.length) return;
    const situacaoAtendimento = situacoesList.find(s => s.nome === "Em Atendimento");
    if (!situacaoAtendimento) {
      const errorMsg = "Status 'Em Atendimento' não encontrado.";
      setReactivateError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setIsReactivating(true);
    setReactivateError(null);
    try {
      await updateLead(leadDetails._id, { situacao: situacaoAtendimento._id });
      toast.success(`Lead "${leadDetails.nome}" reativado!`);
      forceRefresh();
    } catch (err) {
      const errorMsg = err.message || "Falha ao reativar.";
      setReactivateError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteTargetLead(leadDetails);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteTargetLead(null);
      setIsDeleteModalOpen(false);
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLead(deleteTargetLead._id);
      toast.success(`Lead "${deleteTargetLead.nome}" excluído!`);
      handleCloseDeleteModal();
      navigate("/leads");
    } catch (err) {
      const errorMsg = err.message || "Falha ao excluir.";
      setDeleteError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenReservaModal = () => {
    if (["Vendido", "Descartado", "Em Reserva"].includes(leadDetails.situacao?.nome)) {
      toast.warn(`Lead com status "${leadDetails.situacao.nome}" não pode ter nova reserva.`);
      return;
    }
    setIsReservaModalOpen(true);
  };

  const handleCloseReservaModal = (reservaCriadaComSucesso = false) => {
    setIsReservaModalOpen(false);
    if (reservaCriadaComSucesso) forceRefresh();
  };

  if (isLoading && !leadDetails) return <div className="lead-detail-page loading">Carregando...</div>;
  if (error && !leadDetails) return <div className="lead-detail-page error-page">{error}</div>;
  if (!leadDetails) return <div className="lead-detail-page error-page">Lead não encontrado.</div>;

  return (
    <div className="lead-detail-page">
      <LeadHeaderActions
        id={id}
        leadDetails={leadDetails}
        situacoesList={situacoesList}
        isReactivating={isReactivating}
        onDiscard={handleOpenDiscardModal}
        onReactivate={handleReactivateLead}
        onDelete={handleOpenDeleteModal}
        onReserva={handleOpenReservaModal}
      />

      {reactivateError && <p className="error-message reactivation-error">{reactivateError}</p>}

      <div className="detail-layout-grid">
        <LeadInfo leadDetails={leadDetails} />
        <LeadHistory
          historyList={historyList}
          isLoadingHistory={isLoadingHistory}
          historyError={historyError}
          leadDetails={leadDetails}
          onTagsUpdated={forceRefresh}
        />
        <div className="lead-conversations-column">
        </div>

        <div className="tasks-section">
                    <h2>Tarefas</h2>
                    <TaskList filters={{ lead: id }} />
                </div>
      </div>

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
        message={`Excluir permanentemente o lead \"${deleteTargetLead?.nome || ""}\"?`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteError}
      />

      {isReservaModalOpen && leadDetails && (
        <ReservaFormModal
          leadId={leadDetails._id}
          leadNome={leadDetails.nome}
          companyId={leadDetails.company?._id || leadDetails.company}
          onClose={handleCloseReservaModal}
        />
      )}
    </div>
  );
}

export default LeadDetailPage;
