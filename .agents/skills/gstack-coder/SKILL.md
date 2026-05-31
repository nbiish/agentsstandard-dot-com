---
name: gstack-coder
description: >
  Multi-tool coding skill integrating gstack (Claude Code skills), pi (pi-coding-agent),
  and mini (mini-swe-agent). Use when spawning Claude Code sessions for coding work,
  running security audits, code reviews, QA testing URLs, building features end-to-end,
  or planning before building. Also configures and orchestrates pi and mini to maximize
  utilization of all AI subscriptions and APIs. For MCP-equipped sub-agent dispatch with
  provider fallback, pair with pi-mini-orchestrator skill.
---

# GStack Coder — Multi-Tool Coding Orchestration

This skill combines **gstack** (Claude Code skill pack) with **pi** and **mini** to form a complete multi-tool coding workflow. Each tool has unique strengths and subscription quotas — this skill ensures all are utilized.

**PRD Anchor:** Always read `llms.txt` in the repository root first. It is the authoritative Product Requirements Document for this repo — it defines architecture, security policy (PQC mandates, secrets management), workflow rules (git worktrees, commit conventions), and the provider/MCP infrastructure. If `llms.txt` and any other doc conflict, `llms.txt` wins. Never skip reading it.

---

## 1. GStack Installation & Setup

gstack is a collection of Claude Code skills by garrytan. Install once:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

After installation, gstack provides these slash commands inside Claude Code:

| Command | Purpose |
|---------|---------|
| `/cso` | Security audit — full codebase security review |
| `/review` | Code review — detailed PR/code review |
| `/qa https://...` | QA test a URL — test a deployed endpoint |
| `/autoplan` | Auto-plan — generate implementation plan for a feature |
| `/ship` | Ship — build, test, and deploy pipeline |
| `/office-hours` | Office hours — architect/planning discussion before building |

---

## 2. Multi-Tool Coding Workflow

### Tool Inventory

| Tool | CLI | Config Location | Best For |
|------|-----|-----------------|----------|
| **Claude Code** (gstack) | `claude` | `~/.claude/` | Security audits, code review, planning, shipping |
| **pi** | `pi` (wrapper) | `~/.pi/agent/` | Fast non-interactive coding, extensions, themes, MCP servers |
| **mini** | `mini` (wrapper) | `~/.config/mini-swe-agent/.env` | Lightweight SWE agent, bash-based tasks |

### Provider Hot-Swap (use all subscriptions)

The ainish-coder framework supports hot-swapping provider configs via CLI wrappers. Each tool can be pointed at different API providers to maximize quota usage:

```bash
# pi with provider — wrapper auto-swaps config before launch
pi modal -p "Add input validation to src/api/handlers.ts" --no-session --thinking off

# mini with provider
mini nvidia --task "Fix the race condition" --yolo

# MCP-equipped dispatch (see pi-mini-orchestrator skill)
pi modal --mcp tavily-search,github -p "Review PR for security issues" --no-session --thinking off
```

**Canonical provider order:** `modal` → `nvidia` → `nebius` → `opencode` → `zai` → `wafer-serverless` → `openrouter` → `zenmux`

Always dispatch in this order. On failure, advance to the next. Never skip or reorder.

---

## 3. Coding Task Patterns

### Security Audit
```
Load gstack. Run /cso
```
Full codebase security review using gstack's security audit skill. Covers PQC compliance, injection vectors, secret leaks, and dependency vulnerabilities.

### Code Review
```
Load gstack. Run /review
```
Detailed PR/code review with line-by-line analysis, best practices checks, and improvement suggestions.

### QA Test a URL
```
Load gstack. Run /qa https://staging.example.com
```
Test a deployed URL end-to-end: functional testing, API validation, UI checks, performance baseline.

### Build a Feature End-to-End
```
Load gstack. Run /autoplan, implement the plan, then run /ship
```
Full cycle: auto-generate implementation plan, execute, build and ship.

### Plan Before Building (No Implementation)
```
Load gstack. Run /office-hours then /autoplan. Save the plan, don't implement.
```
Architecture discussion first, then detailed plan. Save for later. No code changes.

---

## 4. OSA: Orchestrated System of Agents

When dispatching work across coding tools using fixed-order rotation:

```
gemini → claude → crush → pi → mini → opencode → kilo → (wrap)
```

### YOLO Dispatch Commands

```bash
# Sequential dispatch — each agent does one task
gemini -p "Add error handling to src/api/routes.ts" -y
claude -p "Review the error handling for edge cases" --dangerously-skip-permissions
pi modal -p "Add unit tests for the error handling" --no-session --thinking off
mini nvidia --task "Validate routes against schema" --yolo
```

