// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';

import { 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실패 카드의 실패 이유 · 실패 원인 판 (실행 §8.3)', () => {
  it('카드 머리에 유형 칩과 서버가 준 한 줄을 적고, 오류 첫 줄은 접힌 「원문 보기」 안에만 둔다', async () => {
    const { container } = 그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, {}, { error: { message: '원문 오류 첫 줄\n  at x.ts:1' }, failure: { type: 'mismatch', reason: '이메일 칸이 비어 있다' } }),
        ]),
      ]),
    );

    const 머리 = (await screen.findByText('기대 결과 불일치')).closest('.fc-head') as HTMLElement;
    expect(within(머리).getByText('이메일 칸이 비어 있다')).toBeTruthy();
    const 원문 = screen.getByText('원문 보기').closest('details') as HTMLDetailsElement;
    expect(원문.open).toBe(false);
    expect(원문.textContent).toContain('원문 오류 첫 줄');
    expect(원문.textContent).not.toContain('x.ts');
    expect(container.querySelector('.fc-err')).toBeNull();
  });

  it('디바이스마다 이유가 다르면 카드 머리와 다른 이유만 그 디바이스 줄에 적는다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, {}, { failure: { type: 'mismatch', reason: '이메일 칸이 비어 있다' } }),
          장치('mobile', 2, {}, { failure: { type: 'notFound', reason: '가입 단추를 찾지 못했다' } }),
        ]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    expect(await screen.findAllByText('이메일 칸이 비어 있다')).toHaveLength(1);
    expect(screen.getByText('가입 단추를 찾지 못했다').closest('.fc-meta')).not.toBeNull();
  });

  it('「실패 원인」 판은 유형마다 카드 수 · 그 유형 첫 카드의 이유 · 케이스 번호를 적고, 누르면 그 원인 카드만 남기고 다시 누르면 푼다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, { failure: { type: 'mismatch', reason: '이메일 칸이 비어 있다' } })]),
        케이스('ZZI-0002', '로그인', [장치('desktop', 2)]),
        케이스('ZZI-0003', '탈퇴', [장치('desktop', 3)]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL'), 줄(3, 'ZZI-0003', 'desktop', 'FAIL')],
      'ALL',
      () => true,
      [
        { type: 'mismatch', count: 2, tcIds: ['ZZI-0001', 'ZZI-0003'] },
        { type: 'timeout', count: 1, tcIds: ['ZZI-0002'] },
      ],
    );

    const 판 = within(await screen.findByRole('group', { name: '실패 원인' }));
    expect(판.getAllByRole('button').map((b) => b.textContent)).toEqual([
      '2기대 결과 불일치이메일 칸이 비어 있다ZZI-0001ZZI-0003',
      '1타임아웃ZZI-0002',
    ]);
    const 타임아웃 = 판.getByRole('button', { name: /타임아웃/ });
    fireEvent.click(타임아웃);

    expect(screen.queryByText('회원가입')).toBeNull();
    expect(screen.getByText('로그인')).toBeTruthy();
    expect(타임아웃.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(타임아웃);
    expect(screen.getByText('회원가입')).toBeTruthy();
    expect(타임아웃.getAttribute('aria-pressed')).toBe('false');
  });

  it('고른 유형의 카드가 다른 쪽에도 있으면 이 쪽 수와 전체 수를 같이 알린다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])], { total: 6 }),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
      'ALL',
      () => true,
      [{ type: 'mismatch', count: 4, tcIds: ['ZZI-0001', 'ZZI-0007', 'ZZI-0008', 'ZZI-0009'] }],
    );

    fireEvent.click(await screen.findByRole('button', { name: /기대 결과 불일치/ }));
    expect(screen.getByText('이 쪽에 1건 · 이 유형 전체 4건 — 나머지는 다른 쪽에 있습니다')).toBeTruthy();
  });

  it('고른 유형이 이 쪽에 없으면 「실패한 케이스가 없습니다」를 내지 않는다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])], { total: 6 }),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
      'ALL',
      () => true,
      [
        { type: 'mismatch', count: 1, tcIds: ['ZZI-0001'] },
        { type: 'timeout', count: 2, tcIds: ['ZZI-0007', 'ZZI-0008'] },
      ],
    );

    fireEvent.click(await screen.findByRole('button', { name: /타임아웃/ }));
    expect(screen.getByText('이 쪽에 0건 · 이 유형 전체 2건 — 나머지는 다른 쪽에 있습니다')).toBeTruthy();
    expect(screen.queryByText('실패한 케이스가 없습니다')).toBeNull();
  });

  it('디바이스를 거른 동안에는 「실패 원인」 판이 없다 — 카드 머리 칩과 어긋난다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('mobile', 1)])]),
      [줄(1, 'ZZI-0001', 'mobile', 'FAIL')],
      'mobile',
      () => true,
      [{ type: 'mismatch', count: 1, tcIds: ['ZZI-0001'] }],
    );

    await screen.findByText('회원가입');
    expect(screen.queryByRole('group', { name: '실패 원인' })).toBeNull();
  });
});
