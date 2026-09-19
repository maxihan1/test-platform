// api.ts 가 서버에 무엇을 어떻게 묻는지 (SPEC §7). fetch 를 가로채 요청만 들여다본다
// 화면 조각(JSX)은 vitest include 가 apps/**/*.test.ts 라 잡히지 않는다. 여기서는 요청만 본다
//
// jsdom 을 설치하지 않았다. api.ts 가 location·sessionStorage 를 전역으로 쓰므로
// fetch 와 같은 방식으로 가짜를 끼운다 — 브라우저에서는 window 의 그것과 같은 객체다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from './api.js';

interface 부른것 {
  url: string;
  init: RequestInit | undefined;
}

let 부름: 부른것[] = [];
let 답: { status: number; body: unknown } = { status: 200, body: {} };
let 해시 = '';
let 보관: Record<string, string> = {};

beforeEach(() => {
  부름 = [];
  답 = { status: 200, body: {} };
  해시 = '#/runs/123';
  보관 = {};

  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    부름.push({ url, init });
    return Promise.resolve({
      ok: 답.status >= 200 && 답.status < 300,
      status: 답.status,
      json: () => Promise.resolve(답.body),
    } as Response);
  });

  vi.stubGlobal('location', {
    get hash() {
      return 해시;
    },
    set hash(값: string) {
      해시 = 값;
    },
  });

  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => 보관[key] ?? null,
    setItem: (key: string, value: string) => {
      보관[key] = value;
    },
    removeItem: (key: string) => {
      delete 보관[key];
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('로그인 세 함수', () => {
  it('로그인은 아이디와 비밀번호를 본문에 싣는다', async () => {
    답 = { status: 200, body: { user: { username: 'kim', displayName: '김철수', role: 'operator', services: [] } } };
    await api.login('kim', 'hunter2');

    expect(부름[0]?.url).toBe('/api/auth/login');
    expect(부름[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(부름[0]?.init?.body))).toEqual({ username: 'kim', password: 'hunter2' });
  });

  it('나를 묻는 것은 GET 이다', async () => {
    답 = { status: 200, body: { user: { username: 'kim', displayName: '김철수', role: 'viewer', services: [] } } };
    await api.me();
    expect(부름[0]?.url).toBe('/api/auth/me');
  });

  it('로그아웃은 POST 이고 본문이 없다', async () => {
    답 = { status: 204, body: null };
    await api.logout();
    expect(부름[0]?.url).toBe('/api/auth/logout');
    expect(부름[0]?.init?.method).toBe('POST');
  });
});

describe('세션이 끊기면 로그인 화면으로 보낸다', () => {
  it('아무 요청이나 401 을 받으면 로그인 화면으로 보내고 있던 자리를 기억한다', async () => {
    답 = { status: 401, body: { error: 'UNAUTHENTICATED' } };

    await expect(api.run(123)).rejects.toThrow(ApiError);
    expect(해시).toBe('#/login');
    expect(보관['돌아갈자리']).toBe('#/runs/123');
  });

  it('로그인 요청 자신의 401 은 가로채지 않는다. 로그인 화면에서 또 로그인 화면으로 보내면 무한이다', async () => {
    해시 = '#/login';
    답 = { status: 401, body: { error: 'INVALID_CREDENTIALS' } };

    await expect(api.login('kim', '틀린것')).rejects.toThrow(ApiError);
    expect(해시).toBe('#/login');
    // 로그인 화면은 돌아갈 자리를 남기지 않는다 — 앞 테스트가 남긴 것이 있으면 안 된다
    expect(보관['돌아갈자리']).toBeUndefined();
  });

  it('나를 묻는 것의 401 도 가로채지 않는다. 처음 열 때 한 번은 401 이 정상이다', async () => {
    답 = { status: 401, body: { error: 'UNAUTHENTICATED' } };
    await expect(api.me()).rejects.toThrow(ApiError);
    expect(해시).toBe('#/runs/123');
  });
});

describe('목록 두 곳은 보고 있는 서비스를 서버에 보낸다', () => {
  it('케이스 목록에 service 가 실린다', async () => {
    답 = { status: 200, body: { items: [], total: 0, totalIsExact: true, sort: 'tcId', page: 1, pageSize: 50 } };
    await api.cases({ service: 'PAY', q: '장바구니', page: 2 });

    const url = String(부름[0]?.url);
    expect(url).toContain('service=PAY');
    expect(url).toContain(`q=${encodeURIComponent('장바구니')}`);
    expect(url).toContain('page=2');
  });

  it('실행 기록 목록에도 service 가 실린다', async () => {
    답 = { status: 200, body: { items: [], total: 0, page: 1, pageSize: 50 } };
    await api.runs('PAY', 1);
    expect(String(부름[0]?.url)).toContain('service=PAY');
  });
});
