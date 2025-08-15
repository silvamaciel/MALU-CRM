import React, { useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  Pressable,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../ui/theme';
import AppBar from '../ui/components/AppBar';
import Fab from '../ui/components/Fab';
import LeadFiltersSheet, { LeadFiltersUI } from '../ui/components/LeadFiltersSheet';
import LeadCardItem from '../ui/components/LeadCardItem';

import { getLeads, listOrigens, listSituacoes, listUsuarios } from '../api/leads';
import { useAuth } from '../context/AuthContext';

export default function LeadsListScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();

  // filtros do UI
  const [filters, setFilters] = useState<LeadFiltersUI>({});
  // 'all' = todos, 'mine' = apenas meus (-> responsavel = user._id)
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // opções dos selects
  const { data: situacoesRaw = [] } = useQuery({ queryKey: ['situacoes'], queryFn: listSituacoes });
  const { data: origensRaw = [] } = useQuery({ queryKey: ['origens'], queryFn: listOrigens });
  const { data: usuariosRaw = [] } = useQuery({ queryKey: ['usuarios'], queryFn: listUsuarios });

  const situacoes = useMemo(
    () =>
      (situacoesRaw || []).map((s: any) => ({
        value: s.value ?? s._id,
        label: s.label ?? s.nome,
      })),
    [situacoesRaw]
  );

  const origens = useMemo(
    () =>
      (origensRaw || [])
        .map((o: any) => ({
          value: o.value ?? o._id,
          label: o.label ?? o.nome,
        })),
    [origensRaw]
  );

  const usuarios = useMemo(
    () =>
      (usuariosRaw || []).map((u: any) => ({
        value: u.value ?? u._id,
        label: u.label ?? u.nome,
      })),
    [usuariosRaw]
  );

  // === MAPA DE FILTROS PARA O BACKEND ===
  // backend aceita: termoBusca, origem, responsavel, tags, dataInicio, dataFim, situacao
  const apiParams = useMemo(() => {
    const p: Record<string, any> = {};
    if (filters.q) p.termoBusca = filters.q;
    if (filters.origem) p.origem = filters.origem;
    if (filters.responsavel) p.responsavel = filters.responsavel;
    if (filters.situacao) p.situacao = filters.situacao; // agora suportado no backend
    if (scope === 'mine' && user?._id) p.responsavel = user._id; // escopo “Minhas”
    return p;
  }, [filters, scope, user?._id]);

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
    queryKey: ['leads', apiParams],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      // envia page/limit + filtros válidos pro backend
      const res = await getLeads({ page: pageParam, limit: 20, ...apiParams });
      // getLeads já normaliza para { items, page, totalPages }
      return res;
    },
    getNextPageParam: (last) => {
      if (!last?.totalPages) return undefined;
      return last.page < last.totalPages ? last.page + 1 : undefined;
    },
  });

  const flat = (data?.pages || []).flatMap((p: any) => p.items);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar title="Leads" rightIcon="filter" onRightPress={() => setShowFilters(true)} />

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
            <LeadCardItem
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

function ScopePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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
      <Text style={{ color: active ? t.colors.primary : t.colors.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
