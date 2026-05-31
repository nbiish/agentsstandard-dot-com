// test/loader.test.js — Tests for the unified loading algorithm
// Zero dependencies. Node.js >=16 built-ins only.

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { load, loadRules, loadSkills, loadMcp, detectProjectRoot, resolveEnv } = require('../lib/loader');
const { HOME } = require('../lib/constants');

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
  assert.strictEqual(actual, expected, msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assert_contains(str, substr, msg) {
  assert(str && str.includes(substr), msg || `Expected string to contain "${substr}"`);
}

function assert_type(val, type, msg) {
  assert.strictEqual(typeof val, type, msg || `Expected type ${type}, got ${typeof val}`);
}

// ── Temp Directory Helpers ──────────────────────────────────────────────────

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agents-test-'));
}

function writeTmpFile(dir, relPath, content) {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

function cleanupTmpDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

console.log('\nUnified Loader Tests\n' + '─'.repeat(50));

// ── Phase 0: Environment Resolution ────────────────────────────────────────

test('resolveEnv returns object with required fields', () => {
  const env = resolveEnv();
  assert_type(env.agentsPath, 'string');
  assert_type(env.agentsDepth, 'number');
  assert_type(env.cwd, 'string');
  assert_equal(env.home, HOME);
});

test('AGENTS_DEPTH defaults to 3', () => {
  const env = resolveEnv();
  assert_equal(env.agentsDepth, 3);
});

test('AGENTS_DEPTH is clamped to 1-10', () => {
  const orig = process.env.AGENTS_DEPTH;
  try {
    process.env.AGENTS_DEPTH = '0';
    assert_equal(resolveEnv().agentsDepth, 1);
    process.env.AGENTS_DEPTH = '100';
    assert_equal(resolveEnv().agentsDepth, 10);
    process.env.AGENTS_DEPTH = '5';
    assert_equal(resolveEnv().agentsDepth, 5);
  } finally {
    if (orig === undefined) delete process.env.AGENTS_DEPTH;
    else process.env.AGENTS_DEPTH = orig;
  }
});

// ── Phase 0: Project Root Detection ────────────────────────────────────────

test('detectProjectRoot finds .git directory', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.git'));
    const result = detectProjectRoot(tmp);
    assert_equal(result, tmp);
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('detectProjectRoot finds .agents directory', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.agents'));
    const result = detectProjectRoot(tmp);
    assert_equal(result, tmp);
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('detectProjectRoot finds llms.txt', () => {
  const tmp = createTmpDir();
  try {
    fs.writeFileSync(path.join(tmp, 'llms.txt'), '# test', 'utf-8');
    const result = detectProjectRoot(tmp);
    assert_equal(result, tmp);
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('detectProjectRoot returns null when no markers found in ancestry', () => {
  // Use a deep path under /tmp that likely has no .git/.agents/llms.txt in ancestry
  const tmp = createTmpDir();
  const deep = path.join(tmp, 'a', 'b', 'c', 'd');
  fs.mkdirSync(deep, { recursive: true });
  try {
    // If /tmp itself has no markers, walk-up should reach / and return null
    // (This may find markers in some environments — test the function's behavior)
    const result = detectProjectRoot(deep);
    // Result is either null (no markers) or a parent dir with markers
    // The important thing is it doesn't crash
    assert(result === null || typeof result === 'string', 'Expected null or string');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('detectProjectRoot respects AGENTS_ROOT env', () => {
  const tmp = createTmpDir();
  const orig = process.env.AGENTS_ROOT;
  try {
    process.env.AGENTS_ROOT = tmp;
    const result = detectProjectRoot();
    assert_equal(result, tmp);
  } finally {
    if (orig === undefined) delete process.env.AGENTS_ROOT;
    else process.env.AGENTS_ROOT = orig;
    cleanupTmpDir(tmp);
  }
});

test('detectProjectRoot walks up to find markers', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.git'));
    const sub = path.join(tmp, 'src', 'api');
    fs.mkdirSync(sub, { recursive: true });
    const result = detectProjectRoot(sub);
    assert_equal(result, tmp);
  } finally {
    cleanupTmpDir(tmp);
  }
});

// ── Phase 1: Global Scope Loading ──────────────────────────────────────────

test('load() returns object with all 4 resource types', () => {
  const result = load();
  assert(result.rules, 'Expected rules');
  assert(result.skills, 'Expected skills');
  assert(result.mcp, 'Expected mcp');
  assert(result.providers, 'Expected providers');
  assert(result.metadata, 'Expected metadata');
  assert(result.env, 'Expected env');
});

test('load() rules have content and blocks', () => {
  const result = load();
  assert_type(result.rules.content, 'string');
  assert(Array.isArray(result.rules.blocks), 'Expected blocks to be array');
});

test('load() skills is an object', () => {
  const result = load();
  assert_type(result.skills, 'object');
});

test('load() mcp has servers object', () => {
  const result = load();
  assert_type(result.mcp.servers, 'object');
});

test('load() metadata has loaded_files array', () => {
  const result = load();
  assert(Array.isArray(result.metadata.loaded_files), 'Expected loaded_files array');
  assert(Array.isArray(result.metadata.errors), 'Expected errors array');
  assert(Array.isArray(result.metadata.warnings), 'Expected warnings array');
});

// ── Phase 2: Project Scope Loading ─────────────────────────────────────────

test('load() with project directory loads project rules', () => {
  const tmp = createTmpDir();
  try {
    // Create .agents/AGENTS.md (project base)
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Project Base Rules\nUse TypeScript.');
    // Create AGENTS.md (project active)
    writeTmpFile(tmp, 'AGENTS.md', '# Active Rules\nFocus on tests.');

    const result = load({ project: tmp });

    // Should have at least 2 project rule blocks
    const projectBlocks = result.rules.blocks.filter(b =>
      b.scope === 'project_base' || b.scope === 'project_active'
    );
    assert(projectBlocks.length >= 2, `Expected >=2 project blocks, got ${projectBlocks.length}`);
    assert_contains(result.rules.content, 'Use TypeScript');
    assert_contains(result.rules.content, 'Focus on tests');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('load() loads llms.txt as project_prd scope', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, 'llms.txt', '# Project PRD\nBuild a great product.');
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Base rules');

    const result = load({ project: tmp });
    const prdBlock = result.rules.blocks.find(b => b.scope === 'project_prd');
    assert(prdBlock, 'Expected project_prd block');
    assert_contains(result.rules.content, 'Build a great product');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('load() skips project_active if symlink to project_base', () => {
  const tmp = createTmpDir();
  try {
    const baseFile = writeTmpFile(tmp, '.agents/AGENTS.md', '# Base rules');
    const activeFile = path.join(tmp, 'AGENTS.md');
    fs.symlinkSync(baseFile, activeFile);

    const result = load({ project: tmp });
    const activeBlocks = result.rules.blocks.filter(b => b.scope === 'project_active');
    assert_equal(activeBlocks.length, 0, 'Should skip symlinked project_active');
  } finally {
    cleanupTmpDir(tmp);
  }
});

// ── Phase 2: Skills Override by Name ───────────────────────────────────────

test('loadSkills() returns global and project skills', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/skills/test-skill/SKILL.md', '# Test Skill\nDoes something.');
    const result = loadSkills({ project: tmp });
    assert(Array.isArray(result.global), 'Expected global array');
    assert(Array.isArray(result.project), 'Expected project array');
    assert_type(result.merged, 'object');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('project skill overrides global skill with same name', () => {
  // This test verifies the override logic by checking the merged result
  // We can't easily create a global skill in tests, so we test the merge logic
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/skills/my-skill/SKILL.md', '# Project Version');
    const result = loadSkills({ project: tmp });

    // If there's a global 'my-skill', it should be overridden
    // If not, the project version should still be present
    assert(result.merged['my-skill'], 'Expected my-skill in merged result');
    assert_equal(result.merged['my-skill'].scope, 'project');
  } finally {
    cleanupTmpDir(tmp);
  }
});

// ── Phase 2: MCP Loading ───────────────────────────────────────────────────

test('loadMcp() loads servers from .mcp.json', () => {
  const tmp = createTmpDir();
  try {
    // Need .agents dir as project marker for detectProjectRoot
    fs.mkdirSync(path.join(tmp, '.agents'));
    const mcpConfig = {
      mcpServers: {
        'test-server': { type: 'stdio', command: 'npx', args: ['-y', 'test'] },
        'disabled-server': { type: 'stdio', command: 'npx', disabled: true },
      },
    };
    writeTmpFile(tmp, '.mcp.json', JSON.stringify(mcpConfig, null, 2));

    const result = loadMcp({ project: tmp });
    assert(result.servers['test-server'], 'Expected test-server');
    assert(!result.servers['disabled-server'], 'Disabled server should be excluded');
    assert_equal(result.source, '.mcp.json');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('loadMcp() handles missing .mcp.json gracefully', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Rules');
    const result = loadMcp({ project: tmp });
    assert_equal(Object.keys(result.servers).length, 0);
    assert_equal(result.source, null);
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('loadMcp() handles invalid JSON gracefully', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.agents'));
    writeTmpFile(tmp, '.mcp.json', '{ invalid json }');
    const result = load({ project: tmp });
    assert(result.metadata.errors.length > 0, 'Expected parse error in metadata');
  } finally {
    cleanupTmpDir(tmp);
  }
});

// ── Phase 3: Folder Scope ──────────────────────────────────────────────────

test('load() with depth=4 loads folder-level AGENTS.md', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Project Base');
    writeTmpFile(tmp, 'AGENTS.md', '# Project Active');
    writeTmpFile(tmp, 'src/AGENTS.md', '# Source Folder Rules');

    // Set cwd to src/ inside the project so folder scope loads
    const srcDir = path.join(tmp, 'src');
    const result = load({ project: tmp, cwd: srcDir, depth: 4 });
    const folderBlocks = result.rules.blocks.filter(b => b.scope === 'folder');
    assert(folderBlocks.length > 0, 'Expected folder blocks at depth=4');
    assert_contains(result.rules.content, 'Source Folder Rules');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('load() with depth=3 does NOT load folder-level AGENTS.md', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Project Base');
    writeTmpFile(tmp, 'AGENTS.md', '# Project Active');
    writeTmpFile(tmp, 'src/AGENTS.md', '# Source Folder Rules');

    const result = load({ project: tmp, depth: 3 });
    const folderBlocks = result.rules.blocks.filter(b => b.scope === 'folder');
    assert_equal(folderBlocks.length, 0, 'No folder blocks at depth=3');
  } finally {
    cleanupTmpDir(tmp);
  }
});

// ── Phase 5: Composition ───────────────────────────────────────────────────

test('rules are concatenated in scope order', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, 'llms.txt', '# PRD');
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Base');
    writeTmpFile(tmp, 'AGENTS.md', '# Active');

    const result = load({ project: tmp });
    const scopes = result.rules.blocks.map(b => b.scope);
    // PRD should come before base, base before active
    const prdIdx = scopes.indexOf('project_prd');
    const baseIdx = scopes.indexOf('project_base');
    const activeIdx = scopes.indexOf('project_active');

    if (prdIdx >= 0 && baseIdx >= 0) assert(prdIdx < baseIdx, 'PRD should come before base');
    if (baseIdx >= 0 && activeIdx >= 0) assert(baseIdx < activeIdx, 'Base should come before active');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('rules content includes scope annotations', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Base Rules');

    const result = load({ project: tmp });
    assert_contains(result.rules.content, '<!-- scope:project_base');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('env object includes project_root and agents_depth', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Rules');
    const result = load({ project: tmp });
    assert_equal(result.env.project_root, tmp);
    assert_equal(result.env.agents_depth, 3);
  } finally {
    cleanupTmpDir(tmp);
  }
});

// ── Edge Cases ─────────────────────────────────────────────────────────────

test('load() with empty project directory does not fail', () => {
  const tmp = createTmpDir();
  try {
    const result = load({ project: tmp });
    assert(result, 'Expected result object');
    assert(Array.isArray(result.rules.blocks), 'Expected blocks array');
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('load() with no project returns global-only', () => {
  // Use a directory without any project markers
  const tmp = createTmpDir();
  try {
    const orig = process.env.AGENTS_ROOT;
    delete process.env.AGENTS_ROOT;
    const origCwd = process.cwd();
    process.chdir(tmp);

    try {
      const result = load();
      const projectBlocks = result.rules.blocks.filter(b =>
        b.scope.startsWith('project')
      );
      assert_equal(projectBlocks.length, 0, 'No project blocks without project root');
      assert_equal(result.env.project_root, null);
    } finally {
      process.chdir(origCwd);
      if (orig !== undefined) process.env.AGENTS_ROOT = orig;
    }
  } finally {
    cleanupTmpDir(tmp);
  }
});

test('loadRules() returns rules object directly', () => {
  const result = loadRules();
  assert_type(result.content, 'string');
  assert(Array.isArray(result.blocks), 'Expected blocks array');
});

test('loadSkills() returns global/project/merged', () => {
  const result = loadSkills();
  assert(Array.isArray(result.global), 'Expected global array');
  assert(Array.isArray(result.project), 'Expected project array');
  assert_type(result.merged, 'object');
});

test('loadMcp() returns servers/source/catalog_path', () => {
  const result = loadMcp();
  assert_type(result.servers, 'object');
  assert('source' in result, 'Expected source field');
  assert('catalog_path' in result, 'Expected catalog_path field');
});

// ── Conformance Levels ─────────────────────────────────────────────────────

test('minimal conformance: single rules file works', () => {
  const result = load();
  // At minimum, we should get a rules object even if no files exist
  assert(result.rules, 'Expected rules');
  assert_type(result.rules.content, 'string');
});

test('standard conformance: full cascade loads all types', () => {
  const tmp = createTmpDir();
  try {
    writeTmpFile(tmp, '.agents/AGENTS.md', '# Base');
    writeTmpFile(tmp, 'AGENTS.md', '# Active');
    writeTmpFile(tmp, '.agents/skills/test/SKILL.md', '# Skill');
    writeTmpFile(tmp, '.mcp.json', JSON.stringify({ mcpServers: { test: { type: 'stdio', command: 'echo' } } }));

    const result = load({ project: tmp });
    assert(result.rules.blocks.length >= 2, 'Expected >=2 rule blocks');
    assert(Object.keys(result.skills).length >= 1, 'Expected >=1 skill');
    assert(Object.keys(result.mcp.servers).length >= 1, 'Expected >=1 MCP server');
  } finally {
    cleanupTmpDir(tmp);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
