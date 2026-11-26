// 앱 배운 것 — 자료 폴더의 배운 것 글 읽기 · 받기 · 올리기 · 장치 ①(배운 줄 없는 화면) · 열린 물음 · PR 머리 줄 (도메인/작성 §3.6 「★ 앱 배우기」 · APP-F5-03)
// 줄 꼴과 칸 검사는 서버 것(apps/admin/src/prd/appLearned.ts)을 같이 쓴다 — 적기 명령 · 찾기 명령 · 에이전트가 한 손으로 읽는다
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { 배운것 } from '../apps/admin/src/prd/gameKinds.js';
import { 부른다 } from './authoring-io.js';
import { 거절말고 } from './authoring-prd-io.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 자료 폴더의 자리 — 글은 서버가 준 것, 적은 것은 이번 세션이 적고 아직 안 올린 줄 */
export const 앱배움자리 = {
  글: 'app-learned.txt', 적은: 'app-learned.json', 상태: 'app-learn.json', 알림: 'app-learn.wrap', 빌드: 'app-learn-build.txt', 기록: 'app-try',
} as const;
export const 배움상한 = 4 * 1024 * 1024;
const 글상한 = 64 * 1024 * 1024;
export const 쪽지열쇠 = 'note:쪽지';

export interface 앱배운줄 { kind: string; key: string; name: string; screen: string | null; learned: 배운것 }
/** 적은 줄 — learned 가 null 이면 지운다 */
export type 적은앱줄 = Omit<앱배운줄, 'learned'> & { learned: 배운것 | null };

/**
 * 서버 배운 것 글(appLearned.ts 배운것글짓기)을 거꾸로 읽는다. 열쇠 · 이름 · 화면은 「 · 」를 못 담아(서버 검사) 칸을 그대로 자르고,
 * 「배움 」 뒤는 줄 끝까지 JSON 이다. 못 읽는 줄은 버린다
 */
export function 배운글읽기(글: string | null): 앱배운줄[] {
  const 줄들: 앱배운줄[] = [];
  let kind = '';
  for (const 줄 of (글 ?? '').split('\n')) {
    const 머리 = /^## .+ \(([A-Z]+)\) — \d+줄$/.exec(줄);
    if (머리) {
      kind = 머리[1]!;
      continue;
    }
    if (kind === '' || !줄.startsWith('- ')) continue;
    const 칸 = 줄.slice(2).split(' · ');
    const 화면 = 칸[2]?.startsWith('화면 ') === true && 칸[3]?.startsWith('배움 ') === true;
    const 배움자리 = 화면 ? 3 : 2;
    const 배움글 = 칸.slice(배움자리).join(' · ');
    if (칸.length <= 배움자리 || !배움글.startsWith('배움 ')) continue;
    try {
      const learned = JSON.parse(배움글.slice('배움 '.length)) as 배운것;
      줄들.push({ kind, key: 칸[0]!, name: 칸[1]!, screen: 화면 ? 칸[2]!.slice('화면 '.length) : null, learned });
    } catch {
      // 깨진 줄은 없는 것으로 본다 — 서버가 지은 글이라 날 일이 드물다
    }
  }
  return 줄들;
}

/** 아직 안 올린 줄 — 적기 명령이 검사해 쓴 파일이다. 자식이 직접 고쳤을 수 있어 꼴이 틀린 줄은 버린다 */
export function 적은줄들(글: string | null): 적은앱줄[] {
  try {
    const 몸 = JSON.parse(글 ?? '{}') as { rows?: unknown };
    return (Array.isArray(몸.rows) ? (몸.rows as 적은앱줄[]) : []).filter(
      (e) => typeof e?.kind === 'string' && typeof e.key === 'string' && typeof e.name === 'string' && (e.screen === null || typeof e.screen === 'string') &&
        (e.learned === null || (typeof e.learned === 'object' && typeof e.learned.text === 'string')),
    );
  } catch {
    return [];
  }
}

/** 받은 줄에 적은 줄을 얹는다 — 같은 열쇠는 적은 것이 이기고 null 은 지운다 */
export function 얹기(받은: readonly 앱배운줄[], 적은: readonly 적은앱줄[]): 앱배운줄[] {
  const 합 = new Map(받은.map((x) => [x.key, x]));
  for (const e of 적은) {
    if (e.learned === null) 합.delete(e.key);
    else 합.set(e.key, { ...e, learned: e.learned });
  }
  return [...합.values()];
}

export const 지금배운것 = (자료: string): 앱배운줄[] => 얹기(배운글읽기(안전히읽기(자료, 앱배움자리.글, 글상한)), 적은줄들(안전히읽기(자료, 앱배움자리.적은, 배움상한)));

