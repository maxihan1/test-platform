// SSO 를 켜는 env 판정 — 셋 다 있거나 셋 다 없어야 한다

import { describe, expect, it } from 'vitest';

import { SSO설정읽기 } from './oidc.js';

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
