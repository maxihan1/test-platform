// 프로시저 실행 — 케이스 구간 · 케이스 판정(Blocked) · 케이스별 한도 · 프로시저 단위 앱 켜기 · 케이스별 게임 기록을 검사한다. Playwright · Appium · 게임 연결은 가짜로 바꿔 끼운다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

type Body = (fixtures: unknown, testInfo: unknown) => Promise<void>;
type Use = (session: { open(): Promise<unknown> }) => Promise<void>;
type Fixture = (deps: object, use: Use, testInfo?: object) => Promise<void>;

const pw = vi.hoisted(() => ({
  appRegistered: [] as Body[],
  fixtures: {} as Record<string, Fixture>,
  skip: vi.fn((condition: boolean, _reason?: string) => {
    if (condition) throw new Error('skipped');
  }),
}));
const app = vi.hoisted(() => ({ openApp: vi.fn(), captureApp: vi.fn(), closeApp: vi.fn(), readDevice: vi.fn() }));
const game = vi.hoisted(() => ({
  isGame: (env: Record<string, string | undefined>) => env.PLATFORM_ENGINE === 'GAME',
  openGame: vi.fn(),
  게임증적을남긴다: vi.fn(),
  captureGame: vi.fn(),
}));

vi.mock('@playwright/test', () => ({
  test: Object.assign(() => {}, {
    skip: pw.skip,
    extend: (fixtures: Record<string, Fixture>) => {
      pw.fixtures = fixtures;
      return Object.assign((_title: string, body: Body) => pw.appRegistered.push(body), { skip: pw.skip });
    },
  }),
}));
vi.mock('./app.js', () => app);
vi.mock('./game.js', () => game);

const { runScope } = await import('./context.js');
const { defineCase } = await import('./defineCase.js');
const { defineProcedure } = await import('./defineProcedure.js');
const { test } = await import('./test.js');
const { verify } = await import('./verify.js');

type 케이스선언 = ReturnType<typeof defineCase>;
type 장부꼴 = NonNullable<NonNullable<ReturnType<typeof runScope.getStore>>['proc']>;

const driver = { id: 'fake-driver' };
let 번호 = 0;
let 장부: 장부꼴 | undefined;

function 케이스(extra: { held?: string } = {}): 케이스선언 {
  번호 += 1;
  return defineCase({ tcId: `DEMO-FN-${String(번호).padStart(3, '0')}`, name: `케이스 ${String(번호)}`, platforms: ['android'], precondition: [], params: null, expected: null, ...extra });
}

/** 프로시저를 등록한다. 본문에 들어가면 케이스 장부를 잡아 둔다 — 판정은 이 줄에서 kit 밖으로 안 나간다 */
function 흐름(cases: 케이스선언[], 본문: Parameters<typeof test>[1] & ((args: never) => unknown), 머리: object = {}): void {
  번호 += 1;
  const procedure = defineProcedure({
    procId: `DEMO-TP-${String(번호).padStart(3, '0')}`,
    name: '흐름',
    platforms: ['android'],
    precondition: [],
    cases: cases as [케이스선언, ...케이스선언[]],
    ...머리,
  });
  test(procedure, async (args) => {
    장부 = runScope.getStore()?.proc;
    await (본문 as (a: unknown) => Promise<void>)(args);
  });
}

const 확인 = (제목: string, 실제: unknown, 기대: unknown, options?: { blocker: boolean }) => async (): Promise<void> => {
  await test.step(제목, async () => {
    await verify('값이 같다', 실제, 기대, options);
  });
};
const 깨짐 = (제목: string, 글: string) => async (): Promise<void> => {
  await test.step(제목, async () => {
    throw new Error(글);
  });
};

function 가짜정보(extra: object = {}) {
  return {
    project: { name: 'android' },
    timeout: 120_000,
    setTimeout: vi.fn(),
    attach: vi.fn(async (..._인자: unknown[]) => {}),
    status: 'passed',
    expectedStatus: 'passed',
    ...extra,
  };
}

