// @vitest-environment jsdom
// 실행 위치 안내 검사 (SPEC §8.2) — 앱 정식 실행은 늘 디바이스 팜이라 고르개가 아니라 한 줄이다

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RunLocation } from './RunLocation.js';

afterEach(() => {
  cleanup();
});

describe('RunLocation', () => {
  it('Android 앱이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<RunLocation android={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('Android 앱이 있으면 「실행 위치 · Device VISION」 한 줄이다', () => {
    render(<RunLocation android />);

    expect(screen.getByText('실행 위치 · Device VISION')).toBeTruthy();
  });

  it('고르개가 아니다 — 라디오가 없고 「로컬」도 「준비 중」도 없다', () => {
    render(<RunLocation android />);

    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(/로컬/)).toBeNull();
    expect(screen.queryByText('준비 중')).toBeNull();
  });
});
