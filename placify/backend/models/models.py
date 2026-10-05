"""All SQLAlchemy models for Placify."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from core.database import Base
import enum


class UserRole(str, enum.Enum):
    tpo = "tpo"
    student = "student"
    hr = "hr"
    faculty = "faculty"


class DriveStatus(str, enum.Enum):
    created = "created"
    eligibility = "eligibility"
    applications_open = "applications_open"
    applications_closed = "applications_closed"
    assessment = "assessment"
    shortlisting = "shortlisting"
    scheduling = "scheduling"
    scheduled = "scheduled"
    completed = "completed"
    paused = "paused"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    submitted = "submitted"
    under_review = "under_review"
    shortlisted = "shortlisted"
    rejected = "rejected"
    interview_scheduled = "interview_scheduled"
    opted_out = "opted_out"


# ─── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("Student", back_populates="user", uselist=False)


# ─── Student ───────────────────────────────────────────────────────────────────
class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    branch = Column(String, nullable=False)          # CSE, IT, ECE, EEE, MECH, CIVIL
    cgpa = Column(Float, nullable=False)
    tenth_percentage = Column(Float, nullable=False)
    twelfth_percentage = Column(Float, nullable=False)
    active_backlogs = Column(Integer, default=0)
    total_backlogs = Column(Integer, default=0)
    year_of_graduation = Column(Integer, nullable=False)
    skills = Column(JSON, default=list)              # ["Python", "ML", ...]
    phone = Column(String)
    gender = Column(String)
    father_name = Column(String)
    personal_email = Column(String)
    dob = Column(String)

    user = relationship("User", back_populates="student_profile")
    applications = relationship("Application", back_populates="student")


# ─── Company ───────────────────────────────────────────────────────────────────
class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String)
    website = Column(String)
    contact_email = Column(String)
    contact_name = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    drives = relationship("Drive", back_populates="company")


# ─── Placement Drive ───────────────────────────────────────────────────────────
class Drive(Base):
    __tablename__ = "drives"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String, nullable=False)           # "SDE Intern 2025"
    jd_text = Column(Text)                           # Raw job description
    role = Column(String)
    package_lpa = Column(Float)
    location = Column(String)

    # Eligibility criteria (extracted by Company Agent)
    min_cgpa = Column(Float, default=6.0)
    allowed_branches = Column(JSON, default=list)    # ["CSE","IT","ECE"]
    max_active_backlogs = Column(Integer, default=0)
    max_total_backlogs = Column(Integer, default=0)
    min_tenth = Column(Float, default=60.0)
    min_twelfth = Column(Float, default=60.0)
    required_skills = Column(JSON, default=list)

    # Drive state
    status = Column(String, default="created")
    application_deadline = Column(DateTime)
    assessment_date = Column(DateTime)
    interview_date = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Stats (updated by agents)
    shortlist_quota = Column(Integer, default=25)  # Target shortlist count decided by company
    total_eligible = Column(Integer, default=0)
    total_applied = Column(Integer, default=0)
    total_shortlisted = Column(Integer, default=0)

    company = relationship("Company", back_populates="drives")
    applications = relationship("Application", back_populates="drive")
    agent_logs = relationship("AgentLog", back_populates="drive")
    schedule_slots = relationship("ScheduleSlot", back_populates="drive")


# ─── Application ───────────────────────────────────────────────────────────────
class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    drive_id = Column(Integer, ForeignKey("drives.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    status = Column(String, default="pending")
    form_data = Column(JSON, default=dict)           # Student's form submission
    assessment_score = Column(Float)
    rank = Column(Integer)                           # After shortlisting
    notes = Column(Text)
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    drive = relationship("Drive", back_populates="applications")
    student = relationship("Student", back_populates="applications")
    schedule_slot = relationship("ScheduleSlot", back_populates="application", uselist=False)


# ─── Interview Schedule Slot ───────────────────────────────────────────────────
class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"
    id = Column(Integer, primary_key=True, index=True)
    drive_id = Column(Integer, ForeignKey("drives.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    slot_time = Column(DateTime, nullable=False)
    room = Column(String)
    panel = Column(String)
    duration_minutes = Column(Integer, default=30)
    confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    drive = relationship("Drive", back_populates="schedule_slots")
    application = relationship("Application", back_populates="schedule_slot")


# ─── Agent Log ─────────────────────────────────────────────────────────────────
class AgentLog(Base):
    __tablename__ = "agent_logs"
    id = Column(Integer, primary_key=True, index=True)
    drive_id = Column(Integer, ForeignKey("drives.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)   # thinking | action | complete | error
    message = Column(Text, nullable=False)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    drive = relationship("Drive", back_populates="agent_logs")


# ─── Notification ──────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    drive_id = Column(Integer, ForeignKey("drives.id"))
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="info")  # info | success | warning | error
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
