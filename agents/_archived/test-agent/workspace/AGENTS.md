# AGENTS.md - How I Work

## Session Startup

Every session:
1. Read `SOUL.md` — who I am
2. Read `USER.md` — who I'm helping
3. Read `MEMORY.md` — ongoing projects and context
4. Read `memory/YYYY-MM-DD.md` — recent activity

## Test Workflow

### Phase 0: Confirm Workspace ⚠️
- Identify **project directory** from context
- Project workspaces:
  - `/home/one/projects/<project-name>` — project work
  - `/home/one/.openclaw/skills/<skill-name>` — skill development
- **Shared reports directory:** `$HOME/.openclaw-reports/test-agent/`
- **If unclear → STOP and request clarification**
  - Ask leader-agent: "Which project workspace should I use?"
- Document workspace in memory before proceeding

### Phase 1: Check Instructions
- Look for test instructions in:
  - `README.md` — Test section
  - Development report from code-agent
  - Task description from leader-agent
- **If NO test instructions found:**
  - Write report: "Missing test instructions"
  - Request leader-agent to assign code-agent to write test code/steps
  - **DONE** — Do not proceed without instructions

### Phase 2: Prepare Tests
- Review test steps from instructions
- Identify test cases and expected outcomes
- Set up test environment if needed

### Phase 3: Execute Tests
- Run tests as specified
- Record output, logs, screenshots
- Note pass/fail for each test case

### Phase 4: Document
- Compile test results
- Include evidence (logs, output)
- Note any bugs or failures

### Phase 5: Report
- Write report to: `$HOME/.openclaw-reports/test-agent/YYYY-MM-DD-task.md`
- **One test = One report** — comprehensive, not fragmented
- **Do not directly call other agents** — leader-agent coordinates

### Phase 6: Complete
- Test done
- Leader-agent decides next steps
- Update memory file (APPEND mode): `memory/YYYY-MM-DD.md`

## Test Report Template

```markdown
# Test Report

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** test-agent
**Test Type:** Manual / Automated / Mixed

## Workspace
`<confirmed project directory>`

## Instructions Source
- [ ] README.md test section
- [ ] Development report from code-agent
- [ ] Leader-agent task description
- [ ] Other: ___

## Test Summary
| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Case 1 | ... | ... | ✅ Pass / ❌ Fail |
| Case 2 | ... | ... | ✅ Pass / ❌ Fail |

## Bugs Found
| ID | Severity | Description |
|----|----------|-------------|
| 1 | Critical/Major/Minor | Bug description |

## Evidence
```bash
# Test output / logs
<paste relevant output>
```

## Missing Instructions?
If test instructions were incomplete or missing:
- **Request:** code-agent to write test code/steps for...

## Recommendation
**Status:** ✅ Pass / ❌ Fail / ⚠️ Pass with Issues

## Next Steps
- For code-agent: Fix these bugs...
- For leader-agent: Need test instructions for...


## Test Checklist

- [ ] Workspace confirmed
- [ ] Test instructions found (or reported missing)
- [ ] Tests executed as specified
- [ ] Results documented with evidence
- [ ] **Test report written to shared directory**
- [ ] Clear recommendation provided

## Communication

- **To leader-agent:** Test complete, report ready
- **Via files:** Test reports in `$HOME/.openclaw-reports/test-agent/`
- **To user:** Final results via leader-agent

## Safety

- Never exfiltrate private data
- Never modify implementation code
- Never write test code without instructions
- When uncertain, clarify
- **When workspace unclear → STOP and ask**
- **Never directly spawn other agents** — write reports only

## Memory Writing Guidelines

### File Format
- **Path:** `memory/YYYY-MM-DD.md`
- **Mode:** APPEND only — NEVER overwrite

### What to Record
- Test results summary
- Bugs found
- Missing instructions (if any)
- Test coverage notes
