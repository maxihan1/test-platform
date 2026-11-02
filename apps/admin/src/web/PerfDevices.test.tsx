// @vitest-environment jsdom
// 성능 테스트 › 기기 성능 화면 검사 — 측정 시작 요청(게임 케이스 포함) · 실행 중 목표 미달 · 결과 녹화 화면과 장면 · 요약 · 누수 의심 (도메인/성능 §8.14 「기기 성능」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage, type CaseRow } from './api.js';
import { perfApi } from './perfApi.js';
import { PerfDevices } from './PerfDevices.js';
import { 결과, 기기들, 상세, 설정, 앱 } from './perfDevices.fixture.js';
import { 갱신간격 } from './perfRunView.js';

const 케이스쪽 = { items: [{ tcId: 'ZQD-001', name: '로그인', platforms: ['android'] }, { tcId: 'ZQD-002', name: '장바구니', platforms: ['android'] }] as CaseRow[], total: 2 } as CasePage;

beforeEach(() => {
  갱신간격.ms = 20;
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  갱신간격.ms = 5000;
});

function 빈화면() {
  vi.spyOn(perfApi, 'devicesRuns').mockResolvedValue({ runs: [] });
  vi.spyOn(perfApi, 'devices').mockResolvedValue({ devices: 기기들 });
  vi.spyOn(api, 'cases').mockResolvedValue(케이스쪽);
  return vi.spyOn(perfApi, 'measureDevices').mockResolvedValue({ runId: 41 });
}

describe('측정 시작', () => {
  it('측정이 없으면 시작 화면이다. 고른 케이스 · 기기 · 목표로 측정을 만들고 그 번호 주소로 간다', async () => {
    const 만들기 = 빈화면();
    render(<PerfDevices service={앱} 쓰나 />);
    fireEvent.click(await screen.findByLabelText(/ZQD-001/));
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('앱 패키지 이름'), { target: { value: 'com.demo.market' } });
    fireEvent.click(await screen.findByLabelText('Galaxy S24 선택'));
    fireEvent.click(screen.getByLabelText('Galaxy A23 선택'));
    fireEvent.click(screen.getByRole('button', { name: '측정 시작' }));

    await waitFor(() => expect(window.location.hash).toBe('#/perf/devices?run=41'));
    const 요청 = 만들기.mock.calls[0]![0];
    expect(요청).toMatchObject({ serviceId: 8, env: 'qa', drive: 'APPIUM', caseIds: ['ZQD-001'], build: { package: 'com.demo.market' }, repeat: 3, intervalSec: 1, record: true });
    expect(요청.devices).toEqual([{ serial: 'S24', where: 'FARM' }, { serial: 'A23', where: 'FARM' }]);
    expect(요청.targets.find((x) => x.metric === 'LAUNCH_MS')).toEqual({ metric: 'LAUNCH_MS', op: '<=', value: 3000, source: 'MANUAL' });
    expect(요청).not.toHaveProperty('durationSec');
  });

  it('쓰는 기기는 못 고르고, Appium 케이스면 내 컴퓨터 폰도 못 고른다. 직접 플레이로 바꾸면 고를 수 있고 측정 시간을 초로 보낸다', async () => {
    const 만들기 = 빈화면();
    render(<PerfDevices service={앱} 쓰나 />);
    expect((await screen.findByLabelText<HTMLInputElement>('Galaxy Z Flip5 선택')).disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>('Pixel 7 선택').disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/직접 플레이/));
    expect(screen.getByText('Device VISION PC 에 꽂힌 폰을 손에 들고 플레이하는 동안 기록합니다')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Pixel 7 선택'));
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('앱 패키지 이름'), { target: { value: 'com.demo.game' } });
    fireEvent.change(screen.getByLabelText('측정 시간(분)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '측정 시작' }));

    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]![0]).toMatchObject({ drive: 'MANUAL', durationSec: 300, repeat: 1, devices: [{ serial: 'PX7', where: 'LOCAL' }] });
    expect(만들기.mock.calls[0]![0]).not.toHaveProperty('caseIds');
  });

  it('게임 애플리케이션은 Appium 케이스 자리에 게임 케이스가 서고, 고른 케이스를 drive GAME 으로 보낸다', async () => {
    const 만들기 = 빈화면();
    render(<PerfDevices service={{ ...앱, kind: 'GAME' }} 쓰나 />);
    expect((await screen.findByLabelText<HTMLInputElement>(/게임 케이스/)).checked).toBe(true);
    expect(screen.queryByLabelText(/Appium 케이스/)).toBeNull();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('앱 패키지 이름'), { target: { value: 'com.demo.game' } });
    fireEvent.click(screen.getByRole('button', { name: '측정 시작' }));
    expect((await screen.findByRole('alert')).textContent).toBe('측정하며 돌릴 게임 케이스를 골라 주세요');
    fireEvent.click(await screen.findByLabelText(/ZQD-001/));
    fireEvent.click(await screen.findByLabelText('Galaxy S24 선택'));
    fireEvent.click(screen.getByRole('button', { name: '측정 시작' }));

    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]![0]).toMatchObject({ drive: 'GAME', caseIds: ['ZQD-001'], repeat: 3, devices: [{ serial: 'S24', where: 'FARM' }] });
    expect(만들기.mock.calls[0]![0]).not.toHaveProperty('durationSec');
  });

  it('앱 패키지 이름이 꼴에 안 맞으면 보내지 않고 까닭을 알린다', async () => {
    const 만들기 = 빈화면();
    render(<PerfDevices service={앱} 쓰나 />);
    fireEvent.click(await screen.findByLabelText(/ZQD-001/));
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('앱 패키지 이름'), { target: { value: 'market' } });
    fireEvent.click(screen.getByRole('button', { name: '측정 시작' }));
    expect((await screen.findByRole('alert')).textContent).toBe('앱 패키지 이름을 com.demo.market 꼴로 적어 주세요');
    expect(만들기).not.toHaveBeenCalled();
  });

  it('AI 추천을 받아 적용하면 추천한 팜 기기가 골라진다', async () => {
    빈화면();
    vi.spyOn(perfApi, 'suggestDevices').mockResolvedValue({ jobId: 5 });
    vi.spyOn(perfApi, 'job').mockResolvedValue({ status: 'DONE', output: { devices: [{ serial: 'A23', why: '저사양' }], basis: [] } });
    render(<PerfDevices service={앱} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '추천 받기' }));
    expect(await screen.findByText(/Galaxy A23\(저사양\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '추천 적용' }));
    expect(screen.getByLabelText<HTMLInputElement>('Galaxy A23 선택').checked).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>('Galaxy S24 선택').checked).toBe(false);
  });
});

