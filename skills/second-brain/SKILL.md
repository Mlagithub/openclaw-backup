---
name: second-brain
description: 个人知识库管理系统 - 保存笔记、链接、想法、书籍笔记
version: "1.0.0"
metadata:
  openclaw:
    requires:
      bins: ["python3"]
files:
  read:
    - <WORKSPACE>/second-brain/notes/
    - <WORKSPACE>/second-brain/links/
    - <WORKSPACE>/second-brain/ideas/
    - <WORKSPACE>/second-brain/books/
  write:
    - <WORKSPACE>/second-brain/notes/
    - <WORKSPACE>/second-brain/links/
    - <WORKSPACE>/second-brain/ideas/
    - <WORKSPACE>/second-brain/books/
---

# Second Brain Skill — 个人知识库

保存和管理个人知识库，支持笔记、链接、想法、书籍笔记。

## 触发词

- `note:` - 保存到笔记
- `link:` - 保存链接
- `idea:` - 保存想法
- `book:` - 保存书籍笔记

## 用法

### 保存笔记

```
note: 这是我的笔记内容
```

### 保存链接

```
link: https://example.com 标题
```

### 保存想法

```
idea: 一个想法
```

### 保存书籍笔记

```
book: 《书名》读书笔记
```

### 列出最近笔记

```
second-brain list
```

### 搜索笔记

```
second-brain search <关键词>
```

## 文件位置

所有数据存储在 OpenClaw 工作区的 `second-brain/` 目录下：

- **笔记**: `<WORKSPACE>/second-brain/notes/`
- **链接**: `<WORKSPACE>/second-brain/links/`
- **想法**: `<WORKSPACE>/second-brain/ideas/`
- **书籍**: `<WORKSPACE>/second-brain/books/`

## 数据结构

每个条目保存为独立的 Markdown 文件，包含时间戳和标签。

### 笔记格式

```markdown
---
created: 2026-02-27 16:00
type: note
tags: []
---

笔记内容
```

### 链接格式

```markdown
---
created: 2026-02-27 16:00
type: link
url: https://example.com
title: 示例链接
tags: []
---
```

## 依赖

- Python 3.6+
- 无外部依赖（使用标准库）
