"""
Eligibility Agent — Queries the student DB and filters eligible candidates.
Pure SQL logic — fast and reliable.
"""
from agents.base_agent import BaseAgent


class EligibilityAgent(BaseAgent):
    name = "Eligibility Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]
        criteria = state["criteria"]

        await self.emit(drive_id, "thinking",
            "Reading eligibility criteria and preparing database query...")
        await self.emit(drive_id, "action",
            f"Filtering {criteria['allowed_branches']} students with CGPA ≥ {criteria['min_cgpa']}...")

        from models.models import Student, User
        query = self.db.query(Student).join(User).filter(User.is_active == True)

        # Apply criteria filters
        query = query.filter(Student.cgpa >= criteria["min_cgpa"])
        if criteria.get("allowed_branches"):
            query = query.filter(Student.branch.in_(criteria["allowed_branches"]))
        if criteria.get("max_active_backlogs", 0) == 0:
            query = query.filter(Student.active_backlogs == 0)
        else:
            query = query.filter(Student.active_backlogs <= criteria["max_active_backlogs"])
        if criteria.get("min_tenth"):
            query = query.filter(Student.tenth_percentage >= criteria["min_tenth"])
        if criteria.get("min_twelfth"):
            query = query.filter(Student.twelfth_percentage >= criteria["min_twelfth"])

        eligible = query.all()

        # Serialize for state
        eligible_data = []
        for s in eligible:
            eligible_data.append({
                "student_id": s.id,
                "user_id": s.user_id,
                "roll_number": s.roll_number,
                "name": s.user.name,
                "email": s.user.email,
                "branch": s.branch,
                "cgpa": s.cgpa,
                "tenth": s.tenth_percentage,
                "twelfth": s.twelfth_percentage,
                "active_backlogs": s.active_backlogs,
                "skills": s.skills or [],
            })

        # Update drive stats
        try:
            from models.models import Drive
            drive = self.db.query(Drive).filter(Drive.id == drive_id).first()
            if drive:
                drive.total_eligible = len(eligible_data)
                drive.status = "eligibility"
                self.db.commit()
        except Exception:
            pass

        await self.emit(drive_id, "action",
            f"Applied all {len(criteria['allowed_branches'])} branch filters + CGPA + backlog rules.",
            {"total_checked": self.db.query(Student).count(), "eligible": len(eligible_data)})

        await self.emit(drive_id, "complete",
            f"Found {len(eligible_data)} eligible students out of {self.db.query(Student).count()} total.",
            {"eligible_count": len(eligible_data)})

        return {**state, "eligible_students": eligible_data}


    async def run_check(self, student_id: int, criteria: dict) -> bool:
        """Check if a specific student is eligible (used for re-checks)."""
        from models.models import Student
        s = self.db.query(Student).filter(Student.id == student_id).first()
        if not s: return False
        if s.cgpa < criteria.get("min_cgpa", 0): return False
        if criteria.get("allowed_branches") and s.branch not in criteria["allowed_branches"]: return False
        if s.active_backlogs > criteria.get("max_active_backlogs", 0): return False
        return True
