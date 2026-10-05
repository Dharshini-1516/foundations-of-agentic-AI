"""
Email routes & Google Form Webhook API.
Provides endpoints for real SMTP configuration, real email dispatch, and Google Form webhook reception.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from core.database import get_db
from core.security import get_current_user
from models.models import Drive, Student, User, Application, Notification
from services.email_service import (
    get_smtp_config,
    save_smtp_config,
    send_real_email,
    is_smtp_configured,
    generate_application_email_html,
)

router = APIRouter(prefix="/api/email", tags=["email"])


class SMTPConfigUpdate(BaseModel):
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    smtp_from: Optional[str] = None
    app_base_url: Optional[str] = "http://localhost:3000"
    enabled: Optional[bool] = True


class SendTestEmailRequest(BaseModel):
    recipient_email: str
    student_name: Optional[str] = "Candidate"
    drive_id: Optional[int] = 1


class DispatchDriveEmailRequest(BaseModel):
    recipient_email: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None


@router.get("/config")
def get_config(current_user=Depends(get_current_user)):
    """Get current SMTP configuration status (password masked)."""
    cfg = get_smtp_config()
    pwd = cfg.get("smtp_password", "")
    masked_pwd = ("*" * len(pwd)) if pwd else ""
    return {
        "configured": is_smtp_configured(),
        "smtp_host": cfg.get("smtp_host", "smtp.gmail.com"),
        "smtp_port": cfg.get("smtp_port", 587),
        "smtp_user": cfg.get("smtp_user", ""),
        "smtp_from": cfg.get("smtp_from", ""),
        "app_base_url": cfg.get("app_base_url", "http://localhost:3000"),
        "has_password": bool(pwd),
        "password_masked": masked_pwd,
        "enabled": cfg.get("enabled", True),
    }


@router.post("/config")
def update_config(body: SMTPConfigUpdate, current_user=Depends(get_current_user)):
    """Update SMTP configuration (persisted to core/smtp_config.json)."""
    current = get_smtp_config()
    update_data = body.model_dump(exclude_unset=True)

    # Don't overwrite existing password with empty string if not provided
    if not update_data.get("smtp_password") and current.get("smtp_password"):
        update_data["smtp_password"] = current["smtp_password"]

    saved = save_smtp_config(update_data)
    return {
        "success": True,
        "configured": is_smtp_configured(),
        "message": "SMTP configuration saved successfully",
        "smtp_user": saved.get("smtp_user"),
    }


@router.post("/send-test")
def send_test_email(body: SendTestEmailRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Send an immediate real test email to any recipient address."""
    drive = db.query(Drive).filter(Drive.id == (body.drive_id or 1)).first()
    company_name = drive.company.name if (drive and drive.company) else "Campus Recruiter"
    title = drive.title if drive else "Software Development Engineer 2026"

    html = generate_application_email_html(
        student_name=body.student_name or current_user.name or "Candidate",
        company_name=company_name,
        drive_title=title,
        drive_id=drive.id if drive else 1,
        package_lpa=drive.package_lpa if drive else 12.0,
        location=drive.location if drive else "Bangalore / Hyderabad",
        min_cgpa=drive.min_cgpa if drive else 7.0,
        deadline_str="7 Days from Announcement",
    )

    result = send_real_email(
        to_email=body.recipient_email,
        subject=f"[{company_name}] Campus Recruitment 2026 — Official Application Form & Eligible Invitation",
        html_content=html,
        text_content=f"Hello {body.student_name},\n\nYou are eligible for {company_name}. Please open http://localhost:3000/apply/{drive.id if drive else 1} to apply.",
    )
    return result


@router.post("/drives/{drive_id}/send-real")
def send_drive_real_email(
    drive_id: int,
    body: DispatchDriveEmailRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Send real recruitment invitation email with the real Form link for a specific drive."""
    drive = db.query(Drive).filter(Drive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    company_name = drive.company.name if drive.company else "Campus Recruiter"

    student_name = body.student_name
    roll_number = body.roll_number

    # If student is logged in, use their real profile details
    if not student_name and current_user:
        student_name = current_user.name
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            roll_number = student.roll_number

    html = generate_application_email_html(
        student_name=student_name or "Candidate",
        company_name=company_name,
        drive_title=drive.title,
        drive_id=drive.id,
        package_lpa=drive.package_lpa,
        location=drive.location,
        min_cgpa=drive.min_cgpa,
        deadline_str="7 Days from Announcement",
        roll_number=roll_number,
    )

    result = send_real_email(
        to_email=body.recipient_email,
        subject=f"[{company_name}] Campus Recruitment 2026 — Official Application Form & Eligible Invitation",
        html_content=html,
        text_content=f"Dear Candidate,\n\nYou are eligible for {company_name} ({drive.title}).\nPlease fill the application form: http://localhost:3000/apply/{drive.id}",
    )
    return result


# ─── Real Google Form Webhook ─────────────────────────────────────────────────
webhook_router = APIRouter(prefix="/api/applications", tags=["applications-webhook"])


@webhook_router.post("/google-form-webhook")
def receive_google_form_webhook(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Ingest responses submitted from an external Google Form via Google Apps Script.
    Expects JSON payload with student fields: roll_number, email, drive_id, etc.
    """
    drive_id = int(payload.get("drive_id", 1))
    roll = payload.get("roll_number", "").strip()
    email = payload.get("email", "").strip()

    student = None
    if roll:
        student = db.query(Student).filter(Student.roll_number == roll).first()
    if not student and email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            student = db.query(Student).filter(Student.user_id == user.id).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate with roll number '{roll}' or email '{email}' not found in college registry.",
        )

    # Check for existing application
    app = db.query(Application).filter(
        Application.drive_id == drive_id,
        Application.student_id == student.id,
    ).first()

    if not app:
        app = Application(
            drive_id=drive_id,
            student_id=student.id,
            status="submitted",
        )
        db.add(app)
    else:
        app.status = "submitted"

    db.commit()

    return {
        "success": True,
        "message": f"Google Form submission successfully recorded for {student.user.name} ({student.roll_number}) in Drive #{drive_id}",
        "application_id": app.id,
    }
