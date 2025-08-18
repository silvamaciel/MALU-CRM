import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getTasksApi } from '../../api/taskApi';
import TaskList from '../../components/TaskList/TaskList';
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

  // paginação
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0); // Força recarregar KPIs após update

  // KPIs (independente de paginação)
  const fetchKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const data = await getTasksApi(); // backend já filtra pelo usuário
      setKpis(data.kpis || { concluidas: 0, vencidas: 0, aVencer: 0 });
    } catch {
      toast.error('Erro ao carregar KPIs de tarefas.');
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  useEffect(() => { fetchKpis(); }, [fetchKpis, refreshKey]);

  // Filtros passados ao TaskList
  const taskFilters = { status: filter };

  // Quando trocar o filtro, voltar para a página 1
  useEffect(() => { setPage(1); }, [filter, limit]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  return (
    <div className="admin-page tasks-page">
      <header className="page-header">
        <h1>Minhas Tarefas</h1>
        <div className="list-toolbar">
          <label className="limit-label">
            Itens por página:
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </header>

      <div className="page-content">
        <div className="kpi-container-tasks">
          <KPICard title="A Vencer" value={kpis.aVencer} className="kpi-due" />
          <KPICard title="Vencidas" value={kpis.vencidas} className="kpi-overdue" />
          <KPICard title="Concluídas" value={kpis.concluidas} className="kpi-done" />
        </div>

        <div className="tasks-filters">
          <button
            onClick={() => setFilter('Pendente')}
            className={`button ${filter === 'Pendente' ? 'primary-button' : 'outline-button'}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('Concluída')}
            className={`button ${filter === 'Concluída' ? 'primary-button' : 'outline-button'}`}
          >
            Concluídas
          </button>
        </div>

        <div className="tasks-list-container">
          <TaskList
            key={`${filter}-${page}-${limit}`}     // força recarregar quando mudar
            filters={taskFilters}
            page={page}
            limit={limit}
            onLoaded={(meta) => {
              // meta esperado do TaskList
              setTotalTasks(meta?.total ?? 0);
              setTotalPages(meta?.totalPages ?? 1);
              if (meta?.currentPage) setPage(meta.currentPage);
            }}
            onTaskUpdate={() => setRefreshKey(prev => prev + 1)}
          />
        </div>

      </div>

    </div>
    
  );
}

export default TasksPage;
