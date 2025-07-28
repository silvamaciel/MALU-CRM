import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getTasksApi, createTaskApi, updateTaskApi, deleteTaskApi } from '../../api/taskApi';
import { getUsuarios } from '../../api/users'; // Para o dropdown de responsáveis
import './LeadTasks.css';

function LeadTasks({ leadId }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);


    const storedUser = JSON.parse(localStorage.getItem("userData"));
    const currentUserId = storedUser?._id;
    const [newTask, setNewTask] = useState({ title: '', dueDate: ''});
    const [users, setUsers] = useState([]);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const [tasksData, usersData] = await Promise.all([
                getTasksApi({ lead: leadId }),
                getUsuarios({ ativo: true })
            ]);
            setTasks(tasksData || []);
            setUsers(usersData.users || usersData.data || []);
        } catch (error) {
            toast.error("Erro ao carregar tarefas.");
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
            toast.error("Erro ao atualizar status da tarefa.");
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTask.title || !newTask.dueDate) {
            toast.warn("Título e data de vencimento são obrigatórios.");
            return;
        }
        try {
            await createTaskApi({ ...newTask, lead: leadId });
            toast.success("Nova tarefa criada com sucesso!");
            setNewTask({ title: '', dueDate: '', assignedTo: currentUserId });
            setShowCreateForm(false);
            fetchTasks(); // Recarrega a lista
        } catch (error) {
            toast.error(error.message || "Falha ao criar tarefa.");
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
                    />
                    <input 
                        type="datetime-local" 
                        value={newTask.dueDate} 
                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    />
                    <button type="submit" className="button primary-button small-button">Salvar</button>
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
                        </div>
                    )) : <p className="no-tasks-message">Nenhuma tarefa para este lead.</p>
                )}
            </div>
        </div>
    );
}

export default LeadTasks;