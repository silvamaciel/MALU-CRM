// src/pages/Admin/UsuariosAdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
// API Functions for Users - <<< Verifique o caminho/nome do arquivo e funções >>>
import { getUsuarios, createUser, updateUser, deleteUser } from '../../api/users'; // Ou usuarios.js
import { toast } from 'react-toastify';
// Shared Components
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
// Shared Admin CSS
import './AdminPages.css';

// Valores possíveis para o perfil (deve bater com o enum do backend)
const PERFIS_DISPONIVEIS = ['admin', 'corretor'];

function UsuariosAdminPage() {
    // State para lista
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State para modal/formulário Add/Edit
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // null=Add, obj=Edit
    const [isProcessingForm, setIsProcessingForm] = useState(false);
    const [formError, setFormError] = useState(null);
    // State para os campos do formulário
    const [formData, setFormData] = useState({ nome: '', email: '', perfil: 'corretor', senha: '', ativo: true });

    // State para modal de confirmação Delete
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteTargetUser, setDeleteTargetUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorState, setDeleteErrorState] = useState(null);

    // Função para buscar usuários da empresa logada
    const fetchUsers = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            // A API getUsuarios agora deve retornar apenas usuários da empresa correta
            const data = await getUsuarios();
            setUsers(data || []);
        } catch (err) {
            const errorMsg = err.message || "Falha ao carregar usuários.";
            setError(errorMsg); toast.error(errorMsg); setUsers([]);
        } finally { setIsLoading(false); }
    }, []);

    // Efeito inicial para buscar
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // --- Handlers ---
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetFormData = () => {
        setFormData({ nome: '', email: '', perfil: 'corretor', senha: '', ativo: true });
    };

    const handleOpenAddModal = () => {
        setCurrentUser(null); resetFormData(); setFormError(null); setIsFormModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setCurrentUser(user);
        setFormData({ // Preenche o form com dados atuais
            nome: user.nome || '',
            email: user.email || '',
            perfil: user.perfil || 'corretor',
            senha: '', // Senha nunca é preenchida, só definida se for alterar
            ativo: user.ativo === undefined ? true : user.ativo // Default true se não existir
        });
        setFormError(null); setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false); setCurrentUser(null); resetFormData(); setFormError(null); setIsProcessingForm(false);
    };

    const handleSaveUser = async (event) => {
        event.preventDefault(); setFormError(null); setIsProcessingForm(true);

        // Prepara dados a enviar, removendo senha se vazia
        const userData = { ...formData };
        if (!userData.senha) {
            delete userData.senha; // Só envia senha se algo foi digitado
        }
        // Validação básica
        if (!userData.nome || !userData.email || !userData.perfil) {
            setFormError("Nome, Email e Perfil são obrigatórios."); setIsProcessingForm(false); return;
        }
        if (!/\S+@\S+\.\S+/.test(userData.email)) {
            setFormError("Formato de email inválido."); setIsProcessingForm(false); return;
        }

        try {
            let successMessage;
            if (currentUser && currentUser._id) { // Edit Mode
                await updateUser(currentUser._id, userData);
                successMessage = `Usuário "${userData.nome}" atualizado!`;
            } else { // Add Mode
                await createUser(userData);
                successMessage = `Usuário "${userData.nome}" criado!`;
            }
            toast.success(successMessage); fetchUsers(); handleCloseFormModal();
        } catch (err) {
            const errorMsg = err.error || err.message || "Falha ao salvar usuário.";
            setFormError(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsProcessingForm(false); }
    };

    const handleOpenDeleteConfirm = (user) => {
        setDeleteTargetUser(user); setDeleteErrorState(null); setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setIsDeleteConfirmOpen(false); setDeleteTargetUser(null); setDeleteErrorState(null); setIsDeleting(false);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetUser) return; setIsDeleting(true); setDeleteErrorState(null);
        try {
            const result = await deleteUser(deleteTargetUser._id);
            toast.success(result.message || "Usuário excluído!");
            handleCloseDeleteConfirm(); fetchUsers();
        } catch (err) {
             const errorMsg = err.error || err.message || "Falha ao excluir usuário.";
             setDeleteErrorState(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsDeleting(false); }
    };
    // --- Fim Handlers ---


    // --- Renderização ---
    return (
        <div className="admin-page users-admin-page">
            <h1>Gerenciar Usuários</h1>
            <button onClick={handleOpenAddModal} className="button add-button" disabled={isFormModalOpen || isDeleteConfirmOpen}>
               + Adicionar Novo Usuário
            </button>

            {isLoading && <p>Carregando usuários...</p>}
            {error && <p className="error-message">{error}</p>}

            {!isLoading && !error && (
                <div className="admin-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Perfil</th>
                                <th>Status</th>
                                <th>Criado Em</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td>{user.nome}</td>
                                    <td>{user.email}</td>
                                    <td>{user.perfil}</td>
                                    <td>{user.ativo ? 'Ativo' : 'Inativo'}</td>
                                    <td>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <button onClick={() => handleOpenEditModal(user)} className="button edit-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Editar</button>
                                        <button onClick={() => handleOpenDeleteConfirm(user)} className="button delete-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Excluir</button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr><td colSpan="6">Nenhum usuário encontrado nesta empresa.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal/Formulário para Adicionar/Editar Usuário */}
            {isFormModalOpen && (
                <div className="form-modal-overlay">
                    <div className="form-modal-content">
                        <h2>{currentUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h2>
                        <form onSubmit={handleSaveUser}>
                            {/* Nome */}
                            <div className="form-group">
                                <label htmlFor="userName">Nome *</label>
                                <input type="text" id="userName" name="nome" value={formData.nome} onChange={handleInputChange} required disabled={isProcessingForm} />
                            </div>
                            {/* Email */}
                             <div className="form-group">
                                <label htmlFor="userEmail">Email *</label>
                                <input type="email" id="userEmail" name="email" value={formData.email} onChange={handleInputChange} required disabled={isProcessingForm || !!currentUser} />
                                {currentUser && <small>Email não pode ser alterado.</small>}
                                </div>
                             {/* Perfil */}
                             <div className="form-group">
                                <label htmlFor="userPerfil">Perfil *</label>
                                <select id="userPerfil" name="perfil" value={formData.perfil} onChange={handleInputChange} required disabled={isProcessingForm}>
                                    {PERFIS_DISPONIVEIS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                             {/* Senha (Opcional na edição, talvez obrigatório na criação manual?) */}
                             <div className="form-group">
                                <label htmlFor="userSenha">Nova Senha</label>
                                <input type="password" id="userSenha" name="senha" value={formData.senha} onChange={handleInputChange} placeholder={currentUser ? 'Deixe em branco para não alterar' : 'Obrigatório ao criar'} disabled={isProcessingForm} />
                                {!currentUser && <small>Senha necessária para login local.</small>}
                            </div>
                             {/* Status Ativo */}
                             <div className="form-group form-group-checkbox">
                                 <input type="checkbox" id="userAtivo" name="ativo" checked={formData.ativo} onChange={handleInputChange} disabled={isProcessingForm} />
                                <label htmlFor="userAtivo">Usuário Ativo</label>
                            </div>

                            {formError && <p className="error-message modal-error">{formError}</p>}
                            <div className="form-actions">
                                <button type="submit" className="button submit-button" disabled={isProcessingForm}>
                                    {isProcessingForm ? 'Salvando...' : (currentUser ? 'Salvar Alterações' : 'Adicionar Usuário')}
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
                title="Confirmar Exclusão de Usuário"
                message={`Tem certeza que deseja excluir o usuário "${deleteTargetUser?.nome || ''}" (${deleteTargetUser?.email || ''})? Leads associados podem precisar de novo responsável.`}
                confirmText="Excluir Usuário" cancelText="Cancelar"
                confirmButtonClass="confirm-button-delete"
                isProcessing={isDeleting} errorMessage={deleteErrorState}
             />
        </div>
    );
}

export default UsuariosAdminPage;