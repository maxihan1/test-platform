// @vitest-environment jsdom
// 케이스 목록 한 건 한 줄 — 머리 실행 단추 · 줄과 상세 서랍의 맥락 · 종류 칩 · 넘어온 요구 번호 (도메인/카탈로그 §8.1 「맥락」, 2026-11-11 시안 B)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';

import { api } from './api.js';
import { 그리기, 마지막조건, 비번, 쪽, 케이스, 화면 } from './CaseListContext.fixture.js';
import { 판열기, 판칩누르기 } from './CaseListFilterBar.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('머리 실행 단추', () => {
  it('거른 것이 없으면 「전체 실행 (N)」이고 N 은 응답의 total 이다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-001');
    expect(screen.getByRole('button', { name: '전체 실행 (3)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^검색 결과 실행/ })).toBeNull();
  });

  it('검색어를 넣어 거르면 「검색 결과 실행 (N)」으로 바뀐다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-001');

    fireEvent.change(screen.getByPlaceholderText('케이스 이름이나 ID로 검색'), { target: { value: '비번' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('button', { name: '검색 결과 실행 (3)' })).toBeTruthy();
    expect(마지막조건(스파이)).toMatchObject({ q: '비번' });
    expect(screen.queryByRole('button', { name: /^전체 실행/ })).toBeNull();
  });

  it('필터 칩으로 걸러도 「검색 결과 실행 (N)」이고 조건을 풀면 「전체 실행 (N)」으로 돌아온다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-001');

    판칩누르기('종류', '경계');
    expect(await screen.findByRole('button', { name: '검색 결과 실행 (3)' })).toBeTruthy();

    판칩누르기('종류', '전체');
    expect(await screen.findByRole('button', { name: '전체 실행 (3)' })).toBeTruthy();
  });
});

