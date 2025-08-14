// src/api/tasks.ts
import { api } from './http';

export type TaskFilters = {
  status?: 'Pendente' | 'Concluída' | 'Todas';
  assignee?: string | null; // <- do UI
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  lead?: string;
  mine?: '1' | '0';
};

export async function getTasks(filters: TaskFilters = {}) {
  // --- normaliza filtros para o backend ---
  const params: Record<string, any> = { ...filters };

  // 'Todas' não deve ir como status
  if (params.status === 'Todas') delete params.status;

  // UI usa 'assignee', backend usa 'assignedTo'
  if (params.assignee) {
    params.assignedTo = params.assignee;
    delete params.assignee;
  } else {
    delete params.assignee;
  }

  // limpa vazios
  Object.keys(params).forEach((k) => {
    if (params[k] === undefined || params[k] === null || params[k] === '') delete params[k];
  });

  const { data } = await api.get('/tasks', { params });

  // --- aceita múltiplos formatos ({data:{tasks,kpis}} | {tasks,kpis} | array) ---
  const root = data?.data ?? data;

  const tasks =
    (Array.isArray(root?.tasks) && root.tasks) ||
    (Array.isArray(root?.items) && root.items) ||
    (Array.isArray(root) && root) ||
    [];

  const kpis = root?.kpis ?? { aVencer: 0, vencidas: 0, concluidas: 0 };

  return { tasks, kpis };
}

export type TaskInput = {
  title: string;
  description?: string;
  dueDate: string | Date;
  leadId?: string;
  assignedTo?: string;
};

export async function createTask(input: TaskInput) {
  const payload: any = {
    title: input.title?.trim(),
    description: input.description?.trim() || undefined,
    dueDate: new Date(input.dueDate).toISOString(),
    status: 'Pendente',
    ...(input.leadId ? { lead: input.leadId } : {}),
    ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
  };
  const { data } = await api.post('/tasks', payload);
  return data?.data ?? data;
}

export async function updateTask(id: string, input: Partial<TaskInput> & Record<string, any>) {
  const payload: any = {
    ...(input.title ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.dueDate ? { dueDate: new Date(input.dueDate).toISOString() } : {}),
    ...(input.leadId ? { lead: input.leadId } : {}),
    ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
  const { data } = await api.put(`/tasks/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteTask(id: string) {
  const { data } = await api.delete(`/tasks/${id}`);
  return data?.data ?? data;
}
