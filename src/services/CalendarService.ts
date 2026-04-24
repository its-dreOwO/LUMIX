/**
 * CalendarService — Read/write Android calendar events using expo-calendar.
 * Requires expo-calendar native module (included in next EAS build).
 */

import { Linking } from 'react-native';
import * as Calendar from 'expo-calendar';

async function ensureCalendarPermission(): Promise<{ granted: boolean; message?: string }> {
  const existing = await Calendar.getCalendarPermissionsAsync();
  if (existing.status === 'granted') return { granted: true };
  if (!existing.canAskAgain) {
    Linking.openSettings();
    return { granted: false, message: 'Calendar permission was permanently denied. Opening app Settings — grant "Calendar" access and try again.' };
  }
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return { granted: false, message: 'Calendar failed: Permission was denied. Ask Dre to grant calendar access.' };
  return { granted: true };
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  // Prefer the first writable local or device calendar
  const writable = calendars.find(
    (c) => c.allowsModifications && (c.type === 'local' || c.type === 'caldav' || c.type === 'com.google')
  );
  return writable?.id ?? calendars[0]?.id ?? null;
}

export async function createCalendarEvent(
  title: string,
  isoStart: string,
  isoEnd: string,
  notes?: string
): Promise<string> {
  try {
    const perm = await ensureCalendarPermission();
    if (!perm.granted) return perm.message ?? 'Calendar failed: Permission denied.';

    const startDate = new Date(isoStart);
    const endDate = new Date(isoEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return `Calendar failed: Invalid datetime. Use ISO 8601 format (e.g. 2026-04-22T10:00:00).`;
    }

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      return 'Calendar failed: No writable calendar found on this device.';
    }

    const id = await Calendar.createEventAsync(calendarId, {
      title,
      startDate,
      endDate,
      notes,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const friendly = startDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `Calendar event created! "${title}" on ${friendly}. (Event ID: ${id})`;
  } catch (e: any) {
    return `Calendar event failed: ${e.message}`;
  }
}

export async function listUpcomingEvents(days = 7): Promise<string> {
  try {
    const perm = await ensureCalendarPermission();
    if (!perm.granted) return perm.message ?? 'Calendar failed: Permission denied.';

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calendarIds = calendars.map((c) => c.id);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const events = await Calendar.getEventsAsync(calendarIds, start, end);

    if (events.length === 0) {
      return `No events found in the next ${days} days.`;
    }

    const formatted = events
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .map((e) => {
        const date = new Date(e.startDate).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `- ${date}: ${e.title}`;
      })
      .join('\n');

    return `Upcoming events (next ${days} days):\n${formatted}`;
  } catch (e: any) {
    return `Failed to list events: ${e.message}`;
  }
}
