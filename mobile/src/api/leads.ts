import { api } from './http';
import { endpoints } from './config';

export type SelectOption = { value: string; label: string };

export type Lead = {
  _id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  situacao?: { _id: string; nome: string } | string | null;
  origem?: { _id: string; nome: string } | string | null;
  responsavel?: { _id: string; nome: string; email?: string } | string | null;
  observacoes?: string;
  [k: string]: any;
};



export type Option = { value: string; label: string };

export async function listLeads(params: { page?: number; limit?: number; search?: string } = {}) {
  const { data: raw } = await api.get(endpoints.leads, { params });
  const items =
    Array.isArray(raw) ? raw
      : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.leads) ? raw.leads
          : Array.isArray(raw?.items) ? raw.items
            : [];
  const meta = {
    count: raw?.count ?? items.length ?? 0,
    page: raw?.page ?? params.page ?? 1,
    limit: raw?.limit ?? params.limit ?? items.length ?? 0,
    totalPages: raw?.totalPages ?? null,
    success: raw?.success ?? true,
  };
  return { items, meta, raw };
}

export async function getLeadById(id: string): Promise<Lead> {
  const { data } = await api.get(endpoints.leadById(id));
  // se backend retorna { data: {...} }
  return data?.data ?? data;
}

export async function createLead(payload: {
  nome: string;
  contato: string;
  email?: string | null;
  comentario?: string;
  situacao: string;
  origem?: string;
  responsavel?: string;
}) {
  const { data } = await api.post(endpoints.leads, payload);
  return data?.data ?? data;
}


export async function updateLead(
  id: string,
  payload: Partial<{
    nome: string;
    contato: string | null;   // null para limpar / string para alterar
    email: string | null;
    comentario: string | null;
    situacao: string;
    origem: string;
    responsavel: string;
  }>
) {
  const { data } = await api.put(endpoints.leadById(id), payload);
  return data?.data ?? data;
}

// Listas de opções
export async function listSituacoes(): Promise<Option[]> {
  const { data } = await api.get(endpoints.situacoes);
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return arr.map((s: any) => ({ value: String(s._id || s.id), label: String(s.nome || s.name || s.title) }));
}

export async function listOrigens(): Promise<Option[]> {
  const { data } = await api.get(endpoints.origens);
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return arr.map((o: any) => ({ value: String(o._id || o.id), label: String(o.nome || o.name || o.title) }));
}

export async function listUsuarios(): Promise<Option[]> {
  const { data } = await api.get(endpoints.users, { params: { limit: 1000 } });
  // se vier paginado, tente data.items/data.users/data
  const arr = Array.isArray(data?.data) ? data.data
    : Array.isArray(data?.users) ? data.users
      : Array.isArray(data?.items) ? data.items
        : Array.isArray(data) ? data : [];
  return arr.map((u: any) => ({ value: String(u._id || u.id), label: String(u.nome || u.name || u.email || u._id) }));
}

export async function getLeadHistory(leadId: string) {
  if (!leadId) return [];
  const { data } = await api.get(`/leads/${leadId}/history`);
  // alguns backends retornam diretamente o array; outros vêm como { data: [...] }
  return Array.isArray(data) ? data : (data?.data ?? []);
}


export async function deleteLead(id: string) {
  const { data } = await api.delete(`/leads/${id}`);
  // pode vir 204 sem corpo ou { message: ... }
  return data?.data ?? data ?? true;
}

export async function discardLead(
  id: string,
  payload: { motivoDescarte: string; comentario?: string }
) {
  const { data } = await api.put(`/leads/descartar/${id}`, payload);
  return data?.data ?? data;
}

export async function listLeadsForSelect(limit = 100): Promise<SelectOption[]> {
  const { data } = await api.get('/leads', { params: { page: 1, limit } });

  // Aceita múltiplos formatos: {data:[]}, {docs:[]}, {leads:[]}, {items:[]}, ou array puro
  const arr =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.docs) && data.docs) ||
    (Array.isArray(data?.leads) && data.leads) ||
    (Array.isArray(data?.items) && data.items) ||
    [];

  return arr.map((l: any) => ({
    value: String(l._id || l.id),
    label: String(l.nome || l.name || l.email || 'Lead'),
  }));
}


export type GetLeadsParams = {
  page?: number;
  limit?: number;
  q?: string;
  situacao?: string | null;
  origem?: string | null;
  responsavel?: string | null;
  mine?: '1' | '0';
};

/**
 * Lista de leads com filtros/paginação.
 * Aceita diferentes formatos de resposta do backend e normaliza.
 */
export async function getLeads(params: GetLeadsParams = {}) {
  // remove chaves vazias
  const clean: Record<string, any> = { ...params };
  Object.keys(clean).forEach((k) => {
    if (clean[k] === undefined || clean[k] === null || clean[k] === '') delete clean[k];
  });

  const { data } = await api.get('/leads', { params: clean });

  // normalização do retorno (suporta {data:{...}} | {...} | array)
  const root = (data as any)?.data ?? data;

  const items =
    root?.leads ||
    root?.items ||
    root?.data ||
    (Array.isArray(root) ? root : []) ||
    [];

  const page = root?.page ?? 1;
  const totalPages = root?.totalPages ?? root?.meta?.totalPages ?? undefined;

  return { items, page, totalPages };
}