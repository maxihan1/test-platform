// 페이지 성능 표 — 단독 측정 만들기 · 측정값 읽기 · 견줄 실행 · 로그인 화면 찾기 (도메인/성능 §3.9 「페이지 성능」 · §7)

import { z } from 'zod';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 단독시간 } from './pageScript.js';
import { 페이지판정, type 페이지표본 } from './pageStats.js';
import { 실행번호글 } from './pdf.js';
import { 호스트 } from './scenarios.js';
import * as 표 from './store.js';
import type { Page, PageRunConfig, PageSetup } from './types.js';

// 경로는 대상 서버 주소 뒤에 붙는다 — '/' 로 시작해야 다른 호스트로 새지 않는다
export const 페이지 = z.object({
  url: z.string().min(1).max(500).regex(/^\/(?!\/)\S*$/, "경로는 '/' 로 시작합니다"),
  name: z.string().trim().min(1).max(100),
  login: z.boolean(),
});

export const 측정본문 = z.object({
  serviceId: z.number().int().positive(),
  env: z.string().min(1).max(100),
  pages: z.array(페이지).min(1).max(10).refine((ps) => new Set(ps.map((p) => p.url)).size === ps.length, '경로가 겹칩니다'),
  device: z.enum(['desktop', 'mobile']),
  network: z.enum(['NONE', 'SLOW_4G']),
});

export const 메인: Page = { url: '/', name: '메인', login: false };

/** 웹 애플리케이션인가 — 페이지 성능은 웹에만 선다 (§8.14) */
export async function 웹인가(serviceId: number): Promise<boolean> {
  const r = await (await 표.풀()).query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [serviceId]);
  return r.rows[0]?.kind === 'SCREEN';
}

/** 화면 기록 · 찾은 화면에서 로그인 화면 경로 하나 — 로그아웃 상태에서 주소나 이름이 로그인인 것 */
export async function 로그인화면(serviceId: number, env: string): Promise<string | null> {
  const r = await (await 표.풀()).query<{ url: string }>(
    `SELECT url FROM (
       SELECT url, name FROM screen_record WHERE service_id = $1 AND env = $2 AND state = '로그아웃'
       UNION SELECT url, name FROM screen_found WHERE service_id = $1 AND env = $2 AND state = '로그아웃'
     ) t WHERE url LIKE '/%' AND url NOT LIKE '%:n%' AND (url ~* '(log-?in|sign-?in)' OR name LIKE '%로그인%')
     ORDER BY length(url), url LIMIT 1`,
    [serviceId, env],
  );
  return r.rows[0]?.url.replace(/ \(구조 다름\)$/, '') ?? null;
}

/**
 * AI 가 주요 페이지를 고를 재료 — 화면 기록의 상태 · 틀 · 이름과 진짜 주소(기록 첫 줄), 기록이 없는 찾은 화면은 틀 · 이름만.
 * 기록 본문은 넘기지 않는다 — 로그인 화면의 이름 · 이메일이 들 수 있다(공통/4 screen_record.record)
 */
export async function 화면재료(serviceId: number, env: string | null): Promise<{ state: string; url: string; name: string; address: string | null }[]> {
  const r = await (await 표.풀()).query<{ state: string; url: string; name: string; address: string | null }>(
    `SELECT state, url, name, address FROM (
       SELECT state, url, name, left(split_part(record, E'\n', 1), 500) AS address FROM screen_record WHERE service_id = $1 AND ($2::text IS NULL OR env = $2)
       UNION ALL
       SELECT f.state, f.url, f.name, NULL FROM screen_found f WHERE f.service_id = $1 AND ($2::text IS NULL OR f.env = $2)
          AND NOT EXISTS (SELECT 1 FROM screen_record r WHERE r.service_id = f.service_id AND r.env = f.env AND r.state = f.state AND r.url = f.url)
     ) t ORDER BY url, state LIMIT 300`,
    [serviceId, env],
  );
  return r.rows;
}

