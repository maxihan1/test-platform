// 데이터 묶음 칸 읽기와 종류별 값 파일 — 오브젝트의 묶음 칸(예 MonsterAI.TypeData)을 game-types.txt 의 칸 이름으로 get 점 경로로 읽는다 (게임 정보 먼저 쌓기)
// 값 파일 `game-props/<종류>.json` 은 실행 중 읽은 값만 담는다. 빌드 데이터(game-build-data.json)는 전략 계산용이라 여기 섞지 않는다
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Game } from 'control-cli';

import { 게임자리 } from './authoring-game.js';
import { 이름만 } from './authoring-game-watch-report.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

export interface 칸정보 {
  칸: string;
  타입: string;
}
/** 타입 이름(짧은 이름) → 칸 이름 · 타입 — game-types.txt 한 줄이 한 타입이다 */
export type 종류표 = ReadonlyMap<string, readonly 칸정보[]>;

/** 한 묶음에서 읽는 칸 상한 · 묶음 안 묶음을 따라가는 깊이(묶음 → 하위 묶음까지 두 단계) */
const 칸상한 = 60;
const 깊이상한 = 2;
const 표상한 = 2_000_000;


/** 같은 종류로 묶는 이름 — `(Clone)` · ` (1)` · `[n]` 꼬리를 뗀다. 값 파일 이름도 이것이다 */
export const 종류 = (경로: string): string => 이름만(경로).replace(/\(Clone\)/g, '').replace(/\s*\(\d+\)$/, '').trim();

const 짧은 = (타입: string): string => 타입.split('.').pop()!;
const 목록타입 = /^(?:vector|Array|List|HashSet|Queue|Stack)\b|\[\]$/;
const 가리킴 = /^PPtr<\$?([^>]+)>$/;

/** game-types.txt 글 → 표. 한 줄은 `<타입> <칸>:<칸타입> …` */
export function 종류표만들기(글: string): 종류표 {
  const 표 = new Map<string, 칸정보[]>();
  for (const 줄 of 글.split('\n')) {
    const [타입, ...칸들] = 줄.trim().split(/\s+/);
    if (타입 === undefined || 타입 === '') continue;
    표.set(타입, 칸들.flatMap((x) => {
      const 자리 = x.indexOf(':');
      return 자리 < 1 ? [] : [{ 칸: x.slice(0, 자리), 타입: x.slice(자리 + 1) }];
    }));
  }
  return 표;
}

/** 자료 폴더의 game-types.txt — 없거나 못 읽으면 빈 표(묶음 칸은 이름만 보인다) */
export function 종류표읽기(자료: string | undefined): 종류표 {
  return 자료 === undefined ? new Map() : 종류표만들기(안전히읽기(자료, 게임자리.종류표, 표상한) ?? '');
}

/** 묶음 칸 하나의 타입 이름 — 칸의 선언 타입이 표에 있으면 그것, 아니면 값 글 `이름 (네임스페이스.타입)` 의 타입 */
export function 묶음타입(선언타입: string, 값글: unknown, 표: 종류표): string | null {
  if (표.has(짧은(선언타입))) return 짧은(선언타입);
  const 글타입 = typeof 값글 === 'string' ? /\(([^()]+)\)$/.exec(값글)?.[1] : undefined;
  return 글타입 !== undefined && 표.has(짧은(글타입)) ? 짧은(글타입) : null;
}

export interface 묶음읽음 {
  /** `컴포넌트.칸.하위칸` → 값 */
  값: Map<string, unknown>;
  /** 목록 칸 — 원소를 못 읽어 이름만 */
  목록칸: string[];
  못읽음: string[];
}

/**
 * 묶음 칸 하나를 칸 이름 표로 읽는다. 경로는 `컴포넌트.칸` — 하위 칸은 `경로.하위칸` 점 경로로 get 한다.
 * 하위 칸이 또 표에 있는 묶음이면 한 단계 더 따라간다(최대 두 단계). 목록은 원소를 못 읽으니 이름만 남긴다.
 * 그침인가 가 참인 오류(판이 끝나 세기를 그쳤다)는 칸 하나의 실패로 삼키지 않고 다시 던진다 — 반쯤 읽은 값이 값 파일로 굳지 않게
 */
