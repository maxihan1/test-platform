// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { FlashNotice } from './FlashNotice.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('잠깐 보이는 확인 · 안내 한 줄', () => {
  it('받은 글이 상태 줄로 보이고 5초 뒤 스스로 거둔다', () => {
    const 거둠 = vi.fn();
    render(<FlashNotice 글="비밀번호를 변경했습니다" onGone={거둠} />);

    expect(screen.getByRole('status').textContent).toBe('비밀번호를 변경했습니다');
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(거둠).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(거둠).toHaveBeenCalledTimes(1);
  });
});
