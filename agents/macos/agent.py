"""macOS agent implementation."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.common.base_agent import BaseAgent, BaseCollector
from agents.macos.collectors.eslogger import EsloggerCollector
from agents.macos.collectors.network import NetworkCollector


class MacOSAgent(BaseAgent):
    def __init__(self, backend_url: str, agent_id: str | None = None, api_key: str = "") -> None:
        super().__init__(
            backend_url=backend_url,
            agent_id=agent_id,
            platform_name="macos",
            api_key=api_key,
        )

    def setup_collectors(self) -> list[BaseCollector]:
        return [
            EsloggerCollector(self.agent_id),
            NetworkCollector(self.agent_id, poll_interval=15.0),
        ]
