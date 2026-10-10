// @vitest-environment jsdom
// 실행 기록 › E2E 화면 검사 (도메인/시나리오 §8.11 · 실행 §8.7). 본보기 RunList.test.tsx 와 같은 꼴이다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { RunTally } from './api.js';
import type { 판정 } from './role.js';
import { E2E띠색 } from './scenarioResultView.js';
import { scenarioApi, type ScenarioRunList as 목록답, type ScenarioRunRow } from './scenarioApi.js';
import { ScenarioRunList } from './ScenarioRunList.js';

const 운영: 판정 = () => true;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 줄(runId: number, 덮: Partial<ScenarioRunRow> = {}): ScenarioRunRow {
  return {
    runId,
    title: `ZSL 시나리오 ${runId}`,
    triggeredBy: 'zsl',
    triggeredByName: '김검사',
    env: 'qa',
    baseUrl: 'https://qa.example.com',
    serviceName: 'ZSL 서비스',
    status: 'FINISHED',
    kind: 'SCENARIO',
    startedAt: '2026-10-06T00:00:00.000Z',
    finishedAt: '2026-10-06T00:10:00.000Z',
    scenarioId: 7,
    version: 3,
    partCount: 5,
    stoppedAt: null,
    unconfirmed: false,
    verdict: 'PASS',
    ...덮,
  };
}

const 집계: RunTally = {
  runs: 10,
  allPass: 4,
  hasFail: 3,
  durationOf: 9,
  avgDurationMs: 120000,
  maxDurationMs: 300000,
};
const 빈집계: RunTally = {
  runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0,
};

const 한쪽: 목록답 = {
  items: [줄(11), 줄(12, { verdict: 'FAIL', stoppedAt: 3 })],
  total: 10,
  page: 1,
  pageSize: 2,
  summary: 집계,
};

const 빈쪽 = (summary: 목록답['summary']): 목록답 => ({ items: [], total: 0, page: 1, pageSize: 2, summary });

async function 그리기(답: 목록답 = 한쪽) {
  const 스파이 = vi.spyOn(scenarioApi, 'runs').mockResolvedValue(답);
  const 것 = render(<ScenarioRunList service="ZSL" 할수={운영} />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  return { ...것, 스파이 };
}

describe('ScenarioRunList 호출 · 거르개', () => {
  it('서비스와 1쪽으로 부른다', async () => {
    const { 스파이 } = await 그리기();
    expect(스파이).toHaveBeenCalledWith('ZSL', 1, {});
  });

  it('찾기는 q 를 싣고 1쪽으로 간다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.change(screen.getByPlaceholderText(/시나리오 이름으로 찾기/), { target: { value: '결제' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { q: '결제' }));
  });

  it('상태 칩이 state 를 싣는다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.click(screen.getByRole('button', { name: '진행 중' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { state: 'running' }));

    fireEvent.click(screen.getByRole('button', { name: '실패' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { state: 'failed' }));
  });
});

describe('ScenarioRunList 머리 · 표머리', () => {
  it('제목과 부제에 E2E 와 총건수를 적는다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    const 머리 = container.querySelector('.head');
    expect(머리?.querySelector('h1')?.textContent).toBe('실행 기록');
    expect(머리?.querySelector('.head-meta')?.textContent).toBe('E2E · 모두 10건');
  });

  it('표머리가 셋이다', async () => {
    await 그리기();
    const 이름들 = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(이름들).toEqual(['RUN', '시나리오 이름 · 버전', '단계 · 멈춘 단계']);
  });
});

