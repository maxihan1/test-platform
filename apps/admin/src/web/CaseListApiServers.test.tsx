// @vitest-environment jsdom
// 케이스 목록의 API 서버 — 줄 태그 · 칩 줄 · 거르기 · 사라진 이름 (도메인/카탈로그 §8.1 「API 서버」, 시안 A)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage, type CaseQuery, type CaseRow } from './api.js';
import { CaseList } from './CaseList.js';
import { 필터단추, 판열기, 판조건 } from './CaseListFilterBar.fixture.js';
import type { 판정 } from './role.js';

beforeEach(() => {
  window.location.hash = '#/cases/fn';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 케이스(tcId: string, apiServers: string[]): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-10-20T00:00:00.000Z',
    feature: null,
    reqs: [],
    screens: [],
    apiServers,
  };
}

const 쪽: CasePage = {
  items: [케이스('ZAS-FN-001', ['결제', '인증']), 케이스('ZAS-FN-002', [])],
  total: 2,
  page: 1,
  pageSize: 50,
  groups: [{ feature: null, screen: null, screenUrl: null, part: null, tcIds: ['ZAS-FN-001', 'ZAS-FN-002'] }],
  hasFeatures: false,
  apiServers: [
    { name: '결제', count: 1 },
    { name: '인증', count: 3 },
  ],
};

const 전부된다: 판정 = () => true;

function 그리기(받을쪽: CasePage = 쪽) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] } as Awaited<ReturnType<typeof api.lastByCase>>);
  const 스파이 = vi.spyOn(api, 'cases').mockResolvedValue(받을쪽);
  render(<CaseList kind="FN" service="ZAS" 할수={전부된다} 결과보나 />);
  return 스파이;
}

// 「전체」 칩은 디바이스 · 표시 · 종류에도 있다 — 필터 판의 API 서버 줄 안에서만 찾는다
const 서버줄 = () => within(판조건('API 서버'));

const 마지막조건 = (스파이: { mock: { calls: [CaseQuery][] } }) => 스파이.mock.calls.at(-1)![0];

describe('API 서버 꼬리표', () => {
  it('줄 아래에 이름 태그가 서고, 부른 서버가 없는 케이스에는 안 선다', async () => {
    그리기();
    const 줄 = (await screen.findByText('ZAS-FN-001')).closest('.row')!;
    expect(within(줄 as HTMLElement).getByText('API 서버')).toBeTruthy();
    expect([...줄.querySelectorAll('.tech-tag')].map((el) => el.textContent)).toEqual(['결제', '인증']);
    const 빈줄 = screen.getByText('ZAS-FN-002').closest('.row')!;
    expect(빈줄.querySelector('.tech-tag')).toBeNull();
  });

  it('필터 판의 API 서버 줄은 「전체」와 이름마다 건수를 단 칩이다 — 처음에는 전체가 눌려 있다', async () => {
    그리기();
    await screen.findByText('ZAS-FN-001');
    expect(서버줄().getByRole('button', { name: '전체', pressed: true })).toBeTruthy();
    expect(서버줄().getByRole('button', { name: /^인증\s*3$/ })).toBeTruthy();
    expect(서버줄().getByRole('button', { name: /^결제\s*1$/ })).toBeTruthy();
  });

  it('이름이 하나도 없으면 판에 API 서버 줄을 안 그린다', async () => {
    그리기({ ...쪽, apiServers: [] });
    await screen.findByText('ZAS-FN-001');
    expect(within(판열기()).queryByRole('group', { name: 'API 서버' })).toBeNull();
  });

  it('칩을 누르면 그 이름으로 서버에 다시 묻고 주소에 남긴다. 다시 누르면 푼다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZAS-FN-001');
    fireEvent.click(서버줄().getByRole('button', { name: /^인증\s*3$/ }));

    expect(await 서버줄().findByRole('button', { name: /^인증\s*3$/, pressed: true })).toBeTruthy();
    expect(마지막조건(스파이).apiServer).toBe('인증');
    expect(window.location.hash).toContain('api=');
    expect(decodeURIComponent(window.location.hash)).toContain('api=인증');

    fireEvent.click(서버줄().getByRole('button', { name: /^인증\s*3$/ }));
    expect(await 서버줄().findByRole('button', { name: '전체', pressed: true })).toBeTruthy();
    expect(마지막조건(스파이).apiServer).toBeUndefined();
  });

  it('주소에 남은 이름이 판에 없어도(설정에서 지웠다) 걸린 칩이 서고 ✕ 로 푼다', async () => {
    window.location.hash = `#/cases/fn?api=${encodeURIComponent('옛이름')}`;
    const 스파이 = 그리기({ ...쪽, items: [], total: 0, groups: [] });
    const 칩 = await screen.findByText('API 서버 옛이름');
    expect(마지막조건(스파이).apiServer).toBe('옛이름');

    fireEvent.click(within(칩.closest('.filter-on') as HTMLElement).getByRole('button', { name: 'API 서버 옛이름 조건 풀기' }));
    await waitFor(() => expect(screen.queryByText('API 서버 옛이름')).toBeNull());
    expect(마지막조건(스파이).apiServer).toBeUndefined();
  });

  it('고른 이름은 표 위 칩 하나로 남고 필터 단추에 고른 조건 수가 붙는다', async () => {
    window.location.hash = `#/cases/fn?api=${encodeURIComponent('인증')}`;
    그리기();
    await screen.findByText('ZAS-FN-001');
    expect(screen.getAllByText('API 서버 인증')).toHaveLength(1);
    expect(필터단추().textContent).toBe('필터 1');
  });
});
