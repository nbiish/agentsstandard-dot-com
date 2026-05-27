#!/usr/bin/env node
// agents-standard — Manage AGENTS.md symlinks and configuration
// Zero dependencies. Node.js >=16 built-ins only.

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ── Configuration ──────────────────────────────────────────────────────────

const HOME = os.homedir();
const GLOBAL_AGENTS = path.join(HOME, '.agents', 'AGENTS.md');
const DEPTH_ENV = 'AGENTS_DEPTH';
const DEFAULT_DEPTH = 3;

const AGENTS = [
  { key: 'pi',             name: 'Pi',               global: null,                                                      note: 'native — already reads ~/.agents/AGENTS.md' },
  { key: 'claude-code',    name: 'Claude Code',        global: path.join(HOME, '.claude', 'CLAUDE.md') },
  { key: 'agy',            name: 'Agy / Gemini CLI',   global: path.join(HOME, '.gemini', 'GEMINI.md') },
  { key: 'codex',          name: 'OpenAI Codex',       global: path.join(HOME, '.codex', 'instructions.md') },
  { key: 'cursor',         name: 'Cursor',             global: path.join(HOME, '.cursor', 'rules', 'agents-standard') },
  { key: 'github-copilot', name: 'GitHub Copilot',     global: null,                                                      note: 'project-only — no global file' },
  { key: 'windsurf',       name: 'Windsurf',           global: path.join(HOME, '.codeium', 'windsurf', 'rules') },
  { key: 'cline',          name: 'Cline',              global: path.join(HOME, '.cline', 'cline_rules') },
  { key: 'roo',            name: 'Roo Code',           global: path.join(HOME, '.roo', 'rules', 'agents-standard') },
  { key: 'kiro',           name: 'Kiro',               global: path.join(HOME, '.kiro', 'kiro.md') },
  { key: 'augment',        name: 'Augment',            global: path.join(HOME, '.augment', 'guidelines') },
  { key: 'goose',          name: 'Goose',              global: path.join(HOME, '.config', 'goose', 'goosehints') },
  { key: 'junie',          name: 'Junie',              global: path.join(HOME, '.junie', 'guidelines.md') },
  { key: 'trae',           name: 'Trae',               global: path.join(HOME, '.trae', 'rules', 'agents-standard') },
  { key: 'crush',          name: 'Crush',              global: path.join(HOME, '.config', 'crush', 'crush.md') },
  { key: 'hermes-agent',   name: 'Hermes Agent',       global: path.join(HOME, '.hermes', 'SOUL.md') },
  { key: 'mini',           name: 'MiniCC',             global: path.join(HOME, '.minicc', 'AGENTS.md') },
  { key: 'dcode',          name: 'Deep Agents (dcode)', global: path.join(HOME, '.deepagents', 'AGENTS.md') },
  { key: 'warp',           name: 'Warp',               global: null,                                                      note: 'settings UI — no global file' },
  { key: 'aider',          name: 'Aider',              global: path.join(HOME, '.aider.conf.yml'),                       note: 'YAML format — manual setup' },
  { key: 'continue',       name: 'Continue',           global: path.join(HOME, '.continue', 'config.json'),               note: 'JSON format — manual setup' },
];

// ── State ──────────────────────────────────────────────────────────────────

let cursorIdx = 0;
let agentStates = [];    // { agent, target, isLinked, shouldLink }
let depth = DEFAULT_DEPTH;
let globalPath = GLOBAL_AGENTS;
let message = '';
let running = true;

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveTarget(target) {
  if (!target) return null;
  // Expand ~ to HOME (handles paths that might be read from config)
  return target.replace(/^~/, HOME);
}

