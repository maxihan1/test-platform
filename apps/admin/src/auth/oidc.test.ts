// SSO 를 켜는 env 판정 — 셋 다 있거나 셋 다 없어야 한다 · Auth_platform 로그아웃 주소 모양

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';

import { SSO설정읽기, 로그아웃주소 } from './oidc.js';

const 셋 = { AUTH_ISSUER: 'http://localhost:9000', AUTH_CLIENT_ID: 'test-platform', AUTH_CLIENT_SECRET: 's' };

describe('SSO설정읽기', () => {
  it('셋 다 없으면 SSO 가 꺼진 설치다', () => {
    expect(SSO설정읽기({})).toBeNull();
  });

  it('셋 다 있으면 켜지고 바깥 주소 끝의 / 를 뗀다', () => {
    expect(SSO설정읽기({ ...셋, PLATFORM_PUBLIC_URL: 'http://localhost:3000/' })).toEqual({
      issuer: 'http://localhost:9000',
      clientId: 'test-platform',
      clientSecret: 's',
      publicUrl: 'http://localhost:3000',
    });
  });

  it('일부만 있으면 기동을 멈춘다 — 반만 켜지면 로그인 길이 둘 다 닫힌다', () => {
    expect(() => SSO설정읽기({ AUTH_ISSUER: 'http://localhost:9000', PLATFORM_PUBLIC_URL: 'http://x' })).toThrow('셋 다');
  });

  it('바깥 주소가 없으면 돌아올 주소를 못 지어 기동을 멈춘다', () => {
    expect(() => SSO설정읽기(셋)).toThrow('PLATFORM_PUBLIC_URL');
  });
});

// post_logout_redirect_uri 는 Auth_platform 에 등록한 문자열과 한 글자까지 같아야 받는다 (도메인/인증 §7 로그아웃)
describe('로그아웃주소', () => {
  it('discovery 의 end_session_endpoint 에 id token 과 바깥 주소 + / 를 싣는다', async () => {
    const 서버 = createServer((_req, res) => {
      const 주소 = `http://127.0.0.1:${(서버.address() as AddressInfo).port}`;
      res.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          issuer: 주소,
          authorization_endpoint: `${주소}/oauth2/authorize`,
          token_endpoint: `${주소}/oauth2/token`,
          jwks_uri: `${주소}/oauth2/jwks`,
          end_session_endpoint: `${주소}/connect/logout`,
        }),
      );
    });
    await new Promise<void>((풀림) => 서버.listen(0, '127.0.0.1', 풀림));
    try {
      const issuer = `http://127.0.0.1:${(서버.address() as AddressInfo).port}`;
      const 주소 = new URL(await 로그아웃주소({ issuer, clientId: 'test-platform', clientSecret: 's', publicUrl: 'https://commander.example' }, 'id.xyz'));
      expect(주소.origin + 주소.pathname).toBe(`${issuer}/connect/logout`);
      expect(주소.searchParams.get('id_token_hint')).toBe('id.xyz');
      expect(주소.searchParams.get('post_logout_redirect_uri')).toBe('https://commander.example/');
    } finally {
      await new Promise((풀림) => 서버.close(풀림));
    }
  });
});
