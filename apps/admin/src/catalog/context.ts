// 케이스 목록의 맥락 — 지도 ① ② 와 표준 기획서 지금 판에서 기능 묶음 · 요구 · 화면을 붙이고 접는 차례를 짓는다 (도메인/카탈로그 §8.1 「맥락」)
// 카탈로그는 표준 기획서를 읽기만 한다 (카탈로그 §3.1 「지도」). 판단은 순수 함수로 두고 DB 읽기는 맨 아래 하나다

import type { PrdItem } from '@platform/kit';

/** 지도 ① 의 축 칸 그대로 — req_case 의 CHECK 와 같은 넷이다 (공통/4-데이터모델) */
export const 종류들 = ['정상', '경계', '예외', 'UI'] as const;
export type 종류 = (typeof 종류들)[number];

export interface CaseReq {
  reqId: string;
  /** 표준 기획서 지금 판에 없는 번호(옛 표의 원본 번호)면 null — 화면이 「PRD 에 없는 번호」로 보인다 */
  text: string | null;
  axis: 종류;
}

export interface CaseScreen {
  /** 저장소 뿌리 기준 경로 — `tests/<폴더>/pages/<이름>.page.ts` 또는 `components/<이름>.component.ts` */
  file: string;
  url: string | null;
}

export interface CaseContext {
  feature: string | null;
  reqs: CaseReq[];
  screens: CaseScreen[];
}

/** 목록이 접는 자리 하나 — 기능 묶음 > 화면 > 화면 조각. 화면 · 화면 조각은 파일 경로이고 없으면 null 이다 */
export interface CaseGroup {
  feature: string | null;
  screen: string | null;
  screenUrl: string | null;
  part: string | null;
  tcIds: string[];
}

export interface 맥락재료 {
  prd: Pick<PrdItem, 'reqId' | 'feature' | 'text'>[];
  reqs: { reqId: string; tcId: string; axis: 종류 }[];
  screens: { tcId: string; file: string; url: string | null }[];
}

interface 자리 {
  // 기능 묶음이 판에 처음 나온 차례. 묶음 없음은 맨 뒤
  차례: number;
  // 묶음 안 차례 — 화면 주소(없으면 파일 경로). 파일 이름 차례면 `signup-done` 이 `signup` 앞에 선다
  화면차례: string;
  screen: string | null;
  screenUrl: string | null;
  part: string | null;
}

export type 맥락표 = Map<string, CaseContext & { 자리: 자리 }>;

const 빈맥락: CaseContext = { feature: null, reqs: [], screens: [] };

export function 맥락(표: 맥락표, tcId: string): CaseContext {
  const 것 = 표.get(tcId);
  return 것 === undefined ? 빈맥락 : { feature: 것.feature, reqs: 것.reqs, screens: 것.screens };
}

const 화면순 = (s: CaseScreen) => s.url ?? s.file;

