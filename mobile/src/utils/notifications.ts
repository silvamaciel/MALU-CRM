import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SchedIndex = Record<string, string>;
const KEY = 'TASK_NOTIF_INDEX';
const DAILY_KEY = 'DAILY_SUMMARY_NOTIF_ID';

function fmtTimeLocal(d: Date) {
  // HH:mm no locale do usuário
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function labelForDue(due: Date) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = fmtTimeLocal(due);

  if (isSameDay(due, now)) return `hoje às ${time}`;
  if (isSameDay(due, tomorrow)) return `amanhã às ${time}`;

  // dd/mm/aaaa às HH:mm (usa locale para data)
  const date = due.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${date} às ${time}`;
}

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
      sound: 'default', // precisa ser string em Android (ex: 'default')
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

/**
 * Agenda lembrete 30min antes da dueDate (se ainda for futuro).
 * O texto da notificação mostra a hora local do vencimento (ex.: "hoje às 16:00"),
 * evitando a mensagem fixa "em 30 minutos".
 */
export async function scheduleTaskReminder(taskId: string, title: string, dueISO?: string) {
  if (!dueISO) return;
  const due = new Date(dueISO);
  const fireAtMs = due.getTime() - 30 * 60 * 1000;

  if (fireAtMs <= Date.now()) {
    // Se já passou do ponto de 30min antes, não agenda (ou você pode optar por agendar "agora + 1min")
    return;
  }

  // Cancela agendamento anterior (se houver)
  await cancelTaskReminder(taskId);

  const whenLabel = labelForDue(due); // "hoje às HH:mm", "amanhã às HH:mm" ou "dd/mm/aaaa às HH:mm"

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tarefa próxima do prazo',
      body: `${title} — vence ${whenLabel}.`,
      sound: true,
    },
    trigger: { date: new Date(fireAtMs) } as any,
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
