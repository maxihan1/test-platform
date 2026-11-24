// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';

import { 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCard.fixture.js';

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
});
