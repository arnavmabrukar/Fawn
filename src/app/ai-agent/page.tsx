"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, Package, Radar, RefreshCw, ShieldAlert } from "lucide-react";

type InventoryItem = {
  _id: string;
  item: string;
  category: "food" | "toy" | "cleaning" | "safety";
  quantity: number;
  threshold: number;
  unit: string;
  room: string;
  notes?: string;
  updatedAt: string;
};

type AgentTask = {
  _id: string;
  kind: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  output?: {
    recommendation?: string;
    directorNotification?: string;
  };
  createdAt: string;
};

type AgentEvent = {
  _id: string;
  type: string;
  source: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

type AgentStatusResponse = {
  inventory: InventoryItem[];
  tasks: AgentTask[];
  events: AgentEvent[];
  lastUpdatedAt: string;
};

type InventoryDraft = {
  item: string;
  category: InventoryItem["category"];
  quantity: string;
  threshold: string;
  unit: string;
  room: string;
  notes: string;
};

const defaultDraft: InventoryDraft = {
  item: "Milk",
  category: "food",
  quantity: "1",
  threshold: "2",
  unit: "gallons",
  room: "Toddler Room",
  notes: "Demo low-stock signal",
};

function getAgentApiBase() {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  return "http://localhost:8080";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stringifyPayload(value: Record<string, unknown> | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "No extra payload";
  }

  return Object.entries(value)
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join(" | ");
}

export default function AIAgentPage() {
  const [data, setData] = useState<AgentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pulsePending, setPulsePending] = useState(false);
  const [inventoryPending, setInventoryPending] = useState(false);
  const [draft, setDraft] = useState<InventoryDraft>(defaultDraft);

  const apiBase = useMemo(() => getAgentApiBase(), []);

  const loadAgentStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/agent/status`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load agent status");
      }

      const nextData = (await response.json()) as AgentStatusResponse;
      setData(nextData);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the agent backend");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadAgentStatus().catch(() => {});

    const interval = window.setInterval(() => {
      loadAgentStatus().catch(() => {});
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAgentStatus]);

  const handlePulse = async () => {
    setPulsePending(true);

    try {
      const response = await fetch(`${apiBase}/api/agent/pulse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Pulse failed");
      }

      await loadAgentStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pulse failed");
    } finally {
      setPulsePending(false);
    }
  };

  const handleInventorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInventoryPending(true);

    try {
      const response = await fetch(`${apiBase}/api/agent/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          quantity: Number(draft.quantity),
          threshold: Number(draft.threshold),
        }),
      });

      if (!response.ok) {
        throw new Error("Inventory update failed");
      }

      await loadAgentStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inventory update failed");
    } finally {
      setInventoryPending(false);
    }
  };

  const criticalInventory = data?.inventory.filter((item) => item.quantity <= item.threshold) || [];
  const latestTask = data?.tasks[0];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ed_0%,#efe7da_100%)] px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Admin
            </a>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">
              24/7 Operations Agent
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Fawn is monitoring Mongo-backed operational state.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This page reads live agent tasks, events, and inventory from the Node backend. The server
              wakes up every minute, evaluates the current state, and writes its decisions back into
              MongoDB.
            </p>
          </div>

          <button
            onClick={handlePulse}
            disabled={pulsePending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <RefreshCw size={16} className={pulsePending ? "animate-spin" : ""} />
            Run Pulse Now
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}. Make sure `npm run dev:server` is running on port `8080`.
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Agent State
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Live Monitor</h2>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                {loading ? "Loading..." : "Polling every 5s"}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <Bot size={18} />
                  <p className="text-sm font-semibold">Latest Task</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {latestTask ? latestTask.kind.replaceAll("_", " ") : "No agent task yet"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <ShieldAlert size={18} />
                  <p className="text-sm font-semibold">Low Inventory</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{criticalInventory.length} flagged items</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <Radar size={18} />
                  <p className="text-sm font-semibold">Last Sync</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {data?.lastUpdatedAt ? formatDateTime(data.lastUpdatedAt) : "Waiting for backend"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#faf8f2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Latest Decision</p>
                {latestTask ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-lg font-semibold text-slate-950">{latestTask.reason}</p>
                    <p className="text-sm leading-7 text-slate-700">
                      {latestTask.output?.recommendation || "No recommendation recorded yet."}
                    </p>
                    <div className="rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-100">
                      {latestTask.output?.directorNotification || "No director notification recorded yet."}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    The agent has not written any tasks yet. Try lowering an inventory item and running a
                    pulse.
                  </p>
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Recent Tasks
                  </p>
                  <div className="mt-4 space-y-3">
                    {(data?.tasks || []).slice(0, 6).map((task) => (
                      <div key={task._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{task.kind.replaceAll("_", " ")}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            {task.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{task.reason}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatDateTime(task.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Recent Events
                  </p>
                  <div className="mt-4 space-y-3">
                    {(data?.events || []).slice(0, 6).map((eventItem) => (
                      <div key={eventItem._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{eventItem.type.replaceAll("_", " ")}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            {eventItem.source}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {stringifyPayload(eventItem.payload)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{formatDateTime(eventItem.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-daycare-teal" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Demo Controls
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-950">Update Inventory</h2>
                </div>
              </div>

              <form onSubmit={handleInventorySubmit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={draft.item}
                    onChange={(event) => setDraft((prev) => ({ ...prev, item: event.target.value }))}
                    placeholder="Item"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                  />
                  <select
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        category: event.target.value as InventoryItem["category"],
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                  >
                    <option value="food">Food</option>
                    <option value="toy">Toy</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="safety">Safety</option>
                  </select>
                  <input
                    value={draft.quantity}
                    onChange={(event) => setDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                    placeholder="Quantity"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                  />
                  <input
                    value={draft.threshold}
                    onChange={(event) => setDraft((prev) => ({ ...prev, threshold: event.target.value }))}
                    placeholder="Threshold"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                  />
                  <input
                    value={draft.unit}
                    onChange={(event) => setDraft((prev) => ({ ...prev, unit: event.target.value }))}
                    placeholder="Unit"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                  />
                  <input
                    value={draft.room}
                    onChange={(event) => setDraft((prev) => ({ ...prev, room: event.target.value }))}
                    placeholder="Room"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                  />
                </div>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  placeholder="Why this matters"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-daycare-teal focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={inventoryPending}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {inventoryPending ? "Saving..." : "Save Inventory State"}
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Current Inventory
              </p>
              <div className="mt-4 space-y-3">
                {(data?.inventory || []).map((item) => {
                  const isLow = item.quantity <= item.threshold;

                  return (
                    <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.item}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.room} | {item.category}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${
                            isLow ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isLow ? "low" : "ok"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {item.quantity} {item.unit} on hand | threshold {item.threshold}
                      </p>
                      {item.notes ? <p className="mt-2 text-sm text-slate-500">{item.notes}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
