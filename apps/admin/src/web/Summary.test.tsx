// @vitest-environment jsdom
// 집계 띠가 색 말고 글자로도 말하는지 본다 (DESIGN.md 접근성).
// 색만으로 판정을 말하면 색을 못 보는 사람에게는 회색 네모가 된다.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { 집계띠, 판정흐름, 칸띠 } from './Summary.js';

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
  it('판정마다 다른 높이 클래스를 쓴다 — 색만으로 말하지 않는다', () => {
    const { container } = render(<판정흐름 recent={['PASS', 'FAIL', 'NA']} />);

    const 칸들 = [...container.querySelectorAll('.spark i')].map((el) => el.className);
    expect(칸들.slice(0, 3)).toEqual(['p', 'f', 'n']);
  });

  it('막대 옆에 판정 개수를 글자로 같이 적는다', () => {
    const { container } = render(<판정흐름 recent={['PASS', 'PASS', 'FAIL', 'PASS']} />);

    const 글 = container.querySelector('.sparktext')?.textContent ?? '';
    expect(글).toContain('통과 3');
    expect(글).toContain('실패 1');
  });

  it('다섯 번에 못 미치면 남는 자리를 빈 칸으로 채워 길이를 지킨다', () => {
    const { container } = render(<판정흐름 recent={['PASS', 'FAIL']} />);

    const 칸들 = [...container.querySelectorAll('.spark i')].map((el) => el.className);
    expect(칸들).toHaveLength(5);
    expect(칸들).toEqual(['p', 'f', 'e', 'e', 'e']);
  });

  it('한 번도 안 돌린 케이스에는 아예 안 그린다', () => {
    const { container } = render(<판정흐름 recent={[]} />);

    expect(container.querySelector('.spark')).toBeNull();
  });
});

describe('칸띠 — 판정이 아닌 집계도 같은 띠로 그린다', () => {
  it('판정을 안 준 칸에는 판정 색이 붙지 않는다', () => {
    const { container } = render(
      <칸띠
        칸들={[
          { 라벨: '실행 횟수', 값: '42' },
          { 라벨: '모두 통과', 값: '31', 판정: 'PASS' },
        ]}
      />,
    );

    const 칸 = [...container.querySelectorAll('.stat')];
    // 판정 색 클래스(p·f·n)는 판정을 준 칸에만 붙는다 (DESIGN.md 원칙 1)
    expect(칸[0]?.className).toBe('stat');
    expect(칸[1]?.className).toBe('stat p');
  });

  it('숫자와 글자 라벨을 같이 낸다', () => {
    render(<칸띠 칸들={[{ 라벨: '평균 소요', 값: '11분 24초', 부제: '끝난 41회 기준' }]} />);

    expect(screen.getByText('평균 소요')).toBeTruthy();
    expect(screen.getByText('11분 24초')).toBeTruthy();
    expect(screen.getByText('끝난 41회 기준')).toBeTruthy();
  });

  it('비율 막대는 판정 칸이 있을 때만 그린다', () => {
    const { container } = render(<칸띠 칸들={[{ 라벨: '실행 횟수', 값: '42' }]} />);

    expect(container.querySelector('.ratio')).toBeNull();
  });
});
