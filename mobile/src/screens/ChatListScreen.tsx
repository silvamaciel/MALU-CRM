import React, { useMemo } from 'react';
import { View, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ui/theme';
import AppBar from '../ui/components/AppBar';
import ConversationItem from '../ui/components/ConversationItem';
import { listConversations, Conversation } from '../api/chat';
import { uniqById } from '../utils/arrays';

type Page = { items: Conversation[]; nextCursor: string | null };

export default function ChatListScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();

  const q = useInfiniteQuery({
    queryKey: ['chat', 'conversations'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listConversations(30, pageParam ?? null),
    getNextPageParam: (last: Page) => last.nextCursor ?? null,
    // Você pode manter polling, mas deduplica abaixo
    refetchInterval: 5000,
  });

  const inf = q.data as InfiniteData<Page, string | null> | undefined;

  const conversations = useMemo(() => {
    const flat = (inf?.pages ?? []).flatMap(p => p.items);
    return uniqById(flat);
  }, [inf?.pages]);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar title="Conversas" />
      {q.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(it) => String(it._id)}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />
          }
          renderItem={({ item }) => (
            <ConversationItem
              conv={item}
              onPress={() => nav.navigate('ChatThread', { conversation: item })}
            />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
}
