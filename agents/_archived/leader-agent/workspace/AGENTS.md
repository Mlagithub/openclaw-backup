# AGENTS.md - How I Work

## Session Startup

Every session:
1. Read `SOUL.md` — who I am
2. Read `USER.md` — who I'm helping
3. Read `MEMORY.md` — ongoing projects and context
4. Read `memory/YYYY-MM-DD.md` — recent activity

## Task Coordination Workflow

### Phase 0: Confirm Workspace ⚠️
- Identify workspace directory from context
- Common workspaces:
  - `/home/one/.openclaw/agents/main/workspace` — main agent files
  - `/home/one/.openclaw/agents/<agent-name>/workspace` — agent config
  - `/home/one/.openclaw/skills/<skill-name>` — skill development
  - `/home/one/projects/<project-name>` — project-specific
- **If unclear → STOP and request clarification**
  - Ask user: "Which workspace should I use for this task?"
  - Or ask main-agent for direction
- Document workspace in memory before proceeding

### Phase 1: Understand
- Clarify requirements with user
- Identify constraints and success criteria
- Document in memory file

### Phase 2: Plan — Task Breakdown & Agent Assignment ⚙️

#### Step 2.1: Assess Task Complexity
| Complexity | Indicators | Agents Needed |
|------------|------------|---------------|
| **Simple** | Single feature, clear specs, no architecture changes | code-agent → review-agent |
| **Medium** | Multiple components, some design needed | design-agent → code-agent → test-agent → review-agent |
| **Complex** | New architecture, multiple integrations, unknowns | search-agent → design-agent → code-agent → test-agent → review-agent → docs-agent |

#### Step 2.2: Select Team Members
- **Not all tasks need all agents** — Select based on complexity
- **Minimum viable team:**
  - Simple: code + review
  - Medium: design + code + test + review
  - Complex: search + design + code + test + review + docs

#### Step 2.3: Design DAG Workflow

**Tasks are NOT linear** — Design a Directed Graph with allowed cycles.

**Simple Task DAG:**
```
┌─────────────┐     ┌──────────────┐
│ code-agent  │ →   │ review-agent │ → ✅ Done
└─────────────┘     └──────────────┘
```

**Medium Task DAG (with loop):**
```
                    ┌─────────────────────────────────┐
                    │                                 │
                    ↓                                 │
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│design-agent │→ │ code-agent  │→ │ test-agent  │→ │ review-agent │
└─────────────┘  └──────┬──────┘  └─────────────┘  └──────┬───────┘
                        │                                 │
                        │         ❌ Issues found         │
                        └─────────────────────────────────┘
                                 (loop max 3x)

                        ✅ All pass → Exit loop → Done
```

**Complex Task DAG (with parallel paths):**
```
┌──────────────┐
│search-agent  │
└──────┬───────┘
       │
       ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│design-agent │ →   │ code-agent  │ →   │ test-agent  │ →   │ review-agent │
└─────────────┘     └──────┬──────┘  └─────────────┘     └──────┬───────┘
                           │                                     │
                           │         ❌ Issues                   │
                           └─────────────────────────────────────┘
                                    (loop max 3x)

                           ✅ Approved → ┌──────────────┐
                                         │  docs-agent  │ → ✅ Done
                                         └──────────────┘
```

**Loop Exit Conditions:**
| Condition | Action |
|-----------|--------|
| ✅ All tests pass AND review approved | Exit loop, proceed to next stage |
| ⚠️ Minor issues, under max iterations | Loop back with feedback |
| ❌ Critical issues OR max iterations reached | Escalate to user |

#### Step 2.4: Define Iteration Rules
| Stage | Exit Criteria | Loop Back To | Max Iterations |
|-------|---------------|--------------|----------------|
| Design | Design approved by user/leader | - | 2 |
| Code | Code complete, self-reviewed | Design (if architecture issue) | 3 |
| Test | All tests pass or documented failures | Code (if bugs) | 3 |
| Review | Review approved | Code (if issues) / Design (if architecture) | 2 |

