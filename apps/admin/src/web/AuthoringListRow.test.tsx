// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringListRow } from './api.js';
import { Authoring } from './Authoring.js';
import { 요약 } from './authoringSummary.fixture.js';

const 줄들: AuthoringListRow[] = [];

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return { ...진짜, api: { authoringRequests: (_s: string, page: number) => Promise.resolve({ items: 줄들, total: 줄들.length, page, pageSize: 50 }) } };
});

vi.mock('./decideApi.js', () => ({ decideApi: { list: () => Promise.resolve({ prdVersion: 1, count: 0, open: [], items: [], failMore: 0 }) } }));

function 줄(덮을것: Partial<AuthoringListRow>): AuthoringListRow {
  return {
    id: 1,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'PENDING',
    stage: null,
    stageAt: null,
    requestedByName: '테스터',
    claimedBy: null,
    prUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    summary: 요약(),
    todo: { heldOpen: 0, conflictsOpen: 0, apply: null },
    ...덮을것,
  };
}

beforeEach(() => {
  줄들.length = 0;
  window.history.replaceState(null, '', '#/authoring');
});
afterEach(cleanup);

describe('작성 목록 줄 내용 (도메인/작성 §3.6 「작성 목록 줄」 · WEB-F6-06)', () => {
  it('줄은 [종류] 무슨 테스트 / 결과 / 시작한 곳 세 줄이다 — 피그마는 「Figma 디자인」 (WEB-F6-06)', async () => {
    줄들.push(줄({
      id: 14675, rootId: 14675, status: 'DONE',
      summary: 요약({
        what: { features: ['공통', '홈', '회원가입'], featuresMore: 22 },
        result: { casesMade: 412, casesFixed: 0, reqsCovered: 347, reqsTotal: 348, held: 2 },
        from: { assets: [{ name: '기획서.docx', figma: false }, { name: 'https://www.figma.com/design/abc', figma: true }] },
      }),
    }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect((await screen.findByText('기능 25개 테스트 · 공통 · 홈 · 회원가입 외 22개')).getAttribute('href')).toBe('#/authoring/14675');
    expect(screen.getByText('기획서로 작성')).toBeTruthy();
    expect(screen.getByText('케이스 412건 만듦 · 요구 348건 중 347건 · 보류 2건')).toBeTruthy();
    expect(screen.getByText(/^자료 기획서\.docx · Figma 디자인 · 요청한 사람 테스터 · /)).toBeTruthy();
  });

  it('끝나기 전이면 둘째 줄은 지금 상태 글이고 제목은 종류(꼬리표는 한 번) · 멈춘 줄은 실패 색으로 어디서 멈췄는지', async () => {
    줄들.push(줄({ id: 6121, rootId: 6121, compare: true, summary: 요약({ kind: 'SCREEN_ONLY' }) }));
    줄들.push(줄({
      id: 14679, rootId: 14679, status: 'STOPPED',
      summary: 요약({ kind: 'PRD_APPLY', what: { reqs: 348 }, result: { stoppedAt: '케이스를 만드는 중' }, from: { by: 'PRD' } }),
    }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('작성 순서를 기다리는 중')).toBeTruthy();
    // 제목이 종류로 떨어지면 꼬리표를 또 달지 않는다
    expect(screen.getAllByText('화면만 대조')).toHaveLength(1);
    expect(screen.getByText('요구 348건 테스트 다시 작성')).toBeTruthy();
    expect(screen.getByText('케이스 작성 단계에서 멈춤 · 만든 케이스 없음').className).toContain('fail');
    expect(screen.getByText(/^PRD 관리에서 시작 · 요청한 사람 테스터/)).toBeTruthy();
  });
});
