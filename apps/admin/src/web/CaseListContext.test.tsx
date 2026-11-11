// @vitest-environment jsdom
// 케이스 목록 맥락 — 기능 묶음 이름표 · 왼쪽 목차 · 「더 보기」 이어 받기 · 머리 실행 단추 · 한 건 한 줄과 상세 서랍의 맥락 · 종류 칩 (도메인/카탈로그 §8.1 「맥락」 · 「목차」, 2026-11-11 시안 B)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseGroup, type CasePage, type CaseRow, type CaseQuery, type 앱종류 } from './api.js';
import { CaseList } from './CaseList.js';
import { 판열기, 판칩누르기 } from './CaseListFilterBar.fixture.js';
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
const 쪽: CasePage = { items: [겹침, 비번, 옛것], total: 3, page: 1, pageSize: 50, groups: 묶음들, hasFeatures: true };

const 전부된다: 판정 = () => true;

function 그리기(더: { 요구보나?: boolean; 요구?: string; kind?: 'UI' | 'FN'; 받을쪽?: CasePage | ((page: number) => CasePage); 앱종류?: 앱종류 } = {}) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({
    items: [{ tcId: 'ZCL-FN-001', platform: 'desktop', status: 'FAIL', runId: 1, historyId: 1, finishedAt: '2026-10-11T00:00:00.000Z', durationMs: 10, recent: ['FAIL'] }],
  } as Awaited<ReturnType<typeof api.lastByCase>>);
  const 받을쪽 = 더.받을쪽 ?? 쪽;
  const 스파이 = vi.spyOn(api, 'cases').mockImplementation((q) => Promise.resolve(typeof 받을쪽 === 'function' ? 받을쪽(q.page ?? 1) : 받을쪽));
  render(<CaseList kind={더.kind ?? 'FN'} service="ZCL" 할수={전부된다} 결과보나 요구보나={더.요구보나 ?? true} 요구={더.요구} 앱종류={더.앱종류} />);
  return 스파이;
}

const 마지막조건 = (스파이: { mock: { calls: [CaseQuery][] } }) => 스파이.mock.calls.at(-1)![0];

const 이름표들 = () => [...document.querySelectorAll('.toc-label')].map((el) => [...el.children].map((자식) => 자식.textContent));
const 목차 = () => screen.queryByRole('navigation', { name: '기능 묶음 목차' });
const 목차줄들 = () => within(목차()!).getAllByRole('button').map((줄) => [...줄.children].map((자식) => 자식.textContent));

const 첫쪽: CasePage = { ...쪽, items: [겹침, 비번], pageSize: 2 };
const 둘째쪽: CasePage = { ...쪽, items: [옛것], page: 2, pageSize: 2 };
const 쪽나눔 = (page: number) => (page === 1 ? 첫쪽 : 둘째쪽);
const 더보기 = () => screen.getByRole('button', { name: '3건 중 2건 · 더 보기' });

