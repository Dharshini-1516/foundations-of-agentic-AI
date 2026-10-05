"""
Placify FastAPI Application — Main entry point.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.database import engine
import models.models  # register all models

from api.routes.auth import router as auth_router
from api.routes.drives import router as drives_router
from api.routes.other_routes import (
    students_router, companies_router, applications_router, notifications_router
)
from api.routes.email_routes import router as email_router, webhook_router
from api.websocket import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    models.models.Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Placify API",
    description="Autonomous AI Placement Orchestration System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all local and network dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router)
app.include_router(drives_router)
app.include_router(students_router)
app.include_router(companies_router)
app.include_router(applications_router)
app.include_router(notifications_router)
app.include_router(email_router)
app.include_router(webhook_router)


# ─── WebSocket Endpoints ──────────────────────────────────────────────────────

@app.websocket("/ws/drives/{drive_id}")
async def websocket_drive(websocket: WebSocket, drive_id: str):
    """Real-time agent event stream for a specific drive."""
    await manager.connect(websocket, drive_id)
    try:
        while True:
            # Keep connection alive; client sends pings
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, drive_id)


@app.websocket("/ws/global")
async def websocket_global(websocket: WebSocket):
    """Global notification stream."""
    await manager.connect_global(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_global(websocket)


@app.get("/")
def root():
    return {"message": "Placify API is running 🚀", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "placify-backend"}
