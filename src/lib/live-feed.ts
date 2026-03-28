export type ActionType = 'calendar' | 'document' | 'info' | 'checkin';

export type ActionEntry = {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  timestamp: Date;
  childName?: string;
  checkedInAt?: string;
};

export type TranscriptEntry = {
  id: string;
  speaker: 'fawn' | 'caller';
  text: string;
};

export type IncomingActionPayload = {
  type: ActionType;
  title: string;
  description: string;
  timestamp?: string;
  childName?: string;
  checkedInAt?: string;
};

export function toActionEntry(payload: IncomingActionPayload): ActionEntry {
  return {
    id: crypto.randomUUID(),
    type: payload.type,
    title: payload.title,
    description: payload.description,
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    childName: payload.childName,
    checkedInAt: payload.checkedInAt,
  };
}

export function formatClockTime(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatLongDateTime(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
