// @vitest-environment jsdom
// 항목 상세의 테스트 프로시저 칸 — 프로시저 줄 · Blocked 배지와 사유 · 프로시저 실행 오류 (도메인/실행 §8.4 · §3.2)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { api, type ItemStatus, type RunItemPage, type RunItemSummary } from './api.js';
import { ItemDetail } from './ItemDetail.js';
import { 실행 } from './RunResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const RUN_ID = 3301;

const 요약 = (historyId: number, tcId: string, status: ItemStatus, 덮을것: Partial<RunItemSummary> = {}): RunItemSummary => ({
  historyId, tcId, tcName: `이름-${tcId}`, platform: 'android', attempt: 1, params: {}, paramSchema: {}, status, durationMs: 100,
  error: null, startedAt: '2026-11-24T00:00:00.000Z', finishedAt: '2026-11-24T00:00:01.000Z', ...덮을것,
});

const 항목: RunItemPage = {
  ...요약(7701, 'ZID-004', 'NA'),
  trace: null, farm: [], runId: RUN_ID, runTitle: '결제 회귀', precondition: [], expected: {}, expectedSchema: {}, steps: [],
};

async function 그린다(바꿀것: Partial<RunItemPage>, 같은실행: RunItemSummary[]) {
  vi.spyOn(api, 'item').mockResolvedValue({ ...항목, ...바꿀것 });
  vi.spyOn(api, 'run').mockResolvedValue({ ...실행, runId: RUN_ID, status: 'FINISHED', items: 같은실행, evidence: [] });
  render(<ItemDetail runId={RUN_ID} historyId={7701} 판정하기={() => () => true} />);
  await screen.findByText('이름-ZID-004');
}

const 막힘 = { status: 'NA' as const, error: { message: 'BLOCKED' }, blockedBy: 'ZID-003' };
const 사유칸 = () => screen.getByText('사유').closest('.sec') as HTMLElement;

describe('프로시저 줄', () => {
  it('번호 · 이름과 같은 실행에서 센 「5건 중 4번째」를 적는다', async () => {
    const 단위 = { execId: 10, procId: 'MTA-TP-022', procName: '결제 흐름' };
    const 다섯 = [1, 2, 3, 4, 5].map((n) => 요약(7700 + n, `ZID-00${String(n)}`, 'PASS', { ...단위, execSeq: n }));
    await 그린다({ ...단위, execSeq: 4 }, 다섯);

    await waitFor(() => expect([...document.querySelectorAll('.runmeta')][0]?.textContent).toBe('MTA-TP-022 결제 흐름 · 5건 중 4번째'));
  });

  it('프로시저에 안 든 항목에는 프로시저 줄이 없다', async () => {
    await 그린다({}, [요약(7701, 'ZID-004', 'NA')]);

    expect(document.querySelectorAll('.runmeta')).toHaveLength(1);
  });
});

describe('Blocked 항목', () => {
  const 막힘항목 = 요약(7701, 'ZID-004', 'NA', { error: { message: 'BLOCKED' }, blockedBy: 'ZID-003' });

  it('배지가 Blocked 이고 「사유」 구획에 막은 케이스와 그 케이스로 가는 고리가 있고 「실패 이유」 구획은 없다', async () => {
    await 그린다(막힘, [요약(7700, 'ZID-003', 'FAIL'), 막힘항목]);

    expect(document.querySelector('.bar .verdict, .bar .vd')?.textContent).toBe('Blocked');
    await waitFor(() => expect(사유칸().textContent).toContain('Blocked 선행 케이스 ZID-003 실패'));
    const 고리 = screen.getByRole('link', { name: 'ZID-003 실패 보기' });
    expect(고리.getAttribute('href')).toContain('ZID-003');
    expect(screen.queryByText('실패 이유')).toBeNull();
  });

  it('막은 케이스가 판정 없이 끝났으면 「제한 시간 초과」이고 고리는 「결과 보기」다', async () => {
    await 그린다(막힘, [요약(7700, 'ZID-003', 'NA'), 막힘항목]);

    await waitFor(() => expect(사유칸().textContent).toContain('선행 케이스 ZID-003 제한 시간 초과'));
    expect(screen.getByRole('link', { name: 'ZID-003 결과 보기' })).toBeTruthy();
  });

  it('막은 케이스의 판정을 이 실행에서 알 수 없으면 번호까지만 적는다', async () => {
    await 그린다(막힘, [막힘항목]);

    expect(사유칸().textContent).toBe('사유Blocked 선행 케이스 ZID-003ZID-003 결과 보기');
  });

  it('막은 케이스 번호가 없는 Blocked 는 고리 없이 Blocked 만 적는다', async () => {
    await 그린다({ error: { message: 'BLOCKED' } }, [요약(7701, 'ZID-004', 'NA', { error: { message: 'BLOCKED' } })]);

    expect(사유칸().textContent).toBe('사유Blocked');
    expect(screen.queryByRole('link', { name: /보기$/ })).toBeNull();
  });

  it('막히지 않은 항목에는 「사유」 구획이 없다', async () => {
    await 그린다({ status: 'PASS' }, [요약(7701, 'ZID-004', 'PASS')]);

    expect(screen.queryByText('사유')).toBeNull();
    expect(screen.queryByText('Blocked')).toBeNull();
  });
});

describe('프로시저 실행 오류', () => {
  it('실행 단위의 오류가 케이스 줄 사유와 같은 글이면 구획을 또 만들지 않는다', async () => {
    const 같은 = { message: '앱이 비정상 종료했습니다' };
    await 그린다({ status: 'NA', error: 같은, execError: 같은 }, [요약(7701, 'ZID-004', 'NA', { error: 같은 })]);

    expect(screen.queryByText('프로시저 실행 오류')).toBeNull();
  });

  it('다른 글이면 「프로시저 실행 오류」 구획에 사람 말 한 줄을 적는다', async () => {
    await 그린다({ status: 'PASS', execError: { message: '앱이 비정상 종료했습니다' } }, [요약(7701, 'ZID-004', 'PASS')]);

    const 구획 = screen.getByText('프로시저 실행 오류').closest('.sec') as HTMLElement;
    expect(구획.textContent).toContain('앱이 비정상 종료했습니다');
  });

  it('오류가 없으면 구획이 없다', async () => {
    await 그린다({ status: 'PASS', execError: null }, [요약(7701, 'ZID-004', 'PASS')]);

    expect(screen.queryByText('프로시저 실행 오류')).toBeNull();
  });
});
