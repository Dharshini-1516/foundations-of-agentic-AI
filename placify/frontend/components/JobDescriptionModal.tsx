"use client";
import React from "react";

interface JobDescriptionModalProps {
  drive: any;
  isOpen: boolean;
  onClose: () => void;
  isStudent?: boolean;
  applicationStatus?: string | null;
  onApply?: () => void;
  onOptOut?: () => void;
  onViewResponse?: () => void;
}

export default function JobDescriptionModal({
  drive,
  isOpen,
  onClose,
  isStudent = false,
  applicationStatus,
  onApply,
  onOptOut,
  onViewResponse,
}: JobDescriptionModalProps) {
  if (!isOpen || !drive) return null;

  const companyName = drive.company?.name || drive.company || "Campus Recruiter";
  const quota = drive.shortlist_quota || 25;
  const isOptedOut = applicationStatus === "opted_out";
  const isApplied = applicationStatus && applicationStatus !== "opted_out" && applicationStatus !== "pending";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Outer Modal Container */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Official Recruitment Document
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-white/10">
                  PDF / JD Ref: PLACIFY-2026-D{drive.id}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Job Description &amp; Candidate Specifications
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Print or Save as PDF"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              title="Close JD"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable PDF Document View */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-900/90 space-y-6 text-slate-200 print:bg-white print:text-black">
          
          {/* Printable Document Paper Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 print:border-none print:p-0">
            
            {/* Document Header & Company Branding */}
            <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold tracking-widest text-teal-400 uppercase">
                    Campus Placement &amp; Corporate Relations Cell
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {companyName}
                </h1>
                <p className="text-base font-semibold text-teal-300 mt-1">
                  {drive.title || "Campus Recruitment Drive"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Role: <span className="text-white font-medium">{drive.role || "Software Development Engineer"}</span>
                </p>
              </div>

              {/* Recruitment Stamp */}
              <div className="sm:text-right shrink-0 bg-slate-900/80 border border-teal-500/30 p-3 rounded-lg">
                <span className="text-[11px] font-bold text-teal-400 block tracking-wider uppercase">
                  Batch of 2026
                </span>
                <span className="text-xs text-slate-300 block mt-0.5">
                  Academic Year 2025–2026
                </span>
                <span className="inline-block mt-1 text-[11px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded font-mono font-medium">
                  Verified JD Spec
                </span>
              </div>
            </div>

            {/* Key Offer Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-white/5">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Compensation (CTC)</p>
                <p className="text-xl font-bold text-teal-400 mt-1">
                  {drive.package_lpa ? `₹${drive.package_lpa} LPA` : "As per Industry Standard"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Annual Gross Fixed + Performance</p>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-white/5">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Job Location</p>
                <p className="text-base font-bold text-white mt-1 truncate">
                  {drive.location || "Bangalore / Hyderabad"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Hybrid / On-site</p>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
                <p className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Company Shortlist Target</p>
                <p className="text-xl font-bold text-emerald-300 mt-1">
                  Top {quota} Candidates
                </p>
                <p className="text-[10px] text-emerald-400/80 mt-0.5">Decided by Recruiter Policy</p>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-white/5">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Cutoff Criteria</p>
                <p className="text-base font-bold text-purple-300 mt-1">
                  CGPA ≥ {drive.min_cgpa || "7.0"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">0 Active Backlogs</p>
              </div>
            </div>

            {/* Academic Eligibility & Restrictions */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <span>🎓</span> Academic Eligibility Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Eligible Engineering Branches:</span>
                  <span className="text-white font-medium">
                    {drive.allowed_branches && drive.allowed_branches.length > 0
                      ? drive.allowed_branches.join(", ")
                      : "CSE, IT, ECE, AI&DS"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Academic Standing:</span>
                  <span className="text-white font-medium">
                    Min CGPA {drive.min_cgpa || "7.0"} · 0 Standing Backlogs
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">School Performance (10th/12th):</span>
                  <span className="text-white font-medium">
                    70.0% or 7.0 CGPA throughout academics
                  </span>
                </div>
              </div>
            </div>

            {/* Company's Raw Job Description / Text */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <span>📋</span> Full Job Description &amp; Position Overview
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 text-xs sm:text-sm leading-relaxed text-slate-300 space-y-3 whitespace-pre-line font-sans">
                {drive.jd_text ? (
                  drive.jd_text
                ) : (
                  <>
                    <p>
                      <strong>About the Role:</strong> As a {drive.role || "Software Development Engineer"} at {companyName},
                      you will work on building, scaling, and maintaining mission-critical software systems. You will collaborate
                      with cross-functional product, architecture, and engineering teams to design resilient solutions.
                    </p>
                    <p>
                      <strong>Key Responsibilities:</strong>
                      <br />• Architect, implement, and maintain high-performance scalable microservices and APIs.
                      <br />• Write clean, robust, and well-tested code following modern software engineering best practices.
                      <br />• Participate in code reviews, design discussions, and automated deployment pipelines.
                      <br />• Optimize application bottlenecks, database queries, and system latencies.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Technical Skills & Competencies */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <span>🛠️</span> Required Technical Competencies
              </h3>
              <div className="flex flex-wrap gap-2">
                {drive.required_skills && drive.required_skills.length > 0 ? (
                  drive.required_skills.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-slate-800 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-md text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <>
                    {["Python", "Data Structures & Algorithms", "SQL", "System Design", "Cloud / AWS", "Problem Solving"].map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-800 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-md text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Multi-Stage Selection Pipeline Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>⚡</span> Selection Process &amp; Evaluation Pipeline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-white mb-1">1. Academic Screen</div>
                  <p className="text-slate-400 text-[11px]">Autonomous eligibility filtering by CGPA, branch, and backlogs.</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-white mb-1">2. Online Assessment</div>
                  <p className="text-slate-400 text-[11px]">Aptitude, coding, and core CS fundamentals evaluation.</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
                  <div className="font-bold text-emerald-300 mb-1">3. Shortlist ({quota} Cap)</div>
                  <p className="text-emerald-400/90 text-[11px]">Ranked shortlisting strictly capped at company-dictated quota.</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-white mb-1">4. Interview Panels</div>
                  <p className="text-slate-400 text-[11px]">Autonomous clash-free multi-agent interview schedule.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Student Decision Guidance Notice */}
          {isStudent && (
            <div className="p-4 rounded-xl border bg-slate-950/90 text-xs space-y-2 border-white/10">
              <div className="flex items-center gap-2 font-semibold text-white">
                <span>💡</span>
                <span>Candidate Decision &amp; Opt-Out Policy:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Carefully review the job location ({drive.location || "Bangalore / Hyderabad"}), package, and bond/roles.
                If you are <strong className="text-white">interested</strong>, submit the official application form below.
                If you are <strong className="text-rose-400">not interested</strong> or have conflicting commitments, you may opt out now.
                Opting out ensures you are not penalized and opens opportunities for fellow students.
              </p>
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {isOptedOut ? (
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full font-semibold flex items-center gap-1.5">
                <span>🚫</span> Currently Opted Out of this Drive
              </span>
            ) : isApplied ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold flex items-center gap-1.5">
                <span>✓</span> Application Already Submitted
              </span>
            ) : isStudent ? (
              <span className="text-slate-400">
                Action required: Choose to <span className="text-purple-300 font-medium">Apply</span> or <span className="text-rose-400 font-medium">Opt Out</span>
              </span>
            ) : (
              <span className="text-slate-400">
                TPO Preview Mode · Company Quota: <strong className="text-teal-400">{quota} Candidates</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            {isStudent ? (
              isOptedOut ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onApply?.();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    ↩️ Re-consider &amp; Apply
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : isApplied ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewResponse?.();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    👁️ View Application Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOptOut?.();
                    }}
                    className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    title="Opt out and cancel application"
                  >
                    ✕ Opt Out
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOptOut?.();
                    }}
                    className="px-4 py-2.5 bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    title="I do not want to apply for this company"
                  >
                    ✕ Not Interested / Opt Out
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onApply?.();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95 flex items-center gap-1.5"
                  >
                    <span>📝</span>
                    <span>Interested — Fill Application Form</span>
                  </button>
                </>
              )
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-medium cursor-pointer"
              >
                Close JD View
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
