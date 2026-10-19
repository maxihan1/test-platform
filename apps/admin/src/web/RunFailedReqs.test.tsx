// @vitest-environment jsdom
// 카드의 관련 요구사항 줄 검사 — 번호 고리 · 요약 띠 아래 칸이 없다 (도메인/리포팅 「실패 요구사항」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { 관련요구줄 } from './RunFailedReqs.js';
import { 견줌, 섞인항목, 연다 } from './RunResultAssemble.fixture.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const 모두: 판정 = () => true;
const 읽기없음: 판정 = (무엇) => 무엇 !== '작성보기';

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

  it('작성 읽기가 없으면 번호를 고리 없이 글자로 둔다', () => {
    render(<관련요구줄 reqs={[{ reqId: 'R-1', text: '첫 요구' }]} 권한={읽기없음} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('R-1')).toBeDefined();
  });
});

describe('요약 띠 아래 실패 요구사항 칸', () => {
  it('결과 화면에 칸이 없다 — 카드의 관련 요구사항과 같은 내용이었다', async () => {
    연다(섞인항목, 견줌);
    await screen.findAllByRole('article');

    expect(document.querySelector('.fr')).toBeNull();
    expect(screen.queryByText(/실패 요구사항/)).toBeNull();
  });
});
