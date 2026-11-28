// 시뮬레이션 엔진의 길 계산 — 두 점 거리 · 길이 원 안을 지나는 길이 · 누적 길이 · 길 위 자리 (sim.ts 가 300줄을 넘어 떼어 냈다)
import type { 점 } from './simInput.js';

export interface 원 { 중심: 점; 반지름: number }
export const 거리 = (a: 점, b: 점): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** 길(꺾은선)이 원 안을 지나는 길이 — 선분마다 원과 만나는 구간만 센다 */
export function 원안길이(길: readonly 점[], 원: 원): number {
  let 합 = 0;
  for (let i = 0; i + 1 < 길.length; i += 1) {
    const [ax, ay] = 길[i]!;
    const [bx, by] = 길[i + 1]!;
    const [dx, dy, fx, fy] = [bx - ax, by - ay, ax - 원.중심[0], ay - 원.중심[1]];
    const a = dx * dx + dy * dy;
    if (a === 0) continue;
    const b = 2 * (fx * dx + fy * dy);
    const 판별 = b * b - 4 * a * (fx * fx + fy * fy - 원.반지름 ** 2);
    if (판별 <= 0) continue;
    const 근 = Math.sqrt(판별);
    const t1 = Math.max(0, (-b - 근) / (2 * a));
    const t2 = Math.min(1, (-b + 근) / (2 * a));
    if (t2 > t1) 합 += (t2 - t1) * Math.sqrt(a);
  }
  return 합;
}

export const 누적길이 = (길: readonly 점[]): number[] => 길.reduce<number[]>((a, p, i) => [...a, i === 0 ? 0 : a[i - 1]! + 거리(길[i - 1]!, p)], []);

/** 길 위에서 진행만큼 간 자리 */
export function 길위자리(길: readonly 점[], 누적: readonly number[], 진행: number): 점 {
  let i = 1;
  while (i < 누적.length - 1 && 누적[i]! < 진행) i += 1;
  const [a, b] = [길[i - 1]!, 길[i]!];
  const 구간 = 누적[i]! - 누적[i - 1]!;
  const t = 구간 === 0 ? 0 : Math.min(1, (진행 - 누적[i - 1]!) / 구간);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