/** 부하 중에 잴 페이지 — 그 애플리케이션 · 대상 서버의 가장 최근 단독 측정 것, 없으면 메인 (PERF-F1-07 시작 질문) */
export async function 최근페이지(serviceId: number, env: string): Promise<PageSetup> {
  const r = await (await 표.풀()).query<{ config: PageRunConfig }>(
    `SELECT config FROM perf_run WHERE service_id = $1 AND env = $2 AND kind = 'PAGE' AND status = 'DONE' ORDER BY id DESC LIMIT 1`,
    [serviceId, env],
  );
  const c = r.rows[0]?.config;
  return c === undefined ? { pages: [메인], device: 'desktop', network: 'NONE', loginUrl: null } : { pages: c.pages, device: 'desktop', network: 'NONE', loginUrl: c.loginUrl };
}

/**
 * 페이지를 맡을 에이전트 — 연결된 빈 부하 발생 에이전트 중 가장 작은 번호. 엔진이 시작할 때 고른다 —
 * 만들 때 박아 두면 그 에이전트가 오래 바쁘거나 끊겼을 때 다른 에이전트가 비어도 기다리기만 한다
 */
export async function 빈에이전트(바쁜: ReadonlySet<number>, 지금 = Date.now()): Promise<number | null> {
  const 빈 = (await 표.에이전트들()).find((a) => a.mode === 'LOAD' && 표.연결됐나(a, 지금) && a.busyRunId === null && !바쁜.has(a.id));
  return 빈?.id ?? null;
}

async function 붙은에이전트있나(): Promise<boolean> {
  return (await 표.에이전트들()).some((a) => a.mode === 'LOAD' && 표.연결됐나(a));
}

type 거절 = { status: number; error: string; detail?: string };

export async function 측정세우기(b: z.infer<typeof 측정본문>, 누가: { username: string | null; name: string | null }): Promise<{ runId: number } | 거절> {
  if (!(await 웹인가(b.serviceId))) return { status: 400, error: 'INVALID_REQUEST', detail: '웹 애플리케이션만 페이지 성능을 잽니다' };
  const 줄 = await 대상줄읽기(b.serviceId, b.env);
  if (줄 === null) return { status: 400, error: 'INVALID_REQUEST', detail: '대상 서버가 없습니다' };
  const host = 호스트(줄.baseUrl);
  if (host === null) return { status: 400, error: 'INVALID_REQUEST', detail: '대상 서버 주소가 틀렸습니다' };
  let loginUrl: string | null = null;
  // 로그인할 길이 없으면 오류로 끝날 실행을 만들지 않는다 (PERF-F1-07 시작 질문)
  if (b.pages.some((p) => p.login)) {
    if ((줄.loginId ?? '') === '' || (줄.loginPassword ?? '') === '') return { status: 400, error: 'INVALID_REQUEST', detail: '로그인이 필요한 페이지가 있는데 대상 서버에 테스트 계정이 없습니다' };
    loginUrl = await 로그인화면(b.serviceId, b.env);
    if (loginUrl === null) return { status: 400, error: 'INVALID_REQUEST', detail: '로그인이 필요한 페이지가 있는데 화면 기록에 로그인 화면이 없습니다' };
  }
  if (!(await 붙은에이전트있나())) return { status: 409, error: 'NO_AGENT' };
  // 맡을 에이전트는 엔진이 시작할 때 정해 채운다
  const config: PageRunConfig = {
    pages: b.pages, device: b.device, network: b.network, loginUrl, agentIds: [], monitorIds: [], allowedHosts: [host],
    durationSec: 단독시간(b.pages.length), targets: [],
  };
  const r = await (await 표.풀()).query<{ id: string }>(
    `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, origin, triggered_by, triggered_by_name)
     VALUES ('PAGE', $1, $2, $3, $4, 'QUEUED', 'MANUAL', $5, $6) RETURNING id`,
    [b.serviceId, b.env, 줄.baseUrl, JSON.stringify(config), 누가.username, 누가.name],
  );
  const runId = Number(r.rows[0]?.id);
  await 표.로그(runId, '페이지 측정을 만들었습니다 — 부하 발생 에이전트가 비면 시작합니다');
  return { runId };
}

