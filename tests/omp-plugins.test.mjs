import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { scriptPath } from './helpers.mjs';

const ompPlugins = scriptPath('omp-plugins.sh');

function run(...args) {
  return execFileSync(ompPlugins, args, { encoding: 'utf8' });
}

function lines(output) {
  return output.split('\n').filter(Boolean);
}

function write(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function makeBackup(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('reads marketplace sources that omp plugin marketplace add accepts back', () => {
  const backup = makeBackup('omp-plugins-sources-');
  const file = path.join(backup, 'marketplaces.json');

  write(file, {
    version: 1,
    marketplaces: [
      { name: 'claude-official', sourceType: 'github', sourceUri: 'anthropics/claude-plugins' },
      { name: 'local', sourceType: 'local', sourceUri: '/Users/someone/mini' },
      { name: 'broken' },
    ],
  });

  assert.deepEqual(lines(run('sources', file)), [
    'claude-official\tanthropics/claude-plugins',
    'local\t/Users/someone/mini',
  ]);
});

test('reads user-scoped marketplace plugin ids only', () => {
  const backup = makeBackup('omp-plugins-ids-');
  const file = path.join(backup, 'installed_plugins.json');

  write(file, {
    version: 2,
    plugins: {
      'code-review@claude-official': [{ scope: 'user', version: '1.0.0' }],
      'repo-only@claude-official': [{ scope: 'project', version: '1.0.0' }],
      'both@claude-official': [{ scope: 'project' }, { scope: 'user' }],
      'legacy@claude-official': [{ version: '0.1.0' }],
    },
  });

  assert.deepEqual(lines(run('ids', file)), [
    'code-review@claude-official',
    'both@claude-official',
    'legacy@claude-official',
  ]);
});

test('turns npm/git dependencies into installable specs', () => {
  const backup = makeBackup('omp-plugins-npm-');
  const pkg = path.join(backup, 'package.json');
  const lock = path.join(backup, 'omp-plugins.lock.json');

  write(pkg, {
    name: 'omp-plugins',
    private: true,
    dependencies: {
      exact: '1.2.3',
      ranged: '^2.0.1',
      unpinnable: '~3.0.0',
      fromGit: 'github:someone/omp-plugin#main',
      fromUrl: 'https://github.com/someone/other.git',
      linked: 'file:/Users/someone/dev/local-plugin',
    },
  });
  write(lock, {
    plugins: {
      ranged: { version: '2.0.1', enabled: true },
      unpinnable: { version: 'workspace', enabled: true },
    },
    settings: {},
  });

  assert.deepEqual(lines(run('npm-specs', pkg, lock)), [
    'exact\texact@1.2.3',
    'ranged\tranged@2.0.1',
    'unpinnable\tunpinnable',
    'fromGit\tgithub:someone/omp-plugin#main',
    'fromUrl\thttps://github.com/someone/other.git',
    'linked\t/Users/someone/dev/local-plugin',
  ]);
});

test('plans marketplaces, marketplace plugins, and npm plugins together', () => {
  const backup = makeBackup('omp-plugins-plan-');

  write(path.join(backup, 'marketplaces.json'), {
    version: 1,
    marketplaces: [{ name: 'claude-official', sourceUri: 'anthropics/claude-plugins' }],
  });
  write(path.join(backup, 'plugins/installed_plugins.json'), {
    version: 2,
    plugins: { 'code-review@claude-official': [{ scope: 'user' }] },
  });
  write(path.join(backup, 'plugins/package.json'), {
    dependencies: { 'omp-thing': '1.0.0' },
  });

  assert.deepEqual(lines(run('plan', backup)), [
    'marketplace\tclaude-official\tanthropics/claude-plugins',
    'plugin\tcode-review@claude-official\tcode-review@claude-official',
    'package\tomp-thing\tomp-thing@1.0.0',
  ]);
});

test('an empty backup plans nothing and needs no omp binary', () => {
  const backup = makeBackup('omp-plugins-empty-');

  assert.equal(run('plan', backup), '');
  assert.match(run('restore', backup), /nothing to restore/);
  assert.match(run('status', backup), /^OK: no omp plugins recorded/);
});
