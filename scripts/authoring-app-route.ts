// 앱 조작 맵 경로 검색 — 앱 작성 AI 가 맵 글(자료 폴더 app-route.txt)을 통째로 읽지 않고 목표 화면까지의 차례만 받아 본다 (도메인/작성 §3.6 「★ 앱 탐색」)
// 쓰는 법: npx tsx scripts/authoring-app-route.ts <자료 폴더> <목표 화면 키> [--from <출발 화면 키>] — 폰 없이 파일만 읽는다. 「확인」 줄로만 길을 낸다.
// 게임 경로 검색(authoring-game-route.ts)과 꼴은 같지만 따로 둔다 — 결정 6(앱과 게임은 표 · 코드를 같이 쓰지 않는다)
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 앱맵파일 } from './authoring-app-screen.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

const 종류들 = ['MOVE', 'SETUP', 'API', 'TERM', 'POPUP'] as const;
type 종류 = (typeof 종류들)[number];

export interface 맵줄 {
  kind: 종류;
  from: string;
  action: string;
  to: string | null;
  status: 'OK' | 'RECHECK' | 'BLOCKED';
  /** 맵 글의 그 줄(「- 」 뒤) — 결과에 그대로 찍어 빌드 · 소요 · 도우미 · 함수 · 경고 · 칸을 다시 만들지 않는다 */
  line: string;
}

/**
 * 맵 글을 줄로 — 서버 앱맵글짓기(apps/admin/src/prd/appRoute.ts)의 꼴을 거꾸로 읽는다.
 * 글 칸에는 「 · 」 「 → 」가 못 들어가(올리기 검사) 그것으로 자른다. 꼴이 틀린 줄은 뺀다
 */
export function 맵읽기(글: string): 맵줄[] {
  const 줄들: 맵줄[] = [];
  let kind: 종류 | null = null;
  for (const 줄 of 글.split('\n')) {
    const 머리 = /^## .+ \((\w+)\) — \d+줄$/.exec(줄);
    if (머리) {
      kind = (종류들 as readonly string[]).includes(머리[1]!) ? (머리[1] as 종류) : null;
      continue;
    }
    if (kind === null || !줄.startsWith('- ')) continue;
    const line = 줄.slice(2);
    const [앞, 상태글] = line.split(' · ');
    const 칸들 = (앞 ?? '').split(' → ');
    const status = 상태글 === '확인' ? 'OK' : 상태글 === '다시 확인' ? 'RECHECK' : 상태글?.startsWith('진행 불가 — ') ? 'BLOCKED' : null;
    if (칸들.length < 2 || 칸들.length > 3 || status === null) continue;
    줄들.push({ kind, from: 칸들[0]!, action: 칸들[1]!, to: 칸들[2] ?? null, status, line });
  }
  return 줄들;
}

const 상태글 = { OK: '확인', RECHECK: '다시 확인', BLOCKED: '진행 불가' } as const;
const 글칸 = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** 이번 작성이 적은 줄 한 줄 — 서버 맵 글(appRoute.ts 줄글)과 같은 꼴로 찍는다 */
function 새줄글(x: Record<string, unknown>, status: 맵줄['status']): string {
  const 칸 = typeof x.fields === 'object' && x.fields !== null && !Array.isArray(x.fields) ? (x.fields as Record<string, unknown>) : {};
  const { fn, ...나머지 } = 칸;
  return [
    [x.fromKey, x.action, x.toKey].map(글칸).filter((v) => v !== null).join(' → '),
    status === 'BLOCKED' ? `${상태글.BLOCKED} — ${글칸(x.reason) ?? ''}` : 상태글[status],
    글칸(x.buildNo) === null ? null : `빌드 ${String(x.buildNo)}`,
    typeof x.durationMs === 'number' ? `소요 ${String(x.durationMs)}ms` : null,
    글칸(x.helper) === null ? null : `도우미 ${String(x.helper)}`,
    typeof fn === 'string' ? `함수 ${fn}` : null,
    글칸(x.warning) === null ? null : `⚠ ${String(x.warning)}`,
    Object.keys(나머지).length === 0 ? null : `칸 ${JSON.stringify(나머지)}`,
  ]
    .filter((v) => v !== null)
    .join(' · ');
}

/**
 * 맵 글의 줄에 이번 작성이 적은 줄(PUT app-route 본문 `{ rows, remove? }`)을 얹는다 — 같은 줄(종류 · 출발 · 동작)은 새 줄이 이기고 remove 는 뺀다.
 * 서버 올리기(appRoute.ts 맵줄넣기)와 같이 빌드를 안 실은 확인 줄은 「다시 확인」 줄을 풀지 않는다 — 다시 해 본 것이 아니다.
 * 꼴이 틀린 줄은 건너뛴다(서버가 올릴 때 틀린 자리를 짚는다)
 */
