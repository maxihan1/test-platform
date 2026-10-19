// @vitest-environment jsdom
// 케이스 목록 디바이스 칩 — 「Android 앱」은 그 목록 범위에 앱 케이스가 있을 때만 선다 (도메인/카탈로그 §8.1 · APP-F1-04)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { 조건칩들 } from './CaseListParts.js';

afterEach(cleanup);

describe('디바이스 칩 — 「Android 앱」은 앱 케이스가 있는 애플리케이션에만 (APP-F1-04)', () => {
  const 칩 = (앱있음: boolean, 디바이스: 'ALL' | 'android' = 'ALL') => {
    render(<조건칩들 디바이스={디바이스} 앱있음={앱있음} 활성만 결과="ALL" 건수={null} on디바이스={vi.fn()} on활성만={vi.fn()} on결과={vi.fn()} />);
    return screen.queryByRole('button', { name: 'Android 앱' });
  };

  it('앱 케이스가 없으면 칩이 없고, 있으면 선다', () => {
    expect(칩(false)).toBeNull();
    cleanup();
    expect(칩(true)).toBeTruthy();
  });

  it('주소로 android 를 고른 채 들어오면 앱 케이스가 없어도 칩이 눌린 채 선다 — 고른 것을 감추지 않는다', () => {
    expect(칩(false, 'android')?.getAttribute('aria-pressed')).toBe('true');
  });
});
