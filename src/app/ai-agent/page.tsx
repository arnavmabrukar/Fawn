"use client";

import React, { useState } from "react";
import { Sparkles, Star, User, Brain, ShieldCheck, TrendingUp, DollarSign, CheckCircle2, Clock } from "lucide-react";

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

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOY_RECORDS: ToyRecord[] = [
  {
    id: "1",
    toy: "Dinosaur Dig Kit",
    emoji: "🦕",
    teacher: "Ms. Rivera",
    rating: 5,
    quote: "Kids couldn't put them down! Every child was engaged for over 40 minutes.",
    date: "Mar 22",
    tags: ["STEM", "Sensory", "Independent Play"],
  },
  {
    id: "2",
    toy: "Kinetic Sand Table",
    emoji: "🏖️",
    teacher: "Mr. Chen",
    rating: 4,
    quote: "Great sensory exploration. A few needed redirection but overall very calming.",
    date: "Mar 23",
    tags: ["Sensory", "Fine Motor"],
  },
  {
    id: "3",
    toy: "Mega Block Puzzle",
    emoji: "🟦",
    teacher: "Ms. Okafor",
    rating: 5,
    quote: "Incredible focus and teamwork. Kids were helping each other without prompting!",
    date: "Mar 24",
    tags: ["Teamwork", "Cognitive", "Fine Motor"],
  },
  {
    id: "4",
    toy: "Toy Kitchen Set",
    emoji: "🍳",
    teacher: "Ms. Rivera",
    rating: 3,
    quote: "Popular but gets chaotic fast. Works better in small groups of 2-3.",
    date: "Mar 24",
    tags: ["Role Play", "Social"],
  },
  {
    id: "5",
    toy: "Magnetic Tiles",
    emoji: "🔷",
    teacher: "Mr. Chen",
    rating: 4,
    quote: "Loved by the older kids (4-5yr). Younger ones struggled a bit but stayed curious.",
    date: "Mar 25",
    tags: ["STEM", "Creativity", "3D Thinking"],
  },
  {
    id: "6",
    toy: "Finger Paints",
    emoji: "🎨",
    teacher: "Ms. Okafor",
    rating: 3,
    quote: "Messy but joyful. Several kids painted for the first time and were beaming.",
    date: "Mar 26",
    tags: ["Art", "Sensory", "Expression"],
  },
  {
    id: "7",
    toy: "Animal Puppets",
    emoji: "🐸",
    teacher: "Ms. Rivera",
    rating: 4,
    quote: "Big hit during circle time. Kids started making up their own stories!",
    date: "Mar 27",
    tags: ["Language", "Creativity", "Social"],
  },
];

const AGENTS: Agent[] = [
  {
    id: "safety",
    name: "Agent SHIELD",
    role: "Safety & Age Appropriateness",
    icon: <ShieldCheck size={18} />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    messages: [
      "Scanning 7 toy records for age-appropriate safety flags...",
      "Dinosaur Dig Kit ✓ — no sharp parts, 3+ age bracket confirmed.",
      "Kinetic Sand ✓ — non-toxic, allergen status clear in inventory.",
      "Mega Block Puzzle ✓ — all pieces >3cm, no choking risk.",
      "Flagging Toy Kitchen Set ⚠ — high congestion risk in groups >3.",
      "Safety analysis complete. 6/7 toys cleared for deployment.",
    ],
  },
  {
    id: "engagement",
    name: "Agent PULSE",
    role: "Engagement & Enthusiasm Scoring",
    icon: <TrendingUp size={18} />,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    messages: [
      "Computing weighted engagement scores from teacher ratings...",
      "Dinosaur Dig Kit: 5.0/5 avg, sustained engagement >40min 🔥",
      "Mega Block Puzzle: 5.0/5 avg, unprompted peer cooperation noted.",
      "Animal Puppets: 4.0/5, spontaneous narrative play detected.",
      "Kinetic Sand: 4.0/5, strong but 18% redirection rate logged.",
      "Top engagement tier locked: Dinosaur Kit, Blocks, Puppets.",
    ],
  },
  {
    id: "budget",
    name: "Agent LEDGER",
    role: "Budget & Resource Optimization",
    icon: <DollarSign size={18} />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    messages: [
      "Cross-referencing toy records with facility inventory...",
      "Dinosaur Dig Kit: $0 — already in storage room B. ✓",
      "Mega Block Puzzle: $0 — current stock sufficient. ✓",
      "Kinetic Sand Table: $0 — permanently installed. ✓",
      "Animal Puppets: $0 — 12 units in cabinet 3. ✓",
      "Zero additional spend required for top 4 candidates. Flagging for consensus.",
    ],
  },
  {
    id: "dev",
    name: "Agent GROW",
    role: "Developmental Milestone Alignment",
    icon: <Brain size={18} />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    messages: [
      "Mapping toys to this cohort's developmental targets (age 3-5)...",
      "Target milestones: fine motor, cooperative play, language, STEM curiosity.",
      "Mega Block Puzzle ✓✓ — fine motor + cooperative play, dual milestone hit.",
      "Animal Puppets ✓✓ — language development + narrative thinking confirmed.",
      "Dinosaur Dig Kit ✓ — STEM curiosity, spatial reasoning engagement.",
      "Developmental alignment scored. Recommending Blocks, Puppets, Dinosaur Kit.",
    ],
  },
  {
    id: "consensus",
    name: "Agent ARBITER",
    role: "Swarm Consensus & Final Selection",
    icon: <CheckCircle2 size={18} />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    messages: [
      "Receiving signals from 4 agents... aggregating vote weights.",
      "Safety votes: Dinosaur Kit(1), Blocks(1), Puppets(1).",
      "Engagement votes: Dinosaur Kit(1), Blocks(1), Puppets(1).",
      "Budget votes: Dinosaur Kit(1), Blocks(1), Sand(1), Puppets(1).",
      "Development votes: Blocks(2), Puppets(2), Dinosaur Kit(1).",
      "🏆 Consensus reached. Final toy lineup for next week confirmed.",
    ],
  },
];

