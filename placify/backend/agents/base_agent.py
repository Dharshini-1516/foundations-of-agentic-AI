"""Base agent class — every Placify agent extends this."""
import asyncio
from datetime import datetime
from typing import Callable
from sqlalchemy.orm import Session


class BaseAgent:
    name: str = "Base Agent"

    def __init__(self, db: Session, broadcaster: Callable):
        self.db = db
        self.broadcaster = broadcaster  # async (drive_id, event) -> None

    async def emit(self, drive_id: int, event_type: str, message: str, data: dict = None):
        """Send a real-time event to the TPO dashboard."""
        event = {
            "agent": self.name,
            "type": event_type,         # thinking | action | complete | error | warning
            "message": message,
            "data": data or {},
        }
        await self.broadcaster(drive_id, event)
        # Also persist to DB
        self._log_to_db(drive_id, event_type, message, data or {})
        # Small delay so the UI can animate between events
        await asyncio.sleep(0.3)

    def _log_to_db(self, drive_id: int, event_type: str, message: str, data: dict):
        try:
            from models.models import AgentLog
            log = AgentLog(
                drive_id=drive_id,
                agent_name=self.name,
                event_type=event_type,
                message=message,
                data=data,
            )
            self.db.add(log)
            self.db.commit()
        except Exception:
            pass  # Don't let logging failures break the pipeline
