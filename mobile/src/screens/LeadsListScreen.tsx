import React, { useMemo, useState } from 'react';
import { View, ActivityIndicator, FlatList, RefreshControl, Text, Pressable } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ui/theme';
import AppBar from '../ui/components/AppBar';
import Fab from '../ui/components/Fab';
import LeadFiltersSheet, { LeadFiltersUI } from '../ui/components/LeadFiltersSheet';
import { getLeads, listOrigens, listSituacoes, listUsuarios } from '../api/leads';
import LeadListItem from '../ui/components/LeadListItem';

export default function LeadsListScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();

  // filtros do UI
  const [filters, setFilters] = useState<LeadFiltersUI>({});
  // 'all' = todos, 'mine' = apenas meus
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // opções dos selects
  const { data: situacoesRaw = [] } = useQuery({ queryKey: ['situacoes'], queryFn: listSituacoes });
  const { data: origensRaw = [] } = useQuery({ queryKey: ['origens'], queryFn: listOrigens });
  const { data: usuariosRaw = [] } = useQuery({ queryKey: ['usuarios'], queryFn: listUsuarios });

  const situacoes = useMemo(
    () => (situacoesRaw || []).map((s: any) => ({ value: s._id || s.value, label: s.nome || s.label })),
    [situacoesRaw]
  );
  const origens = useMemo(
    () => (origensRaw || []).map((o: any) => ({ value: o._id || o.value, label: o.nome || o.label })),
    [origensRaw]
  );
  const usuarios = useMemo(
    () => (usuariosRaw || []).map((u: any) => ({ value: u._id || u.value, label: u.nome || u.label })),
    [usuariosRaw]
  );

  // filtros enviados à API
  const apiFilters = useMemo(() => {
    const f: Record<string, any> = { ...filters };
    if (scope === 'mine') f.mine = '1' as const; // literal
    // mapeamentos padrão do backend: q, situacao, origem, responsavel, mine
    return f;
  }, [filters, scope]);

  // paginação infinita
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['leads', apiFilters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      // envia page/limit + filtros
      const res = await getLeads({ page: pageParam, limit: 20, ...apiFilters });
      // aceitar múltiplos formatos
      const root = (res as any)?.data ?? res;
      const items = root?.leads || root?.items || root?.data || root || [];
      const page = root?.page ?? pageParam;
      const totalPages = root?.totalPages ?? (root?.meta?.totalPages ?? undefined);
      return { items, page, totalPages };
    },
    getNextPageParam: (last) => {
      if (!last?.totalPages) return undefined;
      return last.page < last.totalPages ? last.page + 1 : undefined;
    },
  });

  const flat = (data?.pages || []).flatMap((p: any) => p.items);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar
        title="Leads"
        rightIcon="filter"
        onRightPress={() => setShowFilters(true)}
      />

      {/* Toggle Todas | Minhas */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <ScopePill label="Todas" active={scope === 'all'} onPress={() => setScope('all')} />
        <ScopePill label="Minhas" active={scope === 'mine'} onPress={() => setScope('mine')} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(it: any) => String(it._id || it.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <LeadListItem
              lead={item}
              onPress={() => nav.navigate('LeadDetail', { id: item._id || item.id })}
            />
          )}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <Text style={{ color: t.colors.subtext }}>Nenhum lead para este filtro.</Text>
            </View>
          }
        />
      )}

      <Fab onPress={() => nav.navigate('LeadForm')} />

      <LeadFiltersSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        initial={filters}
        onApply={(f) => setFilters(f)}
        onClear={() => setFilters({})}
        situacoes={situacoes}
        origens={origens}
        usuarios={usuarios}
      />
    </View>
  );
}

function ScopePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? t.colors.primary : t.colors.border,
        backgroundColor: active ? t.colors.primary + '20' : t.colors.surface,
      }}
    >
      <Text style={{ color: active ? t.colors.primary : t.colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
