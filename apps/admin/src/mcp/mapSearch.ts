// MCP 지도 찾기(map_search) — 요구 ↔ 케이스(지도 ①) ↔ 화면(지도 ②) · 프로시저 안 케이스면 프로시저 번호 · 이름 · 차례 (도메인/BTS §7 「MCP」 · 챗봇.md §3.14 「테스트 프로시저」)

import type { 사용자 } from '../auth/store.js';
import { 케이스의서비스 } from '../auth/scope.js';
import { 지금판 } from '../prd/store.js';
import { 막힘, 없음, 안목록, 열기, 최대줄, type 도구답 } from './tools.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
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
  const [요구, 화면, 프로시저] = await Promise.all([
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
    // 프로시저 안 케이스만 칸이 있다 — 혼자 못 돌고 어느 프로시저와 같이 도는지 답하게 한다
    pool.query<{ tc_id: string; proc_id: string | null; proc_name: string | null; proc_seq: number | null }>(
      'SELECT tc_id, proc_id, proc_name, proc_seq FROM test_case WHERE tc_id = ANY($1) AND proc_id IS NOT NULL',
      [케이스들],
    ),
  ]);
  return {
    ok: true,
    data: {
      cases: 케이스들.map((tcId) => {
        const reqs = 요구.rows.filter((x) => x.tc_id === tcId);
        const screens = 화면.rows.filter((x) => x.tc_id === tcId);
        const 절차 = 프로시저.rows.find((x) => x.tc_id === tcId);
        return {
          tcId,
          ...(절차 !== undefined && { procId: 절차.proc_id, procName: 절차.proc_name, procSeq: 절차.proc_seq }),
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
