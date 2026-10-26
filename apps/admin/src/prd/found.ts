// 「PRD 에 없는 화면」 셈 — 찾은 화면 가운데 지도로 닿지 않는 틀과 그 화면을 작성 중인 요청 (도메인/작성 §7 GET /api/prd)

import { 주소틀, 틀닿나 } from '../../../../scripts/authoring-crawl-rules.js';
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
 * 그 애플리케이션의 활성 케이스 → 지도 ② 화면 주소 · 여는 주소를 크롤러 같은 틀로 바꾼 것에 닿지 않는 찾은 화면(`틀닿나` — 인자 없는 주소는 인자 붙은 틀도 덮는다).
 * 요구 번호는 안 본다 — 「테스트가 확인하지 않은 화면」이라 요구 없는 케이스가 들르는 화면도 확인한 화면이다(앞 판은 지금 판 → 지도 ① 로 셌다 · 작성 §3.6 「세는 방식」).
 * 상태(로그아웃 · 로그인:<역할>)는 안 가른다 — 화면 파일은 상태를 모른다
 */
export async function 찾은화면셈(서비스: number): Promise<찾은화면셈> {
  const pool = await db();
  const [찾음, 틀들, 열림] = await Promise.all([
    // 대상 서버는 합친다 — 화면 파일은 서버를 모른다. 이름은 빈 것보다 있는 것 (PRD-F9-29)
    pool.query<{ state: string; url: string; name: string }>(
      `SELECT state, url, max(name) AS name FROM screen_found WHERE service_id = $1
        GROUP BY state, url ORDER BY state COLLATE "C", url COLLATE "C"`,
      [서비스],
    ),
    // 지도 ② 에는 서비스 칸이 없어 tcId 접두사로 가른다(`XPD-` — 접두사 뒤 하이픈까지라 `XPDB-` 는 안 걸린다)
    pool.query<{ screen_url: string }>(
      `SELECT DISTINCT u.url AS screen_url
         FROM service s
         JOIN case_screen cs ON cs.tc_id LIKE s.prefix || '-%'
         JOIN test_case t ON t.tc_id = cs.tc_id AND t.is_active
         CROSS JOIN LATERAL unnest(cs.open_urls || cs.screen_url) AS u(url)
        WHERE s.id = $1 AND u.url IS NOT NULL`,
      [서비스],
    ),
    열린화면요청(서비스),
  ]);
  const 닿는틀 = new Set(틀들.rows.map((x) => 주소틀(x.screen_url)).filter((x): x is string => x !== null));
  return {
    uncoveredScreens: 찾음.rows.filter((x) => !틀닿나(x.url, 닿는틀)),
    foundScreens: 찾음.rowCount ?? 0,
    screensOpen: 열림,
  };
}
