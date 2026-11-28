// 게임 맵 격자 길찾기 — 지도의 걷기 · 막힘과 판 기록의 걸은 칸 · 못감으로 곳마다 격자를 칠하고 거쳐 갈 점을 낸다 (도메인/게임 §3.10 「맵 파악」)
// 쓰는 법: npx tsx scripts/authoring-game-path.ts <자료 폴더> <곳 열쇠> <가로,세로> <가로,세로>(3D 는 x,z · 2D 는 x,y) — 거쳐 갈 점 JSON 한 줄([[x,z],…])과 요약 한 줄을 찍는다. 길이 없으면 1, 인자 · 지도가 틀리면 2
// 판 함수는 이 점들을 인자로 받아 따라가기만 한다. 격자는 저장하지 않고 부를 때마다 새로 지어, 새 못감과 새로 걸은 칸이 다음 부름부터 저절로 들어간다
import { 지금지도 } from './authoring-game-find.js';
import { type 판기록, 판기록들 } from './authoring-learn-check.js';
import { 계획곳, 곳줄들 } from './authoring-learn-play.js';
import { 걸음됨, 길찾기, 막힘, 모름, 안인가, 칸번호 } from './authoring-game-path-astar.js';
import { type 맵훑기, 훑기읽기 } from './authoring-game-nav-file.js';

export { 걸음됨, 길찾기, 막힘, 모름 };

/** 격자 한 칸의 한 변(게임 좌표 단위) — 곳마다 같다 */
export const 칸크기 = 1;
/** 격자가 이만큼 넘게 커지면 안 짓는다 — 걷기 값이 단위가 다른 좌표를 담았을 때 메모리를 다 쓰지 않게 */
export const 격자상한 = 4_000_000;
/** 범위 둘레에 더 두는 칸 — 가장자리 점에 붙은 길이 범위 밖으로 한 칸 돌아갈 자리 */
export const 여백 = 2;

export type 점 = readonly [number, number];

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수인가 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 바닥 평면 — 3D 게임은 높이 y 를 빼고 x · z, 2D 게임은 x · y */
export type 평면 = 'xz' | 'xy';

/** 좌표 하나 — 두 수는 (가로, 세로) 그대로, 세 수 · 객체는 평면의 두 축 */
export function 좌표읽기(v: unknown, 면: 평면 = 'xz'): 점 | null {
  if (Array.isArray(v)) return v.every(수인가) && v.length === 2 ? [v[0]!, v[1]!] : v.every(수인가) && v.length === 3 ? [v[0]!, 면 === 'xz' ? v[2]! : v[1]!] : null;
  const o = 객체(v);
  if (면 === 'xz' && 수인가(o.x) && 수인가(o.z)) return [o.x, o.z];
  return 수인가(o.x) && 수인가(o.y) ? [o.x, o.y] : null;
}

/** 값 안의 좌표를 전부 모은다 — 점 목록 · 사각형 · 그 목록 어느 것이든 */
export function 점들모으기(v: unknown, 면: 평면 = 'xz'): 점[] {
  const 점 = 좌표읽기(v, 면);
  if (점 !== null) return [점];
  return Array.isArray(v) ? v.flatMap((x) => 점들모으기(x, 면)) : Object.values(객체(v)).flatMap((x) => 점들모으기(x, 면));
}

/** 평면 — 맵이 data.맵.평면 으로 적었으면 그것, 아니면 z 없이 {x,y} 로 적은 좌표가 있으면 2D(xy), 없으면 xz. 판 기록의 세 수 위치도 같은 평면으로 읽는다 */
export function 평면정하기(맵: Record<string, unknown>): 평면 {
  if (맵.평면 === 'xy' || 맵.평면 === 'xz') return 맵.평면;
  const xy만 = (v: unknown): boolean => (Array.isArray(v) ? v.some(xy만) : typeof v === 'object' && v !== null ? ((o) => (수인가(o.x) && 수인가(o.y) && o.z === undefined) || Object.values(o).some(xy만))(객체(v)) : false);
  return xy만(맵.걷기) || xy만(맵.막힘) ? 'xy' : 'xz';
}

