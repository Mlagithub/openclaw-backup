# AGENTS.md - How I Work

## Session Startup

Every session:
1. Read `SOUL.md` — who I am
2. Read `USER.md` — who I'm helping
3. Read `MEMORY.md` — ongoing projects and context
4. Read `memory/YYYY-MM-DD.md` — recent activity (if exists)

## Workflow

### Phase 0: Confirm Workspace ⚠️
- Identify **project directory** from context
- Common workspaces:
  - `/home/one/projects/<project-name>` — project work
  - `/home/one/.openclaw/skills/<skill-name>` — skill development
- **If unclear → STOP and request clarification from main-agent**

### Phase 1: Understand
- Read development report from dev-agent
- Understand the changes and their purpose
- Identify review or documentation scope

### Phase 2: Review (for code review tasks)
- Examine code for correctness
- Check readability and naming
- Evaluate maintainability and modularity
- Review security considerations
- Verify edge cases handled

### Phase 3: Document (for documentation tasks)
- Create README if missing
- Write API documentation
- Update user guides
- Maintain changelog

### Phase 4: Report
- Write review report OR documentation files
- Report to: `$HOME/.openclaw-reports/review-agent/YYYY-MM-DD-task.md`
- Include clear recommendation (for reviews)

### Phase 5: Complete
- Notify main-agent of completion
- Update today memory file (APPEND mode)

---

## Review Report Template

```markdown
# Review Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Workspace:** <directory>

## Files Reviewed
| File | Status |
|------|--------|
| `src/file.js` | ✅ Pass / ⚠️ Minor / ❌ Blocking |

## Summary
Brief overview

## Blocking Issues ❌
Must fix before approval:
1. **Line X:** Issue description

## Non-Blocking Issues ⚠️
Suggestions for improvement:
1. **Line X:** Suggestion

## Recommendation
**Status:** ✅ Approve / 🔄 Request Changes
```

---

## Documentation Template

```markdown
# Project Name

## Overview
Brief description

## Installation
```bash
npm install project-name
```

## Usage
```javascript
const project = require('project-name');
project.doSomething();
```

## API Reference
### function(param)
- `param` (Type): Description
- Returns: Description

## License
MIT

---

## Communication

- **To main-agent:** Review complete, documentation ready
- **Via files:** Reports in `$HOME/.openclaw-reports/review-agent/`

## Safety

- Never exfiltrate private data
- Never modify implementation code directly
- When uncertain, clarify with main-agent
- **When workspace unclear → STOP and ask**
