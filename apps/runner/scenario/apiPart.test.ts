// API 호출 단계의 가림 검사 — 오류 글 · 받은 값에 섞인 토큰 · 비밀값을 가리는지, 앞 단계 토큰을 다시 쓰는 단계도 가리는지 본다 (SPEC 도메인/시나리오 §3.7 결정 14)

import { describe, expect, it } from 'vitest';

import { API단계, type ApiPart, type 토큰모음 } from './apiPart.js';
import { 새이음 } from './links.js';
import type { 창 } from './parts.js';

const 주소 = 'https://ntf.example.com';
const 인증 = [{ name: '데모마켓', tokenUrl: '/v1/oauth/token', clientId: 'dm', clientSecret: 'dm-secret-9' }];
const 단계 = (덧: Partial<ApiPart> = {}): ApiPart => ({ kind: 'api', method: 'GET', path: '/v1/pushes', expectStatus: 200, auth: '데모마켓', apiAuths: 인증, ...덧 });
const 응답 = (status: number, body: unknown) => ({ status: () => status, text: async () => JSON.stringify(body), headers: () => ({ 'content-type': 'application/json' }) });

function 가짜창(부름: (url: string) => ReturnType<창['fetch']>): 창 {
  return { fetch: async (url: string) => (url.endsWith('/v1/oauth/token') ? 응답(200, { access_token: 'tok-abc123', expires_in: 300 }) : 부름(url)) } as unknown as 창;
}

describe('API 단계 가림', () => {
  it('부르다 던진 오류 글의 토큰 · 비밀값을 가린다 — 앞 단계가 받은 토큰을 다시 쓰는 단계도', async () => {
    const 창 = 가짜창(async () => {
      throw new Error('connect 실패 Bearer tok-abc123 · dm-secret-9');
    });
    const 모음: 토큰모음 = new Map();
    const 이음 = 새이음([단계(), 단계()], 주소);

    const 첫 = await API단계(창, 이음, 단계(), 1, 주소, 모음);
    const 둘 = await API단계(창, 이음, 단계(), 2, 주소, 모음);

    expect(첫.error).toBe('connect 실패 Bearer ******** · ********');
    expect(둘.error).toBe('connect 실패 Bearer ******** · ********');
  });

  it('응답 값 확인의 받은 값에 토큰이 들어 있어도 가린다', async () => {
    const 창 = 가짜창(async () => 응답(200, { token: 'tok-abc123' }));

    const 결과 = await API단계(창, 새이음([단계()], 주소), 단계({ expectJson: [{ jsonPath: 'token', equals: 'x' }] }), 1, 주소, new Map());

    expect(결과.error).toBe('응답 값이 다릅니다 — token (기대 x · 받은 값 ********)');
  });
});