/** 부하 중 측정값 — 받은 초 그대로. 가상 사용자 수는 읽을 때 그 초의 전체 줄에서 붙인다 */
export async function 부하중쓰기(runId: number, sec: number, setup: PageSetup, samples: 페이지표본[]): Promise<void> {
  if (samples.length === 0) return;
  await (await 표.풀()).query(
    `INSERT INTO perf_page_metric (run_id, sec, url, device, network, lcp_ms, fcp_ms, cls, ttfb_ms, lcp_element, resources)
     SELECT $1, $2, x.url, $3, $4, x."lcpMs", x."fcpMs", x.cls, x."ttfbMs", x."lcpElement", x.resources
       FROM jsonb_to_recordset($5::jsonb) AS x(url text, "lcpMs" int, "fcpMs" int, cls numeric, "ttfbMs" int, "lcpElement" text, resources jsonb)`,
    [runId, sec, setup.device, setup.network, JSON.stringify(samples)],
  );
}

/** 단독 측정의 가운데 값 줄 — sec · vus 는 비운다 */
export async function 단독쓰기(runId: number, setup: PageSetup, rows: 페이지표본[]): Promise<void> {
  await (await 표.풀()).query(
    `INSERT INTO perf_page_metric (run_id, url, device, network, lcp_ms, fcp_ms, cls, ttfb_ms, lcp_element, resources)
     SELECT $1, x.url, $2, $3, x."lcpMs", x."fcpMs", x.cls, x."ttfbMs", x."lcpElement", x.resources
       FROM jsonb_to_recordset($4::jsonb) AS x(url text, "lcpMs" int, "fcpMs" int, cls numeric, "ttfbMs" int, "lcpElement" text, resources jsonb)`,
    [runId, setup.device, setup.network, JSON.stringify(rows)],
  );
}

export interface 페이지줄 extends 페이지표본 {
  name: string;
  sec: number | null;
  vus: number | null;
  device: 'desktop' | 'mobile';
  network: 'NONE' | 'SLOW_4G';
  ai: string[] | null;
  verdict: 'PASS' | 'FAIL' | null;
}

type 줄raw = Omit<페이지줄, 'name' | 'verdict'>;

/**
 * 페이지마다 가장 최근 줄 하나 — 단독 측정은 원래 하나고, 부하 중 측정은 30초마다 쌓여 24시간이면 수만 줄이다.
 * 실행 중 화면이 5초마다 부르니 다 싣지 않는다. 차례는 실행 설정의 페이지 차례다
 */
export async function 페이지줄읽기(runId: number, pages: Page[]): Promise<페이지줄[]> {
  const r = await (await 표.풀()).query<줄raw>(
    `SELECT DISTINCT ON (p.url) p.url, p.sec, CASE WHEN p.sec IS NULL THEN NULL ELSE s.vus END AS vus, p.device, p.network, p.lcp_ms AS "lcpMs", p.fcp_ms AS "fcpMs",
            p.cls::float AS cls, p.ttfb_ms AS "ttfbMs", p.lcp_element AS "lcpElement", COALESCE(p.resources, '[]') AS resources, p.ai
       FROM perf_page_metric p LEFT JOIN perf_series s ON s.run_id = p.run_id AND s.sec = p.sec AND s.tx = ''
      WHERE p.run_id = $1 ORDER BY p.url, p.id DESC`,
    [runId],
  );
  const 차례 = new Map(pages.map((p, i) => [p.url, i]));
  const 이름 = new Map(pages.map((p) => [p.url, p.name]));
  return r.rows
    .map((x) => ({ ...x, name: 이름.get(x.url) ?? x.url, verdict: x.sec === null ? 페이지판정(x) : null }))
    .sort((a, b) => (차례.get(a.url) ?? 1e9) - (차례.get(b.url) ?? 1e9));
}

