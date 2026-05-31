// status.js — System-wide health check / doctor
// Zero dependencies. Node.js >=16 built-ins only.

const path = require('path');
const { GLOBAL_AGENTS, GLOBAL_MCP_CATALOG, GLOBAL_SKILLS_DIR, AGENTS } = require('../lib/constants');
const { exists, isSymlinkedTo, resolveTarget, findSkills, collapseTilde } = require('../lib/fs-helpers');
const { catalogSummary, validateCatalog } = require('../lib/catalog');
const { load } = require('../lib/loader');
const { formatJSON, formatStatus } = require('../lib/formatters');

/**
 * Run a full health check using the unified loader.
 * @param {object} [opts] — { project, depth }
 * @returns {{ healthy: boolean, checks: Array, issues: Array, runtime: object }}
 */
function runHealthCheck(opts = {}) {
  const checks = [];
  const issues = [];

  // Run the unified loader
  const runtime = load({ project: opts.project, depth: opts.depth });

  // 1. AGENTS.md exists
  const agentsMdExists = exists(GLOBAL_AGENTS);
  checks.push({
    name: 'AGENTS.md',
    status: agentsMdExists ? 'ok' : 'error',
    detail: agentsMdExists ? `at ${collapseTilde(GLOBAL_AGENTS)}` : 'missing',
  });
  if (!agentsMdExists) issues.push('Global AGENTS.md not found. Run .agents rules link --all');

  // 2. MCP catalog
  const catSummary = catalogSummary();
  const catValid = validateCatalog();
  checks.push({
    name: 'MCP catalog',
    status: catSummary.exists && catValid.valid ? 'ok' : 'error',
    detail: catSummary.exists
      ? `${catSummary.serverCount} servers, ${catSummary.enabledCount} enabled`
      : 'missing',
  });
  if (!catSummary.exists) issues.push('MCP catalog not found. Run .agents setup');
  if (!catValid.valid) issues.push(`MCP catalog has issues: ${catValid.issues.join('; ')}`);

  // 3. Skills
  const skillCount = Object.keys(runtime.skills).length;
  const globalSkills = findSkills(GLOBAL_SKILLS_DIR);
  checks.push({
    name: 'Skills',
    status: skillCount > 0 ? 'ok' : 'warn',
    detail: `${skillCount} active (${globalSkills.length} global, ${skillCount - globalSkills.length} project)`,
  });

  // 4. Providers
  checks.push({
    name: 'Providers',
    status: runtime.providers.loaded ? 'ok' : 'warn',
    detail: runtime.providers.loaded ? `loaded from ${runtime.providers.source}` : 'not configured',
  });

  // 5. Rules loaded
  checks.push({
    name: 'Rules cascade',
    status: runtime.rules.blocks.length > 0 ? 'ok' : 'warn',
    detail: `${runtime.rules.blocks.length} blocks loaded (depth: ${runtime.env.agents_depth})`,
  });

  // 6. MCP runtime servers
  const mcpServerCount = Object.keys(runtime.mcp.servers).length;
  checks.push({
    name: 'MCP servers',
    status: mcpServerCount > 0 ? 'ok' : 'warn',
    detail: mcpServerCount > 0
      ? `${mcpServerCount} servers in ${runtime.mcp.source}`
      : 'no project .mcp.json',
  });

  // 7. Symlinks status
  let linked = 0, unlinked = 0, native = 0, nolink = 0;
  const unlinkedAgents = [];

  for (const agent of AGENTS) {
    if (agent.native) { native++; continue; }
    if (!agent.global) { nolink++; continue; }
    const target = resolveTarget(agent.global);
    if (isSymlinkedTo(target, GLOBAL_AGENTS)) {
      linked++;
    } else {
      unlinked++;
      unlinkedAgents.push(agent.name);
    }
  }

  const symlinkStatus = unlinked === 0 ? 'ok' : 'warn';
  checks.push({
    name: 'Symlinks',
    status: symlinkStatus,
    detail: `${linked}/${linked + unlinked} linked` + (unlinked > 0 ? ` (${unlinked} unlinked)` : ''),
  });

  if (unlinked > 0) {
    issues.push(`Unlinked agents: ${unlinkedAgents.join(', ')}`);
  }

  // 8. Loader errors/warnings
  if (runtime.metadata.errors.length > 0) {
    for (const err of runtime.metadata.errors) {
      issues.push(`Loader error: ${err}`);
    }
  }

  const healthy = issues.length === 0;

  return { healthy, checks, issues, runtime };
}

function run(opts = {}) {
  const { doctor, fix, json: asJson, project, depth } = opts;

  if (doctor && fix) {
    const health = runHealthCheck({ project, depth });
    // Auto-fix: link all agents
    const { applyLinkAll } = require('./rules');
    const result = applyLinkAll();
    if (asJson) {
      console.log(formatJSON({ fixed: true, result, health: { healthy: health.healthy, checks: health.checks, issues: health.issues } }));
    } else {
      console.log(formatStatus('ok', `Auto-fixed: ${result.linked} agents linked, ${result.skipped} skipped.`));
    }
    return;
  }

  const health = runHealthCheck({ project, depth });

  if (asJson) {
    // Full JSON output includes runtime state (all 4 resource types)
    console.log(formatJSON({
      healthy: health.healthy,
      checks: health.checks,
      issues: health.issues,
      version: '2.0.0',
      project_root: health.runtime.env.project_root,
      cwd: health.runtime.env.cwd,
      agents_depth: health.runtime.env.agents_depth,
      rules: {
        blocks: health.runtime.rules.blocks,
      },
      skills: health.runtime.skills,
      mcp: health.runtime.mcp,
      providers: health.runtime.providers,
    }));
  } else {
    console.log(`\n  .agents health check\n  ${'─'.repeat(40)}`);
    for (const check of health.checks) {
      console.log(`  ${formatStatus(check.status, check.name.padEnd(16) + check.detail)}`);
    }

    if (health.issues.length > 0) {
      console.log(`\n  Issues:`);
      for (const issue of health.issues) {
        console.log(`  ${formatStatus('warn', issue)}`);
      }
      console.log(`\n  Run \`.agents doctor --fix\` to auto-fix common issues.`);
    } else {
      console.log(`\n  ${formatStatus('ok', 'All systems healthy.')}`);
    }

    // Show loaded resource summary
    console.log(`\n  Loaded resources:`);
    console.log(`    Rules:     ${health.runtime.rules.blocks.length} blocks`);
    console.log(`    Skills:    ${Object.keys(health.runtime.skills).length} active`);
    console.log(`    MCP:       ${Object.keys(health.runtime.mcp.servers).length} servers`);
    console.log(`    Providers: ${health.runtime.providers.loaded ? 'yes' : 'no'}`);
  }

  if (!health.healthy) process.exitCode = 1;
}

module.exports = { run, runHealthCheck };
