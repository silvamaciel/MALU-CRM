import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTasksApi, updateTaskApi } from '../../api/taskApi'; // Reutilizamos a API de tarefas
import './TasksPage.css';

function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pendente'); // Filtro inicial

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            // Busca tarefas com o filtro de status aplicado
            const tasksData = await getTasksApi({ status: filter });
            setTasks(tasksData || []);
        } catch (error) {
            toast.error("Erro ao carregar tarefas.");
        } finally {
            setLoading(false);
        }
    }, [filter]); // Re-busca quando o filtro muda

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleToggleStatus = async (task) => {
        try {
            const newStatus = task.status === 'Pendente' ? 'Concluída' : 'Pendente';
            await updateTaskApi(task._id, { status: newStatus });
            // Remove a tarefa da lista atual para uma UX mais limpa
            setTasks(prevTasks => prevTasks.filter(t => t._id !== task._id));
            toast.success(`Tarefa marcada como ${newStatus.toLowerCase()}!`);
        } catch (error) {
            toast.error("Erro ao atualizar status da tarefa.");
        }
    };

    return (
        <div className="admin-page tasks-page">
            <header className="page-header">
                <h1>Minhas Tarefas</h1>
                <div className="tasks-filters">
                    <button onClick={() => setFilter('Pendente')} className={`button ${filter === 'Pendente' ? 'primary-button' : 'outline-button'}`}>Pendentes</button>
                    <button onClick={() => setFilter('Concluída')} className={`button ${filter === 'Concluída' ? 'primary-button' : 'outline-button'}`}>Concluídas</button>
                </div>
            </header>
            <div className="page-content">
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
                                    <p className="task-description">{task.description || 'Sem descrição.'}</p>
                                    <div className="task-metadata-full">
                                        <span>Vence em: <strong>{new Date(task.dueDate).toLocaleString('pt-BR')}</strong></span>
                                        <span>Para: <strong>{task.assignedTo?.nome || 'N/A'}</strong></span>
                                        <span>Lead: <Link to={`/leads/${task.lead?._id}`}>{task.lead?.nome || 'N/A'}</Link></span>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="no-tasks-message">Nenhuma tarefa encontrada para este filtro.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TasksPage;