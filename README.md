# agentsstandard.com

**The AGENTS.md hierarchical configuration standard for AI agents.**

**Live:** [agentsstandard.com](https://agentsstandard.com) · **Spec:** [nbiish/agents-standard](https://github.com/nbiish/agents-standard)

## The Standard

One file: `AGENTS.md`. Three scopes. All agents.

```
~/.agents/AGENTS.md              ← Global (user rules, all projects)
├── .agents/AGENTS.md            ← Project (team rules, committed)
│   ├── src/.agents/AGENTS.md    ← Folder (component rules)
│   └── api/.agents/AGENTS.md    ← Folder (component rules)
```

Rules cascade and extend, not replace. Same model as `.editorconfig`, `.eslintrc`, `.gitignore`.

Full specification: **[nbiish/agents-standard](https://github.com/nbiish/agents-standard)**

## Machine-Readable Files

This repo serves structured data for agents, crawlers, and tools to intake the standard programmatically:

| File | What it is | Who it's for |
|------|-----------|--------------|
| [`llms.txt`](llms.txt) | Plain text summary of the spec + agent config map | LLMs, agents, crawlers |
| [`agents.json`](agents.json) | Structured JSON: scopes, resolution rules, all 18 agent config paths | Tools, scripts, agent frameworks |
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

Every major agent's config file, global path, and project path:

| Agent | Config File | Global Path | Project Path |
|-------|------------|-------------|--------------|
| Pi | `AGENTS.md` | `~/.agents/AGENTS.md` (native) | `.agents/AGENTS.md` |
| Claude Code | `CLAUDE.md` | `~/.claude/CLAUDE.md` | `CLAUDE.md` |
| OpenAI Codex | `instructions.md` | `~/.codex/instructions.md` | `AGENTS.md` |
| Cursor | `.cursorrules` | `~/.cursor/rules/` | `.cursorrules` |
| GitHub Copilot | `copilot-instructions.md` | Settings UI | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` | `~/.codeium/windsurf/` | `.windsurfrules` |
| Cline | `.clinerules` | `~/.cline/cline_rules` | `.clinerules` |
| Roo Code | `.roorules` | `~/.roo/rules/` | `.roorules` |
| Gemini CLI | `GEMINI.md` | `~/.gemini/GEMINI.md` | `GEMINI.md` |
| Kiro | `kiro.md` | `~/.kiro/kiro.md` | `.kiro/kiro.md` |
| Augment | `.augment-guidelines` | `~/.augment/guidelines` | `.augment-guidelines` |
| Goose | `goosehints` | `~/.config/goose/goosehints` | `.goosehints` |
| Junie | `guidelines.md` | `~/.junie/guidelines.md` | `.junie/guidelines.md` |
| Trae | `.trae/rules/` | `~/.trae/rules/` | `.trae/rules/` |
| Aider | `.aider.conf.yml` | `~/.aider.conf.yml` | `.aider.conf.yml` |
| Continue | `config.json` | `~/.continue/config.json` | `.continue/config.json` |
| Mistral Codestral | `CODESTRAL.md` | — | `CODESTRAL.md` |
| Qwen Code | `QWEN.md` | — | `QWEN.md` |

Full structured data in [`agents.json`](agents.json).

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

Both use the `.agents/` directory. They complement each other.

## Repos

| Repo | What it is |
|------|-----------|
| [nbiish/agents-standard](https://github.com/nbiish/agents-standard) | The specification (README, setup.sh, agents.json) |
| [nbiish/agentsstandard-dot-com](https://github.com/nbiish/agentsstandard-dot-com) | This repo — website + machine-readable files + issue tracker |
| [nbiish/doU](https://github.com/nbiish/doU) | Agent skill: date-stamped iterative goal execution |

## License

MIT — see [LICENSE](LICENSE).