const SWARM_RESULTS: SwarmResult[] = [
  {
    toy: "Mega Block Puzzle",
    emoji: "🟦",
    reason: "Highest composite score: 5/5 engagement, dual developmental milestones, zero cost.",
    score: 98,
  },
  {
    toy: "Dinosaur Dig Kit",
    emoji: "🦕",
    reason: "Maximum sustained engagement (40+ min), STEM alignment, unanimous safety clearance.",
    score: 95,
  },
  {
    toy: "Animal Puppets",
    emoji: "🐸",
    reason: "Strong language + social development signal, spontaneous storytelling observed.",
    score: 89,
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
  activeIndex,
  agentIndex,
  messageIndex,
}: {
  agent: Agent;
  activeIndex: number;
  agentIndex: number;
  messageIndex: number;
}) {
  const isActive = agentIndex <= activeIndex;
  const messages = isActive ? agent.messages.slice(0, messageIndex + 1) : [];

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-500 ${
        isActive
          ? `${agent.bgColor} ${agent.borderColor} opacity-100`
          : "bg-gray-50 border-gray-100 opacity-40"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`${agent.color} ${isActive ? "opacity-100" : "opacity-40"}`}>
          {agent.icon}
        </div>
        <div>
          <p className={`font-bold text-sm ${isActive ? agent.color : "text-gray-400"}`}>
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
              i === messages.length - 1 ? "text-gray-700 font-medium" : "text-gray-400"
            }`}
          >
            {i === messages.length - 1 && isActive && "› "}
            {msg}
          </p>
        ))}
        {!isActive && (
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
  const [activeAgentIndex, setActiveAgentIndex] = useState(-1);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const runSwarm = () => {
    if (swarmState === "running") return;

    setSwarmState("running");
    setActiveAgentIndex(-1);
    setMessageIndex(0);
    setShowResults(false);

    const AGENT_DELAY = 900; // ms between each agent activating
    const MSG_DELAY = 600;   // ms between each message within an agent

    AGENTS.forEach((_, agentIdx) => {
      setTimeout(() => {
        setActiveAgentIndex(agentIdx);
        setMessageIndex(0);

        AGENTS[agentIdx].messages.forEach((_, msgIdx) => {
          if (msgIdx === 0) return;
          setTimeout(() => {
            setMessageIndex(msgIdx);
          }, msgIdx * MSG_DELAY);
        });

        const isLast = agentIdx === AGENTS.length - 1;
        if (isLast) {
          setTimeout(() => {
            setSwarmState("done");
            setShowResults(true);
          }, AGENTS[agentIdx].messages.length * MSG_DELAY + 400);
        }
      }, agentIdx * (AGENT_DELAY + AGENTS[agentIdx].messages.length * MSG_DELAY));
    });
  };

  const resetSwarm = () => {
    setSwarmState("idle");
    setActiveAgentIndex(-1);
    setMessageIndex(0);
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={22} className="text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agentic Toy Picker</h1>
            </div>
            <p className="text-gray-500">
              A 5-agent swarm analyzes weekly teacher feedback and selects next week&apos;s toy lineup.
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
              onClick={runSwarm}
              disabled={swarmState === "running"}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                swarmState === "running"
                  ? "bg-purple-300 text-white cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-200 hover:shadow-lg"
              }`}
            >
              <Sparkles size={16} />
              {swarmState === "running" ? "Swarm Running..." : swarmState === "done" ? "Run Again" : "Run Agentic Swarm"}
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">

          {/* Left: Teacher Feedback Ledger */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-gray-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Weekly Teacher Feedback — Mar 22–28
              </h2>
            </div>

            <div className="space-y-3">
              {TOY_RECORDS.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-purple-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl">
                        {record.emoji}
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

                  <p className="text-xs text-gray-500 italic mt-3 leading-relaxed border-l-2 border-gray-100 pl-3">
                    &ldquo;{record.quote}&rdquo;
                  </p>

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
                </div>
              ))}
            </div>
          </div>

          {/* Right: Agent Swarm */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-purple-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Agent Swarm — 5 Specialized Agents
              </h2>
            </div>

            {swarmState === "idle" && (
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-12 text-center">
                <Sparkles size={32} className="text-purple-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Click &quot;Run Agentic Swarm&quot; to activate</p>
                <p className="text-xs text-gray-400 mt-1">5 agents will analyze the feedback and converge on a toy recommendation</p>
              </div>
            )}

            {swarmState !== "idle" && (
              <div className="space-y-3">
                {AGENTS.map((agent, idx) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    activeIndex={activeAgentIndex}
                    agentIndex={idx}
                    messageIndex={idx === activeAgentIndex ? messageIndex : idx < activeAgentIndex ? agent.messages.length - 1 : 0}
                  />
                ))}
              </div>
            )}

            {/* Results */}
            {showResults && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-green-600">
                    Swarm Consensus — Next Week&apos;s Toy Lineup
                  </h2>
                </div>

                <div className="space-y-3">
                  {SWARM_RESULTS.map((result, idx) => (
                    <div
                      key={result.toy}
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
                            {result.score}/100
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
