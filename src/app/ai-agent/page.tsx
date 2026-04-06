"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Star, User, Brain, ShieldCheck, TrendingUp, DollarSign, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { apiUrl } from "@/lib/api-base";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToyRecord {
  id: string;
  toy: string;
  emoji: string;
  teacher: string;
  rating: number;
  quote: string;
  date: string;
  tags: string[];
}

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  messages: string[];
}

interface SwarmResult {
  toy: string;
  emoji: string;
  reason: string;
  score: number;
}

const MOCK_TOYS: ToyRecord[] = [
  {
    id: "demo1", toy: "Magna-Tiles 100-Piece Set", emoji: "🧲", teacher: "Ms. Sarah", rating: 5, quote: "Kids were completely absorbed for 45 minutes building a castle. Incredible for spatial awareness.", date: "Oct 24", tags: ["STEM", "Cooperative Play"]
  },
  {
    id: "demo2", toy: "Kinetic Sand Play Set", emoji: "🏖️", teacher: "Mr. David", rating: 4, quote: "Great sensory experience, very calming for the toddlers. A bit messy to clean up though.", date: "Oct 25", tags: ["Sensory", "Fine Motor"]
  },
  {
    id: "demo3", toy: "Wooden Train Set", emoji: "🚂", teacher: "Ms. Jessica", rating: 3, quote: "Classic toy but the pieces keep getting lost under the couches.", date: "Oct 21", tags: ["Classic", "Imaginative"]
  }
];

const INITIAL_AGENTS: Agent[] = [
  {
    id: "safety",
    name: "Agent SHIELD",
    role: "Safety & Age Appropriateness",
    icon: <ShieldCheck size={18} />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    messages: [],
  },
  {
    id: "engagement",
    name: "Agent PULSE",
    role: "Engagement & Enthusiasm Scoring",
    icon: <TrendingUp size={18} />,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    messages: [],
  },
  {
    id: "budget",
    name: "Agent LEDGER",
    role: "Budget & Resource Optimization",
    icon: <DollarSign size={18} />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    messages: [],
  },
  {
    id: "dev",
    name: "Agent GROW",
    role: "Developmental Milestone Alignment",
    icon: <Brain size={18} />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    messages: [],
  },
  {
    id: "consensus",
    name: "Agent ARBITER",
    role: "Swarm Consensus & Final Selection",
    icon: <CheckCircle2 size={18} />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    messages: [],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}
        />
      ))}
    </div>
  );
}