export function 새줄더하기(줄들: 맵줄[], 몸: unknown): 맵줄[] {
  const b = typeof 몸 === 'object' && 몸 !== null ? (몸 as { rows?: unknown; remove?: unknown }) : {};
  const 들 = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : []).filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);
  const 열쇠 = (kind: unknown, from: unknown, action: unknown) => JSON.stringify([kind, from, action]);
  const 다시확인 = new Set(줄들.filter((r) => r.status === 'RECHECK').map((r) => 열쇠(r.kind, r.from, r.action)));
  const 새것: 맵줄[] = [];
  for (const x of 들(b.rows)) {
    const kind = (종류들 as readonly unknown[]).includes(x.kind) ? (x.kind as 종류) : null;
    const 온상태 = x.status === 'OK' || x.status === 'BLOCKED' ? x.status : null;
    if (kind === null || 온상태 === null || 글칸(x.fromKey) === null || 글칸(x.action) === null) continue;
    const status = 온상태 === 'OK' && 글칸(x.buildNo) === null && 다시확인.has(열쇠(kind, x.fromKey, x.action)) ? 'RECHECK' : 온상태;
    새것.push({ kind, from: x.fromKey as string, action: x.action as string, to: 글칸(x.toKey), status, line: 새줄글(x, status) });
  }
  const 뺄 = new Set([...들(b.remove).map((x) => 열쇠(x.kind, x.fromKey, x.action)), ...새것.map((r) => 열쇠(r.kind, r.from, r.action))]);
  return [...줄들.filter((r) => !뺄.has(열쇠(r.kind, r.from, r.action))), ...새것];
}

// 서버 app-route 본문 상한(4MiB)과 같다 — 넘으면 자식이 고친 파일이다
const 맵상한 = 4_000_000;
/** 이번 작성이 적은 줄(PUT app-route 본문) — 빈 곳 해 보기가 찾은 길을 올리기 전에 다음 목표가 쓴다. 쓰게 하는 쪽은 APP-F4-06 · 07 */
export const 새맵줄이름 = 'app-route.json';

/**
 * 자료 폴더의 맵 — 받은 맵 글(app-route.txt)에 이번 작성이 적은 줄(app-route.json)을 얹는다. 둘 다 없으면 null.
 * 새 줄 파일을 JSON 으로 못 읽으면 `틀림` 에 까닭을 싣고 받은 맵 글만 쓴다
 */
export function 맵줄읽기(폴더: string): { 줄들: 맵줄[]; 틀림: string | null } | null {
  const 글 = 안전히읽기(폴더, basename(앱맵파일(폴더)), 맵상한);
  const 새글 = 안전히읽기(폴더, 새맵줄이름, 맵상한);
  if (글 === null && 새글 === null) return null;
  const 줄들 = 맵읽기(글 ?? '');
  if (새글 === null) return { 줄들, 틀림: existsSync(join(폴더, 새맵줄이름)) ? `${새맵줄이름} 이 4MB 를 넘거나 일반 파일이 아니다` : null };
  try {
    return { 줄들: 새줄더하기(줄들, JSON.parse(새글)), 틀림: null };
  } catch {
    return { 줄들, 틀림: `${새맵줄이름} 을 JSON 으로 못 읽었다` };
  }
}

/** 화면에서 화면으로 — 이동 줄만. 너비 우선이라 걸음 수가 가장 적은 길 */
function 길찾기(줄들: 맵줄[], 출발: string, 도착: string, 쓸상태: ReadonlySet<맵줄['status']>): 맵줄[] | null {
  if (출발 === 도착) return [];
  const 길목 = 줄들.filter((r): r is 맵줄 & { to: string } => r.kind === 'MOVE' && r.to !== null && r.to !== r.from && 쓸상태.has(r.status));
  const 온길 = new Map<string, 맵줄 | null>([[출발, null]]);
  for (let 앞줄 = [출발]; 앞줄.length > 0; ) {
    const 다음: string[] = [];
    for (const 화면 of 앞줄) {
      for (const r of 길목) {
        if (r.from !== 화면 || 온길.has(r.to)) continue;
        온길.set(r.to, r);
        다음.push(r.to);
        if (r.to !== 도착) continue;
        const 길: 맵줄[] = [];
        for (let x = 온길.get(도착); x; x = 온길.get(x.from)) 길.unshift(x);
        return 길;
      }
    }
    앞줄 = 다음;
  }
  return null;
}

const 확인만 = new Set<맵줄['status']>(['OK']);
const 다시확인까지 = new Set<맵줄['status']>(['OK', 'RECHECK']);

/**
 * 목표 화면까지 — 지나는 화면(출발 · 길의 도착들)에 걸린 데이터 세팅 → 이동 차례, 그다음 돌발 팝업.
 * 데이터 세팅 줄은 도착 칸(toKey)이 「그 데이터가 있어야 뜨는 화면 키」다(2026-11-20 APP-F4-04 시작 질문).
 * 길이 없으면 「길 없음」 줄과 그 목표에 걸린 확인 아닌 줄 — 그래도 목표 화면의 세팅은 찍는다(폰에서 해 볼 때 먼저 할 것이라)
 */
