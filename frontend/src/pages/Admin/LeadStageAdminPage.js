// src/pages/Admin/LeadStageAdminPage.js
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom"; // Para links, se necessário
import {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
  updateLeadStagesOrderApi
} from "../../api/leadStages";
import { toast } from "react-toastify";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
//import './AdminPages.css';
import './AdminPages.css';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function LeadStageAdminPage() {
  const [Stages, setStages] = useState([]);  // Use o nome Stages conforme seu código original
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State para Add/Edit ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState(null); // null para Add, objeto para Edit
  const [stageName, setStageName] = useState(""); // <<< NOVO state para o input nome
  // const [stageOrder, setStageOrder] = useState(''); // se precisar
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  // Para habilitar o botão de salvar ordem
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  // --- State para Delete ---
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetStage, setDeleteTargetStage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorState, setDeleteErrorState] = useState(null);

  // Função para buscar situações (igual antes)
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

  // Efeito para buscar ao montar o componente (igual antes)
  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    const items = reorder(
      Stages,  // manter "Stages"
      result.source.index,
      result.destination.index
    );
    setStages(items);
    setOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const orderedStageIds = Stages.map(s => s._id)
      console.log("DEBUG: IDs de situação ordenados enviados:", orderedStageIds);
      await updateLeadStagesOrderApi(orderedStageIds);
      toast.success("Ordem das situações salva com sucesso!");
      setOrderChanged(false);
    } catch (err) {
      toast.error(err.message || "Falha ao salvar a nova ordem.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  // --- Handlers ATUALIZADOS para Add/Edit ---
  const handleOpenAddModal = () => {
    setCurrentStage(null); // Garante modo Add
    setStageName(""); // Limpa input nome
    // setStageOrder('');      // Limpa input ordem (se usar)
    setFormError(null); // Limpa erros do form
    setIsFormModalOpen(true); // Abre o form/modal
  };

  const handleOpenEditModal = (stage) => {
    setCurrentStage(stage); // Define qual estágio editar
    setStageName(stage.nome); // Preenche input nome com valor atual
    // setStageOrder(stage.ordem || ''); // Preenche ordem (se usar)
    setFormError(null); // Limpa erros do form
    setIsFormModalOpen(true); // Abre o form/modal
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentStage(null);
    setStageName("");
    // setStageOrder('');
    setFormError(null);
    setIsProcessingForm(false); // Garante reset
  };

  // Função chamada ao submeter o form de Add/Edit
  const handleSaveStage = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsProcessingForm(true);

    const stageData = {
      nome: stageName.trim(),
      // ordem: stageOrder ? parseInt(stageOrder, 10) : undefined,
    };

    if (!stageData.nome) {
      setFormError("O nome da situação não pode estar vazio.");
      setIsProcessingForm(false);
      return;
    }

    try {
      let result;
      let successMessage;
      if (currentStage && currentStage._id) {
        result = await updateLeadStage(currentStage._id, stageData);
        successMessage = `Situação "${result.nome}" atualizada com sucesso!`;
      } else {
        result = await createLeadStage(stageData);
        successMessage = `Situação "${result.nome}" criada com sucesso!`;
      }
      toast.success(successMessage);
      fetchStages();
      handleCloseFormModal();
    } catch (err) {
      console.error("Erro ao salvar situação:", err);
      const errorMsg = err.error || err.message || "Falha ao salvar situação.";
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsProcessingForm(false);
    }
  };

  // --- Handlers de Delete (iguais antes) ---
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
      console.error("Erro ao deletar situação:", err);
      const errorMsg = err.error || err.message || "Falha ao excluir situação.";
      setDeleteErrorState(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <p>Carregando situações...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="admin-page lead-stage-admin-page">
      <h1>Gerenciar Situações de Lead</h1>
      <Link to="/leads" className="button back-to-list-button">
        <i className="fas fa-list"></i> Voltar para Lista
      </Link>
      <p></p>
      <button
        onClick={handleOpenAddModal}
        className="button add-button"
        disabled={isFormModalOpen || isDeleteConfirmOpen}
      >
        + Adicionar Nova Situação
      </button>

      {isLoading && <p>Carregando situações...</p>}
      {error && <p className="error-message">{error}</p>}

      {!isLoading && !error && (
        <div className="admin-table-container">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="stagesDroppable">
              {(provided) => (
                <table {...provided.droppableProps} ref={provided.innerRef}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      {/* <th>Ordem</th> */}
                      <th>Data Criação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Stages.map((stage, index) => (
                      <Draggable
                        key={stage._id}
                        draggableId={stage._id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              backgroundColor: snapshot.isDragging
                                ? "#f0f8ff"
                                : "inherit",
                              cursor: "move",
                            }}
                          >
                            <td>{stage.nome}</td>
                            {/* <td>{stage.ordem}</td> */}
                            <td>
                              {new Date(stage.createdAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => handleOpenEditModal(stage)}
                                className="button edit-button-table"
                                disabled={isFormModalOpen || isDeleteConfirmOpen}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleOpenDeleteConfirm(stage)}
                                className="button delete-button-table"
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
                        <td colSpan="4">
                          Nenhuma situação encontrada. Crie a primeira!
                        </td>
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
              className="button primary-button"
              style={{ margin: "15px 0" }}
            >
              {isSavingOrder ? "Salvando ordem..." : "Salvar nova ordem"}
            </button>
          )}
        </div>
      )}

      {/* --- Modal/Formulário Simples para Adicionar/Editar --- */}
      {isFormModalOpen && (
        <div className="form-modal-overlay">
          <div className="form-modal-content">
            <h2>
              {currentStage ? "Editar Situação" : "Adicionar Nova Situação"}
            </h2>
            <form onSubmit={handleSaveStage}>
              <div className="form-group">
                <label htmlFor="stageName">Nome da Situação:</label>
                <input
                  type="text"
                  id="stageName"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="Digite o nome"
                  required
                  disabled={isProcessingForm}
                />
              </div>

              {/* input para ordem, se quiser usar */}
              {/* <div className="form-group">
                <label htmlFor="stageOrder">Ordem:</label>
                <input
                  type="number"
                  id="stageOrder"
                  value={stageOrder}
                  onChange={(e) => setStageOrder(e.target.value)}
                  placeholder="Ex: 1"
                  disabled={isProcessingForm}
                />
              </div> */}

              {formError && (
                <p className="error-message modal-error">{formError}</p>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="button submit-button"
                  disabled={isProcessingForm}
                >
                  {isProcessingForm
                    ? "Salvando..."
                    : currentStage
                    ? "Salvar Alterações"
                    : "Adicionar Situação"}
                </button>
                <button
                  type="button"
                  className="button cancel-button"
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
      {/* --- Fim Modal/Formulário --- */}

      {/* Modal de Confirmação de Exclusão (igual antes) */}
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
