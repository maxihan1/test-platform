// @vitest-environment jsdom
// 실행 기록 › E2E 화면 검사 (도메인/시나리오 §8.11 · 실행 §8.7 「목록 화면과 결과 화면을 따로」). 본보기 RunList.test.tsx 와 같은 꼴이다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { RunTally } from './api.js';
import { scenarioApi, type ScenarioRunList as 목록답, type ScenarioRunRow } from './scenarioApi.js';
import { ScenarioRunList } from './ScenarioRunList.js';

beforeEach(() => {
  window.location.hash = '#/runs/e2e';
});

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
    serviceName: 'ZSL 애플리케이션',
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
  const 결과 = vi.spyOn(scenarioApi, 'result').mockReturnValue(new Promise(() => {}));
  const 것 = render(<ScenarioRunList service="ZSL" />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  return { ...것, 스파이, 결과 };
}

const 줄들 = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.rt-line')];
const 칸들 = (el: HTMLElement) => [...el.children].map((c) => c.textContent ?? '');

describe('ScenarioRunList 호출 · 거르개', () => {
  it('애플리케이션과 1쪽으로 부른다', async () => {
    const { 스파이 } = await 그리기();
    expect(스파이).toHaveBeenCalledWith('ZSL', 1, {});
  });

  it('찾기는 q 를 싣고 1쪽으로 간다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.change(screen.getByPlaceholderText(/시나리오 이름으로 검색/), { target: { value: '결제' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { q: '결제' }));
  });

  it('상태 고르개가 state 를 싣고 주소에 남긴다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'running' } });
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { state: 'running' }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'failed' } });
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { state: 'failed' }));
    expect(window.location.hash).toBe('#/runs/e2e?state=failed&service=ZSL');
  });

  it('애플리케이션을 바꾸면 건 조건을 버린다', async () => {
    window.location.hash = '#/runs/e2e?state=failed&q=결제&page=2&service=ZSL';
    const 스파이 = vi.spyOn(scenarioApi, 'runs').mockResolvedValue(한쪽);
    const { rerender } = render(<ScenarioRunList service="ZSL" />);
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 2, { q: '결제', state: 'failed' }));

    rerender(<ScenarioRunList service="MKT" />);

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('MKT', 1, {}));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/e2e?service=MKT'));
  });
});

describe('ScenarioRunList 머리 · 표머리', () => {
  it('제목과 부제에 E2E 와 총건수를 적는다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    const 머리 = container.querySelector('.head');
    expect(머리?.querySelector('h1')?.textContent).toBe('실행 기록 › E2E');
    expect(머리?.querySelector('.head-meta')?.textContent).toBe('모두 10건');
  });

  it('칸 이름이 RUN · 시나리오 · 대상 서버 · 시작 · 소요 시간 · 판정 · 단계 다', async () => {
    await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);
    expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual(['RUN', '시나리오', '대상 서버', '시작', '소요 시간', '판정', '단계']);
  });
});

