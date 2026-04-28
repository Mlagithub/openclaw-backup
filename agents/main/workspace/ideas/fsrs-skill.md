# OpenClaw FSRS 背诵技能想法

**日期**: 2026-02-25
**项目路径**: /home/one/ai/IncrementalMemorization

## 概述

开发一个 OpenClaw 技能，实现基于 FSRS 算法的背诵提醒功能。不要求像 Anki 那样强大，但可以通过机器人实现知识点记录与按时提醒。

---

## 第一步：项目需求 ✅ 已完成

### 核心功能
- 知识点录入（对话式）
- FSRS 算法自动计算复习间隔
- 到期提醒推送到 Discord DM
- 可选 Web 界面

---

## 第二步：现有方案调研 ✅ 已完成

### FSRS 算法实现
| 项目 | 语言 | 说明 |
|------|------|------|
| fsrs.js | JavaScript | 官方 JS 实现 ✅ 推荐 |
| ts-fsrs | TypeScript | 支持 ESM/CJS |
| fsrs4anki | Anki 插件 | Anki 专用 |
| anki-sm-2 | Python | SM-2 算法 |

### 结论
使用 **fsrs.js** (JavaScript) 实现核心算法，通过 OpenClaw 定时任务实现提醒功能。

---

## 第三步：开发计划 ✅ 已完成

### 技术选型
- 核心算法: fsrs.js
- 数据存储: SQLite
- 后端服务: Node.js
- 提醒: OpenClaw Cron

### 项目结构
```
IncrementalMemorization/
├── src/
│   ├── index.js
│   ├── fsrs.js
│   ├── storage.js
│   └── scheduler.js
├── web/
├── data/cards.db
├── config.json
└── package.json
```

---

## 第四步：待开发

- [ ] Phase 1: 基础架构
- [ ] Phase 2: 核心功能
- [ ] Phase 3: 提醒功能
- [ ] Phase 4: Web 界面（可选）

---

## 参考资源

- https://github.com/open-spaced-repetition/fsrs.js
- https://github.com/open-spaced-repetition/ts-fsrs
- https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
