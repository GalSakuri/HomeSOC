"""Network connection collector using lsof.

Periodically runs `lsof -i -n -P` to capture active network connections
and normalizes them into NormalizedEvent dicts.
"""

from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone
from typing import Callable, Coroutine

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from agents.common.base_agent import BaseCollector
from shared.enums import EventCategory, Platform, Severity

# Known service ports that are generally safe
COMMON_PORTS = {80, 443, 53, 22, 993, 587, 5353, 8080, 8443}

# Private IP prefixes
PRIVATE_PREFIXES = ("10.", "192.168.", "172.16.", "172.17.", "172.18.",
                     "172.19.", "172.20.", "172.21.", "172.22.", "172.23.",
                     "172.24.", "172.25.", "172.26.", "172.27.", "172.28.",
                     "172.29.", "172.30.", "172.31.", "127.", "::1", "fe80:")


class NetworkCollector(BaseCollector):
    """Periodically scans network connections via lsof."""

    def __init__(
        self,
        agent_id: str,
        poll_interval: float = 15.0,
    ) -> None:
        super().__init__(agent_id)
        self.poll_interval = poll_interval
        self._seen_connections: set[str] = set()

    async def start(self, event_callback: Callable[[dict], Coroutine]) -> None:
        self._running = True
        print(f"[NetworkCollector] Polling every {self.poll_interval}s")

        while self._running:
            try:
                connections = await self._scan()
                for conn in connections:
                    # Deduplicate: only report new connections
                    conn_key = f"{conn['process_name']}:{conn['dst_ip']}:{conn['dst_port']}"
                    if conn_key not in self._seen_connections:
                        self._seen_connections.add(conn_key)
                        await event_callback(conn)

                # Prune seen set to prevent unbounded growth
                if len(self._seen_connections) > 10000:
                    self._seen_connections.clear()

            except Exception as e:
                print(f"[NetworkCollector] Error: {e}")

            await asyncio.sleep(self.poll_interval)

    async def _scan(self) -> list[dict]:
        """Run lsof -i -n -P and parse output."""
        proc = await asyncio.create_subprocess_exec(
            "lsof", "-i", "-n", "-P", "+c", "0",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode("utf-8", errors="replace")

        events = []
        for line in output.strip().split("\n")[1:]:  # Skip header
            parsed = self._parse_lsof_line(line)
            if parsed:
                events.append(parsed)
        return events

    def _parse_lsof_line(self, line: str) -> dict | None:
        """Parse a single lsof output line into a NormalizedEvent dict."""
        parts = line.split()
        if len(parts) < 9:
            return None

        process_name = parts[0]
        pid = parts[1]
        user = parts[2]
        protocol_field = parts[7] if len(parts) > 7 else ""
        name_field = parts[-1]

        # Only interested in ESTABLISHED or connected TCP/UDP
        protocol = "tcp" if "TCP" in protocol_field or "tcp" in protocol_field.lower() else "udp"

        # Parse connection: src->dst format
        if "->" not in name_field:
            return None

        src_part, dst_part = name_field.split("->", 1)

        src_ip, src_port = self._parse_address(src_part)
        dst_ip, dst_port = self._parse_address(dst_part)

        if not dst_ip or dst_port is None:
            return None

        # Determine severity
        severity = Severity.INFO.value
        is_private = any(dst_ip.startswith(p) for p in PRIVATE_PREFIXES)
        if not is_private and dst_port not in COMMON_PORTS:
            severity = Severity.MEDIUM.value

        return {
            "agent_id": self.agent_id,
            "platform": Platform.MACOS.value,
            "source": "lsof",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "category": EventCategory.NETWORK.value,
            "event_type": "network_connection",
            "severity": severity,
            "process_name": process_name,
            "process_pid": int(pid) if pid.isdigit() else None,
            "process_user": user,
            "src_ip": src_ip,
            "src_port": src_port,
            "dst_ip": dst_ip,
            "dst_port": dst_port,
            "protocol": protocol,
        }

    def _parse_address(self, addr: str) -> tuple[str | None, int | None]:
        """Parse 'ip:port' or '[ipv6]:port' from lsof output."""
        # Handle state suffix like "(ESTABLISHED)"
        addr = re.sub(r"\(.*\)", "", addr).strip()

        if addr.startswith("["):
            # IPv6: [::1]:8080
            match = re.match(r"\[(.+)\]:(\d+)", addr)
            if match:
                return match.group(1), int(match.group(2))
        else:
            # IPv4: 192.168.1.1:443
            parts = addr.rsplit(":", 1)
            if len(parts) == 2 and parts[1].isdigit():
                return parts[0], int(parts[1])

        return None, None