export interface 막힘읽은것 { 사각형: Array<[점, 점]>; 점: 점[]; 모름: number; 맨쌍: number }
/** 이름을 단 사각형 — { 사각형: [[x1,z1],[x2,z2]] } 나 { 중심: [x,z], 크기: [가로,세로] }. 아니면 null */
function 사각형읽기(o: Record<string, unknown>, 면: 평면): [점, 점] | null {
  if (Array.isArray(o.사각형) && o.사각형.length === 2) {
    const [a, b] = [좌표읽기(o.사각형[0], 면), 좌표읽기(o.사각형[1], 면)];
    return a === null || b === null ? null : [a, b];
  }
  const 중 = o.중심 === undefined ? null : 좌표읽기(o.중심, 면);
  const 크 = Array.isArray(o.크기) && o.크기.length === 2 && o.크기.every(수인가) ? (o.크기 as [number, number]) : null;
  return 중 === null || 크 === null ? null : [[중[0] - 크[0] / 2, 중[1] - 크[1] / 2], [중[0] + 크[0] / 2, 중[1] + 크[1] / 2]];
}

/**
 * 막힘 값 — 점이면 그 칸, 이름을 단 사각형(위 사각형읽기)이면 축에 나란한 사각형(비스듬한 벽은 점 여럿으로 적는다), 목록 · 종류별로 묶은 객체는 안으로 들어가 읽는다.
 * 맨 배열 [[a],[b]] 는 점 두 개다 — 사각형으로 읽으면 물 오브젝트 두 자리가 둘을 꼭짓점으로 한 넓은 막힘이 됐다(작성 16098 열째 맵).
 * 좌표가 아닌 수 · 객체는 건너뛰고 몇 개인지 센다. 글은 이름표라 안 센다
 */
export function 막힘읽기(v: unknown, 면: 평면 = 'xz'): 막힘읽은것 {
  const r: 막힘읽은것 = { 사각형: [], 점: [], 모름: 0, 맨쌍: 0 };
  // 크기 · 반지름을 단 객체는 점이 아니다 — 점으로 읽으면 큰 장애물이 한 칸만 막혀 길이 그것을 뚫는다
  const 맨좌표 = (x: unknown): boolean => Array.isArray(x) || Object.keys(객체(x)).every((k) => k === 'x' || k === 'y' || k === 'z');
  const 읽기 = (x: unknown): void => {
    const 한점 = 맨좌표(x) ? 좌표읽기(x, 면) : null;
    if (한점 !== null) return void r.점.push(한점);
    // 옛 지침이 사각형을 맨 배열로 적게 했다 — 점 둘로 읽되 몇 개인지 알려 고쳐 적게 한다
    if (Array.isArray(x) && x.length === 2 && x.every((y) => 맨좌표(y) && 좌표읽기(y, 면) !== null)) r.맨쌍 += 1;
    if (Array.isArray(x)) return x.forEach(읽기);
    if (typeof x === 'string') return;
    const o = 객체(x);
    const 네모 = 사각형읽기(o, 면);
    if (네모 !== null) return void r.사각형.push(네모);
    if (Object.keys(o).length > 0 && Object.values(o).some((y) => typeof y === 'object' && y !== null)) return Object.values(o).forEach(읽기);
    r.모름 += 1;
  };
  if (v !== undefined) 읽기(v);
  return r;
}

export interface 격자 { 최소i: number; 최소j: number; 너비: number; 높이: number; 칸: Uint8Array; 건너뜀: number; 맨쌍: number }
/** 한 판 기록이 칠하는 것 — 걸은 칸(2초 위치)과 판 함수가 못 갔다고 돌려준 점 */
export interface 칠 { 걸음: 점[]; 못감: 점[] }

/** 사각형이 겹치는 칸 범위 — 넓이가 없으면 그 점의 칸 하나. 정수 경계에 걸친 끝 칸은 막지 않는다 */
const 범위 = (a: number, b: number): [number, number] => {
  const lo = Math.floor(Math.min(a, b) / 칸크기);
  return [lo, Math.max(lo, Math.ceil(Math.max(a, b) / 칸크기) - 1)];
};

/**
 * 격자를 짓는다 — 범위는 걷기 점 · 판 기록의 걸은 위치와 못감 · 덧(맵의 다른 종류 점 · 출발 · 도착)이 든 칸을 모두 감싸고 둘레에 여백 칸을 둔다. 안은 처음에 모두 모름이다.
 * 걷기 점 바깥을 막힘으로 치면 걷기 값에 빠진 곳(남쪽 섬)에서 걸은 위치가 범위 밖이라 버려지고 출발 · 도착이 엉뚱한 칸으로 옮겨졌다(작성 16098 열째 맵 252칸 중 걸음됨 0).
 * 지도 막힘 → 판 기록 차례로 칠하고 걸음됨은 막힘을 덮는다. 기록 차례가 시간 차례다
 */
