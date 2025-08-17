import React, { useState, useEffect, useCallback } from "react";
import { getUsuarios, createUser, updateUser, deleteUser } from "../../api/users";
import { toast } from "react-toastify";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

// CSS exclusivo desta página
import "./UsuariosAdminPage.css";

const PERFIS_DISPONIVEIS = ["admin", "corretor"];

function UsuariosAdminPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    perfil: "corretor",
    senha: "",
    ativo: true,
  });

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorState, setDeleteErrorState] = useState(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUsuarios();
      setUsers(data || []);
    } catch (err) {
      const errorMsg = err.message || "Falha ao carregar usuários.";
      setError(errorMsg);
      toast.error(errorMsg);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const resetFormData = () => {
    setFormData({ nome: "", email: "", perfil: "corretor", senha: "", ativo: true });
  };

  const handleOpenAddModal = () => {
    setCurrentUser(null);
    resetFormData();
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setCurrentUser(user);
    setFormData({
      nome: user.nome || "",
      email: user.email || "",
      perfil: user.perfil || "corretor",
      senha: "",
      ativo: user.ativo === undefined ? true : user.ativo,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentUser(null);
    resetFormData();
    setFormError(null);
    setIsProcessingForm(false);
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsProcessingForm(true);

    const userData = { ...formData };
    if (!userData.senha) delete userData.senha;

    if (!userData.nome || !userData.email || !userData.perfil) {
      setFormError("Nome, Email e Perfil são obrigatórios.");
      setIsProcessingForm(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(userData.email)) {
      setFormError("Formato de email inválido.");
      setIsProcessingForm(false);
      return;
    }

    try {
      if (currentUser && currentUser._id) {
        await updateUser(currentUser._id, userData);
        toast.success(`Usuário "${userData.nome}" atualizado!`);
      } else {
        await createUser(userData);
        toast.success(`Usuário "${userData.nome}" criado!`);
      }
      fetchUsers();
      handleCloseFormModal();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao salvar usuário.";
      setFormError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsProcessingForm(false);
    }
  };

  const handleOpenDeleteConfirm = (user) => {
    setDeleteTargetUser(user);
    setDeleteErrorState(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteTargetUser(null);
    setDeleteErrorState(null);
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    setDeleteErrorState(null);
    try {
      const result = await deleteUser(deleteTargetUser._id);
      toast.success(result.message || "Usuário excluído!");
      handleCloseDeleteConfirm();
      fetchUsers();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao excluir usuário.";
      setDeleteErrorState(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="usr-page">
      <div className="usr-page-inner">
        <h1>Gerenciar Usuários</h1>

        <div className="usr-header-actions">
          <button
            onClick={handleOpenAddModal}
            className="usr-btn-primary"
            disabled={isFormModalOpen || isDeleteConfirmOpen}
          >
            + Adicionar Novo Usuário
          </button>
        </div>

        {isLoading && <p>Carregando usuários...</p>}
        {error && <p className="usr-error-message">{error}</p>}

        {!isLoading && !error && (
          <div className="usr-table-scroller">
            <div className="usr-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="col-nome">Nome</th>
                    <th className="col-email">Email</th>
                    <th className="col-perfil">Perfil</th>
                    <th className="col-status">Status</th>
                    <th className="col-criado">Criado Em</th>
                    <th className="col-acoes" style={{ width: 220, textAlign: "right" }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="usr-cell-strong col-nome">{user.nome}</td>
                      <td className="col-email">{user.email}</td>
                      <td className="col-perfil">{user.perfil}</td>
                      <td className="col-status">
                        <span className={`usr-badge ${user.ativo ? "ok" : "off"}`}>
                          {user.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="col-criado">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="usr-cell-actions col-acoes">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="usr-btn-ghost"
                          disabled={isFormModalOpen || isDeleteConfirmOpen}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleOpenDeleteConfirm(user)}
                          className="usr-btn-danger"
                          disabled={isFormModalOpen || isDeleteConfirmOpen}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6">Nenhum usuário encontrado nesta empresa.</td>
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
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <h2>{currentUser ? "Editar Usuário" : "Adicionar Novo Usuário"}</h2>
            <form onSubmit={handleSaveUser} noValidate>
              <div className="usr-form-grid">
                {/* Nome */}
                <div className="usr-form-group">
                  <label htmlFor="userName">Nome *</label>
                  <input
                    id="userName"
                    name="nome"
                    type="text"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    disabled={isProcessingForm}
                  />
                </div>
                {/* Email */}
                <div className="usr-form-group">
                  <label htmlFor="userEmail">Email *</label>
                  <input
                    id="userEmail"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isProcessingForm || !!currentUser}
                  />
                  {currentUser && <small>Email não pode ser alterado.</small>}
                </div>
                {/* Perfil */}
                <div className="usr-form-group">
                  <label htmlFor="userPerfil">Perfil *</label>
                  <select
                    id="userPerfil"
                    name="perfil"
                    value={formData.perfil}
                    onChange={handleInputChange}
                    required
                    disabled={isProcessingForm}
                  >
                    {PERFIS_DISPONIVEIS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Senha */}
                <div className="usr-form-group">
                  <label htmlFor="userSenha">Nova Senha</label>
                  <input
                    id="userSenha"
                    name="senha"
                    type="password"
                    value={formData.senha}
                    onChange={handleInputChange}
                    placeholder={currentUser ? "Deixe em branco para não alterar" : "Obrigatório ao criar"}
                    disabled={isProcessingForm}
                  />
                  {!currentUser && <small>Senha necessária para login local.</small>}
                </div>
                {/* Status */}
                <div className="usr-form-group usr-form-group-checkbox">
                  <input
                    id="userAtivo"
                    name="ativo"
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={handleInputChange}
                    disabled={isProcessingForm}
                  />
                  <label htmlFor="userAtivo">Usuário Ativo</label>
                </div>
              </div>

              {formError && <p className="usr-error-message usr-modal-error">{formError}</p>}

              <div className="usr-form-actions">
                <button type="submit" className="usr-btn-primary" disabled={isProcessingForm}>
                  {isProcessingForm
                    ? "Salvando..."
                    : currentUser
                    ? "Salvar Alterações"
                    : "Adicionar Usuário"}
                </button>
                <button
                  type="button"
                  className="usr-btn-outline"
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

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Usuário"
        message={`Tem certeza que deseja excluir o usuário "${
          deleteTargetUser?.nome || ""
        }" (${deleteTargetUser?.email || ""})? Leads associados podem precisar de novo responsável.`}
        confirmText="Excluir Usuário"
        cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting}
        errorMessage={deleteErrorState}
      />
    </div>
  );
}

export default UsuariosAdminPage;
