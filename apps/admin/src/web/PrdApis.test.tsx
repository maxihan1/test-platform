// @vitest-environment jsdom
// 「PRD 관리」 서비스 지도 — 편 요구 줄의 「거치는 API」와 「케이스가 안 거친 API」 카드
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { 지도API } from '../prd/apiMap.js';
import { Prd } from './Prd.js';
import { 판 } from './prd.fixture.js';
import type { PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 지도 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  지도: vi.fn((_s: string): Promise<{ apis: 지도API[] }> => Promise.resolve({ apis: [] })),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, apis: 지도 } }));

const 보는사람: 판정 = () => false;

const api = (method: string, path: string, 덮: Partial<지도API> = {}): 지도API => ({
  method,
  host: 'demo.market',
  path,
  firstSeen: '2026-10-14T01:00:00Z',
  lastSeen: '2026-10-15T01:00:00Z',
  cases: [],
  screens: [],
  ...덮,
});

const 지도셋: 지도API[] = [
  api('POST', '/api/auth/login', { cases: [{ tcId: 'MKT-FN-012', steps: [2] }, { tcId: 'MKT-FN-099', steps: [1] }] }),
  api('GET', '/api/me', { cases: [{ tcId: 'MKT-FN-012', steps: [] }] }),
  api('POST', '/api/auth/password-reset', { screens: [{ env: 'stg', state: '로그아웃', url: '/login/forgot' }] }),
  api('GET', '/api/orders'),
];

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판({ cases: { 'MKT-REQ-040': [{ tcId: 'MKT-FN-012', axis: '예외', techniques: [], platforms: ['desktop'] }] } }));
  지도.mockReset();
  지도.mockResolvedValue({ apis: 지도셋 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PRD 관리 — 애플리케이션 지도', () => {
  it('요구 줄을 펴면 그 요구의 케이스가 부른 API 와 단계만 보인다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-040/ }));
    const 구획 = (await screen.findByText('거치는 API 2개')).closest('section') as HTMLElement;
    const 줄들 = within(구획).getAllByRole('listitem').map((x) => x.textContent);
    // 다른 요구의 케이스(MKT-FN-099)는 안 달고, 단계가 없는 줄은 번호만
    expect(줄들).toEqual(['POSTdemo.market/api/auth/loginMKT-FN-012 2단계', 'GETdemo.market/api/meMKT-FN-012']);
  });

  it('펼친 줄의 거치는 API 는 개발 정보라 접혀 있다 (점검 8.12)', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-040/ }));
    const 접기 = (await screen.findByText('거치는 API 2개')).closest('details') as HTMLDetailsElement;
    expect(접기.open).toBe(false);
  });

  it('케이스가 안 부른 API 를 카드에 모으고 본 화면을 단다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    const 카드 = await screen.findByRole('region', { name: '케이스가 안 거친 API 2개' });
    expect(within(카드).getByText('이 애플리케이션에서 본 API 4개 중 아직 어떤 케이스도 부르지 않은 API 입니다')).toBeTruthy();
    // 접혀 있다가 펴면 나온다 — 수십 개가 요구 목록을 밀어내지 않게 (점검 8.6)
    expect(within(카드).queryByText(/화면 \/login\/forgot 에서 봤습니다/)).toBeNull();
    fireEvent.click(within(카드).getByRole('button', { name: '펴기' }));
    expect(within(카드).getByText(/화면 \/login\/forgot 에서 봤습니다/)).toBeTruthy();
    fireEvent.click(within(카드).getByRole('button', { name: '접기' }));
    expect(within(카드).queryByText(/화면 \/login\/forgot 에서 봤습니다/)).toBeNull();
    fireEvent.click(within(카드).getByRole('button', { name: '펴기' }));
    expect(within(카드).queryByText('demo.market/api/auth/login')).toBeNull();
  });

  it('지도가 비었으면 카드도 거치는 API 도 없다', async () => {
    지도.mockResolvedValue({ apis: [] });
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-040/ }));
    await screen.findByRole('heading', { name: '테스트' });
    expect(screen.queryByText(/케이스가 안 거친 API/)).toBeNull();
    expect(screen.queryByText(/거치는 API/)).toBeNull();
  });

  it('지도를 못 읽어도 메뉴는 그대로 쓰고 까닭을 한 줄로 보인다', async () => {
    지도.mockRejectedValue(new Error('서버가 답하지 않습니다'));
    render(<Prd service="MKT" 할수={보는사람} />);
    expect(await screen.findByText(/애플리케이션 지도를 못 읽었습니다/)).toBeTruthy();
    expect(screen.getByText('버전 12 · 요구 4건')).toBeTruthy();
  });
});
