#!/usr/bin/env python3
"""
智谱 Search Agent 搜索脚本
用法: python search_agent.py "你的搜索问题"
"""

import os
import sys
import json

# 从环境变量读取 API Key
API_KEY = os.environ.get("ZHIPU_API_KEY", "")

def search(query: str, model: str = "glm-4-flash"):
    """调用智谱 Search Agent 进行智能搜索"""
    try:
        from zhipuai import ZhipuAI
    except ImportError:
        print("错误: 请先安装 zhipuai 库")
        print("运行: pip install zhipuai")
        sys.exit(1)
    
    if not API_KEY:
        print("错误: 请设置 ZHIPU_API_KEY 环境变量")
        print("例如: export ZHIPU_API_KEY='your-api-key'")
        sys.exit(1)
    
    client = ZhipuAI(api_key=API_KEY)
    
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": query}],
        tools=[{
            "type": "web_search",
            "web_search": {
                "enable": True,
                "search_engine": "search_pro",
                "search_result": True,
                "search_prompt": "你是一位专业顾问。请分析搜索结果，给出简洁、准确的回答，并注明来源和日期。",
                "count": 10,
                "content_size": "high"
            }
        }],
        tool_choice="auto"
    )
    
    # 提取搜索结果
    result = response.choices[0].message
    
    # 打印结果
    print("\n" + "="*50)
    print(f"搜索: {query}")
    print("="*50)
    
    if result.content:
        print(result.content)
    
    # 如果有工具调用，展示搜索结果
    if result.tool_calls:
        print("\n--- 搜索结果详情 ---")
        for call in result.tool_calls:
            if call.function.name == "web_search":
                args = json.loads(call.function.arguments)
                if 'search_result' in args:
                    for item in args['search_result'][:5]:
                        print(f"\n[{item.get('title', 'N/A')}]")
                        print(f"来源: {item.get('media', 'N/A')} | 日期: {item.get('publish_date', 'N/A')}")
                        print(f"链接: {item.get('link', 'N/A')}")
                        print(f"摘要: {item.get('content', 'N/A')[:200]}...")
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python search_agent.py \"你的搜索问题\"")
        print("或设置环境变量: export ZHIPU_API_KEY='your-key'")
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    search(query)
