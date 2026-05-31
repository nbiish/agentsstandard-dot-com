#!/usr/bin/env node
// .agents — Manage AGENTS.md rules, MCP servers, skills, and agent configuration
// Primary bin: .agents   Legacy aliases: agents-standard, agents
// Zero dependencies. Node.js >=16 built-ins only.

const path = require('path');

// ── Version ──────────────────────────────────────────────────────────────────

const VERSION = '2.0.0-alpha';

// ── Help Text ────────────────────────────────────────────────────────────────

const HELP = `
  .agents v${VERSION} — Manage your multi-agent configuration

  Usage:
    .agents {command} [flags]

  Commands:
    rules                    Manage AGENTS.md rules & symlinks
    mcp                      Manage MCP server catalogs and project configs
    skills                   Manage agent skills
    setup                    Bootstrap .agents/ in current project
    status                   System-wide health check
    tui                      Interactive terminal dashboard (default)
    version                  Print version
    help                     Show this help

  Rules subcommands:
    .agents rules list       List all agents & link status
    .agents rules link       Open TUI to toggle symlinks
    .agents rules link --all Link all agents (headless)
    .agents rules unlink     Unlink all agents
    .agents rules depth [N]  Get/set AGENTS_DEPTH (1-10)
    .agents rules path [p]   Get/set AGENTS_PATH

  MCP subcommands:
    .agents mcp catalog      List servers in global catalog
    .agents mcp catalog toggle <name>  Enable/disable a server
    .agents mcp catalog remove <name>  Remove from catalog
    .agents mcp project      List servers in project .mcp.json
    .agents mcp pull <name>  Pull server from catalog into project
    .agents mcp pull --all   Pull all enabled servers
    .agents mcp push <name>  Remove from project config
    .agents mcp health       Check server environment variables
    .agents mcp find <q>     Search for MCP servers

  Skills subcommands:
    .agents skills list      List available skills
    .agents skills info <n>  Show SKILL.md content

  Setup:
    .agents setup            Bootstrap project interactively
    .agents setup --quick    Non-interactive (use defaults)
    .agents setup --mcp      Only set up .mcp.json
    .agents setup --rules    Only set up AGENTS.md

  Status:
    .agents status           Print health report
    .agents doctor           Check and fix issues
    .agents doctor --fix     Auto-fix common issues

  Flags (all commands):
    --json                   Output as JSON (headless/API mode)
    --project <path>         Target a specific project directory
    --global                 Operate on ~/.agents/

  Legacy flags (mapped to new subcommands):
    --list                   → .agents rules list
    --link-all, -a           → .agents rules link
    --depth N                → .agents rules depth N
    --version, -v            → .agents version
    --help, -h               → .agents help
`;

