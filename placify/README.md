# 🚀 Placify — Autonomous AI Placement Orchestration System

Placify is an autonomous multi-agent AI system designed to streamline and automate the entire campus placement lifecycle. Built with a Python FastAPI + LangGraph backend and a Next.js 14 frontend with Tailwind CSS and real-time WebSockets.

---

## 🏗️ Architecture & 10 Autonomous Agents

```
                        PLACIFY ORCHESTRATOR (LangGraph)
            Planning · State Management · Routing · Monitoring · Re-planning
 ─────────────────────────────────────────────────────────────────────────────
                                  AGENT LAYER
  1. Company Agent        : Ingests JD text and structures requirements (CGPA, branches, skills)
  2. Eligibility Agent    : Filters students meeting academic, backlog, and branch criteria
  3. Verification Agent   : Validates records against institutional databases
  4. Application Agent    : Automatically generates application pipelines & tracks forms
  5. Communication Agent  : Sends automated candidate updates, reminders, and invites
  6. Assessment Agent     : Ingests online test results & normalizes scores
  7. Shortlisting Agent   : Computes composite weights (assessment + CGPA) & creates candidate rank list
  8. Scheduling Agent     : Allocates clash-free interview slots, interview panels, and rooms
  9. Conflict Checker     : Scans timetable against exams, active drives, and faculty availability
 10. Critic / Reflection  : Validates outputs, verifies integrity, and triggers Human-In-The-Loop approval
 ─────────────────────────────────────────────────────────────────────────────
                             KNOWLEDGE & DATA LAYER
    SQLite Database · ChromaDB Vector Embeddings · Real-Time WebSockets Event Stream
```

---

## ⚡ Quick Start

### 1. Start the Backend
Double-click `start_backend.bat` or run:
```bash
cd placify/backend
python seed_data.py   # Populates 500 students, 6 companies, and test drives
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- API is live at: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Start the Frontend
Double-click `start_frontend.bat` or run:
```bash
cd placify/frontend
npm run dev
```
- Web Application is live at: `http://localhost:3000`

---

## 🔑 Demo Login Credentials

You can use the one-click demo buttons on the login page or sign in manually:

| Portal | Role | Email | Password |
|---|---|---|---|
| **TPO Dashboard** | Training & Placement Officer | `tpo@college.edu` | `tpo123` |
| **Student Portal** | Student Applicant | `student0001@college.edu` | `student123` |
| **HR Portal** | Corporate Recruiter | `hr_1@placify.demo` | `hr123` |
| **Faculty Portal** | Faculty / Academic Coordinator | `faculty@college.edu` | `faculty123` |

---

## 🌟 Key Features

1. **Terminal-Style Agent Live Feed**: Watch LangGraph agents reason, query data, and perform actions live via WebSockets.
2. **Dynamic JD Extraction**: Paste any job description — Company Agent automatically extracts CGPA cutoff, branches, and backlogs.
3. **Automated Eligibility Filtering**: 500 pre-seeded students filtered in real-time according to drive criteria.
4. **Human-In-The-Loop (HITL) Gate**: TPO gets full authority to inspect the shortlist and schedule before finalizing invites.
5. **Conflict-Free Scheduling**: Interviews are mapped to panels and rooms avoiding exams and active campus schedules.
6. **Multi-Role Portals**: Dedicated UIs tailored for TPOs, Students, HR Recruiters, and Faculty.
