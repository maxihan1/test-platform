// @vitest-environment jsdom
// 실행 기록 › E2E 화면 검사 (도메인/시나리오 §8.11 · 실행 §8.7 「A안」). 본보기 RunList.test.tsx 와 같은 꼴이다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { RunTally } from './api.js';
import type { 판정 } from './role.js';
import { 결과 as 시나리오결과 } from './ScenarioResult.fixture.js';
import { E2E띠색 } from './scenarioResultView.js';
import { scenarioApi, type ScenarioRunList as 목록답, type ScenarioRunRow } from './scenarioApi.js';
import { ScenarioRunList } from './ScenarioRunList.js';

const 운영: 판정 = () => true;

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
  const 것 = render(<ScenarioRunList service="ZSL" 판정하기={() => 운영} />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  return { ...것, 스파이, 결과 };
}

const 줄들 = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.run-row')];

describe('ScenarioRunList 머리', () => {
  it('위치는 「실행 기록 › E2E」 다 — API 애플리케이션도 같다', async () => {
    await 그리기();
    expect(await screen.findByRole('heading', { level: 1, name: '실행 기록 › E2E' })).toBeTruthy();
  });
});

describe('ScenarioRunList 호출 · 거르개', () => {
  it('애플리케이션과 1쪽으로 부른다', async () => {
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

  it('상태 고르개가 state 를 싣고 주소에 남긴다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'running' } });
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { state: 'running' }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'failed' } });
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, { state: 'failed' }));
    expect(window.location.hash).toBe('#/runs/e2e?state=failed');
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

  it('표머리가 기능 · UI 탭과 같은 둘이다', async () => {
    await 그리기();
    const 이름들 = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(이름들).toEqual(['실행', '판정']);
  });
});

describe('ScenarioRunList 줄', () => {
  it('번호 · 이름과 버전 · 실행자 · 상태 · 단계 수 · 멈춘 단계를 적는다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 12/);

    const 줄들 = container.querySelectorAll('.run-row');
    const 첫 = 줄들[0] as HTMLElement;
    expect(첫.querySelector('.title')?.textContent).toContain('ZSL 시나리오 11 v3');
    expect(첫.querySelector('.title small')?.textContent).toMatch(/^RUN 11 · /);
    expect(첫.querySelector('.title small')?.textContent).toContain('대상 서버 qa');
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

    const 행 = container.querySelector('.run-row') as HTMLElement;
    expect(within(행).queryByText('모두 통과')).toBeNull();
    expect(행.querySelector('.title small')?.textContent).toContain('진행 중');
    expect(행.querySelector('.run-verdict')?.firstElementChild?.textContent).toBe('진행 중');
    expect(행.querySelector('.v-pass, .v-fail, .v-na')).toBeNull();
  });

  it('실패와 판정 없음은 멈춘 단계가 같아도 판정 칩으로 갈린다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(21, { verdict: 'FAIL', stoppedAt: 3 }), 줄(22, { verdict: 'NA', stoppedAt: 3, env: 'stage' })],
    });
    await screen.findByText(/ZSL 시나리오 22/);

    const [실패, 없음] = Array.from(container.querySelectorAll('.run-row')) as HTMLElement[];
    expect(within(실패 as HTMLElement).getByText('3번에서 멈춤')).toBeTruthy();
    expect(within(없음 as HTMLElement).getByText('3번에서 멈춤')).toBeTruthy();
    expect(실패?.querySelector('.v-fail')?.textContent).toBe('실패');
    expect(없음?.querySelector('.v-na')?.textContent).toBe('미실행');
    expect(없음?.querySelector('.title small')?.textContent).toContain('대상 서버 stage');
  });

  it('통과 줄은 통과 칩이다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    expect(container.querySelector('.run-row .v-pass')?.textContent).toBe('통과');
  });

  it('미확정이면 판정과 상관없이 「미확정」 꼬리표를 단다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [줄(14, { unconfirmed: true }), 줄(15), 줄(16, { verdict: 'FAIL', unconfirmed: true })],
    });
    await screen.findByText(/ZSL 시나리오 14/);

    const 칩들 = container.querySelectorAll('.run-row .case-tag');
    expect(칩들).toHaveLength(2);
    expect(칩들[0]?.textContent).toBe('미확정');
    expect((container.querySelectorAll('.run-row')[0] as HTMLElement).contains(칩들[0] as Element)).toBe(true);
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

    const 띠들 = [...container.querySelectorAll<HTMLElement>('.run-row .gutter')].map((el) => el.style.background);
    expect(띠들).toEqual(줄들.map(E2E띠색));
    expect(띠들[0]).toBe('var(--pass)');
    expect(띠들[1]).toBe('var(--pass)');
    expect(띠들[2]).toBe('var(--fail)');
  });
});