describe('실행 중', () => {
  it('목표를 벗어난 기기 타일은 「목표 미달」 글자와 벗어난 지표를 단다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세({ status: 'RUNNING', finishedAt: null }));
    vi.spyOn(perfApi, 'deviceResult').mockResolvedValue({ ...결과, markers: [] });
    vi.spyOn(perfApi, 'events').mockResolvedValue({ events: [{ at: '2026-10-22T04:41:00Z', level: 'info', message: '기기 2대를 잡았습니다' }] });
    render(<PerfDevices service={앱} run={40} 쓰나 />);

    const 나쁜 = await screen.findByRole('region', { name: 'Galaxy A23' });
    await waitFor(() => expect(within(나쁜).getByText(/목표 미달/).textContent).toContain('평균 FPS'));
    expect(within(나쁜).getByText(/목표 미달/).textContent).toContain('앱 실행 시간');
    expect(나쁜.className).toContain('bad');
    const 좋은 = screen.getByRole('region', { name: 'Galaxy S24' });
    expect(within(좋은).queryByText(/목표 미달/)).toBeNull();
    expect(screen.getByText('기기 2대를 잡았습니다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '실행 중단' })).toBeTruthy();
  });

  it('쌓인 숫자가 12만 줄이 넘는 긴 측정도 열리고, 다음에는 마지막 초 조금 앞부터 받는다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세({ status: 'RUNNING', finishedAt: null }));
    const 긴줄 = Array.from({ length: 120_000 }, (_, i) => ({ ...결과.metrics[0]!, serial: i % 2 === 0 ? 'S24' : 'A23', sec: Math.floor(i / 2) }));
    const 받기 = vi.spyOn(perfApi, 'deviceResult').mockResolvedValue({ ...결과, metrics: 긴줄, markers: [] });
    vi.spyOn(perfApi, 'events').mockResolvedValue({ events: [] });
    render(<PerfDevices service={앱} run={40} 쓰나 />);

    await waitFor(() => expect(받기).toHaveBeenCalledWith(40, 59_989));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('결과', () => {
  function 결과열기() {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    vi.spyOn(perfApi, 'deviceResult').mockResolvedValue(결과);
  }

  it('AI 분석 · 실패 기기의 녹화 화면 · 장면 · 기기별 요약 · 누수 의심을 보인다. PDF 단추는 없다', async () => {
    결과열기();
    render(<PerfDevices service={앱} run={40} 쓰나 />);
    const 표 = await screen.findByRole('table', { name: '기기별 요약' });

    expect(screen.getByText('저사양 기기에서 FPS 하락')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Galaxy A23' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Galaxy A23 녹화 화면').getAttribute('src')).toBe('/api/perf/runs/40/videos/A23/rec-0.mp4');

    const 실패줄 = within(표).getByText('Galaxy A23').closest('tr')!;
    expect(within(실패줄).getByText('31').className).toContain('perf-err');
    expect(within(실패줄).getByText('4.6초').className).toContain('perf-err');
    expect(within(실패줄).getByText('실패').className).toContain('v-fail');
    const 통과줄 = within(표).getByText('Galaxy S24').closest('tr')!;
    expect(within(통과줄).getByText('59.4').className).not.toContain('perf-err');

    expect(screen.getByText('회차마다 약 100MB 증가', { exact: false })).toBeTruthy();
    expect(screen.getByText(/2회차 더 돌면 메모리 목표를 넘습니다/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'PDF로 내려받기' })).toBeNull();
  });

  it('기기 한 대 숫자가 6만 줄인 긴 측정의 결과도 그래프까지 열린다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    const 긴줄 = Array.from({ length: 120_000 }, (_, i) => ({ ...결과.metrics[0]!, serial: i % 2 === 0 ? 'S24' : 'A23', sec: Math.floor(i / 2) }));
    vi.spyOn(perfApi, 'deviceResult').mockResolvedValue({ ...결과, metrics: 긴줄 });
    render(<PerfDevices service={앱} run={40} 쓰나 />);
    expect(await screen.findByRole('table', { name: '기기별 요약' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Galaxy A23' }).getAttribute('aria-selected')).toBe('true');
  });

  it('장면을 누르면 그 초를 담은 녹화 조각으로 바꾼다', async () => {
    결과열기();
    render(<PerfDevices service={앱} run={40} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: /3회차 FPS 44 → 31/ }));
    expect(screen.getByLabelText('Galaxy A23 녹화 화면').getAttribute('src')).toBe('/api/perf/runs/40/videos/A23/rec-180.mp4');
  });

  it('녹화가 없는 기기 탭은 안내를 띄운다', async () => {
    결과열기();
    render(<PerfDevices service={앱} run={40} 쓰나 />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Galaxy S24' }));
    expect(screen.getByText('녹화 화면이 없습니다')).toBeTruthy();
  });

  it('게임 케이스 측정은 머리에 게임 케이스 수와 반복을 보이고 다시 실행도 게임 케이스로 만든다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세({}, 설정({ drive: 'GAME' })));
    vi.spyOn(perfApi, 'deviceResult').mockResolvedValue(결과);
    const 만들기 = vi.spyOn(perfApi, 'measureDevices').mockResolvedValue({ runId: 43 });
    render(<PerfDevices service={{ ...앱, kind: 'GAME' }} run={40} 쓰나 />);
    expect(await screen.findByText(/게임 케이스 1개 · 반복 3회/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }));
    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]![0]).toMatchObject({ drive: 'GAME', caseIds: ['ZQD-001'], repeat: 3 });
  });

  it('게임 케이스 칸이 생기기 전에 게임을 Appium 케이스로 잰 결과도 다시 실행은 게임 케이스로 보낸다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세({}, 설정({ drive: 'APPIUM' })));
    vi.spyOn(perfApi, 'deviceResult').mockResolvedValue(결과);
    const 만들기 = vi.spyOn(perfApi, 'measureDevices').mockResolvedValue({ runId: 44 });
    render(<PerfDevices service={{ ...앱, kind: 'GAME' }} run={40} 쓰나 />);
    expect(await screen.findByText(/Appium 케이스 1개 · 반복 3회/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }));
    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]![0]).toMatchObject({ drive: 'GAME', caseIds: ['ZQD-001'] });
  });

  it('다시 실행은 같은 조건으로 새 측정을 만들고, 새 측정은 앞 조건을 채운 시작 화면을 연다', async () => {
    결과열기();
    const 만들기 = vi.spyOn(perfApi, 'measureDevices').mockResolvedValue({ runId: 42 });
    vi.spyOn(perfApi, 'devices').mockResolvedValue({ devices: 기기들 });
    vi.spyOn(api, 'cases').mockResolvedValue(케이스쪽);
    render(<PerfDevices service={앱} run={40} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/perf/devices?run=42'));
    const s = 설정();
    expect(만들기.mock.calls[0]![0]).toEqual({
      serviceId: 8, env: 'qa', drive: 'APPIUM', caseIds: s.caseIds, build: { package: s.package },
      devices: [{ serial: 'S24', where: 'FARM' }, { serial: 'A23', where: 'FARM' }], repeat: 3, targets: s.targets, metrics: s.metrics, intervalSec: 1, record: true,
    });

    fireEvent.click(screen.getByRole('button', { name: '새 측정' }));
    expect(screen.getByLabelText<HTMLInputElement>('앱 패키지 이름').value).toBe('com.demo.market');
    expect((await screen.findByLabelText<HTMLInputElement>('Galaxy A23 선택')).checked).toBe(true);
  });

  it('앞 측정의 기기가 지금 다른 실행에서 쓰는 중이면 고른 것에서 빠지고 보내지 않는다', async () => {
    결과열기();
    const 만들기 = vi.spyOn(perfApi, 'measureDevices').mockResolvedValue({ runId: 43 });
    vi.spyOn(perfApi, 'devices').mockResolvedValue({ devices: 기기들.map((d) => (d.serial === 'A23' ? { ...d, status: 'BUSY' as const } : d)) });
    vi.spyOn(api, 'cases').mockResolvedValue(케이스쪽);
    render(<PerfDevices service={앱} run={40} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '새 측정' }));
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('Galaxy A23 선택').checked).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '측정 시작' }));
    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]![0].devices).toEqual([{ serial: 'S24', where: 'FARM' }]);
  });

  it('기기 실행이 아닌 번호면 실행 한 건 화면으로 보낸다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세({ kind: 'LOAD' }));
    render(<PerfDevices service={앱} run={12} 쓰나 />);
    await waitFor(() => expect(window.location.hash).toBe('#/perf/runs/12'));
  });
});