export function 맥락짓기(재료: 맥락재료): 맥락표 {
  const 번호차례 = new Map(재료.prd.map((x, i) => [x.reqId, i]));
  const 묶음차례 = new Map<string, number>();
  재료.prd.forEach((x, i) => {
    if (!묶음차례.has(x.feature)) 묶음차례.set(x.feature, i);
  });
  const 판 = new Map(재료.prd.map((x) => [x.reqId, x]));

  const 요구들 = new Map<string, CaseReq[]>();
  for (const r of 재료.reqs) {
    const 줄 = 요구들.get(r.tcId) ?? [];
    줄.push({ reqId: r.reqId, text: 판.get(r.reqId)?.text ?? null, axis: r.axis });
    요구들.set(r.tcId, 줄);
  }
  const 화면들 = new Map<string, CaseScreen[]>();
  for (const s of 재료.screens) {
    const 줄 = 화면들.get(s.tcId) ?? [];
    줄.push({ file: s.file, url: s.url });
    화면들.set(s.tcId, 줄);
  }

  const 표: 맥락표 = new Map();
  for (const tcId of new Set([...요구들.keys(), ...화면들.keys()])) {
    // 판의 차례가 앞인 요구가 먼저 — 그 요구의 기능 묶음이 케이스의 묶음이다(카탈로그 §7 계약 블록). 판에 없는 번호는 뒤에 번호 차례로
    const reqs = (요구들.get(tcId) ?? []).sort(
      (a, b) => (번호차례.get(a.reqId) ?? Infinity) - (번호차례.get(b.reqId) ?? Infinity) || a.reqId.localeCompare(b.reqId),
    );
    const 첫요구 = reqs.find((r) => 판.has(r.reqId));
    const feature = 첫요구 === undefined ? null : 판.get(첫요구.reqId)!.feature;
    // 여러 화면을 쓰면 주소가 앞선 것 아래에 묶는다 — 가져오는 차례는 지도에 없다(카탈로그 §8.1 「맥락」)
    const screens = (화면들.get(tcId) ?? []).sort((a, b) => 화면순(a).localeCompare(화면순(b)) || a.file.localeCompare(b.file));
    const 화면 = screens.find((s) => s.file.endsWith('.page.ts')) ?? null;
    const 조각 = screens.find((s) => s.file.endsWith('.component.ts')) ?? null;
    표.set(tcId, {
      feature,
      reqs,
      screens,
      자리: {
        차례: feature === null ? Infinity : 묶음차례.get(feature)!,
        화면차례: 화면 === null ? '' : 화면순(화면),
        screen: 화면?.file ?? null,
        screenUrl: 화면?.url ?? null,
        part: 조각?.file ?? null,
      },
    });
  }
  return 표;
}

const 빈자리: 자리 = { 차례: Infinity, 화면차례: '', screen: null, screenUrl: null, part: null };

/** 목록 순서 — 기능 묶음(판 차례) → 화면(주소) → 화면 조각 → 번호. 화면 없는 케이스가 그 묶음 맨 앞이다 — 머리 줄 없이 묶음 바로 아래 선다 */
export function 줄세우기(tcIds: string[], 표: 맥락표): { 차례: string[]; groups: CaseGroup[] } {
  const 자리of = (id: string) => 표.get(id)?.자리 ?? 빈자리;
  const 차례 = [...tcIds].sort((a, b) => {
    const x = 자리of(a);
    const y = 자리of(b);
    if (x.차례 !== y.차례) return x.차례 < y.차례 ? -1 : 1;
    return (
      x.화면차례.localeCompare(y.화면차례) ||
      (x.screen ?? '').localeCompare(y.screen ?? '') ||
      (x.part ?? '').localeCompare(y.part ?? '') ||
      a.localeCompare(b)
    );
  });

  const groups: CaseGroup[] = [];
  for (const id of 차례) {
    const 곳 = 자리of(id);
    const feature = 표.get(id)?.feature ?? null;
    const 끝 = groups.at(-1);
    if (끝 !== undefined && 끝.feature === feature && 끝.screen === 곳.screen && 끝.part === 곳.part) 끝.tcIds.push(id);
    else groups.push({ feature, screen: 곳.screen, screenUrl: 곳.screenUrl, part: 곳.part, tcIds: [id] });
  }
  return { 차례, groups };
}

export interface 맥락조건 {
  /** 빈 글자는 「기능 묶음 없음」이다 */
  feature?: string;
  /** 빈 글자는 「화면 없음」이다 — 화면 없이 화면 조각만 쓰는 묶음 머리가 자기 자리만 거르려면 필요하다 */
  screen?: string;
  part?: string;
  axis?: 종류;
  req?: string;
}

/** 「이것만 보기」는 묶음 자리를 그대로 거른다 — 케이스가 쓰는 다른 화면으로는 안 걸린다. 걸리면 고른 묶음에 다른 묶음 머리가 섞여 보인다 */
export function 맥락거르기(tcIds: string[], 표: 맥락표, 조건: 맥락조건): string[] {
  return tcIds.filter((id) => {
    const 것 = 표.get(id);
    const 곳 = 것?.자리 ?? 빈자리;
    const reqs = 것?.reqs ?? [];
    if (조건.feature !== undefined && (것?.feature ?? '') !== 조건.feature) return false;
    if (조건.screen !== undefined && (곳.screen ?? '') !== 조건.screen) return false;
    if (조건.part !== undefined && 곳.part !== 조건.part) return false;
    if (조건.axis !== undefined && !reqs.some((r) => r.axis === 조건.axis)) return false;
    if (조건.req !== undefined && !reqs.some((r) => r.reqId === 조건.req)) return false;
    return true;
  });
}

