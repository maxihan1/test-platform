// 실패 카드를 케이스 번호로 찾는다 — 항목 상세의 판정 줄과 대시보드에서 들어온 「열 카드」가 쓴다 (도메인/리포팅 §7 `GET /api/runs/:runId/failures`)

import { api, type FailureCase, type Platform } from './api.js';

/**
 * 카드 통로에 케이스 조건이 없어 쪽을 넘기며 찾는다. 없으면 null.
 * ponytail: 실패가 수백 건이면 요청이 쪽 수만큼 늘어난다. 느려지면 통로에 tcId 조건을 연다
 */
export async function 카드찾기(runId: number, tcId: string, platform?: Platform): Promise<{ 쪽: number; 카드: FailureCase } | null> {
  for (let 쪽 = 1; ; 쪽 += 1) {
    const 응답 = await api.failures(runId, 쪽, platform);
    const 카드 = 응답.items.find((c) => c.tcId === tcId);
    if (카드 !== undefined) return { 쪽, 카드 };
    if (쪽 * 응답.pageSize >= 응답.total) return null;
  }
}
