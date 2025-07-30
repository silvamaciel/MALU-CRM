import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTasksApi, updateTaskApi, deleteTaskApi } from '../../api/taskApi';
import { useAuth } from '../../hooks/useAuth';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './TasksPage.css';

// Componente para os Cards de KPI
const KPICard = ({ title, value, className }) => (
    <div className={`kpi-card-task ${className}`}>
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{title}</span>
    </div>
);

function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [kpis, setKpis] = useState({ concluidas: 0, vencidas: 0, aVencer: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pendente');
    const { user } = useAuth(); // Obtém o utilizador logado

    // States para modais de edição e exclusão
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchTasks = useCallback(async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const { tasks: tasksData, kpis: kpisData } = await getTasksApi({ 
                status: filter, 
                assignedTo: user._id 
            });
            setTasks(tasksData || []);
            setKpis(kpisData || { concluidas: 0, vencidas: 0, aVencer: 0 });
        } catch (error) {
            toast.error("Erro ao carregar tarefas.");
        } finally {
            setLoading(false);
        }
    }, [filter, user]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleToggleStatus = async (task) => {
        try {
            const newStatus = task.status === 'Pendente' ? 'Concluída' : 'Pendente';
            await updateTaskApi(task._id, { status: newStatus });
            toast.success(`Tarefa marcada como ${newStatus.toLowerCase()}!`);
            fetchTasks(); // Recarrega tudo para atualizar KPIs e a lista
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
        } catch (error) {
            toast.error("Falha ao excluir tarefa.");
        } finally {
            setIsProcessing(false);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <div className="admin-page tasks-page">
            <header className="page-header">
                <h1>Minhas Tarefas</h1>
                <div className="header-actions">
                    {/* Botão para criar tarefa pode ser adicionado aqui no futuro */}
                </div>
            </header>
            <div className="page-content">
                {/* Seção de KPIs */}
                <div className="kpi-container-tasks">
                    <KPICard title="A Vencer" value={kpis.aVencer} className="kpi-due" />
                    <KPICard title="Vencidas" value={kpis.vencidas} className="kpi-overdue" />
                    <KPICard title="Concluídas (no período)" value={kpis.concluidas} className="kpi-done" />
                </div>

                {/* Seção de Filtros */}
                <div className="tasks-filters-container">
                    <div className="tasks-filters">
                        <button onClick={() => setFilter('Pendente')} className={`button ${filter === 'Pendente' ? 'primary-button' : 'outline-button'}`}>Pendentes</button>
                        <button onClick={() => setFilter('Concluída')} className={`button ${filter === 'Concluída' ? 'primary-button' : 'outline-button'}`}>Concluídas</button>
                    </div>
                    {/* Botão para a visão de Calendário pode ser adicionado aqui */}
                </div>

                <div className="tasks-list-container">
                    {loading ? <p>Carregando tarefas...</p> : (
                        tasks.length > 0 ? tasks.map(task => (
                            <div key={task._id} className={`task-item-full status-${task.status.toLowerCase()}`}>
                                <div className="task-status-toggle">
                                    <input 
                                        type="checkbox" 
                                        checked={task.status === 'Concluída'} 
                                        onChange={() => handleToggleStatus(task)}
                                    />
                                </div>
                                <div className="task-content">
                                    <p className="task-title">{task.title}</p>
                                    {task.description && <p className="task-description">{task.description}</p>}
                                    <div className="task-metadata-full">
                                        <span>Vence em: <strong>{new Date(task.dueDate).toLocaleString('pt-BR')}</strong></span>
                                        {task.lead && <span>Lead: <Link to={`/leads/${task.lead._id}`}>{task.lead.nome}</Link></span>}
                                    </div>
                                </div>
                                <div className="task-actions">
                                    <button className="button-link edit-link-task">Editar</button>
                                    <button onClick={() => handleOpenDeleteModal(task)} className="button-link delete-link-task">Excluir</button>
                                </div>
                            </div>
                        )) : <p className="no-tasks-message">Nenhuma tarefa encontrada.</p>
                    )}
                </div>
            </div>

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

export default TasksPage;