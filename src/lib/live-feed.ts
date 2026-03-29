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

export type FeedBroadcastMessage =
  | { kind: 'action'; action: IncomingActionPayload; sourceId?: string }
  | { kind: 'clear'; sourceId?: string };

export const AUDIT_LOG_STORAGE_KEY = 'fawn-audit-log';

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

function getActionSignature(action: Pick<ActionEntry, 'type' | 'title' | 'description' | 'childName' | 'checkedInAt' | 'timestamp'>) {
  const timestampValue = action.timestamp instanceof Date ? action.timestamp.toISOString() : String(action.timestamp);

  return [
    action.type,
    action.title,
    action.description,
    action.childName || '',
    action.checkedInAt || '',
    timestampValue,
  ].join('::');
}

export function appendUniqueAction(prev: ActionEntry[], payload: IncomingActionPayload) {
  const next = toActionEntry(payload);
  const nextSignature = getActionSignature(next);

  const exists = prev.some((entry) => getActionSignature(entry) === nextSignature);
  return exists ? prev : [...prev, next];
}

export function readStoredAuditLog() {
  if (typeof window === 'undefined') {
    return [] as IncomingActionPayload[];
  }

  try {
    const raw = window.localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as IncomingActionPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredAuditLog(actions: IncomingActionPayload[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(actions));
}

export function clearStoredAuditLog() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
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
