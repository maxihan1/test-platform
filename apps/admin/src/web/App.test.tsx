// @vitest-environment jsdom
// 앱 뿌리를 통째로 그려 방문 기록을 본다 — 세션 끊김 뒤 다시 로그인 · 권한 없는 자리 · 로그아웃 · 부하 마법사 저장 뒤 뒤로 가기 (WEB-F8-01 검토 12 · 13) · 링크의 애플리케이션 (WEB-F8-02)
// 서버는 fetch 를 가로채 가짜로 답한다. 화면이 부르는 나머지 요청은 답이 오지 않는다(불러오는 중)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { 앱뿌리 } from './App.js';
import { 떠나기막기 } from './leaveGuard.js';
import type { User } from './api.js';

const 사람 = (권한: { cases: 'none' | 'read'; runs: 'none' | 'read' | 'write'; authoring: 'none' | 'read' }): User => ({
  username: 'zap',
  displayName: '앱검사',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [
    { id: 7, prefix: 'ZAP', name: 'ZAP 웹', color: '#000', projectId: 3, projectName: '데모마켓', envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }], hasSlackWebhook: false, permissions: 권한 },
  ],
});

const 모두쓴다 = 사람({ cases: 'read', runs: 'write', authoring: 'read' });
const 세 = { 로그인됨: true, 나: 모두쓴다 };
const 부름: { url: string; method: string }[] = [];

function 답(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

beforeEach(() => {
  부름.length = 0;
  세.로그인됨 = true;
  세.나 = 모두쓴다;
  sessionStorage.clear();
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const 방법 = init?.method ?? 'GET';
      부름.push({ url, method: 방법 });
      if (url === '/api/auth/methods') return Promise.resolve(답(200, { sso: false }));
      if (url === '/api/auth/me') return Promise.resolve(세.로그인됨 ? 답(200, { user: 세.나 }) : 답(401, { error: 'UNAUTHENTICATED' }));
      if (url === '/api/auth/login') {
        세.로그인됨 = true;
        return Promise.resolve(답(200, { user: 세.나 }));
      }
      if (url === '/api/auth/logout') {
        세.로그인됨 = false;
        return Promise.resolve(답(204, null));
      }
      // 부하 마법사가 부르는 것 — 끊긴 세션이면 401
      if (url.startsWith('/api/perf/agents')) return Promise.resolve(세.로그인됨 ? 답(200, { agents: [] }) : 답(401, { error: 'UNAUTHENTICATED' }));
      if (url.startsWith('/api/perf/dummy')) return Promise.resolve(답(200, { clients: [] }));
      if (url === '/api/perf/scenarios' && 방법 === 'POST') return Promise.resolve(세.로그인됨 ? 답(200, { id: 42, version: 1 }) : 답(401, { error: 'UNAUTHENTICATED' }));
      if (url === '/api/perf/scenarios/42' && 방법 === 'PUT') return Promise.resolve(답(200, { version: 2 }));
      return new Promise<Response>(() => {});
    }),
  );
});

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.unstubAllGlobals();
});

