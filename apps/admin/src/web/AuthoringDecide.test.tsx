// @vitest-environment jsdom
// 결정 목록 화면 검사 — 탭 · 고르기 · 권한 없는 버튼 · ③ 기다림 · 저장 · 탭마다 적용 · 낡은 목록 (도메인/작성 §3.6 「★ 결정 목록」)
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { AuthoringDecide } from './AuthoringDecide.js';
import { 요약 } from './authoringSummary.fixture.js';
import type { 결정목록, 결정항목, 보낼고름 } from './decideApi.js';

const 보낸: { prdVersion: number; picks: 보낼고름[] }[] = [];
const 진행답: { 값: Promise<{ steps: { step: 1 | 2 | 3 | 4 | 5; key: string | null; requestId: number | null; version: number | null }[] }> | null } = { 값: null };

const 제외한: [string, boolean][] = [];

vi.mock('./decideApi.js', () => ({
  decideApi: {
    run: (_service: string, prdVersion: number, picks: 보낼고름[]) => {
      보낸.push({ prdVersion, picks });
      return 진행답.값 ?? Promise.resolve({ steps: [] });
    },
    skipScreen: (_service: string, url: string, skip: boolean) => {
      제외한.push([url, skip]);
      return Promise.resolve({ ok: true });
    },
  },
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return { ...진짜, api: { authoringRequest: (_s: string, id: number) => Promise.resolve({ id, status: id === 501 ? 'RUNNING' : 'PENDING' }) } };
});

const 반영: 결정항목 = { key: 'apply:10:11', group: 1, kind: 'APPLY', picks: ['APPLY', 'REJECT'], blockedBy: null, rootId: 10, runId: 11, summary: 요약(), prUrl: 'https://github.com/x/pull/1', requestedByName: '맥시', finishedAt: null };
const 화면확인 = (reqId: string): Extract<결정항목, { kind: 'CHECK' }> => ({
  key: `check:${reqId}`, group: 2, kind: 'CHECK', picks: ['SAME', 'EDIT'], blockedBy: null, reqId, feature: '약관', text: `${reqId} 제목이 보인다`, checkSince: null, basis: 'SCREEN', options: [],
});
const 바뀐요구: 결정항목 = {
  key: 'prd:1:2', group: 3, kind: 'PRD_CHANGED', picks: ['REDO'], blockedBy: null,
  changed: [{ reqId: 'DMW-REQ-012', text: '비밀번호는 10자 이상이다', oldText: '비밀번호는 8자 이상이다' }], added: [], removed: [], scenarios: [{ id: 3, name: '회원가입 흐름' }],
};
const 실패: 결정항목 = { key: 'fail:7:DMW-FN-271', group: 2, kind: 'FAIL', picks: ['SCREEN', 'BUG'], blockedBy: null, runId: 7, tcId: 'DMW-FN-271', reqs: [], verify: null, reason: null, finishedAt: null };
const 문구 = (picks: 결정항목['picks'] = ['PICK', 'OWN']): 결정항목 => ({
  ...화면확인('DMW-REQ-021'), basis: 'DOCS', picks, blockedBy: picks.length === 0 ? 'NO_WRITE' : null, options: [{ asset: 'a.docx', quote: '가' }, { asset: 'b.md', quote: '나' }],
});

const 초안: 결정항목 = {
  key: 'draft:77', group: 2, kind: 'PRD_DRAFT', picks: ['TAKE', 'DROP'], blockedBy: null, requestId: 77, state: 'DONE', reason: null, buildNo: 'a1b2c3d', finishedAt: null,
  issues: [{ key: 'DM-12', title: '쿠폰 중복 적용 막기', url: 'https://bts.test/issues/DM-12' }, { key: 'DM-14', title: null, url: null }],
  rows: [
    { op: 'ADD', text: '쿠폰은 한 번만 쓴다', basis: '이슈 DM-12', issueKeys: ['DM-12'], sure: true, oldText: null, gone: false },
    { op: 'EDIT', reqId: 'DMW-REQ-031', text: '최근 3개월 것을 보여 준다', basis: '이슈 DM-14', issueKeys: ['DM-14'], sure: true, oldText: '최근 1개월 것을 보여 준다', gone: false },
    { op: 'DEL', reqId: 'DMW-REQ-033', text: '기간 버튼이 있다', basis: '이슈 DM-14', issueKeys: ['DM-14'], sure: false, oldText: '기간 버튼이 있다', gone: false },
    { op: 'ADD', text: '쿠폰을 바꾸면 알림이 뜬다', basis: '화면', issueKeys: ['DM-12'], sure: false, oldText: null, gone: false },
    { op: 'EDIT', reqId: 'DMW-REQ-090', text: '없어진 요구', basis: '이슈 DM-14', issueKeys: ['DM-14'], sure: true, oldText: null, gone: true },
  ],
  e2e: [{ title: '쿠폰 주문이 앱에도 보인다', services: ['DMW', 'DMA'], steps: ['주문'], issueKeys: ['DM-12'] }],
};

function 목록(items: 결정항목[], 덮을것: Partial<결정목록> = {}): 결정목록 {
  return { prdVersion: 3, count: items.filter((x) => x.picks.length > 0).length, open: [], items, failMore: 0, ...덮을것 };
}
const 탭 = (이름: RegExp) => fireEvent.click(screen.getByRole('tab', { name: 이름 }));
const 적용 = () => screen.getByRole('button', { name: /^\d+건 적용$/ }) as HTMLButtonElement;

beforeEach(() => {
  보낸.length = 0;
  제외한.length = 0;
  진행답.값 = null;
});
afterEach(cleanup);

describe('결정 목록', () => {
  it('없으면 「결정이 필요한 일이 없습니다」', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('결정이 필요한 일이 없습니다')).toBeTruthy();
  });

  it('할 일이 있는 탭만 보이고 첫 탭이 열린다 · 마우스를 올리면 뜻이 뜬다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([바뀐요구, 화면확인('DMW-REQ-349'), 실패], { failMore: 3 })} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getAllByRole('tab').map((x) => x.textContent)).toEqual(['결함 판정 4', '요구사항 확인 1', '테스트 업데이트 1']);
    expect(screen.getByRole('tab', { name: /결함 판정/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /요구사항 확인/ }).getAttribute('title')).toBe('AI 가 확신하지 못한 요구사항입니다. 확정하거나 수정하면 PRD 새 버전으로 저장됩니다');
    expect(screen.getByText('테스트가 실패했습니다. 어떻게 처리할까요?')).toBeTruthy();
    expect(screen.getByText('실패 3건이 더 있습니다. 위의 것을 정하면 이어서 보입니다')).toBeTruthy();
    expect(screen.queryByText(/이대로 확정할까요/)).toBeNull();
    탭(/요구사항 확인/);
    expect(screen.getByText(/이대로 확정할까요/)).toBeTruthy();
  });

  it('승인 대기는 올릴 테스트 수와 무슨 테스트를 보이고 [승인] [반려]를 고른다 — 다시 누르면 풀린다 (WEB-F6-06)', () => {
    const 셈있음: 결정항목 = { ...반영, summary: 요약({ what: { features: ['회원가입'] }, result: { casesMade: 410, casesFixed: 2 } }) };
    render(<AuthoringDecide service="DMW" 목록={목록([셈있음])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('테스트 412건을 승인할까요?')).toBeTruthy();
    expect(screen.getByText(/기능 1개 테스트 · 회원가입/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '반려' }));
    expect(screen.getByText('#10 작성 결과를 삭제합니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    expect(screen.getByText('#10 테스트를 승인해 케이스 목록에 등록합니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    expect(screen.getByText('아직 선택한 것이 없습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '나중에' })).toBeNull();
  });

  it('적용은 지금 탭에서 고른 것만 보내고, 다른 탭에서 고른 것은 남는다', async () => {
    진행답.값 = Promise.resolve({ steps: [{ step: 2, key: 'check:DMW-REQ-349', requestId: null, version: 4 }] });
    const 다시읽기 = vi.fn();
    render(<AuthoringDecide service="DMW" 목록={목록([반영, 화면확인('DMW-REQ-349'), 화면확인('DMW-REQ-350')])} envs={[]} 다시읽기={다시읽기} />);
    expect(적용().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    expect(적용().textContent).toBe('1건 적용');
    탭(/요구사항 확인/);
    expect(적용().disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: '확정' })[0]!);
    expect(screen.getByText('PRD 를 새 버전으로 저장합니다(버전 4) — DMW-REQ-349 확정')).toBeTruthy();
    expect(screen.queryByText('#10 테스트를 승인해 케이스 목록에 등록합니다')).toBeNull();

    fireEvent.click(적용());
    expect(await screen.findByText('적용을 시작했습니다')).toBeTruthy();
    expect(보낸).toEqual([{ prdVersion: 3, picks: [{ key: 'check:DMW-REQ-349', pick: 'SAME' }] }]);
    expect(다시읽기).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '결정 목록으로 돌아가기' }));
    탭(/승인 대기/);
    expect(screen.getByRole('button', { name: '승인' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('[일괄 확정]은 줄마다 [확정]을 누른 것과 같다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([화면확인('DMW-REQ-349'), 화면확인('DMW-REQ-350')])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '일괄 확정' }));
    expect(screen.getAllByRole('button', { name: '확정' }).map((x) => x.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
    expect(적용().textContent).toBe('2건 적용');
  });

  it('[수정]은 [저장]해야 적용에 들어간다 — 저장 전에는 빠진다고 알리고, 저장하면 바뀐 요구도 같이 다시 만든다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([화면확인('DMW-REQ-349'), 바뀐요구])} envs={[]} 다시읽기={() => {}} />);
    탭(/요구사항 확인/);
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    const 칸 = screen.getByRole('textbox', { name: /수정할 요구사항/ }) as HTMLTextAreaElement;
    expect(칸.value).toBe('DMW-REQ-349 제목이 보인다');
    fireEvent.change(칸, { target: { value: '큰 제목 「서비스 이용약관」' } });
    expect(screen.getByText('저장하지 않은 수정 1건은 빠집니다')).toBeTruthy();
    expect(screen.getByText('15 / 1000')).toBeTruthy();
    expect(적용().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('→ 큰 제목 「서비스 이용약관」')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('문장이 변경된 요구사항 1건 · 변경된 요구사항 1건의 테스트를 수정하고 다시 만듭니다 (변경된 요구사항도 같이 다시 만듭니다)')).toBeTruthy();
    expect(적용().textContent).toBe('1건 적용');

    fireEvent.click(screen.getByRole('button', { name: '다시 수정' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByText('→ 큰 제목 「서비스 이용약관」')).toBeTruthy();
  });

  it('[일괄 확정]은 저장한 수정을 덮지 않고, 확정한 줄에서 [수정]을 열었다 [취소]하면 확정이 그대로다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([화면확인('DMW-REQ-349'), 화면확인('DMW-REQ-350'), 화면확인('DMW-REQ-351')])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]!);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '새 문장' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.click(screen.getByRole('button', { name: '일괄 확정' }));
    expect(screen.getByText('→ 새 문장')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '확정' }).map((x) => x.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'true']);
    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getAllByRole('button', { name: '확정' })[1]!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]!);
    expect(screen.queryByText('→ 새 문장')).toBeNull();
  });

  it('저장한 직접 입력은 [선택 취소]로 안 고름이 되고, [다시 수정]을 연 뒤 [취소]하면 저장한 문장으로 돌아간다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([문구()])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '다' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.click(screen.getByRole('button', { name: '다시 수정' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '라' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByText('→ 다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '선택 취소' }));
    expect(screen.queryByText('→ 다')).toBeNull();
    expect(적용().disabled).toBe(true);
  });

  it('기획서끼리 다르면 맞는 쪽 하나만 체크되고, 아래 칸에 적으면 체크가 풀리고 저장해야 들어간다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([문구()])} envs={[]} 다시읽기={() => {}} />);
    const 칸들 = () => screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(칸들()[0]!);
    fireEvent.click(칸들()[1]!);
    expect(칸들().map((c) => c.checked)).toEqual([false, true]);
    fireEvent.change(screen.getByRole('textbox', { name: /둘 다 아니면 직접 입력/ }), { target: { value: '다' } });
    expect(칸들().map((c) => c.checked)).toEqual([false, false]);
    expect(적용().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('→ 다')).toBeTruthy();
    expect(적용().textContent).toBe('1건 적용');
  });

  it('결함 판정은 [이슈 등록] · [PRD 수정]이다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([실패])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getAllByRole('button').filter((x) => x.closest('.decide-choices') !== null).map((x) => x.textContent)).toEqual(['이슈 등록', 'PRD 수정']);
    fireEvent.click(screen.getByRole('button', { name: '이슈 등록' }));
    expect(screen.getByText('DMW-FN-271 실패를 이슈로 등록합니다')).toBeTruthy();
  });

  it('고를 권한이 없으면 버튼 자리에 누구에게 부탁할지 한 줄', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([{ ...반영, picks: [], blockedBy: 'ADMIN_ONLY' }])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
    expect(screen.getByText('승인 · 반려는 관리자가 합니다')).toBeTruthy();
  });

  it('테스트 업데이트가 열린 작성을 기다리면 버튼 없이 「#N 이 반영된 뒤에 셉니다」', () => {
    const 기다림: 결정항목 = { ...바뀐요구, picks: [], blockedBy: 'AUTHORING_OPEN', changed: null, added: null, removed: null };
    render(<AuthoringDecide service="DMW" 목록={목록([기다림], { open: [14675] })} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByRole('link', { name: '#14675' }).getAttribute('href')).toBe('#/authoring/14675');
    expect(screen.getByText('이 반영된 뒤에 집계합니다', { exact: false })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '재작성' })).toBeNull();
  });

  it('승인 대기를 기다리는 테스트 업데이트는 꺼져 있고 승인 대기를 먼저 끝내라고 한다', () => {
    const 대기: 결정항목 = { ...바뀐요구, needsApply: true, changed: null, added: null, removed: null };
    render(<AuthoringDecide service="DMW" 목록={목록([반영, 대기])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    탭(/테스트 업데이트/);
    expect((screen.getByRole('button', { name: '재작성' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('승인 대기를 먼저 처리해 주세요')).toBeTruthy();
  });

  it('바뀐 API 재작성은 대상 서버를 미리 골라 적용에 넣고, 서버를 비우면 안내와 함께 뺀다', () => {
    const 바뀐API: 결정항목 = { key: 'api:1:2', group: 3, kind: 'API_CHANGED', picks: ['REDO'], blockedBy: null, fromVersion: 1, toVersion: 2, operations: [{ method: 'GET', path: '/a', change: 'CHANGED', breaking: true }] };
    render(<AuthoringDecide service="DMW" 목록={목록([바뀐API])} envs={[{ env: 'stg', baseUrl: 'https://stg.test' }]} 다시읽기={() => {}} />);
    expect(screen.getByText('기존 테스트가 실패할 수 있음', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '재작성' }));
    expect(screen.getByText('변경된 API 1건의 테스트를 다시 만듭니다')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: /대상 서버/ }), { target: { value: '' } });
    expect(screen.getByRole('option', { name: '서버 선택' })).toBeTruthy();
    expect(screen.getByText('대상 서버를 선택하면 진행에 들어갑니다')).toBeTruthy();
    expect(screen.getByText('아직 선택한 것이 없습니다')).toBeTruthy();
  });

  it('테스트가 확인하지 않은 화면은 체크한 것만 보내고, [제외]는 확인 창을 거쳐 곧바로 빼고, 제외한 화면은 [되돌리기]로 돌린다', async () => {
    진행답.값 = Promise.resolve({ steps: [{ step: 5, key: 'screens:ab', requestId: 9, version: null }] });
    const 다시읽기 = vi.fn();
    const 화면: 결정항목 = {
      key: 'screens:ab', group: 3, kind: 'SCREENS', picks: ['FIX'], blockedBy: null, env: null,
      screens: [{ state: '로그아웃', url: '/orders', name: '주문 내역' }, { state: '로그인:일반 회원', url: '/coupons', name: '쿠폰함' }],
      skipped: [{ url: '/reviews/new', name: '리뷰 쓰기' }],
    };
    render(<AuthoringDecide service="DMW" 목록={목록([화면])} envs={[{ env: 'stg', baseUrl: 'https://stg.test' }]} 다시읽기={다시읽기} />);
    expect(screen.getByText('테스트가 확인하지 않은 화면 2개입니다. 테스트를 만들 화면을 체크해 주세요')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: '쿠폰함 테스트 추가' }));
    expect(screen.getByText('테스트가 확인하지 않은 화면 1개의 테스트를 만듭니다')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: '제외' })[0]!);
    expect(screen.getByText('주문 내역 · /orders 화면을 제외합니다')).toBeTruthy();
    expect(screen.getByText('AI 가 이 화면 테스트를 만들지 않습니다')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '제외' }));
    await waitFor(() => expect(다시읽기).toHaveBeenCalled());
    expect(제외한).toEqual([['/orders', true]]);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByText('제외한 화면 1개'));
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }));
    await waitFor(() => expect(제외한).toEqual([['/orders', true], ['/reviews/new', false]]));

    fireEvent.click(적용());
    await screen.findByText('적용을 시작했습니다');
    expect(보낸).toEqual([{ prdVersion: 3, picks: [{ key: 'screens:ab', pick: 'FIX', screens: ['/coupons'], env: 'stg' }] }]);
  });

  it('요구사항 확인은 명세 표 차례 — 화면 기준 → 기획서 간 불일치', () => {
    const { container } = render(<AuthoringDecide service="DMW" 목록={목록([문구(), 화면확인('DMW-REQ-349')])} envs={[]} 다시읽기={() => {}} />);
    const 질문들 = [...container.querySelectorAll('.decide-q')].map((x) => x.textContent ?? '');
    expect(질문들.map((q) => q.slice(0, 8))).toEqual(['기획서에 없어서', '기획서 2개가 ']);
    expect(screen.getByRole('link', { name: 'DMW-REQ-349' }).getAttribute('href')).toBe('#/prd/DMW-REQ-349');
  });

  it('고를 권한이 없는 불일치는 체크 칸 없이 원문만, 열린 작성 때문에 못 센 미검증 API 는 「#N 이 반영된 뒤에 셉니다」', () => {
    const 미검증: 결정항목 = { key: 'apis', group: 3, kind: 'APIS', picks: [], blockedBy: null, apis: null };
    render(<AuthoringDecide service="DMW" 목록={목록([문구([]), 미검증], { open: [14675] })} envs={[]} 다시읽기={() => {}} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('「가」')).toBeTruthy();
    expect(screen.getByText('작성 쓰기 권한이 있는 사람이 선택합니다')).toBeTruthy();
    탭(/테스트 업데이트/);
    expect(screen.getByRole('link', { name: '#14675' })).toBeTruthy();
  });

  it('그 사이 목록이 바뀌었으면 고른 것을 비우고 다시 불러왔다고 알린다', async () => {
    진행답.값 = Promise.reject(new ApiError(409, 'DECISIONS_STALE', ''));
    const 다시읽기 = vi.fn();
    render(<AuthoringDecide service="DMW" 목록={목록([반영])} envs={[]} 다시읽기={다시읽기} />);
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    fireEvent.click(screen.getByRole('button', { name: '1건 적용' }));
    expect(await screen.findByText('그 사이 변경된 것이 있어 다시 불러왔습니다')).toBeTruthy();
    expect(다시읽기).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '승인' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('PRD 초안 카드의 [전체 선택]은 확실한 줄만 체크하고, 지금 기획서에 없는 줄은 체크 칸이 꺼져 있다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([초안])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('배포된 기능 2건으로 PRD 를 수정할까요?')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'DM-12 쿠폰 중복 적용 막기' }).getAttribute('href')).toBe('https://bts.test/issues/DM-12');
    const 칸 = () => screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(칸().map((c) => c.disabled)).toEqual([false, false, false, false, true]);
    fireEvent.click(screen.getByRole('button', { name: '전체 선택' }));
    expect(칸().map((c) => c.checked)).toEqual([true, true, false, false, false]);
    expect(screen.getByText('지금 기획서에 없는 요구사항이라 선택할 수 없어요', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '초안 삭제' }));
    expect(칸().every((c) => c.disabled)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '초안 삭제' }));
    fireEvent.click(칸()[0]!);
    expect(칸().map((c) => c.checked)).toEqual([true, false, false, false, false]);
  });
});
