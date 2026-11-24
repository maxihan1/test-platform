// @vitest-environment jsdom
// 한 건 실행은 결과 화면이 없다 — 그 번호의 결과 화면 주소로 와도, 항목 상세에서 「실행 결과」를 눌러도 붙은 실행의 그 케이스나 케이스 상세로 간다 (도메인/실행 §7 `GET /api/runs/:runId`)

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, type RunItemPage } from './api.js';
import { ItemDetail } from './ItemDetail.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 도는중응답, 실행까지 } from './RunResult.fixture.js';
import { 끝난실행, 항목줄 } from './RunResultAssemble.fixture.js';
import { 지켜보는실행, 지켜본다 } from './runWatchStore.js';

const 붙은 = 40;
const 한건 = (rerunOf: number | null) => ({
  ...끝난실행([항목줄(1, 'ZSG-FN-001', 'desktop', 'PASS'), 항목줄(2, 'ZSG-FN-002', 'desktop', 'FAIL')]),
  runId: RUN_ID,
  origin: 'SINGLE' as const,
  rerunOf,
});

/** 한 건은 붙은 실행에 붙었고 그 실행에는 넘긴 줄만 있다 */
function 실행들(붙은줄: ReturnType<typeof 항목줄>[]): void {
  vi.spyOn(api, 'run').mockImplementation((id) => Promise.resolve(id === 붙은 ? { ...끝난실행(붙은줄), runId: 붙은 } : 한건(붙은)));
}

const 항목 = (바꿀것: Partial<RunItemPage> = {}): RunItemPage => ({
  trace: null,
  farm: [],
  runId: RUN_ID,
  runTitle: '글쓰기',
  historyId: 2,
  tcId: 'ZSG-FN-002',
  tcName: '둘째',
  platform: 'desktop',
  attempt: 1,
  params: {},
  paramSchema: {},
  expected: {},
  expectedSchema: {},
  verifyStatements: [],
  precondition: [],
  status: 'FAIL',
  durationMs: 1,
  error: null,
  startedAt: '2026-11-25T00:00:00.000Z',
  finishedAt: '2026-11-25T00:00:01.000Z',
  steps: [],
  ...바꿀것,
});

beforeEach(() => {
  vi.spyOn(api, 'insights').mockRejectedValue(new Error('한 건은 견줌이 없다'));
  vi.spyOn(api, 'failures').mockRejectedValue(new Error('한 건은 실패 카드가 없다'));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  지켜본다(null);
  window.history.replaceState(null, '', '#');
});

describe('한 건 실행 번호의 결과 화면 주소', () => {
  it('붙은 곳이 없으면 케이스 상세로 옮기고 견줌을 묻지 않는다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(한건(null));
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(window.location.hash).toContain('case=ZSG-FN-001'));
    expect(api.insights).not.toHaveBeenCalled();
    expect(screen.queryByText(/이전 실행과 비교하지 못했습니다/)).toBeNull();
  });

  it('붙은 곳이 있으면 그 실행의 케이스로 옮기고 주소가 짚은 케이스를 편다', async () => {
    실행들([항목줄(8, 'ZSG-FN-002', 'desktop', 'FAIL')]);
    // 방문 기록의 칸 번호가 남아야 떠나기 막기가 어긋나지 않는다
    window.history.replaceState({ navIndex: 4 }, '', `#/runs/${String(RUN_ID)}?tc=ZSG-FN-002`);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(window.location.hash).toBe(`#/runs/${String(붙은)}?tc=ZSG-FN-002`));
    expect(window.history.state).toEqual({ navIndex: 4 });
  });

  it('붙은 실행에 짚은 케이스가 없으면 케이스 상세로, 안 짚었으면 붙은 실행에 든 케이스로 간다', async () => {
    실행들([항목줄(8, 'ZSG-FN-002', 'desktop', 'FAIL')]);
    window.location.hash = `#/runs/${String(RUN_ID)}?tc=ZSG-FN-001`;
    const { unmount } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(window.location.hash).toContain('case=ZSG-FN-001'));
    unmount();

    window.location.hash = `#/runs/${String(RUN_ID)}`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(window.location.hash).toBe(`#/runs/${String(붙은)}?tc=ZSG-FN-002`));
  });

  it('도는 한 건이면 진행 창을 열고 옮긴다 — 멈출 길을 잃지 않게', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...도는중응답, ...한건(null), status: 'RUNNING', finishedAt: null });
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(window.location.hash).toContain('case=ZSG-FN-001'));
    expect(지켜보는실행()).toEqual({ runId: RUN_ID, 열림: true });
  });
});

describe('한 건 실행의 항목 상세', () => {
  it('「실행 결과」는 보던 케이스를 짚어 보내고 리포트 단추 · 실패 카드 찾기가 없다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(한건(null));
    vi.spyOn(api, 'item').mockResolvedValue(항목());
    render(<ItemDetail runId={RUN_ID} historyId={2} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(screen.getByRole('link', { name: '실행 결과' }).getAttribute('href')).toBe(`#/runs/${String(RUN_ID)}?tc=ZSG-FN-002`));
    expect(screen.queryByText(/리포트 생성/)).toBeNull();
    expect(api.failures).not.toHaveBeenCalled();
  });

  it('Blocked 의 「실패 보기」는 같은 한 건 실행의 막은 케이스 항목으로 간다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(한건(null));
    vi.spyOn(api, 'item').mockResolvedValue(항목({ historyId: 3, tcId: 'ZSG-FN-003', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'ZSG-FN-002' }));
    render(<ItemDetail runId={RUN_ID} historyId={3} 판정하기={() => 실행까지} />);

    const 고리 = await screen.findByRole('link', { name: 'ZSG-FN-002 실패 보기' });
    expect(고리.getAttribute('href')).toBe(`#/runs/${String(RUN_ID)}/items/2`);
  });
});
