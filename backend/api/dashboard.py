"""Dashboard summary endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request

from ..db import repository

router = APIRouter(prefix="/api/v1", tags=["dashboard"])


@router.get("/dashboard/summary")
async def dashboard_summary(request: Request) -> dict:
    event_counts = await repository.get_event_counts(since_hours=24)
    alerts = await repository.get_alerts(status="open", limit=10)
    agents = await repository.get_agents()

    online_agents = sum(1 for a in agents if a.get("status") == "online")

    rules_count = len(request.app.state.pipeline.engine.rules)

    return {
        "total_events_24h": event_counts["total"],
        "total_alerts_open": len(alerts),
        "agents_online": online_agents,
        "agents_total": len(agents),
        "events_by_category": event_counts["by_category"],
        "events_by_severity": event_counts["by_severity"],
        "recent_alerts": alerts,
        "rules_count": rules_count,
    }
