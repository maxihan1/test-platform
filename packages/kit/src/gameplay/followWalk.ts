// 길 따라 걷기 — 조작 도우미가 시뮬과 같은 격자 길찾기로 거쳐 갈 점을 받아 판 함수 걷기를 점마다 부른다 (도메인/게임 §3.10 「순서대로 하기」)
// 2026-11-29 사용자 — 판 함수 걷기는 미리 못 받은 자리(지킬것 둘레 · 바닥 재화 · 칠 자리)로 곧게 가다 물에 막혔다(16110 셋째 맵 이동 0/8). 시뮬은 같은 격자 길로 걷는 시간을 센다
import type { 점 } from './simInput.js';

/** 두 점 사이 거쳐 갈 점 — 첫 점은 출발이다. 길이 없으면 null(그때는 곧게 간다) */
export type 길내기 = (a: 점, b: 점) => readonly 점[] | null;

/**
 * 목표까지 걷는다 — 길이 있으면 거쳐 갈 점마다(출발은 빼고 마지막은 목표 자리 그대로), 없으면 곧게 한 번.
 * 못 닿은 점은 못감으로 넘기고 멈춘다(길찾기 격자가 다음부터 그 칸을 피한다)
 */
export async function 길따라걷기(걷기: (p: 점) => Promise<boolean>, 길: 길내기 | undefined, 지금: 점, 목표: 점, 못감: (p: 점) => void): Promise<boolean> {
  const 점들 = 길?.(지금, 목표)?.slice(1) ?? [];
  for (const p of [...점들.slice(0, -1), 목표]) {
    if (await 걷기(p)) continue;
    못감(p);
    return false;
  }
  return true;
}
