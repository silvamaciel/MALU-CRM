import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateTaskApi } from '../../api/taskApi';
import { getUsuarios } from '../../api/users';
import './EditTaskModal.css'; // Criaremos este CSS

function EditTaskModal({ isOpen, onClose, task, onSaveSuccess }) {
    const [formData, setFormData] = useState({});
    const [users, setUsers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Preenche o formulário com os dados da tarefa quando o modal abre
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                // Formata a data para o input datetime-local
                dueDate: task.dueDate ? new Date(new Date(task.dueDate).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '',
                assignedTo: task.assignedTo?._id || ''
            });
        }
        
        // Busca a lista de utilizadores para o dropdown
        if (isOpen) {
            getUsuarios({ ativo: true })
                .then(data => setUsers(data.users || data.data || []))
                .catch(() => toast.error("Erro ao carregar lista de responsáveis."));
        }
    }, [task, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateTaskApi(task._id, formData);
            toast.success("Tarefa atualizada com sucesso!");
            onSaveSuccess(); // Notifica o componente pai para atualizar a lista
            onClose(); // Fecha o modal
        } catch (error) {
            toast.error(error.message || "Falha ao atualizar a tarefa.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Editar Tarefa</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Título</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Descrição</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3"></textarea>
                    </div>
                    <div className="form-group">
                        <label>Data de Vencimento</label>
                        <input type="datetime-local" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Atribuído Para</label>
                        <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} required>
                            <option value="">Selecione um responsável...</option>
                            {users.map(user => <option key={user._id} value={user._id}>{user.nome}</option>)}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="button submit-button" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditTaskModal;