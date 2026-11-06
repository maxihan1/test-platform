// @vitest-environment jsdom
// 고르기 바의 「PC N건 실행」 · 「모바일 N건 실행」 · 「모두 실행」과 실행 창의 디바이스 체크칸 (도메인/실행 §8.10 · 시안 8판 ① ② ③)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow, type Paged, type Platform, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';
import { 시작누름 } from './runPick.fixture.js';

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
  for (const 칸 of screen.getAllByRole('checkbox', { name: /^(?!이 쪽 전체).* 선택$/ })) fireEvent.click(칸);
}

const 바 = () => within(screen.getByRole('toolbar', { name: '선택한 케이스' }));
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

  it('「모바일 N건 실행」은 모바일을 가진 것만 모바일로 담고 디바이스 체크칸은 잠겨 있다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 7 });
    await 그리기([케이스('ZPT-001', ['desktop', 'mobile']), 케이스('ZPT-002', ['desktop']), 케이스('ZPT-003', ['mobile'])]);

    fireEvent.click(바().getByRole('button', { name: '모바일 2건 실행' }));

    await screen.findByRole('dialog', { name: '케이스 2건 실행' });
    expect((창안().getByRole('checkbox', { name: '모바일 2건' }) as HTMLInputElement).disabled).toBe(true);
    expect(창안().queryByText('ZPT-002 케이스')).toBeNull();
    expect(창안().getByRole('radio', { name: '가상 기기' })).toBeTruthy();
    fireEvent.change(창안().getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창안().getByRole('button', { name: '실행' }));
    시작누름();

    await waitFor(() => expect(걸기).toHaveBeenCalledTimes(1));
    expect(걸기.mock.calls[0]?.[0].items.map((it) => [it.tcId, it.platforms])).toEqual([
      ['ZPT-001', ['mobile']],
      ['ZPT-003', ['mobile']],
    ]);
  });
});

const 디바이스칸 = () => within(창안().getByRole('group', { name: '디바이스' }));

async function 모두실행창() {
  await 그리기([케이스('ZPT-001', ['desktop', 'mobile']), 케이스('ZPT-002', ['desktop'])]);
  fireEvent.click(바().getByRole('button', { name: '모두 실행' }));
  await screen.findByRole('dialog', { name: '케이스 2건 실행' });
}

describe('「모두 실행」 창의 디바이스 체크칸', () => {
  it('처음엔 PC · 모바일이 다 켜져 있고 끄면 그 디바이스만 남은 케이스가 줄에서 빠진다', async () => {
    await 모두실행창();

    const pc = 디바이스칸().getByRole('checkbox', { name: 'PC 2건' }) as HTMLInputElement;
    const 모바일 = 디바이스칸().getByRole('checkbox', { name: '모바일 1건' }) as HTMLInputElement;
    expect(pc.checked).toBe(true);
    expect(모바일.checked).toBe(true);
    expect(창안().getByRole('radio', { name: '가상 기기' })).toBeTruthy();

    fireEvent.click(pc);

    expect(창안().queryByText('ZPT-002 케이스')).toBeNull();
    expect(창안().getByText('ZPT-001 케이스')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '케이스 1건 실행' })).toBeTruthy();

    fireEvent.click(pc);
    fireEvent.click(모바일);

    expect(창안().getByText('ZPT-002 케이스')).toBeTruthy();
    expect((창안().getByRole('radio', { name: '가상 기기' }) as HTMLInputElement).disabled).toBe(true);
  });

  it('모바일을 끄고 실행하면 PC 로만 건다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 9 });
    await 모두실행창();
    fireEvent.click(디바이스칸().getByRole('checkbox', { name: '모바일 1건' }));

    fireEvent.change(창안().getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창안().getByRole('button', { name: '실행' }));
    시작누름();

    await waitFor(() => expect(걸기).toHaveBeenCalledTimes(1));
    const 요청 = 걸기.mock.calls[0]?.[0];
    expect(요청).not.toHaveProperty('mobileOn');
    expect(요청?.items.map((it) => [it.tcId, it.platforms])).toEqual([
      ['ZPT-001', ['desktop']],
      ['ZPT-002', ['desktop']],
    ]);
  });

  it('다 끄면 표 자리에 사유를 두고 실행 · 시험 실행을 잠근다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 10 });
    await 모두실행창();
    fireEvent.click(디바이스칸().getByRole('checkbox', { name: 'PC 2건' }));
    fireEvent.click(디바이스칸().getByRole('checkbox', { name: '모바일 1건' }));
    fireEvent.change(창안().getByLabelText('대상 서버'), { target: { value: 'qa' } });

    expect(창안().getByText('실행할 디바이스를 하나 이상 선택하세요')).toBeTruthy();
    expect((창안().getByRole('button', { name: '실행' }) as HTMLButtonElement).disabled).toBe(true);
    expect((창안().getByRole('button', { name: '시험 실행' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(창안().getByRole('button', { name: '실행' }));

    expect(걸기).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /시작할까요/ })).toBeNull();
  });

  it('둘 다 켠 채로 실행하면 PC · 모바일을 한 번에 다 건다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 8 });
    await 모두실행창();

    fireEvent.change(창안().getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창안().getByRole('button', { name: '실행' }));
    시작누름();

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
