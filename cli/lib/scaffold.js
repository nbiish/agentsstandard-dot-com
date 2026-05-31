// scaffold.js — Generate agent-specific MCP configs from catalog
// Full implementation coming in v2.1.0.
// Zero dependencies. Node.js >=16 built-ins only.

const path = require('path');
const { AGENTS, AGENTS_BY_KEY, MCP_FORMATS, getAgentMcpProjectPath, getAgentMcpFormat } = require('./constants');
const { substituteEnvVars } = require('./env-var');
const { ensureDir, writeFile, collapseTilde } = require('./fs-helpers');

/**
 * Generate MCP config for a specific agent from a server definition.
 *
 * @param {string} agentKey — agent key from agents.json (e.g. 'claude-code', 'cursor')
 * @param {object} serverDef — catalog server definition
 * @param {string} [projectDir] — project root (defaults to cwd)
 * @returns {{ filePath: string, format: string, success: boolean }}
 */
function scaffoldServer(agentKey, serverDef, projectDir) {
  const agent = AGENTS_BY_KEY[agentKey];
  if (!agent || !agent.mcpFormat || !agent.mcpProject) {
    return { filePath: null, format: null, success: false, reason: `Agent "${agentKey}" does not support project MCP config` };
  }

  const format = MCP_FORMATS[agent.mcpFormat];
  if (!format) {
    return { filePath: null, format: agent.mcpFormat, success: false, reason: `Unknown format "${agent.mcpFormat}"` };
  }

  const base = projectDir || process.cwd();
  const filePath = path.join(base, agent.mcpProject);
  const sanitized = substituteEnvVars(serverDef);

  // For 'json' and 'jsonc' formats, we write the standard mcpServers schema
  // For 'yaml' and 'toml', we use the format-specific stringify
  if (agent.mcpFormat === 'json' || agent.mcpFormat === 'jsonc') {
    // Read existing config if any
    let existing = {};
    try {
      const fs = require('fs');
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (agent.mcpFormat === 'jsonc') {
        const stripped = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        existing = JSON.parse(stripped).mcpServers || {};
      } else {
        existing = JSON.parse(raw).mcpServers || {};
      }
    } catch { /* file doesn't exist or is invalid — start fresh */ }

    existing[serverDef.name || 'unknown'] = sanitized;
    const content = JSON.stringify({ mcpServers: existing }, null, 2) + '\n';
    ensureDir(filePath);
    require('fs').writeFileSync(filePath, content, 'utf-8');
    return { filePath: collapseTilde(filePath), format: agent.mcpFormat, success: true };
  }

  // For yaml/toml, the stringify function handles the full file
  const content = format.stringify({ [serverDef.name || 'unknown']: sanitized });
  ensureDir(filePath);
  require('fs').writeFileSync(filePath, content, 'utf-8');
  return { filePath: collapseTilde(filePath), format: agent.mcpFormat, success: true };
}

/**
 * Generate MCP configs for all agents that support project MCP from a server definition.
 * @returns {Array<{ agent: string, filePath: string, success: boolean }>}
 */
function scaffoldAll(serverDef, projectDir) {
  const results = [];
  for (const agent of AGENTS) {
    if (agent.mcpProject && agent.mcpFormat) {
      const result = scaffoldServer(agent.key, serverDef, projectDir);
      results.push({ agent: agent.key, name: agent.name, ...result });
    }
  }
  return results;
}

module.exports = { scaffoldServer, scaffoldAll };
