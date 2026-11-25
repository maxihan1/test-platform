// @vitest-environment jsdom
// 로그인한 직후 프로젝트 고르기 화면 검사 (SPEC 공통/5-화면공통 §8 「프로젝트 고르기」 · 2026-10-19 PRJ-F1-03 · 2026-11-24 시안 A안)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { ServiceRow, User } from './api.js';
import { ProjectPick } from './ProjectPick.js';

afterEach(cleanup);

const 프론트: ServiceRow = {
  id: 1,
  prefix: 'DEMO',
  name: '프론트 페이지',
  color: '#667788',
  projectId: 1,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'read', authoring: 'read' },
};
const 어드민: ServiceRow = { ...프론트, id: 2, prefix: 'DEMOA', name: '백오피스 어드민' };
const 쇼핑앱: ServiceRow = { ...프론트, id: 4, prefix: 'DEMOP', name: '쇼핑 앱', kind: 'APP' };
const 직원포털: ServiceRow = { ...프론트, id: 3, prefix: 'HRP', name: '직원 포털', projectId: 2, projectName: '사내 포털' };

const 사람: User = { username: 'kim', displayName: '김철수', role: 'member', dashboard: 'read', mustChangePassword: false, services: [프론트, 어드민, 쇼핑앱, 직원포털] };

function 그린다(마지막: ServiceRow | null, onPick: (접두사: string) => void = () => {}, onLogout: () => void = () => {}, user: User = 사람) {
  render(<ProjectPick user={user} 마지막={마지막} onPick={onPick} onLogout={onLogout} />);
}

/** 프로젝트를 여럿 가진 사람 — 다른 프로젝트가 많을 때만 검색 칸이 선다 */
function 여럿인사람(수: number): User {
  const 앱들: ServiceRow[] = Array.from({ length: 수 }, (_, i) => ({ ...프론트, id: 100 + i, prefix: `P${i}`, name: `앱 ${i}`, projectId: 100 + i, projectName: `프로젝트 ${i}` }));
  return { ...사람, services: [...앱들, 직원포털] };
}

describe('프로젝트 고르기 화면', () => {
  it('맨 위 줄에 본 화면과 같은 제품 로고가 선다', () => {
    그린다(null);

    expect(document.querySelector('.pp-top .side-logo')?.textContent).toBe('Test Commander');
  });

  it('최근 연 애플리케이션이 없으면 큰 카드 없이 프로젝트마다 카드가 서고 카드에 애플리케이션 이름이 적힌다', () => {
    그린다(null);

    expect(screen.queryByRole('region', { name: '최근 프로젝트' })).toBeNull();
    const 데모마켓 = screen.getByRole('button', { name: /데모마켓/ });
    expect(데모마켓.textContent).toContain('프론트 페이지');
    expect(데모마켓.textContent).toContain('백오피스 어드민');
    expect(screen.getByRole('button', { name: /사내 포털/ }).textContent).toContain('직원 포털');
  });

  it('카드에 애플리케이션 수와 종류별 수가 붙는다', () => {
    그린다(null);

    const 데모마켓 = screen.getByRole('button', { name: /데모마켓/ });
    expect(데모마켓.textContent).toContain('애플리케이션 3개');
    expect(데모마켓.textContent).toContain('웹 2');
    expect(데모마켓.textContent).toContain('Android 앱 1');
  });

  it('최근 연 애플리케이션이 든 프로젝트는 「최근 프로젝트」로 맨 위에 서고 아래 카드에서는 빠진다', () => {
    그린다(어드민);

    const 최근 = screen.getByRole('region', { name: '최근 프로젝트' });
    expect(최근.textContent).toContain('데모마켓');
    const 다른 = screen.getByRole('region', { name: '다른 프로젝트' });
    expect(within(다른).queryByRole('button', { name: /데모마켓/ })).toBeNull();
    expect(within(다른).getByRole('button', { name: /사내 포털/ })).toBeTruthy();
  });

  it('「이어서 열기」를 누르면 최근 연 애플리케이션으로 다시 연다', () => {
    const 고름 = vi.fn();
    그린다(어드민, 고름);

    fireEvent.click(screen.getByRole('button', { name: /백오피스 어드민 이어서 열기/ }));

    expect(고름).toHaveBeenCalledWith('DEMOA');
  });

  it('최근 프로젝트 안의 다른 애플리케이션을 누르면 그 애플리케이션으로 바로 연다', () => {
    const 고름 = vi.fn();
    그린다(어드민, 고름);

    const 최근 = screen.getByRole('region', { name: '최근 프로젝트' });
    fireEvent.click(within(최근).getByRole('button', { name: /쇼핑 앱/ }));

    expect(고름).toHaveBeenCalledWith('DEMOP');
  });

  it('다른 프로젝트를 고르면 그 프로젝트의 첫 애플리케이션으로 연다', () => {
    const 고름 = vi.fn();
    그린다(어드민, 고름);

    fireEvent.click(screen.getByRole('button', { name: /사내 포털/ }));

    expect(고름).toHaveBeenCalledWith('HRP');
  });

  it('다른 프로젝트에 대표 애플리케이션이 있으면 그 앱으로 연다', () => {
    const 고름 = vi.fn();
    const 대표있음: User = { ...사람, services: [프론트, { ...어드민, primary: true }, 직원포털] };
    그린다(직원포털, 고름, () => {}, 대표있음);

    const 카드 = screen.getByRole('button', { name: /데모마켓/ });
    expect(카드.textContent!.indexOf('백오피스 어드민')).toBeLessThan(카드.textContent!.indexOf('프론트 페이지'));
    fireEvent.click(카드);

    expect(고름).toHaveBeenCalledWith('DEMOA');
  });

  it('다른 프로젝트가 여섯이면 아직 검색 칸을 달지 않는다', () => {
    그린다(null, () => {}, () => {}, 여럿인사람(5));

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('프로젝트 6');

    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('다른 프로젝트가 많으면 검색 칸이 서고 프로젝트 이름이나 애플리케이션 이름으로 좁힌다', () => {
    그린다(null, () => {}, () => {}, 여럿인사람(7));

    const 검색 = screen.getByRole('searchbox', { name: '프로젝트 · 애플리케이션 이름 검색' });
    fireEvent.change(검색, { target: { value: '사내' } });
    expect(screen.getAllByRole('button', { name: /사내 포털|프로젝트 \d/ }).map((카드) => 카드.textContent)).toEqual([expect.stringContaining('사내 포털')]);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('프로젝트 1');

    fireEvent.change(검색, { target: { value: '앱 3' } });
    expect(screen.getByRole('button', { name: /프로젝트 3/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /사내 포털/ })).toBeNull();

    fireEvent.change(검색, { target: { value: '없는 이름' } });
    expect(screen.getByText('검색 결과가 없습니다')).toBeTruthy();
  });

  it('여기서도 로그아웃할 수 있다', () => {
    const 나감 = vi.fn();
    그린다(null, () => {}, 나감);

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(나감).toHaveBeenCalled();
  });
});
