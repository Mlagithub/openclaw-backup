#!/bin/bash
# yhpde Ralph progress check script
# Sends wake event to OpenClaw every 30 minutes

RALPH_DIR="/home/one/projects/yhpde/.ralph"
RALPH_STATUS_JSON="$RALPH_DIR/status.json"
EX_303="/home/one/projects/yhpde/examples/ex_303/ex_303.cpp"
STATUS_FILE="/tmp/yhpde-ralph-status.txt"

# Check if Ralph is running
if pgrep -f "claude.*yhpde" > /dev/null 2>&1; then
    RALPH_STATUS="running"
else
    RALPH_STATUS="stopped"
fi

# Get loop count
LOOP_COUNT=$(jq -r '.loop_count // 0' "$RALPH_STATUS_JSON" 2>/dev/null || echo "0")

# Get ex_303 line count
EX_303_LINES=$(wc -l < "$EX_303" 2>/dev/null || echo "unknown")

# Check for shim violations
SHIM_COUNT=$(grep -r "libmesh_shim\|libmesh/" ~/projects/yhpde/include/yhpde/ 2>/dev/null | wc -l || echo "0")

# Check for detail code in ex_303
DETAIL_COUNT=$(grep -E "tri_geo|KSPSolve|KSPCreate|VecSetValues|Au\.add|Ap\.add" "$EX_303" 2>/dev/null | wc -l || echo "0")

# Write status to temp file
cat > "$STATUS_FILE" << EOF
ralph_status=$RALPH_STATUS
loop_count=$LOOP_COUNT
ex_303_lines=$EX_303_LINES
shim_violations=$SHIM_COUNT
detail_violations=$DETAIL_COUNT
timestamp=$(date -Iseconds)
EOF

# Send wake event to OpenClaw main session
/home/one/.npm-global/bin/openclaw system event --text "yhpde-ralph-progress: Ralph=$RALPH_STATUS Loop=$LOOP_COUNT ex_303=$EX_303_LINES shims=$SHIM_COUNT details=$DETAIL_COUNT" --mode next-heartbeat