// 케이스 목록 맥락의 재료를 DB 에서 읽는다 — 표준 기획서 지금 판 · 지도 ① ② · 서비스 지도 (도메인/카탈로그 §8.1 「맥락」)
// context.ts 가 300줄에 닿아 DB 읽기만 떼어 냈다. 판단은 context.ts 의 순수 함수가 한다

import type { PrdItem } from '@platform/kit';

import { 맥락짓기, type 맥락표, type 종류 } from './context.js';

/** 그 서비스의 지도 ① ② 와 표준 기획서 지금 판. 서비스 · 판이 없으면 빈 표다 */
export async function 맥락읽기(prefix: string): Promise<맥락표> {
  const { pool } = await import('../db/index.js');
  const [판, 요구, 화면, 서버, 끝점] = await Promise.all([
    pool.query<{ items: PrdItem[] }>(
      `SELECT pv.items FROM prd_version pv JOIN service s ON s.id = pv.service_id
        WHERE s.prefix = $1 ORDER BY pv.version DESC LIMIT 1`,
      [prefix],
    ),
    pool.query<{ req_id: string; tc_id: string; axis: 종류 }>(
      'SELECT rc.req_id, rc.tc_id, rc.axis FROM req_case rc JOIN service s ON s.id = rc.service_id WHERE s.prefix = $1',
      [prefix],
    ),
    pool.query<{ tc_id: string; file: string; screen_url: string | null; name: string | null }>(
      'SELECT tc_id, file, screen_url, name FROM case_screen WHERE tc_id LIKE $1',
      [`${prefix}-%`],
    ),
    // 케이스를 실행해서 부른 호스트의 이름만 — 크롤러가 본 호출(화면 줄)은 tc_id 가 비어 안 든다 (§8.1 「API 서버」)
    pool.query<{ tc_id: string; name: string }>(
      `SELECT DISTINCT u.tc_id, n.name
         FROM service_api_use u
         JOIN service_api a ON a.id = u.api_id
         JOIN service s ON s.id = a.service_id
         JOIN project_api_server n ON n.project_id = s.project_id AND n.host = a.host
        WHERE s.prefix = $1 AND u.tc_id IS NOT NULL`,
      [prefix],
    ),
    // 엔드포인트는 API 애플리케이션만 — 웹 케이스도 지도에 호출이 쌓이지만 묶음은 화면이다 (§8.1 「맥락」)
    pool.query<{ tc_id: string; method: string; path: string; step: number | null }>(
      `SELECT u.tc_id, a.method, a.path, (SELECT min(x) FROM unnest(u.steps) x) AS step
         FROM service_api_use u
         JOIN service_api a ON a.id = u.api_id
         JOIN service s ON s.id = a.service_id
        WHERE s.prefix = $1 AND s.kind = 'API' AND u.tc_id IS NOT NULL`,
      [prefix],
    ),
  ]);
  return 맥락짓기({
    prd: 판.rows[0]?.items ?? [],
    reqs: 요구.rows.map((r) => ({ reqId: r.req_id, tcId: r.tc_id, axis: r.axis })),
    screens: 화면.rows.map((r) => ({ tcId: r.tc_id, file: r.file, url: r.screen_url, name: r.name })),
    apis: 서버.rows.map((r) => ({ tcId: r.tc_id, name: r.name })),
    endpoints: 끝점.rows.map((r) => ({ tcId: r.tc_id, method: r.method, path: r.path, step: r.step })),
  });
}
