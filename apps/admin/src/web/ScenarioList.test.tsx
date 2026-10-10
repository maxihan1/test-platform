// @vitest-environment jsdom
// E2E 시나리오 목록 화면 검사 (도메인/시나리오 §8.11 · 실행 §8.7)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type EnvRow } from './api.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';
import { ScenarioList } from './ScenarioList.js';

const 운영: 판정 = () => true;
const 읽기만: 판정 = () => false;
const 서버들: EnvRow[] = [
  { env: 'qa', baseUrl: 'https://qa.example.com' },
  { env: 'stg', baseUrl: 'https://stg.example.com' },
];
const 서버없음글자 = '이 서비스에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다';
const 서버고르기글자 = '대상 서버를 고르세요. 증적에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

function 줄(id: number, 덮: Partial<ScenarioRow> = {}): ScenarioRow {
  return {
    id,
    name: `ZSM 시나리오 ${id}`,
    platform: 'desktop',
    version: 2,
    partCount: 3,
    isActive: true,
    needsCheck: false,
    runnable: true,
    lastRun: null,
    ...덮,
  };
}

const 지난실행 = (덮: Partial<NonNullable<ScenarioRow['lastRun']>> = {}): NonNullable<ScenarioRow['lastRun']> => ({
  runId: 90,
  status: 'FINISHED',
  verdict: 'PASS',
  finishedAt: '2026-10-06T00:10:00.000Z',
  unconfirmed: false,
  ...덮,
});

async function 그리기(items: ScenarioRow[], 할수: 판정 = 운영, envs: EnvRow[] = 서버들) {
  const 스파이 = vi.spyOn(scenarioApi, 'list').mockResolvedValue({ items });
  const 것 = render(<ScenarioList service="ZSM" envs={envs} 할수={할수} />);
  await waitFor(() => expect(스파이).toHaveBeenCalledWith('ZSM'));
  return { ...것, 스파이 };
}

function 행(container: HTMLElement, n: number): HTMLElement {
  return container.querySelectorAll('.row')[n] as HTMLElement;
}

