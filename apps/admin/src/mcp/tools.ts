// MCP 조회 도구 넷(노트 읽기는 mcp/note.ts) — 화면 통로와 같은 판정(문판정)을 거친 뒤 같은 질의를 읽는다 (도메인/BTS §3.12 「맥락 — MCP 조회 도구」 · §7 「MCP」)

import { 문판정, type 문막힘 as 문막힘몸 } from '../auth/gate.js';
import { 필요권한 } from '../auth/routeTable.js';
import { 서비스없음, 자원의서비스, 케이스의서비스 } from '../auth/scope.js';
import type { 사용자 } from '../auth/store.js';
import { BTS부르기, type BTS응답, type 부르기함수 } from '../bts/client.js';
import { findRun } from '../execution/queries.js';
import { 지금판, 케이스지도 } from '../prd/store.js';

/** 도구 답 — 성공은 JSON 글, 실패는 오류 이름 한 줄(FORBIDDEN · NOT_FOUND · …) */
export type 도구답 = { ok: true; data: unknown } | { ok: false; error: string; detail?: string };

const 막힘 = (detail: string): 도구답 => ({ ok: false, error: 'FORBIDDEN', detail });
const 문막힘 = (판정: 문막힘몸): 도구답 => 막힘('detail' in 판정 ? 판정.detail : 판정.need);
const 없음 = (detail: string): 도구답 => ({ ok: false, error: 'NOT_FOUND', detail });

// 한 번에 돌려줄 줄 수. AI 의 맥락 창을 한 도구가 다 먹지 않게 한다
const 최대줄 = 30;

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 화면의 같은 통로가 요구하는 권한으로 그 애플리케이션을 연다. 통과하면 그 애플리케이션 번호 */
function 열기(사람: 사용자, 통로: string, service: string): number | 도구답 {
  const 판정 = 문판정(사람, 필요권한(통로, 'GET'), [service]);
  // 문판정이 배정 밖을 이미 막았다 — 여기 오면 사람.services 에 그 애플리케이션이 있다
  return 판정 !== null ? 문막힘(판정) : 사람.services.find((s) => s.prefix === service)!.id;
}

/** PRD 요구 찾기 — 지금 판에서 요구 번호 · 기능 · 문장에 낱말이 든 줄과 그 요구를 덮는 케이스 (GET /api/prd 와 같은 권한) */
export async function prd찾기(사람: 사용자, service: string, query: string): Promise<도구답> {
  const 번호 = 열기(사람, '/api/prd', service);
  if (typeof 번호 !== 'number') return 번호;
  const [판, 지도] = await Promise.all([지금판(번호), 케이스지도(번호)]);
  if (판 === null) return 없음(`${service} 표준 기획서가 아직 없다`);
  const 낱말 = query.trim().toLowerCase();
  const 맞음 = 판.items.filter((i) => 낱말 === '' || [i.reqId, i.feature, i.text].some((글) => 글.toLowerCase().includes(낱말)));
  return {
    ok: true,
    data: {
      version: 판.version,
      total: 맞음.length,
      items: 맞음.slice(0, 최대줄).map((i) => ({ reqId: i.reqId, feature: i.feature, text: i.text, status: i.status, cases: (지도[i.reqId] ?? []).map((c) => c.tcId) })),
    },
  };
}

export type 지도찾을것 = { reqId?: string; tcId?: string; url?: string };

