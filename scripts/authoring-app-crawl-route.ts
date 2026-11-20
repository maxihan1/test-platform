// 앱 crawl 결과(links.json · apis.json)를 앱 조작 맵의 이동 · API 줄로 바꿔 「확인」 · 빌드를 달아 올린다 (도메인/작성 §3.6 「★ 앱 탐색」 차례 3 · APP-F4-05)
// crawl 이 실제로 누른 길만 옮긴다 — 다음 작성의 경로 검색(authoring-app-route.ts)이 이 줄로 길을 낸다
import { join } from 'node:path';

import { API틀 } from '../apps/admin/src/prd/apiMap.js';
import { 글칸 } from './authoring-app-route.js';
import { 부른다 } from './authoring-io.js';
import { 거절말고 } from './authoring-prd-io.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { 안전히읽기, 저장본올리기, 폴더인가 } from './authoring-screens-keep-io.js';

/** PUT app-route 본문의 한 줄 — 서버 꼴은 §7 「앱 조작 맵 통로」 */
export interface 올릴줄 {
  kind: 'MOVE' | 'API';
  fromKey: string;
  action: string;
  toKey?: string;
  status: 'OK';
  buildNo?: string;
  fields?: { 상태: '로그아웃' };
}

// 서버 한도(appRoute.ts) — 열쇠 · 동작 200자 · 빌드 100자. 넘거나 가르개가 든 글은 서버가 본문째 거절하므로 그 줄만 뺀다
const 칸 = (v: unknown, 상한 = 200): string | null => {
  const 글 = 글칸(v);
  return 글 !== null && 글.length <= 상한 ? 글 : null;
};
const 목록 = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);

/**
 * crawl 결과 → 맵 줄. 이동은 「출발 화면 → 「버튼」 누르기 → 도착 화면」, API 는 「그 API 를 들은 화면 → 방법 주소 틀」이다.
 * API 는 버튼과 짝짓지 않는다 — crawl 은 뒤로 가기 · 앱 다시 켜기로 그 화면에 올 때 부른 API 도 같은 화면에 붙인다(2026-11-20 APP-F4-05 시작 질문).
 * 같은 줄(종류 · 출발 · 동작)이 두 상태에 다 있으면 로그인 판 것 하나로, 로그아웃 판에서만 본 줄은 칸에 「로그아웃」을 적는다
 */
export function 크롤맵줄(연결글: unknown, API글: unknown, 빌드?: string): { 줄들: 올릴줄[]; 뺀수: number } {
  const 줄들 = new Map<string, 올릴줄 & { 로그인: boolean }>();
  let 뺀수 = 0;
  const 넣기 = (로그인: boolean, 줄: Omit<올릴줄, 'status' | 'buildNo'>) => {
    const 키 = JSON.stringify([줄.kind, 줄.fromKey, 줄.action]);
    const 옛 = 줄들.get(키);
    if (옛 !== undefined && (옛.로그인 || !로그인)) return;
    줄들.set(키, { ...줄, status: 'OK', ...(빌드 === undefined ? {} : { buildNo: 빌드 }), 로그인 });
  };
  for (const 화면 of 목록(연결글)) {
    const 로그인 = 화면.상태 !== '로그아웃';
    for (const l of 목록(화면.연결)) {
      const 버튼 = typeof l.via === 'string' ? /^버튼 「(.*)」$/su.exec(l.via)?.[1] : undefined;
      const [from, action, to] = [칸(화면.틀), 버튼 === undefined ? null : 칸(`「${버튼}」 누르기`), 칸(l.to)];
      if (from === null || action === null || to === null) 뺀수 += 1;
      else 넣기(로그인, { kind: 'MOVE', fromKey: from, action, toKey: to });
    }
  }
  for (const 화면 of 목록(API글)) {
    const 로그인 = 화면.상태 !== '로그아웃';
    for (const a of 목록(화면.api)) {
      const 틀 = typeof a.url === 'string' ? API틀(a.url) : null;
      const [from, action] = [칸(화면.틀), 틀 === null || typeof a.method !== 'string' ? null : 칸(`${a.method.toUpperCase()} ${틀.path}`)];
      if (from === null || action === null) 뺀수 += 1;
      else 넣기(로그인, { kind: 'API', fromKey: from, action });
    }
  }
  return {
    줄들: [...줄들.values()].map(({ 로그인, ...줄 }) => (로그인 ? 줄 : { ...줄, fields: { 상태: '로그아웃' } })),
    뺀수,
  };
}

// 서버는 한 번에 5,000줄 · 4MiB 까지 받는다. 글 칸 셋이 200자를 다 채워도 4MiB 안에 들게 줄 수로 나눈다
const 한번에 = 2_000;
// crawl 결과는 100장 넘게 돌 수 있다 — 화면 기록 저장본 읽기(authoring-screens-keep-io.ts 연결파일상한)와 같다
const 파일상한 = 20_000_000;

