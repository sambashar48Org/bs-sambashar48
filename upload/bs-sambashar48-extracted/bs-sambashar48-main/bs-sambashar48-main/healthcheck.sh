#!/bin/bash
# B.S Evaluation - Health Check & Auto-Restart Script
# Run via cron every 2 minutes

APP_DIR="/home/z/my-project"
PID_FILE="$APP_DIR/logs/server.pid"
LOG_FILE="$APP_DIR/logs/server.log"
HEALTH_URL="http://127.0.0.1:${PORT:-3000}/api/auth/me"

mkdir -p "$APP_DIR/logs"

check_and_restart() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  # Check if PID file exists
  if [ ! -f "$PID_FILE" ]; then
    echo "[$timestamp] No PID file found. Starting server..."
    bash "$APP_DIR/start.sh"
    return
  fi

  # Check if process is alive
  local pid=$(cat "$PID_FILE")
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "[$timestamp] Process $pid is dead. Restarting..." >> "$LOG_FILE"
    bash "$APP_DIR/start.sh"
    return
  fi

  # Check HTTP health
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HEALTH_URL" 2>/dev/null)
  if [ "$http_code" = "000" ] || [ -z "$http_code" ]; then
    echo "[$timestamp] Server not responding (HTTP: $http_code). Restarting..." >> "$LOG_FILE"
    kill "$pid" 2>/dev/null || true
    sleep 2
    bash "$APP_DIR/start.sh"
  fi
}

check_and_restart
