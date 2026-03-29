"use client";

import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { MetricsHeader } from '@/components/dashboard/MetricsHeader';
import { LiveAgentPanel } from '@/components/dashboard/LiveAgentPanel';
import { AutonomousActionsFeed } from '@/components/dashboard/AutonomousActionsFeed';
import { Trash2, Play, ExternalLink } from 'lucide-react';
import { ActionEntry, IncomingActionPayload, TranscriptEntry, toActionEntry } from '@/lib/live-feed';

export default function Dashboard() {
  const [isOnCall, setIsOnCall] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [fawnMessage, setFawnMessage] = useState<string>('');
  const [leads, setLeads] = useState(12);
  const [calls, setCalls] = useState(45);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Determine the environment config
    const pusherAppKey = process.env.NEXT_PUBLIC_PUSHER_KEY || "key";
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2";

    const pusher = new Pusher(pusherAppKey, {
      cluster: pusherCluster,
    });

    const channel = pusher.subscribe('fawn-live');

    channel.bind('transcript', (data: { speaker: 'fawn'|'caller', text: string }) => {
      setIsOnCall(true);
      if (data.speaker === 'fawn') {
        setFawnMessage(data.text);
      }
      setTranscript(prev => [...prev, { id: crypto.randomUUID(), speaker: data.speaker, text: data.text }]);
    });

    channel.bind('action', (data: IncomingActionPayload) => {
      setActions(prev => [...prev, toActionEntry(data)]);
      
      // Bump lead count for notable actions
      if (data.type === 'calendar' || data.type === 'document') {
        setLeads(prev => prev + 1);
      }
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

  // Ensure timers are cleaned up on unmount
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
  };

  const startSimulation = () => {
    // Reset state
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
      { t: 24000, type: 'action', data: { type: 'checkin', title: 'Leo checked in', description: 'Front desk completed the arrival handoff.', childName: 'Leo', checkedInAt: new Date(Date.now() + 24000).toISOString() } },
      { t: 22000, type: 'metric', data: { type: 'lead' } },
      { t: 23000, type: 'transcript', data: { speaker: 'fawn', text: 'Wonderful! I have booked your tour for Thursday at 10 AM. I’ll send a confirmation text shortly. Do you have any other questions?' } },
      { t: 26000, type: 'transcript', data: { speaker: 'caller', text: 'No, that’s everything. Thank you!' } },
      { t: 28000, type: 'transcript', data: { speaker: 'fawn', text: 'You’re very welcome. We look forward to meeting you and Leo! Have a great day.' } },
      { t: 30000, type: 'end' }
    ];

    sequence.forEach(step => {
      const timeout = setTimeout(() => {
        if (step.type === 'transcript') {
          if (!step.data) return;
          if (step.data.speaker === 'fawn') {
            setFawnMessage(step.data.text as string);
          }
          setTranscript(prev => [...prev, { id: crypto.randomUUID(), speaker: step.data.speaker as 'fawn'|'caller', text: step.data.text as string }]);
        } else if (step.type === 'action') {
          if (!step.data) return;
          setActions(prev => [...prev, toActionEntry(step.data as IncomingActionPayload)]);
        } else if (step.type === 'metric') {
          setLeads(prev => prev + 1);
        } else if (step.type === 'end') {
          setIsOnCall(false);
        }
      }, step.t);
      timeoutsRef.current.push(timeout);
    });
  };

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* Top Header / Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Director&apos;s Cockpit</h1>
          <p className="text-gray-500 mt-1">Live state synchronized via WebSockets</p>
        </div>
        
        <div className="flex gap-3">
          <a
            href="/client"
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <ExternalLink size={16} />
            Client Portal
          </a>
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
        <AutonomousActionsFeed actions={actions} />
      </div>
    </div>
  );
}