const 화면키인가 = (v: unknown): v is string => typeof v === 'string' && v.startsWith('app:') && v.length > 'app:'.length;
const 배열 = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : []);
const JSON읽기 = (자리: string, 이름: string, 상한: number): unknown => {
  try {
    return JSON.parse(안전히읽기(자리, 이름, 상한) ?? 'null');
  } catch {
    return null;
  }
};

/** 이번 작성이 본 화면 — 이번 crawl 목록 · 이번 맵 줄의 도착 · 해 본 기록의 앞뒤 화면. 앞 작성 저장본(kept/)에만 있는 화면은 안 센다 */
export function 이번화면들(자료: string): Set<string> {
  const 들 = new Set<string>();
  for (const x of 배열(JSON읽기(join(자료, 'crawl'), 'list.json', 16 * 1024 * 1024))) if (화면키인가(x.주소)) 들.add(x.주소);
  for (const r of 배열((JSON읽기(자료, 'app-route.json', 배움상한) as { rows?: unknown } | null)?.rows)) if ((r.kind === 'MOVE' || r.kind === 'SETUP') && 화면키인가(r.toKey)) 들.add(r.toKey);
  const 기록 = join(자료, 앱배움자리.기록);
  for (const 이름 of existsSync(기록) ? readdirSync(기록).filter((f) => f.endsWith('.json')) : []) {
    const 몸 = JSON읽기(기록, 이름, 1024 * 1024) as { 앞화면?: unknown; 뒤화면?: unknown } | null;
    for (const k of [몸?.앞화면, 몸?.뒤화면]) if (화면키인가(k)) 들.add(k);
  }
  return 들;
}

/** 장치 ① — 이번에 본 화면 가운데 그 화면 키를 단 배운 줄(쪽지 빼고 · 종류는 아무것)이 없는 화면 */
export function 배운줄없는화면(화면들: ReadonlySet<string>, 줄들: readonly 앱배운줄[]): string[] {
  const 배운 = new Set(줄들.filter((x) => x.kind !== 'NOTE' && x.screen !== null).map((x) => x.screen));
  return [...화면들].filter((k) => !배운.has(k)).sort();
}

const 칸 = (x: 앱배운줄): Record<string, unknown> => (typeof x.learned.data === 'object' && x.learned.data !== null && !Array.isArray(x.learned.data) ? (x.learned.data as Record<string, unknown>) : {});
const 있나 = (v: unknown): boolean => v !== undefined && v !== null && v !== '';

/**
 * 열린 물음 — 닫음이 없는 `ASK` 가운데 막힘이 없거나 막힘을 적은 빌드가 지금 빌드와 다른 것(게임 「물음 트리」와 같다),
 * 그리고 지금 빌드와 다른 빌드에서 본 확인 줄(다시 볼 것). 지금 빌드를 모르면 빌드로 가르지 않는다
 */
export function 열린물음(줄들: readonly 앱배운줄[], 빌드: string | undefined): string[] {
  // 빌드를 안 적은 막힘도 다른 빌드로 친다 — 아니면 빌드가 바뀌어도 영영 안 열린다
  const 다른빌드 = (x: 앱배운줄) => 빌드 !== undefined && x.learned.build !== 빌드;
  return 줄들.filter((x) =>
    x.kind === 'ASK' ? !있나(칸(x).닫음) && (!있나(칸(x).막힘) || 다른빌드(x)) : x.learned.belief === 'CONFIRMED' && 다른빌드(x),
  ).map((x) => x.key);
}

/** 일찍 끝내기 — 장치 ① 이 지나고 열린 물음이 0 이어야 2시간 전에 끝낸다. 찾기 명령 `--check` 와 에이전트가 같이 본다 */
export function 끝내도되나(자료: string, 빌드 = 지금빌드(자료)): { 남은화면: string[]; 열린: string[] } {
  const 줄들 = 지금배운것(자료);
  return { 남은화면: 배운줄없는화면(이번화면들(자료), 줄들), 열린: 열린물음(줄들, 빌드) };
}

export const 지금빌드 = (자료: string): string | undefined => 안전히읽기(자료, 앱배움자리.빌드, 1_000)?.trim() || undefined;

/** 에이전트가 남긴 「정리하라」 알림 — 배우는 AI 는 자기 시계 · 컨텍스트를 못 봐 명령 출력으로 안다 */
export const 정리알림 = (자료: string): string[] => {
  const 글 = 안전히읽기(자료, 앱배움자리.알림, 1_000)?.trim();
  return 글 === undefined || 글 === '' ? [] : [`※ ${글}`];
};

