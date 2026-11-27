// 게임 맵 격자 길찾기 — 지도의 걷기 · 막힘과 판 기록의 걸은 칸 · 못감으로 곳마다 격자를 칠하고 거쳐 갈 점을 낸다 (도메인/게임 §3.10 「맵 파악」)
// 쓰는 법: npx tsx scripts/authoring-game-path.ts <자료 폴더> <곳 열쇠> <가로,세로> <가로,세로>(3D 는 x,z · 2D 는 x,y) — 거쳐 갈 점 JSON 한 줄([[x,z],…])과 요약 한 줄을 찍는다. 길이 없으면 1, 인자 · 지도가 틀리면 2
// 판 함수는 이 점들을 인자로 받아 따라가기만 한다. 격자는 저장하지 않고 부를 때마다 새로 지어, 새 못감과 새로 걸은 칸이 다음 부름부터 저절로 들어간다
import { 지금지도 } from './authoring-game-find.js';
import { type 판기록, 판기록들 } from './authoring-learn-check.js';
import { 계획곳, 곳줄들 } from './authoring-learn-play.js';

/** 격자 한 칸의 한 변(게임 좌표 단위) — 곳마다 같다 */
export const 칸크기 = 1;
/** 격자가 이만큼 넘게 커지면 안 짓는다 — 걷기 값이 단위가 다른 좌표를 담았을 때 메모리를 다 쓰지 않게 */
export const 격자상한 = 4_000_000;

export type 점 = readonly [number, number];
export const 모름 = 0;
export const 걸음됨 = 1;
export const 막힘 = 2;

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

export interface 막힘읽은것 { 사각형: Array<[점, 점]>; 점: 점[]; 모름: number }
/**
 * 막힘 값 — 점이면 그 칸, 점 둘짜리 배열이면 축에 나란한 사각형(비스듬한 벽은 점 여럿으로 적는다), 목록 · 종류별로 묶은 객체는 안으로 들어가 읽는다.
 * 좌표가 아닌 수 · 객체는 건너뛰고 몇 개인지 센다. 글은 이름표라 안 센다
 */
export function 막힘읽기(v: unknown, 면: 평면 = 'xz'): 막힘읽은것 {
  const r: 막힘읽은것 = { 사각형: [], 점: [], 모름: 0 };
  // 크기 · 반지름을 단 객체는 점이 아니다 — 점으로 읽으면 큰 장애물이 한 칸만 막혀 길이 그것을 뚫는다
  const 맨좌표 = (x: unknown): boolean => Array.isArray(x) || Object.keys(객체(x)).every((k) => k === 'x' || k === 'y' || k === 'z');
  const 읽기 = (x: unknown): void => {
    const 한점 = 맨좌표(x) ? 좌표읽기(x, 면) : null;
    if (한점 !== null) return void r.점.push(한점);
    if (Array.isArray(x) && x.length === 2) {
      const [a, b] = [좌표읽기(x[0], 면), 좌표읽기(x[1], 면)];
      if (a !== null && b !== null) return void r.사각형.push([a, b]);
    }
    if (Array.isArray(x)) return x.forEach(읽기);
    if (typeof x === 'string') return;
    const o = 객체(x);
    if (Object.keys(o).length > 0 && Object.values(o).some((y) => typeof y === 'object' && y !== null)) return Object.values(o).forEach(읽기);
    r.모름 += 1;
  };
  if (v !== undefined) 읽기(v);
  return r;
}

export interface 격자 { 최소i: number; 최소j: number; 너비: number; 높이: number; 칸: Uint8Array; 건너뜀: number }
/** 한 판 기록이 칠하는 것 — 걸은 칸(2초 위치)과 판 함수가 못 갔다고 돌려준 점 */
export interface 칠 { 걸음: 점[]; 못감: 점[] }

/** 사각형이 겹치는 칸 범위 — 넓이가 없으면 그 점의 칸 하나. 정수 경계에 걸친 끝 칸은 막지 않는다 */
const 범위 = (a: number, b: number): [number, number] => {
  const lo = Math.floor(Math.min(a, b) / 칸크기);
  return [lo, Math.max(lo, Math.ceil(Math.max(a, b) / 칸크기) - 1)];
};
const 칸번호 = (g: 격자, i: number, j: number): number => (j - g.최소j) * g.너비 + (i - g.최소i);
const 안인가 = (g: 격자, i: number, j: number): boolean => i >= g.최소i && j >= g.최소j && i < g.최소i + g.너비 && j < g.최소j + g.높이;

