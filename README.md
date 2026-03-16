# HomeSOC

**Home Security Operations Center** — a real-time, agent-based network security monitoring system that runs entirely on your local network. No cloud dependencies.

![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## What Is This?

HomeSOC is a lightweight SOC (Security Operations Center) you can run at home. It deploys agents on your machines that collect security-relevant events — process executions, file changes, network connections, authentication attempts — and streams them to a central backend for detection and alerting.

A real-time dashboard gives you full visibility into what's happening across your machines.

### Key Features

- **Real-time event streaming** via WebSocket live feed
- **Detection engine** with YAML-based rules (single-event and threshold-based)
- **macOS agent** powered by Apple's Endpoint Security framework (`eslogger`)
- **Interactive dashboard** with timeline charts, alert panels, and agent management
- **Zero cloud dependencies** — everything runs locally on your network
- **SQLite with WAL mode** for fast concurrent reads/writes

---

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌──────────────────┐     WebSocket      ┌─────────────┐
│  macOS Agent │ ──────────────────▶│  FastAPI Backend  │◀──────────────────▶│  React       │
│  (eslogger,  │   POST /api/v1/   │                   │    /ws/live        │  Dashboard   │
│   network)   │     events        │  ┌─────────────┐  │                    │  (Vite +     │
└─────────────┘                    │  │  Detection   │  │                    │   Tailwind)  │
                                   │  │  Engine      │  │                    └─────────────┘
┌─────────────┐                    │  └──────┬──────┘  │
│  Windows     │ ──────────────────▶│         │         │
│  Agent (WIP) │                    │  ┌──────▼──────┐  │
└─────────────┘                    │  │  SQLite DB   │  │
                                   │  │  (WAL mode)  │  │
                                   │  └─────────────┘  │
                                   └──────────────────┘
```

---

## Project Structure

```
HomeSoc/
├── shared/               # Pydantic schemas, enums, protocol models
│   ├── schemas.py        # NormalizedEvent, Alert, AgentInfo
│   ├── enums.py          # Platform, EventCategory, Severity
│   └── protocol.py       # Transport models (EventBatch, Heartbeat)
│
├── backend/              # FastAPI server
│   ├── main.py           # App entry point, lifespan, CORS, WebSocket
│   ├── config.py         # Settings via environment variables
│   ├── api/              # REST endpoints (events, alerts, agents, rules)
│   ├── db/               # SQLite connection, repository, schema
│   ├── engine/           # Detection engine + YAML rule loader
│   ├── ingestion/        # Event processing pipeline
│   └── rules/            # YAML detection rule files
│
├── agents/
│   ├── common/           # Base agent, HTTP transport with batching
│   ├── macos/            # macOS agent (eslogger + network collectors)
│   └── windows/          # Windows agent (planned)
│
├── dashboard/            # React 18 + Vite + TypeScript + Tailwind
│   └── src/
│       ├── api/          # REST client + WebSocket manager
│       ├── components/   # Dashboard widgets, event table, layout
│       ├── hooks/        # useWebSocket, useAlerts, useEvents
│       ├── pages/        # Dashboard, Events, Alerts, Agents, Rules, Settings, Guide
│       └── contexts/     # Settings context with localStorage persistence
│
└── scripts/
    └── generate_test_events.py   # Test event generator
```

---

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **macOS 13+** (for the macOS agent — `eslogger` requires Ventura or later)

### 1. Install Backend Dependencies

```bash
cd backend
pip3 install -r requirements.txt
```

### 2. Start the Backend

```bash
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8443 --reload
```

The backend will start on `http://localhost:8443`. You can view the API docs at `http://localhost:8443/docs`.

### 3. Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Run the macOS Agent

> Requires `sudo` and **Full Disk Access** for your terminal app.
> Grant it in: **System Settings → Privacy & Security → Full Disk Access**

```bash
cd agents/macos
sudo python3 main.py
```

Optional flags:

```bash
sudo python3 main.py --agent-id MyMacBook --backend-url http://192.168.1.100:8443
```

### 5. Generate Test Events (Optional)

If you want to see the dashboard in action without running a real agent:

```bash
python3 scripts/generate_test_events.py
```

Options: `--url`, `--count`, `--interval`

---

## Detection Rules

Rules are defined in YAML files under `backend/rules/`. HomeSOC supports two rule types:

### Single-Event Rules

Fire immediately when an event matches all conditions.

### Threshold Rules

Fire when a condition is met N times within a time window.

### Built-in Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Suspicious Shell Spawn | HIGH | Shell spawned from a non-terminal parent process |
| Execution from /tmp | MEDIUM | Process running from /tmp, /var/tmp, or Downloads |
| Suspicious Tool Usage | HIGH | Known recon/exfil tools (nmap, nc, netcat, tcpdump, etc.) |
| LaunchDaemon Created | HIGH | New LaunchDaemon or LaunchAgent plist (persistence) |
| Unusual Outbound Port | MEDIUM | Outbound connection on uncommon ports |
| Known C2 Port | CRITICAL | Connection to common C2 ports (4444, 1337, 6667, etc.) |
| Brute Force Auth | CRITICAL | 5+ failed authentication attempts within 60 seconds |

### Writing Custom Rules

Create a new `.yml` file in `backend/rules/`:

```yaml
rules:
  - id: my-custom-rule
    name: My Custom Detection
    type: single          # or "threshold"
    platform: macos
    severity: high
    description: Detects something suspicious
    conditions:
      category: process
      event_type: process_exec
      match:
        process_name: suspicious-binary
```

Rules are loaded automatically on backend startup.

---

## Event Categories

| Category | Examples |
|----------|---------|
| **Process** | Executions, signals, suspicious binaries |
| **File** | Create, open, rename operations |
| **Network** | Outbound connections, unusual ports, DNS |
| **Authentication** | Login attempts, auth failures |

### Severity Levels

`info` → `low` → `medium` → `high` → `critical`

---

## Configuration

The backend is configured via environment variables with the `HOMESOC_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOMESOC_HOST` | `0.0.0.0` | Bind address |
| `HOMESOC_PORT` | `8443` | Server port |
| `HOMESOC_DB_PATH` | `backend/data/events.db` | SQLite database path |
| `HOMESOC_RULES_DIR` | `backend/rules/` | Detection rules directory |
| `HOMESOC_CORS_ORIGINS` | `localhost:5173,3000` | Allowed CORS origins |
| `HOMESOC_EVENT_RETENTION_DAYS` | `7` | Event retention period |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/events` | Ingest event batch |
| `GET` | `/api/v1/events` | Query events (filters: category, severity, agent_id) |
| `GET` | `/api/v1/events/{id}` | Get single event |
| `DELETE` | `/api/v1/events` | Clear all events |
| `GET` | `/api/v1/alerts` | List alerts (filters: status, severity) |
| `PATCH` | `/api/v1/alerts/{id}` | Update alert status |
| `DELETE` | `/api/v1/alerts` | Clear all alerts |
| `POST` | `/api/v1/register` | Register agent |
| `POST` | `/api/v1/heartbeat` | Agent heartbeat |
| `GET` | `/api/v1/agents` | List agents |
| `POST` | `/api/v1/agents/{id}/stop` | Stop agent remotely |
| `POST` | `/api/v1/agents/{id}/resume` | Resume agent |
| `DELETE` | `/api/v1/agents/{id}` | Remove agent |
| `GET` | `/api/v1/rules` | List detection rules |
| `GET` | `/api/v1/dashboard/summary` | Dashboard summary stats |
| `WS` | `/ws/live` | Real-time event/alert stream |
| `GET` | `/health` | Health check |

Full interactive docs available at `http://localhost:8443/docs` when the backend is running.

---

## Tech Stack

**Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic, aiosqlite, PyYAML, httpx

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, React Router

**Storage:** SQLite with WAL mode

**Agent Transport:** Async HTTP with batching, buffering, and retry logic

---

## Roadmap

- [ ] Windows agent (Event Log, Sysmon, WMI, netstat)
- [ ] Linux agent (auditd, syslog)
- [ ] Event retention enforcement (auto-cleanup)
- [ ] Alert notification integrations (Slack, Discord, email)
- [ ] Agent auto-update mechanism
- [ ] TLS/mTLS between agents and backend
- [ ] Multi-user authentication for the dashboard

---

## License

MIT
