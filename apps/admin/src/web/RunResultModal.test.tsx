// @vitest-environment jsdom
// 실행 결과 상자 검사 (SPEC §8.7, 2026-09-22 ②) — 「화면으로 열기」가 없고, 상자가 넓게(880px) 뜨는가

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type RunSummary } from './api.js';
import { RunResultModal } from './RunResultModal.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const RUN_ID = 4821;

const 실행: RunSummary = {
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
  counts: { total: 1, pass: 1, fail: 0, na: 0, running: 0 },
};

function 그리기() {
  vi.spyOn(api, 'run').mockResolvedValue({ ...실행, items: [], evidence: [] });
  return render(<RunResultModal runId={RUN_ID} role="operator" onClose={() => {}} />);
}

describe('실행 결과 상자 (2026-09-22 ②)', () => {
  it('넓게(880px) 뜬다 — 표가 들어가는 ②의 상자다 (DESIGN.md)', async () => {
    그리기();
    await screen.findByRole('dialog');

    expect(document.querySelector('.modal.wide')).not.toBeNull();
  });

  it('「화면으로 열기」가 없다 — 상자 하나로 끝난다', async () => {
    그리기();
    await screen.findByRole('dialog');

    expect(screen.queryByText('화면으로 열기')).toBeNull();
  });

  it('닫기 버튼은 그대로 있다', async () => {
    그리기();
    await screen.findByRole('dialog');

    expect(screen.getByText('닫기')).toBeTruthy();
  });
});