export async function 묶음읽기(game: Pick<Game, 'get'>, 주소: string, 경로: string, 타입: string, 표: 종류표, 깊이 = 1, 결과: 묶음읽음 = { 값: new Map(), 목록칸: [], 못읽음: [] }, 그침인가?: (e: unknown) => boolean): Promise<묶음읽음> {
  for (const { 칸, 타입: 칸타입 } of (표.get(타입) ?? []).slice(0, 칸상한)) {
    const 하위 = `${경로}.${칸}`;
    if (목록타입.test(칸타입)) {
      결과.목록칸.push(하위);
      continue;
    }
    const 가리키는것 = 가리킴.exec(칸타입)?.[1];
    if (가리키는것 !== undefined) {
      // 엔진 자산(그림 · 프리팹)을 가리키는 칸은 값이 아니다. 표에 있는 묶음만 따라간다
      if (표.has(짧은(가리키는것)) && 깊이 < 깊이상한) await 묶음읽기(game, 주소, 하위, 짧은(가리키는것), 표, 깊이 + 1, 결과, 그침인가);
      continue;
    }
    try {
      결과.값.set(하위, await game.get(주소, 하위));
    } catch (e) {
      if (그침인가?.(e) === true) throw e;
      결과.못읽음.push(하위);
    }
  }
  return 결과;
}

export interface 값파일 {
  종류: string;
  장면: string | null;
  읽은때: string;
  출처: '실행 중';
  칸: Record<string, unknown>;
  목록칸: string[];
  /** 정보 모으기 명령(authoring-game-info)이 웨이브를 넘겨 본 값이다 — 쓴 call 과 함께 남긴다. 승패 근거로 못 쓴다 */
  치트?: true;
  call?: string[];
}

/** 종류 이름 → 파일 이름 — 경로 글자는 `_` 로. 글자를 바꾸거나 잘랐으면 원래 종류의 짧은 해시를 붙인다(`Enemy Fast` 와 `Enemy_Fast` 가 한 파일로 접히지 않게) */
export function 값파일이름(종류: string): string {
  const 글자 = 종류.replace(/[^\p{L}\p{N}_.-]+/gu, '_').replace(/^\.+/, '_').slice(0, 80) || '_';
  return `${글자 === 종류 ? 글자 : `${글자}-${createHash('sha1').update(종류).digest('hex').slice(0, 6)}`}.json`;
}

export const 값파일있나 = (자료: string, 종류: string): boolean => existsSync(join(자료, 게임자리.값파일, 값파일이름(종류)));

const 값파일글상한 = 2_000_000;

/** 그 종류의 값 파일이 치트(웨이브를 넘겨 본 값)로 남았나 */
const 치트값인가 = (자료: string, 종류: string): boolean => {
  try {
    return (JSON.parse(안전히읽기(join(자료, 게임자리.값파일), 값파일이름(종류), 값파일글상한) ?? 'null') as { 치트?: unknown } | null)?.치트 === true;
  } catch {
    return false;
  }
};

/** 치트로 처음 본 값 파일이 있는데 지금 읽기는 치트가 아니다 — 보통 판에서 다시 읽어 덮어야 치트 표시를 벗는다 */
export const 치트값다시읽을까 = (자료: string, 종류: string, 치트인가: boolean): boolean => !치트인가 && 치트값인가(자료, 종류);

/**
 * 값 파일을 쓴다 — 이미 있으면 안 덮는다(첫 읽기가 정본). 다만 치트 값 위에는 치트 아닌 값이 덮는다.
 * 못 써도 던지지 않고 까닭을 돌려준다
 */
export function 값파일쓰기(자료: string, 기록: 값파일, 가릴것: (글: string) => string = (글) => 글): string | null {
  try {
    mkdirSync(join(자료, 게임자리.값파일), { recursive: true, mode: 0o755 });
    const 경로 = join(자료, 게임자리.값파일, 값파일이름(기록.종류));
    // 자식이 심은 링크를 따라 쓰지 않게 지우고 wx 로 쓴다
    if (기록.치트 !== true && 치트값인가(자료, 기록.종류)) rmSync(경로, { force: true });
    writeFileSync(경로, 가릴것(`${JSON.stringify(기록, null, 1)}\n`), { flag: 'wx', mode: 0o644 });
    return null;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EEXIST' ? null : e instanceof Error ? e.message : String(e);
  }
}