// 본문과 정리 단계를 같은 손잡이로 이어 준다 — Playwright 가 fixture 를 쓰는 순간 만드는 것과 같다
async function 돌린다(testInfo = 가짜정보(), request: object = {}) {
  let 던짐: unknown;
  await pw.fixtures.appSession!(
    {},
    async (session) => {
      await pw.appRegistered.at(-1)!({ request, appSession: session }, testInfo).catch((err: unknown) => (던짐 = err));
    },
    testInfo,
  );
  return { testInfo, 던짐 };
}

/** 본문이 닿았다 까지 간 뒤 그 자리에서 Playwright 가 끊은 것처럼 정리 단계를 돌린다. 본문은 풀어 줄 때까지 멈춰 있다 */
async function 끊는다(닿았다: Promise<void>, status: string) {
  const testInfo = 가짜정보();
  let 본문: Promise<unknown> = Promise.resolve();
  await pw.fixtures.appSession!(
    {},
    async (session) => {
      본문 = pw.appRegistered.at(-1)!({ request: {}, appSession: session }, testInfo).catch((err: unknown) => err);
      await 닿았다;
      testInfo.status = status;
    },
    testInfo,
  );
  return { testInfo, 본문 };
}

const 판정들 = (): unknown[][] => (장부?.results ?? []).map((r) => [r?.tcId, r?.status, r?.error?.message, r?.blockedBy].filter((v) => v !== undefined));

function 절차들(testInfo: ReturnType<typeof 가짜정보>): unknown[][] {
  return testInfo.attach.mock.calls
    .filter(([이름]) => 이름 === 'platform-step')
    .map(([, 첨부]) => JSON.parse((첨부 as { body: string }).body) as { seq: number; title: string; tcId: string; status: string })
    .map((s) => [s.seq, s.title, s.tcId, s.status]);
}

