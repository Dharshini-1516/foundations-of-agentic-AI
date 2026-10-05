"""
Seed script — generates 500 realistic students, 6 companies, 3 placement drives.
Batch: 2026
Student Email Format: 231501153@edu.in
Admin User: TPO 1 (tpo@college.edu / tpo123)
Run once: python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import engine, SessionLocal, Base
from core.security import hash_password
from models.models import User, Student, Company, Drive, Notification, Application, ScheduleSlot, AgentLog
import models.models  # ensure all models are registered

import random
from datetime import datetime, timedelta
from faker import Faker

# Deterministic seed so every student name, CGPA, and roll number is 100% consistent across all pages
random.seed(42)
Faker.seed(42)
fake = Faker("en_IN")

BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]
BRANCH_WEIGHTS = [30, 20, 20, 10, 12, 8]  # % distribution
SKILLS_POOL = [
    ["Python", "Machine Learning", "SQL", "TensorFlow"],
    ["Java", "Spring Boot", "MySQL", "REST API"],
    ["JavaScript", "React", "Node.js", "MongoDB"],
    ["C++", "Data Structures", "Algorithms", "System Design"],
    ["Python", "Django", "PostgreSQL", "Docker"],
    ["Embedded C", "MATLAB", "PCB Design"],
    ["AutoCAD", "SolidWorks", "Project Management"],
    ["SQL", "Power BI", "Excel", "Data Analysis"],
]

def seed_all():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("Clearing existing data...")
    db.query(ScheduleSlot).delete()
    db.query(Application).delete()
    db.query(AgentLog).delete()
    db.query(Notification).delete()
    db.query(Student).delete()
    db.query(User).delete()
    db.query(Drive).delete()
    db.query(Company).delete()
    db.commit()

    # ── TPO / Admin Users ──────────────────────────────────────────────────
    print("Creating admin user...")
    tpo = User(name="TPO 1", email="tpo@college.edu",
               password_hash=hash_password("tpo123"), role="tpo")
    faculty1 = User(name="Prof. Ramesh Kumar", email="faculty@college.edu",
                    password_hash=hash_password("faculty123"), role="faculty")
    db.add_all([tpo, faculty1])
    db.commit()
    print("  TPO: TPO 1 (tpo@college.edu / tpo123)")
    print("  Faculty: Prof. Ramesh Kumar (faculty@college.edu / faculty123)")

    # ── Companies ──────────────────────────────────────────────────────────
    print("Creating companies...")
    companies_data = [
        {
            "name": "TechCorp Solutions",
            "industry": "Software",
            "contact_email": "hr@techcorp.com",
            "contact_name": "Anjali Mehta",
            "description": "Leading software solutions company with 5000+ employees across India.",
        },
        {
            "name": "DataSpark Analytics",
            "industry": "Data & AI",
            "contact_email": "talent@dataspark.io",
            "contact_name": "Vikram Nair",
            "description": "AI-first analytics company. Building the future of data insights.",
        },
        {
            "name": "InfraCloud Systems",
            "industry": "Cloud Infrastructure",
            "contact_email": "careers@infracloud.com",
            "contact_name": "Sneha Reddy",
            "description": "Cloud infrastructure and DevOps specialists.",
        },
        {
            "name": "FinEdge Technologies",
            "industry": "Fintech",
            "contact_email": "hr@finedge.in",
            "contact_name": "Arjun Pillai",
            "description": "Next-gen fintech platform disrupting digital payments.",
        },
        {
            "name": "BuildRight Engineering",
            "industry": "Core Engineering",
            "contact_email": "recruitment@buildright.com",
            "contact_name": "Meera Iyer",
            "description": "Civil and mechanical engineering projects across South India.",
        },
        {
            "name": "Quantum Embedded",
            "industry": "Electronics",
            "contact_email": "jobs@quantumembedded.com",
            "contact_name": "Suresh Balasubramaniam",
            "description": "Embedded systems and IoT solutions for automotive and industrial.",
        },
    ]
    companies = []
    for cd in companies_data:
        c = Company(**cd)
        db.add(c); companies.append(c)
    db.commit()
    print(f"  Created {len(companies)} companies")

    # ── HR Users ───────────────────────────────────────────────────────────
    hr_users = []
    for c in companies:
        hr = User(name=f"HR - {c.name}", email=f"hr_{c.id}@placify.demo",
                  password_hash=hash_password("hr123"), role="hr")
        db.add(hr); hr_users.append(hr)
    db.commit()
    print(f"  HR users: hr_1@placify.demo ... hr_6@placify.demo / hr123")

    # ── Students (500) ─────────────────────────────────────────────────────
    print("Creating 500 students with alphabetical roll numbers (231501xxx@edu.in)...")
    student_users = []
    student_pwd_hash = hash_password("student123")

    raw_candidates = []
    for _ in range(500):
        branch = random.choices(BRANCHES, weights=BRANCH_WEIGHTS)[0]
        cgpa = round(random.gauss(7.4, 0.95), 2)
        cgpa = max(5.2, min(9.95, cgpa))

        if cgpa >= 8.0:
            active_bl = 0
            total_bl = 0
            tenth = round(min(99.5, max(85.0, random.gauss(92, 4))), 1)
            twelfth = round(min(99.5, max(84.0, random.gauss(90, 4))), 1)
        elif cgpa >= 7.0:
            active_bl = 0
            total_bl = 1 if random.random() < 0.05 else 0
            tenth = round(min(96.0, max(75.0, random.gauss(84, 5))), 1)
            twelfth = round(min(95.0, max(73.0, random.gauss(81, 5))), 1)
        elif cgpa >= 6.2:
            active_bl = random.choices([0, 1], weights=[88, 12])[0]
            total_bl = active_bl + (1 if random.random() < 0.15 else 0)
            tenth = round(min(90.0, max(62.0, random.gauss(77, 6))), 1)
            twelfth = round(min(88.0, max(60.0, random.gauss(73, 6))), 1)
        else:
            active_bl = random.choices([0, 1, 2], weights=[45, 40, 15])[0]
            total_bl = active_bl + random.choices([0, 1, 2], weights=[55, 30, 15])[0]
            tenth = round(min(82.0, max(55.0, random.gauss(68, 7))), 1)
            twelfth = round(min(80.0, max(52.0, random.gauss(65, 7))), 1)

        raw_candidates.append({
            "name": fake.name(),
            "branch": branch,
            "cgpa": cgpa,
            "tenth": tenth,
            "twelfth": twelfth,
            "active_bl": active_bl,
            "total_bl": total_bl,
            "skills": random.choice(SKILLS_POOL),
            "phone": fake.phone_number()[:15],
            "gender": random.choice(["Male", "Female"]),
        })

    # Sort candidates strictly in alphabetical order of their name
    raw_candidates.sort(key=lambda x: x["name"].lower())

    # Assign sequential roll numbers in strict alphabetical order
    for i, c in enumerate(raw_candidates):
        roll = f"231501{i+1:03d}"
        email = f"{roll}@edu.in"

        u = User(name=c["name"], email=email, password_hash=student_pwd_hash, role="student")
        db.add(u)
        db.flush()
        s = Student(
            user_id=u.id,
            roll_number=roll,
            branch=c["branch"],
            cgpa=c["cgpa"],
            tenth_percentage=c["tenth"],
            twelfth_percentage=c["twelfth"],
            active_backlogs=c["active_bl"],
            total_backlogs=c["total_bl"],
            year_of_graduation=2026,
            skills=c["skills"],
            phone=c["phone"],
            gender=c["gender"],
        )
        db.add(s)
        student_users.append((u, s))
        if (i + 1) % 100 == 0:
            db.commit()
            print(f"  {i+1}/500 students created in alphabetical order...")
    db.commit()
    print("  500 students created with alphabetical roll numbers (e.g. 231501001@edu.in / student123)")

    # ── Placement Drives (2026 Batch) ───────────────────────────────────────
    print("Creating placement drives for 2026 batch...")
    drives_data = [
        {
            "company": companies[0],  # TechCorp
            "title": "Software Development Engineer 2026",
            "jd_text": """
