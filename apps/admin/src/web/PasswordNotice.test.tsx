// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { PasswordNotice } from './PasswordNotice.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('비밀번호를 바꾼 뒤 확인 한 줄', () => {
  it('바꿨다는 말이 상태 줄로 보이고 5초 뒤 스스로 거둔다', () => {
    const 거둠 = vi.fn();
    render(<PasswordNotice onGone={거둠} />);

    expect(screen.getByRole('status').textContent).toBe('비밀번호를 바꿨습니다');
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
