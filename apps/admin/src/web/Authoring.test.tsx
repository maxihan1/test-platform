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
    render(<Authoring service="PAY" />);
    expect(await screen.findByText('아직 작성을 요청한 기록이 없습니다')).toBeTruthy();
  });

  it('줄마다 요청자와 작업 단계가 보인다', async () => {
    줄들.push(줄({ status: 'RUNNING', stage: '케이스 2건째', stageAt: new Date().toISOString() }));
    render(<Authoring service="PAY" />);
    expect(await screen.findByText('케이스 2건째')).toBeTruthy();
    expect(screen.getByText('테스터')).toBeTruthy();
  });

  it('단계가 오래 안 바뀐 줄은 도는 중이 아니라 멈춘 듯으로 보인다', async () => {
    const 오래전 = new Date(Date.now() - 멈춘듯기준 - 1000).toISOString();
    줄들.push(줄({ status: 'RUNNING', stage: '관문 3', stageAt: 오래전 }));
    render(<Authoring service="PAY" />);
    expect(await screen.findByText('멈춘 듯')).toBeTruthy();
    expect(screen.queryByText('도는 중')).toBeNull();
  });
});
