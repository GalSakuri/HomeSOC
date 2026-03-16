"""WebSocket connection manager for real-time event streaming."""

from __future__ import annotations

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
        dead: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception as e:
                logger.debug("WebSocket send failed, removing connection: %s", e)
                dead.append(ws)
        for ws in dead:
            try:
                self._connections.remove(ws)
            except ValueError:
                pass

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
