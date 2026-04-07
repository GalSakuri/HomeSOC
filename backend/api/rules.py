"""Detection rules endpoints — list, source view, save, and test."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/api/v1", tags=["rules"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _find_rule(engine, rule_id: str) -> dict:
    rule = next((r for r in engine.rules if r["id"] == rule_id), None)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")
    return rule


def _reload_engine(engine) -> None:
    """Rebuild the single/threshold rule lists after an in-place rules update."""
    engine.single_rules = [r for r in engine.rules if r.get("type") == "single"]
    engine.threshold_rules = [r for r in engine.rules if r.get("type") == "threshold"]


# ── Endpoints ──────────────────────────────────────────────────────────────

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


@router.get("/rules/{rule_id}/source")
async def get_rule_source(rule_id: str, request: Request) -> dict:
    """Return the editable YAML text for a single rule."""
    engine = request.app.state.pipeline.engine
    rule = _find_rule(engine, rule_id)

    # Strip internal tracking fields before serialising
    rule_clean = {k: v for k, v in rule.items() if not k.startswith("_")}
    yaml_text = yaml.dump(
        rule_clean,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    )
    return {"yaml": yaml_text}


class SaveRuleBody(BaseModel):
    yaml_content: str


@router.put("/rules/{rule_id}")
async def save_rule(rule_id: str, body: SaveRuleBody, request: Request) -> dict:
    """Validate and persist an edited rule back to its YAML source file, then hot-reload."""
    engine = request.app.state.pipeline.engine
    existing = _find_rule(engine, rule_id)

    # Parse and validate submitted YAML
    try:
        updated = yaml.safe_load(body.yaml_content)
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {exc}")

    if not isinstance(updated, dict) or "id" not in updated:
        raise HTTPException(status_code=400, detail="YAML must be a rule dict with an 'id' field")
    if updated["id"] != rule_id:
        raise HTTPException(status_code=400, detail="Rule 'id' field cannot be changed")

    # Load and update the source file
    source_file = existing["_source_file"]
    rules_path = Path(settings.rules_dir) / source_file

    try:
        with open(rules_path) as f:
            file_data = yaml.safe_load(f)
    except (OSError, yaml.YAMLError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not read source file: {exc}")

    rules_list: list = file_data.get("rules", [])
    for i, r in enumerate(rules_list):
        if r.get("id") == rule_id:
            rules_list[i] = updated
            break
    else:
        raise HTTPException(status_code=404, detail="Rule not found in source file")

    file_data["rules"] = rules_list
    try:
        with open(rules_path, "w") as f:
            yaml.dump(file_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write source file: {exc}")

    # Hot-reload: replace in engine.rules and rebuild lists
    updated["_source_file"] = source_file
    for i, r in enumerate(engine.rules):
        if r["id"] == rule_id:
            engine.rules[i] = updated
            break
    _reload_engine(engine)

    return {"status": "saved", "rule_id": rule_id}


def _build_synthetic_event(rule: dict) -> dict:
    """Build a synthetic event that satisfies the rule's conditions."""
    conditions = rule.get("conditions", {})
    now = datetime.now(timezone.utc).isoformat()

    event: dict = {
        "id": str(uuid.uuid4()),
        "timestamp": now,
        "received_at": now,
        "agent_id": "rule-test",
        "platform": rule.get("platform") or "macos",
        "category": conditions.get("category", "system"),
        "event_type": conditions.get("event_type", "test_event"),
        "severity": rule.get("severity", "medium"),
        "source": f"[TEST] {rule.get('name', rule['id'])}",
    }

    # Satisfy exact-match conditions
    for field, value in conditions.get("match", {}).items():
        event[field] = value

    # Satisfy match_any — pick the first allowed value
    for field, values in conditions.get("match_any", {}).items():
        if values:
            event[field] = values[0]

    # Satisfy match_any_prefix — use the first prefix + a test suffix
    for field, prefixes in conditions.get("match_any_prefix", {}).items():
        if prefixes:
            base = prefixes[0].rstrip("*")
            event[field] = base + "test_value"

    # Satisfy match_any_contains — embed the first required substring
    for field, substrings in conditions.get("match_any_contains", {}).items():
        if substrings:
            event[field] = f"test_{substrings[0]}_synthetic"

    # Fill in realistic defaults per category so alerts look meaningful
    cat = event["category"]
    if cat == "process":
        event.setdefault("process_name", "test_process")
        event.setdefault("process_path", "/tmp/test_process")
        event.setdefault("process_pid", 31337)
        event.setdefault("process_user", "root")
    elif cat == "network":
        event.setdefault("src_ip", "192.168.1.100")
        event.setdefault("src_port", 54321)
        event.setdefault("dst_ip", "198.51.100.99")
        event.setdefault("dst_port", 4444)
        event.setdefault("protocol", "tcp")
    elif cat == "auth":
        event.setdefault("auth_user", "test_user")
        event.setdefault("auth_method", "password")
        event.setdefault("auth_success", False)
        event.setdefault("process_name", "sshd")
    elif cat in ("system", "file"):
        event.setdefault("file_path", "/tmp/test_synthetic_file")
        event.setdefault("process_name", "test_agent")
        event.setdefault("process_pid", 31337)

    return event


@router.post("/rules/{rule_id}/test")
async def test_rule(rule_id: str, request: Request) -> dict:
    """Fire a synthetic event guaranteed to match the rule, pushing it through
    the full pipeline so an alert appears live in the dashboard."""
    engine = request.app.state.pipeline.engine
    rule = _find_rule(engine, rule_id)

    event = _build_synthetic_event(rule)
    pipeline = request.app.state.pipeline
    stored, alerts = await pipeline.process_batch([event])

    return {
        "status": "fired",
        "event_id": event["id"],
        "alerts_triggered": alerts,
        "rule_id": rule_id,
    }
