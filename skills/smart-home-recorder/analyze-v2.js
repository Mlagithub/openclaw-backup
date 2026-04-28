const fs = require("fs");
const path = require("path");
const https = require("https");

const CONFIG = {
  pendingDir: "/home/one/phone-photos-pending",
  analyzedDir: "/home/one/phone-photos-analyzed",
  logsDir: "/home/one/phone-photos-analyzed/logs",
  apiKey: "c570632a67124269907414d39d7146ca.C1HCStG9tejo0j5e",
  similarityThreshold: 0.7 // 70% 相似度阈值
};

[CONFIG.pendingDir, CONFIG.analyzedDir, CONFIG.logsDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

// 计算两个数组的 Jaccard 相似度
function similarity(arr1, arr2) {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = [...set1].filter(x => set2.has(x));
  const union = new Set([...set1, ...set2]);
  return intersection.length / union.size;
}

// 检查是否与之前的照片相似
function isDuplicate(analysis, previousLogs) {
  if (previousLogs.length === 0) return false;
  
  const lastLog = previousLogs[previousLogs.length - 1];
  
  // 场景相同 + 物品相似度 > 70% + 无人物 + 无活动
  if (analysis.scene === lastLog.scene && 
      analysis.people.length === 0 && 
      lastLog.people.length === 0 &&
      similarity(analysis.objects, lastLog.objects) > CONFIG.similarityThreshold) {
    return true;
  }
  return false;
}

async function analyzePhoto(photoPath) {
  const imageBase64 = fs.readFileSync(photoPath).toString("base64");
  return new Promise((resolve) => {
    const prompt = `分析这张家庭照片，返回 JSON 格式：
{
  "scene": "场景",
  "people": [{"description": "人物描述（性别、年龄、穿着、动作）"}],
  "objects": ["物品列表"],
  "activity": "正在进行的活动",
  "importance": "high/medium/low",
  "shouldKeep": true/false,
  "summary": "一句话总结"
}
注意：
- 如果有人物，详细描述（如：成年男性、穿蓝色上衣、坐在椅子上）
- 如果照片空白/模糊，shouldKeep: false
- 如果有人或重要活动，importance: high`;
    
    const payload = {
      model: "glm-4v",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64," + imageBase64 } }
        ]
      }],
      max_tokens: 500
    };
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "open.bigmodel.cn", port: 443, method: "POST",
      path: "/api/paas/v4/chat/completions",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + CONFIG.apiKey, "Content-Length": Buffer.byteLength(data) }
    }, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          const content = json.choices?.[0]?.message?.content || "{}";
          const match = content.match(/\\{[\\s\\S]*\\}/);
          resolve(match ? JSON.parse(match[0]) : { shouldKeep: true, summary: content });
        } catch (e) { resolve({ shouldKeep: true, summary: "Parse error" }); }
      });
    });
    req.on("error", (e) => resolve({ shouldKeep: true, summary: "Error: " + e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("=== Smart Home Recorder v2 ===", new Date().toLocaleString("zh-CN"));
  console.log("Features: 人物识别 + 相似图片删除");
  
  const photos = fs.readdirSync(CONFIG.pendingDir).filter(f => f.endsWith(".jpg")).map(f => path.join(CONFIG.pendingDir, f));
  console.log("Found", photos.length, "photos");
  
  // 读取今天的日志
  const today = new Date().toISOString().split("T")[0];
  const logFile = path.join(CONFIG.logsDir, today + ".jsonl");
  const previousLogs = fs.existsSync(logFile) ? 
    fs.readFileSync(logFile, "utf-8").trim().split("\\n").map(l => JSON.parse(l)) : [];
  
  let deleted = 0, kept = 0;
  
  for (const photo of photos) {
    if (!fs.existsSync(photo)) continue;
    
    const analysis = await analyzePhoto(photo);
    const log = { timestamp: new Date().toISOString(), file: path.basename(photo), ...analysis };
    
    // 检查是否为重复照片
    if (isDuplicate(analysis, previousLogs)) {
      fs.unlinkSync(photo);
      deleted++;
      console.log(path.basename(photo), "-> [DELETED] 重复照片");
      continue;
    }
    
    console.log(path.basename(photo), "->", analysis.summary || "no summary");
    
    if (analysis.people && analysis.people.length > 0) {
      console.log("  人物:", analysis.people.map(p => p.description || p).join(", "));
    }
    
    if (!analysis.shouldKeep) {
      fs.unlinkSync(photo);
      deleted++;
      console.log("  [DELETED] 低质量照片");
    } else {
      const dest = path.join(CONFIG.analyzedDir, path.basename(photo));
      if (fs.existsSync(photo)) fs.renameSync(photo, dest);
      kept++;
    }
    
    fs.appendFileSync(logFile, JSON.stringify(log) + "\\n");
    previousLogs.push(log);
  }
  
  console.log("\\n=== Done ===");
  console.log("保留:", kept, "删除:", deleted);
}
main().catch(console.error);
