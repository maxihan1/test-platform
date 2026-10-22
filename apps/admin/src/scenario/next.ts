// E2E 다음 단계 추천 — 앞 케이스가 머무는 화면에서 화면 연결로 이어지는 화면에 닿는 케이스를 찾는다. 케이스 단계가 없으면 첫 단계 후보 (도메인/시나리오 §3.7 「부품」 · 결정 15 · §7)
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
export type 연결줄 = { state: string; from: string; to: string; via: string };

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

/** 머리 · 바닥 메뉴 링크를 뺀 화면 연결 — AI 흐름 후보 재료도 다음 단계 추천과 같은 규칙으로 뺀다 (결정 15) */
export function 메뉴뺀연결들(연결들: 연결줄[]): 연결줄[] {
  const 메뉴 = 메뉴링크들(연결들);
  return 연결들.filter((l) => !메뉴.has(메뉴키(l)));
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
  return 닿는케이스들(이어짐, 화면들, after);
}

/** 그 화면들 가운데 하나에 닿는 케이스. UI 테스트와 뺄 케이스는 뺀다. 여러 화면에 닿으면 받은 차례의 첫 화면을 적는다 */
function 닿는케이스들(곳들: string[], 화면들: 화면줄[], 뺄?: string): 다음케이스[] {
  const 고른 = new Map<string, string>();
  for (const x of 화면들) {
    const 곳 = 주소틀(x.url);
    if (곳 === null || x.tcId === 뺄 || 고른.has(x.tcId) || tcId종류(x.tcId) === 'UI') continue;
    if (곳들.some((to) => 틀닿나(to, new Set([곳])))) 고른.set(x.tcId, 곳);
  }
  return [...고른].map(([tcId, screen]) => ({ tcId, screen }));
}

/**
 * 출발 화면 — 대상 서버 주소마다 그 경로의 같은 틀. 경로가 없거나 그 틀의 화면 기록이 없으면 `/` 다.
 * 운영툴처럼 `/ops` 아래에 사는 애플리케이션이 `/` 만 보면 늘 빈다 (도메인/시나리오 §3.7 결정 15 「첫 단계 후보」)
 */
export function 출발틀들(대상주소들: string[], 기록틀: ReadonlySet<string>): string[] {
  return [...new Set(대상주소들.map((주소) => {
    // 크롤러가 대상 서버 주소에서 출발해 그 주소를 같은 틀(해시 라우트 포함)로 남긴다. 끝 빗금만 다른 기록도 같은 화면이다
    const 틀 = 주소틀(주소);
    return [틀, 틀?.replace(/(.)\/$/, '$1')].find((x): x is string => x !== null && x !== undefined && 기록틀.has(x)) ?? '/';
  }))];
}

/**
 * 첫 단계 후보 — 출발 화면이거나 출발 화면에서 화면 연결 한 번으로 닿는 화면의 케이스. 출발 화면 기록이 없으면 빈 목록.
 * 머리 · 바닥 메뉴 링크는 빼지 않는다 — 첫 화면에서는 메뉴가 곧 첫걸음이다
 */
export function 첫케이스들(출발: string[], 기록틀: ReadonlySet<string>, 화면들: 화면줄[], 연결들: 연결줄[]): 다음케이스[] {
  const 곳 = new Set(출발.filter((x) => 기록틀.has(x)));
  if (곳.size === 0) return [];
  const 닿음 = [...new Set([...곳, ...연결들.filter((l) => 틀닿나(l.from, 곳)).map((l) => l.to)])];
  return 닿는케이스들(닿음, 화면들);
}

/**
 * 그 서비스 활성 케이스의 지도 ② 화면 주소와 화면 연결로 추천을 낸다. 남의 서비스 케이스를 after 로 주면 빈 목록이다.
 * 화면 연결은 대상 서버를 합쳐 다 읽는다 — 머리 · 바닥 메뉴를 가르려면 다른 화면의 링크도 봐야 한다
 */
export async function 다음케이스읽기(서비스: number, prefix: string, after: string): Promise<다음케이스[]> {
  if (!after.startsWith(`${prefix}-`)) return [];
  const 화면들 = await 케이스화면들(prefix);
  if (머문틀(after, 화면들).length === 0) return [];
  return 다음케이스들(after, 화면들, await 화면연결들(서비스));
}

/** 첫 단계 후보를 그 애플리케이션의 대상 서버 주소 · 화면 기록 · 지도 ② · 화면 연결로 낸다. 화면 기록은 상태 · 대상 서버를 안 가른다 */
export async function 첫케이스읽기(서비스: number, prefix: string): Promise<다음케이스[]> {
  const pool = await db();
  const [대상, 기록, 화면들, 연결들] = await Promise.all([
    pool.query<{ base_url: string }>('SELECT base_url FROM service_env WHERE service_id = $1', [서비스]),
    pool.query<{ url: string }>('SELECT DISTINCT url FROM screen_record WHERE service_id = $1', [서비스]),
    케이스화면들(prefix),
    화면연결들(서비스),
  ]);
  const 기록틀 = new Set(기록.rows.map((r) => r.url));
  return 첫케이스들(출발틀들(대상.rows.map((r) => r.base_url), 기록틀), 기록틀, 화면들, 연결들);
}

async function 케이스화면들(prefix: string): Promise<화면줄[]> {
  const 화면 = await (await db()).query<{ tc_id: string; screen_url: string }>(
    `SELECT cs.tc_id, cs.screen_url FROM case_screen cs JOIN test_case t ON t.tc_id = cs.tc_id AND t.is_active
      WHERE cs.tc_id LIKE $1 AND cs.screen_url IS NOT NULL
      ORDER BY cs.tc_id COLLATE "C", cs.screen_url COLLATE "C"`,
    [`${prefix}-%`],
  );
  return 화면.rows.map((r) => ({ tcId: r.tc_id, url: r.screen_url }));
}

export async function 화면연결들(서비스: number): Promise<연결줄[]> {
  const 연결 = await (await db()).query<{ state: string; from_url: string; to_url: string; via: string }>(
    'SELECT DISTINCT state, from_url, to_url, via FROM screen_link WHERE service_id = $1',
    [서비스],
  );
  return 연결.rows.map((r) => ({ state: r.state, from: r.from_url, to: r.to_url, via: r.via }));
}
