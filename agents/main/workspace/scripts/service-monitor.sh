#!/bin/bash
# 服务监控脚本 - 检查并自动重启失败的服务
# 用法: ./service-monitor.sh

# ==================== 配置区域 ====================

# 服务列表：名称|启动命令|工作目录|PID文件
SERVICES=(
  "habit-daemon|node scripts/daemon.js|/home/one/.openclaw/skills/habit-tracker|/tmp/habit-daemon.pid"
  "pdfmerge-web|source .venv/bin/activate && python app.py|/home/one/projects/pdfmerge-web|/tmp/pdfmerge-web.pid"
)

# 日志文件
LOG_FILE="/tmp/service-monitor.log"

# ==================== 函数定义 ====================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_and_restart() {
  local name="$1"
  local cmd="$2"
  local workdir="$3"
  local pidfile="$4"
  
  # 检查 PID 文件是否存在
  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile")
    
    # 检查进程是否存在
    if kill -0 "$pid" 2>/dev/null; then
      log "✅ $name (PID: $pid) 运行中"
      return 0
    else
      log "⚠️ $name (PID: $pid) 已停止，准备重启..."
    fi
  else
    log "⚠️ $name PID 文件不存在，准备启动..."
  fi
  
  # 启动服务
  cd "$workdir" || {
    log "❌ 无法进入目录: $workdir"
    return 1
  }
  
  # 启动守护进程
  nohup $cmd > /tmp/${name}.log 2>&1 &
  local new_pid=$!
  echo $new_pid > "$pidfile"
  
  sleep 2
  
  # 验证启动是否成功
  if kill -0 "$new_pid" 2>/dev/null; then
    log "✅ $name 启动成功 (PID: $new_pid)"
    return 0
  else
    log "❌ $name 启动失败"
    return 1
  fi
}

# ==================== 主程序 ====================

log "========== 开始检查服务 =========="

for service in "${SERVICES[@]}"; do
  IFS='|' read -r name cmd workdir pidfile <<< "$service"
  check_and_restart "$name" "$cmd" "$workdir" "$pidfile"
done

log "========== 检查完成 =========="
