#!/usr/bin/env python3
"""
Second Brain Skill for OpenClaw
保存和管理个人知识库
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# 使用 OpenClaw 工作区路径
WORKSPACE = Path(os.environ.get('OPENCLAW_WORKSPACE', '/home/one/.openclaw/agents/main/workspace'))
SECOND_BRAIN_DIR = WORKSPACE / 'second-brain'

# 确保目录存在
for subdir in ['notes', 'links', 'ideas', 'books']:
    (SECOND_BRAIN_DIR / subdir).mkdir(parents=True, exist_ok=True)

def save_to_second_brain(content: str, entry_type: str = 'note') -> str:
    """保存到 Second Brain"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    if entry_type == 'link':
        # 解析链接
        parts = content.split(' ', 1)
        url = parts[0] if parts else ''
        title = parts[1] if len(parts) > 1 else '未命名链接'
        
        filename = f"{timestamp}_link.md"
        filepath = SECOND_BRAIN_DIR / 'links' / filename
        
        content_md = f"""---
created: {datetime.now().strftime('%Y-%m-%d %H:%M')}
type: link
url: {url}
title: {title}
tags: []
---

# {title}

[{url}]({url})
"""
    else:
        # 笔记/想法/书籍
        filename = f"{timestamp}_{entry_type}.md"
        subdir = entry_type + 's' if entry_type != 'idea' else 'ideas'
        filepath = SECOND_BRAIN_DIR / subdir / filename
        
        content_md = f"""---
created: {datetime.now().strftime('%Y-%m-%d %H:%M')}
type: {entry_type}
tags: []
---

{content}
"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content_md)
    
    return f"✅ 已保存到 {filepath}"

def list_notes(limit: int = 10) -> str:
    """列出最近的笔记"""
    notes = []
    for subdir in ['notes', 'links', 'ideas', 'books']:
        dir_path = SECOND_BRAIN_DIR / subdir
        if dir_path.exists():
            files = sorted(dir_path.glob('*.md'), key=lambda x: x.stat().st_mtime, reverse=True)
            notes.extend([(f, subdir) for f in files[:limit]])
    
    if not notes:
        return "📚 还没有笔记"
    
    result = ["📚 最近的笔记：\n"]
    for filepath, subdir in notes[:limit]:
        result.append(f"- {subdir}/{filepath.name}")
    
    return '\n'.join(result)

def search_notes(keyword: str) -> str:
    """搜索笔记"""
    results = []
    for subdir in ['notes', 'links', 'ideas', 'books']:
        dir_path = SECOND_BRAIN_DIR / subdir
        if dir_path.exists():
            for filepath in dir_path.glob('*.md'):
                try:
                    content = filepath.read_text(encoding='utf-8')
                    if keyword.lower() in content.lower():
                        results.append(f"{subdir}/{filepath.name}")
                except:
                    pass
    
    if not results:
        return f"🔍 未找到包含 '{keyword}' 的笔记"
    
    return f"🔍 找到 {len(results)} 条结果:\n" + '\n'.join(f"- {r}" for r in results)

def run(query: str) -> str:
    """处理 Second Brain 命令"""
    query = query.strip()
    
    # 保存笔记
    for prefix, entry_type in [
        ("note:", "note"),
        ("link:", "link"),
        ("idea:", "idea"),
        ("book:", "book"),
        ("📝", "note"),
        ("🔗", "link"),
        ("💡", "idea"),
        ("📚", "book")
    ]:
        if query.lower().startswith(prefix):
            content = query[len(prefix):].strip()
            return save_to_second_brain(content, entry_type)
    
    # 列出笔记
    if query.lower() == "list":
        return list_notes()
    
    # 搜索
    if query.lower().startswith("search "):
        keyword = query[7:].strip()
        return search_notes(keyword)
    
    # 帮助
    return """📚 Second Brain 用法:

保存笔记:
- note: 笔记内容
- link: https://example.com 标题
- idea: 想法
- book: 《书名》笔记

查看:
- second-brain list (列出最近笔记)
- second-brain search <关键词>"""

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(run(" ".join(sys.argv[1:])))
    else:
        print(run(input("输入: ")))
