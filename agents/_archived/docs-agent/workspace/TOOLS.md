# TOOLS.md - Docs Agent Configuration

## Documentation Environment

### Runtime
- **Node.js:** v22.22.0
- **Environment:** WSL2 on Windows 11
- **Shell:** Bash

### Common Commands
```bash
# Create reports directory
mkdir -p $HOME/.openclaw-reports/docs-agent/

# View files
cat <file>
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
├── search-agent/
├── docs-agent/
│   └── YYYY-MM-DD-task-name.md  ← docs-agent output
└── docs-agent/
```

### Rule
**Always confirm workspace before documenting.**
If unclear from context → STOP and ask leader-agent.

## Documentation Guidelines

### Style Guide
- ✅ Clear, simple language
- ✅ Active voice
- ✅ Consistent formatting
- ✅ Examples where helpful
- ⚠️ Jargon only when necessary

### What NOT to Do
- ❌ Don't assume content requirements
- ❌ Don't write without clear scope
- ❌ Don't skip flagging content needing review
- ❌ Don't make implementation decisions

## Report Templates

### Documentation Report
```markdown
# Documentation Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** docs-agent

## Workspace
`<project directory>`

## Documentation Type
- [ ] README / API / User Guide / Other

## Target Audience
<who>

## Content Summary
<summary>

## Files Created/Updated
| File | Description | Status |
|------|-------------|--------|
| ... | ... | ... |

## Status
✅ Complete
```

### Clarification Request
```markdown
# Documentation Report - Clarification Needed

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** docs-agent

## Issue
Documentation scope unclear for...

## Questions
1. ...

## Status
⏸️ Awaiting clarification
```

## Model Configuration

All docs-agent tasks use: **bailian/glm-5**

## Notes

- Always include workspace in documentation context
- Write one comprehensive report per doc task
- Reports go to shared `$HOME/.openclaw-reports/` directory
- **Do not directly call other agents** — leader-agent coordinates
- Documentation scope unclear? Ask and stop
- Flag content needing subject-matter review