/** 지도 찾기 — 요구 ↔ 케이스(지도 ①) ↔ 화면(지도 ②). 케이스 목록과 같은 권한(GET /api/catalog/cases) */
export async function 지도찾기(사람: 사용자, service: string, 찾을것: 지도찾을것): Promise<도구답> {
  const 번호 = 열기(사람, '/api/catalog/cases', service);
  if (typeof 번호 !== 'number') return 번호;
  const pool = await db();
  // 지운(is_active 아닌) 케이스는 빼고 센다 — 케이스지도(prd_search)와 같은 기준. 상한은 살아 있는 케이스에 건다
  let 케이스들: string[];
  if (찾을것.tcId !== undefined) {
    // 다른 애플리케이션 케이스 번호를 이 애플리케이션 권한으로 읽지 못하게 머리를 맞춘다
    if (케이스의서비스(찾을것.tcId) !== service) return 막힘(찾을것.tcId);
    const r = await pool.query('SELECT 1 FROM test_case WHERE tc_id = $1 AND is_active', [찾을것.tcId]);
    if (r.rowCount === 0) return 없음(찾을것.tcId);
    케이스들 = [찾을것.tcId];
  } else if (찾을것.reqId !== undefined) {
    const r = await pool.query<{ tc_id: string }>(
      `SELECT DISTINCT r.tc_id FROM req_case r JOIN test_case t ON t.tc_id = r.tc_id AND t.is_active
        WHERE r.service_id = $1 AND r.req_id = $2 ORDER BY r.tc_id LIMIT $3`,
      [번호, 찾을것.reqId, 최대줄],
    );
    케이스들 = r.rows.map((x) => x.tc_id);
  } else if (찾을것.url !== undefined) {
    // 파일 안에서 열리는 화면(open_urls — 「/board/:n/edit」 같은)도 찾는다
    const r = await pool.query<{ tc_id: string }>(
      `SELECT DISTINCT c.tc_id FROM case_screen c JOIN test_case t ON t.tc_id = c.tc_id AND t.is_active
        WHERE c.tc_id LIKE $1 AND (strpos(c.screen_url, $2) > 0 OR EXISTS (SELECT 1 FROM unnest(c.open_urls) u WHERE strpos(u, $2) > 0))
        ORDER BY c.tc_id LIMIT $3`,
      [`${service}-%`, 찾을것.url, 최대줄],
    );
    케이스들 = r.rows.map((x) => x.tc_id);
  } else {
    return { ok: false, error: 'BAD_INPUT', detail: 'reqId · tcId · url 중 하나' };
  }

  const [요구, 화면] = await Promise.all([
    pool.query<{ tc_id: string; req_id: string; axis: string }>(
      `SELECT r.tc_id, r.req_id, r.axis FROM req_case r JOIN test_case t ON t.tc_id = r.tc_id AND t.is_active
        WHERE r.service_id = $1 AND r.tc_id = ANY($2) ORDER BY r.tc_id, r.req_id`,
      [번호, 케이스들],
    ),
    // name 은 못 읽었으면 NULL 이다 (공통/4-데이터모델 case_screen)
    pool.query<{ tc_id: string; screen_url: string | null; name: string | null; open_urls: string[] }>(
      'SELECT tc_id, screen_url, name, open_urls FROM case_screen WHERE tc_id = ANY($1) ORDER BY tc_id, name',
      [케이스들],
    ),
  ]);
  return {
    ok: true,
    data: {
      cases: 케이스들.map((tcId) => ({
        tcId,
        reqs: 요구.rows.filter((x) => x.tc_id === tcId).map((x) => ({ reqId: x.req_id, axis: x.axis })),
        screens: 화면.rows.filter((x) => x.tc_id === tcId).map((x) => ({ name: x.name, url: x.screen_url, ...(x.open_urls.length > 0 && { opens: x.open_urls }) })),
      })),
    },
  };
}

/** 실행 결과 보기 — 실행 결과 화면이 읽는 것 그대로 (GET /api/runs/:runId 와 같은 권한) */
export async function 실행보기(사람: 사용자, runId: number): Promise<도구답> {
  const 서비스 = await 자원의서비스({ 종류: '실행', 번호: runId });
  if (서비스 === 서비스없음) return 막힘(String(runId));
  if (서비스 === null) return 없음(String(runId));
  const 판정 = 문판정(사람, 필요권한('/api/runs/:runId', 'GET'), [서비스]);
  if (판정 !== null) return 문막힘(판정);
  const 실행 = await findRun(runId);
  // 시나리오 실행은 케이스 실행 모양이 아니다 — 1차는 케이스 실행만
  if (실행 === null) return 없음(String(runId));
  // 회귀 실행은 항목이 수천 줄이다 — 실패를 앞에 두고 최대줄 만 싣는다. 다 보려면 화면을 연다
  const 차례 = (s: string) => (s === 'FAIL' ? 0 : s === 'NA' ? 1 : 2);
  const items = [...실행.items].sort((a, b) => 차례(a.status) - 차례(b.status)).slice(0, 최대줄);
  return { ok: true, data: { ...실행, items, itemsTotal: 실행.items.length } };
}

