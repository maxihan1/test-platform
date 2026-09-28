// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringRow } from './api.js';
import { AuthoringStartModal } from './AuthoringStartModal.js';

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
    },
  };
});

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 5872,
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
  부른횟수 = 0;
  window.location.hash = '';
  답 = 줄({});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('테스트 작성 시작 모달', () => {
  it('접수 확인 · 닫아도 계속된다는 안내 · Status 카드를 보인다', async () => {
    render(<AuthoringStartModal service="MKT" id={5872} onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: '테스트 작성을 시작했습니다' })).toBeTruthy();
    expect(screen.getByText('#5872 요청이 접수됐습니다.')).toBeTruthy();
    expect(screen.getByText(/창을 닫아도 작성은 계속됩니다/)).toBeTruthy();
    expect(await screen.findByText('대기 중')).toBeTruthy();
    expect(screen.getByText('에이전트 순서를 기다리는 중')).toBeTruthy();
  });

  it('닫기를 누르면 닫는다', () => {
    const 닫기 = vi.fn();
    render(<AuthoringStartModal service="MKT" id={5872} onClose={닫기} />);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(닫기).toHaveBeenCalled();
  });

  it('상세 페이지로를 누르면 그 요청의 페이지로 가고 닫는다', () => {
    const 닫기 = vi.fn();
    render(<AuthoringStartModal service="MKT" id={5872} onClose={닫기} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 페이지로' }));
    expect(window.location.hash).toBe('#/authoring/5872');
    expect(닫기).toHaveBeenCalled();
  });

  it('도는 동안 다시 읽는다', async () => {
    vi.useFakeTimers();
    render(<AuthoringStartModal service="MKT" id={5872} onClose={() => undefined} />);
    await vi.waitFor(() => {
      if (screen.queryByText('대기 중') === null) throw new Error('아직 첫 읽기 전');
    });
    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(() => expect(부른횟수).toBeGreaterThan(1));
  });

  it('끝난 요청은 다시 읽지 않는다', async () => {
    답 = 줄({ status: 'DONE', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() });
    vi.useFakeTimers();
    render(<AuthoringStartModal service="MKT" id={5872} onClose={() => undefined} />);
    await vi.waitFor(() => {
      if (screen.queryAllByText('완료').length === 0) throw new Error('아직 첫 읽기 전');
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });
});
