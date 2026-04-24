import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return 'Reminder failed: Notification permission denied.';

    const triggerDate = new Date(isoDatetime);
    if (isNaN(triggerDate.getTime())) {
      return `Reminder failed: Invalid datetime "${isoDatetime}". Use ISO 8601 format (e.g. 2026-04-22T22:30:00).`;
    }

    const cutoff = new Date();
    cutoff.setSeconds(cutoff.getSeconds() - 60);
    if (triggerDate <= cutoff) {
      return `Reminder failed: The time "${isoDatetime}" is in the past.`;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body: body || undefined, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    const friendly = triggerDate.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    return `Reminder set! "${title}" will fire at ${friendly}. (ID: ${id})`;
  } catch (e: any) {
    return `Reminder failed: ${e.message}`;
  }
}

export async function listReminders(): Promise<string> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.length === 0) return 'No upcoming reminders found.';

    const items = scheduled
      .map((n) => {
        const trigger = n.trigger as any;
        const date = trigger?.value ? new Date(trigger.value) : null;
        const dateStr = date
          ? date.toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : 'unknown time';
        return `- "${n.content.title}" @ ${dateStr}`;
      })
      .join('\n');

    return `Upcoming reminders:\n${items}`;
  } catch (e: any) {
    return `Failed to list reminders: ${e.message}`;
  }
}