// ── Command Router ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: null,
    subcommand: null,
    sargs: [],       // subcommand args
    flags: {
      json: false,
      project: null,
      global: false,
      quick: false,
      mcp: false,
      rules: false,
      skills: false,
      fix: false,
      all: false,
      depth: null,
      newPath: null,
      doctor: false,
    },
  };

  let i = 0;

  // Parse command
  if (i < args.length && !args[i].startsWith('-')) {
    result.command = args[i];
    i++;
  }

  // Parse subcommand (only for commands that have subcommands)
  const hasSubcommands = ['rules', 'mcp', 'skills', 'setup', 'status'];
  if (result.command && hasSubcommands.includes(result.command)) {
    if (i < args.length && !args[i].startsWith('-')) {
      result.subcommand = args[i];
      i++;
    }
  }

  // For 'setup' and 'status', remap certain subcommands
  if (result.command === 'status' && result.subcommand === 'doctor') {
    result.flags.doctor = true;
    // consume remaining args for doctor
    while (i < args.length) {
      const arg = args[i];
      if (arg === '--fix') result.flags.fix = true;
      else if (arg === '--json') result.flags.json = true;
      i++;
    }
    return result;
  }

  // Parse remaining args (positional and flags)
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '--json':
        result.flags.json = true;
        i++;
        break;
      case '--global':
        result.flags.global = true;
        i++;
        break;
      case '--all':
      case '-a':
        result.flags.all = true;
        i++;
        break;
      case '--quick':
        result.flags.quick = true;
        i++;
        break;
      case '--mcp':
        result.flags.mcp = true;
        i++;
        break;
      case '--rules':
        result.flags.rules = true;
        i++;
        break;
      case '--skills':
        result.flags.skills = true;
        i++;
        break;
      case '--fix':
        result.flags.fix = true;
        i++;
        break;
      case '--project':
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result.flags.project = args[i + 1];
          i += 2;
        } else {
          console.error('--project requires a path argument');
          process.exit(1);
        }
        break;
      case '--depth':
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result.flags.depth = parseInt(args[i + 1], 10);
          i += 2;
        } else {
          i++;
        }
        break;
      case '--path':
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result.flags.newPath = args[i + 1];
          i += 2;
        } else {
          i++;
        }
        break;
      case '--version':
      case '-v':
        result.command = 'version';
        i++;
        break;
      case '--help':
      case '-h':
        result.command = 'help';
        i++;
        break;
      case '--list':
      case '-l':
        result.command = 'rules';
        result.subcommand = 'list';
        i++;
        break;
      case '--link-all':
        result.command = 'rules';
        result.subcommand = 'link';
        result.flags.all = true;
        i++;
        break;
      default:
        // Positional args go to sargs
        if (arg.startsWith('-')) {
          console.error(`Unknown flag: ${arg}`);
          process.exit(1);
        }
        result.sargs.push(arg);
        i++;
    }
  }

  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const parsed = parseArgs(process.argv);
  const { command, subcommand, sargs, flags } = parsed;

  // Route
  switch (command) {
    case 'version':
      console.log(VERSION);
      break;

    case 'help':
    case null:
      console.log(HELP);
      break;

    case 'rules': {
      const rules = require('./commands/rules');
      // Map legacy --all flag to link --all
      if (subcommand === 'link' && flags.all) {
        rules.run({ subcommand: 'link', json: flags.json, depth: flags.depth });
      } else if (subcommand === 'unlink') {
        rules.run({ subcommand: 'unlink', json: flags.json });
      } else if (subcommand === 'depth') {
        rules.run({ subcommand: 'depth', json: flags.json, depth: sargs[0] || flags.depth });
      } else if (subcommand === 'path') {
        rules.run({ subcommand: 'path', json: flags.json, path: sargs[0] || flags.newPath });
      } else {
        rules.run({ subcommand: subcommand || 'list', json: flags.json, depth: flags.depth });
      }
      break;
    }

    case 'mcp': {
      const mcp = require('./commands/mcp');
      // Pass --all flag through for pull command
      const mcpArgs = flags.all ? ['--all', ...sargs] : sargs;
      mcp.run({ subcommand, args: mcpArgs, json: flags.json });
      break;
    }

    case 'skills': {
      const skills = require('./commands/skills');
      skills.run({ subcommand: sargs[0] || subcommand, args: sargs, json: flags.json, project: flags.project });
      break;
    }

    case 'setup': {
      const setup = require('./commands/setup');
      setup.run({
        quick: flags.quick || subcommand === 'quick',
        mcp: flags.mcp || subcommand === 'mcp',
        rules: flags.rules || subcommand === 'rules',
        skills: flags.skills || subcommand === 'skills',
        json: flags.json,
        project: flags.project,
      });
      break;
    }

    case 'status':
    case 'doctor': {
      const status = require('./commands/status');
      status.run({
        doctor: flags.doctor || command === 'doctor' || subcommand === 'doctor',
        fix: flags.fix,
        json: flags.json,
      });
      break;
    }

    case 'tui':
    default: {
      // If no command specified and stdin is a TTY, open the TUI
      if (!command && process.stdin.isTTY) {
        const tui = require('./commands/tui');
        tui.run();
      } else if (!command) {
        // Headless with no command: show help
        console.log(HELP);
      } else {
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
      }
    }
  }
}

main();
