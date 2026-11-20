// 앱 crawl 결과를 앱 조작 맵의 이동 · API 줄로 바꿔 「확인」 · 빌드를 달아 올린다 (도메인/작성 §3.6 「★ 앱 탐색」 「crawl 결과 → 맵 줄」 · APP-F4-05)
// crawl 이 실제로 누른 길만 옮긴다 — 다음 작성의 경로 검색(authoring-app-route.ts)이 이 줄로 길을 낸다
import { lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { API틀 } from '../apps/admin/src/prd/apiMap.js';
import { 글칸 } from './authoring-app-route.js';
import { 부른다 } from './authoring-io.js';
import { 거절말고 } from './authoring-prd-io.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { 새로쓰기, 안전히읽기, 저장본올리기, 크롤목록, 폴더인가 } from './authoring-screens-keep-io.js';

/** PUT app-route 본문의 한 줄 — 서버 꼴은 §7 「앱 조작 맵 통로」 */
export interface 올릴줄 {
  kind: 'MOVE' | 'API';
  fromKey: string;
  action: string;
  toKey?: string;
  status: 'OK';
  buildNo?: string;
  fields: { 상태: '로그인' | '로그아웃' };
}

// 서버 한도(appRoute.ts) — 열쇠 · 동작 200자 · 빌드 100자. 넘거나 가르개가 든 글은 서버가 본문째 거절하므로 그 줄만 뺀다
const 칸 = (v: unknown, 상한 = 200): string | null => {
  const 글 = 글칸(v);
  return 글 !== null && 글.length <= 상한 ? 글 : null;
};
const 목록 = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);

/**
 * crawl 결과(`index.json` — 판마다 그대로 남은 `links` · `screens[].apis`) → 맵 줄. 이동은 「출발 화면 → 「버튼」 누르기 → 도착 화면」, API 는 「그 API 를 들은 화면 → 방법 주소 틀」이다.
 * `links.json` · `apis.json` 은 안 읽는다 — 로그인 판에도 있는 키의 로그아웃 화면 몫을 로그인 화면에 합쳐 어느 판에서 본 길인지 잃는다.
 * API 는 버튼과 짝짓지 않는다 — crawl 은 뒤로 가기 · 앱 다시 켜기로 그 화면에 올 때 부른 API 도 같은 화면에 붙인다(2026-11-20 APP-F4-05 시작 질문).
 * 같은 줄(종류 · 출발 · 동작)이 두 판에 다 있으면 로그인 판 것 하나다. 칸에 판을 늘 적는다 — 앞 작성이 「로그아웃」으로 올린 줄을 이번 로그인 판이 덮게(서버는 안 실은 칸을 지킨다)
 */
export function 크롤맵줄(색인: unknown, 빌드?: string): { 줄들: 올릴줄[]; 뺀수: number } {
  const r = typeof 색인 === 'object' && 색인 !== null ? (색인 as Record<string, unknown>) : {};
  const 줄들 = new Map<string, 올릴줄>();
  let 뺀수 = 0;
  const 넣기 = (판: unknown, 줄: Omit<올릴줄, 'status' | 'buildNo' | 'fields'>) => {
    const 상태 = 판 === '로그아웃' ? '로그아웃' : '로그인';
    const 키 = JSON.stringify([줄.kind, 줄.fromKey, 줄.action]);
    if (줄들.get(키)?.fields.상태 === '로그인') return;
    줄들.set(키, { ...줄, status: 'OK', ...(빌드 === undefined ? {} : { buildNo: 빌드 }), fields: { 상태 } });
  };
  for (const l of 목록(r.links)) {
    // crawl 은 버튼을 눌러 간 길만 연결로 남긴다(`버튼 「글자」`) — 다른 꼴이 오면 옮길 동작이 없어 센다
    const 버튼 = typeof l.via === 'string' ? /^버튼 「(.*)」$/su.exec(l.via)?.[1] : undefined;
    const [from, action, to] = [칸(l.from), 버튼 === undefined ? null : 칸(`「${버튼}」 누르기`), 칸(l.to)];
    if (from === null || action === null || to === null) 뺀수 += 1;
    else 넣기(l.상태, { kind: 'MOVE', fromKey: from, action, toKey: to });
  }
  for (const 화면 of 목록(r.screens)) {
    for (const a of 목록(화면.apis)) {
      const 틀 = typeof a.url === 'string' ? API틀(a.url) : null;
      const [from, action] = [칸(화면.key), 틀 === null || typeof a.method !== 'string' ? null : 칸(`${a.method.toUpperCase()} ${틀.path}`)];
      if (from === null || action === null) 뺀수 += 1;
      else 넣기(화면.상태, { kind: 'API', fromKey: from, action });
    }
  }
  return { 줄들: [...줄들.values()], 뺀수 };
}

