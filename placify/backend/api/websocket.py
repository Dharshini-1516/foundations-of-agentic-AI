"""
Placify WebSocket Event Bus
Broadcasts agent actions in real-time to connected clients.
"""
from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    """Manages WebSocket connections per drive_id."""

    def __init__(self):
        # drive_id -> list of connected websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Global connections (for notifications)
        self.global_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, drive_id: str):
        await websocket.accept()
        if drive_id not in self.active_connections:
            self.active_connections[drive_id] = []
        self.active_connections[drive_id].append(websocket)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, drive_id: str):
        if drive_id in self.active_connections:
            self.active_connections[drive_id] = [
                ws for ws in self.active_connections[drive_id] if ws != websocket
            ]

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections = [ws for ws in self.global_connections if ws != websocket]

    async def broadcast_to_drive(self, drive_id: str, event: dict):
        """Send event to all clients watching a specific drive."""
        event["timestamp"] = datetime.utcnow().isoformat()
        message = json.dumps(event)
        dead = []
        for connection in self.active_connections.get(str(drive_id), []):
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.get(str(drive_id), []).remove(d)

    async def broadcast_global(self, event: dict):
        """Send notification to all globally connected clients."""
        event["timestamp"] = datetime.utcnow().isoformat()
        message = json.dumps(event)
        dead = []
        for connection in self.global_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.global_connections.remove(d)

# Singleton — shared across the entire app
manager = ConnectionManager()
