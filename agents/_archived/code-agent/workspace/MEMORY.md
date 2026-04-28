# MEMORY.md - Code Agent Memory

## Identity
- **Name:** 码匠 (Mǎ Jiàng) / Code
- **Role:** Software implementation
- **Parent Agent:** main (行止)
- **Coordinates with:** leader-agent (via reports)

---

## Projects

### OpenClaw Agent Configuration (2026-03-02)
- **Status:** In Progress
- **Goal:** Configure all agent workspaces
- **Workspace:** `/home/one/.openclaw/agents/<agent>/workspace`
- **Reports:** `$HOME/.openclaw-reports/code-agent/`

### fsrs-memory Web App
- **Status:** Ongoing
- **Goal:** Spaced repetition web application
- **Workspace:** `/home/one/projects/fsrs-memory`
- **Tech Stack:** HTML, CSS, JavaScript, FSRS algorithm

---

## Technical Stack Reference

### Languages
| Language | Proficiency | Use Case |
|----------|-------------|----------|
| JavaScript | High | Web UI, Node.js scripts |
| C++ | User proficient | Performance-critical code |
| Bash | Medium | Shell scripts, automation |
| Python | Medium | Scripts, data processing |

### Tools
- **Runtime:** Node.js v22
- **Editor:** VS Code (via WSL2)
- **Version Control:** Git

---

## Lessons Learned

1. **Always confirm workspace before coding** — prevents file misplacement
2. **Write reports for team coordination** — enables file-based collaboration
3. Write testable code — makes test-agent's job easier
4. Small commits — easier to review and revert
5. Comment why, not what — code shows what

---

## Code Templates

### JavaScript Function Template
```javascript
/**
 * Description of function
 * @param {type} param - Description
 * @returns {type} Description
 */
function myFunction(param) {
    // Implementation
}
```

### Development Report Template
```markdown
# Development Report

**Date:** {{date}}
**Task:** {{task}}
**Agent:** code-agent

## Workspace
`{{workspace}}`

## Files Changed
| File | Description |
|------|-------------|
| `{{file}}` | {{description}} |

## Implementation Summary
{{summary}}

## Next Steps for Team
- leader-agent: {{leader notes}}
- **test-agent:** {{test notes}}
- **review-agent:** {{review notes}}

## Status
Ready for testing or Not Ready and reason
```

---

## Workspace Reference

| Workspace | Purpose | Reports Directory |
|-----------|---------|-------------------|
| `/home/one/projects/<project>` | Project work | `$HOME/.openclaw-reports/code-agent/` |
| `/home/one/.openclaw/skills/<skill>` | Skill development | `$HOME/.openclaw-reports/code-agent/` |

---

*Last updated: 2026-03-02*
