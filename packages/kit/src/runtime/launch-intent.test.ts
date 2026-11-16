// 케이스가 고른 「실어 켤 값」(launchIntent)이 단독 앱 항목의 연결 열기까지 가는 길 — 만들기 실패 · 안 고른 케이스는 지금과 같다

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

type Body = (fixtures: unknown, testInfo: unknown) => Promise<void>;
type Fixture = (deps: object, use: (session: { open(): Promise<unknown> }) => Promise<void>, testInfo?: { status: string }) => Promise<void>;

const pw = vi.hoisted(() => ({ appRegistered: [] as Body[], fixtures: {} as Record<string, Fixture>, skip: vi.fn() }));
const app = vi.hoisted(() => ({ openApp: vi.fn(), captureApp: vi.fn(), closeApp: vi.fn(), readDevice: vi.fn() }));

vi.mock('@playwright/test', () => ({
  test: Object.assign(() => undefined, {
    skip: pw.skip,
    extend: (fixtures: Record<string, Fixture>) => {
      pw.fixtures = fixtures;
      return Object.assign((_title: string, body: Body) => void pw.appRegistered.push(body), { skip: pw.skip });
    },
  }),
}));
vi.mock('./app.js', () => app);

const { defineCase } = await import('./defineCase.js');
const { test } = await import('./test.js');

const params = z.object({ loginId: z.string().optional(), loginPassword: z.string().optional() });

beforeEach(() => {
  pw.appRegistered.length = 0;
  app.openApp.mockReset().mockResolvedValue({ id: 'fake-driver' });
  app.closeApp.mockReset().mockResolvedValue(undefined);
  vi.stubEnv('PLATFORM_PARAMS', JSON.stringify({ params: { loginId: 'qa_user1@x', loginPassword: 'pw-1234' } }));
  return () => vi.unstubAllEnvs();
});

async function runApp(): Promise<void> {
  await pw.fixtures.appSession({}, (session) => pw.appRegistered[0]({ request: {}, appSession: session }, { project: { name: 'android' } }));
}

describe('launchIntent', () => {
  it('케이스가 고르면 그 케이스의 입력값으로 값을 만들어 연결을 열 때 넘긴다', async () => {
    const launchIntent = vi.fn(async (p: { loginId?: string }) => ({ activity: '.QaLoginActivity', extras: { who: p.loginId ?? '' } }));
    test(defineCase({ tcId: 'DEMO-L01', name: '주입', precondition: [], params, expected: null, platforms: ['android'], launchIntent }), vi.fn());
    await runApp();
    expect(launchIntent).toHaveBeenCalledWith({ loginId: 'qa_user1@x', loginPassword: 'pw-1234' });
    expect(app.openApp.mock.calls.at(-1)?.[1]).toEqual({ keepData: false, intent: { activity: '.QaLoginActivity', extras: { who: 'qa_user1@x' } } });
  });

  it('값 만들기가 실패하면 알리고 그냥 연다 — 케이스는 화면 로그인으로 간다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const launchIntent = vi.fn(async () => {
      throw new Error('토큰 서버 503');
    });
    test(defineCase({ tcId: 'DEMO-L02', name: '주입 실패', precondition: [], params, expected: null, platforms: ['android'], launchIntent }), vi.fn());
    await runApp();
    expect(app.openApp.mock.calls.at(-1)?.[1]).toEqual({ keepData: false });
    expect(error).toHaveBeenCalledWith('[kit] DEMO-L02: 실어 켤 값을 만들지 못해 그냥 켠다 — 토큰 서버 503');
    error.mockRestore();
  });

  it('android 케이스에만 달고 명세(스캐너 JSON)에는 안 싣는다', () => {
    const 기본 = { name: '주입', precondition: [], params: null, expected: null, launchIntent: async () => ({ activity: '.A', extras: {} }) };
    expect('launchIntent' in defineCase({ ...기본, tcId: 'DEMO-L03', platforms: ['android'] })).toBe(false);
    expect(() => defineCase({ ...기본, tcId: 'DEMO-L04' })).toThrow('DEMO-L04: launchIntent 는 android 케이스에만 단다');
  });
});
