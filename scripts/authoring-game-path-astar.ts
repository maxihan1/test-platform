// 격자 길찾기의 A* — 여덟 방향 · 대각선은 양옆 두 칸이 다 열렸을 때만 · 걸음됨 비용 1 · 모름 2 (authoring-game-path.ts 가 300줄을 넘어 떼어 냈다)
// 칸 값 · 칸 번호도 여기 둔다 — authoring-game-path.ts 가 이 파일을 import 하므로 거꾸로는 type 만 가져와 순환 import 를 만들지 않는다
import type { 격자 } from './authoring-game-path.js';

export const 모름 = 0;
export const 걸음됨 = 1;
export const 막힘 = 2;

export const 칸번호 = (g: 격자, i: number, j: number): number => (j - g.최소j) * g.너비 + (i - g.최소i);
export const 안인가 = (g: 격자, i: number, j: number): boolean => i >= g.최소i && j >= g.최소j && i < g.최소i + g.너비 && j < g.최소j + g.높이;

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
