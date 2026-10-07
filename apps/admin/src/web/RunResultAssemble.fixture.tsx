// 결과 화면 조립 검사들이 나눠 쓰는 도우미 — 항목 · 카드 · 견줌 자료와 화면 열기

import { vi } from 'vitest';
import { render } from '@testing-library/react';

import {
  api,
  type EvidenceRow,
  type FailureCase,
  type ItemStatus,
  type Platform,
  type RunInsights as 비교값,
  type RunItemSummary,
} from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행, 실행까지 } from './RunResult.fixture.js';

export function 항목줄(historyId: number, tcId: string, platform: Platform, status: ItemStatus, 미확정?: string): RunItemSummary {
  return {
    historyId, tcId, tcName: `이름-${tcId}`, platform, attempt: 1, params: {}, paramSchema: {},
    status, durationMs: 1200, error: null, startedAt: '2026-09-15T17:13:00.000Z',
    finishedAt: '2026-09-15T17:14:00.000Z', unconfirmed: 미확정 ?? null,
  };
}

export function 카드응답(tcId: string, platform: Platform = 'desktop'): FailureCase {
  return {
    tcId,
    tcName: `이름-${tcId}`,
    devices: [{
      platform, change: null, streak: null, recent: ['FAIL'], attempts: 1, failedAttempts: 1,
      item: {
        historyId: 900, runId: RUN_ID, runTitle: '결제 회귀', tcId, tcName: `이름-${tcId}`, platform, attempt: 1,
        params: {}, paramSchema: {}, status: 'FAIL', durationMs: 1000, error: null,
        startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:14:00.000Z',
        precondition: [], expected: {}, expectedSchema: {}, steps: [],
      },
    }],
  };
}

export function 끝난실행(items: RunItemSummary[], 증적들: EvidenceRow[] = []) {
  const 확정 = items.filter((i) => typeof i.unconfirmed !== 'string');
  const 미 = items.filter((i) => typeof i.unconfirmed === 'string');
  const 셈 = (목록: RunItemSummary[], s: ItemStatus) => 목록.filter((i) => i.status === s).length;
  return {
    ...실행,
    kind: 'FN' as const,
    status: 'FINISHED',
    counts: {
      total: items.length, pass: 셈(확정, 'PASS'), fail: 셈(확정, 'FAIL'), na: 셈(확정, 'NA'), running: 0,
      unconfirmed: { total: 미.length, pass: 셈(미, 'PASS'), fail: 셈(미, 'FAIL'), na: 셈(미, 'NA') },
    },
    items,
    evidence: 증적들,
  };
}

export const 첫실행: 비교값 = { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [], 실패덩어리들: [] };
export const 견줌: 비교값 = {
  previous: { runId: 2110, startedAt: '2026-09-14T10:00:00.000Z' },
  주소바뀜: false,
  빠진건수: 0,
  케이스들: [
    { tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'desktop', 판정: '새로깨짐' },
    { tcId: 'ZRR-009', tcName: '이름-ZRR-009', platform: 'mobile', 판정: '고쳐짐' },
  ],
  실패덩어리들: [{
    대표문장: '가입 완료 안내가 안 보인다',
    건수: 2,
    항목들: [
      { historyId: 1, tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'desktop' },
      { historyId: 2, tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'mobile' },
    ],
  }],
};

export const 앞선가 = (앞: Element | null, 뒤: Element | null) =>
  앞 !== null && 뒤 !== null && (앞.compareDocumentPosition(뒤) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

export const 판정칸 = (이름: string) =>
  [...document.querySelectorAll('.rs-fbtn')].find((b) => b.textContent?.startsWith(이름)) as HTMLElement;

export const 섞인항목 = [
  항목줄(1, 'ZRR-001', 'desktop', 'FAIL'),
  항목줄(2, 'ZRR-001', 'mobile', 'PASS'),
  항목줄(3, 'ZRR-002', 'desktop', 'PASS'),
  항목줄(4, 'ZRR-003', 'desktop', 'NA'),
  항목줄(5, 'ZRR-004', 'desktop', 'PASS', '기획서에 값이 없습니다'),
  항목줄(6, 'ZRR-005', 'desktop', 'FAIL'),
  항목줄(7, 'ZRR-005', 'mobile', 'FAIL', '기획서에 값이 없습니다'),
];

export function 연다(items: RunItemSummary[], 인사이트: 비교값 = 첫실행, 상자안 = false, 증적들: EvidenceRow[] = []) {
  vi.spyOn(api, 'run').mockResolvedValue(끝난실행(items, 증적들));
  vi.spyOn(api, 'insights').mockResolvedValue(인사이트);
  const 실패부름 = vi.spyOn(api, 'failures').mockResolvedValue({
    items: [카드응답('ZRR-001'), 카드응답('ZRR-005')], total: 2, page: 1, pageSize: 5,
  });
  render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안={상자안} />);
  return 실패부름;
}
