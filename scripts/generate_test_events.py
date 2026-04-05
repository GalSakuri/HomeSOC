#!/usr/bin/env python3
"""Generate realistic fake security events and push them to the backend.

Usage:
    python scripts/generate_test_events.py [--url URL] [--count N] [--interval SECS]
"""

from __future__ import annotations

import argparse
import os
import random
import time
import uuid
from datetime import datetime, timezone

import httpx

BACKEND_URL = "http://localhost:8443"
DEFAULT_API_KEY = os.environ.get("HOMESOC_API_KEY", "")
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

SENSITIVE_FILE_PATHS = [
    "/etc/hosts",
    "/etc/sudoers",
    "/Library/LaunchDaemons/com.evil.plist",
    "/Library/LaunchAgents/com.backdoor.plist",
    "/usr/local/bin/malware",
]

EXTERNAL_IPS = [
    "142.250.80.46", "151.101.1.140", "104.244.42.65",
    "185.199.108.133", "13.107.42.14", "31.13.72.36",
    "52.84.123.45", "198.51.100.23", "203.0.113.42",
]

PRIVATE_IPS = ["192.168.1.1", "192.168.1.100", "10.0.0.1", "127.0.0.1"]

PORTS = [80, 443, 22, 53, 8080, 3000, 4444, 5555, 9001, 1337, 6667]

THIRD_PARTY_KEXTS = [
    "com.vmware.kext.vmci",
    "com.parallels.kext.hypervisor",
    "com.sophos.kext.sav",
    "com.suspicious.rootkit",
    "org.malware.kext.stealth",
]

VOLUME_NAMES = ["USB_DRIVE", "SANDISK", "BACKUP_DISK", "MY_PASSPORT", "KINGSTON"]


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pid() -> int:
    return random.randint(100, 65000)


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
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "process", "event_type": "process_exec",
        "severity": severity, "process_name": proc, "process_pid": _pid(),
        "process_ppid": random.randint(1, 1000), "process_path": path,
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
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "network", "event_type": "network_connection",
        "severity": severity,
        "process_name": random.choice(["curl", "Safari", "Chrome", "ssh", "nc", "python3"]),
        "process_pid": _pid(), "src_ip": "192.168.1.50",
        "src_port": random.randint(49152, 65535), "dst_ip": dst_ip,
        "dst_port": dst_port, "protocol": random.choice(["tcp", "udp"]),
        "source": "lsof",
    }


def generate_auth_event() -> dict:
    success = random.random() > 0.2
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "auth", "event_type": "auth_attempt",
        "severity": "info" if success else "medium",
        "auth_user": random.choice(["gal", "root", "admin"]),
        "auth_method": random.choice(["password", "biometric", "token"]),
        "auth_success": success,
        "process_name": random.choice(["sudo", "login", "sshd", "screensaver"]),
        "process_pid": _pid(), "source": "eslogger",
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
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "file", "event_type": f"file_{action}",
        "severity": severity, "file_path": path, "file_action": action,
        "process_name": random.choice(["bash", "python3", "node", "Finder"]),
        "process_pid": _pid(), "source": "eslogger",
    }


def generate_file_delete_event() -> dict:
    path = random.choice(SENSITIVE_FILE_PATHS)
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "file", "event_type": "file_delete",
        "severity": "medium", "file_path": path, "file_action": "delete",
        "process_name": random.choice(["bash", "rm", "python3"]),
        "process_pid": _pid(), "source": "eslogger",
    }


def generate_sudo_event() -> dict:
    success = random.random() > 0.25
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "auth", "event_type": "sudo_command",
        "severity": "medium" if success else "high",
        "auth_user": random.choice(["gal", "admin"]),
        "auth_success": success,
        "process_name": random.choice(["vim", "nano", "chmod", "chown", "python3"]),
        "process_pid": _pid(), "source": "eslogger",
    }


def generate_ssh_login_event() -> dict:
    success = random.random() > 0.4
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "auth", "event_type": "ssh_login",
        "severity": "low" if success else "medium",
        "auth_user": random.choice(["gal", "root", "ubuntu"]),
        "auth_method": "publickey" if success else "password",
        "auth_success": success,
        "src_ip": random.choice(EXTERNAL_IPS),
        "process_name": "sshd", "process_pid": _pid(), "source": "eslogger",
    }


