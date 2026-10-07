// 실행 결과 화면 검사들이 나눠 쓰는 도우미 — 실행 · 증적 자료와 화면 그리기

import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { api, type EvidenceRow, type RunSummary } from './api.js';
import { RunResult } from './RunResult.js';
import { type 판정 } from './role.js';

// 옛 등급 셋의 판정을 그대로 옮긴 것 — 운영은 전부, 실행까지는 머지·설정 빼고, 보기만은 받기뿐
export const 실행까지: 판정 = (무엇) => 무엇 !== '작성머지' && 무엇 !== '설정';

export const RUN_ID = 2111;

export const 실행: RunSummary = {
  runId: RUN_ID,
  title: '결제 회귀',
  triggeredBy: 'kim',
  triggeredByName: '김철수',
  env: 'qa',
  baseUrl: 'https://qa-pay.example.com',
  serviceName: '결제',
  status: 'FINISHED',
  startedAt: '2026-09-15T17:13:00.000Z',
  finishedAt: '2026-09-15T17:25:00.000Z',
  counts: { total: 3, pass: 2, fail: 1, na: 0, running: 0 },
};

export function 증적(format: string, status: string, error: string | null = null): EvidenceRow {
  return {
    id: 9,
    format,
    status,
    filePath: status === 'READY' ? `artifacts/evidence/9.${format.toLowerCase()}` : null,
    error,
    generatedAt: '2026-09-15T17:22:00.000Z',
  };
}

export function 그리기(status: string, 문서들: EvidenceRow[] = []) {
  vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status, items: [], evidence: 문서들 });
  return render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
}

export type Run상세 = Awaited<ReturnType<typeof api.run>>;

export const 도는중응답: Run상세 = {
  ...실행,
  status: 'RUNNING',
  finishedAt: null,
  counts: { total: 3, pass: 1, fail: 0, na: 0, running: 2 },
  items: [],
  evidence: [],
};

export const 끝난응답: Run상세 = { ...실행, items: [], evidence: [] };

export function 상자라벨(): string | null {
  return screen.getByRole('dialog').getAttribute('aria-label');
}
