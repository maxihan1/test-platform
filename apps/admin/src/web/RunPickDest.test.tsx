// @vitest-environment jsdom
// 실행 창 「결과가 남는 곳」 — 한 건이 붙을 실행 · 붙을 곳이 없을 때 · 반복 · 여러 건 · 「실패 1건 다시 실행」 · Slack 칸 (도메인/실행 §8.10 · §3.2)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type CaseRow, type ServiceRow } from './api.js';
import { RunPickModal } from './RunPickModal.js';
import type { RunDetail } from './runProgress.js';
import { 사람, 서비스, 케이스 } from './runPick.fixture.js';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 슬랙서비스: ServiceRow = { ...서비스, hasSlackWebhook: true };

async function 연다(케이스들: CaseRow[], 덮어쓸: { 원래실행?: number; 초기서버?: string } = {}) {
  render(<RunPickModal 케이스들={케이스들} service={슬랙서비스} user={사람} onRun={vi.fn()} onClose={vi.fn()} 초기서버="qa" {...덮어쓸} />);
  await act(async () => {});
}

const 줄글 = () => document.querySelector('.mdest')?.textContent;

function 원래실행(attempt: number, env = 'qa'): RunDetail & { evidence: [] } {
  return {
    runId: 40, title: '기능 전체 실행', triggeredBy: 'zrs1', triggeredByName: '김실행', env, baseUrl: '', serviceName: '', status: 'FINISHED',
    startedAt: '2026-10-29T01:00:00.000Z', finishedAt: '2026-10-29T02:00:00.000Z', counts: { total: 1, pass: 0, fail: 1, na: 0, running: 0 }, evidence: [],
    items: [{ historyId: 1, tcId: 'ZRS-001', tcName: '', platform: 'desktop', attempt, params: {}, paramSchema: {}, status: 'FAIL', durationMs: 1, error: null, startedAt: '', finishedAt: '' }],
  };
}

describe('결과가 남는 곳', () => {
  it('한 건이면 붙을 실행을 고른 서버 · 디바이스로 물어 RUN 번호와 제목을 적는다', async () => {
    const 물음 = vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: { runId: 38, title: '밤 전체 테스트', startedAt: '2026-10-29T01:00:00.000Z' } });
    await 연다([케이스]);
    expect(물음).toHaveBeenCalledWith('ZRS-001', 'qa', ['desktop']);
    expect(줄글()).toMatch(/^결과가 남는 곳RUN 38 결과에 다시 실행으로 붙습니다 · 밤 전체 테스트 · /);
  });

  it('붙을 곳이 없으면 케이스 상세에만 남는다고 적는다', async () => {
    vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: null });
    await 연다([케이스]);
    expect(줄글()).toBe('결과가 남는 곳아직 전체 테스트에 들어간 적이 없어 이 케이스 상세에만 남습니다');
  });

  it('대상 서버를 바꾸면 그 서버로 다시 묻는다', async () => {
    const 물음 = vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: null });
    await 연다([케이스]);
    fireEvent.change(document.getElementById('pick-env')!, { target: { value: 'stage' } });
    await act(async () => {});
    expect(물음).toHaveBeenLastCalledWith('ZRS-001', 'stage', ['desktop']);
  });

  it('한 건 · 반복 1 이면 Slack 칸을 숨기고, 반복을 올리면 새 RUN 이라 적고 다시 보인다', async () => {
    const 물음 = vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: null });
    await 연다([케이스]);
    expect(screen.queryByLabelText('끝나면 Slack 으로 알리기')).toBeNull();

    fireEvent.change(document.getElementById('pick-repeat')!, { target: { value: '3' } });
    await act(async () => {});
    expect(줄글()).toBe('결과가 남는 곳실행 기록에 새 RUN 으로 남습니다');
    expect(screen.getByLabelText('끝나면 Slack 으로 알리기')).toBeTruthy();
    expect(물음).toHaveBeenCalledTimes(1);
  });

  it('여러 건이면 묻지 않고 새 RUN 이다', async () => {
    const 물음 = vi.spyOn(api, 'rerunTarget');
    await 연다([케이스, { ...케이스, tcId: 'ZRS-002' }]);
    expect(줄글()).toBe('결과가 남는 곳실행 기록에 새 RUN 으로 남습니다');
    expect(물음).not.toHaveBeenCalled();
  });

  it('「실패 1건 다시 실행」은 같은 서버면 묻지 않고 원래 실행에 붙는다고 적는다', async () => {
    const 물음 = vi.spyOn(api, 'rerunTarget');
    vi.spyOn(api, 'run').mockResolvedValue(원래실행(1));
    await 연다([케이스], { 원래실행: 40 });
    expect(줄글()).toMatch(/^결과가 남는 곳RUN 40 결과에 다시 실행으로 붙습니다 · 기능 전체 실행 · /);
    expect(물음).not.toHaveBeenCalled();
  });

  it('원래 실행이 반복 실행이면 서버가 새 RUN 을 만든다고 적는다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(원래실행(2));
    await 연다([케이스], { 원래실행: 40 });
    expect(줄글()).toBe('결과가 남는 곳실행 기록에 새 RUN 으로 남습니다');
  });

  it('원래 실행과 다른 서버를 고르면 그 서버에서 붙을 곳을 묻는다', async () => {
    const 물음 = vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: null });
    vi.spyOn(api, 'run').mockResolvedValue(원래실행(1, 'stage'));
    await 연다([케이스], { 원래실행: 40 });
    expect(물음).toHaveBeenCalledWith('ZRS-001', 'qa', ['desktop']);
    expect(줄글()).toBe('결과가 남는 곳아직 전체 테스트에 들어간 적이 없어 이 케이스 상세에만 남습니다');
  });
});
