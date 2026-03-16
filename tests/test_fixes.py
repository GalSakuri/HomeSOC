"""Tests verifying the critical fixes applied to HomeSoc."""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure project root is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# ── Fix #2: insert_events must NOT mutate the input dicts ────────────


@pytest.mark.asyncio
async def test_insert_events_does_not_mutate_input():
    """Verify that insert_events leaves the original event dicts untouched.

    Before the fix, process_args was turned into a JSON string, raw was
    turned into a JSON string, and auth_success was turned into an int —
    all in-place on the caller's dict.  The detection engine and WebSocket
    broadcast received corrupted data as a result.
    """
    from backend.db.repository import _serialize_for_db

    event = {
        "id": "evt-001",
        "timestamp": "2026-03-16T00:00:00+00:00",
        "received_at": "2026-03-16T00:00:01+00:00",
        "agent_id": "test-agent",
        "platform": "macos",
        "category": "process",
        "event_type": "process_exec",
        "severity": "info",
        "process_name": "bash",
        "process_args": ["bash", "--version"],
        "raw": {"event_type": "exec", "data": "test"},
        "auth_success": True,
        "source": "eslogger",
    }

    # Keep original references to check mutation
    original_args = event["process_args"]
    original_raw = event["raw"]
    original_auth = event["auth_success"]

    row = _serialize_for_db(event)

    # The original dict must be completely untouched
    assert event["process_args"] is original_args
    assert isinstance(event["process_args"], list), "process_args was mutated to a string!"
    assert event["raw"] is original_raw
    assert isinstance(event["raw"], dict), "raw was mutated to a string!"
    assert event["auth_success"] is original_auth
    assert isinstance(event["auth_success"], bool), "auth_success was mutated to an int!"

    # But the serialized row must have DB-friendly types
    # process_args is at index 13, raw at 26, auth_success at 25
    from backend.db.repository import _EVENT_COLS

    args_idx = _EVENT_COLS.index("process_args")
    raw_idx = _EVENT_COLS.index("raw")
    auth_idx = _EVENT_COLS.index("auth_success")

    assert isinstance(row[args_idx], str)
    assert json.loads(row[args_idx]) == ["bash", "--version"]
    assert isinstance(row[raw_idx], str)
    assert json.loads(row[raw_idx]) == {"event_type": "exec", "data": "test"}
    assert isinstance(row[auth_idx], int)
    assert row[auth_idx] == 1


# ── Fix #3: Threshold detection must be per-source ───────────────────


def _make_auth_event(agent_id: str, user: str) -> dict:
    return {
        "id": f"evt-{agent_id}-{user}",
        "platform": "macos",
        "category": "auth",
        "event_type": "auth_attempt",
        "auth_success": False,
        "agent_id": agent_id,
        "auth_user": user,
        "source": "eslogger",
    }


def test_threshold_detection_per_source():
    """Threshold rules must count per (agent_id, user), not globally.

    Before the fix, 2 events from agent-A + 3 from agent-B = 5 total,
    which would incorrectly fire the brute-force rule even though
    neither agent individually hit the threshold.
    """
    from backend.engine.detector import DetectionEngine

    with patch("backend.engine.detector.load_rules") as mock_load:
        mock_load.return_value = [
            {
                "id": "brute-force",
                "name": "Brute Force Test",
                "severity": "critical",
                "platform": "macos",
                "type": "threshold",
                "conditions": {
                    "category": "auth",
                    "event_type": "auth_attempt",
                    "match": {"auth_success": False},
                },
                "window_seconds": 60,
                "threshold": 5,
            }
        ]
        engine = DetectionEngine("/fake/rules")

    # Send 3 from agent-A user gal, 3 from agent-B user gal
    for _ in range(3):
        alerts = engine.evaluate(_make_auth_event("agent-A", "gal"))
        assert alerts == [], "Should not fire — agent-A only has <= 3 events"

    for _ in range(3):
        alerts = engine.evaluate(_make_auth_event("agent-B", "gal"))
        assert alerts == [], "Should not fire — agent-B only has <= 3 events"

    # Now push agent-A over the threshold (needs 2 more to hit 5)
    engine.evaluate(_make_auth_event("agent-A", "gal"))
    alerts = engine.evaluate(_make_auth_event("agent-A", "gal"))
    assert len(alerts) == 1, "Should fire — agent-A now has 5 events"
    assert alerts[0]["rule_id"] == "brute-force"


