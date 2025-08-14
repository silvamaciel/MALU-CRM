import React from 'react';
import { View, Text, Button, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listLeads } from '../api/leads';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { logout, tokenReady } = useAuth();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['leads', 1],
    queryFn: () => listLeads({ page: 1, limit: 20 }),
    enabled: tokenReady,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const items = data?.items ?? [];

  // DEBUG: loga a resposta crua uma vez
  if (__DEV__ && data?.raw) {
    console.log('[MOBILE] /leads raw response:', JSON.stringify(data.raw)?.slice(0, 1000));
  }

  const renderItem = ({ item }: any) => {
    const nome = typeof item?.nome === 'string' ? item.nome
               : typeof item?.title === 'string' ? item.title
               : typeof item?.name === 'string' ? item.name
               : String(item?._id || item?.id || 'Lead');

    // Evitar passar objetos em <Text>, sempre string/number
    const email = item?.email ? String(item.email) : '';
    const tel = item?.telefone ? String(item.telefone) : '';

    return (
      <View style={{ paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#eee' }}>
        <Text style={{ fontWeight: '600' }}>{nome}</Text>
        {!!email && <Text>{email}</Text>}
        {!!tel && <Text>{tel}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Button title={isFetching ? 'Atualizando...' : 'Atualizar'} onPress={() => refetch()} disabled={!tokenReady} />
          <Button title="Sair" onPress={() => logout()} />
        </View>

        {!tokenReady && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Preparando sessão...</Text>
          </View>
        )}

        {tokenReady && isLoading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Carregando leads...</Text>
          </View>
        )}

        {tokenReady && !isLoading && error && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ fontWeight: '600', marginBottom: 6 }}>Erro ao carregar</Text>
            <Text style={{ textAlign: 'center', opacity: 0.8 }}>
              {(error as any)?.response?.data?.error || (error as any)?.message || 'Tente novamente'}
            </Text>
            <View style={{ height: 12 }} />
            <Button title="Tentar novamente" onPress={() => refetch()} />
          </View>
        )}

        {tokenReady && !isLoading && !error && items.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ opacity: 0.8 }}>Nenhum lead encontrado</Text>
            {/* Mostra meta pra debug rápido */}
            {data?.meta && (
              <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
                {`count=${data.meta.count} page=${data.meta.page} limit=${data.meta.limit}`}
              </Text>
            )}
          </View>
        )}

        {tokenReady && !isLoading && !error && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={(item: any) => String(item._id || item.id)}
            renderItem={renderItem}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
