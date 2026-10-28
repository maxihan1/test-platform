// @vitest-environment jsdom
// 휴대폰 껍데기 검사 — 위 줄 · 아래 탭 셋 · 실행 기록 하위 줄 · PC 전용 안내 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { 언어함 } from './i18n.js';
import { 휴대폰자리인가 } from './phone.js';
import { Shell } from './Shell.js';

const 결제: ServiceRow = {
  id: 1,
  prefix: 'ZPH',
  name: '결제 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = {
  username: 'zph1',
  displayName: '김수민',
  role: 'admin',
  dashboard: 'read',
  mustChangePassword: false,
  services: [결제],
};

const 나가기 = vi.fn();

beforeEach(() => {
  localStorage.clear();
  나가기.mockClear();
  vi.stubGlobal('matchMedia', (질의: string) => ({ matches: true, media: 질의, addEventListener: () => {}, removeEventListener: () => {} }));
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'clipboard');
});

function 껍데기(current: string, user: User = 사람, 주소?: string) {
  return (
    <언어함 value="ko">
      <Shell user={user} service={결제} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={나가기} current={current} 주소={주소}>
        <div>본문</div>
      </Shell>
    </언어함>
  );
}

const 띄운다 = (current: string, user: User = 사람, 주소?: string) => render(껍데기(current, user, 주소));

const 탭 = () => screen.getByRole('navigation', { name: '휴대폰 메뉴' });

describe('휴대폰 껍데기', () => {
  it('사이드바 대신 아래 탭 셋 — 대시보드 · 실행 기록 · 알림', async () => {
    띄운다('#/runs/fn');
    expect(document.querySelector('.side')).toBeNull();
    expect(within(탭()).getByRole('link', { name: '대시보드' }).getAttribute('href')).toBe('#/dashboard');
    expect(within(탭()).getByRole('link', { name: '실행 기록' }).getAttribute('aria-current')).toBe('page');
    // 「알림」은 Notice 가 탭 자리에 그린 버튼이다 — 자리가 붙은 다음 그림에 나온다
    expect(await within(탭()).findByRole('button', { name: /알림/ })).toBeTruthy();
    // 케이스 · 작성 · 시나리오 · 설정은 메뉴에 없다
    expect(within(탭()).queryByRole('link', { name: '테스트 스크립트' })).toBeNull();
    expect(within(탭()).queryByRole('link', { name: '설정' })).toBeNull();
  });

  it('알림 탭을 누르면 알림 서랍이 열린다', async () => {
    띄운다('#/runs/fn');
    const 알림 = await within(탭()).findByRole('button', { name: /알림/ });
    fireEvent.click(알림);
    expect(알림.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByRole('complementary', { name: '알림' })).toBeTruthy();
  });

  it('실행 기록 목록이면 하위 고르개 줄이 있고, 실행 결과에서는 없다', () => {
    띄운다('#/runs/ui');
    const 하위 = screen.getByRole('navigation', { name: '실행 기록' });
    expect(within(하위).getByRole('link', { name: '실행 기록 · UI 테스트' }).getAttribute('aria-current')).toBe('page');
    expect(within(하위).getByRole('link', { name: '실행 기록 · E2E' }).getAttribute('href')).toBe('#/runs/e2e');
    cleanup();

    띄운다('#/runs');
    expect(screen.queryByRole('navigation', { name: '실행 기록' })).toBeNull();
    // 실행 결과도 실행 기록 탭이 지금 자리다
    expect(within(탭()).getByRole('link', { name: '실행 기록' }).getAttribute('aria-current')).toBe('page');
  });

  it('대시보드에서는 애플리케이션 고르개를 숨긴다 — PC 사이드바와 같다', () => {
    띄운다('#/dashboard');
    expect(screen.queryByLabelText('애플리케이션 선택')).toBeNull();
    cleanup();
    띄운다('#/runs/fn');
    expect(screen.getByLabelText('애플리케이션 선택')).toBeTruthy();
  });

  it('사람 버튼 안에 언어 · 비밀번호 변경 · 로그아웃이 있다', () => {
    띄운다('#/runs/fn');
    expect(screen.getByLabelText('내 메뉴')).toBeTruthy();
    expect(screen.getByText('김수민')).toBeTruthy();
    expect(screen.getByLabelText('언어')).toBeTruthy();
    expect(screen.getByRole('link', { name: '비밀번호 변경' }).getAttribute('href')).toBe('#/password');
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(나가기).toHaveBeenCalledOnce();
  });

  it('사람 메뉴는 바깥을 누르거나 Esc 로 닫힌다 — 펼친 채 실패 카드를 덮지 않는다', () => {
    띄운다('#/runs/fn');
    const 메뉴 = document.querySelector('details.ph-me') as HTMLDetailsElement;
    메뉴.open = true;
    fireEvent.pointerDown(screen.getByText('본문'));
    expect(메뉴.open).toBe(false);
    메뉴.open = true;
    fireEvent.pointerDown(screen.getByText('김수민'));
    expect(메뉴.open).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(메뉴.open).toBe(false);
  });

  it('API 애플리케이션은 실행 기록 묶음이 없어도 실행 기록 탭이 기능 테스트 실행 기록으로 간다', () => {
    const API = { ...결제, kind: 'API' as const };
    render(
      <언어함 value="ko">
        <Shell user={{ ...사람, role: 'member', services: [API] }} service={API} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={나가기} current="#/runs/fn">
          <div>본문</div>
        </Shell>
      </언어함>,
    );
    const 링크 = within(탭()).getByRole('link', { name: '실행 기록' });
    expect(링크.getAttribute('href')).toBe('#/runs/fn');
    expect(링크.getAttribute('aria-current')).toBe('page');
  });

  it('실행 칸이 없는 애플리케이션만 배정됐으면 실행 기록 탭이 없다', () => {
    // admin 은 모든 칸을 본다 — 칸으로 가르는 사람은 일반 등급이다
    띄운다('#/dashboard', { ...사람, role: 'member', services: [{ ...결제, permissions: { ...결제.permissions, runs: 'none' } }] });
    expect(within(탭()).queryByRole('link', { name: '실행 기록' })).toBeNull();
  });
});