beforeEach(() => {
  pw.appRegistered.length = 0;
  pw.skip.mockClear();
  장부 = undefined;
  app.openApp.mockReset().mockResolvedValue(driver);
  app.closeApp.mockReset().mockResolvedValue(undefined);
  app.captureApp.mockReset().mockResolvedValue(undefined);
  app.readDevice.mockReset().mockResolvedValue({ model: null, osVersion: null, appVersion: null });
  game.openGame.mockReset();
  game.게임증적을남긴다.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('케이스 판정', () => {
  it('판정 확인이 틀려도 그 케이스의 남은 절차와 다음 케이스가 돈다 — 절차는 든 케이스에 붙고 번호는 프로시저 전체에서 이어진다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.step('화면을 연다', async () => {});
      await test.case(a, async () => {
        await 확인('틀린 확인', 1, 2)();
        await 확인('남은 절차', 1, 1)();
      });
      await test.step('다음 준비', async () => {});
      await test.case(b, 확인('맞는 확인', 1, 1));
    });

    const { testInfo, 던짐 } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'PASS']]);
    expect(절차들(testInfo)).toEqual([
      [1, '화면을 연다', a.tcId, 'PASS'],
      [2, '틀린 확인', a.tcId, 'FAIL'],
      [3, '남은 절차', a.tcId, 'PASS'],
      [4, '다음 준비', b.tcId, 'PASS'],
      [5, '맞는 확인', b.tcId, 'PASS'],
    ]);
    expect(장부?.results[0]?.steps.map((s) => s.seq)).toEqual([1, 2, 3]);
    // 손으로 돌려도 빨갛게 끝난다
    expect(String(던짐)).toContain('검증 실패: 값이 같다');
    expect(app.openApp).toHaveBeenCalledTimes(1);
  });

  it('케이스가 다 통과면 테스트도 통과다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, 확인('둘째 확인', 1, 1));
    });

    const { 던짐 } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [b.tcId, 'PASS']]);
    expect(던짐).toBeUndefined();
  });

  it('앞 케이스가 실패한 뒤 준비 구간에서 깨지면 Blocked 다 — 남은 케이스도 스스로 틀린 그 케이스에 막힌다', async () => {
    const [a, b, c, d] = [케이스(), 케이스(), 케이스(), 케이스()];
    const 못간본문 = vi.fn();
    흐름([a, b, c, d], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.case(b, 확인('맞는 확인', 1, 1));
      await test.case(c, 깨짐('화면을 연다', '요소를 찾지 못했다'));
      await test.case(d, 못간본문);
    });

    const { 던짐 } = await 돌린다();

    expect(판정들()).toEqual([
      [a.tcId, 'FAIL'],
      [b.tcId, 'PASS'],
      [c.tcId, 'NA', 'BLOCKED', a.tcId],
      [d.tcId, 'NA', 'BLOCKED', a.tcId],
    ]);
    expect(못간본문).not.toHaveBeenCalled();
    // 못 간 케이스에는 시계가 없다
    expect(장부?.results[3]).toEqual({ tcId: d.tcId, status: 'NA', durationMs: 0, steps: [], error: { message: 'BLOCKED' }, blockedBy: a.tcId });
    expect((던짐 as Error).message).toBe('요소를 찾지 못했다');
  });

  it('앞 케이스가 다 통과면 준비 구간에서 깨져도 그 케이스의 실패다 — 케이스 사이 절차는 다음 케이스 것이다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    흐름([a, b, c], async () => {
      await test.case(a, 확인('맞는 확인', 1, 1));
      await 깨짐('다음 화면을 연다', '화면이 안 뜬다')();
      await test.case(b, 확인('안 도는 확인', 1, 1));
      await test.case(c, 확인('안 도는 확인 2', 1, 1));
    });

    const { testInfo } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [b.tcId, 'FAIL', '화면이 안 뜬다'], [c.tcId, 'NA', 'BLOCKED', b.tcId]]);
    expect(절차들(testInfo).at(-1)).toEqual([2, '다음 화면을 연다', b.tcId, 'FAIL']);
  });

  it('첫 판정 확인 뒤에 깨지면 앞에 실패가 있어도 그 케이스의 실패다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.case(b, async () => {
        await 확인('맞는 확인', 1, 1)();
        await 깨짐('다음 조작', '버튼이 없다')();
      });
    });

    await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'FAIL', '버튼이 없다']]);
  });

  it('blocker 확인이 틀린 것은 깨진 것이 아니다 — 앞에 실패가 있어도 그 케이스의 실패이고 흐름이 멈춘다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    흐름([a, b, c], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.case(b, 확인('준비가 됐나', 1, 2, { blocker: true }));
      await test.case(c, 확인('안 도는 확인', 1, 1));
    });

    const { 던짐 } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'FAIL'], [c.tcId, 'NA', 'BLOCKED', b.tcId]]);
    expect(String(던짐)).toContain('검증 실패');
  });

  it('폰 연결을 못 열면 첫 케이스의 실패다 — 첫 케이스의 준비 구간에는 폰 연결과 앱 켜기가 든다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], vi.fn());
    app.openApp.mockImplementation(async () => {
      장부 = runScope.getStore()?.proc;
      throw new Error('PLATFORM_APP 이 필요하다');
    });

    await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'FAIL', 'PLATFORM_APP 이 필요하다'], [b.tcId, 'NA', 'BLOCKED', a.tcId]]);
  });

  it('test.case 를 빼먹거나 차례가 틀리면 초록으로 두지 않고 그 차례 케이스의 실패로 남긴다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('맞는 확인', 1, 1));
    });
    await 돌린다();
    expect(판정들()).toEqual([[a.tcId, 'PASS'], [b.tcId, 'FAIL', `${b.tcId}: test.case 를 부르지 않고 본문이 끝났다`]]);

    const [c, d] = [케이스(), 케이스()];
    흐름([c, d], async () => {
      await test.case(d, 확인('먼저 부른 확인', 1, 1));
    });
    await 돌린다();
    expect(판정들()).toEqual([[c.tcId, 'FAIL', `test.case(${d.tcId})가 cases 차례와 다르다 — ${c.tcId} 차례다`], [d.tcId, 'NA', 'BLOCKED', c.tcId]]);
  });
});

