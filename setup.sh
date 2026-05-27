#!/usr/bin/env bash
# agents-standard-setup.sh
# Symlinks ~/.agents/AGENTS.md to all agent global config locations
# Safe to re-run. Uses ln -sf (force overwrite symlinks only).
set -euo pipefail

GLOBAL="${HOME}/.agents/AGENTS.md"

# Create global if it doesn't exist
mkdir -p "${HOME}/.agents"
if [[ ! -f "${GLOBAL}" ]]; then
  cat > "${GLOBAL}" <<'DEFAULTS'
# Global Agent Rules
# Edit this file to configure behavior for ALL agents on this machine.
# See https://agentsstandard.com for the full specification.

## Identity
You are a senior engineer who writes production-grade code.

## Rules
- Never hardcode secrets
- Validate all inputs
- Use parameterized queries
- Follow conventional commits

## Preferences
- Python: PEP 8, type hints, uv
- TypeScript: strict mode, ESLint
- Bash: set -euo pipefail
DEFAULTS
  echo "Created ${GLOBAL} with defaults"
else
  echo "Using existing ${GLOBAL}"
fi

symlink() {
  local target="$1"
  local name="$2"
  mkdir -p "$(dirname "${target}")"
  if ln -sf "${GLOBAL}" "${target}" 2>/dev/null; then
    echo "  ✓ ${name} → ${target}"
  else
    echo "  ✗ ${name} → ${target} (failed — may need sudo or file exists as non-symlink)"
  fi
}

echo ""
echo "Symlinking ${GLOBAL} to agent configs..."
echo ""

# Pi — native, already reads ~/.agents/AGENTS.md
echo "  ✓ Pi (native — no symlink needed)"

# Claude Code
symlink "${HOME}/.claude/CLAUDE.md" "Claude Code"

# Agy / Gemini CLI
symlink "${HOME}/.gemini/GEMINI.md" "Agy / Gemini CLI"

# OpenAI Codex
symlink "${HOME}/.codex/instructions.md" "Codex"

# Cursor
symlink "${HOME}/.cursor/rules/agents-standard" "Cursor"

# GitHub Copilot (no global file, project only)
echo "  · GitHub Copilot (project-only — use .agents/AGENTS.md → .github/copilot-instructions.md)"

# Windsurf
symlink "${HOME}/.codeium/windsurf/rules" "Windsurf"

# Cline
symlink "${HOME}/.cline/cline_rules" "Cline"

# Roo Code
symlink "${HOME}/.roo/rules/agents-standard" "Roo Code"

# Kiro
symlink "${HOME}/.kiro/kiro.md" "Kiro"

# Augment
symlink "${HOME}/.augment/guidelines" "Augment"

# Goose
symlink "${HOME}/.config/goose/goosehints" "Goose"

# Junie
symlink "${HOME}/.junie/guidelines.md" "Junie"

# Trae
symlink "${HOME}/.trae/rules/agents-standard" "Trae"

# Crush
symlink "${HOME}/.config/crush/crush.md" "Crush"

# Hermes Agent
symlink "${HOME}/.hermes/SOUL.md" "Hermes Agent"

# MiniCC
symlink "${HOME}/.minicc/AGENTS.md" "MiniCC"

# Deep Agents (dcode)
symlink "${HOME}/.deepagents/AGENTS.md" "Deep Agents (dcode)"

# Continue (JSON format — can't symlink markdown into JSON)
echo "  · Continue (JSON config — manual setup required)"

# Devin (settings UI — no file to symlink)
echo "  · Devin (settings UI — no global file to symlink)"

# Aider (YAML format — can't symlink markdown into YAML)
echo "  · Aider (YAML config — manual setup required)"

# Warp (settings UI — no global file to symlink)
echo "  · Warp (settings UI — no global file to symlink)"

# Agent Zero (Docker/Web UI — no global file to symlink)
echo "  · Agent Zero (Docker UI — no global file to symlink)"

# Qwen Code (no global file)
echo "  · Qwen Code (project-only — use QWEN.md symlink)"

# Codestral (no global file)
echo "  · Mistral Codestral (project-only — use CODESTRAL.md symlink)"

# fcc-claude (custom env config)
echo "  · fcc-claude (config via ~/.fcc/.env — no markdown file to symlink)"

echo ""
echo "Done. Edit ~/.agents/AGENTS.md — all symlinked agents follow your rules."
echo "See https://agentsstandard.com for project-level setup."

echo ""
echo "Project setup:"
echo "  1. Create .agents/AGENTS.md for project base rules (tech stack, deployment)"
echo "  2. Create AGENTS.md at your repo root for active task / PRD rules"
echo "  3. Symlink agent-specific files to the root AGENTS.md:"
echo "     ln -sf AGENTS.md CLAUDE.md"
echo "     ln -sf AGENTS.md GEMINI.md"
echo "     ln -sf AGENTS.md .cursorrules"
echo "  4. Use .agents/ for tooling and project base rules:"
echo "     .agents/AGENTS.md          (project base rules)"
echo "     .agents/mcp-settings.json  (project MCP servers)"
echo "     .agents/skills/**/SKILL.md (project skills)"