describe('ScenarioRunList 줄', () => {
  it('줄 전체가 그 실행의 결과 화면 고리다 — 번호 · 이름과 버전 · 대상 서버 · 소요 · 판정 · 단계 수 · 멈춘 단계', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 12/);

    const [첫, 둘] = 줄들(container) as [HTMLElement, HTMLElement];
    expect(첫.tagName).toBe('A');
    expect(첫.getAttribute('href')).toBe('#/runs/11?list=service%3DZSL');
    expect(둘.getAttribute('href')).toBe('#/runs/12?list=service%3DZSL');
    const 칸 = 칸들(첫);
    expect(칸).toHaveLength(8);
    expect(칸[1]).toBe('11');
    expect(칸[2]).toBe('ZSL 시나리오 11 v3');
    expect(칸[3]).toBe('qa');
    expect(칸[5]).toBe('10분');
    expect(칸[6]).toBe('Pass');
    expect(칸[7]).toBe('단계 5개 · 모두 Pass');
    expect(칸들(둘)[7]).toBe('단계 5개 · 3번에서 종료');
  });

  it('결과 화면에서 읽던 실행자 · 시작 방식 · 서버 주소는 줄에 없다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    for (const 글 of ['김검사', 'https://qa.example.com', '대상 서버 qa']) expect(줄들(container)[0]?.textContent).not.toContain(글);
  });

  it('끝까지 돈 줄은 상태 꼬리표가 없다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);
    expect(container.querySelector('.rt-line .case-tag')).toBeNull();
  });

  it('도는 중이면 판정 칸이 「진행 중」이고 소요 시간 · 멈춘 단계가 비어 있다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(13, { status: 'RUNNING', finishedAt: null, verdict: null })],
    });
    await screen.findByText(/ZSL 시나리오 13/);

    const 행 = 줄들(container)[0]!;
    const 칸 = 칸들(행);
    expect(칸[5]).toBe('—');
    expect(칸[6]).toBe('진행 중');
    expect(칸[7]).toBe('단계 5개');
    expect(행.querySelector('.vd-pass, .v-fail, .vd-na')).toBeNull();
    expect(행.querySelector('.case-tag')).toBeNull();
    expect(행.classList.contains('fail')).toBe(false);
  });

  it('실패와 판정 없음은 멈춘 단계가 같아도 판정 글자로 갈린다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(21, { verdict: 'FAIL', stoppedAt: 3 }), 줄(22, { verdict: 'NA', stoppedAt: 3, env: 'stage' })],
    });
    await screen.findByText(/ZSL 시나리오 22/);

    const [실패, 없음] = 줄들(container) as [HTMLElement, HTMLElement];
    expect(within(실패).getByText('Fail')).toBeTruthy();
    expect(within(없음).getByText('Not tested')).toBeTruthy();
    expect(칸들(실패)[7]).toBe('단계 5개 · 3번에서 종료');
    expect(칸들(없음)[7]).toBe('단계 5개 · 3번에서 종료');
    expect(칸들(없음)[3]).toBe('stage');
  });

  it('왼쪽 띠는 Fail 줄에만 선다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [
        줄(21),
        줄(22, { unconfirmed: true }),
        줄(23, { verdict: 'FAIL', stoppedAt: 2 }),
        줄(24, { verdict: 'NA' }),
        줄(25, { status: 'RUNNING', finishedAt: null, verdict: null }),
      ],
    });
    await screen.findByText(/ZSL 시나리오 21/);

    expect(줄들(container).map((el) => el.classList.contains('fail'))).toEqual([false, false, true, false, false]);
  });

  it('미확정이면 판정과 상관없이 「미확정」 꼬리표를 단다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(14, { unconfirmed: true }), 줄(15), 줄(16, { verdict: 'FAIL', unconfirmed: true })],
    });
    await screen.findByText(/ZSL 시나리오 14/);

    const 칩들 = container.querySelectorAll('.rt-line .case-tag');
    expect(칩들).toHaveLength(2);
    expect(칩들[0]?.textContent).toBe('미확정');
    expect(줄들(container)[0]?.contains(칩들[0] as Element)).toBe(true);
    expect(줄들(container)[1]?.querySelector('.case-tag')).toBeNull();
  });

  it('중단 · 준비 실패는 상태 꼬리표로 선다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(31, { status: 'ABORTED', verdict: 'NA' }), 줄(32, { status: 'PREP_FAILED', verdict: 'NA' })],
    });
    await screen.findByText(/ZSL 시나리오 31/);

    expect([...container.querySelectorAll('.rt-line .case-tag')].map((el) => el.textContent)).toEqual(['중단', '준비 실패']);
  });

  it('목록에 건 조건을 list= 로 실어 결과 화면이 그 조건으로 돌아가게 한다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'failed' } });
    await waitFor(() => expect(줄들(container)[0]?.getAttribute('href')).toBe('#/runs/11?list=state%3Dfailed%26service%3DZSL'));
  });
});

describe('ScenarioRunList 목록만 그린다', () => {
  it('결과 칸이 없다 — 시나리오 결과를 부르지 않고 고른 줄 표시도 없다', async () => {
    const { container, 결과 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    expect(결과).not.toHaveBeenCalled();
    expect(container.querySelector('.runs-split')).toBeNull();
    expect(container.querySelector('.stats')).toBeNull();
    expect(container.querySelector('[aria-current]')).toBeNull();
    expect(screen.queryByRole('button', { name: '목록으로' })).toBeNull();
    expect(window.location.hash).toBe('#/runs/e2e?service=ZSL');
  });

  it('실행을 고른 옛 주소는 그 실행의 결과 화면 주소로 옮기고 목록을 그리지 않는다', async () => {
    window.location.hash = '#/runs/e2e?run=12&state=failed&service=ZSL';
    const 스파이 = vi.spyOn(scenarioApi, 'runs').mockResolvedValue(한쪽);
    const { container } = render(<ScenarioRunList service="ZSL" />);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/12?list=state%3Dfailed%26service%3DZSL'));
    expect(스파이).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });
});

describe('ScenarioRunList 빈 목록', () => {
  it('조건이 없으면 시나리오 목록으로 이끈다', async () => {
    await 그리기(빈쪽(빈집계));

    expect(await screen.findByText(/이 애플리케이션에서 아직 실행한 E2E 시나리오가 없습니다/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '시나리오 목록으로' }).getAttribute('href')).toBe('#/scenarios');
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
  });

  it('조건을 걸었으면 다른 문장과 조건 지우기를 준다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    스파이.mockResolvedValue(빈쪽(집계));
    fireEvent.change(screen.getByPlaceholderText(/시나리오 이름으로 검색/), { target: { value: '없는것' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(await screen.findByText(/조건에 맞는 실행이 없습니다/)).toBeTruthy();
    스파이.mockResolvedValue(한쪽);
    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, {}));
  });
});
