"""Detection rules listing endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1", tags=["rules"])


@router.get("/rules")
async def list_rules(request: Request) -> list[dict]:
    engine = request.app.state.pipeline.engine
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "description": r.get("description", ""),
            "alert_on": r.get("alert_on", ""),
            "severity": r.get("severity", "medium"),
            "platform": r.get("platform"),
            "type": r.get("type", "single"),
            "conditions": r.get("conditions", {}),
            "window_seconds": r.get("window_seconds"),
            "threshold": r.get("threshold"),
            "source_file": r.get("_source_file", ""),
        }
        for r in engine.rules
    ]
