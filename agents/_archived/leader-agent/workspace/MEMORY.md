# MEMORY.md - Leader Agent Memory

## Identity
- **Name:** 领航 (Lǐng Háng) / Leader
- **Role:** Task coordination and integration
- **Parent Agent:** main (行止)
- **Team:** search, design, code, test, review, docs agents

---

## Projects

### OpenClaw Agent Configuration (2026-03-02)
- **Status:** ✅ Complete
- **Goal:** Configure all agent workspaces with consistent files
- **Workspace:** `/home/one/.openclaw/agents/<agent>/workspace`
- **Reports:** `$HOME/.openclaw-reports/<agent>/`
- **Files:** SOUL.md, IDENTITY.md, USER.md, AGENTS.md, MEMORY.md, TOOLS.md

### fsrs-memory Web App
- **Status:** Ongoing
- **Goal:** Anki-like spaced repetition web application
- **Workspace:** `/home/one/projects/fsrs-memory`
- **Features:** Multi-deck, themes, .apkg import
- **Running:** http://localhost:3001

---

## Lessons Learned

1. **Always confirm workspace before starting** — prevents file misplacement
2. **Not all tasks need all agents** — Select team based on complexity
3. **Workflow is DAG, not linear** — Allow cycles (code→test→review)
4. **Define loop exit conditions** — Know when to stop iterating
5. **Max iterations prevent infinite loops** — Escalate after N failures
6. **Coordinate before coding** — Planning prevents rework
7. **Always involve review-agent before delivery**
8. **Clear task descriptions reduce iteration cycles**
9. **Progress reports build user trust**
10. **Memory files are essential for session continuity**

---

## Agent Capabilities Reference

| Agent | Strength | Use When |
|-------|----------|----------|
| search-agent | Research, info gathering | Technical research, documentation lookup |
| design-agent | Architecture, API design | System design, interface planning |
| code-agent | Implementation | Feature development, bug fixes |
| test-agent | Testing, validation | Unit tests, integration tests |
| review-agent | Code review | Quality assurance, best practices |
| docs-agent | Documentation | API docs, user guides |

---

## Workflow Patterns

### Simple Task (2 agents)
```
code-agent → review-agent → done
```

### Medium Task (4 agents)
```
design-agent → code-agent → test-agent → review-agent → done
                      ↑         │
                      └─────────┘ (loop if issues)
```

### Complex Task (6 agents)
```
search-agent → design-agent → code-agent → test-agent → review-agent → docs-agent
                                                           ↑                │
                                                           └────────────────┘ (docs may trigger redesign)
```

### Iteration Rules
| Pattern | Exit Criteria | Max Iterations | Escalate When |
|---------|---------------|----------------|---------------|
| Code→Test→Review | All pass, approved | 3 | No progress after 3 |
| Design | User approved | 2 | Requirements unclear |
| Search | Findings delivered | 1 | No relevant info |

---

## Workspace Reference

| Workspace | Purpose |
|-----------|---------|
| `/home/one/.openclaw/agents/main/workspace` | Main agent files, shared configs |
| `/home/one/.openclaw/agents/<agent>/workspace` | Agent-specific configuration |
| `/home/one/.openclaw/skills/<skill-name>` | Skill development |
| `/home/one/projects/<project-name>` | Project-specific work |

---

*Last updated: 2026-03-02*
