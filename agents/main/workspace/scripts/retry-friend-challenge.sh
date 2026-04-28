#!/bin/bash
# Retry script for pending friend challenge message
# Run when network/proxy is fixed

MESSAGE_FILE="/home/one/.openclaw/agents/main/workspace/pending-telegram-message.md"
TARGET="6021596770"

if [ ! -f "$MESSAGE_FILE" ]; then
    echo "No pending message found"
    exit 1
fi

echo "Retrying Telegram send to $TARGET..."

# Extract message content (between **Content:** and **Status:**)
MESSAGE=$(sed -n '/^**Content:**/,/^**Status:**/p' "$MESSAGE_FILE" | sed '1d;$d' | sed 's/^```//' | sed 's/```$//')

# Try to send via openclaw message tool
openclaw message send --channel telegram --target "$TARGET" --message "$MESSAGE"

if [ $? -eq 0 ]; then
    echo "Message sent successfully"
    rm "$MESSAGE_FILE"
else
    echo "Send failed. Check network/proxy configuration."
fi
