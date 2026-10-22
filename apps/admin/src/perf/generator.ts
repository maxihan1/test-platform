// 트랜잭션 목록 · 부하 설정으로 k6 스크립트를 만든다 — 사람도 AI 도 스크립트를 직접 쓰지 않는다 (도메인/성능 §3.9 「스크립트는 생성기가 만든다」)
// 사람이 쓴 값은 전부 JSON 글자로만 넣는다 — 스크립트 코드 자리에 끼어들지 못하게

import { 부하중시나리오, 부하중조각 } from './pageScript.js';
import type { Load, PageSetup, Transaction } from './types.js';

export interface GenerateInput {
  transactions: Transaction[];
  load: Load;
  // 스모크 테스트는 가상 사용자 1명 · 60초 (§3.9 「스모크 테스트」)
  smoke: boolean;
  allowedHosts: string[];
  maxVus: number;
  // 부하 중 페이지 측정 — 스모크에는 넣지 않는다 (§3.9 「부하 중 측정」)
  pages?: PageSetup | null;
}

// 스크립트 안 hostOf 와 같은 셈 — 저장 · 실행 검사가 이것과 WHATWG URL.host 가 같은 주소만 받아 둘이 어긋나지 않게 한다
export function 스크립트호스트(url: string): string | null {
  const m = /^(https?|wss?):\/\/([^/?#]+)/i.exec(url);
  if (!m) return null;
  const scheme = (m[1] ?? '').toLowerCase();
  const host = (m[2] ?? '').toLowerCase();
  if ((scheme === 'http' || scheme === 'ws') && host.endsWith(':80')) return host.slice(0, -3);
  if ((scheme === 'https' || scheme === 'wss') && host.endsWith(':443')) return host.slice(0, -4);
  return host;
}

// WebSocket 트랜잭션이 「기다릴 글자」를 기다리는 시간 (2026-10-22 PERF-F1-10 시작 질문)
const WS_WAIT_MS = 10_000;

/** gRPC 트랜잭션의 proto 파일 — 일의 files 로 에이전트에 넘긴다. 이름은 스크립트가 읽는 tx<차례>.proto 다 */
export function protoFiles(transactions: readonly Transaction[]): Record<string, string> {
  return Object.fromEntries(transactions.flatMap((t, i) => (t.type === 'GRPC' && t.grpc ? [[`tx${i}.proto`, t.grpc.proto]] : [])));
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
  // 리디렉트를 따라가면 허용 호스트 밖으로 부하가 간다 — 3xx 응답 그대로 센다 (§3.9 「허용 호스트」)
  const pages = input.smoke ? null : (input.pages ?? null);
  const scenarios: Record<string, unknown> = { main: scenarioOptions(input) };
  if (pages !== null) scenarios.pages = 부하중시나리오(totalDuration(input.load));
  const options = { scenarios, summaryTrendStats: [], maxRedirects: 0 };
  const 조각 = pages === null ? null : 부하중조각(pages);
  const ws = input.transactions.some((t) => t.type === 'WS');
  const grpc = input.transactions.some((t) => t.type === 'GRPC');
  return `import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';
${ws ? "import { WebSocket } from 'k6/websockets';\nimport { setTimeout, clearTimeout } from 'k6/timers';" : ''}
${grpc ? "import grpc from 'k6/net/grpc';" : ''}
${조각?.imports ?? ''}

const TX = ${JSON.stringify(input.transactions.map((t) => (t.grpc ? { ...t, grpc: { method: t.grpc.method } } : t)))};
// WebSocket · gRPC 한 번의 시간. 에이전트가 http_req_duration 과 같이 요청으로 센다 (§5.4)
const TX_MS = new Trend('qahub_tx_duration', true);
// proto 는 init 자리에서만 읽힌다 — 에이전트가 일의 files 를 QAHUB_FILES 폴더에 풀어 둔다
const CLIENTS = {};
TX.forEach((t, i) => {
  if (t.type !== 'GRPC') return;
  const c = new grpc.Client();
  c.load([__ENV.QAHUB_FILES], 'tx' + i + '.proto');
  CLIENTS[i] = { client: c, connected: false };
});
const ALLOWED = ${JSON.stringify(input.allowedHosts)};
const ROWS = __ENV.ACCOUNTS_CSV ? open(__ENV.ACCOUNTS_CSV).split(/\\r?\\n/).filter((l) => l.trim() !== '').map((l) => l.split(',')) : [];

export const options = ${JSON.stringify(options)};

let vars = null;

function hostOf(url) {
  const m = /^(https?|wss?):\\/\\/([^/?#]+)/i.exec(url);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  if ((scheme === 'http' || scheme === 'ws') && host.endsWith(':80')) return host.slice(0, -3);
  if ((scheme === 'https' || scheme === 'wss') && host.endsWith(':443')) return host.slice(0, -4);
  return host;
}

function urlOf(t) {
  const raw = fill(t.url);
  if (/^(https?|wss?):\\/\\//i.test(raw)) return raw;
  const base = __ENV.BASE_URL.replace(/\\/$/, '');
  const url = base + (raw.startsWith('/') ? raw : '/' + raw);
  return t.type === 'WS' ? url.replace(/^http/i, 'ws') : url;
}

function wsTx(t, url) {
  return new Promise((resolve) => {
    const started = Date.now();
    const wait = t.check && t.check.contains ? t.check.contains : null;
    let settled = false;
    let timer = null;
    const socket = new WebSocket(url);
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      TX_MS.add(Date.now() - started, { tx: t.name });
      check(null, { [t.name]: () => ok }, { tx: t.name });
      try { socket.close(); } catch (_) {}
      resolve();
    };
    timer = setTimeout(() => finish(false), ${WS_WAIT_MS});
    socket.onopen = () => {
      for (const m of t.messages || []) socket.send(fill(m));
      if (wait === null) finish(true);
    };
    socket.onmessage = (e) => { if (wait !== null && String(e.data).includes(wait)) finish(true); };
    socket.onerror = () => finish(false);
    socket.onclose = () => finish(false);
  });
}

function grpcTx(t, i, url) {
  const slot = CLIENTS[i];
  const m = /^(https?):\\/\\/([^/?#]+)/i.exec(url);
  const tls = m[1].toLowerCase() === 'https';
  const addr = m[2].includes(':') ? m[2] : m[2] + (tls ? ':443' : ':80');
  const started = Date.now();
  let ok = false;
  let text = '';
  try {
    if (!slot.connected) {
      slot.client.connect(addr, { plaintext: !tls });
      slot.connected = true;
    }
    const res = slot.client.invoke(t.grpc.method, JSON.parse(fill(t.body || '{}')), { tags: { tx: t.name } });
    ok = res !== null && res.status === grpc.StatusOK;
    text = ok ? JSON.stringify(res.message) : '';
  } catch (_) {
    // 끊긴 연결에 connect 를 다시 부르면 거절된다 — 닫고 다음 차례에 새로 연다
    try { slot.client.close(); } catch (_) {}
    slot.connected = false;
  }
  TX_MS.add(Date.now() - started, { tx: t.name });
  if (ok && t.check && t.check.contains) ok = text.includes(t.check.contains);
  check(null, { [t.name]: () => ok }, { tx: t.name });
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

export default async function () {
  if (vars === null) vars = account();
  for (let i = 0; i < TX.length; i += 1) {
    const t = TX[i];
    const url = urlOf(t);
    if (!ALLOWED.includes(hostOf(url))) throw new Error('허용 호스트 밖 주소: ' + t.name);
    if (t.type === 'WS' || t.type === 'GRPC') {
      if (t.type === 'WS') await wsTx(t, url);
      else grpcTx(t, i, url);
      if (t.thinkTimeSec) sleep(t.thinkTimeSec);
      continue;
    }
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
${조각?.body ?? ''}`;
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
