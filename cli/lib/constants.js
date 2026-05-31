// constants.js — File paths, agent registry, MCP config formats, ENV_VAR_MAP
// Zero dependencies. Node.js >=16 built-ins only.

const os = require('os');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────

const HOME = os.homedir();

const GLOBAL_AGENTS = path.join(HOME, '.agents', 'AGENTS.md');
const GLOBAL_AGENTS_DIR = path.join(HOME, '.agents');
const GLOBAL_MCP_CATALOG = path.join(HOME, '.agents', 'mcp-settings.json');
const GLOBAL_SKILLS_DIR = path.join(HOME, '.agents', 'skills');
const DEPTH_ENV = 'AGENTS_DEPTH';
const PATH_ENV = 'AGENTS_PATH';
const ROOT_ENV = 'AGENTS_ROOT';
const DEFAULT_DEPTH = 3;

const PROJECT_MCP_CONFIG = '.mcp.json';       // Claude Code convention (dominant)
const PROJECT_AGENTS_DIR = '.agents';
const PROJECT_SKILLS_DIR = path.join('.agents', 'skills');

// ── ENV_VAR_MAP — API key detection → env var name ──────────────────────────

const ENV_VAR_MAP = {
  'BRAVE_API_KEY': 'BRAVE_API_KEY',
  'TAVILY_API_KEY': 'TAVILY_API_KEY',
  'FIRECRAWL_API_KEY': 'FIRECRAWL_API_KEY',
  'CONTEXT7_API_KEY': 'CONTEXT7_API_KEY',
  'GITNEXUS_API_KEY': 'GITNEXUS_API_KEY',
  'ANTHROPIC_API_KEY': 'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY': 'OPENAI_API_KEY',
  'GOOGLE_API_KEY': 'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY': 'GOOGLE_GENERATIVE_AI_API_KEY',
  'DEEPSEEK_API_KEY': 'DEEPSEEK_API_KEY',
  'GROQ_API_KEY': 'GROQ_API_KEY',
  'MISTRAL_API_KEY': 'MISTRAL_API_KEY',
};

// Pattern-based env var detection — if an env key matches, suggest this var name
const ENV_VAR_PATTERNS = [
  { pattern: /^ctx7sk-/i, envVar: 'CONTEXT7_API_KEY' },
  { pattern: /^sk-/i, envVar: 'OPENAI_API_KEY' },           // OpenAI keys
  { pattern: /^sk-ant-/i, envVar: 'ANTHROPIC_API_KEY' },    // Anthropic keys
];

/**
 * Detect the env var name for a given env object's key-value pairs.
 * Returns {key: ENV_VAR_NAME} or null if nothing detected.
 */
function detectEnvVar(envKey, envValue) {
  // First check direct map
  if (ENV_VAR_MAP[envKey]) return ENV_VAR_MAP[envKey];
  // Then check patterns against the value
  if (envValue) {
    for (const { pattern, envVar } of ENV_VAR_PATTERNS) {
      if (pattern.test(envValue)) return envVar;
    }
  }
  // If the env key itself looks like a standard env var name, use it
  if (/^[A-Z][A-Z0-9_]+$/.test(envKey)) return envKey;
  return null;
}

// ── Agent Registry ───────────────────────────────────────────────────────────

