#!/usr/bin/env node
/**
 * 智谱 Search Agent 搜索脚本
 * 用法: node search_agent.js "你的搜索问题"
 * 需要设置环境变量 ZHIPU_API_KEY
 */

const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

// 从环境变量读取 API Key
const API_KEY = process.env.ZHIPU_API_KEY || 'c570632a67124269907414d39d7146ca.C1HCStG9tejo0j5e';

/**
 * 调用智谱 API
 */
function callZhipuAPI(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      tools: [
        {
          type: "web_search",
          web_search: {
            enable: true,
            search_engine: "search_pro",
            search_result: true,
            search_prompt: "你是一位专业顾问。请分析搜索结果，给出简洁、准确的回答，并注明来源和日期。",
            count: 10,
            content_size: "high"
          }
        }
      ],
      tool_choice: "auto"
    });

    const options = {
      hostname: 'open.bigmodel.cn',
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 格式化输出搜索结果
 */
function formatOutput(result) {
  if (!result.choices || !result.choices[0]) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const message = result.choices[0].message;
  
  console.log('\n' + '='.repeat(50));
  console.log('智谱 Search Agent 结果');
  console.log('='.repeat(50));

  if (message.content) {
    console.log('\n--- 回答 ---\n');
    console.log(message.content);
  }

  if (message.tool_calls) {
    console.log('\n--- 搜索结果详情 ---\n');
    for (const call of message.tool_calls) {
      try {
        const args = JSON.parse(call.function.arguments);
        if (args.search_result) {
          args.search_result.forEach((item, i) => {
            console.log(`${i + 1}. [${item.title || 'N/A'}]`);
            console.log(`   来源: ${item.media || 'N/A'} | 日期: ${item.publish_date || 'N/A'}`);
            console.log(`   链接: ${item.link || 'N/A'}`);
            console.log(`   摘要: ${(item.content || '').substring(0, 200)}...`);
            console.log('');
          });
        }
      } catch (e) {
        console.log('解析工具参数失败:', e.message);
      }
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const query = process.argv.slice(2).join(' ');
  
  if (!query) {
    console.log('用法: node search_agent.js "你的搜索问题"');
    console.log('或设置环境变量: export ZHIPU_API_KEY="your-key"');
    process.exit(1);
  }

  console.log(`搜索: ${query}`);
  console.log('正在查询...\n');

  try {
    const result = await callZhipuAPI(query);
    formatOutput(result);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