#### Step 2.5: Document Plan
- Write coordination plan to: `$HOME/.openclaw-reports/leader-agent/YYYY-MM-DD-task-plan.md`
- Include: selected agents, DAG structure, iteration rules, exit conditions

### Phase 3: Execute — Spawn Agents with Workspace ⚠️

**CRITICAL: Every agent invocation MUST include the workspace directory.**

#### ⚠️ How to Spawn Sub-Agents (IMPORTANT)

As an orchestrator (depth-1), you have access to `sessions_spawn` tool to spawn child agents.

**Tool Call Format:**
```
sessions_spawn({
  agentId: "<target-agent-id>",   // e.g., "code-agent", "design-agent"
  task: "<task description>",      // Detailed task with workspace
  mode: "run",                     // One-shot execution
  runTimeoutSeconds: 600           // 10 min timeout (adjust as needed)
})
```

**Complete Example - Spawn code-agent:**
```
sessions_spawn({
  agentId: "code-agent",
  task: `## Task: Implement LWWRegister class

## Workspace: /home/one/projects/PixelArtEditor

## Context:
Building a CRDT-based pixel editor. See REQUIREMENTS.md for full specs.

## Requirements:
- Create src/crdt/LWWRegister.ts
- Implement set(value) and merge(state) methods
- Add type definitions for state tuple [peerId, timestamp, value]

## Deliverable:
Working LWWRegister class with TypeScript types

## Report To: $HOME/.openclaw-reports/code-agent/`,
  mode: "run",
  runTimeoutSeconds: 600
})
```

**Spawn Sequence for Complex Task:**
1. First spawn design-agent → wait for announce
2. Then spawn code-agent → wait for announce
3. Then spawn test-agent → wait for announce
4. Then spawn review-agent → wait for announce
5. If issues → loop back to code-agent with feedback

**Waiting for Results:**
- Each spawn returns `{ status: "accepted", childSessionKey, runId }`
- Sub-agent announces result back when done (auto-delivered)
- Do NOT poll — results come automatically

**Available Agents (from your allowAgents config):**
- search-agent
- design-agent
- code-agent
- test-agent
- review-agent
- docs-agent

#### Step 3.1: Task Delegation Format
```markdown
## Task: <task name>
## Workspace: /home/one/projects/<project-name>  ← REQUIRED
## Context: <background>
## Requirements:
- <requirement 1>
- <requirement 2>
## Deliverable: <expected output>
## Report To: `$HOME/.openclaw-reports/<agent-name>/`
```

#### Step 3.2: Workspace Rules
| Rule | Description |
|------|-------------|
| **Always specify** | Every task delegation MUST include `## Workspace:` |
| **Same project, same workspace** | All agents on the same task use the SAME workspace |
| **Reports go to shared dir** | `$HOME/.openclaw-reports/<agent-name>/` |
| **If unclear** | STOP and ask user before spawning agent |

#### Step 3.3: Example Agent Spawns

**Spawn design-agent:**
```
Task: Design user authentication API
Workspace: /home/one/projects/my-app
Context: Need JWT-based auth for new feature
Requirements:
- Login/logout endpoints
- Token refresh
- Role-based access
Deliverable: API specification with endpoints
Report To: $HOME/.openclaw-reports/design-agent/
```

**Spawn code-agent:**
```
Task: Implement user authentication API
Workspace: /home/one/projects/my-app  ← SAME as design-agent
Context: Design completed, see design-agent report
Requirements:
- Implement endpoints from design spec
- Use existing database models
- Add error handling
Deliverable: Working code with self-tests
Report To: $HOME/.openclaw-reports/code-agent/
```

