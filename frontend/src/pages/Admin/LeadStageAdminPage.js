// src/pages/Admin/LeadStageAdminPage.js
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom"; // Para links, se necessário
import {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
} from "../../api/leadStages";
import { toast } from "react-toastify";

import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import './AdminPages.css';

function LeadStageAdminPage() {
  const [stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State para Add/Edit ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState(null); // null para Add, objeto para Edit
  const [stageName, setStageName] = useState(""); // <<< NOVO state para o input nome
  // Adicione state para 'ordem' se seu modelo/form usar: const [stageOrder, setStageOrder] = useState('');
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

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
      setStages(data || []);
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
    event.preventDefault(); // Previne reload da página se for <form>
    setFormError(null);
    setIsProcessingForm(true);

    const stageData = {
      nome: stageName.trim(), // Remove espaços extras
      // ordem: stageOrder ? parseInt(stageOrder, 10) : undefined, // Inclui ordem se usar
    };

    // Validação básica
    if (!stageData.nome) {
      setFormError("O nome da situação não pode estar vazio.");
      setIsProcessingForm(false);
      return;
    }

    try {
      let result;
      let successMessage;
      if (currentStage && currentStage._id) {
        // Modo Edição
        result = await updateLeadStage(currentStage._id, stageData);
        successMessage = `Situação "${result.nome}" atualizada com sucesso!`;
      } else {
        // Modo Adição
        result = await createLeadStage(stageData);
        successMessage = `Situação "${result.nome}" criada com sucesso!`;
      }
      toast.success(successMessage);
      fetchStages(); // Atualiza a lista
      handleCloseFormModal(); // Fecha o form/modal
    } catch (err) {
      console.error("Erro ao salvar situação:", err);
      const errorMsg = err.error || err.message || "Falha ao salvar situação."; // Pega erro do backend
      setFormError(errorMsg); // Mostra erro no form
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
    // ... (lógica do delete continua igual) ...
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
      const errorMsg = err.error || err.message || "Falha ao excluir situação."; // Pega erro backend
      setDeleteErrorState(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

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
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                {/* <th>Ordem</th> */}
                <th>Data Criação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage._id}>
                  <td>{stage.nome}</td>
                  {/* <td>{stage.ordem}</td> */}
                  <td>
                    {new Date(stage.createdAt).toLocaleDateString("pt-BR")}
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
              ))}
              {stages.length === 0 && (
                <tr>
                  <td colSpan="4">
                    Nenhuma situação encontrada. Crie a primeira!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Modal/Formulário Simples para Adicionar/Editar --- */}
      {isFormModalOpen && (
        <div className="form-modal-overlay">
          {" "}
          {/* Simula um fundo de modal */}
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
              {/* Adicione input para 'ordem' aqui se necessário */}
              {/* <div className="form-group">
                                <label htmlFor="stageOrder">Ordem:</label>
                                <input type="number" id="stageOrder" value={stageOrder} onChange={(e) => setStageOrder(e.target.value)} placeholder="Ex: 1" disabled={isProcessingForm}/>
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
        }"?`} // Mensagem mais simples
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
