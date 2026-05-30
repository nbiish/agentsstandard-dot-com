# agentsstandard.com

**The AGENTS.md hierarchical configuration standard for AI agents.**

**Live:** [agentsstandard.com](https://agentsstandard.com) · **Spec:** [nbiish/agents-standard](https://github.com/nbiish/agents-standard)

## The Standard

One file: `AGENTS.md`. Four scopes. All agents.

```
~/.agents/AGENTS.md              ← Global Base (user preferences/security, loaded first)
├── .agents/AGENTS.md            ← Project Base (committed rules for tech stack, deployment)
├── AGENTS.md                    ← Project Active / PRD (commonly modified task/feature rules)
│   ├── src/AGENTS.md            ← Folder (component rules, optional)
│   └── api/AGENTS.md            ← Folder (component rules, optional)
```

Rules cascade and extend, not replace. Same model as `.editorconfig`, `.eslintrc`, `.gitignore`.

Full specification: **[nbiish/agents-standard](https://github.com/nbiish/agents-standard)**

## Separation of Concerns: llms.txt (PRD) vs AGENTS.md (Rules)

The standard unifies project instructions by separating **what/why** from **how**:
* **`llms.txt` (Project PRD)**: Located at `{project_root}/llms.txt`. Defines the codebase context, active product requirements, tech stack, API definitions, and roadmap (the "What" and "Why").
* **`AGENTS.md` (Behavioral Cascade)**: Cascades across four scopes. Defines the guidelines, safety constraints, coding style preferences, and CLI commands the agent must follow (the "How").

## Resolution Order

1. `~/.agents/AGENTS.md` — loaded first (global base, user-specific safety/preferences)
2. `llms.txt` at repository root — project PRD (loaded second, functional requirements/tech stack)
3. `.agents/AGENTS.md` at repository root — project base rules (loaded third, committed guidelines)
4. `AGENTS.md` at repository root — project active rules (loaded fourth, active constraints, symlinked)
5. `AGENTS.md` in current working directory — folder-specific rules (loaded last, folder overrides)

Conflicts: most specific rules win (folder > active > project base > global).

## Machine-Readable Files

This repo serves structured data for agents, crawlers, and tools to intake the standard programmatically:

| File | What it is | Who it's for |
|------|-----------|--------------|
| [`llms.txt`](llms.txt) | Plain text summary of the spec + agent config map | LLMs, agents, crawlers |
| [`agents.json`](agents.json) | Structured JSON: scopes, resolution rules, all 30+ agent config paths + MCP locations | Tools, scripts, agent frameworks |
| [`providers.json`](providers.json) | Structured JSON: 15 LLM providers, API endpoints, auth patterns, referral codes | Tools, scripts, agent frameworks |
| [`mcp-settings.example.json`](mcp-settings.example.json) | Example universal MCP config for ~/.agents/mcp-settings.json | Users, agents |
| [`index.html`](index.html) | The full website | Humans |
| [`setup.sh`](setup.sh) | Symlink `~/.agents/AGENTS.md` to all agent configs | Users setting up |

### Quick intake

```bash
# For agents/crawlers — read the spec in ~2KB
curl -sL https://agentsstandard.com/llms.txt

# For tools/scripts — structured JSON
curl -sL https://agentsstandard.com/agents.json

# For users — run the setup
curl -sL https://agentsstandard.com/setup.sh | bash
```

## Agent Config Map

Every major agent's config file, global path, and project path — verified against official docs:

| Agent | Config File | Global Path | Project Path | Native? |
|-------|------------|-------------|--------------|---------|
| Pi | `AGENTS.md` | `~/.agents/AGENTS.md` | `AGENTS.md` | Yes |
| Claude Code | `CLAUDE.md` | `~/.claude/CLAUDE.md` | `CLAUDE.md` | — |
| Agy / Gemini CLI | `GEMINI.md` | `~/.gemini/GEMINI.md` | `GEMINI.md` | — |
| OpenAI Codex | `AGENTS.md` | `~/.codex/instructions.md` | `AGENTS.md` | — |
| Cursor | `.cursorrules` | `~/.cursor/rules/` | `.cursorrules` | — |
| GitHub Copilot | `copilot-instructions.md` | Settings UI | `.github/copilot-instructions.md` | — |
| Windsurf | `.windsurfrules` | `~/.codeium/windsurf/` | `.windsurfrules` | — |
| Cline | `.clinerules` | `~/.cline/cline_rules` | `.clinerules` | — |
| Roo Code | `.roorules` | `~/.roo/rules/` | `.roorules` | — |
| Kiro | `kiro.md` | `~/.kiro/kiro.md` | `.kiro/kiro.md` | — |
| Kilo Code | `AGENTS.md` | — | `AGENTS.md` | Yes |
| Augment | `.augment-guidelines` | `~/.augment/guidelines` | `.augment-guidelines` | — |
| Goose | `goosehints` | `~/.config/goose/goosehints` | `.goosehints` | — |
| Junie | `guidelines.md` | `~/.junie/guidelines.md` | `.junie/guidelines.md` | — |
| Trae | `.trae/rules/` | `~/.trae/rules/` | `.trae/rules/` | — |
| Devin | `instructions.md` | Settings UI | `.devin/instructions.md` | — |
| Warp | `warp.md` | — | `WARP.md` | — |
| Crush | `AGENTS.md` | `~/.config/crush/crush.md` | `CRUSH.md` | — |
| OpenCode | `AGENTS.md` | — | `AGENTS.md` | Yes |
| Deep Agents (dcode) | `AGENTS.md` | `~/.deepagents/AGENTS.md` | `.deepagents/AGENTS.md` | Yes |
| CodeWhale | `AGENTS.md` | `~/.agents/AGENTS.md` | `AGENTS.md` | Yes |
| Hermes Agent | `AGENTS.md` | `~/.hermes/SOUL.md` | `AGENTS.md` | — |
| Agent Zero (a0) | `AGENTS.md` | — | `AGENTS.md` | — |
| Aider | `.aider.conf.yml` | `~/.aider.conf.yml` | `.aider.conf.yml` | — |
| Continue | `config.json` | `~/.continue/config.json` | `.continue/config.json` | — |
| Qwen Code | `QWEN.md` | — | `QWEN.md` | — |
| Mistral Codestral | `CODESTRAL.md` | — | `CODESTRAL.md` | — |
| Zed | `AGENTS.md` | `~/.config/zed/AGENTS.md` | `AGENTS.md` | Yes |
| MiniCC | `AGENTS.md` | `~/.minicc/AGENTS.md` | `AGENTS.md` | — |
| fcc-claude | `AGENTS.md` | `~/.fcc/.env` | `AGENTS.md` | — |

Full structured data in [`agents.json`](agents.json) — includes MCP config paths and docs verification links.

## MCP Config Map

Every agent's MCP server configuration location:

| Agent | Global MCP Config | Project MCP Config | Format |
|-------|-------------------|-------------------|--------|
| Claude Code | `~/.claude.json` | `.mcp.json` | JSON |
| Agy / Gemini CLI | `~/.gemini/settings.json` | `.gemini/settings.json` | JSON |
| Codex | `~/.codex/config.toml` | — | TOML |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` | JSON |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | — | JSON |
| Copilot | Settings UI | `.github/copilot-mcp.json` | JSON |
| Cline | VS Code globalStorage | — | JSON |
| Roo Code | Extension settings | `.roo/mcp.json` | JSON |
| Kiro | `~/.kiro/settings/mcp.json` | `.kiro/settings/mcp.json` | JSON |
| Kilo Code | Extension settings | `kilo.jsonc` | JSONC |
| Goose | `~/.config/goose/config.yaml` | — | YAML |
| Junie | `~/.junie/mcp.json` | `.junie/mcp/mcp.json` | JSON |
| Trae | Trae/User/mcp.json | — | JSON |
| Crush | `~/.config/crush/crush.json` | `crush.json` | JSON |
| OpenCode | `~/.config/opencode/opencode.json` | `opencode.json` | JSONC |
| dcode | `~/.deepagents/.mcp.json` | — | JSON |
| Qwen Code | `~/.qwen/settings.json` | `.qwen/settings.json` | JSON |
| Continue | `~/.continue/config.yaml` | `.continue/mcpServers/` | YAML |
| MiniCC | `~/.minicc/mcp.json` | `.minicc/mcp.json` | JSON |
| Warp | Warp Drive UI | `.warp/mcp.json` | JSON |
| Hermes Agent | `~/.hermes/config.yaml` | — | YAML |

## LLM Providers

Every agent needs a model. Provider API endpoints, auth, free tiers, and referral links:

| Provider | Key Models | API Base URL | Auth Env Var | Free Tier |
|----------|-----------|-------------|--------------|-----------|
| Anthropic | Claude Opus 4.7, Sonnet 4.6 | `https://api.anthropic.com/v1` | `ANTHROPIC_API_KEY` | — |
| OpenAI | GPT-5.4, GPT-5.3, o4-mini | `https://api.openai.com/v1` | `OPENAI_API_KEY` | — |
| Google Gemini | Gemini 2.5 Pro, Flash | `https://generativelanguage.googleapis.com/v1beta` | `GEMINI_API_KEY` | Flash free |
| DeepSeek | DeepSeek-V4, V3 | `https://api.deepseek.com/v1` | `DEEPSEEK_API_KEY` | — |
| OpenRouter | 250+ models | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | Free models |
| z.ai | GLM-5.1, GLM-4.7 | `https://api.z.ai/api/coding/paas/v4` | `ZAI_API_KEY` | — |
| Wafer AI | GLM-5.1, various | `https://api.wafer.ai/v1` | `WAFER_API_KEY` | — |
| Mistral AI | Mistral Large 3, Codestral | `https://api.mistral.ai/v1` | `MISTRAL_API_KEY` | Free (rated) |
| Groq | Llama 4, Mixtral | `https://api.groq.com/openai/v1` | `GROQ_API_KEY` | Free 30r/m |
| xAI | Grok-4, Grok-3 | `https://api.x.ai/v1` | `XAI_API_KEY` | — |
| Together AI | Llama 4, DeepSeek | `https://api.together.xyz/v1` | `TOGETHER_API_KEY` | $1 credit |
| Fireworks AI | Llama 4, Qwen | `https://api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY` | 100r/d |
| Ollama (local) | Llama 4, Qwen 3 | `http://localhost:11434/v1` | — | Free |
| LM Studio (local) | Any GGUF | `http://localhost:1234/v1` | — | Free |

**Referral links:** [z.ai](https://z.ai/subscribe?ic=B50UECNB9T) (code `B50UECNB9T`) · [OpenCode AI](https://opencode.ai/go?ref=APBJCPVXC1) (code `APBJCPVXC1`) · Wafer AI (code `8b2ul8o0`)

Full structured data: [`providers.json`](providers.json)

## The Full ~/.agents/ Directory

```
# Global ~/.agents/ (behavior + tooling)
~/.agents/
├── AGENTS.md              ← Behavior rules (global base, loaded first)
├── mcp-settings.json      ← MCP server configs (all agents read from here)
└── skills/                ← Agent Skills (reusable capabilities)
    └── **/SKILL.md        ← Skills discovered by all agents
```

```
# Project .agents/ (tooling + project base rules)
{project}/.agents/
├── AGENTS.md              ← Project base rules (committed rules for tech stack, deployment)
├── mcp-settings.json      ← Project-specific MCP servers
└── skills/                ← Project-specific agent skills
    └── **/SKILL.md
```

> **Note:** Project base rules go in `{project}/.agents/AGENTS.md`, and project active/PRD rules (commonly modified task/feature rules) go in `{project}/AGENTS.md` at the repo root.

- **AGENTS.md** = how the agent should *behave* (this standard)
- **mcp-settings.json** = what tools the agent can *use* (MCP servers)
- **skills/**/SKILL.md** = what the agent can *do* ([Agent Skills](https://agentskills.io))

## Contribute

**[Open an issue](https://github.com/nbiish/agentsstandard-dot-com/issues/new)** to:

### For providers

Your agent tool updated its config file location? Your agent now reads `~/.agents/AGENTS.md` natively? Open an **[agent update](https://github.com/nbiish/agentsstandard-dot-com/issues/new?labels=update&template=agent-update.md)** issue with the new path and a link to your docs.

### For users

Found a new agent that's not on the map? Agent changed its config format? Open a **[new agent](https://github.com/nbiish/agentsstandard-dot-com/issues/new?labels=new-agent&template=new-agent.md)** issue with the config file name, paths, and a source link.

### For everyone

Want to change the spec itself? Open a **[spec change](https://github.com/nbiish/agentsstandard-dot-com/issues/new?labels=spec&template=spec-change.md)** issue with what you want to change and why.

## Relationship to Agent Skills

- **[Agent Skills](https://agentskills.io)** (SKILL.md) = what the agent can *do*
- **Agents Standard** (AGENTS.md) = how the agent should *behave*
- **mcp-settings.json** = what external tools are available

Both use the `.agents/` directory. They complement each other.

## Repos

| Repo | What it is |
|------|-----------|
| [nbiish/agents-standard](https://github.com/nbiish/agents-standard) | The specification (README, setup.sh, agents.json) |
| [nbiish/agentsstandard-dot-com](https://github.com/nbiish/agentsstandard-dot-com) | This repo — website + machine-readable files + issue tracker |

## License

MIT — see [LICENSE](LICENSE).