/** 찾기 칸이 요구 번호 · 요구 문장에도 맞는 케이스 — 이름 · 번호 맞추기는 SQL 이 한다 */
export function 요구로찾기(표: 맥락표, q: string): string[] {
  const 말 = q.toLowerCase();
  return [...표].filter(([, 것]) => 것.reqs.some((r) => r.reqId.toLowerCase().includes(말) || (r.text?.toLowerCase().includes(말) ?? false))).map(([id]) => id);
}

/** 쿼리 글자 그대로 — 같은 이름을 두 번 보내면 Fastify 가 배열로 준다 */
export type 맥락글 = { feature?: unknown; screen?: unknown; part?: unknown; axis?: unknown; req?: unknown };

// 배열이면 마지막 값을 쓴다 — 배열을 그대로 견주면 아무것도 안 맞아 조용히 빈 목록이 된다
const 한글자 = (x: unknown): string | undefined => {
  const 끝 = Array.isArray(x) ? (x.at(-1) as unknown) : x;
  return typeof 끝 === 'string' ? 끝 : undefined;
};

/**
 * 맥락 거르기 조건을 읽는다(카탈로그 §7). feature · screen 은 빈 글자도 조건이다 — 「없음」. 나머지는 빈 값이면 안 거른다.
 * 모르는 종류는 null — 설계 기법과 같은 까닭으로 거르지 않고 전부 내지 않는다
 */
export function 맥락조건읽기(q: 맥락글): 맥락조건 | null {
  const [feature, screen, part, axis, req] = [q.feature, q.screen, q.part, q.axis, q.req].map(한글자);
  const 있나 = (x: string | undefined): x is string => x !== undefined && x !== '';
  const 종류 = 종류들.find((a) => a === axis);
  if (있나(axis) && 종류 === undefined) return null;
  return {
    ...(feature === undefined ? {} : { feature }),
    ...(screen === undefined ? {} : { screen }),
    ...(있나(part) ? { part } : {}),
    ...(종류 === undefined ? {} : { axis: 종류 }),
    ...(있나(req) ? { req } : {}),
  };
}

export const 모르는종류 = (값: unknown) => ({ error: 'BAD_AXIS', detail: `종류는 정상 · 경계 · 예외 · UI 중 하나입니다 — ${String(값)}` });

/** 그 서비스의 지도 ① ② 와 표준 기획서 지금 판. 서비스 · 판이 없으면 빈 표다 */
export async function 맥락읽기(prefix: string): Promise<맥락표> {
  const { pool } = await import('../db/index.js');
  const [판, 요구, 화면] = await Promise.all([
    pool.query<{ items: PrdItem[] }>(
      `SELECT pv.items FROM prd_version pv JOIN service s ON s.id = pv.service_id
        WHERE s.prefix = $1 ORDER BY pv.version DESC LIMIT 1`,
      [prefix],
    ),
    pool.query<{ req_id: string; tc_id: string; axis: 종류 }>(
      'SELECT rc.req_id, rc.tc_id, rc.axis FROM req_case rc JOIN service s ON s.id = rc.service_id WHERE s.prefix = $1',
      [prefix],
    ),
    pool.query<{ tc_id: string; file: string; screen_url: string | null }>(
      'SELECT tc_id, file, screen_url FROM case_screen WHERE tc_id LIKE $1',
      [`${prefix}-%`],
    ),
  ]);
  return 맥락짓기({
    prd: 판.rows[0]?.items ?? [],
    reqs: 요구.rows.map((r) => ({ reqId: r.req_id, tcId: r.tc_id, axis: r.axis })),
    screens: 화면.rows.map((r) => ({ tcId: r.tc_id, file: r.file, url: r.screen_url })),
  });
}
