// 보류 케이스의 건너뛰기 등록과 android 케이스의 폰 실행 갈래를 검사한다. Playwright 와 Appium 연결은 가짜로 바꿔 끼운다

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Body = (fixtures: unknown, testInfo: unknown) => Promise<void>;

type Use = (session: { open(): Promise<unknown> }) => Promise<void>;
type Fixture = (deps: object, use: Use) => Promise<void>;

const pw = vi.hoisted(() => ({
  registered: [] as Body[],
  appRegistered: [] as Body[],
  fixtures: {} as Record<string, Fixture>,
  skip: vi.fn((condition: boolean) => {
    if (condition) throw new Error('skipped');
  }),
}));

const app = vi.hoisted(() => ({ openApp: vi.fn(), captureApp: vi.fn() }));

vi.mock('@playwright/test', () => ({
  test: Object.assign(
    (_title: string, body: Body) => {
      pw.registered.push(body);
    },
    {
      skip: pw.skip,
      extend: (fixtures: Record<string, Fixture>) => {
        pw.fixtures = fixtures;
        return Object.assign(
          (_title: string, body: Body) => {
            pw.appRegistered.push(body);
          },
          { skip: pw.skip },
        );
      },
    },
  ),
}));

vi.mock('./app.js', () => app);

const { defineCase } = await import('./defineCase.js');
const { test } = await import('./test.js');
const { scenarioCase } = await import('./scenario.js');

const driver = { deleteSession: vi.fn() };

beforeEach(() => {
  pw.registered.length = 0;
  pw.appRegistered.length = 0;
  pw.fixtures = {};
  pw.skip.mockClear();
  app.openApp.mockReset().mockResolvedValue(driver);
  app.captureApp.mockReset();
  driver.deleteSession.mockReset().mockResolvedValue(undefined);
});

function androidSpec(extra: { held?: string } = {}) {
  return defineCase({
    tcId: 'DEMO-A01',
    name: '앱 케이스',
    precondition: [],
    params: null,
    expected: null,
    platforms: ['android'],
    ...extra,
  });
}

// Playwright 는 fixture 를 쓰는 순간 만든다. 본문과 정리 단계를 같은 손잡이로 이어 준다
async function runApp(project: string): Promise<void> {
  await pw.fixtures.appSession({}, (session) =>
    pw.appRegistered[0]({ request: {}, appSession: session }, { project: { name: project } }),
  );
}

