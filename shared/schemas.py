"""Pydantic models for HomeSOC normalized events, alerts, and agents."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from .enums import (
    AgentStatus,
    AlertStatus,
    EventCategory,
    Platform,
    Severity,
)


class NormalizedEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime
    received_at: datetime | None = None
    agent_id: str
    platform: Platform
    category: EventCategory
    event_type: str
    severity: Severity = Severity.INFO

    # Process fields
    process_name: str | None = None
    process_pid: int | None = None
    process_ppid: int | None = None
    process_path: str | None = None
    process_user: str | None = None
    process_args: list[str] | None = None
    process_hash: str | None = None

    # File fields
    file_path: str | None = None
    file_action: str | None = None

    # Network fields
    src_ip: str | None = None
    src_port: int | None = None
    dst_ip: str | None = None
    dst_port: int | None = None
    protocol: str | None = None
    dns_query: str | None = None

    # Auth fields
    auth_user: str | None = None
    auth_method: str | None = None
    auth_success: bool | None = None

    # Raw event for forensics
    raw: dict[str, Any] | None = None

    # Source metadata
    source: str
    source_event_id: str | None = None


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_id: str
    rule_name: str
    severity: Severity
    title: str
    description: str | None = None
    event_ids: list[str] = Field(default_factory=list)
    status: AlertStatus = AlertStatus.OPEN
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: datetime | None = None


class AgentInfo(BaseModel):
    id: str
    hostname: str
    platform: Platform
    ip_address: str | None = None
    version: str = "0.1.0"
    last_heartbeat: datetime | None = None
    status: AgentStatus = AgentStatus.UNKNOWN
    config: dict[str, Any] | None = None


class DashboardSummary(BaseModel):
    total_events_24h: int = 0
    total_alerts_open: int = 0
    agents_online: int = 0
    agents_total: int = 0
    events_by_category: dict[str, int] = Field(default_factory=dict)
    events_by_severity: dict[str, int] = Field(default_factory=dict)
    recent_alerts: list[Alert] = Field(default_factory=list)
