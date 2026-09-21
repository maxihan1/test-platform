// @vitest-environment jsdom
// 화면 머리 검사 (SPEC 공통/5-화면공통 §8, 2026-09-22).
//
// 처음 지적이 「헤드와 메인이 분리가 안 돼 있다」였다. PR① 이 껍데기를 갈랐지만
// **제목은 여전히 본문 안에서 그려지고 있었다** — 껍데기에 통로를 뚫어 놓고 아무도 안 썼다.
// 그래서 여기서는 「제목이 h1 이다」와 「본문이 아니라 머리에 있다」를 둘 다 본다.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Head } from './Head.js';

afterEach(cleanup);

describe('화면 머리', () => {
  it('제목이 h1 으로 나온다', () => {
    render(<Head 제목="실행 기록" />);

    expect(screen.getByRole('heading', { level: 1, name: '실행 기록' })).toBeTruthy();
  });

  it('부제를 주면 제목 아래에 같이 나온다', () => {
    render(<Head 제목="실행 기록" 부제="최근 30일 · 실행 42회" />);

    expect(screen.getByText('최근 30일 · 실행 42회')).toBeTruthy();
  });

  it('부제가 없으면 빈 줄을 만들지 않는다', () => {
    const { container } = render(<Head 제목="설정" />);

    expect(container.querySelector('.head-meta')).toBeNull();
  });

  it('주 행동을 주면 머리 안에 선다 — 본문이 아니다', () => {
    const { container } = render(
      <Head 제목="테스트케이스 목록" 행동={<button type="button">전체 실행</button>} />,
    );

    const 머리 = container.querySelector('.head');
    expect(머리).not.toBeNull();
    expect(머리?.querySelector('button')?.textContent).toBe('전체 실행');
  });

  it('행동이 없으면 그 자리를 만들지 않는다', () => {
    const { container } = render(<Head 제목="설정" />);

    expect(container.querySelector('.head-acts')).toBeNull();
  });
});
