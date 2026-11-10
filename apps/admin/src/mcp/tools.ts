// MCP 조회 도구 넷(PRD · 지도 · BTS 찾기 · 최근 이슈 — 노트 읽기는 mcp/note.ts · 실행 둘은 mcp/runs.ts · Scout 결과 넷은 mcp/scout.ts)과 도구들이 같이 쓰는 답 꼴 · 상한 — 화면 통로와 같은 판정(문판정)을 거친 뒤 같은 질의를 읽는다 (도메인/BTS §3.12 「맥락 — MCP 조회 도구」 · §7 「MCP」)

import { z } from 'zod';

import { 대신PAT오류 } from '../auth/delegatedPat.js';
import { 문판정, type 문막힘 as 문막힘몸 } from '../auth/gate.js';
import { 필요권한 } from '../auth/routeTable.js';
import { 케이스의서비스 } from '../auth/scope.js';
import type { 사용자 } from '../auth/store.js';
import { aql글 } from '../bts/aql.js';
import { BTS부르기, type BTS응답, type BTS자리, type 부르기함수 } from '../bts/client.js';
import { 지금판, 케이스지도 } from '../prd/store.js';
import { Auth없는사람 } from './questionKey.js';

/** 도구 답 — 성공은 JSON 글, 실패는 오류 이름 한 줄(FORBIDDEN · NOT_FOUND · …) */
export type 도구답 = { ok: true; data: unknown } | { ok: false; error: string; detail?: string };

export const 막힘 = (detail: string): 도구답 => ({ ok: false, error: 'FORBIDDEN', detail });
export const 문막힘 = (판정: 문막힘몸): 도구답 => 막힘('detail' in 판정 ? 판정.detail : 판정.need);
export const 없음 = (detail: string): 도구답 => ({ ok: false, error: 'NOT_FOUND', detail });

export const 글답 = (답: 도구답) =>
  답.ok
    ? { content: [{ type: 'text' as const, text: JSON.stringify(답.data) }] }
    : { content: [{ type: 'text' as const, text: 답.detail === undefined ? 답.error : `${답.error} — ${답.detail}` }], isError: true };

// 30줄씩 넘기는 쪽 번호 — 상한은 터무니없는 OFFSET 으로 DB 를 훑지 않게 둔다
export const 쪽 = z.number().int().min(0).max(1000).optional().describe('0 부터. 잘린 찾기의 다음 30줄');

// 한 번에 돌려줄 줄 수. AI 의 맥락 창을 한 도구가 다 먹지 않게 한다. 더 보려면 page 로 다음 30줄을 받는다
export const 최대줄 = 30;
// 줄 하나 안의 목록(케이스의 요구 · 화면) 상한 — 30줄 × 긴 목록이 다시 맥락 창을 채우지 않게
export const 안목록 = 10;
// 긴 글 상한 — 판단에 필요한 머리만 싣는다 (도메인/BTS §7 「MCP」)
export const 글상한 = { 오류: 500, stack: 1000, 입력값: 200, 이슈본문: 4000, 댓글: 1000 } as const;
// 이슈 하나에 싣는 댓글 수 — 최근 것만. 오래된 댓글보다 최근 댓글이 지금 규칙에 가깝다
const 최대댓글 = 20;

/** 상한을 넘으면 자르고 잘렸다고 끝에 적는다 — 말없이 자르면 AI 가 그게 전부인 줄 안다 */
export const 자르기 = (글: string, 상한: number): string => (글.length > 상한 ? `${글.slice(0, 상한)}…(이하 생략)` : 글);

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 화면의 같은 통로가 요구하는 권한으로 그 애플리케이션을 연다. 통과하면 그 애플리케이션 번호 */
export function 열기(사람: 사용자, 통로: string, service: string): number | 도구답 {
  const 판정 = 문판정(사람, 필요권한(통로, 'GET'), [service]);
  // 문판정이 배정 밖을 이미 막았다 — 여기 오면 사람.services 에 그 애플리케이션이 있다
  return 판정 !== null ? 문막힘(판정) : 사람.services.find((s) => s.prefix === service)!.id;
}

