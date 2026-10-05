// API client — direct communication with FastAPI backend

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("placify_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const baseUrl = getBaseUrl();
  const targetUrl = `${baseUrl}${path}`;

  const res = await fetch(targetUrl, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const form = new URLSearchParams({ username: email, password });
      const baseUrl = getBaseUrl();
      const targetUrl = `${baseUrl}/api/auth/login`;

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
        throw new Error(err.detail || "Invalid credentials");
      }

      const data = await res.json();
      localStorage.setItem("placify_token", data.access_token);
      localStorage.setItem(
        "placify_user",
        JSON.stringify({
          role: data.role,
          name: data.name,
          id: data.id,
        })
      );
      return data;
    },
    me: () => request<{ id: number; name: string; email: string; role: string }>("/api/auth/me"),
    logout: () => {
      localStorage.removeItem("placify_token");
      localStorage.removeItem("placify_user");
    },
  },

  // ─── Drives ──────────────────────────────────────────────────────────────
  drives: {
    list: () => request<any[]>("/api/drives"),
    get: (id: number) => request<any>(`/api/drives/${id}`),
    create: (data: any) => request<any>("/api/drives", { method: "POST", body: JSON.stringify(data) }),
    startPipeline: (id: number) => request<any>(`/api/drives/${id}/start-pipeline`, { method: "POST" }),
    getLogs: (id: number) => request<any[]>(`/api/drives/${id}/logs`),
    getShortlist: (id: number) => request<any[]>(`/api/drives/${id}/shortlist`),
    getSchedule: (id: number) => request<any[]>(`/api/drives/${id}/schedule`),
    approve: (id: number) => request<any>(`/api/drives/${id}/approve`, { method: "POST" }),
    remindDeadline: (id: number) => request<any>(`/api/drives/${id}/remind-deadline`, { method: "POST" }),
    simulateConflict: (id: number) => request<any>(`/api/drives/${id}/simulate-conflict`, { method: "POST" }),
  },

  // ─── Students ────────────────────────────────────────────────────────────
  students: {
    list: () => request<any[]>("/api/students"),
    me: () => request<any>("/api/students/me"),
    myDrives: () => request<any[]>("/api/students/my-drives"),
  },

  // ─── Companies ───────────────────────────────────────────────────────────
  companies: {
    list: () => request<any[]>("/api/companies"),
    create: (data: any) => request<any>("/api/companies", { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Applications ────────────────────────────────────────────────────────
  applications: {
    apply: (drive_id: number, form_data: object = {}) =>
      request<any>("/api/applications/apply", {
        method: "POST",
        body: JSON.stringify({ drive_id, form_data }),
      }),
    optOut: (drive_id: number, reason: string = "Student not interested") =>
      request<any>("/api/applications/opt-out", {
        method: "POST",
        body: JSON.stringify({ drive_id, reason }),
      }),
  },

  // ─── Notifications ───────────────────────────────────────────────────────
  notifications: {
    list: () => request<any[]>("/api/notifications"),
    markRead: (id: number) => request<any>(`/api/notifications/${id}/read`, { method: "POST" }),
  },

  // ─── Real Email & SMTP ───────────────────────────────────────────────────
  email: {
    getConfig: () => request<any>("/api/email/config"),
    updateConfig: (data: any) => request<any>("/api/email/config", { method: "POST", body: JSON.stringify(data) }),
    sendTest: (data: { recipient_email: string; student_name?: string; drive_id?: number }) =>
      request<any>("/api/email/send-test", { method: "POST", body: JSON.stringify(data) }),
    sendDriveReal: (drive_id: number, data: { recipient_email: string; student_name?: string; roll_number?: string }) =>
      request<any>(`/api/email/drives/${drive_id}/send-real`, { method: "POST", body: JSON.stringify(data) }),
  },
};

// ─── WebSocket helper ─────────────────────────────────────────────────────────
export function createDriveSocket(driveId: number, onEvent: (e: any) => void): WebSocket {
  const host = typeof window !== "undefined" ? (window.location.hostname || "127.0.0.1") : "127.0.0.1";
  const ws = new WebSocket(`ws://${host}:8000/ws/drives/${driveId}`);
  ws.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {}
  };
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send("ping");
  }, 25000);
  ws.onclose = () => clearInterval(ping);
  return ws;
}
