"use client";

import React, { useState } from 'react';
import { Send, CircleAlert, MessageSquareText, Trash2 } from 'lucide-react';
import {
  ActionEntry,
  FeedBroadcastMessage,
  clearStoredAuditLog,
  formatClockTime,
  readStoredAuditLog,
  toActionEntry,
  writeStoredAuditLog,
} from '@/lib/live-feed';

type AdminNoteComposerProps = {
  onSubmitted?: (action: ActionEntry) => void;
  onCleared?: () => void;
  sourceId: string;
};

export function AdminNoteComposer({ onSubmitted, onCleared, sourceId }: AdminNoteComposerProps) {
  const [childName, setChildName] = useState('');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState('');
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  const broadcastToOpenTabs = (message: FeedBroadcastMessage) => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('fawn-feed');
      channel.postMessage(message);
      channel.close();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!note.trim()) {
      setError('Enter a note before sending it to the family feed.');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/feed/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'info',
          title: childName.trim() ? `${childName.trim()} update` : 'Admin update',
          description: note.trim(),
          childName: childName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to publish the note.');
      }

      const payload = await response.json() as { timestamp?: string; action?: Parameters<typeof toActionEntry>[0] };
      const nextTimestamp = payload.timestamp || new Date().toISOString();
      setLastSentAt(nextTimestamp);
      if (payload.action) {
        const actionEntry = toActionEntry(payload.action);
        onSubmitted?.(actionEntry);
        writeStoredAuditLog([...readStoredAuditLog(), payload.action]);
        broadcastToOpenTabs({ kind: 'action', action: payload.action, sourceId });
      }
      setNote('');
      setChildName('');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to publish the note.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    setError('');

    try {
      const response = await fetch('/api/feed/action', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Unable to clear the audit log.');
      }

      onCleared?.();
      clearStoredAuditLog();
      broadcastToOpenTabs({ kind: 'clear', sourceId });
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear the audit log.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            <MessageSquareText size={14} />
            Family Updates
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Broadcast a live note to the client portal</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Anything you send here is timestamped and published into the same audit log the family sees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSentAt ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Last sent at {formatClockTime(lastSentAt)}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            <Trash2 size={15} />
            {isClearing ? 'Clearing...' : 'Clear Audit Log'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Child name</span>
            <input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Optional"
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-daycare-teal focus:bg-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: Leo had a smooth drop-off and is settling into the art table."
              rows={4}
              className="resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-daycare-teal focus:bg-white"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-h-6 text-sm text-gray-500">
            {error ? (
              <span className="inline-flex items-center gap-2 text-red-600">
                <CircleAlert size={14} />
                {error}
              </span>
            ) : (
              'Notes appear instantly in the admin action feed and the family audit log.'
            )}
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send size={16} />
            {isSending ? 'Sending...' : 'Send Note'}
          </button>
        </div>
      </form>
    </section>
  );
}