### Parallel Dispatch (separate worktrees)

```bash
# Each agent works on a different file in isolation
git worktree add ../task-auth agent-gemini
cd ../task-auth && gemini -p "Implement OAuth2 login flow" -y &

git worktree add ../task-payment agent-pi
cd ../task-payment && pi modal -p "Implement Stripe payment integration" --no-session --thinking off &

wait
# Review and merge worktrees back
```

---

## 5. Tool-Specific Configuration

### pi (pi-coding-agent)
- Config: `~/.pi/agent/settings.json`, `auth.json`, `models.json`
- Non-interactive: `pi <provider> -p "prompt" --no-session --thinking off`
- With MCP: `pi <provider> --mcp server1,server2 -p "prompt" --no-session --thinking off`
- Extensions: `pi -e extensions/your-extension.ts`

### mini (mini-swe-agent)
- Config: `~/.config/mini-swe-agent/.env`
- Non-interactive: `mini <provider> --task "prompt" --yolo`
- With MCP: `mini <provider> --mcp server1,server2 --task "prompt" --yolo`
- Config override: `mini -c custom.yaml --task "prompt" --yolo`

### Provider switching
- Both wrappers auto-detect provider arg and hot-swap config before launch
- Original config restored when the tool exits
- All providers in `~/.config/ainish-coder/providers.json`

---

## 6. Provider Configuration

Configure providers in `~/.config/ainish-coder/providers.json`. The canonical dispatch order is fixed:

```
modal → nvidia → nebius → opencode → zai → wafer-serverless → openrouter → zenmux
```

```json
{
  "modal": {
    "baseUrl": "https://modal.com/api/v1",
    "apiKey": "sk-modal-...",
    "defaultModel": "zai-org/GLM-5.1-FP8",
    "tools": { "pi": true, "mini": true }
  },
  "nvidia": {
    "baseUrl": "https://integrate.api.nvidia.com/v1",
    "apiKey": "nvapi-...",
    "defaultModel": "deepseek/deepseek-v4-flash",
    "tools": { "pi": true, "mini": true }
  },
  "nebius": {
    "baseUrl": "https://api.nebius.com/v1",
    "apiKey": "sk-nebius-...",
    "defaultModel": "NousResearch/Hermes-4-405B",
    "tools": { "pi": true, "mini": true }
  }
}
```

All 8 providers support both pi and mini. The full provider list, models, and MCP server catalog are defined in `llms.txt` (the authoritative PRD) and `~/.agents/mcp-settings.json`.

---

## 7. MCP Sub-Agent Dispatch

For MCP-equipped sub-agent dispatch with automatic provider fallback, pair with the **pi-mini-orchestrator** skill. It provides:

- MCP server catalog (10 servers: tavily, context7, brave, github, postgres, filesystem, codewhale, puppeteer, memory, gitnexus)
- Provider fallback chain (modal → nvidia → nebius → opencode → zai → wafer-serverless → openrouter → zenmux)
- Error recovery patterns (provider failure → next provider, MCP failure → retry without)
- Scoped MCP: sub-agents only get the tools they need per task

```bash
# Example: code review with GitHub access + provider fallback
pi modal --mcp github -p "Review PR #42" --no-session --thinking off ||
  pi nvidia --mcp github -p "Review PR #42" --no-session --thinking off ||
  pi nebius --mcp github -p "Review PR #42" --no-session --thinking off
```

---

## 8. Adding "Coding Tasks" to AGENTS.md

When setting up a new codebase, add this section to AGENTS.md:

```markdown
## CODING TASKS

When spawning Claude Code sessions for coding work, tell the session to use gstack skills.
Always read llms.txt first — it is the authoritative PRD for this repository.

### Task Patterns

- **Security audit**: "Load gstack. Run /cso"
- **Code review**: "Load gstack. Run /review"
- **QA test a URL**: "Load gstack. Run /qa https://..."
- **Build feature end-to-end**: "Load gstack. Run /autoplan, implement the plan, then run /ship"
- **Plan before building**: "Load gstack. Run /office-hours then /autoplan. Save the plan, don't implement."

### Multi-Tool Dispatch

For parallel work across subscriptions (in canonical order):
- **pi**: `pi <provider> -p "task" --no-session --thinking off`
- **mini**: `mini <provider> --task "task" --yolo`

Provider order: modal → nvidia → nebius → opencode → zai → wafer-serverless → openrouter → zenmux

For MCP-equipped sub-agent dispatch with provider fallback, pair with pi-mini-orchestrator skill.
```
