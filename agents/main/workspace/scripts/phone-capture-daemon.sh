#!/bin/bash
# Phone Capture Daemon - takes photos every 5 min (5:00-23:00)
# Sends log every hour

PHOTO_DIR="$HOME/capture-photos"
LOG_FILE="$PHOTO_DIR/capture.log"
LAST_LOG_SEND="$PHOTO_DIR/.last_log_send"

mkdir -p "$PHOTO_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_log() {
    if [ -f "$LOG_FILE" ]; then
        termux-notification --title "Photo Capture Log" --content "$(tail -20 "$LOG_FILE")"
        log "Log sent via notification"
    fi
}

capture_photo() {
    local hour=$(date '+%-H')
    
    if [ "$hour" -ge 5 ] && [ "$hour" -le 23 ]; then
        local timestamp=$(date '+%Y%m%d_%H%M%S')
        local photo_path="$PHOTO_DIR/photo_$timestamp.jpg"
        
        log "Taking photo..."
        
        if termux-camera-photo "$photo_path" 2>&1; then
            log "Photo saved: $photo_path"
        else
            log "Photo failed"
        fi
    else
        log "Outside capture hours (5-23), skipping"
    fi
}

log "Daemon started"

while true; do
    capture_photo
    
    current_hour=$(date '+%Y%m%d%H')
    if [ -f "$LAST_LOG_SEND" ]; then
        last_send=$(cat "$LAST_LOG_SEND")
        if [ "$current_hour" != "$last_send" ]; then
            send_log
            echo "$current_hour" > "$LAST_LOG_SEND"
        fi
    else
        echo "$current_hour" > "$LAST_LOG_SEND"
    fi
    
    sleep 300
done