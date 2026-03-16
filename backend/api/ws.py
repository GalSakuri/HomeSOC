"""WebSocket connection manager for real-time event streaming."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("homesoc.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        try:
            self._connections.remove(ws)
        except ValueError:
            pass  # Already removed during broadcast cleanup

    async def broadcast(self, message: dict[str, Any]) -> None:
        if not self._connections:
            return
        payload = json.dumps(message, default=str)
        results = await asyncio.gather(
            *(ws.send_text(payload) for ws in self._connections),
            return_exceptions=True,
        )
        # Remove dead connections in one pass
        alive: list[WebSocket] = []
        for ws, result in zip(self._connections, results):
            if isinstance(result, Exception):
                logger.debug("WebSocket send failed, removing connection: %s", result)
            else:
                alive.append(ws)
        self._connections = alive

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
