// 노트 고치기 줄(서비스 칸이 빈 작성 요청)을 그 프로젝트 애플리케이션 중 하나로 고른다 — 문(gate.ts)이 배정과 맞춰 볼 접두사 하나가 있어야 해서다
// scope.ts 가 300줄을 넘어 뗐다 (2026-10-31)

import { 칸되는서비스, type 서비스권한 } from './permissions.js';

/** 노트 고치기 줄을 그 프로젝트 애플리케이션 중 하나로 고를 때 보는 배정 — 문을 지나는 사람의 것 */
export type 고를배정 = readonly { prefix: string; permissions: 서비스권한 }[];

/**
 * 노트 고치기 줄은 애플리케이션이 아니라 프로젝트의 일이다. 그 프로젝트 애플리케이션 중 (작성, write) 인 곳 → 배정된 곳 → 첫 곳 차례로 하나를 고른다.
 * 그 프로젝트 어느 애플리케이션의 (작성, write) 면 통과하고, 남의 프로젝트 계정은 고른 곳이 배정 밖이라 막힌다 (도메인/BTS §7 「작성 에이전트 통로」)
 */
export function 프로젝트에서고르기(접두사들: string[], 배정: 고를배정): string | undefined {
  const 쓰기 = new Set(칸되는서비스(배정, 'authoring', 'write'));
  const 배정됨 = new Set(배정.map((s) => s.prefix));
  return 접두사들.find((p) => 쓰기.has(p)) ?? 접두사들.find((p) => 배정됨.has(p)) ?? 접두사들[0];
}
