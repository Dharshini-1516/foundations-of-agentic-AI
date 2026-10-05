// Shared TypeScript types for Placify

export type UserRole = "tpo" | "student" | "hr" | "faculty";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Company {
  id: number;
  name: string;
  industry: string;
  website?: string;
  contact_email?: string;
  contact_name?: string;
  description?: string;
}

export interface Drive {
  id: number;
  title: string;
  status: DriveStatus;
  company: { id: number; name: string } | null;
  company_name?: string;
  role?: string;
  package_lpa?: number;
  location?: string;
  jd_text?: string;
  min_cgpa?: number;
  allowed_branches?: string[];
  max_active_backlogs?: number;
  required_skills?: string[];
  total_eligible: number;
  total_applied: number;
  total_shortlisted: number;
  shortlist_quota?: number;
  application_deadline?: string;
  created_at?: string;
}

export type DriveStatus =
  | "created"
  | "eligibility"
  | "applications_open"
  | "applications_closed"
  | "assessment"
  | "shortlisting"
  | "scheduling"
  | "scheduled"
  | "completed"
  | "paused"
  | "awaiting_tpo_approval";

export interface AgentEvent {
  agent: string;
  type: "thinking" | "action" | "complete" | "error" | "warning";
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export interface ShortlistEntry {
  rank: number;
  student_id: number;
  name: string;
  roll_number: string;
  branch: string;
  cgpa: number;
  assessment_score?: number;
  status: string;
}

export interface ScheduleSlot {
  id: number;
  student_name: string;
  roll_number: string;
  slot_time: string;
  room: string;
  panel: string;
  duration_minutes: number;
  confirmed: boolean;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  roll_number: string;
  branch: string;
  cgpa: number;
  tenth: number;
  twelfth: number;
  active_backlogs: number;
  skills: string[];
  year_of_graduation: number;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  drive_id?: number;
  created_at: string;
}

export interface MyDrive {
  drive_id: number;
  title: string;
  company: string;
  role?: string;
  package_lpa?: number;
  application_status: string;
  assessment_score?: number;
  rank?: number;
  drive_status: string;
}
