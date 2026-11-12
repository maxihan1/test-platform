// 오류 종류마다 이번 실행의 상태(신규 · 재발 · 증가 · 기존)와 해결 확인 판정 (도메인/안정화 §3.15 「상태」)

export type 상태 = 'NEW' | 'REOPENED' | 'UP' | 'ONGOING';

export interface 종류기록 {
  resolvedAt: Date | null;
  confirmedRunId: number | null;
}

/**
 * 이번 실행에 남은 종류의 상태 — 표 차례대로 처음 맞는 것 하나.
 * `기록` 이 null 이면 처음 보는 지문이다. `이전케이스` 는 바로 앞 집계(같은 대상 서버)의 발생 케이스, 거기 안 남았거나 앞 집계가 없으면 null.
 * 실행이 도는 중에 누른 해결 처리는 그 실행이 고친 코드를 지났는지 몰라 재발로 걷지 않는다
 */
export function 상태정하기(기록: 종류기록 | null, 이번케이스: number, 이전케이스: number | null, 실행시작: Date): 상태 {
  if (기록 === null) return 'NEW';
  if (기록.resolvedAt !== null && 기록.resolvedAt < 실행시작) return 'REOPENED';
  if (이전케이스 !== null && 이번케이스 > 이전케이스) return 'UP';
  return 'ONGOING';
}

/** 이번 실행에 안 남은 종류 중 해결 처리 뒤에 시작한 실행이 처음 확인하는 것 */
export const 해결확인인가 = (기록: 종류기록, 실행시작: Date): boolean =>
  기록.resolvedAt !== null && 기록.resolvedAt < 실행시작 && 기록.confirmedRunId === null;
