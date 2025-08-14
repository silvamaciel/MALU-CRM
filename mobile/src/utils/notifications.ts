// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SchedIndex = Record<string, string>;
const KEY = 'TASK_NOTIF_INDEX';
const DAILY_KEY = 'DAILY_SUMMARY_NOTIF_ID';

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // campos exigidos pelos tipos mais novos:
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Geral',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }
}

/** Agenda um resumo diário às hh:mm locais */
export async function scheduleDailySummary(hour = 8, minute = 0) {
  // cancela se já existir
  const old = await AsyncStorage.getItem(DAILY_KEY);
  if (old) {
    try { await Notifications.cancelScheduledNotificationAsync(old); } catch {}
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Suas tarefas de hoje',
      body: 'Confira as tarefas do dia e evite vencimentos.',
      sound: true,
    },
    trigger: { hour, minute, repeats: true } as any,
  });

  await AsyncStorage.setItem(DAILY_KEY, id);
}

/** Agenda lembrete 30min antes da dueDate (se ainda for futuro) */
export async function scheduleTaskReminder(taskId: string, title: string, dueISO?: string) {
  if (!dueISO) return;
  const due = new Date(dueISO).getTime();
  const fireAt = due - 30 * 60 * 1000;
  if (fireAt <= Date.now()) return;

  // cancela agendamento anterior (se houver)
  await cancelTaskReminder(taskId);

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tarefa próxima do prazo',
      body: `${title} — vence em ~30 minutos.`,
      sound: true,
    },
    trigger: { date: new Date(fireAt) } as any,
  });

  const idx = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') as SchedIndex;
  idx[taskId] = notifId;
  await AsyncStorage.setItem(KEY, JSON.stringify(idx));
}

export async function cancelTaskReminder(taskId: string) {
  const raw = await AsyncStorage.getItem(KEY);
  const idx = raw ? (JSON.parse(raw) as SchedIndex) : {};
  const old = idx[taskId];
  if (old) {
    try { await Notifications.cancelScheduledNotificationAsync(old); } catch {}
    delete idx[taskId];
    await AsyncStorage.setItem(KEY, JSON.stringify(idx));
  }
}
