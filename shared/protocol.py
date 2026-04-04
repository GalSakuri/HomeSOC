"""Agent ↔ Backend communication protocol models."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from .schemas import NormalizedEvent


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EventBatch(BaseModel):
    agent_id: str
    batch_id: str
    events: list[NormalizedEvent]
    timestamp: datetime = Field(default_factory=_utc_now)


class HeartbeatPayload(BaseModel):
    agent_id: str
    hostname: str
    platform: str
    ip_address: str | None = None
    version: str = "0.1.0"
    uptime_seconds: float = 0
    events_buffered: int = 0
    timestamp: datetime = Field(default_factory=_utc_now)


class BatchResponse(BaseModel):
    accepted: int
    rejected: int = 0
    errors: list[str] = Field(default_factory=list)


class AgentRegistration(BaseModel):
    agent_id: str
    hostname: str
    platform: str
    ip_address: str | None = None
    version: str = "0.1.0"
