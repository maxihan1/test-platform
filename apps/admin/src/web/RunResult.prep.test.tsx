// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { 띠색 } from './RunListRow.js';
import { 끝난응답, RUN_ID, 실행까지 } from './RunResult.fixture.js';

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

  it('실행 기록 줄의 띠는 실패 색이 아니라 중립이다', () => {
    expect(띠색({ status: 'PREP_FAILED', counts: { total: 2, pass: 0, fail: 0, na: 2, running: 0, unconfirmed: 0 } })).toBe('var(--na)');
  });
});
