"""Collector that streams events from macOS eslogger (Endpoint Security framework).

Requires: sudo privileges and Full Disk Access TCC authorization.
Subscribes to specific ES event types and normalizes them into NormalizedEvent dicts.
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Callable, Coroutine

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from agents.common.base_agent import BaseCollector
from shared.enums import EventCategory, Platform, Severity

# Event types to subscribe to (keep focused to control volume)
SUBSCRIBED_EVENTS = [
    "exec",
    "open",
    "create",
    "rename",
    "authentication",
    "signal",
]

# Paths to filter out (high-volume, low-value system noise)
FILTERED_PATH_PREFIXES = [
    "/usr/libexec/",
    "/private/var/folders/",
    "/System/Library/PrivateFrameworks/",
    "/Library/Apple/System/",
    "/usr/sbin/syslogd",
    "/usr/libexec/logd",
]

FILTERED_PROCESS_NAMES = [
    "mdworker_shared",
    "mds_stores",
    "mds",
    "fseventsd",
    "distnoted",
    "cfprefsd",
    "launchservicesd",
]


class EsloggerCollector(BaseCollector):
    """Streams eslogger output and normalizes events."""

    def __init__(self, agent_id: str, event_types: list[str] | None = None) -> None:
        super().__init__(agent_id)
        self.event_types = event_types or SUBSCRIBED_EVENTS
        self._process: asyncio.subprocess.Process | None = None

    async def start(self, event_callback: Callable[[dict], Coroutine]) -> None:
        self._running = True
        cmd = ["eslogger", "--format", "json"] + self.event_types

        print(f"[EsloggerCollector] Starting: {' '.join(cmd)}")
        print(f"[EsloggerCollector] Note: requires sudo and Full Disk Access")

        try:
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except PermissionError:
            print("[EsloggerCollector] Permission denied. Run with sudo.")
            return
        except FileNotFoundError:
            print("[EsloggerCollector] eslogger not found. Requires macOS 13+.")
            return

        if self._process.stdout is None:
            print("[EsloggerCollector] Failed to capture stdout from eslogger process")
            return

        async for line in self._process.stdout:
            if not self._running:
                break

            line_str = line.decode("utf-8", errors="replace").strip()
            if not line_str:
                continue

            try:
                raw_event = json.loads(line_str)
            except json.JSONDecodeError:
                continue

            normalized = self._normalize(raw_event)
            if normalized is not None:
                await event_callback(normalized)

    async def stop(self) -> None:
        self._running = False
        if self._process:
            self._process.terminate()
            await self._process.wait()

    def _normalize(self, raw: dict) -> dict | None:
        """Convert eslogger JSON to a NormalizedEvent dict."""
        event_type = raw.get("event_type", "")
        process_info = raw.get("process", {})
        executable = process_info.get("executable", {})
        exec_path = executable.get("path", "")
        process_name = os.path.basename(exec_path)

        # Filter noise
        if process_name in FILTERED_PROCESS_NAMES:
            return None
        for prefix in FILTERED_PATH_PREFIXES:
            if exec_path.startswith(prefix):
                return None

        # Extract common process fields
        base = {
            "agent_id": self.agent_id,
            "platform": Platform.MACOS.value,
            "source": "eslogger",
            "timestamp": self._extract_timestamp(raw),
            "process_name": process_name,
            "process_pid": process_info.get("audit_token", {}).get("pid"),
            "process_ppid": process_info.get("ppid"),
            "process_path": exec_path,
            "process_user": str(process_info.get("audit_token", {}).get("euid", "")),
            "raw": raw,
        }

        if event_type == "exec":
            return self._normalize_exec(raw, base)
        elif event_type in ("open", "create", "rename"):
            return self._normalize_file(raw, base, event_type)
        elif event_type == "authentication":
            return self._normalize_auth(raw, base)
        elif event_type == "signal":
            return self._normalize_signal(raw, base)

        return None

    def _normalize_exec(self, raw: dict, base: dict) -> dict:
        event_data = raw.get("event", {})
        target = event_data.get("exec", {}).get("target", {})
        target_exe = target.get("executable", {})
        target_path = target_exe.get("path", "")

        args = []
        for arg in event_data.get("exec", {}).get("args", []):
            if isinstance(arg, str):
                args.append(arg)

        severity = Severity.INFO.value
        # Flag processes executing from suspicious locations
        if any(s in target_path.lower() for s in ["/tmp/", "/downloads/", "/var/tmp/"]):
            severity = Severity.MEDIUM.value

        return {
            **base,
            "category": EventCategory.PROCESS.value,
            "event_type": "process_exec",
            "severity": severity,
            "process_name": os.path.basename(target_path),
            "process_path": target_path,
            "process_args": args[:20],  # Cap at 20 args
        }

    def _normalize_file(self, raw: dict, base: dict, es_event_type: str) -> dict | None:
        event_data = raw.get("event", {})
        file_info = event_data.get(es_event_type, {})

        file_path = ""
        if es_event_type == "open":
            file_path = file_info.get("file", {}).get("path", "")
        elif es_event_type == "create":
            dest = file_info.get("destination", {})
            if isinstance(dest, dict):
                file_path = dest.get("existing_file", {}).get("path", "")
                if not file_path:
                    new_path = dest.get("new_path", {})
                    dir_path = new_path.get("dir", {}).get("path", "")
                    filename = new_path.get("filename", "")
                    file_path = f"{dir_path}/{filename}" if dir_path else filename
        elif es_event_type == "rename":
            file_path = file_info.get("source", {}).get("path", "")

        if not file_path:
            return None

        # Filter high-volume temp file paths
        if file_path.startswith("/private/var/folders/"):
            return None

        return {
            **base,
            "category": EventCategory.FILE.value,
            "event_type": f"file_{es_event_type}",
            "severity": Severity.INFO.value,
            "file_path": file_path,
            "file_action": es_event_type,
        }

    def _normalize_auth(self, raw: dict, base: dict) -> dict:
        event_data = raw.get("event", {})
        auth_data = event_data.get("authentication", {})
        success = auth_data.get("success", False)
        auth_type = auth_data.get("type", "unknown")

        severity = Severity.INFO.value if success else Severity.MEDIUM.value

        return {
            **base,
            "category": EventCategory.AUTHENTICATION.value,
            "event_type": "auth_attempt",
            "severity": severity,
            "auth_user": base.get("process_user"),
            "auth_method": auth_type,
            "auth_success": success,
        }

    def _normalize_signal(self, raw: dict, base: dict) -> dict:
        event_data = raw.get("event", {})
        signal_data = event_data.get("signal", {})
        sig = signal_data.get("sig", 0)

        return {
            **base,
            "category": EventCategory.PROCESS.value,
            "event_type": "process_signal",
            "severity": Severity.LOW.value if sig == 9 else Severity.INFO.value,
        }

    def _extract_timestamp(self, raw: dict) -> str:
        """Extract event timestamp from eslogger output.

        eslogger provides `time` as a seconds+nanoseconds pair under the
        `process` or top-level `time` key.  `mach_time` is a Mach absolute
        time (ticks since boot) and cannot be converted to wall-clock time
        without the timebase, so we use `time` when available and fall back
        to now().
        """
        # eslogger JSON includes a UNIX-epoch "time" field on each event
        time_field = raw.get("time")
        if isinstance(time_field, (int, float)):
            return datetime.fromtimestamp(time_field, tz=timezone.utc).isoformat()
        # Some eslogger versions nest it as seconds + nanoseconds
        if isinstance(time_field, dict):
            secs = time_field.get("seconds", 0)
            nsecs = time_field.get("nanoseconds", 0)
            if secs:
                ts = secs + nsecs / 1_000_000_000
                return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        return datetime.now(timezone.utc).isoformat()
