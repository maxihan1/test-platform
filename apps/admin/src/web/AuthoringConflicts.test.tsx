// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type AuthoringConflict, type AuthoringRow, type AuthoringRun } from './api.js';
import { AuthoringConflicts } from './AuthoringConflicts.js';
import { AuthoringMergeFailed } from './AuthoringMergeFailed.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import type { 판정 } from './role.js';

const { 넣기, 지우기, 새요청 } = vi.hoisted(() => ({
  넣기: vi.fn((_s: string, _id: number, _tc: string, _a: string) => Promise.resolve({ ok: true as const })),
  지우기: vi.fn((_s: string, _id: number, _tc: string) => Promise.resolve({ ok: true as const })),
  새요청: vi.fn((_s: string, _b: unknown) => Promise.resolve({ id: 9 })),
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      putAuthoringConflict: 넣기,
      deleteAuthoringConflict: 지우기,
      createAuthoringRequest: 새요청,
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

const 번호겹침: AuthoringConflict = {
  tcId: 'PAY-041',
  name: '결제 취소 후 환불 안내가 보인다',
  file: 'tests/pay/cancel.spec.ts',
  kinds: ['TCID'],
  with: [{ tcId: 'PAY-041', name: '결제 취소 안내', file: 'tests/pay/old.spec.ts' }],
  input: null,
};
const 요구겹침: AuthoringConflict = {
  tcId: 'PAY-043',
  name: '쿠폰 중복 적용이 막힌다',
  file: 'tests/pay/coupon.spec.ts',
  kinds: ['REQUIREMENT'],
  with: [{ tcId: 'PAY-020', name: '쿠폰 한 장만 적용', file: 'tests/pay/coupon-old.spec.ts' }],
  requirements: ['R-17'],
  input: { action: 'DROP', by: 'maxi', at: '2026-10-01T05:00:00.000Z' },
};

const reload = vi.fn();
beforeEach(() => {
  넣기.mockClear();
  지우기.mockClear();
  새요청.mockClear();
  reload.mockClear();
});
afterEach(() => cleanup());

describe('겹친 케이스 표', () => {
  it('겹침이 없으면 그리지 않는다', () => {
    const { container } = render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[]} 편집 reload={reload} />);
    expect(container.innerHTML).toBe('');
  });

  it('케이스 · 무엇이 겹쳤나 · 겹친 main 케이스 · 고른 것을 보인다', () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 요구겹침]} 편집 reload={reload} />);
    expect(screen.getByText('2건 · 아직 고르지 않은 것 1건')).toBeTruthy();
    expect(screen.getByText('번호 겹침')).toBeTruthy();
    expect(screen.getByText('요구 번호 겹침')).toBeTruthy();
    expect(screen.getByText('R-17')).toBeTruthy();
    expect(screen.getByText('쿠폰 한 장만 적용')).toBeTruthy();
    expect(screen.getByText('아직 안 고름')).toBeTruthy();
    expect(screen.getByText(/maxi/)).toBeTruthy();
  });

  it('남긴다를 누르면 PUT 으로 보내고 다시 읽는다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 편집 reload={reload} />);
    fireEvent.click(screen.getAllByRole('button', { name: '남긴다' })[0] as HTMLElement);
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(넣기).toHaveBeenCalledWith('PAY', 7, 'PAY-041', 'KEEP');
  });

  it('번호가 겹친 케이스를 남기기로 했으면 새 번호를 받는다고 말한다', () => {
    const 남김 = { ...번호겹침, input: { action: 'KEEP' as const, by: 'maxi', at: '2026-10-01T05:00:00.000Z' } };
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[남김]} 편집 reload={reload} />);
    expect(screen.getByText('번호가 겹쳐 반영할 때 새 번호를 받습니다')).toBeTruthy();
  });

  it('고른 줄에만 되돌리기가 있고 DELETE 를 보낸다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 요구겹침]} 편집 reload={reload} />);
    const 되돌리기 = screen.getAllByRole('button', { name: '되돌리기' });
    expect(되돌리기).toHaveLength(1);
    fireEvent.click(되돌리기[0] as HTMLElement);
    await vi.waitFor(() => expect(지우기).toHaveBeenCalledWith('PAY', 7, 'PAY-043'));
  });

  it('모두 남긴다는 아직 안 고른 것만 차례로 보낸다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 요구겹침]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '모두 남긴다' }));
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(넣기).toHaveBeenCalledTimes(1);
    expect(넣기).toHaveBeenCalledWith('PAY', 7, 'PAY-041', 'KEEP');
  });

  it('한 건이 실패하면 거기서 멈추고 까닭을 사람 말로 보인다', async () => {
    넣기.mockRejectedValueOnce(new ApiError(400, 'BAD_CONFLICT', 'PAY-041'));
    const 셋째 = { ...번호겹침, tcId: 'PAY-050' };
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 셋째]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '모두 남긴다' }));
    expect(await screen.findByText(/겹침 목록에 없는 케이스/)).toBeTruthy();
    expect(넣기).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalled();
  });

  it('권한이 없으면 버튼을 안 그린다', () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 편집={false} reload={reload} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
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
const 운영: 판정 = () => true;

describe('반영 단계 — 남은 겹침', () => {
  it('남은 겹침이 있으면 반영 버튼이 잠기고 까닭을 말한다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({ conflictsOpen: 2, conflicts: [번호겹침] })} 할수={운영} 차이수={0} reload={reload} />);
    expect((screen.getByRole('button', { name: '테스트 반영하기' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('겹치는 케이스 2건을 아직 고르지 않아 반영할 수 없습니다.')).toBeTruthy();
  });

  it('다 골랐으면 반영 버튼이 열린다', () => {
    render(<AuthoringTodo service="PAY" 요청={줄({ conflictsOpen: 0, conflicts: [요구겹침] })} 할수={운영} 차이수={0} reload={reload} />);
    expect((screen.getByRole('button', { name: '테스트 반영하기' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

const 실패반영: AuthoringRun = {
  id: 8,
  kind: 'MERGE',
  resumeFrom: null,
  status: 'FAILED',
  stopReason: null,
  error: '겹치는 케이스 2건을 고르지 않았다',
  createdAt: '2026-10-01T05:00:00.000Z',
  startedAt: null,
  finishedAt: null,
  caseFiles: null,
  tokens: null,
  prUrl: null,
};

describe('반영 실패 안내', () => {
  it('반영이 실패했으면 까닭과 다시 작성 버튼을 보인다', async () => {
    render(<AuthoringMergeFailed service="PAY" 실행={실패반영} 원본={7} 권한 reload={reload} />);
    expect(screen.getByText('겹치는 케이스 2건을 고르지 않았다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '같은 자료로 다시 작성' }));
    await vi.waitFor(() => expect(새요청).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 7 }));
    expect(reload).toHaveBeenCalled();
  });

  it('반영이 성공했거나 안 했으면 그리지 않는다', () => {
    const { container } = render(<AuthoringMergeFailed service="PAY" 실행={{ ...실패반영, status: 'DONE' }} 원본={7} 권한 reload={reload} />);
    expect(container.innerHTML).toBe('');
  });

  it('권한이 없으면 까닭만 보이고 버튼은 없다', () => {
    render(<AuthoringMergeFailed service="PAY" 실행={실패반영} 원본={7} 권한={false} reload={reload} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