/**
 * PRD 요구 찾기 — 지금 판에서 낱말이 모두 든 줄과 그 요구를 덮는 케이스 (GET /api/prd 와 같은 권한).
 * 낱말은 띄어쓰기로 쪼갠다 — 「최소 주문 금액」이 「주문 금액은 최소 1만 원」에도 걸려야 한다
 */
export async function prd찾기(사람: 사용자, service: string, query: string, page = 0): Promise<도구답> {
  const 번호 = 열기(사람, '/api/prd', service);
  if (typeof 번호 !== 'number') return 번호;
  const 판 = await 지금판(번호);
  if (판 === null) return 없음(`${service} 표준 기획서가 아직 없다`);
  const 낱말들 = query.toLowerCase().split(/\s+/).filter((낱말) => 낱말 !== '');
  const 맞음 = 판.items.filter((i) => 낱말들.every((낱말) => [i.reqId, i.feature, i.text].some((글) => 글.toLowerCase().includes(낱말))));
  const 실을것 = 맞음.slice(page * 최대줄, (page + 1) * 최대줄);
  const 지도 = await 케이스지도(번호, 실을것.map((i) => i.reqId));
  return {
    ok: true,
    data: {
      version: 판.version,
      total: 맞음.length,
      items: 실을것.map((i) => ({ reqId: i.reqId, feature: i.feature, text: i.text, status: i.status, cases: (지도[i.reqId] ?? []).map((c) => c.tcId) })),
    },
  };
}

export type 지도찾을것 = { reqId?: string; tcId?: string; url?: string };

