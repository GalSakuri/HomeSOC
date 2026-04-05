"""Abstract base agent with lifecycle management."""

from __future__ import annotations

import abc
import asyncio
import socket
import uuid
from datetime import datetime, timezone

from .transport import Transport


class BaseCollector(abc.ABC):
    """Base class for data collectors."""

    def __init__(self, agent_id: str) -> None:
        self.agent_id = agent_id
        self._running = False

    @abc.abstractmethod
    async def start(self, event_callback) -> None:
        """Start collecting events. Call event_callback(event_dict) for each."""
        ...

    async def stop(self) -> None:
        self._running = False


class BaseAgent(abc.ABC):
    """Abstract agent with collector management and transport."""

    def __init__(
        self,
        backend_url: str,
        agent_id: str | None = None,
        platform_name: str = "unknown",
        api_key: str = "",
    ) -> None:
        self.agent_id = agent_id or f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
        self.hostname = socket.gethostname()
        self.platform_name = platform_name
        self.transport = Transport(backend_url, self.agent_id, api_key=api_key)
        self.collectors: list[BaseCollector] = []
        self._tasks: list[asyncio.Task] = []
        self._running = False
        self._start_time = datetime.now(timezone.utc)

    @abc.abstractmethod
    def setup_collectors(self) -> list[BaseCollector]:
        """Return list of collectors for this platform."""
        ...

    async def _on_event(self, event: dict) -> None:
        """Called by collectors when an event is produced."""
        await self.transport.buffer_event(event)

    async def start(self) -> None:
        self._running = True
        self._start_time = datetime.now(timezone.utc)

        # Register with backend
        await self.transport.register(
            hostname=self.hostname,
            platform=self.platform_name,
        )

        # Start collectors
        self.collectors = self.setup_collectors()
        self._tasks = []
        for collector in self.collectors:
            self._tasks.append(asyncio.create_task(collector.start(self._on_event)))

        # Start flush loop and heartbeat loop
        self._tasks.append(asyncio.create_task(self.transport.flush_loop()))
        self._tasks.append(asyncio.create_task(self._heartbeat_loop()))

        print(f"[Agent:{self.agent_id}] Started with {len(self.collectors)} collectors")

        try:
            await asyncio.gather(*self._tasks)
        except asyncio.CancelledError:
            pass

    async def _heartbeat_loop(self) -> None:
        while self._running:
            uptime = (datetime.now(timezone.utc) - self._start_time).total_seconds()
            resp = await self.transport.heartbeat(
                hostname=self.hostname,
                platform=self.platform_name,
                uptime_seconds=uptime,
            )
            if resp:
                # Check for remote shutdown command
                if resp.get("command") == "shutdown":
                    print(f"[Agent:{self.agent_id}] Shutdown command received from backend")
                    await self.stop()
                    return
                # Apply collector config if backend returned one
                config = resp.get("config")
                if config:
                    self._apply_config(config)
            await asyncio.sleep(30)

    def _apply_config(self, config: dict) -> None:
        """Push config received from backend to all collectors that support it."""
        for collector in self.collectors:
            if hasattr(collector, "apply_config"):
                collector.apply_config(config)

    async def stop(self) -> None:
        self._running = False
        for collector in self.collectors:
            await collector.stop()
        # Cancel all running tasks (flush_loop, heartbeat, collectors)
        for task in self._tasks:
            if not task.done():
                task.cancel()
        # Wait for tasks to finish cancellation before closing transport
        await asyncio.gather(*self._tasks, return_exceptions=True)
        await self.transport.close()
        self._tasks.clear()
        print(f"[Agent:{self.agent_id}] Stopped")
