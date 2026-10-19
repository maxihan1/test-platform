// @vitest-environment jsdom
// 서비스 설정 「정기 실행」 구획 — 켜고 끄기 · 시간대 · 대상 서버 · 마지막 정기 실행

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ServicePanel } from './SettingsService.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 꺼진서비스: SettingsServiceRow = {
  id: 7,
  prefix: 'ZSC',
  name: '정기 실행 서비스',
  color: '#3A5FCD',
  envs: [
    { env: 'qa', baseUrl: 'https://qa.example.com' },
    { env: 'demo', baseUrl: 'https://demo.example.com' },
  ],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'zsc',
  isActive: true,
  caseCount: 3,
  schedule: null,
  lastScheduled: null,
};

const 켜진서비스: SettingsServiceRow = {
  ...꺼진서비스,
  schedule: { at: '04:30', tz: 'Asia/Seoul', env: 'qa' },
  lastScheduled: { at: '2026-10-12T19:30:00Z', runIds: [20901, 20902] },
};

const 정기구획 = () => [...document.querySelectorAll('.set-card')].find((el) => el.querySelector('h3')?.textContent === '정기 실행')!;

describe('서비스 설정 「정기 실행」 구획 (도메인/인증 §8.8 · 2026-10-12 시안 A)', () => {
  it('켜면 새벽 3시 · demo 가 처음 값이고 저장하면 이 브라우저의 시간대로 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={꺼진서비스} onDone={() => {}} />);

    expect(screen.queryByLabelText('시각')).toBeNull();
    fireEvent.click(screen.getByLabelText('매일 돌리기'));
    expect((screen.getByLabelText('시각') as HTMLInputElement).value).toBe('03:00');
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('demo');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const 시간대 = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await waitFor(() =>
      expect(고침).toHaveBeenCalledWith(7, expect.objectContaining({ schedule: { at: '03:00', tz: 시간대, env: 'demo' } })),
    );
    expect(정기구획().textContent).toContain(`${시간대} 기준`);
  });

  it('켜 둔 것은 저장된 시간대 그대로 고친다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={켜진서비스} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('시각'), { target: { value: '05:00' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(고침).toHaveBeenCalledWith(7, expect.objectContaining({ schedule: { at: '05:00', tz: 'Asia/Seoul', env: 'qa' } })),
    );
  });

  it('끄고 다시 켜면 저장된 시각 · 시간대 · 대상 서버로 돌아온다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={켜진서비스} onDone={() => {}} />);

    fireEvent.click(screen.getByLabelText('매일 돌리기'));
    fireEvent.click(screen.getByLabelText('매일 돌리기'));
    expect((screen.getByLabelText('시각') as HTMLInputElement).value).toBe('04:30');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalled());
    expect(고침.mock.calls[0]![1]).not.toHaveProperty('schedule');
  });

  it('끄고 저장하면 null 을 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={켜진서비스} onDone={() => {}} />);

    fireEvent.click(screen.getByLabelText('매일 돌리기'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledWith(7, expect.objectContaining({ schedule: null })));
  });

  it('안 건드리면 보내지 않는다 — 그사이 다른 사람이 바꾼 것을 덮지 않는다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={켜진서비스} onDone={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalled());
    expect(고침.mock.calls[0]![1]).not.toHaveProperty('schedule');
  });

  it('고른 대상 서버의 줄 이름을 고치면 저장 대신 이유를 말한다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={켜진서비스} onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'stage' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByText('정기 실행의 대상 서버를 대상 서버 목록에서 고릅니다')).toBeTruthy();
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('qa');
    expect(고침).not.toHaveBeenCalled();
  });

  it('마지막 정기 실행의 실행마다 결과로 가는 링크를 단다', () => {
    render(<ServicePanel row={켜진서비스} onDone={() => {}} />);

    expect(screen.getByRole('link', { name: 'RUN 20901' }).getAttribute('href')).toBe('#/runs/20901');
    expect(screen.getByRole('link', { name: 'RUN 20902' }).getAttribute('href')).toBe('#/runs/20902');
  });

  it('실행한 적이 없으면 그렇게 적는다', () => {
    render(<ServicePanel row={꺼진서비스} onDone={() => {}} />);

    expect(정기구획().textContent).toContain('아직 실행한 적이 없습니다');
  });

  it('새 서비스에는 구획이 없다 — 돌릴 케이스가 없다', () => {
    render(<ServicePanel onDone={() => {}} />);

    expect(screen.queryByText('정기 실행')).toBeNull();
  });
});
