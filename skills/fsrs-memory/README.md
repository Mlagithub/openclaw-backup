# FSRS Memory - 间隔重复记忆系统 (实时版)

在 Discord 中管理你的记忆卡片，基于强大的 FSRS 算法。

## ✨ 新版特性：真正实时提醒

- **秒级检测**：默认 30 秒检查一次到期卡片
- **即时通知**：检测到到期卡片后立即发送 Discord Webhook
- **防骚扰**：同一卡片 24 小时内只提醒一次
- **FSRS 优化**：新卡片首次复习可能只需要几分钟，实时检测不遗漏

## 快速开始

### 1. 配置 Discord Webhook

```bash
# 复制配置示例
cp .env.example .env

# 编辑 .env，填入你的 Discord Webhook URL
# 创建方法: Discord 服务器设置 → 整合 → Webhooks → 新建 Webhook
```

### 2. 安装依赖
```bash
cd /home/one/.openclaw/skills/fsrs-memory
npm install
```

### 3. 启动服务守护
```bash
# 开发测试 (前台运行)
node service.js

# 生产环境 (后台运行)
node service.js > /var/log/fsrs.log 2>&1 &

# 或使用 PM2
pm2 start service.js --name fsrs
```

### 4. 在 Discord 中使用

**添加卡片：**
- 直接发送: `问题::答案`
- 或使用命令: `添加 问题::答案`

**复习：**
- 发送 `复习` 开始
- 回复 1-5 评分

## 命令列表

| 命令 | 说明 |
|------|------|
| `问题::答案` | 直接添加卡片 |
| `添加 问题::答案` | 命令方式添加 |
| `列表` / `list` | 查看所有卡片 |
| `统计` / `stats` | 学习统计 |
| `待复习` / `due` | 查看待复习 |
| `复习` / `review` | 开始复习 |
| `删除 <ID>` | 删除卡片 |
| `帮助` / `help` | 显示帮助 |

## 评分说明

- **1** = 完全忘记 (Again)
- **2** = 记得困难 (Hard)  
- **3** = 正常回忆 (Good)
- **4** = 容易回忆 (Easy)
- **5** = 瞬间记住 (Perfect)

## 配置说明

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `DISCORD_WEBHOOK_URL` | (必填) | Discord Webhook URL |
| `DISCORD_CHANNEL_ID` | 1475722914904014958 | 频道 ID |
| `CHECK_INTERVAL` | 30000 | 检查间隔 (毫秒) |
| `REMINDER_COOLDOWN` | 86400000 | 冷却时间 (24小时) |
| `VERBOSE` | false | 详细日志 |

**为什么默认 30 秒？**
> FSRS 理论中，新卡片首次复习间隔可能只有几分钟。设置为 30 秒可以确保及时提醒，不会因为间隔太长而错过最佳复习时间。

## 服务守护架构

```
┌─────────────────────────────────────────────────────┐
│                  service.js                         │
│                   (长期运行)                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│   每 30 秒          每 30 秒         Discord        │
│  ┌─────────┐      ┌──────────┐    ┌──────────┐    │
│  │ 检查到期 │ ───▶ │ 过滤冷却 │ ──▶ │ Webhook  │    │
│  │  卡片   │      │  列表    │     │   发送   │    │
│  └─────────┘      └──────────┘    └──────────┘    │
│       │                │                │          │
│       ▼                ▼                ▼          │
│  ┌─────────────────────────────────────────┐      │
│  │        SQLite Database (cards.db)       │      │
│  │  - cards (问题/答案/间隔/到期日)        │      │
│  │  - reminder-state.json (提醒状态)       │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 技术栈

- [fsrs.js](https://github.com/open-spaced-repetition/fsrs.js) - FSRS 算法实现
- better-sqlite3 - SQLite 数据库
- Discord Webhook API - 消息推送

## 文件结构

```
fsrs-memory/
├── SKILL.md           # 技能文档
├── README.md          # 本文件
├── .env.example       # 配置示例
├── handler.js         # Discord 消息处理
├── service.js         # 服务守护进程 (实时版)
├── package.json       # 依赖配置
├── src/
│   ├── storage.js     # 数据存储
│   ├── fsrs.js        # FSRS 算法封装
│   └── scheduler.js   # 复习调度
└── data/
    ├── cards.db       # SQLite 数据库
    └── reminder-state.json  # 提醒状态
```
