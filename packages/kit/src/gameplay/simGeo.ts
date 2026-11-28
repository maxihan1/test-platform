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

/**
 * 공격 · 아이템이 칠 적 — 길 끝에 가장 가까운 것(남은 길이 짧은 것)부터, 사거리 0.9 만큼 떨어진 칠 자리에 걸어서 갈 수 있는 첫 적. 사거리 안이면 그 자리에서 친다.
 * 시뮬과 순서대로 하기가 같이 쓴다 — 2026-11-28 16108 첫 맵은 게임만 지킬것에 가장 가까운 적을 갈 수 있는지 안 보고 골라 물 건너 한 점을 40~50초 쳤다
 */
export function 칠적<T extends { 자리: 점; 남은: number }>(적: readonly T[], 캐자리: 점, 사거리: number, 갈수: (p: 점) => boolean): { 적: T; 설자리: 점 } | null {
  const 설곳 = (e: 점): 점 => {
    const d = 거리(캐자리, e);
    return d <= 사거리 ? 캐자리 : [e[0] + ((캐자리[0] - e[0]) * 사거리 * 0.9) / d, e[1] + ((캐자리[1] - e[1]) * 사거리 * 0.9) / d];
  };
  for (const e of [...적].sort((a, b) => a.남은 - b.남은)) if (갈수(설곳(e.자리))) return { 적: e, 설자리: 설곳(e.자리) };
  return null;
}

/** 지킬것을 지키러 설 때 지킬것에서 떨어지는 거리 — 한가운데는 못 선다(16108 세계수 줄기 둘레 0.6 안에 못 서 이동이 두 번 못 닿았다) */
export const 지킬것서는거리 = 1.5;
/** 지킬것을 지키러 설 자리 — 지킬것에서 캐릭터 쪽으로 지킬것서는거리. 이미 그 안이면 null(지키고 있다) */
export function 지킬자리(지킬것: 점, 캐자리: 점): 점 | null {
  const d = 거리(지킬것, 캐자리);
  if (d <= 지킬것서는거리 + 0.5) return null;
  return [지킬것[0] + ((캐자리[0] - 지킬것[0]) * 지킬것서는거리) / d, 지킬것[1] + ((캐자리[1] - 지킬것[1]) * 지킬것서는거리) / d];
}
