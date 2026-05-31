// fs-helpers.js — Filesystem utilities: symlink, ensureDir, path resolution
// Zero dependencies. Node.js >=16 built-ins only.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();

/**
 * Expand ~ in a file path to the user's home directory.
 */
function expandTilde(p) {
  if (!p) return null;
  if (p.startsWith('~/') || p === '~') {
    return path.join(HOME, p.slice(1));
  }
  return p;
}

/**
 * Collapse a path to ~/... form for display.
 */
function collapseTilde(p) {
  if (!p) return null;
  if (p.startsWith(HOME)) {
    return '~' + p.slice(HOME.length);
  }
  return p;
}

/**
 * Resolve a target path: expand ~, normalize.
 */
function resolveTarget(target) {
  if (!target) return null;
  return path.normalize(expandTilde(target));
}

/**
 * Ensure a directory exists (create recursively if needed).
 * @param {string} filePath — a file or directory path; the directory containing it is created.
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create a directory (not just its parent).
 * @param {string} dirPath — the directory path to create.
 */
function ensureDirExact(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Check if `target` is a symlink pointing to `source`.
 */
function isSymlinkedTo(target, source) {
  if (!target || !source) return false;
  try {
    const link = fs.readlinkSync(target);
    return link === source;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory (not a symlink to a directory).
 */
function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path exists (file, directory, or symlink).
 */
function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a symlink (regardless of whether target exists).
 */
function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Read a file, returning null if it doesn't exist.
 */
function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Write a file, creating parent directories as needed.
 */
function writeFile(p, content) {
  ensureDir(p);
  fs.writeFileSync(p, content, 'utf-8');
}

/**
 * Create a symlink from `target` to `source`.
 * Removes existing file/symlink at target if present.
 */
function symlink(source, target) {
  ensureDir(target);
  try {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    fs.symlinkSync(source, target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a symlink if it points to the given source.
 * Returns true if removed, false if not our symlink or doesn't exist.
 */
function unlinkIf(linkPath, expectedSource) {
  try {
    if (isSymlinkedTo(linkPath, expectedSource)) {
      fs.unlinkSync(linkPath);
      return true;
    }
  } catch {
    // File doesn't exist or isn't our symlink — skip
  }
  return false;
}

/**
 * List entries in a directory (files and directories).
 * Returns null if directory doesn't exist.
 */
function listDir(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return null;
  }
}

/**
 * Find all subdirectories that contain a SKILL.md file.
 * @returns {Array<{name: string, path: string}>}
 */
function findSkills(dirPath) {
  const skills = [];
  const entries = listDir(dirPath);
  if (!entries) return skills;
  for (const entry of entries) {
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      const skillPath = path.join(dirPath, entry.name);
      const skillMd = path.join(skillPath, 'SKILL.md');
      if (exists(skillMd)) {
        skills.push({ name: entry.name, path: skillPath, skillMd });
      }
    }
  }
  return skills;
}

/**
 * Resolve a file path relative to the project root.
 * If `projectPath` is not set, uses process.cwd().
 */
function projectPath(projectDir, ...parts) {
  const base = projectDir || process.cwd();
  return path.join(base, ...parts);
}

module.exports = {
  HOME,
  expandTilde,
  collapseTilde,
  resolveTarget,
  ensureDir,
  ensureDirExact,
  isSymlinkedTo,
  isDirectory,
  exists,
  isSymlink,
  readFile,
  writeFile,
  symlink,
  unlinkIf,
  listDir,
  findSkills,
  projectPath,
};
