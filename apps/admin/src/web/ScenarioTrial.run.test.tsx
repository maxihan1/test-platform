// @vitest-environment jsdom
// E2E 시나리오 시험 실행 검사 ② — 시작 · 2초 묻기 · 이어 묻기 · 열쇠 옮기기 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { 서비스, 사람, 케이스단계, 단계셋, 상세, 재료, 실패결과, 통과결과, 기존그리기, 흘리기, 서버고르기, 시험누르기, 탭 } from './ScenarioTrial.fixture.js';

const 심기 = vi.hoisted(() => ({ 단계들: null as ScenarioPart[] | null, 재료: [] as string[] }));
vi.mock('./useScenarioDraft.js', async (원래) => {
  const 본 = await 원래<typeof import('./useScenarioDraft.js')>();
  const { useEffect } = await import('react');
  return {
    ...본,
    useScenarioDraft: (...인자: Parameters<typeof 본.useScenarioDraft>) => {
      const 초안 = 본.useScenarioDraft(...인자);
      useEffect(() => {
        if (심기.단계들 !== null) 초안.단계들바꾸기(심기.단계들);
        심기.재료.forEach((n) => 초안.재료더하기(n));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return 초안;
    },
  };
});

afterEach(() => {
  심기.단계들 = null;
  심기.재료 = [];
  떠나기막기(null);
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.location.hash = '';
  sessionStorage.clear();
});

describe('시험 실행 돌리기', () => {
  it('본문을 보내고 2초마다 묻다가 FINISHED 가 오면 멈춘다', async () => {
    await 기존그리기();
    const start = vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-1' });
    const trial = vi
      .spyOn(scenarioApi, 'trial')
      .mockResolvedValueOnce({ status: 'RUNNING' })
      .mockResolvedValueOnce({ status: 'RUNNING' })
      .mockResolvedValue({ status: 'FINISHED', result: 통과결과 });
    vi.useFakeTimers();
    서버고르기('stg');

    await 시험누르기();

    expect(start).toHaveBeenCalledWith({ service: 'ZSB', env: 'stg', platform: 'desktop', parts: 단계셋 });
    expect(screen.getAllByRole('status').some((e) => e.textContent === '시험 실행 중입니다')).toBe(true);
    expect((screen.getByRole('button', { name: '시험 실행 중' }) as HTMLButtonElement).disabled).toBe(true);
    expect(trial).not.toHaveBeenCalled();

    await 흘리기(2000);
    expect(trial).toHaveBeenCalledTimes(1);
    expect(trial).toHaveBeenLastCalledWith('t-1');
    await 흘리기(2000);
    expect(trial).toHaveBeenCalledTimes(2);
    await 흘리기(2000);
    expect(trial).toHaveBeenCalledTimes(3);
    await 흘리기(20000);
    expect(trial).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('시험 실행 중입니다')).toBeNull();
    expect(screen.getByRole('button', { name: '시험 실행' })).toBeTruthy();
  });

  it('누르면 시험 결과 탭이 열린다', async () => {
    const { container } = await 기존그리기();
    vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-1' });
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'RUNNING' });
    vi.useFakeTimers();
    서버고르기('stg');

    await 시험누르기();

    expect(탭(container)).toBe('trial');
  });

  it('sessionStorage 에 시험 번호가 있으면 화면이 열릴 때 이어 묻고 결과를 받는다', async () => {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-9', env: 'stg' }));
    const trial = vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'FINISHED', result: 실패결과 });

    await 기존그리기();

    expect(await screen.findByText('시험 실행 · stg · 3.40초')).toBeTruthy();
    expect(trial).toHaveBeenCalledWith('t-9');
  });

  it('새 시나리오를 저장하면 new 열쇠의 시험 번호가 새 번호 열쇠로 옮겨진다', async () => {
    심기.단계들 = [케이스단계('ZSB-001')];
    심기.재료 = ['ZSB-001'];
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-n' });
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'RUNNING' });
    vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 55, version: 1 });
    render(<ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={사람()} />);
    await waitFor(() => expect(screen.getByText('저장 안 된 변경 있음')).toBeTruthy());
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '새 흐름' } });
    서버고르기('stg');
    await 시험누르기();
    expect(JSON.parse(sessionStorage.getItem('scn-trial:new') ?? 'null')).toEqual({ trialId: 't-n', env: 'stg' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
    });
    await 흘리기(0);

    expect(sessionStorage.getItem('scn-trial:new')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('scn-trial:55') ?? 'null')).toEqual({ trialId: 't-n', env: 'stg' });
  });

  it('StrictMode 로 그려 이어 묻기가 두 줄로 시작돼도 2초 타이머는 한 줄만 돈다', async () => {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-9', env: 'stg' }));
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'RUNNING' });
    const 타이머들 = vi.spyOn(globalThis, 'setTimeout');
    const 이천 = () => 타이머들.mock.calls.filter((c) => c[1] === 2000).length;
    render(
      <StrictMode>
        <ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />
      </StrictMode>,
    );
    await screen.findByLabelText('시나리오 이름');
    await waitFor(() => expect(이천()).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((끝) => setTimeout(끝, 30));
    });

    expect(이천()).toBe(1);
  });

  it('새 시나리오 화면을 그리면 남아 있던 new 열쇠가 지워진다', async () => {
    sessionStorage.setItem('scn-trial:new', JSON.stringify({ trialId: 't-old', env: 'stg' }));
    const trial = vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'RUNNING' });

    render(<ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect(sessionStorage.getItem('scn-trial:new')).toBeNull();
    expect(trial).not.toHaveBeenCalled();
  });

  it('시험이 끝나 결과를 받으면 열쇠를 지우고 결과는 화면에 남는다', async () => {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-9', env: 'stg' }));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'FINISHED', result: 통과결과 });

    await 기존그리기();

    expect(await screen.findByText('시험 실행 · stg · 1.50초')).toBeTruthy();
    expect(sessionStorage.getItem('scn-trial:12')).toBeNull();
  });

  it('시작 응답이 늦는 사이 새 시나리오가 저장돼도 응답의 번호는 새 번호 열쇠에 적힌다', async () => {
    심기.단계들 = [케이스단계('ZSB-001')];
    심기.재료 = ['ZSB-001'];
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    let 응답하기: (값: { trialId: string }) => void = () => {};
    vi.spyOn(scenarioApi, 'startTrial').mockReturnValue(new Promise((끝) => (응답하기 = 끝)));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'RUNNING' });
    vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 55, version: 1 });
    render(<ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={사람()} />);
    await waitFor(() => expect(screen.getByText('저장 안 된 변경 있음')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '새 흐름' } });
    서버고르기('stg');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
    });
    await waitFor(() => expect(window.location.hash).toBe('#/scenarios/55'));

    await act(async () => {
      응답하기({ trialId: 't-late' });
    });

    expect(JSON.parse(sessionStorage.getItem('scn-trial:55') ?? 'null')).toEqual({ trialId: 't-late', env: 'stg' });
    expect(sessionStorage.getItem('scn-trial:new')).toBeNull();
  });

  it('404 TRIAL_NOT_FOUND 면 멈추고 열쇠를 지우고 이 화면 문장을 띄운다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-1' });
    const trial = vi.spyOn(scenarioApi, 'trial').mockRejectedValue(new ApiError(404, 'TRIAL_NOT_FOUND', 'gone'));
    vi.useFakeTimers();
    서버고르기('stg');
    await 시험누르기();

    await 흘리기(2000);
    await 흘리기(20000);

    expect(screen.getByText('시험 결과를 찾지 못했습니다. 시간이 지났거나 서버가 다시 켜졌을 수 있습니다')).toBeTruthy();
    expect(sessionStorage.getItem('scn-trial:12')).toBeNull();
    expect(trial).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('시험 실행 중입니다')).toBeNull();
  });

  it('시작 때 409 TRIAL_BUSY 는 이 화면 문장이다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'startTrial').mockRejectedValue(new ApiError(409, 'TRIAL_BUSY', 'busy'));
    vi.useFakeTimers();
    서버고르기('stg');

    await 시험누르기();

    expect(screen.getByText('이미 시험 실행이 돌고 있습니다. 끝나면 다시 실행할 수 있습니다')).toBeTruthy();
    expect(screen.queryByText('시험 실행 중입니다')).toBeNull();
  });

  it('시작 때 400 은 서버가 짚은 사유를 띄운다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'startTrial').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '3번 단계: 주소 형식'));
    vi.useFakeTimers();
    서버고르기('stg');

    await 시험누르기();

    expect(screen.getByText(/3번 단계: 주소 형식/)).toBeTruthy();
  });

  it('sessionStorage 쓰기가 막혀 던져도 시험 실행은 돌고 결과가 나온다', async () => {
    await 기존그리기();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('막힘');
    });
    vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-1' });
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'FINISHED', result: 통과결과 });
    vi.useFakeTimers();
    서버고르기('stg');

    await 시험누르기();
    expect(screen.getAllByRole('status').some((e) => e.textContent === '시험 실행 중입니다')).toBe(true);
    await 흘리기(2000);

    expect(screen.getByText('시험 실행 · stg · 1.50초')).toBeTruthy();
  });
});
