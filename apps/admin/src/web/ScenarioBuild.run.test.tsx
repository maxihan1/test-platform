// @vitest-environment jsdom
// E2E 조립 화면의 정식 실행 — 실행 · 저장하고 실행 · 주소의 단계 열기 (도메인/시나리오 §8.11 「조립」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError, type User } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { 서비스, 사람, 재료, 기존그리기, 바꾸기, 케이스단계, 케이스목록막기, 케이스더하기 } from './ScenarioBuild.fixture.js';

const 서버있는사람 = (): User => {
  const 기본 = 사람();
  return { ...기본, services: 기본.services.map((s) => ({ ...s, envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }] })) };
};

function 서버고르기() {
  fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
}

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.location.hash = '';
});

describe('ScenarioBuild 정식 실행', () => {
  it('저장한 그대로면 「실행」이 저장 없이 실행을 걸고 결과로 옮긴다. 돌아갈 곳은 이 시나리오다', async () => {
    await 기존그리기({}, 서버있는사람());
    const update = vi.spyOn(scenarioApi, 'update');
    const run = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 501 });
    서버고르기();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/501?from=scenario'));
    expect(run).toHaveBeenCalledWith(12, 'qa');
    expect(update).not.toHaveBeenCalled();
  });

  it('고친 게 있으면 「저장하고 실행」이 저장한 뒤 실행한다', async () => {
    await 기존그리기({}, 서버있는사람());
    const update = vi.spyOn(scenarioApi, 'update').mockResolvedValue({ version: 4 });
    const run = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 502 });
    바꾸기('새 이름');
    서버고르기();
    fireEvent.click(screen.getByRole('button', { name: '저장하고 실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/502?from=scenario'));
    expect(update).toHaveBeenCalledWith(12, expect.objectContaining({ name: '새 이름', baseVersion: 3 }));
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0] ?? 0);
  });

  it('빈 칸이 남은 단계가 있으면 실행하지 않고 그 단계 번호를 알린다 — 저장한 그대로여도 그렇다', async () => {
    await 기존그리기({ parts: [{ kind: 'mock', urlPattern: '', status: 200, contentType: 'application/json', body: '{}' }] }, 서버있는사람());
    const run = vi.spyOn(scenarioApi, 'run');
    서버고르기();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect((await screen.findByRole('alert')).textContent).toBe('1번 단계의 잘못 적은 칸을 고쳐야 실행할 수 있습니다');
    expect(run).not.toHaveBeenCalled();
  });

  it('서버가 둘 이상인데 안 고르면 서버를 부르지 않고 고르라는 문장만 뜬다', async () => {
    const 기본 = 사람();
    const envs = [{ env: 'qa', baseUrl: 'https://qa.example.com' }, { env: 'stg', baseUrl: 'https://stg.example.com' }];
    await 기존그리기({}, { ...기본, services: 기본.services.map((s) => ({ ...s, envs })) });
    const run = vi.spyOn(scenarioApi, 'run');
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect((await screen.findByRole('alert')).textContent).toBe('실행할 대상 서버를 먼저 고릅니다');
    expect(run).not.toHaveBeenCalled();
  });

  it('애플리케이션을 섞은 시나리오는 든 애플리케이션 모두에 있는 서버 이름만 고를 수 있고, 없는 이름은 사유와 함께 막힌다 (결정 13)', async () => {
    const 기본 = 사람();
    const 섞인사람: User = {
      ...기본,
      services: [
        { ...기본.services[0]!, envs: [{ env: 'qa', baseUrl: 'https://qa.zsb' }, { env: 'stg', baseUrl: 'https://stg.zsb' }] },
        { ...기본.services[1]!, envs: [{ env: 'stg', baseUrl: 'https://stg.zsc' }] },
      ],
    };
    await 기존그리기({ parts: [케이스단계('ZSB-001'), 케이스단계('ZSC-001')] }, 섞인사람);
    const run = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 503 });

    expect((screen.getByRole('option', { name: 'qa · ZSC에 없음' }) as HTMLOptionElement).disabled).toBe(true);
    // 단계가 섞이기 전에 골랐던 서버는 막힌 이름이 되면 고른 것으로 치지 않는다
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'stg' } });
    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(12, 'stg'));
  });

  it('이미 고른 서버가 섞인 단계 때문에 막히면 고르지 않은 것으로 돌아가 고르라는 문장이 뜬다', async () => {
    window.localStorage.setItem('대상서버:ZSB', 'qa');
    const 기본 = 사람();
    const 섞인사람: User = {
      ...기본,
      services: [
        { ...기본.services[0]!, envs: [{ env: 'qa', baseUrl: 'https://qa.zsb' }] },
        { ...기본.services[1]!, envs: [{ env: 'stg', baseUrl: 'https://stg.zsc' }] },
      ],
    };
    await 기존그리기({ parts: [케이스단계('ZSB-001'), 케이스단계('ZSC-001')] }, 섞인사람);
    const run = vi.spyOn(scenarioApi, 'run');

    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    expect((await screen.findByRole('alert')).textContent).toBe('실행할 대상 서버를 먼저 고릅니다');
    expect(run).not.toHaveBeenCalled();
  });

  it('실행이 거절되면 그 문장을 보이고 화면에 남는다', async () => {
    await 기존그리기({}, 서버있는사람());
    vi.spyOn(scenarioApi, 'run').mockRejectedValue(new ApiError(409, 'SCENARIO_NOT_RUNNABLE', '실행할 수 없는 시나리오다: 1번 단계'));
    서버고르기();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect((await screen.findByRole('alert')).textContent).toContain('실행할 수 없는 시나리오다');
    expect(window.location.hash).toBe('');
  });

  it('새 시나리오를 저장한 뒤 실행만 실패하면 저장된 주소로 옮긴다', async () => {
    케이스목록막기('ZSB-001');
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 40, version: 1 });
    vi.spyOn(scenarioApi, 'run').mockRejectedValue(new ApiError(409, 'SCENARIO_NOT_RUNNABLE', '실행할 수 없다'));
    render(<ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={서버있는사람()} />);
    바꾸기('새 흐름');
    await 케이스더하기('ZSB-001');
    서버고르기();
    fireEvent.click(screen.getByRole('button', { name: '저장하고 실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/scenarios/40'));
  });

  it('주소에 step 이 있으면 그 단계 설정을 연 채로 연다', async () => {
    window.location.hash = '#/scenarios/12?step=2';
    await 기존그리기({}, 서버있는사람());
    expect(await screen.findByRole('tab', { name: '2번 설정' })).toBeTruthy();
  });

  it('변경 이력 단추는 머리에 없고 오른쪽 탭 하나다', async () => {
    await 기존그리기();
    expect(screen.queryByRole('button', { name: '변경 이력' })).toBeNull();
    expect(screen.getByRole('tab', { name: '변경 이력' })).toBeTruthy();
  });

  it('읽기만 하는 사람에게는 실행 단추가 없다', async () => {
    await 기존그리기({}, 사람('read'));
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
  });
});
