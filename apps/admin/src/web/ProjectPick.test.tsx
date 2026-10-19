// @vitest-environment jsdom
// 로그인한 직후 프로젝트 고르기 화면 검사 (SPEC 공통/5-화면공통 §8 「프로젝트 고르기」 · 2026-10-19 PRJ-F1-03)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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
const 직원포털: ServiceRow = { ...프론트, id: 3, prefix: 'HRP', name: '직원 포털', projectId: 2, projectName: '사내 포털' };

const 사람: User = { username: 'kim', displayName: '김철수', role: 'member', dashboard: 'read', mustChangePassword: false, services: [프론트, 어드민, 직원포털] };

function 그린다(마지막: ServiceRow | null, onPick: (접두사: string) => void = () => {}, onLogout: () => void = () => {}) {
  render(<ProjectPick user={사람} 마지막={마지막} onPick={onPick} onLogout={onLogout} />);
}

describe('프로젝트 고르기 화면', () => {
  it('프로젝트마다 카드가 서고 카드에 그 안의 애플리케이션 이름이 적힌다', () => {
    그린다(null);

    const 데모마켓 = screen.getByRole('button', { name: /데모마켓/ });
    expect(데모마켓.textContent).toContain('프론트 페이지');
    expect(데모마켓.textContent).toContain('백오피스 어드민');
    expect(screen.getByRole('button', { name: /사내 포털/ }).textContent).toContain('직원 포털');
  });

  it('마지막에 연 애플리케이션이 든 프로젝트에만 표시가 붙는다', () => {
    그린다(어드민);

    expect(screen.getByRole('button', { name: /데모마켓/ }).textContent).toContain('마지막에 연 프로젝트');
    expect(screen.getByRole('button', { name: /사내 포털/ }).textContent).not.toContain('마지막에 연 프로젝트');
  });

  it('마지막에 연 프로젝트를 고르면 마지막에 연 애플리케이션으로 다시 연다', () => {
    const 고름 = vi.fn();
    그린다(어드민, 고름);

    fireEvent.click(screen.getByRole('button', { name: /데모마켓/ }));

    expect(고름).toHaveBeenCalledWith('DEMOA');
  });

  it('다른 프로젝트를 고르면 그 프로젝트의 첫 애플리케이션으로 연다', () => {
    const 고름 = vi.fn();
    그린다(어드민, 고름);

    fireEvent.click(screen.getByRole('button', { name: /사내 포털/ }));

    expect(고름).toHaveBeenCalledWith('HRP');
  });

  it('여기서도 로그아웃할 수 있다', () => {
    const 나감 = vi.fn();
    그린다(null, () => {}, 나감);

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(나감).toHaveBeenCalled();
  });
});
