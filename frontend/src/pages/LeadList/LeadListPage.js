// src/pages/LeadList/LeadListPage.js

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

// Funções da API
import { getLeads, discardLead, updateLead, deleteLead } from "../../api/leads";
import { getSituacoes } from "../../api/situacoes";
import { getOrigens } from "../../api/origens";
import { getUsuarios } from "../../api/usuarios"; 

// Componentes
import LeadCard from "../../components/LeadCard/LeadCard";
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import LeadFilters from '../../components/LeadFilters/LeadFilters'; // Componente de filtros

// Estilos
import "./LeadListPage.css";

// Opcional: Notificações
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

function LeadListPage() {

  // State para Leads
  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true); // Loading específico para leads
  const [leadsError, setLeadsError] = useState(null); // Erro específico para leads

  // State para Opções dos Filtros/Dropdowns
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true); // Loading para as opções
  const [optionsError, setOptionsError] = useState(null); // Erro ao buscar opções

  // State para Filtros Ativos
  const [activeFilters, setActiveFilters] = useState({}); // Guarda o objeto de filtros atual

  // State para Modais e Ações
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);

  const [isReactivatingId, setIsReactivatingId] = useState(null);
  const [reactivateError, setReactivateError] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // State para forçar refresh da lista após ações
  const [refreshKey, setRefreshKey] = useState(0); // Incrementa para re-executar o useEffect de leads

  // --- EFEITO 1: Buscar opções para filtros (roda uma vez no mount) ---
  useEffect(() => {
    console.log("Buscando opções para filtros...");
    const fetchFilterOptions = async () => {
      setIsLoadingOptions(true);
      setOptionsError(null);
      try {
        const [situacoesData, origensData, usuariosData] = await Promise.all([
          getSituacoes(),
          getOrigens(),
          getUsuarios() // Certifique-se que a função e API estão corretas
        ]);
        setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
        setOrigensList(Array.isArray(origensData) ? origensData : []);
        setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
        if (!Array.isArray(situacoesData) || !Array.isArray(origensData) || !Array.isArray(usuariosData)) {
            console.warn("Uma ou mais APIs de opções não retornaram um array.");
        }
      } catch (err) {
        console.error("Falha ao buscar opções para filtros:", err);
        setOptionsError("Não foi possível carregar opções de filtro.");
        setSituacoesList([]); setOrigensList([]); setUsuariosList([]);
      } finally {
        setIsLoadingOptions(false);
      }
    };
    fetchFilterOptions();
  }, []); // Array vazio = roda só no mount


  // --- EFEITO 2: Buscar LEADS (roda no mount e quando activeFilters ou refreshKey mudam) ---
  useEffect(() => {
    console.log("Effect para buscar leads disparado. Filtros:", activeFilters, "RefreshKey:", refreshKey);
    const fetchFilteredLeads = async () => {
        setIsLoadingLeads(true);
        setLeadsError(null);
        try {
            console.log("Chamando getLeads com filtros:", activeFilters);
            const data = await getLeads(activeFilters); // Passa os filtros ativos para a API
            setLeads(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Falha ao buscar leads filtrados:", err);
            setLeadsError(err.message || 'Não foi possível carregar os leads.');
            setLeads([]);
        } finally {
            setIsLoadingLeads(false);
        }
    };
    fetchFilteredLeads();
  // Depende dos filtros ativos e da chave de refresh
  }, [activeFilters, refreshKey]);


  // --- Handler chamado pelo componente LeadFilters ---
  const handleFilterChange = useCallback((newFilters) => {
    console.log("LeadListPage: Atualizando filtros ativos:", newFilters);
    // O debounce já está no LeadFilters, aqui apenas atualizamos o state
    setActiveFilters(newFilters);
    // Não precisamos chamar fetchLeads aqui, o useEffect acima vai cuidar disso
  }, []); // useCallback para estabilizar a função


  // --- Handlers Modais e Ações (ajustados para usar refreshKey) ---
  const handleOpenDiscardModal = (id, nome) => {
    setDiscardTargetLead({ id, nome }); setDiscardError(null); setIsDiscardModalOpen(true);
  };
  const handleCloseDiscardModal = () => {
    if (!isDiscarding) { setDiscardTargetLead(null); setIsDiscardModalOpen(false); setDiscardError(null); }
  };
  const handleConfirmDiscard = async (discardData) => {
    if (!discardTargetLead) return; setIsDiscarding(true); setDiscardError(null);
    try {
      await discardLead(discardTargetLead.id, discardData);
      console.log(`Lead "${discardTargetLead.nome}" descartado.`);
      handleCloseDiscardModal();
      setRefreshKey(prevKey => prevKey + 1); // <<< Força re-busca de leads
      // toast.success(...)
    } catch (err) { setDiscardError(err.message || "Falha"); console.error(err); }
    finally { setIsDiscarding(false); }
  };

  const handleReactivateLead = async (id) => {
    if (isReactivatingId) return;
    const situacaoAtendimento = situacoesList.find(s => s.nome === "Em Atendimento");
    if (!situacaoAtendimento) { setReactivateError("Status 'Em Atendimento' não encontrado."); return; }
    setIsReactivatingId(id); setReactivateError(null);
    try {
      await updateLead(id, { situacao: situacaoAtendimento._id });
      console.log(`Lead ${id} reativado.`);
      setRefreshKey(prevKey => prevKey + 1); // <<< Força re-busca de leads
      // toast.success(...)
    } catch (err) { setReactivateError(err.message || "Falha"); console.error(err); }
    finally { setIsReactivatingId(null); }
  };

  const handleOpenDeleteModal = (id, nome) => {
    setDeleteTargetLead({ id, nome }); setDeleteError(null); setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    if (!isDeleting) { setDeleteTargetLead(null); setIsDeleteModalOpen(false); setDeleteError(null); }
  };
  const handleConfirmDelete = async () => {
    if (!deleteTargetLead) return; setIsDeleting(true); setDeleteError(null);
    try {
      await deleteLead(deleteTargetLead.id);
      console.log(`Lead "${deleteTargetLead.nome}" excluído.`);
      handleCloseDeleteModal();
      setRefreshKey(prevKey => prevKey + 1); // <<< Força re-busca de leads
      // toast.success(...)
    } catch (err) { setDeleteError(err.message || "Falha"); console.error(err); }
    finally { setIsDeleting(false); }
  };
  // --- Fim Handlers ---


  return (
    <div className="lead-list-page">
      {/* <ToastContainer /> */}
      <h1>Meus Leads</h1>

       {/* Exibe erros gerais (opções ou leads) */}
       {optionsError && <div className="error-message">Erro ao carregar opções: {optionsError}</div>}
       {/* leadsError é exibido abaixo, perto da lista */}
       {reactivateError && <div className="error-message">Erro ao reativar: {reactivateError}</div>}


      <div className="add-lead-button-container">
         <Link to="/leads/novo" className="add-lead-button">Cadastrar Novo Lead</Link>
      </div>

      {/* Renderiza Filtros APENAS se as opções carregaram sem erro */}
      {isLoadingOptions && <div className="loading-message">Carregando opções de filtro...</div>}
      {!isLoadingOptions && !optionsError && (
         <LeadFilters
             situacoesList={situacoesList}
             origensList={origensList} // Passa a lista de origens
             usuariosList={usuariosList} // Passa a lista de usuários
             onFilterChange={handleFilterChange} // Passa o handler para receber filtros
             // Desabilita filtros enquanto carrega os leads (resultado do filtro)
             isProcessing={isLoadingLeads}
         />
      )}

      {/* Mostra loading se estiver carregando leads */}
      {isLoadingLeads && <div className="loading-message">Buscando leads...</div>}

      {/* Mostra erro de leads, se houver */}
      {!isLoadingLeads && leadsError && <div className="error-message">Erro ao carregar leads: {leadsError}</div>}


      {/* Mostra lista de Leads apenas se NÂO estiver carregando E não houver erro de leads E opções carregadas */}
      {!isLoadingLeads && !leadsError && !isLoadingOptions && (
        <div className="leads-container">
          {leads.length > 0 ? (
            leads.map((lead) => (
              <LeadCard
                key={lead._id}
                lead={lead}
                onDiscardClick={handleOpenDiscardModal}
                onReactivateClick={handleReactivateLead}
                isProcessingReactivation={isReactivatingId === lead._id}
                onDeleteClick={handleOpenDeleteModal} // Passando o handler de delete
              />
            ))
          ) : (
            <p className="no-leads-message">
                {Object.keys(activeFilters).length > 0 ? 'Nenhum lead encontrado com os filtros aplicados.' : 'Nenhum lead cadastrado no momento.'}
            </p>
          )}
        </div>
      )}

      {/* Modais */}
      <DiscardLeadModal
        isOpen={isDiscardModalOpen}
        onClose={handleCloseDiscardModal}
        onSubmit={handleConfirmDiscard}
        leadName={discardTargetLead?.nome}
        isProcessing={isDiscarding}
        errorMessage={discardError}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir permanentemente o lead "${deleteTargetLead?.nome || ''}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Permanentemente"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteError}
      />

    </div>
  );
}

export default LeadListPage;