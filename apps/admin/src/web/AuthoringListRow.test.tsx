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

const 상태칸 = (글: string): Element | undefined => [...document.querySelectorAll('[data-tone]')].find((칸) => 칸.textContent === 글);

describe('작성 목록 한 줄 표 (도메인/작성 §3.6 「작성 목록 줄」 · 2026-11-10 사용자 시안)', () => {
  it('칸은 번호 · 구분 · 대상 · 케이스 수 · 소요 시간 · 작성자 · 작성일 · 상태 — 대상은 기능 이름이고 줄 전체를 누르는 링크다', async () => {
    줄들.push(줄({
      id: 14675, rootId: 14675, status: 'DONE', createdAt: '2026-11-10T14:22:00',
      summary: 요약({
        what: { features: ['공통', '홈', '회원가입'], featuresMore: 22 },
        result: { casesMade: 410, casesFixed: 2, reqsCovered: 347, reqsTotal: 348, tookSec: 4320 },
      }),
    }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect((await screen.findByText('공통 · 홈 · 회원가입 외 22개')).getAttribute('href')).toBe('#/authoring/14675');
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['번호', '구분', '대상', '케이스 수', '소요 시간', '작성자', '작성일', '상태']);
    for (const 글 of ['#14675', '신규', '412', '1시간 12분', '테스터', '2026-11-10 14:22', '완료']) expect(screen.getByText(글)).toBeTruthy();
    expect(screen.getByText('완료').closest('[data-tone]')?.getAttribute('data-tone')).toBe('pass');
    expect(screen.queryByText('새 작성에 넣는 자료')).toBeNull();
  });

  it('수정 줄은 대상에 기능 이름 · 모르면 — · 실패 · 중단은 멈춘 단계를 붙이고 중단은 실패 색이 아니다', async () => {
    줄들.push(줄({ id: 101, rootId: 101, kind: 'EDIT', status: 'PENDING', summary: 요약({ kind: 'EDIT', what: { features: ['장바구니'] } }) }));
    줄들.push(줄({
      id: 102, rootId: 102, status: 'STOPPED', startedAt: '2026-11-10T01:00:00Z',
      summary: 요약({ kind: 'PRD_APPLY', result: { stoppedAt: '케이스를 만드는 중' } }),
    }));
    줄들.push(줄({ id: 103, rootId: 103, status: 'FAILED', summary: 요약({ result: { stoppedAt: '자료를 받는 중', casesMade: 0 } }) }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect((await screen.findByText('장바구니')).getAttribute('href')).toBe('#/authoring/101');
    expect(screen.getAllByText('수정')).toHaveLength(2);
    expect(screen.getByLabelText('#102').textContent).toBe('—');
    expect(상태칸('중단 · 케이스 작성')?.getAttribute('data-tone')).toBe('na');
    expect(상태칸('실패 · 자료 · PRD 읽기')?.getAttribute('data-tone')).toBe('fail');
  });

  it('초안은 올리다 버려졌을 수도 있어 「업로드 중」이라 하지 않는다 · 업로드 거절은 사람이 세운 중단과 가른다', async () => {
    줄들.push(줄({ id: 301, rootId: 301, status: 'DRAFT' }));
    줄들.push(줄({ id: 302, rootId: 302, status: 'STOPPED', stopReason: 'REJECTED', error: '테스트 밖 파일을 고쳤다', startedAt: '2026-11-10T01:00:00Z' }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('자료 업로드가 완료되지 않았습니다')).toBeTruthy();
    expect(screen.queryByText('자료 업로드 중')).toBeNull();
    expect(screen.getByText('업로드 거절')).toBeTruthy();
    expect(screen.queryByText('중단')).toBeNull();
  });

  it('작성 중이면 상태에 단계와 몇째 칸 · 소요 시간은 집힌 때부터 지금까지', async () => {
    줄들.push(줄({
      id: 201, rootId: 201, status: 'RUNNING', stage: '케이스를 만드는 중',
      stageAt: new Date().toISOString(), startedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('18분')).toBeTruthy();
    expect(상태칸('작성 중 · 케이스 작성 3/6')?.getAttribute('data-tone')).toBe('run');
    // 휴대폰 폭에서 CSS 가 숨기는 단계 조각은 따로 선다
    expect(document.querySelector('.a-step')?.textContent).toBe(' · 케이스 작성 3/6');
  });
});