// 서버는 한 번에 5,000줄 · 4MiB 까지 받는다 — 한글은 3바이트라 줄 수가 아니라 바이트로 나눈다
const 몫바이트 = 3_500_000;
const 몫줄 = 5_000;
// crawl 은 100장 넘게 돌 수 있다 — 화면 기록 저장본 읽기(authoring-screens-keep-io.ts 본목록상한)와 같다
const 색인상한 = 20_000_000;

function 나누기(줄들: 올릴줄[]): 올릴줄[][] {
  const 몫들: 올릴줄[][] = [];
  let 크기 = 0;
  for (const 줄 of 줄들) {
    const n = Buffer.byteLength(JSON.stringify(줄)) + 1;
    const 끝 = 몫들.at(-1);
    if (끝 === undefined || 끝.length >= 몫줄 || 크기 + n > 몫바이트) {
      몫들.push([줄]);
      크기 = n;
    } else {
      끝.push(줄);
      크기 += n;
    }
  }
  return 몫들;
}

/**
 * crawl 결과를 맵에 올리고 PR 머리 줄을 돌려준다. crawl 폴더가 없으면(crawl 을 안 돌렸다) 빈 목록이다. 못 올려도 PR 은 간다.
 * 빌드는 crawl 이 깐 빌드의 이름이다(app-link 응답 buildNo) — 없으면 빌드 없이 「확인」이다(빌드 없는 확인은 「다시 확인」을 풀지 않는다)
 */
export async function 크롤맵올리기(통로: { 주소기지: string; 토큰: string; 번호: number }, 자료: string, 비밀: readonly string[], 빌드?: string): Promise<string[]> {
  const 크롤 = join(자료, 'crawl');
  if (!폴더인가(크롤)) return [];
  let 색인: unknown = null;
  try {
    색인 = JSON.parse(안전히읽기(크롤, 'index.json', 색인상한) ?? 'null');
  } catch {
    // 깨진 색인은 못 읽은 것과 같다 — 아래 줄로 알린다
  }
  if (색인 === null) return ['앱 조작 맵: crawl 결과(index.json)를 못 읽어 안 올림'];
  const 쓸빌드 = 칸(빌드, 100) ?? undefined;
  const { 줄들, 뺀수 } = 크롤맵줄(색인, 쓸빌드);
  if (줄들.length === 0) return [];
  if (계정섞였나(줄들.flatMap((x) => [x.fromKey, x.action, x.toKey ?? '']), 비밀)) return ['앱 조작 맵: 올릴 줄에 테스트 계정 비밀번호가 들어 있어 안 올림'];
  const 길 = `/authoring/requests/${String(통로.번호)}/app-route`;
  let 올린수 = 0;
  try {
    for (const 몫 of 나누기(줄들)) {
      const 답 = await 부른다(통로.주소기지, 통로.토큰, 길, { method: 'PUT', body: { rows: 몫 } });
      if (답.status !== 204) return [`앱 조작 맵: 못 올림 — 서버 ${String(답.status)}${올린수 > 0 ? `(앞 ${String(올린수)}줄은 올라감)` : ''}`];
      올린수 += 몫.length;
    }
  } catch (e) {
    return [`앱 조작 맵: 못 올림 — ${거절말고(e)}`];
  }
  const 셈 = (kind: 올릴줄['kind']) => 줄들.filter((x) => x.kind === kind).length;
  return [
    `앱 조작 맵: crawl 이동 ${String(셈('MOVE'))}줄 · API ${String(셈('API'))}줄 올림 · ${쓸빌드 === undefined ? '빌드 없음' : `빌드 ${쓸빌드}`}` +
      (뺀수 > 0 ? ` · 꼴이 틀려 뺀 줄 ${String(뺀수)}` : ''),
  ];
}