describe('ScenarioRunList 집계 띠', () => {
  it('기능 · UI 탭처럼 머리 집계 띠가 없다 (실행 §8.7 「A안」)', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    expect(container.querySelector('.stats')).toBeNull();
  });
});

describe('ScenarioRunList 빈 목록', () => {
  it('조건이 없으면 시나리오 목록으로 이끈다', async () => {
    await 그리기(빈쪽(빈집계));

    expect(await screen.findByText(/이 애플리케이션에서 아직 돌린 E2E 시나리오가 없습니다/)).toBeTruthy();
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

describe('ScenarioRunList 오른쪽 결과 칸 (실행 §8.7 「A안」)', () => {
  it('주소에 실행이 없으면 맨 위 줄을 결과 칸에 연다 — 주소에는 적지 않는다', async () => {
    const { container, 결과 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 11/);

    expect(결과).toHaveBeenCalledWith(11);
    expect(줄들(container)[0]?.getAttribute('aria-current')).toBe('true');
    expect(container.querySelector('.runs-split.picked')).toBeNull();
    expect(window.location.hash).toBe('#/runs/e2e');
  });

  it('줄을 누르면 화면을 떠나지 않고 결과 칸이 그 실행으로 바뀌며 주소에 남는다 — 상자도 「결과 보기」도 없다', async () => {
    const { container, 결과 } = await 그리기();
    await screen.findByText(/ZSL 시나리오 12/);

    expect(screen.queryByRole('button', { name: '결과 보기' })).toBeNull();
    fireEvent.click(줄들(container)[1]!);

    await waitFor(() => expect(결과).toHaveBeenCalledWith(12));
    expect(window.location.hash).toBe('#/runs/e2e?run=12');
    expect(줄들(container)[1]?.getAttribute('aria-current')).toBe('true');
    expect(container.querySelector('.runs-split.picked')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('주소의 실행과 거르개로 연다 — 조건 밖이면 까닭을 한 줄 적는다', async () => {
    window.location.hash = '#/runs/e2e?run=5&state=failed&page=2';
    const { 스파이, 결과 } = await 그리기();

    expect(스파이).toHaveBeenCalledWith('ZSL', 2, { state: 'failed' });
    await waitFor(() => expect(결과).toHaveBeenCalledWith(5));
    expect(await screen.findByText('고른 실행은 지금 조건 밖입니다')).toBeTruthy();
  });

  it('결과 칸에서 다시 실행하면 첫 쪽으로 돌아가 새 실행을 고른다 — 뒤쪽에 머물면 고른 줄이 목록에 없다', async () => {
    window.location.hash = '#/runs/e2e?run=12&page=2';
    const { 스파이, 결과 } = await 그리기();
    결과.mockResolvedValue(시나리오결과());
    vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 99 });
    fireEvent.click(await screen.findByRole('button', { name: 'qa에서 다시 실행' }));

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZSL', 1, {}));
    expect(window.location.hash).toBe('#/runs/e2e?run=99');
  });

  it('「목록으로」를 누르면 고른 실행을 풀어 좁은 창에서 목록이 다시 보인다', async () => {
    window.location.hash = '#/runs/e2e?run=12';
    const { container } = await 그리기();
    await screen.findByText(/ZSL 시나리오 12/);

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));

    expect(container.querySelector('.runs-split.picked')).toBeNull();
    expect(window.location.hash).toBe('#/runs/e2e');
  });
});

describe('ScenarioRunList 결과 칸 권한', () => {
  it('결과 칸 버튼은 띠가 아니라 그 시나리오 실행의 케이스 애플리케이션 권한으로 가른다', async () => {
    window.location.hash = '#/runs/e2e?run=12';
    vi.spyOn(scenarioApi, 'runs').mockResolvedValue(한쪽);
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(시나리오결과());
    const 보기만: 판정 = () => false;
    render(<ScenarioRunList service="ZSL" 판정하기={(접두사) => (접두사 === 'XSX' ? 보기만 : 운영)} />);

    await screen.findAllByText(/결제 시나리오/);
    expect(screen.queryByRole('button', { name: 'qa에서 다시 실행' })).toBeNull();
  });
});
