// @vitest-environment jsdom
// 화면 머리 검사 (SPEC 공통/5-화면공통 §8, 2026-09-22).
//
// 처음 지적이 「헤드와 메인이 분리가 안 돼 있다」였다. PR① 이 껍데기를 갈랐지만
// **제목은 여전히 본문 안에서 그려지고 있었다** — 껍데기에 통로를 뚫어 놓고 아무도 안 썼다.
// 그래서 여기서는 「제목이 h1 이다」와 「본문이 아니라 머리에 있다」를 둘 다 본다.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import type { ServiceRow } from './api.js';
import { Head, 지금앱칸 } from './Head.js';

afterEach(cleanup);

describe('화면 머리', () => {
  it('제목이 h1 으로 나온다', () => {
    render(<Head 제목="실행 기록" />);

    expect(screen.getByRole('heading', { level: 1, name: '실행 기록' })).toBeTruthy();
  });

  it('하위 메뉴 화면은 제목 앞에 묶음 이름이 서서 지금 위치가 보인다', () => {
    render(<Head 제목="기능 테스트" 위치="테스트 스크립트" />);

    expect(screen.getByRole('heading', { level: 1, name: '테스트 스크립트 › 기능 테스트' })).toBeTruthy();
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
      <Head 제목="테스트 스크립트 목록" 행동={<button type="button">전체 실행</button>} />,
    );

    const 머리 = container.querySelector('.head');
    expect(머리).not.toBeNull();
    expect(머리?.querySelector('button')?.textContent).toBe('전체 실행');
  });

  it('행동이 없으면 그 자리를 만들지 않는다', () => {
    const { container } = render(<Head 제목="설정" />);

    expect(container.querySelector('.head-acts')).toBeNull();
  });

  it('껍데기가 지금 애플리케이션을 넣으면 위치 줄 맨 앞에 그 이름이 선다', () => {
    const 앱 = { id: 1, prefix: 'ZHD', name: '데모마켓 앱' } as ServiceRow;
    render(
      <지금앱칸.Provider value={앱}>
        <Head 제목="기능 테스트" 위치="테스트 스크립트" />
      </지금앱칸.Provider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: '데모마켓 앱 › 테스트 스크립트 › 기능 테스트' })).toBeTruthy();
  });

  it('위치가 없는 화면도 애플리케이션 이름이 제목 앞에 선다', () => {
    const 앱 = { id: 1, prefix: 'ZHD', name: '데모마켓 앱' } as ServiceRow;
    render(
      <지금앱칸.Provider value={앱}>
        <Head 제목="요구사항" />
      </지금앱칸.Provider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: '데모마켓 앱 › 요구사항' })).toBeTruthy();
  });

  it('칸이 비어 있으면(대시보드 · 껍데기 밖) 예전 그대로다', () => {
    render(
      <지금앱칸.Provider value={null}>
        <Head 제목="기능 테스트" 위치="테스트 스크립트" />
      </지금앱칸.Provider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: '테스트 스크립트 › 기능 테스트' })).toBeTruthy();
  });
});