function isSymlinkedTo(target, source) {
  if (!target || !source) return false;
  try {
    const link = fs.readlinkSync(target);
    return link === source;
  } catch {
    return false;
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hasNative(agent) {
  return agent.key === 'pi';
}

function agentLabel(agent) {
  if (hasNative(agent)) return 'native (no symlink needed)';
  if (!agent.global) return agent.note || 'project-only or UI-based';
  return agent.global.replace(HOME, '~');
}

// ── TUI Rendering ──────────────────────────────────────────────────────────

function hideCursor() { process.stdout.write('\x1b[?25l'); }
function showCursor() { process.stdout.write('\x1b[?25h'); }
function clearScreen() { process.stdout.write('\x1b[2J\x1b[H'); }
function moveTo(row, col) { process.stdout.write(`\x1b[${row};${col}H`); }

const C = {
  reset:   '\x1b[0m',
  dim:     '\x1b[2m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  invert:  '\x1b[7m',
  hide:    '\x1b[8m',
};

function render() {
  clearScreen();

  // Header
  process.stdout.write(`${C.bold}${C.cyan}  agents-standard${C.reset}  ${C.dim}v1.1.0${C.reset}\n`);
  process.stdout.write(`  ${C.dim}Global:${C.reset} ${globalPath.replace(HOME, '~')}\n`);
  process.stdout.write(`  ${C.dim}Depth:${C.reset}  ${C.yellow}${depth}${C.reset} (${depthDesc(depth)})\n`);
  process.stdout.write(`  ${C.dim}────────────────────────────────────────────────────${C.reset}\n\n`);

  // Column headers
  process.stdout.write(`  ${C.dim}${'Status'.padEnd(8)} ${'Agent'.padEnd(22)} Target${C.reset}\n`);
  process.stdout.write(`  ${C.dim}──────  ─────────────────────  ──────────────────────────────────────────${C.reset}\n`);

  // Agent list
  const pageSize = process.stdout.rows - 10;
  const startIdx = Math.max(0, cursorIdx - Math.floor(pageSize / 2));
  const endIdx = Math.min(agentStates.length, startIdx + pageSize);

  for (let i = startIdx; i < endIdx; i++) {
    const s = agentStates[i];
    const isCursor = i === cursorIdx;
    const prefix = isCursor ? ` ${C.invert}` : '  ';
    const suffix = isCursor ? C.reset : '';

    let status;
    if (hasNative(s.agent)) {
      status = `${C.green}● native${C.reset}`;
    } else if (!s.agent.global) {
      status = `${C.dim}· n/a${C.reset}`;
    } else if (s.isLinked) {
      status = `${C.green}● linked${C.reset}`;
    } else {
      status = `${C.dim}○ unlinked${C.reset}`;
    }

    const name = s.agent.name.padEnd(22);
    const target = agentLabel(s.agent);

    process.stdout.write(`${prefix}${status}  ${name}${target}${suffix}\n`);
  }

  // Spacer
  process.stdout.write('\n');

  // Bottom bar — Apply
  const barY = process.stdout.rows - 2;
  moveTo(barY, 1);
  const isApply = cursorIdx === agentStates.length;
  if (isApply) {
    process.stdout.write(`${C.invert}  Apply changes  ${C.reset} ${C.green}← press Enter${C.reset}`);
  } else {
    process.stdout.write(`${C.dim}  Apply changes  ← navigate here and press Enter${C.reset}`);
  }

  // Message line
  moveTo(barY + 1, 1);
  if (message) {
    process.stdout.write(`${C.yellow}  ${message}${C.reset}`);
  } else {
    process.stdout.write(`  ${C.dim}↑↓ navigate  space toggle  enter apply  q quit  d depth  g global path${C.reset}`);
  }

  moveTo(barY + 2, 1);
}

function depthDesc(d) {
  if (d <= 1) return 'global only';
  if (d === 2) return 'global + project';
  if (d === 3) return 'global + project + folder (default)';
  return `global + project + ${d - 2} intermediate dirs`;
}

// ── Actions ────────────────────────────────────────────────────────────────

function toggleAgent() {
  const s = agentStates[cursorIdx];
  if (!s.agent.global || hasNative(s.agent)) return;
  s.isLinked = !s.isLinked;
}

function applyChanges() {
  let linked = 0;
  let unlinked = 0;
  let skipped = 0;

  for (const s of agentStates) {
    if (!s.agent.global || hasNative(s.agent)) {
      skipped++;
      continue;
    }

    const target = resolveTarget(s.agent.global);

    if (s.isLinked) {
      // Create global AGENTS.md if it doesn't exist
      if (!fs.existsSync(globalPath)) {
        ensureDir(globalPath);
        fs.writeFileSync(globalPath, `# Global Agent Rules\n# Edit this file to configure behavior for ALL agents.\n# See https://agentsstandard.com\n\n## Identity\nYou are a senior engineer.\n\n## Safety\n- Never hardcode secrets\n- Validate all inputs\n- Use parameterized queries\n`, 'utf-8');
      }

      ensureDir(target);
      try {
        // Remove existing file/symlink if present
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }
        fs.symlinkSync(globalPath, target);
        linked++;
      } catch (err) {
        message = `Failed to link ${s.agent.name}: ${err.message}`;
        return;
      }
    } else {
      // Remove symlink if it points to our global AGENTS.md
      try {
        if (isSymlinkedTo(target, globalPath)) {
          fs.unlinkSync(target);
          unlinked++;
        }
      } catch {
        // File doesn't exist or isn't our symlink — skip
      }
    }
  }

  // Set AGENTS_DEPTH in shell profile
  const profileFiles = [
    path.join(HOME, '.zshenv'),
    path.join(HOME, '.bashrc'),
    path.join(HOME, '.profile'),
  ];

  const depthLine = `export AGENTS_DEPTH=${depth}   # agents-standard`;
  for (const pf of profileFiles) {
    try {
      if (fs.existsSync(pf)) {
        let content = fs.readFileSync(pf, 'utf-8');
        if (content.includes('AGENTS_DEPTH')) {
          content = content.replace(/export AGENTS_DEPTH=.*/, depthLine);
        } else {
          content += `\n${depthLine}\n`;
        }
        fs.writeFileSync(pf, content, 'utf-8');
      }
    } catch { /* skip unwritable profiles */ }
  }

  message = `Applied: ${linked} linked, ${unlinked} unlinked, ${skipped} skipped. AGENTS_DEPTH=${depth}. Restart your shell.`;
}

function cycleDepth() {
  depth = depth >= 5 ? 1 : depth + 1;
}

function promptGlobalPath() {
  message = 'Enter global AGENTS.md path (esc to cancel): ';
  render();

  // Simple input mode
  process.stdin.setRawMode(false);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('', (answer) => {
    rl.close();
    const trimmed = answer.trim();
    if (trimmed && trimmed !== '\x1b') {
      if (trimmed.startsWith('~/') || trimmed.startsWith('~')) {
        globalPath = trimmed.replace(/^~/, HOME);
      } else if (trimmed.startsWith('/')) {
        globalPath = trimmed;
      }
      // Re-check symlink status for all agents with new global path
      for (const s of agentStates) {
        if (s.agent.global && !hasNative(s.agent)) {
          s.isLinked = isSymlinkedTo(resolveTarget(s.agent.global), globalPath);
        }
      }
    }
    message = '';
    process.stdin.setRawMode(true);
    render();
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  // Read AGENTS_DEPTH from env
  const envDepth = parseInt(process.env.AGENTS_DEPTH, 10);
  if (envDepth >= 1 && envDepth <= 10) {
    depth = envDepth;
  }

  // Read AGENTS_PATH from env
  const envPath = process.env.AGENTS_PATH;
  if (envPath) {
    globalPath = envPath.replace(/^~/, HOME);
  }

  // Build agent states
  agentStates = AGENTS.map(agent => {
    const target = agent.global ? resolveTarget(agent.global) : null;
    const isLinked = target ? isSymlinkedTo(target, globalPath) : false;
    return { agent, target, isLinked };
  });
}

// ── Input ──────────────────────────────────────────────────────────────────

function handleInput(key) {
  if (key.name === 'q') {
    running = false;
    return;
  }

  if (key.name === 'up' || key.name === 'k') {
    cursorIdx = Math.max(0, cursorIdx - 1);
    message = '';
  } else if (key.name === 'down' || key.name === 'j') {
    cursorIdx = Math.min(agentStates.length, cursorIdx + 1);
    message = '';
  } else if (key.name === 'space') {
    if (cursorIdx < agentStates.length) {
      toggleAgent();
    }
    message = '';
  } else if (key.name === 'return') {
    if (cursorIdx === agentStates.length) {
      applyChanges();
    }
  } else if (key.name === 'd') {
    cycleDepth();
    message = '';
  } else if (key.name === 'g') {
    promptGlobalPath();
    return; // promptGlobalPath handles render
  }

  render();
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  // Check for non-interactive flags
  if (process.argv.includes('--link-all') || process.argv.includes('-a')) {
    // Non-interactive: link all
    init();
    for (const s of agentStates) {
      if (s.agent.global && !hasNative(s.agent)) {
        s.isLinked = true;
      }
    }
    applyChanges();
    console.log(message);
    process.exit(0);
  }

  if (process.argv.includes('--depth')) {
    const idx = process.argv.indexOf('--depth');
    const val = parseInt(process.argv[idx + 1], 10);
    if (val >= 1 && val <= 10) {
      depth = val;
      console.log(`AGENTS_DEPTH=${depth}`);
      process.exit(0);
    }
  }

  if (process.argv.includes('--list') || process.argv.includes('-l')) {
    init();
    for (const s of agentStates) {
      const status = hasNative(s.agent) ? 'native' :
                     !s.agent.global ? 'n/a' :
                     s.isLinked ? 'linked' : 'unlinked';
      console.log(`${status.padEnd(10)} ${s.agent.name.padEnd(22)} ${agentLabel(s.agent)}`);
    }
    process.exit(0);
  }

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
  ${C.bold}agents-standard${C.reset} — Manage AGENTS.md configuration

  ${C.bold}Usage:${C.reset}
    agents-standard              Interactive TUI (default)
    agents-standard --list       List all agents and link status
    agents-standard --link-all   Symlink all agents non-interactively
    agents-standard --depth N    Set AGENTS_DEPTH (1-10)
    agents-standard --help       Show this help

  ${C.bold}Interactive keys:${C.reset}
    ↑↓ / jk    Navigate agents
    Space      Toggle symlink on/off
    d          Cycle AGENTS_DEPTH (1-5)
    g          Change global AGENTS.md path
    Enter      Apply changes (when on "Apply changes" bar)
    q          Quit
`);
    process.exit(0);
  }

  // Interactive mode
  init();
  hideCursor();
  render();

  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
      showCursor();
      process.stdout.write('\n');
      process.exit(0);
    }
    handleInput(key);
  });

  process.on('exit', () => {
    showCursor();
    process.stdout.write('\n');
  });
}

main();
