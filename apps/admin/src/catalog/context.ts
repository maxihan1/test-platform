// 케이스 목록의 맥락 — 지도 ① ② 와 표준 기획서 지금 판에서 기능 묶음 · 요구 · 화면을 붙이고 접는 차례를 짓는다 (도메인/카탈로그 §8.1 「맥락」)
// 카탈로그는 표준 기획서를 읽기만 한다 (카탈로그 §3.1 「지도」). 판단은 순수 함수로 두고 DB 읽기는 contextRead.ts 하나다

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
  /** 화면 파일 클래스 이름(`게시판목록화면`). 못 읽었으면 null — 목록은 주소 · 파일 이름을 보인다 (PRD-F9-18) */
  name: string | null;
}

export interface CaseContext {
  feature: string | null;
  reqs: CaseReq[];
  screens: CaseScreen[];
  /** 케이스를 실행해서 부른 호스트에 붙은 API 서버 이름 — 글자 순, 같은 이름은 한 번 (§8.1 「API 서버」). 없으면 [] */
  apiServers: string[];
  /** API 애플리케이션 케이스가 실행에서 부른 엔드포인트 `POST /api/orders` — 묶음 머리가 되는 것이 맨 앞 (§8.1 「맥락」). 다른 종류 · 실행 전이면 [] */
  endpoints: string[];
}

/** 목록이 접는 자리 하나 — 기능 묶음 > 화면(API 는 엔드포인트) > 화면 조각. 화면 · 화면 조각은 파일 경로이고 없으면 null 이다 */
export interface CaseGroup {
  feature: string | null;
  screen: string | null;
  screenUrl: string | null;
  /** 화면 · 화면 조각 파일의 클래스 이름 — 없으면 null (PRD-F9-18) */
  screenName: string | null;
  part: string | null;
  partName: string | null;
  endpoint: string | null;
  tcIds: string[];
}

export interface 맥락재료 {
  prd: Pick<PrdItem, 'reqId' | 'feature' | 'text'>[];
  reqs: { reqId: string; tcId: string; axis: 종류 }[];
  screens: { tcId: string; file: string; url: string | null; name: string | null }[];
  /** 없으면 API 서버 이름을 안 단다 — 목록 밖(실패 요구사항)이 요구만 짓는 데 쓴다 */
  apis?: { tcId: string; name: string }[];
  /** 서비스 지도 케이스 줄 — API 애플리케이션만 넘긴다. step 은 그 엔드포인트를 부른 첫 단계, 준비 · 정리에서만 불렀으면 null */
  endpoints?: { tcId: string; method: string; path: string; step: number | null }[];
}

interface 자리 {
  // 기능 묶음이 판에 처음 나온 차례. 묶음 없음은 맨 뒤
  차례: number;
  // 묶음 안 차례 — 화면 주소(없으면 파일 경로). 파일 이름 차례면 `signup-done` 이 `signup` 앞에 선다
  화면차례: string;
  screen: string | null;
  screenUrl: string | null;
  screenName: string | null;
  part: string | null;
  partName: string | null;
  endpoint: string | null;
}

export type 맥락표 = Map<string, CaseContext & { 자리: 자리 }>;

const 빈맥락: CaseContext = { feature: null, reqs: [], screens: [], apiServers: [], endpoints: [] };

export function 맥락(표: 맥락표, tcId: string): CaseContext {
  const 것 = 표.get(tcId);
  return 것 === undefined ? 빈맥락 : { feature: 것.feature, reqs: 것.reqs, screens: 것.screens, apiServers: 것.apiServers, endpoints: 것.endpoints };
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
    줄.push({ file: s.file, url: s.url, name: s.name });
    화면들.set(s.tcId, 줄);
  }

  const 서버들 = new Map<string, Set<string>>();
  for (const a of 재료.apis ?? []) 서버들.set(a.tcId, (서버들.get(a.tcId) ?? new Set()).add(a.name));

  // 대상 서버 주소가 달라도 메서드 · 경로가 같으면 한 엔드포인트다 — 대시보드 「엔드포인트별 결과」와 같은 셈 (리포팅 §8.12)
  const 첫단계들 = new Map<string, Map<string, { 경로: string; 단계: number }>>();
  for (const e of 재료.endpoints ?? []) {
    const 줄 = 첫단계들.get(e.tcId) ?? new Map<string, { 경로: string; 단계: number }>();
    const 이름 = `${e.method} ${e.path}`;
    // 준비 · 정리에서만 불렀으면 단계가 없다 — 단계 번호 뒤로 민다
    줄.set(이름, { 경로: `${e.path} ${e.method}`, 단계: Math.min(줄.get(이름)?.단계 ?? Infinity, e.step ?? Infinity) });
    첫단계들.set(e.tcId, 줄);
  }
  // 단계에서 먼저 부른 것이 앞 — 준비에서만 부른 로그인이 앞서면 케이스 대부분이 로그인 머리 아래로 몰린다 (2026-10-30 시작 질문)
  const 엔드포인트들 = (tcId: string) =>
    [...(첫단계들.get(tcId) ?? [])].sort(([a, x], [b, y]) => (x.단계 === y.단계 ? a.localeCompare(b) : x.단계 < y.단계 ? -1 : 1));

  const 표: 맥락표 = new Map();
  for (const tcId of new Set([...요구들.keys(), ...화면들.keys(), ...서버들.keys(), ...첫단계들.keys()])) {
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
    const 부른것 = 엔드포인트들(tcId);
    const endpoints = 부른것.map(([이름]) => 이름);
    const 엔드포인트 = endpoints[0] ?? null;
    표.set(tcId, {
      feature,
      reqs,
      screens,
      apiServers: [...(서버들.get(tcId) ?? [])].sort((a, b) => a.localeCompare(b)),
      endpoints,
      자리: {
        차례: feature === null ? Infinity : 묶음차례.get(feature)!,
        // 엔드포인트 머리는 경로 차례 — 같은 경로의 GET · POST 가 이웃한다
        화면차례: 화면 !== null ? 화면순(화면) : (부른것[0]?.[1].경로 ?? ''),
        screen: 화면?.file ?? null,
        screenUrl: 화면?.url ?? null,
        screenName: 화면?.name ?? null,
        part: 조각?.file ?? null,
        partName: 조각?.name ?? null,
        endpoint: 엔드포인트,
      },
    });
  }
  return 표;
}

