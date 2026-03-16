#!/usr/bin/env python3
"""Generate realistic fake security events and push them to the backend.

Usage:
    python scripts/generate_test_events.py [--url URL] [--count N] [--interval SECS]
"""

from __future__ import annotations

import argparse
import random
import time
import uuid
from datetime import datetime, timezone

import httpx

BACKEND_URL = "http://localhost:8443"
AGENT_ID = "test-macbook-pro"

PROCESS_NAMES = [
    "bash", "zsh", "python3", "node", "curl", "wget", "ssh", "git",
    "Safari", "Chrome", "Firefox", "Slack", "Discord", "iTerm2",
    "Visual Studio Code", "docker", "brew", "pip3", "npm",
    "nc", "nmap", "base64", "osascript", "ruby",
]

SUSPICIOUS_PROCESSES = ["nc", "nmap", "base64", "osascript", "ruby", "curl"]

FILE_PATHS = [
    "/Users/gal/Documents/project/app.py",
    "/Users/gal/Downloads/installer.pkg",
    "/tmp/payload.sh",
    "/var/tmp/output.txt",
    "/Users/gal/.ssh/config",
    "/etc/hosts",
    "/Users/gal/Desktop/report.pdf",
    "/Library/LaunchDaemons/com.suspicious.plist",
    "/Users/gal/Library/LaunchAgents/com.startup.plist",
]

EXTERNAL_IPS = [
    "142.250.80.46", "151.101.1.140", "104.244.42.65",
    "185.199.108.133", "13.107.42.14", "31.13.72.36",
    "52.84.123.45", "198.51.100.23", "203.0.113.42",
]

PRIVATE_IPS = ["192.168.1.1", "192.168.1.100", "10.0.0.1", "127.0.0.1"]

PORTS = [80, 443, 22, 53, 8080, 3000, 4444, 5555, 9001, 1337, 6667]


def generate_process_event() -> dict:
    proc = random.choice(PROCESS_NAMES)
    is_suspicious = proc in SUSPICIOUS_PROCESSES
    path = f"/usr/bin/{proc}" if not is_suspicious else f"/tmp/{proc}"

    severity = "info"
    if is_suspicious:
        severity = random.choice(["medium", "high"])
    elif proc in ("bash", "zsh") and random.random() < 0.3:
        severity = "low"

    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": AGENT_ID,
        "platform": "macos",
        "category": "process",
        "event_type": "process_exec",
        "severity": severity,
        "process_name": proc,
        "process_pid": random.randint(100, 65000),
        "process_ppid": random.randint(1, 1000),
        "process_path": path,
        "process_user": random.choice(["gal", "root", "_spotlight"]),
        "process_args": [path, "--version"] if random.random() < 0.5 else [path],
        "source": "eslogger",
    }


def generate_network_event() -> dict:
    dst_ip = random.choice(EXTERNAL_IPS + PRIVATE_IPS)
    dst_port = random.choice(PORTS)
    is_private = dst_ip.startswith(("192.168.", "10.", "127."))

    severity = "info"
    if not is_private and dst_port not in (80, 443, 53, 22):
        severity = "medium"
    if dst_port in (4444, 1337, 6667):
        severity = "high"

    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": AGENT_ID,
        "platform": "macos",
        "category": "network",
        "event_type": "network_connection",
        "severity": severity,
        "process_name": random.choice(["curl", "Safari", "Chrome", "ssh", "nc", "python3"]),
        "process_pid": random.randint(100, 65000),
        "src_ip": "192.168.1.50",
        "src_port": random.randint(49152, 65535),
        "dst_ip": dst_ip,
        "dst_port": dst_port,
        "protocol": random.choice(["tcp", "udp"]),
        "source": "lsof",
    }


def generate_auth_event() -> dict:
    success = random.random() > 0.2
    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": AGENT_ID,
        "platform": "macos",
        "category": "auth",
        "event_type": "auth_attempt",
        "severity": "info" if success else "medium",
        "auth_user": random.choice(["gal", "root", "admin"]),
        "auth_method": random.choice(["password", "biometric", "token"]),
        "auth_success": success,
        "process_name": random.choice(["sudo", "login", "sshd", "screensaver"]),
        "process_pid": random.randint(100, 65000),
        "source": "eslogger",
    }


def generate_file_event() -> dict:
    path = random.choice(FILE_PATHS)
    action = random.choice(["create", "open", "rename"])

    severity = "info"
    if "/tmp/" in path or "/var/tmp/" in path:
        severity = "medium"
    if "LaunchDaemons" in path or "LaunchAgents" in path:
        severity = "high"

    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": AGENT_ID,
        "platform": "macos",
        "category": "file",
        "event_type": f"file_{action}",
        "severity": severity,
        "file_path": path,
        "file_action": action,
        "process_name": random.choice(["bash", "python3", "node", "Finder"]),
        "process_pid": random.randint(100, 65000),
        "source": "eslogger",
    }


GENERATORS = [
    (generate_process_event, 0.4),
    (generate_network_event, 0.3),
    (generate_auth_event, 0.1),
    (generate_file_event, 0.2),
]


def generate_batch(count: int) -> list[dict]:
    events = []
    for _ in range(count):
        r = random.random()
        cumulative = 0
        for gen, weight in GENERATORS:
            cumulative += weight
            if r <= cumulative:
                events.append(gen())
                break
    return events


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate test security events")
    parser.add_argument("--url", default=BACKEND_URL, help="Backend URL")
    parser.add_argument("--count", type=int, default=10, help="Events per batch")
    parser.add_argument("--batches", type=int, default=0, help="Number of batches (0=infinite)")
    parser.add_argument("--interval", type=float, default=2.0, help="Seconds between batches")
    args = parser.parse_args()

    client = httpx.Client(timeout=10.0)

    # Register test agent
    try:
        resp = client.post(
            f"{args.url}/api/v1/register",
            json={
                "agent_id": AGENT_ID,
                "hostname": "test-macbook-pro",
                "platform": "macos",
                "ip_address": "192.168.1.50",
                "version": "0.1.0",
            },
        )
        print(f"Agent registered: {resp.json()}")
    except httpx.RequestError as e:
        print(f"Failed to register agent: {e}")
        print("Is the backend running?")
        return

    batch_num = 0
    total_sent = 0

    try:
        while True:
            batch_num += 1
            events = generate_batch(args.count)

            payload = {
                "agent_id": AGENT_ID,
                "batch_id": str(uuid.uuid4()),
                "events": events,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            try:
                resp = client.post(f"{args.url}/api/v1/events", json=payload)
                result = resp.json()
                total_sent += result.get("accepted", 0)
                print(f"[Batch {batch_num}] Sent {len(events)} events | Total: {total_sent} | Accepted: {result}")
            except httpx.RequestError as e:
                print(f"[Batch {batch_num}] Error: {e}")

            if args.batches > 0 and batch_num >= args.batches:
                break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print(f"\nStopped. Total events sent: {total_sent}")


if __name__ == "__main__":
    main()
