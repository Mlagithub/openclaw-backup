# TOOLS.md - Leader Agent Configuration

## Session Management

### Spawn Sub-agent
```bash
# sessions_spawn parameters
runtime: "subagent"
agentId: "<agent-name>"  # search-agent, design-agent, etc.
task: "<clear description with workspace>"
mode: "session"  # persistent for multi-turn work
```

## Workspace Reference

### Common Workspaces
| Workspace | Purpose |
|-----------|---------|
| `/home/one/.openclaw/agents/main/workspace` | Main agent files, shared configs |
| `/home/one/.openclaw/agents/<agent>/workspace` | Agent-specific configuration |
| `/home/one/.openclaw/skills/<skill-name>` | Skill development |
| `/home/one/projects/<project-name>` | Project-specific work |

### Rule
**Always confirm workspace before delegating tasks.**
If unclear from context → STOP and ask user/main-agent.

## Agent Directory
```
/home/one/.openclaw/agents/
├── main/
├── leader-agent/
├── search-agent/
├── design-agent/
├── code-agent/
├── test-agent/
├── review-agent/
└── docs-agent/
```

## Complexity Assessment Guide

### Simple Tasks
**Indicators:**
- Single function or small feature
- Clear specifications
- No architecture changes
- Existing patterns to follow

**Team:** code-agent + review-agent

**Workflow:**
```
code-agent → review-agent → done
```

### Medium Tasks
**Indicators:**
- Multiple components
- Some design needed
- Minor architecture changes
- Integration with existing code

**Team:** design-agent + code-agent + test-agent + review-agent

**Workflow:**
```
design-agent → code-agent → test-agent → review-agent → done
                      ↑         │
                      └─────────┘ (loop max 3x)
```

### Complex Tasks
**Indicators:**
- New architecture
- Multiple integrations
- Unknown technology
- Significant user-facing changes

**Team:** search-agent + design-agent + code-agent + test-agent + review-agent + docs-agent

**Workflow:**
```
search-agent → design-agent → code-agent → test-agent → review-agent → docs-agent
                                                           ↑
                                                           └── (loop if issues)
```

## Iteration Management

### Loop Tracking
```markdown
## Iteration Log
| Cycle | Stage | Result | Issues | Next |
|-------|-------|--------|--------|------|
| 1 | Code→Test→Review | ❌ | 3 bugs | Back to code |
| 2 | Code→Test→Review | ✅ | None | Proceed to docs |
```

### Exit Conditions
| Condition | Action |
|-----------|--------|
| All tests pass + review approved | Exit loop, proceed |
| Max iterations reached | Escalate to user |
| Critical blocker found | Pause, ask user |

### Escalation Template
```markdown
## Escalation: <task>

**Issue:** <description>
**Iterations:** N cycles without progress
**Blocker:** <specific issue>

**Options:**
1. Continue with current approach (risk: delay)
2. Redesign (risk: scope change)
3. Reduce scope (risk: incomplete feature)

**Recommendation:** <option + reasoning>
```

## Communication Templates

### Task Delegation Template
```markdown
## Task: <task name>
## Workspace: <confirmed directory>
## Context: <background>
## Requirements:
- <requirement 1>
- <requirement 2>
## Deliverable: <expected output>
## Next Agent: <who receives output>
## Deadline: <if applicable>
```

### Progress Report Template
```markdown
## Progress Update: <project name>
### Completed
- <item 1>
- <item 2>
### In Progress
- <item 3>
### Current Loop
- Stage: code→test→review
- Iteration: 2/3
- Status: Waiting for review-agent
### Blockers
- <if any>
### Next Steps
- <item 4>
```

### Coordination Plan Template
```markdown
# Coordination Plan

**Task:** <task name>
**Complexity:** Simple/Medium/Complex
**Team:** [agents]
**Workflow:** <DAG description>
**Iteration Rules:** <rules>
**Exit Conditions:** <conditions>
```

## Model Configuration

All leader-agent tasks use: **bailian/glm-5**

## Notes

- Delegate coding to code-agent, don't do it myself
- Always include review phase before delivery
- Keep task descriptions clear and specific
- **Always include workspace in task delegation**
- Report progress, not just completion
- **Workflow is DAG — adapt to task needs**
- **Define loop exit conditions before starting**
- **Track iterations — escalate after max**