describe('보류 케이스', () => {
  it('그 구간만 건너뛰고 뒤 케이스는 그대로 돈다 — 나머지가 통과면 테스트도 통과다', async () => {
    const [a, h, c] = [케이스(), 케이스({ held: '보류 — 값이 없다' }), 케이스()];
    const 보류본문 = vi.fn();
    흐름([a, h, c], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(h, 보류본문);
      await test.case(c, 확인('셋째 확인', 1, 1));
    });

    const { 던짐 } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [h.tcId, 'NA', '보류 — 값이 없다'], [c.tcId, 'PASS']]);
    expect(보류본문).not.toHaveBeenCalled();
    expect(던짐).toBeUndefined();
  });

  it('뒤 케이스를 막지 않는다 — 보류 앞의 준비 절차는 다음 케이스 것이고 거기서 깨지면 그 케이스의 실패다', async () => {
    const [a, h, c] = [케이스(), 케이스({ held: '보류 — 값이 없다' }), 케이스()];
    흐름([a, h, c], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await 깨짐('보류 케이스 준비', '화면이 안 뜬다')();
      await test.case(h, vi.fn());
      await test.case(c, 확인('셋째 확인', 1, 1));
    });

    const { testInfo } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [h.tcId, 'NA', '보류 — 값이 없다'], [c.tcId, 'FAIL', '화면이 안 뜬다']]);
    expect(절차들(testInfo).at(-1)).toEqual([2, '보류 케이스 준비', c.tcId, 'FAIL']);
  });

  it('맨 뒤 보류 케이스의 준비 절차는 돌리지 않는다 — 붙을 케이스가 없다', async () => {
    const [a, h] = [케이스(), 케이스({ held: '보류 — 값이 없다' })];
    const 준비 = vi.fn();
    흐름([a, h], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.step('보류 케이스 준비', 준비);
      await test.case(h, vi.fn());
    });

    const { 던짐 } = await 돌린다();

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [h.tcId, 'NA', '보류 — 값이 없다']]);
    expect(준비).not.toHaveBeenCalled();
    expect(던짐).toBeUndefined();
  });

  it('케이스가 모두 보류면 폰 연결을 열지 않고 통째로 건너뛴다', async () => {
    흐름([케이스({ held: '보류 1' }), 케이스({ held: '보류 2' })], vi.fn());

    const { 던짐 } = await 돌린다();

    expect((던짐 as Error).message).toBe('skipped');
    expect(pw.skip.mock.calls.at(-1)?.[1]).toMatch(/^DEMO-TP-\d{3}의 케이스가 모두 보류다$/);
    expect(app.openApp).not.toHaveBeenCalled();
  });
});

