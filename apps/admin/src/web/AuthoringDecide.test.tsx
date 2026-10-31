// @vitest-environment jsdom
// 결정 목록 화면 검사 — 묶음 · 고르기 · 권한 없는 버튼 · ③ 기다림 · 진행 · 낡은 목록 (도메인/작성 §3.6 「★ 결정 목록」)
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { AuthoringDecide } from './AuthoringDecide.js';
import { 요약 } from './authoringSummary.fixture.js';
import type { 결정목록, 결정항목, 보낼고름 } from './decideApi.js';

const 보낸: { prdVersion: number; picks: 보낼고름[] }[] = [];
const 진행답: { 값: Promise<{ steps: { step: 1 | 2 | 3 | 4 | 5; key: string | null; requestId: number | null; version: number | null }[] }> | null } = { 값: null };

vi.mock('./decideApi.js', () => ({
  decideApi: {
    run: (_service: string, prdVersion: number, picks: 보낼고름[]) => {
      보낸.push({ prdVersion, picks });
      return 진행답.값 ?? Promise.resolve({ steps: [] });
    },
  },
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return { ...진짜, api: { authoringRequest: (_s: string, id: number) => Promise.resolve({ id, status: id === 501 ? 'RUNNING' : 'PENDING' }) } };
});

const 반영: 결정항목 = { key: 'apply:10:11', group: 1, kind: 'APPLY', picks: ['APPLY'], blockedBy: null, rootId: 10, runId: 11, summary: 요약(), prUrl: 'https://github.com/x/pull/1', requestedByName: '맥시', finishedAt: null };
const 화면확인 = (reqId: string): Extract<결정항목, { kind: 'CHECK' }> => ({
  key: `check:${reqId}`, group: 2, kind: 'CHECK', picks: ['SAME', 'EDIT'], blockedBy: null, reqId, feature: '약관', text: `${reqId} 제목이 보인다`, checkSince: null, basis: 'SCREEN', options: [],
});
const 바뀐요구: 결정항목 = {
  key: 'prd:1:2', group: 3, kind: 'PRD_CHANGED', picks: ['REDO'], blockedBy: null,
  changed: [{ reqId: 'DMW-REQ-012', text: '비밀번호는 10자 이상이다', oldText: '비밀번호는 8자 이상이다' }], added: [], removed: [], scenarios: [{ id: 3, name: '회원가입 흐름' }],
};

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

beforeEach(() => {
  보낸.length = 0;
  진행답.값 = null;
});
afterEach(cleanup);

describe('결정 목록', () => {
  it('없으면 「결정이 필요한 일이 없습니다」', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('결정이 필요한 일이 없습니다')).toBeTruthy();
  });

  it('① 은 올릴 테스트 수와 무슨 테스트를 보인다 — 셈을 모르면 수 없이 묻는다 (WEB-F6-06)', () => {
    const 셈있음: 결정항목 = { ...반영, summary: 요약({ what: { features: ['회원가입'] }, result: { casesMade: 410, casesFixed: 2 } }) };
    render(<AuthoringDecide service="DMW" 목록={목록([셈있음])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('테스트 412건을 케이스 목록에 올릴까요?')).toBeTruthy();
    expect(screen.getByText(/기능 1개 테스트 · 회원가입/)).toBeTruthy();
  });

  it('고른 것을 차례 목록으로 보이고 한 번에 보낸다 — 「나중에」는 안 보낸다', async () => {
    진행답.값 = Promise.resolve({
      steps: [
        { step: 2, key: 'check:DMW-REQ-349', requestId: null, version: 4 },
        { step: 3, key: 반영.key, requestId: 501, version: null },
        { step: 4, key: 바뀐요구.key, requestId: 502, version: null },
      ],
    });
    const 다시읽기 = vi.fn();
    render(<AuthoringDecide service="DMW" 목록={목록([반영, 화면확인('DMW-REQ-349'), 화면확인('DMW-REQ-350'), 바뀐요구])} envs={[]} 다시읽기={다시읽기} />);
    expect(screen.getByText('AI 가 만든 테스트를 올릴까요?')).toBeTruthy();
    expect(screen.getByText('고른 내용은 기획서(PRD) 새 버전으로 저장됩니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'SC-3 회원가입 흐름' })).toBeTruthy();
    const 진행버튼 = () => screen.getByRole('button', { name: /^결정한 \d+건 진행$/ });
    expect((진행버튼() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('아직 고른 것이 없습니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '올린다 (반영)' }));
    fireEvent.click(screen.getAllByRole('button', { name: '의도와 같음' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: '나중에' })[2]!);
    fireEvent.click(screen.getByRole('button', { name: '다시 만든다' }));
    expect(screen.getByText('기획서를 새 버전으로 저장합니다(버전 4) — DMW-REQ-349 확정')).toBeTruthy();
    expect(screen.getByText('#10 테스트를 케이스 목록에 올립니다')).toBeTruthy();
    expect(screen.getByText('바뀐 요구 1건의 테스트를 고치고 다시 만듭니다')).toBeTruthy();

    fireEvent.click(진행버튼());
    expect(await screen.findByText('진행을 시작했습니다')).toBeTruthy();
    expect(보낸).toEqual([
      { prdVersion: 3, picks: [{ key: 반영.key, pick: 'APPLY' }, { key: 'check:DMW-REQ-349', pick: 'SAME' }, { key: 바뀐요구.key, pick: 'REDO' }] },
    ]);
    expect(다시읽기).toHaveBeenCalled();
    expect(await screen.findByText(/· 진행 중/)).toBeTruthy();
    expect(screen.getByText(/· 앞 일이 끝나면 시작/)).toBeTruthy();
    expect(screen.getByText(/· 끝남/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '#10 요청 보기' }).getAttribute('href')).toBe('#/authoring/10');
  });

  it('고를 권한이 없으면 버튼 자리에 누구에게 부탁할지 한 줄', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([{ ...반영, picks: [], blockedBy: 'ADMIN_ONLY' }])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.queryByRole('button', { name: '올린다 (반영)' })).toBeNull();
    expect(screen.getByText('반영은 운영자가 합니다')).toBeTruthy();
  });

  it('③ 이 열린 작성을 기다리면 버튼 없이 「#N 이 반영된 뒤에 셉니다」', () => {
    const 기다림: 결정항목 = { ...바뀐요구, picks: [], blockedBy: 'AUTHORING_OPEN', changed: null, added: null, removed: null };
    render(<AuthoringDecide service="DMW" 목록={목록([기다림], { open: [14675] })} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByRole('link', { name: '#14675' }).getAttribute('href')).toBe('#/authoring/14675');
    expect(screen.getByText('이 반영된 뒤에 셉니다', { exact: false })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '다시 만든다' })).toBeNull();
  });

  it('반영 대기를 기다리는 ③ 은 ① 을 「올린다」로 골라야 켜진다', () => {
    const 대기: 결정항목 = { ...바뀐요구, needsApply: true, changed: null, added: null, removed: null };
    render(<AuthoringDecide service="DMW" 목록={목록([반영, 대기])} envs={[]} 다시읽기={() => {}} />);
    const 다시 = () => screen.getByRole('button', { name: '다시 만든다' }) as HTMLButtonElement;
    expect(다시().disabled).toBe(true);
    expect(screen.getByText('1번을 모두 「올린다」로 골라야 고를 수 있습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '올린다 (반영)' }));
    expect(다시().disabled).toBe(false);
  });

  it('화면 기준 요구를 「다름」으로 고치면 바뀐 요구도 같이 다시 만들고 그 「나중에」를 끈다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([화면확인('DMW-REQ-349'), 바뀐요구])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '다름 · 기획서 고치기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '원래 의도한 동작' }), { target: { value: '큰 제목 「서비스 이용약관」' } });
    expect(screen.getByText('기획서 문장이 바뀌어 바뀐 요구도 같이 다시 만듭니다')).toBeTruthy();
    const 나중 = screen.getAllByRole('button', { name: '나중에' });
    expect((나중[나중.length - 1] as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('문장이 바뀐 요구 1건 · 바뀐 요구 1건의 테스트를 고치고 다시 만듭니다 (바뀐 요구도 같이 다시 만듭니다)')).toBeTruthy();
  });

  it('바뀐 API 다시 만들기는 대상 서버를 미리 골라 진행에 넣고, 서버를 비우면 안내와 함께 뺀다', () => {
    const 바뀐API: 결정항목 = { key: 'api:1:2', group: 3, kind: 'API_CHANGED', picks: ['REDO'], blockedBy: null, fromVersion: 1, toVersion: 2, operations: [{ method: 'GET', path: '/a', change: 'CHANGED', breaking: true }] };
    render(<AuthoringDecide service="DMW" 목록={목록([바뀐API])} envs={[{ env: 'stg', baseUrl: 'https://stg.test' }]} 다시읽기={() => {}} />);
    expect(screen.getByText('기존 테스트가 실패할 수 있음', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 만든다' }));
    expect(screen.getByText('바뀐 API 1건의 테스트를 다시 만듭니다')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: /대상 서버/ }), { target: { value: '' } });
    expect(screen.getByText('대상 서버를 고르면 진행에 들어갑니다')).toBeTruthy();
    expect(screen.getByText('아직 고른 것이 없습니다')).toBeTruthy();
  });

  it('② 는 명세 표 차례 — 실패 → 화면 기준 → 기획서 간 불일치', () => {
    const 실패: 결정항목 = { key: 'fail:7:DMW-FN-271', group: 2, kind: 'FAIL', picks: ['SCREEN', 'BUG'], blockedBy: null, runId: 7, tcId: 'DMW-FN-271', reqs: [], verify: null, reason: null, finishedAt: null };
    const 문구: 결정항목 = { ...화면확인('DMW-REQ-021'), key: 'check:DMW-REQ-021', basis: 'DOCS', picks: ['PICK', 'OWN'], options: [{ asset: 'a.docx', quote: '가' }, { asset: 'b.md', quote: '나' }] };
    const { container } = render(<AuthoringDecide service="DMW" 목록={목록([문구, 화면확인('DMW-REQ-349'), 실패])} envs={[]} 다시읽기={() => {}} />);
    const 질문들 = [...container.querySelectorAll('.decide-q')].map((x) => x.textContent ?? '');
    expect(질문들.map((q) => q.slice(0, 8))).toEqual(['테스트가 실패했', '기획서에 없어서', '기획서 2개가 ']);
    expect(screen.getByRole('link', { name: 'DMW-REQ-349' }).getAttribute('href')).toBe('#/prd/DMW-REQ-349');
  });

  it('고를 권한이 없는 불일치는 고르개 없이 원문만, 열린 작성 때문에 못 센 미검증 API 는 「#N 이 반영된 뒤에 셉니다」', () => {
    const 문구: 결정항목 = { ...화면확인('DMW-REQ-021'), key: 'check:DMW-REQ-021', basis: 'DOCS', picks: [], blockedBy: 'NO_WRITE', options: [{ asset: 'a.docx', quote: '가' }, { asset: 'b.md', quote: '나' }] };
    const 미검증: 결정항목 = { key: 'apis', group: 3, kind: 'APIS', picks: [], blockedBy: null, apis: null };
    render(<AuthoringDecide service="DMW" 목록={목록([문구, 미검증], { open: [14675] })} envs={[]} 다시읽기={() => {}} />);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('「가」')).toBeTruthy();
    expect(screen.getByText('작성 쓰기 권한이 있는 사람이 고릅니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: '#14675' })).toBeTruthy();
  });

  it('그 사이 목록이 바뀌었으면 고른 것을 비우고 다시 불러왔다고 알린다', async () => {
    진행답.값 = Promise.reject(new ApiError(409, 'DECISIONS_STALE', ''));
    const 다시읽기 = vi.fn();
    render(<AuthoringDecide service="DMW" 목록={목록([반영])} envs={[]} 다시읽기={다시읽기} />);
    fireEvent.click(screen.getByRole('button', { name: '올린다 (반영)' }));
    fireEvent.click(screen.getByRole('button', { name: '결정한 1건 진행' }));
    expect(await screen.findByText('그 사이 바뀐 것이 있어 다시 불러왔습니다')).toBeTruthy();
    expect(다시읽기).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '올린다 (반영)' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('PRD 초안 카드의 「모두 체크」는 확실한 줄만 체크하고, 지금 기획서에 없는 줄은 체크 칸이 꺼져 있다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([초안])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('배포된 기능 2건으로 기획서를 고칠까요?')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'DM-12 쿠폰 중복 적용 막기' }).getAttribute('href')).toBe('https://bts.test/issues/DM-12');
    const 칸 = () => screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(칸().map((c) => c.disabled)).toEqual([false, false, false, false, true]);
    fireEvent.click(screen.getByRole('button', { name: '이슈에 적힌 2줄 모두 체크' }));
    expect(칸().map((c) => c.checked)).toEqual([true, true, false, false, false]);
    expect(screen.getByText('지금 기획서에 없는 요구라 고를 수 없어요', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '초안 버리기' }));
    expect(칸().every((c) => c.disabled)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '초안 버리기' }));
    fireEvent.click(칸()[0]!);
    expect(칸().map((c) => c.checked)).toEqual([true, false, false, false, false]);
  });
});
