// env-var.js — API key → env var mapping, substitution, and env checking
// Zero dependencies. Node.js >=16 built-ins only.

const { ENV_VAR_MAP, ENV_VAR_PATTERNS } = require('./constants');

/**
 * Detect the best env var name for a given env key-value from a server definition.
 */
function detectEnvVar(envKey, envValue) {
  // Check direct key map
  if (ENV_VAR_MAP[envKey]) return ENV_VAR_MAP[envKey];
  // Check patterns against the value
  if (envValue && typeof envValue === 'string') {
    for (const { pattern, envVar } of ENV_VAR_PATTERNS) {
      if (pattern.test(envValue)) return envVar;
    }
  }
  // If key looks like a standard env var, preserve it
  if (/^[A-Z][A-Z0-9_]+$/.test(envKey)) return envKey;
  return envKey;
}

/**
 * Substitutes raw API key values in a server definition with ${ENV_VAR} references.
 * Returns a new definition safe to write to project configs.
 *
 * @param {object} serverDef — the raw server definition from the catalog
 * @returns {object} — sanitized definition with env var references
 */
function substituteEnvVars(serverDef) {
  const sanitized = {};

  // Copy scalar properties
  for (const key of ['command', 'url', 'description', 'disabled', 'alwaysLoad']) {
    if (serverDef[key] !== undefined) sanitized[key] = serverDef[key];
  }

  // Handle type (stdio vs http)
  if (serverDef.type) sanitized.type = serverDef.type;

  // Handle timeout as number
  if (serverDef.timeout !== undefined) {
    sanitized.timeout = typeof serverDef.timeout === 'number'
      ? serverDef.timeout
      : parseInt(serverDef.timeout, 10);
  }

  // Scan args for inline API keys (e.g., --api-key ctx7sk-...) and substitute
  if (serverDef.args) {
    sanitized.args = serverDef.args.map(arg => {
      if (typeof arg !== 'string') return arg;
      // Check if this arg looks like a raw API key via pattern matching
      for (const { pattern, envVar } of ENV_VAR_PATTERNS) {
        if (pattern.test(arg)) return `\${${envVar}}`;
      }
      // Also check if value is long and looks like a secret token
      if (arg.length > 20 && /^[A-Za-z0-9_-]+$/.test(arg) && !arg.startsWith('-')) {
        return `\${DETECTED_API_KEY}`;
      }
      return arg;
    });
  }

  // Substitute env vars: replace raw key values with ${ENV_VAR} references
  if (serverDef.env) {
    sanitized.env = {};
    for (const [key, value] of Object.entries(serverDef.env)) {
      const envVar = detectEnvVar(key, value);
      sanitized.env[key] = `\${${envVar}}`;
    }
  }

  // Handle headers (for HTTP/SSE transports)
  if (serverDef.headers) {
    sanitized.headers = {};
    for (const [key, value] of Object.entries(serverDef.headers)) {
      // If the value looks like a raw key/secret, substitute it
      if (typeof value === 'string' && (value.startsWith('sk-') || value.length > 20)) {
        const envVar = detectEnvVar(key, value);
        sanitized.headers[key] = `\${${envVar}}`;
      } else {
        sanitized.headers[key] = value;
      }
    }
  }

  // Handle headersHelper — copy as-is (it's a shell command, not a secret)
  if (serverDef.headersHelper) sanitized.headersHelper = { ...serverDef.headersHelper };

  // Handle oauth config — copy as-is (tokens are obtained dynamically)
  if (serverDef.oauth) sanitized.oauth = { ...serverDef.oauth };

  // Tags/category for metadata
  if (serverDef.tags) sanitized.tags = [...serverDef.tags];
  if (serverDef.category) sanitized.category = serverDef.category;

  return sanitized;
}

/**
 * Check if required env vars for a server are set in the current environment.
 * @returns {{ missing: string[], present: string[], allSet: boolean }}
 */
function checkEnvVars(serverDef) {
  const missing = [];
  const present = [];

  if (serverDef.env) {
    for (const [key, value] of Object.entries(serverDef.env)) {
      const envVar = detectEnvVar(key, typeof value === 'string' ? value : '');
      if (process.env[envVar]) {
        present.push(envVar);
      } else {
        missing.push(envVar);
      }
    }
  }

  if (serverDef.headers) {
    for (const [, value] of Object.entries(serverDef.headers)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const envVar = value.slice(2, -1);
        if (!process.env[envVar] && !missing.includes(envVar)) {
          missing.push(envVar);
        } else if (process.env[envVar] && !present.includes(envVar)) {
          present.push(envVar);
        }
      }
    }
  }

  return { missing, present, allSet: missing.length === 0 };
}

/**
 * List all the env vars a server needs (from its catalog definition).
 * @returns {string[]} — env var names
 */
function requiredEnvVars(serverDef) {
  const vars = [];
  if (serverDef.env) {
    for (const [key, value] of Object.entries(serverDef.env)) {
      vars.push(detectEnvVar(key, typeof value === 'string' ? value : ''));
    }
  }
  return [...new Set(vars)]; // deduplicate
}

module.exports = {
  detectEnvVar,
  substituteEnvVars,
  checkEnvVars,
  requiredEnvVars,
};
