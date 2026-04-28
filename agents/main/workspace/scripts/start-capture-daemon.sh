#!/bin/bash
# Start capture daemon in background

SCRIPT_DIR="/data/data/com.termux/files/home/capture-photos"
LOG_FILE="$SCRIPT_DIR/daemon.log"

# Check if already running
if pgrep -f "capture-daemon.sh" > /dev/null; then
    echo "Daemon already running"
    exit 1
fi

# Start in background
nohup bash "$SCRIPT_DIR/capture-daemon.sh" >> "$LOG_FILE" 2>&1 &

echo "Daemon started with PID $!"