def generate_remote_thread_event() -> dict:
    injector = random.choice(["suspicious_app", "unknown_process", "loader"])
    target = random.choice(["Finder", "Safari", "loginwindow", "SystemUIServer"])
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "process", "event_type": "remote_thread_create",
        "severity": "critical", "process_name": injector, "process_pid": _pid(),
        "process_path": f"/tmp/{injector}",
        "raw": {"target_process": target, "target_pid": _pid()},
        "source": "eslogger",
    }


def generate_task_inspect_event() -> dict:
    inspector = random.choice(["unknown_tool", "suspicious_app", "memory_reader"])
    target = random.choice(["Safari", "Mail", "1Password", "keychain"])
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "process", "event_type": "task_inspect",
        "severity": "high", "process_name": inspector, "process_pid": _pid(),
        "process_path": f"/tmp/{inspector}",
        "raw": {"target_process": target, "target_pid": _pid()},
        "source": "eslogger",
    }


def generate_privilege_escalation_event() -> dict:
    proc = random.choice(["exploit_poc", "bash", "python3", "unknown"])
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "process", "event_type": "privilege_escalation",
        "severity": "critical", "process_name": proc, "process_pid": _pid(),
        "process_path": f"/tmp/{proc}", "process_user": "root",
        "auth_user": "0",
        "source": "eslogger",
    }


def generate_volume_mount_event() -> dict:
    name = random.choice(VOLUME_NAMES)
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "system", "event_type": "volume_mount",
        "severity": "info", "file_path": f"/Volumes/{name}",
        "process_name": "diskarbitrationd", "process_pid": _pid(),
        "source": "eslogger",
    }


def generate_kextload_event() -> dict:
    kext = random.choice(THIRD_PARTY_KEXTS)
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "system", "event_type": "kextload",
        "severity": "high", "file_path": kext,
        "process_name": "kextd", "process_pid": _pid(),
        "source": "eslogger",
    }


def generate_screensharing_event() -> dict:
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "system", "event_type": "screensharing_attach",
        "severity": "high", "auth_user": random.choice(["gal", "admin"]),
        "auth_success": True, "src_ip": random.choice(EXTERNAL_IPS),
        "process_name": "screensharingd", "process_pid": _pid(),
        "source": "eslogger",
    }


def generate_malware_event() -> dict:
    signatures = ["MACOS.AMOS", "OSX.FakeAV", "OSX.Dok", "MACOS.GENIEO", "OSX.Pirrit"]
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": AGENT_ID,
        "platform": "macos", "category": "system", "event_type": "malware_detected",
        "severity": "critical",
        "file_path": random.choice([
            "/Users/gal/Downloads/installer.pkg",
            "/tmp/update.dmg",
            "/Users/gal/Desktop/invoice.pdf.app",
        ]),
        "process_name": "XProtect", "process_pid": _pid(),
        "raw": {"signature": random.choice(signatures)},
        "source": "eslogger",
    }


GENERATORS = [
    (generate_process_event,          0.20),
    (generate_network_event,          0.15),
    (generate_auth_event,             0.08),
    (generate_file_event,             0.12),
    (generate_file_delete_event,      0.06),
    (generate_sudo_event,             0.08),
    (generate_ssh_login_event,        0.08),
    (generate_remote_thread_event,    0.04),
    (generate_task_inspect_event,     0.04),
    (generate_privilege_escalation_event, 0.03),
    (generate_volume_mount_event,     0.05),
    (generate_kextload_event,         0.03),
    (generate_screensharing_event,    0.02),
    (generate_malware_event,          0.02),
]


def generate_batch(count: int) -> list[dict]:
    events = []
    for _ in range(count):
        r = random.random()
        cumulative = 0.0
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
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="Backend API key (default: HOMESOC_API_KEY env var)")
    args = parser.parse_args()

    headers = {"X-API-Key": args.api_key} if args.api_key else {}
    client = httpx.Client(timeout=10.0, headers=headers)

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