TechCorp Solutions is hiring SDE 2026 batch.
Role: Software Development Engineer
Package: 12 LPA
Location: Bangalore / Hyderabad

Eligibility:
- Branches: CSE, IT, ECE
- CGPA: 7.0 and above
- No active backlogs
- 10th: 70%, 12th: 70%

Required Skills: Python, Data Structures, Algorithms, SQL
Nice to have: Java, System Design, AWS
            """,
            "min_cgpa": 7.0, "allowed_branches": ["CSE", "IT", "ECE"],
            "max_active_backlogs": 0, "min_tenth": 70.0, "min_twelfth": 70.0,
            "package_lpa": 12.0, "location": "Bangalore / Hyderabad",
        },
        {
            "company": companies[1],  # DataSpark
            "title": "ML Engineer Intern 2026",
            "jd_text": """
DataSpark Analytics — ML Engineer Intern 2026
Package: 8 LPA (full time conversion offer)
Location: Chennai

Eligibility:
- Branches: CSE, IT
- CGPA: 7.5 or above
- No backlogs (0 active, 0 total)
- 10th: 75%, 12th: 75%

Skills required: Python, Machine Learning, SQL, TensorFlow/PyTorch
            """,
            "min_cgpa": 7.5, "allowed_branches": ["CSE", "IT"],
            "max_active_backlogs": 0, "min_tenth": 75.0, "min_twelfth": 75.0,
            "package_lpa": 8.0, "location": "Chennai",
        },
        {
            "company": companies[5],  # Quantum Embedded
            "title": "Embedded Systems Engineer 2026",
            "jd_text": """
