// @vitest-environment jsdom
// 결정 필요 「결함 판정」 항목의 자동 수정 줄 — 게임 실패 자동 수정이 끝난 항목에만 선다 (도메인/게임 §3.10 「실패 자동 수정」 7)

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { 실패판정 } from './AuthoringDecideItems.js';
import type { 결정항목, 판정자동수정 } from './decideApi.js';

afterEach(cleanup);

const 항목 = (autoFix?: 판정자동수정 | null): Extract<결정항목, { kind: 'FAIL' }> => ({
  key: 'fail:7:ARG-FN-012', group: 2, kind: 'FAIL', picks: ['SCREEN', 'BUG'], blockedBy: null, runId: 7, tcId: 'ARG-FN-012', reqs: [], verify: null, reason: null, finishedAt: null,
  ...(autoFix === undefined ? {} : { autoFix }),
});
const 그리기 = (autoFix?: 판정자동수정 | null) => render(<실패판정 x={항목(autoFix)} 고른={undefined} on고름={() => undefined} />);

describe('실패 판정 항목의 자동 수정 줄', () => {
  it('자동 수정이 없으면 줄이 없다', () => {
    그리기();
    expect(screen.queryByText('자동 수정')).toBeNull();
  });

  it('수정했지만 다시 실행에서도 실패했으면 PR · 실행 고리를 달고 판정 고르개는 그대로다', () => {
    그리기({ state: 'FAILED', prUrl: 'https://github.com/o/r/pull/10', rerunId: 21200, rerunPage: true, reason: null });
    expect(screen.getByText('자동 수정')).toBeTruthy();
    const 줄 = screen.getByText('자동 수정').nextElementSibling!;
    expect(줄.textContent).toBe('수정했지만 다시 실행해도 실패했습니다 · PR #10 · RUN 21200');
    expect(screen.getByRole('link', { name: 'PR #10' }).getAttribute('href')).toBe('https://github.com/o/r/pull/10');
    expect(screen.getByRole('link', { name: 'RUN 21200' }).getAttribute('href')).toBe('#/runs/21200');
  });

  it('다시 실행하니 통과한 줄 · 그만둔 줄은 한 줄 설명만 단다', () => {
    그리기({ state: 'FLAKY', prUrl: null, rerunId: null, rerunPage: false, reason: null });
    expect(screen.getByText('다시 실행하니 통과해서 수정하지 않았습니다')).toBeTruthy();
    cleanup();
    그리기({ state: 'GAVE_UP', prUrl: null, rerunId: null, rerunPage: false, reason: '고칠 곳을 찾지 못했어요' });
    expect(screen.getByText('그만뒀습니다 · 고칠 곳을 찾지 못했어요')).toBeTruthy();
  });
});
