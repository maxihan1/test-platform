// @vitest-environment jsdom
// E2E 시나리오 목록 화면 검사 (도메인/시나리오 §8.11 · 실행 §8.7)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type EnvRow } from './api.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow, type ScenarioRunResult } from './scenarioApi.js';
import { ScenarioList } from './ScenarioList.js';

const 운영: 판정 = () => true;
const 읽기만: 판정 = () => false;
const 서버들: EnvRow[] = [
  { env: 'qa', baseUrl: 'https://qa.example.com' },
  { env: 'stg', baseUrl: 'https://stg.example.com' },
];
const 서버없음글자 = '이 애플리케이션에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다';
const 서버고르기글자 = '대상 서버를 선택하세요. 리포트에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
  localStorage.clear();
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

const 도는결과 = (): ScenarioRunResult => ({
  scenarioId: 2,
  version: 2,
  status: 'RUNNING',
  platform: 'desktop',
  title: 'ZSM 시나리오 2',
  env: 'stg',
  baseUrl: 'https://stg.example.com',
  triggeredBy: 'zsm',
  triggeredByName: null,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  parts: [],
  evidence: [],
  live: true,
});

function 창열기준비() {
  vi.spyOn(scenarioApi, 'result').mockResolvedValue(도는결과());
  vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
}

const 확인상자 = () => within(screen.getByRole('dialog', { name: '정식 실행을 시작할까요?' }));

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
    expect(within(첫).getByRole('link', { name: /통과/ }).getAttribute('href')).toBe('#/runs/90?from=scenarios');
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
    expect(첫.querySelector('a[href="#/runs/90?from=scenarios"]')).toBeTruthy();
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
    expect(첫.querySelector('a[href="#/runs/90?from=scenarios"]')).toBeTruthy();
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
  it('이 애플리케이션에서 마지막에 고른 대상 서버로 열린다 — 기본값이 아니라 사람이 고른 값이다 (공통/5-화면공통 §8)', async () => {
    await 그리기([줄(1)]);
    await screen.findByText(/ZSM 시나리오 1/);
    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'stg' } });
    cleanup();

    await 그리기([줄(1)]);
    await screen.findByText(/ZSM 시나리오 1/);
    expect((screen.getByRole('combobox', { name: '대상 서버' }) as HTMLSelectElement).value).toBe('stg');
  });

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

  it('실행을 누르면 시작 확인 상자가 먼저 뜨고 취소하면 서버를 안 부른다', async () => {
    const 실행 = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 55 });
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);

    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'stg' } });
    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '실행' }));

    const 상자 = 확인상자();
    expect(상자.getByText('완료되면 실행 기록 E2E 에 남고 리포트를 만들 수 있습니다')).toBeTruthy();
    expect(상자.getByText('SC-2 ZSM 시나리오 2 · 3단계')).toBeTruthy();
    expect(상자.getByText('PC')).toBeTruthy();
    expect(상자.getByText('stg')).toBeTruthy();
    expect(document.activeElement).toBe(상자.getByRole('button', { name: '취소' }));
    expect(실행).not.toHaveBeenCalled();

    fireEvent.click(상자.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(실행).not.toHaveBeenCalled();
  });

  it('확인 상자에서 실행 시작을 누르면 서버를 부르고 화면을 옮기지 않고 E2E 실행 창을 띄운다', async () => {
    const 실행 = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 55 });
    창열기준비();
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);

    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'stg' } });
    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '실행' }));
    fireEvent.click(확인상자().getByRole('button', { name: '실행 시작' }));

    expect(await screen.findByRole('dialog', { name: 'E2E 실행 중 · RUN 55' })).toBeTruthy();
    expect(실행).toHaveBeenCalledWith(2, 'stg', 'server');
    expect(window.location.hash).toBe('');
    expect(screen.queryByRole('radiogroup', { name: '모바일 웹' })).toBeNull();
  });

  it('실행 창을 닫아도 실행은 계속되고, 도는 중에는 바닥에 그 안내와 실행 중단이 있다', async () => {
    vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 55 });
    창열기준비();
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);
    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'stg' } });
    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '실행' }));
    fireEvent.click(확인상자().getByRole('button', { name: '실행 시작' }));

    const 창 = within(await screen.findByRole('dialog', { name: 'E2E 실행 중 · RUN 55' }));
    expect(창.getByText('닫아도 실행은 계속되고 완료되면 알림이 옵니다')).toBeTruthy();
    expect(창.getByRole('button', { name: '실행 중단' })).toBeTruthy();

    fireEvent.click(창.getByRole('button', { name: '닫기' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('줄에는 「실행」만 서고 위험한 「삭제」는 줄 끝 「⋯」 안에 있다 (점검표 D10)', async () => {
    const { container } = await 그리기([줄(1)]);
    await screen.findByText(/ZSM 시나리오 1/);

    const 칸 = 행(container, 0).querySelector('.scn-row-acts')!;
    const 바로보이는 = [...칸.children].filter((el) => el.tagName === 'BUTTON').map((b) => b.textContent);
    expect(바로보이는).toEqual(['실행']);
    expect(칸.querySelector('details.scn-more summary')?.getAttribute('aria-label')).toBe('SC-1 더 보기');
    expect(칸.querySelector('details.scn-more button')?.textContent).toBe('삭제');
  });

  it('모바일 시나리오가 있으면 모바일 웹 실행 위치를 고르고, 기본은 서버 흉내다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)', async () => {
    const 실행 = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 56 });
    창열기준비();
    const { container } = await 그리기([줄(1), 줄(2, { platform: 'mobile' })]);
    await screen.findByText(/ZSM 시나리오 1/);
    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'qa' } });

    expect((screen.getByRole('radio', { name: '가상 디바이스' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '실제 디바이스' }));
    // 시나리오는 폰을 한 번 잡는다 — 케이스 글(「케이스마다 …」)이 아니다
    expect(screen.getByText('시나리오 하나 동안 유휴 디바이스를 한 번 할당받고 모두 실행하면 반납합니다. 화면 영상과 logcat 은 통과하지 못한 실행에 남습니다')).toBeTruthy();
    expect(screen.queryByText(/케이스마다 빈 폰을/)).toBeNull();
    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '실행' }));
    expect(확인상자().getByText('모바일 (실제 디바이스)')).toBeTruthy();
    fireEvent.click(확인상자().getByRole('button', { name: '실행 시작' }));

    await waitFor(() => expect(실행).toHaveBeenCalledWith(2, 'qa', 'vision'));
    fireEvent.click(screen.getByRole('button', { name: '창 닫기' }));
    fireEvent.click(within(행(container, 0)).getByRole('button', { name: '실행' }));
    fireEvent.click(확인상자().getByRole('button', { name: '실행 시작' }));
    await waitFor(() => expect(실행).toHaveBeenLastCalledWith(1, 'qa', 'server'));
  });

  it('서버가 거절하면 그 문장을 그 줄 아래에 보인다', async () => {
    vi.spyOn(scenarioApi, 'run').mockRejectedValue(new ApiError(409, 'SCENARIO_NOT_RUNNABLE', ''));
    const { container } = await 그리기([줄(1), 줄(2)]);
    await screen.findByText(/ZSM 시나리오 1/);

    fireEvent.change(screen.getByRole('combobox', { name: '대상 서버' }), { target: { value: 'qa' } });
    fireEvent.click(within(행(container, 0)).getByRole('button', { name: '실행' }));
    fireEvent.click(확인상자().getByRole('button', { name: '실행 시작' }));

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
