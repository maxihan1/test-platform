// @vitest-environment jsdom
// 케이스 목록의 검색 조건 · 쪽이 주소에 남는다 — 상세에 갔다 뒤로 와도 그대로다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage, type CaseQuery, type CaseRow } from './api.js';
import { CaseList } from './CaseList.js';
import { 판닫기, 판조건, 판칩누르기 } from './CaseListFilterBar.fixture.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '#/cases');
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
    scannedAt: '2026-10-19T00:00:00.000Z',
    feature: null,
    reqs: [],
    screens: [],
  };
}

const 쪽: CasePage = { items: [케이스('ZCA-FN-001')], total: 120, page: 1, pageSize: 1, groups: [], hasFeatures: false, lastCounts: { total: 120, pass: 100, fail: 7, na: 13 } };
const 전부된다: 판정 = () => true;

async function 그리기(주소: string) {
  window.history.replaceState(null, '', 주소);
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  const 스파이 = vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  render(<CaseList kind="FN" service="ZCA" 할수={전부된다} 결과보나 />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  await screen.findByPlaceholderText('케이스 이름이나 ID로 찾기');
  return 스파이;
}

const 처음조건 = (스파이: { mock: { calls: [CaseQuery][] } }) => 스파이.mock.calls[0]![0];

describe('케이스 목록 조건을 주소에서 읽는다', () => {
  it('주소의 조건과 쪽으로 처음부터 부르고 찾기 칸 · 결과 탭 · 고른 조건 칩 · 필터 판이 그 조건을 보인다', async () => {
    const 조건 = new URLSearchParams({ q: '로그인', page: '3', dev: 'mobile', all: '1', last: 'FAIL', tech: '경계값 분석', axis: '경계' });
    const 스파이 = await 그리기(`#/cases/fn?${조건}`);

    expect(처음조건(스파이)).toMatchObject({ q: '로그인', page: 3, platform: 'mobile', active: false, technique: '경계값 분석', axis: '경계', last: 'FAIL' });
    expect((screen.getByPlaceholderText('케이스 이름이나 ID로 찾기') as HTMLInputElement).value).toBe('로그인');
    expect(screen.getByRole('button', { name: '실패 7' }).getAttribute('aria-pressed')).toBe('true');
    expect([...document.querySelectorAll('.filter-on')].map((el) => el.firstChild?.textContent)).toEqual(['표시 전체', '종류 경계', '설계 기법 경계값 분석', '디바이스 모바일']);
    expect(within(판조건('디바이스')).getByRole('button', { name: '모바일' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('주소의 case= 로 처음부터 오른쪽 상세 칸이 열려 있다', async () => {
    await 그리기('#/cases/fn?case=ZCA-FN-001');

    const 칸 = document.getElementById('case-pane');
    expect(칸?.querySelector('h2')?.textContent).toBe('ZCA-FN-001 케이스');
    expect(screen.getByRole('button', { name: 'ZCA-FN-001 케이스' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('고를 수 없는 값은 버리고 기본값으로 부른다', async () => {
    const 스파이 = await 그리기('#/cases/fn?dev=tv&axis=UI&tech=없는기법&last=OK&page=-2');

    const 조건 = 처음조건(스파이);
    expect(조건.page).toBe(1);
    expect(조건.platform).toBeUndefined();
    expect(조건.axis).toBeUndefined();
    expect(조건.technique).toBeUndefined();
    expect(조건.last).toBeUndefined();
  });

  it('묶음 조건은 이름까지 주소에서 되살려 칩으로 보인다', async () => {
    const 스파이 = await 그리기(`#/cases/fn?${new URLSearchParams({ g: '회원가입', gs: 'tests/zca/pages/signup.page.ts', gn: '회원가입 › /signup' })}`);

    expect(처음조건(스파이)).toMatchObject({ feature: '회원가입', screen: 'tests/zca/pages/signup.page.ts' });
    expect(screen.getByRole('button', { name: '회원가입 › /signup 조건 풀기' })).toBeTruthy();
  });
});

describe('케이스 목록 조건을 주소에 쓴다', () => {
  it('조건 없이 들어온 주소는 건드리지 않는다', async () => {
    await 그리기('#/cases');
    expect(window.location.hash).toBe('#/cases');
  });

  it('필터 판 · 쪽을 바꾸면 방문 기록을 쌓지 않고 지금 주소를 고치고, 조건 초기화면 조건이 빠진다', async () => {
    await 그리기('#/cases/fn');
    const 길이 = window.history.length;

    판칩누르기('디바이스', '모바일');
    expect(window.location.hash).toBe('#/cases/fn?dev=mobile');
    판닫기();
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    expect(window.location.hash).toBe('#/cases/fn?page=2&dev=mobile');
    expect(window.history.length).toBe(길이);

    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
    expect(window.location.hash).toBe('#/cases/fn');
  });

  it('이름을 눌러 상세 칸을 열면 case= 가 붙고 닫으면 빠진다 — 방문 기록은 쌓지 않는다', async () => {
    await 그리기('#/cases/fn?dev=mobile');
    const 길이 = window.history.length;

    fireEvent.click(screen.getByRole('button', { name: 'ZCA-FN-001 케이스' }));
    expect(window.location.hash).toBe('#/cases/fn?dev=mobile&case=ZCA-FN-001');
    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    expect(window.location.hash).toBe('#/cases/fn?dev=mobile');
    expect(window.history.length).toBe(길이);
  });

  it('조건 초기화를 눌러도 열어 둔 상세 칸은 그대로 둔다 — 조건이 아니라 보고 있는 것이다', async () => {
    await 그리기('#/cases/fn?dev=mobile&case=ZCA-FN-001');

    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));

    expect(window.location.hash).toBe('#/cases/fn?case=ZCA-FN-001');
    expect(document.getElementById('case-pane')).not.toBeNull();
  });

  it('마지막 결과 칩을 누르면 last 가 주소에 남고, 전체로 돌리면 빠진다', async () => {
    await 그리기('#/cases/fn');

    fireEvent.click(screen.getByRole('button', { name: '미실행 13' }));
    expect(window.location.hash).toBe('#/cases/fn?last=NA');
    fireEvent.click(screen.getByRole('button', { name: '전체 120' }));
    expect(window.location.hash).toBe('#/cases/fn');
  });

  it('찾기는 누른 뒤에만 주소에 남는다 — 치는 동안의 글자는 조건이 아니다', async () => {
    await 그리기('#/cases/fn');
    const 칸 = screen.getByPlaceholderText('케이스 이름이나 ID로 찾기');

    fireEvent.change(칸, { target: { value: '결제' } });
    expect(window.location.hash).toBe('#/cases/fn');
    fireEvent.click(screen.getByRole('button', { name: '찾기' }));
    expect(window.location.hash).toBe(`#/cases/fn?${new URLSearchParams({ q: '결제' })}`);
  });
});

describe('보고 있는 목록의 메뉴를 다시 누르면', () => {
  it('화면이 든 조건으로 주소를 되돌린다 — 화면과 주소가 갈리지 않는다', async () => {
    await 그리기('#/cases/fn');
    판칩누르기('디바이스', '모바일');
    const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
    window.location.hash = '#/cases/fn';
    await 도착;
    expect(window.location.hash).toBe('#/cases/fn?dev=mobile');
  });
});
