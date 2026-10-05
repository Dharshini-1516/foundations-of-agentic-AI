"""
Company Agent — Parses the JD and extracts structured eligibility criteria.
No LLM needed: uses regex + keyword extraction (very reliable for structured JDs).
"""
import re
from agents.base_agent import BaseAgent


class CompanyAgent(BaseAgent):
    name = "Company Agent"

    async def run(self, state: dict) -> dict:
        drive_id = state["drive_id"]

        await self.emit(drive_id, "thinking",
            f"Reading job description for {state['company_name']}...")
        await self.emit(drive_id, "action",
            "Extracting eligibility criteria from JD text...")

        criteria = self._extract_criteria(state["jd_text"], state["company_name"])

        await self.emit(drive_id, "action",
            f"Identified role: {criteria.get('role', 'N/A')} | "
            f"Package: ₹{criteria.get('package_lpa', 'N/A')} LPA",
            {"criteria": criteria})
        await self.emit(drive_id, "action",
            f"Eligibility: CGPA ≥ {criteria['min_cgpa']} | "
            f"Branches: {', '.join(criteria['allowed_branches'])} | "
            f"Max backlogs: {criteria['max_active_backlogs']}")

        # Update the Drive record with extracted criteria
        try:
            from models.models import Drive
            drive = self.db.query(Drive).filter(Drive.id == drive_id).first()
            if drive:
                drive.min_cgpa = criteria["min_cgpa"]
                drive.allowed_branches = criteria["allowed_branches"]
                drive.max_active_backlogs = criteria["max_active_backlogs"]
                drive.max_total_backlogs = criteria.get("max_total_backlogs", 0)
                drive.min_tenth = criteria.get("min_tenth", 60.0)
                drive.min_twelfth = criteria.get("min_twelfth", 60.0)
                drive.required_skills = criteria.get("required_skills", [])
                drive.role = criteria.get("role", "")
                drive.package_lpa = criteria.get("package_lpa")
                drive.status = "eligibility"
                self.db.commit()
        except Exception as e:
            pass

        await self.emit(drive_id, "complete",
            "Criteria extracted and saved. Handing off to Eligibility Agent.",
            {"criteria": criteria})

        return {**state, "criteria": criteria, "status": "eligibility"}

    def _extract_criteria(self, jd: str, company_name: str) -> dict:
        """Rule-based JD parser — extracts structured criteria from text."""
        jd_lower = jd.lower()

        # CGPA
        cgpa = 6.5
        m = re.search(r'cgpa[^\d]*(\d+\.?\d*)', jd_lower)
        if m: cgpa = float(m.group(1))
        m = re.search(r'gpa[^\d]*(\d+\.?\d*)', jd_lower)
        if m and not re.search(r'cgpa', jd_lower): cgpa = float(m.group(1))

        # Branches
        branch_map = {
            "cse": "CSE", "computer science": "CSE",
            "it": "IT", "information technology": "IT",
            "ece": "ECE", "electronics": "ECE",
            "eee": "EEE", "electrical": "EEE",
            "mech": "MECH", "mechanical": "MECH",
            "civil": "CIVIL",
        }
        branches = []
        for key, val in branch_map.items():
            if key in jd_lower and val not in branches:
                branches.append(val)
        if not branches:
            branches = ["CSE", "IT", "ECE"]  # default

        # Backlogs
        backlogs = 0
        if "no backlog" in jd_lower or "no arrear" in jd_lower:
            backlogs = 0
        else:
            m = re.search(r'(\d+)\s*(?:active\s*)?backlog', jd_lower)
            if m: backlogs = int(m.group(1))

        # 10th/12th
        tenth = 60.0
        m = re.search(r'10th[^\d]*(\d+)', jd_lower)
        if m: tenth = float(m.group(1))

        twelfth = 60.0
        m = re.search(r'12th[^\d]*(\d+)', jd_lower)
        if m: twelfth = float(m.group(1))

        # Role
        role_keywords = ["software engineer", "data engineer", "ml engineer",
                         "software developer", "analyst", "associate", "intern",
                         "sde", "backend", "frontend", "fullstack"]
        role = "Software Engineer"
        for kw in role_keywords:
            if kw in jd_lower:
                role = kw.title()
                break

        # Package
        pkg = None
        m = re.search(r'(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?\s*per\s*annum|lakh)', jd_lower)
        if m: pkg = float(m.group(1))

        # Skills
        skill_keywords = ["python", "java", "c++", "javascript", "react", "node",
                          "sql", "machine learning", "ml", "data structures",
                          "algorithms", "aws", "docker", "kubernetes"]
        skills = [s for s in skill_keywords if s in jd_lower]

        return {
            "min_cgpa": cgpa,
            "allowed_branches": branches,
            "max_active_backlogs": backlogs,
            "max_total_backlogs": backlogs,
            "min_tenth": tenth,
            "min_twelfth": twelfth,
            "required_skills": skills[:5],
            "role": role,
            "package_lpa": pkg,
        }
