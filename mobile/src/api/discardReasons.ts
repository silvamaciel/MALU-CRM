import { api } from './http';

export type DiscardReason = { _id: string; nome: string; ativo?: boolean };

export async function getDiscardReasons(): Promise<DiscardReason[]> {
  // seu backend web: /motivosdescarte
  const { data } = await api.get('/motivosdescarte');
  return Array.isArray(data) ? data : (data?.data ?? []);
}
