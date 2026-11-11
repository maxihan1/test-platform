// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, 알림바뀜 } from './api.js';
import { scenarioApi, type ScenarioRunPart, type ScenarioRunResult } from './scenarioApi.js';
import { ScenarioRunWindow } from './ScenarioRunWindow.js';
import { 장면통로 } from './TrialLive.js';
import { 읽음들 } from './noticeRead.js';
import { use창실행 } from './viewedRun.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.location.hash = '';
});

const 부품 = (seq: number, tcId: string, tcName: string, 덮: Partial<ScenarioRunPart> = {}): ScenarioRunPart => ({
  seq,
  kind: 'case',
  tcId,
  tcName,
  part: { kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] },
  status: 'NA',
  durationMs: null,
  skippedSteps: [],
  mocks: [],
  paramSchema: null,
  expectedSchema: null,
  precondition: [],
  unconfirmed: null,
  bound: {},
  cleanup: [],
  steps: [],
  error: null,
  trace: null,
  ...덮,
});

const 결과 = (덮: Partial<ScenarioRunResult> = {}): ScenarioRunResult => ({
  scenarioId: 7,
  version: 2,
  status: 'RUNNING',
  platform: 'desktop',
  title: '주문 흐름',
  env: 'qa',
  baseUrl: 'https://qa.example.com',
  triggeredBy: 'zsb',
  triggeredByName: null,
  startedAt: new Date(Date.now() - 21_000).toISOString(),
  finishedAt: null,
  parts: [부품(1, 'DMW-FN-087', '로그인'), 부품(2, 'DMW-FN-213', '장바구니'), 부품(3, 'DMW-FN-234', '주문')],
  evidence: [],
  live: true,
  ...덮,
});

const 끝난결과 = (): ScenarioRunResult =>
  결과({
    status: 'FINISHED',
    finishedAt: new Date().toISOString(),
    parts: [
      부품(1, 'DMW-FN-087', '로그인', { status: 'PASS', durationMs: 1500 }),
      부품(2, 'DMW-FN-213', '장바구니', { status: 'NA', durationMs: 0, error: { message: 'STOPPED' } }),
      부품(3, 'DMW-FN-234', '주문', { status: 'NA', durationMs: 0, error: { message: 'NOT_RUN' } }),
    ],
  });

function 그리기(닫기 = vi.fn()) {
  vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
  render(<ScenarioRunWindow runId={21045} 어디서="scenarios" on닫기={닫기} />);
  return 닫기;
}