/** 부하 중 측정의 페이지마다 가장 느린 LCP 와 그때 가상 사용자 — 리소스는 읽지 않는다 (AI 분석 「페이지 로딩」 재료) */
export async function 부하중가장느린(runId: number, pages: Page[]): Promise<{ url: string; name: string; maxLcpMs: number; atVus: number | null }[]> {
  const r = await (await 표.풀()).query<{ url: string; maxLcpMs: number; atVus: number | null }>(
    `SELECT DISTINCT ON (p.url) p.url, p.lcp_ms AS "maxLcpMs", s.vus AS "atVus"
       FROM perf_page_metric p LEFT JOIN perf_series s ON s.run_id = p.run_id AND s.sec = p.sec AND s.tx = ''
      WHERE p.run_id = $1 AND p.sec IS NOT NULL AND p.lcp_ms IS NOT NULL ORDER BY p.url, p.lcp_ms DESC`,
    [runId],
  );
  const 이름 = new Map(pages.map((p) => [p.url, p.name]));
  return r.rows.map((x) => ({ ...x, name: 이름.get(x.url) ?? x.url }));
}

export interface 견줌 {
  runId: number;
  code: string;
  kind: 'LOAD' | 'PAGE';
  vus: number | null;
  pages: { url: string; lcpMs: number | null }[];
}

/**
 * 페이지 실행이면 같은 대상 서버에서 끝난 가장 최근 부하 실행(부하 중 측정 켠 것)의 페이지마다 가상 사용자가 가장 많던 때 LCP,
 * 부하 실행이면 같은 대상 서버의 가장 최근 끝난 단독 측정 (PERF-F1-07 시작 질문)
 */
export async function 견줄것(run: 표.실행행): Promise<견줌 | null> {
  const pool = await 표.풀();
  if (run.kind === 'PAGE') {
    const l = await pool.query<{ id: string }>(
      `SELECT id FROM perf_run WHERE service_id = $1 AND env = $2 AND kind = 'LOAD' AND status IN ('DONE', 'STOPPED')
          AND (config->>'pageCheck')::boolean AND EXISTS (SELECT 1 FROM perf_page_metric WHERE run_id = perf_run.id) ORDER BY id DESC LIMIT 1`,
      [run.serviceId, run.env],
    );
    const id = l.rows[0] === undefined ? null : Number(l.rows[0].id);
    if (id === null) return null;
    const p = await pool.query<{ url: string; lcpMs: number | null; vus: number }>(
      `SELECT DISTINCT ON (p.url) p.url, p.lcp_ms AS "lcpMs", COALESCE(s.vus, 0) AS vus
         FROM perf_page_metric p LEFT JOIN perf_series s ON s.run_id = p.run_id AND s.sec = p.sec AND s.tx = ''
        WHERE p.run_id = $1 AND p.lcp_ms IS NOT NULL ORDER BY p.url, COALESCE(s.vus, 0) DESC, p.id DESC`,
      [id],
    );
    return { runId: id, code: 실행번호글(id), kind: 'LOAD', vus: p.rows.length === 0 ? null : Math.max(...p.rows.map((x) => x.vus)), pages: p.rows.map(({ url, lcpMs }) => ({ url, lcpMs })) };
  }
  const l = await pool.query<{ id: string }>(
    `SELECT id FROM perf_run WHERE service_id = $1 AND env = $2 AND kind = 'PAGE' AND status = 'DONE' ORDER BY id DESC LIMIT 1`,
    [run.serviceId, run.env],
  );
  const id = l.rows[0] === undefined ? null : Number(l.rows[0].id);
  if (id === null) return null;
  const p = await pool.query<{ url: string; lcpMs: number | null }>('SELECT url, lcp_ms AS "lcpMs" FROM perf_page_metric WHERE run_id = $1 AND sec IS NULL ORDER BY id', [id]);
  return { runId: id, code: 실행번호글(id), kind: 'PAGE', vus: null, pages: p.rows };
}
