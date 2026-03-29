"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ScanSearch,
  Send,
} from 'lucide-react';

const loopSteps = [
  {
    title: 'Detect new enrollment',
    detail: 'Leo arrives in the New Enrollment folder with an intake form that lists an egg allergy.',
  },
  {
    title: 'Scan Tuesday breakfast',
    detail: 'Fawn finds “Scrambled Eggs” in the Weekly Menu and flags the conflict automatically.',
  },
  {
    title: 'Generate safe substitute',
    detail: 'The breakfast is swapped to Avocado Toast and kitchen instructions are updated.',
  },
  {
    title: 'Check pantry and order',
    detail: 'Avocados are missing, so Fawn places them in the Monday delivery cart.',
  },
  {
    title: 'Notify the cook',
    detail: 'A text is sent with the allergy, substitution, and delivery ETA before anyone clocks in.',
  },
] as const;

const kitchenInstructionsBefore = [
  'Tuesday breakfast: Scrambled Eggs for toddlers + preschool room.',
  'Prep fruit cups at 8:15 AM.',
  'No custom substitutions currently listed.',
];

const pantryBefore = [
  { item: 'Eggs', status: 'In stock', tone: 'ok' },
  { item: 'Sourdough bread', status: 'In stock', tone: 'ok' },
  { item: 'Avocados', status: 'Out of stock', tone: 'alert' },
  { item: 'Sunflower butter', status: 'In stock', tone: 'ok' },
];

export default function AIAgentPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const resetLoop = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    setIsRunning(false);
    setStepIndex(-1);
    setCompletedSteps([]);
  };

  const runLoop = () => {
    resetLoop();
    setIsRunning(true);

    loopSteps.forEach((_, index) => {
      const timeoutId = window.setTimeout(() => {
        setStepIndex(index);
        setCompletedSteps((prev) => (prev.includes(index) ? prev : [...prev, index]));

        if (index === loopSteps.length - 1) {
          setIsRunning(false);
        }
      }, 900 * (index + 1));

      timersRef.current.push(timeoutId);
    });
  };

  const kitchenInstructions = useMemo(() => {
    if (stepIndex < 2) {
      return kitchenInstructionsBefore;
    }

    return [
      'Tuesday breakfast: Leo receives Avocado Toast instead of eggs.',
      'Use sunflower butter station to avoid cross-contact with egg prep.',
      'Prep fruit cups at 8:15 AM.',
    ];
  }, [stepIndex]);

  const pantry = useMemo(() => {
    if (stepIndex < 3) {
      return pantryBefore;
    }

    return [
      { item: 'Eggs', status: 'In stock', tone: 'ok' },
      { item: 'Sourdough bread', status: 'In stock', tone: 'ok' },
      { item: 'Avocados', status: 'Ordered for Monday 7:00 AM', tone: 'pending' },
      { item: 'Sunflower butter', status: 'In stock', tone: 'ok' },
    ];
  }, [stepIndex]);

  const cookMessage =
    "Heads up! Leo started today and has an egg allergy. I've swapped Tuesday's breakfast to Avocado Toast and ordered the ingredients. They arrive at 7 AM Monday.";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_26%),radial-gradient(circle_at_85%_12%,rgba(13,148,136,0.16),transparent_30%),linear-gradient(180deg,#fffaf2_0%,#f4efe6_100%)] px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              <ArrowLeft size={16} />
              Back to Admin
            </a>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.34em] text-amber-700">Autonomous Food Loop</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Fawn resolves menu allergies before the kitchen even asks.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This agent monitors the weekly menu, intake documents, pantry levels, and delivery workflows so food substitutions happen automatically when a child allergy appears.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runLoop}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5"
            >
              <ScanSearch size={16} />
              Run Allergy Loop
            </button>
            <button
              onClick={resetLoop}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Autonomous Logic</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Decision Loop</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-medium ${isRunning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isRunning ? 'Running' : completedSteps.length === loopSteps.length ? 'Completed' : 'Ready'}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {loopSteps.map((step, index) => {
                const isComplete = completedSteps.includes(index);
                const isActive = stepIndex === index && isRunning;

                return (
                  <article
                    key={step.title}
                    className={`rounded-[1.5rem] border px-5 py-4 transition ${
                      isActive
                        ? 'border-amber-300 bg-amber-50 shadow-sm'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                        isComplete ? 'bg-emerald-600 text-white' : isActive ? 'bg-amber-500 text-white' : 'bg-white text-slate-400'
                      }`}>
                        {isComplete ? <CheckCircle2 size={16} /> : index + 1}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-[#f7f4ed] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">No-Human Output</p>
              <div className="mt-4 rounded-[1.25rem] bg-slate-950 px-5 py-5 text-white shadow-lg">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Send size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.24em]">Cook Text</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-100">
                  {stepIndex >= 4 ? cookMessage : 'Fawn will send the cook update once substitutions and inventory checks are complete.'}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6">
            <article className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">What Fawn Sees</p>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">Leo&apos;s Intake</h2>
                      <p className="text-sm text-slate-500">New enrollment detected</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
                      Egg Allergy
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p>Toddler room start date: today</p>
                    <p>Doctor note attached</p>
                    <p>Breakfast substitutions required</p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">Tuesday Menu</h2>
                      <p className="text-sm text-slate-500">Conflict found in weekly menu</p>
                    </div>
                    {stepIndex >= 1 ? <AlertTriangle size={18} className="text-rose-500" /> : null}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>Breakfast: {stepIndex >= 2 ? 'Avocado Toast' : 'Scrambled Eggs'}</p>
                    <p>Lunch: Mac and Cheese</p>
                    <p className="text-slate-500">Source: Weekly Menu Google Doc</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">What Fawn Changes</p>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-lg font-semibold text-slate-950">Kitchen Instructions</h2>
                  <div className="mt-4 space-y-3">
                    {kitchenInstructions.map((line) => (
                      <div key={line} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-lg font-semibold text-slate-950">Pantry + Delivery</h2>
                  <div className="mt-4 space-y-3">
                    {pantry.map((item) => (
                      <div key={item.item} className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{item.item}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            item.tone === 'alert'
                              ? 'bg-rose-100 text-rose-700'
                              : item.tone === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
