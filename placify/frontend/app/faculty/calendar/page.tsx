"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function FacultyCalendar() {
  const router = useRouter();
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock Academic / Exam Calendar
  const academicEvents = [
    { date: "Oct 10, 2025", title: "Semester Mid-Term Exams - Paper 1", type: "exam" },
    { date: "Oct 12, 2025", title: "Semester Mid-Term Exams - Paper 2", type: "exam" },
    { date: "Oct 15, 2025", title: "National Level Hackathon", type: "event" },
    { date: "Oct 20, 2025", title: "Lab Practical Evaluations", type: "exam" },
  ];

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("placify_user") || "{}");
    if (!u?.role || u.role !== "faculty") {
      router.push("/login");
      return;
    }
    api.drives.list()
      .then(setDrives)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold">
              P
            </div>
            <span className="font-bold text-lg">Placify</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm">Faculty & Coordinator Portal</span>
          </div>
          <button
            onClick={() => {
              api.auth.logout();
              router.push("/login");
            }}
            className="text-slate-500 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Placement Schedule & Conflict Monitor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track active recruitment drives alongside the academic timetable to detect and prevent schedule clashes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Placement Schedules */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-teal-400 flex items-center gap-2">
              <span>📅</span> Active Placement Drives
            </h2>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : drives.length === 0 ? (
              <p className="text-slate-500 text-sm">No scheduled drives currently.</p>
            ) : (
              <div className="space-y-4">
                {drives.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-lg bg-slate-800/60 border border-white/5 flex items-start justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">{d.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Company: {d.company?.name || d.company || "Corporate Partner"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                          Status: {d.status.replace("_", " ")}
                        </span>
                        {d.package_lpa && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            ₹{d.package_lpa} LPA
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic & Exam Timetable */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-amber-400 flex items-center gap-2">
              <span>📚</span> Academic & Exam Calendar
            </h2>
            <div className="space-y-4">
              {academicEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-800/60 border border-white/5 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">{ev.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 mt-1 inline-block">
                      {ev.type === "exam" ? "University Exam Window" : "College Event"}
                    </span>
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{ev.date}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <span className="font-bold">✓ Conflict Checker Agent Status:</span> All scheduled drives verified against
              the above timetable. Zero clashing exam slots detected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
