import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTasksApi, updateTaskApi, deleteTaskApi } from '../../api/taskApi';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './TaskList.css';

function TaskList({ filters, onTaskUpdate }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            // A API é chamada com os filtros recebidos via props
            const data = await getTasksApi(filters);
            setTasks(data.tasks || []);
        } catch (error) {
            toast.error("Erro ao carregar a lista de tarefas.");
            console.error("Erro em fetchTasks:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleToggleStatus = async (task) => {
        try {
            const newStatus = task.status === 'Pendente' ? 'Concluída' : 'Pendente';
            await updateTaskApi(task._id, { status: newStatus });
            toast.success(`Tarefa marcada como ${newStatus.toLowerCase()}!`);
            fetchTasks(); // Recarrega a lista
            if (onTaskUpdate) onTaskUpdate(); // Notifica o componente pai para atualizar os KPIs
        } catch (error) {
            toast.error("Erro ao atualizar status da tarefa.");
        }
    };

    const handleOpenDeleteModal = (task) => {
        setDeleteTarget(task);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsProcessing(true);
        try {
            await deleteTaskApi(deleteTarget._id);
            toast.success("Tarefa excluída com sucesso!");
            fetchTasks(); // Recarrega a lista
            if (onTaskUpdate) onTaskUpdate();
        } catch (error) {
            toast.error("Falha ao excluir tarefa.");
        } finally {
            setIsProcessing(false);
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    if (loading) {
        return <p>Carregando tarefas...</p>;
    }

    return (
        <div className="tasks-list-component">
            {tasks.length > 0 ? tasks.map(task => (
                <div key={task._id} className={`task-item-full status-${task.status.toLowerCase()}`}>
                    <div className="task-status-toggle">
                        <input 
                            type="checkbox" 
                            checked={task.status === 'Concluída'} 
                            onChange={() => handleToggleStatus(task)}
                            title={`Marcar como ${task.status === 'Pendente' ? 'Concluída' : 'Pendente'}`}
                        />
                    </div>
                    <div className="task-content">
                        <p className="task-title">{task.title}</p>
                        {task.description && <p className="task-description">{task.description}</p>}
                        <div className="task-metadata-full">
                            <span>Vence em: <strong>{new Date(task.dueDate).toLocaleString('pt-BR')}</strong></span>
                            {task.lead && <span>Lead: <Link to={`/leads/${task.lead._id}`}>{task.lead.nome}</Link></span>}
                            <span>Para: <strong>{task.assignedTo?.nome || 'N/A'}</strong></span>
                        </div>
                    </div>
                    <div className="task-actions">
                        <button onClick={() => toast.info('Funcionalidade de edição a ser implementada.')} className="button-link edit-link-task">Editar</button>
                        <button onClick={() => handleOpenDeleteModal(task)} className="button-link delete-link-task">Excluir</button>
                    </div>
                </div>
            )) : <p className="no-tasks-message">Nenhuma tarefa encontrada para este filtro.</p>}
            
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir a tarefa "${deleteTarget?.title}"?`}
                isProcessing={isProcessing}
                confirmButtonClass="confirm-button-delete"
            />
        </div>
    );
}
export default TaskList;