function AgentCard({
  agent,
  isActive,
  isDone,
}: {
  agent: Agent;
  isActive: boolean;
  isDone: boolean;
}) {
  const messages = agent.messages || [];

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-500 ${
        isActive || isDone
          ? `${agent.bgColor} ${agent.borderColor} opacity-100`
          : "bg-gray-50 border-gray-100 opacity-40"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`${agent.color} ${isActive || isDone ? "opacity-100" : "opacity-40"}`}>
          {agent.icon}
        </div>
        <div>
          <p className={`font-bold text-sm ${isActive || isDone ? agent.color : "text-gray-400"}`}>
            {agent.name}
          </p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            {agent.role}
          </p>
        </div>
        {isActive && (
          <div className="ml-auto flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${agent.color.replace("text", "bg")} animate-pulse`} />
          </div>
        )}
      </div>
      <div className="space-y-1.5 min-h-[60px]">
        {messages.map((msg, i) => (
          <p
            key={i}
            className={`text-xs leading-relaxed ${
              i === messages.length - 1 && isActive ? "text-gray-700 font-medium" : "text-gray-400"
            }`}
          >
            {i === messages.length - 1 && isActive && "› "}
            {msg}
          </p>
        ))}
        {!isActive && !isDone && (
          <p className="text-xs text-gray-300 italic">Waiting for activation...</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type SwarmState = "idle" | "running" | "done";

export default function AIAgentPage() {
  const [swarmState, setSwarmState] = useState<SwarmState>("idle");
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [toyRecords, setToyRecords] = useState<ToyRecord[]>([]);
  const [swarmResults, setSwarmResults] = useState<SwarmResult[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    fetch(apiUrl('/api/toys'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setToyRecords(data);
        } else {
          setToyRecords(MOCK_TOYS);
        }
      })
      .catch(err => {
        console.error("Failed to fetch toys:", err);
        setToyRecords(MOCK_TOYS);
      });
  }, []);

  const runSwarm = () => {
    if (swarmState === "running") return;

    setSwarmState("running");
    setSwarmResults([]);
    setAgents(INITIAL_AGENTS.map(a => ({ ...a, messages: [] })));
    setActiveIds([]);
    setDoneIds([]);

    const evtSource = new EventSource(apiUrl('/api/swarm'));

    evtSource.addEventListener('status', (e) => {
      console.log('Swarm Status:', JSON.parse(e.data).message);
    });

    evtSource.addEventListener('agent_start', (e) => {
      const { id } = JSON.parse(e.data);
      setActiveIds(prev => prev.includes(id) ? prev : [...prev, id]);
    });

    evtSource.addEventListener('agent_message', (e) => {
      const data = JSON.parse(e.data);
      setAgents(prev => {
        const next = [...prev];
        const idx = next.findIndex(a => a.id === data.id);
        if (idx > -1) {
          const msgs = [...next[idx].messages];
          msgs[data.index] = data.text;
          next[idx] = { ...next[idx], messages: msgs };
        }
        return next;
      });
    });

    evtSource.addEventListener('agent_done', (e) => {
      const { id } = JSON.parse(e.data);
      setActiveIds(prev => prev.filter(aId => aId !== id));
      setDoneIds(prev => prev.includes(id) ? prev : [...prev, id]);
    });

    evtSource.addEventListener('result', (e) => {
      const finalJson = JSON.parse(e.data);
      setSwarmResults(finalJson);
      setSwarmState("done");
      evtSource.close();
    });

    evtSource.addEventListener('error', (e) => {
      console.error('SSE Error:', e);
      setSwarmState("done");
      evtSource.close();
    });
  };

  const runDemoSwarm = () => {
    if (swarmState === "running") return;

    setSwarmState("running");
    setSwarmResults([]);
    setAgents(INITIAL_AGENTS.map(a => ({ ...a, messages: [] })));
    
    // Activate all 4 parallel sub-agents immediately
    setActiveIds(["safety", "engagement", "budget", "dev"]);
    setDoneIds([]);

    const pushMessage = (agentId: string, text: string, delay: number) => {
      setTimeout(() => {
        setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, messages: [...a.messages, text] } : a
        ));
      }, delay);
    };

    const finishAgent = (agentId: string, delay: number) => {
      setTimeout(() => {
        setActiveIds(prev => prev.filter(id => id !== agentId));
        setDoneIds(prev => [...prev, agentId]);
      }, delay);
    };

    // Agent SHIELD (Safety)
    pushMessage("safety", "Analyzing components for choking hazards < 1.25 inches...", 1000);
    pushMessage("safety", "Cross-referencing CPSC recall databases...", 2500);
    pushMessage("safety", "Verified materials: Non-toxic ABS plastics and food-grade silicone.", 4000);
    pushMessage("safety", "Safety checks passed. No high-risk items identified in current selection.", 5500);
    finishAgent("safety", 6000);

    // Agent PULSE (Engagement)
    pushMessage("engagement", "Parsing teacher sentiment analysis from feedback...", 1200);
    pushMessage("engagement", "Magna-tiles showing 94% sustained focus duration.", 2800);
    pushMessage("engagement", "Kinetic sand engagement high, but replay value slightly drops on day 3.", 4200);
    pushMessage("engagement", "Top engagement score assigned to magnetic building sets.", 5200);
    finishAgent("engagement", 5800);

    // Agent LEDGER (Budget)
    pushMessage("budget", "Calculating current inventory depreciation...", 800);
    pushMessage("budget", "Weekly budget cap: $200.00.", 2000);
    pushMessage("budget", "Projected cost of new Magna-tiles expansion: $119.99.", 3500);
    pushMessage("budget", "Budget optimized. $80.01 remains for sensory materials.", 5000);
    finishAgent("budget", 5500);

    // Agent GROW (Dev)
    pushMessage("dev", "Mapping toy properties to Piaget's stages of cognitive development...", 1500);
    pushMessage("dev", "Sensory sand supports tactile feedback required in pre-operational stage.", 3000);
    pushMessage("dev", "Train sets lacking open-ended versatility compared to blocks.", 4500);
    pushMessage("dev", "Alignment confirmed for spatial reasoning and fine motor milestones.", 6000);
    finishAgent("dev", 6500);

    // Consensus Agent (Starts after others finish)
    setTimeout(() => {
      setActiveIds(["consensus"]);
      pushMessage("consensus", "Aggregating signals from 4 parallel agents...", 500);
      pushMessage("consensus", "Safety weight: 40% | Engagement: 30% | Dev: 20% | Budget: 10%", 2000);
      pushMessage("consensus", "🏆 Consensus reached. Final toy lineup confirmed.", 3500);
      
      setTimeout(() => {
        setActiveIds([]);
        setDoneIds(prev => [...prev, "consensus"]);
        setSwarmResults([
          { toy: "Magna-Tiles Expansion", emoji: "🧲", score: 98, reason: "Perfect safety record, unmatched cooperative engagement, and fits within the $200 budget." },
          { toy: "Kinetic Sand Bulk Pack", emoji: "🏖️", score: 85, reason: "Excellent sensory & fine motor development. Replaced older high-mess options." },
          { toy: "Soft Foam Blocks", emoji: "🧱", score: 82, reason: "Great for infants and early toddlers. Zero choking hazard and highly durable." }
        ]);
        setSwarmState("done");
      }, 5000);
    }, 7000);
  };

  const resetSwarm = () => {
    setSwarmState("idle");
    setAgents(INITIAL_AGENTS.map(a => ({ ...a, messages: [] })));
    setActiveIds([]);
    setDoneIds([]);
    setSwarmResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </a>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={22} className="text-purple-600" />
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agentic Toy Picker</h1>
              </div>
              <p className="text-gray-500">
                A 5-agent swarm analyzes real-time teacher feedback from MongoDB and recommends next week&apos;s toy lineup.
              </p>
            </div>

            <div className="flex gap-3">
              {swarmState !== "idle" && (
                <button
                  onClick={resetSwarm}
                  className="px-4 py-2 bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Reset
                </button>
              )}
              <button
                onClick={runDemoSwarm}
                disabled={swarmState === "running" || toyRecords.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                  swarmState === "running" || toyRecords.length === 0
                    ? "bg-fuchsia-300 text-white cursor-not-allowed"
                    : "bg-fuchsia-600 text-white hover:bg-fuchsia-700 hover:shadow-fuchsia-200 hover:shadow-lg"
                }`}
              >
                <Sparkles size={16} />
                 {toyRecords.length === 0 ? "Loading DB..." : swarmState === "running" ? "Agents Analyzing..." : "Simulate Swarm (Demo)"}
              </button>
              <button
                onClick={runSwarm}
                disabled={swarmState === "running" || toyRecords.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                  swarmState === "running" || toyRecords.length === 0
                    ? "bg-purple-300 text-white cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-200 hover:shadow-lg"
                }`}
              >
                <Sparkles size={16} />
                 {toyRecords.length === 0 ? "Loading DB..." : swarmState === "running" ? "Agents Analyzing..." : "Run Real Swarm"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">

          {/* Left: Teacher Feedback Ledger */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-gray-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Weekly Teacher Feedback — Live from DB
              </h2>
            </div>

            <div className="space-y-3">
              {toyRecords.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                  <Clock className="mx-auto mb-2 opacity-50" size={24} />
                  Loading toy feedback from MongoDB...
                </div>
              ) : (
                toyRecords.map((record) => (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-purple-100 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl">
                          {record.emoji || "🧸"}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{record.toy}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={record.rating} />
                            <span className="text-[10px] text-gray-400">{record.date}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={10} />
                        {record.teacher}
                      </span>
                    </div>

                    {record.quote && (
                      <p className="text-xs text-gray-500 italic mt-3 leading-relaxed border-l-2 border-gray-100 pl-3">
                        &ldquo;{record.quote}&rdquo;
                      </p>
                    )}

                    {record.tags && record.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {record.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-purple-50 text-purple-600 font-semibold px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Agent Swarm */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-purple-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Agent Swarm — Parallel LLM Inference
              </h2>
            </div>

            {swarmState === "idle" && (
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-12 text-center">
                <Sparkles size={32} className="text-purple-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Click &quot;Run Gemini Swarm&quot; to activate</p>
                <p className="text-xs text-gray-400 mt-1">4 agents will analyze the feedback in parallel, then 1 agent decides.</p>
              </div>
            )}

            {swarmState !== "idle" && (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isActive={activeIds.includes(agent.id)}
                    isDone={doneIds.includes(agent.id)}
                  />
                ))}
              </div>
            )}

            {/* Results */}
            {swarmState === "done" && swarmResults.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-green-600">
                    Swarm Consensus — Gemini Top Recommendations
                  </h2>
                </div>

                <div className="space-y-3">
                  {swarmResults.map((result, idx) => (
                    <div
                      key={result.toy + idx}
                      className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm flex items-center gap-4"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-sm font-black text-green-600">
                        {idx + 1}
                      </div>
                      <div className="text-2xl">{result.emoji}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 text-sm">{result.toy}</h3>
                          <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            {result.score || 0}/100
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{result.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
