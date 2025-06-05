// src/pages/LeadList/LeadListPage.js
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate para o card
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // <<< IMPORTAR
import { toast } from "react-toastify";

// API Functions
import { getLeads, updateLead } from "../../api/leads"; // updateLead será usado para mudar a situação
import { getLeadStages } from "../../api/leadStages"; // Para as colunas do Kanban

// Componentes (Modais podem continuar sendo usados, LeadCard será para o Kanban)
// import LeadCard from '../../components/LeadCard/LeadCard'; // Vamos definir o card inline por agora
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
// import LeadFilters from '../../components/LeadFilters/LeadFilters'; // Filtros no Kanban podem ser diferentes

import "./LeadListPage.css"; // Seu CSS existente


function LeadListPage() {
  const navigate = useNavigate(); // Para navegação ao clicar no card

  // --- State Management para Kanban ---
  const [leadStages, setLeadStages] = useState([]); // Para as colunas, ordenadas
  const [leadsByStage, setLeadsByStage] = useState({}); // Objeto: { stageId: [leads...], ... }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allLeadsRaw, setAllLeadsRaw] = useState([]); // Para re-agrupar se necessário

  // States para modais (podem ser mantidos se as ações nos cards abrirem modais)
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);
  // ... (outros states de modal se precisar manter: delete, etc.)

  // Função para buscar dados iniciais (LeadStages e Leads)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stagesData = await getLeadStages(); // Backend já deve retornar ordenado por 'ordem'
      const fetchedStages = stagesData.leadStages || stagesData.data || stagesData || [];
      setLeadStages(fetchedStages);

      // Para Kanban, geralmente buscamos todos os leads ativos relevantes.
      // Se a quantidade for muito grande, filtros globais acima do Kanban podem ser úteis.
      const leadsData = await getLeads({ page: 1, limit: 500, ativo: true }); // Busca mais leads, filtre por 'ativo:true' se aplicável
      const fetchedLeads = leadsData.leads || [];
      setAllLeadsRaw(fetchedLeads); // Guarda a lista crua

      // Agrupa os leads por estágio
      const grouped = {};
      fetchedStages.forEach(stage => {
        grouped[stage._id] = []; // Inicializa um array para cada estágio
      });
      fetchedLeads.forEach(lead => {
        const stageId = lead.situacao?._id || lead.situacao;
        if (stageId && grouped[stageId]) {
          grouped[stageId].push(lead);
        } else if (stageId) { // Lead com situação não encontrada na lista de estágios ativos
          console.warn(`Lead ${lead._id} (situação: ${stageId}) não corresponde a um estágio carregado.`);
          if (!grouped['sem_correspondencia']) grouped['sem_correspondencia'] = [];
          grouped['sem_correspondencia'].push(lead);
        } else { // Leads sem situação
          if (!grouped["sem_situacao"]) grouped["sem_situacao"] = [];
          grouped["sem_situacao"].push(lead);
        }
      });

      // Ordena leads dentro de cada estágio (ex: por data de atualização decrescente)
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

  // Função para forçar refresh (pode ser usada após ações nos cards)
  const forceRefresh = useCallback(() => fetchData(), [fetchData]);

  // Handlers para Modais (manter e adaptar se forem chamados de dentro dos cards)
  const handleOpenDiscardModal = useCallback((lead) => { // Agora recebe o objeto lead
    setDiscardTargetLead(lead); setDiscardError(null); setIsDiscardModalOpen(true);
  }, []);
  const handleCloseDiscardModal = useCallback(() => { /* ... */ }, [isDiscarding]);
  const handleConfirmDiscard = useCallback(async (discardData) => { /* ... chama forceRefresh ... */ }, [discardTargetLead, handleCloseDiscardModal, forceRefresh]);
  // ... (outros handlers de modal se os mantiver)


  // VVVVV Handler para o FIM DO DRAG-AND-DROP VVVVV
  const onDragEnd = async (result) => {
    const { source, destination, draggableId: leadId } = result;

    // Se soltou fora de uma coluna válida ou na mesma posição
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    const startStageId = source.droppableId;
    const finishStageId = destination.droppableId;

    // Atualização otimista da UI
    const leadToMove = allLeadsRaw.find(lead => lead._id === leadId);
    if (!leadToMove) return;

    // 1. Remove o lead da coluna de origem no estado local
    const newLeadsByStage = { ...leadsByStage };
    const sourceLeads = Array.from(newLeadsByStage[startStageId] || []);
    const [movedLead] = sourceLeads.splice(source.index, 1);
    newLeadsByStage[startStageId] = sourceLeads;

    // 2. Adiciona o lead à coluna de destino no estado local
    const destinationLeads = Array.from(newLeadsByStage[finishStageId] || []);
    destinationLeads.splice(destination.index, 0, movedLead);
    newLeadsByStage[finishStageId] = destinationLeads;
    
    // Atualiza o estado da situação no objeto do lead movido (para UI imediata)
    movedLead.situacao = leadStages.find(s => s._id === finishStageId);
    
    setLeadsByStage(newLeadsByStage);

    // 3. Chama a API para atualizar a situação do lead no backend
    try {
      const targetStage = leadStages.find(s => s._id === finishStageId);
      toast.info(`Movendo lead "${movedLead.nome}" para "${targetStage?.nome || 'nova situação'}"...`);
      await updateLead(leadId, { situacao: finishStageId }); // Envia o ID do novo estágio
      toast.success(`Lead "${movedLead.nome}" atualizado para "${targetStage?.nome || ''}"!`);
      // Opcional: forceRefresh() para garantir consistência total, mas a atualização otimista já cuidou da UI.
      // Se você quiser reordenar por updatedAt após mover, um forceRefresh pode ser útil.
      // Por agora, a ordem dentro da coluna é baseada na inserção do drag-n-drop na UI.
    } catch (err) {
      toast.error(err.message || "Falha ao atualizar situação do lead no backend.");
      // Reverte a mudança otimista se a API falhar, recarregando os dados
      fetchData(); 
    }
  };
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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
                    <h3 className="kanban-column-title">
                      {stage.nome} ({leadsByStage[stage._id]?.length || 0})
                    </h3>
                    <div className="kanban-column-content">
                      {(leadsByStage[stage._id] || []).map((lead, index) => (
                        <Draggable key={lead._id} draggableId={lead._id} index={index}>
                          {(providedCard, snapshotCard) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.draggableProps}
                              {...providedCard.dragHandleProps}
                              className={`lead-card ${snapshotCard.isDragging ? 'dragging' : ''}`}
                              onClick={() => navigate(`/leads/${lead._id}`)}
                            >
                              <h4>{lead.nome}</h4>
                              <p className="lead-card-contato">{lead.contato || 'Sem contato'}</p>
                              <p className="lead-card-email">{lead.email || 'Sem email'}</p>
                              <div className="lead-card-footer">
                                <small>Atualizado: {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}</small>
                                {/* Adicionar ícones/botões para ações rápidas no card (Ex: Descartar) se desejar */}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {(!leadsByStage[stage._id] || leadsByStage[stage._id]?.length === 0) && (
                        <p className="kanban-empty-column">Nenhum lead aqui.</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
            {/* Você pode adicionar colunas para "sem_situacao" ou "sem_correspondencia" se necessário */}
          </div>
        </DragDropContext>
      </div>

      {/* Modais (se você ainda for usá-los a partir de ações nos cards) */}
      <DiscardLeadModal
        isOpen={isDiscardModalOpen}
        onClose={handleCloseDiscardModal}
        onSubmit={handleConfirmDiscard}
        leadName={discardTargetLead?.nome}
        isProcessing={isDiscarding}
        errorMessage={discardError}
      />
      {/* ... (ConfirmModal para delete, se mantiver essa ação aqui) ... */}
    </div>
  );
}

export default LeadListPage;