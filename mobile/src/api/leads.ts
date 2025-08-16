import { api } from './http';
import { endpoints } from './config';

const isHex24 = (v: any) => /^[a-fA-F0-9]{24}$/.test(String(v).trim());

export type GetLeadsParams = {
  page?: number;
  limit?: number;
  termoBusca?: string;
  origem?: string | null;
  responsavel?: string | null;
  situacao?: string | null;
  dataInicio?: string;
  dataFim?: string;
  tags?: string; // CSV: "vip,quente"
};

export type Lead = {
  _id: string;
  nome: string;
  email?: string;
  contato?: string;
  telefone?: string;
  situacao?: any;
  origem?: any;
  responsavel?: any;
  tags?: string[];
  updatedAt?: string;
};

export type Option = { value: string; label: string };

// ---------------------------
// LISTAGEM (com filtros)
// ---------------------------
export async function getLeads(params: GetLeadsParams = {}) {
  // --- NORMALIZAÇÃO DOS FILTROS ---
  const clean: Record<string, any> = { ...params };

  if (clean.page) clean.page = Number(clean.page);
  if (clean.limit) clean.limit = Number(clean.limit);

  if (clean.termoBusca) clean.termoBusca = String(clean.termoBusca).trim();

  // Apenas IDs válidos (24-hex)
  if (clean.origem) {
    const id = String(clean.origem).trim();
    clean.origem = isHex24(id) ? id : undefined;
  }
  if (clean.responsavel) {
    const id = String(clean.responsavel).trim();
    clean.responsavel = isHex24(id) ? id : undefined;
  }
  if (clean.situacao) {
    const id = String(clean.situacao).trim();
    clean.situacao = isHex24(id) ? id : undefined;
  }

  // Limpa chaves vazias
  Object.keys(clean).forEach((k) => {
    if (clean[k] === undefined || clean[k] === null || clean[k] === '') delete clean[k];
  });

  const { data } = await api.get('/leads', { params: clean });

  // --- NORMALIZAÇÃO DO RETORNO ---
  const root = (data as any)?.data ?? data;

  const items: Lead[] =
    root?.leads ||
    root?.items ||
    root?.data ||
    (Array.isArray(root) ? root : []) ||
    [];

  const page = root?.currentPage ?? root?.page ?? 1;
  const totalPages = root?.totalPages ?? root?.meta?.totalPages ?? undefined;

  return { items, page, totalPages };
}

// ---------------------------
// DETALHE
// ---------------------------
export async function getLeadById(id: string): Promise<Lead> {
  const { data } = await api.get(`/leads/${id}`);
  return (data as any)?.data ?? data;
}

// ---------------------------
// CRIAÇÃO / ATUALIZAÇÃO / EXCLUSÃO
// ---------------------------
export async function createLead(payload: Record<string, any>) {
  // payload deve conter pelo menos: { nome, contato, situacao, ... }
  const { data } = await api.post('/leads', payload);
  return (data as any)?.data ?? data;
}

export async function updateLead(id: string, payload: Record<string, any>) {
  const { data } = await api.put(`/leads/${id}`, payload);
  return (data as any)?.data ?? data;
}

export async function deleteLead(id: string) {
  const { data } = await api.delete(`/leads/${id}`);
  return (data as any)?.data ?? data;
}

// ---------------------------
// DESCARTE / HISTÓRICO
// ---------------------------
export async function discardLead(id: string, discardData: { motivoDescarte: string; comentario?: string }) {
  if (!discardData?.motivoDescarte) throw new Error('O motivo do descarte é obrigatório.');
  const { data } = await api.put(`/leads/descartar/${id}`, discardData);
  return (data as any)?.data ?? data;
}

export async function getLeadHistory(id: string) {
  const { data } = await api.get(`/leads/${id}/history`);
  const root = (data as any)?.data ?? data;
  return Array.isArray(root) ? root : [];
}

// ---------------------------
/* LISTAS AUXILIARES (Selects) */
// ---------------------------
const toOptions = (arr: any[], idKey = '_id', labelKey = 'nome'): Option[] =>
  (arr || [])
    .map((o: any) => {
      const value = String(o?.[idKey] ?? o?.id ?? o?.value ?? '').trim();
      const label = String(o?.[labelKey] ?? o?.label ?? '').trim();
      return { value, label };
    })
    .filter((opt) => opt.value && opt.label);

export async function listSituacoes(): Promise<Option[]> {
  const { data } = await api.get('/leadstages');
  const root = (data as any)?.data ?? data;
  return toOptions(root, '_id', 'nome');
}

export async function listOrigens(): Promise<Option[]> {
  const { data } = await api.get('/origens');
  const root = (data as any)?.data ?? data;
  // filtra apenas opções com ObjectId válido (evita erro no filtro)
  return toOptions(root, '_id', 'nome').filter((o) => isHex24(o.value));
}

export async function listUsuarios(): Promise<Option[]> {
  // ajuste a rota se necessário (ex: '/users/all')
  const { data } = await api.get('/users');
  const root = (data as any)?.data ?? data;
  return toOptions(root, '_id', 'nome');
}

// (opcional) usado em selects de tarefa
export async function listLeadsForSelect(q: string) {
  const { data } = await api.get('/leads', { params: { termoBusca: q, limit: 10 } });
  const root = (data as any)?.data ?? data;
  const items: Lead[] = root?.leads || root?.items || root || [];
  return items.map((l) => ({ value: l._id, label: l.nome }));
}

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