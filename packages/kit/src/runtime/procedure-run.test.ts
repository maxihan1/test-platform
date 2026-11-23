// 프로시저 실행 — 케이스별 한도 · 한도에 끊긴 본문의 마감 · 프로시저 단위 앱 켜기 · 케이스 구간 인자 · 케이스별 게임 기록을 검사한다. Playwright · Appium · 게임 연결은 가짜로 바꿔 끼운다
// 케이스 판정 표는 procedure.test.ts 에 있다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Body, Fixture } from './procedure-fake.js';

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

const { 가짜정보, 끊는다, 돌린다, 장부, 장부를비운다, 절차들, 케이스, 판정들, 확인, 흐름 } = await import('./procedure-fake.js');
const { test } = await import('./test.js');
const { verify } = await import('./verify.js');

/** 본문이 어디까지 갔는지 알리는 손잡이와, 풀어 줄 때까지 멈춰 있는 자리 */
function 멈춤자리() {
  let 닿음 = (): void => {};
  let 풀기 = (): void => {};
  const 닿았다 = new Promise<void>((resolve) => (닿음 = resolve));
  const 걸림 = new Promise<void>((resolve) => (풀기 = resolve));
  return { 닿았다, 풀기, 멈춘다: async (): Promise<void> => { 닿음(); await 걸림; } };
}

beforeEach(() => {
  pw.appRegistered.length = 0;
  pw.skip.mockClear();
  장부를비운다();
  app.openApp.mockReset().mockResolvedValue({ id: 'fake-driver' });
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

    const { testInfo } = await 돌린다(pw);

    // 마지막 케이스 뒤에는 걸 한도가 없다
    expect(testInfo.setTimeout.mock.calls).toEqual([[121_500], [123_500]]);
    expect(장부()?.results.map((r) => r?.durationMs)).toEqual([1_500, 2_000, 500]);
    expect(장부()?.results[1]?.startedAt).toBe(장부()?.results[0]?.finishedAt);
  });

  it('한도를 끈 채 돌리면 다시 걸지 않는다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, 확인('둘째 확인', 1, 1));
    });

    const { testInfo } = await 돌린다(pw, 가짜정보({ timeout: 0 }));

    expect(testInfo.setTimeout).not.toHaveBeenCalled();
  });

  it('본문이 한도에 끊기면 정리 단계에서 끊긴 케이스는 제한 시간 초과로, 남은 케이스는 Blocked 로 가른다 — 뒤늦게 끝난 본문이 판정을 덮지 않는다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    const 자리 = 멈춤자리();
    흐름([a, b, c], async () => {
      await test.cleanup('올린 글을 지운다', async () => {});
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, async () => {
        await test.step('확인 뒤에 멈춘다', async () => {
          await verify('값이 같다', 1, 1);
          await 자리.멈춘다();
        });
      });
      await test.case(c, 확인('안 도는 확인', 1, 1));
    });

    const { testInfo, 본문 } = await 끊는다(pw, 자리.닿았다, 'timedOut');

    const 끊긴뒤 = [[a.tcId, 'PASS'], [b.tcId, 'NA', 'Test timeout of 120000ms exceeded.'], [c.tcId, 'NA', 'BLOCKED', b.tcId]];
    expect(판정들()).toEqual(끊긴뒤);
    expect(장부()?.results[1]?.startedAt).toBeDefined();
    expect(장부()?.results[1]?.finishedAt).toBeUndefined();
    // 시작 정리는 첫 케이스에, 끝 정리는 마지막으로 돈 케이스에 붙는다
    expect(절차들(testInfo).filter(([, 제목]) => String(제목).includes('정리'))).toEqual([
      [1, '시작 정리 — 올린 글을 지운다', a.tcId, 'PASS'],
      [4, '끝 정리 — 올린 글을 지운다', b.tcId, 'PASS'],
    ]);

    자리.풀기();
    await 본문;
    expect(판정들()).toEqual(끊긴뒤);
  });

  it('앞 케이스가 실패한 뒤 준비 구간에서 한도에 끊기면 Blocked 다', async () => {
    const [a, b] = [케이스(), 케이스()];
    const 자리 = 멈춤자리();
    흐름([a, b], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.step('화면을 기다린다', 자리.멈춘다);
      await test.case(b, 확인('안 도는 확인', 1, 1));
    });

    await 끊는다(pw, 자리.닿았다, 'timedOut');

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'NA', 'BLOCKED', a.tcId]]);
  });

  it('사람이 멈춘 것은 kit 이 가르지 않는다 — 막은 것이 케이스가 아니다', async () => {
    const [a, b] = [케이스(), 케이스()];
    const 자리 = 멈춤자리();
    흐름([a, b], async () => {
      await test.case(a, async () => {
        await test.step('멈춘다', 자리.멈춘다);
      });
      await test.case(b, 확인('안 도는 확인', 1, 1));
    });

    await 끊는다(pw, 자리.닿았다, 'interrupted');

    expect(장부()?.results).toEqual([undefined, undefined]);
  });
});

