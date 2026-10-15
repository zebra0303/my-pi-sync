#!/usr/bin/env node
// Live pixel-art stage for a model-debate run. Watches the debate folder and streams
// what each panelist wrote to a browser page where Geppetto (GPT), Clark (Claude Opus)
// and Rocky (Grok) act it out as speech bubbles.
//
// Usage: debate-stage.mjs <debate-dir> [--port <n>] [--no-open]
import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const PANELISTS = [
  { id: 'debate-gpt', name: 'Geppetto', alias: /\b(?:geppetto|gpt)\b/gi },
  { id: 'debate-opus', name: 'Clark', alias: /\b(?:clark|claude|opus)\b/gi },
  { id: 'debate-grok', name: 'Rocky', alias: /\b(?:rocky|grok)\b/gi },
];
const PANELIST_FILE = /^(r|review)(\d+)-(debate-(?:gpt|opus|grok))\.md$/;
const POLL_MS = 1000;
const MAX_LINES = 4;
const MAX_CHARS = 140;

const args = process.argv.slice(2);
const dirArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
if (!dirArg) {
  console.error('Usage: debate-stage.mjs <debate-dir> [--port <n>] [--no-open]');
  process.exit(1);
}
const debateDir = resolve(dirArg);
if (!statSync(debateDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`Not a directory: ${debateDir}`);
  process.exit(1);
}
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 0;
const page = readFileSync(new URL('./debate-stage.html', import.meta.url), 'utf8');

// "Grok 4.7 Fast, medium" from the agent's pinned `model:` / `thinking-level:` and the omp
// catalog display name; falls back to the raw selector when the catalog is unavailable.
const catalogs = new Map();
function modelLabel(agentId) {
  let text;
  try {
    text = readFileSync(join(homedir(), '.omp/agent/agents', `${agentId}.md`), 'utf8');
  } catch {
    return null;
  }
  const field = (key) => text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
  const selector = field('model');
  const thinking = field('thinking-level');
  if (!selector) return null;
  const [provider, id] = selector.split('/');
  let name = selector;
  try {
    if (!catalogs.has(provider)) {
      catalogs.set(provider, JSON.parse(execFileSync('omp', ['models', provider, '--json'], { encoding: 'utf8' })).models);
    }
    name = catalogs.get(provider).find((m) => m.provider === provider && m.id === id)?.name ?? selector;
  } catch {
    catalogs.set(provider, []);
  }
  return thinking ? `${name}, ${thinking}` : name;
}
const models = Object.fromEntries(PANELISTS.map((p) => [p.id, modelLabel(p.id)]));

const BULLET = /^(?:[-*+]|\d+[.)])\s+\S/;
const TLDR = /^(?:>\s*)?(?:\*\*)?(?:TL;DR|요약)(?:\*\*)?\s*[:：]\s*/i;

