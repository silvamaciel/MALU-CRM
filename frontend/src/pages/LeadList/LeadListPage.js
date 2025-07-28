import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from "react-toastify";

// API Functions
import { getLeads, updateLead, discardLead, deleteLead } from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";
import { getOrigens } from "../../api/origens";
import { getUsuarios } from "../../api/users";

// Componentes
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import KanbanFilters from "../../components/KanbanFilters/KanbanFilters";
import LeadTagsModal from '../../components/LeadTagsModal/LeadTagsModal';
import ImportCSVModal from '../../components/ImportCSVModal/ImportCSVModal';
import LeadCard from '../../components/LeadCard/LeadCard';

// Estilos
import "./Kanban.css";

function LeadListPage() {
  const navigate = useNavigate();

  // States para Kanban e Dados
  const [leadStages, setLeadStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [allLeadsRaw, setAllLeadsRaw] = useState([]); // "Fonte da verdade" para os leads
  const [stageIdDescartado, setStageIdDescartado] = useState(null);

  // States para Filtros
  const [activeFilters, setActiveFilters] = useState({});
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [showFilters, setShowFilters] = useState(false); // Para o filtro retrátil

  // States de UI e Modais
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false); // Para qualquer ação que precisa de loading

  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLeadForModal, setDeleteTargetLeadForModal] = useState(null);

  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [selectedLeadForTags, setSelectedLeadForTags] = useState(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Função para buscar TODOS os dados da página
  const fetchData = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const [stagesResponse, leadsResponse, origensResponse, usuariosResponse] = await Promise.all([
        getLeadStages(),
        getLeads({ page: 1, limit: 1000, ...filters }), // Passa os filtros para a API de leads
        getOrigens(),
        getUsuarios({ ativo: true }),
      ]);

      const fetchedStages = stagesResponse.leadStages || stagesResponse.data || stagesResponse || [];
      setLeadStages(fetchedStages);
      setOrigensList(origensResponse || []);
      setUsuariosList(usuariosResponse?.users || usuariosResponse?.data || usuariosResponse || []);

      const descartadoStage = fetchedStages.find(s => s.nome.toLowerCase() === "descartado");
      if (descartadoStage) setStageIdDescartado(descartadoStage._id);

      const fetchedLeads = leadsResponse.leads || [];
      setAllLeadsRaw(fetchedLeads);

      // Agrupa os leads por estágio
      const grouped = {};
      fetchedStages.forEach(stage => { grouped[stage._id] = []; });
      fetchedLeads.forEach(lead => {
        const stageId = lead.situacao?._id || lead.situacao;
        if (stageId && grouped[stageId]) {
          grouped[stageId].push(lead);
        } else {
          if (!grouped["sem_situacao"]) grouped["sem_situacao"] = [];
          grouped["sem_situacao"].push(lead);
        }
      });
      for (const stageId in grouped) {
        grouped[stageId].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      setLeadsByStage(grouped);

    } catch (err) {
      const errMsg = err.message || "Falha ao carregar dados do Kanban.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback com dependência vazia torna a função estável

  useEffect(() => {
    fetchData(activeFilters);
  }, [activeFilters, fetchData]); // Re-busca quando os filtros mudam

  const forceRefresh = useCallback(() => fetchData(activeFilters), [fetchData, activeFilters]);

  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  const toggleFiltersVisibility = () => {
    setShowFilters(prev => !prev);
  };

  // Handlers para os Modais (Descarte, Delete, Tags)
  const handleOpenDiscardModal = useCallback((lead) => { setDiscardTargetLead({ lead }); setIsDiscardModalOpen(true); }, []);
  const handleCloseDiscardModal = useCallback(() => { setIsDiscardModalOpen(false); setDiscardTargetLead(null); }, []);
  const handleConfirmDiscard = useCallback(async (discardData) => {
    if (!discardTargetLead?.lead) return;
    setIsProcessingAction(true);
    try {
      await discardLead(discardTargetLead.lead._id, discardData);
      toast.success(`Lead "${discardTargetLead.lead.nome}" descartado!`);
      handleCloseDiscardModal();
      forceRefresh();
    } catch (err) { toast.error(err.message || "Falha ao descartar."); }
    finally { setIsProcessingAction(false); }
  }, [discardTargetLead, forceRefresh, handleCloseDiscardModal]);

  const handleReactivateLead = useCallback(async (lead) => {
    if (isProcessingAction) return;
    const situacaoAtendimento = leadStages.find(s => s.nome === "Em Atendimento" || s.nome === "Novo");
    if (!situacaoAtendimento) { toast.error("Erro: Status padrão para reativação não encontrado."); return; }
    setIsProcessingAction(true);
    try {
      await updateLead(lead._id, { situacao: situacaoAtendimento._id });
      toast.success(`Lead "${lead.nome}" reativado para "${situacaoAtendimento.nome}"!`);
      forceRefresh();
    } catch (err) { toast.error(err.message || "Falha ao reativar lead."); }
    finally { setIsProcessingAction(false); }
  }, [isProcessingAction, leadStages, forceRefresh]);

  const handleOpenDeleteModal = useCallback((lead) => { setDeleteTargetLeadForModal(lead); setIsDeleteModalOpen(true); }, []);
  const handleCloseDeleteModal = useCallback(() => { if (!isProcessingAction) { setIsDeleteModalOpen(false); setDeleteTargetLeadForModal(null); } }, [isProcessingAction]);
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetLeadForModal?._id) return;
    setIsProcessingAction(true);
    try {
      await deleteLead(deleteTargetLeadForModal._id);
      toast.success(`Lead "${deleteTargetLeadForModal.nome}" excluído!`);
      handleCloseDeleteModal();
      forceRefresh();
    } catch (err) { console.error('Erro ao deletar lead:', err); toast.error('Erro ao excluir o lead.'); }
    finally { setIsProcessingAction(false); }
  }, [deleteTargetLeadForModal, forceRefresh, handleCloseDeleteModal]);

  const handleOpenTagsModal = useCallback((lead) => { setSelectedLeadForTags(lead); setIsTagsModalOpen(true); }, []);
  const handleCloseTagsModal = useCallback(() => { setIsTagsModalOpen(false); setSelectedLeadForTags(null); }, []);

  // Handler do Drag-and-Drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId: leadId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

    const leadToMove = allLeadsRaw.find(l => l._id === leadId);
    if (!leadToMove) return;

    const finishStageId = destination.droppableId;
    if (finishStageId === stageIdDescartado) {
      handleOpenDiscardModal(leadToMove);
      return;
    }
 
    // Atualização Otimista da UI
    const newStartLeads = [...(leadsByStage[source.droppableId] || [])];
    const [movedItem] = newStartLeads.splice(source.index, 1);
    const newFinishLeads = source.droppableId === finishStageId ? newStartLeads : [...(leadsByStage[destination.droppableId] || [])];
    newFinishLeads.splice(destination.index, 0, movedItem);
    setLeadsByStage(prev => ({ ...prev, [source.droppableId]: newStartLeads, [destination.droppableId]: newFinishLeads }));

    // Chamada à API
    try {
      setIsProcessingAction(true);
      const targetStage = leadStages.find(s => s._id === finishStageId);
      const updatedLeadFromApi = await updateLead(leadId, { situacao: finishStageId });
      toast.success(`Lead "${updatedLeadFromApi.nome}" movido para "${targetStage?.nome || ''}"!`);

      // Atualiza o estado "mestra" localmente, sem refetch completo
      setAllLeadsRaw(prevAll => prevAll.map(l => l._id === updatedLeadFromApi._id ? updatedLeadFromApi : l));
    } catch (err) {
      toast.error(err.message || "Falha ao atualizar situação.");
      fetchData(activeFilters); // Reverte em caso de erro
    } finally {
      setIsProcessingAction(false);
    }
  };


  if (isLoading) { return <div className="admin-page loading"><p>Carregando Funil de Leads...</p></div>; }
  if (error) { return <div className="admin-page error-page"><p className="error-message">{error}</p></div>; }

  return (
    <div className="admin-page lead-list-page kanban-board-page">
      <header className="page-header">
        <h1>Funil de Leads</h1>
        <div className="header-actions-kanban">
          <button onClick={toggleFiltersVisibility} className="button outline-button">
            Filtros {showFilters ? '▲' : '▼'}
          </button>
          <Link to="/leads/novo" className="button primary-button">+ Novo Lead</Link>
          <button onClick={() => setIsImportModalOpen(true)} className="button"> Importar CSV </button>
        </div>
      </header>
      <div className="page-content">
        <div className={`filters-wrapper ${showFilters ? 'open' : 'closed'}`}>
          <KanbanFilters
            origensList={origensList}
            usuariosList={usuariosList}
            onFilterChange={handleFilterChange}
            isProcessing={isLoading}
          />
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container">
            {leadStages.map(stage => (
              <Droppable droppableId={stage._id} key={stage._id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}>
                    <h3 className="kanban-column-title">{stage.nome} ({leadsByStage[stage._id]?.length || 0})</h3>
                    <div className="kanban-column-content">
                      {(leadsByStage[stage._id] || []).map((lead, index) => (
                        <Draggable key={lead._id} draggableId={lead._id} index={index}>
                          {(providedCard, snapshotCard) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.draggableProps}
                              {...providedCard.dragHandleProps}
                              className={`lead-card ${snapshotCard.isDragging ? 'dragging' : ''}`}
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
                      {(!leadsByStage[stage._id] || leadsByStage[stage._id]?.length === 0) && !isLoading && (
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
      <LeadTagsModal isOpen={isTagsModalOpen} onClose={handleCloseTagsModal} lead={selectedLeadForTags} onTagsSaved={forceRefresh} />
      <DiscardLeadModal isOpen={isDiscardModalOpen} onClose={handleCloseDiscardModal} onSubmit={handleConfirmDiscard} leadName={discardTargetLead?.lead?.nome} isProcessing={isProcessingAction} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Excluir permanentemente o lead "${deleteTargetLeadForModal?.nome || ''}"?`} isProcessing={isProcessingAction} />
      <ImportCSVModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={forceRefresh} />
    </div>
  );
}

export default LeadListPage;