export function 격자짓기(걷기값: unknown, 막힘값: unknown, 칠들: readonly 칠[], 면: 평면 = 'xz', 덧: readonly 점[] = [], 훑기?: Pick<맵훑기, '열림' | '막힘' | '끊김'>): 격자 | string {
  const 바닥 = 점들모으기(걷기값, 면);
  const 훑은칸 = 훑기 === undefined ? [] : [...훑기.열림, ...훑기.막힘];
  if (바닥.length === 0 && 훑은칸.length === 0) return '걷기.값 에서 좌표를 못 읽었다';
  const 모두 = [...바닥, ...덧, ...칠들.flatMap((c) => [...c.걸음, ...c.못감]), ...훑은칸.map(([i, j]) => [(i + 0.5) * 칸크기, (j + 0.5) * 칸크기] as 점)];
  const 칸범위 = (수들: number[]): [number, number] => {
    let [lo, hi] = [Infinity, -Infinity];
    for (const v of 수들) [lo, hi] = [Math.min(lo, v), Math.max(hi, v)];
    return [Math.floor(lo / 칸크기) - 여백, Math.floor(hi / 칸크기) + 여백];
  };
  const [i0, i1] = 칸범위(모두.map((p) => p[0]));
  const [j0, j1] = 칸범위(모두.map((p) => p[1]));
  const 너비 = i1 - i0 + 1;
  const 높이 = j1 - j0 + 1;
  if (너비 * 높이 > 격자상한) return `범위가 칸 ${너비}×${높이} 로 너무 크다 — 걷기.값 · 맵 값 · 판 기록 위치가 같은 게임 좌표인지 본다`;
  const g: 격자 = { 최소i: i0, 최소j: j0, 너비, 높이, 칸: new Uint8Array(너비 * 높이), 건너뜀: 0, 맨쌍: 0 };
  const 칠하기 = (i: number, j: number, 값: number): void => {
    if (안인가(g, i, j)) g.칸[칸번호(g, i, j)] = 값;
  };
  // 게임에 물은 맵(맵 훑기)이 먼저다 — 다 물었으면 열린 칸 밖은 캐릭터가 못 가는 곳이라 막힘으로 채운다(authoring-game-nav.ts)
  if (훑기 !== undefined) {
    if (!훑기.끊김) g.칸.fill(막힘);
    for (const [i, j] of 훑기.막힘) 칠하기(i, j, 막힘);
    for (const [i, j] of 훑기.열림) 칠하기(i, j, 걸음됨);
  }
  const 막힘들 = 막힘읽기(막힘값, 면);
  g.건너뜀 = 막힘들.모름;
  g.맨쌍 = 막힘들.맨쌍;
  for (const [a, b] of 막힘들.사각형) {
    const [ai, bi] = 범위(a[0], b[0]);
    const [aj, bj] = 범위(a[1], b[1]);
    for (let j = aj; j <= bj; j += 1) for (let i = ai; i <= bi; i += 1) 칠하기(i, j, 막힘);
  }
  for (const p of 막힘들.점) 칠하기(Math.floor(p[0] / 칸크기), Math.floor(p[1] / 칸크기), 막힘);
  for (const c of 칠들) {
    for (const p of c.걸음) 칠하기(Math.floor(p[0] / 칸크기), Math.floor(p[1] / 칸크기), 걸음됨);
    // 같은 기록에서 걷고 못 갔다고 했으면 못감이 맞다 — 걸음됨이 이기는 것은 그 뒤 기록뿐이다
    for (const p of c.못감) 칠하기(Math.floor(p[0] / 칸크기), Math.floor(p[1] / 칸크기), 막힘);
  }
  return g;
}

/** 판 기록 하나가 그 곳을 적은 계획으로 한 것이면 칠할 것, 아니면 null. 못감은 순서대로 하기가 남긴 `따라감.못감`(걷기가 못 닿은 자리), 없으면 판 함수가 돌려준 값의 `못감: [[x,z],…]` */
export function 기록칠(r: 판기록, 줄들: Parameters<typeof 계획곳>[0], 곳: string, 면: 평면 = 'xz'): 칠 | null {
  if (r.값기록 === undefined || 계획곳(줄들, r.값기록.계획) !== 곳) return null;
  // 옛 기록 · 덜 쓴 기록은 때가 없을 수 있다
  const 때들 = Array.isArray(r.값기록.때) ? r.값기록.때 : [];
  const 걸음 = 때들.flatMap((때) => { const q = 때.위치 == null ? null : 좌표읽기(때.위치, 면); return q === null ? [] : [q]; });
  const 못 = 객체(r.따라감).못감 ?? 객체(r.값).못감;
  return { 걸음, 못감: Array.isArray(못) ? 못.flatMap((p) => { const q = 좌표읽기(p, 면); return q === null ? [] : [q]; }) : [] };
}

