// @vitest-environment jsdom
// 성능 시나리오의 정기 실행 단추와 창 검사 — admin 만 보이고 시각 · 대상 서버 · 시간대를 보낸다 (도메인/성능 §3.9 · §8.14)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type ServiceRow, type User } from './api.js';
import { perfApi, type PerfScenario } from './perfApi.js';
import { PerfWizard } from './PerfWizard.js';

const 앱: ServiceRow = {
  id: 7,
  prefix: 'ZPS',
  name: 'ZPS 웹',
  color: '#000',
  projectId: 3,
  projectName: '데모마켓',
  envs: [
    { env: 'qa', baseUrl: 'https://qa.example.com' },
    { env: 'prod', baseUrl: 'https://example.com', isProd: true },
  ],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
};
const 사람 = (role: 'admin' | 'member'): User => ({ username: 'zps', displayName: '성능', role, dashboard: 'none', mustChangePassword: false, services: [앱] });

const 시나리오 = (schedule: PerfScenario['schedule']): PerfScenario => ({
  id: 42,
  serviceId: 7,
  name: '주문하기',
  version: 3,
  accountsRows: 0,
  schedule,
  versions: [],
  body: { transactions: [{ name: '상품 목록', method: 'GET', url: '/api/products' }], load: { basis: 'VUS', testType: 'LOAD', stages: [{ durationSec: 60, target: 30 }] }, targets: [] },
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 그리기(user: User, schedule: PerfScenario['schedule'] = null) {
  vi.spyOn(perfApi, 'scenario').mockResolvedValue(시나리오(schedule));
  vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [] });
  vi.spyOn(perfApi, 'dummyClients').mockResolvedValue({ clients: [] });
  render(<PerfWizard id={42} 띠서비스={앱} user={user} />);
  await screen.findByRole('button', { name: '다음' });
}

describe('정기 실행', () => {
  it('admin 이 아니면 단추가 없다', async () => {
    await 그리기(사람('member'));
    expect(screen.queryByRole('button', { name: '정기 실행' })).toBeNull();
  });

  it('새 시나리오는 저장하기 전에는 단추가 없다', async () => {
    vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [] });
    vi.spyOn(perfApi, 'dummyClients').mockResolvedValue({ clients: [] });
    render(<PerfWizard id={null} 띠서비스={앱} user={사람('admin')} />);
    await screen.findByRole('button', { name: '다음' });
    expect(screen.queryByRole('button', { name: '정기 실행' })).toBeNull();
  });

  it('시각 · 대상 서버 · 브라우저 시간대를 보내고 켜진 모양을 단추 옆에 적는다. 실서비스 서버는 고를 수 없다', async () => {
    const 보내기 = vi.spyOn(perfApi, 'setSchedule').mockImplementation((_id, 값) => Promise.resolve({ schedule: 값 }));
    await 그리기(사람('admin'));

    fireEvent.click(screen.getByRole('button', { name: '정기 실행' }));
    const 창 = screen.getByRole('dialog');
    expect((within(창).getByRole('option', { name: 'prod · 부하 테스트 불가' }) as HTMLOptionElement).disabled).toBe(true);
    expect(within(창).queryByRole('button', { name: '끄기' })).toBeNull();

    fireEvent.click(within(창).getByRole('button', { name: '켜기' }));
    expect((await within(창).findByRole('alert')).textContent).toBe('시각과 대상 서버를 골라 주세요');
    expect(보내기).not.toHaveBeenCalled();

    fireEvent.change(within(창).getByLabelText('시각'), { target: { value: '03:00' } });
    fireEvent.change(within(창).getByLabelText(/^대상 서버/), { target: { value: 'qa' } });
    fireEvent.click(within(창).getByRole('button', { name: '켜기' }));

    await waitFor(() => expect(보내기).toHaveBeenCalledWith(42, { at: '03:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone, env: 'qa' }));
    expect(await screen.findByText('매일 03:00 · qa')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('켜져 있으면 끌 수 있다', async () => {
    const 보내기 = vi.spyOn(perfApi, 'setSchedule').mockResolvedValue({ schedule: null });
    await 그리기(사람('admin'), { at: '03:00', tz: 'Asia/Seoul', env: 'qa' });
    expect(screen.getByText('매일 03:00 · qa')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '정기 실행' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '끄기' }));
    await waitFor(() => expect(보내기).toHaveBeenCalledWith(42, null));
    await waitFor(() => expect(screen.queryByText('매일 03:00 · qa')).toBeNull());
  });

  it('서버가 거절하면 까닭을 창 안에 글로 보이고 창은 닫지 않는다', async () => {
    vi.spyOn(perfApi, 'setSchedule').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '마법사 4단계를 저장해 주세요', []));
    await 그리기(사람('admin'), { at: '03:00', tz: 'Asia/Seoul', env: 'qa' });
    fireEvent.click(screen.getByRole('button', { name: '정기 실행' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '켜기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('마법사 4단계를 저장해 주세요');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
