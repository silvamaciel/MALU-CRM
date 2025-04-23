// src/pages/LeadList/LeadListPage.js

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactPaginate from 'react-paginate'; // Importar react-paginate

// Funções da API
import { getLeads, discardLead, updateLead, deleteLead } from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";
import { getOrigens } from "../../api/origens";
// !!! ATENÇÃO: Verifique se o nome do arquivo/caminho está correto !!!
import { getUsuarios } from "../../api/usuarios"; // ou '../../api/users'

// Componentes
import LeadCard from "../../components/LeadCard/LeadCard";
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import LeadFilters from '../../components/LeadFilters/LeadFilters';

// Estilos (Inclua estilos para .pagination-container aqui ou em App.css)
import "./LeadListPage.css";

// Toastify
import { toast } from 'react-toastify';
// O <ToastContainer /> deve estar no App.js

// Constante para itens por página
const LEADS_PER_PAGE = 10; // Ajuste conforme necessário

function LeadListPage() {

  // --- State Management ---

  // Leads Data
  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState(null);

  // Filter Dropdown Options Data
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  // Active Filters
  const [activeFilters, setActiveFilters] = useState({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0); // Para informação, se necessário

  // Discard Modal State
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardTargetLead, setDiscardTargetLead] = useState(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);

  // Reactivate State
  const [isReactivatingId, setIsReactivatingId] = useState(null);
  // Erro de reativação agora é tratado via toast

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Refresh Trigger State
  const [refreshKey, setRefreshKey] = useState(0); // Usado para forçar re-busca após ações

  // --- Data Fetching Effects ---

  // Efeito 1: Buscar opções para filtros (roda uma vez no mount)
  useEffect(() => {
    console.log("Buscando opções para filtros...");
    const fetchFilterOptions = async () => {
      setIsLoadingOptions(true); setOptionsError(null);
      try {
         const [situacoesData, origensData, usuariosData] = await Promise.all([
            getLeadStages(), getOrigens(), getUsuarios() // Chamadas API
         ]);
         // Define os estados com os dados ou arrays vazios em caso de falha parcial
         setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
         setOrigensList(Array.isArray(origensData) ? origensData : []);
         setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
         if (!Array.isArray(situacoesData) || !Array.isArray(origensData) || !Array.isArray(usuariosData)) {
             console.warn("Uma ou mais APIs de opções não retornaram um array.");
         }
      } catch (err) {
         console.error("Falha ao buscar opções para filtros:", err);
         setOptionsError("Não foi possível carregar opções de filtro."); // Define erro geral
         setSituacoesList([]); setOrigensList([]); setUsuariosList([]); // Garante arrays vazios
      } finally {
         setIsLoadingOptions(false); // Finaliza loading das opções
      }
    };
    fetchFilterOptions();
  }, []); // Dependência vazia: roda só na montagem


  // Efeito 2: Buscar LEADS (roda quando filtros, página ou refreshKey mudam)
  useEffect(() => {
    console.log(`Effect leads: Página=${currentPage}, Filtros:`, activeFilters, "Refresh:", refreshKey);
    const fetchFilteredLeads = async () => {
        setIsLoadingLeads(true); // Inicia loading dos leads
        setLeadsError(null); // Limpa erro anterior dos leads
        try {
            const params = {
                ...activeFilters,
                page: currentPage,
                limit: LEADS_PER_PAGE
            };
            const data = await getLeads(params); // Busca leads com filtros e paginação

            // Atualiza states com dados da resposta paginada
            setLeads(data.leads || []);
            setTotalLeads(data.totalLeads || 0);
            setTotalPages(data.totalPages || 0);
            // Ajusta currentPage se backend retornar diferente (segurança)
            if(data.currentPage && data.currentPage !== currentPage) {
                setCurrentPage(data.currentPage);
            }

        } catch (err) {
            console.error("Falha ao buscar leads filtrados:", err);
            setLeadsError(err.message || 'Não foi possível carregar os leads.');
            setLeads([]); setTotalPages(0); setTotalLeads(0); // Reseta em caso de erro
        } finally {
            setIsLoadingLeads(false); // Finaliza loading dos leads
        }
    };
    fetchFilteredLeads();
  }, [activeFilters, refreshKey, currentPage]); // Dependências corretas


  // --- Handlers ---

  // Handler para mudança nos filtros (recebe de LeadFilters)
  const handleFilterChange = useCallback((newFilters) => {
    setCurrentPage(1); // <<< IMPORTANTE: Reseta para página 1 ao aplicar novos filtros
    setActiveFilters(newFilters);
  }, []); // Não precisa de dependências extras

  // Handler para clique na paginação (recebe de ReactPaginate)
  const handlePageClick = useCallback((event) => {
    const newPage = event.selected + 1; // react-paginate usa índice 0
    setCurrentPage(newPage);
    // Opcional: Scroll para o topo
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []); // Não precisa de dependências extras

  // Função para forçar refresh (usada após ações)
  const forceRefresh = useCallback(() => setRefreshKey(prevKey => prevKey + 1), []);

  // Handlers para Modal de Descarte
  const handleOpenDiscardModal = useCallback((id, nome) => {
    setDiscardTargetLead({ id, nome }); setDiscardError(null); setIsDiscardModalOpen(true);
  }, []);
  const handleCloseDiscardModal = useCallback(() => {
    if (!isDiscarding) { setDiscardTargetLead(null); setIsDiscardModalOpen(false); setDiscardError(null); }
  }, [isDiscarding]);
  const handleConfirmDiscard = useCallback(async (discardData) => {
    if (!discardTargetLead) return; setIsDiscarding(true); setDiscardError(null);
    try {
      await discardLead(discardTargetLead.id, discardData);
      toast.success(`Lead "${discardTargetLead.nome}" descartado!`);
      handleCloseDiscardModal();
      forceRefresh(); // Atualiza a lista
    } catch (err) {
      const errorMsg = err.message || "Falha ao descartar."; console.error(err);
      setDiscardError(errorMsg); toast.error(errorMsg);
    } finally { setIsDiscarding(false); }
  }, [discardTargetLead, handleCloseDiscardModal, forceRefresh]);

  // Handler para Reativar Lead
  const handleReactivateLead = useCallback(async (id) => {
    if (isReactivatingId) return;
    const situacaoAtendimento = situacoesList.find(s => s.nome === "Em Atendimento"); // Nome exato!
    if (!situacaoAtendimento) { toast.error("Erro: Status 'Em Atendimento' não encontrado."); return; }
    setIsReactivatingId(id);
    try {
      const leadReativado = await updateLead(id, { situacao: situacaoAtendimento._id });
      toast.success(`Lead "${leadReativado?.nome || id}" reativado!`);
      forceRefresh(); // Atualiza a lista
    } catch (err) { toast.error(err.message || "Falha ao reativar."); console.error(err); }
    finally { setIsReactivatingId(null); }
  }, [isReactivatingId, situacoesList, forceRefresh]); // Adicionado forceRefresh

  // Handlers para Modal de Exclusão
  const handleOpenDeleteModal = useCallback((id, nome) => {
    setDeleteTargetLead({ id, nome }); setDeleteError(null); setIsDeleteModalOpen(true);
  }, []);
  const handleCloseDeleteModal = useCallback(() => {
    if (!isDeleting) { setDeleteTargetLead(null); setIsDeleteModalOpen(false); setDeleteError(null); }
  }, [isDeleting]);
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetLead) return; setIsDeleting(true); setDeleteError(null);
    try {
      await deleteLead(deleteTargetLead.id);
      const tempName = deleteTargetLead.nome;
      handleCloseDeleteModal();
      toast.success(`Lead "${tempName}" excluído!`);
      forceRefresh(); // Atualiza a lista
    } catch (err) {
      const errorMsg = err.message || "Falha ao excluir."; console.error(err);
      setDeleteError(errorMsg); toast.error(errorMsg);
    } finally { setIsDeleting(false); }
  }, [deleteTargetLead, handleCloseDeleteModal, forceRefresh]); // Adicionado forceRefresh
  // --- Fim Handlers ---


  // --- Renderização ---
  return (
    <div className="lead-list-page">
      {/* O ToastContainer fica no App.js */}
      <h1>Meus Leads</h1>

      {/* Mensagens de Erro Gerais */}
      {optionsError && <div className="error-message">Erro ao carregar opções: {optionsError}</div>}
      {/* Erro de reativação é tratado via toast */}

      {/* Botão Novo Lead */}
      <div className="add-lead-button-container">
         <Link to="/leads/novo" className="add-lead-button">Cadastrar Novo Lead</Link>
      </div>

      {/* Filtros */}
      {isLoadingOptions && <div className="loading-message">Carregando opções de filtro...</div>}
      {!isLoadingOptions && !optionsError && (
         <LeadFilters
             situacoesList={situacoesList}
             origensList={origensList}
             usuariosList={usuariosList}
             onFilterChange={handleFilterChange}
             isProcessing={isLoadingLeads} // Desabilita filtros enquanto busca leads
         />
      )}

      {/* Loading/Erro dos Leads */}
      {isLoadingLeads && !isLoadingOptions && <div className="loading-message">Buscando leads...</div>} {/* Só mostra se opções já carregaram */}
      {!isLoadingLeads && leadsError && <div className="error-message">Erro ao carregar leads: {leadsError}</div>}

      {/* Lista de Leads e Paginação */}
      {!isLoadingLeads && !leadsError && !isLoadingOptions && (

        
        <> {/* Fragmento para agrupar lista e paginação */}
        <strong>{totalLeads}</strong> {totalLeads === 1 ? 'lead encontrado' : 'leads encontrados'}

            <div className="leads-container">
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={lead}
                    onDiscardClick={handleOpenDiscardModal}
                    onReactivateClick={handleReactivateLead}
                    isProcessingReactivation={isReactivatingId === lead._id}
                    onDeleteClick={handleOpenDeleteModal} // Passando o handler correto
                  />
                ))
              ) : (
                <p className="no-leads-message">
                    {Object.keys(activeFilters).length > 0 ? 'Nenhum lead encontrado com os filtros aplicados.' : 'Nenhum lead cadastrado.'}
                </p>
              )}
            </div>

            {/* Componente de Paginação */}
            {totalPages > 1 && (
            <ReactPaginate
                previousLabel={'< Anterior'}
                nextLabel={'Próximo >'}
                breakLabel={'...'}
                pageCount={totalPages}
                marginPagesDisplayed={2}
                pageRangeDisplayed={3}
                onPageChange={handlePageClick} // Handler para mudança de página
                containerClassName={'pagination-container'} // Classe CSS para estilização
                pageClassName={'page-item'}
                pageLinkClassName={'page-link'}
                previousClassName={'page-item'}
                previousLinkClassName={'page-link'}
                nextClassName={'page-item'}
                nextLinkClassName={'page-link'}
                breakClassName={'page-item'}
                breakLinkClassName={'page-link'}
                activeClassName={'active'} // Classe para página ativa
                forcePage={currentPage - 1} // Sincroniza com o estado (lembrar que é 0-based)
                renderOnZeroPageCount={null}
            />
            )}
            {/* Fim Paginação */}
        </>
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