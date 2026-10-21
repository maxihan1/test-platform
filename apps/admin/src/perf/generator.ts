// 트랜잭션 목록 · 부하 설정으로 k6 스크립트를 만든다 — 사람도 AI 도 스크립트를 직접 쓰지 않는다 (도메인/성능 §3.9 「스크립트는 생성기가 만든다」)
// 사람이 쓴 값은 전부 JSON 글자로만 넣는다 — 스크립트 코드 자리에 끼어들지 못하게

import type { Load, Transaction } from './types.js';

export interface GenerateInput {
  transactions: Transaction[];
  load: Load;
  // 스모크 테스트는 가상 사용자 1명 · 60초 (§3.9 「스모크 테스트」)
  smoke: boolean;
  allowedHosts: string[];
  maxVus: number;
}

export function totalDuration(load: Load): number {
  return load.stages.reduce((s, x) => s + x.durationSec, 0);
}

function scenarioOptions(input: GenerateInput): unknown {
  if (input.smoke) return { executor: 'constant-vus', vus: 1, duration: '60s' };
  const stages = input.load.stages.map((s) => ({ duration: `${s.durationSec}s`, target: s.target }));
  if (input.load.basis === 'VUS') return { executor: 'ramping-vus', startVUs: 0, stages, gracefulRampDown: '5s' };
  // 한 번 돌기 = 트랜잭션 n 개라 timeUnit 을 n 초로 두면 목표가 초당 요청 수(TPS)가 된다
  return {
    executor: 'ramping-arrival-rate',
    startRate: 0,
    timeUnit: `${Math.max(1, input.transactions.length)}s`,
    preAllocatedVUs: Math.min(input.maxVus, 50),
    maxVUs: input.maxVus,
    stages,
  };
}

export function generateScript(input: GenerateInput): string {
  const options = { scenarios: { main: scenarioOptions(input) }, summaryTrendStats: [] };
  return `import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

const TX = ${JSON.stringify(input.transactions)};
const ALLOWED = ${JSON.stringify(input.allowedHosts)};
const ROWS = __ENV.ACCOUNTS_CSV ? open(__ENV.ACCOUNTS_CSV).split(/\\r?\\n/).filter((l) => l.trim() !== '').map((l) => l.split(',')) : [];

export const options = ${JSON.stringify(options)};

let vars = null;

function hostOf(url) {
  const m = /^(https?):\\/\\/([^/?#]+)/i.exec(url);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  if (scheme === 'http' && host.endsWith(':80')) return host.slice(0, -3);
  if (scheme === 'https' && host.endsWith(':443')) return host.slice(0, -4);
  return host;
}

function fill(text) {
  return String(text).replace(/\\$\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (all, name) => (name in vars ? String(vars[name]) : all));
}

function account() {
  if (ROWS.length > 0) {
    const row = ROWS[(exec.vu.idInInstance - 1) % ROWS.length];
    return { username: row[0] || '', password: row[1] || '', role: row[2] || '' };
  }
  return { username: __ENV.ACCOUNT_ID || '', password: __ENV.ACCOUNT_PW || '', role: '' };
}

function pick(value, how) {
  if (Array.isArray(value)) return how === 'RANDOM' ? value[Math.floor(Math.random() * value.length)] : value[0];
  return value;
}

function extract(res, e) {
  if (e.where === 'JSON') { try { return pick(res.json(e.path), e.pick); } catch (_) { return undefined; } }
  if (e.where === 'HEADER') return res.headers[e.path];
  const c = res.cookies[e.path];
  return c && c.length > 0 ? pick(c.map((x) => x.value), e.pick) : undefined;
}

export default function () {
  if (vars === null) vars = account();
  for (const t of TX) {
    const raw = fill(t.url);
    const url = /^https?:\\/\\//i.test(raw) ? raw : __ENV.BASE_URL.replace(/\\/$/, '') + (raw.startsWith('/') ? raw : '/' + raw);
    if (!ALLOWED.includes(hostOf(url))) throw new Error('허용 호스트 밖 주소: ' + t.name);
    const headers = {};
    for (const k of Object.keys(t.headers || {})) headers[k] = fill(t.headers[k]);
    const params = { headers, tags: { tx: t.name } };
    if (t.check && t.check.status && t.check.status.length > 0) params.responseCallback = http.expectedStatuses(...t.check.status);
    const res = http.request(t.method, url, t.body === undefined ? null : fill(t.body), params);
    const statusOk = t.check && t.check.status && t.check.status.length > 0 ? t.check.status.includes(res.status) : res.status >= 200 && res.status < 400;
    if (statusOk && t.check && t.check.contains) {
      check(res, { [t.name]: (r) => typeof r.body === 'string' && r.body.includes(t.check.contains) }, { tx: t.name });
    }
    for (const e of t.extract || []) {
      const v = extract(res, e);
      if (v !== undefined) vars[e.var] = v;
    }
    if (t.thinkTimeSec) sleep(t.thinkTimeSec);
  }
}
`;
}

// 가상 사용자를 에이전트의 최대 가상 사용자 비율로 나눈 k6 실행 구간 (§5.4 「segment」)
export function segments(weights: number[]): { segment: string; sequence: string }[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const cut = [0];
  for (const w of weights) cut.push(cut[cut.length - 1] + w);
  const frac = (n: number) => (n === 0 ? '0' : n === total ? '1' : `${n}/${total}`);
  const sequence = cut.map(frac).join(',');
  return weights.map((_, i) => ({ segment: `${frac(cut[i])}:${frac(cut[i + 1])}`, sequence }));
}

// 계정 줄을 구간 크기대로 이어 나눈다 — 에이전트 하나가 자기 몫의 줄만 받는다
export function splitRows(rows: string[], weights: number[]): string[][] {
  if (weights.length === 1) return [rows];
  const total = weights.reduce((a, b) => a + b, 0);
  const out: string[][] = [];
  let from = 0;
  weights.forEach((w, i) => {
    const to = i === weights.length - 1 ? rows.length : Math.round(from + (rows.length * w) / total);
    out.push(rows.slice(from, Math.max(to, from)));
    from = to;
  });
  // 줄이 에이전트보다 적으면 빈 몫이 생긴다 — 그 에이전트는 모든 줄을 처음부터 다시 쓴다
  return out.map((part) => (part.length === 0 ? rows : part));
}
