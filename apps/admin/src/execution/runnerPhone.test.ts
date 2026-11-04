// 정식 실행의 모바일 항목이 「실행 위치」대로 실제 폰 Chrome 칸을 싣고 가는지 본다. 팜 · 러너는 가짜다 (도메인/실행 §3.2 「모바일 웹 실행 위치」 · TMO-F4-03)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ExecuteRequest } from '@platform/kit';

import * as farm from './farm.js';
import * as farmToken from './farmToken.js';
import { callRunner } from './runner.js';
import type { PendingItem } from './store.js';

vi.mock('../apidoc/caseDoc.js', () => ({ 케이스판: vi.fn(async () => ({})) }));

const 항목: PendingItem = {
  historyId: 7,
  tcId: 'DEMO-001',
  platform: 'mobile',
  filePath: 'demo/DEMO-001.spec.ts',
  baseUrl: 'https://qa.example.com',
  params: {},
  expected: {},
  timeoutMs: 5000,
};

describe('callRunner — 모바일 실행 위치', () => {
  let 러너: FastifyInstance;
  const 받음: ExecuteRequest[] = [];
  const 칸 = { udid: 's2', cdpUrl: 'wss://farm.test/api/devices/s2/chrome/cdp', farmToken: 'pat_me' };

  beforeAll(async () => {
    러너 = Fastify();
    러너.get('/health', async () => ({ ok: true }));
    러너.post('/execute', async (req) => {
      받음.push(req.body as ExecuteRequest);
      return { historyId: 7, status: 'PASS', durationMs: 1, steps: [] };
    });
    await 러너.listen({ port: 0, host: '127.0.0.1' });
    const addr = 러너.server.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
    vi.spyOn(farmToken, '실행팜토큰').mockResolvedValue('pat_me');
  });

  afterEach(() => {
    받음.length = 0;
    delete process.env.DEVICE_FARM_URL;
    vi.mocked(farm.폰Chrome으로).mockRestore?.();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    delete process.env.RUNNER_URL;
    await 러너.close();
  });

  it('실제 폰을 고른 항목은 누른 사람 토큰으로 폰 Chrome 을 열어 그 칸을 싣는다', async () => {
    process.env.DEVICE_FARM_URL = 'http://farm.test';
    const 열기 = vi.spyOn(farm, '폰Chrome으로').mockImplementation(((_팜: string, 일: (c: typeof 칸) => Promise<unknown>) => 일(칸)) as never);

    expect((await callRunner(1, { ...항목, 실제폰: true })).status).toBe('PASS');
    expect(받음[0]).toMatchObject({ platform: 'mobile', ...칸 });
    expect(열기.mock.calls[0]?.[0]).toBe('http://farm.test');
    expect(열기.mock.calls[0]?.[3]).toBe('pat_me');
  });

  it('고르지 않은 mobile 항목은 팜을 거치지 않고 서버 흉내로 보낸다', async () => {
    process.env.DEVICE_FARM_URL = 'http://farm.test';
    const 열기 = vi.spyOn(farm, '폰Chrome으로');

    await callRunner(1, 항목);
    expect(열기).not.toHaveBeenCalled();
    expect('cdpUrl' in 받음[0]!).toBe(false);
  });

  it('폰을 못 잡거나 멈춘 실행이면 러너에 안 보내고 그 항목만 미실행이다', async () => {
    process.env.DEVICE_FARM_URL = 'http://farm.test';
    vi.spyOn(farm, '폰Chrome으로').mockImplementationOnce(((_팜: string, _일: unknown, 못잡음: (까닭: string) => unknown) =>
      Promise.resolve(못잡음('Device VISION 에 빈 폰이 없습니다'))) as never);
    expect((await callRunner(1, { ...항목, 실제폰: true })).error?.message).toBe('Device VISION 에 빈 폰이 없습니다');

    vi.spyOn(farm, '폰Chrome으로').mockImplementationOnce(((_팜: string, 일: (c: typeof 칸) => Promise<unknown>) => 일(칸)) as never);
    expect((await callRunner(1, { ...항목, 실제폰: true }, () => true)).error?.message).toBe('멈춘 실행이라 러너에 보내지 않았습니다');
    expect(받음).toHaveLength(0);
  });

  it('팜 주소가 비었으면 미실행이다', async () => {
    expect((await callRunner(1, { ...항목, 실제폰: true })).error?.message).toBe('이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  });
});

describe('callRunner — 스토어 앱 패키지 이름', () => {
  afterEach(() => {
    delete process.env.DEVICE_FARM_URL;
    vi.restoreAllMocks();
  });

  const 앱항목: PendingItem = { ...항목, platform: 'android', filePath: 'demo/DEMO-001.spec.ts' };
  const 거른패키지 = async (item: PendingItem): Promise<unknown> => {
    process.env.DEVICE_FARM_URL = 'http://farm.test';
    vi.spyOn(farmToken, '실행팜토큰').mockResolvedValue(undefined);
    const 잡기 = vi.spyOn(farm, '팜폰으로').mockImplementation(((_팜: string, _일: unknown, 못잡음: (까닭: string) => unknown) =>
      Promise.resolve(못잡음('Device VISION 에 빈 폰이 없습니다'))) as never);
    await callRunner(1, item);
    return 잡기.mock.calls[0]?.[7];
  };

  it('앱 값이 패키지 이름이면 그 앱이 깔린 폰만 잡는다', async () => {
    expect(await 거른패키지({ ...앱항목, app: 'com.shop.app' })).toBe('com.shop.app');
  });

  it('APK 경로 · 올린 빌드면 거르지 않는다 — 빌드가 패키지 이름보다 앞서 APK 를 깐다', async () => {
    expect(await 거른패키지({ ...앱항목, app: '/apk/qa.apk' })).toBeUndefined();
    expect(await 거른패키지({ ...앱항목, buildId: 3 })).toBeUndefined();
  });
});