const AGENTS = [
  { key: 'pi',             name: 'Pi',               global: null,                                                      note: 'native — already reads ~/.agents/AGENTS.md',  native: true,  mcpFormat: null },
  { key: 'claude-code',    name: 'Claude Code',        global: path.join(HOME, '.claude', 'CLAUDE.md'),                 native: false, mcpFormat: 'json', mcpProject: '.mcp.json', mcpGlobal: path.join(HOME, '.claude.json') },
  { key: 'agy',            name: 'Agy / Gemini CLI',   global: path.join(HOME, '.gemini', 'GEMINI.md'),                 native: false, mcpFormat: 'json', mcpProject: path.join('.gemini', 'settings.json'), mcpGlobal: path.join(HOME, '.gemini', 'settings.json') },
  { key: 'codex',          name: 'OpenAI Codex',       global: path.join(HOME, '.codex', 'instructions.md'),             native: false, mcpFormat: 'toml', mcpProject: null, mcpGlobal: path.join(HOME, '.codex', 'config.toml') },
  { key: 'cursor',         name: 'Cursor',             global: path.join(HOME, '.cursor', 'rules', 'agents-standard'),  native: false, mcpFormat: 'json', mcpProject: path.join('.cursor', 'mcp.json'), mcpGlobal: path.join(HOME, '.cursor', 'mcp.json') },
  { key: 'github-copilot', name: 'GitHub Copilot',     global: null,                                                      native: false, mcpFormat: 'json', mcpProject: path.join('.github', 'copilot-mcp.json'), mcpGlobal: null, note: 'project-only — no global file' },
  { key: 'windsurf',       name: 'Windsurf',           global: path.join(HOME, '.codeium', 'windsurf', 'rules'),         native: false, mcpFormat: 'json', mcpProject: null, mcpGlobal: path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json') },
  { key: 'cline',          name: 'Cline',              global: path.join(HOME, '.cline', 'cline_rules'),                native: false, mcpFormat: 'json', mcpProject: null, mcpGlobal: null, note: 'MCP in VS Code globalStorage' },
  { key: 'roo',            name: 'Roo Code',           global: path.join(HOME, '.roo', 'rules', 'agents-standard'),      native: false, mcpFormat: 'json', mcpProject: path.join('.roo', 'mcp.json'), mcpGlobal: null, note: 'MCP in Extension settings' },
  { key: 'kiro',           name: 'Kiro',               global: path.join(HOME, '.kiro', 'kiro.md'),                     native: false, mcpFormat: 'json', mcpProject: path.join('.kiro', 'settings', 'mcp.json'), mcpGlobal: path.join(HOME, '.kiro', 'settings', 'mcp.json') },
  { key: 'kilocode',       name: 'Kilo Code',          global: null,                                                      native: true,  mcpFormat: 'jsonc', mcpProject: 'kilo.jsonc', mcpGlobal: null, note: 'native AGENTS.md support' },
  { key: 'augment',        name: 'Augment',            global: path.join(HOME, '.augment', 'guidelines'),                native: false, mcpFormat: 'json', mcpProject: null, mcpGlobal: path.join(HOME, '.augment', 'settings.json') },
  { key: 'goose',          name: 'Goose',              global: path.join(HOME, '.config', 'goose', 'goosehints'),        native: false, mcpFormat: 'yaml', mcpProject: null, mcpGlobal: path.join(HOME, '.config', 'goose', 'config.yaml') },
  { key: 'junie',          name: 'Junie',              global: path.join(HOME, '.junie', 'guidelines.md'),               native: false, mcpFormat: 'json', mcpProject: path.join('.junie', 'mcp', 'mcp.json'), mcpGlobal: path.join(HOME, '.junie', 'mcp.json') },
  { key: 'trae',           name: 'Trae',               global: path.join(HOME, '.trae', 'rules', 'agents-standard'),     native: false, mcpFormat: 'json', mcpProject: null, mcpGlobal: null, note: 'MCP in Library/Application Support' },
  { key: 'crush',          name: 'Crush',              global: path.join(HOME, '.config', 'crush', 'crush.md'),          native: false, mcpFormat: 'json', mcpProject: 'crush.json', mcpGlobal: path.join(HOME, '.config', 'crush', 'crush.json') },
  { key: 'hermes-agent',   name: 'Hermes Agent',       global: path.join(HOME, '.hermes', 'SOUL.md'),                    native: false, mcpFormat: 'yaml', mcpProject: null, mcpGlobal: path.join(HOME, '.hermes', 'config.yaml') },
  { key: 'mini',           name: 'MiniCC',             global: path.join(HOME, '.minicc', 'AGENTS.md'),                  native: false, mcpFormat: 'json', mcpProject: path.join('.minicc', 'mcp.json'), mcpGlobal: path.join(HOME, '.minicc', 'mcp.json') },
  { key: 'dcode',          name: 'Deep Agents (dcode)', global: path.join(HOME, '.deepagents', 'AGENTS.md'),             native: true,  mcpFormat: 'json', mcpProject: null, mcpGlobal: path.join(HOME, '.deepagents', '.mcp.json') },
  { key: 'warp',           name: 'Warp',               global: null,                                                      native: false, mcpFormat: 'json', mcpProject: path.join('.warp', 'mcp.json'), mcpGlobal: null, note: 'settings UI — no global file' },
  { key: 'aider',          name: 'Aider',              global: path.join(HOME, '.aider.conf.yml'),                       native: false, mcpFormat: 'yaml', mcpProject: null, mcpGlobal: null, note: 'YAML format — manual setup' },
  { key: 'continue',       name: 'Continue',           global: path.join(HOME, '.continue', 'config.json'),               native: false, mcpFormat: 'yaml', mcpProject: path.join('.continue', 'mcpServers'), mcpGlobal: path.join(HOME, '.continue', 'config.yaml'), note: 'JSON format — manual setup' },
  { key: 'zed',            name: 'Zed',                global: path.join(HOME, '.config', 'zed', 'AGENTS.md'),           native: true,  mcpFormat: null, mcpProject: null, mcpGlobal: null },
  { key: 'codewhale',      name: 'CodeWhale',          global: null,                                                      native: true,  mcpFormat: null, mcpProject: null, mcpGlobal: null, note: 'native — already reads ~/.agents/AGENTS.md' },
  { key: 'opencode',       name: 'OpenCode',           global: null,                                                      native: true,  mcpFormat: 'jsonc', mcpProject: 'opencode.json', mcpGlobal: path.join(HOME, '.config', 'opencode', 'opencode.json') },
  { key: 'qwen-code',      name: 'Qwen Code',          global: null,                                                      native: false, mcpFormat: 'json', mcpProject: path.join('.qwen', 'settings.json'), mcpGlobal: path.join(HOME, '.qwen', 'settings.json') },
  { key: 'codestral',      name: 'Codestral',          global: null,                                                      native: false, mcpFormat: null, mcpProject: null, mcpGlobal: null, note: 'API key in env vars' },
  { key: 'fcc-claude',     name: 'FCC Claude',         global: path.join(HOME, '.fcc', '.env'),                           native: false, mcpFormat: null, mcpProject: null, mcpGlobal: null, note: 'ACP agent routing' },
  { key: 'devin',          name: 'Devin',              global: null,                                                      native: false, mcpFormat: null, mcpProject: null, mcpGlobal: null, note: 'Settings UI / MCP Marketplace' },
  { key: 'agent-zero',     name: 'Agent Zero',         global: null,                                                      native: false, mcpFormat: null, mcpProject: null, mcpGlobal: null, note: 'Docker/Web UI based' },
];

// Index by key for fast lookup
const AGENTS_BY_KEY = {};
for (const a of AGENTS) AGENTS_BY_KEY[a.key] = a;

// ── MCP Config Format Registry ───────────────────────────────────────────────

// Maps format to schema properties: key name for servers, wrapper structure
const MCP_FORMATS = {
  json: {
    extension: '.json',
    serversKey: 'mcpServers',
    // Standard MCP JSON schema: { mcpServers: { name: { command, args, env, ... } } }
    async stringify(servers) { return JSON.stringify({ mcpServers: servers }, null, 2) + '\n'; },
    parse(raw) { return JSON.parse(raw).mcpServers || {}; },
  },
  jsonc: {
    extension: '.jsonc',
    serversKey: 'mcpServers',
    // jsonc is JSON with comments — treated as JSON for writing
    async stringify(servers) { return JSON.stringify({ mcpServers: servers }, null, 2) + '\n'; },
    parse(raw) {
      // Strip comments (// and /* */) then parse
      const stripped = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      return JSON.parse(stripped).mcpServers || {};
    },
  },
  yaml: {
    extension: '.yaml',
    serversKey: 'mcp_servers',
    // Write YAML manually (zero deps) for simple cases
    async stringify(servers) {
      let out = '# MCP Servers — managed by .agents CLI\n';
      out += '# See https://agentsstandard.com\n\n';
      out += 'mcp_servers:\n';
      for (const [name, def] of Object.entries(servers)) {
        out += `  ${name}:\n`;
        if (def.type) out += `    type: ${def.type}\n`;
        if (def.command) out += `    command: ${def.command}\n`;
        if (def.args) {
          out += `    args:\n`;
          for (const a of def.args) out += `      - ${JSON.stringify(a)}\n`;
        }
        if (def.env) {
          out += `    env:\n`;
          for (const [k, v] of Object.entries(def.env)) out += `      ${k}: ${JSON.stringify(v)}\n`;
        }
        if (def.url) out += `    url: ${def.url}\n`;
        if (def.description) out += `    description: ${def.description}\n`;
        if (def.disabled) out += `    disabled: true\n`;
        if (def.timeout) out += `    timeout: ${def.timeout}\n`;
        if (def.headers) {
          out += `    headers:\n`;
          for (const [k, v] of Object.entries(def.headers)) out += `      ${k}: ${JSON.stringify(v)}\n`;
        }
      }
      return out;
    },
    parse(raw) { return {}; /* YAML parsing requires a library — not implemented for zero-deps */ },
  },
  toml: {
    extension: '.toml',
    serversKey: null,
    async stringify(servers) {
      // TOML is simple enough for our use case (no complex nesting needed)
      let out = '# MCP Servers — managed by .agents CLI\n';
      out += '# See https://agentsstandard.com\n\n';
      for (const [name, def] of Object.entries(servers)) {
        out += `[mcp_servers.${name}]\n`;
        if (def.type) out += `type = ${JSON.stringify(def.type)}\n`;
        if (def.command) out += `command = ${JSON.stringify(def.command)}\n`;
        if (def.args) out += `args = ${JSON.stringify(def.args)}\n`;
        if (def.env) {
          out += '\n';
          for (const [k, v] of Object.entries(def.env)) out += `[mcp_servers.${name}.env]\n${k} = ${JSON.stringify(v)}\n`;
        }
        if (def.url) out += `url = ${JSON.stringify(def.url)}\n`;
        if (def.description) out += `description = ${JSON.stringify(def.description)}\n`;
        if (def.disabled) out += `disabled = true\n`;
        if (def.timeout) out += `timeout = ${def.timeout}\n`;
        out += '\n';
      }
      return out;
    },
    parse(raw) { return {}; },
  },
};

// ── Agent MCP project config paths ───────────────────────────────────────────
// Maps agent key → relative project path where MCP config lives

function getAgentMcpProjectPath(agentKey) {
  const agent = AGENTS_BY_KEY[agentKey];
  if (!agent || !agent.mcpProject) return null;
  return agent.mcpProject;
}

function getAgentMcpFormat(agentKey) {
  const agent = AGENTS_BY_KEY[agentKey];
  if (!agent || !agent.mcpFormat) return null;
  return agent.mcpFormat;
}

// ── Shell profile files ─────────────────────────────────────────────────────

const SHELL_PROFILE_FILES = [
  path.join(HOME, '.zshenv'),
  path.join(HOME, '.bashrc'),
  path.join(HOME, '.profile'),
];

// ── Catalog schema ───────────────────────────────────────────────────────────

const CATALOG_SCHEMA_VERSION = '2.0.0';

function defaultCatalog() {
  return {
    $schema: 'https://agentsstandard.com/schemas/mcp-catalog.json',
    version: CATALOG_SCHEMA_VERSION,
    catalog: {},
  };
}

// ── Agent-specific symlink targets ───────────────────────────────────────────

function isNativeAgent(agentKey) {
  const agent = AGENTS_BY_KEY[agentKey];
  return agent && agent.native === true;
}

function hasGlobalConfig(agentKey) {
  const agent = AGENTS_BY_KEY[agentKey];
  return agent && agent.global !== null;
}

module.exports = {
  HOME,
  GLOBAL_AGENTS,
  GLOBAL_AGENTS_DIR,
  GLOBAL_MCP_CATALOG,
  GLOBAL_SKILLS_DIR,
  DEPTH_ENV,
  PATH_ENV,
  ROOT_ENV,
  DEFAULT_DEPTH,
  PROJECT_MCP_CONFIG,
  PROJECT_AGENTS_DIR,
  PROJECT_SKILLS_DIR,
  ENV_VAR_MAP,
  ENV_VAR_PATTERNS,
  detectEnvVar,
  AGENTS,
  AGENTS_BY_KEY,
  MCP_FORMATS,
  SHELL_PROFILE_FILES,
  CATALOG_SCHEMA_VERSION,
  defaultCatalog,
  getAgentMcpProjectPath,
  getAgentMcpFormat,
  isNativeAgent,
  hasGlobalConfig,
};
