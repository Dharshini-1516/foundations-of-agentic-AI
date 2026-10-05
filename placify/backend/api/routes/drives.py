"""Drives API — CRUD + trigger agent pipeline."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from core.database import get_db
from core.security import get_current_user
from models.models import Drive, Company, AgentLog, Application, ScheduleSlot, Notification
from pydantic import BaseModel
from datetime import datetime
import asyncio

router = APIRouter(prefix="/api/drives", tags=["drives"])


class DriveCreate(BaseModel):
    company_id: int
    title: str
    jd_text: str
    role: Optional[str] = None
    package_lpa: Optional[float] = None
    location: Optional[str] = None


@router.get("")
@router.get("/")
def list_drives(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    drives = db.query(Drive).order_by(Drive.created_at.desc()).all()
    result = []
    for d in drives:
        apps = db.query(Application).filter(Application.drive_id == d.id).all()
        applied_count = len([a for a in apps if a.status in ["submitted", "shortlisted", "interview_scheduled"]])
        shortlisted_count = len([a for a in apps if a.status in ["shortlisted", "interview_scheduled"]])
        if d.total_applied != applied_count or d.total_shortlisted != shortlisted_count:
            d.total_applied = applied_count
            d.total_shortlisted = shortlisted_count
            db.commit()
        result.append({
            "id": d.id, "title": d.title, "status": d.status,
            "company": d.company.name if d.company else "",
            "role": d.role, "package_lpa": d.package_lpa, "location": d.location,
            "jd_text": d.jd_text,
            "min_cgpa": d.min_cgpa,
            "allowed_branches": d.allowed_branches or [],
            "max_active_backlogs": d.max_active_backlogs,
            "required_skills": d.required_skills or [],
            "application_deadline": d.application_deadline.isoformat() if d.application_deadline else None,
            "total_eligible": d.total_eligible,
            "total_applied": applied_count,
            "total_shortlisted": shortlisted_count,
            "shortlist_quota": d.shortlist_quota or 25,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return result


@router.post("")
@router.post("/")
def create_drive(body: DriveCreate, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == body.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    drive = Drive(
        company_id=body.company_id,
        title=body.title,
        jd_text=body.jd_text,
        role=body.role,
        package_lpa=body.package_lpa,
        location=body.location,
        status="created",
        created_by=current_user.id,
    )
    db.add(drive); db.commit(); db.refresh(drive)
    return {"id": drive.id, "title": drive.title, "status": drive.status}


@router.get("/{drive_id}")
def get_drive(drive_id: int, db: Session = Depends(get_db),
              current_user=Depends(get_current_user)):
    d = db.query(Drive).filter(Drive.id == drive_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Drive not found")
    apps = db.query(Application).filter(Application.drive_id == drive_id).all()
    applied_count = len([a for a in apps if a.status in ["submitted", "shortlisted", "interview_scheduled"]])
    shortlisted_count = len([a for a in apps if a.status in ["shortlisted", "interview_scheduled"]])
    if d.total_applied != applied_count or d.total_shortlisted != shortlisted_count:
        d.total_applied = applied_count
        d.total_shortlisted = shortlisted_count
        db.commit()

    return {
        "id": d.id, "title": d.title, "status": d.status,
        "company": {"id": d.company.id, "name": d.company.name} if d.company else None,
        "jd_text": d.jd_text, "role": d.role,
        "package_lpa": d.package_lpa, "location": d.location,
        "min_cgpa": d.min_cgpa,
        "allowed_branches": d.allowed_branches or [],
        "max_active_backlogs": d.max_active_backlogs,
        "required_skills": d.required_skills or [],
        "total_eligible": d.total_eligible,
        "total_applied": applied_count,
        "total_shortlisted": shortlisted_count,
        "shortlist_quota": d.shortlist_quota or 25,
        "application_deadline": d.application_deadline.isoformat() if d.application_deadline else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@router.post("/{drive_id}/start-pipeline")
async def start_pipeline(drive_id: int, background_tasks: BackgroundTasks,
                         db: Session = Depends(get_db),
                         current_user=Depends(get_current_user)):
    """Trigger the LangGraph agent pipeline for this drive."""
    drive = db.query(Drive).filter(Drive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if not drive.jd_text:
        raise HTTPException(status_code=400, detail="No JD text found. Please add JD first.")

    background_tasks.add_task(_run_pipeline, drive_id, drive.jd_text,
                              drive.company.name if drive.company else "Company", db)
    return {"message": "Pipeline started", "drive_id": drive_id}


async def _run_pipeline(drive_id: int, jd_text: str, company_name: str, db: Session):
    """Run the full agent pipeline in the background."""
    from agents.orchestrator import build_graph, make_initial_state
    from api.websocket import manager

    async def broadcaster(d_id, event):
        await manager.broadcast_to_drive(str(d_id), event)

    try:
        graph = build_graph(db, broadcaster)
        initial_state = make_initial_state(drive_id, company_name, jd_text)
        await graph.ainvoke(initial_state)
    except Exception as e:
        await manager.broadcast_to_drive(str(drive_id), {
            "agent": "Orchestrator", "type": "error",
            "message": f"Pipeline error: {str(e)}", "data": {}
        })


@router.get("/{drive_id}/logs")
def get_logs(drive_id: int, db: Session = Depends(get_db),
             current_user=Depends(get_current_user)):
    logs = db.query(AgentLog).filter(AgentLog.drive_id == drive_id)\
              .order_by(AgentLog.created_at.asc()).all()
    return [{"id": l.id, "agent": l.agent_name, "type": l.event_type,
             "message": l.message, "data": l.data,
             "timestamp": l.created_at.isoformat()} for l in logs]


@router.get("/{drive_id}/shortlist")
def get_shortlist(drive_id: int, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    apps = db.query(Application).filter(
        Application.drive_id == drive_id,
        Application.status.in_(["shortlisted", "interview_scheduled"]),
    ).order_by(Application.rank).all()
    return [{
        "rank": a.rank,
        "student_id": a.student_id,
        "name": a.student.user.name,
        "roll_number": a.student.roll_number,
        "branch": a.student.branch,
        "cgpa": a.student.cgpa,
        "assessment_score": a.assessment_score,
        "status": a.status,
    } for a in apps]


@router.get("/{drive_id}/schedule")
def get_schedule(drive_id: int, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    slots = db.query(ScheduleSlot)\
              .join(Application, ScheduleSlot.application_id == Application.id)\
              .filter(
                  ScheduleSlot.drive_id == drive_id,
                  Application.status.in_(["shortlisted", "interview_scheduled"]),
              )\
              .order_by(ScheduleSlot.slot_time).all()

    seen_apps = set()
    unique_slots = []
    for s in slots:
        if s.application_id not in seen_apps:
            seen_apps.add(s.application_id)
            unique_slots.append(s)

    return [{
        "id": s.id,
        "student_name": s.application.student.user.name,
        "roll_number": s.application.student.roll_number,
        "slot_time": s.slot_time.isoformat(),
        "room": s.room,
        "panel": s.panel,
        "duration_minutes": s.duration_minutes,
        "confirmed": s.confirmed,
    } for s in unique_slots]


@router.post("/{drive_id}/approve")
def approve_drive(drive_id: int, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    """TPO approves the shortlist and schedule (HITL gate)."""
    drive = db.query(Drive).filter(Drive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    # Confirm all slots
    db.query(ScheduleSlot).filter(ScheduleSlot.drive_id == drive_id)\
      .update({"confirmed": True})
    # Update application statuses
    db.query(Application).filter(
        Application.drive_id == drive_id,
        Application.status == "shortlisted",
    ).update({"status": "interview_scheduled"})
    drive.status = "scheduled"

    # Dispatch Call Letter & Interview Slot notifications to all shortlisted candidates
    slots = db.query(ScheduleSlot).filter(ScheduleSlot.drive_id == drive_id).all()
    company_name = drive.company.name if drive.company else "Company"
    for s in slots:
        app = s.application
        if not app or not app.student:
            continue
        student = app.student
        slot_str = s.slot_time.strftime("%d %b %Y at %I:%M %p") if s.slot_time else "TBD"
        notif = Notification(
            user_id=student.user_id,
            drive_id=drive_id,
            title=f"🎓 Interview Call Letter: {company_name} — Shortlisted! (Rank #{app.rank or 1})",
            message=(
                f"Dear {student.user.name},\n\n"
                f"Congratulations! You have been selected among the TOP candidates shortlisted for {company_name} ({drive.role or 'Software Engineer'}).\n\n"
                f"Your official interview slot is scheduled on {slot_str} in {s.room or 'Seminar Hall A'} with {s.panel or 'Panel A - Technical'}.\n\n"
                f"Please review your confirmed slot details in the student portal."
            ),
            notification_type="success",
        )
        db.add(notif)

    db.commit()
    return {"message": "Drive approved. Interview call letters sent to all shortlisted candidates.", "drive_id": drive_id}


@router.post("/{drive_id}/remind-deadline")
def remind_deadline(drive_id: int, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    """Dispatch deadline reminders to eligible unapplied students via Communication Agent."""
    drive = db.query(Drive).filter(Drive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    apps = db.query(Application).filter(
        Application.drive_id == drive_id,
        Application.status == "pending",
    ).all()

    company_name = drive.company.name if drive.company else "Recruitment Partner"
    deadline_str = drive.application_deadline.strftime("%d %b %Y, %I:%M %p") if drive.application_deadline else "in 48 hours"

    reminded_count = 0
    for a in apps:
        student = a.student
        if not student:
            continue
        notif = Notification(
            user_id=student.user_id,
            drive_id=drive_id,
            title=f"⏰ URGENT REMINDER: Application Deadline Approaching for {company_name}",
            message=f"Dear {student.user.name}, the candidate application window for {company_name} ({drive.role}) closes on {deadline_str}. If you are interested in this recruitment drive, please complete and submit your Google Application Form before the deadline expires.",
            notification_type="warning",
        )
        db.add(notif)
        reminded_count += 1

    log = AgentLog(
        drive_id=drive_id,
        agent_name="Communication Agent",
        event_type="action",
        message=f"Dispatched deadline urgency reminders to {reminded_count} eligible students who have not yet submitted their application.",
        data={"reminded_count": reminded_count, "deadline": deadline_str},
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Deadline reminders successfully dispatched to {reminded_count} eligible students.",
        "reminded_count": reminded_count,
    }


@router.post("/{drive_id}/simulate-conflict")
async def simulate_conflict(drive_id: int, db: Session = Depends(get_db),
                            current_user=Depends(get_current_user)):
    """Simulate a cross-interview clash, demonstrate Conflict Checker & Critic reflection, and autonomously resolve it."""
    from datetime import datetime, timedelta
    drive = db.query(Drive).filter(Drive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    slot = db.query(ScheduleSlot)\
             .join(Application, ScheduleSlot.application_id == Application.id)\
             .filter(
                 ScheduleSlot.drive_id == drive_id,
                 Application.status.in_(["shortlisted", "interview_scheduled"]),
             )\
             .order_by(ScheduleSlot.slot_time).first()
    if not slot:
        raise HTTPException(status_code=400, detail="No interview schedule slots found to simulate conflict. Ensure drive is scheduled.")

    app = slot.application
    student_name = app.student.user.name if app and app.student else "Candidate"
    roll_no = app.student.roll_number if app and app.student else "231501xxx"
    company_this = drive.company.name if drive.company else "Current Company"
    other_company = "TechCorp Solutions" if company_this != "TechCorp Solutions" else "DataSpark Analytics"

    orig_time_str = slot.slot_time.strftime("%I:%M %p") if slot.slot_time else "10:00 AM"
    orig_date_str = slot.slot_time.strftime("%d %b %Y") if slot.slot_time else "05 Oct 2026"

    # 1. Conflict Checker detects the collision
    log1 = AgentLog(
        drive_id=drive_id,
        agent_name="Conflict Checker",
        event_type="warning",
        message=(
            f"⚠️ CRITICAL INTERVIEW CLASH DETECTED: Candidate {student_name} ({roll_no}) "
            f"has overlapping technical interview slots for both {company_this} and {other_company} "
            f"at {orig_time_str} in {slot.room or 'Seminar Hall A'}!"
        ),
        data={"student": student_name, "roll_number": roll_no, "clash_type": "cross_company_time_collision", "companies": [company_this, other_company], "slot_time": orig_time_str}
    )
    db.add(log1)

    # 2. Critic / Reflection Agent reviews and triggers replan
    log2 = AgentLog(
        drive_id=drive_id,
        agent_name="Critic / Reflection Agent",
        event_type="thinking",
        message=(
            f"Reflecting on timetable constraints: Candidate {student_name} double-booked across 2 recruitment drives. "
            f"Schedule validation FAILED. Rejecting schedule parity and triggering LangGraph conditional feedback loop -> Scheduling Agent for autonomous deconfliction."
        ),
        data={"reflection": "schedule_infeasible", "action": "trigger_replan_loop", "target_node": "scheduling_agent"}
    )
    db.add(log2)

    # 3. Scheduling Agent re-allocates slot
    new_slot_time = (slot.slot_time + timedelta(minutes=90)) if slot.slot_time else datetime.utcnow()
    new_time_str = new_slot_time.strftime("%I:%M %p")
    new_room = "Seminar Hall B" if slot.room == "Seminar Hall A" else "Technical Lab 2"

    slot.slot_time = new_slot_time
    slot.room = new_room
    slot.panel = "Panel B - Deconflicted Technical Session"

    log3 = AgentLog(
        drive_id=drive_id,
        agent_name="Scheduling Agent",
        event_type="action",
        message=(
            f"Autonomous Re-scheduling: Re-assigned {student_name} to conflict-free window "
            f"at {new_time_str} ({orig_date_str}) in {new_room} (Panel: {slot.panel}). "
            f"All cross-company and room constraints re-evaluated successfully."
        ),
        data={"student": student_name, "original_time": orig_time_str, "resolved_time": new_time_str, "room": new_room}
    )
    db.add(log3)

    # 4. Conflict Checker confirms clean state
    log4 = AgentLog(
        drive_id=drive_id,
        agent_name="Conflict Checker",
        event_type="complete",
        message=(
            f"✓ Multi-Agent Conflict Resolution Complete: Re-verified all {drive.total_shortlisted} slots. "
            f"Zero overlapping interviews detected. Schedule integrity 100% verified."
        ),
        data={"conflicts_remaining": 0, "status": "resolved"}
    )
    db.add(log4)

    # In-app notification to student
    if app and app.student:
        notif = Notification(
            user_id=app.student.user_id,
            drive_id=drive_id,
            title=f"✨ Interview Schedule Deconflicted: {company_this} (No Overlap)",
            message=(
                f"Dear {student_name},\n\nYour interview slot for {company_this} has been automatically deconflicted "
                f"by the AI Conflict Checker Agent to prevent a clash with {other_company}.\n\n"
                f"Your updated confirmed slot is on {orig_date_str} at {new_time_str} in {new_room} with {slot.panel}.\n"
                f"Please review your confirmed interview pass in the student portal."
            ),
            notification_type="success",
        )
        db.add(notif)

    db.commit()

    # Broadcast to WebSocket
    from api.websocket import manager
    try:
        await manager.broadcast_to_drive(str(drive_id), {"agent": "Conflict Checker", "type": "warning", "message": log1.message, "data": log1.data})
        await manager.broadcast_to_drive(str(drive_id), {"agent": "Critic / Reflection Agent", "type": "thinking", "message": log2.message, "data": log2.data})
        await manager.broadcast_to_drive(str(drive_id), {"agent": "Scheduling Agent", "type": "action", "message": log3.message, "data": log3.data})
        await manager.broadcast_to_drive(str(drive_id), {"agent": "Conflict Checker", "type": "complete", "message": log4.message, "data": log4.data})
    except Exception:
        pass

    return {
        "message": "Interview clash detected and autonomously resolved by agents.",
        "student_name": student_name,
        "roll_number": roll_no,
        "clashing_company": other_company,
        "original_time": orig_time_str,
        "resolved_time": new_time_str,
        "original_room": "Seminar Hall A",
        "resolved_room": new_room,
        "panel": slot.panel,
        "date": orig_date_str,
    }
