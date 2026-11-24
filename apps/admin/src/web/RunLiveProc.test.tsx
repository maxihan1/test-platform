// @vitest-environment jsdom
// 진행 창의 테스트 프로시저 — 카드 발의 프로시저 줄 · 케이스 경과 / 제한 · Blocked 알약 (도메인/실행 §8.9 · §3.2)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

import type { RunItemSummary } from './api.js';
import { 실행, 절차, 카드들, 항목 } from './RunLiveCards.fixture.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 장면통로 } from './TrialLive.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const 프로시저항목 = (n: number): RunItemSummary => ({
  ...항목(n, 'android'),
  execId: 3,
  execSeq: n,
  procId: 'MTA-TP-022',
  procName: '결제 흐름',
});

const 다섯 = [1, 2, 3, 4, 5].map(프로시저항목);

async function 그린다(진행목록: ReturnType<typeof 절차>[], items = 다섯) {
  render(<RunProgressModal data={실행(items)} 진행목록={진행목록} onClose={() => {}} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return 카드들()[0]!;
}

describe('카드 발의 프로시저 줄', () => {
  it('지금 도는 케이스가 어느 프로시저의 몇 번째인지 「MTA-TP-022 결제 흐름 · 5건 중 3번째」로 적는다', async () => {
    const 카드 = await 그린다([절차(3, { live: true })]);

    expect(카드.querySelector('.lc-foot')?.textContent).toContain('MTA-TP-022 결제 흐름 · 5건 중 3번째');
    expect(카드.querySelector('.lc-foot')?.textContent).toContain('ZZL-003');
  });

  it('프로시저에 안 든 항목에는 프로시저 줄이 없다', async () => {
    const 카드 = await 그린다([절차(1, { live: true })], [항목(1, 'android')]);

    expect(카드.querySelector('.lc-foot')?.textContent).not.toContain('건 중');
  });
});

describe('경과와 제한', () => {
  it('케이스 경과를 주면 「케이스 15초 / 제한 2분」이다 — 프로시저 전체 경과가 아니다', async () => {
    const 카드 = await 그린다([절차(3, { live: true, caseElapsedMs: 15000, itemElapsedMs: 95000, timeoutMs: 120000 })]);

    expect(카드.querySelector('.lim')?.textContent).toBe('케이스 15초 / 제한 2분');
  });

  it('프로시저인데 케이스 경과가 없으면(옛 테스트 실행기) 제한 없이 경과만 적는다', async () => {
    const 카드 = await 그린다([절차(3, { live: true, itemElapsedMs: 95000, timeoutMs: 120000 })]);

    expect(카드.querySelector('.lim')?.textContent).toBe('1분 35초');
  });

  it('프로시저가 아니면 케이스 경과 없이 「경과 / 제한」이다', async () => {
    const 카드 = await 그린다([절차(1, { live: true, itemElapsedMs: 41000, timeoutMs: 30000 })], [항목(1, 'android')]);

    expect(카드.querySelector('.lim')?.textContent).toBe('41초 / 제한 30초');
  });
});

describe('Blocked 알약', () => {
  const 막힌 = (n: number, 덮을것: Partial<RunItemSummary> = {}): RunItemSummary => ({
    ...프로시저항목(n),
    status: 'NA',
    blockedBy: 'ZZL-001',
    error: { message: 'BLOCKED' },
    finishedAt: '2026-11-05T00:01:00.000Z',
    ...덮을것,
  });

  it('도는 중 Not tested 알약 뒤에 (Blocked n)을 단다', () => {
    const items = [{ ...프로시저항목(1), status: 'FAIL' as const, finishedAt: '2026-11-05T00:00:30.000Z' }, 막힌(2), 막힌(3), 프로시저항목(4)];
    render(<RunProgressModal data={실행(items, { counts: { total: 4, pass: 0, fail: 1, na: 2, running: 1, blocked: 2 } })} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelector('.rl-pills')?.textContent).toContain('Not tested');
    expect(document.querySelector('.rl-pills')?.textContent).toContain('(Blocked 2)');
  });

  it('Blocked 가 없으면 괄호도 없다', () => {
    render(<RunProgressModal data={실행([프로시저항목(1)], { counts: { total: 1, pass: 0, fail: 0, na: 0, running: 1, blocked: 0 } })} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelector('.rl-pills')?.textContent).not.toContain('Blocked');
  });

  it('끝난 줄의 알약 글자는 막힌 줄만 Blocked 이고 그냥 미실행은 Not tested 다', () => {
    const 그냥 = { ...프로시저항목(5), status: 'NA' as const, error: null, finishedAt: '2026-11-05T00:01:00.000Z' };
    render(<RunProgressModal data={실행([막힌(4), 그냥])} 진행목록={[]} onClose={() => {}} />);

    const 알약들 = [...document.querySelectorAll('.rl-items li .pill')].map((el) => el.textContent);
    expect(알약들).toEqual(['Blocked', 'Not tested']);
  });
});
