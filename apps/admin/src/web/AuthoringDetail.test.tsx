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
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
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

/**
 * 첫 읽기가 **화면에 반영될 때까지** 기다린다. 그래야 주기 타이머가 걸린다.
 * 0 을 한 번만 흘리면 결과가 아직 안 붙어 타이머가 안 걸리고, 그러면 「다시 안 읽는다」 검사가
 * 아무것도 안 보고 통과한다 — 앞 검사가 데워 둔 순서에서만 맞던 모양이었다 (2026-09-23 실측)
 */
async function 첫읽기끝(): Promise<void> {
  await vi.waitFor(() => {
    if (screen.queryByText('불러오는 중입니다.') !== null) throw new Error('아직 첫 읽기 전');
  });
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
    await 첫읽기끝();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });

  it('준비 중(DRAFT) 요청도 다시 읽지 않는다. 스스로 바뀌지 않고 버려진 채 남는다', async () => {
    답 = 줄({ status: 'DRAFT', prUrl: null, finishedAt: null, startedAt: null, assets: [] });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    await 첫읽기끝();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });

  it('도는 중이면 주기적으로 다시 읽는다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    await 첫읽기끝();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBeGreaterThan(1);
  });

  it('자료를 순서대로 보인다. 파일은 내려받기 링크, 피그마는 저장된 주소로 새 창에 연다', async () => {
    답 = 줄({
      assets: [
        { id: 11, position: 1, kind: 'FILE', name: '결제 기획서.pdf', figmaUrl: null, size: 10 },
        { id: 12, position: 2, kind: 'FILE', name: '화면정의서.docx', figmaUrl: null, size: 20 },
        {
          id: 13,
          position: 3,
          kind: 'FIGMA',
          name: 'https://www.figma.com/design/AbC/?node-id=12-34',
          figmaUrl: 'https://www.figma.com/design/AbC/?node-id=12-34',
          size: null,
        },
      ],
    });
    render(<AuthoringDetail service="PAY" id={7} role="viewer" />);

    const 첫 = await screen.findByRole('link', { name: '결제 기획서.pdf' });
    const 링크들 = screen.getAllByRole('link').filter((a) => a.closest('.authoring-assets') !== null);
    expect(링크들.map((a) => a.textContent)).toEqual([
      '결제 기획서.pdf',
      '화면정의서.docx',
      'https://www.figma.com/design/AbC/?node-id=12-34',
    ]);
    expect(첫.getAttribute('href')).toBe('/api/authoring/requests/7/assets/11');
    expect(첫.hasAttribute('download')).toBe(true);
    const 피그마 = 링크들[2];
    expect(피그마?.getAttribute('href')).toBe('https://www.figma.com/design/AbC/?node-id=12-34');
    expect(피그마?.getAttribute('target')).toBe('_blank');
    expect(피그마?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('준비 중(DRAFT) 요청에는 줄에 서지 않았으니 새 요청으로 다시 넣으라고 알린다', async () => {
    답 = 줄({ status: 'DRAFT', prUrl: null, finishedAt: null, startedAt: null, assets: [] });
    render(<AuthoringDetail service="PAY" id={7} role="admin" />);
    expect(await screen.findByText('이 요청은 줄에 서지 않았습니다. 새 요청으로 다시 넣으세요')).toBeTruthy();
    expect(screen.getByText('준비 중')).toBeTruthy();
  });
});
