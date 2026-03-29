"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, PhoneOff } from 'lucide-react';
import { TranscriptEntry } from '@/lib/live-feed';

interface LiveAgentPanelProps {
  isOnCall: boolean;
  transcript: TranscriptEntry[];
  message: string;
}

export function LiveAgentPanel({ isOnCall, transcript, message }: LiveAgentPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Fawn AI</h2>
          <p className="text-sm text-gray-500">Daycare Receptionist</p>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${isOnCall ? 'bg-daycare-teal-light text-daycare-teal' : 'bg-gray-100 text-gray-500'}`}>
          {isOnCall ? (
            <>
              <Mic size={16} className="animate-pulse" />
              <span>On Call</span>
            </>
          ) : (
            <>
              <PhoneOff size={16} />
              <span>Idle</span>
            </>
          )}
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-gray-50 rounded-2xl p-4 border border-gray-100">
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-100 shadow-sm flex items-center space-x-3"
          >
            <div className="bg-white p-1.5 rounded-lg shadow-sm relative overflow-hidden">
               <div className="absolute inset-0 bg-teal-200 opacity-20 animate-pulse" />
               <Mic size={14} className="text-daycare-teal animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-daycare-teal uppercase tracking-widest leading-none mb-1">Agent Speaking</p>
	               <p className="text-sm font-medium text-gray-800 line-clamp-1 italic">
	                 &quot;{message}&quot;
	               </p>
            </div>
            <div className="flex space-x-0.5">
               <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
            </div>
          </motion.div>
        )}
        {!isOnCall && transcript.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400">
            <Mic size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Waiting for incoming call...</p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            {transcript.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${entry.speaker === 'fawn' ? 'items-start' : 'items-end'}`}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${entry.speaker === 'fawn' ? 'bg-daycare-teal text-white rounded-tl-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm'}`}>
                  {entry.text}
                </div>
                <span className="text-xs text-gray-400 mt-1 px-1">
                  {entry.speaker === 'fawn' ? 'Fawn AI' : 'Caller'}
                </span>
              </motion.div>
            ))}
            
            {/* Thinking Indicator */}
            {isOnCall && transcript.length > 0 && transcript[transcript.length - 1].speaker === 'caller' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-start"
              >
                <div className="bg-daycare-teal text-white p-3 rounded-2xl rounded-tl-sm flex items-center justify-center space-x-1.5 h-10 w-16">
                  <motion.div className="w-1.5 h-1.5 bg-white rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} />
                  <motion.div className="w-1.5 h-1.5 bg-white rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
                  <motion.div className="w-1.5 h-1.5 bg-white rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
                </div>
                <span className="text-xs text-gray-400 mt-1 px-1">Fawn AI is thinking...</span>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
