"use client";

import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f9f6ef_0%,#f4efe5_100%)] px-6 py-10 md:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
          <section className="max-w-2xl">
            <div className="inline-flex items-center gap-4 text-slate-900">
              <Image src="/fawn-deer.svg" alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
              <span className="text-[1.75rem] font-semibold tracking-[0.24em] text-slate-900">fawn</span>
            </div>

            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.34em] text-[#7b8f6a]">Daycare Front Desk</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Gentle operations for busy care teams.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Fawn keeps family updates, check-ins, and receptionist workflows in one calm place. This login is demo-only and does not require real credentials.
            </p>
          </section>

          <section className="rounded-[2.25rem] border border-[#dfd6c8] bg-white/88 p-8 shadow-[0_24px_60px_rgba(58,54,45,0.08)] backdrop-blur md:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Welcome</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Sign in to Fawn</h2>
              <p className="mt-2 text-sm text-slate-500">Use any values or leave both fields blank.</p>
            </div>

            <div className="mt-8 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="director@sunshine-daycare.com"
                  className="rounded-2xl border border-[#ddd6ca] bg-[#fbfaf7] px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#6f8c74] focus:bg-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Anything works here"
                  className="rounded-2xl border border-[#ddd6ca] bg-[#fbfaf7] px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#6f8c74] focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-8 grid gap-3">
              <a
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d3b36] px-5 py-4 text-sm font-medium text-white transition hover:bg-[#234740]"
              >
                Enter Admin Dashboard
                <ArrowRight size={16} />
              </a>
              <a
                href="/client"
                className="inline-flex items-center justify-center rounded-2xl border border-[#ddd6ca] bg-white px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-[#faf8f3]"
              >
                Open Family Portal
              </a>
            </div>

            <p className="mt-6 text-center text-xs uppercase tracking-[0.22em] text-slate-400">
              Demo access only
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
