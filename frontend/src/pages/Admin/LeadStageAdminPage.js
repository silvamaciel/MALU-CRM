import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
  updateLeadStagesOrderApi,
} from "../../api/leadStages";
import { toast } from "react-toastify";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

// CSS exclusivo desta página
import "./LeadStageAdminPage.css";

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function LeadStageAdminPage() {
  const [Stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add/Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [stageName, setStageName] = useState("");
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  // Ordenação
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  // Delete
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetStage, setDeleteTargetStage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorState, setDeleteErrorState] = useState(null);

  const fetchStages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLeadStages();
      setStages(data || data.leadStages || data.data || []);
    } catch (err) {
      setError(err.message || "Falha ao carregar situações.");
      toast.error(err.message || "Falha ao carregar situações.");
      setStages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = reorder(Stages, result.source.index, result.destination.index);
    setStages(items);
    setOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const orderedStageIds = Stages.map((s) => s._id);
      await updateLeadStagesOrderApi(orderedStageIds);
      toast.success("Ordem das situações salva com sucesso!");
      setOrderChanged(false);
    } catch (err) {
      toast.error(err.message || "Falha ao salvar a nova ordem.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Add/Edit
  const handleOpenAddModal = () => {
    setCurrentStage(null);
    setStageName("");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (stage) => {
    setCurrentStage(stage);
    setStageName(stage.nome || "");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentStage(null);
    setStageName("");
    setFormError(null);
    setIsProcessingForm(false);
  };

  const handleSaveStage = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsProcessingForm(true);

    const stageData = { nome: stageName.trim() };
    if (!stageData.nome) {
      setFormError("O nome da situação não pode estar vazio.");
      setIsProcessingForm(false);
      return;
    }

    try {
      if (currentStage && currentStage._id) {
        const result = await updateLeadStage(currentStage._id, stageData);
        toast.success(`Situação "${result.nome}" atualizada com sucesso!`);
      } else {
        const result = await createLeadStage(stageData);
        toast.success(`Situação "${result.nome}" criada com sucesso!`);
      }
      fetchStages();
      handleCloseFormModal();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao salvar situação.";
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsProcessingForm(false);
    }
  };

  // Delete
  const handleOpenDeleteConfirm = (stage) => {
    setDeleteTargetStage(stage);
    setDeleteErrorState(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteTargetStage(null);
    setDeleteErrorState(null);
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetStage) return;
    setIsDeleting(true);
    setDeleteErrorState(null);
    try {
      const result = await deleteLeadStage(deleteTargetStage._id);
      toast.success(result.message || "Situação excluída com sucesso!");
      handleCloseDeleteConfirm();
      fetchStages();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao excluir situação.";
      setDeleteErrorState(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <p>Carregando situações...</p>;
  if (error) return <p className="lsa-error-message">{error}</p>;

  return (
    <div className="lsa-page">
      <h1>Gerenciar Situações de Lead</h1>

      <div className="lsa-header-actions">
        <Link to="/leads" className="lsa-btn-outline">
          <i className="fas fa-list" /> Voltar para Lista
        </Link>

        <button
          onClick={handleOpenAddModal}
          className="lsa-btn-primary"
          disabled={isFormModalOpen || isDeleteConfirmOpen}
        >
          + Adicionar Nova Situação
        </button>
      </div>

      <div className="lsa-table-wrap">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="stagesDroppable">
            {(provided) => (
              <table {...provided.droppableProps} ref={provided.innerRef}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Data Criação</th>
                    <th style={{ width: 200, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {Stages.map((stage, index) => (
                    <Draggable key={stage._id} draggableId={stage._id} index={index}>
                      {(provided, snapshot) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            backgroundColor: snapshot.isDragging ? "#f0f8ff" : "inherit",
                            cursor: "grab",
                          }}
                        >
                          <td className="lsa-cell-name">{stage.nome}</td>
                          <td>
                            {stage.createdAt
                              ? new Date(stage.createdAt).toLocaleDateString("pt-BR")
                              : "-"}
                          </td>
                          <td className="lsa-cell-actions">
                            <button
                              onClick={() => handleOpenEditModal(stage)}
                              className="lsa-btn-ghost"
                              disabled={isFormModalOpen || isDeleteConfirmOpen}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirm(stage)}
                              className="lsa-btn-danger"
                              disabled={isFormModalOpen || isDeleteConfirmOpen}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {Stages.length === 0 && (
                    <tr>
                      <td colSpan="3">Nenhuma situação encontrada. Crie a primeira!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>

        {orderChanged && (
          <button
            onClick={handleSaveOrder}
            disabled={isSavingOrder}
            className="lsa-btn-primary lsa-save-order"
          >
            {isSavingOrder ? "Salvando ordem..." : "Salvar nova ordem"}
          </button>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isFormModalOpen && (
        <div className="lsa-modal-overlay">
          <div className="lsa-modal-card">
            <h2>{currentStage ? "Editar Situação" : "Adicionar Nova Situação"}</h2>

            <form onSubmit={handleSaveStage} noValidate>
              <div className="lsa-form-group">
                <label htmlFor="stageName">Nome da Situação:</label>
                <input
                  id="stageName"
                  type="text"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="Digite o nome"
                  required
                  disabled={isProcessingForm}
                />
              </div>

              {formError && <p className="lsa-error-message lsa-modal-error">{formError}</p>}

              <div className="lsa-form-actions">
                <button type="submit" className="lsa-btn-primary" disabled={isProcessingForm}>
                  {isProcessingForm
                    ? "Salvando..."
                    : currentStage
                    ? "Salvar Alterações"
                    : "Adicionar Situação"}
                </button>
                <button
                  type="button"
                  className="lsa-btn-outline"
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
        message={`Tem certeza que deseja excluir a situação "${
          deleteTargetStage?.nome || ""
        }"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteErrorState}
      />
    </div>
  );
}

export default LeadStageAdminPage;
