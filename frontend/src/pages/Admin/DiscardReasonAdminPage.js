import React, { useState, useEffect, useCallback } from "react";
import {
  getDiscardReasons,
  createDiscardReason,
  updateDiscardReason,
  deleteDiscardReason,
} from "../../api/discardReasons";
import { toast } from "react-toastify";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

// CSS exclusivo desta página
import "./DiscardReasonAdminPage.css";

function DiscardReasonAdminPage() {
  const [reasons, setReasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentReason, setCurrentReason] = useState(null);
  const [reasonName, setReasonName] = useState("");
  const [reasonDescription, setReasonDescription] = useState("");
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetReason, setDeleteTargetReason] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorState, setDeleteErrorState] = useState(null);

  const fetchReasons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDiscardReasons();
      setReasons(data || []);
    } catch (err) {
      const errorMsg = err.message || "Falha ao carregar motivos de descarte.";
      setError(errorMsg);
      toast.error(errorMsg);
      setReasons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  const handleOpenAddModal = () => {
    setCurrentReason(null);
    setReasonName("");
    setReasonDescription("");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (reason) => {
    setCurrentReason(reason);
    setReasonName(reason.nome || "");
    setReasonDescription(reason.descricao || "");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentReason(null);
    setReasonName("");
    setReasonDescription("");
    setFormError(null);
    setIsProcessingForm(false);
  };

  const handleSaveReason = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsProcessingForm(true);

    const reasonData = {
      nome: reasonName.trim(),
      descricao: (reasonDescription || "").trim() || null,
    };

    if (!reasonData.nome) {
      setFormError("O nome do motivo é obrigatório.");
      setIsProcessingForm(false);
      return;
    }

    try {
      if (currentReason && currentReason._id) {
        await updateDiscardReason(currentReason._id, reasonData);
        toast.success(`Motivo "${reasonData.nome}" atualizado!`);
      } else {
        await createDiscardReason(reasonData);
        toast.success(`Motivo "${reasonData.nome}" criado!`);
      }
      fetchReasons();
      handleCloseFormModal();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao salvar motivo.";
      setFormError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsProcessingForm(false);
    }
  };

  const handleOpenDeleteConfirm = (reason) => {
    setDeleteTargetReason(reason);
    setDeleteErrorState(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteTargetReason(null);
    setDeleteErrorState(null);
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetReason) return;
    setIsDeleting(true);
    setDeleteErrorState(null);
    try {
      const result = await deleteDiscardReason(deleteTargetReason._id);
      toast.success(result.message || "Motivo excluído!");
      handleCloseDeleteConfirm();
      fetchReasons();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao excluir motivo.";
      setDeleteErrorState(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dr-page">
      <div className="dr-page-inner">
        <h1>Gerenciar Motivos de Descarte</h1>

        <div className="dr-header-actions">
          <button
            onClick={handleOpenAddModal}
            className="dr-btn-primary"
            disabled={isFormModalOpen || isDeleteConfirmOpen}
          >
            + Adicionar Novo Motivo
          </button>
        </div>

        {isLoading && <p>Carregando motivos...</p>}
        {error && <p className="dr-error-message">{error}</p>}

        {!isLoading && !error && (
          <div className="dr-table-scroller">
            <div className="dr-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="col-nome">Nome</th>
                    <th className="col-descricao">Descrição</th>
                    <th className="col-data">Data Criação</th>
                    <th className="col-acoes" style={{ width: 200, textAlign: "right" }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reasons.map((reason) => (
                    <tr key={reason._id}>
                      <td className="dr-cell-strong col-nome">{reason.nome}</td>
                      <td className="col-descricao">{reason.descricao || "-"}</td>
                      <td className="col-data">
                        {reason.createdAt
                          ? new Date(reason.createdAt).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>
                      <td className="dr-cell-actions col-acoes">
                        <button
                          onClick={() => handleOpenEditModal(reason)}
                          className="dr-btn-ghost"
                          disabled={isFormModalOpen || isDeleteConfirmOpen}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleOpenDeleteConfirm(reason)}
                          className="dr-btn-danger"
                          disabled={isFormModalOpen || isDeleteConfirmOpen}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reasons.length === 0 && (
                    <tr>
                      <td colSpan="4">Nenhum motivo encontrado. Crie o primeiro!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isFormModalOpen && (
        <div className="dr-modal-overlay">
          <div className="dr-modal-card">
            <h2>{currentReason ? "Editar Motivo de Descarte" : "Adicionar Novo Motivo"}</h2>
            <form onSubmit={handleSaveReason} noValidate>
              <div className="dr-form-group">
                <label htmlFor="reasonName">Nome do Motivo *</label>
                <input
                  id="reasonName"
                  type="text"
                  value={reasonName}
                  onChange={(e) => setReasonName(e.target.value)}
                  placeholder="Digite o nome"
                  required
                  disabled={isProcessingForm}
                />
              </div>

              <div className="dr-form-group">
                <label htmlFor="reasonDescription">Descrição</label>
                <textarea
                  id="reasonDescription"
                  value={reasonDescription}
                  onChange={(e) => setReasonDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes sobre o motivo (opcional)"
                  disabled={isProcessingForm}
                />
              </div>

              {formError && <p className="dr-error-message dr-modal-error">{formError}</p>}

              <div className="dr-form-actions">
                <button type="submit" className="dr-btn-primary" disabled={isProcessingForm}>
                  {isProcessingForm
                    ? "Salvando..."
                    : currentReason
                    ? "Salvar Alterações"
                    : "Adicionar Motivo"}
                </button>
                <button
                  type="button"
                  className="dr-btn-outline"
                  onClick={handleCloseFormModal}
                  disabled={isProcessingForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o motivo "${
          deleteTargetReason?.nome || ""
        }"? Leads associados podem precisar ser atualizados.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteErrorState}
      />
    </div>
  );
}

export default DiscardReasonAdminPage;
