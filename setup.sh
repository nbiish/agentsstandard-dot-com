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

# Gemini CLI
symlink "${HOME}/.gemini/GEMINI.md" "Gemini CLI"

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

# Continue (JSON format — can't symlink markdown into JSON)
echo "  · Continue (JSON config — manual setup required)"

# Devin (settings UI — no file to symlink)
echo "  · Devin (settings UI — no global file to symlink)"

# Aider (YAML format — can't symlink markdown into YAML)
echo "  · Aider (YAML config — manual setup required)"

echo ""
echo "Done. Edit ~/.agents/AGENTS.md — all symlinked agents follow your rules."
echo "See https://agentsstandard.com for project-level setup."
