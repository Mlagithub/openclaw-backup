# FSRS Memory Web UI - 修复报告

## 发现的问题和修复

### 1. 数据库状态值不一致 🔧
**问题**: 数据库中部分卡片状态为 "2.0"（数字转字符串），而不是正确的 "review"  
**修复**: 在 server.js 启动时自动修复错误的状态值

### 2. FSRS 算法稳定性计算 🔧
**问题**: FSRS 引擎在处理复习卡片时无法正确计算 stability  
**修复**: 在 `dbToCard` 函数中根据 interval 和 ease_factor 正确计算 stability

### 3. 时区问题 🔧
**问题**: 使用 `datetime('now')` 比较 UTC 时间戳时出现不一致  
**修复**: 使用 `strftime('%s', due_date) <= strftime('%s', 'now')` 进行 Unix 时间戳比较

### 4. API 统计错误 🔧
**问题**: Stats API 中 newCards 统计的 OR 条件缺少括号  
**修复**: 添加正确的括号 `(state = 'new' OR repetitions = 0)`

## 修改的文件

1. **server.js** - 主服务文件
   - 修复 deck 统计时区
   - 修复 due cards 查询时区
   - 修复 stats API 统计逻辑
   - 添加启动时自动修复状态值

2. **fsrs.js** - FSRS 算法引擎
   - 添加 normalizeState 函数处理非标准状态值
   - 修复 stability 计算逻辑
   - 完善 dbToCard 函数

## 测试结果

```
=== 最终测试结果 ===

Deck Stats:
默认牌组: 4 total, 0 due
日语学习: 1 total, 0 due

Stats API:
total: 5, due: 0, reviewed: 5, new: 0, learning: 0

Due Cards API:
due: 0

Preview API (card 1):
1: "0m", 2: "15d", 3: "17d", 4: "19d", 5: "19d"
```

## 服务状态
- ✅ 服务运行正常 (http://localhost:3001)
- ✅ 所有 API 端点正常工作
- ✅ 数据库状态已修复
- ✅ FSRS 算法正常工作
