// test/rules.test.js — Tests for AGENTS.md rules management
// Zero dependencies. Node.js >=16 built-ins only.

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Stateless tests that don't modify the filesystem
const { AGENTS, AGENTS_BY_KEY, isNativeAgent, hasGlobalConfig } = require('../lib/constants');
const { expandTilde, collapseTilde, resolveTarget } = require('../lib/fs-helpers');

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

function assert_equal(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
}

console.log('\nRules Module Tests\n' + '─'.repeat(40));

// ── Constants ────────────────────────────────────────────────────────────────

test('AGENTS array has entries', () => {
  assert(AGENTS.length > 20, `Expected >20 agents, got ${AGENTS.length}`);
});

test('AGENTS_BY_KEY lookup works', () => {
  const cc = AGENTS_BY_KEY['claude-code'];
  assert_equal(cc.name, 'Claude Code');
  assert_equal(cc.native, false);
});

test('isNativeAgent identifies native agents', () => {
  assert_equal(isNativeAgent('pi'), true);
  assert_equal(isNativeAgent('codewhale'), true);
  assert_equal(isNativeAgent('claude-code'), false);
});

test('hasGlobalConfig identifies agents with global files', () => {
  assert_equal(hasGlobalConfig('claude-code'), true);
  assert_equal(hasGlobalConfig('pi'), false); // Pi is native: reads AGENTS.md directly, no symlink target
  assert_equal(hasGlobalConfig('github-copilot'), false);
});

// ── Path utilities ───────────────────────────────────────────────────────────

test('expandTilde expands ~', () => {
  const result = expandTilde('~/test/path');
  assert(result.startsWith(os.homedir()), `Expected ${result} to start with ${os.homedir()}`);
  assert(result.endsWith('/test/path'), `Expected ${result} to end with /test/path`);
});

test('expandTilde handles bare ~', () => {
  const result = expandTilde('~');
  assert_equal(result, os.homedir());
});

test('expandTilde returns null for null', () => {
  assert_equal(expandTilde(null), null);
});

test('expandTilde returns non-tilde paths unchanged', () => {
  assert_equal(expandTilde('/usr/local/bin'), '/usr/local/bin');
});

test('collapseTilde collapses home', () => {
  const home = os.homedir();
  const result = collapseTilde(home + '/.claude/CLAUDE.md');
  assert_equal(result, '~/.claude/CLAUDE.md');
});

test('collapseTilde handles null', () => {
  assert_equal(collapseTilde(null), null);
});

test('resolveTarget resolves ~ paths', () => {
  const result = resolveTarget('~/.claude/CLAUDE.md');
  assert_equal(result, path.join(os.homedir(), '.claude', 'CLAUDE.md'));
});

// ── Agent global paths ───────────────────────────────────────────────────────

test('Claude Code global path is correct', () => {
  const cc = AGENTS_BY_KEY['claude-code'];
  assert(cc.global.endsWith('.claude/CLAUDE.md'), `Expected ~/.claude/CLAUDE.md, got ${cc.global}`);
});

test('Cursor global path is a directory', () => {
  const cursor = AGENTS_BY_KEY['cursor'];
  assert(cursor.global.includes('cursor'), `Expected cursor in path, got ${cursor.global}`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
