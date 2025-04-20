// src/pages/LeadList/LeadListPage.js

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

// Funções da API
import { getLeads, discardLead, updateLead, deleteLead } from "../../api/leads";
import { getSituacoes } from "../../api/situacoes";
import { getOrigens } from "../../api/origens";
// Verifique se o import/arquivo é 'users' ou 'usuarios'
import { getUsuarios } from "../../api/usuarios"; // <--- VERIFIQUE ESTE CAMINHO/NOME

// Componentes
import LeadCard from "../../components/LeadCard/LeadCard";
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import LeadFilters from '../../components/LeadFilters/LeadFilters';

// Estilos
import "./LeadListPage.css";

// Toastify
import { toast } from 'react-toastify';
// O <ToastContainer /> deve estar no App.js

function LeadListPage() {

  // State Leads
  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState(null);

  // State Opções Filtro
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  // State Filtros Ativos
  const [activeFilters, setActiveFilters] = useState({});

  // State Modais e Ações
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);

  const [isReactivatingId, setIsReactivatingId] = useState(null);
  // Erro de reativação agora é tratado via toast

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // State Refresh Key
  const [refreshKey, setRefreshKey] = useState(0);

  // --- EFEITO 1: Buscar opções ---
  useEffect(() => {
    console.log("Buscando opções para filtros...");
    const fetchFilterOptions = async () => {
      setIsLoadingOptions(true); setOptionsError(null);
      try {
         const [situacoesData, origensData, usuariosData] = await Promise.all([
            getSituacoes(), getOrigens(), getUsuarios()
         ]);
         setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
         setOrigensList(Array.isArray(origensData) ? origensData : []);
         setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
         if (!Array.isArray(situacoesData) || !Array.isArray(origensData) || !Array.isArray(usuariosData)) {
             console.warn("Uma ou mais APIs de opções não retornaram um array.");
         }
      } catch (err) {
         console.error("Falha ao buscar opções:", err);
         setOptionsError("Não foi possível carregar opções de filtro.");
         setSituacoesList([]); setOrigensList([]); setUsuariosList([]);
      } finally { setIsLoadingOptions(false); }
    };
    fetchFilterOptions();
  }, []);


  // --- EFEITO 2: Buscar LEADS filtrados ---
  useEffect(() => {
    console.log("Effect leads: Filtros:", activeFilters, "Refresh:", refreshKey);
    const fetchFilteredLeads = async () => {
        setIsLoadingLeads(true); setLeadsError(null);
        try {
            const data = await getLeads(activeFilters);
            setLeads(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Falha ao buscar leads:", err);
            setLeadsError(err.message || 'Falha ao carregar.'); setLeads([]);
        } finally { setIsLoadingLeads(false); }
    };
    fetchFilteredLeads();
  }, [activeFilters, refreshKey]);


  // --- Handler Filtros ---
  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);


  // --- Handlers Modais e Ações ---

  // Handlers Descarte
  const handleOpenDiscardModal = useCallback((id, nome) => { // Adicionado useCallback
    setDiscardTargetLead({ id, nome });
    setDiscardError(null);
    setIsDiscardModalOpen(true);
  }, []); // Sem dependências, apenas define state

  const handleCloseDiscardModal = useCallback(() => { // Adicionado useCallback
    if (!isDiscarding) {
      setDiscardTargetLead(null);
      setIsDiscardModalOpen(false);
      setDiscardError(null);
    }
  }, [isDiscarding]); // Depende de isDiscarding

  const handleConfirmDiscard = useCallback(async (discardData) => { // Adicionado useCallback
    if (!discardTargetLead) return;
    setIsDiscarding(true); setDiscardError(null);
    try {
      await discardLead(discardTargetLead.id, discardData);
      toast.success(`Lead "${discardTargetLead.nome}" descartado!`);
      handleCloseDiscardModal(); // Chama o handler de fechar
      setRefreshKey(prevKey => prevKey + 1);
    } catch (err) {
      const errorMsg = err.message || "Falha ao descartar.";
      console.error("Erro ao confirmar descarte:", err);
      setDiscardError(errorMsg);
      toast.error(errorMsg);
    } finally { setIsDiscarding(false); }
  }, [discardTargetLead, handleCloseDiscardModal]); // Depende do target e do handler de fechar

  // Handler Reativação
  const handleReactivateLead = useCallback(async (id) => { // Adicionado useCallback
    if (isReactivatingId) return;
    const situacaoAtendimento = situacoesList.find(s => s.nome === "Em Atendimento");
    if (!situacaoAtendimento) {
       const errorMsg = "Erro: Status 'Em Atendimento' não encontrado.";
       console.error(errorMsg);
       toast.error(errorMsg);
       return;
    }
    setIsReactivatingId(id);
    try {
      const leadReativado = await updateLead(id, { situacao: situacaoAtendimento._id });
      toast.success(`Lead "${leadReativado?.nome || id}" reativado!`);
      setRefreshKey(prevKey => prevKey + 1);
    } catch (err) {
      console.error(`Erro ao reativar lead ${id}:`, err);
      toast.error(err.message || "Falha ao reativar.");
    } finally { setIsReactivatingId(null); }
  }, [isReactivatingId, situacoesList]); // Depende de situacoesList

  // Handlers Exclusão
  const handleOpenDeleteModal = useCallback((id, nome) => { // Adicionado useCallback
    setDeleteTargetLead({ id, nome });
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  }, []); // Sem dependências

  const handleCloseDeleteModal = useCallback(() => { // Adicionado useCallback
    if (!isDeleting) {
      setDeleteTargetLead(null);
      setIsDeleteModalOpen(false);
      setDeleteError(null);
    }
  }, [isDeleting]); // Depende de isDeleting

  const handleConfirmDelete = useCallback(async () => { // Adicionado useCallback
    if (!deleteTargetLead) return;
    setIsDeleting(true); setDeleteError(null);
    try {
      await deleteLead(deleteTargetLead.id);
      const tempName = deleteTargetLead.nome; // Guarda antes de fechar e limpar o target
      handleCloseDeleteModal(); // Chama o handler de fechar
      toast.success(`Lead "${tempName}" excluído permanentemente!`);
      setRefreshKey(prevKey => prevKey + 1);
    } catch (err) {
      const errorMsg = err.message || "Falha ao excluir.";
      console.error("Erro ao confirmar exclusão:", err);
      setDeleteError(errorMsg);
      toast.error(errorMsg);
    } finally { setIsDeleting(false); }
  }, [deleteTargetLead, handleCloseDeleteModal]); // Depende do target e do handler de fechar
  // --- Fim Handlers ---


  return (
    <div className="lead-list-page">
      {/* O ToastContainer fica no App.js */}
      <h1>Meus Leads</h1>

      {/* Exibe erros */}
      {optionsError && <div className="error-message">Erro ao carregar opções: {optionsError}</div>}
      {/* Erro de reativação é tratado via toast */}

      <div className="add-lead-button-container">
         <Link to="/leads/novo" className="add-lead-button">Cadastrar Novo Lead</Link>
      </div>

      {/* Renderiza Filtros */}
      {isLoadingOptions && <div className="loading-message">Carregando opções de filtro...</div>}
      {!isLoadingOptions && !optionsError && (
         <LeadFilters
             situacoesList={situacoesList}
             origensList={origensList}
             usuariosList={usuariosList}
             onFilterChange={handleFilterChange}
             isProcessing={isLoadingLeads}
         />
      )}

      {/* Loading/Erro dos Leads */}
      {isLoadingLeads && <div className="loading-message">Buscando leads...</div>}
      {!isLoadingLeads && leadsError && <div className="error-message">Erro ao carregar leads: {leadsError}</div>}

      {/* Lista de Leads */}
      {!isLoadingLeads && !leadsError && !isLoadingOptions && (
        <div className="leads-container">
          {leads.length > 0 ? (
            leads.map((lead) => (
              <LeadCard
                key={lead._id}
                lead={lead}
                onDiscardClick={handleOpenDiscardModal} // Passa handler de abrir modal descarte
                onReactivateClick={handleReactivateLead} // Passa handler de reativar
                isProcessingReactivation={isReactivatingId === lead._id} // Passa estado de processamento
                onDeleteClick={handleOpenDeleteModal} // Passa handler de abrir modal exclusão
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
        onClose={handleCloseDiscardModal} // Passa handler de fechar
        onSubmit={handleConfirmDiscard} // Passa handler de confirmar
        leadName={discardTargetLead?.nome}
        isProcessing={isDiscarding}
        errorMessage={discardError}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal} // Passa handler de fechar
        onConfirm={handleConfirmDelete} // Passa handler de confirmar
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