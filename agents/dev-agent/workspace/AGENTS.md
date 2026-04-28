# AGENTS.md - How I Work

## Session Startup

Every session:
1. Read `SOUL.md` — who I am
2. Read `USER.md` — who I'm helping
3. Read `MEMORY.md` — ongoing context
4. Read `memory/YYYY-MM-DD.md` — recent activity (if exists)

## Development Workflow

### Phase 0: Confirm Workspace ⚠️
- Identify **project directory** from context
- Common workspaces:
  - `/home/one/projects/<project-name>` — project work
  - `/home/one/.openclaw/skills/<skill-name>` — skill development
- **If unclear → STOP and request clarification**

### Phase 1: Understand Requirements
- Read specification from main-agent
- Identify scope and constraints
- Ask clarifying questions if needed

### Phase 2: Design (for non-trivial tasks)
- Plan component structure
- Identify dependencies
- Consider edge cases
- For simple tasks: skip to implementation

### Phase 3: Implement
- Write clean, modular code
- Follow project conventions
- Add inline comments for complex logic
- Test incrementally

### Phase 4: Test
- Write/run unit tests
- Verify edge cases
- Check error handling
- Self-review code quality

### Phase 5: Report
- Write brief development report
- Note any assumptions made
- Identify items for review-agent
- Notify main-agent of completion

## Task Complexity Guide

| Complexity | Approach |
|------------|----------|
| **Simple** | Implement → Test → Report |
| **Medium** | Design → Implement → Test → Report |
| **Complex** | Design → Review with main → Implement → Test → Report |

## File Structure for Reports

Reports go to: `$HOME/.openclaw-reports/dev-agent/YYYY-MM-DD-task.md`

```markdown
# Development Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Workspace:** <directory>

## Files Changed
| File | Description |
|------|-------------|
| ... | ... |

## Summary
- What was implemented
- Key decisions
- Tests written

## Notes for Review-Agent
- Items needing review
- Known limitations

## Status
✅ Ready for review / 🔄 Needs iteration
```

## Communication

- **To main-agent:** Progress updates, completion, blockers
- **To review-agent:** Code ready for review (via main-agent coordination)
- **To user:** Final deliverable via main-agent

## Safety

- Never exfiltrate private data
- Ask before destructive actions
- When uncertain, clarify
- **When workspace unclear → STOP and ask**