/**
 * ReminderService — Schedules local push notifications using expo-notifications.
 * Requires SCHEDULE_EXACT_ALARM permission on Android 12+ (declared in app.json).
 */

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminder(
  title: string,
  body: string,
  isoDatetime: string
): Promise<string> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return 'Reminder failed: Notification permission was denied.';
    }

    const triggerDate = new Date(isoDatetime);
    if (isNaN(triggerDate.getTime())) {
      return `Reminder failed: Invalid datetime "${isoDatetime}". Use ISO 8601 format (e.g. 2026-04-22T10:00:00).`;
    }
    if (triggerDate <= new Date()) {
      return `Reminder failed: The time "${isoDatetime}" is in the past.`;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    const friendlyTime = triggerDate.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    return `Reminder set! "${title}" will fire at ${friendlyTime}. (ID: ${id})`;
  } catch (e: any) {
    return `Reminder failed: ${e.message}`;
  }
}

export async function listReminders(): Promise<string> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.length === 0) return 'No reminders scheduled.';
    const items = scheduled.map((n) => {
      const trigger = n.trigger as any;
      const date = trigger?.value
        ? new Date(trigger.value * 1000).toLocaleString()
        : 'unknown time';
      return `- "${n.content.title}": ${n.content.body} @ ${date}`;
    });
    return `Scheduled Reminders:\n${items.join('\n')}`;
  } catch (e: any) {
    return `Failed to list reminders: ${e.message}`;
  }
}
