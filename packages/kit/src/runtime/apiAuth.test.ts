// api(이름) 의 토큰 받기 · 다시 받기 · 실패 문구와 절차 기록 가림을 본다 (SPEC 도메인/API §3.8 「API 인증」)

import type { APIRequestContext, APIResponse } from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiAuth } from '../types.js';
import { api만들기, 인증목록 } from './apiAuth.js';
import { stepScope, type StepScope } from './context.js';
import { 가린다, traced } from './http.js';

const 고객사A: ApiAuth = { name: '고객사 A', tokenUrl: '/v1/oauth/token', clientId: 'client-a', clientSecret: 'secret-a-1234' };

function 응답(status: number, body: unknown): APIResponse {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: () => status >= 200 && status < 300,
    status: () => status,
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  } as unknown as APIResponse;
}

type 호출 = [string, Record<string, unknown> | undefined];

function 가짜요청(토큰응답: () => APIResponse, 본응답: () => APIResponse = () => 응답(200, { ok: true })) {
  const 받은: 호출[] = [];
  const 도구 = {
    post: vi.fn(async (url: string, options?: Record<string, unknown>) => {
      받은.push([url, options]);
      return url === 고객사A.tokenUrl ? 토큰응답() : 본응답();
    }),
    get: vi.fn(async (url: string, options?: Record<string, unknown>) => {
      받은.push([url, options]);
      return 본응답();
    }),
  };
  return { 도구: 도구 as unknown as APIRequestContext, 받은 };
}

function 차리기(토큰응답: () => APIResponse, 본응답?: () => APIResponse) {
  const { 도구, 받은 } = 가짜요청(토큰응답, 본응답);
  const 비밀 = new Set([고객사A.clientSecret]);
  const 감싼 = traced(도구, 비밀);
  return { api: api만들기([고객사A], 감싼, 도구, 비밀), 받은, 비밀 };
}

const 절차안에서 = async (일: () => Promise<unknown>): Promise<StepScope> => {
  const scope: StepScope = { assertions: [] };
  await stepScope.run(scope, 일);
  return scope;
};

const 던진것 = (일: Promise<unknown>): Promise<Error> =>
  일.then(
    () => {
      throw new Error('던지지 않았다');
    },
    (e: unknown) => e as Error,
  );

afterEach(() => {
  vi.useRealTimers();
});

describe('api(이름)', () => {
  it('client credentials 로 토큰을 받아 Bearer 로 붙이고, 만료 전에는 다시 받지 않는다', async () => {
    const { api, 받은 } = 차리기(() => 응답(200, { access_token: 'tok-1', expires_in: 300 }));
    await api('고객사 A').get('/v1/pushes');
    await api('고객사 A').get('/v1/pushes');

    const 토큰요청 = 받은.filter(([url]) => url === 고객사A.tokenUrl);
    expect(토큰요청).toHaveLength(1);
    expect(토큰요청[0]![1]).toEqual({
      form: { grant_type: 'client_credentials' },
      headers: { Authorization: `Basic ${Buffer.from('client-a:secret-a-1234').toString('base64')}` },
    });
    expect(받은.filter(([url]) => url === '/v1/pushes').map(([, o]) => o?.headers)).toEqual([
      { Authorization: 'Bearer tok-1' },
      { Authorization: 'Bearer tok-1' },
    ]);
  });

  it('만료 30초 전이 되면 다시 받는다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let n = 0;
    const { api, 받은 } = 차리기(() => 응답(200, { access_token: `tok-${++n}`, expires_in: 300 }));
    await api('고객사 A').get('/a');
    vi.setSystemTime(Date.now() + 269_000);
    await api('고객사 A').get('/b');
    vi.setSystemTime(Date.now() + 2_000);
    await api('고객사 A').get('/c');

    expect(받은.filter(([url]) => url !== 고객사A.tokenUrl).map(([, o]) => o?.headers)).toEqual([
      { Authorization: 'Bearer tok-1' },
      { Authorization: 'Bearer tok-1' },
      { Authorization: 'Bearer tok-2' },
    ]);
  });

  it('expires_in 이 없으면 항목이 끝날 때까지 한 토큰을 쓴다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { api, 받은 } = 차리기(() => 응답(200, { access_token: 'tok-1' }));
    await api('고객사 A').get('/a');
    vi.setSystemTime(Date.now() + 86_400_000);
    await api('고객사 A').get('/b');
    expect(받은.filter(([url]) => url === 고객사A.tokenUrl)).toHaveLength(1);
  });

  it('케이스가 준 머리는 두고 Authorization 만 더한다', async () => {
    const { api, 받은 } = 차리기(() => 응답(200, { access_token: 'tok-1' }));
    await api('고객사 A').post('/v1/pushes', { headers: { 'Idempotency-Key': 'k-1' }, data: { title: '안녕' } });
    expect(받은.at(-1)).toEqual(['/v1/pushes', { headers: { 'Idempotency-Key': 'k-1', Authorization: 'Bearer tok-1' }, data: { title: '안녕' } }]);
  });

  it('없는 이름은 부르는 자리에서 던진다', () => {
    const { api } = 차리기(() => 응답(200, { access_token: 'tok-1' }));
    expect(() => api('고객사 B')).toThrow("이 대상 서버에 API 인증 '고객사 B' 가 없습니다");
  });

  it('토큰을 못 받으면 응답 코드 · 까닭을 단 문구로 실패한다', async () => {
    await expect(차리기(() => 응답(401, { error: 'invalid_client' })).api('고객사 A').get('/a')).rejects.toThrow(
      "API 인증 '고객사 A' 토큰을 받지 못했습니다 — 401",
    );
    await expect(차리기(() => 응답(200, '<html>')).api('고객사 A').get('/a')).rejects.toThrow('— 응답이 JSON 이 아닙니다');
    await expect(차리기(() => 응답(200, { token: 'x' })).api('고객사 A').get('/a')).rejects.toThrow('— 응답에 access_token 이 없습니다');
  });

  it('토큰 주소에 닿지 못하면 오류 첫 줄만 가려서 싣는다', async () => {
    const { api } = 차리기(() => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3003\n  authorization: Basic Y2xpZW50LWE6c2VjcmV0');
    });
    const 오류 = await 던진것(api('고객사 A').get('/a'));
    expect(오류.message).toBe("API 인증 '고객사 A' 토큰을 받지 못했습니다 — connect ECONNREFUSED 127.0.0.1:3003");
  });
});

