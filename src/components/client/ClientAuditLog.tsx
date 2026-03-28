"use client";

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText, Calendar, FileText, BadgeCheck, BellRing } from 'lucide-react';
import { ActionEntry, ActionType, formatLongDateTime } from '@/lib/live-feed';

const iconMap: Record<ActionType, ReactNode> = {
  calendar: <Calendar size={18} />,
  document: <FileText size={18} />,
  info: <BellRing size={18} />,
  checkin: <BadgeCheck size={18} />,
};

const toneMap: Record<ActionType, string> = {
  calendar: 'border-orange-200 bg-orange-50 text-orange-700',
  document: 'border-teal-200 bg-teal-50 text-teal-700',
  info: 'border-slate-200 bg-slate-100 text-slate-700',
  checkin: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function ClientAuditLog({ actions }: { actions: ActionEntry[] }) {
  const sortedActions = [...actions].reverse();

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Audit Log</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Developer Feed Activity</h2>
        </div>
        <div className="rounded-2xl bg-slate-900 p-3 text-white">
          <ScrollText size={20} />
        </div>
      </div>

      <div className="mt-6 max-h-[560px] space-y-4 overflow-y-auto pr-2">
        {sortedActions.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">
            No audit entries yet. This view will mirror actions sent into the live feed.
          </div>
        ) : (
          <AnimatePresence>
            {sortedActions.map((action) => (
              <motion.article
                key={action.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl border p-2 ${toneMap[action.type]}`}>
                      {iconMap[action.type]}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{action.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    {formatLongDateTime(action.timestamp)}
                  </time>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
