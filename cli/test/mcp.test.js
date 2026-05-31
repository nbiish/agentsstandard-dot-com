// test/mcp.test.js — Tests for MCP catalog and project management
// Zero dependencies. Node.js >=16 built-ins only.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TMP = path.join(os.tmpdir(), '.agents-test-' + Date.now());

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

console.log('\nMCP Module Tests\n' + '─'.repeat(40));

// Setup: create temp catalog
const catalog = require('../lib/catalog');
const envVar = require('../lib/env-var');
const { formatJSON, formatTable } = require('../lib/formatters');

const testCatalog = {
  version: '2.0.0',
  catalog: {
    'test-server': {
      command: 'npx',
      args: ['-y', 'test-mcp'],
      env: { TEST_KEY: 'test-secret-12345' },
      description: 'A test MCP server',
      disabled: false,
    },
    'http-server': {
      type: 'http',
      url: 'https://example.com/mcp',
      headers: { Authorization: 'Bearer secret-token-abc' },
      description: 'An HTTP MCP server',
      disabled: true,
    },
  },
};

const catalogPath = path.join(TMP, 'mcp-settings.json');

function setup() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
  catalog.writeCatalog(testCatalog, catalogPath);
}

function cleanup() {
  try { fs.rmSync(TMP, { recursive: true }); } catch {}
}

setup();

// ── Catalog Operations ───────────────────────────────────────────────────────

test('readCatalog reads the catalog', () => {
  const cat = catalog.readCatalog(catalogPath);
  assert(cat !== null, 'Catalog should not be null');
  assert.equal(cat.catalog['test-server'].command, 'npx');
});

test('listServers returns server names', () => {
  const servers = catalog.listServers(catalogPath);
  assert.deepStrictEqual(servers, ['test-server', 'http-server']);
});

test('getServer returns a specific server', () => {
  const server = catalog.getServer('test-server', catalogPath);
  assert.equal(server.description, 'A test MCP server');
});

test('getServer returns null for unknown', () => {
  const server = catalog.getServer('nonexistent', catalogPath);
  assert.equal(server, null);
});

test('toggleServer toggles disabled status', () => {
  const before = catalog.getServer('test-server', catalogPath);
  assert.equal(before.disabled, false);
  const newState = catalog.toggleServer('test-server', catalogPath);
  assert.equal(newState, true);
  // Toggle back
  catalog.toggleServer('test-server', catalogPath);
});

test('addServer adds new server', () => {
  catalog.addServer('new-one', {
    command: 'node',
    args: ['server.js'],
    description: 'Brand new',
  }, catalogPath);
  const s = catalog.getServer('new-one', catalogPath);
  assert.equal(s.description, 'Brand new');
});

test('removeServer removes server', () => {
  const removed = catalog.removeServer('new-one', catalogPath);
  assert.equal(removed, true);
  const s = catalog.getServer('new-one', catalogPath);
  assert.equal(s, null);
});

test('validateCatalog finds no issues with valid catalog', () => {
  const result = catalog.validateCatalog(catalogPath);
  assert.equal(result.valid, true);
});

test('catalogSummary returns correct counts', () => {
  const summary = catalog.catalogSummary(catalogPath);
  assert.equal(summary.serverCount, 2);
  assert.equal(summary.enabledCount, 1);  // test-server enabled
  assert.equal(summary.disabledCount, 1); // http-server disabled
});

// ── Env Var Substitution ────────────────────────────────────────────────────

test('substituteEnvVars replaces API keys with env refs', () => {
  const serverDef = {
    command: 'npx',
    args: ['-y', 'test-server'],
    env: { API_KEY: 'sk-abc123' },
  };
  const result = envVar.substituteEnvVars(serverDef);
  assert.equal(result.env.API_KEY, '${OPENAI_API_KEY}');
  assert.equal(result.command, 'npx');
});

test('substituteEnvVars handles direct env key mapping', () => {
  const serverDef = {
    command: 'npx',
    args: ['-y', 'test-server'],
    env: { BRAVE_API_KEY: 'BSAGXd123456' },
  };
  const result = envVar.substituteEnvVars(serverDef);
  assert.equal(result.env.BRAVE_API_KEY, '${BRAVE_API_KEY}');
});

test('substituteEnvVars preserves args', () => {
  const serverDef = {
    command: 'npx',
    args: ['-y', 'test-server', '--port', '3000'],
    env: { KEY: 'val' },
  };
  const result = envVar.substituteEnvVars(serverDef);
  assert.deepStrictEqual(result.args, ['-y', 'test-server', '--port', '3000']);
});

test('substituteEnvVars handles http servers with headers', () => {
  const serverDef = {
    type: 'http',
    url: 'https://example.com',
    headers: { Authorization: 'Bearer sk-secret-token' },
  };
  const result = envVar.substituteEnvVars(serverDef);
  assert(result.headers.Authorization.includes('{'), 'Should contain env ref');
});

test('checkEnvVars detects missing required env vars', () => {
  const serverDef = {
    command: 'npx',
    env: { NONE_EXISTENT_VAR_XYZ: 'dummy' },
  };
  const result = envVar.checkEnvVars(serverDef);
  assert.equal(result.allSet, false);
  assert(result.missing.includes('NONE_EXISTENT_VAR_XYZ'));
});

test('requiredEnvVars returns env var names', () => {
  const serverDef = {
    command: 'npx',
    env: { BRAVE_API_KEY: 'BSAGXd...', PORT: '3000' },
  };
  const vars = envVar.requiredEnvVars(serverDef);
  assert(vars.includes('BRAVE_API_KEY'));
});

// ── Formatters ──────────────────────────────────────────────────────────────

test('formatJSON produces valid JSON', () => {
  const result = formatJSON({ hello: 'world' });
  const parsed = JSON.parse(result);
  assert.equal(parsed.hello, 'world');
});

test('formatTable produces aligned output', () => {
  const rows = [
    { name: 'test', status: 'ok' },
    { name: 'long-name-here', status: 'warn' },
  ];
  const result = formatTable(rows, ['status', 'name']);
  // Table should contain both names
  assert(result.includes('test'), 'Should contain test');
  assert(result.includes('long-name-here'), 'Should contain long-name-here');
  // Headers should be uppercase
  assert(result.includes('STATUS'), 'Should have STATUS header');
  assert(result.includes('NAME'), 'Should have NAME header');
});

// ── Validation ───────────────────────────────────────────────────────────────

test('validateServerDef catches missing command', () => {
  const issues = catalog.validateServerDef('bad-server', { type: 'stdio' });
  assert(issues.length > 0);
  assert(issues[0].includes('command'));
});

test('validateServerDef catches bad args type', () => {
  const issues = catalog.validateServerDef('bad-server', {
    command: 'test',
    args: 'not-an-array',
  });
  assert(issues.length > 0);
  assert(issues[0].includes('array'));
});

test('validateServerDef accepts valid stdio server', () => {
  const issues = catalog.validateServerDef('good-server', {
    command: 'npx',
    args: ['-y', 'test'],
    env: { KEY: 'val' },
  });
  assert.equal(issues.length, 0);
});

cleanup();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
