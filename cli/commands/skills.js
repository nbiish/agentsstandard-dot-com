// skills.js — Agent skill discovery, install, and apply
// Zero dependencies. Node.js >=16 built-ins only.

const path = require('path');
const { GLOBAL_SKILLS_DIR, PROJECT_SKILLS_DIR } = require('../lib/constants');
const { exists, readFile, findSkills, collapseTilde, projectPath } = require('../lib/fs-helpers');
const { loadSkills, load } = require('../lib/loader');
const { formatJSON, formatTable, formatStatus, formatSection } = require('../lib/formatters');

function cmdList(asJson, projectDir) {
  const { global, project, merged } = loadSkills({ project: projectDir });

  const all = {
    global: global.map(s => ({ name: s.name, location: 'global', path: s.path })),
    project: project.map(s => ({ name: s.name, location: 'project', path: s.path })),
    overrides: project
      .filter(s => global.some(g => g.name === s.name))
      .map(s => s.name),
  };

  if (asJson) {
    console.log(formatJSON(all));
  } else {
    if (global.length > 0) {
      console.log(`Global skills (${collapseTilde(GLOBAL_SKILLS_DIR)}):`);
      for (const s of global) {
        const overridden = all.overrides.includes(s.name) ? ' (overridden by project)' : '';
        console.log(`  ${formatStatus('ok', s.name)}${overridden}`);
      }
    } else {
      console.log(formatStatus('info', 'No global skills found.'));
      console.log(`  Place SKILL.md files in ${collapseTilde(GLOBAL_SKILLS_DIR)}/<name>/`);
    }

    if (project.length > 0) {
      console.log(`\nProject skills:`);
      for (const s of project) {
        console.log(`  ${formatStatus('ok', s.name)}`);
      }
    }

    if (all.overrides.length > 0) {
      console.log(`\n${formatStatus('info', `Project overrides: ${all.overrides.join(', ')}`)}`);
    }
  }
}

function cmdInfo(name, asJson, projectDir) {
  if (!name) {
    console.error('Usage: .agents skills info <name>');
    process.exit(1);
  }

  const { merged } = loadSkills({ project: projectDir });
  const skill = merged[name];

  if (!skill) {
    console.error(`Skill "${name}" not found.`);
    process.exit(1);
  }

  const content = readFile(
    skill.scope === 'global'
      ? path.join(GLOBAL_SKILLS_DIR, name, 'SKILL.md')
      : projectPath(projectDir, PROJECT_SKILLS_DIR, name, 'SKILL.md')
  );

  if (asJson) {
    console.log(formatJSON({ name, scope: skill.scope, path: skill.path, content }));
  } else {
    console.log(`Skill: ${name} (${skill.scope})`);
    console.log('─'.repeat(60));
    console.log(content || '(content unavailable)');
  }
}

function run(opts = {}) {
  const { subcommand, args = [], json: asJson = false, project } = opts;

  switch (subcommand) {
    case 'list':
      cmdList(asJson, project);
      break;
    case 'info':
      cmdInfo(args[0], asJson, project);
      break;
    case 'install':
    case 'remove':
    case 'update':
    case 'apply':
      console.log(formatStatus('info', `\`.agents skills ${subcommand}\` coming in v2.1.0.`));
      console.log('For now, manage skills manually in ~/.agents/skills/ or .agents/skills/.');
      break;
    default:
      cmdList(asJson, project);
  }
}

module.exports = { run };