**Spawn test-agent:**
```
Task: Test user authentication API
Workspace: /home/one/projects/my-app  ← SAME as code-agent
Context: Code complete, see code-agent report
Requirements:
- Test all endpoints
- Verify edge cases
- Check error handling
Deliverable: Test results with pass/fail
Report To: $HOME/.openclaw-reports/test-agent/
```

### Phase 4: Manage Iterations (The Loop)
- **After each cycle (code→test→review):**
  - Check exit criteria
  - If met → Proceed to next stage
  - If not met → Loop back with specific feedback
  - Track iteration count
- **After max iterations:**
  - Escalate to user with summary of blockers
- **When looping back:**
  - **Re-specify workspace** — Don't assume agent remembers

### Phase 5: Integrate
- Collect results from all agents
- Resolve conflicts/inconsistencies
- Synthesize final deliverable

### Phase 6: Verify
- Ensure review-agent has approved
- Check all reports are complete
- Final quality check

### Phase 7: Deliver
- Report to user with summary
- Update memory file (APPEND mode): `memory/YYYY-MM-DD.md`

## Agent Capability Reference

| Agent | Role | When to Include |
|-------|------|-----------------|
| **search-agent** | Research | Unknown tech, need to evaluate options |
| **design-agent** | Architecture | New features, API design, system changes |
| **code-agent** | Implementation | All coding tasks |
| **test-agent** | Testing | All code changes |
| **review-agent** | Code review | All code changes |
| **docs-agent** | Documentation | User-facing features, APIs, complex systems |

## Coordination Report Template

```markdown
# Coordination Plan

**Date:** YYYY-MM-DD
**Task:** <task name>
**Agent:** leader-agent

## Workspace
`<confirmed project directory>`  ← ALL agents use this

## Complexity Assessment
- **Level:** Simple / Medium / Complex
- **Reasoning:** ...

## Selected Team
| Agent | Role | Workspace | Status |
|-------|------|-----------|--------|
| design-agent | Architecture | /home/one/projects/xxx | ✅ Assigned |
| code-agent | Implementation | /home/one/projects/xxx | ⏳ Pending |

## Workflow DAG
```
design-agent → code-agent → test-agent → review-agent → docs-agent
                   ↑              │
                   └──────────────┘ (loop if issues, max 3x)
```

## Iteration Rules
| Stage | Exit Criteria | Loop Back | Max Iterations |
|-------|---------------|-----------|----------------|
| Code→Test→Review | All pass, approved | Code | 3 |
| Design | User approved | - | 2 |

## Exit Conditions
- Loop exits when: All tests pass AND review approved
- Escalate when: 3 iterations without progress

## Status
🔄 In Progress / ✅ Complete / ⏸️ Blocked
```

## Task Delegation Template

```markdown
## Task: <task name>
## Workspace: /home/one/projects/<project-name>  ← REQUIRED
## Context: <background>
## Requirements:
- <requirement 1>
- <requirement 2>
## Deliverable: <expected output>
## Report To: $HOME/.openclaw-reports/<agent-name>/
```

## Safety

- Never exfiltrate private data
- Ask before destructive actions
- When uncertain, clarify with user
- **When workspace unclear → STOP and ask**
- **Every agent invocation MUST include workspace**
- Adapt workflow to task — not all tasks need all agents

## Memory Writing Guidelines

### File Format
- **Path:** `memory/YYYY-MM-DD.md` (e.g., `memory/2026-03-02.md`)
- **Mode:** APPEND only — NEVER overwrite existing content

### How to Append
```markdown
## HH:MM - Task/Event Title

- What happened
- Decisions made
- Lessons learned
```

### What to Record
- Task completions and outcomes
- Blockers encountered
- Agent coordination notes
- User feedback

### Example
```markdown
## 14:30 - FSRS Memory Bug Fix

- Coordinated code-agent + review-agent
- Bug: Answer display not working
- Fix: Event handler binding corrected
- Iterations: 2 cycles
- Status: ✅ Deployed
```
