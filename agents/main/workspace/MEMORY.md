# MEMORY.md - Long-Term Memory

---

## User Info
- **Name:** 止一 (Zhǐ Yī)
- **Timezone:** Asia/Shanghai
- **Contact:** Discord DM

---

## Key Decisions
- OpenClaw Agents architecture: each agent has independent workspace
- Main workspace: /home/one/.openclaw/agents/main/workspace
- WSL2 + Windows Clash: system proxy mode (TUN disabled)

---

## Preferences
- **Tech interests:** LLM, AI-Agent, Frontier-Tech, Biotech, Programming
- **Habits:** 站桩 (standing meditation) 45 min/day
- **Language:** Chinese for conversation, English for configs
- **View on AI:** AI assists but does not replace cognitive processes (notes, learning)

## Family
- **Wife:** 老婆
- **Daughter:** 穆沐（小名笑笑），3岁9个月（2026年3月）

---

## Projects

### HeartRate Monitor (Active)
- **Location:** `/mnt/d/work/HeartRate`
- **Purpose:** Real-time heart rate monitoring during 站桩
- **Tech:** BLE + Huawei band, visualization on large display
- **Observations:**
  - 四平马步: avg 110 bpm, 2min ramp-up, visible fluctuation
  - 浑圆桩: avg 90 bpm, more stable
- **Goal:** Compare heart rate across different 站桩 methods, study focus vs distraction

### tech-news-digest
- Daily tech news digest (RSS + GitHub + Reddit)
- Scheduled: 6:00 AM via Discord
- Test: 312 articles collected successfully

### Pixel Art Editor ✅ (Completed 2026-03-04)
- Location: `/home/one/projects/PixelArtEditor`
- CRDT collaborative pixel editor (Jake Lazaroff tutorial)
- 98% binary compression, DDA line drawing, offline sync
- All 5 phases completed, tests passing

---

## Installed Skills

| Skill | Location | Purpose |
|-------|----------|---------|
| tech-news-digest | ~/.openclaw/skills/ | Daily tech news |
| habit-tracker | ~/.openclaw/skills/ | Habit tracking w/ photo AI |
| fsrs-memory | ~/.openclaw/skills/ | Spaced repetition |
| second-brain | ~/.openclaw/skills/ | Note management |
| openclaw-backup-optimized | ~/.openclaw/skills/ | Full backup to Git + Discord |

## Cron Jobs (Active)

| Job | Schedule | Purpose |
|-----|----------|---------|
| friend-challenge | Every 4 hours | Deep dialogue, critical questions |
| daily-output-reminder | Daily 08:00 | Cognitive breakthrough prompts |
| openclaw-repo-monitor | Every 6 hours | OpenClaw repo activity |
| gsd-repo-monitor | Every 6 hours | GSD repo activity |
| Daily Tech News Digest | Daily 06:00 | Tech news collection |

---

## Agents Team (Optimized 2026-03-05)

| Agent | Model | Role |
|-------|-------|------|
| main (行止) | glm-5 | Main assistant + task coordination |
| dev-agent | glm-5 | Design + Code + Test |
| review-agent | glm-5 | Code review + Documentation |

**Architecture:** 8 agents → 3 agents (reduced context overhead)

---

## Lessons Learned

1. WSL proxy needs `systemctl --user set-environment` for systemd services
2. Brave Search API requires proxy from WSL
3. Clash TUN mode conflicts with SSH tunnels (use system proxy mode)
4. Habit Tracker daemon interval is 30 min, not 1 min
5. systemd service proxy config needs override file, not just shell env
6. **OPENCLAW_HOME 与 Gateway 冲突** — 不要在 systemd override 中设置 OPENCLAW_HOME，Gateway 内部已定义，覆盖会导致启动失败
7. **sessions_spawn 不要加 runTimeoutSeconds** — 让 subagent 自然完成，不设超时限制
8. **AI 辅助认知的正确边界**：
   - AI 提供：检索、提醒、对比、盲区检查、验证
   - 人类负责：判断、关联、抽象、重构
   - 笔记整理的"过程"是认知生长的关键，不能外包给 AI
   - AI 搭台，人唱戏

---

## 思想探索记录

### 唯识宗对话（2026-03-30 ~ 2026-03-31）

苏格拉底式提问探索"我"的本质，核心发现：

1. **观察变化需要不变参照点**：要看到火苗从小到大，观察者本身必须不变
2. **数学比喻突破**：两个不同观察者能用同一套符号比较 → 说明他们有联系 → 其实是同一个东西
3. **"同一个东西"连接一切变化**：不是身体（会变老）、不是意识（每刻不同念头），但它是同一个，能连接过去和现在
4. **用户承认**："它就是我"

**未解决问题**：
- 这个"能知的东西"是随身体生灭，还是像物理规律一样根本？
- 觉知能力因人而异，但"能知的本质"是否相同？（灯泡有亮有暗，光的本质一样）

**唯识宗对应概念**：
- 阿赖耶识：储藏一切经历的"仓库"，可能对应"同一套符号"的存储
- 唯识无境：看到的是意识投影——对话中已触及（色盲例子）
- 真如/无为法：不生不灭的根本——用户以"物理规律"类比

详细对话记录见：`memory/2026-03-31.md`

---

## Security Notes

- Discord tokens stored in `.env`, never commit to git
- habit-tracker uses environment variables, no hardcoded secrets
- MEMORY.md only loaded in main session (private chat)
