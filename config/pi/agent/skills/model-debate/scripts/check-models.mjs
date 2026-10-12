#!/usr/bin/env node
// Report (and optionally apply) newer models for the model-debate panelist agents.
//
// A model's family is its catalog display name with the version replaced by a wildcard
// ("Claude Opus 5.5" -> "Claude Opus {v}", "GPT-6.1-Sol" -> "GPT-{v}-Sol"). A candidate
// must come from the same provider, match that family exactly (so "1M", "Fast", "500k"
// variants and other tiers are excluded), and support the agent's thinking level.
//
// Usage: check-models.mjs [--apply] [--agents-dir <dir>]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const AGENTS = ['debate-opus', 'debate-grok', 'debate-gpt'];
const VERSION = /\d+(?:\.\d+)*/;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dirIndex = args.indexOf('--agents-dir');
const agentsDir = dirIndex >= 0 ? args[dirIndex + 1] : join(homedir(), '.omp/agent/agents');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const catalogCache = new Map();
function catalog(provider) {
  if (!catalogCache.has(provider)) {
    const out = execFileSync('omp', ['models', provider, '--json'], { encoding: 'utf8' });
    const models = JSON.parse(out).models.filter((m) => m.provider === provider && m.kind === 'chat');
    catalogCache.set(provider, models);
  }
  return catalogCache.get(provider);
}

function frontmatterField(text, key) {
  return text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
}

const results = [];
for (const agent of AGENTS) {
  const file = join(agentsDir, `${agent}.md`);
  const text = readFileSync(file, 'utf8');
  const selector = frontmatterField(text, 'model');
  const thinking = frontmatterField(text, 'thinking-level');
  const [provider, id] = selector.split('/');
  const models = catalog(provider);
  const current = models.find((m) => m.id === id);
  if (!current) {
    results.push({ agent, current: selector, status: 'missing', note: 'current model not in catalog' });
    continue;
  }
  const currentVersion = current.name.match(VERSION)?.[0];
  if (!currentVersion) {
    results.push({ agent, current: selector, status: 'unparsed', note: `no version in "${current.name}"` });
    continue;
  }
  const family = new RegExp(`^${current.name.split(currentVersion).map(escapeRegex).join('(\\d+(?:\\.\\d+)*)')}$`);
  const candidates = models
    .map((m) => ({ model: m, version: m.name.match(family)?.[1] }))
    .filter(({ model, version }) => version && (!thinking || model.thinking?.includes(thinking)))
    // Newest version first; for equal versions prefer the shortest (undated alias) id.
    .sort((a, b) => compareVersions(b.version, a.version) || a.model.id.length - b.model.id.length);
  const latest = candidates[0];
  if (!latest || compareVersions(latest.version, currentVersion) <= 0) {
    results.push({ agent, current: selector, status: 'up-to-date' });
    continue;
  }
  const next = `${provider}/${latest.model.id}`;
  results.push({ agent, current: selector, latest: next, latestName: latest.model.name, status: 'update-available' });
  if (apply) {
    writeFileSync(file, text.replace(/^model:.*$/m, `model: ${next}`));
    results.at(-1).status = 'updated';
  }
}

console.log(JSON.stringify({ agentsDir, results }, null, 2));
