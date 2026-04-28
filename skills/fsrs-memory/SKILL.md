---
name: fsrs-memory
description: FSRS 间隔重复记忆系统 - 真正实时 Discord 提醒
version: "3.0.0"
metadata:
  openclaw:
    requires:
      bins:
        - node
env:
  - name: DISCORD_WEBHOOK_URL
    description: Discord Webhook URL 必填
  - name: DISCORD_CHANNEL_ID
    description: Discord 频道 ID
  - name: CHECK_INTERVAL
    description: 检查间隔毫秒数
  - name: REMINDER_COOLDOWN
    description: 同一卡片提醒冷却时间
  - name: VERBOSE
    description: 详细日志
files:
  read:
    - <SKILL>/data/cards.db
  write:
    - <SKILL>/data/cards.db
---

# FSRS Memory - 间隔重复记忆系统 v3.0 (实时版)

## ✨ 核心特性

- **真正实时**：默认 30 秒检查一次，秒级触发提醒
- **即时发送**：检测到到期卡片后立即通过 Discord Webhook 发送
- **防骚扰**：同一卡片 24 小时内只提醒一次
- **FSRS 优化**：新卡片首次复习可能只需要几分钟

## 架构

```
fsrs-memory/
├── SKILL.md              # 本文档
├── README.md             # 使用说明
├── .env.example          # 配置示例
├── handler.js            # Discord 消息处理（交互命令）
├── service.js            # 服务实时提醒守护进程（）
├── package.json          # 依赖管理
├── src/
│   ├── storage.js        # SQLite 存储
│   ├── fsrs.js           # FSRS 算法封装
│   └── scheduler.js      # 复习调度器
└── data/
    ├── cards.db          # 卡片数据库
    └── reminder-state.json  # 提醒状态
```

## 配置步骤

### 1. 获取 Discord Webhook URL

1. 进入 Discord 服务器设置
2. 选择 **整合** → **Webhooks**
3. 点击 **新建 Webhook**
4. 填写名称，选择频道
5. 点击 **复制 Webhook URL**

### 2. 配置环境变量

```bash
# 复制配置示例
cp .env.example .env

# 编辑 .env 文件
nano .env

# 填入你的 Webhook URL:
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/xxx
```

### 3. 启动服务

```bash
# 开发测试
node service.js

# 后台运行
nohup node service.js > fsrs.log 2>&1 &

# 使用 PM2 (推荐)
pm2 start service.js --name fsrs
pm2 logs fsrs
```

## 工作流程

### 实时提醒模式 (service.js)

```
用户添加卡片
     │
     ▼
┌─────────────────┐
│  SQLite 存储   │
│  (due_date)    │
└─────────────────┘
     │
     │ 每 30 秒
     ▼
┌─────────────────┐     ┌──────────────────┐
│ service.js      │────▶│ 检查到期卡片    │
│ (长期运行守护)  │     │ due_date <= now │
└─────────────────┘     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ 冷却时间检查    │
                     │ (24小时内不重复) │
                     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Discord Webhook  │
                     │ 即时发送提醒     │
                     └──────────────────┘
```

### 交互命令模式 (handler.js)

```
用户发送消息
     │
     ▼
┌─────────────────┐
│ handler.js      │
│ (消息事件触发)  │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 解析命令/卡片  │
├─────────────────┤
│ • 添加 问答    │
│ • 列表         │
│ • 统计         │
│ • 复习         │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 执行并返回结果 │
└─────────────────┘
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DISCORD_WEBHOOK_URL` | (必填) | Discord Webhook URL |
| `DISCORD_CHANNEL_ID` | 1475722914904014958 | 频道 ID |
| `CHECK_INTERVAL` | 30000 | 检查间隔 (毫秒) |
| `REMINDER_COOLDOWN` | 86400000 | 冷却时间 (毫秒) |
| `VERBOSE` | false | 详细日志 |
| `ENABLE_HEALTH_CHECK` | false | 启用健康检查 |
| `HEALTH_CHECK_PORT` | 3000 | 健康检查端口 |

## 为什么 30 秒间隔？

FSRS 算法的特点：
- 新卡片首次复习间隔可能是 **几分钟到几小时**
- 如果间隔太长，会错过最佳复习时机
- 30 秒平衡了及时性和系统开销

## 在 OpenClaw 中运行

```bash
# 方式 1: 直接运行
openclaw exec -- workdir=/home/one/.openclaw/skills/fsfs-memory node service.js

# 方式 2: 后台运行
openclaw exec --background -- workdir=/home/one/.openclaw/skills/fsrs-memory node service.js
```

## 健康检查

启用后可访问 `http://localhost:3000/health` 查看服务状态：

```json
{
  "status": "ok",
  "dueCards": 3,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
