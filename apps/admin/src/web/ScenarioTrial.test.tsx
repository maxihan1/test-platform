// @vitest-environment jsdom
// E2E 시나리오 시험 실행 검사 — 대상 서버 · 시작 · 2초 묻기 · 이어 묻기 · 열쇠 옮기기 · 결과 탭 · 왼쪽 요약 (도메인/시나리오 §8.11)

import type { ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type ServiceRow, type User } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';

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

const 서비스 = (prefix: string, runs: 'read' | 'write' = 'write'): ServiceRow => ({
  id: 1,
  prefix,
  name: `${prefix} 서비스`,
  color: '#000',
  envs: prefix === 'ZSB' ? [{ env: 'stg', baseUrl: 'https://stg.example' }, { env: 'prod', baseUrl: 'https://prod.example' }] : [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs, authoring: 'read' },
});
const 사람 = (runs: 'read' | 'write' = 'write'): User => ({
  username: 'zsb',
  displayName: '조립자',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [서비스('ZSB', runs), 서비스('ZSC', runs)],
});

const 케이스단계 = (tcId: string, 덮: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...덮,
});

const 단계셋 = [케이스단계('ZSB-001'), 케이스단계('ZSB-002'), 케이스단계('ZSB-001')];

function 상세(parts: ScenarioPart[] = 단계셋): ScenarioDetail {
  return {
    id: 12,
    service: 'ZSB',
    name: 'ZSB 가입 흐름',
    platform: 'desktop',
    version: 3,
    parts,
    isActive: true,
    versions: [{ version: 3, savedBy: 'zsb', savedByName: '홍길동', savedAt: '2026-10-06T00:10:00.000Z' }],
    checks: [],
  };
}

const 재료 = (tcId: string): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
});

const 실패결과: ScenarioExecuteResponse = {
  status: 'FAIL',
  durationMs: 3400,
  parts: [
    { seq: 1, status: 'PASS', durationMs: 1200, steps: [], mocks: [] },
    {
      seq: 2,
      status: 'FAIL',
      durationMs: 2200,
      steps: [{ seq: 5, title: '결제한다', status: 'FAIL', durationMs: 10, assertions: [] }],
      mocks: [],
      error: { message: '기대 a\n실제 b' },
    },
    { seq: 3, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: 'NOT_RUN' } },
  ],
};
const 통과결과: ScenarioExecuteResponse = {
  status: 'PASS',
  durationMs: 1500,
  parts: [{ seq: 1, status: 'PASS', durationMs: 1500, steps: [], mocks: [] }],
};

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

async function 기존그리기(parts: ScenarioPart[] = 단계셋, user: User = 사람()) {
  vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세(parts));
  vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
  const 것 = render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={user} />);
  await screen.findByLabelText('시나리오 이름');
  return 것;
}

async function 흘리기(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const 서버고르기 = (env: string) => fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: env } });
const 시험누르기 = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
  });
  await 흘리기(0);
};
const 탭 = (container: HTMLElement) => container.querySelector('.scn-build')?.getAttribute('data-tab');

