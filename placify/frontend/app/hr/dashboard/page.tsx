"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function HRDashboard() {
  const router = useRouter();
  const [drives, setDrives] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("placify_user") || "{}");
    if (!u?.role || u.role !== "hr") { router.push("/login"); return; }
    api.drives.list().then(d => {
      const active = d.filter((x: any) => ["shortlisting", "scheduling", "awaiting_tpo_approval", "scheduled", "completed"].includes(x.status));
      setDrives(active);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selectDrive = async (id: number) => {
    setSelected(id);
    const [sl, sc] = await Promise.all([
      api.drives.getShortlist(id).catch(() => []),
      api.drives.getSchedule(id).catch(() => []),
    ]);
    setShortlist(sl); setSchedule(sc);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center"><span className="text-sm font-bold">P</span></div>
            <span className="font-bold text-lg">Placify</span>
            <span className="text-slate-600">|</span><span className="text-slate-400 text-sm">HR Portal</span>
          </div>
          <button onClick={() => { api.auth.logout(); router.push("/login"); }} className="text-slate-500 hover:text-white text-sm">Logout</button>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        {/* Drive list */}
        <div className="w-64 shrink-0">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Active Drives</h2>
          {loading ? <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /> :
            drives.length === 0 ? <p className="text-slate-600 text-sm">No shortlists ready yet</p> :
            drives.map(d => (
              <button key={d.id} onClick={() => selectDrive(d.id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 text-sm transition-colors ${selected === d.id ? "bg-purple-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-slate-300"}`}>
                <p className="font-medium truncate">{d.title}</p>
                <p className="text-xs mt-0.5 opacity-70">{d.company?.name || d.company}</p>
              </button>
            ))
          }
        </div>

        {/* Content */}
        <div className="flex-1">
          {!selected ? (
            <div className="flex items-center justify-center h-80 text-slate-500">
              <div className="text-center"><div className="text-4xl mb-3">👈</div><p>Select a drive to view shortlist and schedule</p></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="font-medium">Shortlisted Candidates</span>
                  <span className="text-purple-400 text-sm">{shortlist.length}</span>
                </div>
                {shortlist.length === 0 ? <p className="p-6 text-slate-500 text-sm">No shortlist yet</p> : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr><th className="px-5 py-3 text-left">Rank</th><th className="px-5 py-3 text-left">Name</th><th className="px-5 py-3 text-left">Roll</th><th className="px-5 py-3 text-left">Branch</th><th className="px-5 py-3 text-right">CGPA</th><th className="px-5 py-3 text-right">Score</th></tr>
                    </thead>
                    <tbody>
                      {shortlist.map(s => (
                        <tr key={s.student_id} className="border-t border-white/5">
                          <td className="px-5 py-3 text-purple-400 font-bold">#{s.rank}</td>
                          <td className="px-5 py-3 font-medium">{s.name}</td>
                          <td className="px-5 py-3 text-slate-400">{s.roll_number}</td>
                          <td className="px-5 py-3"><span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">{s.branch}</span></td>
                          <td className="px-5 py-3 text-right">{s.cgpa?.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right text-purple-400">{s.assessment_score?.toFixed(1) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="font-medium">Interview Schedule</span>
                  <span className="text-purple-400 text-sm">{schedule.length} slots</span>
                </div>
                {schedule.length === 0 ? <p className="p-6 text-slate-500 text-sm">No schedule yet</p> : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr><th className="px-5 py-3 text-left">Student</th><th className="px-5 py-3 text-left">Date & Time</th><th className="px-5 py-3 text-left">Room</th><th className="px-5 py-3 text-left">Panel</th></tr>
                    </thead>
                    <tbody>
                      {schedule.map(s => (
                        <tr key={s.id} className="border-t border-white/5">
                          <td className="px-5 py-3 font-medium">{s.student_name}</td>
                          <td className="px-5 py-3 text-teal-300">{new Date(s.slot_time).toLocaleString("en-IN", {dateStyle:"medium", timeStyle:"short"})}</td>
                          <td className="px-5 py-3">{s.room}</td>
                          <td className="px-5 py-3 text-slate-300">{s.panel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