const 빈자리: 자리 = { 차례: Infinity, 화면차례: '', screen: null, screenUrl: null, screenName: null, part: null, partName: null, endpoint: null };

/** 목록 순서 — 기능 묶음(판 차례) → 화면(주소) · 엔드포인트(경로) → 화면 조각 → 번호. 화면 없는 케이스가 그 묶음 맨 앞이다 — 머리 줄 없이 묶음 바로 아래 선다 */
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
    if (끝 !== undefined && 끝.feature === feature && 끝.screen === 곳.screen && 끝.part === 곳.part && 끝.endpoint === 곳.endpoint) 끝.tcIds.push(id);
    else groups.push({ feature, screen: 곳.screen, screenUrl: 곳.screenUrl, screenName: 곳.screenName, part: 곳.part, partName: 곳.partName, endpoint: 곳.endpoint, tcIds: [id] });
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
  /** API 서버 이름 — 그 이름이 붙은 호스트를 실행해서 부른 케이스 (§8.1 「API 서버」). 모르는 이름은 빈 목록이다 */
  apiServer?: string;
  /** 묶인 엔드포인트 `POST /api/orders` — 케이스가 부른 다른 엔드포인트로는 안 걸린다 (§8.1 「맥락」) */
  endpoint?: string;
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
    if (조건.apiServer !== undefined && !(것?.apiServers ?? []).includes(조건.apiServer)) return false;
    if (조건.endpoint !== undefined && 곳.endpoint !== 조건.endpoint) return false;
    return true;
  });
}

/** 이름마다 맞은 케이스 수 — 칩 건수다. 조건에서 apiServer 를 뺀 맞은 번호를 넘긴다. 지금 조건에서 0건인 이름도 낸다(걸린 칩을 풀 길이 있어야 한다) */
export function API서버세기(맞은: string[], 표: 맥락표, 이름들: string[]): { name: string; count: number }[] {
  const 셈 = new Map(이름들.map((name) => [name, 0]));
  for (const id of 맞은) for (const name of 표.get(id)?.apiServers ?? []) 셈.set(name, (셈.get(name) ?? 0) + 1);
  return 이름들.map((name) => ({ name, count: 셈.get(name) ?? 0 }));
}

/** 찾기 칸이 요구 번호 · 요구 문장에도 맞는 케이스 — 이름 · 번호 맞추기는 SQL 이 한다 */
export function 요구로찾기(표: 맥락표, q: string): string[] {
  const 말 = q.toLowerCase();
  return [...표].filter(([, 것]) => 것.reqs.some((r) => r.reqId.toLowerCase().includes(말) || (r.text?.toLowerCase().includes(말) ?? false))).map(([id]) => id);
}

/** 쿼리 글자 그대로 — 같은 이름을 두 번 보내면 Fastify 가 배열로 준다 */
export type 맥락글 = { feature?: unknown; screen?: unknown; part?: unknown; axis?: unknown; req?: unknown; apiServer?: unknown; endpoint?: unknown };

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
  const [feature, screen, part, axis, req, apiServer, endpoint] = [q.feature, q.screen, q.part, q.axis, q.req, q.apiServer, q.endpoint].map(한글자);
  const 있나 = (x: string | undefined): x is string => x !== undefined && x !== '';
  const 종류 = 종류들.find((a) => a === axis);
  if (있나(axis) && 종류 === undefined) return null;
  return {
    ...(feature === undefined ? {} : { feature }),
    ...(screen === undefined ? {} : { screen }),
    ...(있나(part) ? { part } : {}),
    ...(종류 === undefined ? {} : { axis: 종류 }),
    ...(있나(req) ? { req } : {}),
    ...(있나(apiServer) ? { apiServer } : {}),
    ...(있나(endpoint) ? { endpoint } : {}),
  };
}

export const 모르는종류 = (값: unknown) => ({ error: 'BAD_AXIS', detail: `종류는 정상 · 경계 · 예외 · UI 중 하나입니다 — ${String(값)}` });
