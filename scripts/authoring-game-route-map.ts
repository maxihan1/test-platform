// 게임 조작 맵 글 읽기 — 받은 맵 글(game-route.txt)과 이번 작성이 적은 행(game-route.json)을 행으로 (도메인/게임 §3.10 「경로 검색」 · §7 「조작 맵」)
// 경로 검색(authoring-game-route.ts)과 작성 돌려 보기 환경(authoring-run3-env.ts)이 같이 쓴다
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

const 종류들 = ['MOVE', 'SETUP', 'LOG', 'TERM', 'POPUP'] as const;
type 종류 = (typeof 종류들)[number];

export interface 맵행 {
  kind: 종류;
  from: string;
  action: string;
  to: string | null;
  status: 'OK' | 'RECHECK' | 'BLOCKED';
  warning: string | null;
  /** 그 행을 하는 계정 역할(칸 `계정`) — 로그인 행이면 로그인하는 계정. 없으면 이동 · 조작 행은 계정을 가리지 않고 상태 설정 행은 첫 「일반 회원」이다 */
  account: string | null;
  /** 맵 글의 그 줄(「- 」 뒤) — 결과에 그대로 찍어 빌드 · 소요 · 도우미 · 함수 · 칸을 다시 만들지 않는다 */
  line: string;
}

/** 따옴표(JSON 글) 밖의 가르개로만 자른다 — 서버가 「 · 」 「 → 」 · 따옴표가 든 글 칸을 JSON 글로 감싸 적는다(apps/admin/src/prd/gameRoute.ts 칸글) */
function 자르기(글: string, 가르개: string): string[] {
  const 들: string[] = [];
  let 앞 = 0;
  for (let i = 0; i < 글.length; i++) {
    if (글[i] === '"') {
      for (i++; i < 글.length && 글[i] !== '"'; i++) if (글[i] === '\\') i++;
    } else if (글.startsWith(가르개, i)) {
      들.push(글.slice(앞, i));
      앞 = i + 가르개.length;
      i = 앞 - 1;
    }
  }
  return [...들, 글.slice(앞)];
}
/** 감싼 글 칸을 푼다 — 안 감싼 글은 그대로 */
function 풀기(칸: string): string {
  if (!칸.startsWith('"')) return 칸;
  try {
    const v: unknown = JSON.parse(칸);
    return typeof v === 'string' ? v : 칸;
  } catch {
    return 칸;
  }
}
/** 서버 칸글과 같다 — 이번 작성이 적은 행도 맵 글과 같은 꼴로 찍는다 */
const 칸글 = (v: string): string => (/ · | → |"|^[·→]|[·→]$/.test(v) ? JSON.stringify(v) : v);
const 계정칸 = (칸: unknown): string | null => {
  const v = typeof 칸 === 'object' && 칸 !== null ? (칸 as Record<string, unknown>).계정 : null;
  return typeof v === 'string' && v !== '' ? v : null;
};

/**
 * 맵 글을 행으로 — 서버 맵글짓기(apps/admin/src/prd/gameRoute.ts)의 꼴을 거꾸로 읽는다.
 * 칸은 따옴표 밖의 「 · 」 「 → 」로 자른다. 꼴이 틀린 줄은 뺀다
 */
export function 맵읽기(글: string): 맵행[] {
  const 행들: 맵행[] = [];
  let kind: 종류 | null = null;
  for (const 줄 of 글.split('\n')) {
    const 머리 = /^## .+ \((\w+)\) — \d+행$/.exec(줄);
    if (머리) {
      kind = (종류들 as readonly string[]).includes(머리[1]!) ? (머리[1] as 종류) : null;
      continue;
    }
    if (kind === null || !줄.startsWith('- ')) continue;
    const line = 줄.slice(2);
    // 칸(JSON) 안의 「 · 」도 따옴표 안이라 잘리지 않는다
    const [앞, 상태글, ...뒤] = 자르기(line, ' · ');
    const 칸들 = 자르기(앞 ?? '', ' → ').map(풀기);
    const status = 상태글 === '확인' ? 'OK' : 상태글 === '재확인 필요' ? 'RECHECK' : 상태글?.startsWith('진행 불가 — ') ? 'BLOCKED' : null;
    if (칸들.length < 2 || 칸들.length > 3 || status === null) continue;
    const 경고 = 뒤.find((x) => x.startsWith('⚠ '));
    const 칸 = 뒤.find((x) => x.startsWith('칸 '));
    let 칸값: unknown = null;
    try {
      칸값 = 칸 === undefined ? null : JSON.parse(칸.slice(2));
    } catch {
      // 칸을 못 읽으면 계정이 없는 행으로 본다 — 길은 그대로 낸다
    }
    행들.push({
      kind, from: 칸들[0]!, action: 칸들[1]!, to: 칸들[2] ?? null, status, warning: 경고 === undefined ? null : 풀기(경고.slice(2)), account: 계정칸(칸값), line,
    });
  }
  return 행들;
}

const 상태글 = { OK: '확인', RECHECK: '재확인 필요', BLOCKED: '진행 불가' } as const;
const 글칸 = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** 이번 작성이 적은 행 한 줄 — 서버 맵 글(apps/admin/src/prd/gameRoute.ts 행줄)과 같은 꼴로 찍는다 */
function 새행줄(x: Record<string, unknown>, status: 맵행['status']): string {
  const 칸 = typeof x.fields === 'object' && x.fields !== null && !Array.isArray(x.fields) ? (x.fields as Record<string, unknown>) : {};
  const { fn, ...나머지 } = 칸;
  return [
    [x.fromKey, x.action, x.toKey].map(글칸).filter((v) => v !== null).map(칸글).join(' → '),
    status === 'BLOCKED' ? `${상태글.BLOCKED} — ${칸글(글칸(x.reason) ?? '')}` : 상태글[status],
    글칸(x.buildNo) === null ? null : `빌드 ${칸글(String(x.buildNo))}`,
    typeof x.durationMs === 'number' ? `소요 ${String(x.durationMs)}ms` : null,
    글칸(x.helper) === null ? null : `도우미 ${칸글(String(x.helper))}`,
    typeof fn === 'string' ? `함수 ${칸글(fn)}` : null,
    글칸(x.warning) === null ? null : `⚠ ${칸글(String(x.warning))}`,
    Object.keys(나머지).length === 0 ? null : `칸 ${JSON.stringify(나머지)}`,
  ]
    .filter((v) => v !== null)
    .join(' · ');
}

/**
 * 맵 글의 행에 이번 작성이 적은 행(PUT game-route 본문 `{ rows, remove? }`)을 얹는다 — 같은 행(종류 · 출발 · 동작)은 새 행이 이기고 remove 는 뺀다.
 * 서버 올리기(apps/admin/src/prd/gameRoute.ts 조작행넣기)와 같이 빌드를 안 실은 확인 행은 「재확인 필요」 행을 풀지 않는다 — 다시 해 본 것이 아니다.
 * 꼴이 틀린 행은 건너뛴다(서버가 올릴 때 틀린 자리를 짚는다)
 */
export function 새행더하기(행들: 맵행[], 몸: unknown): 맵행[] {
  const b = typeof 몸 === 'object' && 몸 !== null ? (몸 as { rows?: unknown; remove?: unknown }) : {};
  const 들 = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : []).filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);
  const 열쇠 = (kind: unknown, from: unknown, action: unknown) => JSON.stringify([kind, from, action]);
  const 재확인 = new Set(행들.filter((r) => r.status === 'RECHECK').map((r) => 열쇠(r.kind, r.from, r.action)));
  const 새것: 맵행[] = [];
  for (const x of 들(b.rows)) {
    const kind = (종류들 as readonly unknown[]).includes(x.kind) ? (x.kind as 종류) : null;
    const 온상태 = x.status === 'OK' || x.status === 'BLOCKED' ? x.status : null;
    if (kind === null || 온상태 === null || 글칸(x.fromKey) === null || 글칸(x.action) === null) continue;
    const status = 온상태 === 'OK' && 글칸(x.buildNo) === null && 재확인.has(열쇠(kind, x.fromKey, x.action)) ? 'RECHECK' : 온상태;
    새것.push({
      kind, from: x.fromKey as string, action: x.action as string, to: 글칸(x.toKey), status, warning: 글칸(x.warning), account: 계정칸(x.fields), line: 새행줄(x, status),
    });
  }
  const 뺄 = new Set([...들(b.remove).map((x) => 열쇠(x.kind, x.fromKey, x.action)), ...새것.map((r) => 열쇠(r.kind, r.from, r.action))]);
  return [...행들.filter((r) => !뺄.has(열쇠(r.kind, r.from, r.action))), ...새것];
}

