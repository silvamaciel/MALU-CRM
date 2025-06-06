// src/pages/LeadList/LeadListPage.js
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate para o card
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // <<< IMPORTAR
import { toast } from "react-toastify";

// API Functions
import { getLeads, updateLead, discardLead, deleteLead } from "../../api/leads";
import { getLeadStages } from "../../api/leadStages"; // Para as colunas do Kanban

// Componentes (Modais podem continuar sendo usados, LeadCard será para o Kanban)
// import LeadCard from '../../components/LeadCard/LeadCard'; // Vamos definir o card inline por agora
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import LeadFilters from '../../components/LeadFilters/LeadFilters';

import LeadTagsModal from '../../components/LeadTagsModal/LeadTagsModal';


import "./LeadListPage.css";
import "./Kanban.css";

 const reorder = (list, startIndex, endIndex) => {
   const result = Array.from(list);
   const [removed] = result.splice(startIndex, 1);
   result.splice(endIndex, 0, removed);
   return result;
 };

function LeadListPage() {
  const navigate = useNavigate(); // Para navegação ao clicar no card

  // --- State Management para Kanban ---
  const [leadStages, setLeadStages] = useState([]); // Para as colunas, ordenadas
  const [leadsByStage, setLeadsByStage] = useState({}); // Objeto: { stageId: [leads...], ... }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allLeadsRaw, setAllLeadsRaw] = useState([]); // Para re-agrupar se necessário

  const [stageIdDescartado, setStageIdDescartado] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // States para modais (podem ser mantidos se as ações nos cards abrirem modais)
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLeadForModal, setDeleteTargetLeadForModal] = useState(null);


  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);
  // ... (outros states de modal se precisar manter: delete, etc.)

  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [selectedLeadForTags, setSelectedLeadForTags] = useState(null);

  // Função para buscar dados iniciais (LeadStages e Leads)
