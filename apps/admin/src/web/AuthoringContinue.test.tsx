// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringCoverage, AuthoringRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import { ApiError } from './api.js';
import { 언어함 } from './i18n.js';
import type { 판정 } from './role.js';

const 답들 = new Map<number, AuthoringRow>();
const 보낸것: unknown[] = [];
let 만들기답: () => Promise<{ id: number }> = () => Promise.resolve({ id: 5901 });

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequest: (_s: string, id: number) => {
        const 답 = 답들.get(id);
        return 답 === undefined ? Promise.reject(new Error(`없는 번호 ${String(id)}`)) : Promise.resolve(답);
      },
      createAuthoringRequest: (_s: string, 본문: unknown) => {
        보낸것.push(본문);
        return 만들기답();
      },
      createAuthoringMerge: () => Promise.resolve({ id: 2 }),
      stopAuthoring: () => Promise.resolve({ status: 'RUNNING' as const }),
      discardAuthoring: () => Promise.resolve({ ok: true as const }),
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

const 다됨: 판정 = () => true;
const 작성못함: 판정 = (일) => 일 !== '작성요청';

const 셈: AuthoringCoverage = {
  total: 172,
  cased: 48,
  held: 0,
  excluded: { '다음 요청': 120, '요구 아님': 1 },
  missing: ['R-1', 'R-2', 'R-3'],
  later: Array.from({ length: 120 }, (_, i) => `L-${String(i + 1)}`),
};

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 5880,
    kind: 'MERGE',
    sourceId: 5877,
    status: 'DONE',
    stage: null,
    stageAt: null,
    requestedByName: '운영자',
    claimedBy: 'author',
    prUrl: null,
    error: null,
    createdAt: '2026-09-30T13:00:00Z',
    startedAt: '2026-09-30T13:01:00Z',
    finishedAt: '2026-09-30T13:30:00Z',
    rootId: 5873,
    canContinue: true,
    continuedBy: null,
    ...덮을것,
  };
}

const 다시읽음 = vi.fn();
function 카드(요청: AuthoringRow, 커버리지: AuthoringCoverage | null = 셈, 할수: 판정 = 다됨) {
  render(<AuthoringTodo service="MKT" 요청={요청} 할수={할수} 차이수={0} 커버리지={커버리지} reload={다시읽음} />);
}

beforeEach(() => {
  답들.clear();
  보낸것.length = 0;
  다시읽음.mockClear();
  만들기답 = () => Promise.resolve({ id: 5901 });
  window.location.hash = '#/authoring/5873';
});

afterEach(cleanup);

