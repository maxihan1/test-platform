// 게임 항목의 몸통 칸(game · admin) · 실패 증적 · 게임 첨부를 검사한다. Playwright · Appium · 게임 연결은 가짜로 바꿔 끼운다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Body = (fixtures: unknown, testInfo: unknown) => Promise<void>;
type Use = (session: { open(): Promise<unknown> }) => Promise<void>;
type Fixture = (deps: object, use: Use, testInfo?: object) => Promise<void>;

const pw = vi.hoisted(() => ({ appRegistered: [] as Body[], fixtures: {} as Record<string, Fixture> }));
const app = vi.hoisted(() => ({ openApp: vi.fn(), captureApp: vi.fn(), closeApp: vi.fn(), readDevice: vi.fn() }));
const game = vi.hoisted(() => ({
  isGame: (env: Record<string, string | undefined>) => env.PLATFORM_ENGINE === 'GAME',
  openGame: vi.fn(),
  게임증적을남긴다: vi.fn(),
}));

vi.mock('@playwright/test', () => ({
  test: Object.assign(() => {}, {
    skip: () => {},
    extend: (fixtures: Record<string, Fixture>) => {
      pw.fixtures = fixtures;
      return Object.assign((_title: string, body: Body) => pw.appRegistered.push(body), { skip: () => {} });
    },
  }),
}));
vi.mock('./app.js', () => app);
vi.mock('./game.js', () => game);

const { defineCase } = await import('./defineCase.js');
const { test } = await import('./test.js');

const driver = { id: 'fake-driver' };
const 게임 = { id: 'fake-game' };
const spec = defineCase({ tcId: 'ASH-FN-001', name: '강화', precondition: [], params: null, expected: null, platforms: ['android'] });

function 응답(status: number) {
  return { status: () => status, text: async () => '{}' };
}

// 정리 단계 testInfo.status 로 실패를 가른다 — Playwright 는 본문이 끝난 뒤 그 값을 채운다
async function 돌린다(request: object, 판정: 'passed' | 'failed' = 'passed') {
  const testInfo = { project: { name: 'android' }, attach: vi.fn(), status: 판정, expectedStatus: 'passed' };
  let 던짐: unknown;
  await pw.fixtures.appSession(
    {},
    async (session) => {
      await pw.appRegistered[0]({ request, appSession: session }, testInfo).catch((err: unknown) => (던짐 = err));
    },
    testInfo,
  );
  return { testInfo, 던짐 };
}

beforeEach(() => {
  pw.appRegistered.length = 0;
  app.openApp.mockReset().mockResolvedValue(driver);
  app.closeApp.mockReset().mockResolvedValue(undefined);
  app.readDevice.mockReset().mockResolvedValue({ model: null, osVersion: null, appVersion: null });
  game.openGame.mockReset().mockResolvedValue(게임);
  game.게임증적을남긴다.mockReset().mockResolvedValue(undefined);
  process.env.PLATFORM_ENGINE = 'GAME';
  process.env.PLATFORM_BASE_URL = 'https://ash.example.com';
  process.env.PLATFORM_ADMIN_KEY = JSON.stringify({ header: 'X-Admin-Key', value: 'k-1234' });
});

afterEach(() => {
  delete process.env.PLATFORM_ENGINE;
  delete process.env.PLATFORM_BASE_URL;
  delete process.env.PLATFORM_ADMIN_KEY;
});

describe('게임 항목', () => {
  it('몸통이 game · driver 를 받고, admin 은 어드민 키 머리를 붙이고 부른 API 를 첨부로 남긴다', async () => {
    const get = vi.fn(async () => 응답(200));
    let 받은: { game: unknown; driver: unknown } | undefined;
    test(spec, async (args) => {
      받은 = { game: args.game, driver: args.driver };
      await args.admin.get('/admin/forced?token=x', { headers: { 'x-admin-key': '케이스가 준 값' } });
    });

    const { testInfo } = await 돌린다({ get });

    expect(받은).toEqual({ game: 게임, driver });
    expect(get).toHaveBeenCalledWith('/admin/forced?token=x', { headers: { 'X-Admin-Key': 'k-1234' } });
    const 첨부 = testInfo.attach.mock.calls.find(([이름]) => 이름 === 'platform-game');
    expect(JSON.parse((첨부?.[1] as { body: string }).body)).toEqual({
      elementChecks: [],
      apiCalls: [{ method: 'GET', path: '/admin/forced', status: 200 }],
    });
    expect(game.게임증적을남긴다).not.toHaveBeenCalled();
  });

  it('통과 못 한 항목은 연결을 닫기 전에 게임 증적을 남긴다', async () => {
    const 차례: string[] = [];
    game.게임증적을남긴다.mockImplementation(async () => void 차례.push('증적'));
    app.closeApp.mockImplementation(async () => void 차례.push('닫기'));
    test(spec, async () => {});

    await 돌린다({}, 'failed');

    expect(game.게임증적을남긴다).toHaveBeenCalledWith(게임, '0', '0');
    expect(차례).toEqual(['증적', '닫기']);
  });

  it('게임에 못 붙으면 Appium 연결을 닫고 그 오류로 실패한다', async () => {
    game.openGame.mockRejectedValue(new Error('게임이 120초 안에 답하지 않았습니다 — 게임 포트 13100 에 붙지 못했습니다'));
    test(spec, async () => {});

    const { 던짐 } = await 돌린다({}, 'failed');

    expect(String(던짐)).toContain('게임 포트 13100 에 붙지 못했습니다');
    expect(app.closeApp).toHaveBeenCalledWith(driver);
  });

  it('게임 엔진이 아니면 game 을, 어드민 키가 없으면 admin 을 꺼낼 때 던진다', async () => {
    delete process.env.PLATFORM_ENGINE;
    delete process.env.PLATFORM_ADMIN_KEY;
    let args: { game: unknown; admin: unknown } | undefined;
    test(spec, async (a) => {
      args = a;
    });

    await 돌린다({});

    expect(game.openGame).not.toHaveBeenCalled();
    expect(() => args?.game).toThrow('ASH-FN-001은 게임 애플리케이션 항목이 아니라 game 이 없다');
    expect(() => args?.admin).toThrow('대상 서버 줄에 어드민 키가 없어 admin 을 쓸 수 없다');
  });
});
