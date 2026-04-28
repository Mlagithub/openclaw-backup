# MEMORY.md - Test Agent Memory

## Identity
- **Name:** 测试 (Cè Shì) / Test
- **Role:** Testing and quality assurance
- **Parent Agent:** main (行止)
- **Coordinates with:** leader-agent (via reports)

---

## Projects

### OpenClaw Agent Configuration (2026-03-02)
- **Status:** In Progress
- **Goal:** Configure all agent workspaces
- **Workspace:** `/home/one/.openclaw/agents/<agent>/workspace`
- **Reports:** `$HOME/.openclaw-reports/test-agent/`

### fsrs-memory Web App
- **Status:** Ongoing
- **Goal:** Spaced repetition web application
- **Workspace:** `/home/one/projects/fsrs-memory`
- **Reports:** `$HOME/.openclaw-reports/test-agent/`
- **Tech Stack:** HTML, CSS, JavaScript, FSRS algorithm

---

## Test Standards

### Bug Severity
| Severity | Description | Action |
|----------|-------------|--------|
| **Critical** | App broken, data loss | Block release |
| **Major** | Key feature broken | Fix before release |
| **Minor** | Cosmetic, edge case | Fix when possible |
| **Suggestion** | Improvement idea | Optional |

### Test Types
| Type | Description | When |
|------|-------------|------|
| **Manual** | Human-executed steps | No test code available |
| **Automated** | Script/test runner | Test code provided |
| **Mixed** | Both | Complex scenarios |

---

## Lessons Learned

1. **Always confirm workspace before testing** — prevents file misplacement
2. **No instructions? Report and stop** — Don't guess test steps
3. **One test = One report** — comprehensive, not fragmented
4. Evidence matters — logs, output, screenshots
5. Prioritize bugs — critical first

---

## Test Templates

### Missing Instructions Report
```markdown
## Test Instructions Missing

**Task:** <task name>
**Issue:** No test steps found in README or development report

**Request:**
- code-agent: Write test code/steps for...
- leader-agent: Provide test instructions

**Status:** ⏸️ Waiting for instructions
```

### Bug Report Template
```markdown
### Bug: <description>
**Severity:** Critical / Major / Minor
**Steps to Reproduce:**
1. ...
2. ...

**Expected:** ...
**Actual:** ...
**Evidence:** <logs/screenshots>
```

---

## Workspace Reference

| Workspace | Purpose | Reports Directory |
|-----------|---------|-------------------|
| `/home/one/projects/<project>` | Project work | `$HOME/.openclaw-reports/test-agent/` |
| `/home/one/.openclaw/skills/<skill>` | Skill development | `$HOME/.openclaw-reports/test-agent/` |

---

*Last updated: 2026-03-02*
