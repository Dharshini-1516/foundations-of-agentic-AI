"""
Placify LangGraph Orchestrator
Manages the full placement drive pipeline using a stateful graph.
Each node is one specialized agent.
"""
from typing import TypedDict, List, Optional, Any
from langgraph.graph import StateGraph, END
import asyncio
from datetime import datetime


# ─── Shared Drive State ────────────────────────────────────────────────────────
class DriveState(TypedDict):
    drive_id: int
    company_name: str
    jd_text: str

    # Extracted by Company Agent
    criteria: dict                   # {min_cgpa, branches, backlogs, skills, ...}

    # Populated by Eligibility Agent
    eligible_students: List[dict]

    # After Verification Agent
    verified_students: List[dict]

    # Applications tracking
    applications_open: bool
    applications: List[dict]

    # After Assessment Agent
    assessment_results: List[dict]

    # Shortlist
    shortlist: List[dict]

    # Schedule
    schedule: List[dict]

    # Conflict checker findings
    conflicts: List[dict]

    # Critic feedback
    critic_approved: bool
    critic_notes: str

    # Pipeline control
    status: str
    agent_logs: List[dict]
    needs_replan: bool
    replan_from: Optional[str]
    hitl_required: bool
    hitl_action: Optional[str]
    error: Optional[str]


def make_initial_state(drive_id: int, company_name: str, jd_text: str) -> DriveState:
    return DriveState(
        drive_id=drive_id,
        company_name=company_name,
        jd_text=jd_text,
        criteria={},
        eligible_students=[],
        verified_students=[],
        applications_open=False,
        applications=[],
        assessment_results=[],
        shortlist=[],
        schedule=[],
        conflicts=[],
        critic_approved=False,
        critic_notes="",
        status="started",
        agent_logs=[],
        needs_replan=False,
        replan_from=None,
        hitl_required=False,
        hitl_action=None,
        error=None,
    )


def build_graph(db_session, event_broadcaster):
    """
    Build and compile the LangGraph pipeline.
    event_broadcaster: async function(drive_id, event_dict) → broadcasts to WebSocket
    """
    from agents.company_agent import CompanyAgent
    from agents.eligibility_agent import EligibilityAgent
    from agents.verification_agent import VerificationAgent
    from agents.application_agent import ApplicationAgent
    from agents.communication_agent import CommunicationAgent
    from agents.assessment_agent import AssessmentAgent
    from agents.shortlisting_agent import ShortlistingAgent
    from agents.scheduling_agent import SchedulingAgent
    from agents.conflict_checker import ConflictChecker
    from agents.critic_agent import CriticAgent

    company_agent      = CompanyAgent(db_session, event_broadcaster)
    eligibility_agent  = EligibilityAgent(db_session, event_broadcaster)
    verification_agent = VerificationAgent(db_session, event_broadcaster)
    application_agent  = ApplicationAgent(db_session, event_broadcaster)
    communication_agent = CommunicationAgent(db_session, event_broadcaster)
    assessment_agent   = AssessmentAgent(db_session, event_broadcaster)
    shortlisting_agent = ShortlistingAgent(db_session, event_broadcaster)
    scheduling_agent   = SchedulingAgent(db_session, event_broadcaster)
    conflict_checker   = ConflictChecker(db_session, event_broadcaster)
    critic_agent       = CriticAgent(db_session, event_broadcaster)

    def route_after_critic(state: DriveState) -> str:
        if state["needs_replan"] and state["replan_from"]:
            return state["replan_from"]
        if state["hitl_required"]:
            return "hitl_pause"
        return "send_final_notifications"

    async def hitl_pause(state: DriveState) -> DriveState:
        """Pipeline pauses here — TPO must approve via API."""
        from models.models import Drive
        drive = db_session.query(Drive).filter(Drive.id == state["drive_id"]).first()
        if drive:
            drive.status = "awaiting_tpo_approval"
            db_session.commit()
        await event_broadcaster(state["drive_id"], {
            "agent": "Orchestrator",
            "type": "complete",
            "message": "AI Pipeline successfully completed all stages. Paused at Human-In-The-Loop gate awaiting TPO authorization.",
            "data": {"status": "awaiting_tpo_approval"}
        })
        return {**state, "status": "awaiting_tpo_approval"}

    graph = StateGraph(DriveState)

    # Register all nodes
    graph.add_node("company_agent",       company_agent.run)
    graph.add_node("eligibility_agent",   eligibility_agent.run)
    graph.add_node("verification_agent",  verification_agent.run)
    graph.add_node("application_agent",   application_agent.run)
    graph.add_node("communication_agent", communication_agent.run)
    graph.add_node("assessment_agent",    assessment_agent.run)
    graph.add_node("shortlisting_agent",  shortlisting_agent.run)
    graph.add_node("scheduling_agent",    scheduling_agent.run)
    graph.add_node("conflict_checker",    conflict_checker.run)
    graph.add_node("critic_agent",        critic_agent.run)
    graph.add_node("hitl_pause",          hitl_pause)
    graph.add_node("send_final_notifications", communication_agent.send_final_notifications)

    # Linear edges
    graph.set_entry_point("company_agent")
    graph.add_edge("company_agent",       "eligibility_agent")
    graph.add_edge("eligibility_agent",   "verification_agent")
    graph.add_edge("verification_agent",  "application_agent")
    graph.add_edge("application_agent",   "communication_agent")
    graph.add_edge("communication_agent", "assessment_agent")
    graph.add_edge("assessment_agent",    "shortlisting_agent")
    graph.add_edge("shortlisting_agent",  "scheduling_agent")
    graph.add_edge("scheduling_agent",    "conflict_checker")
    graph.add_edge("conflict_checker",    "critic_agent")

    # Conditional: after critic
    graph.add_conditional_edges(
        "critic_agent",
        route_after_critic,
        {
            "eligibility_agent":   "eligibility_agent",
            "shortlisting_agent":  "shortlisting_agent",
            "scheduling_agent":    "scheduling_agent",
            "hitl_pause":          "hitl_pause",
            "send_final_notifications": "send_final_notifications",
        }
    )

    graph.add_edge("hitl_pause",                 END)
    graph.add_edge("send_final_notifications",   END)

    return graph.compile()
