// src/pages/LeadList/LeadListPage.js
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

import "./LeadListPage.css";
import "./Kanban.css";

function LeadListPage() {
  const navigate = useNavigate();

  // States para Kanban
  const [leadStages, setLeadStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [allLeadsRaw, setAllLeadsRaw] = useState([]);
  const [stageIdDescartado, setStageIdDescartado] = useState(null);
  
  // States para Filtros
  const [activeFilters, setActiveFilters] = useState({});
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  // States de UI e Modais
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLeadForModal, setDeleteTargetLeadForModal] = useState(null);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [selectedLeadForTags, setSelectedLeadForTags] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Função para buscar todos os dados
  const fetchData = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const [stagesResponse, leadsResponse, origensResponse, usuariosResponse] = await Promise.all([
        getLeadStages(),
        getLeads({ page: 1, limit: 1000, ...filters }),
        getOrigens(),
        getUsuarios({ ativo: true }),
      ]);

      setOrigensList(origensResponse || []);
      setUsuariosList(usuariosResponse?.users || usuariosResponse?.data || usuariosResponse || []);
      
      const fetchedStages = stagesResponse.leadStages || stagesResponse.data || stagesResponse || [];
      setLeadStages(fetchedStages);

      const descartadoStage = fetchedStages.find(s => s.nome.toLowerCase() === "descartado");
      if (descartadoStage) setStageIdDescartado(descartadoStage._id);
      
      const fetchedLeads = leadsResponse.data || leadsResponse.leads || leadsResponse || []; // <<< MELHORIA: Garantir que funciona com várias respostas da API
      setAllLeadsRaw(fetchedLeads);

      // Agrupa os leads por estágio
      const grouped = {};
      fetchedStages.forEach(stage => { grouped[stage._id] = []; });
      fetchedLeads.forEach(lead => {
        const stageId = lead.situacao?._id || lead.situacao;
        if (stageId && grouped[stageId]) {
          grouped[stageId].push(lead);
        } else {
            // Simplificado para agrupar qualquer lead sem estágio correspondente
            if (!grouped["sem_situacao"]) grouped["sem_situacao"] = [];
            grouped["sem_situacao"].push(lead);
        }
      });
      for (const stageId in grouped) {
        grouped[stageId].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      setLeadsByStage(grouped);

    } catch (err) {
      const errMsg = err.message || "Falha ao carregar dados.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []); // fetchData agora é estável

  useEffect(() => {
    fetchData(activeFilters);
  }, [activeFilters, fetchData]);

  const forceRefresh = useCallback(() => fetchData(activeFilters), [fetchData, activeFilters]);

  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  // Handlers para os Modais (Descarte, Delete, Tags)
  const handleOpenDiscardModal = useCallback((lead) => { setDiscardTargetLead({ lead }); setIsDiscardModalOpen(true); }, []);
  const handleCloseDiscardModal = useCallback(() => { if (!isProcessingAction) { setIsDiscardModalOpen(false); setDiscardTargetLead(null); } }, [isProcessingAction]);
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

  // --- LÓGICA COMPLETADA ---
  const handleReactivateLead = useCallback(async (leadToReactivate) => {
    if (isProcessingAction) return;
    const situacaoAtendimento = leadStages.find(s => s.nome === "Em Atendimento" || s.nome === "Novo");
    if (!situacaoAtendimento) {
        toast.error("Erro: Status padrão para reativação (Ex: 'Em Atendimento') não encontrado.");
        return;
    }
    setIsProcessingAction(true);
    try {
        await updateLead(leadToReactivate._id, { situacao: situacaoAtendimento._id });
        toast.success(`Lead "${leadToReactivate.nome}" reativado para "${situacaoAtendimento.nome}"!`);
        forceRefresh();
    } catch (err) {
        toast.error(err.message || "Falha ao reativar lead.");
    } finally {
        setIsProcessingAction(false);
    }
  }, [isProcessingAction, leadStages, forceRefresh]);
  
  const handleOpenDeleteModal = useCallback((lead) => { setDeleteTargetLeadForModal(lead); setIsDeleteModalOpen(true); }, []);
  const handleCloseDeleteModal = useCallback(() => { if (!isProcessingAction) { setIsDeleteModalOpen(false); setDeleteTargetLeadForModal(null); } }, [isProcessingAction]);

  // --- LÓGICA COMPLETADA ---
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetLeadForModal?._id) return;
    setIsProcessingAction(true);
    try {
        await deleteLead(deleteTargetLeadForModal._id);
        toast.success(`Lead "${deleteTargetLeadForModal.nome}" excluído!`);
        handleCloseDeleteModal();
        forceRefresh();
    } catch (err) {
        console.error('Erro ao deletar lead:', err);
        toast.error('Erro ao excluir o lead. Tente novamente.');
    } finally {
        setIsProcessingAction(false);
    }
  }, [deleteTargetLeadForModal, forceRefresh, handleCloseDeleteModal]);
  
  const handleOpenTagsModal = useCallback((lead) => { setSelectedLeadForTags(lead); setIsTagsModalOpen(true); }, []);
  const handleCloseTagsModal = useCallback(() => { setIsTagsModalOpen(false); setSelectedLeadForTags(null); }, []);
  
  // Handler para Drag-and-Drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId: leadId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    
    const leadToMove = allLeadsRaw.find(l => l._id === leadId);
    if (!leadToMove) return;

    if (destination.droppableId === stageIdDescartado) {
      handleOpenDiscardModal(leadToMove); return;
    }
    
    // Atualização otimista da UI
    const newStartLeads = [...(leadsByStage[source.droppableId] || [])];
    const newFinishLeads = source.droppableId === destination.droppableId ? newStartLeads : [...(leadsByStage[destination.droppableId] || [])];
    const [movedItem] = newStartLeads.splice(source.index, 1);
    newFinishLeads.splice(destination.index, 0, movedItem);

    setLeadsByStage(prev => ({
      ...prev,
      [source.droppableId]: newStartLeads,
      [destination.droppableId]: newFinishLeads,
    }));

    // Chamada à API
    try {
      setIsProcessingAction(true);
      const targetStage = leadStages.find(s => s._id === destination.droppableId);
      toast.info(`Movendo lead para "${targetStage?.nome || ''}"...`);
      const updatedLeadFromApi = await updateLead(leadId, { situacao: destination.droppableId });
      toast.success("Lead atualizado!");
      
      // Sincroniza o `allLeadsRaw` com a resposta da API
      setAllLeadsRaw(prevAll => prevAll.map(l => l._id === updatedLeadFromApi.data._id ? updatedLeadFromApi.data : l)); // Assumindo que a API retorna o lead atualizado em .data
    } catch (err) {
      toast.error(err.message || "Falha ao atualizar o lead.");
      fetchData(activeFilters); // Reverte para o estado do servidor
    } finally {
      setIsProcessingAction(false);
    }
  };

  // --- LÓGICA COMPLETADA ---
  if (isLoading) {
    return <div className="admin-page loading"><p>Carregando Funil de Leads...</p></div>;
  }
  // --- LÓGICA COMPLETADA ---
  if (error) {
    return <div className="admin-page error-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="admin-page lead-list-page kanban-board-page">
      <header className="page-header">
        <h1>Funil de Leads</h1>
        <Link to="/leads/novo" className="button primary-button">+ Novo Lead</Link>
      </header>
      <div className="page-content">
        <KanbanFilters 
            origensList={origensList}
            usuariosList={usuariosList}
            onFilterChange={handleFilterChange}
            isProcessing={isLoading}
        />
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
                              <div className="lead-card-header" onClick={() => navigate(`/leads/${lead._id}`)}><h4>{lead.nome}</h4></div>
                              <div className="lead-card-body" onClick={() => navigate(`/leads/${lead._id}`)}>
                                <p className="lead-card-contato">{lead.contato || 'Sem contato'}</p>
                                <p className="lead-card-email">{lead.email || 'Sem email'}</p>
                                <div className="card-tags-container">
                                  {(lead.tags || []).slice(0, 3).map(tag => (<span key={tag} className="card-tag">{tag}</span>))}
                                  {(lead.tags?.length > 3) && <span className="card-tag more-tags">...</span>}
                                </div>
                              </div>
                              <div className="lead-card-footer">
                                <small>Atualizado: {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}</small>
                                <div className="lead-card-actions">
                                  <button onClick={() => handleOpenTagsModal(lead)} className="action-icon" title="Gerenciar Tags">🏷️</button>
                                  {lead.situacao?.nome?.toLowerCase() === 'descartado' ? (
                                    <button onClick={() => handleReactivateLead(lead)} className="action-icon" disabled={isProcessingAction} title="Reativar">♻️</button>
                                  ) : (
                                    <button onClick={() => handleOpenDiscardModal(lead)} className="action-icon" disabled={isProcessingAction} title="Descartar">🗑️</button>
                                  )}
                                  <button onClick={() => handleOpenDeleteModal(lead)} className="action-icon" disabled={isProcessingAction} title="Excluir">❌</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
      <LeadTagsModal isOpen={isTagsModalOpen} onClose={handleCloseTagsModal} lead={selectedLeadForTags} onTagsSaved={forceRefresh} />
      <DiscardLeadModal isOpen={isDiscardModalOpen} onClose={handleCloseDiscardModal} onSubmit={handleConfirmDiscard} leadName={discardTargetLead?.lead?.nome} isProcessing={isProcessingAction} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Excluir permanentemente o lead "${deleteTargetLeadForModal?.nome || ''}"?`} isProcessing={isProcessingAction} />
    </div>
  );
}

export default LeadListPage;