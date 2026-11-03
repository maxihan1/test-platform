// 출입증 쿠키 설정 — 바깥 주소가 https 인 설치만 secure 를 달고 이름에 __Host- 를 붙인다

import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 세션등록, 쿠키설정, 쿠키이름 } from './session.js';

describe('쿠키설정', () => {
  it('바깥 주소가 https 면 secure 를 단다', () => {
    expect(쿠키설정('https://qa.example.com')).toEqual({ path: '/', httpOnly: true, sameSite: 'lax', secure: true });
  });

  it('http 로 여는 설치 · 바깥 주소가 없는 설치는 secure 를 달지 않는다', () => {
    expect(쿠키설정('http://localhost:3000').secure).toBe(false);
    expect(쿠키설정('').secure).toBe(false);
  });
});

describe('쿠키이름', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('https 설치만 __Host- 이름이다', () => {
    expect(쿠키이름('https://commander.maxihan.com')).toBe('__Host-platform_session');
    expect(쿠키이름('http://localhost:3000')).toBe('platform_session');
    expect(쿠키이름('')).toBe('platform_session');
  });

  it('https 설치가 굽는 쿠키는 브라우저가 __Host- 이름으로 받는 꼴이다 — Secure · Path=/ · Domain 없음', async () => {
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'https://commander.maxihan.com');
    const app = Fastify();
    세션등록(app, '세션-검사용-열쇠-32글자를-넉넉히-넘긴다');
    app.get('/bake', async (req) => {
      req.session.set('username', 'x');
      return {};
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/bake' });
    const 굽기 = String(res.headers['set-cookie']);
    expect(굽기.startsWith('__Host-platform_session=')).toBe(true);
    expect(굽기).toMatch(/; Secure/);
    expect(굽기).toMatch(/; Path=\/(;|$)/);
    expect(굽기).not.toMatch(/Domain=/i);
    await app.close();
  });
});