/** 격자를 짓는다 — 걷기 점들을 감싼 사각형 안은 모름, 밖은 막힘. 지도 막힘 → 판 기록 차례로 칠하고 걸음됨은 막힘을 덮는다. 기록 차례가 시간 차례다 */
export function 격자짓기(걷기값: unknown, 막힘값: unknown, 칠들: readonly 칠[], 면: 평면 = 'xz'): 격자 | string {
  const 바닥 = 점들모으기(걷기값, 면);
  if (바닥.length === 0) return '걷기.값 에서 좌표를 못 읽었다';
  // 걷기 점이 든 칸은 모두 넣는다 — 가장 큰 좌표가 정수면 그 칸이 빠져 걷기 점 · 걸은 위치가 범위 밖 막힘이 됐다
  const 칸범위 = (수들: number[]): [number, number] => [Math.floor(Math.min(...수들) / 칸크기), Math.floor(Math.max(...수들) / 칸크기)];
  const [i0, i1] = 칸범위(바닥.map((p) => p[0]));
  const [j0, j1] = 칸범위(바닥.map((p) => p[1]));
  const 너비 = i1 - i0 + 1;
  const 높이 = j1 - j0 + 1;
  if (너비 * 높이 > 격자상한) return `걷기 범위가 칸 ${너비}×${높이} 로 너무 크다 — 걷기.값 이 게임 좌표가 맞는지 본다`;
  const g: 격자 = { 최소i: i0, 최소j: j0, 너비, 높이, 칸: new Uint8Array(너비 * 높이), 건너뜀: 0 };
  const 칠하기 = (i: number, j: number, 값: number): void => {
    if (안인가(g, i, j)) g.칸[칸번호(g, i, j)] = 값;
  };
  const 막힘들 = 막힘읽기(막힘값, 면);
  g.건너뜀 = 막힘들.모름;
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

/** 판 기록 하나가 그 곳을 적은 계획으로 한 것이면 칠할 것, 아니면 null. 못감은 판 함수가 돌려준 값의 `못감: [[x,z],…]` */
export function 기록칠(r: 판기록, 줄들: Parameters<typeof 계획곳>[0], 곳: string, 면: 평면 = 'xz'): 칠 | null {
  if (r.값기록 === undefined || 계획곳(줄들, r.값기록.계획) !== 곳) return null;
  // 옛 기록 · 덜 쓴 기록은 때가 없을 수 있다
  const 때들 = Array.isArray(r.값기록.때) ? r.값기록.때 : [];
  const 걸음 = 때들.flatMap((때) => { const q = 때.위치 == null ? null : 좌표읽기(때.위치, 면); return q === null ? [] : [q]; });
  const 못 = 객체(r.값).못감;
  return { 걸음, 못감: Array.isArray(못) ? 못.flatMap((p) => { const q = 좌표읽기(p, 면); return q === null ? [] : [q]; }) : [] };
}

export const 칸수 = (g: 격자): { 전체: number; 걸음됨: number; 막힘: number; 모름: number } => {
  const 센 = [0, 0, 0];
  for (const v of g.칸) 센[v]! += 1;
  return { 전체: g.칸.length, 걸음됨: 센[걸음됨]!, 막힘: 센[막힘]!, 모름: 센[모름]! };
};

const 가운데 = (i: number, j: number): 점 => [(i + 0.5) * 칸크기, (j + 0.5) * 칸크기];

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

const 방향: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** A* — 여덟 방향, 대각선은 양옆 두 칸이 다 안 막혔을 때만(모서리를 안 자른다). 걸음됨 비용 1 · 모름 2 · 대각선 ×√2. 길 없으면 null */
export function 길찾기(g: 격자, 시작: { i: number; j: number }, 끝: { i: number; j: number }): Array<{ i: number; j: number }> | null {
  const n = g.칸.length;
  const 값 = new Float64Array(n).fill(Infinity);
  const 앞 = new Int32Array(n).fill(-1);
  const 닫힘 = new Uint8Array(n);
  const s = 칸번호(g, 시작.i, 시작.j);
  const e = 칸번호(g, 끝.i, 끝.j);
  // 칸 비용이 가장 싼 1 이라 옥타일 거리가 넘보지 않는다
  const h = (i: number, j: number): number => {
    const dx = Math.abs(i - 끝.i);
    const dy = Math.abs(j - 끝.j);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  const 힙: Array<[number, number]> = [];
  const 넣기 = (f: number, k: number): void => {
    힙.push([f, k]);
    for (let c = 힙.length - 1; c > 0;) {
      const p = (c - 1) >> 1;
      if (힙[p]![0] <= 힙[c]![0]) break;
      [힙[p], 힙[c]] = [힙[c]!, 힙[p]!];
      c = p;
    }
  };
  const 빼기 = (): number => {
    const 위 = 힙[0]![1];
    const 끝값 = 힙.pop()!;
    if (힙.length > 0) {
      힙[0] = 끝값;
      for (let c = 0; ;) {
        let m = c;
        for (const k of [2 * c + 1, 2 * c + 2]) if (k < 힙.length && 힙[k]![0] < 힙[m]![0]) m = k;
        if (m === c) break;
        [힙[m], 힙[c]] = [힙[c]!, 힙[m]!];
        c = m;
      }
    }
    return 위;
  };
  값[s] = 0;
  넣기(h(시작.i, 시작.j), s);
  while (힙.length > 0) {
    const k = 빼기();
    if (닫힘[k] === 1) continue;
    닫힘[k] = 1;
    if (k === e) break;
    const i = g.최소i + (k % g.너비);
    const j = g.최소j + Math.floor(k / g.너비);
    for (const [di, dj] of 방향) {
      const ni = i + di;
      const nj = j + dj;
      if (!안인가(g, ni, nj) || g.칸[칸번호(g, ni, nj)] === 막힘) continue;
      if (di !== 0 && dj !== 0 && (g.칸[칸번호(g, i + di, j)] === 막힘 || g.칸[칸번호(g, i, j + dj)] === 막힘)) continue;
      const nk = 칸번호(g, ni, nj);
      const 값새 = 값[k]! + (g.칸[nk] === 걸음됨 ? 1 : 2) * (di !== 0 && dj !== 0 ? Math.SQRT2 : 1);
      if (값새 < 값[nk]!) {
        값[nk] = 값새;
        앞[nk] = k;
        넣기(값새 + h(ni, nj), nk);
      }
    }
  }
  if (닫힘[e] !== 1) return null;
  const 길: Array<{ i: number; j: number }> = [];
  for (let k = e; k !== -1; k = 앞[k]!) 길.push({ i: g.최소i + (k % g.너비), j: g.최소j + Math.floor(k / g.너비) });
  return 길.reverse();
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

export type 길결과 = { 점들: 점[]; 요약: string } | { 틀림: string; 길없음?: true };

/** 격자 위에서 출발 → 도착 거쳐 갈 점과 요약 한 줄 */
export function 길내기(g: 격자, 출발: 점, 도착: 점): 길결과 {
  const 시작 = 열린칸(g, 출발);
  const 끝 = 열린칸(g, 도착);
  if (시작 === null || 끝 === null) return { 틀림: '열린 칸이 하나도 없다', 길없음: true };
  const 길 = 길찾기(g, 시작, 끝);
  const 센 = 칸수(g);
  const 옮김 = [...(시작.옮김 ? [`출발이 막혀 칸 ${시작.i},${시작.j} 로 옮김`] : []), ...(끝.옮김 ? [`도착이 막혀 칸 ${끝.i},${끝.j} 로 옮김`] : [])];
  const 덧 = [...옮김, ...(g.건너뜀 > 0 ? [`형태를 모르는 막힘 ${g.건너뜀}개 건너뜀`] : [])];
  const 글 = `칸 ${센.전체} · 걸음됨 ${센.걸음됨} · 막힘 ${센.막힘} · 모름 ${센.모름}`;
  if (길 === null) return { 틀림: `${글} · 길 없음 — 출발과 도착 사이가 막혀 있다${덧.length === 0 ? '' : ` · ${덧.join(' · ')}`}`, 길없음: true };
  const 점들 = 꺾임점(길);
  // 끝 점은 칸 가운데 대신 실제 출발 · 도착 — 가운데로 두면 반 칸 뒤로 갔다가 출발한다. 막혀 옮겼으면 옮긴 칸 가운데
  if (!시작.옮김) 점들[0] = 출발;
  if (!끝.옮김) 점들[점들.length - 1] = 도착;
  return { 점들, 요약: `${글} · 길 길이 ${(Math.round(길이(점들) * 100) / 100).toString()}${덧.length === 0 ? '' : ` · ${덧.join(' · ')}`}` };
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
  const 지도 = 지금지도(자료);
  if (지도 === null) {
    console.error('[길찾기] 게임 지도를 못 읽었다 — 자료 폴더가 맞는지 본다');
    return 2;
  }
  const 줄 = 곳줄들(지도.줄들).find((x) => x.key === 곳);
  const 맵 = 객체(객체(줄?.learned?.data).맵);
  if (줄 === undefined || 객체(맵.걷기).값 === undefined) {
    console.error(`[길찾기] ${곳} 는 data.맵.걷기.값 이 있는 STAGE 줄이 아니다 — 먼저 맵을 적는다`);
    return 2;
  }
  const 면 = 평면정하기(맵);
  const 칠들 = 판기록들(자료).flatMap((r) => { const c = 기록칠(r, 지도.줄들, 곳, 면); return c === null ? [] : [c]; });
  const g = 격자짓기(객체(맵.걷기).값, 객체(맵.막힘).값, 칠들, 면);
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
