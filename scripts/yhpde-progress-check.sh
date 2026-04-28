#!/bin/bash
# yhpde 项目进展检查脚本

PROJECT_DIR="/home/one/projects/yhpde"
RALPH_LOG_DIR="$PROJECT_DIR/.ralph/logs"
FIX_PLAN="$PROJECT_DIR/.ralph/fix_plan.md"

# 检查 Ralph 进程状态
RALPH_PID=$(pgrep -f "ralph_loop.sh" | head -1)
if [ -n "$RALPH_PID" ]; then
    STATUS="🟢 Ralph 运行中 (PID: $RALPH_PID)"
else
    STATUS="🔴 Ralph 未运行"
fi

# 统计 fix_plan.md 中的任务进度
TOTAL_TASKS=$(grep -c "^\- \[" "$FIX_PLAN" 2>/dev/null || echo "0")
COMPLETED_TASKS=$(grep -c "^\- \[x\]" "$FIX_PLAN" 2>/dev/null || echo "0")
PENDING_TASKS=$((TOTAL_TASKS - COMPLETED_TASKS))

# 计算百分比
if [ "$TOTAL_TASKS" -gt 0 ]; then
    PERCENT=$((COMPLETED_TASKS * 100 / TOTAL_TASKS))
else
    PERCENT=0
fi

# 检查当前 Phase
CURRENT_PHASE=$(grep -E "^## Phase [0-9]" "$FIX_PLAN" | tail -1 | sed 's/## //')

# 获取最新日志文件
LATEST_LOG=$(ls -t "$RALPH_LOG_DIR"/claude_output_*.log 2>/dev/null | head -1)
LATEST_ERROR_LOG="$RALPH_LOG_DIR/build_errors.log"

# 获取最近 5 分钟的活动
if [ -f "$LATEST_LOG" ]; then
    RECENT_ACTIVITY=$(tail -50 "$LATEST_LOG" 2>/dev/null | grep -E "(Phase|Fix|Error|✓|成功|完成)" | tail -5)
else
    RECENT_ACTIVITY="无最新日志"
fi

# 输出汇报
echo "📊 yhpde 项目进展汇报 ($(date '+%Y-%m-%d %H:%M'))"
echo ""
echo "$STATUS"
echo ""
echo "**任务进度:** $COMPLETED_TASKS/$TOTAL_TASKS 完成 (${PERCENT}%)"
echo "**当前阶段:** $CURRENT_PHASE"
echo "**待处理:** $PENDING_TASKS 个任务"
echo ""
echo "**最近活动:**"
echo "$RECENT_ACTIVITY"
echo ""
echo "---"
echo "详细日志: $LATEST_LOG"