describe('케이스별 한도', () => {
  it('앞 케이스가 끝날 때마다 지난 시간에 케이스 한도를 더해 다시 건다 — 케이스의 시계는 앞 케이스가 끝난 때부터다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    const 흐른다 = (ms: number) => async (): Promise<void> => {
      vi.setSystemTime(Date.now() + ms);
      await 확인(`확인 ${String(ms)}`, 1, 1)();
    };
    흐름([a, b, c], async () => {
      await test.case(a, 흐른다(1_500));
      await test.case(b, 흐른다(2_000));
      await test.case(c, 흐른다(500));
    });

    const { testInfo } = await 돌린다();

    // 마지막 케이스 뒤에는 걸 한도가 없다
    expect(testInfo.setTimeout.mock.calls).toEqual([[121_500], [123_500]]);
    expect(장부?.results.map((r) => r?.durationMs)).toEqual([1_500, 2_000, 500]);
    expect(장부?.results[1]?.startedAt).toBe(장부?.results[0]?.finishedAt);
  });

  it('한도를 끈 채 돌리면 다시 걸지 않는다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, 확인('둘째 확인', 1, 1));
    });

    const { testInfo } = await 돌린다(가짜정보({ timeout: 0 }));

    expect(testInfo.setTimeout).not.toHaveBeenCalled();
  });

  it('본문이 한도에 끊기면 정리 단계에서 끊긴 케이스는 제한 시간 초과로, 남은 케이스는 Blocked 로 가른다 — 뒤늦게 끝난 본문이 판정을 덮지 않는다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    let 풀기 = (): void => {};
    let 닿음 = (): void => {};
    const 걸림 = new Promise<void>((resolve) => (풀기 = resolve));
    const 닿았다 = new Promise<void>((resolve) => (닿음 = resolve));
    const 정리 = vi.fn(async () => {});
    흐름([a, b, c], async () => {
      await test.cleanup('올린 글을 지운다', 정리);
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, async () => {
        await test.step('확인 뒤에 멈춘다', async () => {
          await verify('값이 같다', 1, 1);
          닿음();
          await 걸림;
        });
      });
      await test.case(c, 확인('안 도는 확인', 1, 1));
    });

    const { testInfo, 본문 } = await 끊는다(닿았다, 'timedOut');

    const 끊긴뒤 = [[a.tcId, 'PASS'], [b.tcId, 'NA', 'Test timeout of 120000ms exceeded.'], [c.tcId, 'NA', 'BLOCKED', b.tcId]];
    expect(판정들()).toEqual(끊긴뒤);
    expect(장부?.results[1]?.startedAt).toBeDefined();
    expect(장부?.results[1]?.finishedAt).toBeUndefined();
    // 끝 정리는 마지막으로 돈 케이스에 붙는다
    expect(절차들(testInfo).filter(([, 제목]) => String(제목).includes('정리'))).toEqual([
      [1, '시작 정리 — 올린 글을 지운다', a.tcId, 'PASS'],
      [4, '끝 정리 — 올린 글을 지운다', b.tcId, 'PASS'],
    ]);

    풀기();
    await 본문;
    expect(판정들()).toEqual(끊긴뒤);
  });

  it('앞 케이스가 실패한 뒤 준비 구간에서 한도에 끊기면 Blocked 다', async () => {
    const [a, b] = [케이스(), 케이스()];
    let 닿음 = (): void => {};
    const 닿았다 = new Promise<void>((resolve) => (닿음 = resolve));
    흐름([a, b], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.step('화면을 기다린다', async () => {
        닿음();
        await new Promise(() => {});
      });
      await test.case(b, 확인('안 도는 확인', 1, 1));
    });

    await 끊는다(닿았다, 'timedOut');

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'NA', 'BLOCKED', a.tcId]]);
  });

  it('사람이 멈춘 것은 kit 이 가르지 않는다 — 막은 것이 케이스가 아니다', async () => {
    const [a, b] = [케이스(), 케이스()];
    let 닿음 = (): void => {};
    const 닿았다 = new Promise<void>((resolve) => (닿음 = resolve));
    흐름([a, b], async () => {
      await test.case(a, async () => {
        await test.step('멈춘다', async () => {
          닿음();
          await new Promise(() => {});
        });
      });
      await test.case(b, 확인('안 도는 확인', 1, 1));
    });

    await 끊는다(닿았다, 'interrupted');

    expect(장부?.results).toEqual([undefined, undefined]);
  });
});

