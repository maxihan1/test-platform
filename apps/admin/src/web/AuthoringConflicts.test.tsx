// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type AuthoringConflict, type AuthoringRow, type AuthoringRun } from './api.js';
import { AuthoringConflicts } from './AuthoringConflicts.js';
import { AuthoringMergeFailed } from './AuthoringMergeFailed.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import type { 판정 } from './role.js';

const { 넣기, 지우기, 새요청, 케이스읽기 } = vi.hoisted(() => ({
  케이스읽기: vi.fn((_tc: string) => Promise.resolve({ tcId: 'PAY-041', name: '결제 취소 안내(기존)', precondition: ['결제 완료 주문이 있다'] })),
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
      caseOf: 케이스읽기,
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
  케이스읽기.mockClear();
  reload.mockClear();
});
afterEach(() => cleanup());

describe('중복 케이스 표', () => {
  it('겹침이 없으면 그리지 않는다', () => {
    const { container } = render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[]} 편집 reload={reload} />);
    expect(container.innerHTML).toBe('');
  });

  it('케이스 · 중복 항목 · 기존 케이스 · 선택을 보인다', () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 요구겹침]} 편집 reload={reload} />);
    expect(screen.getByRole('table', { name: '중복 케이스' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['케이스', '중복 항목', '기존 케이스', '선택', '']);
    expect(screen.getByText('케이스 번호 중복')).toBeTruthy();
    expect(screen.getByText('요구사항 중복')).toBeTruthy();
    expect(screen.getByText('R-17')).toBeTruthy();
    expect(screen.getByText('쿠폰 한 장만 적용')).toBeTruthy();
    expect(screen.getByText('선택 전')).toBeTruthy();
    expect(screen.getAllByText('새 케이스 제외').length).toBeGreaterThan(1);
    expect(screen.getByText(/maxi/)).toBeTruthy();
  });

  it('이름이 겹친 줄은 이름 중복 칩을 단다', () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[{ ...번호겹침, kinds: ['NAME'] }]} 편집 reload={reload} />);
    expect(screen.getByText('이름 중복')).toBeTruthy();
  });

  it('둘 다 유지를 누르면 PUT 으로 보내고 다시 읽는다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: 'PAY-041 둘 다 유지' }));
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(넣기).toHaveBeenCalledWith('PAY', 7, 'PAY-041', 'KEEP');
  });

  it('새 케이스 제외를 누르면 DROP 으로 보낸다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: 'PAY-041 새 케이스 제외' }));
    await vi.waitFor(() => expect(넣기).toHaveBeenCalledWith('PAY', 7, 'PAY-041', 'DROP'));
  });

  it('번호가 겹친 케이스를 유지하기로 했으면 새 번호를 받는다고 말한다', () => {
    const 남김 = { ...번호겹침, input: { action: 'KEEP' as const, by: 'maxi', at: '2026-10-01T05:00:00.000Z' } };
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[남김]} 편집 reload={reload} />);
    expect(screen.getByText('번호가 겹쳐 반영할 때 새 번호를 받습니다')).toBeTruthy();
  });

  it('고른 줄에만 되돌리기가 있고 DELETE 를 보낸다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 요구겹침]} 편집 reload={reload} />);
    const 되돌리기 = screen.getAllByRole('button', { name: /되돌리기/ });
    expect(되돌리기).toHaveLength(1);
    fireEvent.click(되돌리기[0] as HTMLElement);
    await vi.waitFor(() => expect(지우기).toHaveBeenCalledWith('PAY', 7, 'PAY-043'));
  });

  it('모두 유지는 아직 안 고른 것만 차례로 보낸다', async () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 요구겹침]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '모두 유지' }));
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(넣기).toHaveBeenCalledTimes(1);
    expect(넣기).toHaveBeenCalledWith('PAY', 7, 'PAY-041', 'KEEP');
  });

  it('한 건이 실패하면 거기서 멈추고 까닭을 사람 말로 보인다', async () => {
    넣기.mockRejectedValueOnce(new ApiError(400, 'BAD_CONFLICT', 'PAY-041'));
    const 셋째 = { ...번호겹침, tcId: 'PAY-050' };
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침, 셋째]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '모두 유지' }));
    expect(await screen.findByText(/중복 목록에 없는 케이스/)).toBeTruthy();
    expect(넣기).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalled();
  });

  it('권한이 없으면 고르는 버튼은 안 그리고 비교만 남는다', () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 편집={false} reload={reload} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['두 케이스 비교']);
    expect(screen.queryByRole('button', { name: '모두 유지' })).toBeNull();
  });

  it('두 케이스 비교를 누르면 이번에 만든 것과 기존 케이스를 나란히 펴고 다시 누르면 접는다', async () => {
    const 새것 = [{ tcId: 'PAY-041', name: '결제 취소 후 환불 안내', file: 'tests/pay/cancel.spec.ts', change: 'NEW' as const, verifies: ['환불 안내 문구가 보인다', '환불 금액이 보인다'], reqs: ['R-9'] }];
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 새것={새것} 편집 reload={reload} />);
    expect(screen.queryByText('이번에 만든 것')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '두 케이스 비교' }));
    expect(screen.getByText('이번에 만든 것')).toBeTruthy();
    expect(screen.getByText('환불 안내 문구가 보인다')).toBeTruthy();
    expect(screen.getByText('환불 금액이 보인다')).toBeTruthy();
    expect(screen.getByText('R-9')).toBeTruthy();
    expect(await screen.findByText('결제 취소 안내(기존)')).toBeTruthy();
    expect(screen.getByText('결제 완료 주문이 있다')).toBeTruthy();
    expect(케이스읽기).toHaveBeenCalledWith('PAY-041');
    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    expect(screen.queryByText('이번에 만든 것')).toBeNull();
    expect(screen.queryByText('환불 안내 문구가 보인다')).toBeNull();
  });

  it('이번에 만든 목록이 없는 옛 요청이면 확인 내용은 PR 에서 보라고 한다', () => {
    render(<AuthoringConflicts service="PAY" 요청번호={7} conflicts={[번호겹침]} 새것={null} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '두 케이스 비교' }));
    expect(screen.getByText('확인 내용은 PR 에서 보세요')).toBeTruthy();
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
    expect(screen.getByText('중복 케이스 2건을 아직 선택하지 않아 반영할 수 없습니다.')).toBeTruthy();
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
  it('겹침으로 실패했으면 사람 말과 중복 케이스 고르기만 보이고 원문은 접는다', () => {
    render(<AuthoringMergeFailed service="PAY" 실행={실패반영} 원본={7} 권한 반영권한 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByText('이미 있는 케이스와 중복되는 케이스가 2건입니다. 아래 표에서 고른 뒤 다시 반영하세요')).toBeTruthy();
    expect(screen.getByText('원문 보기')).toBeTruthy();
    expect(screen.getByRole('button', { name: '중복 케이스 고르기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '같은 자료로 다시 작성' })).toBeNull();
  });

  it('겹침 글인데 고를 목록이 안 실렸으면 고르기 대신 같은 자료로 다시 작성을 낸다', () => {
    render(<AuthoringMergeFailed service="PAY" 실행={실패반영} 원본={7} 권한 반영권한 운영자={false} 겹침수={0} reload={reload} />);
    expect(screen.queryByRole('button', { name: '중복 케이스 고르기' })).toBeNull();
    expect(screen.getByRole('button', { name: '같은 자료로 다시 작성' })).toBeTruthy();
  });

  it('17분 넘게 안 끝난 검사는 빨간 것이 아니라 느린 것이라 다시 반영을 권한다', () => {
    const 실행 = { ...실패반영, error: 'CI 가 17분 안에 초록이 안 됐다 (pending).' };
    render(<AuthoringMergeFailed service="PAY" 실행={실행} 원본={7} 권한 반영권한 운영자={false} 겹침수={0} reload={reload} />);
    expect(screen.getByRole('button', { name: '다시 반영' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '검사 결과 보기' })).toBeNull();
  });

  it('검사가 빨개서 실패했으면 검사 결과 고리와 다시 작성을 낸다', async () => {
    const 실행 = { ...실패반영, error: 'CI 가 빨갛다 (failure): https://github.com/o/r/actions/runs/12' };
    render(<AuthoringMergeFailed service="PAY" 실행={실행} 원본={7} 권한 반영권한 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByRole('link', { name: '검사 결과 보기' }).getAttribute('href')).toBe('https://github.com/o/r/actions/runs/12');
    fireEvent.click(screen.getByRole('button', { name: '같은 자료로 다시 작성' }));
    await vi.waitFor(() => expect(새요청).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 7 }));
    expect(reload).toHaveBeenCalled();
  });

  it('잠깐 끊긴 실패면 다시 반영만 권하고, 반영 권한이 없으면 까닭을 적는다', () => {
    const 실행 = { ...실패반영, error: 'CI 실행 목록을 못 읽어 초안을 안 풀었다 — 다시 눌러라' };
    const { rerender } = render(<AuthoringMergeFailed service="PAY" 실행={실행} 원본={7} 권한 반영권한 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByRole('button', { name: '다시 반영' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '같은 자료로 다시 작성' })).toBeNull();
    rerender(<AuthoringMergeFailed service="PAY" 실행={실행} 원본={7} 권한 반영권한={false} 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByText('반영은 관리자만 할 수 있습니다.')).toBeTruthy();
  });

  it('부딪혀 실패했으면 같은 자료로 다시 작성을 낸다', () => {
    const 실행 = { ...실패반영, error: '병합이 안 됐다 (DIRTY): 충돌' };
    render(<AuthoringMergeFailed service="PAY" 실행={실행} 원본={7} 권한 반영권한 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByRole('button', { name: '같은 자료로 다시 작성' })).toBeTruthy();
  });

  it('반영이 성공했거나 안 했으면 그리지 않는다', () => {
    const { container } = render(<AuthoringMergeFailed service="PAY" 실행={{ ...실패반영, status: 'DONE' }} 원본={7} 권한 반영권한 운영자={false} 겹침수={2} reload={reload} />);
    expect(container.innerHTML).toBe('');
  });

  it('권한이 없으면 까닭만 보이고 버튼은 없다', () => {
    render(<AuthoringMergeFailed service="PAY" 실행={실패반영} 원본={7} 권한={false} 반영권한={false} 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByText('이미 있는 케이스와 중복되는 케이스가 2건입니다. 아래 표에서 고른 뒤 다시 반영하세요')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '같은 자료로 다시 작성' })).toBeNull();
    expect(screen.queryByRole('button', { name: '다시 반영' })).toBeNull();
  });

  it('부딪힌 실패도 권한이 없으면 까닭만 있고 버튼이 하나도 없다', () => {
    render(<AuthoringMergeFailed service="PAY" 실행={{ ...실패반영, error: '병합이 안 됐다 (DIRTY): 충돌' }} 원본={7} 권한={false} 반영권한={false} 운영자={false} 겹침수={2} reload={reload} />);
    expect(screen.getByText('반영하지 못했습니다')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
