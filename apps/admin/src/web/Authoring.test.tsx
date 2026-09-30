// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringRow } from './api.js';
import { Authoring } from './Authoring.js';
import { 멈춘듯기준 } from './authoringView.js';

const 줄들: AuthoringRow[] = [];

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequests: () =>
        Promise.resolve({ items: 줄들, total: 줄들.length, page: 1, pageSize: 50 }),
    },
  };
});

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
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
    ...덮을것,
  };
}

beforeEach(() => {
  줄들.length = 0;
});

afterEach(() => {
  cleanup();
});

describe('작성 줄 목록', () => {
  it('줄이 하나도 없으면 왜 비었는지 말한다', async () => {
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('아직 작성을 요청한 기록이 없습니다')).toBeTruthy();
  });

  it('줄마다 요청자와 작업 단계가 보인다', async () => {
    줄들.push(줄({ status: 'RUNNING', stage: '케이스 2건째', stageAt: new Date().toISOString() }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('케이스 2건째')).toBeTruthy();
    expect(screen.getByText(/테스터/)).toBeTruthy();
  });

  it('신호가 오래 끊긴 줄은 작성 중이 아니라 응답 없음으로 보인다', async () => {
    const 오래전 = new Date(Date.now() - 멈춘듯기준 - 1000).toISOString();
    줄들.push(줄({ status: 'RUNNING', stage: '관문 3', stageAt: 오래전 }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('응답 없음')).toBeTruthy();
    expect(screen.queryByText('작성 중')).toBeNull();
  });

  it('멈춘 줄은 중단으로 보인다', async () => {
    줄들.push(줄({ status: 'STOPPED', stopReason: 'USER', finishedAt: new Date().toISOString() }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('중단')).toBeTruthy();
  });

  it('여러 번 돈 요청은 뿌리 번호 한 줄 — 링크도 뿌리로 가고 몇 차인지 보인다 (도메인/작성 §7 「실행 기록」)', async () => {
    줄들.push(줄({ id: 5877, kind: 'RERUN', sourceId: 5873, resumeFrom: 5876, rootId: 5873, runCount: 5, status: 'RUNNING', stageAt: new Date().toISOString() }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('#5873')).toBeTruthy();
    expect(screen.queryByText('#5877')).toBeNull();
    const 고리 = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.startsWith('#/authoring/'));
    expect(고리?.getAttribute('href')).toBe('#/authoring/5873');
    expect(screen.getByText(/5차 · 이어서/)).toBeTruthy();
  });
});

// 작성 읽기면 새 작성 자리가 아예 없다 (화면공통 §8)
describe('작성 권한 칸', () => {
  it('작성 쓰기면 새 작성 폼이 선다', async () => {
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('테스트 작성 시작')).toBeTruthy();
  });

  it('작성 읽기면 새 작성 폼이 없다', async () => {
    render(<Authoring service="PAY" 할수={(무엇) => 무엇 !== '작성요청'} />);
    await screen.findByText('아직 작성을 요청한 기록이 없습니다');
    expect(screen.queryByText('테스트 작성 시작')).toBeNull();
    expect(screen.queryByText('기획서 파일')).toBeNull();
  });

  it('작성 읽기면 빈 목록 안내가 못 하는 일을 권하지 않는다', async () => {
    render(<Authoring service="PAY" 할수={(무엇) => 무엇 !== '작성요청'} />);
    expect(await screen.findByText('작성 요청이 들어오면 여기에 줄이 생깁니다')).toBeTruthy();
    expect(screen.queryByText('기획서를 넣으면 여기에 줄이 생깁니다')).toBeNull();
  });

  it('남은 요구를 이어 작성한 요청 줄은 원본을 평문으로 적는다 — 줄 전체가 고리라 안에 고리를 두지 않는다', async () => {
    줄들.push(줄({ id: 5901, rootId: 5901, continueFrom: 5873, runCount: 1 }));
    줄들.push(줄({ id: 5910, rootId: 5902, continueFrom: 5877, kind: 'RERUN', runCount: 2 }));
    render(<Authoring service="PAY" 할수={() => true} />);
    const 첫 = await screen.findByText(/#5873의 남은 요구/);
    expect(첫.textContent?.startsWith('#5873의 남은 요구')).toBe(true);
    expect(첫.closest('a')).toBe(null);
    expect(screen.getByText(/2차 · .* · #5877의 남은 요구/)).toBeTruthy();
  });
});
