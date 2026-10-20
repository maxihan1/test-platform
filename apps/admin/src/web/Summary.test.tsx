// @vitest-environment jsdom
// 띠 · 흐름 막대가 색 말고 글자로도 말하는지 본다 (DESIGN.md 접근성).
// 색만으로 판정을 말하면 색을 못 보는 사람에게는 회색 네모가 된다.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { 언어함 } from './i18n.js';
import { 판정흐름 } from './Summary.js';

afterEach(cleanup);

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

  it('개수는 판정마다 따로 서고 가운뎃점이 없다 — 60px 디바이스 칸 안에서 한 줄에 하나', () => {
    const { container } = render(<판정흐름 recent={['PASS', 'PASS', 'FAIL', 'PASS']} />);

    const 줄들 = [...container.querySelectorAll('.sparktext b')].map((el) => el.textContent);
    expect(줄들).toEqual(['통과 3', '실패 1']);
    expect(container.querySelector('.sparktext')?.textContent).not.toContain('·');
  });

  it('영어 화면이면 개수 글자도 영어다', () => {
    const { container } = render(
      <언어함 value="en">
        <판정흐름 recent={['PASS', 'NA']} />
      </언어함>,
    );

    const 줄들 = [...container.querySelectorAll('.sparktext b')].map((el) => el.textContent);
    expect(줄들).toEqual(['Passed 1', 'Not run 1']);
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

describe('판정흐름의 막대 이름 (실행 §8.3 · DESIGN.md 접근성)', () => {
  it('앞말을 주면 막대가 그림 하나이고 이름이 앞말 · 회수 · 판정 차례를 읽어 준다', () => {
    render(<판정흐름 recent={['FAIL', 'FAIL', 'PASS']} 앞말="qa 서버 · 이 실행까지" />);

    expect(
      screen.getByRole('img', { name: 'qa 서버 · 이 실행까지 최근 3회, 맨 앞이 이번 실행: 실패, 실패, 통과' }),
    ).toBeTruthy();
    expect(screen.queryByText('맨 앞이 이번 실행')).toBeNull();
  });

  it('앞말이 없으면 케이스 목록 그대로 막대를 화면 읽기에서 숨긴다', () => {
    const { container } = render(<판정흐름 recent={['PASS', 'FAIL']} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('.spark')?.getAttribute('aria-hidden')).toBe('true');
  });
});
