import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';

import { scriptPath } from './helpers.mjs';

const backupOmp = scriptPath('backup-omp.sh');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function backup(src, dst) {
  return execFileSync(backupOmp, {
    encoding: 'utf8',
    env: { ...process.env, OMP_CONFIG_ROOT: src, OMP_BACKUP_DIR: dst },
  });
}

function makeRoots(prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return { src: path.join(tempDir, 'src'), dst: path.join(tempDir, 'dst') };
}

test('copies allowlisted omp config files and directories', () => {
  const { src, dst } = makeRoots('omp-backup-');

  write(path.join(src, 'agent/config.yml'), 'theme:\n  dark: titanium\n');
  write(path.join(src, 'agent/keybindings.yml'), 'app.model.cycleForward: Ctrl+P\n');
  write(path.join(src, 'agent/skills/demo/SKILL.md'), '# demo\n');
  write(path.join(src, 'plugins/installed_plugins.json'), '{"version":2}\n');

  backup(src, dst);

  assert.equal(
    fs.readFileSync(path.join(dst, 'agent/config.yml'), 'utf8'),
    'theme:\n  dark: titanium\n',
  );
  assert.ok(fs.existsSync(path.join(dst, 'agent/keybindings.yml')));
  assert.equal(fs.readFileSync(path.join(dst, 'agent/skills/demo/SKILL.md'), 'utf8'), '# demo\n');
  assert.ok(fs.existsSync(path.join(dst, 'plugins/installed_plugins.json')));
});

test('never copies secrets or volatile state', () => {
  const { src, dst } = makeRoots('omp-backup-secrets-');

  write(path.join(src, 'agent/config.yml'), 'setupVersion: 1\n');
  // Not on the allowlist at all.
  write(path.join(src, 'agent/.env'), 'ANTHROPIC_API_KEY=sk-live\n');
  write(path.join(src, 'agent/secrets.yml'), 'secrets: []\n');
  write(path.join(src, 'agent/agent.db'), 'sqlite');
  write(path.join(src, 'install-id'), 'b495f7fa\n');
  write(path.join(src, 'agent/sessions/proj/a.jsonl'), '{}\n');
  // Inside an allowlisted directory: must still be filtered out.
  write(path.join(src, 'agent/skills/demo/.env'), 'TOKEN=leak\n');
  write(path.join(src, 'agent/extensions/cache.db'), 'sqlite');

  backup(src, dst);

  for (const leaked of [
    'agent/.env',
    'agent/secrets.yml',
    'agent/agent.db',
    'install-id',
    'agent/sessions',
    'agent/skills/demo/.env',
    'agent/extensions/cache.db',
  ]) {
    assert.equal(fs.existsSync(path.join(dst, leaked)), false, `${leaked} must not be backed up`);
  }

  assert.ok(fs.existsSync(path.join(dst, 'agent/config.yml')));
});

test('prunes backup entries that disappeared from the omp config root', () => {
  const { src, dst } = makeRoots('omp-backup-prune-');

  write(path.join(src, 'agent/config.yml'), 'setupVersion: 1\n');
  write(path.join(src, 'agent/mcp.json'), '{"mcpServers":{}}\n');
  write(path.join(src, 'agent/themes/custom.json'), '{"name":"custom"}\n');

  backup(src, dst);
  assert.ok(fs.existsSync(path.join(dst, 'agent/mcp.json')));
  assert.ok(fs.existsSync(path.join(dst, 'agent/themes/custom.json')));

  fs.rmSync(path.join(src, 'agent/mcp.json'));
  fs.rmSync(path.join(src, 'agent/themes'), { recursive: true });

  backup(src, dst);

  assert.equal(fs.existsSync(path.join(dst, 'agent/mcp.json')), false);
  assert.equal(fs.existsSync(path.join(dst, 'agent/themes')), false);
  assert.ok(fs.existsSync(path.join(dst, 'agent/config.yml')));
});

test('mirrors deletions inside an allowlisted directory', () => {
  const { src, dst } = makeRoots('omp-backup-mirror-');

  write(path.join(src, 'agent/config.yml'), 'setupVersion: 1\n');
  write(path.join(src, 'agent/skills/keep/SKILL.md'), '# keep\n');
  write(path.join(src, 'agent/skills/drop/SKILL.md'), '# drop\n');

  backup(src, dst);
  assert.ok(fs.existsSync(path.join(dst, 'agent/skills/drop/SKILL.md')));

  fs.rmSync(path.join(src, 'agent/skills/drop'), { recursive: true });
  backup(src, dst);

  assert.equal(fs.existsSync(path.join(dst, 'agent/skills/drop')), false);
  assert.ok(fs.existsSync(path.join(dst, 'agent/skills/keep/SKILL.md')));
});

test('fails when the omp config root is missing', () => {
  const { src, dst } = makeRoots('omp-backup-missing-');

  assert.throws(() => backup(src, dst), /No omp config directory found/);
});