export function 경로(줄들: 맵줄[], 목표: string, 출발: string): { 줄들: string[]; 다찾음: boolean } {
  const 찍을 = [`# 경로 검색 — 목표 ${목표} · 출발 ${출발} — 「확인」 줄로만 길을 낸다 · 기대값의 근거가 아니다`];
  const 길 = 길찾기(줄들, 출발, 목표, 확인만);
  let 다찾음 = 길 !== null;
  const 지나는화면 = 길 === null ? [출발, 목표] : [출발, ...길.map((r) => r.to!)];
  let 번호 = 0;
  for (const 화면 of 지나는화면) {
    for (const r of 줄들) {
      if (r.kind !== 'SETUP' || r.to !== 화면) continue;
      if (r.status === 'OK') {
        찍을.push(`${String(++번호)}. [데이터 세팅] ${r.line}`);
        continue;
      }
      // 확인 안 된 세팅이 걸린 화면은 길이 나도 폰에서 다시 해 볼 목표다
      다찾음 = false;
      찍을.push(`확인 안 된 데이터 세팅: ${r.line}`);
    }
  }
  if (길 === null) {
    찍을.push(`길 없음: ${목표} — 폰에서 해 볼 목표다`);
    // 「다시 확인」 줄을 지나야만 길이 나는 목표도 그 길에 낀 줄까지 붙인다
    const 다시확인길 = 길찾기(줄들, 출발, 목표, 다시확인까지) ?? [];
    for (const r of 줄들) {
      if (r.status === 'OK' || r.kind === 'SETUP' || !(r.from === 목표 || r.to === 목표 || 다시확인길.includes(r))) continue;
      찍을.push(`  ${r.status === 'BLOCKED' ? '진행 불가' : '다시 확인'}: ${r.line}`);
    }
  } else {
    for (const r of 길) 찍을.push(`${String(++번호)}. [이동] ${r.line}`);
  }
  // 돌발 팝업은 화면을 가리지 않고 뜬다 — 확인된 것은 다 붙인다
  for (const r of 줄들) if (r.status === 'OK' && r.kind === 'POPUP') 찍을.push(`돌발 팝업: ${r.line}`);
  return { 줄들: 찍을, 다찾음 };
}

/**
 * 출발 — 준 열쇠가 있으면 그것, 없으면 들어오는 확인 이동이 없는 화면이 하나일 때만(앱 첫 화면 파일에는 화면 키가 없다). 못 정하면 까닭
 */
export function 출발고르기(줄들: 맵줄[], 준것?: string): { 출발: string } | { 까닭: string } {
  if (준것 !== undefined) return { 출발: 준것 };
  const 이동 = 줄들.filter((r) => r.kind === 'MOVE' && r.status === 'OK' && r.to !== null);
  const 들어옴 = new Set(이동.filter((r) => r.to !== r.from).map((r) => r.to));
  const 후보 = [...new Set(이동.map((r) => r.from))].filter((k) => !들어옴.has(k));
  if (후보.length === 1) return { 출발: 후보[0]! };
  const 보기 = 후보.slice(0, 10).join(' · ') + (후보.length > 10 ? ` 외 ${String(후보.length - 10)}개` : '');
  return { 까닭: `들어오는 이동이 없는 화면이 ${후보.length === 0 ? '맵에 없다' : `여럿이다 — ${보기}`} — 앱을 켠 직후 화면 키를 --from 으로 준다` };
}

const 쓰는법 = '쓰는 법: npx tsx scripts/authoring-app-route.ts <자료 폴더> <목표 화면 키> [--from <출발 화면 키>]';

/** 0 길을 다 찾았다 · 1 길이 없거나 확인 안 된 세팅이 걸렸다(찾은 데까지 찍는다) · 2 부를 수 없다 */
export function 실행(인자: string[]): number {
  const [폴더, ...나머지] = 인자;
  const 앞 = 나머지.indexOf('--from');
  const 준출발 = 앞 < 0 ? undefined : 나머지[앞 + 1];
  const 목표들 = 나머지.filter((_, i) => 앞 < 0 || (i !== 앞 && i !== 앞 + 1));
  if (폴더 === undefined || 목표들.length !== 1 || 목표들[0] === '' || (앞 >= 0 && (준출발 === undefined || 준출발 === ''))) {
    console.error(쓰는법);
    return 2;
  }
  const 맵 = 맵줄읽기(폴더);
  if (맵 === null) {
    console.error(`[경로 검색] ${앱맵파일(폴더)} 이 없다 — 에이전트가 앱 조작 맵을 못 받았다. 목표를 폰에서 해 본다`);
    return 2;
  }
  if (맵.틀림 !== null) console.error(`[경로 검색] ${맵.틀림} — 이번 작성이 적은 줄은 빼고 찾는다`);
  const 출발 = 출발고르기(맵.줄들, 준출발);
  if ('까닭' in 출발) {
    console.error(`[경로 검색] ${출발.까닭}`);
    return 2;
  }
  const { 줄들, 다찾음 } = 경로(맵.줄들, 목표들[0]!, 출발.출발);
  console.log(줄들.join('\n'));
  return 다찾음 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = 실행(process.argv.slice(2));
}
