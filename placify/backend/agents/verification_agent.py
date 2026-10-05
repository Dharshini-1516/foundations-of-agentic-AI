"""
Verification Agent — Cross-checks student data for anomalies.
"""
from agents.base_agent import BaseAgent


class VerificationAgent(BaseAgent):
    name = "Verification Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        eligible = state["eligible_students"]

        await self.emit(drive_id, "thinking",
            f"Starting verification of {len(eligible)} eligible students...")
        await self.emit(drive_id, "action",
            "Cross-checking CGPA and academic records against authorised database...")

        from models.models import Student
        verified = []
        flagged = 0

        for s_data in eligible:
            db_student = self.db.query(Student).filter(Student.id == s_data["student_id"]).first()
            if not db_student:
                flagged += 1
                continue
            # Verify: CGPA matches (within 0.05 tolerance)
            if abs(db_student.cgpa - s_data["cgpa"]) > 0.05:
                flagged += 1
                continue
            verified.append(s_data)

        await self.emit(drive_id, "action",
            f"Verification complete: {len(verified)} verified, {flagged} flagged for discrepancy.",
            {"verified": len(verified), "flagged": flagged})
        await self.emit(drive_id, "complete",
            f"{len(verified)} students cleared verification. Proceeding to application phase.",
            {"verified_count": len(verified)})

        return {**state, "verified_students": verified}
