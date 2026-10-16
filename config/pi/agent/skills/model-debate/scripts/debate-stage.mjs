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
// Round 2+ first bullet: `입장: 유지|수정|철회 — 이유` (or `Stance: keep|revise|withdraw`). Shown as a
// badge, not as a bubble line. Trailing punctuation such as `수정(부분)` or `유지.` is allowed.
const STANCE = /^(?:입장|stance)\s*[:：]\s*(유지|수정|철회|keep|revise|withdraw)(?:한다|합니다|함)?(?=$|[\s—–\-.,:;(])[\s—–\-.,:;]*(.*)$/i;
const STANCE_KIND = { 유지: 'keep', 수정: 'revise', 철회: 'withdraw', keep: 'keep', revise: 'revise', withdraw: 'withdraw' };
// Without status.json, a panelist file plays only after it stopped changing for this long.
const SETTLE_MS = 3000;

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
  let stance = null;
  const push = (line) => {
    const c = clean(line);
    const s = c.match(STANCE);
    if (s) {
      stance ??= { kind: STANCE_KIND[s[1].toLowerCase()], reason: clip(s[2].trim()) };
      return;
    }
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
  return { lines: lines.slice(0, MAX_LINES).map(clip), stance };
}

// The answer's one-line summary: its TL;DR line if it has one, else its first prose paragraph
// (headings, tables, fences and bullets skipped), e.g. "Pick: Rosé … — the strongest …".
function answerSummary(text) {
  const raw = text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n').map((l) => l.trim());
  const line = raw.find((l) => TLDR.test(l)) ?? raw.find((l) => l && !/^(?:#|\||```|---|>)/.test(l) && !BULLET.test(l));
  return line ? clip(clean(line)) : null;
}

const NICKNAMES = Object.fromEntries(PANELISTS.map((p) => [p.name.toLowerCase(), p.id]));
const FACT = /^\s*[-*]\s*(?:\*\*)?\[?(F\d+)\]?(?:\*\*)?\s*\[(verified|refuted|open)\]\s*(.+)$/i;

// facts.md rows: `- F1 [verified|refuted|open] 주장 — 출처: … — "원문" — 범위: … — 제기: 닉네임`.
function parseFacts(text) {
  const facts = [];
  for (const line of text.split('\n')) {
    const m = line.match(FACT);
    if (!m) continue;
    const [, id, status, rest] = m;
    // Take the quote out first so a dash inside it cannot split the fields.
    const quote = rest.match(/["“]([^"”]+)["”]/)?.[1] ?? '';
    const parts = rest
      .replace(/(?:원문\s*[:：]\s*)?["“][^"”]+["”]/, '')
      .split(/\s*[—–]\s*|\s+-\s+/)
      .map((p) => p.trim().replace(/^[—–-]\s*/, ''))
      .filter(Boolean);
    const field = (name) => parts.map((p) => p.match(new RegExp(`^${name}\\s*[:：]\\s*(.*)$`))?.[1]).find((v) => v !== undefined)?.trim() ?? '';
    const raiser = field('제기').split(/[^\p{L}]+/u).map((n) => NICKNAMES[n.toLowerCase()]).find(Boolean) ?? null;
    // `이전: open` (or `was: open`) records the status before a recheck, so the change can be shown.
    const was = (field('이전') || field('was')).toLowerCase().match(/verified|refuted|open/)?.[0] ?? null;
    facts.push({ id: id.toUpperCase(), status: status.toLowerCase(), was, claim: clean(parts[0]), source: field('출처'), quote, scope: field('범위'), raiser });
  }
  return facts;
}

// status.json, written by the orchestrator at dispatch, completion and retry:
// { "round": "r2" | "review1", "panels": { "debate-gpt": { "state": "running", "startedAt": "<ISO>", "attempt": 1 } } }
// A half-written file keeps the last good status instead of falling back to the no-status rules.
let lastStatus = null;
function readStatus() {
  let raw;
  try {
    raw = readFileSync(resolve(debateDir, 'status.json'), 'utf8');
  } catch {
    return (lastStatus = null);
  }
  try {
    const s = JSON.parse(raw);
    const m = String(s.round ?? '').match(/^(r|review)(\d+)$/);
    lastStatus = m ? { round: s.round, kind: m[1], n: Number(m[2]), panels: s.panels ?? {} } : null;
  } catch {
    // keep lastStatus
  }
  return lastStatus;
}

// Same shape the orchestrator's success check uses: TL;DR first, at least one top-level bullet.
function isFinal(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const first = body.split('\n').find((l) => l.trim());
  return Boolean(first && TLDR.test(first.trim())) && /^- \S/m.test(body);
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

const FACT_MARK = { verified: '✓ VERIFIED', refuted: '✗ REFUTED', open: '? OPEN' };

function snapshot() {
  const now = Date.now();
  const files = readdirSync(debateDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ f, mtime: statSync(resolve(debateDir, f)).mtimeMs }));
  const read = (f) => readFileSync(resolve(debateDir, f), 'utf8');
  // status.json only gates the round it names. Once a later phase has files (e.g. synthesis.md),
  // a status the orchestrator forgot to finish no longer holds earlier files back.
  const fileOrder = (f) => {
    if (f === 'brief.md') return 0;
    if (f === 'synthesis.md') return 10;
    const m = f.match(PANELIST_FILE);
    return m ? phaseOrder(m[1], Number(m[2])) : -1;
  };
  const latestFile = Math.max(-1, ...files.map(({ f }) => fileOrder(f)));
  const rawStatus = readStatus();
  const status = rawStatus && latestFile <= phaseOrder(rawStatus.kind, rawStatus.n) ? rawStatus : null;
  const events = [];
  let topic = '';
  let synthesis = null;
  let answer = null;
  let answerMtime = 0;
  let facts = [];
  const reviews = [];
  let phase = { order: -1, kind: null, n: 0 };
  const advance = (order, kind, n) => {
    if (order > phase.order) phase = { order, kind, n };
  };
  for (const { f, mtime } of files) {
    if (f === 'brief.md') {
      const text = read(f);
      const heading = text.split('\n').find((l) => /^#\s/.test(l)) ?? text.split('\n').find((l) => l.trim());
      topic = clip(clean(heading ?? ''));
      events.push({ key: f, order: 0, mtime, speaker: null, label: 'Brief', lines: [{ text: topic || 'Brief ready' }] });
      advance(0, 'brief', 0);
      continue;
    }
    if (f === 'answer.md') {
      answer = read(f);
      answerMtime = mtime;
      continue;
    }
    if (f === 'synthesis.md') {
      synthesis = read(f);
      const { lines } = extractLines(synthesis);
      events.push({ key: f, order: 10, mtime, speaker: null, label: 'Synthesis', lines: lines.map((text) => ({ text })) });
      advance(10, 'synthesis', 0);
      continue;
    }
    if (f === 'facts.md') {
      facts = parseFacts(read(f));
      for (const fact of facts) {
        events.push({
          key: `${f}#${fact.id}:${fact.status}:${fact.claim}`,
          order: 1.5,
          mtime,
          speaker: null,
          label: 'Fact check',
          lines: [
            {
              text: clip(`${FACT_MARK[fact.status]} ${fact.id}${fact.was && fact.was !== fact.status ? ` · ${fact.was} → ${fact.status}` : ''} · ${fact.claim}`),
              target: fact.status === 'refuted' ? fact.raiser : null,
            },
          ],
        });
      }
      continue;
    }
    const m = f.match(PANELIST_FILE);
    if (!m) continue;
    const [, kind, nStr, agent] = m;
    const n = Number(nStr);
    const order = phaseOrder(kind, n);
    advance(order, kind, n);
    // Play a panelist file only once it is final: TL;DR plus bullets, and either marked completed
    // in status.json for the current round or (older rounds / no status.json) unchanged for SETTLE_MS.
    const live = status && status.kind === kind && status.n === n;
    const panel = live && status.panels[agent];
    const ready = panel ? panel.state === 'completed' : now - mtime >= SETTLE_MS;
    if (!ready) continue;
    const text = read(f);
    if (!isFinal(text)) continue;
    const critique = !(kind === 'r' && n === 1);
    const fileTarget = critique ? mentionedPanelist(text, agent) : null;
    const { lines, stance } = extractLines(text);
    if (kind === 'review') reviews.push({ round: n, speaker: agent, ...parseReview(text) });
    events.push({
      key: f,
      order,
      mtime,
      speaker: agent,
      label: phaseLabel(kind, n),
      stance: critique ? stance : null,
      lines: lines.map((line) => ({ text: line, target: critique ? (mentionedPanelist(line, agent) ?? fileTarget) : null })),
    });
  }
  if (status) advance(phaseOrder(status.kind, status.n), status.kind, status.n);
  events.sort((a, b) => a.order - b.order || a.mtime - b.mtime);

  let thinking = [];
  let panelStatus = {};
  if (phase.kind === 'brief') thinking = PANELISTS.map((p) => p.id);
  if (phase.kind === 'r' || phase.kind === 'review') {
    const prefix = phase.kind === 'r' ? `r${phase.n}-` : `review${phase.n}-`;
    const live = status && status.kind === phase.kind && status.n === phase.n;
    if (live) panelStatus = status.panels;
    thinking = PANELISTS.map((p) => p.id).filter((id) =>
      live ? ['running', 'retrying'].includes(status.panels[id]?.state) : !events.some((e) => e.key === `${prefix}${id}.md`),
    );
  }
  // Grogu returns with the final answer only after the last review round is done and answer.md
  // has stopped changing, so the ending never plays before the reviews (or mid-revision).
  if (answer && phase.kind === 'review' && !thinking.length && now - answerMtime >= SETTLE_MS) {
    const summary = answerSummary(answer);
    if (summary) events.push({ key: 'answer.md', order: 30, mtime: answerMtime, speaker: null, label: 'Final Answer', lines: [{ text: summary }] });
  }
  return {
    dir: debateDir,
    topic,
    thinking,
    status: panelStatus,
    panelists: PANELISTS.map(({ id, name }) => ({ id, name, model: models[id] })),
    events: events.map(({ key, speaker, label, lines, stance }) => ({ key, speaker, label, lines, stance: stance ?? null })),
    synthesis,
    answer,
    facts,
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
