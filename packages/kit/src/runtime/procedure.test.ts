// 프로시저 실행 — 케이스 구간과 케이스 판정(통과 · 실패 · Blocked · 보류)을 검사한다. Playwright · Appium 연결은 가짜로 바꿔 끼운다
// 한도 · 앱 켜기 · 건너뛰기 · 게임 기록은 procedure-run.test.ts 에 있다

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Body, Fixture } from './procedure-fake.js';

const pw = vi.hoisted(() => ({ appRegistered: [] as Body[], fixtures: {} as Record<string, Fixture> }));
const app = vi.hoisted(() => ({ openApp: vi.fn(), captureApp: vi.fn(), closeApp: vi.fn(), readDevice: vi.fn() }));

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

const { 깨짐, 돌린다, 장부, 장부를비운다, 장부를잡는다, 절차들, 케이스, 판정들, 확인, 흐름 } = await import('./procedure-fake.js');
const { test } = await import('./test.js');

beforeEach(() => {
  pw.appRegistered.length = 0;
  장부를비운다();
  app.openApp.mockReset().mockResolvedValue({ id: 'fake-driver' });
  app.closeApp.mockReset().mockResolvedValue(undefined);
  app.captureApp.mockReset().mockResolvedValue(undefined);
  app.readDevice.mockReset().mockResolvedValue({ model: null, osVersion: null, appVersion: null });
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

    const { testInfo, 던짐 } = await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'PASS']]);
    expect(절차들(testInfo)).toEqual([
      [1, '화면을 연다', a.tcId, 'PASS'],
      [2, '틀린 확인', a.tcId, 'FAIL'],
      [3, '남은 절차', a.tcId, 'PASS'],
      [4, '다음 준비', b.tcId, 'PASS'],
      [5, '맞는 확인', b.tcId, 'PASS'],
    ]);
    expect(장부()?.results[0]?.steps.map((s) => s.seq)).toEqual([1, 2, 3]);
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

    const { 던짐 } = await 돌린다(pw);

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

    const { 던짐 } = await 돌린다(pw);

    expect(판정들()).toEqual([
      [a.tcId, 'FAIL'],
      [b.tcId, 'PASS'],
      [c.tcId, 'NA', 'BLOCKED', a.tcId],
      [d.tcId, 'NA', 'BLOCKED', a.tcId],
    ]);
    expect(못간본문).not.toHaveBeenCalled();
    // 못 간 케이스에는 시계가 없다
    expect(장부()?.results[3]).toEqual({ tcId: d.tcId, status: 'NA', durationMs: 0, steps: [], error: { message: 'BLOCKED' }, blockedBy: a.tcId });
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

    const { testInfo } = await 돌린다(pw);

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

    await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'FAIL', '버튼이 없다']]);
  });

  it('blocker 확인이 틀린 것은 깨진 것이 아니다 — 앞에 실패가 있어도 그 케이스의 실패이고 흐름이 멈춘다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    흐름([a, b, c], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.case(b, 확인('준비가 됐나', 1, 2, { blocker: true }));
      await test.case(c, 확인('안 도는 확인', 1, 1));
    });

    const { 던짐 } = await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'FAIL'], [c.tcId, 'NA', 'BLOCKED', b.tcId]]);
    expect(String(던짐)).toContain('검증 실패');
  });

  it('본문이 절차의 예외를 삼키고 넘어가도 깨진 것으로 가른다 — 틀린 blocker 확인이 없는 멈춤은 판정이 아니다', async () => {
    const 삼킨다 = async (제목: string): Promise<void> => {
      try {
        await 깨짐(제목, '팝업을 찾지 못했다')();
      } catch {
        // 케이스 파일이 팝업 닫기 같은 절차를 이렇게 감싼다
      }
    };
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await 삼킨다('팝업을 닫는다');
      await test.case(b, 확인('안 도는 확인', 1, 1));
    });
    await 돌린다(pw);
    expect(판정들()).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'NA', 'BLOCKED', a.tcId]]);

    const [c, d] = [케이스(), 케이스()];
    흐름([c, d], async () => {
      await test.case(c, async () => {
        await 삼킨다('팝업을 닫는다 2');
      });
      await test.case(d, 확인('안 도는 확인 2', 1, 1));
    });
    await 돌린다(pw);
    expect(판정들()).toEqual([[c.tcId, 'FAIL', '팝업을 찾지 못했다'], [d.tcId, 'NA', 'BLOCKED', c.tcId]]);
  });

  it('입력값이 케이스 선언의 스키마와 안 맞으면 그 케이스가 준비 구간에서 깨진 것이다', async () => {
    const 못채운 = (): ReturnType<typeof 케이스> => 케이스({ params: z.object({ 본문: z.string() }) });
    const [a, b] = [케이스(), 못채운()];
    const 본문 = vi.fn();
    흐름([a, b], async () => {
      await test.case(a, 확인('맞는 확인', 1, 1));
      await test.case(b, 본문);
    });
    await 돌린다(pw);
    expect(판정들()[1]?.slice(0, 2)).toEqual([b.tcId, 'FAIL']);
    expect(판정들()[1]?.[2]).toContain(`${b.tcId}의 입력값이 명세와 맞지 않는다`);
    expect(본문).not.toHaveBeenCalled();

    const [c, d] = [케이스(), 못채운()];
    흐름([c, d], async () => {
      await test.case(c, 확인('틀린 확인', 1, 2));
      await test.case(d, 본문);
    });
    await 돌린다(pw);
    expect(판정들()).toEqual([[c.tcId, 'FAIL'], [d.tcId, 'NA', 'BLOCKED', c.tcId]]);
  });

  it('폰 연결을 못 열면 첫 케이스의 실패다 — 첫 케이스의 준비 구간에는 폰 연결과 앱 켜기가 든다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], vi.fn());
    app.openApp.mockImplementation(async () => {
      장부를잡는다();
      throw new Error('PLATFORM_APP 이 필요하다');
    });

    await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'FAIL', 'PLATFORM_APP 이 필요하다'], [b.tcId, 'NA', 'BLOCKED', a.tcId]]);
  });

  it('test.case 를 빼먹거나 차례가 틀리면 초록으로 두지 않고 그 차례 케이스의 실패로 남긴다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.case(a, 확인('맞는 확인', 1, 1));
    });
    await 돌린다(pw);
    expect(판정들()).toEqual([[a.tcId, 'PASS'], [b.tcId, 'FAIL', `${b.tcId}: test.case 를 부르지 않고 본문이 끝났다`]]);

    const [c, d] = [케이스(), 케이스()];
    흐름([c, d], async () => {
      await test.case(d, 확인('먼저 부른 확인', 1, 1));
    });
    await 돌린다(pw);
    expect(판정들()).toEqual([[c.tcId, 'FAIL', `test.case(${d.tcId})가 cases 차례와 다르다 — ${c.tcId} 차례다`], [d.tcId, 'NA', 'BLOCKED', c.tcId]]);
  });

  it('마지막 케이스 뒤에 둔 절차는 돌지 않고 테스트가 실패로 끝난다 — 붙을 케이스가 없어 판정에는 안 남는다', async () => {
    const [a] = [케이스()];
    const 뒤절차 = vi.fn();
    흐름([a], async () => {
      await test.case(a, 확인('맞는 확인', 1, 1));
      await test.step('잔액을 본다', 뒤절차);
    });

    const { 던짐 } = await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'PASS']]);
    expect(뒤절차).not.toHaveBeenCalled();
    expect((던짐 as Error).message).toMatch(/^DEMO-TP-\d{3}: 마지막 케이스 뒤에 절차를 두었거나 test\.case 를 다시 불렀다/);
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

    const { 던짐 } = await 돌린다(pw);

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

    const { testInfo } = await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [h.tcId, 'NA', '보류 — 값이 없다'], [c.tcId, 'FAIL', '화면이 안 뜬다']]);
    expect(절차들(testInfo).at(-1)).toEqual([2, '보류 케이스 준비', c.tcId, 'FAIL']);
  });

  it('맨 뒤 보류 케이스의 준비 절차는 돌리지 않는다 — 붙을 케이스가 없고 테스트는 통과다', async () => {
    const [a, h] = [케이스(), 케이스({ held: '보류 — 값이 없다' })];
    const 준비 = vi.fn();
    흐름([a, h], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.step('보류 케이스 준비', 준비);
      await test.case(h, vi.fn());
    });

    const { 던짐 } = await 돌린다(pw);

    expect(판정들()).toEqual([[a.tcId, 'PASS'], [h.tcId, 'NA', '보류 — 값이 없다']]);
    expect(준비).not.toHaveBeenCalled();
    expect(던짐).toBeUndefined();
  });
});
