"""HTTP transport with batching, buffering, and retry logic."""

from __future__ import annotations

import asyncio
import uuid
from collections import deque
from datetime import datetime, timezone

import httpx


class Transport:
    """Buffers events and flushes them to the backend in batches."""

    def __init__(
        self,
        backend_url: str,
        agent_id: str,
        batch_size: int = 100,
        flush_interval: float = 5.0,
        max_buffer: int = 100_000,
    ) -> None:
        self.backend_url = backend_url.rstrip("/")
        self.agent_id = agent_id
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.max_buffer = max_buffer
        self._buffer: deque[dict] = deque(maxlen=max_buffer)
        self._client = httpx.AsyncClient(timeout=10.0)

    async def register(self, hostname: str, platform: str) -> None:
        try:
            resp = await self._client.post(
                f"{self.backend_url}/api/v1/register",
                json={
                    "agent_id": self.agent_id,
                    "hostname": hostname,
                    "platform": platform,
                    "version": "0.1.0",
                },
            )
            if resp.status_code == 200:
                print(f"[Transport] Registered with backend: {self.agent_id}")
            else:
                print(f"[Transport] Registration failed: {resp.status_code}")
        except httpx.RequestError as e:
            print(f"[Transport] Registration error (will retry): {e}")

    async def heartbeat(
        self,
        hostname: str,
        platform: str,
        uptime_seconds: float = 0,
    ) -> dict | None:
        """Send heartbeat. Returns the response body (may contain commands)."""
        try:
            resp = await self._client.post(
                f"{self.backend_url}/api/v1/heartbeat",
                json={
                    "agent_id": self.agent_id,
                    "hostname": hostname,
                    "platform": platform,
                    "uptime_seconds": uptime_seconds,
                    "events_buffered": len(self._buffer),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
            if resp.status_code == 200:
                return resp.json()
        except httpx.RequestError as e:
            print(f"[Transport] Heartbeat failed: {e}")
        return None

    async def buffer_event(self, event: dict) -> None:
        self._buffer.append(event)
        if len(self._buffer) >= self.batch_size:
            await self.flush()

    async def flush(self) -> None:
        if not self._buffer:
            return

        # Drain up to batch_size events
        batch = []
        for _ in range(min(self.batch_size, len(self._buffer))):
            batch.append(self._buffer.popleft())

        payload = {
            "agent_id": self.agent_id,
            "batch_id": str(uuid.uuid4()),
            "events": batch,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            resp = await self._client.post(
                f"{self.backend_url}/api/v1/events",
                json=payload,
            )
            if resp.status_code != 200:
                # Re-queue events on failure
                for ev in reversed(batch):
                    self._buffer.appendleft(ev)
                print(f"[Transport] Flush failed ({resp.status_code}), re-queued {len(batch)} events")
        except httpx.RequestError as e:
            # Re-queue events on network failure
            for ev in reversed(batch):
                self._buffer.appendleft(ev)
            print(f"[Transport] Flush error, re-queued {len(batch)} events: {e}")

    async def flush_loop(self) -> None:
        while True:
            await asyncio.sleep(self.flush_interval)
            await self.flush()

    async def deregister(self) -> None:
        """Notify the backend this agent is going offline."""
        try:
            resp = await self._client.post(
                f"{self.backend_url}/api/v1/deregister",
                json={"agent_id": self.agent_id},
            )
            if resp.status_code == 200:
                print(f"[Transport] Deregistered from backend: {self.agent_id}")
        except httpx.RequestError as e:
            print(f"[Transport] Deregister failed: {e}")

    async def close(self) -> None:
        await self.flush()
        await self.deregister()
        await self._client.aclose()