Quantum Embedded — Embedded Systems Engineer 2026
Package: 6 LPA
Location: Coimbatore

Eligibility:
- Branches: ECE, EEE, CSE
- CGPA: 6.5 and above
- Maximum 2 active backlogs allowed
- 10th: 60%, 12th: 60%

Skills: Embedded C, MATLAB, Microcontrollers
            """,
            "min_cgpa": 6.5, "allowed_branches": ["ECE", "EEE", "CSE"],
            "max_active_backlogs": 2, "min_tenth": 60.0, "min_twelfth": 60.0,
            "package_lpa": 6.0, "location": "Coimbatore",
        },
    ]

    for dd in drives_data:
        d = Drive(
            company_id=dd["company"].id,
            title=dd["title"],
            jd_text=dd["jd_text"],
            role=dd["title"].split(" ")[0] + " " + dd["title"].split(" ")[1],
            package_lpa=dd["package_lpa"],
            location=dd["location"],
            min_cgpa=dd["min_cgpa"],
            allowed_branches=dd["allowed_branches"],
            max_active_backlogs=dd["max_active_backlogs"],
            min_tenth=dd["min_tenth"],
            min_twelfth=dd["min_twelfth"],
            status="created",
            created_by=tpo.id,
        )
        db.add(d)
    db.commit()
    print(f"  Created {len(drives_data)} placement drives for 2026 batch")

    db.close()
    print("\n[SUCCESS] Seed complete!")
    print("-" * 50)
    print("Login credentials:")
    print("  TPO:      tpo@college.edu           / tpo123  (Name: TPO 1)")
    print("  Student:  231501153@edu.in          / student123")
    print("  Student:  231501001@edu.in          / student123")
    print("  Faculty:  faculty@college.edu       / faculty123")
    print("  HR:       hr_1@placify.demo         / hr123")
    print("-" * 50)


if __name__ == "__main__":
    seed_all()
