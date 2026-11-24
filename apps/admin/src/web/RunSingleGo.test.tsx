// @vitest-environment jsdom
// 한 건 실행은 결과 화면이 없다 — 그 번호의 결과 화면 주소로 와도, 항목 상세에서 「실행 결과」를 눌러도 붙은 실행의 그 케이스나 케이스 상세로 간다 (도메인/실행 §7 `GET /api/runs/:runId`)

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, type RunItemPage } from './api.js';
import { ItemDetail } from './ItemDetail.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행까지 } from './RunResult.fixture.js';
import { 끝난실행, 항목줄 } from './RunResultAssemble.fixture.js';

const 붙은 = 40;
const 한건 = (rerunOf: number | null) => ({
  ...끝난실행([항목줄(1, 'ZSG-FN-001', 'desktop', 'PASS'), 항목줄(2, 'ZSG-FN-002', 'desktop', 'FAIL')]),
  runId: RUN_ID,
  origin: 'SINGLE' as const,
  rerunOf,
});

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
  window.location.hash = '';
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
    vi.spyOn(api, 'run').mockResolvedValue(한건(붙은));
    window.location.hash = `#/runs/${String(RUN_ID)}?tc=ZSG-FN-002`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(window.location.hash).toBe(`#/runs/${String(붙은)}?tc=ZSG-FN-002`));
  });
});

describe('한 건 실행의 항목 상세', () => {
  it('「실행 결과」는 보던 케이스의 상세로 가고 리포트 단추 · 실패 카드 찾기가 없다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(한건(null));
    vi.spyOn(api, 'item').mockResolvedValue(항목());
    render(<ItemDetail runId={RUN_ID} historyId={2} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(screen.getByRole('link', { name: '실행 결과' }).getAttribute('href')).toContain('case=ZSG-FN-002'));
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
