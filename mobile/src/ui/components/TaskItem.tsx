import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import dayjs from 'dayjs';

type Props = {
  task: any;
  onToggleDone: (t: any) => void;
  onEdit: (t: any) => void;
  onDelete: (t: any) => void;
  onOpenLead?: (leadId: string) => void;
};

export default function TaskItem({ task, onToggleDone, onEdit, onDelete, onOpenLead }: Props) {
  const t = useTheme();

  const due = task?.dueDate ? dayjs(task.dueDate) : null;
  const isDone = task?.status === 'Concluída';
  const overdue = !isDone && due ? due.isBefore(dayjs(), 'minute') : false;

  // Lead pode vir como string (id) ou objeto
  const leadId: string | undefined =
    typeof task?.lead === 'string' ? task.lead : task?.lead?._id;
  const leadName: string | undefined =
    typeof task?.lead === 'object' && task?.lead?.nome ? task.lead.nome : undefined;

  const assigneeName =
    typeof task?.assignedTo === 'object' && task?.assignedTo?.nome
      ? task.assignedTo.nome
      : undefined;

  return (
    <View
      style={{
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 12,
        marginBottom: 10,
      }}
    >
      {/* Linha principal: checkbox + título + ações */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => onToggleDone(task)} hitSlop={8}>
          <Ionicons
            name={isDone ? 'checkbox' : 'square-outline'}
            size={22}
            color={isDone ? t.colors.primary : t.colors.subtext}
          />
        </Pressable>

        <Text
          style={{
            flex: 1,
            marginLeft: 8,
            color: t.colors.text,
            fontWeight: '700',
            textDecorationLine: isDone ? 'line-through' : 'none',
          }}
          numberOfLines={2}
        >
          {task?.title || 'Tarefa'}
        </Text>

        <Pressable onPress={() => onEdit(task)} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name="create-outline" size={20} color={t.colors.text} />
        </Pressable>

        <Pressable onPress={() => onDelete(task)} hitSlop={8} style={{ marginLeft: 12 }}>
          <Ionicons name="trash-outline" size={20} color={t.colors.danger} />
        </Pressable>
      </View>

      {/* Descrição */}
      {!!task?.description && (
        <Text style={{ color: t.colors.subtext, marginTop: 6 }}>
          {task.description}
        </Text>
      )}

      {/* Metadados */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {due && (
          <Text
            style={{
              color: overdue ? t.colors.danger : t.colors.text,
              marginRight: 12,
            }}
          >
            Vence em: {due.format('DD/MM/YYYY, HH:mm')}
          </Text>
        )}

        {leadId && (
          <Pressable onPress={() => onOpenLead?.(leadId)}>
            <Text
              style={{
                color: t.colors.primary,
                textDecorationLine: 'underline',
                marginRight: 12,
              }}
              numberOfLines={1}
            >
              Lead: {leadName || leadId}
            </Text>
          </Pressable>
        )}

        {!!assigneeName && (
          <Text style={{ color: t.colors.subtext }} numberOfLines={1}>
            Para: {assigneeName}
          </Text>
        )}
      </View>
    </View>
  );
}
