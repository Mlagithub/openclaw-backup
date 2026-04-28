# TOOLS.md - Local Configuration

Environment-specific settings and commands for this workspace.

---

## Network Configuration (WSL2 + Windows Clash)

### Current Architecture (System Proxy Mode)

| Component | Config | Notes |
|-----------|--------|-------|
| **Windows Clash Party** | System proxy mode (TUN disabled) | Doesn't affect SSH tunnels |
| **WSL2 Gateway** | `HTTP_PROXY=http://192.168.1.116:7890` | Via systemd override |
| **WSL2 Shell** | Same proxy in `~/.bashrc` | For CLI tools |

### Gateway Proxy Config

**File:** `~/.config/systemd/user/openclaw-gateway.service.d/proxy.conf`

```ini
[Service]
Environment="HTTP_PROXY=http://192.168.1.116:7890"
Environment="HTTPS_PROXY=http://192.168.1.116:7890"
Environment="NO_PROXY=localhost,127.0.0.1,192.168.0.0/16"
Environment="BRAVE_API_KEY=BSAZxaCUfcqHHDo9djS8rxKcikFkkBI"
# Backup config (DO NOT set OPENCLAW_HOME - conflicts with Gateway)
Environment="OPENCLAW_BACKUP_DIR=/home/one/.openclaw-backup"
Environment="BACKUP_REPO_URL=https://github.com/Mlagithub/openclaw-backup.git"
Environment="BACKUP_CHANNEL_ID=1475722914904014958"
Environment="BACKUP_TZ=Asia/Shanghai"
Environment="BACKUP_MAX_HISTORY=3"
```

**Commands:**
```bash
# Reload systemd
systemctl --user daemon-reload

# Restart Gateway
openclaw gateway restart

# Verify
systemctl --user show openclaw-gateway | grep -i proxy
openclaw gateway health
```

**⚠️ WARNING:** Never set `OPENCLAW_HOME` in systemd override - it conflicts with Gateway's internal definition and causes startup failure.

### WSL2 Shell Proxy

**File:** `~/.bashrc` or `~/.zshrc`

```bash
export HTTP_PROXY="http://192.168.1.116:7890"
export HTTPS_PROXY="http://192.168.1.116:7890"
export NO_PROXY="localhost,127.0.0.1,192.168.0.0/16"
```

### Why Not TUN Mode?

TUN mode adds `metric=0` default route, hijacking all traffic including SSH return packets. Clash cannot handle "established connection return packets" correctly, causing SSH tunnel failures.

**Solution:** Disable TUN on Windows + explicit proxy in WSL2.

---

## Cron Jobs

### OpenClaw Cron
| Job | Schedule | Command | Status |
|-----|----------|---------|--------|
| **Tech News Digest** | 6:00 AM daily | `openclaw cron` | ✅ Enabled |

### System Cron (crontab)
| Job | Schedule | Command | Status |
|-----|----------|---------|--------|
| **Memory Auto Update** | Every 2h (11-23) | `update-memory.sh` | ✅ Enabled |

---

## Discord Configuration

**Env File:** `/home/one/.openclaw/.env`

```bash
DISCORD_TOKEN=<bot_token>
TARGET_USER_ID=1085793212846854146
HTTPS_PROXY=http://192.168.1.116:7890
```

**Security:** Never commit `.env` to git.

---

## OpenClaw Backup Configuration

### Script Location
`~/.openclaw/skills/openclaw-backup-optimized/scripts/backup.js`

### What it does
- Full snapshot of `~/.openclaw` (config, memory, skills)
- Workspace archive split into ~90MB parts + SHA256
- Discord notification with summary + restore steps
- Retains last N reports (configurable)

### Environment Variables (in Gateway systemd override)
| Variable | Value | Notes |
|----------|-------|-------|
| `OPENCLAW_BACKUP_DIR` | `/home/one/.openclaw-backup` | Backup destination |
| `BACKUP_REPO_URL` | `https://github.com/Mlagithub/openclaw-backup.git` | Git push target |
| `BACKUP_CHANNEL_ID` | `1475722914904014958` | Discord notification channel |
| `BACKUP_TZ` | `Asia/Shanghai` | Timezone for timestamps |
| `BACKUP_MAX_HISTORY` | `3` | Keep last N backup reports |

**⚠️ DO NOT set `OPENCLAW_HOME`** — It conflicts with Gateway's internal definition.

### Run manually
```bash
node ~/.openclaw/skills/openclaw-backup-optimized/scripts/backup.js
```

### Set up cron (via OpenClaw)
```bash
openclaw cron add --name "openclaw-backup-daily" \
  --cron "0 5 * * *" --tz "Asia/Shanghai" \
  --exec "node /home/one/.openclaw/skills/openclaw-backup-optimized/scripts/backup.js"
```

---

## Useful Commands

```bash
# OpenClaw status
openclaw status
openclaw gateway health

# Systemd services
systemctl --user list-units | grep openclaw
journalctl --user -u openclaw-gateway.service -f

# Process management
ps aux | grep node
pkill -f "node.*daemon.js"

# Git
git status
git add .
git commit -m "message"
git push
```
