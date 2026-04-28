# MEMORY.md - Review Agent Memory

## User Info
- **Name:** 止一 (Zhǐ Yī)
- **Timezone:** Asia/Shanghai
- **Contact:** Discord DM

---

## Projects

### OpenClaw Agent Configuration (2026-03-02)
- **Status:** In Progress
- **Goal:** Configure all agent workspaces
- **Workspace:** `/home/one/.openclaw/agents/<agent>/workspace`
- **Reports:** `$HOME/.openclaw-reports/review-agent/`

### fsrs-memory Web App
- **Status:** Ongoing
- **Goal:** Spaced repetition web application
- **Workspace:** `/home/one/projects/fsrs-memory`
- **Reports:** `$HOME/.openclaw-reports/review-agent/`
- **Tech Stack:** HTML, CSS, JavaScript, FSRS algorithm

---

## Review Standards

### Code Quality Criteria
| Criteria | Weight | Description |
|----------|--------|-------------|
| **Correctness** | High | Does it work? Any bugs? |
| **Security** | High | Vulnerabilities? Input validation? |
| **Readability** | Medium | Clear naming? Comments? |
| **Maintainability** | Medium | Modular? Easy to modify? |
| **Performance** | Low | Efficient? Scalable? |

### Issue Severity
| Severity | Action |
|----------|--------|
| **Blocking ❌** | Must fix before approval |
| **Non-Blocking ⚠️** | Should fix, but not required |
| **Suggestion 💡** | Optional improvement |

---

## Lessons Learned

1. **Always confirm workspace before reviewing** — prevents file misplacement
2. **One review = One report** — comprehensive, not fragmented
3. Be specific — line references save time
4. Distinguish blocking vs. non-blocking — helps prioritization
5. Positive notes matter — acknowledge good work too

---

## Review Templates

### Quick Review Checklist
```markdown
## Review Checklist
- [ ] Code works as intended
- [ ] No security issues
- [ ] Readable and clear
- [ ] Edge cases handled
- [ ] Comments where needed
```

### Feedback Template
```markdown
### Issue: <description>
**Location:** `file.js:line`
**Severity:** Blocking / Non-Blocking / Suggestion
**Suggestion:** <specific fix>
```

---

## Workspace Reference

| Workspace | Purpose | Reports Directory |
|-----------|---------|-------------------|
| `/home/one/projects/<project>` | Project work | `$HOME/.openclaw-reports/review-agent/` |
| `/home/one/.openclaw/skills/<skill>` | Skill development | `$HOME/.openclaw-reports/review-agent/` |

---

*Last updated: 2026-03-02*
