import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTasksApi, updateTaskApi, deleteTaskApi } from '../../api/taskApi';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import EditTaskModal from '../../components/EditTaskModal/EditTaskModal';
import './TasksPage.css';

// Componente reutilizável para os Cards de KPI
const KPICard = ({ title, value, className }) => (
    <div className={`kpi-card-task ${className}`}>
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{title}</span>
    </div>
);

function TasksPage() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [kpis, setKpis] = useState({ concluidas: 0, vencidas: 0, aVencer: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pendente'); // Filtro inicial: Pendente
    
    // States para paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // States para o modal de exclusão
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // novo stats modal edicao 
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);



    // Função para buscar dados do backend
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                status: filter,
                page: currentPage,
                limit: 10 // Define 10 tarefas por página
            };
            // O backend já filtra pelo utilizador logado através do token
            const data = await getTasksApi(params);
            
            setTasks(data.tasks || []);
            setKpis(data.kpis || { concluidas: 0, vencidas: 0, aVencer: 0 });
            setTotalPages(data.totalPages || 1);
            setCurrentPage(data.currentPage || 1);

        } catch (error) {
            toast.error("Erro ao carregar tarefas.");
            console.error("Erro ao carregar tarefas:", error);
        } finally {
            setLoading(false);
        }
    }, [filter, currentPage]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    // Zera a página para a primeira quando o filtro muda
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);


    // handlers para modal de edicao

     const handleOpenEditModal = (task) => {
        setTaskToEdit(task);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setTaskToEdit(null);
    };

    const handleEditSuccess = () => {
        handleCloseEditModal();
        fetchTasks();
    };

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
            setDeleteTarget(null);
        }
    };

    return (
        <div className="admin-page tasks-page">
            <header className="page-header">
                <h1>Minhas Tarefas</h1>
            </header>
            <div className="page-content">
                <div className="kpi-container-tasks">
                    <KPICard title="A Vencer" value={kpis.aVencer} className="kpi-due" />
                    <KPICard title="Vencidas" value={kpis.vencidas} className="kpi-overdue" />
                    <KPICard title="Concluídas" value={kpis.concluidas} className="kpi-done" />
                </div>

                <div className="tasks-filters-container">
                    <div className="tasks-filters">
                        <button onClick={() => setFilter('Pendente')} className={`button ${filter === 'Pendente' ? 'primary-button' : 'outline-button'}`}>Pendentes</button>
                        <button onClick={() => setFilter('Concluída')} className={`button ${filter === 'Concluída' ? 'primary-button' : 'outline-button'}`}>Concluídas</button>
                    </div>
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
                                        title={`Marcar como ${task.status === 'Pendente' ? 'Concluída' : 'Pendente'}`}
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
                                    <button onClick={() => handleOpenEditModal(task)} className="button-link edit-link-task">Editar</button>
                                    <button onClick={() => handleOpenDeleteModal(task)} className="button-link delete-link-task">Excluir</button>
                                </div>
                            </div>
                        )) : <p className="no-tasks-message">Nenhuma tarefa encontrada para este filtro.</p>
                    )}
                </div>

                {tasks.length > 0 && totalPages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1 || loading}>
                            Anterior
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || loading}>
                            Próxima
                        </button>
                    </div>
                )}
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

            <EditTaskModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSaveSuccess={handleEditSuccess}
                task={taskToEdit}
            />
        </div>
    );
}

export default TasksPage;