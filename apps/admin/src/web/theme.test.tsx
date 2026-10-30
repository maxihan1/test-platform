// @vitest-environment jsdom
// 밝게 · 어둡게 — 처음에는 컴퓨터 설정을 따르고, 고르면 브라우저에 남는다 (DESIGN.md 「두 벌 토큰」)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { 고른밝기를건다, 밝기단추 } from './theme.js';

function 컴퓨터설정(어둡나: boolean) {
  vi.stubGlobal('matchMedia', (질의: string) => ({
    matches: 질의 === '(prefers-color-scheme: dark)' && 어둡나,
    media: 질의,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('밝게 · 어둡게', () => {
  it('고른 것이 없으면 html 에 아무것도 달지 않아 컴퓨터 설정을 따른다', () => {
    고른밝기를건다();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('전에 고른 것이 있으면 첫 그리기 전에 그 벌을 건다', () => {
    localStorage.setItem('theme', 'dark');
    고른밝기를건다();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('컴퓨터가 어두운 모드면 단추는 해(밝게 보기)이고, 누르면 밝게로 바뀌어 남는다', () => {
    컴퓨터설정(true);
    render(<밝기단추 />);

    fireEvent.click(screen.getByRole('button', { name: '밝게 보기' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(screen.getByRole('button', { name: '어둡게 보기' })).toBeTruthy();
  });

  it('고른 것이 컴퓨터 설정을 이긴다', () => {
    컴퓨터설정(false);
    localStorage.setItem('theme', 'dark');
    render(<밝기단추 />);
    expect(screen.getByRole('button', { name: '밝게 보기' })).toBeTruthy();
  });
});
