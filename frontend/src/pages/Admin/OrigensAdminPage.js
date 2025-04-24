// src/pages/Admin/OrigensAdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
// <<< Importar a API CORRETA para Origens >>>
import { getOrigens, createOrigem, updateOrigem, deleteOrigem } from '../../api/origens'; // Verifique o nome/caminho do seu arquivo API
import { toast } from 'react-toastify';
// Componentes
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
// CSS
import './LeadStageAdminPage'; // Reutiliza o CSS admin

function OrigensAdminPage() {
    // --- States ---
    const [origins, setOrigins] = useState([]); // State para a lista de origens
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State para o modal/formulário Add/Edit
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentOrigin, setCurrentOrigin] = useState(null); // Guarda a origem sendo editada (null para Adicionar)
    const [originName, setOriginName] = useState(''); // State para input 'nome'
    const [originDescription, setOriginDescription] = useState(''); // <<< State para input 'descricao'
    const [isProcessingForm, setIsProcessingForm] = useState(false);
    const [formError, setFormError] = useState(null);

    // State para o modal de confirmação Delete
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteTargetOrigin, setDeleteTargetOrigin] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorState, setDeleteErrorState] = useState(null);

    // --- Funções ---
    // Buscar Origens
    const fetchOrigins = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const data = await getOrigens(); // Chama a API de origens
            setOrigins(data || []);
        } catch (err) {
            const errorMsg = err.message || "Falha ao carregar origens.";
            setError(errorMsg); toast.error(errorMsg); setOrigins([]);
        } finally { setIsLoading(false); }
    }, []);

    // Efeito inicial para buscar
    useEffect(() => {
        fetchOrigins();
    }, [fetchOrigins]);

    // Abrir Modal para Adicionar
    const handleOpenAddModal = () => {
        setCurrentOrigin(null); setOriginName(''); setOriginDescription(''); // Limpa campos
        setFormError(null); setIsFormModalOpen(true);
    };

    // Abrir Modal para Editar
    const handleOpenEditModal = (origin) => {
        setCurrentOrigin(origin); setOriginName(origin.nome); setOriginDescription(origin.descricao || ''); // Preenche campos
        setFormError(null); setIsFormModalOpen(true);
    };

    // Fechar Modal de Formulário
    const handleCloseFormModal = () => {
        setIsFormModalOpen(false); setCurrentOrigin(null); setOriginName(''); setOriginDescription('');
        setFormError(null); setIsProcessingForm(false);
    };

    // Salvar (Criar ou Atualizar)
    const handleSaveOrigin = async (event) => {
        event.preventDefault(); setFormError(null); setIsProcessingForm(true);
        // Prepara os dados (incluindo descricao)
        const originData = {
            nome: originName.trim(),
            descricao: originDescription.trim() || null // Envia null se vazio
        };
        if (!originData.nome) {
            setFormError("O nome da origem é obrigatório."); setIsProcessingForm(false); return;
        }
        try {
            let successMessage;
            if (currentOrigin && currentOrigin._id) { // Edição
                await updateOrigem(currentOrigin._id, originData);
                successMessage = `Origem "${originData.nome}" atualizada!`;
            } else { // Criação
                await createOrigem(originData);
                successMessage = `Origem "${originData.nome}" criada!`;
            }
            toast.success(successMessage); fetchOrigins(); handleCloseFormModal();
        } catch (err) {
            const errorMsg = err.error || err.message || "Falha ao salvar origem.";
            setFormError(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsProcessingForm(false); }
    };

    // Abrir Modal de Confirmação de Exclusão
    const handleOpenDeleteConfirm = (origin) => {
        setDeleteTargetOrigin(origin); setDeleteErrorState(null); setIsDeleteConfirmOpen(true);
    };

    // Fechar Modal de Confirmação
    const handleCloseDeleteConfirm = () => {
        setIsDeleteConfirmOpen(false); setDeleteTargetOrigin(null); setDeleteErrorState(null); setIsDeleting(false);
    };

    // Confirmar Exclusão
    const handleConfirmDelete = async () => {
        if (!deleteTargetOrigin) return; setIsDeleting(true); setDeleteErrorState(null);
        try {
            const result = await deleteOrigem(deleteTargetOrigin._id);
            toast.success(result.message || "Origem excluída!");
            handleCloseDeleteConfirm(); fetchOrigins();
        } catch (err) {
             const errorMsg = err.error || err.message || "Falha ao excluir origem.";
             setDeleteErrorState(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsDeleting(false); }
    };
    // --- Fim Handlers ---


    // --- Renderização ---
    return (
        <div className="admin-page origins-admin-page"> {/* Classe específica opcional */}
            <h1>Gerenciar Origens de Lead</h1>
            <button onClick={handleOpenAddModal} className="button add-button" disabled={isFormModalOpen || isDeleteConfirmOpen}>
               + Adicionar Nova Origem
            </button>

            {isLoading && <p>Carregando origens...</p>}
            {error && <p className="error-message">{error}</p>}

            {!isLoading && !error && (
                <div className="admin-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Descrição</th> {/* <<< Coluna Descrição >>> */}
                                <th>Data Criação</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {origins.map(origin => ( // Mapeia 'origins'
                                <tr key={origin._id}>
                                    <td>{origin.nome}</td>
                                    <td>{origin.descricao || '-'}</td> {/* <<< Exibe Descrição >>> */}
                                    <td>{new Date(origin.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <button onClick={() => handleOpenEditModal(origin)} className="button edit-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Editar</button>
                                        <button onClick={() => handleOpenDeleteConfirm(origin)} className="button delete-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Excluir</button>
                                    </td>
                                </tr>
                            ))}
                            {origins.length === 0 && (
                                <tr><td colSpan="4">Nenhuma origem encontrada. Crie a primeira!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal/Formulário para Adicionar/Editar Origem */}
            {isFormModalOpen && (
                <div className="form-modal-overlay">
                    <div className="form-modal-content">
                        <h2>{currentOrigin ? 'Editar Origem' : 'Adicionar Nova Origem'}</h2>
                        <form onSubmit={handleSaveOrigin}>
                            {/* Input Nome */}
                            <div className="form-group">
                                <label htmlFor="originName">Nome da Origem *</label>
                                <input
                                    type="text" id="originName" value={originName}
                                    onChange={(e) => setOriginName(e.target.value)}
                                    placeholder="Digite o nome" required disabled={isProcessingForm} />
                            </div>
                            {/* <<< Input/Textarea Descrição >>> */}
                            <div className="form-group">
                                <label htmlFor="originDescription">Descrição</label>
                                <textarea
                                    id="originDescription" value={originDescription}
                                    onChange={(e) => setOriginDescription(e.target.value)}
                                    rows={3} placeholder="Detalhes sobre a origem (opcional)"
                                    disabled={isProcessingForm} />
                            </div>
                            {/* <<< Fim Descrição >>> */}

                            {formError && <p className="error-message modal-error">{formError}</p>}
                            <div className="form-actions">
                                <button type="submit" className="button submit-button" disabled={isProcessingForm}>
                                    {isProcessingForm ? 'Salvando...' : (currentOrigin ? 'Salvar Alterações' : 'Adicionar Origem')}
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
                // Mensagem adaptada
                message={`Tem certeza que deseja excluir a origem "${deleteTargetOrigin?.nome || ''}"? Leads podem estar associados a ela.`}
                confirmText="Excluir" cancelText="Cancelar"
                confirmButtonClass="confirm-button-delete"
                isProcessing={isDeleting} errorMessage={deleteErrorState}
             />
        </div>
    );
}

export default OrigensAdminPage;