function clean(line) {
  return line
    .replace(/^\s*(?:>\s*)?(?:[-*+]|\d+[.)]|#+)?\s*/, '')
    .replace(TLDR, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const clip = (s) => (s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS - 1)}…` : s);

// TL;DR line first, then top-level bullets; fall back to the first prose paragraph.
function extractLines(text) {
  const raw = text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const lines = [];
  const push = (line) => {
    const c = clean(line);
    if (c.length >= 4 && !lines.includes(c)) lines.push(c);
  };
  const tldr = raw.find((l) => TLDR.test(l.trim()));
  if (tldr) push(tldr.trim());
  let inFence = false;
  for (const l of raw) {
    if (l.trimStart().startsWith('```')) inFence = !inFence;
    if (inFence || lines.length >= MAX_LINES) continue;
    if (BULLET.test(l)) push(l);
  }
  if (!lines.length) {
    const para = raw.map((l) => l.trim()).find((l) => l && !/^(?:#|\||```|---)/.test(l));
    if (para) push(para);
  }
  return lines.slice(0, MAX_LINES).map(clip);
}

// The other panelist a piece of text addresses most, or null.
function mentionedPanelist(text, selfId) {
  let best = null;
  let bestCount = 0;
  for (const p of PANELISTS) {
    if (p.id === selfId) continue;
    const count = text.match(p.alias)?.length ?? 0;
    if (count > bestCount) [best, bestCount] = [p.id, count];
  }
  return best;
}

const phaseLabel = (kind, n) => (kind === 'r' ? `Round ${n}` : `Review ${n}`);
// Workflow order: brief → r1..r3 → synthesis → review1..2.
const phaseOrder = (kind, n) => (kind === 'r' ? n : 10 + n);

const SEVERITY = /^\[(critical|major|minor)\]\s*/i;

// Review files: `TL;DR:` verdict, then `- [severity] location — issue → fix` bullets.
function parseReview(text) {
  const raw = text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const tldr = raw.find((l) => TLDR.test(l.trim()));
  const findings = raw
    .filter((l) => BULLET.test(l))
    .map((l) => clean(l))
    .map((l) => {
      const severity = l.match(SEVERITY)?.[1].toLowerCase() ?? null;
      return { severity, text: l.replace(SEVERITY, '') };
    });
  return { verdict: tldr ? clean(tldr.trim()) : '', findings };
}

function snapshot() {
  const files = readdirSync(debateDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ f, mtime: statSync(resolve(debateDir, f)).mtimeMs }));
  const read = (f) => readFileSync(resolve(debateDir, f), 'utf8');
  const events = [];
  let topic = '';
  let synthesis = null;
  const reviews = [];
  let phase = { order: -1, label: 'Waiting for brief', kind: null, n: 0 };
  for (const { f, mtime } of files) {
    if (f === 'brief.md') {
      const text = read(f);
      const heading = text.split('\n').find((l) => /^#\s/.test(l)) ?? text.split('\n').find((l) => l.trim());
      topic = clip(clean(heading ?? ''));
      events.push({ key: f, order: 0, mtime, speaker: null, label: 'Brief', lines: [{ text: topic || 'Brief ready' }] });
      if (phase.order < 0) phase = { order: 0, label: 'Preparing Round 1', kind: 'brief', n: 0 };
      continue;
    }
    if (f === 'synthesis.md') {
      synthesis = read(f);
      events.push({ key: f, order: 10, mtime, speaker: null, label: 'Synthesis', lines: extractLines(synthesis).map((text) => ({ text })) });
      if (phase.order < 10) phase = { order: 10, label: 'Synthesis · drafting', kind: 'synthesis', n: 0 };
      continue;
    }
    const m = f.match(PANELIST_FILE);
    if (!m) continue;
    const [, kind, nStr, agent] = m;
    const n = Number(nStr);
    const order = phaseOrder(kind, n);
    const text = read(f);
    const critique = !(kind === 'r' && n === 1);
    const fileTarget = critique ? mentionedPanelist(text, agent) : null;
    const lines = extractLines(text).map((line) => ({
      text: line,
      target: critique ? (mentionedPanelist(line, agent) ?? fileTarget) : null,
    }));
    if (kind === 'review') reviews.push({ round: n, speaker: agent, ...parseReview(text) });
    events.push({ key: f, order, mtime, speaker: agent, label: phaseLabel(kind, n), lines });
    if (order > phase.order) phase = { order, label: phaseLabel(kind, n), kind, n };
  }
  events.sort((a, b) => a.order - b.order || a.mtime - b.mtime);

  let thinking = [];
  if (phase.kind === 'brief') thinking = PANELISTS.map((p) => p.id);
  if (phase.kind === 'r' || phase.kind === 'review') {
    const prefix = phase.kind === 'r' ? `r${phase.n}-` : `review${phase.n}-`;
    thinking = PANELISTS.map((p) => p.id).filter((id) => !files.some(({ f }) => f === `${prefix}${id}.md`));
    if (!thinking.length) phase.label += ' done';
  }
  return {
    dir: debateDir,
    topic,
    phase: phase.label,
    thinking,
    panelists: PANELISTS.map(({ id, name }) => ({ id, name, model: models[id] })),
    events: events.map(({ key, speaker, label, lines }) => ({ key, speaker, label, lines })),
    synthesis,
    reviews: reviews.sort((a, b) => a.round - b.round || PANELISTS.findIndex((p) => p.id === a.speaker) - PANELISTS.findIndex((p) => p.id === b.speaker)),
  };
}

const clients = new Set();
let current = JSON.stringify(snapshot());
const send = (res, data) => res.write(`event: state\ndata: ${data}\n\n`);

setInterval(() => {
  let next;
  try {
    next = JSON.stringify(snapshot());
  } catch (err) {
    // A file can vanish or be mid-write between readdir and read; retry next tick.
    if (err.code !== 'ENOENT') console.error(err.message);
    return;
  }
  if (next === current) return;
  current = next;
  for (const res of clients) send(res, current);
}, POLL_MS);

setInterval(() => {
  for (const res of clients) res.write(': keepalive\n\n');
}, 15000);

const server = createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    clients.add(res);
    send(res, current);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
    return;
  }
  res.writeHead(404).end();
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Debate stage: ${url} (watching ${debateDir})`);
  if (args.includes('--no-open')) return;
  const opener = { darwin: 'open', win32: 'explorer' }[process.platform] ?? 'xdg-open';
  spawn(opener, [url], { stdio: 'ignore', detached: true })
    .on('error', () => console.error(`Could not launch a browser; open ${url} manually.`))
    .unref();
});
