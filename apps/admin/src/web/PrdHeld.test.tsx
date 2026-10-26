// @vitest-environment jsdom
// 「PRD 관리」 보류 — 요구 줄의 셋(테스트 있음 · 보류 · 미작성) · 묶음 머리 · 할 일 칸의 보류 카드 (도메인/작성 §3.6 「★ 역할별 계정」)
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from './api.js';
import { Prd } from './Prd.js';
import { 판 } from './prd.fixture.js';
import type { PrdHeld, PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, apis: () => Promise.resolve({ apis: [] }) } }));

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

const 보류 = (덮을것: Partial<PrdHeld> = {}): PrdHeld => ({
  reqs: { 'MKT-REQ-031': ['관리자'], 'MKT-REQ-032': ['관리자', '판매자'] },
  roles: [
    { role: '관리자', count: 2, registered: false },
    { role: '판매자', count: 1, registered: true },
  ],
  continueFrom: null,
  ...덮을것,
});

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판({ held: 보류() }));
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 줄of = (reqId: string) => screen.getByRole('button', { name: new RegExp(reqId) }).closest('.prd-line') as HTMLElement;

describe('PRD 관리 — 보류', () => {
  it('테스트가 없고 계정이 없는 요구는 줄에 역할을 적고 나머지는 「미작성」이다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    expect(within(줄of('MKT-REQ-031')).getByText('보류 — 관리자 계정 미등록')).toBeTruthy();
    expect(within(줄of('MKT-REQ-032')).getByText('보류 — 관리자 계정 미등록')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
    expect(within(줄of('MKT-REQ-040')).getByText('미작성')).toBeTruthy();
  });

  it('그 역할 계정을 모두 넣었으면 「등록됨 · 이어 작성 전」이라고 적는다', async () => {
    지금.mockResolvedValue(판({ held: 보류({ reqs: { 'MKT-REQ-031': ['판매자'] } }) }));
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    expect(within(줄of('MKT-REQ-031')).getByText('보류 — 판매자 계정 등록됨 · 이어 작성 전')).toBeTruthy();
  });

  it('묶음 머리에 보류와 미작성을 따로 센다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    const 회원가입 = await screen.findByRole('button', { name: /회원가입/ });
    expect(회원가입.textContent).toContain('2건 · 확인 필요 1건 · 모두 보류');
    expect(회원가입.textContent).not.toContain('미작성');
    expect((await screen.findByRole('button', { name: /로그인/ })).textContent).toContain('모두 미작성');
  });

  it('보류가 없으면 카드를 그리지 않는다', async () => {
    지금.mockResolvedValue(판());
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(screen.queryByText(/보류 \d+건/)).toBeNull();
  });
});

describe('PRD 관리 — 보류 카드', () => {
  const 카드 = () => screen.getByRole('region', { name: /보류 2건/ });

  it('계정이 없으면 등록하라고 알리고 설정으로 가는 길을 준다 — 이어 작성은 뿌리가 없어 막고 까닭을 적는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(within(카드()).getByText('보류 2건 — 관리자 계정이 등록되지 않았습니다')).toBeTruthy();
    expect(within(카드()).getByText('등록하면 이 요구만 다시 작성합니다')).toBeTruthy();
    expect(within(카드()).getByRole('link', { name: '설정에서 계정 등록' }).getAttribute('href')).toBe('#/settings/MKT');
    expect((within(카드()).getByRole('button', { name: '남은 요구로 이어 작성' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(카드()).getByText('계정을 등록한 뒤에 이어 작성할 수 있습니다')).toBeTruthy();
  });

  it('계정을 다 넣었는데 이어 갈 뿌리가 없으면 그 까닭을 적는다', async () => {
    지금.mockResolvedValue(판({ held: 보류({ roles: [{ role: '관리자', count: 2, registered: true }] }) }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(within(카드()).getByText('보류 2건 — 관리자 계정을 등록했습니다')).toBeTruthy();
    expect(within(카드()).getByText('이어 작성하면 이 요구만 다시 작성합니다')).toBeTruthy();
    expect(within(카드()).getByText('이어 작성할 작성 요청이 없습니다')).toBeTruthy();
  });

  it('이어 작성을 누르면 서버가 준 뿌리로 새 요청을 세우고 그 요청 화면으로 간다', async () => {
    지금.mockResolvedValue(판({ held: 보류({ roles: [{ role: '관리자', count: 2, registered: true }], continueFrom: 5873 }) }));
    const 부름 = vi.spyOn(api, 'createAuthoringRequest').mockResolvedValue({ id: 5901 });
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    fireEvent.click(within(카드()).getByRole('button', { name: '남은 요구로 이어 작성' }));
    await vi.waitFor(() => expect(window.location.hash).toBe('#/authoring/5901'));
    expect(부름).toHaveBeenCalledWith('MKT', { kind: 'AUTHOR', continueFrom: 5873 });
  });

  it('서버가 막으면 까닭을 보이고 이동하지 않는다', async () => {
    지금.mockResolvedValue(판({ held: 보류({ roles: [{ role: '관리자', count: 2, registered: true }], continueFrom: 5873 }) }));
    vi.spyOn(api, 'createAuthoringRequest').mockRejectedValue(new ApiError(409, 'NOTHING_LEFT', ''));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    fireEvent.click(within(카드()).getByRole('button', { name: '남은 요구로 이어 작성' }));
    expect((await within(카드()).findByRole('alert')).textContent).not.toBe('');
    expect(window.location.hash).toBe('');
  });

  it('작성 write 가 없으면 이어 작성 버튼을 안 그린다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(within(카드()).queryByRole('button', { name: '남은 요구로 이어 작성' })).toBeNull();
    expect(within(카드()).getByRole('link', { name: '설정에서 계정 등록' })).toBeTruthy();
  });

  it('요구가 없어도 보류가 있으면 카드만은 선다', async () => {
    지금.mockResolvedValue(판({ items: [], held: 보류() }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByRole('region', { name: /보류 2건/ })).toBeTruthy();
    expect(screen.queryByText('확인할 요구도 테스트에 반영할 요구도 없습니다')).toBeNull();
  });
});
