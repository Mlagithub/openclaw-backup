# Habit Tracker - 习惯打卡系统

Discord 习惯养成和打卡记录系统

## 功能

- ✅ 添加/删除习惯
- ✅ 每日打卡（支持文字和照片）
- ✅ 连续打卡统计
- ✅ 自动提醒（守护进程）
- ✅ Web API 接口
- ✅ 思源笔记同步

## 安装

```bash
cd /home/one/.openclaw/skills/habit-tracker
npm install
```

## 配置

复制环境变量示例文件并配置：

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

### 必需配置

| 变量 | 说明 |
|------|------|
| `DISCORD_TOKEN` | Discord Bot Token |
| `TARGET_USER_ID` | 接收提醒的 Discord 用户 ID |

### 可选配置

| 变量 | 说明 |
|------|------|
| `GLM_API_KEY` | GLM-4V API Key（照片识别） |
| `SIYUAN_DATA_PATH` | 思源笔记数据路径 |

## 使用方法

### Discord 命令

| 命令 | 功能 |
|------|------|
| `习惯 名称::描述::提醒时间` | 添加习惯 |
| `打卡 习惯名 [备注]` | 打卡 |
| `习惯列表` | 查看所有习惯 |
| `统计 习惯名` | 查看统计 |
| `删除习惯 名称` | 删除习惯 |
| `习惯帮助` | 显示帮助 |

### 启动守护进程

```bash
node scripts/daemon.js
```

### 启动 Web API

```bash
cd web
npm start
```

Web API 运行在 http://localhost:3847

## 项目结构

```
habit-tracker/
├── scripts/
│   ├── daemon.js        # 守护进程（自动提醒）
│   ├── db.js            # 数据库操作
│   ├── discord.js       # Discord API 封装
│   ├── handler.js       # Discord 消息处理
│   ├── cron.js          # Cron 任务入口
│   ├── image-handler.js # 图片处理
│   ├── vision.js        # AI 图像识别
│   └── sync-siyuan.js   # 思源笔记同步
├── web/
│   ├── server.js        # Web API 服务器
│   └── package.json
├── data/
│   ├── habits.db        # SQLite 数据库
│   └── images/          # 打卡照片
├── .env.example         # 环境变量示例
├── package.json
└── README.md
```

## 数据库

SQLite 数据库位于 `data/habits.db`

### 表结构

**habits**
- id: 主键
- name: 习惯名称（唯一）
- description: 描述
- reminder_hours: 提醒时间范围（如 "7-9"）
- created_at: 创建时间

**checkins**
- id: 主键
- habit_id: 外键
- checked_at: 打卡时间
- note: 备注

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/habits | 获取所有习惯 |
| POST | /api/habits | 添加习惯 |
| DELETE | /api/habits/:id | 删除习惯 |
| GET | /api/habits/:id/streak | 获取连续打卡 |
| GET | /api/habits/:id/checkins | 获取打卡记录 |
| POST | /api/checkin | 打卡 |
| GET | /api/meals/today | 获取今日餐食 |

## 安全注意事项

1. **不要提交 `.env` 文件到版本控制**
2. **妥善保管 Discord Token 和 API Key**
3. **定期备份 `data/habits.db`**

## 故障排除

### 守护进程不发送提醒

1. 检查 `DISCORD_TOKEN` 是否正确
2. 检查 `TARGET_USER_ID` 是否正确
3. 查看控制台日志

### 照片下载失败

1. 检查 `data/images/` 目录权限
2. 确认 Discord 附件 URL 有效

### 时区问题

系统使用 Asia/Shanghai 时区，确保服务器时区设置正确。
行止，习惯打卡中已经有三省吾身了。就不再需要定时任务中的