import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTasksApi, updateTaskApi, deleteTaskApi } from '../../api/taskApi';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import EditTaskModal from '../EditTaskModal/EditTaskModal';
import CreateTaskModal from '../CreateTaskModal/CreateTaskModal';
import './styleTaskList.css';

/**
 * Props:
 * - filters
 * - onTaskUpdate
 * - currentLeadId
 * - page, limit (opcional; modo controlado se passar onPageChange/onLimitChange)
 * - onLoaded: (meta) => { total, totalPages, currentPage }
 * - onPageChange?: (p) => void
 * - onLimitChange?: (l) => void
 * - viewportOffset?: string | number  (ex: '96px' para descontar header externo). Default: 0
 */
function TaskList({
  filters,
  onTaskUpdate,
  currentLeadId = null,
  page = 1,
  limit = 10,
  onLoaded,
  onPageChange,
  onLimitChange,
  viewportOffset = 0,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, currentPage: 1 });

  const isPageControlled = typeof onPageChange === 'function';
  const isLimitControlled = typeof onLimitChange === 'function';
  const [localPage, setLocalPage] = useState(page || 1);
  const [localLimit, setLocalLimit] = useState(limit || 10);
  const effectivePage = isPageControlled ? page : localPage;
  const effectiveLimit = isLimitControlled ? limit : localLimit;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [ownerScope, setOwnerScope] = useState(
    () => localStorage.getItem('taskScope') || 'all'
  );
  useEffect(() => {
    localStorage.setItem('taskScope', ownerScope);
  }, [ownerScope]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveFilters = {
        ...(filters || {}),
        ...(currentLeadId ? { lead: currentLeadId } : {}),
        ...(ownerScope === 'mine' ? { mine: '1' } : {}),
        page: effectivePage,
        limit: effectiveLimit,
      };

      const data = await getTasksApi(effectiveFilters);
      const list = Array.isArray(data?.tasks) ? data.tasks : [];
      const metaResp = {
        total: data?.totalTasks ?? list.length,
        totalPages: data?.totalPages ?? 1,
        currentPage: data?.currentPage ?? effectivePage,
      };
      setTasks(list);
      setMeta(metaResp);
      onLoaded?.(metaResp);
    } catch (error) {
      toast.error('Erro ao carregar a lista de tarefas.');
      console.error('Erro em fetchTasks:', error);
      setTasks([]);
      setMeta({ total: 0, totalPages: 1, currentPage: 1 });
      onLoaded?.({ total: 0, totalPages: 1, currentPage: 1 });
    } finally {
      setLoading(false);
    }
  }, [filters, currentLeadId, ownerScope, effectivePage, effectiveLimit, onLoaded]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const goToPage = (p) => {
    const target = Math.max(1, Math.min(p, meta.totalPages || 1));
    if (isPageControlled) onPageChange(target);
    else setLocalPage(target);
  };
  const changePageSize = (newLimit) => {
    const lim = Number(newLimit) || 10;
    if (isLimitControlled) onLimitChange(lim); else setLocalLimit(lim);
    if (isPageControlled) onPageChange(1); else setLocalPage(1);
  };

  const openDeleteModal = (task) => { setDeleteTarget(task); setIsDeleteModalOpen(true); };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      await deleteTaskApi(deleteTarget._id);
      toast.success('Tarefa excluída com sucesso!');
      if (tasks.length === 1 && (meta.currentPage || effectivePage) > 1) {
        goToPage((meta.currentPage || effectivePage) - 1);
      } else {
        fetchTasks();
      }
      onTaskUpdate?.();
    } catch {
      toast.error('Falha ao excluir tarefa.');
    } finally {
      setIsProcessing(false);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'Pendente' ? 'Concluída' : 'Pendente';
      await updateTaskApi(task._id, { status: newStatus });
      toast.success(`Tarefa marcada como ${newStatus.toLowerCase()}!`);
      fetchTasks();
      onTaskUpdate?.();
    } catch {
      toast.error('Erro ao atualizar status da tarefa.');
    }
  };

  const handleOpenEditModal = (task) => { setTaskToEdit(task); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setTaskToEdit(null); };
  const handleEditSuccess = () => { handleCloseEditModal(); fetchTasks(); onTaskUpdate?.(); };

  const handleOpenCreateModal = () => setIsCreateModalOpen(true);
  const handleCloseCreateModal = () => setIsCreateModalOpen(false);
  const handleCreateSuccess = () => { handleCloseCreateModal(); fetchTasks(); onTaskUpdate?.(); };

  const showing = useMemo(() => {
    const total = meta.total || 0;
    if (!total) return { start: 0, end: 0, total: 0 };
    const start = (meta.currentPage - 1) * effectiveLimit + 1;
    const end = Math.min(start + effectiveLimit - 1, total);
    return { start, end, total };
  }, [meta, effectiveLimit]);

  const pageWindow = useMemo(() => {
    const totalPages = meta.totalPages || 1;
    const current = meta.currentPage || 1;
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
    return { start, end, current, totalPages };
  }, [meta]);

  if (loading) return <p>Carregando tarefas...</p>;

  // CSS var para descontar header externo se necessário
  const shellStyle = {
    '--tasklist-offset': typeof viewportOffset === 'number' ? `${viewportOffset}px` : String(viewportOffset),
  };

  return (
    <>
      {/* SHELL limita a 100vh e organiza header / lista (scroll) / footer */}
      <div className="tasklist-shell" style={shellStyle}>
        <div className="tasks-toolbar">
          <button onClick={handleOpenCreateModal} className="button-link create-link-task">
            + Nova Tarefa
          </button>

          <div className="task-scope">
            <label htmlFor="task-scope-select">Exibir:</label>
            <select
              id="task-scope-select"
              value={ownerScope}
              onChange={(e) => { setOwnerScope(e.target.value); goToPage(1); }}
              className="task-scope-select"
            >
              <option value="all">Todas</option>
              <option value="mine">Minhas</option>
            </select>
          </div>
        </div>

        {/* SCROLL apenas aqui */}
        <div className="tasks-scroll">
          <div className="tasks-list-component">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task._id}
                  className={`task-item-full status-${task.status.toLowerCase()}`}
                >
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
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-metadata-full">
                      <span>
                        Vence em:{' '}
                        <strong>{new Date(task.dueDate).toLocaleString('pt-BR')}</strong>
                      </span>
                      {task.lead && (
                        <span>
                          Lead:{' '}
                          <Link to={`/leads/${task.lead._id}`}>{task.lead.nome}</Link>
                        </span>
                      )}
                      <span>
                        Para: <strong>{task.assignedTo?.nome || 'N/A'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      onClick={() => handleOpenEditModal(task)}
                      className="button-link edit-link-task"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => openDeleteModal(task)}
                      className="button-link delete-link-task"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-tasks-message">Nenhuma tarefa encontrada para este filtro.</p>
            )}
          </div>
        </div>

        <div className="tasks-pagination">
          <div className="pagination-left">
            <span className="pagination-range">
              Mostrando <strong>{showing.start}</strong>–<strong>{showing.end}</strong> de{' '}
              <strong>{showing.total}</strong>
            </span>

            <label className="page-size">
              Itens por página:
              <select
                value={effectiveLimit}
                onChange={(e) => changePageSize(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="pagination-right">
            <button
              className="page-btn"
              onClick={() => goToPage(1)}
              disabled={meta.currentPage <= 1}
              aria-label="Primeira página"
            >
              «
            </button>
            <button
              className="page-btn"
              onClick={() => goToPage(meta.currentPage - 1)}
              disabled={meta.currentPage <= 1}
              aria-label="Página anterior"
            >
              ‹
            </button>

            {pageWindow.start > 1 && (
              <>
                <button className="page-btn" onClick={() => goToPage(1)}>1</button>
                <span className="ellipsis">…</span>
              </>
            )}

            {Array.from({ length: pageWindow.end - pageWindow.start + 1 }, (_, i) => {
              const p = pageWindow.start + i;
              const active = p === meta.currentPage;
              return (
                <button
                  key={p}
                  className={`page-btn ${active ? 'is-active' : ''}`}
                  onClick={() => goToPage(p)}
                  aria-current={active ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}

            {pageWindow.end < pageWindow.totalPages && (
              <>
                <span className="ellipsis">…</span>
                <button className="page-btn" onClick={() => goToPage(pageWindow.totalPages)}>
                  {pageWindow.totalPages}
                </button>
              </>
            )}

            <button
              className="page-btn"
              onClick={() => goToPage(meta.currentPage + 1)}
              disabled={meta.currentPage >= meta.totalPages}
              aria-label="Próxima página"
            >
              ›
            </button>
            <button
              className="page-btn"
              onClick={() => goToPage(meta.totalPages)}
              disabled={meta.currentPage >= meta.totalPages}
              aria-label="Última página"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Modais fora do shell/scroll */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSaveSuccess={handleCreateSuccess}
        currentLeadId={currentLeadId}
      />

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
    </>
  );
}

export default TaskList;