/**
 * 자식을 띄우기 전에 배운 것 글을 받는다 — 모든 Android 앱 작성(테스트 수정 · 화면이 맞음도 읽기만 한다). 못 받으면 앞 실행이 남긴 것까지 지우고 배운 것 없이 간다(app-route.txt 와 같다).
 * 세션 사이에 다시 받을 때(앞것둠)는 못 받아도 지우지 않는다 — 지우면 앞 세션들이 배운 줄이 이번 폴더에서 사라져 장치 ① · 쪽지 · 맡은 줄이 다 틀린다.
 * 토큰 거절(401 · 403)은 다시 던진다 — 줄 돌기가 그걸 보고 멈춘다. 못 받은 까닭 글
 */
export async function 배운것받기(통로: 화면통로, 자료: string, 앞것둠 = false): Promise<string | null> {
  try {
    if (!앞것둠) rmSync(join(자료, 앱배움자리.글), { force: true, recursive: true });
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${String(통로.번호)}/app-learned`);
    const 글 = (답.몸 as { text?: unknown } | null)?.text;
    if (답.status !== 200 || typeof 글 !== 'string') return `서버 ${String(답.status)}`;
    새로쓰기(join(자료, 앱배움자리.글), 글);
    return null;
  } catch (e) {
    return 거절말고(e);
  }
}

/** 적은 줄을 올리고 글을 다시 받는다. 다시 받기까지 되어야 적은 파일을 지운다 — 먼저 지우면 다음 세션이 이번 줄을 못 본다 */
export async function 배운것올리기(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<{ 열쇠: string[]; 못올림: string[] }> {
  const 글 = 안전히읽기(자료, 앱배움자리.적은, 배움상한);
  if (글 === null) return { 열쇠: [], 못올림: existsSync(join(자료, 앱배움자리.적은)) ? [`${앱배움자리.적은} 이 4MB 를 넘거나 일반 파일이 아니다`] : [] };
  const rows = 적은줄들(글);
  if (rows.length === 0) return { 열쇠: [], 못올림: [] };
  if (계정섞였나([JSON.stringify(rows)], 비밀)) return { 열쇠: [], 못올림: ['배운 줄에 테스트 계정 비밀번호가 들어 있다'] };
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${String(통로.번호)}/app-learned`, { method: 'PUT', body: { rows } });
    if (답.status !== 204) {
      const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
      return { 열쇠: [], 못올림: [`배운 줄을 서버가 안 받았다(${String(답.status)}${typeof 자리 === 'string' ? ` ${자리.slice(0, 100)}` : ''})`] };
    }
  } catch (e) {
    return { 열쇠: [], 못올림: [`배운 줄을 못 올렸다 — ${거절말고(e)}`] };
  }
  const 왜 = await 배운것받기(통로, 자료, true);
  // 못 받았으면 앞 글에 적은 파일이 남아 다음 세션이 그것을 얹어 본다
  if (왜 === null) rmSync(join(자료, 앱배움자리.적은), { force: true });
  return { 열쇠: rows.map((r) => r.key), 못올림: 왜 === null ? [] : [`올린 뒤 배운 것 글을 다시 못 받았다 — ${왜}`] };
}

const 목록 = (들: readonly string[], n = 10): string => `${들.slice(0, n).join(' · ')}${들.length > n ? ` 외 ${String(들.length - n)}개` : ''}`;

/** PR 머리에 싣는 사람이 움직일 줄 — 이번에 적은 이상한 것 · 막힌 물음 · 2시간 뒤에도 남은 배운 줄 없는 화면 */
export function 사람줄(줄들: readonly 앱배운줄[], 이번열쇠: ReadonlySet<string>, 남은화면: readonly string[]): string[] {
  const 이번 = 줄들.filter((x) => 이번열쇠.has(x.key));
  const 이상 = 이번.filter((x) => x.kind === 'ODD').map((x) => x.name);
  const 막힘 = 이번.filter((x) => x.kind === 'ASK' && 있나(칸(x).막힘) && !있나(칸(x).닫음)).map((x) => x.name);
  return [
    ...(이상.length === 0 ? [] : [`앱 버그 후보: ${목록(이상)}`]),
    ...(막힘.length === 0 ? [] : [`앱에서 사람에게 물을 것: ${목록(막힘)}`]),
    ...(남은화면.length === 0 ? [] : [`앱 배우기: 배운 줄 없는 화면 ${String(남은화면.length)} — ${목록(남은화면, 5)}`]),
  ];
}