export const 칸수 = (g: 격자): { 전체: number; 걸음됨: number; 막힘: number; 모름: number } => {
  const 센 = [0, 0, 0];
  for (const v of g.칸) 센[v]! += 1;
  return { 전체: g.칸.length, 걸음됨: 센[걸음됨]!, 막힘: 센[막힘]!, 모름: 센[모름]! };
};

const 가운데 = (i: number, j: number): 점 => [(i + 0.5) * 칸크기, (j + 0.5) * 칸크기];

/** 맨 배열 두 점을 점으로 읽은 수 — 사각형이었으면 { 사각형 } 으로 고쳐 적으라고 알린다 */
export const 맨쌍글 = (g: 격자): string[] => (g.맨쌍 > 0 ? [`맨 배열 [[x,z],[x,z]] ${g.맨쌍}개를 점 둘로 읽음(사각형이면 { 사각형: [[x1,z1],[x2,z2]] } 으로 고쳐 적는다)`] : []);

/** 점이 든 칸 — 막힘이거나 범위 밖이면 가장 가까운 열린 칸. 옮겼으면 옮겼다고 같이 돌려준다. 열린 칸이 하나도 없으면 null */
export function 열린칸(g: 격자, p: 점): { i: number; j: number; 옮김: boolean } | null {
  const i = Math.floor(p[0] / 칸크기);
  const j = Math.floor(p[1] / 칸크기);
  if (안인가(g, i, j) && g.칸[칸번호(g, i, j)] !== 막힘) return { i, j, 옮김: false };
  let 가장: { i: number; j: number; d: number } | null = null;
  for (let b = 0; b < g.높이; b += 1) {
    for (let a = 0; a < g.너비; a += 1) {
      if (g.칸[b * g.너비 + a] === 막힘) continue;
      const d = (g.최소i + a - i) ** 2 + (g.최소j + b - j) ** 2;
      if (가장 === null || d < 가장.d) 가장 = { i: g.최소i + a, j: g.최소j + b, d };
    }
  }
  return 가장 === null ? null : { i: 가장.i, j: 가장.j, 옮김: true };
}