describe('한 건 한 줄과 상세 서랍의 맥락', () => {
  const 줄 = async (tcId: string) => (await screen.findByText(tcId)).closest('.row') as HTMLElement;
  async function 서랍열기(tcId: string) {
    vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(api, 'item').mockRejectedValue(new Error('절차 없음'));
    fireEvent.click(within(await 줄(tcId)).getByRole('button', { name: `${tcId} 케이스` }));
    return await screen.findByRole('complementary');
  }
  const 구획 = (칸: HTMLElement, 이름: string) => [...칸.querySelectorAll('.dsec')].find((el) => el.querySelector('.dlabel')?.textContent === 이름);

  it('줄에는 요구 · 종류 · 화면 · 설계 기법 · 최근 5회 막대가 없고 이름 · 결과 · ▶ 만 있다', async () => {
    그리기();
    const 비번줄 = await 줄('ZCL-FN-001');
    for (const 선택자 of ['.case-req', '.case-meta', '.axis-tag', '.case-screen', '.tech-tag', '.spark', 'small']) {
      expect(비번줄.querySelector(선택자), 선택자).toBeNull();
    }
    expect(within(비번줄).getByRole('button', { name: 'ZCL-FN-001 케이스' })).toBeTruthy();
    expect(within(비번줄).getByRole('button', { name: 'ZCL-FN-001 PC 실행' })).toBeTruthy();
  });

  it('서랍에 덮는 요구 전부 · 종류 · 설계 기법 · 화면이 서고 요구 번호는 「PRD 관리」 그 항목으로 간다', async () => {
    그리기();
    const 칸 = await 서랍열기('ZCL-FN-001');
    expect(within(칸).getByRole('link', { name: 'ZCL-REQ-003' }).getAttribute('href')).toBe('#/prd/ZCL-REQ-003');
    expect(within(칸).getByRole('link', { name: 'ZCL-REQ-004' })).toBeTruthy();
    expect(within(칸).getByText(/비밀번호는 8자 이상 20자 이하/)).toBeTruthy();
    expect([...칸.querySelectorAll('.axis-tag')].map((el) => el.textContent)).toEqual(['경계', '경계']);
    expect([...구획(칸, '설계 기법')!.querySelectorAll('.tech-tag')].map((el) => el.textContent)).toEqual(['경계값 분석']);
    expect(구획(칸, '화면')!.querySelector('.case-screen')?.textContent).toBe('/signup');
    expect(구획(칸, '화면')!.querySelector('.case-screen')?.getAttribute('title')).toBe('/signup');
    expect(구획(칸, '엔드포인트')).toBeUndefined();
    expect(구획(칸, 'API 서버')).toBeUndefined();
  });

  it('화면 파일 이름이 있으면 주소 · 영문 파일 이름 대신 그 이름을 보인다 (PRD-F9-18)', async () => {
    const 조각 = 'tests/zcl/components/terms.component.ts';
    const 이름있는 = { ...비번, screens: [{ file: 화면, url: '/signup', name: '회원가입화면' }, { file: 조각, url: null, name: '약관동의' }] };
    그리기({ 받을쪽: { ...쪽, items: [이름있는], total: 1 } });
    const 칸 = await 서랍열기('ZCL-FN-001');
    expect([...구획(칸, '화면')!.querySelectorAll('.case-screen')].map((el) => [el.textContent, el.getAttribute('title')])).toEqual([['회원가입 화면', '/signup'], ['약관동의', null]]);
  });

  it('API 애플리케이션은 화면 자리에 엔드포인트가 서고 서버 이름은 「API 서버」 구획에 선다 (WEB-F7-22)', async () => {
    const 주문 = 케이스('ZCL-FN-001', { feature: '주문', endpoints: ['POST /api/orders', 'POST /api/auth/login'], apiServers: ['결제', '인증'] });
    그리기({
      앱종류: 'API',
      받을쪽: { ...쪽, items: [주문], total: 1, groups: [{ feature: '주문', screen: null, screenUrl: null, part: null, endpoint: 'POST /api/orders', tcIds: ['ZCL-FN-001'] }] },
    });
    const 칸 = await 서랍열기('ZCL-FN-001');
    expect(구획(칸, '화면')).toBeUndefined();
    expect([...구획(칸, '엔드포인트')!.querySelectorAll('.case-screen')].map((el) => el.textContent)).toEqual(['POST /api/orders', 'POST /api/auth/login']);
    expect([...구획(칸, 'API 서버')!.querySelectorAll('.tech-tag')].map((el) => el.textContent)).toEqual(['결제', '인증']);
  });

  it('PRD 에 없는 번호는 고리 없이 그렇다고 적는다', async () => {
    그리기();
    const 칸 = await 서랍열기('ZCL-FN-003');
    expect(within(칸).queryByRole('link', { name: 'REQ-COM-006' })).toBeNull();
    expect(within(칸).getByText('REQ-COM-006')).toBeTruthy();
    expect(within(칸).getByText(/PRD 에 없는 번호예요/)).toBeTruthy();
  });

  it('작성 보기 권한이 없으면 서랍의 요구 번호가 글자뿐이다', async () => {
    그리기({ 요구보나: false });
    const 칸 = await 서랍열기('ZCL-FN-001');
    expect(within(칸).queryByRole('link')).toBeNull();
    expect(within(칸).getByText('ZCL-REQ-003')).toBeTruthy();
  });

  it('줄의 이름 버튼을 누르면 오른쪽 서랍이 열리고 모달은 뜨지 않는다', async () => {
    그리기();
    const 칸 = await 서랍열기('ZCL-FN-001');
    expect(칸.id).toBe('case-pane');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('종류 칩 · 넘어온 요구 번호', () => {
  it('기능 목록의 필터 판에는 종류 줄이 있고 고르면 그 축으로 부른다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-001');
    판칩누르기('종류', '경계');
    expect(마지막조건(스파이)).toMatchObject({ axis: '경계', page: 1 });
  });

  it('UI 목록의 필터 판에는 종류 줄이 없다', async () => {
    그리기({ kind: 'UI' });
    await screen.findByText('ZCL-FN-001');
    expect(within(판열기()).queryByRole('group', { name: '종류' })).toBeNull();
  });

  it('「PRD 관리」에서 넘어온 요구 번호로 처음부터 거르고 칩으로 보이며 ✕ 로 풀면 주소에서도 빠진다', async () => {
    window.location.hash = '#/cases/fn/req/ZCL-REQ-003';
    const 스파이 = 그리기({ 요구: 'ZCL-REQ-003' });
    await screen.findByText('ZCL-FN-001');
    expect(스파이.mock.calls[0]![0]).toMatchObject({ req: 'ZCL-REQ-003' });
    fireEvent.click(screen.getByRole('button', { name: '요구사항 ZCL-REQ-003 조건 풀기' }));
    expect(마지막조건(스파이).req).toBeUndefined();
    expect(window.location.hash).toBe('#/cases/fn?service=ZCL');
  });
});