describe('시험 실행 시작 전 막기', () => {
  it('대상 서버를 안 고르면 줄만 띄우고 서버를 안 부르며 버튼은 잠기지 않는다', async () => {
    await 기존그리기();
    const start = vi.spyOn(scenarioApi, 'startTrial');

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('시험 실행할 대상 서버를 먼저 고릅니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: '시험 실행' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('');
  });

  it('막힌 뒤 대상 서버를 고르면 먼저 고르라는 줄이 사라진다', async () => {
    await 기존그리기();
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    expect(screen.getByText('시험 실행할 대상 서버를 먼저 고릅니다')).toBeTruthy();

    서버고르기('stg');

    expect(screen.queryByText('시험 실행할 대상 서버를 먼저 고릅니다')).toBeNull();
  });

  it('가리킴이 빈 값 연결이 있으면 문장을 띄우고 서버를 안 부른다', async () => {
    await 기존그리기([
      케이스단계('ZSB-001'),
      케이스단계('ZSB-002', { links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/x', fromSeq: 0 }] }),
    ]);
    const start = vi.spyOn(scenarioApi, 'startTrial');
    서버고르기('stg');

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('가져올 단계를 다시 골라야 시험 실행할 수 있습니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it('단계가 0개면 문장을 띄우고 서버를 안 부른다', async () => {
    render(<ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={사람()} />);
    const start = vi.spyOn(scenarioApi, 'startTrial');
    서버고르기('stg');

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('단계를 하나 이상 넣어야 시험 실행할 수 있습니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it('쓰기 권한이 없으면 대상 서버 고르개 · 시험 실행 버튼이 없다', async () => {
    await 기존그리기(단계셋, 사람('read'));

    expect(screen.queryByLabelText('대상 서버')).toBeNull();
    expect(screen.queryByRole('button', { name: '시험 실행' })).toBeNull();
  });
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

describe('시험 결과 탭 · 왼쪽 요약', () => {
  async function 끝낸것(결과: ScenarioExecuteResponse) {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-1', env: 'stg' }));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'FINISHED', result: 결과 });
    const 것 = await 기존그리기();
    await screen.findByText(/^시험 실행 · stg/);
    return 것;
  }

  it('안 돌렸으면 요약을 안 그리고 탭에 안내와 한 줄을 둔다', async () => {
    const { container } = await 기존그리기();

    expect(screen.queryByText(/^시험 실행 · /)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: '시험 결과' }));
    expect(탭(container)).toBe('trial');
    const 칸 = within(screen.getByRole('tabpanel'));
    expect(칸.getByText('시험 실행은 기록에 남지 않고 증적도 만들지 않습니다. 저장하지 않은 변경 내용으로도 실행해 볼 수 있습니다')).toBeTruthy();
    expect(칸.getByText('아직 시험 실행을 하지 않았습니다')).toBeTruthy();
  });

  it('요약은 서버 · 초 · 실패한 첫 단계를 보이고 자세히가 시험 결과 탭을 연다', async () => {
    const { container } = await 끝낸것(실패결과);

    expect(screen.getByText('시험 실행 · stg · 3.40초')).toBeTruthy();
    expect(screen.getByText('2번에서 실패')).toBeTruthy();
    expect(탭(container)).toBe('settings');

    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    expect(탭(container)).toBe('trial');
  });

  it('모두 통과면 그 글자를 보인다', async () => {
    await 끝낸것(통과결과);

    expect(screen.getByText('모두 통과')).toBeTruthy();
    expect(screen.queryByText(/번에서 실패/)).toBeNull();
  });

  it('탭은 단계마다 종류 · 판정 · 소요 · 오류 · 실패 화면 · 안 돈 단계를 보인다', async () => {
    await 끝낸것(실패결과);
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    const 줄들 = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(줄들).toHaveLength(3);
    expect(within(줄들[0]!).getByText('통과')).toBeTruthy();
    expect(within(줄들[0]!).getByText('케이스')).toBeTruthy();
    expect(within(줄들[0]!).getByText('1.20초')).toBeTruthy();
    expect(within(줄들[1]!).getByText('실패')).toBeTruthy();
    expect(줄들[1]!.querySelector('pre.scn-error')?.textContent).toBe('기대 a\n실제 b');
    const 사진 = within(줄들[1]!).getByRole('link', { name: '실패 화면 보기' });
    expect(사진.getAttribute('href')).toBe(scenarioApi.trialShot('t-1', 5));
    expect(사진.getAttribute('target')).toBe('_blank');
    expect(within(줄들[2]!).getByText('– 실행 안 됨')).toBeTruthy();
    expect(줄들[2]!.querySelector('.verdict')).toBeNull();
  });

  it('안 돈 것이 아닌 NA 는 멈춘 사유 줄을 보이고 전체 오류는 맨 위에 보인다', async () => {
    await 끝낸것({
      status: 'FAIL',
      durationMs: 900,
      parts: [{ seq: 1, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: '러너가 멈췄습니다' } }],
      error: { message: 'TIMEOUT' },
    });
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    const 칸 = within(screen.getByRole('tabpanel'));
    expect(칸.getByText('실행이 멈춘 사유')).toBeTruthy();
    expect(칸.getByText('러너가 멈췄습니다')).toBeTruthy();
    expect(칸.getByText('TIMEOUT')).toBeTruthy();
  });
});
