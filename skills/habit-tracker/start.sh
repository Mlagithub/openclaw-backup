#!/bin/bash
# Habit Tracker Combined Service
# 同时启动 Web 服务和提醒守护进程

# 设置代理
export HTTP_PROXY=http://192.168.1.116:7890
export HTTPS_PROXY=http://192.168.1.116:7890

WEB_PORT=3847

# 检查端口是否被占用
check_port() {
    if lsof -i :$WEB_PORT > /dev/null 2>&1; then
        return 0  # 端口被占用
    fi
    return 1  # 端口可用
}

# 检查是否已有进程在运行
check_process() {
    if pgrep -f "node.*server.js" > /dev/null 2>&1; then
        return 0  # 有进程运行中
    fi
    return 1  # 无进程
}

echo "检查 Habit Tracker 服务状态..."

# 检查端口
if check_port; then
    echo "❌ 端口 $WEB_PORT 已被占用"
    echo "占用进程:"
    lsof -i :$WEB_PORT 2>/dev/null || ss -tlnp | grep $WEB_PORT
    echo ""
    echo "请先停止现有服务: pkill -f 'node.*server.js'"
    exit 1
fi

# 检查进程
if check_process; then
    echo "❌ 已有 Habit Tracker 相关进程在运行"
    echo "运行中的进程:"
    pgrep -af "node.*server.js"
    echo ""
    echo "请先停止现有服务: pkill -f 'node.*server.js'"
    exit 1
fi

cd /home/one/.openclaw/skills/habit-tracker

# 启动网页服务
cd web
node server.js > /tmp/habit-web.log 2>&1 &
WEB_PID=$!

# 启动提醒服务
cd ../scripts
node reminder-daemon.js > /tmp/habit-reminder.log 2>&1 &
REMINDER_PID=$!

echo "✅ Habit Tracker 服务已启动"
echo "Web PID: $WEB_PID"
echo "Reminder PID: $REMINDER_PID"
echo "Web 日志: /tmp/habit-web.log"
echo "Reminder 日志: /tmp/habit-reminder.log"

# 保存 PID 到文件
echo "$WEB_PID $REMINDER_PID" > /tmp/habit-tracker.pid

# 等待任意一个进程退出
wait