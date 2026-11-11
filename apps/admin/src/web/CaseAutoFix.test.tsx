// @vitest-environment jsdom
// 기능 테스트 목록 · 서랍의 「자동 수정」 표시 (도메인/BTS §8.15 「자동 수정 표시」 A · BTS-F10-07)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type HistoryRow, type 자동수정상세 } from './api.js';
import { 자동수정상자 as 상자 } from './CaseAutoFix.js';
import { 실행이력칸 } from './CaseHistory.js';
import { 실행마다묶기 } from './caseDetailView.js';
import { use검색조건 } from './CaseListFilter.js';
import { 결과탭들 } from './CaseListFilterBar.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  window.location.hash = '#/cases/fn';
});

function 탭그리기(수: number) {
  let 조건 = {};
  function 줄() {
    const 검색 = use검색조건('ZAF', 'FN');
    조건 = 검색.조건;
    return (
      <결과탭들
        결과={검색.결과}
        건수={{ total: 8, pass: 8, fail: 0, na: 0 }}
        on결과={검색.on결과}
        자동수정={{ 눌림: 검색.자동수정, 수, on누르기: 검색.on자동수정 }}
      />
    );
  }
  render(<줄 />);
  return { 조건: () => 조건 };
}

const 상세 = (더: Partial<자동수정상세> = {}): 자동수정상세 => ({
  issueKey: 'MQA-168',
  issueUrl: 'https://bts.example.com/issues/MQA-168',
  state: 'PASSED',
  at: '2026-11-11T03:00:00Z',
  movedBy: 'QA 맥시',
  summary: '새 창을 만들던 요청을 열린 페이지로 바꿨어요',
  merge: 'AUTO',
  prUrl: 'https://github.com/o/r/pull/713',
  rerunId: 21109,
  reason: null,
  needsPerson: false,
  devices: [
    { platform: 'desktop', status: 'PASS' },
    { platform: 'mobile', status: 'PASS' },
  ],
  ...더,
});

describe('결과 탭 줄 끝 「자동 수정 N」', () => {
  it('0 이면 그리지 않는다', () => {
    탭그리기(0);
    expect(screen.queryByRole('button', { name: /자동 수정/ })).toBeNull();
  });

  it('누르면 그 케이스만 거르고 결과 탭은 풀린다 · 다른 결과 탭을 누르면 자동 수정이 풀린다', () => {
    const { 조건 } = 탭그리기(1);
    fireEvent.click(screen.getByRole('button', { name: '실패 0' }));
    expect(조건()).toMatchObject({ last: 'FAIL' });

    fireEvent.click(screen.getByRole('button', { name: '자동 수정 1' }));
    expect(조건()).toMatchObject({ autoFix: true });
    expect(조건()).not.toHaveProperty('last');
    expect(window.location.hash).toContain('autoFix=1');
    expect(screen.getByRole('button', { name: '자동 수정 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '전체 8' }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '통과 8' }));
    expect(조건()).toMatchObject({ last: 'PASS' });
    expect(조건()).not.toHaveProperty('autoFix');
  });
});

describe('서랍 「자동 수정 기록」', () => {
  it('통과한 줄 — 요청 · 수정 · 반영 · 확인', async () => {
    vi.spyOn(api, 'caseFix').mockResolvedValue({ autoFix: 상세() });
    render(<상자 tcId="DMW-FN-378" />);

    expect(await screen.findByText('자동 수정 기록')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Issue Bunker MQA-168' }).getAttribute('href')).toBe('https://bts.example.com/issues/MQA-168');
    expect(screen.getByText('새 창을 만들던 요청을 열린 페이지로 바꿨어요')).toBeTruthy();
    expect(screen.getByText(/자동 반영/).textContent).toContain('(PR #713)');
    expect(screen.getByText(/PC 통과 · 모바일 통과/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'RUN 21109' }).getAttribute('href')).toBe('#/runs/21109');
  });

  it('반영을 기다리는 줄에 사람 확인 댓글이 있으면 그 한 줄', async () => {
    vi.spyOn(api, 'caseFix').mockResolvedValue({ autoFix: 상세({ state: 'WAIT_MERGE', merge: null, needsPerson: true, rerunId: null, devices: [] }) });
    render(<상자 tcId="DMW-FN-378" />);
    expect(await screen.findByText('반영을 기다리는 중 — 사람 확인이 필요해요')).toBeTruthy();
    expect(screen.queryByText('확인')).toBeNull();
  });

  it('그만둔 줄은 까닭을 붙인다', async () => {
    vi.spyOn(api, 'caseFix').mockResolvedValue({ autoFix: 상세({ state: 'GAVE_UP', reason: '테스트 수정 작성이 실패했어요' }) });
    render(<상자 tcId="DMW-FN-378" />);
    expect(await screen.findByText('그만뒀어요 · 테스트 수정 작성이 실패했어요')).toBeTruthy();
  });
});

it('서랍 실행 기록 — 수정 뒤 다시 돌린 실행 줄에만 「수정 후」', () => {
  const 줄 = (runId: number, afterFix: boolean): HistoryRow => ({
    historyId: runId * 10,
    runId,
    runTitle: `RUN ${runId}`,
    platform: 'desktop',
    status: 'PASS',
    durationMs: 100,
    startedAt: '2026-11-11T03:00:00Z',
    finishedAt: '2026-11-11T03:00:01Z',
    origin: afterFix ? 'SINGLE' : 'MANUAL',
    rerunOf: afterFix ? 21000 : null,
    afterFix,
  });
  render(<실행이력칸 묶음={실행마다묶기([줄(21109, true), 줄(21000, false)])} />);
  const 행들 = screen.getAllByRole('row');
  expect(행들.map((r) => r.querySelector('.fix-tag')?.textContent ?? null)).toEqual(['수정 후', null]);
});
