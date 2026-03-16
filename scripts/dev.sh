#!/bin/bash
# Start HomeSOC backend and dashboard in development mode.
# Usage: ./scripts/dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  HomeSOC Development Server"
echo "============================================"

# Activate venv
if [ -f "$PROJECT_DIR/.venv/bin/activate" ]; then
    source "$PROJECT_DIR/.venv/bin/activate"
fi

# Start backend
echo "[1/2] Starting FastAPI backend on :8443..."
cd "$PROJECT_DIR"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8443 --reload &
BACKEND_PID=$!

# Start dashboard
echo "[2/2] Starting Vite dashboard on :5173..."
cd "$PROJECT_DIR/dashboard"
npm run dev &
DASHBOARD_PID=$!

echo ""
echo "  Backend:   http://localhost:8443"
echo "  Dashboard: http://localhost:5173"
echo "  API Docs:  http://localhost:8443/docs"
echo ""
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $DASHBOARD_PID 2>/dev/null; exit 0" INT TERM

wait
