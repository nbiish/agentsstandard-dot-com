// catalog.js — Read, validate, and write the ~/.agents/mcp-settings.json catalog
// Zero dependencies. Node.js >=16 built-ins only.

const fs = require('fs');
const path = require('path');
const { GLOBAL_MCP_CATALOG, CATALOG_SCHEMA_VERSION, defaultCatalog } = require('./constants');
const { ensureDir, exists, readFile, writeFile } = require('./fs-helpers');

// ── MCP Config Schema Validation ─────────────────────────────────────────────

// Known MCP transport types
const VALID_TYPES = ['stdio', 'sse', 'http', 'streamable-http', 'streamableHttp'];

// Required: either 'command' (for stdio) or 'url' (for HTTP/SSE)
function validateServerDef(name, def) {
  const issues = [];

  if (!def || typeof def !== 'object') {
    return [`Server "${name}": definition must be an object`];
  }

  // Type validation
  if (def.type && !VALID_TYPES.includes(def.type)) {
    issues.push(`Server "${name}": unknown type "${def.type}". Valid: ${VALID_TYPES.join(', ')}`);
  }

  // Transport validation
  const isStdio = !def.type || def.type === 'stdio';
  const isHttp = def.type === 'http' || def.type === 'streamable-http' || def.type === 'streamableHttp';
  const isSse = def.type === 'sse';

  if (isStdio && !def.command) {
    issues.push(`Server "${name}": stdio servers require "command"`);
  }
  if ((isHttp || isSse) && !def.url) {
    issues.push(`Server "${name}": ${def.type} servers require "url"`);
  }

  // args must be an array if present
  if (def.args !== undefined && !Array.isArray(def.args)) {
    issues.push(`Server "${name}": "args" must be an array`);
  }

  // env must be an object if present
  if (def.env !== undefined && (typeof def.env !== 'object' || Array.isArray(def.env))) {
    issues.push(`Server "${name}": "env" must be an object`);
  }

  // timeout must be a number if present
  if (def.timeout !== undefined && typeof def.timeout !== 'number') {
    issues.push(`Server "${name}": "timeout" must be a number`);
  }

  return issues;
}

// ── Catalog Operations ───────────────────────────────────────────────────────

/**
 * Read the catalog from disk. Returns the catalog object or null if not found.
 * @param {string} [catalogPath] — override path
 * @returns {object|null}
 */
function readCatalog(catalogPath) {
  const filePath = catalogPath || GLOBAL_MCP_CATALOG;
  const raw = readFile(filePath);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    // Support both v1.x format (flat object with mcpServers) and v2.x format (nested catalog)
    if (parsed.catalog && typeof parsed.catalog === 'object') {
      return parsed;
    }
    // Legacy v1.x format: { "server-name": { command, args, env } }
    if (parsed.mcpServers) {
      return { version: '1.0.0', catalog: parsed.mcpServers };
    }
    // Bare server map (oldest format)
    return { version: '1.0.0', catalog: parsed };
  } catch {
    return null;
  }
}

/**
 * Write the catalog to disk.
 * @param {object} catalog — the full catalog object { version, catalog: { ... } }
 * @param {string} [catalogPath] — override path
 */
function writeCatalog(catalog, catalogPath) {
  const filePath = catalogPath || GLOBAL_MCP_CATALOG;
  // Ensure version is set
  if (!catalog.version) catalog.version = CATALOG_SCHEMA_VERSION;
  if (!catalog.$schema) catalog.$schema = 'https://agentsstandard.com/schemas/mcp-catalog.json';
  writeFile(filePath, JSON.stringify(catalog, null, 2) + '\n');
}

/**
 * Get a specific server definition from the catalog.
 * @returns {object|null} — the server definition or null
 */
function getServer(name, catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog || !catalog.catalog) return null;
  return catalog.catalog[name] || null;
}

/**
 * List all server names in the catalog.
 * @returns {string[]}
 */
function listServers(catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog || !catalog.catalog) return [];
  return Object.keys(catalog.catalog);
}

/**
 * List all servers with their full definitions.
 * @returns {Array<{name: string, ...def}>}
 */
function listServersDetailed(catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog || !catalog.catalog) return [];
  return Object.entries(catalog.catalog).map(([name, def]) => ({
    name,
    ...def,
    isDisabled: def.disabled === true,
  }));
}

/**
 * Add or update a server in the catalog.
 */
function addServer(name, def, catalogPath) {
  const catalog = readCatalog(catalogPath) || defaultCatalog();
  catalog.catalog[name] = def;
  writeCatalog(catalog, catalogPath);
}

/**
 * Remove a server from the catalog.
 * @returns {boolean} — true if removed, false if not found
 */
function removeServer(name, catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog || !catalog.catalog || !catalog.catalog[name]) return false;
  delete catalog.catalog[name];
  writeCatalog(catalog, catalogPath);
  return true;
}

/**
 * Toggle a server's disabled status.
 * @returns {boolean} — new disabled state, or null if not found
 */
function toggleServer(name, catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog || !catalog.catalog || !catalog.catalog[name]) return null;
  catalog.catalog[name].disabled = !catalog.catalog[name].disabled;
  writeCatalog(catalog, catalogPath);
  return catalog.catalog[name].disabled;
}

/**
 * Enable or disable a server explicitly.
 * @returns {boolean} — true if successful
 */
function setServerEnabled(name, enabled, catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog || !catalog.catalog || !catalog.catalog[name]) return false;
  if (enabled) {
    delete catalog.catalog[name].disabled;
  } else {
    catalog.catalog[name].disabled = true;
  }
  writeCatalog(catalog, catalogPath);
  return true;
}

/**
 * Validate the entire catalog.
 * @returns {{ valid: boolean, issues: string[] }}
 */
function validateCatalog(catalogPath) {
  const catalog = readCatalog(catalogPath);
  const issues = [];

  if (!catalog) {
    return { valid: false, issues: ['Catalog file not found or invalid JSON'] };
  }

  // Validate top-level structure
  if (!catalog.catalog || typeof catalog.catalog !== 'object') {
    return { valid: false, issues: ['Catalog missing "catalog" key — not a valid catalog file'] };
  }

  // Validate each server
  for (const [name, def] of Object.entries(catalog.catalog)) {
    issues.push(...validateServerDef(name, def));
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Get catalog summary (useful for health checks).
 */
function catalogSummary(catalogPath) {
  const catalog = readCatalog(catalogPath);
  if (!catalog) return { exists: false, serverCount: 0, enabledCount: 0, disabledCount: 0 };

  const servers = Object.entries(catalog.catalog || {});
  const enabled = servers.filter(([, def]) => !def.disabled);
  const disabled = servers.filter(([, def]) => def.disabled);

  return {
    exists: true,
    serverCount: servers.length,
    enabledCount: enabled.length,
    disabledCount: disabled.length,
    servers: servers.map(([name]) => name),
    enabled: enabled.map(([name]) => name),
    disabled: disabled.map(([name]) => name),
    version: catalog.version || 'unknown',
  };
}

/**
 * Ensure the catalog file exists, creating it with defaults if needed.
 */
function ensureCatalog(catalogPath) {
  const filePath = catalogPath || GLOBAL_MCP_CATALOG;
  if (!exists(filePath)) {
    writeCatalog(defaultCatalog(), filePath);
  }
}

module.exports = {
  validateServerDef,
  readCatalog,
  writeCatalog,
  getServer,
  listServers,
  listServersDetailed,
  addServer,
  removeServer,
  toggleServer,
  setServerEnabled,
  validateCatalog,
  catalogSummary,
  ensureCatalog,
};
