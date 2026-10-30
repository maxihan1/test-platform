// @vitest-environment jsdom
// 케이스 목록 여러 건 고르기 — 「모두 고르기」 띠 · Shift 사이 고르기 · 고르기 바 (도메인/카탈로그 §8.1 「여러 건 골라」 · 2026-10-30 WEB-F7-08)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage, type CaseRow, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.location.hash = '#/cases';
});

function 케이스(tcId: string): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-10-30T00:00:00.000Z',
  };
}

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPK',
  name: '결제',
  color: '#123456', projectId: 1, projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};
const 사람: User = { username: 'zpk', displayName: '검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [서비스] };

/** 한 쪽 2건 · 끝 쪽 1건 — total 3 */
const 쪽1: CasePage = { items: [케이스('ZPK-001'), 케이스('ZPK-002')], total: 3, page: 1, pageSize: 2, lastCounts: null };
const 쪽2: CasePage = { items: [케이스('ZPK-003')], total: 3, page: 2, pageSize: 2, lastCounts: null };

async function 그리기(cases: (page: number) => CasePage = (page) => (page === 1 ? 쪽1 : 쪽2), 할수: 판정 = () => true) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  const 스파이 = vi.spyOn(api, 'cases').mockImplementation((q) => Promise.resolve(cases(q.page ?? 1)));
  render(<CaseList kind="FN" service="ZPK" 할수={할수} 결과보나 />);
  await screen.findByText('ZPK-001');
  return 스파이;
}

const 고르기칸 = () => screen.getAllByRole('checkbox', { name: /고르기$/ }) as HTMLInputElement[];
const 머리칸 = () => screen.getByRole('checkbox', { name: '이 쪽 전체 선택' });
const 띠 = () => document.querySelector('.pick-band');
const 바 = () => screen.getByRole('toolbar', { name: '고른 케이스' });
const 바글 = () => 바().querySelector('span')?.textContent;

describe('「모두 고르기」 띠', () => {
  it('머리 네모로 이 쪽을 다 고르면 띠가 서고, 누르면 쪽을 넘기지 않고 조건에 맞는 전부를 고른다', async () => {
    const 스파이 = await 그리기();
    expect(띠()).toBeNull();

    fireEvent.click(머리칸());
    expect(띠()?.textContent).toContain('이 쪽 2건을 모두 골랐습니다');
    expect(바글()).toBe('2건 고름');

    스파이.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));

    expect(띠()?.textContent).toContain('조건에 맞는 3건을 모두 골랐습니다');
    expect(바글()).toBe('조건에 맞는 3건 모두 고름');
    expect(스파이).not.toHaveBeenCalled();
  });

  it('모두 고른 채 바의 실행은 조건에 맞는 전부를 쪽마다 모아 담는다', async () => {
    const 스파이 = await 그리기();
    fireEvent.click(머리칸());
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));
    스파이.mockClear();

    fireEvent.click(within(바()).getByRole('button', { name: '실행' }));

    const 모달 = await screen.findByRole('dialog');
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 3건');
    expect(스파이.mock.calls.map(([q]) => q.page)).toEqual([1, 2]);
  });

  it('이 쪽이 조건에 맞는 전부면 띠가 서지 않는다 — 넓힐 것이 없다', async () => {
    await 그리기(() => ({ ...쪽1, total: 2 }));
    fireEvent.click(머리칸());
    expect(띠()).toBeNull();
    expect(바글()).toBe('2건 고름');
  });

  it('모두 고른 채 줄 하나를 풀면 「모두」가 풀리고 이 쪽에서 고른 것만 남는다', async () => {
    await 그리기();
    fireEvent.click(머리칸());
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));

    fireEvent.click(고르기칸()[0]!);

    expect(바글()).toBe('1건 고름');
    expect(띠()).toBeNull();
  });

  it('필터를 바꾸면 「모두」는 풀리고 고른 줄은 남는다', async () => {
    const 스파이 = await 그리기();
    fireEvent.click(머리칸());
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));

    fireEvent.change(screen.getByPlaceholderText('케이스 이름이나 ID로 찾기'), { target: { value: '결제' } });
    fireEvent.click(screen.getByRole('button', { name: '찾기' }));
    await waitFor(() => expect(스파이.mock.calls.at(-1)![0].q).toBe('결제'));

    expect(바글()).toBe('2건 고름');
  });

  it('모두 고른 채 다음 쪽으로 가면 그 쪽 줄도 고른 모양이고 바는 그대로다', async () => {
    await 그리기();
    fireEvent.click(머리칸());
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByText('ZPK-003');

    expect(고르기칸().map((칸) => 칸.checked)).toEqual([true]);
    expect((머리칸() as HTMLInputElement).checked).toBe(true);
    expect(바글()).toBe('조건에 맞는 3건 모두 고름');
  });

  it('모두 고른 채 머리 네모를 누르면 전부 풀린다', async () => {
    await 그리기();
    fireEvent.click(머리칸());
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));

    fireEvent.click(머리칸());

    expect(screen.queryByRole('toolbar', { name: '고른 케이스' })).toBeNull();
    expect(고르기칸().some((칸) => 칸.checked)).toBe(false);
  });

  it('띠의 고르기 풀기는 전부 푼다', async () => {
    await 그리기();
    fireEvent.click(머리칸());
    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 3건 모두 고르기' }));

    fireEvent.click(within(띠() as HTMLElement).getByRole('button', { name: '고르기 풀기' }));

    expect(screen.queryByRole('toolbar', { name: '고른 케이스' })).toBeNull();
    expect(고르기칸().some((칸) => 칸.checked)).toBe(false);
  });
});

