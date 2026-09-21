// @vitest-environment jsdom
// 집계 띠와 판정 흐름이 색 말고 글자로도 말하는지 본다 (DESIGN.md 접근성).
// 색만으로 판정을 말하면 색을 못 보는 사람에게는 회색 네모 다섯이 된다.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { 집계띠, 판정흐름 } from './Summary.js';

afterEach(cleanup);

describe('집계띠', () => {
  it('숫자와 글자 라벨을 같이 낸다', () => {
    render(<집계띠 전체={40} 통과={28} 실패={7} 미실행={5} />);

    expect(screen.getByText('통과')).toBeTruthy();
    expect(screen.getByText('28')).toBeTruthy();
    expect(screen.getByText('실패')).toBeTruthy();
    expect(screen.getByText('미실행')).toBeTruthy();
  });

  it('전체가 0 이면 비율 막대를 그리지 않는다', () => {
    const { container } = render(<집계띠 전체={0} 통과={0} 실패={0} 미실행={0} />);

    expect(container.querySelector('.ratio')).toBeNull();
  });
});

describe('판정흐름', () => {
  it('네모 옆에 글자를 낸다', () => {
    const { container } = render(<판정흐름 최근={['PASS', 'PASS', 'FAIL', 'PASS', 'PASS']} />);

    expect(container.querySelector('.sparktext')?.textContent).toBe('통과 4 · 실패 1');
  });

  it('네모 묶음은 보조라서 읽어주지 않는다', () => {
    const { container } = render(<판정흐름 최근={['PASS', 'FAIL']} />);

    expect(container.querySelector('.spark')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('최근이 비면 돌린 적 없음이 뜬다', () => {
    render(<판정흐름 최근={[]} />);

    expect(screen.getByText('돌린 적 없음')).toBeTruthy();
  });
});
