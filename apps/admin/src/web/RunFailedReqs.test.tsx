// @vitest-environment jsdom
// 실패 요구사항 칸 · 카드의 관련 요구사항 줄 검사 — 5줄 접기 · 번호 고리 · 놓이는 자리 (도메인/리포팅 「실패 요구사항」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { 실패요구 } from './api.js';
import { 관련요구줄, RunFailedReqs } from './RunFailedReqs.js';
import { 앞선가, 견줌, 섞인항목, 연다 } from './RunResultAssemble.fixture.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const 모두: 판정 = () => true;
const 읽기없음: 판정 = (무엇) => 무엇 !== '작성보기';

const 요구 = (n: number, text: string | null = `요구 문장 ${String(n)}`, 케이스수 = 1): 실패요구 => ({
  reqId: `R-${String(n)}`,
  text,
  tcIds: Array.from({ length: 케이스수 }, (_, i) => `ZRR-00${String(i + 1)}`),
});

describe('실패 요구사항 칸', () => {
  it('요구가 없으면 칸을 그리지 않는다', () => {
    const { container } = render(<RunFailedReqs 요구들={[]} 권한={모두} />);

    expect(container.innerHTML).toBe('');
  });

  it('머리에 건수를 적고 줄마다 번호 · 문장 · 실패 케이스 수를 보인다', () => {
    render(<RunFailedReqs 요구들={[요구(1, '비밀번호는 8자 이상이다', 2), 요구(2, null)]} 권한={모두} />);

    expect(screen.getByRole('heading').textContent).toContain('실패 요구사항 2건');
    const 첫줄 = within(screen.getByText('비밀번호는 8자 이상이다').closest('li')!);
    expect(첫줄.getByText('R-1')).toBeDefined();
    expect(첫줄.getByText('실패 케이스 2')).toBeDefined();
    expect(screen.getByText('PRD 에 없는 번호')).toBeDefined();
  });

  it('5줄을 넘으면 접고 「N건 더 보기」로 편다', () => {
    render(<RunFailedReqs 요구들={[1, 2, 3, 4, 5, 6, 7].map((n) => 요구(n))} 권한={모두} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: '2건 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.queryByRole('button', { name: '2건 더 보기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('5줄까지는 더 보기 버튼이 없다', () => {
    render(<RunFailedReqs 요구들={[1, 2, 3, 4, 5].map((n) => 요구(n))} 권한={모두} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('번호는 작성 읽기가 있고 판에 있는 번호일 때만 PRD 관리로 가는 고리다', () => {
    const { rerender } = render(<RunFailedReqs 요구들={[요구(1), 요구(2, null)]} 권한={모두} />);

    expect(screen.getByRole('link', { name: 'R-1' }).getAttribute('href')).toBe('#/prd/R-1');
    expect(screen.queryByRole('link', { name: 'R-2' })).toBeNull();
    expect(screen.getByText('R-2')).toBeDefined();

    rerender(<RunFailedReqs 요구들={[요구(1)]} 권한={읽기없음} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('R-1')).toBeDefined();
  });

  it('요약 띠 바로 아래 · 실패 카드 위에 선다', async () => {
    연다(섞인항목, { ...견줌, 실패요구들: [요구(1)] });
    await screen.findByText('요구 문장 1');

    const 띠 = document.querySelector('.rs');
    const 칸 = document.querySelector('.fr');
    expect(앞선가(띠, 칸)).toBe(true);
    await screen.findAllByRole('article');
    expect(앞선가(칸, document.querySelector('.fc-list'))).toBe(true);
  });

  it('견줌에 실패요구들이 없으면 칸이 없다', async () => {
    연다(섞인항목, 견줌);
    await screen.findAllByRole('article');

    expect(document.querySelector('.fr')).toBeNull();
  });
});

describe('카드의 관련 요구사항 줄', () => {
  it('번호 · 문장을 적고 판에 없는 번호는 안내 글을 쓴다', () => {
    render(<관련요구줄 reqs={[{ reqId: 'R-1', text: '첫 요구' }, { reqId: 'OLD-9', text: null }]} 권한={모두} />);

    expect(screen.getByText('관련 요구사항')).toBeDefined();
    expect(screen.getByRole('link', { name: 'R-1' }).getAttribute('href')).toBe('#/prd/R-1');
    expect(screen.getByText('첫 요구')).toBeDefined();
    expect(screen.getByText('PRD 에 없는 번호')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'OLD-9' })).toBeNull();
  });

  it('덮는 요구가 없으면 줄을 그리지 않는다', () => {
    const { container } = render(<관련요구줄 reqs={[]} 권한={모두} />);

    expect(container.innerHTML).toBe('');
  });
});
