import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';

import { scriptPath } from './helpers.mjs';

const backupAll = scriptPath('backup.sh');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

// Every run pins all four roots at temp dirs so the real ~/.pi and ~/.omp are
// never read or written by the tests.
function makeEnv(tempDir) {
  return {
    piSrc: path.join(tempDir, 'pi-src'),
    piDst: path.join(tempDir, 'pi-dst'),
    ompSrc: path.join(tempDir, 'omp-src'),
    ompDst: path.join(tempDir, 'omp-dst'),
  };
}

function backup(roots, args = []) {
  return execFileSync(backupAll, args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      PI_AGENT_DIR: roots.piSrc,
      PI_BACKUP_DIR: roots.piDst,
      OMP_CONFIG_ROOT: roots.ompSrc,
      OMP_BACKUP_DIR: roots.ompDst,
    },
  });
}

function makeRoots(prefix) {
  return makeEnv(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

// The git paths need the script to live inside a throwaway repository, because
// backup.sh derives its repo root from its own location. Copying scripts/ into a
// temp repo exercises the real staging/commit logic without touching this repo.
function makeRepoRoots(prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const repo = path.join(tempDir, 'repo');
  fs.mkdirSync(repo, { recursive: true });
  fs.cpSync(path.dirname(backupAll), path.join(repo, 'scripts'), { recursive: true });
  write(path.join(repo, 'README.md'), '# fixture\n');

  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '--initial-branch=main');
  git('config', 'user.email', 'fixture@example.com');
  git('config', 'user.name', 'fixture');
  git('config', 'commit.gpgsign', 'false');
  git('add', '-A');
  git('commit', '-m', 'chore: fixture');

  // Agent sources live outside the repo; only the backup destinations
  // (config/pi/agent, config/omp) are meant to land inside it.
  const roots = makeEnv(tempDir);
  delete roots.piDst;
  delete roots.ompDst;
  return { repo, git, script: path.join(repo, 'scripts', 'backup.sh'), roots };
}

function backupIn(fixture, args = []) {
  return execFileSync(fixture.script, args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      PI_AGENT_DIR: fixture.roots.piSrc,
      OMP_CONFIG_ROOT: fixture.roots.ompSrc,
    },
  });
}

function seedPi(roots) {
  write(path.join(roots.piSrc, 'settings.json'), '{"packages":[]}\n');
  write(path.join(roots.piSrc, 'AGENTS.md'), '# agents\n');
}

function seedOmp(roots) {
  write(path.join(roots.ompSrc, 'agent/config.yml'), 'setupVersion: 1\n');
}