describe('test', () => {
  it('보류 케이스는 사유를 달고 본문을 돌리지 않는다', async () => {
    const spec = defineCase({
      tcId: 'DEMO-H01',
      name: '보류 케이스',
      precondition: [],
      params: null,
      expected: null,
      held: '보류 — 값이 없다',
    });
    const body = vi.fn();
    test(spec, body);

    await expect(pw.registered[0]({ page: {}, request: {} }, { project: { name: 'desktop' } })).rejects.toThrow('skipped');
    expect(pw.skip).toHaveBeenCalledWith(true, '보류 — 값이 없다');
    expect(body).not.toHaveBeenCalled();
  });

  it('android 케이스는 extend 로 만든 test 에 page 없이 등록된다', () => {
    test(androidSpec(), vi.fn());

    expect(pw.registered).toHaveLength(0);
    expect(pw.appRegistered).toHaveLength(1);
    const asked = /^(?:async\s*)?\(?\s*\{([^}]*)\}/.exec(pw.appRegistered[0].toString())?.[1];
    expect(asked?.split(',').map((n) => n.trim())).toEqual(['request', 'appSession']);
  });

  it('android 가 아닌 프로젝트에서는 건너뛰고 Appium 에 붙지 않는다', async () => {
    test(androidSpec(), vi.fn());

    await expect(runApp('desktop')).rejects.toThrow('skipped');
    expect(pw.skip).toHaveBeenCalledWith(true, 'DEMO-A01은 PC 환경을 선언하지 않았다');
    expect(app.openApp).not.toHaveBeenCalled();
  });

  it('보류 android 케이스도 Appium 에 붙지 않는다', async () => {
    test(androidSpec({ held: '보류 — 값이 없다' }), vi.fn());

    await expect(runApp('android')).rejects.toThrow('skipped');
    expect(app.openApp).not.toHaveBeenCalled();
  });

  it('android 프로젝트면 본문이 driver 를 받고 page 를 꺼내면 던진다', async () => {
    const body = vi.fn();
    test(androidSpec(), body);

    await runApp('android');

    expect(app.openApp).toHaveBeenCalledTimes(1);
    const args = body.mock.calls[0][0] as { driver: unknown; page: unknown };
    expect(args.driver).toBe(driver);
    expect(() => args.page).toThrow('DEMO-A01은 Android 앱 케이스라 page 가 없다 — driver 를 쓴다');
  });

  it('fixture 정리가 열린 연결을 닫고 안 열렸으면 건드리지 않는다', async () => {
    test(androidSpec(), vi.fn());

    await pw.fixtures.appSession({}, async (session) => {
      await session.open();
    });
    expect(driver.deleteSession).toHaveBeenCalledTimes(1);

    driver.deleteSession.mockClear();
    await pw.fixtures.appSession({}, async () => {});
    expect(driver.deleteSession).not.toHaveBeenCalled();
  });

  it('여는 중에 제한 시간이 끝나도 열린 뒤에 닫는다', async () => {
    test(androidSpec(), vi.fn());
    let opened: (d: typeof driver) => void = () => {};
    app.openApp.mockReturnValue(new Promise((resolve) => (opened = resolve)));

    let finished = false;
    const cleanup = pw.fixtures
      .appSession({}, async (session) => {
        void session.open();
      })
      .then(() => {
        finished = true;
      });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(finished).toBe(false);
    expect(driver.deleteSession).not.toHaveBeenCalled();

    opened(driver);
    await cleanup;
    expect(driver.deleteSession).toHaveBeenCalledTimes(1);
  });

  it('여는 것이 실패했으면 닫기를 시도하지 않고 닫지 못했다고도 알리지 않는다', async () => {
    test(androidSpec(), vi.fn());
    app.openApp.mockRejectedValue(new Error('PLATFORM_APP 이 필요하다'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await pw.fixtures.appSession({}, async (session) => {
      await session.open().catch(() => {});
    });

    expect(driver.deleteSession).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('연결을 못 닫아도 판정을 덮지 않고 이유를 알린다', async () => {
    test(androidSpec(), vi.fn());
    driver.deleteSession.mockRejectedValue(new Error('세션 없음'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await pw.fixtures.appSession({}, async (session) => {
      await session.open();
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('[kit] Appium 연결을 닫지 못했다: 세션 없음'));
    log.mockRestore();
  });

  it('브라우저 케이스 본문이 driver 를 꺼내면 던진다', async () => {
    const body = vi.fn();
    test(defineCase({ tcId: 'DEMO-B01', name: '브라우저', precondition: [], params: null, expected: null }), body);

    await pw.registered[0]({ page: {}, request: {} }, { project: { name: 'desktop' } });

    const args = body.mock.calls[0][0] as { driver: unknown };
    expect(() => args.driver).toThrow('DEMO-B01은 브라우저 케이스라 driver 가 없다');
  });

  it('브라우저 케이스 인자는 펼쳐도 던지지 않고 driver 가 열거되지 않는다', async () => {
    const body = vi.fn();
    test(defineCase({ tcId: 'DEMO-B03', name: '브라우저', precondition: [], params: null, expected: null }), body);

    await pw.registered[0]({ page: {}, request: {} }, { project: { name: 'desktop' } });

    const args = body.mock.calls[0][0] as object;
    expect(() => ({ ...args })).not.toThrow();
    const { page: _page, ...rest } = args as { page: unknown };
    expect(Object.keys(rest)).not.toContain('driver');
    expect(Object.keys(args)).not.toContain('driver');
  });

  it('앱 케이스 인자도 펼쳐도 던지지 않고 page 가 열거되지 않는다', async () => {
    const body = vi.fn();
    test(androidSpec(), body);

    await runApp('android');

    const args = body.mock.calls[0][0] as object;
    expect(() => ({ ...args })).not.toThrow();
    expect(Object.keys(args)).not.toContain('page');
  });

  it('시나리오 부품 본문이 driver 를 꺼내면 던진다', async () => {
    const body = vi.fn();
    process.env.PLATFORM_SCENARIO_MODE = '1';
    try {
      test(defineCase({ tcId: 'DEMO-B02', name: '부품', precondition: [], params: null, expected: null }), body);
    } finally {
      delete process.env.PLATFORM_SCENARIO_MODE;
    }

    await scenarioCase('DEMO-B02')?.({
      page: {} as never,
      request: {} as never,
      platform: 'desktop',
      params: null,
      expected: null,
      skipSteps: [],
      seq: 0,
    });

    const args = body.mock.calls[0][0] as { driver: unknown };
    expect(() => args.driver).toThrow('DEMO-B02은 브라우저 케이스라 driver 가 없다');
  });
});
