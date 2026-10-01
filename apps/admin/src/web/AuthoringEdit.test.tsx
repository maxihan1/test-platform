// @vitest-environment jsdom
// 작성 화면이 케이스 고치기(EDIT)를 안다 (DESIGN.md 「작성 상태」 · 도메인/작성 §3.6 「★ 케이스 고치기」).
// 자료 · 대조 · 커버리지 · 보류 · 작성 단계 막대가 없고, 다음 단계는 다시 적용 · 반영 · 폐기다

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringRow, AuthoringRun } from './api.js';
import { Authoring } from './Authoring.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import type { 판정 } from './role.js';

const 운영: 판정 = () => true;
const 작성까지: 판정 = (무엇) => 무엇 !== '작성머지' && 무엇 !== '설정';

const 답들 = new Map<number, AuthoringRow>();
const 줄들: AuthoringRow[] = [];
const { 다시, 폐기 } = vi.hoisted(() => ({
  다시: vi.fn((_s: string, _body: unknown) => Promise.resolve({ id: 9 })),
  폐기: vi.fn((_s: string, _id: number) => Promise.resolve({ ok: true as const })),
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequest: (_s: string, id: number) => {
        const 것 = 답들.get(id);
        return 것 === undefined ? Promise.reject(new Error(`없는 번호 ${String(id)}`)) : Promise.resolve(것);
      },
      authoringRequests: () => Promise.resolve({ items: 줄들, total: 줄들.length, page: 1, pageSize: 50 }),
      createAuthoringMerge: () => Promise.resolve({ id: 2 }),
      stopAuthoring: () => Promise.resolve({ status: 'STOPPED' as const }),
      discardAuthoring: 폐기,
      createAuthoringRequest: 다시,
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

const 고침 = {
  edits: [
    { tcId: 'PAY-001', delete: true },
    { tcId: 'PAY-002', expected: { state: '배송 중' }, confirm: true },
  ],
};

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'EDIT',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: 'author',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    params: 고침,
    rootId: 7,
    canDiscard: true,
    ...덮을것,
  };
}

function 실행(덮을것: Partial<AuthoringRun>): AuthoringRun {
  return {
    id: 7,
    kind: 'EDIT',
    resumeFrom: null,
    status: 'DONE',
    stopReason: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    caseFiles: null,
    tokens: null,
    prUrl: null,
    ...덮을것,
  };
}

beforeEach(() => {
  답들.clear();
  줄들.length = 0;
  다시.mockClear();
  폐기.mockClear();
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
});

describe('케이스 고치기 상세', () => {
  it('부제는 케이스 고치기이고, 고칠 내용을 케이스마다 적는다. 작성 단계 막대는 없다', async () => {
    답들.set(7, 줄({}));
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);

    const 목록 = within(await screen.findByRole('region', { name: '고칠 내용' }));
    expect(screen.getByText('케이스 고치기')).toBeTruthy();
    expect(목록.getByText('PAY-001')).toBeTruthy();
    expect(목록.getByText('삭제')).toBeTruthy();
    expect(목록.getByText(/기대값 state: 배송 중/)).toBeTruthy();
    expect(목록.getByText(/확정/)).toBeTruthy();
    expect(screen.queryByText('자료 받기')).toBeNull();
  });

  it('완료면 PR 검토 · 테스트 반영하기 · 폐기를 낸다', async () => {
    답들.set(7, 줄({}));
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);

    const 할일 = within(await screen.findByRole('region', { name: '다음 단계' }));
    expect(할일.getByRole('link', { name: '고친 테스트 코드 보기 (PR)' }).getAttribute('href')).toBe('https://github.com/x/y/pull/3');
    expect(할일.getByRole('button', { name: '테스트 반영하기' })).toBeTruthy();
    expect(할일.getByRole('button', { name: '폐기' })).toBeTruthy();
  });

  it('폐기 상자는 GitHub 의 PR 이 남는다고 알린다', async () => {
    답들.set(7, 줄({}));
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);

    const 할일 = within(await screen.findByRole('region', { name: '다음 단계' }));
    fireEvent.click(할일.getByRole('button', { name: '폐기' }));
    expect(within(screen.getByRole('dialog')).getByText(/GitHub 의 PR/)).toBeTruthy();
  });

  it('대기 중이면 작성 중단을 낸다. 도는 중이면 멈출 버튼이 없다', async () => {
    답들.set(7, 줄({ status: 'PENDING', prUrl: null, startedAt: null, finishedAt: null, canStop: true, canDiscard: false }));
    const { unmount } = render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    expect(await screen.findByRole('button', { name: '작성 중단' })).toBeTruthy();
    unmount();

    답들.set(7, 줄({ status: 'RUNNING', prUrl: null, finishedAt: null, stage: '케이스를 고치는 중', canStop: false, canDiscard: false }));
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    expect(await screen.findByText(/케이스를 고쳐 PR 로 올리는 중입니다/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '작성 중단' })).toBeNull();
    expect(screen.getAllByText('고치는 중').length).toBeGreaterThan(0);
  });

  it('실패면 다시 적용 · 폐기를 낸다. 같은 자료로 다시 작성 · 이어서 작성은 없다', async () => {
    답들.set(7, 줄({ status: 'FAILED', prUrl: null, error: '고칠 것이 이미 반영돼 있다' }));
    render(<AuthoringDetail service="PAY" id={7} 할수={작성까지} />);

    const 할일 = within(await screen.findByRole('region', { name: '다음 단계' }));
    expect(할일.queryByText('같은 자료로 다시 작성')).toBeNull();
    expect(할일.queryByText('이어서 작성')).toBeNull();
    fireEvent.click(할일.getByRole('button', { name: '다시 적용' }));
    await waitFor(() => expect(다시).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 7 }));
  });

  it('반영이 끝나면 다시 스캔하라고 안내하고 남은 요구 이어 작성은 없다', async () => {
    const 기록 = [실행({ id: 12, kind: 'MERGE' }), 실행({ id: 7 })];
    답들.set(7, 줄({ runs: 기록 }));
    답들.set(12, 줄({ id: 12, kind: 'MERGE', sourceId: 7, params: {}, runs: 기록, canContinue: false }));
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);

    expect(await screen.findByText(/「다시 스캔」을 누르면 바뀐 것이 보입니다/)).toBeTruthy();
    expect(screen.queryByText(/남은 요구/)).toBeNull();
  });

  it('실행 기록의 방식은 케이스 고치기 · 다시 적용이다', async () => {
    const 기록 = [실행({ id: 9, kind: 'RERUN' }), 실행({ id: 7, status: 'FAILED' })];
    답들.set(7, 줄({ status: 'FAILED', prUrl: null, runs: 기록 }));
    답들.set(9, 줄({ id: 9, kind: 'RERUN', sourceId: 7, runs: 기록 }));
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);

    const 표 = within(await screen.findByRole('table', { name: '실행 기록' }));
    expect(표.getByText('다시 적용')).toBeTruthy();
    expect(표.getByText('케이스 고치기')).toBeTruthy();
  });
});

describe('작성 목록의 케이스 고치기 줄', () => {
  it('뿌리 종류로 가른다 — 다시 적용이 최신이어도 고치기 줄이다', async () => {
    줄들.push(줄({ id: 9, kind: 'RERUN', sourceId: 7, rootId: 7, runCount: 2, rootKind: 'EDIT' }));
    줄들.push(줄({ id: 8, rootId: 8, runCount: 1, rootKind: 'EDIT', status: 'RUNNING', prUrl: null, finishedAt: null }));
    render(<Authoring service="PAY" 할수={() => true} />);

    expect(await screen.findByText(/2차 · 다시 적용/)).toBeTruthy();
    expect(screen.getByText('케이스를 고쳐 PR 로 올렸습니다')).toBeTruthy();
    expect(screen.getAllByText(/케이스 고치기/).length).toBeGreaterThan(0);
    expect(screen.getByText('고치는 중')).toBeTruthy();
  });
});
