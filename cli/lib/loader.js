// loader.js — Unified loading algorithm for .agents/** standard
// Loads all 4 resource types: rules, skills, MCP, providers.
// Zero dependencies. Node.js >=16 built-ins only.

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
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
} = require('./constants');
const { exists, readFile, findSkills, expandTilde, collapseTilde, isSymlink, resolveTarget } = require('./fs-helpers');

// ── Project Root Detection ─────────────────────────────────────────────────

const PROJECT_MARKERS = ['.git', '.agents', 'llms.txt'];

/**
 * Detect the project root by walking up from the shell's initial cwd.
 * Priority: AGENTS_ROOT env (explicit) → walk-up from overrideRoot or cwd.
 * @param {string} [overrideRoot] — starting path for walk-up (e.g. from --project flag)
 * @returns {string|null}
 */
function detectProjectRoot(overrideRoot) {
  // AGENTS_ROOT env — explicit project root, no walk-up
  const envRoot = process.env[ROOT_ENV];
  if (envRoot) {
    const resolved = path.resolve(expandTilde(envRoot));
    return exists(resolved) ? resolved : null;
  }

  // Walk up from overrideRoot or cwd looking for project markers
  const startPath = overrideRoot ? path.resolve(overrideRoot) : process.cwd();
  let current = startPath;
  const home = HOME;

  while (current !== path.dirname(current) && current !== home) {
    for (const marker of PROJECT_MARKERS) {
      if (exists(path.join(current, marker))) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  return null;
}

// ── Environment Resolution ─────────────────────────────────────────────────

/**
 * Resolve all environment variables into a config object.
 * @param {string} [overrideRoot] — explicit project root
 * @returns {{ agentsPath: string, agentsDepth: number, projectRoot: string|null, cwd: string, home: string }}
 */
function resolveEnv(overrideRoot) {
  const envPath = process.env[PATH_ENV];
  const agentsPath = envPath ? expandTilde(envPath) : GLOBAL_AGENTS;

  const depthRaw = parseInt(process.env[DEPTH_ENV], 10);
  const agentsDepth = isNaN(depthRaw) ? DEFAULT_DEPTH : Math.max(1, Math.min(10, depthRaw));

  const projectRoot = detectProjectRoot(overrideRoot);
  const cwd = process.cwd();

  return { agentsPath, agentsDepth, projectRoot, cwd, home: HOME };
}

// ── Phase 1: Global Scope ──────────────────────────────────────────────────

/**
 * Load global scope resources: rules, skills, providers, MCP catalog metadata.
 * @param {object} state — accumulator state
 * @param {string} agentsPath — resolved global AGENTS.md path
 */
function loadGlobalScope(state, agentsPath) {
  // Rules
  const rulesContent = readFile(agentsPath);
  if (rulesContent !== null) {
    state.rules.push({ scope: 'global', source: collapseTilde(agentsPath), content: rulesContent });
    state.metadata.loaded_files.push(collapseTilde(agentsPath));
  }

  // Skills
  const globalSkills = findSkills(GLOBAL_SKILLS_DIR);
  for (const skill of globalSkills) {
    const content = readFile(path.join(skill.path, 'SKILL.md'));
    if (content !== null) {
      state.skills[skill.name] = { path: collapseTilde(skill.path), content, scope: 'global' };
    }
  }

  // Providers
  const providersPath = path.join(HOME, '.agents', 'providers.txt');
  const providersContent = readFile(providersPath);
  if (providersContent !== null) {
    state.providers = { content: providersContent, scope: 'global', source: collapseTilde(providersPath) };
    state.metadata.loaded_files.push(collapseTilde(providersPath));
  }

  // MCP Catalog (metadata only — NOT runtime)
  if (exists(GLOBAL_MCP_CATALOG)) {
    state.metadata.mcp_catalog_path = collapseTilde(GLOBAL_MCP_CATALOG);
  }
}

// ── Phase 2: Project Scope ─────────────────────────────────────────────────

/**
 * Load project scope resources: llms.txt, .agents/AGENTS.md, AGENTS.md, skills, .mcp.json.
 * @param {object} state — accumulator state
 * @param {string} projectRoot — detected project root
 */
function loadProjectScope(state, projectRoot) {
  // Rules: llms.txt (PRD)
  const llmsPath = path.join(projectRoot, 'llms.txt');
  const llmsContent = readFile(llmsPath);
  if (llmsContent !== null) {
    state.rules.push({ scope: 'project_prd', source: 'llms.txt', content: llmsContent });
    state.metadata.loaded_files.push('llms.txt');
  }

  // Rules: .agents/AGENTS.md (project base)
  const projectBase = path.join(projectRoot, PROJECT_AGENTS_DIR, 'AGENTS.md');
  const projectBaseContent = readFile(projectBase);
  if (projectBaseContent !== null) {
    state.rules.push({ scope: 'project_base', source: '.agents/AGENTS.md', content: projectBaseContent });
    state.metadata.loaded_files.push('.agents/AGENTS.md');
  }

  // Rules: AGENTS.md (project active) — skip if it's a symlink to project base
  const projectActive = path.join(projectRoot, 'AGENTS.md');
  if (exists(projectActive)) {
    let isSymlinkToBase = false;
    try {
      if (isSymlink(projectActive)) {
        const target = fs.readlinkSync(projectActive);
        const resolvedTarget = path.resolve(projectRoot, target);
        isSymlinkToBase = resolvedTarget === projectBase;
      }
    } catch { /* not a symlink or unreadable */ }

    if (!isSymlinkToBase) {
      const content = readFile(projectActive);
      if (content !== null) {
        state.rules.push({ scope: 'project_active', source: 'AGENTS.md', content });
        state.metadata.loaded_files.push('AGENTS.md');
      }
    }
  }

  // Skills: project overrides global by name
  const projectSkillsDir = path.join(projectRoot, PROJECT_SKILLS_DIR);
  const projectSkills = findSkills(projectSkillsDir);
  for (const skill of projectSkills) {
    const content = readFile(path.join(skill.path, 'SKILL.md'));
    if (content !== null) {
      const wasGlobal = state.skills[skill.name] !== undefined;
      state.skills[skill.name] = { path: `.agents/skills/${skill.name}`, content, scope: 'project' };
      if (wasGlobal) {
        state.metadata.warnings.push(`Skill "${skill.name}" overridden by project version`);
      }
    }
  }

  // MCP: .mcp.json → runtime servers
  const mcpPath = path.join(projectRoot, PROJECT_MCP_CONFIG);
  const mcpContent = readFile(mcpPath);
  if (mcpContent !== null) {
    try {
      const parsed = JSON.parse(mcpContent);
      const servers = parsed.mcpServers || {};
      for (const [name, config] of Object.entries(servers)) {
        if (config && config.disabled === true) continue;
        state.mcp[name] = { config, scope: 'project', source: PROJECT_MCP_CONFIG };
      }
      state.metadata.loaded_files.push(PROJECT_MCP_CONFIG);
    } catch (err) {
      state.metadata.errors.push(`Failed to parse ${PROJECT_MCP_CONFIG}: ${err.message}`);
    }
  }
}

// ── Phase 3: Folder Scope ──────────────────────────────────────────────────

/**
 * Load folder scope: AGENTS.md files between project root and cwd.
 * Only loads rules — skills and MCP do NOT cascade to folder scope.
 * @param {object} state — accumulator state
 * @param {string} projectRoot — detected project root
 * @param {string} cwd — current working directory
 * @param {number} depth — AGENTS_DEPTH value
 */
function loadFolderScope(state, projectRoot, cwd, depth) {
  // Get relative path from project root to cwd
  const rel = path.relative(projectRoot, cwd);
  if (rel.startsWith('..') || rel === '') return; // cwd is outside or at project root

  const parts = rel.split(path.sep);

  // Walk from project root down to cwd, loading AGENTS.md at each level
  let current = projectRoot;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);

    // Skip if this would exceed depth limit
    // depth=3 means: global(1) + project_base(2) + project_active(3) — no folders
    // depth=4 means: all above + cwd-level folder
    // depth=5 means: all above + one intermediate level
    const layerIndex = 4 + i; // first folder is layer 4
    if (layerIndex > depth) break;

    const folderAgents = path.join(current, 'AGENTS.md');
    const content = readFile(folderAgents);
    if (content !== null) {
      const relPath = path.relative(projectRoot, folderAgents);
      state.rules.push({ scope: 'folder', source: relPath, content });
      state.metadata.loaded_files.push(relPath);
    }
  }
}

