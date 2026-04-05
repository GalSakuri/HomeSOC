"""Demo endpoint for generating test events from the dashboard."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])

_PROCESS_NAMES = ["bash", "zsh", "python3", "node", "curl", "ssh", "git", "nc", "nmap", "base64"]
_SUSPICIOUS = {"nc", "nmap", "base64"}
_EXTERNAL_IPS = ["142.250.80.46", "151.101.1.140", "104.244.42.65", "198.51.100.23"]
_PORTS = [80, 443, 22, 4444, 1337, 8080]
_VOLUME_NAMES = ["USB_DRIVE", "SANDISK", "MY_PASSPORT", "KINGSTON"]
_THIRD_PARTY_KEXTS = ["com.suspicious.rootkit", "org.malware.kext.stealth", "com.thirdparty.driver"]
_SENSITIVE_PATHS = [
    "/etc/hosts", "/etc/sudoers",
    "/Library/LaunchDaemons/com.evil.plist",
    "/Library/LaunchAgents/com.backdoor.plist",
    "/usr/local/bin/malware",
]
_MALWARE_SIGS = ["MACOS.AMOS", "OSX.FakeAV", "OSX.Dok", "MACOS.GENIEO"]


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pid() -> int:
    return random.randint(100, 65000)


def _gen_process() -> dict:
    proc = random.choice(_PROCESS_NAMES)
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "process", "event_type": "process_exec",
        "severity": "high" if proc in _SUSPICIOUS else "info",
        "process_name": proc, "process_pid": _pid(),
        "process_path": f"/tmp/{proc}" if proc in _SUSPICIOUS else f"/usr/bin/{proc}",
        "process_user": random.choice(["gal", "root"]),
        "source": "demo",
    }


def _gen_network() -> dict:
    port = random.choice(_PORTS)
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "network", "event_type": "network_connection",
        "severity": "critical" if port in (4444, 1337) else "info",
        "process_name": random.choice(["curl", "Safari", "nc"]),
        "src_ip": "192.168.1.50", "src_port": random.randint(49152, 65535),
        "dst_ip": random.choice(_EXTERNAL_IPS), "dst_port": port,
        "protocol": "tcp", "source": "demo",
    }


def _gen_auth() -> dict:
    success = random.random() > 0.3
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "auth", "event_type": "auth_attempt",
        "severity": "info" if success else "medium",
        "auth_user": random.choice(["gal", "root", "admin"]),
        "auth_method": "password", "auth_success": success,
        "process_name": "sudo", "source": "demo",
    }


def _gen_sudo() -> dict:
    success = random.random() > 0.25
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "auth", "event_type": "sudo_command",
        "severity": "medium" if success else "high",
        "auth_user": random.choice(["gal", "admin"]),
        "auth_success": success,
        "process_name": random.choice(["vim", "chmod", "python3"]),
        "process_pid": _pid(), "source": "demo",
    }


def _gen_ssh() -> dict:
    success = random.random() > 0.4
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "auth", "event_type": "ssh_login",
        "severity": "low" if success else "medium",
        "auth_user": random.choice(["gal", "root"]),
        "auth_method": "publickey" if success else "password",
        "auth_success": success,
        "src_ip": random.choice(_EXTERNAL_IPS),
        "process_name": "sshd", "process_pid": _pid(), "source": "demo",
    }


def _gen_file_delete() -> dict:
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "file", "event_type": "file_delete",
        "severity": "medium", "file_path": random.choice(_SENSITIVE_PATHS),
        "file_action": "delete",
        "process_name": random.choice(["bash", "rm"]),
        "process_pid": _pid(), "source": "demo",
    }


def _gen_remote_thread() -> dict:
    injector = random.choice(["suspicious_app", "loader", "unknown"])
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "process", "event_type": "remote_thread_create",
        "severity": "critical", "process_name": injector, "process_pid": _pid(),
        "process_path": f"/tmp/{injector}",
        "raw": {"target_process": random.choice(["Safari", "Finder", "Mail"]), "target_pid": _pid()},
        "source": "demo",
    }


def _gen_task_inspect() -> dict:
    inspector = random.choice(["memory_reader", "unknown_tool"])
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "process", "event_type": "task_inspect",
        "severity": "high", "process_name": inspector, "process_pid": _pid(),
        "process_path": f"/tmp/{inspector}",
        "raw": {"target_process": random.choice(["1Password", "Safari", "Mail"]), "target_pid": _pid()},
        "source": "demo",
    }


def _gen_privilege_escalation() -> dict:
    proc = random.choice(["exploit_poc", "bash", "python3"])
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "process", "event_type": "privilege_escalation",
        "severity": "critical", "process_name": proc, "process_pid": _pid(),
        "process_path": f"/tmp/{proc}", "process_user": "root",
        "auth_user": "0", "source": "demo",
    }


def _gen_volume_mount() -> dict:
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "system", "event_type": "volume_mount",
        "severity": "info", "file_path": f"/Volumes/{random.choice(_VOLUME_NAMES)}",
        "process_name": "diskarbitrationd", "process_pid": _pid(), "source": "demo",
    }


def _gen_kextload() -> dict:
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "system", "event_type": "kextload",
        "severity": "high", "file_path": random.choice(_THIRD_PARTY_KEXTS),
        "process_name": "kextd", "process_pid": _pid(), "source": "demo",
    }


def _gen_screensharing() -> dict:
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "system", "event_type": "screensharing_attach",
        "severity": "high", "auth_user": "gal", "auth_success": True,
        "src_ip": random.choice(_EXTERNAL_IPS),
        "process_name": "screensharingd", "process_pid": _pid(), "source": "demo",
    }


def _gen_malware() -> dict:
    return {
        "id": str(uuid.uuid4()), "timestamp": _ts(), "agent_id": "demo-agent",
        "platform": "macos", "category": "system", "event_type": "malware_detected",
        "severity": "critical",
        "file_path": random.choice([
            "/Users/gal/Downloads/installer.pkg",
            "/tmp/update.dmg",
            "/Users/gal/Desktop/invoice.pdf.app",
        ]),
        "process_name": "XProtect", "process_pid": _pid(),
        "raw": {"signature": random.choice(_MALWARE_SIGS)},
        "source": "demo",
    }


_GENERATORS = [
    (_gen_process,              0.18),
    (_gen_network,              0.14),
    (_gen_auth,                 0.08),
    (_gen_sudo,                 0.10),
    (_gen_ssh,                  0.10),
    (_gen_file_delete,          0.08),
    (_gen_remote_thread,        0.06),
    (_gen_task_inspect,         0.06),
    (_gen_privilege_escalation, 0.05),
    (_gen_volume_mount,         0.06),
    (_gen_kextload,             0.04),
    (_gen_screensharing,        0.03),
    (_gen_malware,              0.02),
]


def _pick() -> dict:
    r = random.random()
    cumulative = 0.0
    for gen, weight in _GENERATORS:
        cumulative += weight
        if r <= cumulative:
            return gen()
    return _gen_process()


@router.post("/generate")
async def generate_test_events(
    request: Request,
    count: int = Query(default=10, ge=1, le=100),
) -> dict:
    """Generate test events and push them through the ingestion pipeline."""
    events = [_pick() for _ in range(count)]
    pipeline = request.app.state.pipeline
    stored, alerts = await pipeline.process_batch(events)
    return {"events_generated": stored, "alerts_triggered": alerts}
