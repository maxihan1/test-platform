// @vitest-environment jsdom
// 사이드바 찾기 칸 — ⌘K 로 열고 메뉴 이름과 고른 애플리케이션의 케이스를 찾는다 (SPEC 공통/5-화면공통 §8 「껍데기」 찾기 칸)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CasePage } from './api.js';
import { 언어함 } from './i18n.js';
import type { 자리 } from './layout.js';
import { 메뉴찾기, 찾기칸 } from './ShellFind.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

const 자리들: 자리[] = [
  { 이름: '대시보드', 해시: '#/dashboard', 아이콘: 'dashboard' },
  {
    이름: '실행 기록',
    해시: '#/runs',
    아이콘: 'runs',
    하위: [{ 이름: 'UI 테스트', 해시: '#/runs/ui', 라벨: '실행 기록 · UI 테스트' }],
  },
  { 이름: '그래프(Grafana)', 해시: '/grafana/', 아이콘: 'graph', 바깥: true },
];

const 쪽 = (tcIds: string[]): CasePage => ({
  items: tcIds.map((tcId) => ({ tcId, name: `${tcId} 이름` }) as CasePage['items'][number]),
  total: tcIds.length,
  page: 1,
  pageSize: 50,
});

function 띄운다(케이스볼수있나 = true) {
  return render(
    <언어함 value="ko">
      <찾기칸 자리들={자리들} prefix="ZSH" 케이스볼수있나={케이스볼수있나} />
    </언어함>,
  );
}

describe('메뉴찾기', () => {
  it('하위는 「묶음 · 하위」 이름으로 찾고 바깥으로 여는 자리는 뺀다', () => {
    expect(메뉴찾기(자리들, 'ui')).toEqual([{ 이름: '실행 기록 · UI 테스트', 해시: '#/runs/ui' }]);
    expect(메뉴찾기(자리들, '실행').map((it) => it.해시)).toEqual(['#/runs', '#/runs/ui']);
    expect(메뉴찾기(자리들, 'grafana')).toEqual([]);
    expect(메뉴찾기(자리들, '  ')).toEqual([]);
  });
});

describe('찾기 창', () => {
  it('⌘K 로 열리고 메뉴를 고르면 그 자리로 간다', () => {
    vi.spyOn(api, 'cases').mockResolvedValue(쪽([]));
    띄운다();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const 칸 = screen.getByRole('searchbox', { name: '찾을 말' });
    fireEvent.change(칸, { target: { value: '대시' } });
    fireEvent.keyDown(칸, { key: 'Enter' });
    expect(window.location.hash).toBe('#/dashboard');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('케이스는 케이스 목록 검색(q)으로 찾고 고르면 그 케이스 상세를 편 목록으로 간다', async () => {
    const 찾기 = vi.spyOn(api, 'cases').mockResolvedValue(쪽(['ZSH-FN-001']));
    띄운다();
    fireEvent.click(screen.getByRole('button', { name: '찾기' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '찾을 말' }), { target: { value: 'ZSH-FN' } });

    fireEvent.click(await screen.findByText('ZSH-FN-001 이름'));
    expect(찾기).toHaveBeenCalledWith({ service: 'ZSH', q: 'ZSH-FN' });
    expect(찾기).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/cases/fn?q=ZSH-FN-001&case=ZSH-FN-001');
  });

  it('케이스를 못 보는 사람은 메뉴만 찾는다 — 케이스 검색을 부르지 않는다', async () => {
    const 찾기 = vi.spyOn(api, 'cases').mockResolvedValue(쪽(['ZSH-FN-001']));
    띄운다(false);
    fireEvent.click(screen.getByRole('button', { name: '찾기' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '찾을 말' }), { target: { value: 'ZSH' } });

    expect(await screen.findByText('찾은 것이 없습니다')).toBeTruthy();
    await new Promise((끝) => setTimeout(끝, 250));
    expect(찾기).not.toHaveBeenCalled();
  });

  it('케이스 검색이 실패하면 그 사유를 보인다 — 「찾은 것이 없다」로 삼키지 않는다', async () => {
    vi.spyOn(api, 'cases').mockRejectedValue(new Error('끊김'));
    띄운다();
    fireEvent.click(screen.getByRole('button', { name: '찾기' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '찾을 말' }), { target: { value: 'ZSH' } });

    await waitFor(() => expect(document.querySelector('.find-error')?.textContent).toContain('끊김'));
  });
});
