// E2E 다음 단계 추천 — 앞 케이스가 머무는 화면에서 화면 연결로 이어지는 화면에 닿는 케이스를 찾는다 (도메인/시나리오 §3.7 「부품」 · §7)
// 정상 쪽만 남기는 일은 화면이 팔레트와 같은 규칙으로 한다 — 같은 규칙을 서버에 또 두면 둘이 어긋난다 (§8.11)

import { 주소틀 } from '../../../../scripts/authoring-crawl-rules.js';
import { tcId종류 } from '../catalog/rules.js';
import { db } from '../settings/store.js';

export interface 다음케이스 {
  tcId: string;
  /** 이어지는 화면 — 크롤러 같은 틀(숫자 마디는 `:n`) */
  screen: string;
}

type 화면줄 = { tcId: string; url: string };

/** 그 케이스가 머무는 화면들의 같은 틀. 화면 파일은 상태를 모르므로 로그아웃 · 로그인을 안 가른다 (prd/found.ts 와 같다) */
export function 머문틀(after: string, 화면들: 화면줄[]): string[] {
  return [...new Set(화면들.filter((x) => x.tcId === after).flatMap((x) => 주소틀(x.url) ?? []))];
}

/**
 * 머문 화면에서 나간 연결의 도착 화면에 닿는 케이스. 앞 케이스가 이미 쓰는 화면으로 가는 연결은 다음 화면이 아니라 뺀다.
 * 앞 케이스 자신과 UI 테스트(E2E 부품이 아니다)는 뺀다. 여러 화면에 닿으면 받은 차례의 첫 화면을 적는다
 */
export function 다음케이스들(after: string, 화면들: 화면줄[], 연결들: { from: string; to: string }[]): 다음케이스[] {
  const 머문 = new Set(머문틀(after, 화면들));
  // ponytail: 머리 · 바닥 링크도 연결이라 홈 · 장바구니처럼 어디서나 가는 화면의 케이스는 늘 추천에 든다.
  // 자주 가는 곳을 걸러 내면 「상품 상세 → 장바구니」 같은 진짜 흐름도 빠진다. 일괄 시험에서 너무 넓으면 크롤러가 링크 자리를 적게 한다
  const 이어짐 = new Set(연결들.filter((l) => 머문.has(l.from) && !머문.has(l.to)).map((l) => l.to));
  const 고른 = new Map<string, string>();
  for (const x of 화면들) {
    const 곳 = 주소틀(x.url);
    if (곳 === null || !이어짐.has(곳) || x.tcId === after || 고른.has(x.tcId) || tcId종류(x.tcId) === 'UI') continue;
    고른.set(x.tcId, 곳);
  }
  return [...고른].map(([tcId, screen]) => ({ tcId, screen }));
}

/** 그 서비스 활성 케이스의 지도 ② 화면 주소와 화면 연결로 추천을 낸다. 남의 서비스 케이스를 after 로 주면 빈 목록이다 */
export async function 다음케이스읽기(서비스: number, prefix: string, after: string): Promise<다음케이스[]> {
  if (!after.startsWith(`${prefix}-`)) return [];
  const pool = await db();
  const 화면 = await pool.query<{ tc_id: string; screen_url: string }>(
    `SELECT cs.tc_id, cs.screen_url FROM case_screen cs JOIN test_case t ON t.tc_id = cs.tc_id AND t.is_active
      WHERE cs.tc_id LIKE $1 AND cs.screen_url IS NOT NULL
      ORDER BY cs.tc_id COLLATE "C", cs.screen_url COLLATE "C"`,
    [`${prefix}-%`],
  );
  const 화면들 = 화면.rows.map((r) => ({ tcId: r.tc_id, url: r.screen_url }));
  const 머문 = 머문틀(after, 화면들);
  if (머문.length === 0) return [];
  const 연결 = await pool.query<{ from_url: string; to_url: string }>(
    'SELECT DISTINCT from_url, to_url FROM screen_link WHERE service_id = $1 AND from_url = ANY($2::text[])',
    [서비스, 머문],
  );
  return 다음케이스들(after, 화면들, 연결.rows.map((r) => ({ from: r.from_url, to: r.to_url })));
}