async function 간다(해시: string) {
  if (window.location.hash === 해시) return;
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

async function 뒤로() {
  await act(async () => {
    window.history.back();
    await new Promise((끝) => setTimeout(끝, 30));
  });
}

describe('앱 뿌리의 방문 기록 (WEB-F8-01)', () => {
  it('세션이 끊겨 로그인 화면으로 갔다 다시 로그인하면 칸이 늘지 않고 보던 화면으로 돌아오며, 뒤로 가기는 그 앞 화면이다', async () => {
    await 간다('#/before');
    await 간다('#/perf/scenarios/new');
    const 길이 = window.history.length;
    // 처음 열 때는 살아 있고, 마법사를 저장하는 요청에서 끊긴다
    render(<앱뿌리 />);
    fireEvent.change(await screen.findByLabelText('시나리오 이름'), { target: { value: '주문하기' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    fireEvent.change(screen.getByLabelText('주소'), { target: { value: '/api/products' } });
    세.로그인됨 = false;
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await screen.findByLabelText('아이디');
    expect(window.location.hash).toBe('#/login');
    expect(window.history.length).toBe(길이);
    expect(sessionStorage.getItem('돌아갈자리')).toBe('#/perf/scenarios/new');

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'zap' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'x' } });
    fireEvent.submit(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(window.location.hash).toBe('#/perf/scenarios/new'));
    expect(window.history.length).toBe(길이);
    expect(sessionStorage.getItem('돌아갈자리')).toBeNull();

    await 뒤로();
    expect(window.location.hash).toBe('#/before');
  });

  it('권한 없는 자리로 가면 집으로 보내되 기록을 덮어 쓴다 — 뒤로 가기가 그 자리로 되돌아가 다시 튕기지 않는다', async () => {
    세.나 = 사람({ cases: 'read', runs: 'none', authoring: 'none' });
    await 간다('#/before');
    await 간다('#/runs/fn');
    const 길이 = window.history.length;
    render(<앱뿌리 />);
    // 집은 케이스 목록이고, 목록이 고른 애플리케이션을 주소에 단다 (WEB-F8-02)
    await waitFor(() => expect(window.location.hash).toBe('#/cases/fn?service=ZAP'));
    expect(window.history.length).toBe(길이);

    await 뒤로();
    expect(window.location.hash).toBe('#/before');
  });

  it('로그아웃하면 돌아갈 자리를 지운다 — 다음에 로그인하는 사람이 이 사람이 보던 화면으로 가지 않게', async () => {
    await 간다('#/cases');
    sessionStorage.setItem('돌아갈자리', '#/runs/9');
    render(<앱뿌리 />);
    fireEvent.click(await screen.findByRole('button', { name: /앱검사|내 메뉴/ }));
    fireEvent.click(await screen.findByRole('button', { name: '로그아웃' }));
    await screen.findByLabelText('아이디');
    expect(sessionStorage.getItem('돌아갈자리')).toBeNull();
  });

  it('부하 마법사를 처음 저장한 뒤 앞 단계로 뒤로 가도 같은 화면이라 쓴 값이 남고, 다시 저장하면 새로 만들지 않는다', async () => {
    await 간다('#/perf/scenarios/new');
    render(<앱뿌리 />);
    fireEvent.change(await screen.findByLabelText('시나리오 이름'), { target: { value: '주문하기' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    fireEvent.change(screen.getByLabelText('주소'), { target: { value: '/api/products' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByLabelText('최대 가상 사용자');
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await waitFor(() => expect(window.location.hash).toBe('#/perf/scenarios/new?step=2&id=42'));

    await 뒤로();
    expect(await screen.findByRole('button', { name: '트랜잭션 추가' })).toBeTruthy();
    expect(document.body.textContent).toContain('/api/products');
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await waitFor(() => expect(부름.some((it) => it.method === 'PUT' && it.url === '/api/perf/scenarios/42')).toBe(true));
    expect(부름.filter((it) => it.method === 'POST' && it.url === '/api/perf/scenarios')).toHaveLength(1);
  });
});

describe('링크에 애플리케이션이 담긴다 (WEB-F8-02)', () => {
  const 둘: User = {
    ...모두쓴다,
    services: [...모두쓴다.services, { ...모두쓴다.services[0]!, id: 8, prefix: 'ZBQ', name: 'ZBQ 웹' }],
  };
  const 지금고른 = (이름: RegExp) => screen.getByRole('button', { name: 이름 }).getAttribute('aria-current');
  const 안내 = '링크의 애플리케이션은 볼 권한이 없어 지금 고른 애플리케이션으로 엽니다';

  beforeEach(() => {
    세.나 = 둘;
    localStorage.setItem('고른서비스', 'ZAP');
  });

  it('다른 애플리케이션의 케이스 링크를 열면 그 애플리케이션으로 바꿔 연다 — 「케이스 없음」이 뜨지 않게', async () => {
    await 간다('#/cases/fn?q=ZBQ-FN-001&case=ZBQ-FN-001&service=ZBQ');
    render(<앱뿌리 />);
    await waitFor(() => expect(지금고른(/^ZBQ 웹 · /)).toBe('page'));
    expect(localStorage.getItem('고른서비스')).toBe('ZBQ');
    expect(screen.queryByText(안내)).toBeNull();
  });

  it('대시보드가 써 온 번호 꼴도 받는다', async () => {
    await 간다('#/runs/e2e?service=8');
    render(<앱뿌리 />);
    await waitFor(() => expect(지금고른(/^ZBQ 웹 · /)).toBe('page'));
  });

  it('볼 수 없는 애플리케이션이면 지금 고른 것 그대로 열고 안내 한 줄을 띄우며, 목록이 주소를 지금 애플리케이션으로 고친다', async () => {
    await 간다('#/cases/fn?service=NOPE');
    render(<앱뿌리 />);
    expect((await screen.findByText(안내)).getAttribute('role')).toBe('status');
    expect(지금고른(/^ZAP 웹 · /)).toBe('page');
    await waitFor(() => expect(window.location.hash).toBe('#/cases/fn?service=ZAP'));
  });

  it('왼쪽 줄에서 애플리케이션을 바꾸면 주소의 service= 칸도 고친다 — 새로고침이 앞 애플리케이션으로 되돌리지 않게', async () => {
    await 간다('#/scenarios?service=ZAP');
    render(<앱뿌리 />);
    fireEvent.click(await screen.findByRole('button', { name: /^ZBQ 웹 · / }));
    await waitFor(() => expect(window.location.hash).toBe('#/scenarios?service=ZBQ'));
    expect(지금고른(/^ZBQ 웹 · /)).toBe('page');
  });

  it('자리 없이 연 설정은 연 애플리케이션 자리로 기록을 덮어 채우고, 왼쪽 줄에서 바꾸면 그 자리도 따라간다', async () => {
    await 간다('#/before');
    await 간다('#/settings');
    const 길이 = window.history.length;
    render(<앱뿌리 />);
    await waitFor(() => expect(window.location.hash).toBe('#/settings/ZAP'));
    expect(window.history.length).toBe(길이);

    fireEvent.click(screen.getByRole('button', { name: /^ZBQ 웹 · / }));
    await waitFor(() => expect(window.location.hash).toBe('#/settings/ZBQ'));
    expect(window.history.length).toBe(길이);
    await 뒤로();
    expect(window.location.hash).toBe('#/before');
  });

  it('지금 애플리케이션에서도 그 화면을 못 보면 집으로 옮길 뿐 안내하지 않는다 — 「지금 고른 애플리케이션으로 엽니다」가 틀린 말이 된다', async () => {
    세.나 = { ...둘, services: 둘.services.map((it) => ({ ...it, permissions: { ...it.permissions, cases: 'none' as const } })) };
    await 간다('#/cases/fn?service=NOPE');
    render(<앱뿌리 />);
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard'));
    expect(screen.queryByText(안내)).toBeNull();
  });

  it('로그아웃하면 떠 있던 안내 한 줄을 거둔다 — 다음 로그인에 옛 안내가 뜨지 않게', async () => {
    await 간다('#/cases/fn?service=NOPE');
    render(<앱뿌리 />);
    await screen.findByText(안내);
    fireEvent.click(screen.getByRole('button', { name: /앱검사|내 메뉴/ }));
    fireEvent.click(await screen.findByRole('button', { name: '로그아웃' }));
    await screen.findByLabelText('아이디');
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'zap' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'x' } });
    fireEvent.submit(screen.getByRole('button', { name: '로그인' }));
    await screen.findByRole('button', { name: /^ZAP 웹 · / });
    expect(screen.queryByText(안내)).toBeNull();
  });
});
