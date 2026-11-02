// @vitest-environment jsdom
// 사이드바 로고 아래 프로젝트 고르개 검사 (SPEC 공통/5-화면공통 §8 「껍데기」 · 2026-10-19 PRJ-F1-03 · 2026-10-30 헤더에서 옮김 · 2026-11-02 바닥에서 위로)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { 언어함 } from './i18n.js';
import { Shell } from './Shell.js';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

const 결제: ServiceRow = {
  id: 1,
  prefix: 'ZSH',
  name: '결제 애플리케이션',
  color: '#3A5FCD',
  projectId: 1,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};
const 정산: ServiceRow = { ...결제, id: 2, prefix: 'ZSI', name: '정산 애플리케이션' };
const 포털: ServiceRow = { ...결제, id: 3, prefix: 'ZSJ', name: '직원 포털', projectId: 2, projectName: '사내 포털' };
const 포털어드민: ServiceRow = { ...포털, id: 4, prefix: 'ZSK', name: '관리자 콘솔' };

function 띄운다(service: ServiceRow, 배정: ServiceRow[], onService: (접두사: string) => void = () => {}) {
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  const user: User = { username: 'zsh1', displayName: '김수민', role: 'admin', dashboard: 'read', mustChangePassword: false, services: 배정 };
  return render(
    <언어함 value="ko">
      <Shell user={user} service={service} onService={onService} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases">
        <div>본문</div>
      </Shell>
    </언어함>,
  );
}

describe('프로젝트 고르개', () => {
  it('사이드바 맨 위 줄은 Test Commander 로고 자리다 — 프로젝트 고르개는 그 아래 · 애플리케이션 머리 앞에 선다', () => {
    띄운다(결제, [결제, 정산, 포털]);

    const 맨위 = document.querySelector('.side-top')!;
    expect(맨위.querySelector('.side-logo')?.textContent).toBe('Test Commander');
    const 고르개 = screen.getByRole('combobox', { name: '프로젝트 선택' });
    expect(맨위.contains(고르개)).toBe(false);
    expect(맨위.compareDocumentPosition(고르개) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(고르개.compareDocumentPosition(document.querySelector('.side-app')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('프로젝트가 둘 이상이면 프로젝트 고르개가 서고 애플리케이션 고르개는 없다', () => {
    띄운다(결제, [결제, 정산, 포털]);

    const 고르개 = screen.getByRole('combobox', { name: '프로젝트 선택' }) as HTMLSelectElement;
    expect(고르개.value).toBe('1');
    expect([...고르개.options].map((it) => it.textContent)).toEqual(['데모마켓 · 애플리케이션 2개', '사내 포털 · 애플리케이션 1개']);
    expect(document.querySelector('.side-foot')?.contains(고르개)).toBe(false);
    expect(screen.queryByRole('combobox', { name: '애플리케이션 선택' })).toBeNull();
  });

  it('애플리케이션 줄에는 고른 프로젝트의 애플리케이션만 선다', () => {
    띄운다(포털, [결제, 정산, 포털, 포털어드민]);

    const 줄 = screen.getByRole('navigation', { name: '애플리케이션' });
    expect(within(줄).getAllByRole('button').map((it) => it.getAttribute('aria-label'))).toEqual(['직원 포털 · 웹', '관리자 콘솔 · 웹']);
  });

  it('프로젝트를 바꾸면 그 프로젝트의 첫 애플리케이션으로 열고 그것을 브라우저에 적어 둔다', () => {
    const 바꿈 = vi.fn();
    띄운다(결제, [결제, 정산, 포털], 바꿈);

    fireEvent.change(screen.getByRole('combobox', { name: '프로젝트 선택' }), { target: { value: '2' } });

    expect(바꿈).toHaveBeenCalledWith('ZSJ');
    expect(localStorage.getItem('고른서비스')).toBe('ZSJ');
  });

  it('프로젝트가 하나뿐이면 고르개 없이 이름만 적는다', () => {
    띄운다(결제, [결제, 정산]);

    expect(screen.queryByRole('combobox', { name: '프로젝트 선택' })).toBeNull();
    expect(document.querySelector('.side-proj')?.textContent).toBe('데모마켓 · 애플리케이션 2개');
  });
});
