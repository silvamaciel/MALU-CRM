import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getTasksApi } from '../../api/taskApi';
import TaskList from '../../components/TaskList/TaskList'; // <<< IMPORTA O COMPONENTE REUTILIZÁVEL
import './TasksPage.css';

const KPICard = ({ title, value, className }) => (
    <div className={`kpi-card-task ${className}`}>
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{title}</span>
    </div>
);

function TasksPage() {
    const [kpis, setKpis] = useState({ concluidas: 0, vencidas: 0, aVencer: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);
    const [filter, setFilter] = useState('Pendente');
    const [refreshKey, setRefreshKey] = useState(0); // Para forçar a atualização dos KPIs

    // Esta função agora busca apenas os KPIs. A lista de tarefas será buscada pelo TaskList.
    const fetchKpis = useCallback(async () => {
        setLoadingKpis(true);
        try {
            // O backend já filtra pelo utilizador logado. A API retorna os KPIs de qualquer forma.
            const data = await getTasksApi();
            setKpis(data.kpis || { concluidas: 0, vencidas: 0, aVencer: 0 });
        } catch (error) {
            toast.error("Erro ao carregar KPIs de tarefas.");
        } finally {
            setLoadingKpis(false);
        }
    }, []);

    useEffect(() => {
        fetchKpis();
    }, [fetchKpis, refreshKey]);

    // O objeto de filtros que será passado para o componente TaskList
    // O backend já adiciona o 'assignedTo' automaticamente, não precisamos enviar
    const taskFilters = {
        status: filter,
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
                <div className="kpi-container-tasks">
                    <KPICard title="A Vencer" value={kpis.aVencer} className="kpi-due" />
                    <KPICard title="Vencidas" value={kpis.vencidas} className="kpi-overdue" />
                    <KPICard title="Concluídas" value={kpis.concluidas} className="kpi-done" />
                </div>

                <div className="tasks-list-container">
                    {/* Renderiza o novo componente reutilizável, passando os filtros.
                      A prop onTaskUpdate garante que, quando uma tarefa é atualizada
                      dentro do TaskList, os KPIs nesta página também são recarregados.
                    */}
                    <TaskList filters={taskFilters} onTaskUpdate={() => setRefreshKey(prev => prev + 1)} />
                </div>
            </div>
        </div>
    );
}

export default TasksPage;