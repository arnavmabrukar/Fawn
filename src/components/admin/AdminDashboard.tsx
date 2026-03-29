"use client";

import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { MetricsHeader } from '@/components/dashboard/MetricsHeader';
import { AdminNoteComposer } from '@/components/dashboard/AdminNoteComposer';
import { LiveAgentPanel } from '@/components/dashboard/LiveAgentPanel';
import { AutonomousActionsFeed } from '@/components/dashboard/AutonomousActionsFeed';
import { HistoryModal } from '@/components/dashboard/HistoryModal';
import { IntakeSummaryModal } from '@/components/dashboard/IntakeSummaryModal';
import { Trash2, Play, ExternalLink, Sparkles, Database } from 'lucide-react';
import {
  ActionEntry,
  AUDIT_LOG_STORAGE_KEY,
  FeedBroadcastMessage,
  IncomingActionPayload,
  TranscriptEntry,
  appendUniqueAction,
  readStoredAuditLog,
  toActionEntry,
} from '@/lib/live-feed';

export function AdminDashboard() {
  const sourceIdRef = useRef(`admin-${crypto.randomUUID()}`);
  const [isOnCall, setIsOnCall] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [fawnMessage, setFawnMessage] = useState<string>('');
  const [leads, setLeads] = useState(12);
  const [calls, setCalls] = useState(45);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [dbLeads, setDbLeads] = useState<any[]>([]);
  const [dbCalls, setDbCalls] = useState<any[]>([]);
  const [activeLeadDoc, setActiveLeadDoc] = useState<any>(null);
  const [isIntakeSummaryOpen, setIsIntakeSummaryOpen] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const openHistoryModal = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/history');
      if (res.ok) {
        const data = await res.json();
        setDbLeads(data.leads || []);
        setDbCalls(data.calls || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
    setIsHistoryOpen(true);
  };

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

    channel.bind('transcript', (data: { speaker: 'fawn' | 'caller'; text: string }) => {
      setIsOnCall(true);
      if (data.speaker === 'fawn') {
        setFawnMessage(data.text);
      }
      setTranscript(prev => [...prev, { id: crypto.randomUUID(), speaker: data.speaker, text: data.text }]);
    });

    channel.bind('action', (data: IncomingActionPayload) => {
      setActions(prev => appendUniqueAction(prev, data));

      if (data.type === 'calendar' || data.type === 'document') {
        setLeads(prev => prev + 1);
      }
    });

    channel.bind('lead-document', (data: any) => {
      setActiveLeadDoc(data);
    });

    channel.bind('audit-clear', () => {
      setActions([]);
    });

    channel.bind('call-start', () => {
      setIsOnCall(true);
      setCalls(prev => prev + 1);
      setTranscript([]);
      setActions([]);
      setFawnMessage('');
    });

    channel.bind('call-end', () => {
      setIsOnCall(false);
    });

    return () => {
      pusher.unsubscribe('fawn-live');
      pusher.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    const channel = new BroadcastChannel('fawn-feed');
    channel.onmessage = (event: MessageEvent<FeedBroadcastMessage>) => {
      const message = event.data;

      if (message.sourceId === sourceIdRef.current) {
        return;
      }

      if (message.kind === 'clear') {
        setActions([]);
        return;
      }

      setActions(prev => appendUniqueAction(prev, message.action));
    };

    return () => {
      channel.close();
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

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const clearDashboard = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsOnCall(false);
    setTranscript([]);
    setActions([]);
    setFawnMessage('');
    setActiveLeadDoc(null);
    setIsIntakeSummaryOpen(false);
  };

  const startSimulation = () => {
    clearDashboard();
    setIsOnCall(true);
    setCalls(prev => prev + 1);

    const sequence = [
      { t: 1000, type: 'transcript', data: { speaker: 'fawn', text: 'Hello! Thank you for calling Sunshine Daycare. I am Fawn, the AI receptionist. How can I help you today?' } },
      { t: 4000, type: 'transcript', data: { speaker: 'caller', text: 'Hi, I’m looking to enroll my 3-year-old son, and I was wondering if I could book a tour?' } },
      { t: 7000, type: 'transcript', data: { speaker: 'fawn', text: 'I can certainly help with that! We have availability for 3-year-olds. Could I get your name and your son’s name first?' } },
      { t: 11000, type: 'transcript', data: { speaker: 'caller', text: 'Yes, it’s Sarah, and my son is Leo. Oh, and he has a peanut allergy.' } },
      { t: 14000, type: 'action', data: { type: 'document', title: 'Generating Intake Form', description: 'Child: Leo, 3yo. Medical: Peanut Allergy. Parent: Sarah.' } },
      { t: 15000, type: 'transcript', data: { speaker: 'fawn', text: 'Thanks, Sarah! I’ve made a note about Leo’s peanut allergy. We are a peanut-free facility, so he will be perfectly safe here. Would you like to come in for a tour this Thursday at 10 AM?' } },
      { t: 19000, type: 'transcript', data: { speaker: 'caller', text: 'Thursday at 10 AM works great for me.' } },
      { t: 21000, type: 'action', data: { type: 'calendar', title: 'Tour Booked for Sarah & Leo', description: 'Thursday, March 20th @ 10:00 AM' } },
      { t: 21500, type: 'metric', data: { type: 'lead-doc', doc: {
          parentName: 'Sarah',
          childName: 'Leo',
          age: 3,
          medicalNotes: 'Peanut Allergy',
          ageCare: 'Focus on social interaction and cooperative play. Transitioning to structured learning activities while maintaining a nurturing environment.',
          hiddenAllergens: 'Watch for curry sauces, mole, pesto, and some ethnic breads where peanuts might be used as a thickener or hidden ingredient.',
          timestamp: new Date().toISOString()
      }}},
      { t: 24000, type: 'action', data: { type: 'checkin', title: 'Leo checked in', description: 'Front desk completed the arrival handoff.', childName: 'Leo', checkedInAt: new Date(Date.now() + 24000).toISOString() } },
      { t: 22000, type: 'metric', data: { type: 'lead' } },
      { t: 23000, type: 'transcript', data: { speaker: 'fawn', text: 'Wonderful! I have booked your tour for Thursday at 10 AM. I’ll send a confirmation text shortly. Do you have any other questions?' } },
      { t: 26000, type: 'transcript', data: { speaker: 'caller', text: 'No, that’s everything. Thank you!' } },
      { t: 28000, type: 'transcript', data: { speaker: 'fawn', text: 'You’re very welcome. We look forward to meeting you and Leo! Have a great day.' } },
      { t: 30000, type: 'end' },
    ];

    sequence.forEach(step => {
      const timeout = setTimeout(() => {
        if (step.type === 'transcript') {
          if (!step.data) return;
          if (step.data.speaker === 'fawn') {
            setFawnMessage(step.data.text as string);
          }
          setTranscript(prev => [...prev, { id: crypto.randomUUID(), speaker: step.data.speaker as 'fawn' | 'caller', text: step.data.text as string }]);
        } else if (step.type === 'action') {
          if (!step.data) return;
          setActions(prev => [...prev, toActionEntry(step.data as IncomingActionPayload)]);
        } else if (step.type === 'metric') {
          setLeads(prev => prev + 1);
          if (step.data?.type === 'lead-doc') {
            setActiveLeadDoc(step.data.doc);
          }
        } else if (step.type === 'end') {
          setIsOnCall(false);
        }
      }, step.t);
      timeoutsRef.current.push(timeout);
    });
  };

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Director&apos;s Cockpit</h1>
          <p className="text-gray-500 mt-1">Live state synchronized via WebSockets</p>
        </div>

        <div className="flex gap-3">
          <a
            href="/ai-agent"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
          >
            <Sparkles size={16} />
            AI Agent
          </a>
          <a
            href="/client"
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <ExternalLink size={16} />
            Client Portal
          </a>
          <button
            onClick={openHistoryModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-100 transition-colors font-medium text-sm shadow-sm"
          >
            <Database size={16} />
            View Database
          </button>
          <button
            onClick={clearDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            <Trash2 size={16} />
            Clear Dashboard
          </button>

          <button
            onClick={startSimulation}
            disabled={isOnCall}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              isOnCall
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-daycare-teal text-white hover:bg-teal-700 hover:shadow-md'
            }`}
          >
            <Play size={16} fill="currentColor" />
            Simulate Call
          </button>
        </div>
      </div>

      <MetricsHeader leads={leads} calls={calls} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveAgentPanel isOnCall={isOnCall} transcript={transcript} message={fawnMessage} />
        <AutonomousActionsFeed
          actions={actions}
          hasIntakeSummary={Boolean(activeLeadDoc)}
          onOpenIntakeSummary={activeLeadDoc ? () => setIsIntakeSummaryOpen(true) : undefined}
        />
      </div>

      <div className="mt-6 mb-6">
        <AdminNoteComposer
          sourceId={sourceIdRef.current}
          onSubmitted={(action) =>
            setActions(prev =>
              appendUniqueAction(prev, {
                type: action.type,
                title: action.title,
                description: action.description,
                childName: action.childName,
                checkedInAt: action.checkedInAt,
                timestamp: action.timestamp.toISOString(),
              })
            )
          }
          onCleared={() => setActions([])}
        />
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-800">Tour Calendar</h2>
          <p className="text-sm text-gray-500">Shared Google Calendar for scheduled tours and availability.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
          <iframe
            src="https://calendar.google.com/calendar/embed?src=96c2d905f9f8680926a24f1fc5d32d65acc1a67e9da6729c8e1d6ba8bcc689f5%40group.calendar.google.com&ctz=America%2FNew_York&mode=WEEK"
            title="Fawn Google Calendar"
            className="h-[480px] w-full border-0 md:h-[560px]"
            scrolling="no"
          />
        </div>
      </div>

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        leads={dbLeads}
        calls={dbCalls}
      />
      <IntakeSummaryModal
        isOpen={isIntakeSummaryOpen}
        onClose={() => setIsIntakeSummaryOpen(false)}
        data={activeLeadDoc}
      />
    </div>
  );
}
