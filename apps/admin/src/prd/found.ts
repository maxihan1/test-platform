// 「PRD 에 없는 화면」 셈 — 찾은 화면 가운데 지도로 닿지 않는 틀과 그 화면을 작성 중인 요청 (도메인/작성 §7 GET /api/prd)

import type { PrdItem } from '@platform/kit';

import { 주소틀 } from '../../../../scripts/authoring-crawl-rules.js';
import { 열린화면요청 } from '../authoring/uncovered.js';
import { db } from '../settings/store.js';

export interface 없는화면 {
  state: string;
  url: string;
  name: string;
}

export interface 찾은화면셈 {
  uncoveredScreens: 없는화면[];
  foundScreens: number;
  screensOpen: number[];
}

/**
 * 지금 판 번호 → 지도 ① → 활성 케이스 → 지도 ② 화면 주소를 크롤러 같은 틀로 바꾼 것에 없는 찾은 화면.
 * 상태(로그아웃 · 로그인)는 안 가른다 — 화면 파일은 상태를 모른다. 판이 없으면 번호 집합이 비어 찾은 화면 전부가 해당한다
 */
export async function 찾은화면셈(서비스: number, items: PrdItem[]): Promise<찾은화면셈> {
  const pool = await db();
  const [찾음, 틀들, 열림] = await Promise.all([
    pool.query<{ state: string; url: string; name: string }>(
      'SELECT state, url, name FROM screen_found WHERE service_id = $1 ORDER BY state COLLATE "C", url COLLATE "C"',
      [서비스],
    ),
    pool.query<{ screen_url: string }>(
      `SELECT DISTINCT cs.screen_url
         FROM req_case r
         JOIN test_case t ON t.tc_id = r.tc_id AND t.is_active
         JOIN case_screen cs ON cs.tc_id = r.tc_id
        WHERE r.service_id = $1 AND r.req_id = ANY($2::text[]) AND cs.screen_url IS NOT NULL`,
      [서비스, items.map((x) => x.reqId)],
    ),
    열린화면요청(서비스),
  ]);
  const 닿는틀 = new Set(틀들.rows.map((x) => 주소틀(x.screen_url)).filter((x): x is string => x !== null));
  return {
    uncoveredScreens: 찾음.rows.filter((x) => !닿는틀.has(x.url)),
    foundScreens: 찾음.rowCount ?? 0,
    screensOpen: 열림,
  };
}
