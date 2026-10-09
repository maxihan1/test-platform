// @vitest-environment jsdom
// 실행 결과 머리의 「실패 N건 다시 실행」이 서는 조건 — 끝난 실행 · 상자 밖에서만 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type RunItemSummary } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 도는중응답, 끝난응답, 실행까지 } from './RunResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const 실패항목: RunItemSummary = {
  historyId: 1,
  tcId: 'PAY-001',
  tcName: '카드 결제가 승인된다',
  platform: 'desktop',
  attempt: 1,
  params: {},
  paramSchema: {},
  status: 'FAIL',
  durationMs: 1200,
  error: null,
  startedAt: '2026-09-15T17:13:00.000Z',
  finishedAt: '2026-09-15T17:14:00.000Z',
};

// 집계의 실패를 0 으로 둔다 — 실패 카드 통로를 안 부르게. 버튼은 집계가 아니라 항목 판정을 센다
const 끝난실패 = { ...끝난응답, counts: { ...끝난응답.counts, fail: 0 }, items: [실패항목] };

describe('실패 N건 다시 실행 (도메인/실행 §8.3)', () => {
  it('끝난 실행 화면 머리에 선다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(끝난실패);
    vi.spyOn(api, 'insights').mockRejectedValue(new Error('견줄 앞 실행이 없다'));
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    expect(await screen.findByRole('button', { name: '실패 1건 다시 실행' })).toBeTruthy();
  });

  it('도는 동안에는 없다 — 아직 판정이 다 안 들어왔다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...도는중응답, items: [실패항목] });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('실행 중단');
    expect(screen.queryByRole('button', { name: /다시 실행$/ })).toBeNull();
  });

  it('결과 보기 상자 안에서는 없다 — 상자 위에 창이 겹치면 포커스 가두개가 둘이 된다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(끝난실패);
    vi.spyOn(api, 'insights').mockRejectedValue(new Error('견줄 앞 실행이 없다'));
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);

    await screen.findAllByText(/만들기$/);
    expect(screen.queryByRole('button', { name: /다시 실행$/ })).toBeNull();
  });
});