// ── Phase 4: Agent-Specific Bridge ─────────────────────────────────────────

/**
 * Record agent-specific files for diagnostic purposes.
 * The actual bridge is the symlink model — no additional loading happens here.
 * @param {object} state — accumulator state
 * @param {string} cwd — current working directory
 */
function loadAgentSpecificBridge(state, cwd) {
  const agentFiles = [
    'CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules',
    '.clinerules', '.roorules', 'kiro.md', '.augment-guidelines',
    '.goosehints', 'guidelines.md', 'CRUSH.md', 'SOUL.md',
    'WARP.md', 'QWEN.md', 'CODESTRAL.md',
  ];

  for (const file of agentFiles) {
    const fullPath = path.join(cwd, file);
    if (exists(fullPath)) {
      let symlinkTarget = null;
      let isBridge = false;
      try {
        if (isSymlink(fullPath)) {
          symlinkTarget = fs.readlinkSync(fullPath);
          isBridge = symlinkTarget.includes('AGENTS.md');
        }
      } catch { /* not a symlink */ }

      state.metadata.agent_specific_files.push({
        file,
        path: fullPath,
        symlink_target: symlinkTarget,
        is_bridge: isBridge,
      });
    }
  }
}

// ── Phase 5: Composition ───────────────────────────────────────────────────