describe('ScenarioRunList 줄', () => {
  it('번호 · 이름과 버전 · 실행자 · 상태 · 단계 수 · 멈춘 단계를 적는다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 12/);

    const 줄들 = container.querySelectorAll('.row');
    const 첫 = 줄들[0] as HTMLElement;
    expect(첫.querySelector('.tcid')?.textContent).toBe('RUN 11');
    expect(첫.querySelector('.title')?.textContent).toContain('ZSL 시나리오 11 v3');
    expect(첫.querySelector('.title small')?.textContent).toContain('실행자 김검사');
    expect(첫.querySelector('.title small')?.textContent).toContain('완료');
    expect(within(첫).getByText('단계 5개')).toBeTruthy();
    expect(within(첫).getByText('모두 통과')).toBeTruthy();

    expect(within(줄들[1] as HTMLElement).getByText('3번에서 멈춤')).toBeTruthy();
  });

  it('도는 중이면 멈춘 단계 글자가 비어 있다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(13, { status: 'RUNNING', finishedAt: null, verdict: null })],
    });
    await screen.findByText(/ZSL 시나리오 13/);

    const 행 = container.querySelector('.row') as HTMLElement;
    expect(within(행).queryByText('모두 통과')).toBeNull();
    expect(행.querySelector('.title small')?.textContent).toContain('진행 중');
  });

  it('미확정이면 판정과 상관없이 「미확정」 꼬리표를 단다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(14, { unconfirmed: true }), 줄(15), 줄(16, { verdict: 'FAIL', unconfirmed: true })],
    });
    await screen.findByText(/ZSL 시나리오 14/);

    const 칩들 = container.querySelectorAll('.row .case-tag');
    expect(칩들).toHaveLength(2);
    expect(칩들[0]?.textContent).toBe('미확정');
    expect((container.querySelectorAll('.row')[0] as HTMLElement).contains(칩들[0] as Element)).toBe(true);
  });

  it('왼쪽 띠가 E2E띠색 값과 같다', async () => {
    const 줄들 = [
      줄(21),
      줄(22, { unconfirmed: true }),
      줄(23, { verdict: 'FAIL', stoppedAt: 2 }),
      줄(24, { verdict: 'NA' }),
      줄(25, { status: 'RUNNING', finishedAt: null, verdict: null }),
    ];
    const { container } = await 그리기({ ...한쪽, items: 줄들 });
    await screen.findByText(/ZSL 시나리오 21/);

    const 띠들 = [...container.querySelectorAll<HTMLElement>('.row .gutter')].map((el) => el.style.background);
    expect(띠들).toEqual(줄들.map(E2E띠색));
    expect(띠들[0]).toBe('var(--pass)');
    expect(띠들[1]).toBe('var(--pass)');
    expect(띠들[2]).toBe('var(--fail)');
  });
});

describe('ScenarioRunList 집계 띠', () => {
  it('네 칸을 라벨로 낸다 — 미확정 통과는 따로 칸이 없다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    const 칸들 = [...container.querySelectorAll('.stat')];
    expect(칸들.map((칸) => 칸.querySelector('.k')?.textContent)).toEqual([
      '실행 횟수', '성공', '실패', '평균 소요',
    ]);
    expect(칸들.map((칸) => 칸.className)).toEqual(['stat', 'stat p', 'stat f', 'stat']);
  });

  it('비율 막대는 통과 · 실패 · 미실행 셋이다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    const 칸들 = [...container.querySelectorAll('.ratio i')].map((el) => el.className);
    expect(칸들).toEqual(['p', 'f', 'n']);
  });

  it('아무것도 안 돌렸으면 띠가 없다', async () => {
    const { container } = await 그리기(빈쪽(빈집계));
    await screen.findByText(/이 서비스에서 아직 돌린 E2E 시나리오가 없습니다/);

    expect(container.querySelector('.stats')).toBeNull();
  });
});

describe('ScenarioRunList 빈 목록', () => {
  it('조건이 없으면 시나리오 목록으로 이끈다', async () => {
    await 그리기(빈쪽(빈집계));

    expect(await screen.findByText(/이 서비스에서 아직 돌린 E2E 시나리오가 없습니다/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '시나리오 목록으로' }).getAttribute('href')).toBe('#/scenarios');
  });

  it('조건을 걸었으면 다른 문장과 조건 지우기를 준다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    스파이.mockResolvedValue(빈쪽(집계));
    fireEvent.change(screen.getByPlaceholderText(/시나리오 이름으로 찾기/), { target: { value: '없는것' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(await screen.findByText(/조건에 맞는 실행이 없습니다/)).toBeTruthy();
    스파이.mockResolvedValue(한쪽);
    fireEvent.click(screen.getByRole('button', { name: '조건 지우기' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, {}));
  });
});

describe('ScenarioRunList 결과 보기', () => {
  it('누르면 결과 상자가 열린다', async () => {
    await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.click(screen.getAllByRole('button', { name: '결과 보기' })[0]!);

    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
