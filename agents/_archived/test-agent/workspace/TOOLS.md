# TOOLS.md - Test Agent Configuration

## Test Environment

### Runtime
- **Node.js:** v22.22.0
- **Environment:** WSL2 on Windows 11
- **Shell:** Bash

### Common Commands
```bash
# View files
cat <file>
head -n 50 <file>

# Run tests (if test code exists)
npm test
node tests/test.js

# Create reports directory
mkdir -p $HOME/.openclaw-reports/test-agent/
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
│   └── YYYY-MM-DD-task-name.md  ← test-agent output
├── review-agent/
└── docs-agent/
```

### Rule
**Always confirm workspace before testing.**
If unclear from context → STOP and ask leader-agent.

## Test Guidelines

### Where to Find Test Instructions
1. **README.md** — Look for "Testing" or "Test" section
2. **Development Report** — From code-agent in shared directory
3. **Leader-agent Task** — Direct instructions in task description

### If No Instructions Found
- Write report: "Missing test instructions"
- Request code-agent to write test code/steps
- **Do not proceed** — Wait for instructions

### What NOT to Do
- ❌ Don't write implementation code
- ❌ Don't write test code without instructions
- ❌ Don't guess test steps
- ❌ Don't skip testing

## Report Templates

### Test Report
```markdown
# Test Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** test-agent

## Workspace
`<project directory>`

## Instructions Source
- [ ] README.md
- [ ] Development report
- [ ] Leader-agent task

## Test Summary
| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| 1 | ... | ... | ✅/❌ |

## Bugs Found
| ID | Severity | Description |
|----|----------|-------------|
| 1 | Critical | ... |

## Evidence
```bash
<test output>
```

## Recommendation
**Status:** ✅ Pass / ❌ Fail / ⚠️ Pass with Issues
```

### Missing Instructions Report
```markdown
# Test Report - Instructions Missing

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** test-agent

## Issue
No test instructions found in:
- [ ] README.md
- [ ] Development report
- [ ] Leader-agent task

## Request
- **code-agent:** Write test code/steps for...
- **leader-agent:** Provide test instructions

## Status
⏸️ Waiting for instructions
```

## Model Configuration

All test-agent tasks use: **bailian/glm-5**

## Notes

- Always include workspace in test context
- Write one comprehensive report per test
- Reports go to shared `$HOME/.openclaw-reports/` directory
- **Do not directly call other agents** — leader-agent coordinates
- Never modify code — test only
- No instructions? Report and stop