/**
 * Compose the final runtime state from all loaded resources.
 * @param {object} state — accumulated state from all phases
 * @returns {{ rules: string, rulesBlocks: Array, skills: object, mcp: object, providers: object|null, metadata: object }}
 */
function composeRuntimeState(state) {
  // Rules: concatenate in load order with scope annotations
  const rulesBlocks = state.rules.map(block => ({
    scope: block.scope,
    source: block.source,
    lines: block.content.split('\n').length,
  }));

  const rulesContent = state.rules
    .map(block => `<!-- scope:${block.scope} source:${block.source} -->\n${block.content}`)
    .join('\n\n');

  // Skills: already deduplicated by name (project overwrote global in Phase 2)
  const skills = {};
  for (const [name, skill] of Object.entries(state.skills)) {
    skills[name] = { scope: skill.scope, path: skill.path };
  }

  // MCP: project .mcp.json servers (disabled already excluded in Phase 2)
  const mcp = {};
  for (const [name, entry] of Object.entries(state.mcp)) {
    mcp[name] = entry.config;
  }

  return {
    rules: {
      content: rulesContent,
      blocks: rulesBlocks,
    },
    skills,
    mcp: {
      servers: mcp,
      source: Object.keys(mcp).length > 0 ? PROJECT_MCP_CONFIG : null,
      catalog_path: state.metadata.mcp_catalog_path || null,
    },
    providers: state.providers ? {
      source: state.providers.source,
      loaded: true,
    } : { source: null, loaded: false },
    metadata: state.metadata,
  };
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Load all .agents/** configuration for the current environment.
 * Implements the unified loading protocol: environment → global → project → folder → bridge → compose.
 *
 * @param {object} [opts] — options
 * @param {string} [opts.project] — explicit project root path
 * @param {string} [opts.cwd] — explicit current working directory (for testing)
 * @param {number} [opts.depth] — override AGENTS_DEPTH
 * @returns {{ rules: object, skills: object, mcp: object, providers: object, metadata: object, env: object }}
 */
function load(opts = {}) {
  const env = resolveEnv(opts.project);
  if (opts.cwd) env.cwd = path.resolve(opts.cwd);
  if (opts.depth) env.agentsDepth = Math.max(1, Math.min(10, opts.depth));

  // Initialize state
  const state = {
    rules: [],
    skills: {},
    mcp: {},
    providers: null,
    metadata: {
      loaded_files: [],
      errors: [],
      warnings: [],
      agent_specific_files: [],
      mcp_catalog_path: null,
    },
  };

  // Phase 1: Global Scope
  loadGlobalScope(state, env.agentsPath);

  // Phase 2: Project Scope
  if (env.projectRoot) {
    loadProjectScope(state, env.projectRoot);
  }

  // Phase 3: Folder Scope
  if (env.projectRoot && env.agentsDepth >= 4) {
    loadFolderScope(state, env.projectRoot, env.cwd, env.agentsDepth);
  }

  // Phase 4: Agent-Specific Bridge
  loadAgentSpecificBridge(state, env.cwd);

  // Phase 5: Composition
  const runtime = composeRuntimeState(state);

  return {
    ...runtime,
    env: {
      agents_path: collapseTilde(env.agentsPath),
      agents_depth: env.agentsDepth,
      project_root: env.projectRoot,
      cwd: env.cwd,
    },
  };
}

/**
 * Load only rules (for backward compatibility with rules-only commands).
 * @param {object} [opts]
 * @returns {{ content: string, blocks: Array }}
 */
function loadRules(opts = {}) {
  const result = load(opts);
  return result.rules;
}

/**
 * Load only skills.
 * @param {object} [opts]
 * @returns {{ global: Array, project: Array, merged: object }}
 */
function loadSkills(opts = {}) {
  const result = load(opts);
  const global = [];
  const project = [];

  for (const [name, skill] of Object.entries(result.skills)) {
    const entry = { name, ...skill };
    if (skill.scope === 'global') global.push(entry);
    else project.push(entry);
  }

  return { global, project, merged: result.skills };
}

/**
 * Load only MCP config.
 * @param {object} [opts]
 * @returns {{ servers: object, source: string|null, catalog_path: string|null }}
 */
function loadMcp(opts = {}) {
  const result = load(opts);
  return result.mcp;
}

module.exports = {
  load,
  loadRules,
  loadSkills,
  loadMcp,
  detectProjectRoot,
  resolveEnv,
};
