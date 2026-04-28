# FSRS Web UI - 间隔重复记忆系统 Web 界面

基于 fsrs-memory 的 Web 界面，参考 ANKI 设计，提供美观的卡片学习和复习功能。

## 功能特性

- 📖 **学习模式** - 类似 ANKI 的卡片复习界面
- 📚 **卡片管理** - 查看、搜索、编辑、删除卡片
- ➕ **添加卡片** - 支持单个和批量添加
- 📊 **学习统计** - 实时学习进度统计
- 🎯 **FSRS 算法** - 智能间隔重复算法
- 🎨 **现代 UI** - 暗色主题，美观易用
- ⌨️ **键盘快捷键** - 高效学习

## 快速开始

### 1. 安装依赖

```bash
cd /home/one/.openclaw/skills/fsrs-memory/web
npm install
```

### 2. 启动服务

```bash
# 开发模式
npm start

# 或指定端口
PORT=3001 npm start
```

### 3. 访问界面

打开浏览器访问：http://localhost:3001

## 键盘快捷键

### 学习模式
| 快捷键 | 功能 |
|--------|------|
| `Space` / `Enter` | 显示答案 |
| `1` | Again (忘记) |
| `2` | Hard (困难) |
| `3` | Good (一般) |
| `4` | Easy (简单) |
| `5` | Perfect (完美) |

### 导航
| 快捷键 | 功能 |
|--------|------|
| `Alt + 1` | 学习视图 |
| `Alt + 2` | 卡片列表 |
| `Alt + 3` | 添加卡片 |
| `Alt + 4` | 统计视图 |

## 技术栈

- **后端**：Node.js + Express
- **前端**：Vanilla JavaScript + CSS
- **数据库**：SQLite (与 fsrs-memory 共享)
- **算法**：FSRS 间隔重复算法

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cards` | 获取所有卡片 |
| GET | `/api/cards/due` | 获取待复习卡片 |
| GET | `/api/cards/:id` | 获取单个卡片 |
| POST | `/api/cards` | 添加卡片 |
| PUT | `/api/cards/:id` | 更新卡片 |
| DELETE | `/api/cards/:id` | 删除卡片 |
| GET | `/api/stats` | 获取统计数据 |
| POST | `/api/review/:id` | 复习评分 |

### 评分说明

| 评分 | 按钮 | 效果 |
|------|------|------|
| 1 | Again | 重置卡片，重新学习 |
| 2 | Hard | 减少间隔，降低难度 |
| 3 | Good | 正常间隔，保持难度 |
| 4 | Easy | 增加间隔，提高难度 |
| 5 | Perfect | 大幅增加间隔，大幅提高难度 |

## 文件结构

```
web/
├── public/
│   ├── index.html    # 主页面
│   ├── styles.css    # 样式文件
│   └── app.js        # 前端逻辑
├── server.js         # Express 服务器
├── package.json      # 依赖配置
└── test/
    └── api.test.js   # API 测试
```

## 与 fsrs-memory 集成

Web UI 直接使用 fsfs-memory 的数据库文件：

- 数据库路径：`../data/cards.db`
- 无需额外配置，自动同步

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
node test/api.test.js
```

## 后续计划

- [ ] 用户认证系统
- [ ] 多个牌组管理
- [ ] 完整 FSRS 算法实现
- [ ] 数据导出/导入
- [ ] 主题切换

## 许可证

MIT License
