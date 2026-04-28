const fs = require("fs");
const path = require("path");
const https = require("https");

const CONFIG = {
  analyzedDir: "/home/one/phone-photos-analyzed",
  logsDir: "/home/one/phone-photos-analyzed/logs",
  apiKey: "c570632a67124269907414d39d7146ca.C1HCStG9tejo0j5e"
};

// 分析照片中人物的情绪
async function analyzeEmotion(photoPath) {
  const imageBase64 = fs.readFileSync(photoPath).toString("base64");
  const prompt = "分析照片中人物的表情和情绪。返回JSON: {people: [{gender, age, emotion: happy/sad/neutral/angry/surprised/tired, confidence: 0-100}]}。如果没有人物，返回空数组。";
  
  return new Promise((resolve) => {
    const payload = {
      model: "glm-4v",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64," + imageBase64 } }
        ]
      }],
      max_tokens: 300
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
          resolve(match ? JSON.parse(match[0]) : { people: [] });
        } catch (e) {
          resolve({ people: [] });
        }
      });
    });
    req.on("error", () => resolve({ people: [] }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("=== Emotion Analysis ===", new Date().toLocaleString("zh-CN"));
  
  const today = new Date().toISOString().split("T")[0];
  const logFile = path.join(CONFIG.logsDir, today + ".jsonl");
  
  if (!fs.existsSync(logFile)) {
    console.log("No logs for today");
    return;
  }
  
  // 找出有人物的照片
  const logs = fs.readFileSync(logFile, "utf-8")
    .trim().split("\n")
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(l => l && l.people && l.people.length > 0);
  
  if (logs.length === 0) {
    console.log("No photos with people");
    return;
  }
  
  console.log("Found", logs.length, "photos with people");
  
  const emotions = [];
  
  for (const log of logs) {
    const photoPath = path.join(CONFIG.analyzedDir, log.file);
    if (!fs.existsSync(photoPath)) continue;
    
    const result = await analyzeEmotion(photoPath);
    
    if (result.people && result.people.length > 0) {
      console.log(log.file, "->", result.people.map(p => p.emotion).join(", "));
      emotions.push({
        time: log.timestamp,
        file: log.file,
        ...result
      });
    }
  }
  
  // 保存情绪分析结果
  const emotionFile = path.join(CONFIG.logsDir, today + "-emotions.json");
  fs.writeFileSync(emotionFile, JSON.stringify(emotions, null, 2));
  
  // 统计情绪分布
  const stats = { happy: 0, sad: 0, neutral: 0, angry: 0, surprised: 0, tired: 0 };
  emotions.forEach(e => {
    e.people.forEach(p => {
      if (stats[p.emotion] !== undefined) stats[p.emotion]++;
    });
  });
  
  console.log("\n情绪统计:");
  Object.entries(stats).forEach(([k, v]) => {
    if (v > 0) console.log("  " + k + ": " + v + " 次");
  });
  
  console.log("\n情绪分析完成!");
}

main().catch(console.error);
