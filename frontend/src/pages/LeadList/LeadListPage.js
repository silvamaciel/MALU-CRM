// src/pages/LeadList/LeadListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLeads, updateLead } from '../../api/leads'; // Assumindo que updateLead pode atualizar a situação
import { getLeadStages } from '../../api/leadStages'; // Para buscar as colunas do Kanban
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
// import KanbanColumn from './KanbanColumn'; // Criaremos depois
// import LeadCard from './LeadCard'; // Criaremos depois
import './LeadListPage.css'; // Seu CSS existente
// import './Kanban.css'; // Um novo CSS para o Kanban

// Função auxiliar para reordenar dentro de uma coluna (se implementado)
const reorderList = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};


function LeadListPage() {
    const navigate = useNavigate();
    const [allLeads, setAllLeads] = useState([]); // Guarda todos os leads buscados
    const [leadStages, setLeadStages] = useState([]); // Lista de LeadStages ordenados
    const [leadsByStage, setLeadsByStage] = useState({}); // Objeto: { stageId: [leads...], ... }
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // ... (seus states existentes para filtros, paginação se for manter para uma visão de tabela alternativa)

    // Função para buscar todos os dados necessários
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Busca os estágios ordenados (o backend já deve retornar ordenado por 'ordem')
            const stagesData = await getLeadStages(); 
            const fetchedStages = stagesData.leadStages || stagesData.data || stagesData || [];
            setLeadStages(fetchedStages);

            // Busca todos os leads ativos (ou com paginação/filtros se preferir)
            // Para o Kanban, geralmente é melhor carregar todos os leads ativos de uma vez
            // Se forem muitos, considere filtros ou paginação por coluna.
            const leadsData = await getLeads(1, 1000, { /* filtros iniciais, ex: ativo: true */ });
            const fetchedLeads = leadsData.leads || [];
            setAllLeads(fetchedLeads);

            // Agrupa os leads por estágio
            const grouped = {};
            fetchedStages.forEach(stage => {
                grouped[stage._id] = []; // Inicializa um array para cada estágio
            });
            fetchedLeads.forEach(lead => {
                const stageId = lead.situacao?._id || lead.situacao; // Pega o ID da situação
                if (stageId && grouped[stageId]) {
                    grouped[stageId].push(lead);
                } else if (stageId) { // Caso raro: lead com situacao._id que não está na lista de stages (ex: stage inativo)
                    // grouped[stageId] = [lead]; // Ou crie uma coluna "Outros"
                    console.warn(`Lead ${lead._id} com situação ${stageId} não corresponde a um estágio ativo carregado.`);
                } else {
                    // Leads sem situação definida (pode ir para uma coluna "Não Triado" ou ser ignorado)
                    if (!grouped["sem_situacao"]) grouped["sem_situacao"] = [];
                    grouped["sem_situacao"].push(lead);
                }
            });

            // Ordena leads dentro de cada estágio (ex: por data de atualização)
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


    // Handler para quando um card é arrastado e solto
    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Soltou fora de uma coluna válida
        if (!destination) return;

        // Soltou na mesma posição na mesma coluna
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const startStageId = source.droppableId;
        const finishStageId = destination.droppableId;
        const leadId = draggableId;

        // Criando cópias dos arrays para manipulação otimista
        const startLeads = Array.from(leadsByStage[startStageId] || []);
        const finishLeads = startStageId === finishStageId ? startLeads : Array.from(leadsByStage[finishStageId] || []);
        
        const [movedLead] = startLeads.splice(source.index, 1); // Remove da coluna de origem

        // Se moveu para uma coluna diferente
        if (startStageId !== finishStageId) {
            finishLeads.splice(destination.index, 0, movedLead); // Adiciona na coluna de destino

            // Atualiza o estado local otimisticamente
            setLeadsByStage(prev => ({
                ...prev,
                [startStageId]: startLeads,
                [finishStageId]: finishLeads,
            }));

            // Chama a API para atualizar a situação do lead no backend
            try {
                toast.info(`Movendo lead ${movedLead.nome} para ${leadStages.find(s => s._id === finishStageId)?.nome || 'nova situação'}...`);
                await updateLead(leadId, { situacao: finishStageId }); // Envia o ID do novo estágio
                toast.success(`Lead "${movedLead.nome}" atualizado com sucesso!`);
                // Opcional: re-fetchData() para garantir consistência, ou confiar na atualização otimista
                // Se a API de updateLead retornar o lead atualizado, podemos usá-lo para atualizar o estado local com mais precisão.
                // Por agora, a atualização otimista é suficiente e o fetchData() no próximo load garante.
            } catch (err) {
                toast.error(err.message || "Falha ao atualizar situação do lead.");
                // Reverte a mudança otimista se a API falhar
                // (isso requer guardar o estado anterior ou chamar fetchData() )
                fetchData(); // Simplesmente recarrega tudo em caso de erro na API
            }
        } else {
            // Reordenando dentro da mesma coluna (opcional)
            // startLeads.splice(destination.index, 0, movedLead); // Reinsere na nova posição
            // setLeadsByStage(prev => ({
            //     ...prev,
            //     [startStageId]: startLeads,
            // }));
            // TODO: Se você quiser salvar a ordem dos leads dentro de um estágio,
            // precisaria de um campo 'ordemNoEstagio' no modelo Lead e uma API para atualizar isso.
            // Por enquanto, a ordenação é por 'updatedAt'.
            console.log("Lead reordenado dentro da mesma coluna (sem persistência de ordem no backend por enquanto).");
        }
    };


    if (isLoading) {
        return <div className="admin-page loading"><p>Carregando Leads e Situações...</p></div>;
    }
    if (error) {
        return <div className="admin-page error-page"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="admin-page lead-list-page kanban-board-page"> {/* Nova classe para Kanban */}
            <header className="page-header">
                <h1>Funil de Leads (Kanban)</h1>
                <Link to="/leads/novo" className="button primary-button">
                    + Novo Lead
                </Link>
            </header>
            <div className="page-content">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="kanban-container"> {/* Um container para as colunas */}
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
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`lead-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                                            onClick={() => navigate(`/leads/${lead._id}`)} // Navega para detalhes ao clicar
                                                        >
                                                            <h4>{lead.nome}</h4>
                                                            <p className="lead-card-contato">{lead.contato || 'Sem contato'}</p>
                                                            <p className="lead-card-email">{lead.email || 'Sem email'}</p>
                                                            {/* Adicionar mais infos úteis no card */}
                                                            <small className="lead-card-updated">Atualizado: {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}</small>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            {(!leadsByStage[stage._id] || leadsByStage[stage._id]?.length === 0) && (
                                                <p className="kanban-empty-column">Nenhum lead nesta situação.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                        {/* Coluna para leads sem situação, se houver */}
                        {leadsByStage["sem_situacao"] && leadsByStage["sem_situacao"].length > 0 && (
                             <Droppable droppableId="sem_situacao" key="sem_situacao">
                             {(provided, snapshot) => (
                                 <div ref={provided.innerRef} {...provided.droppableProps} className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}>
                                     <h3 className="kanban-column-title">Sem Situação ({leadsByStage["sem_situacao"].length})</h3>
                                     <div className="kanban-column-content">
                                         {leadsByStage["sem_situacao"].map((lead, index) => (
                                             <Draggable key={lead._id} draggableId={lead._id} index={index}>
                                                 {(providedCard) => ( /* ... render LeadCard ... */ 
                                                     <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps} className={`lead-card ${snapshot.isDragging ? 'dragging' : ''}`} onClick={() => navigate(`/leads/${lead._id}`)}>
                                                         <h4>{lead.nome}</h4>
                                                         <p>{lead.contato}</p>
                                                     </div>
                                                 )}
                                             </Draggable>
                                         ))}
                                         {provided.placeholder}
                                     </div>
                                 </div>
                             )}
                         </Droppable>
                        )}
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}
export default LeadListPage;