describe('PC 전용 화면 안내', () => {
  it('작성 주소로 오면 본문 대신 안내를 그리고 실행 기록으로 가는 길을 둔다', () => {
    띄운다('#/authoring');
    expect(screen.queryByText('본문')).toBeNull();
    expect(screen.getByRole('heading', { name: '「테스트 작성」 화면은 PC 에서 엽니다' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '실행 기록으로' }).getAttribute('href')).toBe('#/runs');
  });

  it('케이스 목록 하위 주소도 묶음 이름으로 안내한다', () => {
    띄운다('#/cases/fn');
    expect(screen.getByRole('heading', { name: '「테스트 스크립트」 화면은 PC 에서 엽니다' })).toBeTruthy();
  });

  it('주소를 복사하면 그 사실을 적는다', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    띄운다('#/prd');
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));
    expect(await screen.findByRole('button', { name: '주소를 복사했습니다' })).toBeTruthy();
  });

  it('다른 PC 전용 주소로 옮기면 「복사했습니다」가 남지 않는다 — 그 주소는 복사하지 않았다', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    const { rerender } = 띄운다('#/prd');
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));
    expect(await screen.findByRole('button', { name: '주소를 복사했습니다' })).toBeTruthy();
    rerender(껍데기('#/settings'));
    expect(screen.getByRole('button', { name: '주소 복사' })).toBeTruthy();
  });

  it('http 로 열어 클립보드가 없으면 못 했다고 적는다 — 조용히 넘어가지 않는다', async () => {
    띄운다('#/settings');
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));
    expect(await screen.findByText('주소를 복사하지 못했습니다. 주소창에서 직접 복사하세요')).toBeTruthy();
  });

  it.each(['#/dashboard', '#/runs/fn', '#/runs', '#/password'])('%s 는 휴대폰에서 연다 — 본문을 그린다', (자리) => {
    띄운다(자리);
    expect(screen.getByText('본문')).toBeTruthy();
    expect(휴대폰자리인가(자리)).toBe(true);
  });

  it('성능 실행 한 건(#/perf/runs/12)은 휴대폰에서 열고, 실행 기록 목록(#/perf/runs)은 PC 에서만 연다', () => {
    띄운다('#/perf/runs', 사람, '#/perf/runs/12');
    expect(screen.getByText('본문')).toBeTruthy();
    expect(휴대폰자리인가('#/perf/runs', '#/perf/runs/12')).toBe(true);
    cleanup();
    띄운다('#/perf/runs', 사람, '#/perf/runs');
    expect(screen.queryByText('본문')).toBeNull();
    expect(휴대폰자리인가('#/perf/runs', '#/perf/runs')).toBe(false);
    expect(휴대폰자리인가('#/perf/runs', '#/perf/runs/new')).toBe(false);
  });

  it.each(['#/cases/fn', '#/prd', '#/authoring', '#/scenarios', '#/settings'])('%s 는 PC 에서만 연다', (자리) => {
    expect(휴대폰자리인가(자리)).toBe(false);
  });
  // useSSO 가 답을 기억하므로 맨 끝에 둔다 — 앞 검사들은 비밀번호 로그인 설치로 본다
  it('maxihan 계정 설치는 사람 버튼 안에 비밀번호 변경이 없다', async () => {
    vi.spyOn(api, 'methods').mockResolvedValue({ sso: true });
    띄운다('#/runs/fn');
    expect(await screen.findByRole('button', { name: '로그아웃' })).toBeTruthy();
    await vi.waitFor(() => expect(screen.queryByRole('link', { name: '비밀번호 변경' })).toBeNull());
  });
});
