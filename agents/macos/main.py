"""macOS agent entry point.

Usage:
    sudo python main.py [--backend-url URL] [--agent-id ID] [--api-key KEY]

Requires sudo for eslogger access and Full Disk Access TCC authorization.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import signal
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.macos.agent import MacOSAgent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="HomeSOC macOS Agent")
    parser.add_argument(
        "--backend-url",
        default="http://localhost:8443",
        help="Backend server URL (default: http://localhost:8443)",
    )
    parser.add_argument(
        "--agent-id",
        default=None,
        help="Agent identifier (default: auto-generated from hostname)",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("HOMESOC_API_KEY", ""),
        help="Backend API key (default: HOMESOC_API_KEY env var)",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    agent = MacOSAgent(
        backend_url=args.backend_url,
        agent_id=args.agent_id,
        api_key=args.api_key,
    )

    loop = asyncio.get_event_loop()

    def shutdown():
        print("\n[Agent] Shutting down...")
        asyncio.ensure_future(agent.stop())

    loop.add_signal_handler(signal.SIGINT, shutdown)
    loop.add_signal_handler(signal.SIGTERM, shutdown)

    print("=" * 60)
    print("  HomeSOC macOS Agent")
    print(f"  Agent ID: {agent.agent_id}")
    print(f"  Backend:  {args.backend_url}")
    print("=" * 60)

    await agent.start()


if __name__ == "__main__":
    asyncio.run(main())
