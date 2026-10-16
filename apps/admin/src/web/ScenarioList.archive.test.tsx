// @vitest-environment jsdom
// E2E 시나리오 목록의 치우기 버튼과 확인 상자 검사 (도메인/시나리오 §8.11 「목록」 · DESIGN.md 「모달」 ①)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type EnvRow } from './api.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';
import { ScenarioList } from './ScenarioList.js';

const 운영: 판정 = () => true;
const 읽기만: 판정 = () => false;
const 서버들: EnvRow[] = [{ env: 'qa', baseUrl: 'https://qa.example.com' }];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

async function 그리기(items: ScenarioRow[], 할수: 판정 = 운영) {
  const 목록 = vi.spyOn(scenarioApi, 'list').mockResolvedValue({ items });
  const 것 = render(<ScenarioList service="ZSM" envs={서버들} 할수={할수} />);
  await screen.findByText(/ZSM 시나리오 1/);
  return { ...것, 목록 };
}

function 행(container: HTMLElement, n: number): HTMLElement {
  return container.querySelectorAll('.row')[n] as HTMLElement;
}

describe('ScenarioList 치우기', () => {
  it('쓰기 권한이 있으면 실행 불가 줄까지 줄마다 치우기 버튼이 있다', async () => {
    const { container } = await 그리기([줄(1), 줄(2, { runnable: false })]);

    expect(within(행(container, 0)).getByRole('button', { name: '치우기' })).toBeTruthy();
    expect(within(행(container, 1)).getByRole('button', { name: '치우기' })).toBeTruthy();
  });

  it('쓰기 권한이 없으면 치우기 버튼이 없다', async () => {
    await 그리기([줄(1)], 읽기만);

    expect(screen.queryByRole('button', { name: '치우기' })).toBeNull();
  });

  it('누르면 확인 상자가 뜨고 첫 포커스는 취소다. 취소하면 부르지 않고 닫힌다', async () => {
    const 치움 = vi.spyOn(scenarioApi, 'archive').mockResolvedValue(undefined);
    const { container } = await 그리기([줄(1), 줄(2)]);

    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '치우기' }));

    const 상자 = screen.getByRole('dialog', { name: 'SC-2 을 목록에서 치울까요?' });
    expect(상자.textContent).toContain('ZSM 시나리오 2');
    expect(상자.textContent).toContain('지난 실행 기록과 증적은 그대로 남습니다.');
    expect(상자.textContent).toContain('치운 시나리오는 다시 꺼낼 수 없습니다.');
    expect(document.activeElement).toBe(within(상자).getByRole('button', { name: '취소' }));

    fireEvent.click(within(상자).getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(치움).not.toHaveBeenCalled();
  });

  it('상자에서 치우기를 누르면 서버를 부르고 목록을 다시 받아 그 줄이 사라진다', async () => {
    const 치움 = vi.spyOn(scenarioApi, 'archive').mockResolvedValue(undefined);
    const { container, 목록 } = await 그리기([줄(1), 줄(2)]);
    목록.mockResolvedValue({ items: [줄(1)] });

    fireEvent.click(within(행(container, 1)).getByRole('button', { name: '치우기' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '치우기' }));

    await waitFor(() => expect(screen.queryByText(/ZSM 시나리오 2/)).toBeNull());
    expect(치움).toHaveBeenCalledWith(2);
    expect(목록).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('서버가 거절하면 상자 안에 그 문장을 보이고 줄은 그대로다', async () => {
    vi.spyOn(scenarioApi, 'archive').mockRejectedValue(new ApiError(404, 'SCENARIO_NOT_FOUND', ''));
    const { container, 목록 } = await 그리기([줄(1)]);

    fireEvent.click(within(행(container, 0)).getByRole('button', { name: '치우기' }));
    const 상자 = screen.getByRole('dialog');
    fireEvent.click(within(상자).getByRole('button', { name: '치우기' }));

    expect(await within(상자).findByText('그 시나리오를 찾지 못했습니다')).toBeTruthy();
    expect((within(상자).getByRole('button', { name: '치우기' }) as HTMLButtonElement).disabled).toBe(false);
    expect(목록).toHaveBeenCalledTimes(1);
    expect(행(container, 0).textContent).toContain('ZSM 시나리오 1');
  });
});