describe('프로시저 본문과 케이스 구간', () => {
  it('앱은 프로시저에 적은 설정으로 한 번 켠다 — 실어 켤 값은 첫 케이스의 입력값으로 만든다', async () => {
    const 첫째 = defineCase({
      tcId: 'DEMO-FN-901',
      name: '로그인된 채 켠다',
      platforms: ['android'],
      precondition: [],
      params: z.object({ loginId: z.string().default('qa1') }),
      expected: null,
    });
    const 둘째 = 케이스();
    흐름(
      [첫째, 둘째],
      async () => {
        await test.case(첫째, 확인('첫 확인', 1, 1));
        await test.case(둘째, 확인('둘째 확인', 1, 1));
      },
      { keepAppData: true, launchIntent: async (params: { loginId: string }) => ({ activity: '.Main', extras: { id: params.loginId } }) },
    );

    await 돌린다();

    expect(app.openApp).toHaveBeenCalledTimes(1);
    expect(app.openApp.mock.calls[0]?.[1]).toEqual({ keepData: true, intent: { activity: '.Main', extras: { id: 'qa1' } } });
    expect(app.closeApp).toHaveBeenCalledTimes(1);
  });

  it('케이스 구간은 그 케이스 선언의 스키마로 검증한 입력값 · 기대값을 받고 프로시저 본문에는 그 칸이 없다', async () => {
    const 글자수 = defineCase({
      tcId: 'DEMO-FN-902',
      name: '글자 수',
      platforms: ['android'],
      precondition: [],
      params: z.object({ 본문: z.string().default('가나다') }),
      expected: z.object({ 남은글자: z.string().default('497') }),
    });
    let 받은: unknown;
    let 본문칸: unknown;
    흐름([글자수], async (args: object) => {
      try {
        void (args as { params: unknown }).params;
      } catch (err) {
        본문칸 = (err as Error).message;
      }
      await test.case(글자수, async (칸) => {
        받은 = 칸;
        await 확인('확인', 1, 1)();
      });
    });

    await 돌린다();

    expect(받은).toEqual({ params: { 본문: '가나다' }, expected: { 남은글자: '497' } });
    expect(본문칸).toMatch(/^DEMO-TP-\d{3}은 프로시저라 본문에 params 가 없다 — 케이스마다 test\.case 가 넘긴다$/);
  });

  it('게임 기록은 케이스마다 따로 모은다 — 준비 구간에서 남긴 것까지 그 케이스 것이다', async () => {
    vi.stubEnv('PLATFORM_ENGINE', 'GAME');
    vi.stubEnv('PLATFORM_BASE_URL', 'https://ash.example.com');
    game.openGame.mockResolvedValue({ id: 'fake-game', 입력을거둔다: vi.fn(async () => {}) });
    const 응답 = { status: () => 200, text: async () => '{}' };
    const request = { get: vi.fn(async () => 응답), post: vi.fn(async () => 응답) };
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async (args: { request: { get(u: string): Promise<unknown>; post(u: string): Promise<unknown> } }) => {
      await test.case(a, async () => {
        await test.step('검을 본다', async () => {
          await args.request.get('/items/1');
          await verify.element('공격력이 같다', 'item:sword', 10, 10);
        });
      });
      await test.step('골드를 넣는다', async () => {
        await args.request.post('/admin/gold');
      });
      await test.case(b, async () => {
        await test.step('방패를 본다', async () => {
          await verify.element('방어력이 같다', 'item:shield', 5, 7);
        });
      });
    });

    await 돌린다(가짜정보(), request);

    expect(장부?.results.map((r) => [r?.elementChecks, r?.apiCalls])).toEqual([
      [[{ key: 'item:sword', serverValue: 10, same: true }], [{ method: 'GET', path: '/items/:n', status: 200 }]],
      [[{ key: 'item:shield', serverValue: 5, same: false }], [{ method: 'POST', path: '/admin/gold', status: 200 }]],
    ]);
  });

  it('test.case 는 프로시저 본문 맨 바깥에서만 부른다', async () => {
    const [a] = [케이스()];
    await expect(test.case(a, vi.fn())).rejects.toThrow(`test.case(${a.tcId})를 프로시저 밖에서 불렀다`);

    흐름([a], async () => {
      await test.step('절차 안', async () => {
        await test.case(a, vi.fn());
      });
    });
    await 돌린다();
    expect(판정들()).toEqual([[a.tcId, 'FAIL', `test.case(${a.tcId})를 절차 안에서 불렀다. 본문 맨 바깥에서만 부른다`]]);
  });

  it('선언하지 않은 환경에서는 건너뛰고 폰 연결을 열지 않는다', async () => {
    흐름([케이스()], vi.fn());

    const { 던짐 } = await 돌린다(가짜정보({ project: { name: 'desktop' } }));

    expect((던짐 as Error).message).toBe('skipped');
    expect(pw.skip.mock.calls.at(-1)?.[1]).toMatch(/^DEMO-TP-\d{3}은 PC 환경을 선언하지 않았다$/);
    expect(app.openApp).not.toHaveBeenCalled();
  });
});