// 서버 game-route 본문 상한(4MiB)과 같다 — 넘으면 자식이 고친 파일이다
const 맵상한 = 4_000_000;

/**
 * 자료 폴더의 맵 — 받은 맵 글(game-route.txt)에 이번 작성이 적은 행(game-route.json)을 얹는다. 둘 다 없으면 null.
 * 새 행 파일을 JSON 으로 못 읽으면 `틀림` 에 까닭을 싣고 받은 맵 글만 쓴다
 */
export function 맵행읽기(폴더: string): { 행들: 맵행[]; 틀림: string | null } | null {
  const 글 = 안전히읽기(폴더, 게임자리.맵, 맵상한);
  const 새글 = 안전히읽기(폴더, 게임자리.새맵행, 맵상한);
  if (글 === null && 새글 === null) return null;
  const 행들 = 맵읽기(글 ?? '');
  if (새글 === null) return { 행들, 틀림: existsSync(join(폴더, 게임자리.새맵행)) ? `${게임자리.새맵행} 이 4MB 를 넘거나 일반 파일이 아니다` : null };
  try {
    return { 행들: 새행더하기(행들, JSON.parse(새글)), 틀림: null };
  } catch {
    return { 행들, 틀림: `${게임자리.새맵행} 을 JSON 으로 못 읽었다` };
  }
}
