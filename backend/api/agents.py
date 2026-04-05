"""Agent registration, heartbeat, and listing endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from shared.protocol import AgentRegistration, HeartbeatPayload

from ..db import repository
from .auth import require_api_key
from .ws import manager

router = APIRouter(prefix="/api/v1", tags=["agents"])

# Agent IDs that should shut down on next heartbeat
_pending_shutdown: set[str] = set()


class DeregisterRequest(BaseModel):
    agent_id: str


def _build_agent_dict(
    agent_id: str,
    hostname: str,
    platform: str,
    ip_address: str | None,
    version: str,
    status: str = "online",
) -> dict:
    return {
        "id": agent_id,
        "hostname": hostname,
        "platform": platform,
        "ip_address": ip_address,
        "version": version,
        "last_heartbeat": datetime.now(timezone.utc).isoformat(),
        "status": status,
    }


async def _broadcast_agent_status(data: dict) -> None:
    await manager.broadcast({"type": "agent_status", "data": data})


@router.post("/register", dependencies=[Depends(require_api_key)])
async def register_agent(reg: AgentRegistration) -> dict:
    # Check if agent is currently stopped — don't override that status
    existing = await repository.get_agent_by_id(reg.agent_id)
    if existing and existing.get("status") == "stopped":
        agent = _build_agent_dict(
            reg.agent_id, reg.hostname, reg.platform, reg.ip_address, reg.version, "stopped"
        )
        await repository.upsert_agent(agent)
        return {"status": "stopped", "agent_id": reg.agent_id, "command": "shutdown"}

    agent = _build_agent_dict(
        reg.agent_id, reg.hostname, reg.platform, reg.ip_address, reg.version, "online"
    )
    await repository.upsert_agent(agent)
    await _broadcast_agent_status(agent)
    return {"status": "registered", "agent_id": reg.agent_id}


@router.post("/heartbeat", dependencies=[Depends(require_api_key)])
async def heartbeat(hb: HeartbeatPayload) -> dict:
    existing = await repository.get_agent_by_id(hb.agent_id)

    # If agent is stopped (either in DB or pending), tell it to shut down
    if hb.agent_id in _pending_shutdown or (existing and existing.get("status") == "stopped"):
        _pending_shutdown.discard(hb.agent_id)
        await repository.update_agent_status(hb.agent_id, "stopped")
        return {"status": "ok", "command": "shutdown"}

    agent = _build_agent_dict(
        hb.agent_id, hb.hostname, hb.platform, hb.ip_address, hb.version, "online"
    )
    await repository.upsert_agent(agent)

    # Return current config so the agent can apply collector toggles
    config = existing.get("config") if existing else None
    return {"status": "ok", "config": config or {}}


@router.post("/deregister", dependencies=[Depends(require_api_key)])
async def deregister_agent(body: DeregisterRequest) -> dict:
    """Called by agents on graceful shutdown to mark themselves offline."""
    updated = await repository.update_agent_status(body.agent_id, "offline")
    if updated:
        await _broadcast_agent_status({"id": body.agent_id, "status": "offline"})
    return {"status": "offline", "agent_id": body.agent_id}


@router.post("/agents")
async def create_agent(reg: AgentRegistration) -> dict:
    """Manually register an agent from the dashboard."""
    existing = await repository.get_agent_by_id(reg.agent_id)
    if existing:
        raise HTTPException(status_code=409, detail="Agent ID already exists")
    agent = _build_agent_dict(
        reg.agent_id, reg.hostname, reg.platform, reg.ip_address, reg.version, "offline"
    )
    await repository.upsert_agent(agent)
    await _broadcast_agent_status(agent)
    return {"status": "registered", "agent_id": reg.agent_id}


@router.get("/agents")
async def list_agents() -> list[dict]:
    return await repository.get_agents()


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str) -> dict:
    deleted = await repository.delete_agent(agent_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    _pending_shutdown.discard(agent_id)
    await _broadcast_agent_status({"id": agent_id, "status": "removed"})
    return {"deleted": agent_id}


@router.post("/agents/{agent_id}/stop")
async def stop_agent(agent_id: str) -> dict:
    """Request an agent to shut down gracefully."""
    updated = await repository.update_agent_status(agent_id, "stopped")
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")
    _pending_shutdown.add(agent_id)
    await _broadcast_agent_status({"id": agent_id, "status": "stopped"})
    return {"status": "stopped", "agent_id": agent_id}


@router.patch("/agents/{agent_id}/config")
async def update_agent_config(agent_id: str, body: dict) -> dict:
    """Save collector configuration for an agent (delivered via next heartbeat)."""
    updated = await repository.update_agent_config(agent_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"agent_id": agent_id, "config": body}


@router.post("/agents/{agent_id}/resume")
async def resume_agent(agent_id: str) -> dict:
    """Mark an agent as online again."""
    updated = await repository.update_agent_status(agent_id, "online")
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")
    _pending_shutdown.discard(agent_id)
    await _broadcast_agent_status({"id": agent_id, "status": "online"})
    return {"status": "online", "agent_id": agent_id}
