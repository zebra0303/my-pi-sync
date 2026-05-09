#!/usr/bin/env node
/* global console, process, URL */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [src, dst] = process.argv.slice(2);

if (!src || !dst) {
  console.error('Usage: backup-installed-themes.mjs <pi-config-source> <backup-destination>');
  process.exit(1);
}

const settingsPath = path.join(src, 'settings.json');
const targetDir = path.join(dst, 'themes');

if (!fs.existsSync(settingsPath)) {
  process.exit(0);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const packageEntries = Array.isArray(settings.packages) ? settings.packages : [];
const packageRoots = new Map();
let npmRoot;

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function stripGitRef(repoPath) {
  return repoPath.replace(/@[^/@]+$/, '').replace(/\.git$/, '');
}

function resolveGitSource(source) {
  const raw = source.startsWith('git:') ? source.slice(4) : source;
  let host;
  let repoPath;

  const sshShorthand = raw.match(/^git@([^:]+):(.+)$/);
  if (sshShorthand) {
    [, host, repoPath] = sshShorthand;
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    const url = new URL(raw);
    host = url.hostname;
    repoPath = url.pathname.replace(/^\/+/, '');
  } else {
    const [first, ...rest] = raw.split('/');
    host = first;
    repoPath = rest.join('/');
  }

  if (!host || !repoPath) {
    return undefined;
  }

  return path.join(src, 'git', host, stripGitRef(repoPath));
}

function npmPackageName(source) {
  const spec = source.slice('npm:'.length);
  if (spec.startsWith('@')) {
    const [scope, nameWithVersion] = spec.split('/');
    if (!scope || !nameWithVersion) {
      return undefined;
    }

    return `${scope}/${nameWithVersion.replace(/@.*$/, '')}`;
  }

  return spec.replace(/@.*$/, '');
}

function resolveNpmSource(source) {
  if (!npmRoot) {
    try {
      npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    } catch {
      return undefined;
    }
  }

  const packageName = npmPackageName(source);
  return packageName ? path.join(npmRoot, packageName) : undefined;
}

function resolveLocalSource(source) {
  if (source.startsWith('/')) {
    return source;
  }

  if (source.startsWith('./') || source.startsWith('../')) {
    return path.resolve(src, source);
  }

  return undefined;
}

function sourceFromEntry(entry) {
  if (typeof entry === 'string') {
    return entry;
  }

  if (entry && typeof entry === 'object' && typeof entry.source === 'string') {
    return entry.source;
  }

  return undefined;
}

function resolvePackageRoot(source) {
  if (source.startsWith('npm:')) {
    return resolveNpmSource(source);
  }

  if (
    source.startsWith('git:') ||
    source.startsWith('git@') ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(source)
  ) {
    return resolveGitSource(source);
  }

  return resolveLocalSource(source);
}

function collectJsonFiles(dir, recursive = false) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      files.push(...collectJsonFiles(entryPath, true));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }

  return files;
}

function globBase(pattern) {
  const globIndex = pattern.search(/[!*?[{]/);
  if (globIndex === -1) {
    return pattern;
  }

  const slashIndex = pattern.slice(0, globIndex).lastIndexOf('/');
  return slashIndex === -1 ? '.' : pattern.slice(0, slashIndex);
}

function themeFilesFromPackage(packageRoot) {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const themeEntries = Array.isArray(packageJson.pi?.themes) ? packageJson.pi.themes : undefined;

  if (!themeEntries) {
    return collectJsonFiles(path.join(packageRoot, 'themes'));
  }

  const files = [];
  for (const entry of themeEntries) {
    if (typeof entry !== 'string' || entry.startsWith('!') || entry.startsWith('-')) {
      continue;
    }

    const themePath = entry.startsWith('+') ? entry.slice(1) : entry;
    const absolutePath = path.resolve(packageRoot, themePath);

    if (/[!*?[{]/.test(themePath)) {
      files.push(...collectJsonFiles(path.resolve(packageRoot, globBase(themePath)), true));
    } else if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
      files.push(...collectJsonFiles(absolutePath));
    } else if (fs.existsSync(absolutePath) && absolutePath.endsWith('.json')) {
      files.push(absolutePath);
    }
  }

  return files;
}

for (const entry of packageEntries) {
  const source = sourceFromEntry(entry);
  if (!source) {
    continue;
  }

  const root = resolvePackageRoot(source);
  if (root && fs.existsSync(root)) {
    packageRoots.set(root, source);
  }
}

if (packageRoots.size === 0) {
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

let copiedCount = 0;
for (const [packageRoot, source] of packageRoots) {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const packageName = packageJson.name || path.basename(packageRoot);

  for (const themeFile of themeFilesFromPackage(packageRoot)) {
    const themeContent = fs.readFileSync(themeFile, 'utf8');
    let targetPath = path.join(targetDir, path.basename(themeFile));
    if (fs.existsSync(targetPath) && fs.readFileSync(targetPath, 'utf8') !== themeContent) {
      targetPath = path.join(targetDir, `${safeName(packageName)}-${path.basename(themeFile)}`);
    }

    fs.writeFileSync(targetPath, themeContent);
    copiedCount += 1;
    console.log(`Backed up installed theme from ${source}: ${path.relative(dst, targetPath)}`);
  }
}

if (copiedCount > 0) {
  console.log(`Backed up ${copiedCount} installed package theme file(s) to ${targetDir}`);
}
