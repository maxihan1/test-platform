// @vitest-environment jsdom
// 고르기 바의 「PC N건 실행」 · 「모바일 N건 실행」 · 「모두 실행」과 실행 창의 PC · 모바일 탭 (도메인/실행 §8.10 · 시안 ① ② ③)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow, type Paged, type Platform, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.location.hash = '#/cases';
});

function 케이스(tcId: string, platforms: Platform[]): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms,
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-11-05T00:00:00.000Z',
  };
}

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPT',
  name: '장바구니',
  color: '#123456', projectId: 1, projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = { username: 'zpt', displayName: '검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [서비스] };

async function 그리기(줄들: CaseRow[]) {
  const 쪽: Paged<CaseRow> = { items: 줄들, total: 줄들.length, page: 1, pageSize: 50 };
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  render(<CaseList kind="FN" service="ZPT" 할수={() => true} 결과보나 />);
  await screen.findByText(줄들[0]!.tcId);
  for (const 칸 of screen.getAllByRole('checkbox', { name: /고르기$/ })) fireEvent.click(칸);
}

const 바 = () => within(screen.getByRole('toolbar', { name: '고른 케이스' }));
const 창안 = () => within(screen.getByRole('dialog'));

describe('고르기 바의 디바이스별 실행', () => {
  it('고른 것 중 그 디바이스를 가진 것만 센다', async () => {
    await 그리기([케이스('ZPT-001', ['desktop', 'mobile']), 케이스('ZPT-002', ['desktop'])]);

    expect(바().getByRole('button', { name: 'PC 2건 실행' })).toBeTruthy();
    expect(바().getByRole('button', { name: '모바일 1건 실행' })).toBeTruthy();
    expect(바().getByRole('button', { name: '모두 실행' })).toBeTruthy();
  });

  it('고른 것에 모바일이 없으면 「모바일 실행」 단추가 없다', async () => {
    await 그리기([케이스('ZPT-001', ['desktop']), 케이스('ZPT-002', ['desktop'])]);

    expect(바().getByRole('button', { name: 'PC 2건 실행' })).toBeTruthy();
    expect(바().queryByRole('button', { name: /^모바일/ })).toBeNull();
  });

  it('「모바일 N건 실행」은 모바일을 가진 것만 모바일로 담고 탭이 없다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 7 });
    await 그리기([케이스('ZPT-001', ['desktop', 'mobile']), 케이스('ZPT-002', ['desktop']), 케이스('ZPT-003', ['mobile'])]);

    fireEvent.click(바().getByRole('button', { name: '모바일 2건 실행' }));

    await screen.findByRole('dialog', { name: '실행할 케이스 2건' });
    expect(창안().queryByRole('tablist')).toBeNull();
    expect(창안().queryByText('ZPT-002 케이스')).toBeNull();
    expect(창안().getByRole('radio', { name: '가상 기기' })).toBeTruthy();
    fireEvent.change(창안().getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창안().getByRole('button', { name: '실행' }));

    await waitFor(() => expect(걸기).toHaveBeenCalledTimes(1));
    expect(걸기.mock.calls[0]?.[0].items.map((it) => [it.tcId, it.platforms])).toEqual([
      ['ZPT-001', ['mobile']],
      ['ZPT-003', ['mobile']],
    ]);
  });
});

describe('「모두 실행」 창의 PC · 모바일 탭', () => {
  it('탭마다 그 디바이스 케이스만 보이고 실행 기기 칸은 모바일 탭에만 있다', async () => {
    await 그리기([케이스('ZPT-001', ['desktop', 'mobile']), 케이스('ZPT-002', ['desktop'])]);
    fireEvent.click(바().getByRole('button', { name: '모두 실행' }));
    await screen.findByRole('dialog', { name: '실행할 케이스 2건' });

    const [pc, 모바일] = 창안().getAllByRole('tab');
    expect(pc!.textContent).toBe('PC 2');
    expect(모바일!.textContent).toBe('모바일 1');
    expect(pc!.getAttribute('aria-selected')).toBe('true');
    expect(창안().getByText('ZPT-002 케이스')).toBeTruthy();
    expect(창안().queryByRole('radio', { name: '가상 기기' })).toBeNull();

    fireEvent.click(모바일!);

    expect(창안().queryByText('ZPT-002 케이스')).toBeNull();
    expect(창안().getByText('ZPT-001 케이스')).toBeTruthy();
    expect(창안().getByRole('radio', { name: '가상 기기' })).toBeTruthy();
  });

  it('어느 탭에서 실행해도 PC · 모바일을 한 번에 다 건다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 8 });
    await 그리기([케이스('ZPT-001', ['desktop', 'mobile']), 케이스('ZPT-002', ['desktop'])]);
    fireEvent.click(바().getByRole('button', { name: '모두 실행' }));
    await screen.findByRole('dialog', { name: '실행할 케이스 2건' });
    fireEvent.click(창안().getByRole('tab', { name: '모바일 1' }));

    fireEvent.change(창안().getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창안().getByRole('button', { name: '실행' }));

    await waitFor(() => expect(걸기).toHaveBeenCalledTimes(1));
    expect(걸기.mock.calls[0]?.[0]).toMatchObject({
      mobileOn: 'server',
      items: [
        { tcId: 'ZPT-001', platforms: ['desktop', 'mobile'] },
        { tcId: 'ZPT-002', platforms: ['desktop'] },
      ],
    });
  });
});
