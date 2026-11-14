// @vitest-environment jsdom
// 실행 결과 화면의 QA 리포트 고리 검사 (도메인/리포팅 §8.21 「다른 화면의 고리」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { ApiError } from './api.js';
import { qaReportApi, type 리포트응답 } from './qaReportApi.js';
import { use실행리포트, 리포트띠, 리포트열기 } from './RunQaReport.js';

const 요약 = {
  overview: { serviceName: '데모마켓 웹', runs: 4, running: 0 },
  results: {
    functional: [
      { kind: 'FN', result: { pass: 45, fail: 3, notRun: 1, unconfirmed: 2 } },
      { kind: 'UI', result: null },
      { kind: 'E2E', result: { pass: 5, fail: 1, notRun: 0, unconfirmed: 0 } },
    ],
    nonFunctional: [
      { kind: 'COMPAT', quality: 'COMPATIBILITY', result: { devices: 12, screens: 9, suspect: 2 } },
      { kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: { runs: 2, pass: 4, fail: 1 } },
      {
        kind: 'STAB',
        quality: 'RELIABILITY',
        result: { day: '2026-11-14', days: 1, passErrorCases: 3, cases: 120, sources: [{ source: 'WEB_CONSOLE', cases: 2 }], residual: 4, newErrors: 1, reopened: 0, confirmed: 2 },
      },
    ],
  },
} as unknown as 리포트응답['summary'];

const 리포트 = (덮: Partial<리포트응답> = {}): 리포트응답 =>
  ({ id: 31, service: 'DMW', env: 'qa', buildNo: '124', runId: null, perfRunId: null, version: 1, versions: [], summary: 요약, ai: null, runIds: [812], perfRunIds: [], performers: [], approval: null, updatedAt: '2026-11-14T01:45:00Z', ...덮 }) as 리포트응답;

function 화면({ runId, 끝났나 }: { runId: number; 끝났나: boolean }) {
  const r = use실행리포트(runId, 끝났나);
  return (
    <>
      <리포트열기 리포트={r} />
      <리포트띠 리포트={r} />
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실행 결과 화면의 QA 리포트 고리', () => {
  it('띠는 리포트 첫 장 결과 요약과 같은 글을 기능 검증 · 비기능 검증 두 줄로 싣는다. 안정화는 대표 숫자 줄만', () => {
    render(<리포트띠 리포트={리포트()} />);
    const 띠 = screen.getByRole('region', { name: 'QA 리포트 결과 요약' });
    expect(띠.textContent).toContain('빌드 124 QA 리포트');
    expect(띠.textContent).toContain('승인 전');
    expect(띠.textContent).toContain('실행 4개 · 버전 1');
    expect(띠.textContent).toContain('기능 통과 45 · 실패 3 · 미실행 1 (그중 미확정 2건)');
    expect(띠.textContent).toContain('UI 이번 빌드에 실행 없음');
    expect(띠.textContent).toContain('호환성 디바이스 12대 · 화면 9개 · UI 결함 의심 2곳');
    expect(띠.textContent).toContain('성능 성능 목표 통과 4 · 미달 1 (실행 2회)');
    expect(띠.textContent).toContain('안정화 판정은 통과했지만 오류가 난 케이스 3건 / 기록이 있는 케이스 120건');
    expect(띠.textContent).not.toContain('잔여 오류');
  });

  it('끝난 실행이 든 리포트가 있으면 「QA 리포트 열기」가 그 리포트로 간다', async () => {
    const 찾기 = vi.spyOn(qaReportApi, 'ofRun').mockResolvedValue({ id: 31 });
    vi.spyOn(qaReportApi, 'get').mockResolvedValue(리포트());
    render(<화면 runId={812} 끝났나 />);
    expect((await screen.findByRole('link', { name: 'QA 리포트 열기' })).getAttribute('href')).toBe('#/qa-reports/31');
    expect(찾기).toHaveBeenCalledWith(812);
  });

  it('도는 실행은 묻지 않고, 어느 리포트에도 안 든 실행(404)은 버튼도 띠도 없다', async () => {
    const 찾기 = vi.spyOn(qaReportApi, 'ofRun').mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'NOT_FOUND'));
    const 로그 = vi.spyOn(console, 'error');
    render(<화면 runId={812} 끝났나={false} />);
    expect(찾기).not.toHaveBeenCalled();
    cleanup();

    render(<화면 runId={812} 끝났나 />);
    await waitFor(() => expect(찾기).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: 'QA 리포트 열기' })).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(로그).not.toHaveBeenCalled();
  });
});
