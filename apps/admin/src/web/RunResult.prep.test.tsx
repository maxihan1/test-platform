// @vitest-environment jsdom
// 준비 실패 실행의 결과 칸 · 실행 기록 줄을 본다 (도메인/실행 §3.2 「실행 전 준비」 「화면 · 집계」)
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { 실행표줄 } from './RunListTable.js';
import { 끝난응답, RUN_ID, 실행, 실행까지 } from './RunResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('준비 실패 실행', () => {
  it('결과 칸은 항목 목록 대신 안내 한 줄과 준비 실패 까닭을 보이고 머리 상태는 「준비 실패」다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, status: 'PREP_FAILED', prepNote: 'HTTP 500 · seed failed' });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    expect(await screen.findByText('테스트 데이터 준비에 실패해 테스트를 실행하지 않았습니다')).toBeTruthy();
    expect(screen.getByText('HTTP 500 · seed failed')).toBeTruthy();
    expect(screen.getAllByText(/준비 실패/).length).toBeGreaterThan(0);
  });

  it('항목이 있어도 준비 실패 실행에는 「다시 실행」 단추를 세우지 않는다 — 준비부터 다시 해야 한다', async () => {
    const 미실행 = { historyId: 1, tcId: 'PAY-001', tcName: '결제', platform: 'desktop' as const, attempt: 1, params: {}, paramSchema: {}, status: 'NA' as const, durationMs: null, error: null, startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:14:00.000Z' };
    vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, status: 'PREP_FAILED', prepNote: 'HTTP 500', items: [미실행, { ...미실행, historyId: 2, tcId: 'PAY-002', status: 'FAIL' }] });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('테스트 데이터 준비에 실패해 테스트를 실행하지 않았습니다');
    expect(screen.queryByRole('button', { name: /다시 실행$/ })).toBeNull();
  });

  it('실행 기록 줄에는 「준비 실패」 꼬리표가 서고 Fail 띠는 없다 — 판정이 없는 실행이다', () => {
    const { container } = render(<실행표줄 run={{ ...실행, status: 'PREP_FAILED', counts: { total: 2, pass: 0, fail: 0, na: 2, running: 0, unconfirmed: 0 } }} 목록조건="" />);
    const 줄 = container.querySelector('a.rt-line')!;
    expect(줄.classList.contains('fail')).toBe(false);
    expect(줄.querySelector('.case-tag')?.textContent).toBe('준비 실패');
  });
});
