// 「PRD 에 없는 화면」 셈 — 찾은 화면 가운데 지도로 닿지 않는 틀 (도메인/작성 §3.6 「★ 결정 목록」 ③ 미검증 화면)

import { 주소틀, 틀닿나 } from '../../../../scripts/authoring-crawl-rules.js';
import { db } from '../settings/store.js';

export interface 없는화면 {
  state: string;
  url: string;
  name: string;
}

export interface 찾은화면셈 {
  uncoveredScreens: 없는화면[];
  /** 결정 목록에서 [제외]한 화면 — 셈에서 빼고 되돌리기 목록에 보인다. 이름은 찾은 화면에 남아 있을 때만 (§3.6 「제외한 화면」) */
  skippedScreens: { url: string; name: string }[];
}

/**
 * 그 애플리케이션의 활성 케이스 → 지도 ② 화면 주소 · 여는 주소를 크롤러 같은 틀로 바꾼 것에 닿지 않는 찾은 화면(`틀닿나` — 인자 없는 주소는 인자 붙은 틀도 덮는다).
 * 요구 번호는 안 본다 — 「테스트가 확인하지 않은 화면」이라 요구 없는 케이스가 들르는 화면도 확인한 화면이다(앞 판은 지금 판 → 지도 ① 로 셌다 · 작성 §3.6 「세는 방식」).
 * 상태(로그아웃 · 로그인:<역할>)는 안 가른다 — 화면 파일은 상태를 모른다
 */
export async function 찾은화면셈(서비스: number): Promise<찾은화면셈> {
  const pool = await db();
  const [찾음, 틀들, 뺌] = await Promise.all([
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
    pool.query<{ skip_screens: string[] }>('SELECT skip_screens FROM service WHERE id = $1', [서비스]),
  ]);
  const 뺀것 = 뺌.rows[0]?.skip_screens ?? [];
  const 이름 = new Map(찾음.rows.map((x) => [x.url, x.name]));
  const 닿는틀 = new Set(틀들.rows.map((x) => 주소틀(x.screen_url)).filter((x): x is string => x !== null));
  return {
    uncoveredScreens: 찾음.rows.filter((x) => !틀닿나(x.url, 닿는틀) && !뺀것.includes(x.url)),
    skippedScreens: 뺀것.map((url) => ({ url, name: 이름.get(url) ?? '' })),
  };
}

/** 제외 목록 상한 — 한 애플리케이션의 찾은 화면보다 넉넉하다. 넘으면 사람이 무엇을 뺐는지 못 본다 */
export const 제외화면상한 = 500;

/**
 * [제외] · [되돌리기] — 결정 목록 「테스트가 확인하지 않은 화면」(§3.6 「제외한 화면」). 빼는 것은 찾은 화면에 있는 틀만,
 * 되돌리기는 목록에 있으면 뺀다. 같은 틀을 두 번 빼도 한 줄이다
 */
export async function 화면제외바꾸기(서비스: number, url: string, skip: boolean): Promise<'OK' | 'BAD_SCREEN' | 'TOO_MANY'> {
  const pool = await db();
  if (!skip) {
    await pool.query('UPDATE service SET skip_screens = array_remove(skip_screens, $2) WHERE id = $1', [서비스, url]);
    return 'OK';
  }
  const 있나 = await pool.query('SELECT 1 FROM screen_found WHERE service_id = $1 AND url = $2 LIMIT 1', [서비스, url]);
  if (있나.rowCount === 0) return 'BAD_SCREEN';
  const r = await pool.query(
    `UPDATE service SET skip_screens = CASE WHEN $2 = ANY(skip_screens) THEN skip_screens ELSE array_append(skip_screens, $2) END
      WHERE id = $1 AND ($2 = ANY(skip_screens) OR cardinality(skip_screens) < $3)`,
    [서비스, url, 제외화면상한],
  );
  return r.rowCount === 0 ? 'TOO_MANY' : 'OK';
}
