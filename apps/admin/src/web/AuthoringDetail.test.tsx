// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';

let 답: AuthoringRow;
let 부른횟수 = 0;

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequest: () => {
        부른횟수 += 1;
        return Promise.resolve(답);
      },
      createAuthoringMerge: () => Promise.resolve({ id: 2 }),
    },
  };
});

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: '맥',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...덮을것,
  };
}

beforeEach(() => {
  부른횟수 = 0;
  답 = 줄({});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('작성 한 건 상세', () => {
  it('운영 등급에게만 머지 버튼이 보인다', async () => {
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    expect(await screen.findByRole('button', { name: '머지' })).toBeTruthy();
  });

  it('실행 등급에게는 머지 버튼이 없다. 머지는 저장소를 영구히 바꾼다', async () => {
    render(<AuthoringDetail service="PAY" id={7} role="operator" />);
    await screen.findByText('테스터');
    expect(screen.queryByRole('button', { name: '머지' })).toBeNull();
  });

  it('아직 안 끝난 요청에는 머지 버튼이 없다. 올릴 PR 주소가 없다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null });
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    await screen.findByText('테스터');
    expect(screen.queryByRole('button', { name: '머지' })).toBeNull();
  });

  it('끝난 요청은 다시 읽지 않는다. 안 멈추면 탭 하나가 서버를 계속 두드린다', async () => {
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    // 첫 읽기가 끝나야 주기 타이머가 걸린다. 0 을 한 번 흘려 그 자리를 만든다
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });

  it('도는 중이면 주기적으로 다시 읽는다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    // 첫 읽기가 끝나야 주기 타이머가 걸린다. 0 을 한 번 흘려 그 자리를 만든다
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBeGreaterThan(1);
  });
});
