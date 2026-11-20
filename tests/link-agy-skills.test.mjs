import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';

import { scriptPath } from './helpers.mjs';

const linkAgySkills = scriptPath('link-agy-skills.sh');

function writeSkill(dir, name) {
  const skillDir = path.join(dir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: ${name}\ndescription: test\n---\n`);
  return fs.realpathSync(skillDir);
}

function makeRoots(prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    tempDir,
    piDir: path.join(tempDir, 'pi-agent'),
    ompDir: path.join(tempDir, 'omp'),
    agentsDir: path.join(tempDir, 'agents-skills'),
    agyDir: path.join(tempDir, 'agy-skills'),
  };
}

function runScript(roots, args = []) {
  return execFileSync(linkAgySkills, args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      PI_AGENT_DIR: roots.piDir,
      OMP_CONFIG_ROOT: roots.ompDir,
      AGENTS_SKILLS_DIR: roots.agentsDir,
      AGY_SKILLS_DIR: roots.agyDir,
    },
  });
}

test('links pi, nx, omp, and shared agents skills while skipping .system and synced', () => {
  const roots = makeRoots('agy-link-basic-');
  const ompSkill = writeSkill(path.join(roots.ompDir, 'agent/skills'), 'omp-only');
  const managedSkill = writeSkill(path.join(roots.ompDir, 'agent/managed-skills'), 'omp-managed');
  const piSkill = writeSkill(path.join(roots.piDir, 'skills'), 'atlassian-workflows');
  const nxSkill = writeSkill(path.join(roots.piDir, 'skills/nx'), 'nx-workspace');
  const agentSkill = writeSkill(roots.agentsDir, 'brainstorming');

  // Nested container directories without direct SKILL.md should be skipped.
  writeSkill(path.join(roots.piDir, 'skills/.system'), 'imagegen');
  writeSkill(path.join(roots.piDir, 'skills/synced/bundle'), 'pdf');

  // External symlinked skill inside pi/skills (like twg) should resolve cleanly.
  const externalTwg = writeSkill(path.join(roots.tempDir, 'twg-store'), 'twg-jira');
  fs.symlinkSync(externalTwg, path.join(roots.piDir, 'skills/twg-jira'));

  const out = runScript(roots);

  assert.match(out, /6 linked, 0 updated, 0 unchanged, 0 skipped/);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'omp-only')), ompSkill);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'omp-managed')), managedSkill);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'atlassian-workflows')), piSkill);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'nx-workspace')), nxSkill);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'brainstorming')), agentSkill);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'twg-jira')), externalTwg);

  assert.equal(fs.existsSync(path.join(roots.agyDir, '.system')), false);
  assert.equal(fs.existsSync(path.join(roots.agyDir, 'imagegen')), false);
  assert.equal(fs.existsSync(path.join(roots.agyDir, 'synced')), false);
  assert.equal(fs.existsSync(path.join(roots.agyDir, 'pdf')), false);
  assert.equal(fs.existsSync(path.join(roots.agyDir, 'nx')), false);
});

test('enforces omp > pi > agents precedence and updates managed symlinks', () => {
  const roots = makeRoots('agy-link-precedence-');
  const piReview = writeSkill(path.join(roots.piDir, 'skills'), 'code-review');
  writeSkill(roots.agentsDir, 'code-review');

  runScript(roots);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'code-review')), piReview);

  // Adding an omp override should update the managed symlink on re-run.
  const ompReview = writeSkill(path.join(roots.ompDir, 'agent/skills'), 'code-review');
  const out = runScript(roots);

  assert.match(out, /0 linked, 1 updated, 0 unchanged, 0 skipped/);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'code-review')), ompReview);
});

test('is idempotent and preserves existing relative symlinks pointing to the same skill', () => {
  const roots = makeRoots('agy-link-idempotent-');
  const orcaSkill = writeSkill(roots.agentsDir, 'orca-cli');
  fs.mkdirSync(path.join(roots.piDir, 'skills'), { recursive: true });
  fs.symlinkSync(orcaSkill, path.join(roots.piDir, 'skills/orca-cli'));

  // Simulate Orca's pre-existing relative symlink in ~/.gemini/config/skills.
  fs.mkdirSync(roots.agyDir, { recursive: true });
  const relativeTarget = path.relative(fs.realpathSync(roots.agyDir), orcaSkill);
  const dst = path.join(roots.agyDir, 'orca-cli');
  fs.symlinkSync(relativeTarget, dst);

  const out = runScript(roots);

  assert.match(out, /0 linked, 0 updated, 1 unchanged, 0 skipped/);
  assert.equal(fs.readlinkSync(dst), relativeTarget);
});

test('never overwrites real directories and respects unmanaged symlinks unless --force', () => {
  const roots = makeRoots('agy-link-protect-');
  writeSkill(path.join(roots.piDir, 'skills'), 'local-real');
  const piCustom = writeSkill(path.join(roots.piDir, 'skills'), 'custom-link');
  const externalTarget = writeSkill(path.join(roots.tempDir, 'external'), 'custom-link');

  // Real directory in agyDir must never be touched.
  const realDst = writeSkill(roots.agyDir, 'local-real');
  // Unmanaged symlink in agyDir should be skipped without --force.
  const customDst = path.join(roots.agyDir, 'custom-link');
  fs.symlinkSync(externalTarget, customDst);

  const first = runScript(roots);
  assert.match(first, /0 linked, 0 updated, 0 unchanged, 2 skipped/);
  assert.equal(fs.lstatSync(realDst).isSymbolicLink(), false);
  assert.equal(fs.realpathSync(customDst), externalTarget);

  const forced = runScript(roots, ['--force']);
  assert.match(forced, /0 linked, 1 updated, 0 unchanged, 1 skipped/);
  assert.equal(fs.lstatSync(realDst).isSymbolicLink(), false);
  assert.equal(fs.realpathSync(customDst), piCustom);
});

test('replaces broken symlinks automatically', () => {
  const roots = makeRoots('agy-link-broken-');
  const piSkill = writeSkill(path.join(roots.piDir, 'skills'), 'model-debate');
  fs.mkdirSync(roots.agyDir, { recursive: true });
  fs.symlinkSync('/nonexistent/deleted-skill', path.join(roots.agyDir, 'model-debate'));

  const out = runScript(roots);

  assert.match(out, /0 linked, 1 updated, 0 unchanged, 0 skipped/);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'model-debate')), piSkill);
});

test('--dry-run reports actions without creating or modifying symlinks', () => {
  const roots = makeRoots('agy-link-dryrun-');
  writeSkill(path.join(roots.piDir, 'skills'), 'model-debate');

  const out = runScript(roots, ['--dry-run']);

  assert.match(out, /link\s+model-debate.*\(dry-run\)/);
  assert.match(out, /1 linked.*\(dry-run\)/);
  assert.equal(fs.existsSync(roots.agyDir), false);
});

test('--prune removes broken and stale managed symlinks while keeping unrelated entries', () => {
  const roots = makeRoots('agy-link-prune-');
  const kept = writeSkill(path.join(roots.piDir, 'skills'), 'kept-skill');
  const removed = writeSkill(path.join(roots.piDir, 'skills'), 'removed-skill');
  const external = writeSkill(path.join(roots.tempDir, 'external'), 'external-skill');

  runScript(roots);
  // Add an unrelated symlink and a real local skill directory.
  fs.symlinkSync(external, path.join(roots.agyDir, 'external-skill'));
  writeSkill(roots.agyDir, 'local-only');

  // Remove the managed skill from pi/skills so its symlink becomes broken.
  fs.rmSync(removed, { recursive: true, force: true });

  const out = runScript(roots, ['--prune']);

  assert.match(out, /prune\s+removed-skill/);
  assert.match(out, /0 linked, 0 updated, 1 unchanged, 0 skipped, 1 pruned/);
  assert.equal(fs.existsSync(path.join(roots.agyDir, 'removed-skill')), false);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'kept-skill')), kept);
  assert.equal(fs.realpathSync(path.join(roots.agyDir, 'external-skill')), external);
  assert.equal(fs.existsSync(path.join(roots.agyDir, 'local-only/SKILL.md')), true);
});

test('status reports OK, MISSING, and MISMATCH without exiting non-zero', () => {
  const roots = makeRoots('agy-link-status-');
  writeSkill(path.join(roots.piDir, 'skills'), 'ok-skill');
  writeSkill(path.join(roots.piDir, 'skills'), 'missing-skill');
  writeSkill(path.join(roots.piDir, 'skills'), 'mismatch-skill');

  runScript(roots);
  fs.unlinkSync(path.join(roots.agyDir, 'missing-skill'));
  fs.unlinkSync(path.join(roots.agyDir, 'mismatch-skill'));
  writeSkill(roots.agyDir, 'mismatch-skill');

  const out = runScript(roots, ['status']);

  assert.match(out, /^OK: agy skill ok-skill -> /m);
  assert.match(out, /^MISSING: agy skill missing-skill /m);
  assert.match(out, /^MISMATCH: agy skill mismatch-skill /m);
});

test('rejects unknown arguments and status-only flag mismatches', () => {
  const roots = makeRoots('agy-link-args-');

  try {
    runScript(roots, ['--bogus']);
    assert.fail('expected exit 2');
  } catch (error) {
    assert.equal(error.status, 2);
    assert.match(error.stderr, /Unknown argument: --bogus/);
  }

  try {
    runScript(roots, ['status', '--prune']);
    assert.fail('expected exit 2');
  } catch (error) {
    assert.equal(error.status, 2);
    assert.match(error.stderr, /only apply to 'link' mode/);
  }
});