/** 프로젝트 단위 도구(BTS 찾기 · 노트 읽기)의 문턱 — 그 프로젝트 애플리케이션 하나라도 (작성, read). 통과면 null */
export function 프로젝트읽기막힘(사람: 사용자, projectId: number): 도구답 | null {
  const 앱들 = 사람.services.filter((s) => s.projectId === projectId);
  return 앱들.some((s) => 문판정(사람, 필요권한('/api/prd', 'GET'), [s.prefix]) === null) ? null : 막힘(`project ${String(projectId)}`);
}

export type BTS찾을것 = { issueKey?: string; query?: string };

/** BTS AQL 문자열 — 따옴표 · 역슬래시만 푼다 (BTS AqlLexer scanQuotedString) */
export const aql글 = (글: string): string => `"${글.replace(/[\\"]/g, (c) => `\\${c}`)}"`;

/**
 * BTS 이슈 · task 찾기 — 사람 요청은 그 사람의 PAT 로 BTS 를 부른다(결정 16). BTS 가 자기 권한을 한 번 더 본다.
 * 자동 AI(mcj_)는 PAT 가 없어 `pat` 이 null 이고, 그 프로젝트에 저장한 「QA Hub AI」 열쇠로 부른다 (§3.12 「열쇠 표」)
 * QA Hub 쪽은 그 프로젝트 애플리케이션 하나라도 (작성, read) 여야 한다 — 노트 보기와 같은 문턱 (§7 「프로젝트 노트 보기」)
 */
export async function BTS찾기(사람: 사용자, pat: string | null, projectId: number, 찾을것: BTS찾을것, 부르기: 부르기함수 = BTS부르기): Promise<도구답> {
  const 문턱 = 프로젝트읽기막힘(사람, projectId);
  if (문턱 !== null) return 문턱;

  const r = await (await db()).query<{ base_url: string; bts_project: string; bot_key: string }>('SELECT base_url, bts_project, bot_key FROM bts_link WHERE project_id = $1', [projectId]);
  const 연결 = r.rows[0];
  if (연결 === undefined) return { ok: false, error: 'NOT_LINKED', detail: `project ${String(projectId)} 은 BTS 를 잇지 않았다` };
  const 자리 = { baseUrl: 연결.base_url, botKey: pat ?? 연결.bot_key };

  let 부를것: Parameters<부르기함수>;
  if (찾을것.issueKey !== undefined) {
    // 이은 BTS 프로젝트 밖 이슈는 이 창구로 읽지 않는다 — 그 사람이 BTS 에서 볼 수 있어도 QA Hub 프로젝트 권한이 그 이슈를 덮지 않는다
    if (!찾을것.issueKey.startsWith(`${연결.bts_project}-`)) return 막힘(찾을것.issueKey);
    부를것 = [자리, 'GET', `/api/v1/issues/${encodeURIComponent(찾을것.issueKey)}`];
  } else if (찾을것.query !== undefined && 찾을것.query.trim() !== '') {
    부를것 = [자리, 'POST', '/api/v1/search/aql', { projectKey: 연결.bts_project, query: `text ~ ${aql글(찾을것.query.trim())}`, page: 0, size: 최대줄 }];
  } else {
    return { ok: false, error: 'BAD_INPUT', detail: 'issueKey · query 중 하나' };
  }

  let 답: BTS응답;
  try {
    답 = await 부르기(...부를것);
  } catch (err) {
    console.error(`[mcp] BTS(${연결.base_url}) 에 닿지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, error: 'BTS_UNREACHABLE' };
  }

  if (답.status === 200) return { ok: true, data: (답.json as { data?: unknown } | null)?.data ?? null };
  if (답.status === 404) return 없음(찾을것.issueKey ?? '');
  if (답.status === 401) return { ok: false, error: 'BTS_UNAUTHORIZED', detail: pat === null ? 'BTS 가 「QA Hub AI」 계정 토큰을 받지 않았다 — 설정 › BTS 연결에서 다시 넣는다' : 'BTS 가 이 통합계정 토큰을 받지 않았다' };
  if (답.status === 403) return 막힘('BTS 권한 없음');
  return { ok: false, error: 'BTS_ERROR', detail: `HTTP ${String(답.status)}` };
}
