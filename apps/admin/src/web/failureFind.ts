// 실패 카드를 케이스 번호로 찾는다 — 항목 상세의 판정 줄과 대시보드의 실패 서랍이 쓴다 (도메인/리포팅 §7 `GET /api/runs/:runId/failures`)

import { api, type FailureCase, type Platform } from './api.js';

/** 통로가 그 케이스의 카드만 준다(`?tc=`). 없으면 null. 이전 버전은 케이스 조건이 없어 쪽을 넘기며 찾았다 (2026-11-24 TP-F3-16) */
export async function 카드찾기(runId: number, tcId: string, platform?: Platform): Promise<FailureCase | null> {
  const 응답 = await api.failures(runId, 1, platform, false, tcId);
  return 응답.items.find((c) => c.tcId === tcId) ?? null;
}
