// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { Prd } from './Prd.js';
import { 판, 로그인실패 } from './prd.fixture.js';
import type { PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 워드 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  워드: vi.fn((_s: string): Promise<{ 파일: Blob; 머리: string | null }> => Promise.reject(new Error('워드를 정하지 않았다'))),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, wordExport: 워드, apis: () => Promise.resolve({ apis: [] }) } }));

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판());
  워드.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PRD 관리 — 머리와 할 일 칸', () => {
  it('판이 없으면 빈 화면과 첫 요구를 적는 길을 보인다', async () => {
    지금.mockResolvedValue(판({ version: 0, items: [] }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('테스트 작성 요청으로 기획서를 올리거나, 요구사항 추가로 첫 요구를 직접 적습니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: '테스트 작성 요청' }).getAttribute('href')).toBe('#/authoring');
    expect(screen.queryByRole('button', { name: '버전 기록' })).toBeNull();
    expect(screen.queryByRole('button', { name: '내려받기' })).toBeNull();
  });

  it('머리에서 테스트 작성으로 가는 길은 작성 쓰기가 있을 때만 있다 (점검 8.1)', async () => {
    const { unmount } = render(<Prd service="MKT" 할수={쓰는사람} />);
    expect((await screen.findByRole('link', { name: '테스트 작성 요청' })).getAttribute('href')).toBe('#/authoring');
    unmount();
    render(<Prd service="MKT" 할수={보는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(screen.queryByRole('link', { name: '테스트 작성 요청' })).toBeNull();
  });

  it('내려받기는 한 단추로 접혀 있고, 눌러야 워드와 추적표 엑셀이 나온다 (점검 8.1)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 메뉴 = await screen.findByRole('button', { name: /^내려받기/ });
    expect(screen.queryByRole('button', { name: '워드로 내려받기' })).toBeNull();
    fireEvent.click(메뉴);
    expect(screen.getByRole('button', { name: '워드로 내려받기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '추적표 엑셀로 내려받기' })).toBeTruthy();
  });


  it('묶음 전체가 같은 꼬리면 같은 숫자를 되풀이하지 않고 「모두」 로 줄인다 (점검 N9)', async () => {
    지금.mockResolvedValue(판({ items: [판().items[1]!] }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 묶음 = await screen.findByRole('button', { name: /회원가입/ });
    expect(묶음.textContent).toContain('1건 · 모두 확인 필요 · 모두 미작성');
    expect(묶음.textContent).not.toContain('확인 필요 1건');
  });

















  it('확인 필요 · 반영 안 됨 · PRD 에 없는 화면 카드와 일괄 확정 · 반영 단추는 이제 없다 (결정 필요 한 곳으로 옮겼다)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(screen.queryByRole('region', { name: /^확인 필요 \d|반영 안 됨|PRD 에 없는 화면|케이스가 안 거친 API/ })).toBeNull();
    expect(screen.queryByText('확인할 요구도 테스트에 반영할 요구도 없습니다')).toBeNull();
    expect(screen.queryByRole('button', { name: /확정|테스트에 반영/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-032|MKT-REQ-040/ }));
    expect(screen.queryByRole('button', { name: '이 요구만 확정' })).toBeNull();
    expect(screen.getByRole('button', { name: '고치기' })).toBeTruthy();
  });

  it('작성 쓰기가 없으면 고르기 · 확정 · 더하기 · 고치기가 아예 없다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    await screen.findByText('버전 12 · 요구 4건');
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
    expect(screen.queryByRole('button', { name: /확정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '요구사항 추가' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByText('설계 미리보기')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '고치기' })).toBeNull();
  });
});

describe('PRD 관리 — 전체 요구', () => {
  it('기능 묶음으로 접혀 있고 묶음 머리에 건수와 확인 필요를 단다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 로그인 = await screen.findByRole('button', { name: /로그인/ });
    expect(로그인.textContent).toContain('2건 · 확인 필요 1건');
    expect(로그인.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /MKT-REQ-041/ })).toBeNull();
    fireEvent.click(로그인);
    const 줄 = screen.getByRole('button', { name: /MKT-REQ-041/ });
    expect(줄.textContent).not.toContain('반영 안 됨');
    expect(줄.textContent).toContain('사람이 고침');
  });

  it('줄을 펴면 근거와 판정 함수가 계산한 설계 미리보기를 보인다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByText('원문: 「아이디: 영문 소문자·숫자 4~12자」')).toBeTruthy();
    expect(['3자', '4자', '12자', '13자'].every((값) => screen.getByText(값))).toBe(true);
    expect(screen.getByText('동등 분할')).toBeTruthy();
  });

  it('찾는 동안은 맞은 묶음을 다 펴고, 없으면 그렇게 말한다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('textbox', { name: '요구 문장 · 번호 검색' });
    fireEvent.change(칸, { target: { value: '잠긴다' } });
    expect(screen.getByRole('button', { name: /MKT-REQ-041/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /회원가입/ })).toBeNull();
    fireEvent.change(칸, { target: { value: '없는 말' } });
    expect(screen.getByText('찾는 요구가 없습니다')).toBeTruthy();
  });


  it('케이스 목록의 요구 번호에서 오면 그 묶음과 줄을 편 채로 열고 그 줄에 초점을 둔다 (도메인/카탈로그 §8.1 「맥락」)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} 여기="MKT-REQ-041" />);
    const 줄 = await screen.findByRole('button', { name: /MKT-REQ-041/ });
    expect(줄.getAttribute('aria-expanded')).toBe('true');
    expect(줄.closest('.prd-item')?.classList.contains('prd-here')).toBe(true);
    expect(document.activeElement).toBe(줄);
    expect(screen.queryByRole('button', { name: /MKT-REQ-031/ })).toBeNull();
  });

  it('지금 판에 없는 번호로 오면 아무것도 펴지 않는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} 여기="MKT-REQ-999" />);
    expect((await screen.findByRole('button', { name: /로그인/ })).getAttribute('aria-expanded')).toBe('false');
  });

  it('로그인 묶음의 두 근거를 다 보인다 — 문서끼리 달라 확인 필요가 된 항목', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-040/ }));
    for (const b of 로그인실패.basis) expect(screen.getByText(`원문: 「${b.quote}」`)).toBeTruthy();
  });
});

