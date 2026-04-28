# TOOLS.md - Search Agent Configuration

## Research Environment

### Runtime
- **Node.js:** v22.22.0
- **Environment:** WSL2 on Windows 11
- **Shell:** Bash

### Common Commands
```bash
# Create reports directory
mkdir -p $HOME/.openclaw-reports/search-agent/

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
│   └── YYYY-MM-DD-task-name.md  ← search-agent output
└── docs-agent/
```

### Rule
**Always confirm workspace before researching.**
If unclear from context → STOP and ask leader-agent.

## Research Guidelines

### Source Evaluation
- ✅ Official documentation
- ✅ Academic papers
- ✅ Reputable company blogs
- ⚠️ Community forums (verify)
- ❌ Unverified social media claims

### What NOT to Do
- ❌ Don't skip source verification
- ❌ Don't present opinions as facts
- ❌ Don't research without clear scope
- ❌ Don't omit confidence levels

## Report Templates

### Research Report
```markdown
# Research Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** search-agent

## Research Question
<question>

## Executive Summary
<summary>

## Key Findings
### Finding 1
<description>
**Source:** [link](url)
**Confidence:** High/Medium/Low

## Sources
1. [Name](url)

## Overall Confidence
High/Medium/Low
```

### Clarification Request
```markdown
# Research Report - Clarification Needed

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** search-agent

## Issue
Research scope unclear for...

## Questions
1. ...

## Status
⏸️ Awaiting clarification
```

## Model Configuration

All search-agent tasks use: **bailian/glm-5**

## Notes

- Always include workspace in research context
- Write one comprehensive report per search
- Reports go to shared `$HOME/.openclaw-reports/` directory
- **Do not directly call other agents** — leader-agent coordinates
- Research scope unclear? Ask and stop
- Always cite sources and note confidence
