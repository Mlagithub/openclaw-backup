const fs = require("fs");
const path = require("path");
const https = require("https");

const CONFIG = {
  pendingDir: "/home/one/phone-photos-pending",
  analyzedDir: "/home/one/phone-photos-analyzed",
  logsDir: "/home/one/phone-photos-analyzed/logs",
  apiKey: "c570632a67124269907414d39d7146ca.C1HCStG9tejo0j5e"
};

[CONFIG.pendingDir, CONFIG.analyzedDir, CONFIG.logsDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

async function analyzePhoto(photoPath) {
  const imageBase64 = fs.readFileSync(photoPath).toString("base64");
  return new Promise((resolve) => {
    const payload = {
      model: "glm-4v",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "分析照片，返回JSON: {scene, people[], objects[], activity, importance(high/medium/low), shouldKeep(true/false), summary}" },
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
  console.log("=== Smart Home Recorder ===", new Date().toLocaleString("zh-CN"));
  const photos = fs.readdirSync(CONFIG.pendingDir).filter(f => f.endsWith(".jpg")).map(f => path.join(CONFIG.pendingDir, f));
  console.log("Found", photos.length, "photos");
  for (const photo of photos) {
    if (!fs.existsSync(photo)) { console.log("Skip (not found):", path.basename(photo)); continue; }
    const analysis = await analyzePhoto(photo);
    const log = { timestamp: new Date().toISOString(), file: path.basename(photo), ...analysis };
    console.log(path.basename(photo), "->", analysis.summary || "no summary");
    if (!analysis.shouldKeep) { fs.unlinkSync(photo); console.log("  Deleted"); }
    else {
      const dest = path.join(CONFIG.analyzedDir, path.basename(photo));
      if (fs.existsSync(photo)) fs.renameSync(photo, dest);
    }
    fs.appendFileSync(path.join(CONFIG.logsDir, new Date().toISOString().split("T")[0] + ".jsonl"), JSON.stringify(log) + "\\n");
  }
  console.log("=== Done ===");
}
main().catch(console.error);
