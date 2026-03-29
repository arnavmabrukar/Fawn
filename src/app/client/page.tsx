"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Pusher from 'pusher-js';
import { ArrowLeft, Radio, WandSparkles } from 'lucide-react';
import { ClientAuditLog } from '@/components/client/ClientAuditLog';
import { ClientCheckInCard } from '@/components/client/ClientCheckInCard';
import {
  ActionEntry,
  AUDIT_LOG_STORAGE_KEY,
  FeedBroadcastMessage,
  IncomingActionPayload,
  appendUniqueAction,
  readStoredAuditLog,
  toActionEntry,
} from '@/lib/live-feed';

const demoAuditSeed = [
  {
    type: 'document',
    title: 'Enrollment packet generated',
    description: 'Intake summary and pickup authorization were prepared for Maya.',
  },
  {
    type: 'calendar',
    title: 'Tour follow-up scheduled',
    description: 'Parent callback was booked for tomorrow at 9:30 AM.',
  },
  {
    type: 'checkin',
    title: 'Maya checked in',
    description: 'Front desk confirmed arrival and classroom handoff.',
    childName: 'Maya',
    checkedInAt: new Date().toISOString(),
  },
] as const;

export default function ClientPortalPage() {
  const sourceId = React.useRef(`client-${crypto.randomUUID()}`);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [connectionState, setConnectionState] = useState('Connecting');

  useEffect(() => {
    setActions(readStoredAuditLog().map(toActionEntry));
  }, []);

  useEffect(() => {
    const pusherAppKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'key';
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

    const pusher = new Pusher(pusherAppKey, {
      cluster: pusherCluster,
    });

    const channel = pusher.subscribe('fawn-live');

    pusher.connection.bind('connected', () => setConnectionState('Live'));
    pusher.connection.bind('disconnected', () => setConnectionState('Offline'));
    pusher.connection.bind('unavailable', () => setConnectionState('Unavailable'));

    channel.bind('action', (data: IncomingActionPayload) => {
      setActions(prev => appendUniqueAction(prev, data));
    });

    channel.bind('audit-clear', () => {
      setActions([]);
    });

    let browserChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      browserChannel = new BroadcastChannel('fawn-feed');
      browserChannel.onmessage = (event: MessageEvent<FeedBroadcastMessage>) => {
        const message = event.data;

        if (message.sourceId === sourceId.current) {
          return;
        }

        if (message.kind === 'clear') {
          setActions([]);
          return;
        }

        setActions(prev => appendUniqueAction(prev, message.action));
      };
    }

    return () => {
      browserChannel?.close();
      pusher.unsubscribe('fawn-live');
      pusher.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUDIT_LOG_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setActions([]);
        return;
      }

      const nextActions = JSON.parse(event.newValue) as IncomingActionPayload[];
      setActions(Array.isArray(nextActions) ? nextActions.map(toActionEntry) : []);
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const latestCheckIn = useMemo(() => {
    return [...actions].reverse().find(action => action.type === 'checkin' && action.checkedInAt);
  }, [actions]);

  const loadDemoFeed = () => {
    setActions(demoAuditSeed.map(item => toActionEntry(item)));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#f4fbf7_0%,#f7f2ea_100%)] px-6 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              <ArrowLeft size={16} />
              Back to Director View
            </a>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.34em] text-emerald-700">Family Portal</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Live audit visibility for families and caregivers.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600">
              This client-facing page mirrors the developer feed and highlights the latest confirmed child check-in time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
              <Radio size={16} className={connectionState === 'Live' ? 'text-emerald-600' : 'text-slate-400'} />
              Feed {connectionState}
            </div>
            <button
              onClick={loadDemoFeed}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              <WandSparkles size={16} />
              Load Demo Feed
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <ClientCheckInCard
            childName={latestCheckIn?.childName}
            checkedInAt={latestCheckIn?.checkedInAt}
          />
          <ClientAuditLog actions={actions} />
        </div>
      </div>
    </main>
  );
}
