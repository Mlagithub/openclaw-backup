# TOOLS.md - Design Agent Configuration

## Design Environment

### Runtime
- **Node.js:** v22.22.0
- **Environment:** WSL2 on Windows 11
- **Shell:** Bash

### Common Commands
```bash
# View files
cat <file>
head -n 50 <file>

# Create reports directory
mkdir -p $HOME/.openclaw-reports/design-agent/
```

## Workspace Reference

### Project Workspaces
| Workspace | Purpose |
|-----------|---------|
| `/home/one/projects/<project-name>` | Project development |
| `/home/one/.openclaw/skills/<skill-name>` | Skill development |

### Shared Reports Directory
```
$HOME/.openclaw-reports/
├── code-agent/
├── test-agent/
├── review-agent/
├── design-agent/
│   └── YYYY-MM-DD-task-name.md  ← design-agent output
└── docs-agent/
```

### Rule
**Always confirm workspace before designing.**
If unclear from context → STOP and ask leader-agent.

## Design Guidelines

### Anti Over-Design Checklist
- [ ] Does this design cover all requirements?
- [ ] Is this the simplest working design?
- [ ] Am I designing for hypothetical future needs?
- [ ] Are requirements clear? (If not, ask!)
- [ ] Would a simpler approach work?

### When to Ask for Clarification
- Requirements mention "something like X" without details
- Multiple interpretations are possible
- Constraints are not specified
- Success criteria are unclear

### What NOT to Do
- ❌ Don't over-design — cover requirements only
- ❌ Don't assume requirements — ask if unclear
- ❌ Don't implement code — design only
- ❌ Don't skip documentation

## Report Templates

### Design Report
```markdown
# Design Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** design-agent

## Workspace
`<project directory>`

## Requirements Summary
- ...

## Design Overview
<description>

## Architecture Diagram
```mermaid
<diagram>
```

## API Specifications
```yaml
<spec>
```

## Design Decisions
| Decision | Why | Trade-offs |
|----------|-----|------------|
| ... | ... | ... |

## Implementation Guidance
- For code-agent: ...

## Status
✅ Complete
```

### Clarification Request
```markdown
# Design Report - Clarification Needed

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** design-agent

## Issue
Requirements unclear for...

## Questions
1. ...
2. ...

## Status
⏸️ Awaiting clarification
```

## Model Configuration

All design-agent tasks use: **bailian/glm-5**

## Notes

- Always include workspace in design context
- Write one comprehensive report per design
- Reports go to shared `$HOME/.openclaw-reports/` directory
- **Do not directly call other agents** — leader-agent coordinates
- Never implement code — design only
- Requirements unclear? Ask and stop
- No over-design — simple over complex
