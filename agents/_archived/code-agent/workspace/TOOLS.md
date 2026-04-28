# TOOLS.md - Code Agent Configuration

## Development Environment

### Runtime
- **Node.js:** v22.22.0
- **Environment:** WSL2 on Windows 11
- **Shell:** Bash

### Common Commands
```bash
# Run JavaScript/Node.js
node script.js

# Git operations
git status
git add .
git commit -m "message"
git push

# Create reports directory
mkdir -p $HOME/.openclaw-reports/code-agent/
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
│   └── YYYY-MM-DD-task-name.md
├── test-agent/
├── review-agent/
└── docs-agent/
```

### Rule
**Always confirm workspace before coding.**
If unclear from context → STOP and ask leader-agent.

## Code Style Guide

### JavaScript
- Use const/let, no var
- Arrow functions for callbacks
- Async/await over promises
- ESLint rules if configured

### General
- 4-space indentation
- Meaningful variable names
- Functions do one thing
- Comments explain why, not what

## Report Templates

### Development Report
```markdown
# Development Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** code-agent

## Workspace
`<project directory>`

## Files Changed
| File | Description |
|------|-------------|
| `src/file.js` | Implementation |

## Implementation Summary
- What was done
- Key decisions

## Next Steps for Team
- **test-agent:** Test these cases...
- **review-agent:** Review this logic...

## Status
✅ Ready for testing
```

### Progress Update (to leader-agent)
```markdown
## Progress: <task>

### Completed
- <item>

### In Progress
- <item>

### Blockers
- <if any>

### Report Location
`$HOME/.openclaw-reports/code-agent/YYYY-MM-DD-task.md`
```

## Model Configuration

All code-agent tasks use: **bailian/glm-5**

## Notes

- Always include workspace in task context
- Write development report for every task
- Reports go to shared `$HOME/.openclaw-reports/` directory
- **Do not directly call other agents** — leader-agent coordinates
- Document assumptions and limitations in report
