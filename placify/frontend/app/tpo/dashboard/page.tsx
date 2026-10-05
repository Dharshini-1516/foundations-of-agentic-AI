"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Drive } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  created: "bg-slate-500/20 text-slate-300",
  eligibility: "bg-blue-500/20 text-blue-300",
  applications_open: "bg-teal-500/20 text-teal-300",
  assessment: "bg-amber-500/20 text-amber-300",
  shortlisting: "bg-purple-500/20 text-purple-300",
  scheduling: "bg-indigo-500/20 text-indigo-300",
  awaiting_tpo_approval: "bg-yellow-500/20 text-yellow-300",
  scheduled: "bg-green-500/20 text-green-300",
  completed: "bg-green-600/20 text-green-300",
};

const STATUS_LABELS: Record<string, string> = {
  created: "Created", eligibility: "Finding Eligible Students",
  applications_open: "Applications Open", assessment: "Assessment",
  shortlisting: "Shortlisting", scheduling: "Scheduling",
  awaiting_tpo_approval: "Awaiting Approval", scheduled: "Scheduled",
  completed: "Completed",
};

export default function TPODashboard() {
  const router = useRouter();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("TPO");

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("placify_user") || "{}");
    if (!u?.role || u.role !== "tpo") { router.push("/login"); return; }
    setUserName(u.name || "TPO");
    loadDrives();
  }, []);

  const [errorMsg, setErrorMsg] = useState("");

  const loadDrives = async () => {
    try {
      const data = await api.drives.list();
      setDrives(data);
      setErrorMsg("");
    } catch (err: any) {
      console.error("Failed to load drives:", err);
      setErrorMsg(err.message || "Failed to load drives. Ensure backend is running at http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: drives.length,
    active: drives.filter(d => !["completed", "created"].includes(d.status)).length,
    completed: drives.filter(d => d.status === "completed").length,
    totalEligible: drives.reduce((s, d) => s + (d.total_eligible || 0), 0),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">P</span>
            </div>
            <span className="font-bold text-lg">Placify</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm">TPO Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{userName}</span>
            <button onClick={() => { api.auth.logout(); router.push("/login"); }}
              className="text-slate-500 hover:text-white text-sm transition-colors">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Placement Drives</h1>
            <p className="text-slate-400 text-sm mt-1">Manage and monitor all placement activities</p>
          </div>
          <Link href="/tpo/drives/new"
            className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Drive
          </Link>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={loadDrives}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Drives", value: stats.total, color: "text-white" },
            { label: "Active", value: stats.active, color: "text-teal-400" },
            { label: "Completed", value: stats.completed, color: "text-green-400" },
            { label: "Total Eligible", value: stats.totalEligible.toLocaleString(), color: "text-blue-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-white/5 rounded-xl p-5">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Drives Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : drives.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">No drives yet</p>
            <p className="text-slate-600 text-sm mt-1">Create your first placement drive to get started</p>
            <Link href="/tpo/drives/new" className="mt-4 inline-block bg-teal-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
              Create Drive
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {drives.map(drive => (
              <Link key={drive.id} href={`/tpo/drives/${drive.id}`}>
                <div className="bg-slate-900 border border-white/5 hover:border-teal-500/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-teal-500/5 cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">{(drive.company as any)?.name || drive.company}</p>
                      <h3 className="font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
                        {drive.title}
                      </h3>
                    </div>
                    <span className={`ml-3 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[drive.status] || "bg-slate-500/20 text-slate-300"}`}>
                      {STATUS_LABELS[drive.status] || drive.status}
                    </span>
                  </div>

                  <div className="flex gap-3 text-xs text-slate-500 mb-4">
                    {drive.package_lpa && <span>₹{drive.package_lpa} LPA</span>}
                    {drive.location && <span>📍 {drive.location}</span>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-400">{drive.total_eligible}</p>
                      <p className="text-xs text-slate-600">Eligible</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-teal-400">{drive.total_applied}</p>
                      <p className="text-xs text-slate-600">Applied</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-400">{drive.total_shortlisted}</p>
                      <p className="text-xs text-slate-600">Shortlisted</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