describe('절차 기록 가림', () => {
  it('보낸 머리 · 본문과 받은 본문에서 토큰 · 비밀값을 가린다', async () => {
    const { api } = 차리기(
      () => 응답(200, { access_token: 'tok-abc-123', expires_in: 300 }),
      () => 응답(200, { id: 'p-1', echo: 'tok-abc-123', refreshToken: 'r-9' }),
    );
    const scope = await 절차안에서(() =>
      api('고객사 A').post('/v1/pushes', { data: { title: '안녕', client_secret: 'secret-a-1234', note: 'secret-a-1234 끝' } }),
    );
    expect(scope.httpTrace).toEqual({
      request: {
        method: 'POST',
        url: '/v1/pushes',
        headers: { Authorization: '********' },
        data: { title: '안녕', client_secret: '********', note: '******** 끝' },
      },
      response: { status: 200, body: '{"id":"p-1","echo":"********","refreshToken":"********"}' },
    });
  });

  it('토큰 요청은 그 절차의 기록을 덮지 않는다', async () => {
    const { api } = 차리기(() => 응답(200, { access_token: 'tok-1' }));
    const scope = await 절차안에서(() => api('고객사 A').get('/v1/devices'));
    expect((scope.httpTrace?.request as { url: string }).url).toBe('/v1/devices');
  });

  it('요청이 던진 오류 글에서도 받은 토큰을 가린다', async () => {
    let 보냄 = 0;
    const { api } = 차리기(
      () => 응답(200, { access_token: 'tok-zzz' }),
      () => {
        보냄 += 1;
        throw new Error('socket hang up\n  authorization: Bearer tok-zzz');
      },
    );
    const 오류 = await 던진것(api('고객사 A').get('/a'));
    expect(보냄).toBe(1);
    expect(오류.message).toBe('socket hang up\n  authorization: Bearer ********');
  });

  it('평범한 객체가 아닌 값은 열지 않는다', () => {
    const 버퍼 = Buffer.from('abc');
    expect(가린다({ data: 버퍼, list: [{ password: 'x' }] }, new Set())).toEqual({ data: 버퍼, list: [{ password: '********' }] });
  });
});

describe('인증목록', () => {
  it('러너가 안 넘겼으면 빈 목록이다', () => {
    expect([인증목록(undefined), 인증목록(''), 인증목록(JSON.stringify([고객사A]))]).toEqual([[], [], [고객사A]]);
  });
});