describe('상한을 띠가 미리 알린다', () => {
  // 쪽 크기 2 · 쪽상한 40 이면 실행은 앞 80건까지 담는다. 삭제 요청 상한은 50건
  const 큰쪽 = (total: number) => () => ({ ...쪽1, total });

  it('삭제 요청 상한을 넘으면 누르기 전부터 알리고, 모두 고르면 바의 삭제 요청이 잠긴다', async () => {
    await 그리기(큰쪽(60));
    fireEvent.click(머리칸());
    expect(띠()?.textContent).toContain('모두 고르면 삭제 요청은 보낼 수 없습니다(한 번에 50건까지)');
    expect((within(바()).getByRole('button', { name: '삭제 요청' }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '조건에 맞는 60건 모두 고르기' }));
    expect((within(바()).getByRole('button', { name: '삭제 요청' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('실행이 담는 한계를 넘으면 앞 몇 건까지만 담는지 알린다', async () => {
    await 그리기(큰쪽(81));
    fireEvent.click(머리칸());
    expect(띠()?.textContent).toContain('실행은 앞 80건까지만 담습니다');
  });

  it('한계 안이면 실행 안내가 없다', async () => {
    await 그리기(큰쪽(80));
    fireEvent.click(머리칸());
    expect(띠()?.textContent).not.toContain('실행은 앞');
  });

  it('작성 쓰기가 없으면 삭제 안내도 바의 삭제 요청도 없다', async () => {
    await 그리기(큰쪽(60), (무엇) => 무엇 !== '작성요청');
    fireEvent.click(머리칸());
    expect(띠()?.textContent).not.toContain('삭제 요청');
    expect(within(바()).queryByRole('button', { name: '삭제 요청' })).toBeNull();
  });
});

describe('Shift 사이 고르기', () => {
  const 네건: CasePage = { items: ['ZPK-001', 'ZPK-002', 'ZPK-003', 'ZPK-004'].map(케이스), total: 4, page: 1, pageSize: 50, lastCounts: null };

  it('한 줄을 고르고 Shift 를 누른 채 다른 줄을 고르면 사이 줄이 다 골라진다', async () => {
    await 그리기(() => 네건);
    fireEvent.click(고르기칸()[0]!);
    fireEvent.click(고르기칸()[2]!, { shiftKey: true });

    expect(고르기칸().map((칸) => 칸.checked)).toEqual([true, true, true, false]);
    expect(바글()).toBe('3건 고름');
  });

  it('고른 줄에서 Shift 로 풀면 사이 줄이 다 풀린다', async () => {
    await 그리기(() => 네건);
    fireEvent.click(머리칸());
    fireEvent.click(고르기칸()[3]!);
    fireEvent.click(고르기칸()[1]!, { shiftKey: true });

    expect(고르기칸().map((칸) => 칸.checked)).toEqual([true, false, false, false]);
  });

  it('고르기 풀기 뒤의 Shift 는 지난번 줄에서 시작하지 않는다', async () => {
    await 그리기(() => 네건);
    fireEvent.click(고르기칸()[0]!);
    fireEvent.click(within(바()).getByRole('button', { name: '고르기 풀기' }));

    fireEvent.click(고르기칸()[3]!, { shiftKey: true });

    expect(고르기칸().map((칸) => 칸.checked)).toEqual([false, false, false, true]);
  });

  it('Shift 없이 고르면 그 줄 하나만 바뀐다', async () => {
    await 그리기(() => 네건);
    fireEvent.click(고르기칸()[0]!);
    fireEvent.click(고르기칸()[2]!);
    expect(고르기칸().map((칸) => 칸.checked)).toEqual([true, false, true, false]);
  });
});
