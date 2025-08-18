import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { toast } from "react-toastify";

// API
import { getLeads, updateLead, discardLead, deleteLead } from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";

// Componentes
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import LeadTagsModal from "../../components/LeadTagsModal/LeadTagsModal";
import ImportCSVModal from "../../components/ImportCSVModal/ImportCSVModal";
import LeadCard from "../../components/LeadCard/LeadCard";
import ReservaFormModal from "../LeadDatail/ReservaFormModal";

// Estilos
import "./Kanban.css";

function LeadListPage() {
  // Kanban e dados
  const [leadStages, setLeadStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [allLeadsRaw, setAllLeadsRaw] = useState([]);
  const [stageIdDescartado, setStageIdDescartado] = useState(null);

  // UI / Modais
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLeadForModal, setDeleteTargetLeadForModal] = useState(null);

  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [selectedLeadForTags, setSelectedLeadForTags] = useState(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Reserva/Proposta/Venda modal
  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
  const [reservaTargetLead, setReservaTargetLead] = useState(null);
  const [reservaTargetStageId, setReservaTargetStageId] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stagesResponse, leadsResponse] = await Promise.all([
        getLeadStages(),
        getLeads({ page: 1, limit: 1000 }),
      ]);

      const fetchedStages =
        stagesResponse.leadStages || stagesResponse.data || stagesResponse || [];
      setLeadStages(fetchedStages);

      const descartadoStage = fetchedStages.find(
        (s) => s.nome.toLowerCase() === "descartado"
      );
      if (descartadoStage) setStageIdDescartado(descartadoStage._id);

      const fetchedLeads = leadsResponse.leads || [];
      setAllLeadsRaw(fetchedLeads);

      // agrupa por estágio
      const grouped = {};
      fetchedStages.forEach((stage) => {
        grouped[stage._id] = [];
      });
      fetchedLeads.forEach((lead) => {
        const stageId = lead.situacao?._id || lead.situacao;
        if (stageId && grouped[stageId]) {
          grouped[stageId].push(lead);
        } else {
          if (!grouped["sem_situacao"]) grouped["sem_situacao"] = [];
          grouped["sem_situacao"].push(lead);
        }
      });
      Object.keys(grouped).forEach((id) =>
        grouped[id].sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        )
      );

      setLeadsByStage(grouped);
    } catch (err) {
      const errMsg = err.message || "Falha ao carregar dados do Kanban.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const forceRefresh = useCallback(() => fetchData(), [fetchData]);

  // modais
  const handleOpenDiscardModal = useCallback((lead) => {
    setDiscardTargetLead({ lead });
    setIsDiscardModalOpen(true);
  }, []);
  const handleCloseDiscardModal = useCallback(() => {
    setIsDiscardModalOpen(false);
    setDiscardTargetLead(null);
  }, []);
  const handleConfirmDiscard = useCallback(
    async (discardData) => {
      if (!discardTargetLead?.lead) return;
      setIsProcessingAction(true);
      try {
        await discardLead(discardTargetLead.lead._id, discardData);
        toast.success(`Lead "${discardTargetLead.lead.nome}" descartado!`);
        handleCloseDiscardModal();
        forceRefresh();
      } catch (err) {
        toast.error(err.message || "Falha ao descartar.");
      } finally {
        setIsProcessingAction(false);
      }
    },
    [discardTargetLead, forceRefresh, handleCloseDiscardModal]
  );

  const [specialStagesWithModal, setSpecialStagesWithModal] = useState([]);
  useEffect(() => {
    const especiais = [
      "em reserva",
      "proposta emitida",
      "em proposta",
      "venda realizada",
    ];
    const ids = leadStages
      .filter((s) => especiais.includes(s.nome.toLowerCase()))
      .map((s) => s._id);
    setSpecialStagesWithModal(ids);
  }, [leadStages]);

  const handleReactivateLead = useCallback(
    async (lead) => {
      if (isProcessingAction) return;
      const situacaoAtendimento =
        leadStages.find((s) => s.nome === "Em Atendimento") ||
        leadStages.find((s) => s.nome === "Novo");
      if (!situacaoAtendimento) {
        toast.error("Erro: Status padrão para reativação não encontrado.");
        return;
      }
      setIsProcessingAction(true);
      try {
        await updateLead(lead._id, { situacao: situacaoAtendimento._id });
        toast.success(
          `Lead "${lead.nome}" reativado para "${situacaoAtendimento.nome}"!`
        );
        forceRefresh();
      } catch (err) {
        toast.error(err.message || "Falha ao reativar lead.");
      } finally {
        setIsProcessingAction(false);
      }
    },
    [isProcessingAction, leadStages, forceRefresh]
  );

  const handleOpenDeleteModal = useCallback((lead) => {
    setDeleteTargetLeadForModal(lead);
    setIsDeleteModalOpen(true);
  }, []);
  const handleCloseDeleteModal = useCallback(() => {
    if (!isProcessingAction) {
      setIsDeleteModalOpen(false);
      setDeleteTargetLeadForModal(null);
    }
  }, [isProcessingAction]);
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetLeadForModal?._id) return;
    setIsProcessingAction(true);
    try {
      await deleteLead(deleteTargetLeadForModal._id);
      toast.success(`Lead "${deleteTargetLeadForModal.nome}" excluído!`);
      handleCloseDeleteModal();
      forceRefresh();
    } catch (err) {
      console.error("Erro ao deletar lead:", err);
      toast.error("Erro ao excluir o lead.");
    } finally {
      setIsProcessingAction(false);
    }
  }, [deleteTargetLeadForModal, forceRefresh, handleCloseDeleteModal]);

  const handleOpenTagsModal = useCallback((lead) => {
    setSelectedLeadForTags(lead);
    setIsTagsModalOpen(true);
  }, []);
  const handleCloseTagsModal = useCallback(() => {
    setIsTagsModalOpen(false);
    setSelectedLeadForTags(null);
  }, []);

  const handleCloseReservaModal = async (wasConfirmed) => {
    if (!wasConfirmed) {
      setIsReservaModalOpen(false);
      setReservaTargetLead(null);
      setReservaTargetStageId(null);
      return;
    }
    setIsProcessingAction(true);
    try {
      await updateLead(reservaTargetLead._id, {
        situacao: reservaTargetStageId,
      });
      toast.success(`Lead "${reservaTargetLead.nome}" movido com sucesso!`);
      forceRefresh();
    } catch (err) {
      toast.error(err.message || "Erro ao atualizar lead após reserva.");
    } finally {
      setIsProcessingAction(false);
      setIsReservaModalOpen(false);
      setReservaTargetLead(null);
      setReservaTargetStageId(null);
    }
  };

  // DnD
  const onDragEnd = async (result) => {
    const { source, destination, draggableId: leadId } = result;
    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    )
      return;

    const leadToMove = allLeadsRaw.find((l) => l._id === leadId);
    if (!leadToMove) return;

    const finishStageId = destination.droppableId;

    if (finishStageId === stageIdDescartado) {
      handleOpenDiscardModal(leadToMove);
      return;
    }

    if (specialStagesWithModal.includes(finishStageId)) {
      setReservaTargetLead(leadToMove);
      setReservaTargetStageId(finishStageId);
      setIsReservaModalOpen(true);
      return;
    }

    // otimista
    const newStartLeads = [...(leadsByStage[source.droppableId] || [])];
    const [movedItem] = newStartLeads.splice(source.index, 1);
    const newFinishLeads =
      source.droppableId === finishStageId
        ? newStartLeads
        : [...(leadsByStage[destination.droppableId] || [])];
    newFinishLeads.splice(destination.index, 0, movedItem);
    setLeadsByStage((prev) => ({
      ...prev,
      [source.droppableId]: newStartLeads,
      [destination.droppableId]: newFinishLeads,
    }));

    try {
      setIsProcessingAction(true);
      const targetStage = leadStages.find((s) => s._id === finishStageId);
      const updatedLeadFromApi = await updateLead(leadId, {
        situacao: finishStageId,
      });
      toast.success(
        `Lead "${updatedLeadFromApi.nome}" movido para "${targetStage?.nome || ""
        }"!`
      );
      setAllLeadsRaw((prevAll) =>
        prevAll.map((l) => (l._id === updatedLeadFromApi._id ? updatedLeadFromApi : l))
      );
    } catch (err) {
      toast.error(err.message || "Falha ao atualizar situação.");
      fetchData(); // reverte em caso de erro
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page loading">
        <p>Carregando Funil de Leads...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="admin-page error-page">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-page lead-list-page kanban-board-page">
      <header className="page-header">
        <h1>Funil de Leads</h1>
        <div className="header-actions-kanban">
          <Link to="/leads/novo" className="button primary-button">
            + Novo Lead
          </Link>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="button"
            type="button"
          >
            Importar CSV
          </button>
        </div>
      </header>

      <div className="page-content">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container">
            {leadStages.map((stage) => (
              <Droppable droppableId={stage._id} key={stage._id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column ${snapshot.isDraggingOver ? "dragging-over" : ""
                      }`}
                  >
                    <h3 className="kanban-column-title">
                      {stage.nome}
                      <span className="count-badge">{leadsByStage[stage._id]?.length || 0}</span>
                    </h3>
                    <div className="kanban-column-content">
                      {(leadsByStage[stage._id] || []).map((lead, index) => (
                        <Draggable
                          key={lead._id}
                          draggableId={lead._id}
                          index={index}
                        >
                          {(providedCard, snapshotCard) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.draggableProps}
                              {...providedCard.dragHandleProps}
                              className={`lead-card ${snapshotCard.isDragging ? "dragging" : ""
                                }`}
                            >
                              <LeadCard
                                lead={lead}
                                onDiscardClick={handleOpenDiscardModal}
                                onDeleteClick={handleOpenDeleteModal}
                                onReactivateClick={handleReactivateLead}
                                isProcessingReactivation={isProcessingAction}
                                onTagsClick={handleOpenTagsModal}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {(!leadsByStage[stage._id] ||
                        leadsByStage[stage._id]?.length === 0) && (
                          <p className="kanban-empty-column">Nenhum lead aqui.</p>
                        )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Modais */}
      <LeadTagsModal
        isOpen={isTagsModalOpen}
        onClose={handleCloseTagsModal}
        lead={selectedLeadForTags}
        onTagsSaved={forceRefresh}
      />
      <DiscardLeadModal
        isOpen={isDiscardModalOpen}
        onClose={handleCloseDiscardModal}
        onSubmit={handleConfirmDiscard}
        leadName={discardTargetLead?.lead?.nome}
        isProcessing={isProcessingAction}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Excluir permanentemente o lead "${deleteTargetLeadForModal?.nome || ""}"?`}
        isProcessing={isProcessingAction}
      />
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={forceRefresh}
      />
      {isReservaModalOpen && reservaTargetLead && (
        <ReservaFormModal
          leadId={reservaTargetLead._id}
          leadNome={reservaTargetLead.nome}
          companyId={
            reservaTargetLead.company?._id || reservaTargetLead.company
          }
          onClose={handleCloseReservaModal}
        />
      )}
    </div>
  );
}

export default LeadListPage;
