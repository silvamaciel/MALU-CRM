// src/pages/LeadDetail/LeadDetailPage.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// APIs
import {
  getLeadById as getLeadByIdApi,
  updateLead,
  discardLead,
  deleteLead,
  getLeadHistory,
} from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";

// Chat APIs
import {
  listConversationsApi,
  getMessagesApi,
  sendMessageApi,
} from "../../api/chatApi";

// Componentes existentes
import DiscardLeadModal from "../../components/DiscardLeadModal/DiscardLeadModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import ReservaFormModal from "./ReservaFormModal";
import LeadInfo from "./components/LeadInfo";
import LeadHistory from "./components/LeadHistory";
import TaskList from "../../components/TaskList/TaskList";

// Chat UI (seus componentes)
import ChatWindow from "../../pages/ChatPage/componentes/ChatWindow";

// Estilos
import "./LeadDetailPage.css";
import "../../components/TaskList/styleTaskList.css"; // mantém o seu arquivo atual

// ------------------------------------
// Painel de Chat específico do Lead
// (carrega só a conversa vinculada ao lead atual)
// ------------------------------------
function LeadChatPane({ leadId }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [beforeCursor, setBeforeCursor] = useState(null);

  // Busca única conversa vinculada ao lead
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const convResult = await listConversationsApi({ leadId, limit: 1 });
        const conv = (convResult.items || [])[0] || null;
        if (!mounted) return;

        setConversation(conv || null);

        if (conv?._id) {
          // carrega últimas mensagens
          const { items, nextBefore } = await getMessagesApi(conv._id, { limit: 40 });
          if (!mounted) return;
          setMessages(items || []);
          setHasMore(!!nextBefore);
          setBeforeCursor(nextBefore);
        } else {
          setMessages([]);
          setHasMore(false);
          setBeforeCursor(null);
        }
      } catch (e) {
        console.error("Erro ao carregar chat do lead:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [leadId]);

  const onLoadOlderMessages = useCallback(async () => {
    if (!conversation?._id || !hasMore || !beforeCursor) return;
    const { items, nextBefore } = await getMessagesApi(conversation._id, {
      limit: 30,
      before: beforeCursor,
    });
    setMessages(prev => [...(items || []), ...prev]); // prepend
    setHasMore(!!nextBefore);
    setBeforeCursor(nextBefore);
  }, [conversation?._id, hasMore, beforeCursor]);

  const onSendMessage = useCallback(
    async (text) => {
      if (!conversation?._id || !text?.trim()) return;
      try {
        const sent = await sendMessageApi(conversation._id, text.trim());
        // Se o backend já devolve a mensagem “completa”, basta dar append:
        setMessages(prev => [...prev, sent]);
      } catch (err) {
        console.error("Falha ao enviar mensagem:", err);
      }
    },
    [conversation?._id]
  );

  // O ChatWindow é o seu componente visual (bolhas, input, etc)
  return (
    <div className="chat-card">
      <ChatWindow
        conversation={conversation}
        messages={messages}
        loading={loading}
        onSendMessage={onSendMessage}
        onLoadOlderMessages={onLoadOlderMessages}
        hasMoreMessages={hasMore}
      />
    </div>
  );
}

// ------------------------------------
// Página de Detalhe do Lead (2 colunas)
// ------------------------------------
function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [leadDetails, setLeadDetails] = useState(null);
  const [situacoesList, setSituacoesList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState(null);

  // ações/modais
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);

  // Right-pane: abas
  const [activeTab, setActiveTab] = useState("info"); // "info" | "tasks" | "history"

  const fetchAll = useCallback(async () => {
    if (!id) {
      setError("ID inválido.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsLoadingHistory(true);
    try {
      const [leadData, situacoesData, historyData] = await Promise.all([
        getLeadByIdApi(id),
        getLeadStages(),
        getLeadHistory(id),
      ]);
      setLeadDetails(leadData);
      setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
      setHistoryList(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      const errorMessage = err.message || "Falha ao carregar dados.";
      setError(errorMessage);
      setLeadDetails(null);
      setSituacoesList([]);
      setHistoryList([]);
    } finally {
      setIsLoading(false);
      setIsLoadingHistory(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const canShowReactivate = useMemo(() => {
    const n = leadDetails?.situacao?.nome?.toLowerCase?.() || "";
    return n === "descartado";
  }, [leadDetails]);

  // --------- Handlers topo ----------
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
      // toast… se estiver usando
      setIsDiscardModalOpen(false);
      fetchAll();
    } catch (err) {
      const errorMsg = err.message || "Falha ao descartar.";
      setDiscardError(errorMsg);
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleReactivateLead = async () => {
    const situacaoAtendimento =
      situacoesList.find(s => s.nome === "Em Atendimento") ||
      situacoesList.find(s => s.nome === "Novo");
    if (!situacaoAtendimento) return;

    try {
      await updateLead(leadDetails._id, { situacao: situacaoAtendimento._id });
      fetchAll();
    } catch (err) {
      console.error(err);
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
      setIsDeleteModalOpen(false);
      navigate("/leads");
    } catch (err) {
      setDeleteError(err.message || "Falha ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenReservaModal = () => setIsReservaModalOpen(true);
  const handleCloseReservaModal = (ok = false) => {
    setIsReservaModalOpen(false);
    if (ok) fetchAll();
  };

  if (isLoading && !leadDetails) return <div className="lead-detail-page loading">Carregando...</div>;
  if (error && !leadDetails) return <div className="lead-detail-page error-page">{error}</div>;
  if (!leadDetails) return <div className="lead-detail-page error-page">Lead não encontrado.</div>;

  return (
    <div className="lead-detail-page">

      {/* COLUNA ESQUERDA: CHAT */}
      <section className="left-pane">
        <LeadChatPane leadId={leadDetails._id} />
      </section>

      {/* COLUNA DIREITA: AÇÕES + ABAS */}
      <section className="right-pane">

        {/* Barra de ações */}
        <div className="toolbar">
          <button className="btn ghost" onClick={() => navigate(`/leads/${id}/editar`)}>
            <span className="i">✏️</span> Editar
          </button>

          <button className="btn ghost" onClick={handleOpenDiscardModal}>
            <span className="i">🗃️</span> Descartar
          </button>

          <button className="btn danger" onClick={handleOpenDeleteModal}>
            <span className="i">🗑️</span> Excluir
          </button>

          <button className="btn primary" onClick={handleOpenReservaModal}>
            <span className="i">📌</span> Criar Reserva
          </button>

          {canShowReactivate && (
            <button className="btn success" onClick={handleReactivateLead}>
              <span className="i">🔄</span> Reativar
            </button>
          )}
        </div>

        {/* Abas */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            <span className="i">🛈</span> Informações
          </button>
          <button
            className={`tab ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <span className="i">✅</span> Tarefas
          </button>
          <button
            className={`tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <span className="i">🕑</span> Histórico
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="tab-panels">
          {activeTab === "info" && (
            <div className="panel card">
              <LeadInfo leadDetails={leadDetails} />
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="panel card tasks-card">
              <TaskList
                filters={{ lead: id }}
                currentLeadId={id}
              />
            </div>
          )}

          {activeTab === "history" && (
            <div className="panel card">
              <LeadHistory
                historyList={historyList}
                isLoadingHistory={isLoadingHistory}
                historyError={null}
                leadDetails={leadDetails}
                onTagsUpdated={fetchAll}
              />
            </div>
          )}
        </div>
      </section>

      {/* Modais */}
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
        message={`Excluir permanentemente o lead "${deleteTargetLead?.nome || ""}"?`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteError}
      />

      {isReservaModalOpen && (
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