/** 지도 찾기 — 요구 ↔ 케이스(지도 ①) ↔ 화면(지도 ②). 케이스 목록과 같은 권한(GET /api/catalog/cases) */
export async function 지도찾기(사람: 사용자, service: string, 찾을것: 지도찾을것, page = 0): Promise<도구답> {
  const 번호 = 열기(사람, '/api/catalog/cases', service);
  if (typeof 번호 !== 'number') return 번호;
  const pool = await db();
  // 지운(is_active 아닌) 케이스는 빼고 센다 — 케이스지도(prd_search)와 같은 기준. 상한은 살아 있는 케이스에 건다
  let 케이스들: string[];
  // 빈 결과의 까닭 — 없는 것과 아직 덮는 케이스가 없는 것을 AI 가 가려 다음 일을 고르게 한다
  let 빈까닭 = '';
  if (찾을것.tcId !== undefined) {
    // 다른 애플리케이션 케이스 번호를 이 애플리케이션 권한으로 읽지 못하게 머리를 맞춘다
    if (케이스의서비스(찾을것.tcId) !== service) return 막힘(찾을것.tcId);
    const r = await pool.query('SELECT 1 FROM test_case WHERE tc_id = $1 AND is_active', [찾을것.tcId]);
    if (r.rowCount === 0) return 없음(찾을것.tcId);
    // 케이스 하나라 다음 쪽이 없다 — 같은 줄을 다시 주면 AI 가 두 번 센다
    if (page > 0) return { ok: true, data: { cases: [], empty: `page ${String(page)} 에는 더 없다` } };
    케이스들 = [찾을것.tcId];
  } else if (찾을것.reqId !== undefined) {
    // 판을 먼저 본다 — PRD 에서 지운 요구도 req_case 연결이 남을 수 있어, 연결만 보면 지난 요구를 지금 요구로 믿게 된다
    const 판 = await 지금판(번호);
    if (판 === null) return 없음(`${service} 표준 기획서가 아직 없다`);
    if (!판.items.some((i) => i.reqId === 찾을것.reqId)) return 없음(`${찾을것.reqId} 는 지금 PRD 판에 없는 요구다`);
    const r = await pool.query<{ tc_id: string }>(
      `SELECT DISTINCT r.tc_id FROM req_case r JOIN test_case t ON t.tc_id = r.tc_id AND t.is_active
        WHERE r.service_id = $1 AND r.req_id = $2 ORDER BY r.tc_id LIMIT $3 OFFSET $4`,
      [번호, 찾을것.reqId, 최대줄 + 1, page * 최대줄],
    );
    케이스들 = r.rows.map((x) => x.tc_id);
    if (케이스들.length === 0) 빈까닭 = page > 0 ? `page ${String(page)} 에는 더 없다` : `${찾을것.reqId} 를 덮는 살아 있는 케이스가 아직 없다`;
  } else if (찾을것.url !== undefined) {
    // 파일 안에서 열리는 화면(open_urls — 「/board/:n/edit」 같은)도 찾는다
    const r = await pool.query<{ tc_id: string }>(
      `SELECT DISTINCT c.tc_id FROM case_screen c JOIN test_case t ON t.tc_id = c.tc_id AND t.is_active
        WHERE c.tc_id LIKE $1 AND (strpos(c.screen_url, $2) > 0 OR EXISTS (SELECT 1 FROM unnest(c.open_urls) u WHERE strpos(u, $2) > 0))
        ORDER BY c.tc_id LIMIT $3 OFFSET $4`,
      [`${service}-%`, 찾을것.url, 최대줄 + 1, page * 최대줄],
    );
    케이스들 = r.rows.map((x) => x.tc_id);
    if (케이스들.length === 0) 빈까닭 = page > 0 ? `page ${String(page)} 에는 더 없다` : `「${찾을것.url}」 를 거치는 살아 있는 케이스가 없다`;
  } else {
    return { ok: false, error: 'BAD_INPUT', detail: 'reqId · tcId · url 중 하나' };
  }

  // 하나 더 읽어 넘쳤는지 안다
  const 잘림 = 케이스들.length > 최대줄;
  케이스들 = 케이스들.slice(0, 최대줄);
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
      cases: 케이스들.map((tcId) => {
        const reqs = 요구.rows.filter((x) => x.tc_id === tcId);
        const screens = 화면.rows.filter((x) => x.tc_id === tcId);
        return {
          tcId,
          reqs: reqs.slice(0, 안목록).map((x) => ({ reqId: x.req_id, axis: x.axis })),
          screens: screens.slice(0, 안목록).map((x) => ({
            name: x.name,
            url: x.screen_url,
            ...(x.open_urls.length > 0 && { opens: x.open_urls.slice(0, 안목록) }),
            ...(x.open_urls.length > 안목록 && { moreOpens: x.open_urls.length - 안목록 }),
          })),
          ...(reqs.length > 안목록 && { moreReqs: reqs.length - 안목록 }),
          ...(screens.length > 안목록 && { moreScreens: screens.length - 안목록 }),
        };
      }),
      ...(잘림 && { truncated: true }),
      ...(빈까닭 !== '' && { empty: 빈까닭 }),
    },
  };
}

/** 프로젝트 단위 도구(BTS 찾기 · 노트 읽기)의 문턱 — 그 프로젝트 애플리케이션 하나라도 (작성, read). 통과면 null */
export function 프로젝트읽기막힘(사람: 사용자, projectId: number): 도구답 | null {
  const 앱들 = 사람.services.filter((s) => s.projectId === projectId);
  return 앱들.some((s) => 문판정(사람, 필요권한('/api/prd', 'GET'), [s.prefix]) === null) ? null : 막힘(`project ${String(projectId)}`);
}

export type BTS찾을것 = { issueKey?: string; query?: string; page?: number };

/** BTS AQL 문자열 — 따옴표 · 역슬래시만 푼다 (BTS AqlLexer scanQuotedString). 정본은 bts/aql.ts */
export { aql글 };

