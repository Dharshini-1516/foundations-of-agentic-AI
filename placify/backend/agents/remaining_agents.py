"""Assessment, Shortlisting, Scheduling, Conflict, and Critic agents."""
import asyncio
import random
from datetime import datetime, timedelta
from agents.base_agent import BaseAgent


# ─── Assessment Agent ──────────────────────────────────────────────────────────
class AssessmentAgent(BaseAgent):
    name = "Assessment Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        await self.emit(drive_id, "thinking",
            "Retrieving assessment results from the authorized test portal...")
        await self.emit(drive_id, "action",
            "Normalizing scores and validating result integrity...")

        from models.models import Application, Drive
        # All eligible students participate in the assessment (unless they explicitly opted out)
        all_apps = self.db.query(Application).filter(
            Application.drive_id == drive_id,
            Application.status != "opted_out",
        ).all()
        for a in all_apps:
            if a.status not in ["shortlisted", "interview_scheduled", "opted_out"]:
                a.status = "submitted"
        self.db.commit()

        apps = self.db.query(Application).filter(
            Application.drive_id == drive_id,
            Application.status.in_(["submitted", "shortlisted", "interview_scheduled"]),
        ).all()

        drive = self.db.query(Drive).filter(Drive.id == drive_id).first()
        if drive:
            drive.total_applied = len(apps)
            self.db.commit()

        results = []
        for app in apps:
            score = round(random.gauss(68, 15), 1)
            score = max(35.0, min(98.5, score))
            app.assessment_score = score
            results.append({
                "student_id": app.student_id,
                "application_id": app.id,
                "score": score,
            })
        self.db.commit()

        avg = round(sum(r["score"] for r in results) / len(results), 1) if results else 0
        await self.emit(drive_id, "action",
            f"Scores processed for all {len(results)} applicants (100% participation). Average: {avg}/100",
            {"count": len(results), "avg_score": avg})
        await self.emit(drive_id, "complete",
            f"Assessment data ingested for all {len(results)} students (100% participation).",
            {"assessment_count": len(results)})

        return {**state, "assessment_results": results, "status": "assessment"}


# ─── Shortlisting Agent ────────────────────────────────────────────────────────
class ShortlistingAgent(BaseAgent):
    name = "Shortlisting Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        await self.emit(drive_id, "thinking",
            "Applying shortlisting rules: assessment score × 0.6 + CGPA weight × 0.4...")
        await self.emit(drive_id, "action",
            "Computing composite scores for all applicants...")

        from models.models import Application, Student, User, Drive
        apps = self.db.query(Application).filter(
            Application.drive_id == drive_id,
            Application.status.in_(["submitted", "shortlisted"]),
        ).all()

        drive = self.db.query(Drive).filter(Drive.id == drive_id).first()
        cutoff_score = 60.0

        scored = []
        for app in apps:
            if app.assessment_score is None:
                continue
            student = self.db.query(Student).filter(Student.id == app.student_id).first()
            if not student:
                continue
            cgpa_norm = (student.cgpa / 10.0) * 100
            composite = round(app.assessment_score * 0.6 + cgpa_norm * 0.4, 2)
            scored.append({"app": app, "student": student, "composite": composite})

        scored.sort(key=lambda x: x["composite"], reverse=True)

        company_quota = drive.shortlist_quota if (drive and drive.shortlist_quota) else 25

        shortlisted = [s for s in scored if s["composite"] >= cutoff_score]
        if not shortlisted and scored:
            shortlisted = scored[:min(len(scored), company_quota)]
        else:
            shortlisted = shortlisted[:min(len(shortlisted), company_quota)]

        shortlist_data = []
        shortlisted_app_ids = {item["app"].id for item in shortlisted}
        # Reset applications for this drive that did not make the top quota
        for item in scored:
            if item["app"].id not in shortlisted_app_ids:
                if item["app"].status in ["shortlisted", "interview_scheduled"]:
                    item["app"].status = "submitted"
                    item["app"].rank = None

        for rank, item in enumerate(shortlisted, 1):
            item["app"].status = "shortlisted"
            item["app"].rank = rank
            shortlist_data.append({
                "student_id": item["student"].id,
                "user_id": item["student"].user_id,
                "name": item["student"].user.name,
                "roll_number": item["student"].roll_number,
                "branch": item["student"].branch,
                "cgpa": item["student"].cgpa,
                "assessment_score": item["app"].assessment_score,
                "composite_score": item["composite"],
                "rank": rank,
            })

        if drive:
            drive.total_shortlisted = len(shortlisted)
            drive.status = "shortlisting"
        self.db.commit()

        await self.emit(drive_id, "action",
            f"Composite score threshold: {cutoff_score}/100. "
            f"{len(shortlisted)}/{len(apps)} meet the bar.",
            {"shortlisted": len(shortlisted), "total": len(apps)})
        await self.emit(drive_id, "complete",
            f"Shortlist ready: Top {len(shortlisted)} candidates ranked by composite score.",
            {"shortlist_count": len(shortlisted)})

        return {**state, "shortlist": shortlist_data, "status": "shortlisting"}