test('backs up both agents when both are configured', () => {
  const roots = makeRoots('backup-both-');
  seedPi(roots);
  seedOmp(roots);

  const out = backup(roots);

  assert.match(out, /^== pi: /m);
  assert.match(out, /^== omp: /m);
  assert.match(out, /Backed up 2 agent config tree\(s\)/);
  assert.ok(fs.existsSync(path.join(roots.piDst, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(roots.ompDst, 'agent/config.yml')));
});

test('skips an agent that is not installed', () => {
  const roots = makeRoots('backup-partial-');
  seedOmp(roots);

  const out = backup(roots);

  assert.match(out, /^-- pi: not configured/m);
  assert.match(out, /^== omp: /m);
  assert.match(out, /Backed up 1 agent config tree\(s\)/);
  assert.equal(fs.existsSync(roots.piDst), false);
});

test('treats an empty config directory as not configured', () => {
  const roots = makeRoots('backup-empty-');
  fs.mkdirSync(roots.piSrc, { recursive: true });
  seedOmp(roots);

  const out = backup(roots);

  assert.match(out, /^-- pi: not configured/m);
  assert.match(out, /Backed up 1 agent config tree\(s\)/);
});

test('an explicit target skips the other agent entirely', () => {
  const roots = makeRoots('backup-target-');
  seedPi(roots);
  seedOmp(roots);

  const out = backup(roots, ['omp']);

  assert.doesNotMatch(out, /pi:/);
  assert.match(out, /Backed up 1 agent config tree\(s\)/);
  assert.equal(fs.existsSync(roots.piDst), false);
});

test('fails when no agent is configured', () => {
  const roots = makeRoots('backup-none-');

  try {
    backup(roots);
    assert.fail('expected a non-zero exit');
  } catch (error) {
    assert.equal(error.status, 1);
    assert.match(error.stderr, /No configured agent found/);
  }
});

test('rejects an unknown target before touching anything', () => {
  const roots = makeRoots('backup-bogus-');
  seedOmp(roots);

  try {
    backup(roots, ['bogus']);
    assert.fail('expected a non-zero exit');
  } catch (error) {
    assert.equal(error.status, 2);
    assert.match(error.stderr, /Unknown argument: bogus/);
    assert.equal(fs.existsSync(roots.ompDst), false);
  }
});

test('one failing agent does not stop the other, and the run exits non-zero', () => {
  const roots = makeRoots('backup-isolate-');
  seedPi(roots);
  seedOmp(roots);
  // Unwritable destination makes only the omp delegate fail.
  roots.ompDst = '/dev/null/unwritable';

  try {
    backup(roots);
    assert.fail('expected a non-zero exit');
  } catch (error) {
    assert.equal(error.status, 1);
    assert.match(error.stderr, /omp backup failed/);
    assert.match(error.stderr, /1 of 2 agent backup\(s\) failed/);
    // pi still completed.
    assert.ok(fs.existsSync(path.join(roots.piDst, 'AGENTS.md')));
  }
});

test('--commit refuses to introduce a previously untracked path', () => {
  const fixture = makeRepoRoots('backup-guard-');
  seedOmp(fixture.roots);

  try {
    backupIn(fixture, ['omp', '--commit']);
    assert.fail('expected a non-zero exit');
  } catch (error) {
    assert.equal(error.status, 3);
    assert.match(error.stderr, /not tracked yet/);
    assert.match(error.stderr, /config\/omp/);
    // Nothing was committed.
    assert.equal(fixture.git('log', '--oneline').trim().split('\n').length, 1);
  }
});

test('--commit --allow-new commits new paths with a convention-compliant message', () => {
  const fixture = makeRepoRoots('backup-new-');
  seedOmp(fixture.roots);

  backupIn(fixture, ['omp', '--commit', '--allow-new']);

  const subject = fixture.git('log', '-1', '--pretty=%s').trim();
  assert.equal(subject, 'chore(agent): update omp environment');
  assert.match(
    fixture.git('show', '--stat', '--oneline', 'HEAD'),
    /config\/omp\/agent\/config\.yml/,
  );
});

test('--commit needs no --allow-new once the paths are tracked', () => {
  const fixture = makeRepoRoots('backup-tracked-');
  seedOmp(fixture.roots);
  backupIn(fixture, ['omp', '--commit', '--allow-new']);

  write(path.join(fixture.roots.ompSrc, 'agent/config.yml'), 'setupVersion: 2\n');
  backupIn(fixture, ['omp', '--commit']);

  assert.equal(fixture.git('log', '--oneline').trim().split('\n').length, 3);
  assert.match(fixture.git('show', 'HEAD:config/omp/agent/config.yml'), /setupVersion: 2/);
});

test('-m overrides the commit message', () => {
  const fixture = makeRepoRoots('backup-msg-');
  seedOmp(fixture.roots);

  backupIn(fixture, ['omp', '--commit', '--allow-new', '-m', 'chore(agent): sync omp only']);

  assert.equal(fixture.git('log', '-1', '--pretty=%s').trim(), 'chore(agent): sync omp only');
});

test('--commit leaves unrelated working-tree changes alone', () => {
  const fixture = makeRepoRoots('backup-scope-');
  seedOmp(fixture.roots);
  write(path.join(fixture.repo, 'README.md'), '# edited by hand\n');

  const out = backupIn(fixture, ['omp', '--commit', '--allow-new']);

  assert.match(out, /other working-tree changes were left uncommitted/);
  assert.match(fixture.git('status', '--porcelain'), /^ M README\.md$/m);
  assert.doesNotMatch(fixture.git('show', '--stat', 'HEAD'), /README\.md/);
});

test('a second --commit with no config change creates no commit', () => {
  const fixture = makeRepoRoots('backup-noop-');
  seedOmp(fixture.roots);
  backupIn(fixture, ['omp', '--commit', '--allow-new']);

  const out = backupIn(fixture, ['omp', '--commit']);

  assert.match(out, /No config changes to commit/);
  assert.equal(fixture.git('log', '--oneline').trim().split('\n').length, 2);
});

test('backup without --commit never touches git', () => {
  const fixture = makeRepoRoots('backup-nogit-');
  seedOmp(fixture.roots);

  const out = backupIn(fixture, ['omp']);

  assert.match(out, /Commit with:/);
  assert.equal(fixture.git('log', '--oneline').trim().split('\n').length, 1);
  assert.match(fixture.git('status', '--porcelain', '--untracked-files=all'), /\?\? config\/omp/);
});