describe('PRD 관리 — 워드로 내려받기', () => {
  it('보기 권한만 있어도 받고, 받는 동안 막고, 서버가 준 이름으로 저장한다', async () => {
    let 끝내기: (값: { 파일: Blob; 머리: string | null }) => void = () => undefined;
    워드.mockReturnValue(new Promise((r) => (끝내기 = r)));
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:prd'), revokeObjectURL: vi.fn() });
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<Prd service="MKT" 할수={보는사람} />);

    fireEvent.click(await screen.findByRole('button', { name: /^내려받기/ }));
    fireEvent.click(screen.getByRole('button', { name: '워드로 내려받기' }));
    expect(워드).toHaveBeenCalledWith('MKT');
    expect(screen.getByRole('button', { name: /^만드는 중…/ })).toHaveProperty('disabled', true);

    끝내기({ 파일: new Blob(['x']), 머리: 'attachment; filename="MKT-PRD-v12.docx"' });
    await vi.waitFor(() => expect(누름).toHaveBeenCalledOnce());
    expect((누름.mock.contexts[0] as HTMLAnchorElement).download).toBe('MKT-PRD-v12.docx');
    expect(screen.getByRole('button', { name: /^내려받기/ })).toHaveProperty('disabled', false);
    누름.mockRestore();
  });

  it('거절당하면 알림 줄에 까닭을 띄우고 저장하지 않는다', async () => {
    워드.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'authoring:read', []));
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    render(<Prd service="MKT" 할수={보는사람} />);

    fireEvent.click(await screen.findByRole('button', { name: /^내려받기/ }));
    fireEvent.click(screen.getByRole('button', { name: '워드로 내려받기' }));
    expect((await screen.findByRole('status')).className).toBe('prd-note bad');
    expect(누름).not.toHaveBeenCalled();
    누름.mockRestore();
  });
});

describe('PRD 관리 — 찾기 글자는 주소에 남는다', () => {
  it('주소의 찾기 글자로 처음부터 거르고, 고치면 방문 기록을 쌓지 않고 주소를 고친다', async () => {
    window.history.replaceState(null, '', `#/prd?${new URLSearchParams({ q: '비밀번호' })}`);
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = (await screen.findByRole('textbox', { name: '요구 문장 · 번호 검색' })) as HTMLInputElement;
    expect(칸.value).toBe('비밀번호');
    expect(screen.queryByText(/MKT-REQ-031/)).toBeNull();

    const 길이 = window.history.length;
    fireEvent.change(칸, { target: { value: '' } });
    expect(window.location.hash).toBe('#/prd');
    expect(window.history.length).toBe(길이);
    window.history.replaceState(null, '', '#/');
  });
});
