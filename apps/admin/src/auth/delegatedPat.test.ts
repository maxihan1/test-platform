// 대신 PAT 받기 · 기억 · 새로 받기 · 실패 때 남은 것 쓰기를 가짜 Auth(fetch)로 본다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 대신PAT, 대신PAT기억비우기, 대신PAT오류 } from './delegatedPat.js';

const 시 = 60 * 60_000;
const 처음 = Date.parse('2026-11-04T00:00:00Z');

describe('대신PAT', () => {
  let 지금 = 처음;
  let 받은요청: { url: string; init: RequestInit }[] = [];
  let 답들: (() => Response)[] = [];

  const 줌 = (token: string, 남은시 = 3) => () =>
    new Response(JSON.stringify({ token, expiresAt: new Date(지금 + 남은시 * 시).toISOString() }), { status: 201 });
  const 상태 = (status: number) => () => new Response(JSON.stringify({ error: 'x' }), { status });
  const 부르기 = (async (url: URL | string, init?: RequestInit) => {
    받은요청.push({ url: String(url), init: init ?? {} });
    const 다음 = 답들.shift();
    if (다음 === undefined) throw new Error('더 줄 답이 없다');
    return 다음();
  }) as typeof fetch;
  const 받기 = (누구: Parameters<typeof 대신PAT>[0]) => 대신PAT(누구, 부르기, () => 지금);

  beforeEach(() => {
    대신PAT기억비우기();
    지금 = 처음;
    받은요청 = [];
    답들 = [];
    vi.stubEnv('AUTH_ISSUER', 'https://auth.example.com/issuer');
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 's:cr+t');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'https://qahub.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Auth 맨 앞 자리에 client_secret_basic 으로 그 사람을 하나 골라 묻는다', async () => {
    답들 = [줌('pat_a')];
    expect(await 받기({ userId: 'sub-1' })).toBe('pat_a');
    expect(받은요청).toHaveLength(1);
    const { url, init } = 받은요청[0]!;
    expect(url).toBe('https://auth.example.com/api/v1/delegated-pats');
    expect(init.method).toBe('POST');
    const 머리 = init.headers as Record<string, string>;
    expect(머리.authorization).toBe(`Basic ${Buffer.from('test-platform:s%3Acr%2Bt').toString('base64')}`);
    expect(JSON.parse(String(init.body))).toEqual({ userId: 'sub-1' });
    expect(init.redirect).toBe('manual');
  });

  it('2시간 넘게 남았으면 기억한 것을 쓰고, 2시간 밑이면 새로 받는다', async () => {
    답들 = [줌('pat_a'), 줌('pat_b')];
    expect(await 받기({ username: 'maxi' })).toBe('pat_a');
    지금 += 0.9 * 시;
    expect(await 받기({ username: 'maxi' })).toBe('pat_a');
    expect(받은요청).toHaveLength(1);
    지금 += 0.2 * 시;
    expect(await 받기({ username: 'maxi' })).toBe('pat_b');
    expect(받은요청).toHaveLength(2);
  });

  it('사람마다 · 이름마다 따로 기억한다', async () => {
    답들 = [줌('pat_a'), 줌('pat_b')];
    expect(await 받기({ userId: 'maxi' })).toBe('pat_a');
    expect(await 받기({ username: 'maxi' })).toBe('pat_b');
    expect(JSON.parse(String(받은요청[1]!.init.body))).toEqual({ username: 'maxi' });
  });

  it('새로 받기가 실패하면(5xx · 429 · 못 닿음) 아직 살아 있는 것을 그대로 쓴다', async () => {
    답들 = [줌('pat_a'), 상태(503), 상태(429), () => { throw new TypeError('fetch failed'); }];
    expect(await 받기({ userId: 'sub-1' })).toBe('pat_a');
    지금 += 1.5 * 시;
    for (let i = 0; i < 3; i++) {
      expect(await 받기({ userId: 'sub-1' })).toBe('pat_a');
      지금 += 61_000;
    }
    expect(받은요청).toHaveLength(4);
  });

  it('실패한 뒤 1분은 Auth 에 다시 묻지 않는다 — 429 를 받은 Auth 를 또 두드리지 않게', async () => {
    답들 = [줌('pat_a'), 상태(429), 줌('pat_b')];
    await 받기({ username: 'maxi' });
    지금 += 1.5 * 시;
    expect(await 받기({ username: 'maxi' })).toBe('pat_a');
    지금 += 30_000;
    expect(await 받기({ username: 'maxi' })).toBe('pat_a');
    expect(받은요청).toHaveLength(2);
    지금 += 31_000;
    expect(await 받기({ username: 'maxi' })).toBe('pat_b');
    expect(받은요청).toHaveLength(3);
  });

  it('살아 있는 것이 없을 때 실패하면 1분 동안 Auth 를 안 부르고 같은 오류를 던진다', async () => {
    답들 = [상태(503)];
    await expect(받기({ userId: 'sub-9' })).rejects.toThrow('HTTP 503');
    await expect(받기({ userId: 'sub-9' })).rejects.toThrow('HTTP 503');
    expect(받은요청).toHaveLength(1);
  });

  it('남은 것이 거의 다 됐거나 없으면 던진다 — 상태만 말하고 토큰은 안 싣는다', async () => {
    답들 = [상태(404)];
    await expect(받기({ username: 'nobody' })).rejects.toThrow(new 대신PAT오류('username nobody 의 대신 PAT 를 못 받았다: HTTP 404'));
    답들 = [줌('pat_secret', 3), 상태(503)];
    await 받기({ userId: 'sub-2' });
    지금 += 3 * 시 - 30_000;
    const 오류 = await 받기({ userId: 'sub-2' }).catch((e: unknown) => e);
    expect(오류).toBeInstanceOf(대신PAT오류);
    expect(String(오류)).not.toContain('pat_secret');
  });

  it('꼴이 틀린 답(pat_ 아님 · 만료 시각 없음)은 받지 않는다', async () => {
    답들 = [() => new Response(JSON.stringify({ token: 'abc', expiresAt: new Date(지금 + 3 * 시).toISOString() }), { status: 201 })];
    await expect(받기({ userId: 'x' })).rejects.toThrow('답을 읽지 못했다');
    답들 = [() => new Response(JSON.stringify({ token: 'pat_x' }), { status: 201 })];
    await expect(받기({ userId: 'x' })).rejects.toThrow('답을 읽지 못했다');
  });

  it('같은 사람을 동시에 물으면 한 번만 받는다', async () => {
    답들 = [줌('pat_a')];
    const 둘 = await Promise.all([받기({ userId: 'sub-1' }), 받기({ userId: 'sub-1' }), 받기({ userId: 'sub-1' })]);
    expect(둘).toEqual(['pat_a', 'pat_a', 'pat_a']);
    expect(받은요청).toHaveLength(1);
  });

  it('SSO 를 끈 설치는 Auth 를 부르지 않고 던진다', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('AUTH_ISSUER', '');
    vi.stubEnv('AUTH_CLIENT_ID', '');
    vi.stubEnv('AUTH_CLIENT_SECRET', '');
    await expect(받기({ userId: 'sub-1' })).rejects.toBeInstanceOf(대신PAT오류);
    expect(받은요청).toHaveLength(0);
  });
});