describe('ScenarioList 머리 · 표머리', () => {
  it('제목 · 부제와 쓰기 권한이 있으면 새 시나리오 링크가 있다', async () => {
    const { container } = await 그리기([줄(1)]);
    await screen.findByText(/ZSM 시나리오 1/);

    const 머리 = container.querySelector('.head');
    expect(머리?.querySelector('h1')?.textContent).toBe('E2E 시나리오');
    expect(머리?.querySelector('.head-meta')?.textContent).toBe(
      '기능 테스트 스크립트를 차례로 실행해 흐름이 끊기지 않는지 확인합니다',
    );
    expect(screen.getByRole('link', { name: '새 시나리오' }).getAttribute('href')).toBe('#/scenarios/new');
  });

  it('쓰기 권한이 없으면 새 시나리오 · 실행 · 대상 서버 고르개를 안 그린다', async () => {
    await 그리기([줄(1)], 읽기만);
    await screen.findByText(/ZSM 시나리오 1/);

    expect(screen.queryByRole('link', { name: '새 시나리오' })).toBeNull();
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('표머리가 셋이다', async () => {
    await 그리기([줄(1)]);
    expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual(['번호', '이름', '결과']);
  });
});

describe('ScenarioList 줄', () => {
  it('번호 · 이름 링크 · 단계 수 · 버전 · 실행 전을 적는다', async () => {
    const { container } = await 그리기([줄(7)]);
    await screen.findByText(/ZSM 시나리오 7/);

    const 첫 = 행(container, 0);
    expect(첫.querySelector('.tcid')?.textContent).toBe('SC-7');
    expect(within(첫).getByRole('link', { name: 'ZSM 시나리오 7' }).getAttribute('href')).toBe('#/scenarios/7');
    expect(첫.querySelector('.title small')?.textContent).toBe('단계 3개 · v2 · 실행 전');
    expect(첫.querySelector('.scenario-result')?.textContent).toBe('');
  });

  it('마지막 실행이 있으면 끝난 때를 적고 결과에서 그 실행으로 잇는다', async () => {
    const { container } = await 그리기([줄(7, { lastRun: 지난실행() })]);
    await screen.findByText(/ZSM 시나리오 7/);

    const 첫 = 행(container, 0);
    expect(첫.querySelector('.title small')?.textContent).not.toContain('실행 전');
    expect(첫.querySelector('.title small')?.textContent).toContain('2026');
    expect(within(첫).getByText('통과')).toBeTruthy();
    expect(within(첫).getByRole('link', { name: /통과/ }).getAttribute('href')).toBe('#/runs/90');
  });

  it('도는 중이면 마지막 실행 칸도 결과 칸도 실행 중이고 판정 배지가 아니다', async () => {
    const { container } = await 그리기([
      줄(7, { lastRun: 지난실행({ status: 'RUNNING', verdict: null, finishedAt: null }) }),
    ]);
    await screen.findByText(/ZSM 시나리오 7/);

    const 첫 = 행(container, 0);
    expect(첫.querySelector('.title small')?.textContent).toBe('단계 3개 · v2 · 실행 중');
    expect(첫.querySelector('.verdict')).toBeNull();
    expect(첫.querySelector('.scenario-result')?.textContent).toBe('실행 중');
    expect(첫.querySelector('a[href="#/runs/90"]')).toBeTruthy();
  });

  it('통과 · 실패 · 미실행은 판정 배지다', async () => {
    const { container } = await 그리기([
      줄(1, { lastRun: 지난실행({ runId: 91 }) }),
      줄(2, { lastRun: 지난실행({ runId: 92, verdict: 'FAIL' }) }),
      줄(3, { lastRun: 지난실행({ runId: 93, verdict: 'NA' }) }),
    ]);
    await screen.findByText(/ZSM 시나리오 1/);

    expect(행(container, 0).querySelector('.verdict.v-pass')?.textContent).toBe('통과');
    expect(within(행(container, 1)).getByText('실패')).toBeTruthy();
    expect(within(행(container, 2)).getByText('미실행')).toBeTruthy();
  });

  it('미확정이 섞여도 통과는 통과 배지이고 「미확정」 꼬리표만 곁들인다', async () => {
    const { container } = await 그리기([
      줄(1, { lastRun: 지난실행({ unconfirmed: true }) }),
      줄(2, { lastRun: 지난실행({ runId: 91, verdict: 'FAIL', unconfirmed: true }) }),
    ]);
    await screen.findByText(/ZSM 시나리오 1/);

    const 첫 = 행(container, 0);
    expect(첫.querySelector('.case-tag')?.textContent).toBe('미확정');
    expect(within(첫).getByText('통과')).toBeTruthy();
    expect(첫.querySelector('a[href="#/runs/90"]')).toBeTruthy();
    expect(within(행(container, 1)).getByText('실패')).toBeTruthy();
    expect(행(container, 1).querySelector('.case-tag')?.textContent).toBe('미확정');
  });

  it('확인 필요 · 실행 불가 칩을 단다', async () => {
    const { container } = await 그리기([
      줄(1, { needsCheck: true }),
      줄(2, { runnable: false }),
      줄(3),
    ]);
    await screen.findByText(/ZSM 시나리오 1/);

    expect(행(container, 0).querySelector('.title .case-tag')?.textContent).toBe('확인 필요');
    expect(행(container, 1).querySelector('.title .case-tag')?.textContent).toBe('실행 불가');
    expect(행(container, 2).querySelector('.case-tag')).toBeNull();
  });

  it('실행 불가 · 꺼진 시나리오 줄에는 실행 버튼이 없다', async () => {
    const { container } = await 그리기([줄(1), 줄(2, { runnable: false }), 줄(3, { isActive: false })]);
    await screen.findByText(/ZSM 시나리오 1/);

    expect(within(행(container, 0)).getByRole('button', { name: '실행' })).toBeTruthy();
    expect(within(행(container, 1)).queryByRole('button', { name: '실행' })).toBeNull();
    expect(within(행(container, 2)).queryByRole('button', { name: '실행' })).toBeNull();
  });
});

describe('ScenarioList 실행', () => {
  it('대상 서버 고르개는 기본값이 없다', async () => {
    await 그리기([줄(1)]);
    await screen.findByText(/ZSM 시나리오 1/);

    const 고르개 = screen.getByRole('combobox', { name: '대상 서버' }) as HTMLSelectElement;
    expect(고르개.value).toBe('');
    expect([...고르개.options].map((o) => o.value)).toEqual(['', 'qa', 'stg']);
  });

  it('대상 서버 없이 실행하면 그 줄 아래에 문장을 보이고 부르지 않는다', async () => {
    const 실행 = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 5 });
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);

    fireEvent.click(within(행(container, 0)).getByRole('button', { name: '실행' }));

    const 알림 = await screen.findByText(서버고르기글자);
    expect(행(container, 0).nextElementSibling).toBe(알림);
    expect(실행).not.toHaveBeenCalled();
    expect((within(행(container, 0)).getByRole('button', { name: '실행' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('고르고 실행하면 서버를 부르고 실행 화면으로 간다', async () => {
    const 실행 = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 55 });
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);

    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'stg' } });
    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '실행' }));

    await waitFor(() => expect(window.location.hash).toBe('#/runs/55'));
    expect(실행).toHaveBeenCalledWith(2, 'stg');
  });

  it('서버가 거절하면 그 문장을 그 줄 아래에 보인다', async () => {
    vi.spyOn(scenarioApi, 'run').mockRejectedValue(new ApiError(409, 'SCENARIO_NOT_RUNNABLE', ''));
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);

    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'qa' } });
    fireEvent.click(within(행(container, 0)).getByRole('button', { name: '실행' }));

    const 알림 = await screen.findByText('지금은 실행할 수 없는 시나리오입니다');
    expect(행(container, 0).nextElementSibling).toBe(알림);
    expect(window.location.hash).toBe('');
  });

  it('대상 서버가 하나도 없으면 고르개 대신 안내 문장이다', async () => {
    await 그리기([줄(1)], 운영, []);
    await screen.findByText(/ZSM 시나리오 1/);

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(서버없음글자)).toBeTruthy();
  });
});

describe('ScenarioList 빈 목록 · 오류', () => {
  it('빈 목록이면 안내와 새 시나리오 링크가 있다', async () => {
    await 그리기([]);

    expect(await screen.findByText(/아직 만든 시나리오가 없습니다/)).toBeTruthy();
    expect(screen.getByText('기능 테스트 스크립트를 단계로 이어 붙여 만듭니다')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: '새 시나리오' }).length).toBeGreaterThan(0);
  });

  it('빈 목록이어도 쓰기 권한이 없으면 새 시나리오 링크가 없다', async () => {
    await 그리기([], 읽기만);
    await screen.findByText(/아직 만든 시나리오가 없습니다/);
    expect(screen.queryByRole('link', { name: '새 시나리오' })).toBeNull();
  });

  it('서버 오류면 실패 화면이다', async () => {
    vi.spyOn(scenarioApi, 'list').mockRejectedValue(new ApiError(500, 'INTERNAL', 'boom'));
    const { container } = render(<ScenarioList service="ZSM" envs={서버들} 할수={운영} />);

    await waitFor(() => expect(container.querySelector('.row')).toBeNull());
    expect(await screen.findByText('boom')).toBeTruthy();
  });
});
