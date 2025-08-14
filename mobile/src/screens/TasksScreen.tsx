// src/screens/TasksScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  Pressable,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../ui/theme';
import AppBar from '../ui/components/AppBar';
import TaskItem from '../ui/components/TaskItem';
import TaskFiltersSheet from '../ui/components/TaskFiltersSheet';
import TaskFormModal from '../ui/components/TaskFormModal';
import Fab from '../ui/components/Fab';

import { getTasks, TaskFilters, deleteTask, createTask, updateTask } from '../api/tasks';
import { listUsuarios, listLeadsForSelect } from '../api/leads';

import { scheduleTaskReminder, cancelTaskReminder } from '../utils/notifications';

export default function TasksScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  // filtros base (iguais ao web: status Pendente/Concluída/Todas, etc.)
  const [filters, setFilters] = useState<TaskFilters>({ status: 'Pendente' });

  // escopo: todas ou minhas (adiciona mine: '1')
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  // ✅ Opção recomendada: tipar o useMemo para garantir o literal de 'mine'
  const mergedFilters = useMemo<TaskFilters>(
    () => ({
      ...filters,
      ...(scope === 'mine' ? { mine: '1' as const } : {}),
    }),
    [filters, scope]
  );

  // UI
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  // Uma chamada para lista + KPIs
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['tasks', mergedFilters],
    queryFn: () => getTasks(mergedFilters),
  });

  const tasks = data?.tasks ?? [];
  const stats = data?.kpis ?? { aVencer: 0, vencidas: 0, concluidas: 0 };

  // Usuários -> select de responsável
  const { data: usersRaw = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: listUsuarios,
  });
  const assignees = useMemo(
    () => (usersRaw || []).map((u: any) => ({ value: u._id || u.value, label: u.nome || u.label })),
    [usersRaw]
  );

  // Leads -> select de lead no modal
  const { data: leadsOptions = [] } = useQuery({
    queryKey: ['leads-select'],
    queryFn: () => listLeadsForSelect(100),
  });

  // Alternar status
  const toggleDone = useMutation({
    mutationFn: async (task: any) => {
      const next = task.status === 'Pendente' ? 'Concluída' : 'Pendente';
      const updated = await updateTask(task._id, { status: next });
      return { updated };
    },
    onSuccess: async ({ updated }) => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      if (updated.status === 'Concluída') {
        await cancelTaskReminder(updated._id);
      } else {
        await scheduleTaskReminder(updated._id, updated.title, updated.dueDate);
      }
    },
  });

  // Excluir
  const del = useMutation({
    mutationFn: (task: any) => deleteTask(task._id),
    onSuccess: async (_resp, task) => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await cancelTaskReminder(task._id);
    },
  });

  // Criar/Atualizar
  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) return updateTask(editing._id, payload);
      return createTask(payload);
    },
    onSuccess: async (newTask) => {
      setShowForm(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await scheduleTaskReminder(newTask._id, newTask.title, newTask.dueDate);
    },
    onError: (e: any) => {
    console.log('Create/Update task error:', e?.response?.data || e);
    alert(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Falha ao salvar tarefa.');
  },
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppBar
        title="Tarefas"
        rightIcon="filter"
        onRightPress={() => setShowFilters(true)}
      />

      {/* Toggle de escopo: Todas | Minhas */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginTop: 8 }}>
        <ScopePill label="Todas" active={scope === 'all'} onPress={() => setScope('all')} />
        <ScopePill label="Minhas" active={scope === 'mine'} onPress={() => setScope('mine')} />
      </View>

      {/* KPIs do backend */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
        <StatCard color={t.colors.warning} label="A Vencer" value={stats.aVencer || 0} />
        <StatCard color={t.colors.danger} label="Vencidas" value={stats.vencidas || 0} />
        <StatCard color={t.colors.success ?? '#16A34A'} label="Concluídas" value={stats.concluidas || 0} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(it: any) => String(it._id || it.id)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggleDone={(t) => toggleDone.mutate(t)}
              onEdit={(t) => { setEditing(t); setShowForm(true); }}
              onDelete={(t) => del.mutate(t)}
              onOpenLead={(leadId) =>
                nav.navigate('LeadsTab' as never, {
                  screen: 'LeadDetail',
                  params: { id: leadId },
                } as never)
              }
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: t.colors.subtext }}>Nenhuma tarefa para este filtro.</Text>
            </View>
          }
        />
      )}

      {/* FAB para criar tarefa */}
      <Fab onPress={() => { setEditing(null); setShowForm(true); }} />

      {/* Filtros */}
      <TaskFiltersSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        initial={filters}
        onApply={(f) => setFilters(f)}
        onClear={() => setFilters({ status: 'Pendente' })}
        assignees={assignees}
      />

      {/* Modal criar/editar */}
      <TaskFormModal
        visible={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        processing={save.isPending}
        initial={editing ? {
          title: editing.title,
          description: editing.description,
          dueDate: editing.dueDate,
          leadId: typeof editing.lead === 'string' ? editing.lead : editing.lead?._id,
          assignedTo: typeof editing.assignedTo === 'string' ? editing.assignedTo : editing.assignedTo?._id,
        } : undefined}
        onSubmit={(v) => save.mutate(v)}
        leads={leadsOptions}
        assignees={assignees}
      />
    </View>
  );
}

function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.colors.subtext, marginTop: 6 }}>{label}</Text>
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
