// @vitest-environment jsdom
// 케이스 목록 맥락 — 묶음 머리 · 접기 · 「이것만 보기」 · 종류 칩 · 요구 줄 · 「PRD 관리」 고리 (도메인/카탈로그 §8.1 「맥락」, 시안 A)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type CaseGroup, type CasePage, type CaseRow, type CaseQuery } from './api.js';
import { CaseList } from './CaseList.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 화면 = 'tests/zcl/pages/signup.page.ts';

function 케이스(tcId: string, 더: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-10-11T00:00:00.000Z',
    feature: null,
    reqs: [],
    screens: [],
    ...더,
  };
}

const 비번 = 케이스('ZCL-FN-001', {
  feature: '회원가입',
  reqs: [
    { reqId: 'ZCL-REQ-003', text: '비밀번호는 8자 이상 20자 이하', axis: '경계' },
    { reqId: 'ZCL-REQ-004', text: '비밀번호에 숫자를 섞는다', axis: '경계' },
  ],
  screens: [{ file: 화면, url: '/signup' }],
  techniques: ['경계값 분석'],
});
const 겹침 = 케이스('ZCL-FN-002', { feature: '회원가입', reqs: [{ reqId: 'ZCL-REQ-001', text: '이메일은 한 번만 쓴다', axis: '예외' }] });
const 옛것 = 케이스('ZCL-FN-003', { reqs: [{ reqId: 'REQ-COM-006', text: null, axis: '예외' }] });
const 묶음들: CaseGroup[] = [
  { feature: '회원가입', screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-002'] },
  { feature: '회원가입', screen: 화면, screenUrl: '/signup', part: null, tcIds: ['ZCL-FN-001'] },
  { feature: null, screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-003'] },
];
const 쪽: CasePage = { items: [겹침, 비번, 옛것], total: 3, page: 1, pageSize: 50, groups: 묶음들 };

const 전부된다: 판정 = () => true;

function 그리기(더: { 요구보나?: boolean; 요구?: string; kind?: 'UI' | 'FN'; 받을쪽?: CasePage } = {}) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({
    items: [{ tcId: 'ZCL-FN-001', platform: 'desktop', status: 'FAIL', runId: 1, historyId: 1, finishedAt: '2026-10-11T00:00:00.000Z', durationMs: 10, recent: ['FAIL'] }],
  } as Awaited<ReturnType<typeof api.lastByCase>>);
  const 스파이 = vi.spyOn(api, 'cases').mockResolvedValue(더.받을쪽 ?? 쪽);
  render(<CaseList kind={더.kind ?? 'FN'} service="ZCL" 할수={전부된다} 결과보나 요구보나={더.요구보나 ?? true} 요구={더.요구} />);
  return 스파이;
}

const 마지막조건 = (스파이: { mock: { calls: [CaseQuery][] } }) => 스파이.mock.calls.at(-1)![0];

describe('묶음 머리', () => {
  it('기능 묶음 > 화면 머리를 줄 사이에 끼우고 건수 · 실패를 단다 · 묶음 없는 케이스는 「기능 묶음 없음」 아래', async () => {
    그리기();
    const 회원가입 = await screen.findByRole('button', { name: /^회원가입\s*\d+건/ });
    expect(회원가입.textContent).toContain('2건 · 실패 1');
    expect(screen.getByRole('button', { name: /^\/signup화면/ }).textContent).toContain('1건');
    expect(screen.getByRole('button', { name: /^기능 묶음 없음\s*\d+건/ }).textContent).toContain('PRD 에 연결되지 않은 케이스');
  });

  it('머리를 누르면 그 아래 머리 · 줄이 접히고 다시 누르면 편다', async () => {
    그리기();
    const 회원가입 = await screen.findByRole('button', { name: /^회원가입\s*\d+건/ });
    fireEvent.click(회원가입);
    expect(회원가입.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('ZCL-FN-001')).toBeNull();
    expect(screen.queryByRole('button', { name: /^\/signup화면/ })).toBeNull();
    expect(screen.getByText('ZCL-FN-003')).toBeTruthy();
    fireEvent.click(회원가입);
    expect(screen.getByText('ZCL-FN-001')).toBeTruthy();
  });

  it('「모두 접기」는 기능 묶음을 다 접고 「모두 펴기」로 바뀐다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-001');
    fireEvent.click(screen.getByRole('button', { name: '모두 접기' }));
    expect(screen.queryByText('ZCL-FN-001')).toBeNull();
    expect(screen.queryByText('ZCL-FN-003')).toBeNull();
    expect(screen.getByRole('button', { name: '모두 펴기' })).toBeTruthy();
  });

  it('「이것만 보기」는 그 묶음 자리로 다시 부르고 칩으로 보이며 ✕ 로 푼다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-001');
    fireEvent.click(screen.getByRole('button', { name: '회원가입 › /signup만 보기' }));
    expect(마지막조건(스파이)).toMatchObject({ feature: '회원가입', screen: 화면, page: 1 });
    fireEvent.click(await screen.findByRole('button', { name: '회원가입 › /signup 조건 풀기' }));
    expect(마지막조건(스파이).feature).toBeUndefined();
  });

  it('「기능 묶음 없음」만 보기는 빈 글자 묶음으로 부른다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-003');
    fireEvent.click(screen.getByRole('button', { name: '기능 묶음 없음만 보기' }));
    expect(마지막조건(스파이)).toMatchObject({ feature: '' });
  });

  it('PRD 를 안 쓰는 서비스는 머리도 「연결된 요구 없음」도 없다', async () => {
    그리기({ 받을쪽: { items: [케이스('ZCL-FN-009')], total: 1, page: 1, pageSize: 50, groups: [{ feature: null, screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-009'] }] } });
    await screen.findByText('ZCL-FN-009');
    expect(document.querySelector('.grp')).toBeNull();
    expect(screen.queryByText('연결된 요구 없음')).toBeNull();
    expect(screen.queryByRole('button', { name: '모두 접기' })).toBeNull();
  });
});

describe('줄 아래 맥락', () => {
  const 줄 = async (tcId: string) => (await screen.findByText(tcId)).closest('.row') as HTMLElement;

  it('첫 요구 번호 · 문장 · 「외 N건」 · 종류 · 화면 · 기법을 보이고 번호는 「PRD 관리」 그 항목으로 간다', async () => {
    그리기();
    const 비번줄 = await 줄('ZCL-FN-001');
    expect(within(비번줄).getByRole('link', { name: 'ZCL-REQ-003' }).getAttribute('href')).toBe('#/prd/ZCL-REQ-003');
    expect(within(비번줄).getByText('비밀번호는 8자 이상 20자 이하')).toBeTruthy();
    expect(within(비번줄).getByText('외 1건')).toBeTruthy();
    const 작은줄 = 비번줄.querySelector('.case-meta')!;
    expect([...작은줄.querySelectorAll('.axis-tag')].map((el) => el.textContent)).toEqual(['경계']);
    expect(작은줄.querySelector('.case-screen')?.textContent).toBe('/signup');
    expect(작은줄.querySelector('.tech-tag')?.textContent).toBe('경계값 분석');
  });

  it('PRD 에 없는 번호는 고리 없이 그렇다고 적는다', async () => {
    그리기();
    const 옛줄 = await 줄('ZCL-FN-003');
    expect(within(옛줄.querySelector('.case-req') as HTMLElement).queryByRole('link')).toBeNull();
    expect(within(옛줄).getByText('REQ-COM-006')).toBeTruthy();
    expect(within(옛줄).getByText('PRD 에 없는 번호예요')).toBeTruthy();
  });

  it('작성 보기 권한이 없으면 요구 번호가 글자뿐이다', async () => {
    그리기({ 요구보나: false });
    const 요구줄 = (await 줄('ZCL-FN-001')).querySelector('.case-req') as HTMLElement;
    expect(within(요구줄).queryByRole('link')).toBeNull();
    expect(within(요구줄).getByText('ZCL-REQ-003')).toBeTruthy();
  });

  it('상세에서는 덮는 요구 전부를 본다', async () => {
    그리기();
    const 비번줄 = await 줄('ZCL-FN-001');
    vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(api, 'item').mockRejectedValue(new Error('절차 없음'));
    fireEvent.click(within(비번줄).getByRole('button', { name: '상세' }));
    const 상자 = await screen.findByRole('dialog');
    expect(within(상자).getByRole('link', { name: 'ZCL-REQ-004' })).toBeTruthy();
    expect(within(상자).getByText(/비밀번호에 숫자를 섞는다/)).toBeTruthy();
  });
});

describe('종류 칩 · 넘어온 요구 번호', () => {
  it('기능 목록에는 종류 칩이 있고 고르면 그 축으로 부른다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-001');
    fireEvent.click(screen.getByRole('button', { name: '경계' }));
    expect(마지막조건(스파이)).toMatchObject({ axis: '경계', page: 1 });
  });

  it('UI 목록에는 종류 칩이 없다', async () => {
    그리기({ kind: 'UI' });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByText('종류')).toBeNull();
  });

  it('「PRD 관리」에서 넘어온 요구 번호로 처음부터 거르고 칩으로 보이며 ✕ 로 푼다', async () => {
    const 스파이 = 그리기({ 요구: 'ZCL-REQ-003' });
    await screen.findByText('ZCL-FN-001');
    expect(스파이.mock.calls[0]![0]).toMatchObject({ req: 'ZCL-REQ-003' });
    fireEvent.click(screen.getByRole('button', { name: '요구 ZCL-REQ-003 조건 풀기' }));
    expect(마지막조건(스파이).req).toBeUndefined();
  });
});