describe('E2E 정식 실행 창 — 도는 중', () => {
  it('제목 · 주황 띠의 단계 흐름 · 단계 목록과 지금 단계를 그린다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue({ seq: 2, elapsedMs: 4200 });
    그리기();

    const 창 = within(await screen.findByRole('dialog', { name: 'E2E 실행 중 · RUN 21045' }));
    expect(await 창.findByText(/완료되면 실행 기록에 남고 리포트를 만들 수 있습니다 · RUN \d+/)).toBeTruthy();
    expect(창.getByText('정식 실행')).toBeTruthy();
    const 줄들 = [...screen.getByRole('dialog').querySelectorAll('.e2e-steps li')];
    expect(줄들).toHaveLength(3);
    expect(줄들.map((줄) => 줄.className)).toEqual(['done', 'now', 'wait']);
    expect(줄들[1]?.querySelector('.t')?.textContent).toBe('5초째');
    expect(줄들[1]?.textContent).toContain('FN-213');
    expect(창.getByText('닫아도 실행은 계속되고 완료되면 알림이 옵니다')).toBeTruthy();
  });

  it('첫 단계를 아직 안 알렸으면 1단계가 기다리는 중이다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    그리기();

    await screen.findByText(/완료되면 실행 기록에 남고 리포트를 만들 수 있습니다/);
    const 첫 = screen.getByRole('dialog').querySelector('.e2e-steps li')!;
    expect(첫.className).toBe('now');
    expect(첫.querySelector('.t')?.textContent).toBe('기다리는 중');
  });

  it('장면 열쇠가 없는 실행은 장면 칸 대신 안내를 두고 폰을 잡았으면 이름과 VISION 링크가 선다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과({ live: false, platform: 'android', vision: { url: 'https://vision.example/#p', name: 'Pixel 8' } }));
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    그리기();

    expect(await screen.findByText('지금 화면은 Device VISION 에서 볼 수 있습니다')).toBeTruthy();
    expect(screen.getByText('Pixel 8')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Device VISION 에서 보기 ↗' }).getAttribute('href')).toBe('https://vision.example/#p');
  });

  it('폰도 장면도 없는 실행은 API 만 부르는 실행이라 화면이 없다고 적는다', async () => {
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과({ live: false, platform: 'android' }));
    그리기();
    expect(await screen.findByText('API 만 호출하는 실행이라 보여 줄 화면이 없습니다')).toBeTruthy();
    cleanup();

    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과({ live: false, platform: 'desktop' }));
    그리기();
    expect(await screen.findByText('API 만 호출하는 실행이라 보여 줄 화면이 없습니다')).toBeTruthy();
  });

  it('닫기는 묻지 않고 닫는다 — 실행은 계속된다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    const 닫기 = 그리기();
    const 창 = within(await screen.findByRole('dialog', { name: 'E2E 실행 중 · RUN 21045' }));

    fireEvent.click(창.getByRole('button', { name: '닫기' }));

    expect(닫기).toHaveBeenCalledTimes(1);
  });

  it('실행 중단은 확인을 받고 중단 통로를 부른다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    const 중단 = vi.spyOn(api, 'abortRun').mockResolvedValue({ aborted: 1 });
    그리기();
    const 창 = within(await screen.findByRole('dialog', { name: 'E2E 실행 중 · RUN 21045' }));

    fireEvent.click(창.getByRole('button', { name: '실행 중단' }));
    const 묻기 = within(screen.getByRole('dialog', { name: 'RUN 21045 실행을 중단할까요?' }));
    expect(묻기.getByText(/진행 중인 단계는 즉시 중단하고/)).toBeTruthy();
    expect(중단).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(묻기.getByRole('button', { name: '중단' }));
    });

    expect(중단).toHaveBeenCalledWith(21045);
    expect(screen.queryByRole('dialog', { name: 'RUN 21045 실행을 중단할까요?' })).toBeNull();
  });

  it('창이 떠 있는 동안 알림 줄이 읽는 창 실행 번호가 이 실행이고, 내려가면 비워진다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    function 읽기() {
      return <span data-testid="창실행">{String(use창실행())}</span>;
    }
    render(<읽기 />);
    expect(screen.getByTestId('창실행').textContent).toBe('null');
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    const 것 = render(<ScenarioRunWindow runId={21045} 어디서={null} on닫기={() => undefined} />);
    await screen.findByRole('dialog');
    expect(screen.getByTestId('창실행').textContent).toBe('21045');

    것.unmount();

    expect(screen.getByTestId('창실행').textContent).toBe('null');
  });
});

describe('E2E 정식 실행 창 — 끝남', () => {
  it('끝난 실행을 열면 바로 결과로 보이고 결과 보기가 그 실행의 E2E 결과로 간다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(끝난결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    const 닫기 = 그리기();

    const 창 = within(await screen.findByRole('dialog', { name: 'E2E 실행이 완료되었습니다 · RUN 21045' }));
    expect(await 창.findByText('실행 중단됨')).toBeTruthy();
    expect(창.getByText('실행 안 함')).toBeTruthy();
    expect([...screen.getByRole('dialog').querySelectorAll('.trial-sum .pill')].map((알약) => 알약.textContent)).toEqual(['통과 1', '실패 0', '미실행 2']);

    fireEvent.click(창.getByRole('button', { name: '결과 보기' }));

    expect(닫기).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/runs/21045?from=scenarios');
  });

  it('끝난 것을 본 뒤 닫으면 알림 줄이 같은 끝을 또 알리지 않게 읽음으로 적는다 (점검표 D8)', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(끝난결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    그리기();

    const 창 = within(await screen.findByRole('dialog', { name: 'E2E 실행이 완료되었습니다 · RUN 21045' }));
    fireEvent.click(창.getByRole('button', { name: '닫기' }));

    expect(읽음들().has('run:21045')).toBe(true);
  });

  it('도는 걸 본 뒤 끝나면 같은 창이 결과로 넘어가고 알림 줄이 바로 다시 묻도록 알린다', async () => {
    const 결과들 = vi
      .spyOn(scenarioApi, 'result')
      .mockResolvedValueOnce(결과())
      .mockResolvedValue(끝난결과());
    vi.spyOn(scenarioApi, 'step').mockResolvedValue(null);
    const 알림 = vi.fn();
    window.addEventListener(알림바뀜, 알림);
    vi.useFakeTimers();
    그리기();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole('dialog', { name: 'E2E 실행 중 · RUN 21045' })).toBeTruthy();
    expect(알림).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(결과들).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog', { name: 'E2E 실행이 완료되었습니다 · RUN 21045' })).toBeTruthy();
    expect(알림).toHaveBeenCalledTimes(1);
    window.removeEventListener(알림바뀜, 알림);
  });
});
