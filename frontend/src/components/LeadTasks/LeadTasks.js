import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getTasksApi, createTaskApi, updateTaskApi, deleteTaskApi } from '../../api/taskApi';
import ConfirmModal from '../ConfirmModal/ConfirmModal'; // Verifique se o caminho está correto
import './LeadTasks.css';

function LeadTasks({ leadId }) { // A prop 'currentUserId' não é mais necessária
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    
    // O estado para a nova tarefa é mais simples, sem 'assignedTo'
    const [newTask, setNewTask] = useState({ title: '', dueDate: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // States para o modal de exclusão
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchTasks = useCallback(async () => {
        if (!leadId) return;
        setLoading(true);
        try {
            // A busca agora é mais simples, não precisa mais buscar os utilizadores
            const tasksData = await getTasksApi({ lead: leadId });
            setTasks(tasksData || []);
        } catch (error) {
            toast.error("Erro ao carregar tarefas do lead.");
            console.error("Erro ao carregar tarefas:", error);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleToggleStatus = async (task) => {
        try {
            const newStatus = task.status === 'Pendente' ? 'Concluída' : 'Pendente';
            const updatedTask = await updateTaskApi(task._id, { status: newStatus });
            setTasks(prevTasks => prevTasks.map(t => t._id === task._id ? updatedTask : t));
            toast.success(`Tarefa "${task.title}" marcada como ${newStatus.toLowerCase()}!`);
        } catch (error) {
            toast.error("Erro ao atualizar o status da tarefa.");
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTask.title || !newTask.dueDate) {
            toast.warn("Título e data de vencimento são obrigatórios.");
            return;
        }
        setIsSubmitting(true);
        try {
            // O payload não envia 'assignedTo'. O backend cuidará disso automaticamente usando o token.
            await createTaskApi({ ...newTask, lead: leadId });
            toast.success("Nova tarefa criada com sucesso!");
            setNewTask({ title: '', dueDate: '', description: '' }); // Limpa o formulário
            setShowCreateForm(false);
            fetchTasks(); // Recarrega a lista de tarefas
        } catch (error) {
            toast.error(error.message || "Falha ao criar tarefa.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDeleteModal = (task) => {
        setDeleteTarget(task);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        try {
            await deleteTaskApi(deleteTarget._id);
            toast.success("Tarefa excluída com sucesso!");
            fetchTasks(); // Recarrega a lista
        } catch (error) {
            toast.error("Falha ao excluir tarefa.");
        } finally {
            setIsSubmitting(false);
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };
    
    return (
        <div className="lead-tasks-container">
            <div className="tasks-header">
                <h4>Tarefas do Lead</h4>
                <button onClick={() => setShowCreateForm(!showCreateForm)} className="button small-button">
                    {showCreateForm ? 'Cancelar' : '+ Nova Tarefa'}
                </button>
            </div>

            {showCreateForm && (
                <form onSubmit={handleCreateTask} className="create-task-form">
                    <input 
                        type="text" 
                        placeholder="Título da tarefa" 
                        value={newTask.title} 
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                        disabled={isSubmitting}
                    />
                    <input 
                        type="datetime-local" 
                        value={newTask.dueDate} 
                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                        disabled={isSubmitting}
                    />
                    {/* O dropdown de responsável foi removido para simplificar */}
                    <button type="submit" className="button primary-button small-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </form>
            )}

            <div className="tasks-list">
                {loading ? <p>Carregando tarefas...</p> : (
                    tasks.length > 0 ? tasks.map(task => (
                        <div key={task._id} className={`task-item status-${task.status.toLowerCase()}`}>
                            <div className="task-status-toggle">
                                <input 
                                    type="checkbox" 
                                    checked={task.status === 'Concluída'} 
                                    onChange={() => handleToggleStatus(task)}
                                    title={`Marcar como ${task.status === 'Pendente' ? 'Concluída' : 'Pendente'}`}
                                />
                            </div>
                            <div className="task-details">
                                <span className="task-title">{task.title}</span>
                                <span className="task-metadata">
                                    Vence em: {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    {' - Para: '}
                                    <strong>{task.assignedTo?.nome || 'N/A'}</strong>
                                </span>
                            </div>
                            <div className="task-actions">
                                <button onClick={() => handleOpenDeleteModal(task)} className="button-link delete-link-task" title="Excluir Tarefa">
                                    &times;
                                </button>
                            </div>
                        </div>
                    )) : <p className="no-tasks-message">Nenhuma tarefa para este lead.</p>
                )}
            </div>
            
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir a tarefa "${deleteTarget?.title}"?`}
                isProcessing={isSubmitting}
                confirmButtonClass="confirm-button-delete"
            />
        </div>
    );
}

export default LeadTasks;