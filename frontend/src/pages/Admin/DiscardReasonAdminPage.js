// src/pages/Admin/DiscardReasonAdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
// API Functions for Discard Reasons
import { getDiscardReasons, createDiscardReason, updateDiscardReason, deleteDiscardReason } from '../../api/discardReasons';
import { toast } from 'react-toastify';
// Shared Components
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
// Shared Admin CSS
import './AdminPages.css';

function DiscardReasonAdminPage() {
    // State for the list
    const [reasons, setReasons] = useState([]); // State para a lista de motivos
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Add/Edit form modal
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentReason, setCurrentReason] = useState(null); // Guarda o motivo sendo editado (null para Adicionar)
    const [reasonName, setReasonName] = useState(''); // State para input 'nome'
    const [reasonDescription, setReasonDescription] = useState(''); // State para input 'descricao'
    const [isProcessingForm, setIsProcessingForm] = useState(false);
    const [formError, setFormError] = useState(null);

    // State for Delete confirmation modal
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteTargetReason, setDeleteTargetReason] = useState(null); // Guarda o motivo a deletar
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorState, setDeleteErrorState] = useState(null);

    // Fetch function
    const fetchReasons = useCallback(async () => { // Renomeado fetch
        setIsLoading(true); setError(null);
        try {
            const data = await getDiscardReasons(); // Chama a API de Motivos
            setReasons(data || []); // Atualiza state de Motivos
        } catch (err) {
            const errorMsg = err.message || "Falha ao carregar motivos de descarte.";
            setError(errorMsg); toast.error(errorMsg); setReasons([]);
        } finally { setIsLoading(false); }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchReasons();
    }, [fetchReasons]);

    // --- Handlers ---
    const handleOpenAddModal = () => {
        setCurrentReason(null); setReasonName(''); setReasonDescription('');
        setFormError(null); setIsFormModalOpen(true);
    };

    const handleOpenEditModal = (reason) => {
        setCurrentReason(reason); setReasonName(reason.nome); setReasonDescription(reason.descricao || '');
        setFormError(null); setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false); setCurrentReason(null); setReasonName(''); setReasonDescription('');
        setFormError(null); setIsProcessingForm(false);
    };

    const handleSaveReason = async (event) => { // Renomeado handleSave
        event.preventDefault(); setFormError(null); setIsProcessingForm(true);
        const reasonData = {
            nome: reasonName.trim(),
            descricao: reasonDescription.trim() || null
        };
        if (!reasonData.nome) {
            setFormError("O nome do motivo é obrigatório."); setIsProcessingForm(false); return;
        }
        try {
            let successMessage;
            if (currentReason && currentReason._id) { // Edit Mode
                await updateDiscardReason(currentReason._id, reasonData); // Chama API updateDiscardReason
                successMessage = `Motivo "${reasonData.nome}" atualizado!`;
            } else { // Add Mode
                await createDiscardReason(reasonData); // Chama API createDiscardReason
                successMessage = `Motivo "${reasonData.nome}" criado!`;
            }
            toast.success(successMessage); fetchReasons(); handleCloseFormModal();
        } catch (err) {
            const errorMsg = err.error || err.message || "Falha ao salvar motivo.";
            setFormError(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsProcessingForm(false); }
    };

    const handleOpenDeleteConfirm = (reason) => { // Renomeado handleOpen
        setDeleteTargetReason(reason); setDeleteErrorState(null); setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setIsDeleteConfirmOpen(false); setDeleteTargetReason(null); setDeleteErrorState(null); setIsDeleting(false);
    };

    const handleConfirmDelete = async () => { // Renomeado handleConfirm
        if (!deleteTargetReason) return; setIsDeleting(true); setDeleteErrorState(null);
        try {
            const result = await deleteDiscardReason(deleteTargetReason._id); // Chama API deleteDiscardReason
            toast.success(result.message || "Motivo excluído!");
            handleCloseDeleteConfirm(); fetchReasons();
        } catch (err) {
             const errorMsg = err.error || err.message || "Falha ao excluir motivo.";
             setDeleteErrorState(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsDeleting(false); }
    };
    // --- Fim Handlers ---


    // --- Renderização ---
    return (
        <div className="admin-page discard-reason-admin-page"> {/* Classe específica opcional */}
            <h1>Gerenciar Motivos de Descarte</h1>
            <button onClick={handleOpenAddModal} className="button add-button" disabled={isFormModalOpen || isDeleteConfirmOpen}>
               + Adicionar Novo Motivo
            </button>

            {isLoading && <p>Carregando motivos...</p>}
            {error && <p className="error-message">{error}</p>}

            {!isLoading && !error && (
                <div className="admin-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Descrição</th>
                                <th>Data Criação</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reasons.map(reason => ( // Mapeia 'reasons'
                                <tr key={reason._id}>
                                    <td>{reason.nome}</td>
                                    <td>{reason.descricao || '-'}</td>
                                    <td>{new Date(reason.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <button onClick={() => handleOpenEditModal(reason)} className="button edit-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Editar</button>
                                        <button onClick={() => handleOpenDeleteConfirm(reason)} className="button delete-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Excluir</button>
                                    </td>
                                </tr>
                            ))}
                            {reasons.length === 0 && (
                                <tr><td colSpan="4">Nenhum motivo encontrado. Crie o primeiro!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal/Formulário para Adicionar/Editar Motivo */}
            {isFormModalOpen && (
                <div className="form-modal-overlay">
                    <div className="form-modal-content">
                        <h2>{currentReason ? 'Editar Motivo de Descarte' : 'Adicionar Novo Motivo'}</h2>
                        <form onSubmit={handleSaveReason}>
                            <div className="form-group">
                                <label htmlFor="reasonName">Nome do Motivo *</label>
                                <input
                                    type="text" id="reasonName" value={reasonName}
                                    onChange={(e) => setReasonName(e.target.value)}
                                    placeholder="Digite o nome" required disabled={isProcessingForm} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="reasonDescription">Descrição</label>
                                <textarea
                                    id="reasonDescription" value={reasonDescription}
                                    onChange={(e) => setReasonDescription(e.target.value)}
                                    rows={3} placeholder="Detalhes sobre o motivo (opcional)"
                                    disabled={isProcessingForm} />
                            </div>

                            {formError && <p className="error-message modal-error">{formError}</p>}
                            <div className="form-actions">
                                <button type="submit" className="button submit-button" disabled={isProcessingForm}>
                                    {isProcessingForm ? 'Salvando...' : (currentReason ? 'Salvar Alterações' : 'Adicionar Motivo')}
                                </button>
                                <button type="button" className="button cancel-button" onClick={handleCloseFormModal} disabled={isProcessingForm}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
             <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir o motivo "${deleteTargetReason?.nome || ''}"? Leads associados podem precisar ser atualizados.`}
                confirmText="Excluir" cancelText="Cancelar"
                confirmButtonClass="confirm-button-delete"
                isProcessing={isDeleting} errorMessage={deleteErrorState}
             />
        </div>
    );
}

export default DiscardReasonAdminPage;