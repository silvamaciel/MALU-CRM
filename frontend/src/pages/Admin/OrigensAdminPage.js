import React, { useState, useEffect, useCallback } from "react";
import { getOrigens, createOrigem, updateOrigem, deleteOrigem } from "../../api/origens";
import { toast } from "react-toastify";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import "./OrigensAdminPage.css";

function OrigensAdminPage() {
  const [origins, setOrigins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState(null);
  const [originName, setOriginName] = useState("");
  const [originDescription, setOriginDescription] = useState("");
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetOrigin, setDeleteTargetOrigin] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorState, setDeleteErrorState] = useState(null);

  const fetchOrigins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOrigens();
      setOrigins(data || []);
    } catch (err) {
      const errorMsg = err.message || "Falha ao carregar origens.";
      setError(errorMsg);
      toast.error(errorMsg);
      setOrigins([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrigins();
  }, [fetchOrigins]);

  const handleOpenAddModal = () => {
    setCurrentOrigin(null);
    setOriginName("");
    setOriginDescription("");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (origin) => {
    setCurrentOrigin(origin);
    setOriginName(origin.nome || "");
    setOriginDescription(origin.descricao || "");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentOrigin(null);
    setOriginName("");
    setOriginDescription("");
    setFormError(null);
    setIsProcessingForm(false);
  };

  const handleSaveOrigin = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsProcessingForm(true);

    const originData = {
      nome: originName.trim(),
      descricao: (originDescription || "").trim() || null,
    };

    if (!originData.nome) {
      setFormError("O nome da origem é obrigatório.");
      setIsProcessingForm(false);
      return;
    }

    try {
      if (currentOrigin && currentOrigin._id) {
        await updateOrigem(currentOrigin._id, originData);
        toast.success(`Origem "${originData.nome}" atualizada!`);
      } else {
        await createOrigem(originData);
        toast.success(`Origem "${originData.nome}" criada!`);
      }
      fetchOrigins();
      handleCloseFormModal();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao salvar origem.";
      setFormError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsProcessingForm(false);
    }
  };

  const handleOpenDeleteConfirm = (origin) => {
    setDeleteTargetOrigin(origin);
    setDeleteErrorState(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteTargetOrigin(null);
    setDeleteErrorState(null);
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetOrigin) return;
    setIsDeleting(true);
    setDeleteErrorState(null);
    try {
      const result = await deleteOrigem(deleteTargetOrigin._id);
      toast.success(result.message || "Origem excluída!");
      handleCloseDeleteConfirm();
      fetchOrigins();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao excluir origem.";
      setDeleteErrorState(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="org-page">
      <div className="org-page-inner">
        <h1>Gerenciar Origens de Lead</h1>

        <div className="org-header-actions">
          <button
            onClick={handleOpenAddModal}
            className="org-btn-primary"
            disabled={isFormModalOpen || isDeleteConfirmOpen}
          >
            + Adicionar Nova Origem
          </button>
        </div>

        {isLoading && <p>Carregando origens...</p>}
        {error && <p className="org-error-message">{error}</p>}

        {!isLoading && !error && (
          <div className="org-table-scroller">
            <div className="org-table-wrap">
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
                  {origins.map((origin) => (
                    <tr key={origin._id}>
                      <td className="org-cell-name col-nome">{origin.nome}</td>
                      <td className="col-descricao">{origin.descricao || "-"}</td>
                      <td className="col-data">
                        {origin.createdAt
                          ? new Date(origin.createdAt).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>
                      <td className="org-cell-actions col-acoes">
                        <button
                          onClick={() => handleOpenEditModal(origin)}
                          className="org-btn-ghost"
                          disabled={isFormModalOpen || isDeleteConfirmOpen}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleOpenDeleteConfirm(origin)}
                          className="org-btn-danger"
                          disabled={isFormModalOpen || isDeleteConfirmOpen}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {origins.length === 0 && (
                    <tr>
                      <td colSpan="4">Nenhuma origem encontrada. Crie a primeira!</td>
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
        <div className="org-modal-overlay">
          <div className="org-modal-card">
            <h2>{currentOrigin ? "Editar Origem" : "Adicionar Nova Origem"}</h2>
            <form onSubmit={handleSaveOrigin} noValidate>
              <div className="org-form-group">
                <label htmlFor="originName">Nome da Origem *</label>
                <input
                  id="originName"
                  type="text"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  placeholder="Digite o nome"
                  required
                  disabled={isProcessingForm}
                />
              </div>

              <div className="org-form-group">
                <label htmlFor="originDescription">Descrição</label>
                <textarea
                  id="originDescription"
                  value={originDescription}
                  onChange={(e) => setOriginDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes sobre a origem (opcional)"
                  disabled={isProcessingForm}
                />
              </div>

              {formError && <p className="org-error-message org-modal-error">{formError}</p>}

              <div className="org-form-actions">
                <button type="submit" className="org-btn-primary" disabled={isProcessingForm}>
                  {isProcessingForm
                    ? "Salvando..."
                    : currentOrigin
                    ? "Salvar Alterações"
                    : "Adicionar Origem"}
                </button>
                <button
                  type="button"
                  className="org-btn-outline"
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
        message={`Tem certeza que deseja excluir a origem "${
          deleteTargetOrigin?.nome || ""
        }"? Leads podem estar associados a ela.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteErrorState}
      />
    </div>
  );
}

export default OrigensAdminPage;
