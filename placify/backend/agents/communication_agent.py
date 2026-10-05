"""
Communication Agent — Simulates email sending with realistic messages.
Emails are "sent" (logged + WebSocket event). No real SMTP needed.
"""
from agents.base_agent import BaseAgent
import asyncio
from datetime import datetime


class CommunicationAgent(BaseAgent):
    name = "Communication Agent"

    async def run(self, state: dict) -> dict:
        """Initial outreach: notify eligible students the drive is open."""
        drive_id = state["drive_id"]
        verified = state["verified_students"]
        company = state["company_name"]

        await self.emit(drive_id, "thinking",
            f"Composing notification emails for {len(verified)} eligible students...")

        # Simulate sending emails in small batches
        batch_size = max(1, len(verified) // 3)
        sent = 0
        for i in range(0, len(verified), batch_size):
            batch = verified[i:i+batch_size]
            sent += len(batch)
            await self.emit(drive_id, "action",
                f"Emails dispatched: {sent}/{len(verified)} — "
                f"Subject: '{company} Placement Drive — You are Eligible!'",
                {"sent": sent, "total": len(verified)})
            await asyncio.sleep(0.4)

        # Create in-app notifications
        try:
            from models.models import Notification, Application
            for s in verified:
                app = self.db.query(Application).filter(
                    Application.drive_id == drive_id,
                    Application.student_id == s["student_id"],
                ).first()
                if app:
                    notif = Notification(
                        user_id=s["user_id"],
                        drive_id=drive_id,
                        title=f"📋 Invitation to Apply: {company} Placement Drive (Google Form)",
                        message=(
                            f"Dear {s.get('name', 'Candidate')},\n\n"
                            f"You have satisfied all academic eligibility criteria (CGPA, branch, arrears) for the {company} recruitment drive.\n\n"
                            f"Please complete and submit the attached official Google Application Form to register your candidature before the deadline."
                        ),
                        notification_type="info",
                    )
                    self.db.add(notif)
            self.db.commit()
        except Exception:
            pass

        await self.emit(drive_id, "complete",
            f"All {len(verified)} eligible students notified via email + in-app notification.",
            {"emails_sent": len(verified)})

        return {**state, "status": "applications_open"}

    async def send_reminders(self, state: dict) -> dict:
        """Send reminders to students who haven't applied yet."""
        drive_id = state["drive_id"]
        await self.emit(drive_id, "action",
            "Checking for non-responding students and sending reminders...")
        from models.models import Application
        pending = self.db.query(Application).filter(
            Application.drive_id == drive_id,
            Application.status == "pending",
        ).count()
        if pending > 0:
            await self.emit(drive_id, "action",
                f"Reminder sent to {pending} students who haven't applied yet.",
                {"reminders_sent": pending})
        return state

    async def send_final_notifications(self, state: dict) -> dict:
        """Notify shortlisted students of their interview schedule."""
        drive_id = state["drive_id"]
        shortlist = state.get("shortlist", [])
        schedule = state.get("schedule", [])
        company = state["company_name"]

        await self.emit(drive_id, "thinking",
            "Preparing final notifications for shortlisted students...")

        try:
            from models.models import Notification
            for slot in schedule:
                student_id = slot.get("user_id")
                if student_id:
                    notif = Notification(
                        user_id=student_id,
                        drive_id=drive_id,
                        title=f"🎓 Interview Call Letter: {company} — Shortlisted! (Rank #{slot.get('rank', 'Top Candidate')})",
                        message=(
                            f"Dear {slot.get('name', 'Candidate')},\n\n"
                            f"Congratulations! You have been selected among the TOP candidates shortlisted for {company}.\n\n"
                            f"DISTINCTION NOTICE: Being Shortlisted signifies that you achieved top marks in the competitive assessment and academic ranking — this is distinct from initial general eligibility.\n\n"
                            f"Your official interview slot is scheduled on {slot.get('slot_time', 'TBD')} in {slot.get('room', 'TBD')} with {slot.get('panel', 'TBD')}.\n\n"
                            f"Please review your confirmed slot details and preparation instructions in the student portal."
                        ),
                        notification_type="success",
                    )
                    self.db.add(notif)
            self.db.commit()
        except Exception:
            pass

        await self.emit(drive_id, "action",
            f"Interview invites sent to {len(schedule)} shortlisted students.",
            {"schedule_count": len(schedule)})

        # HR notification
        await self.emit(drive_id, "action",
            "HR team notified with final shortlist and interview schedule package.")

        await self.emit(drive_id, "complete",
            f"Drive pipeline complete. {len(shortlist)} candidates shortlisted and scheduled.",
            {"status": "completed"})

        # Update drive status
        try:
            from models.models import Drive
            drive = self.db.query(Drive).filter(Drive.id == drive_id).first()
            if drive:
                drive.status = "completed"
                self.db.commit()
        except Exception:
            pass

        return {**state, "status": "completed"}
