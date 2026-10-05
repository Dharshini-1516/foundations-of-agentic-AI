"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function NewDrive() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [form, setForm] = useState({
    company_id: "", title: "", jd_text: "", role: "", package_lpa: "", location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.companies.list().then(setCompanies).catch(() => {});
  }, []);

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_id || !form.title || !form.jd_text) {
      setError("Company, title and JD are required"); return;
    }
    setLoading(true); setError("");
    try {
      const drive = await api.drives.create({
        company_id: parseInt(form.company_id),
        title: form.title, jd_text: form.jd_text,
        role: form.role || undefined,
        package_lpa: form.package_lpa ? parseFloat(form.package_lpa) : undefined,
        location: form.location || undefined,
      });
      router.push(`/tpo/drives/${drive.id}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const SAMPLE_JD = `TechCorp Solutions is hiring Software Development Engineers for 2025 batch.

Role: Software Development Engineer
Package: 12 LPA
Location: Bangalore

Eligibility:
- Branches: CSE, IT, ECE
- CGPA: 7.0 and above
- No active backlogs
- 10th: 70%, 12th: 70%

Required Skills: Python, Data Structures, Algorithms, SQL
Nice to have: Java, System Design, AWS

Job Description:
Design and develop scalable backend systems, participate in code reviews,
collaborate with product teams, and build high-quality software solutions.`;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/tpo/dashboard")} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center"><span className="text-sm font-bold">P</span></div>
          <span className="font-bold">Create New Drive</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-900 border border-white/5 rounded-xl p-8">
          <h1 className="text-xl font-bold mb-2">New Placement Drive</h1>
          <p className="text-slate-400 text-sm mb-6">
            Fill in the company details and paste the JD — Placify's AI will extract eligibility criteria automatically.
          </p>

          {error && <div className="mb-5 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Company *</label>
                <select value={form.company_id} onChange={set("company_id")} required
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Drive Title *</label>
                <input value={form.title} onChange={set("title")} required placeholder="e.g. SDE 2025 Batch"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                <input value={form.role} onChange={set("role")} placeholder="e.g. Software Engineer"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Package (LPA)</label>
                <input type="number" value={form.package_lpa} onChange={set("package_lpa")} placeholder="e.g. 12"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
                <input value={form.location} onChange={set("location")} placeholder="e.g. Bangalore"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">Job Description *</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, jd_text: SAMPLE_JD }))}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                  Load sample JD
                </button>
              </div>
              <textarea value={form.jd_text} onChange={set("jd_text")} required rows={12}
                placeholder="Paste the full job description here. The AI will automatically extract eligibility criteria, CGPA requirements, branches, skills, and more..."
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm resize-none" />
              <p className="text-slate-600 text-xs mt-1">
                💡 The Company Agent will parse CGPA threshold, branches, backlogs, skills from this text automatically
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : "Create Drive"}
              </button>
              <button type="button" onClick={() => router.push("/tpo/dashboard")}
                className="border border-white/10 text-slate-400 hover:text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
