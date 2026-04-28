#!/bin/bash
# start.sh - 启动 FSRS Memory Service

SKILL_DIR="/home/one/.openclaw/skills/fsrs-memory"

cd "$SKILL_DIR"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在"
    echo "请先复制配置: cp .env.example .env"
    echo "然后编辑 .env 填入你的 Discord Webhook URL"
    exit 1
fi

# 加载环境变量
source .env

# 检查 Webhook URL
if [ -z "$DISCORD_WEBHOOK_URL" ] || [ "$DISCORD_WEBHOOK_URL" == "https://discord.com/api/webhooks/your-webhook-here" ]; then
    echo "⚠️  DISCORD_WEBHOOK_URL 未配置"
    echo "请编辑 .env 填入你的 Discord Webhook URL"
    exit 1
fi

echo "🚀 启动 FSRS Memory Service..."
echo "📡 Webhook: ${DISCORD_WEBHOOK_URL:0:50}..."
echo "⏱️  间隔: ${CHECK_INTERVAL:-30000}ms"

# 启动服务
exec node service.js
