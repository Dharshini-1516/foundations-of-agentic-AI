"""Students, Companies, Applications, Notifications routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.models import Student, Company, Application, Drive, Notification, User
from pydantic import BaseModel
from typing import Optional, List

# ─── Students ─────────────────────────────────────────────────────────────────
students_router = APIRouter(prefix="/api/students", tags=["students"])

@students_router.get("")
@students_router.get("/")
def list_students(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    students = db.query(Student).join(User).all()
    return [{
        "id": s.id, "name": s.user.name, "email": s.user.email,
        "roll_number": s.roll_number, "branch": s.branch,
        "cgpa": s.cgpa, "tenth": s.tenth_percentage,
        "twelfth": s.twelfth_percentage,
        "active_backlogs": s.active_backlogs,
        "skills": s.skills or [],
        "year_of_graduation": s.year_of_graduation,
    } for s in students]

@students_router.get("/me")
def my_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return {
        "id": student.id, "name": current_user.name, "email": current_user.email,
        "roll_number": student.roll_number, "branch": student.branch,
        "cgpa": student.cgpa, "tenth": student.tenth_percentage,
        "twelfth": student.twelfth_percentage,
        "active_backlogs": student.active_backlogs,
        "skills": student.skills or [],
        "year_of_graduation": student.year_of_graduation,
        "dob": student.dob or "2004-05-15",
        "personal_email": student.personal_email or f"{current_user.name.lower().replace(' ', '.')}@gmail.com",
        "father_name": student.father_name or (f"R. {current_user.name.split()[-1]}" if " " in current_user.name else f"K. {current_user.name}"),
    }

@students_router.get("/my-drives")
def my_drives(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []
    from models.models import ScheduleSlot
    apps = db.query(Application).filter(Application.student_id == student.id).all()
    result = []
    for a in apps:
        d = a.drive
        slot = db.query(ScheduleSlot).filter(ScheduleSlot.application_id == a.id).first()
        result.append({
            "drive_id": d.id, "title": d.title,
            "company": d.company.name if d.company else "",
            "role": d.role, "package_lpa": d.package_lpa,
            "location": d.location,
            "jd_text": d.jd_text,
            "min_cgpa": d.min_cgpa,
            "allowed_branches": d.allowed_branches or [],
            "required_skills": d.required_skills or [],
            "shortlist_quota": d.shortlist_quota or 25,
            "application_status": a.status,
            "assessment_score": a.assessment_score,
            "rank": a.rank,
            "drive_status": d.status,
            "interview_slot": {
                "id": slot.id,
                "slot_time": slot.slot_time.isoformat() if slot.slot_time else None,
                "room": slot.room,
                "panel": slot.panel,
                "duration_minutes": slot.duration_minutes,
                "confirmed": slot.confirmed,
            } if slot else None,
        })
    return result


# ─── Companies ────────────────────────────────────────────────────────────────
companies_router = APIRouter(prefix="/api/companies", tags=["companies"])

class CompanyCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    description: Optional[str] = None

@companies_router.get("")
@companies_router.get("/")
def list_companies(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    companies = db.query(Company).all()
    return [{"id": c.id, "name": c.name, "industry": c.industry,
             "website": c.website, "contact_email": c.contact_email,
             "contact_name": c.contact_name, "description": c.description} for c in companies]

@companies_router.post("")
@companies_router.post("/")
def create_company(body: CompanyCreate, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    company = Company(**body.model_dump())
    db.add(company); db.commit(); db.refresh(company)
    return {"id": company.id, "name": company.name}


# ─── Applications ─────────────────────────────────────────────────────────────
applications_router = APIRouter(prefix="/api/applications", tags=["applications"])

class ApplyRequest(BaseModel):
    drive_id: int
    form_data: dict = {}

@applications_router.post("/apply")
def apply(body: ApplyRequest, db: Session = Depends(get_db),
          current_user=Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")
    app = db.query(Application).filter(
        Application.drive_id == body.drive_id,
        Application.student_id == student.id,
    ).first()
    if not app:
        app = Application(
            drive_id=body.drive_id,
            student_id=student.id,
            status="submitted",
            form_data=body.form_data or {},
        )
        db.add(app)
    else:
        app.status = "submitted"
        existing_data = dict(app.form_data) if app.form_data else {}
        existing_data.update(body.form_data or {})
        app.form_data = existing_data

    # Persist any user-edited profile details
    if body.form_data:
        fd = body.form_data
        if fd.get("name"):
            current_user.name = str(fd["name"]).strip()
        if fd.get("roll_number"):
            student.roll_number = str(fd["roll_number"]).strip()
        if fd.get("father_name"):
            student.father_name = str(fd["father_name"]).strip()
        if fd.get("personal_email"):
            student.personal_email = str(fd["personal_email"]).strip()
        if fd.get("dob"):
            student.dob = str(fd["dob"]).strip()
        if fd.get("cgpa") is not None:
            try:
                student.cgpa = float(fd["cgpa"])
            except (ValueError, TypeError):
                pass
        if fd.get("tenth") is not None:
            try:
                student.tenth_percentage = float(fd["tenth"])
            except (ValueError, TypeError):
                pass
        if fd.get("twelfth") is not None:
            try:
                student.twelfth_percentage = float(fd["twelfth"])
            except (ValueError, TypeError):
                pass

    drive = db.query(Drive).filter(Drive.id == body.drive_id).first()
    if drive:
        drive.total_applied = db.query(Application).filter(
            Application.drive_id == body.drive_id,
            Application.status.in_(["submitted", "shortlisted", "interview_scheduled"]),
        ).count()
        # Restore invitation notification if missing (e.g. after re-applying)
        existing_notif = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.drive_id == body.drive_id,
        ).first()
        if not existing_notif:
            company_name = drive.company.name if drive and drive.company else "Recruitment Partner"
            notif = Notification(
                user_id=current_user.id,
                drive_id=body.drive_id,
                title=f"📋 Invitation to Apply: {company_name} Placement Drive (Google Form)",
                message=(
                    f"Dear {current_user.name},\n\nYour application form for {company_name} has been recorded. "
                    f"You are participating in this recruitment drive."
                ),
                notification_type="info",
            )
            db.add(notif)
    db.commit()
    return {"message": "Application submitted successfully", "application_id": app.id}


class OptOutRequest(BaseModel):
    drive_id: int
    reason: Optional[str] = "Student not interested"

@applications_router.post("/opt-out")
def opt_out(body: OptOutRequest, db: Session = Depends(get_db),
            current_user=Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")
    app = db.query(Application).filter(
        Application.drive_id == body.drive_id,
        Application.student_id == student.id,
    ).first()
    if not app:
        app = Application(
            drive_id=body.drive_id,
            student_id=student.id,
            status="opted_out",
            notes=body.reason or "Student opted out / Not interested",
        )
        db.add(app)
    else:
        app.status = "opted_out"
        app.rank = None
        app.notes = body.reason or "Student opted out / Not interested"

    # Immediately remove from any interview schedule slot
    from models.models import ScheduleSlot
    if app.id:
        db.query(ScheduleSlot).filter(
            ScheduleSlot.drive_id == body.drive_id,
            ScheduleSlot.application_id == app.id,
        ).delete()

    # Remove all drive notifications (invitation, call letter, reminders) from student's inbox
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.drive_id == body.drive_id,
    ).delete()

    drive = db.query(Drive).filter(Drive.id == body.drive_id).first()
    if drive:
        drive.total_applied = db.query(Application).filter(
            Application.drive_id == body.drive_id,
            Application.status.in_(["submitted", "shortlisted", "interview_scheduled"]),
        ).count()
        drive.total_shortlisted = db.query(Application).filter(
            Application.drive_id == body.drive_id,
            Application.status.in_(["shortlisted", "interview_scheduled"]),
        ).count()

    db.commit()
    return {"message": "You have opted out of this recruitment drive. You are removed from shortlists, interview schedules, and drive notifications."}


# ─── Notifications ────────────────────────────────────────────────────────────
notifications_router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@notifications_router.get("")
@notifications_router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    opted_out_drive_ids = set()
    if student:
        opted_out_apps = db.query(Application.drive_id).filter(
            Application.student_id == student.id,
            Application.status == "opted_out",
        ).all()
        opted_out_drive_ids = {a[0] for a in opted_out_apps}

    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if opted_out_drive_ids:
        query = query.filter((Notification.drive_id == None) | (~Notification.drive_id.in_(opted_out_drive_ids)))

    notifs = query.order_by(Notification.created_at.desc()).limit(50).all()
    return [{
        "id": n.id, "title": n.title, "message": n.message,
        "type": n.notification_type, "is_read": n.is_read,
        "drive_id": n.drive_id,
        "created_at": n.created_at.isoformat(),
    } for n in notifs]

@notifications_router.post("/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db),
              current_user=Depends(get_current_user)):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id
    ).first()
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}