/**
 * crawl 결과를 맵에 올리고 PR 머리 줄을 돌려준다. crawl 폴더가 없으면(crawl 을 안 돌렸다) 빈 목록이다. 못 올려도 PR 은 간다.
 * 빌드는 crawl 이 깐 빌드의 번호다(app-link 응답 buildNo) — 없으면 빌드 없이 「확인」이다(빌드 없는 확인은 「다시 확인」을 풀지 않는다)
 */
export async function 크롤맵올리기(통로: { 주소기지: string; 토큰: string; 번호: number }, 자료: string, 비밀: readonly string[], 빌드?: string): Promise<string[]> {
  const 크롤 = join(자료, 'crawl');
  if (!폴더인가(크롤)) return [];
  let 연결글: unknown;
  let API글: unknown;
  try {
    연결글 = JSON.parse(안전히읽기(크롤, 'links.json', 파일상한) ?? '[]');
    API글 = JSON.parse(안전히읽기(크롤, 'apis.json', 파일상한) ?? '[]');
  } catch {
    return ['앱 조작 맵: crawl 결과(links.json · apis.json)를 못 읽어 안 올림'];
  }
  const { 줄들, 뺀수 } = 크롤맵줄(연결글, API글, 칸(빌드, 100) ?? undefined);
  if (줄들.length === 0) return [];
  if (계정섞였나(줄들.flatMap((r) => [r.fromKey, r.action, r.toKey ?? '']), 비밀)) return ['앱 조작 맵: 올릴 줄에 테스트 계정 비밀번호가 들어 있어 안 올림'];
  const 길 = `/authoring/requests/${String(통로.번호)}/app-route`;
  try {
    for (let i = 0; i < 줄들.length; i += 한번에) {
      const 답 = await 부른다(통로.주소기지, 통로.토큰, 길, { method: 'PUT', body: { rows: 줄들.slice(i, i + 한번에) } });
      if (답.status !== 204) return [`앱 조작 맵: 못 올림 — 서버 ${String(답.status)}${i > 0 ? `(앞 ${String(i)}줄은 올라감)` : ''}`];
    }
  } catch (e) {
    return [`앱 조작 맵: 못 올림 — ${거절말고(e)}`];
  }
  const 셈 = (kind: 올릴줄['kind']) => 줄들.filter((r) => r.kind === kind).length;
  return [
    `앱 조작 맵: crawl 이동 ${String(셈('MOVE'))}줄 · API ${String(셈('API'))}줄 올림 · ${빌드 === undefined ? '빌드 없음' : `빌드 ${빌드}`}` +
      (뺀수 > 0 ? ` · 꼴이 틀려 뺀 줄 ${String(뺀수)}` : ''),
  ];
}

/**
 * crawl 이 깐 빌드의 번호 — 앱 링크(`/api/builds/<번호>/apk?`)의 빌드로 app-link 를 불러 받는다. 링크에 빌드가 없으면(앱 파일 경로 · 회사 저장소 주소) undefined.
 * 못 받아도 undefined — 빌드 없이 올린다
 */
export async function 크롤빌드번호(통로: { 주소기지: string; 토큰: string; 번호: number }, 앱링크: string | undefined): Promise<string | undefined> {
  const 빌드 = /\/api\/builds\/(\d+)\/apk\?/.exec(앱링크 ?? '')?.[1];
  if (빌드 === undefined) return undefined;
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${String(통로.번호)}/app-link?build=${빌드}`);
    const 번호 = (답.몸 as { buildNo?: unknown } | null)?.buildNo;
    return 답.status === 200 && typeof 번호 === 'string' ? 번호 : undefined;
  } catch (e) {
    console.error(`[작성] ${String(통로.번호)}번 — 빌드 번호를 못 받아 빌드 없이 맵에 올린다: ${거절말고(e)}`);
    return undefined;
  }
}

/**
 * Android 앱 작성이 끝날 때 — crawl 결과를 앱 조작 맵에 올리고, 대조 요청이 아니면 화면 기록으로도 올린다(대조 요청은 올리기 단계가 이미 올린다).
 * 화면 기록은 두 번째 작성이 저장본과 견주는 재료다 — 결정 목록 「PRD 에 없는 화면」 · 「미검증 화면」 셈에도 앱 화면이 든다(2026-11-20 APP-F4-05 시작 질문).
 * 대조 요청과 달리 비밀번호가 섞였어도 작성을 거절하지 않고 화면 기록만 안 올린다 — 이 요청의 몫은 케이스다. PR 머리 줄을 돌려준다
 */
export async function 앱크롤올리기(통로: { 주소기지: string; 토큰: string; 번호: number }, 자료: string, 비밀: readonly string[], 앱링크: string | undefined, 대조: boolean): Promise<string[]> {
  if (!폴더인가(join(자료, 'crawl'))) return [];
  const 화면 = 대조 ? null : await 저장본올리기(통로, 자료, 비밀);
  const 화면줄 = 화면 === null ? [] : ['줄' in 화면 ? 화면.줄 : `화면 기록 저장: 안 올림 — ${화면.거절}`];
  return [...화면줄, ...(await 크롤맵올리기(통로, 자료, 비밀, await 크롤빌드번호(통로, 앱링크)))];
}
