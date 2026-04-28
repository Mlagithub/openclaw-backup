#!/bin/bash
#
# Memory Auto-Update Script
# 检查各 Agent 报告目录，有新报告则追加到 memory/YYYY-MM-DD.md
#

set -e

WORKSPACE="/home/one/.openclaw/agents/main/workspace"
REPORTS_DIR="$HOME/.openclaw-reports"
MEMORY_FILE="$WORKSPACE/memory/$(date +%Y-%m-%d).md"
STATE_FILE="$WORKSPACE/memory/.memory-update-state.json"

# Agent 列表
#AGENTS=("leader-agent" "code-agent" "test-agent" "review-agent" "design-agent" "search-agent" "docs-agent")
AGENTS=("dev-agent" "review-agent")

# 初始化状态文件
if [ ! -f "$STATE_FILE" ]; then
  echo '{}' >"$STATE_FILE"
fi

# 获取当前小时
HOUR=$(date +%H)

# 只在 11-23 点执行
if [ "$HOUR" -lt 11 ] || [ "$HOUR" -gt 23 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Outside working hours (11-23), skipping"
  exit 0
fi

# 确保 memory 目录存在
mkdir -p "$WORKSPACE/memory"

# 确保 memory 文件有标题
if [ ! -f "$MEMORY_FILE" ]; then
  echo "# $(date +%Y-%m-%d) Memory Log" >"$MEMORY_FILE"
  echo "" >>"$MEMORY_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for new agent reports..."

# 检查每个 Agent 的报告
for AGENT in "${AGENTS[@]}"; do
  AGENT_REPORTS_DIR="$REPORTS_DIR/$AGENT"

  if [ ! -d "$AGENT_REPORTS_DIR" ]; then
    continue
  fi

  # 获取最新报告
  LATEST_REPORT=$(ls -t "$AGENT_REPORTS_DIR"/*.md 2>/dev/null | head -1)

  if [ -z "$LATEST_REPORT" ]; then
    continue
  fi

  # 检查是否已处理
  LAST_PROCESSED=$(jq -r ".[\"$AGENT\"] // \"\"" "$STATE_FILE")

  if [ "$LATEST_REPORT" == "$LAST_PROCESSED" ]; then
    echo "  - $AGENT: No new reports"
    continue
  fi

  # 提取报告标题
  REPORT_TITLE=$(grep -m1 "^#\|^##" "$LATEST_REPORT" | sed 's/^#\+ *//' | head -c 50)
  TASK_NAME=$(basename "$LATEST_REPORT" .md)

  # 追加到 memory 文件
  cat >>"$MEMORY_FILE" <<EOF

## $(date +%H:%M) - $AGENT: $REPORT_TITLE
- Report: \`$LATEST_REPORT\`
- Status: ✅ Completed / 🔄 In Progress

EOF

  # 更新状态
  jq --arg agent "$AGENT" --arg report "$LATEST_REPORT" '.[$agent] = $report' "$STATE_FILE" >"$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

  echo "  - $AGENT: Added '$REPORT_TITLE' to memory"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Memory update complete"