const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stagesResponse = await getLeadStages();
      const fetchedStages = stagesResponse.leadStages || stagesResponse.data || stagesResponse || [];
      setLeadStages(fetchedStages);

      const descartadoStage = fetchedStages.find(s => s.nome.toLowerCase() === "descartado");
      if (descartadoStage) {
        setStageIdDescartado(descartadoStage._id);
      } else {
        console.warn("Estágio 'Descartado' não encontrado. A funcionalidade de arrastar para descartar pode não funcionar como esperado.");
      }

      // Para Kanban, buscar todos os leads ativos é comum. Ajuste 'limit' se necessário.
      const leadsResponse = await getLeads({ page: 1, limit: 1000, ativo: true }); // Filtro 'ativo' se aplicável
      const fetchedLeads = leadsResponse.leads || [];
      setAllLeadsRaw(fetchedLeads);

      const grouped = {};
      fetchedStages.forEach(stage => {
        grouped[stage._id] = [];
      });
      fetchedLeads.forEach(lead => {
        const stageId = lead.situacao?._id || lead.situacao;
        if (stageId && grouped[stageId]) {
          grouped[stageId].push(lead);
        } else if (stageId) {
            if (!grouped["sem_correspondencia_valida"]) grouped["sem_correspondencia_valida"] = [];
             grouped["sem_correspondencia_valida"].push(lead);
            console.warn(`Lead ${lead._id} (nome: ${lead.nome}, situação ID: ${stageId}) tem uma situação não listada entre os estágios ativos.`);
        } else {
          if (!grouped["sem_situacao_definida"]) grouped["sem_situacao_definida"] = [];
          grouped["sem_situacao_definida"].push(lead);
        }
      });

      for (const stageId in grouped) {
        grouped[stageId].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      setLeadsByStage(grouped);

    } catch (err) {
      const errMsg = err.message || "Falha ao carregar dados para o Kanban.";
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

  const handleOpenTagsModal = useCallback((lead) => {
        setSelectedLeadForTags(lead);
        setIsTagsModalOpen(true);
    }, []);

    const handleCloseTagsModal = useCallback(() => {
        setIsTagsModalOpen(false);
        setSelectedLeadForTags(null);
    }, []);


  // Handlers para Discard Modal
  const handleOpenDiscardModal = useCallback((lead, targetStageId = null) => {
    setDiscardTargetLead({ lead, targetStageId }); // Guarda o lead e o estágio de destino (se arrastado)
    setIsDiscardModalOpen(true);
  }, []);

  const handleCloseDiscardModal = useCallback(() => {
    setIsDiscardModalOpen(false);
    setDiscardTargetLead(null);
  }, []);


const handleConfirmDiscard = useCallback(async (discardData) => {
    if (!discardTargetLead || !discardTargetLead.lead) return;
    setIsProcessingAction(true);
    try {
      await discardLead(discardTargetLead.lead._id, discardData); // API de descarte
      toast.success(`Lead "${discardTargetLead.lead.nome}" descartado!`);
      handleCloseDiscardModal();
      forceRefresh(); // Atualiza todo o Kanban
    } catch (err) {
      toast.error(err.message || "Falha ao descartar lead.");
      // Não fecha o modal automaticamente em caso de erro, para o usuário ver.
    } finally {
      setIsProcessingAction(false);
    }
  }, [discardTargetLead, forceRefresh, handleCloseDiscardModal]);
  
  // ... (outros handlers de modal se os mantiver)

  const handleReactivateLead = useCallback(async (leadToReactivate) => {
    if (isProcessingAction) return;
    const situacaoAtendimento = leadStages.find(s => s.nome === "Em Atendimento" || s.nome === "Novo"); // Ou o seu estágio padrão de reativação
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

  const handleOpenDeleteModal = useCallback((lead) => {
    setDeleteTargetLeadForModal(lead);
    setIsDeleteModalOpen(true);
  }, []);
  const handleCloseDeleteModal = useCallback(() => {
    if (!isProcessingAction) { setIsDeleteModalOpen(false); setDeleteTargetLeadForModal(null); }
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
      console.error('Erro ao deletar lead:', err);
      toast.error('Erro ao excluir o lead. Tente novamente.');
    } finally {
      setIsProcessingAction(false);
    }
  }, [deleteTargetLeadForModal, deleteLead, handleCloseDeleteModal, forceRefresh]);


  // VVVVV Handler para o FIM DO DRAG-AND-DROP VVVVV
  const onDragEnd = async (result) => {
    const { source, destination, draggableId: leadId } = result;

    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    const leadToMove = allLeadsRaw.find(lead => lead._id === leadId);
    if (!leadToMove) return;

    const startStageId = source.droppableId;
    const finishStageId = destination.droppableId;

    // Se moveu para a coluna "Descartado"
    if (finishStageId === stageIdDescartado) {
      handleOpenDiscardModal(leadToMove, finishStageId);
      return; 
    }
    
    // --- ATUALIZAÇÃO OTIMISTA DA UI ---
    // 1. Cria uma cópia profunda de leadsByStage para evitar mutação direta
    const newLeadsByStageOptimistic = JSON.parse(JSON.stringify(leadsByStage)); 

    // 2. Remove o lead da coluna de origem
    const sourceLeadsOptimistic = Array.from(newLeadsByStageOptimistic[startStageId] || []);
    const movedItemIndex = sourceLeadsOptimistic.findIndex(lead => lead._id === leadId);
    if (movedItemIndex === -1) return; // Lead não encontrado na coluna de origem, algo errado
    const [movedItemOptimistic] = sourceLeadsOptimistic.splice(movedItemIndex, 1);
    newLeadsByStageOptimistic[startStageId] = sourceLeadsOptimistic;

    // 3. Adiciona o lead à coluna de destino
    const destinationLeadsOptimistic = Array.from(newLeadsByStageOptimistic[finishStageId] || []);
    destinationLeadsOptimistic.splice(destination.index, 0, movedItemOptimistic);
    newLeadsByStageOptimistic[finishStageId] = destinationLeadsOptimistic;
    
    // 4. Atualiza o estado da situação no objeto do lead movido (para UI imediata)
    const targetStageForMovedItem = leadStages.find(s => s._id === finishStageId);
    movedItemOptimistic.situacao = targetStageForMovedItem; // Atualiza o objeto situação
    
    setLeadsByStage(newLeadsByStageOptimistic); // Aplica a mudança visual otimista
    // --- FIM ATUALIZAÇÃO OTIMISTA ---

    // 5. Chama a API para atualizar o backend
    try {
      setIsProcessingAction(true); // Indica que uma ação de API está em progresso
      toast.info(`Movendo lead "${movedItemOptimistic.nome}" para "${targetStageForMovedItem?.nome || 'nova situação'}"...`);
      
      const updatedLeadFromApi = await updateLead(leadId, { situacao: finishStageId }); // API para atualizar
      
      toast.success(`Lead "${movedItemOptimistic.nome}" atualizado para "${targetStageForMovedItem?.nome || ''}"!`);

      // VVVVV ATUALIZAR allLeadsRaw e REAGRUPAR VVVVV
      // Atualiza o lead específico em allLeadsRaw com os dados retornados pela API (ou pelo menos a nova situação)
      setAllLeadsRaw(prevAllLeads => {
          return prevAllLeads.map(lead => 
              lead._id === leadId 
                  ? { ...lead, situacao: updatedLeadFromApi.situacao || targetStageForMovedItem } // Usa o retorno da API se disponível
                  : lead
          );
      });
      
       
      //forceRefresh(); // Isso vai buscar tudo de novo e reconstruir leadsByStage


    } catch (err) {
      toast.error(err.message || "Falha ao atualizar situação do lead no backend.");
      fetchData(); 
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading) {
    return <div className="admin-page loading"><p>Carregando Funil de Leads...</p></div>;
  }
  if (error) {
    return <div className="admin-page error-page"><p className="error-message">{error}</p></div>;
  }

  return (
      <div className="admin-page lead-list-page kanban-board-page">
      <header className="page-header">
        <h1>Funil de Leads</h1>
        <Link to="/leads/novo" className="button primary-button">
          + Novo Lead
        </Link>
      </header>
      <div className="page-content">
        {/* TODO: Adicionar Filtros Globais para o Kanban aqui */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container">
            {leadStages.map(stage => (
              <Droppable droppableId={stage._id} key={stage._id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
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
                              <div className="lead-card-header" onClick={() => navigate(`/leads/${lead._id}`)}>
                                <h4>{lead.nome}</h4>
                              </div>
                              <div className="lead-card-body" onClick={() => navigate(`/leads/${lead._id}`)}>
                                <p className="lead-card-contato">{lead.contato || 'Sem contato'}</p>
                                <p className="lead-card-email">{lead.email || 'Sem email'}</p>
                                <div className="card-tags-container">
                                       {(lead.tags || []).slice(0, 3).map(tag => ( // Mostra até 3 tags
                                      <span key={tag} className="card-tag">{tag}</span>
                                     ))}
                                       {(lead.tags?.length > 3) && <span className="card-tag more-tags">...</span>}
                                   </div>
                              </div>
                              <div className="lead-card-footer">
                                <small>Atualizado: {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}</small>
                                <div className="lead-card-actions">
                                  <Link to={`/leads/${lead._id}`} className="action-icon" title="Detalhes">🔍</Link>
                                  {lead.situacao?.nome?.toLowerCase() === 'descartado' ? (
                                    <button onClick={() => handleReactivateLead(lead)} className="action-icon" disabled={isProcessingAction} title="Reativar">♻️</button>
                                  ) : (
                                    <button onClick={() => handleOpenDiscardModal(lead)} className="action-icon" disabled={isProcessingAction} title="Descartar">🗑️</button>
                                  )}
                                  <button onClick={() => handleOpenDeleteModal(lead)} className="action-icon" disabled={isProcessingAction} title="Excluir">❌</button>
                                  <button onClick={() => handleOpenTagsModal(lead)} className="action-icon" title="Gerenciar Tags">🏷️</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {(!leadsByStage[stage._id] || leadsByStage[stage._id]?.length === 0) && !isLoading &&(
                        <p className="kanban-empty-column">Nenhum lead aqui.</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
            {/* Colunas para sem_correspondencia_valida e sem_situacao_definida (opcional) */}
          </div>
        </DragDropContext>
      </div>

      <DiscardLeadModal
        isOpen={isDiscardModalOpen}
        onClose={handleCloseDiscardModal}
        onSubmit={handleConfirmDiscard}
        leadName={discardTargetLead?.lead?.nome}
        isProcessing={isProcessingAction}
        errorMessage={discardError} // Se o modal suportar exibir erro interno
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Excluir permanentemente o lead "${deleteTargetLeadForModal?.nome || ''}"?`}
        isProcessing={isProcessingAction}
        errorMessage={deleteError} // Se o modal suportar
      />
    </div>
  );
}

export default LeadListPage;