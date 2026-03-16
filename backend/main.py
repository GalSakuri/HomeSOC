"""HomeSOC Backend — FastAPI application entry point."""

from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("homesoc")

# Allow imports from project root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.api import agents, alerts, dashboard, events, rules
from backend.api.ws import manager
from backend.config import settings
from backend.db.connection import close_db, init_db
from backend.db import repository
from backend.engine.detector import DetectionEngine
from backend.ingestion.pipeline import IngestionPipeline


async def _stale_agent_checker() -> None:
    """Background task that marks agents offline when heartbeats go stale."""
    while True:
        await asyncio.sleep(30)
        count = await repository.mark_stale_agents_offline(settings.heartbeat_timeout_seconds)
        if count > 0:
            logger.info("Marked %d stale agent(s) as offline", count)
            await manager.broadcast({"type": "agent_status", "data": {"refresh": True}})


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()

    # Initialize detection engine and pipeline
    engine = DetectionEngine(settings.rules_dir)
    pipeline = IngestionPipeline(engine)
    app.state.pipeline = pipeline

    # Start background stale-agent checker
    checker_task = asyncio.create_task(_stale_agent_checker())

    print(f"[HomeSOC] Backend started on {settings.host}:{settings.port}")
    print(f"[HomeSOC] Database: {settings.db_path}")
    print(f"[HomeSOC] Detection rules loaded: {len(engine.rules)}")
    yield
    # Shutdown
    checker_task.cancel()
    await close_db()
    print("[HomeSOC] Backend shut down")


app = FastAPI(
    title="HomeSOC",
    description="Home Security Operations Center — Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(events.router)
app.include_router(alerts.router)
app.include_router(agents.router)
app.include_router(dashboard.router)
app.include_router(rules.router)


@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive; client can send pings
            await ws.receive_text()
    except WebSocketDisconnect:
        logger.debug("WebSocket client disconnected")
        manager.disconnect(ws)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ws_clients": manager.active_count,
    }
