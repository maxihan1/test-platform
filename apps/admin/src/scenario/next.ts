// E2E 다음 단계 추천 — 앞 케이스가 머무는 화면에서 화면 연결로 이어지는 화면에 닿는 케이스를 찾는다 (도메인/시나리오 §3.7 「부품」 · §7)
// 정상 쪽만 남기는 일은 화면이 팔레트와 같은 규칙으로 한다 — 같은 규칙을 서버에 또 두면 둘이 어긋난다 (§8.11)

import { 주소틀, 틀닿나 } from '../../../../scripts/authoring-crawl-rules.js';
import { tcId종류 } from '../catalog/rules.js';
import { db } from '../settings/store.js';

export interface 다음케이스 {
  tcId: string;
  /** 이어지는 화면 — 크롤러 같은 틀(숫자 마디는 `:n`) */
  screen: string;
}

type 화면줄 = { tcId: string; url: string };
/** 화면 연결 한 줄 — 상태 · 출발 · 도착은 크롤러 같은 틀, via 는 누른 것(`링크 「쇼핑」` · `버튼 「담기」`) */
type 연결줄 = { state: string; from: string; to: string; via: string };

// 머리 · 바닥 메뉴로 볼 만큼 화면이 있어야 센다 — 화면 두셋인 상태는 무엇이든 「절반 넘게」가 된다
const 메뉴셈최소화면 = 4;

/** 그 케이스가 머무는 화면들의 같은 틀. 화면 파일은 상태를 모르므로 로그아웃 · 로그인을 안 가른다 (prd/found.ts 와 같다) */
export function 머문틀(after: string, 화면들: 화면줄[]): string[] {
  return [...new Set(화면들.filter((x) => x.tcId === after).flatMap((x) => 주소틀(x.url) ?? []))];
}

// 링크 글자 속 숫자(장바구니 개수 `🛒2`)는 화면마다 달라도 같은 링크다
const 글자정리 = (via: string): string => via.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
const 메뉴키 = (l: 연결줄): string => `${l.state} ${l.to} ${글자정리(l.via)}`;

/**
 * 머리 · 바닥 메뉴 — 같은 상태의 출발 화면 절반 넘게에서 같은 도착 · 같은 글자로 나가는 링크 (PRD-F9-21).
 * 도착 화면이 아니라 링크로 가른다 — 「상품 상세 → 장바구니」 는 「담기」 버튼으로도 가서 그 길은 남는다
 */
function 메뉴링크들(연결들: 연결줄[]): Set<string> {
  const 출발 = new Map<string, Set<string>>();
  const 링크 = new Map<string, { state: string; 곳: Set<string> }>();
  for (const l of 연결들) {
    출발.set(l.state, (출발.get(l.state) ?? new Set()).add(l.from));
    const 칸 = 링크.get(메뉴키(l)) ?? { state: l.state, 곳: new Set<string>() };
    링크.set(메뉴키(l), { ...칸, 곳: 칸.곳.add(l.from) });
  }
  return new Set(
    [...링크].filter(([, { state, 곳 }]) => {
      const 전체 = 출발.get(state)!.size;
      return 전체 >= 메뉴셈최소화면 && 곳.size * 2 > 전체;
    }).map(([키]) => 키),
  );
}

/**
 * 머문 화면에서 나간 연결의 도착 화면에 닿는 케이스. 앞 케이스가 이미 쓰는 화면으로 가는 연결 · 머리 · 바닥 메뉴 링크는 다음 화면이 아니라 뺀다.
 * 화면 파일 주소와 크롤러 틀은 `틀닿나` 로 맞춘다(인자 없는 주소는 인자 붙은 틀도 덮는다 — PRD-F9-04).
 * 앞 케이스 자신과 UI 테스트(E2E 부품이 아니다)는 뺀다. 여러 화면에 닿으면 받은 차례의 첫 화면을 적는다
 */
export function 다음케이스들(after: string, 화면들: 화면줄[], 연결들: 연결줄[]): 다음케이스[] {
  const 머문 = new Set(머문틀(after, 화면들));
  const 메뉴 = 메뉴링크들(연결들);
  const 이어짐 = [...new Set(연결들.filter((l) => 틀닿나(l.from, 머문) && !틀닿나(l.to, 머문) && !메뉴.has(메뉴키(l))).map((l) => l.to))];
  const 고른 = new Map<string, string>();
  for (const x of 화면들) {
    const 곳 = 주소틀(x.url);
    if (곳 === null || x.tcId === after || 고른.has(x.tcId) || tcId종류(x.tcId) === 'UI') continue;
    if (이어짐.some((to) => 틀닿나(to, new Set([곳])))) 고른.set(x.tcId, 곳);
  }
  return [...고른].map(([tcId, screen]) => ({ tcId, screen }));
}

/**
 * 그 서비스 활성 케이스의 지도 ② 화면 주소와 화면 연결로 추천을 낸다. 남의 서비스 케이스를 after 로 주면 빈 목록이다.
 * 화면 연결은 대상 서버를 합쳐 다 읽는다 — 머리 · 바닥 메뉴를 가르려면 다른 화면의 링크도 봐야 한다
 */
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
  if (머문틀(after, 화면들).length === 0) return [];
  const 연결 = await pool.query<{ state: string; from_url: string; to_url: string; via: string }>(
    'SELECT DISTINCT state, from_url, to_url, via FROM screen_link WHERE service_id = $1',
    [서비스],
  );
  return 다음케이스들(after, 화면들, 연결.rows.map((r) => ({ state: r.state, from: r.from_url, to: r.to_url, via: r.via })));
}
