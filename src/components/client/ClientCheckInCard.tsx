"use client";

import { motion } from 'framer-motion';
import { ShieldCheck, Clock3 } from 'lucide-react';
import { formatClockTime, formatLongDateTime } from '@/lib/live-feed';

type ClientCheckInCardProps = {
  childName?: string;
  checkedInAt?: string;
};

export function ClientCheckInCard({ childName, checkedInAt }: ClientCheckInCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(221,255,241,0.95))] p-6 shadow-[0_18px_60px_rgba(15,118,110,0.14)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            <ShieldCheck size={14} />
            Client View
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">Child Check-In Status</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            The latest confirmed arrival pushed from the live operations feed.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-600 p-3 text-white shadow-lg">
          <Clock3 size={22} />
        </div>
      </div>

      {checkedInAt ? (
        <div className="mt-8 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[1.5rem] bg-slate-950 px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Checked In Child</p>
            <p className="mt-3 text-3xl font-semibold">{childName || 'Child record received'}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-white/85 px-5 py-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Arrival Time</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">{formatClockTime(checkedInAt)}</p>
            <p className="mt-2 text-sm text-slate-500">{formatLongDateTime(checkedInAt)}</p>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-emerald-300 bg-white/70 px-5 py-8 text-sm text-slate-600">
          No child has been checked in yet. Once the operations feed sends a check-in event, it will appear here immediately.
        </div>
      )}
    </motion.section>
  );
}