/**
 * BTS 이슈 · task 찾기 — 사람 요청은 그 사람(Auth id `authSub`)의 대신 PAT 로 BTS 를 부른다(결정 16 · S28). BTS 가 자기 권한을 한 번 더 본다.
 * /mcp 가 받은 access token 은 BTS 로 넘기지 않는다 — 그 토큰의 aud 는 /mcp 다 (MCP 인가 「Token Passthrough」)
 * 자동 AI(mcj_)는 `authSub` 이 null 이고, 그 프로젝트에 적은 「QA Hub AI」 계정의 대신 PAT 로 부른다 (§3.12 「열쇠 표」)
 * Test Commander 쪽은 그 프로젝트 애플리케이션 하나라도 (작성, read) 여야 한다 — note_read 와 같은 문턱 (§3.12 「맥락 — MCP 조회 도구」)
 */
export async function BTS찾기(사람: 사용자, authSub: BTS주인, projectId: number, 찾을것: BTS찾을것, 부르기: 부르기함수 = BTS부르기): Promise<도구답> {
  const 열림 = await BTS열기(사람, authSub, projectId);
  if ('ok' in 열림) return 열림;
  const { 연결, 자리 } = 열림;

  let 부를것: Parameters<부르기함수>;
  // 이슈 하나를 읽을 때만 댓글도 부른다 — 댓글에서 바뀐 규칙을 PRD 초안 · 수정 AI 가 놓치지 않게 (2026-11-02 사용자)
  let 댓글부를것: Parameters<부르기함수> | null = null;
  const page = 찾을것.page ?? 0;
  if (찾을것.issueKey !== undefined) {
    // 이은 BTS 프로젝트 밖 이슈는 이 창구로 읽지 않는다 — 그 사람이 BTS 에서 볼 수 있어도 Test Commander 프로젝트 권한이 그 이슈를 덮지 않는다
    if (!찾을것.issueKey.startsWith(`${연결.bts_project}-`)) return 막힘(찾을것.issueKey);
    const 키 = encodeURIComponent(찾을것.issueKey);
    부를것 = [자리, 'GET', `/api/v1/issues/${키}`];
    댓글부를것 = [자리, 'GET', `/api/v1/issues/${키}/comments`];
  } else if (찾을것.query !== undefined && 찾을것.query.trim() !== '') {
    부를것 = [자리, 'POST', '/api/v1/search/aql', { projectKey: 연결.bts_project, query: `text ~ ${aql글(찾을것.query.trim())}`, page, size: 최대줄 }];
  } else {
    return { ok: false, error: 'BAD_INPUT', detail: 'issueKey · query 중 하나' };
  }

  const 답 = await BTS부른다(부르기, 부를것, 연결.base_url);
  if ('ok' in 답) return 답;

  if (답.status === 200) {
    const 몸 = 답.json as { data?: unknown; meta?: { page?: { totalElements?: unknown } } } | null;
    const data = 몸?.data;
    if (찾을것.issueKey === undefined) return { ok: true, data: 찾은줄(data, 몸?.meta?.page?.totalElements, page) };
    // 빈 이슈를 진짜 이슈처럼 넘기면 AI 가 내용 없는 이슈로 믿고 일한다
    if (data === null || typeof data !== 'object') return { ok: false, error: 'BTS_ERROR', detail: 'Issue Bunker 가 빈 답을 줬다' };
    // 이슈를 읽은 뒤에만 부른다 — 없는 이슈 · 거절된 열쇠에 BTS 를 두 번 두드리지 않는다.
    // 댓글만 못 읽은 것은 이슈까지 버리지 않는다. 닿지 못한 까닭 원문은 내부 주소가 섞여 로그에만 남긴다
    let 댓글답: BTS응답 | null = null;
    try {
      if (댓글부를것 !== null) 댓글답 = await 부르기(...댓글부를것);
    } catch (err) {
      console.error(`[mcp] Issue Bunker(${연결.base_url}) 댓글에 닿지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
    return { ok: true, data: { ...이슈하나(data as 이슈원본), ...댓글칸(댓글답) } };
  }
  if (답.status === 404) return 없음(찾을것.issueKey ?? '');
  return BTS오류(답.status, authSub);
}

type BTS연결 = { base_url: string; bts_project: string; bot_username: string | null };

/** BTS 를 누구 이름으로 부르나 — 사람의 Auth id · 자동 AI(mcj_)는 null(「QA Hub AI」) · Auth 에 안 묶인 Scout 질문자(mcq_)는 부르지 않는다 */
export type BTS주인 = string | null | typeof Auth없는사람;

/** BTS 를 부르는 도구(bts_search · issue_list)의 문 — 프로젝트 문턱 · 이은 BTS · 누구 이름으로 부를지. 막히면 도구답 */
async function BTS열기(사람: 사용자, authSub: BTS주인, projectId: number): Promise<도구답 | { 연결: BTS연결; 자리: BTS자리 }> {
  const 문턱 = 프로젝트읽기막힘(사람, projectId);
  if (문턱 !== null) return 문턱;
  const r = await (await db()).query<BTS연결>('SELECT base_url, bts_project, bot_username FROM bts_link WHERE project_id = $1', [projectId]);
  const 연결 = r.rows[0];
  if (연결 === undefined) return { ok: false, error: 'NOT_LINKED', detail: `project ${String(projectId)} 은 Issue Bunker 를 잇지 않았다` };
  // 사람이 묻는 것이라 「QA Hub AI」 키를 빌리지 않는다 — 빌리면 그 사람이 못 보는 이슈를 Scout 로 본다 (도메인/BTS §3.12)
  if (authSub === Auth없는사람) return { ok: false, error: 'BTS_UNAUTHORIZED', detail: '이 사람은 통합계정(Auth)에 묶이지 않아 Issue Bunker 를 부를 수 없다' };
  // 대신 PAT 는 BTS부르기가 주소를 확인한 뒤에 받는다 — 막힐 입력 · 허용 밖 주소로 Auth 에 PAT 를 만들게 하지 않는다
  const 자리: BTS자리 = authSub !== null ? { baseUrl: 연결.base_url, userId: authSub } : { baseUrl: 연결.base_url, 봇: 연결.bot_username ?? '' };
  return { 연결, 자리 };
}

async function BTS부른다(부르기: 부르기함수, 부를것: Parameters<부르기함수>, 주소: string): Promise<BTS응답 | 도구답> {
  try {
    return await 부르기(...부를것);
  } catch (err) {
    console.error(`[mcp] Issue Bunker(${주소}) 에 닿지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    // Bunker 는 멀쩡한데 Auth 가 대신 PAT 를 안 준 때(403 · 429)는 Bunker 주소를 의심하지 않게 갈라 준다. 까닭 원문은 로그에만
    return { ok: false, error: 'BTS_UNREACHABLE', ...(err instanceof 대신PAT오류 && { detail: 'Auth 에서 Issue Bunker 를 부를 대신 PAT 를 못 받았다' }) };
  }
}

function BTS오류(status: number, authSub: BTS주인): 도구답 {
  if (status === 401) return { ok: false, error: 'BTS_UNAUTHORIZED', detail: authSub === null ? 'Issue Bunker 가 「QA Hub AI」 계정의 대신 PAT 를 받지 않았다 — 설정 › Issue Bunker 연결의 계정 이름을 확인한다' : 'Issue Bunker 가 이 사람의 대신 PAT 를 받지 않았다' };
  if (status === 403) return 막힘('Issue Bunker 권한 없음');
  return { ok: false, error: 'BTS_ERROR', detail: `HTTP ${String(status)}` };
}

/**
 * 최근 이슈 — 이은 BTS 프로젝트의 이슈를 만든 시각 늦은 것부터 30줄(닫힌 것도). BTS 이슈 목록(GET /api/v1/issues 의 page · size)이 기본으로 그 차례다.
 * 그 통로는 봉투 없이 Spring Page({ content, totalElements })를 준다. 부르는 키 · 오류는 bts_search 와 같다
 */
export async function 최근이슈(사람: 사용자, authSub: BTS주인, projectId: number, page = 0, 부르기: 부르기함수 = BTS부르기): Promise<도구답> {
  const 열림 = await BTS열기(사람, authSub, projectId);
  if ('ok' in 열림) return 열림;
  const 쪽 = new URLSearchParams({ projectKey: 열림.연결.bts_project, page: String(page), size: String(최대줄) });
  const 답 = await BTS부른다(부르기, [열림.자리, 'GET', `/api/v1/issues?${쪽.toString()}`], 열림.연결.base_url);
  if ('ok' in 답) return 답;
  if (답.status !== 200) return BTS오류(답.status, authSub);
  const 몸 = 답.json as { content?: unknown; totalElements?: unknown } | null;
  const 줄 = Array.isArray(몸?.content) ? (몸.content as (이슈원본 & { createdAt?: unknown })[]) : [];
  const 잘림 = typeof 몸?.totalElements === 'number' ? 몸.totalElements > (page + 1) * 최대줄 : 줄.length >= 최대줄;
  return {
    ok: true,
    data: { items: 줄.slice(0, 최대줄).map((d) => ({ key: 글(d.key), title: 글(d.summary), status: 글(d.currentStateKey), createdAt: 글(d.createdAt) })), ...(잘림 && { truncated: true }) },
  };
}

type 이슈원본 = { key?: unknown; summary?: unknown; currentStateKey?: unknown; description?: unknown };
const 글 = (v: unknown): string => (typeof v === 'string' ? v : '');

// Issue Bunker 답에서 쓸 칸만 — 키 · 제목 · 상태 · 본문. 담당자 · 우선순위 · 사용자 지정 칸 같은 나머지는 AI 판단에 안 쓰고 맥락 창만 먹는다.
// 닫힌 이슈도 빼지 않는다 — 수정 AI 가 같은 버그가 전에 닫혔는지 상태로 본다
const 이슈하나 = (d: 이슈원본) => ({ key: 글(d.key), title: 글(d.summary), status: 글(d.currentStateKey), body: 자르기(글(d.description), 글상한.이슈본문) });

/** 찾기 답 — BTS 가 센 전체 수가 이 쪽 끝을 넘으면 잘린 것. 전체 수가 없는 답이면 30줄을 꽉 채웠을 때 잘렸다고 본다 — 다 받은 것으로 믿는 쪽보다 한 번 더 찾게 하는 쪽이 낫다 */
function 찾은줄(data: unknown, 전체: unknown, page: number): unknown {
  const 줄 = Array.isArray(data) ? (data as 이슈원본[]) : [];
  const 잘림 = typeof 전체 === 'number' ? 전체 > (page + 1) * 최대줄 : 줄.length >= 최대줄;
  return { items: 줄.slice(0, 최대줄).map((d) => ({ key: 글(d.key), title: 글(d.summary), status: 글(d.currentStateKey) })), ...(잘림 && { truncated: true }) };
}

/** 댓글 — 최근 20개만, 하나에 1,000자. BTS 가 작성 시각 오름차순으로 준다(CommentController). 못 읽었으면 빈 목록과 까닭 */
function 댓글칸(답: BTS응답 | null): { comments: { body: string; createdAt: string }[]; moreComments?: number; commentsError?: string } {
  if (답 === null) return { comments: [], commentsError: 'Issue Bunker 에 닿지 못했다' };
  if (답.status !== 200) return { comments: [], commentsError: `HTTP ${String(답.status)}` };
  const 원본 = (답.json as { data?: unknown } | null)?.data;
  const 줄 = (Array.isArray(원본) ? (원본 as { body?: unknown; createdAt?: unknown }[]) : []).flatMap((c) =>
    typeof c.body === 'string' ? [{ body: c.body, createdAt: 글(c.createdAt) }] : [],
  );
  return {
    comments: 줄.slice(-최대댓글).map((c) => ({ body: 자르기(c.body, 글상한.댓글), createdAt: c.createdAt })),
    ...(줄.length > 최대댓글 && { moreComments: 줄.length - 최대댓글 }),
  };
}
