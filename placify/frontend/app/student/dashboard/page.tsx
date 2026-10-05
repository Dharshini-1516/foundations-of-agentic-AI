"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import JobDescriptionModal from "@/components/JobDescriptionModal";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-300",
  submitted: "bg-blue-500/20 text-blue-300",
  under_review: "bg-amber-500/20 text-amber-300",
  shortlisted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  interview_scheduled: "bg-teal-500/20 text-teal-400",
  opted_out: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
};
const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  submitted: "📤",
  under_review: "🔍",
  shortlisted: "⭐",
  rejected: "✗",
  interview_scheduled: "📅",
  opted_out: "🚫",
};

const DRIVE_STATUS_LABELS: Record<string, string> = {
  created: "Draft / Ready",
  applications_open: "Applications Open",
  assessment: "Online Assessment",
  shortlisting: "Candidate Shortlisting",
  scheduled: "Interviews Scheduled",
  completed: "Drive Completed",
};

const DRIVE_STATUS_COLORS: Record<string, string> = {
  created: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  applications_open: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  assessment: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  shortlisting: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  scheduled: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  completed: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [drives, setDrives] = useState<any[]>([]);
  const [allDrives, setAllDrives] = useState<any[]>([]);
  const [rawDrives, setRawDrives] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"available" | "myapps" | "mail">("available");

  // Modals State
  const [activeFormDrive, setActiveFormDrive] = useState<any>(null);
  const [activeJdDrive, setActiveJdDrive] = useState<any>(null);
  const [selectedMail, setSelectedMail] = useState<any>(null);

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
    resumeFileName: "Candidate_Resume.pdf",
    resumeLink: "",
    location: "Bangalore",
    skills: "Python, SQL, DSA",
    undertaking: false,
  });
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("placify_token");
    const u = JSON.parse(localStorage.getItem("placify_user") || "{}");
    if (!token || !u?.role || u.role !== "student") {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([
      api.students
        .me()
        .then((p) => {
          setProfile(p);
        })
        .catch(() => {}),
      api.students.myDrives().then(setDrives).catch(() => {}),
      api.drives
        .list()
        .then((d) => {
          const list = d || [];
          setRawDrives(list);
          setAllDrives(list); // Put ALL placement drives available in TPO
        })
        .catch(() => {}),
      api.notifications
        .list()
        .then((notifs) => {
          const list = notifs || [];
          setNotifications(list);
          setSelectedMail((prev: any) => {
            if (!prev) return list[0] || null;
            const stillThere = list.find((m: any) => m.id === prev.id);
            return stillThere || list[0] || null;
          });
        })
        .catch(() => []),
    ]).finally(() => setLoading(false));
  };



  const openGoogleForm = (drive: any) => {
    setActiveFormDrive(drive);
    setFormData({
      name: profile?.name || "",
      rollNumber: profile?.roll_number || "",
      officialEmail: profile?.email || "",
      personalEmail: profile?.personal_email || (profile?.email ? profile.email.replace("@edu.in", "@gmail.com") : "student@gmail.com"),
      dob: profile?.dob || "2004-05-15",
      fatherName: profile?.father_name || (profile?.name ? `R. ${profile.name.split(" ").slice(-1)[0]}` : "Father Name"),
      tenthMark: profile?.tenth ? String(profile.tenth) : "92.4",
      twelfthMark: profile?.twelfth ? String(profile.twelfth) : "89.6",
      cgpa: profile?.cgpa ? String(profile.cgpa.toFixed(2)) : "8.50",
      resumeFileName: `${profile?.roll_number || "student"}_Official_Resume.pdf`,
      resumeLink: `https://drive.google.com/file/d/${profile?.roll_number}_resume.pdf`,
      location: drive.location ? drive.location.split("/")[0].trim() : "Bangalore",
      skills: profile?.skills?.join(", ") || "Python, SQL, Problem Solving",
      undertaking: false,
    });
    setFormSubmitted(false);
  };

  const handleOptOut = async (driveId: number, driveTitle: string) => {
    if (!confirm(`Are you sure you do not want to participate in ${driveTitle}? You will be removed from all shortlists and interview schedules for this company.`)) {
      return;
    }
    try {
      const res = await api.applications.optOut(driveId, "Student opted out / not interested");
      alert(`✓ ${res.message}`);
      if (selectedMail?.drive_id === driveId) {
        setSelectedMail(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to opt out");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.undertaking) {
      alert("Please confirm the undertaking declaration before submitting.");
      return;
    }
    setSubmittingForm(true);
    try {
      await api.applications.apply(activeFormDrive.id, {
        name: formData.name,
        roll_number: formData.rollNumber,
        official_email: formData.officialEmail,
        personal_email: formData.personalEmail,
        dob: formData.dob,
        father_name: formData.fatherName,
        tenth: parseFloat(formData.tenthMark) || profile?.tenth,
        twelfth: parseFloat(formData.twelfthMark) || profile?.twelfth,
        cgpa: parseFloat(formData.cgpa) || profile?.cgpa,
        resume_file: formData.resumeFileName,
        resume_url: formData.resumeLink,
        preferred_location: formData.location,
        skills_summary: formData.skills,
        submitted_at: new Date().toISOString(),
      });
      setFormSubmitted(true);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to submit application");
    } finally {
      setSubmittingForm(false);
    }
  };

  const myDriveIds = new Set(drives.map((d) => d.drive_id));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold">P</div>
            <span className="font-bold text-lg">Placify</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm">Student Portal</span>
          </div>
          <button
            onClick={() => {
              api.auth.logout();
              router.push("/login");
            }}
            className="text-slate-500 hover:text-white text-sm transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Card */}
        {profile && (
          <div className="bg-gradient-to-r from-teal-900/40 to-slate-900 border border-teal-500/20 rounded-xl p-5 mb-6 flex items-center gap-5">
            <div className="w-14 h-14 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400 text-2xl font-bold">
              {profile.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg text-white">{profile.name}</h2>
              <p className="text-teal-300 text-sm font-mono">{profile.email}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Roll No: <span className="font-semibold text-slate-200">{profile.roll_number}</span> · {profile.branch} · Batch {profile.year_of_graduation || 2026}
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-400">{profile.cgpa?.toFixed(2)}</p>
                <p className="text-xs text-slate-500">CGPA</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{profile.active_backlogs}</p>
                <p className="text-xs text-slate-500">Backlogs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {drives.filter((d) => d.application_status === "shortlisted" || d.application_status === "interview_scheduled").length}
                </p>
                <p className="text-xs text-slate-500">Shortlisted</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-900 p-1.5 rounded-lg w-fit border border-white/5">
          <button
            onClick={() => setTab("available")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              tab === "available" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🔖 Placement Drives</span>
            {allDrives.length > 0 && (
              <span className="bg-teal-900/60 text-teal-300 text-xs px-2 py-0.5 rounded-full border border-teal-500/30">
                {allDrives.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("myapps")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              tab === "myapps" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📋 My Applications & Schedule</span>
            {drives.length > 0 && (
              <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                {drives.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("mail")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              tab === "mail" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📬 College Webmail / Gmail</span>
            {notifications.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-xs">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : tab === "available" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>All campus recruitment drives registered in TPO portal ({allDrives.length} Drives)</span>
              <span className="text-teal-400 font-medium">Batch of 2026</span>
            </div>

            {allDrives.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p className="text-base font-semibold text-slate-400">No recruitment drives available</p>
                <p className="text-xs text-slate-600 mt-1">Drives scheduled or created by TPO will appear here</p>
              </div>
            ) : (
              allDrives.map((d) => {
                const myApp = drives.find((x) => x.drive_id === d.id);
                const isOptedOut = myApp?.application_status === "opted_out";
                const isApplied = myApp && myApp.application_status !== "opted_out" && myApp.application_status !== "pending";

                return (
                  <div key={d.id} className={`bg-slate-900 border rounded-xl p-5 transition-all ${isOptedOut ? "border-rose-500/20 bg-slate-900/50 opacity-80" : "border-white/5 hover:border-teal-500/30"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-xs font-semibold text-teal-400 uppercase tracking-wide">
                            {(d.company as any)?.name || d.company}
                          </p>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${DRIVE_STATUS_COLORS[d.status] || "bg-slate-800 text-slate-300"}`}>
                            {DRIVE_STATUS_LABELS[d.status] || d.status}
                          </span>
                          {isOptedOut && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <span>🚫</span> Not Interested (Opted Out)
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base">{d.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Role: <span className="text-slate-200">{d.role || "Software Engineer"}</span></p>

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-300">
                          {d.package_lpa && <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-white/5">💰 ₹{d.package_lpa} LPA</span>}
                          {d.location && <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-white/5">📍 {d.location}</span>}
                          {d.min_cgpa && <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-white/5">📊 Min CGPA {d.min_cgpa}</span>}
                          <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <span>🎯</span> Company Quota: Top {d.shortlist_quota || 25}
                          </span>
                          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <span>⏰</span> Deadline: 7 Days from Announcement
                          </span>
                        </div>

                        {isOptedOut && (
                          <p className="text-xs text-rose-300/80 mt-2.5 bg-rose-950/20 p-2 rounded border border-rose-500/10">
                            ℹ️ You chose not to participate in this recruitment drive. You are completely excluded from shortlists and interview panels.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                        {/* Always visible JD PDF Button */}
                        <button
                          type="button"
                          onClick={() => setActiveJdDrive(d)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 hover:border-teal-500/60 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                          title="View Official Job Description (PDF), company specifications, and opt out"
                        >
                          <span>📄</span> View Official JD (PDF)
                        </button>

                        {/* Real Standalone Form in new tab */}
                        <a
                          href={`/apply/${d.id}?roll=${profile?.roll_number || ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Open real standalone Google Form application page in new browser tab"
                        >
                          <span>🌐</span> Real Form
                        </a>

                        {isOptedOut ? (
                          <button
                            onClick={() => openGoogleForm(d)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <span>↩️</span> Re-consider / Apply
                          </button>
                        ) : isApplied ? (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                              <span>✓</span> Applied
                            </span>
                            <button
                              onClick={() => {
                                openGoogleForm(d);
                                setFormSubmitted(true);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                            >
                              View Response
                            </button>
                            <button
                              onClick={() => handleOptOut(d.id, d.title)}
                              className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                              title="Opt out of this drive"
                            >
                              Opt Out
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openGoogleForm(d)}
                              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-purple-600/30 flex items-center gap-1.5 active:scale-95"
                            >
                              <span>📝</span> Fill Application Form
                            </button>
                            <button
                              onClick={() => handleOptOut(d.id, d.title)}
                              className="px-3 py-2.5 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              title="I am not interested in this company"
                            >
                              ✕ Not Interested
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : tab === "myapps" ? (
          <div className="space-y-4">
            {drives.length === 0 ? (
              <div className="text-center py-20 text-slate-500">No applications submitted yet</div>
            ) : (
              drives.map((d) => (
                <div key={d.drive_id} className="bg-slate-900 border border-white/5 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{d.company}</p>
                      <h3 className="font-semibold text-white">{d.title}</h3>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        {d.package_lpa && <span>💰 ₹{d.package_lpa} LPA</span>}
                        {d.rank && <span className="text-amber-400 font-semibold">🏆 Rank #{d.rank}</span>}
                        {d.assessment_score && <span>📊 Score {d.assessment_score.toFixed(1)}/100</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[d.application_status] || "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {STATUS_ICONS[d.application_status]} {d.application_status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Interview Slot Card */}
                  {d.interview_slot && (
                    <div className="mt-4 p-4 rounded-lg bg-teal-950/40 border border-teal-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-teal-300 font-semibold text-sm">
                          <span>📅</span> Interview Scheduled
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            d.interview_slot.confirmed ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {d.interview_slot.confirmed ? "Confirmed by TPO" : "Pending Confirmation"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500">Date & Time: </span>
                          <span className="font-semibold text-white">
                            {d.interview_slot.slot_time
                              ? new Date(d.interview_slot.slot_time).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "TBD"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Room: </span>
                          <span className="font-semibold text-white">{d.interview_slot.room || "TBD"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Panel: </span>
                          <span className="font-semibold text-white">{d.interview_slot.panel || "General Technical"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions & Official JD Button */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const full = allDrives.find((x) => x.id === d.drive_id) || rawDrives.find((x) => x.id === d.drive_id) || d;
                        setActiveJdDrive(full);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <span>📄</span> View Official JD (PDF)
                    </button>
                    {d.application_status !== "opted_out" && (
                      <button
                        type="button"
                        onClick={() => handleOptOut(d.drive_id, d.title)}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                        title="Opt out of this drive"
                      >
                        ✕ Opt Out
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Webmail / Gmail View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email List */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-4 overflow-y-auto max-h-[500px]">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center justify-between">
                <span>Inbox</span>
                <span className="text-teal-400">{notifications.length} Messages</span>
              </h3>
              {notifications.length === 0 ? (
                <p className="text-slate-500 text-xs py-8 text-center">No emails received yet</p>
              ) : (
                notifications.map((n) => {
                  const isCallLetter =
                    n.title?.toLowerCase().includes("call letter") ||
                    n.title?.toLowerCase().includes("shortlisted") ||
                    n.title?.toLowerCase().includes("interview scheduled");
                  const isReminder =
                    n.title?.toLowerCase().includes("reminder") ||
                    n.title?.toLowerCase().includes("deadline");

                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedMail(n)}
                      className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors border ${
                        selectedMail?.id === n.id
                          ? "bg-slate-800 border-teal-500/50"
                          : "bg-slate-900/60 border-white/5 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-teal-300 truncate">Training &amp; Placement Cell</span>
                        <span className="text-[10px] text-slate-500">
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                        </span>
                      </div>
                      <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                        {isCallLetter ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                            <span>⭐</span> TOP SHORTLISTED
                          </span>
                        ) : isReminder ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <span>⏰</span> DEADLINE REMINDER
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                            <span>📋</span> ELIGIBLE · GOOGLE FORM
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-white truncate">{n.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{n.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Email Viewer */}
            <div className="md:col-span-2 bg-slate-900 border border-white/5 rounded-xl p-6">
              {selectedMail ? (
                <div>
                  <div className="border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white">{selectedMail.title}</h2>
                      {selectedMail.title?.toLowerCase().includes("call letter") ||
                      selectedMail.title?.toLowerCase().includes("shortlisted") ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ⭐ Top Shortlisted Student
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          📋 Eligible Candidate
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                      <div>
                        <p>
                          <span className="text-slate-500">From: </span>
                          <span className="text-slate-300 font-medium">Placement &amp; Training Cell &lt;placement@college.edu&gt;</span>
                        </p>
                        <p className="mt-0.5">
                          <span className="text-slate-500">To: </span>
                          <span className="text-slate-300 font-medium">{profile?.name} &lt;{profile?.email}&gt;</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-500 text-xs">
                          {selectedMail.created_at ? new Date(selectedMail.created_at).toLocaleString() : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-200 leading-relaxed space-y-4 bg-slate-950/40 p-5 rounded-xl border border-white/5">
                    <p>Dear {profile?.name},</p>
                    <div className="whitespace-pre-line text-xs sm:text-sm text-slate-300">
                      {selectedMail.message}
                    </div>

                    {/* Interactive Google Form Action Card */}
                    {(() => {
                      const mailDrive =
                        rawDrives.find((d: any) => d.id === selectedMail.drive_id) ||
                        allDrives[0] ||
                        rawDrives[0] || {
                          id: selectedMail.drive_id || 1,
                          title: selectedMail.title?.replace(/^Invitation:\s*/i, "") || "Campus Placement Drive",
                          company: { name: "Campus Recruiter" },
                          role: "Software Engineer",
                          location: "Bangalore",
                        };
                      const isMailDriveApplied = drives.some(
                        (d: any) => d.drive_id === mailDrive.id
                      );
                      const matchingApp = drives.find((d: any) => d.drive_id === mailDrive.id);
                      const isCallLetter =
                        selectedMail.title?.toLowerCase().includes("call letter") ||
                        selectedMail.title?.toLowerCase().includes("shortlisted") ||
                        selectedMail.title?.toLowerCase().includes("interview scheduled");

                      if (isCallLetter) {
                        return (
                          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-3 mt-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs uppercase tracking-wide">
                                <span>🎓</span> Official Shortlist &amp; Interview Call Letter
                              </div>
                              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                                Top Candidate Shortlisted
                              </span>
                            </div>

                            {/* Distinction Notice: Top Candidate vs General Eligible */}
                            <div className="bg-emerald-900/40 border border-emerald-500/30 p-3 rounded-lg text-xs">
                              <div className="flex items-center gap-2 font-bold text-emerald-200">
                                <span>🏆</span>
                                <span>DISTINCTION NOTICE: Top Ranked Student (Not Just Eligible)</span>
                              </div>
                              <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                                Initial <strong>Eligibility</strong> only qualifies candidates to fill the application form. As a <strong>Shortlisted</strong> candidate, you achieved top composite marks in the assessment and have been selected as a top-tier candidate for direct interviews.
                              </p>
                            </div>

                            <p className="text-xs text-slate-300">
                              Congratulations! You have qualified among the top students for {mailDrive.title}. Your interview schedule, room allocation, and panel details are officially confirmed.
                            </p>
                            {matchingApp?.interview_slot && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-lg border border-white/5 text-xs text-slate-300">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">SCHEDULED TIME</span>
                                  <span className="font-semibold text-white">
                                    {matchingApp.interview_slot.slot_time
                                      ? new Date(matchingApp.interview_slot.slot_time).toLocaleString("en-IN", {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })
                                      : "TBD"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">VENUE / ROOM</span>
                                  <span className="font-semibold text-white">{matchingApp.interview_slot.room || "Seminar Hall A"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">INTERVIEW PANEL</span>
                                  <span className="font-semibold text-teal-400">{matchingApp.interview_slot.panel || "Technical"}</span>
                                </div>
                              </div>
                            )}
                            <div className="pt-1 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setTab("myapps")}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
                              >
                                <span>📅</span> View Confirmed Interview Pass &amp; Schedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveJdDrive(mailDrive)}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <span>📄</span> View Official JD (PDF)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormSubmitted(true);
                                  setActiveFormDrive(mailDrive);
                                }}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <span>📝</span> View Submitted Google Form Details
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="p-4 bg-purple-950/40 border border-purple-500/30 rounded-xl space-y-3 mt-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs uppercase tracking-wide">
                              <span>📋</span> Google Form Candidate Registration
                            </div>
                            {isMailDriveApplied ? (
                              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                <span>✓</span> Response Recorded
                              </span>
                            ) : (
                              <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                                Action Required
                              </span>
                            )}
                          </div>

                          {/* Eligibility Notice Banner */}
                          <div className="bg-purple-900/40 border border-purple-500/30 p-3 rounded-lg text-xs">
                            <div className="flex items-center gap-2 font-bold text-purple-200">
                              <span>📋</span>
                              <span>STAGE 1: Eligibility &amp; Google Form Application</span>
                            </div>
                            <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                              You meet the academic cutoff (CGPA, department, arrears) to apply for this company. Submitting this form enters you into the candidate pool for online assessments and top-candidate shortlisting.
                            </p>
                          </div>

                          <p className="text-xs text-slate-300">
                            {isMailDriveApplied
                              ? `Your official application form for ${mailDrive.title} has been received and verified by the autonomous recruitment pipeline.`
                              : `Please submit your official candidate registration form for ${mailDrive.title} to select your preferred location, link your resume, and confirm your participation.`}
                          </p>
                          <div className="pt-1 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isMailDriveApplied) {
                                  setFormSubmitted(true);
                                  setActiveFormDrive(mailDrive);
                                } else {
                                  openGoogleForm(mailDrive);
                                }
                              }}
                              className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
                                isMailDriveApplied
                                  ? "bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40"
                                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 active:scale-95"
                              }`}
                            >
                              <span>{isMailDriveApplied ? "👁️" : "📝"}</span>
                              <span>
                                {isMailDriveApplied
                                  ? "View Recorded Google Form Details"
                                  : "Open & Fill Google Application Form"}
                              </span>
                            </button>
                            <a
                              href={`/apply/${mailDrive.id}?roll=${profile?.roll_number || ''}&email=${profile?.personal_email || ''}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                              title="Open real standalone Google Form application page in new browser tab"
                            >
                              <span>🌐</span> Open Real Form (New Tab)
                            </a>
                            <button
                              type="button"
                              onClick={() => setActiveJdDrive(mailDrive)}
                              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <span>📄</span> View Official JD (PDF)
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <span className="text-4xl mb-2">✉️</span>
                  <p className="text-sm">Select an email from the left to read full notification</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── GOOGLE FORM SIMULATED MODAL ─────────────────────────────────────── */}
      {activeFormDrive && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Google Form Style Header Banner */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 p-6 text-white rounded-t-2xl relative">
              <button
                onClick={() => setActiveFormDrive(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-purple-200 mb-1">
                <span>📋</span> Google Forms · Campus Recruitment Application
              </div>
              <h2 className="text-xl font-bold">{activeFormDrive.title}</h2>
              <p className="text-xs text-purple-200 mt-1">
                Company: {activeFormDrive.company?.name || activeFormDrive.company} · Role: {activeFormDrive.role || "Software Engineer"}
              </p>
            </div>

            {formSubmitted ? (
              <div className="p-8 text-center space-y-5">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/20">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Your response has been recorded.</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Your candidate registration for <span className="text-teal-300 font-semibold">{activeFormDrive?.title}</span> has been confirmed and synchronized with the placement pipeline.
                  </p>
                </div>

                {/* Submitted Summary Grid */}
                <div className="bg-slate-800/60 p-5 rounded-xl border border-white/5 text-left text-xs space-y-3 text-slate-300">
                  <div className="border-b border-white/5 pb-2 font-semibold text-purple-300 uppercase tracking-wider text-[11px]">
                    Recorded Candidate Submission
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block">1. Full Name:</span>
                      <span className="font-semibold text-white">{formData.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">2. Father&apos;s Name:</span>
                      <span className="font-semibold text-white">{formData.fatherName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">3. University Roll No:</span>
                      <span className="font-semibold text-white font-mono">{formData.rollNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">4. Date of Birth (DOB):</span>
                      <span className="font-semibold text-white">{formData.dob}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">5. Official Email:</span>
                      <span className="font-mono text-teal-300 truncate block">{formData.officialEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Personal Email:</span>
                      <span className="font-mono text-slate-300 truncate block">{formData.personalEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">6. 10th Marks / %:</span>
                      <span className="font-semibold text-white">{formData.tenthMark}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">7. 12th Marks / %:</span>
                      <span className="font-semibold text-white">{formData.twelfthMark}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">8. Degree CGPA:</span>
                      <span className="font-bold text-teal-400">{formData.cgpa} / 10.0</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Location Preference:</span>
                      <span className="font-semibold text-white">{formData.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-slate-500 block">9. Resume File & Link:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded text-[11px] font-mono">
                        📎 {formData.resumeFileName || "Candidate_Resume.pdf"}
                      </span>
                      {formData.resumeLink && (
                        <a
                          href={formData.resumeLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-400 hover:underline truncate max-w-[200px]"
                        >
                          {formData.resumeLink}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveFormDrive(null)}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-lg shadow-purple-600/30"
                  >
                    Close Form
                  </button>
                  <button
                    onClick={() => setFormSubmitted(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer border border-white/10"
                  >
                    ✏️ Edit / Modify Response
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-6 space-y-5 text-sm">
                <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-lg text-xs text-purple-200">
                  ℹ️ All fields below are pre-filled with your verified profile information. You are free to edit or update any details prior to submission.
                </div>

                {/* Question 1: Full Name */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    1. Candidate Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Question 2: Roll Number */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    2. University Roll Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. 231501498"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Question 3: Official and Personal Email ID */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    3. Official & Personal Email Addresses <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Official Institutional Email:</span>
                      <input
                        type="email"
                        required
                        value={formData.officialEmail}
                        onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                        placeholder="231501xxx@edu.in"
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-teal-300 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Personal Alternate Email:</span>
                      <input
                        type="email"
                        required
                        value={formData.personalEmail}
                        onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                        placeholder="personal@gmail.com"
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Question 4: Date of Birth (DOB) */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    4. Date of Birth (DOB) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Question 5: Resume Upload */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    5. Resume Upload & Document Link
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <label className="cursor-pointer px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-lg text-xs font-semibold text-purple-200 transition-colors flex items-center gap-2">
                      <span>📁</span> Choose Resume (PDF/DOCX)
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData((prev) => ({
                              ...prev,
                              resumeFileName: `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
                            }));
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-slate-300 font-mono">
                      {formData.resumeFileName ? `✓ Attached: ${formData.resumeFileName}` : "No file attached"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">
                      Resume Cloud Link (Google Drive / GitHub) <span className="text-slate-500 font-normal">(Optional)</span>:
                    </span>
                    <input
                      type="url"
                      value={formData.resumeLink}
                      onChange={(e) => setFormData({ ...formData, resumeLink: e.target.value })}
                      placeholder="https://drive.google.com/file/d/... (optional)"
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                {/* Question 6, 7 & 8: Academic Marks & CGPA */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    6, 7 & 8. Academic Marks & CGPA <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">6. 10th Marks (%):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="40"
                        max="100"
                        required
                        value={formData.tenthMark}
                        onChange={(e) => setFormData({ ...formData, tenthMark: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">7. 12th Marks (%):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="40"
                        max="100"
                        required
                        value={formData.twelfthMark}
                        onChange={(e) => setFormData({ ...formData, twelfthMark: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">8. Degree CGPA (/10):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        required
                        value={formData.cgpa}
                        onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-teal-400 font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Question 9: Father's Name */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    9. Father&apos;s Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    placeholder="Enter Father's Full Name"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Question 10: Preferred Work Location */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    10. Preferred Job Location <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Bangalore">Bangalore</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Pune">Pune</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                  </select>
                </div>

                {/* Question 11: Technical Focus */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    11. Technical Skills Summary
                  </label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="Python, SQL, DSA, System Design"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Undertaking Checkbox */}
                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="undertaking"
                    checked={formData.undertaking}
                    onChange={(e) => setFormData({ ...formData, undertaking: e.target.checked })}
                    className="mt-0.5 accent-purple-600 rounded cursor-pointer"
                  />
                  <label htmlFor="undertaking" className="text-xs text-slate-400 cursor-pointer">
                    I declare that all provided details (Name, Roll No, DOB, CGPA, 10th/12th Marks, Father&apos;s Name, and Resume) are accurate and match institutional records.
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setActiveFormDrive(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingForm}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-purple-600/30"
                  >
                    {submittingForm ? "Submitting..." : "Submit Application Form"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── OFFICIAL JOB DESCRIPTION (JD) PDF MODAL ───────────────────────── */}
      {activeJdDrive && (
        <JobDescriptionModal
          drive={activeJdDrive}
          isOpen={!!activeJdDrive}
          onClose={() => setActiveJdDrive(null)}
          isStudent={true}
          applicationStatus={
            drives.find((x) => x.drive_id === activeJdDrive.id)?.application_status
          }
          onApply={() => openGoogleForm(activeJdDrive)}
          onOptOut={() => handleOptOut(activeJdDrive.id, activeJdDrive.title)}
          onViewResponse={() => {
            openGoogleForm(activeJdDrive);
            setFormSubmitted(true);
          }}
        />
      )}

    </div>
  );
}
