"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, FileText, CheckCircle2, BadgeCheck } from 'lucide-react';
import { ActionEntry, ActionType, formatClockTime } from '@/lib/live-feed';

interface AutonomousActionsFeedProps {
  actions: ActionEntry[];
  onOpenIntakeSummary?: () => void;
  hasIntakeSummary?: boolean;
}

const getIconForType = (type: ActionType) => {
  switch (type) {
    case 'checkin':
      return <BadgeCheck size={20} className="text-emerald-600" />;
    case 'calendar':
      return <Calendar size={20} className="text-daycare-orange" />;
    case 'document':
      return <FileText size={20} className="text-daycare-teal" />;
    case 'info':
    default:
      return <CheckCircle2 size={20} className="text-gray-500" />;
  }
};

const getBgForType = (type: ActionType) => {
  switch (type) {
    case 'checkin':
      return 'bg-emerald-50 border-emerald-100';
    case 'calendar':
      return 'bg-orange-50 border-orange-100';
    case 'document':
      return 'bg-teal-50 border-teal-100';
    case 'info':
    default:
      return 'bg-gray-50 border-gray-100';
  }
};

export function AutonomousActionsFeed({
  actions,
  onOpenIntakeSummary,
  hasIntakeSummary = false,
}: AutonomousActionsFeedProps) {
  // Sort actions with the latest at the top
  const sortedActions = [...actions].reverse();

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-[600px] flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Autonomous Actions</h2>
        <p className="text-sm text-gray-500">Live Agent Operations</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
        {actions.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 flex-col">
            <CheckCircle2 size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-sm">Waiting for agent actions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sortedActions.map((action) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className={`p-4 rounded-2xl border ${getBgForType(action.type)} shadow-sm flex items-start space-x-4`}
                >
                  <div className="mt-0.5 bg-white p-2 rounded-xl shadow-sm">
                    {getIconForType(action.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-800">{action.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {action.type === 'document' && (
                      <button
                        type="button"
                        onClick={onOpenIntakeSummary}
                        disabled={!onOpenIntakeSummary}
                        className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
                          onOpenIntakeSummary
                            ? 'border border-emerald-600 bg-emerald-600 text-white shadow-[0_10px_24px_rgba(22,163,74,0.22)] hover:-translate-y-0.5 hover:bg-emerald-700'
                            : 'border border-gray-200 bg-white text-gray-400 disabled:cursor-not-allowed'
                        }`}
                      >
                        {hasIntakeSummary ? 'View Intake Summary' : 'Loading Summary'}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 mt-2 block font-medium">
                      {formatClockTime(action.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
