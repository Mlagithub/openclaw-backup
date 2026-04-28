const fs = require("fs");
const path = require("path");
const https = require("https");

const CONFIG = {
  analyzedDir: "/home/one/phone-photos-analyzed",
  logsDir: "/home/one/phone-photos-analyzed/logs",
  outputDir: "/home/one/phone-photos-analyzed/daily-best",
  apiKey: "c570632a67124269907414d39d7146ca.C1HCStG9tejo0j5e"
};

[CONFIG.outputDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

// 读取今天的日志
const today = new Date().toISOString().split("T")[0];
const logFile = path.join(CONFIG.logsDir, today + ".jsonl");

if (!fs.existsSync(logFile)) {
  console.log("No logs for today");
  process.exit(0);
}

const logs = fs.readFileSync(logFile, "utf-8")
  .trim().split("\n")
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(l => l && l.file);

if (logs.length === 0) {
  console.log("No photos today");
  process.exit(0);
}

console.log("Found", logs.length, "photos");

// 评分函数
function score(log) {
  let score = 50; // 基础分
  
  // 有人物 +30
  if (log.people && log.people.length > 0) {
    score += 30;
    score += log.people.length * 10; // 每人 +10
  }
  
  // 有活动 +20
  if (log.activity && log.activity !== "无活动" && log.activity !== "无特定活动") {
    score += 20;
  }
  
  // 高重要性 +20
  if (log.importance === "high") score += 20;
  if (log.importance === "medium") score += 10;
  
  return score;
}

// 找出最高分照片
let best = null;
let bestScore = -1;

logs.forEach(log => {
  const s = score(log);
  if (s > bestScore) {
    bestScore = s;
    best = log;
  }
});

if (!best) {
  console.log("No best photo");
  process.exit(0);
}

console.log("Best photo:", best.file, "Score:", bestScore);
console.log("Summary:", best.summary);

// 复制到 daily-best 目录
const srcPath = path.join(CONFIG.analyzedDir, best.file);
const destPath = path.join(CONFIG.outputDir, today + "-best.jpg");

if (fs.existsSync(srcPath)) {
  fs.copyFileSync(srcPath, destPath);
  console.log("Copied to:", destPath);
}

// 保存选择结果
const resultFile = path.join(CONFIG.outputDir, today + "-result.json");
fs.writeFileSync(resultFile, JSON.stringify({
  date: today,
  file: best.file,
  score: bestScore,
  summary: best.summary,
  people: best.people,
  scene: best.scene
}, null, 2));

console.log("Daily best saved!");