describe('기능 묶음 이름표', () => {
  it('기능 묶음마다 이름 · 건수 · 실패를 단 이름표가 서고, 묶음 없는 케이스는 「PRD 에 연결되지 않은 케이스」를 단다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-003');
    expect(이름표들()).toEqual([
      ['회원가입', '2건', '실패 1'],
      ['기능 묶음 없음', '1건', 'PRD 에 연결되지 않은 케이스'],
    ]);
  });

  it('이름표는 묶음 상자(section) 맨 앞에 서고 줄 사이에 끼는 접는 머리가 없다 — 화면 · 화면 조각 머리와 접기 단추가 없다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-003');
    const 상자들 = [...document.querySelectorAll('section[data-toc]')];
    expect(상자들.map((상자) => [상자.getAttribute('data-toc'), 상자.firstElementChild?.className, 상자.querySelectorAll('.row').length])).toEqual([
      ['회원가입', 'toc-label', 2],
      ['', 'toc-label', 1],
    ]);
    expect(document.querySelector('.grp')).toBeNull();
    expect(screen.queryByRole('button', { name: '모두 접기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /만 보기$/ })).toBeNull();
    expect(screen.queryByText(/앞 페이지에서 이어짐/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^회원가입\s*\d+건/ })).toBeNull();
  });

  it('건수는 받은 줄이 아니라 조건에 맞는 전부(groups)로 센다 — 한 쪽만 받아도 이름표는 전체 건수다', async () => {
    그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByText('ZCL-FN-003')).toBeNull();
    expect(이름표들()).toEqual([['회원가입', '2건', '실패 1']]);
  });

  it('PRD 를 안 쓰는 애플리케이션은 이름표도 목차도 없고 줄만 선다', async () => {
    그리기({ 받을쪽: { items: [케이스('ZCL-FN-009')], total: 1, page: 1, pageSize: 50, groups: [{ feature: null, screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-009'] }] } });
    await screen.findByText('ZCL-FN-009');
    expect(document.querySelector('.toc-label')).toBeNull();
    expect(목차()).toBeNull();
    expect(document.querySelectorAll('.row.pickable')).toHaveLength(1);
  });

  it('칩을 걸면 서버가 거른 번호표대로 이름표 건수가 선다 — 화면이 보이는 줄로 다시 세지 않는다', async () => {
    const 전체쪽: CasePage = { ...쪽, lastCounts: { total: 3, pass: 2, fail: 1, na: 0 } };
    const 실패만: CasePage = {
      ...전체쪽,
      items: [비번],
      total: 1,
      groups: [{ feature: '회원가입', screen: 화면, screenUrl: '/signup', part: null, tcIds: ['ZCL-FN-001'] }],
    };
    vi.spyOn(api, 'lastScan').mockResolvedValue(null);
    vi.spyOn(api, 'lastByCase').mockResolvedValue({
      items: [{ tcId: 'ZCL-FN-001', platform: 'desktop', status: 'FAIL', runId: 1, historyId: 1, finishedAt: '2026-10-11T00:00:00.000Z', durationMs: 10, recent: ['FAIL'] }],
    } as Awaited<ReturnType<typeof api.lastByCase>>);
    const 스파이 = vi.spyOn(api, 'cases').mockImplementation((q) => Promise.resolve(q.last === 'FAIL' ? 실패만 : 전체쪽));
    render(<CaseList kind="FN" service="ZCL" 할수={전부된다} 결과보나 요구보나 />);
    await screen.findByText('ZCL-FN-003');

    fireEvent.click(screen.getByRole('button', { name: /^실패 \d+$/ }));

    await waitFor(() => expect(이름표들()).toEqual([['회원가입', '1건', '실패 1']]));
    expect(screen.queryByText('ZCL-FN-002')).toBeNull();
    expect(마지막조건(스파이)).toMatchObject({ last: 'FAIL' });
  });
});

describe('기능 묶음 목차', () => {
  it('묶음이 둘 이상이면 왼쪽에 목차가 서고 줄마다 이름 · 실패 수 · 건수가 붙는다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-003');
    expect(목차줄들()).toEqual([
      ['회원가입', '실패 1', '2'],
      ['기능 묶음 없음', '1'],
    ]);
    await waitFor(() => expect(within(목차()!).getAllByRole('button').filter((줄) => 줄.getAttribute('aria-current') === 'true')).toHaveLength(1));
  });

  it('묶음이 하나뿐이면 목차가 없다 — 이름표는 남는다', async () => {
    그리기({ 받을쪽: { ...쪽, items: [겹침, 비번], total: 2, groups: 묶음들.slice(0, 2) } });
    await screen.findByText('ZCL-FN-001');
    expect(목차()).toBeNull();
    expect(이름표들()).toEqual([['회원가입', '2건', '실패 1']]);
  });

  it('실행 결과 읽기 권한이 없어도 목차 건수는 서고 실패 수만 빠진다', async () => {
    vi.spyOn(api, 'lastScan').mockResolvedValue(null);
    vi.spyOn(api, 'cases').mockResolvedValue(쪽);
    render(<CaseList kind="FN" service="ZCL" 할수={전부된다} 결과보나={false} />);
    await screen.findByText('ZCL-FN-003');
    expect(목차줄들()).toEqual([['회원가입', '2'], ['기능 묶음 없음', '1']]);
  });

  it('아직 안 받은 묶음을 목차에서 누르면 닿을 때까지 다음 쪽을 받는다', async () => {
    const 스파이 = 그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByText('ZCL-FN-003')).toBeNull();
    expect(목차줄들().map((줄) => 줄[0])).toEqual(['회원가입', '기능 묶음 없음']);

    fireEvent.click(within(목차()!).getByRole('button', { name: /^기능 묶음 없음/ }));

    expect(await screen.findByText('ZCL-FN-003')).toBeTruthy();
    expect(이름표들()).toEqual([
      ['회원가입', '2건', '실패 1'],
      ['기능 묶음 없음', '1건', 'PRD 에 연결되지 않은 케이스'],
    ]);
    expect(스파이.mock.calls.map(([q]) => q.page)).toEqual([1, 2]);
  });

  it('이미 받은 묶음을 누르면 쪽을 더 받지 않는다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-003');
    스파이.mockClear();

    fireEvent.click(within(목차()!).getByRole('button', { name: /^기능 묶음 없음/ }));

    expect(스파이).not.toHaveBeenCalled();
  });
});

describe('이어 불러오기 (쪽 넘기기 없음)', () => {
  it('이전 · 다음 단추도 쪽 번호도 없다 — 더 받을 것이 있으면 「N건 중 M건 · 더 보기」만 선다', async () => {
    그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
    expect(screen.queryByRole('button', { name: '이전' })).toBeNull();
    expect(더보기()).toBeTruthy();
  });

  it('「더 보기」는 다음 쪽을 아래에 붙인다 — 앞 줄이 남고 고른 것도 그대로이며 더 받을 것이 없으면 단추가 사라진다', async () => {
    const 스파이 = 그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    fireEvent.click(screen.getByRole('checkbox', { name: 'ZCL-FN-002 ZCL-FN-002 케이스 선택' }));

    fireEvent.click(더보기());

    expect(await screen.findByText('ZCL-FN-003')).toBeTruthy();
    expect(마지막조건(스파이)).toMatchObject({ page: 2 });
    expect(screen.getByText('ZCL-FN-001')).toBeTruthy();
    expect(screen.getByText('ZCL-FN-002')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: 'ZCL-FN-002 ZCL-FN-002 케이스 선택' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'ZCL-FN-003 ZCL-FN-003 케이스 선택' }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('toolbar', { name: '선택한 케이스' }).textContent).toContain('1건 선택');
    expect(screen.queryByRole('button', { name: /더 보기$/ })).toBeNull();
    expect(window.location.hash).not.toContain('page=');
  });

  it('붙인 뒤 앞 쪽 묶음에 뒤 쪽 줄이 이어 붙지 않고 제 묶음 상자에 들어가며 목차 건수는 그대로다', async () => {
    그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');

    fireEvent.click(더보기());
    await screen.findByText('ZCL-FN-003');

    expect(document.querySelectorAll('section[data-toc="회원가입"] .row')).toHaveLength(2);
    expect(document.querySelectorAll('section[data-toc=""] .row')).toHaveLength(1);
    expect(목차줄들()).toEqual([['회원가입', '실패 1', '2'], ['기능 묶음 없음', '1']]);
  });
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
