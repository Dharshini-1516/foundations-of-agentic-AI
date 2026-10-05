"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function RealApplicationFormPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const driveId = parseInt(params.id || "1");

  const [drive, setDrive] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    officialEmail: "",
    personalEmail: "",
    dob: "2004-05-15",
    fatherName: "",
    tenthMark: "92.4",
    twelfthMark: "89.6",
    cgpa: "8.50",
    resumeFileName: "Candidate_Official_Resume.pdf",
    resumeLink: "https://drive.google.com/file/d/candidate_resume.pdf",
    location: "Bangalore",
    skills: "Python, SQL, DSA, System Design",
    undertaking: false,
  });

  useEffect(() => {
    loadData();
  }, [driveId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Drive Details
      const d = await api.drives.get(driveId).catch(() => null);
      if (d) setDrive(d);

      // 2. Try fetching logged in student
      const p = await api.students.me().catch(() => null);
      if (p) {
        setProfile(p);
        setFormData((prev) => ({
          ...prev,
          name: p.name || prev.name,
          rollNumber: p.roll_number || prev.rollNumber,
          officialEmail: p.email || prev.officialEmail,
          personalEmail: p.personal_email || (p.email ? p.email.replace("@edu.in", "@gmail.com") : prev.personalEmail),
          dob: p.dob || prev.dob,
          fatherName: p.father_name || prev.fatherName,
          tenthMark: p.tenth ? String(p.tenth) : prev.tenthMark,
          twelfthMark: p.twelfth ? String(p.twelfth) : prev.twelfthMark,
          cgpa: p.cgpa ? String(p.cgpa.toFixed(2)) : prev.cgpa,
          resumeFileName: `${p.roll_number || "Candidate"}_Resume.pdf`,
          skills: p.skills?.join(", ") || prev.skills,
        }));
      } else {
        // Query param prefill (e.g. from real email link ?roll=231501001)
        const paramRoll = searchParams.get("roll");
        const paramEmail = searchParams.get("email");
        if (paramRoll) {
          setFormData((prev) => ({
            ...prev,
            rollNumber: paramRoll,
            officialEmail: `${paramRoll}@edu.in`,
          }));
        }
        if (paramEmail) {
          setFormData((prev) => ({
            ...prev,
            personalEmail: paramEmail,
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.undertaking) {
      alert("Please check the academic undertaking declaration to confirm details.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const now = new Date();
      await api.applications.apply(driveId, {
        name: formData.name,
        roll_number: formData.rollNumber,
        official_email: formData.officialEmail,
        personal_email: formData.personalEmail,
        dob: formData.dob,
        father_name: formData.fatherName,
        tenth: parseFloat(formData.tenthMark) || 85.0,
        twelfth: parseFloat(formData.twelfthMark) || 85.0,
        cgpa: parseFloat(formData.cgpa) || 8.0,
        resume_file: formData.resumeFileName,
        resume_url: formData.resumeLink,
        preferred_location: formData.location,
        skills_summary: formData.skills,
        submitted_at: now.toISOString(),
      });

      setSubmissionTime(now.toLocaleString());
      setReceiptId(`REG-${driveId}-${formData.rollNumber || "2026"}-${now.getTime().toString().slice(-6)}`);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit application. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  const companyName = drive?.company?.name || drive?.company || "Campus Recruiter";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Brand & Back Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center text-slate-950 font-bold text-xs">P</div>
            <span className="font-bold text-white tracking-wide">Placify Forms</span>
            <span className="text-slate-600">|</span>
            <span>Official Candidate Portal</span>
          </div>
          <button
            onClick={() => router.push("/student/dashboard")}
            className="text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            ← Back to Student Dashboard
          </button>
        </div>

        {/* Google Form Style Hero Header */}
        <div className="rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 p-6 sm:p-8 text-white relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-200 mb-2">
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-mono">
                📋 Google Form · Real Application Submission
              </span>
              <span className="bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-400/30">
                Batch of 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {drive?.title || `Campus Placement Drive #${driveId}`}
            </h1>
            <p className="text-sm text-purple-100 font-medium mt-1">
              Hiring Organization: <strong className="text-white">{companyName}</strong>
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
              {drive?.package_lpa && (
                <span className="bg-black/25 backdrop-blur-sm px-3 py-1 rounded-md border border-white/10 font-bold text-teal-300">
                  💰 CTC: ₹{drive.package_lpa} LPA
                </span>
              )}
              {drive?.location && (
                <span className="bg-black/25 backdrop-blur-sm px-3 py-1 rounded-md border border-white/10">
                  📍 {drive.location}
                </span>
              )}
              <span className="bg-black/25 backdrop-blur-sm px-3 py-1 rounded-md border border-white/10 text-amber-300 font-semibold">
                🎯 Company Shortlist Quota: Top {drive?.shortlist_quota || 25} Candidates
              </span>
            </div>
          </div>

          <div className="bg-slate-900 px-6 sm:px-8 py-3.5 border-t border-white/10 text-xs text-slate-300 flex items-center justify-between">
            <span>Corporate Relations &amp; Placement Cell</span>
            <span className="text-teal-400 font-medium">Verified Academic Candidate Pool</span>
          </div>
        </div>

        {/* If Form is Submitted -> Real Confirmation Screen */}
        {submitted ? (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 sm:p-10 text-center space-y-6 shadow-2xl animate-in fade-in">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-emerald-500/20">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Your response has been recorded.</h2>
              <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                Your official candidate application for <strong className="text-teal-300">{companyName}</strong> has been received and synchronized directly with the autonomous multi-agent pipeline.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 text-left text-xs space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400 font-mono">Receipt Reference:</span>
                <span className="font-bold text-teal-400 font-mono">{receiptId}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block">Candidate Name:</span>
                  <span className="text-white font-semibold">{formData.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Roll Number:</span>
                  <span className="text-white font-mono font-semibold">{formData.rollNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Academic CGPA:</span>
                  <span className="text-teal-300 font-bold">{formData.cgpa} / 10.0</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location Preference:</span>
                  <span className="text-white font-medium">{formData.location}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Submission Timestamp:</span>
                  <span className="text-slate-300 font-mono">{submissionTime}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/student/dashboard")}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-teal-600/30 cursor-pointer transition-all"
              >
                Go to Student Portal Dashboard
              </button>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-white/10 cursor-pointer transition-colors"
              >
                ✏️ Edit or Submit Another Response
              </button>
            </div>
          </div>
        ) : (
          /* Real Form Input Cards */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {errorMsg && (
              <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 leading-relaxed">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Question 1: Full Name */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50 transition-colors">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                1. Full Candidate Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your official full name as per university records"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Question 2: Roll Number */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                  2. University Roll Number <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-teal-400 font-mono">Format: 231501xxx</span>
              </div>
              <input
                type="text"
                required
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g. 231501001"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Question 3: Father's Name */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50 transition-colors">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                3. Father&apos;s / Guardian&apos;s Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="e.g. R. Subramanian"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Question 4: Date of Birth */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50 transition-colors">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                4. Date of Birth (DOB) <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Question 5 & 6: Emails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                  5. College Official Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.officialEmail}
                  onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  placeholder="231501xxx@edu.in"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                  6. Personal Contact Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.personalEmail}
                  onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Question 7, 8, 9: Academic Marks & CGPA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                  7. 10th Marks (%) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.tenthMark}
                  onChange={(e) => setFormData({ ...formData, tenthMark: e.target.value })}
                  placeholder="92.4"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                  8. 12th Marks (%) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.twelfthMark}
                  onChange={(e) => setFormData({ ...formData, twelfthMark: e.target.value })}
                  placeholder="89.6"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                  9. Degree CGPA <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max="10"
                  required
                  value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  placeholder="8.50"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-bold text-teal-400 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Question 10: Location Preference */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                10. Preferred Work Location <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="Bangalore">Bangalore</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Pune">Pune</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Delhi NCR">Delhi NCR</option>
              </select>
            </div>

            {/* Question 11: Skills Summary */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                11. Technical Skills Summary <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="e.g. Python, SQL, DSA, System Design, REST APIs"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Question 12: Resume Drive Link */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-2 focus-within:border-purple-500/50">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
                12. Resume File &amp; Google Drive Link
              </label>
              <input
                type="url"
                value={formData.resumeLink}
                onChange={(e) => setFormData({ ...formData, resumeLink: e.target.value })}
                placeholder="https://drive.google.com/file/d/your_resume.pdf"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-teal-400 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-[11px] text-slate-500">
                Please make sure the link access permissions are set to &apos;Anyone with link can view&apos;.
              </p>
            </div>

            {/* Undertaking Declaration */}
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3">
              <input
                type="checkbox"
                id="undertaking"
                required
                checked={formData.undertaking}
                onChange={(e) => setFormData({ ...formData, undertaking: e.target.checked })}
                className="mt-0.5 accent-purple-600 rounded cursor-pointer w-4 h-4"
              />
              <label htmlFor="undertaking" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                I hereby declare that all information submitted in this application form (Academic Marks, DOB, CGPA, Backlogs, and Identity details) is authentic and complies with institutional placement code of conduct.
              </label>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push("/student/dashboard")}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95 flex items-center gap-2"
              >
                <span>{submitting ? "⏳" : "📤"}</span>
                <span>{submitting ? "Recording Response..." : "Submit Candidate Application"}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
