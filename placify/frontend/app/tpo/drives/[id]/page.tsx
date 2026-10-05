"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, createDriveSocket } from "@/lib/api";
import type { AgentEvent, ShortlistEntry, ScheduleSlot } from "@/lib/types";
import JobDescriptionModal from "@/components/JobDescriptionModal";

const EVENT_ICONS: Record<string, string> = {
  thinking: "🤔", action: "⚡", complete: "✅", error: "❌", warning: "⚠️",
};
const EVENT_COLORS: Record<string, string> = {
  thinking: "text-slate-400", action: "text-teal-300",
  complete: "text-green-400", error: "text-red-400", warning: "text-amber-400",
};
const AGENT_COLORS: Record<string, string> = {
  "Company Agent": "bg-blue-500",
  "Eligibility Agent": "bg-teal-500",
  "Verification Agent": "bg-indigo-500",
  "Application Agent": "bg-purple-500",
  "Communication Agent": "bg-pink-500",
  "Assessment Agent": "bg-amber-500",
  "Shortlisting Agent": "bg-green-500",
  "Scheduling Agent": "bg-cyan-500",
  "Conflict Checker": "bg-orange-500",
  "Critic / Reflection Agent": "bg-violet-500",
};

type ActiveTab = "feed" | "shortlist" | "schedule" | "communications";

