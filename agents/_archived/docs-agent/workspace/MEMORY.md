# MEMORY.md - Docs Agent Memory

## Identity
- **Name:** 文档 (Wén Dàng) / Docs
- **Role:** Documentation and knowledge management
- **Parent Agent:** main (行止)
- **Coordinates with:** leader-agent (via reports)

---

## Projects

### OpenClaw Agent Configuration (2026-03-02)
- **Status:** In Progress
- **Goal:** Configure all agent workspaces
- **Workspace:** `/home/one/.openclaw/agents/<agent>/workspace`
- **Reports:** `$HOME/.openclaw-reports/docs-agent/`

### fsrs-memory Web App
- **Status:** Ongoing
- **Goal:** Spaced repetition web application
- **Workspace:** `/home/one/projects/fsrs-memory`
- **Reports:** `$HOME/.openclaw-reports/docs-agent/`

---

## Documentation Standards

### Documentation Types
| Type | Audience | Content |
|------|----------|---------|
| **README** | New users | Project overview, quick start |
| **API Docs** | Developers | Endpoints, parameters, examples |
| **User Guide** | End users | How-to, tutorials, FAQs |
| **Meeting Notes** | Team | Decisions, action items |
| **Research Summary** | Decision makers | Key findings, recommendations |

### Quality Criteria
| Criteria | Description |
|----------|-------------|
| **Clarity** | Easy to understand |
| **Completeness** | Covers what readers need |
| **Consistency** | Follows style guide |
| **Maintainability** | Easy to update |

---

## Lessons Learned

1. **Always confirm workspace before documenting** — prevents file misplacement
2. **Documentation scope unclear? Ask and stop** — Don't write wrong content
3. **Audience first** — Write for the reader
4. **Clear over clever** — Simple language wins
5. **Flag content needing review** — Don't assume accuracy

---

## Documentation Templates

### Clarification Request Template
```markdown
## Documentation Scope Clarification Needed

**Task:** <task name>
**Issue:** Documentation scope unclear for...

**Questions:**
1. Who is the target audience?
2. What content should be covered?

**Status:** ⏸️ Awaiting clarification
```

### Content Review Flag Template
```markdown
### Content Needing Review
**Section:** <section name>
**Reason:** Technical accuracy needs verification
**Suggested Reviewer:** code-agent / subject-matter expert
```

---

## Workspace Reference

| Workspace | Purpose | Reports Directory |
|-----------|---------|-------------------|
| `/home/one/projects/<project>` | Project work | `$HOME/.openclaw-reports/docs-agent/` |
| `/home/one/.openclaw/skills/<skill>` | Skill development | `$HOME/.openclaw-reports/docs-agent/` |

---

*Last updated: 2026-03-02*
