import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'backup-installed-themes.mjs',
);

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTheme(filePath, name) {
  writeJson(filePath, {
    name,
    colors: {},
  });
}

test('backs up theme files declared by installed package settings', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-theme-backup-'));
  const src = path.join(tempDir, 'src');
  const dst = path.join(tempDir, 'dst');
  const packageRoot = path.join(src, 'git/github.com/example/pi-themes');

  writeJson(path.join(src, 'settings.json'), {
    packages: ['git:github.com/example/pi-themes'],
  });
  writeJson(path.join(packageRoot, 'package.json'), {
    name: 'pi-themes',
    pi: {
      themes: ['./themes/mocha.json'],
    },
  });
  writeTheme(path.join(packageRoot, 'themes/mocha.json'), 'mocha');

  execFileSync('node', [scriptPath, src, dst], { encoding: 'utf8' });

  assert.equal(
    fs.readFileSync(path.join(dst, 'themes/mocha.json'), 'utf8'),
    fs.readFileSync(path.join(packageRoot, 'themes/mocha.json'), 'utf8'),
  );
});