export default function DriveDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [drive, setDrive] = useState<any>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [tab, setTab] = useState<ActiveTab>("feed");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [simulatingConflict, setSimulatingConflict] = useState(false);
  const [showJdModal, setShowJdModal] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);



  const handleSimulateConflict = async () => {
    setSimulatingConflict(true);
    try {
      const res = await api.drives.simulateConflict(parseInt(id));
      setConflictResult(res);
      await loadSchedule();
      await loadLogs();
    } catch (e: any) {
      alert(e.message || "Failed to simulate interview clash");
    } finally {
      setSimulatingConflict(false);
    }
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("placify_user") || "{}");
    if (!u?.role) { router.push("/login"); return; }
    loadDrive();
    loadLogs();
    loadShortlist();
    loadSchedule();
    // Connect WebSocket
    wsRef.current = createDriveSocket(parseInt(id), (event: AgentEvent) => {
      setEvents(prev => [...prev, event]);
      if (
        (event.agent === "Orchestrator" && event.type === "complete") ||
        (event.agent.includes("Critic") && (event.type === "complete" || event.type === "warning"))
      ) {
        setPipelineRunning(false);
        loadDrive();
        loadShortlist();
        loadSchedule();
      }
    });
    return () => wsRef.current?.close();
  }, [id]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events]);

  const loadDrive = async () => {
    try { setDrive(await api.drives.get(parseInt(id))); } catch {}
  };
  const loadLogs = async () => {
    try {
      const logs = await api.drives.getLogs(parseInt(id));
      setEvents(logs.map((l: any) => ({
        agent: l.agent, type: l.type, message: l.message, data: l.data, timestamp: l.timestamp
      })));
    } catch {}
  };
  const loadShortlist = async () => {
    try { setShortlist(await api.drives.getShortlist(parseInt(id))); } catch {}
  };
  const loadSchedule = async () => {
    try { setSchedule(await api.drives.getSchedule(parseInt(id))); } catch {}
  };

  const startPipeline = async () => {
    setPipelineRunning(true);
    setEvents([]);
    try { await api.drives.startPipeline(parseInt(id)); }
    catch (e: any) { alert(e.message); setPipelineRunning(false); }
  };

  const approveDrive = async () => {
    setApproving(true);
    try {
      await api.drives.approve(parseInt(id));
      await loadDrive();
      alert("✅ Drive approved! Interview invites sent to all shortlisted students.");
    } catch (e: any) { alert(e.message); }
    finally { setApproving(false); }
  };

  if (!drive) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );

  const canStart = drive.status === "created" && !pipelineRunning;
  const canReRun = !pipelineRunning && drive.status !== "created" && drive.status !== "completed";
  const needsApproval = drive.status === "awaiting_tpo_approval";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/tpo/dashboard")} className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center"><span className="text-sm font-bold">P</span></div>
            <span className="font-bold text-lg">Placify</span>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={() => setShowJdModal(true)}
              className="bg-slate-800 hover:bg-slate-700 border border-teal-500/40 text-teal-300 px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="View official Job Description (PDF) with full recruiter specs and candidate quota"
            >
              <span>📄</span> View Company JD (PDF)
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await api.drives.remindDeadline(parseInt(id));
                  alert(`✅ ${res.message}`);
                } catch (e: any) {
                  alert(e.message || "Failed to dispatch reminders");
                }
              }}
              className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>⏰</span> Send Deadline Reminder
            </button>
            {needsApproval && (
              <button onClick={approveDrive} disabled={approving}
                className="bg-green-500 hover:bg-green-400 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-green-500/20">
                {approving ? "Approving..." : "✅ Approve & Send Invites"}
              </button>
            )}
            {canStart && (
              <button onClick={startPipeline}
                className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
                Start AI Pipeline
              </button>
            )}
            {canReRun && (
              <button onClick={startPipeline}
                className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-run Pipeline
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Drive Header */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-teal-400 text-sm font-semibold uppercase tracking-wider">{drive.company?.name}</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-white/10">
                  Drive #{drive.id}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">{drive.title}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
                {drive.package_lpa && <span>💰 ₹{drive.package_lpa} LPA</span>}
                {drive.location && <span>📍 {drive.location}</span>}
                {drive.min_cgpa && <span>📊 CGPA ≥ {drive.min_cgpa}</span>}
                {drive.allowed_branches?.length && <span>🎓 {drive.allowed_branches.join(", ")}</span>}
              </div>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowJdModal(true)}
                  className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>📄</span> View Official JD (PDF)
                </button>
                <span className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-white/5">
                  Company Target Intake: <strong className="text-amber-300 font-bold">Top {drive.shortlist_quota || 25} Candidates</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0">
              {[
                { label: "Eligible", value: drive.total_eligible, color: "text-blue-400", sub: "Cutoff Cleared" },
                { label: "Applied", value: drive.total_applied, color: "text-teal-400", sub: "Forms In" },
                { label: "Company Quota", value: drive.shortlist_quota || 25, color: "text-amber-400", sub: "Target Intake" },
                { label: "Shortlisted", value: shortlist.length > 0 ? shortlist.length : drive.total_shortlisted, color: "text-green-400", sub: "Ranked" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800 rounded-lg p-3 min-w-[100px] border border-white/5">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-400 text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] text-slate-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-900 p-1 rounded-lg w-fit">
          {([
            ["feed", "🤖 Agent Live Feed"],
            ["shortlist", "📋 Shortlist"],
            ["schedule", "📅 Schedule"],
            ["communications", "📧 Dispatched Emails & Forms"],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); if (t === "shortlist") loadShortlist(); if (t === "schedule") loadSchedule(); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Agent Live Feed */}
        {tab === "feed" && (
          <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${pipelineRunning ? "bg-teal-500 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-sm font-medium">{pipelineRunning ? "Pipeline running..." : "Agent Activity Feed"}</span>
              </div>
              <span className="text-xs text-slate-500">{events.length} events</span>
            </div>
            <div ref={feedRef} className="h-[480px] overflow-y-auto p-4 font-mono text-sm space-y-1.5">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-slate-500 font-medium">No agent activity yet</p>
                  <p className="text-slate-600 text-xs mt-1">Click "Start AI Pipeline" to begin</p>
                </div>
              ) : events.map((e, i) => (
                <div key={i} className="flex items-start gap-3 py-1 border-b border-white/3">
                  <span className="shrink-0 w-5 text-center">{EVENT_ICONS[e.type] || "•"}</span>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium text-white ${AGENT_COLORS[e.agent] || "bg-slate-600"}`}>
                      {e.agent.replace(" Agent", "").replace(" / Reflection", "")}
                    </span>
                    <span className={`${EVENT_COLORS[e.type]} break-words`}>{e.message}</span>
                  </div>
                  {e.timestamp && (
                    <span className="shrink-0 text-slate-700 text-xs">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))}
              {pipelineRunning && (
                <div className="flex items-center gap-2 text-teal-400 py-2">
                  <span className="w-3 h-3 border border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shortlist Tab */}
        {tab === "shortlist" && (
          <div className="space-y-4">
            {/* Interactive Conflict Resolution Showcase Banner */}
            {conflictResult && (
              <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-emerald-950/60 border border-rose-500/40 rounded-xl p-5 shadow-xl relative animate-in fade-in">
                <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>Interview Collision Deconfliction (Autonomous Multi-Agent Cycle)</span>
                        <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Live Auto-Resolved
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Multi-agent constraint evaluation detected double-booking for candidate <strong className="text-rose-300">{conflictResult.student_name}</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConflictResult(null)}
                    className="text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded cursor-pointer transition-colors"
                  >
                    ✕ Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4 text-xs">
                  {/* Step 1: The Clash */}
                  <div className="bg-rose-950/40 border border-rose-500/30 p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300">
                      <span>1️⃣</span> <span>COLLISION DETECTED</span>
                    </div>
                    <p className="text-slate-300">
                      <strong>{conflictResult.student_name}</strong> ({conflictResult.roll_number}) was double-booked at <strong>{conflictResult.original_time}</strong> for both:
                    </p>
                    <div className="bg-slate-900/80 p-2 rounded text-[11px] font-mono text-rose-200 border border-rose-500/20">
                      • {drive.company?.name || "Company 1"}<br />
                      • {conflictResult.clashing_company} (Concurrent)
                    </div>
                  </div>

                  {/* Step 2: Agentic Reflection Loop */}
                  <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <span>2️⃣</span> <span>CRITIC AGENT REFLECTION</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Schedule validation failed parity check. Critic Agent rejected timetable and activated LangGraph conditional edge <code className="text-purple-300 font-mono">needs_replan</code> back to <strong>Scheduling Agent</strong>.
                    </p>
                    <div className="text-[10px] text-purple-200/90 font-mono">
                      Feedback: Overlap window = 45 mins. Feasibility: 0.0.
                    </div>
                  </div>

                  {/* Step 3: Autonomous Healing */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <span>3️⃣</span> <span>AUTONOMOUS DECONFLICTION</span>
                    </div>
                    <p className="text-slate-300">
                      Candidate re-assigned to clean, conflict-free window:
                    </p>
                    <div className="bg-slate-900/80 p-2 rounded text-[11px] font-mono text-emerald-300 border border-emerald-500/20 space-y-0.5">
                      <div>⏰ Time: <strong>{conflictResult.resolved_time}</strong> (was {conflictResult.original_time})</div>
                      <div>📍 Room: <strong>{conflictResult.resolved_room}</strong></div>
                      <div>👥 Panel: <strong>{conflictResult.panel}</strong></div>
                    </div>
                    <span className="inline-block text-[10px] text-emerald-400 font-semibold mt-1">
                      ✓ Schedule integrity: 100% Conflict-Free
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Shortlisted Candidates</span>
                  <span className="text-teal-400 text-sm">
                    ({shortlist.length} candidates · Company Quota: {drive.shortlist_quota || 25})
                  </span>
                </div>
                {/* The ONE and ONLY simulate conflict button across the entire UI */}
                <button
                  type="button"
                  onClick={handleSimulateConflict}
                  disabled={simulatingConflict || shortlist.length === 0}
                  className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                  title="Simulate interview conflict for shortlisted candidates and showcase autonomous multi-agent resolution"
                >
                  <span>⚡</span> {simulatingConflict ? "Detecting & Resolving..." : "Simulate Conflict"}
                </button>
              </div>
            {shortlist.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p>No shortlist yet — run the AI pipeline first</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr className="text-slate-400 text-xs uppercase">
                      <th className="px-5 py-3 text-left">Rank</th>
                      <th className="px-5 py-3 text-left">Name</th>
                      <th className="px-5 py-3 text-left">Roll No.</th>
                      <th className="px-5 py-3 text-left">Branch</th>
                      <th className="px-5 py-3 text-right">CGPA</th>
                      <th className="px-5 py-3 text-right">Score</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortlist.map((s) => (
                      <tr key={s.student_id} className="border-t border-white/5 hover:bg-slate-800/30">
                        <td className="px-5 py-3">
                          <span className="w-7 h-7 flex items-center justify-center bg-teal-500/20 text-teal-400 rounded-full font-bold text-xs">
                            {s.rank}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">{s.name}</td>
                        <td className="px-5 py-3 text-slate-400">{s.roll_number}</td>
                        <td className="px-5 py-3">
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">{s.branch}</span>
                        </td>
                        <td className="px-5 py-3 text-right">{s.cgpa.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right text-teal-400">
                          {s.assessment_score?.toFixed(1) ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs capitalize">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Schedule Tab */}
        {tab === "schedule" && (
          <div className="space-y-4">
            {/* Interactive Conflict Resolution Showcase Banner */}
            {conflictResult && (
              <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-emerald-950/60 border border-rose-500/40 rounded-xl p-5 shadow-xl relative animate-in fade-in">
                <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>Interview Clash Detected &amp; Autonomously Resolved</span>
                        <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Live Agentic Reflection Loop
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Multi-agent constraint evaluation scanned college calendar &amp; concurrent recruitment drives.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConflictResult(null)}
                    className="text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded cursor-pointer transition-colors"
                  >
                    ✕ Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4 text-xs">
                  {/* Step 1: The Clash */}
                  <div className="bg-rose-950/40 border border-rose-500/30 p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300">
                      <span>1️⃣</span> <span>COLLISION DETECTED</span>
                    </div>
                    <p className="text-slate-300">
                      <strong>{conflictResult.student_name}</strong> ({conflictResult.roll_number}) was double-booked at <strong>{conflictResult.original_time}</strong> for both:
                    </p>
                    <div className="bg-slate-900/80 p-2 rounded text-[11px] font-mono text-rose-200 border border-rose-500/20">
                      • {drive.company?.name || "Company 1"}<br />
                      • {conflictResult.clashing_company} (Concurrent)
                    </div>
                  </div>

                  {/* Step 2: Agentic Reflection Loop */}
                  <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <span>2️⃣</span> <span>CRITIC AGENT REFLECTION</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Schedule validation failed parity check. Critic Agent rejected timetable and activated LangGraph conditional edge <code className="text-purple-300 font-mono">needs_replan</code> back to <strong>Scheduling Agent</strong>.
                    </p>
                    <div className="text-[10px] text-purple-200/90 font-mono">
                      Feedback: Overlap window = 45 mins. Feasibility: 0.0.
                    </div>
                  </div>

                  {/* Step 3: Autonomous Healing */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <span>3️⃣</span> <span>AUTONOMOUS DECONFLICTION</span>
                    </div>
                    <p className="text-slate-300">
                      Candidate re-assigned to clean, conflict-free window:
                    </p>
                    <div className="bg-slate-900/80 p-2 rounded text-[11px] font-mono text-emerald-300 border border-emerald-500/20 space-y-0.5">
                      <div>⏰ Time: <strong>{conflictResult.resolved_time}</strong> (was {conflictResult.original_time})</div>
                      <div>📍 Room: <strong>{conflictResult.resolved_room}</strong></div>
                      <div>👥 Panel: <strong>{conflictResult.panel}</strong></div>
                    </div>
                    <span className="inline-block text-[10px] text-emerald-400 font-semibold mt-1">
                      ✓ Schedule integrity: 100% Conflict-Free
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Interview Schedule</span>
                  <span className="text-teal-400 text-sm">{schedule.length} slots</span>
                </div>
              </div>
              {schedule.length === 0 ? (
                <div className="text-center py-20 text-slate-500">No schedule yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr className="text-slate-400 text-xs uppercase">
                        <th className="px-5 py-3 text-left">Student</th>
                        <th className="px-5 py-3 text-left">Roll No.</th>
                        <th className="px-5 py-3 text-left">Date &amp; Time</th>
                        <th className="px-5 py-3 text-left">Room</th>
                        <th className="px-5 py-3 text-left">Panel</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((s) => {
                        const isDeconflicted = conflictResult && s.student_name === conflictResult.student_name;
                        return (
                          <tr
                            key={s.id}
                            className={`border-t border-white/5 transition-colors ${
                              isDeconflicted
                                ? "bg-emerald-950/30 border-emerald-500/30 hover:bg-emerald-950/50"
                                : "hover:bg-slate-800/30"
                            }`}
                          >
                            <td className="px-5 py-3 font-medium flex items-center gap-2">
                              <span>{s.student_name}</span>
                              {isDeconflicted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <span>✨</span> Deconflicted
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-400">{s.roll_number}</td>
                            <td className={`px-5 py-3 font-mono text-xs ${isDeconflicted ? "text-emerald-300 font-bold" : "text-teal-300"}`}>
                              {new Date(s.slot_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </td>
                            <td className="px-5 py-3">
                              <span className={isDeconflicted ? "text-emerald-200 font-semibold" : ""}>{s.room}</span>
                            </td>
                            <td className="px-5 py-3 text-slate-300 text-xs">{s.panel}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs ${s.confirmed ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                                {s.confirmed ? "Confirmed" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Communications & Forms Tab */}
        {tab === "communications" && (
          <div className="space-y-6">
            {/* Real Application Form & Google Form Integration Card */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center text-xl">
                    📋
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Real Candidate Application Form</h3>
                    <p className="text-xs text-slate-400">
                      Live URL: <span className="text-purple-300 font-mono">http://localhost:3000/apply/{drive.id}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/apply/${drive.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <span>🌐</span> Open Live Form (New Tab)
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/apply/${drive.id}`;
                      navigator.clipboard.writeText(url);
                      alert(`✓ Real Form Link copied to clipboard:\n${url}`);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-800/40 p-4 rounded-lg border border-white/5 space-y-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Captured Candidate Fields (9 Questions)</span>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    <li>1. Full Candidate Name &amp; Father&apos;s Name</li>
                    <li>2. University Roll Number (<span className="text-teal-300 font-mono">231501xxx</span> in alphabetical order)</li>
                    <li>3. Date of Birth &amp; Official/Personal Email</li>
                    <li>4. 10th %, 12th % &amp; Verified Degree CGPA</li>
                    <li>5. Preferred Work Location &amp; Technical Skills Summary</li>
                    <li>6. Resume Google Drive Link &amp; Academic Undertaking</li>
                  </ul>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-lg border border-white/5 space-y-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Google Apps Script Webhook Integration</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    If you prefer using an external Google Form, Placify provides an automatic webhook listener at:
                  </p>
                  <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-teal-300 border border-teal-500/20 break-all select-all">
                    POST http://localhost:8000/api/applications/google-form-webhook
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    Responses submitted to your external Google Form are instantly ingested into Placify&apos;s multi-agent shortlist and scheduling engine.
                  </p>
                </div>
              </div>
            </div>



            {/* Email Broadcast Dispatch Log */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500/20 text-teal-400 rounded-lg flex items-center justify-center text-xl">
                    ✉️
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Communication Agent — Dispatched Broadcasts</h3>
                    <p className="text-xs text-slate-400">Automated email batches delivered to verified student mailboxes</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full font-medium">
                  Sender: placement@college.edu
                </span>
              </div>

              <div className="space-y-3">
                {/* Email 1: Invitation */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-300 text-sm">
                      1. Invitation to Apply: {drive.company?.name || drive.company} Placement Drive 2026
                    </span>
                    <span className="text-slate-500">Dispatched to {drive.total_eligible} Students</span>
                  </div>
                  <p className="text-slate-400 font-mono">
                    Subject: [{drive.company?.name || drive.company}] Campus Recruitment 2026 — You are Eligible!
                  </p>
                  <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-white/5">
                    "Dear Student, You satisfy all eligibility criteria (CGPA ≥ {drive.min_cgpa || 7.0}, 0 backlogs) for {drive.company?.name || drive.company}.
                    Please complete your registration via the enclosed Google Application Form before the deadline."
                  </p>
                </div>

                {/* Email 2: Interview Call Letters */}
                {drive.total_shortlisted > 0 && (
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-400 text-sm">
                        2. Interview Call Letters & Slot Allocation
                      </span>
                      <span className="text-slate-500">Dispatched to {drive.total_shortlisted} Shortlisted Candidates</span>
                    </div>
                    <p className="text-slate-400 font-mono">
                      Subject: Interview Call Letter — {drive.company?.name || drive.company} Placement Drive
                    </p>
                    <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-white/5">
                      "Congratulations! Based on your composite assessment evaluation, you have been shortlisted.
                      Your interview has been scheduled with room venue, panel assignments, and timing instructions."
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── OFFICIAL JOB DESCRIPTION (JD) PDF MODAL ───────────────────────── */}
      <JobDescriptionModal
        drive={drive}
        isOpen={showJdModal}
        onClose={() => setShowJdModal(false)}
        isStudent={false}
      />
    </div>
  );
}