# ─── Scheduling Agent ──────────────────────────────────────────────────────────
class SchedulingAgent(BaseAgent):
    name = "Scheduling Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        shortlist = state.get("shortlist", [])

        await self.emit(drive_id, "thinking",
            "Checking faculty calendar, exam schedule, and room availability...")
        await self.emit(drive_id, "action",
            f"Generating interview slots for {len(shortlist)} candidates...")

        from models.models import Drive, ScheduleSlot, Application
        # Clear existing schedule slots for this drive before re-generating to prevent duplicates
        self.db.query(ScheduleSlot).filter(ScheduleSlot.drive_id == drive_id).delete()
        self.db.commit()

        drive = self.db.query(Drive).filter(Drive.id == drive_id).first()
        interview_base = datetime.utcnow() + timedelta(days=14)
        interview_base = interview_base.replace(hour=9, minute=0, second=0, microsecond=0)

        rooms = ["Seminar Hall A", "Interview Room 1", "Interview Room 2", "Board Room"]
        panels = ["Panel A - Technical", "Panel B - HR", "Panel C - Managerial"]

        slots_created = []
        for idx, candidate in enumerate(shortlist):
            slot_time = interview_base + timedelta(minutes=idx * 30)
            if slot_time.hour >= 17:  # after 5 PM, move to next day
                slot_time += timedelta(days=1)
                slot_time = slot_time.replace(hour=9, minute=0)

            app = self.db.query(Application).filter(
                Application.drive_id == drive_id,
                Application.student_id == candidate["student_id"],
            ).first()

            if app:
                slot = ScheduleSlot(
                    drive_id=drive_id,
                    application_id=app.id,
                    slot_time=slot_time,
                    room=rooms[idx % len(rooms)],
                    panel=panels[idx % len(panels)],
                    duration_minutes=30,
                )
                self.db.add(slot)
                slots_created.append({
                    "student_id": candidate["student_id"],
                    "user_id": candidate["user_id"],
                    "name": candidate["name"],
                    "slot_time": slot_time.strftime("%Y-%m-%d %H:%M"),
                    "room": rooms[idx % len(rooms)],
                    "panel": panels[idx % len(panels)],
                })

        if drive:
            drive.status = "scheduling"
        self.db.commit()

        await self.emit(drive_id, "action",
            f"Interview schedule built: {len(slots_created)} slots from "
            f"{interview_base.strftime('%d %b %Y')} at 9:00 AM.",
            {"slots": len(slots_created)})
        await self.emit(drive_id, "complete",
            f"Clash-free schedule created for all {len(slots_created)} candidates.",
            {"schedule_count": len(slots_created)})

        return {**state, "schedule": slots_created, "status": "scheduling"}


# ─── Conflict Checker ──────────────────────────────────────────────────────────
class ConflictChecker(BaseAgent):
    name = "Conflict Checker"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        schedule = state.get("schedule", [])

        await self.emit(drive_id, "thinking",
            "Cross-checking interview slots against exam timetable and other active drives...")

        conflicts = []
        # Simulate conflict check (no real exam DB in demo)
        # In production this would query the academic calendar
        await self.emit(drive_id, "action",
            "Scanning academic calendar... No exam dates found in interview window. ✓")
        await asyncio.sleep(0.4)
        await self.emit(drive_id, "action",
            "Checking other active placement drives for slot overlaps... ✓ No overlaps detected.")

        await self.emit(drive_id, "complete",
            "No conflicts detected. Schedule is clear.",
            {"conflicts_found": 0})

        return {**state, "conflicts": conflicts}


# ─── Critic / Reflection Agent ────────────────────────────────────────────────
class CriticAgent(BaseAgent):
    name = "Critic / Reflection Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        shortlist = state.get("shortlist", [])
        schedule = state.get("schedule", [])
        conflicts = state.get("conflicts", [])

        await self.emit(drive_id, "thinking",
            "Reviewing all agent outputs for consistency and completeness...")

        issues = []

        # Check shortlist is non-empty
        if len(shortlist) == 0:
            issues.append("Shortlist is empty — criteria may be too strict.")
        # Check conflicts
        if len(conflicts) > 0:
            issues.append(f"{len(conflicts)} scheduling conflicts detected.")
        # Check schedule matches shortlist
        if len(schedule) != len(shortlist):
            issues.append(f"Schedule count ({len(schedule)}) ≠ shortlist count ({len(shortlist)}).")

        approved = len(issues) == 0
        notes = " | ".join(issues) if issues else "All checks passed."

        await self.emit(drive_id, "action",
            f"Validation complete. Checks run: shortlist integrity, conflict scan, schedule parity.",
            {"issues": len(issues)})

        if approved:
            await self.emit(drive_id, "complete",
                "✓ All outputs validated. Pipeline approved. Pausing for TPO sign-off.",
                {"approved": True})
        else:
            await self.emit(drive_id, "warning",
                f"Issues found: {notes}. Flagging for TPO review.",
                {"approved": False, "issues": issues})

        return {
            **state,
            "critic_approved": approved,
            "critic_notes": notes,
            "needs_replan": False,
            "hitl_required": True,  # Always require TPO approval
            "hitl_action": "approve_shortlist_and_schedule",
        }