describe('반영 끝 — 남은 요구로 이어 작성', () => {
  it('남은 수와 새 번호 안내를 보이고, 누르면 뿌리 번호로 보내 새 번호 상세로 간다', async () => {
    카드(줄({}));
    expect(screen.getByText('테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.')).toBeTruthy();
    expect(
      screen.getByText(
        '반영한 실행 기준으로 다음 요청 120개 · 빠짐 3개가 남았습니다. 이것을 새 요청으로 작성하고 새 번호로 넘어갑니다. 남은 요구는 에이전트가 시작할 때 다시 셉니다.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '남은 요구로 이어 작성' }));
    await waitFor(() => expect(window.location.hash).toBe('#/authoring/5901'));
    expect(보낸것).toEqual([{ kind: 'AUTHOR', continueFrom: 5873 }]);
  });

  it('셈이 없으면 남은 수 문장을 뺀다', () => {
    카드(줄({}), null);
    expect(screen.queryByText(/반영한 실행 기준으로/)).toBeNull();
    expect(screen.getByText('이것을 새 요청으로 작성하고 새 번호로 넘어갑니다. 남은 요구는 에이전트가 시작할 때 다시 셉니다.')).toBeTruthy();
  });

  it('작성 요청 권한이 없으면 버튼 대신 까닭을 말한다', () => {
    카드(줄({}), 셈, 작성못함);
    expect(screen.queryByRole('button', { name: '남은 요구로 이어 작성' })).toBeNull();
    expect(screen.getByText('이어 작성은 작성 요청 권한이 있는 사람만 할 수 있습니다.')).toBeTruthy();
  });

  it('이미 넘겼으면 맡은 요청으로 가는 고리를 보인다', () => {
    카드(줄({ canContinue: false, continuedBy: 5901 }));
    expect(screen.getByText('남은 요구는 #5901 요청이 맡았습니다.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '#5901 요청 보기' }).getAttribute('href')).toBe('#/authoring/5901');
  });

  const 못누름: [string, AuthoringCoverage, string][] = [
    ['남은 것이 없는 셈', { ...셈, excluded: { '요구 아님': 124 }, missing: [], later: [] }, '이어 작성할 요구가 없습니다. 모두 케이스로 만들었거나 제외했습니다.'],
    ['원장 없는 셈', { none: 'PDF 뿐' }, '기획서 요구를 세지 못해 이어 작성할 수 없습니다.'],
  ];
  it.each(못누름)('못 누르면(%s) 왜인지 말한다', (_, 커버리지, 글) => {
    카드(줄({ canContinue: false }), 커버리지);
    expect(screen.queryByRole('button', { name: '남은 요구로 이어 작성' })).toBeNull();
    expect(screen.getByText(글)).toBeTruthy();
  });

  it('셈에 남은 것이 있는데 서버가 막으면(입력 자료 없는 옛 요청) 일반 까닭을 말한다', () => {
    카드(줄({ canContinue: false }));
    expect(screen.getByText('이 요청은 이어 작성할 수 없습니다.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '남은 요구로 이어 작성' })).toBeNull();
  });

  it('서버가 409 로 막으면 오류 한 줄을 띄우고 다시 읽는다', async () => {
    만들기답 = () => Promise.reject(new ApiError(409, 'ALREADY_CONTINUED', ''));
    카드(줄({}));
    fireEvent.click(screen.getByRole('button', { name: '남은 요구로 이어 작성' }));
    await waitFor(() => expect(screen.getByText('이미 남은 요구를 넘겨받은 요청이 있습니다. 화면을 새로 고칩니다')).toBeTruthy());
    expect(다시읽음).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/authoring/5873');
  });

  it('옛 응답(canContinue 없음)에는 항목을 안 그린다', () => {
    카드(줄({ canContinue: undefined, continuedBy: undefined }));
    expect(screen.queryByText('남은 요구로 이어 작성')).toBeNull();
  });
});

describe('끝난 작성 실행 — GitHub 직접 병합 안내', () => {
  const 작성끝 = (덮을것: Partial<AuthoringRow> = {}) =>
    줄({ id: 5877, kind: 'RERUN', sourceId: 5873, prUrl: 'https://github.com/x/y/pull/105', canContinue: false, ...덮을것 });

  it('셈에 남은 요구가 있으면 반영을 눌러야 이어 작성할 수 있다고 알린다', () => {
    카드(작성끝());
    expect(screen.getByText('GitHub 에서 이미 병합했어도 여기서 반영을 눌러야 남은 요구를 이어 작성할 수 있습니다.')).toBeTruthy();
  });

  it('남은 요구가 없으면 안내하지 않는다', () => {
    카드(작성끝(), { ...셈, excluded: { '요구 아님': 124 }, missing: [], later: [] });
    expect(screen.queryByText(/GitHub 에서 이미 병합했어도/)).toBeNull();
  });
});

describe('이어 작성 요청 — 원본 표시', () => {
  const 뿌리 = (덮을것: Partial<AuthoringRow> = {}): AuthoringRow =>
    줄({
      id: 5901,
      kind: 'AUTHOR',
      sourceId: null,
      status: 'PENDING',
      rootId: 5901,
      continueFrom: 5873,
      canContinue: false,
      runs: [
        { id: 5901, kind: 'AUTHOR', resumeFrom: null, status: 'PENDING', stopReason: null, error: null, createdAt: '2026-09-30T13:00:00Z', startedAt: null, finishedAt: null, caseFiles: null, tokens: null, prUrl: null },
      ],
      ...덮을것,
    });

  it('상세 머리 부제에 원본의 남은 요구라고 적고 원본으로 가는 고리를 둔다', async () => {
    답들.set(5901, 뿌리());
    render(
      <언어함 value="ko">
        <AuthoringDetail service="MKT" id={5901} 할수={다됨} />
      </언어함>,
    );
    const 고리 = await screen.findByRole('link', { name: '#5873의 남은 요구' });
    expect(고리.getAttribute('href')).toBe('#/authoring/5873');
  });

  it('기획서에 없는 화면 요청의 부제는 앞 대조 뿌리로 가는 고리를 둔다', async () => {
    답들.set(5901, 뿌리({ continueFrom: null, uncoveredOf: 5873 }));
    render(
      <언어함 value="ko">
        <AuthoringDetail service="MKT" id={5901} 할수={다됨} />
      </언어함>,
    );
    const 고리 = await screen.findByRole('link', { name: '#5873 다음 · 기획서에 없는 화면' });
    expect(고리.getAttribute('href')).toBe('#/authoring/5873');
    expect(screen.queryByRole('link', { name: /남은 요구/ })).toBeNull();
  });

  it('재실행이 최신이어도 부제는 뿌리의 원본을 적는다 — 재실행 행에는 칸이 없다', async () => {
    const 재실행 = { id: 5905, kind: 'RERUN' as const, resumeFrom: null, status: 'PENDING' as const, stopReason: null, error: null, createdAt: '2026-09-30T14:00:00Z', startedAt: null, finishedAt: null, caseFiles: null, tokens: null, prUrl: null };
    답들.set(5901, 뿌리({ runs: [재실행, ...(뿌리().runs ?? [])] }));
    답들.set(5905, 줄({ id: 5905, kind: 'RERUN', sourceId: 5901, status: 'PENDING', rootId: 5901, continueFrom: null, canContinue: false }));
    render(
      <언어함 value="ko">
        <AuthoringDetail service="MKT" id={5901} 할수={다됨} />
      </언어함>,
    );
    expect((await screen.findByRole('link', { name: '#5873의 남은 요구' })).getAttribute('href')).toBe('#/authoring/5873');
  });

  it('다른 요청 상세로 넘어갈 때 앞 요청의 답이 남아 있어도 앞 번호로 되돌려 보내지 않는다', async () => {
    const 원본실행 = { id: 5873, kind: 'AUTHOR' as const, resumeFrom: null, status: 'DONE' as const, stopReason: null, error: null, createdAt: '2026-09-30T12:00:00Z', startedAt: null, finishedAt: null, caseFiles: null, tokens: null, prUrl: null };
    답들.set(5873, 뿌리({ id: 5873, rootId: 5873, continueFrom: null, status: 'DONE', runs: [원본실행] }));
    const 화면 = render(
      <언어함 value="ko">
        <AuthoringDetail service="MKT" id={5873} 할수={다됨} />
      </언어함>,
    );
    await screen.findByText('#5873');
    답들.set(5901, 뿌리());
    window.location.hash = '#/authoring/5901';
    화면.rerender(
      <언어함 value="ko">
        <AuthoringDetail service="MKT" id={5901} 할수={다됨} />
      </언어함>,
    );
    await screen.findByRole('link', { name: '#5873의 남은 요구' });
    expect(window.location.hash).toBe('#/authoring/5901');
  });
});