/**
 * 대조가 아닌 앱 작성 — crawl 화면 파일(`crawl/<판>/NNN.yml`)을 화면 기록 자리(`screens/out-NNN.md` · `in-NNN.md`)로 옮긴다. 저장본올리기가 그 이름으로 목록과 짝짓는다.
 * 대조 요청은 AI 가 기획서 화면만 골라 옮긴다(tpx-author app.md §6). 저장본과 「같음」인 화면 · 이미 있는 기록은 건드리지 않는다
 */
export function 크롤화면옮기기(자료: string): void {
  const 크롤 = join(자료, 'crawl');
  const 화면 = join(자료, 'screens');
  let 칸들: unknown;
  try {
    칸들 = JSON.parse(크롤목록(자료) ?? '[]');
  } catch {
    return;
  }
  if (lstatSync(화면, { throwIfNoEntry: false }) === undefined) mkdirSync(화면, { mode: 0o755 });
  if (!폴더인가(화면)) return;
  for (const x of 목록(칸들)) {
    const m = typeof x.파일 === 'string' ? /^(로그아웃|로그인)\/(\d{1,6})\.yml$/u.exec(x.파일) : null;
    if (m === null || x.저장본 === '같음' || !폴더인가(join(크롤, m[1]!))) continue;
    const 이름 = `${m[1] === '로그아웃' ? 'out' : 'in'}-${m[2]!}.md`;
    const 글 = 안전히읽기(join(크롤, m[1]!), `${m[2]!}.yml`, 200_000);
    if (글 !== null && lstatSync(join(화면, 이름), { throwIfNoEntry: false }) === undefined) 새로쓰기(join(화면, 이름), 글);
  }
}

// 이번 crawl 결과를 이미 올렸다는 표시 — 결과 색인의 바뀐 시각. 이어하기는 자료 폴더를 넘겨받아 crawl 을 다시 안 돌리므로 같은 결과를 또 올리지 않는다
const 올린표시 = 'crawl-uploaded.txt';
const 결과지문 = (크롤: string): string => String(lstatSync(join(크롤, 'index.json'), { throwIfNoEntry: false })?.mtimeMs ?? '-');

/**
 * Android 앱 작성이 끝날 때 — crawl 결과를 앱 조작 맵에 올리고, 대조 요청이 아니면 화면 기록으로도 올린다(대조 요청은 올리기 단계가 이미 올린다).
 * 화면 기록은 두 번째 작성이 저장본과 견주는 재료다 — 결정 목록 「PRD 에 없는 화면」 · 「미검증 화면」 셈에도 앱 화면이 든다(2026-11-20 APP-F4-05 시작 질문).
 * 대조 요청과 달리 비밀번호가 섞였어도 작성을 거절하지 않고 화면 기록만 안 올린다 — 이 요청의 몫은 케이스다.
 * 앞 실행이 이미 올린 crawl 결과(이어하기)는 다시 안 올린다. 빌드는 에이전트가 링크를 갈며 받아 둔 빌드 이름이다(authoring-app-screen.ts 받은빌드이름). PR 머리 줄을 돌려준다
 */
export async function 앱크롤올리기(통로: { 주소기지: string; 토큰: string; 번호: number }, 자료: string, 비밀: readonly string[], 빌드: string | undefined, 대조: boolean): Promise<string[]> {
  const 크롤 = join(자료, 'crawl');
  if (!폴더인가(크롤)) return [];
  const 지문 = 결과지문(크롤);
  if (안전히읽기(자료, 올린표시, 1_000) === 지문) return ['앱 조작 맵: 앞 실행이 올린 crawl 결과라 다시 안 올림'];
  let 화면줄: string[] = [];
  if (!대조) {
    try {
      크롤화면옮기기(자료);
      const 화면 = await 저장본올리기(통로, 자료, 비밀);
      화면줄 = ['줄' in 화면 ? 화면.줄 : `화면 기록 저장: 안 올림 — ${화면.거절}`];
    } catch (e) {
      화면줄 = [`화면 기록 저장: 실패 — ${e instanceof Error ? e.message : String(e)}`];
    }
  }
  const 맵줄 = await 크롤맵올리기(통로, 자료, 비밀, 빌드);
  if (맵줄.some((줄) => 줄.startsWith('앱 조작 맵: crawl 이동 '))) {
    try {
      새로쓰기(join(자료, 올린표시), 지문);
    } catch (e) {
      console.error(`[작성] ${String(통로.번호)}번 — crawl 결과를 올렸다는 표시를 못 남겼다(이어하기가 다시 올릴 수 있다): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return [...화면줄, ...맵줄];
}