/** 칸 길을 가운데 좌표로 바꾸고 곧은 구간은 꺾이는 점만 남긴다 */
export function 꺾임점(길: ReadonlyArray<{ i: number; j: number }>): 점[] {
  const 점들 = 길.map((c) => 가운데(c.i, c.j));
  return 점들.filter((p, k) => {
    if (k === 0 || k === 점들.length - 1) return true;
    const a = 점들[k - 1]!;
    const b = 점들[k + 1]!;
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
}

const 길이 = (점들: readonly 점[]): number => 점들.reduce((합, p, k) => (k === 0 ? 합 : 합 + Math.hypot(p[0] - 점들[k - 1]![0], p[1] - 점들[k - 1]![1])), 0);

export type 길결과 = { 점들: 점[]; 길이: number; 요약: string } | { 틀림: string; 길없음?: true };

/** 격자 위에서 출발 → 도착 거쳐 갈 점과 요약 한 줄 */
export function 길내기(g: 격자, 출발: 점, 도착: 점): 길결과 {
  const 시작 = 열린칸(g, 출발);
  const 끝 = 열린칸(g, 도착);
  if (시작 === null || 끝 === null) return { 틀림: '열린 칸이 하나도 없다', 길없음: true };
  const 길 = 길찾기(g, 시작, 끝);
  const 센 = 칸수(g);
  const 옮김 = [...(시작.옮김 ? [`출발이 막혀 칸 ${시작.i},${시작.j} 로 옮김`] : []), ...(끝.옮김 ? [`도착이 막혀 칸 ${끝.i},${끝.j} 로 옮김`] : [])];
  const 덧 = [...옮김, ...(g.건너뜀 > 0 ? [`형태를 모르는 막힘 ${g.건너뜀}개 건너뜀`] : []), ...맨쌍글(g)];
  const 글 = `칸 ${센.전체} · 걸음됨 ${센.걸음됨} · 막힘 ${센.막힘} · 모름 ${센.모름}`;
  if (길 === null) return { 틀림: `${글} · 길 없음 — 출발과 도착 사이가 막혀 있다${덧.length === 0 ? '' : ` · ${덧.join(' · ')}`}`, 길없음: true };
  const 점들 = 꺾임점(길);
  // 끝 점은 칸 가운데 대신 실제 출발 · 도착 — 가운데로 두면 반 칸 뒤로 갔다가 출발한다. 막혀 옮겼으면 옮긴 칸 가운데
  if (!시작.옮김) 점들[0] = 출발;
  if (!끝.옮김) 점들[점들.length - 1] = 도착;
  const 잰 = Math.round(길이(점들) * 100) / 100;
  return { 점들, 길이: 잰, 요약: `${글} · 길 길이 ${잰.toString()}${덧.length === 0 ? '' : ` · ${덧.join(' · ')}`}` };
}

/** 범위에 넣을 맵의 다른 종류 점 — 지킬것 · 적 길 · 놓기 · 자원 · 출구가 걷기 값 밖에 있어도 격자에 든다 */
export const 맵점들 = (맵: Record<string, unknown>, 면: 평면 = 'xz'): 점[] => ['놓기', '적', '지킬것', '자원', '출구'].flatMap((k) => 점들모으기(객체(맵[k]).값, 면));

/** 자료 폴더의 지도 · 판 기록으로 그 곳 격자를 짓는다 — 길찾기 명령과 시뮬이 같이 쓴다. 덧은 범위에 더 넣을 점(출발 · 도착) */
export function 곳격자(자료: string, 곳: string, 덧: readonly 점[] = []): 격자 | string {
  const 지도 = 지금지도(자료);
  if (지도 === null) return '게임 지도를 못 읽었다 — 자료 폴더가 맞는지 본다';
  const 줄 = 곳줄들(지도.줄들).find((x) => x.key === 곳);
  const 맵 = 객체(객체(줄?.learned?.data).맵);
  const 훑기 = 훑기읽기(자료, 곳);
  const 쓸훑기 = 훑기 !== null && 훑기.칸크기 === 칸크기 ? 훑기 : undefined;
  if (줄 === undefined || (객체(맵.걷기).값 === undefined && 쓸훑기 === undefined)) return `${곳} 는 data.맵.걷기.값 이 있는 STAGE 줄이 아니고 맵 훑기도 없다 — 먼저 맵을 적거나 authoring-game-nav.ts 로 훑는다`;
  const 면 = 평면정하기(맵);
  const 칠들 = 판기록들(자료).flatMap((r) => { const c = 기록칠(r, 지도.줄들, 곳, 면); return c === null ? [] : [c]; });
  return 격자짓기(객체(맵.걷기).값, 객체(맵.막힘).값, 칠들, 면, [...맵점들(맵, 면), ...덧], 쓸훑기);
}

const 점읽기 = (글: string): 점 | null => {
  const 조각 = 글.split(',');
  const 수 = 조각.map((x) => (x.trim() === '' ? NaN : Number(x)));
  return 조각.length === 2 && 수.every(수인가) ? [수[0]!, 수[1]!] : null;
};

const 쓰는법 = '쓰는 법: npx tsx scripts/authoring-game-path.ts <자료 폴더> <곳 열쇠> <가로,세로> <가로,세로> — 3D 게임은 x,z · 2D 게임은 x,y';

/** 명령 입출력 — 0 길을 찍었다 · 1 길이 없다 · 2 인자나 지도가 틀렸다 */
export function 실행(인자: string[]): number {
  const [자료, 곳, a, b, ...남은] = 인자;
  const 출발 = a === undefined ? null : 점읽기(a);
  const 도착 = b === undefined ? null : 점읽기(b);
  if (자료 === undefined || 곳 === undefined || 출발 === null || 도착 === null || 남은.length > 0) {
    console.error(`[길찾기] 인자가 틀렸다 — 출발 · 도착은 바닥 평면의 게임 좌표 두 수다\n${쓰는법}`);
    return 2;
  }
  const g = 곳격자(자료, 곳, [출발, 도착]);
  if (typeof g === 'string') {
    console.error(`[길찾기] ${g}`);
    return 2;
  }
  const r = 길내기(g, 출발, 도착);
  if ('틀림' in r) {
    console.error(`[길찾기] ${r.틀림}`);
    return 1;
  }
  console.log(`${JSON.stringify(r.점들)}\n${r.요약}`);
  return 0;
}

if (process.argv[1] !== undefined && /authoring-game-path\.[tj]s$/.test(process.argv[1])) process.exit(실행(process.argv.slice(2)));
