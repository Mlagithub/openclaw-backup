#!/bin/bash
# ecp 项目进展检查脚本

PROJECT_DIR="/home/one/projects/ecp"
RALPH_LOG_DIR="$PROJECT_DIR/.ralph/logs"
FIX_PLAN="$PROJECT_DIR/.ralph/fix_plan.md"

# 检查 Ralph 进程状态
RALPH_PID=$(pgrep -f "ralph_loop.sh.*ecp" | head -1)
if [ -n "$RALPH_PID" ]; then
    STATUS="🟢 Ralph 运行中 (PID: $RALPH_PID)"
else
    # 检查是否有 claude 进程在 ecp 目录工作
    CLAUDE_PID=$(pgrep -f "claude.*ecp" | head -1)
    if [ -n "$CLAUDE_PID" ]; then
        STATUS="🟡 Claude 正在执行 (PID: $CLAUDE_PID)"
    else
        STATUS="🔴 Ralph 未运行"
    fi
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

# 获取最近活动摘要
if [ -f "$LATEST_LOG" ]; then
    # 从 JSON 流日志中提取有意义的内容
    RECENT_ACTIVITY=$(tail -100 "$LATEST_LOG" 2>/dev/null | grep -E '"type":"assistant"' | tail -3 | jq -r '.message.content[]?.text // .message.content[]?.input?.description // empty' 2>/dev/null | head -5)
    if [ -z "$RECENT_ACTIVITY" ]; then
        RECENT_ACTIVITY=$(tail -50 "$LATEST_LOG" 2>/dev/null | grep -oE 'git clone|Build|Run|Phase|Error|成功|完成' | tail -5)
    fi
else
    RECENT_ACTIVITY="无最新日志"
fi

# 检查是否有 IAMR 相关的目录（表示 Phase 1 进展）
IAMR_STATUS=""
if [ -d "$PROJECT_DIR/amrex" ]; then
    IAMR_STATUS="✓ amrex 已克隆"
fi
if [ -d "$PROJECT_DIR/AMReX-Hydro" ]; then
    IAMR_STATUS="$IAMR_STATUS, ✓ AMReX-Hydro 已克隆"
fi
if [ -d "$PROJECT_DIR/IAMR" ]; then
    IAMR_STATUS="$IAMR_STATUS, ✓ IAMR 已克隆"
fi

# 输出汇报
echo "📊 ecp 项目进展汇报 ($(date '+%Y-%m-%d %H:%M'))"
echo ""
echo "$STATUS"
echo ""
echo "**任务进度:** $COMPLETED_TASKS/$TOTAL_TASKS 完成 (${PERCENT}%)"
echo "**当前阶段:** $CURRENT_PHASE"
echo "**待处理:** $PENDING_TASKS 个任务"
if [ -n "$IAMR_STATUS" ]; then
    echo ""
    echo "**IAMR 状态:** $IAMR_STATUS"
fi
echo ""
echo "**最近活动:**"
echo "$RECENT_ACTIVITY"
echo ""
echo "---"
echo "详细日志: $LATEST_LOG"