describe('프로시저 본문과 케이스 구간', () => {
  it('앱은 프로시저에 적은 설정으로 한 번 켠다 — 실어 켤 값은 첫 케이스의 입력값으로 만든다', async () => {
    const [첫째, 둘째] = [케이스({ params: z.object({ loginId: z.string().default('qa1') }) }), 케이스()];
    흐름(
      [첫째, 둘째],
      async () => {
        await test.case(첫째, 확인('첫 확인', 1, 1));
        await test.case(둘째, 확인('둘째 확인', 1, 1));
      },
      { keepAppData: true, launchIntent: async (params) => ({ activity: '.Main', extras: { id: (params as { loginId: string }).loginId } }) },
    );

    await 돌린다(pw);

    expect(app.openApp).toHaveBeenCalledTimes(1);
    expect(app.openApp.mock.calls[0]?.[1]).toEqual({ keepData: true, intent: { activity: '.Main', extras: { id: 'qa1' } } });
    expect(app.closeApp).toHaveBeenCalledTimes(1);
  });

  it('케이스 구간은 그 케이스 선언의 스키마로 검증한 입력값 · 기대값을 받고 프로시저 본문에는 그 칸이 없다', async () => {
    const 글자수 = 케이스({ params: z.object({ 본문: z.string().default('가나다') }), expected: z.object({ 남은글자: z.string().default('497') }) });
    let 받은: unknown;
    let 본문칸: unknown;
    흐름([글자수], async (args) => {
      try {
        void (args as unknown as { params: unknown }).params;
      } catch (err) {
        본문칸 = (err as Error).message;
      }
      await test.case(글자수, async (칸) => {
        받은 = 칸;
        await 확인('확인', 1, 1)();
      });
    });

    await 돌린다(pw);

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
    흐름([a, b], async (args) => {
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

    await 돌린다(pw, 가짜정보(), request);

    expect(장부()?.results.map((r) => [r?.elementChecks, r?.apiCalls])).toEqual([
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
    await 돌린다(pw);
    expect(판정들()).toEqual([[a.tcId, 'FAIL', `test.case(${a.tcId})를 절차 안에서 불렀다. 본문 맨 바깥에서만 부른다`]]);
  });

  it('케이스가 모두 보류면 폰 연결을 열지 않고 통째로 건너뛴다', async () => {
    흐름([케이스({ held: '보류 1' }), 케이스({ held: '보류 2' })], vi.fn());

    const { 던짐 } = await 돌린다(pw);

    expect((던짐 as Error).message).toBe('skipped');
    expect(pw.skip.mock.calls.at(-1)?.[1]).toMatch(/^DEMO-TP-\d{3}의 케이스가 모두 보류다$/);
    expect(app.openApp).not.toHaveBeenCalled();
  });

  it('선언하지 않은 환경에서는 건너뛰고 폰 연결을 열지 않는다', async () => {
    흐름([케이스()], vi.fn());

    const { 던짐 } = await 돌린다(pw, 가짜정보({ project: { name: 'desktop' } }));

    expect((던짐 as Error).message).toBe('skipped');
    expect(pw.skip.mock.calls.at(-1)?.[1]).toMatch(/^DEMO-TP-\d{3}은 PC 환경을 선언하지 않았다$/);
    expect(app.openApp).not.toHaveBeenCalled();
  });
});
