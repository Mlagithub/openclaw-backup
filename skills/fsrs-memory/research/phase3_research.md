# Phase 3 Research: Anki Media, Templates & Export

## 1. 媒体文件支持

### Anki 媒体存储方式

**目录结构:**
```
collection.media/
├── 1234567890abcdef.jpg
├── 1234567890abcdeg.mp3
└── _test-file.png
```

**关键点:**
- 媒体文件存储在 `collection.media/` 目录
- 文件名使用哈希值（避免冲突）
- HTML 中引用：`<img src="_test-file.png">` 或 `<audio src="1234567890abcdef.mp3">`
- 以 `_` 开头的文件不会被 Anki 的媒体检查删除

**APKG 中的媒体:**
- APKG 是 ZIP 格式
- 包含 `collection.anki2` (SQLite 数据库) 和 `media` 文件
- `media` 文件是 JSON：`{"1": "filename.jpg", "2": "audio.mp3"}`
- Notes 表中的字段引用媒体：`<img src="1">` 或 `<img src="filename.jpg">`

**支持的媒体格式:**
- 图片：jpg, jpeg, png, gif, webp, svg
- 音频：mp3, wav, ogg, m4a
- 视频：mp4, webm, mov（Anki 支持但浏览器有限制）

### 实现方案

**存储路径:** `web/media/`

**数据库表:**
```sql
CREATE TABLE IF NOT EXISTS media_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  card_id INTEGER,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL
);
```

**API 端点:**
- `POST /api/media/upload` - 上传文件（multipart/form-data）
- `GET /api/media` - 获取媒体文件列表
- `GET /api/media/:id` - 获取单个文件信息
- `DELETE /api/media/:id` - 删除文件
- `GET /media/:filename` - 静态文件服务

---

## 2. 卡片模板系统

### Anki 模板结构

**Note Type (模型):**
```json
{
  "id": 1234567890,
  "name": "基础卡",
  "type": 0,
  "flds": [{"name": "Front"}, {"name": "Back"}],
  "tmpls": [{
    "name": "Card 1",
    "qfmt": "{{Front}}",
    "afmt": "{{FrontSide}}<hr>{{Back}}",
    "css": ".card { font-family: arial; }"
  }]
}
```

**字段替换语法:**
- `{{Front}}` - 替换字段内容
- `{{FrontSide}}` - 替换为正面内容
- `{{#Field}}...{{/Field}}` - 条件显示

**预定义模板类型:**
1. **基础卡**: 正面 → 背面
2. **反向卡**: 正面 → 背面 + 背面 → 正面
3. **填空卡**: `{{c1::answer}}` 语法

### 实现方案

**数据库表:**
```sql
CREATE TABLE IF NOT EXISTS card_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  front_template TEXT NOT NULL,
  back_template TEXT NOT NULL,
  css TEXT DEFAULT '',
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. 导出功能

### APKG 格式
- ZIP 包含 SQLite 数据库 + media JSON
- 使用 jszip + better-sqlite3 实现

### CSV 格式
- RFC 4180 标准
- 字段：id, deck, question, answer, created_at, tags

### JSON 格式
- 完整导出 decks, cards, templates

---

## 4. 学习统计图表

### Chart.js 集成
- CDN: `https://cdn.jsdelivr.net/npm/chart.js@4.4.0`

### 图表类型
1. **每日学习量趋势图** (Line)
2. **牌组进度饼图** (Doughnut)
3. **记忆保持率曲线** (Line)

### 数据库扩展
```sql
CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  interval REAL NOT NULL,
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 依赖包

```json
{
  "multer": "^1.4.5-lts.1",
  "jszip": "^3.10.1",
  "chart.js": "^4.4.0"
}
```