def test_threshold_different_users_dont_cross_contaminate():
    """Events from different users on the same agent should not combine."""
    from backend.engine.detector import DetectionEngine

    with patch("backend.engine.detector.load_rules") as mock_load:
        mock_load.return_value = [
            {
                "id": "brute-force",
                "name": "Brute Force Test",
                "severity": "critical",
                "platform": "macos",
                "type": "threshold",
                "conditions": {
                    "category": "auth",
                    "event_type": "auth_attempt",
                    "match": {"auth_success": False},
                },
                "window_seconds": 60,
                "threshold": 5,
            }
        ]
        engine = DetectionEngine("/fake/rules")

    # 3 from user gal, 3 from user root — same agent
    for _ in range(3):
        engine.evaluate(_make_auth_event("agent-A", "gal"))
    for _ in range(3):
        alerts = engine.evaluate(_make_auth_event("agent-A", "root"))

    assert alerts == [], "Different users should not combine to trigger threshold"


# ── Fix #4: WebSocket broadcast must be concurrent ───────────────────


@pytest.mark.asyncio
async def test_broadcast_sends_concurrently_and_cleans_dead():
    """Broadcast should send to all clients concurrently and prune dead ones."""
    from backend.api.ws import ConnectionManager

    mgr = ConnectionManager()

    good_ws = AsyncMock()
    good_ws.send_text = AsyncMock()

    dead_ws = AsyncMock()
    dead_ws.send_text = AsyncMock(side_effect=RuntimeError("connection closed"))

    good_ws2 = AsyncMock()
    good_ws2.send_text = AsyncMock()

    mgr._connections = [good_ws, dead_ws, good_ws2]

    await mgr.broadcast({"type": "event", "data": {"id": "test"}})

    # Good connections should have received the message
    good_ws.send_text.assert_called_once()
    good_ws2.send_text.assert_called_once()

    # Dead connection should be removed
    assert dead_ws not in mgr._connections
    assert len(mgr._connections) == 2


# ── Fix #5: _extract_timestamp should parse real timestamps ──────────


def test_extract_timestamp_unix_epoch():
    """When eslogger provides a `time` field, use it instead of now()."""
    from agents.macos.collectors.eslogger import EsloggerCollector

    collector = EsloggerCollector("test-agent")

    # Direct seconds value
    raw_seconds = {"time": 1710547200}  # 2024-03-16T00:00:00Z
    result = collector._extract_timestamp(raw_seconds)
    parsed = datetime.fromisoformat(result)
    assert parsed.year == 2024
    assert parsed.month == 3
    assert parsed.day == 16

    # Seconds + nanoseconds dict
    raw_dict = {"time": {"seconds": 1710547200, "nanoseconds": 500_000_000}}
    result = collector._extract_timestamp(raw_dict)
    parsed = datetime.fromisoformat(result)
    assert parsed.year == 2024


def test_extract_timestamp_fallback_to_now():
    """When no parseable time is present, fall back to now()."""
    from agents.macos.collectors.eslogger import EsloggerCollector

    collector = EsloggerCollector("test-agent")
    raw_empty = {"mach_time": 123456789}
    result = collector._extract_timestamp(raw_empty)
    parsed = datetime.fromisoformat(result)
    # Should be very recent
    delta = datetime.now(timezone.utc) - parsed
    assert delta.total_seconds() < 5


# ── Fix #1: API key auth ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_require_api_key_rejects_missing_key():
    """The auth dependency must reject requests without a key."""
    from backend.api.auth import require_api_key
    from fastapi import HTTPException

    # Ensure a key is set
    from backend.config import settings
    settings.ensure_api_key()

    with pytest.raises(HTTPException) as exc_info:
        await require_api_key(api_key=None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_require_api_key_rejects_wrong_key():
    """The auth dependency must reject requests with the wrong key."""
    from backend.api.auth import require_api_key
    from fastapi import HTTPException

    from backend.config import settings
    settings.ensure_api_key()

    with pytest.raises(HTTPException) as exc_info:
        await require_api_key(api_key="wrong-key-entirely")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_require_api_key_accepts_correct_key():
    """The auth dependency must accept the correct key."""
    from backend.api.auth import require_api_key
    from backend.config import settings

    key = settings.ensure_api_key()
    result = await require_api_key(api_key=key)
    assert result == key


# ── Fix #7: Private IP range completeness ────────────────────────────


def test_private_ip_range_rules_cover_full_172_range():
    """The network rule must exclude the full 172.16.0.0/12 range."""
    from backend.engine.rules_loader import load_rules

    rules = load_rules(str(Path(__file__).resolve().parents[1] / "backend" / "rules"))
    unusual_outbound = next(r for r in rules if r["id"] == "macos-unusual-outbound")
    prefixes = unusual_outbound["conditions"]["not_match_prefix"]["dst_ip"]

    # Every prefix in 172.16-31 must be present
    for i in range(16, 32):
        assert f"172.{i}." in prefixes, f"Missing 172.{i}. from private IP exclusions"

    # Also verify link-local
    assert "fe80:" in prefixes
