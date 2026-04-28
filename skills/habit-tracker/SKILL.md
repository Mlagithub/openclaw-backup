---
name: habit-tracker
description: 习惯打卡系统 - 在 Discord 中添加习惯、打卡、统计，支持自动提醒
version: "1.0.0"
metadata:
  openclaw:
    requires:
      bins: ["node"]
files:
  read:
    - <WORKSPACE>/skills/habit-tracker/scripts/db.js
    - <WORKSPACE>/skills/habit-tracker/scripts/handler.js
  write:
    - <WORKSPACE>/skills/habit-tracker/data/habits.db
---

# Habit Tracker - 习惯打卡系统

在 Discord 中管理你的习惯养成和打卡记录

## 功能

### 添加习惯
```
习惯 早起::每天 7 点起床
习惯 喝水::每天喝 8 杯水
习惯 运动::每天锻炼 30 分钟
```

### 打卡
```
打卡 早起
打卡 喝水 喝了 2 杯
打卡 运动 跑步 5 公里
```

### 查看习惯列表
```
习惯列表
```

### 统计
```
统计 早起
统计 喝水
```

### 删除习惯
```
删除习惯 早起
```

## 数据存储

- SQLite 数据库: `<WORKSPACE>/skills/habit-tracker/data/habits.db`
- 表: habits (习惯), checkins (打卡记录)

## 后台守护进程

启动守护进程进行自动提醒：
```bash
cd <WORKSPACE>/skills/habit-tracker/scripts
node daemon.js
```

守护进程会每分钟检查一次，如有未打卡的习惯会发送 Discord DM 提醒。

## 常用命令速查

| 命令 | 功能 |
|-----|------|
| 习惯 名称::描述 | 添加习惯 |
| 打卡 习惯名 [备注] | 打卡 |
| 习惯列表 | 查看所有习惯 |
| 统计 习惯名 | 查看统计 |
| 删除习惯 名称 | 删除习惯 |
