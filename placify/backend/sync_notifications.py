from core.database import SessionLocal
from models.models import Notification, User, Drive, Application, Student, ScheduleSlot

def sync_notifications():
    db = SessionLocal()
    slots = db.query(ScheduleSlot).all()
    created = 0
    for s in slots:
        app = s.application
        if not app or not app.student:
            continue
        student = app.student
        drive = db.query(Drive).filter(Drive.id == s.drive_id).first()
        company_name = drive.company.name if drive and drive.company else "Recruitment Partner"
        role_name = drive.role if drive and drive.role else "Software Engineer"
        
        # Check if call letter already exists
        existing = db.query(Notification).filter(
            Notification.user_id == student.user_id,
            Notification.drive_id == s.drive_id,
            Notification.title.like("%Call Letter%")
        ).first()
        
        if not existing:
            slot_str = s.slot_time.strftime("%d %b %Y at %I:%M %p") if s.slot_time else "TBD"
            rank_val = app.rank if app.rank else 1
            notif = Notification(
                user_id=student.user_id,
                drive_id=s.drive_id,
                title=f"🎓 Interview Call Letter: {company_name} — Shortlisted! (Rank #{rank_val} - Top Candidate)",
                message=(
                    f"Dear {student.user.name},\n\n"
                    f"Congratulations! Based on your high composite performance in the online assessment and academic evaluation, "
                    f"you have been selected among the TOP candidates shortlisted for {company_name} ({role_name}).\n\n"
                    f"DISTINCTION NOTICE: Being Shortlisted signifies that you are in the top ranked candidates selected for interviews "
                    f"— this is distinct from initial general eligibility. You have cleared the competitive cutoff.\n\n"
                    f"Your official interview slot is scheduled on {slot_str} in {s.room or 'Seminar Hall A'} with {s.panel or 'Panel A - Technical'}.\n\n"
                    f"Please review your confirmed interview pass details in the student portal."
                ),
                notification_type="success",
            )
            db.add(notif)
            created += 1

    # Also make sure all drives have a clean invitation notification for all eligible applicants
    apps = db.query(Application).all()
    invites_created = 0
    for a in apps:
        if not a.student:
            continue
        existing_invite = db.query(Notification).filter(
            Notification.user_id == a.student.user_id,
            Notification.drive_id == a.drive_id,
            Notification.title.like("%Drive%")
        ).first()
        if not existing_invite:
            drive = db.query(Drive).filter(Drive.id == a.drive_id).first()
            company_name = drive.company.name if drive and drive.company else "Recruitment Partner"
            inv_notif = Notification(
                user_id=a.student.user_id,
                drive_id=a.drive_id,
                title=f"📋 Invitation to Apply: {company_name} Placement Drive (Google Form)",
                message=(
                    f"Dear {a.student.user.name},\n\n"
                    f"You have satisfied all academic eligibility criteria for {company_name} ({drive.role if drive else 'Software Engineer'}). "
                    f"Please complete and submit the official Google Application Form to register your profile and preferences before the deadline."
                ),
                notification_type="info",
            )
            db.add(inv_notif)
            invites_created += 1

    db.commit()
    db.close()
    print(f"Created {created} Call Letter notifications and {invites_created} Invitation notifications.")

if __name__ == "__main__":
    sync_notifications()
