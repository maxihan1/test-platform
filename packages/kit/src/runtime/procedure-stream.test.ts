// 프로시저 실행 — 케이스 판정을 밖으로 내는 것(첨부 · stdout 줄) · 진행 줄의 케이스 · 러너가 넘긴 케이스별 입력 · 바뀐 프로시저를 검사한다. Playwright · Appium 연결은 가짜로 바꿔 끼운다
// 판정 표는 procedure.test.ts, 한도 · 앱 켜기는 procedure-run.test.ts 에 있다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { CaseResult, StepProgress } from '../types.js';
import type { Body, Fixture } from './procedure-fake.js';

const pw = vi.hoisted(() => ({
  appRegistered: [] as Body[],
  fixtures: {} as Record<string, Fixture>,
  skip: vi.fn((condition: boolean, _reason?: string) => {
    if (condition) throw new Error('skipped');
  }),
}));
const app = vi.hoisted(() => ({ openApp: vi.fn(), captureApp: vi.fn(), closeApp: vi.fn(), readDevice: vi.fn() }));

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

const { 가짜정보, 깨짐, 끊는다, 낸것, 낸판정들, 돌린다, 장부를비운다, 케이스, 확인, 흐름 } = await import('./procedure-fake.js');
const { CASE_MARKER, PROCEDURE_CHANGED, PROGRESS_MARKER } = await import('./protocol.js');
const { test } = await import('./test.js');
const { verify } = await import('./verify.js');

const 쓴 = vi.spyOn(process.stdout, 'write');
/** kit 이 stdout 에 쓴 줄 가운데 그 표시자로 시작하는 것의 몸통. 판정 줄은 앞에 줄바꿈을 하나 둔다 */
function 줄들<T>(표시자: string): T[] {
  return 쓴.mock.calls
    .map(([글]) => String(글).replace(/^\n/, ''))
    .filter((글) => 글.startsWith(표시자) && 글.endsWith('\n'))
    .map((글) => JSON.parse(글.slice(표시자.length)) as T);
}

beforeEach(() => {
  pw.appRegistered.length = 0;
  pw.skip.mockClear();
  장부를비운다();
  app.openApp.mockReset().mockResolvedValue({ id: 'fake-driver' });
  app.closeApp.mockReset().mockResolvedValue(undefined);
  app.captureApp.mockReset().mockResolvedValue(undefined);
  app.readDevice.mockReset().mockResolvedValue({ model: null, osVersion: null, appVersion: null });
  쓴.mockReset().mockReturnValue(true);
  // 러너가 붙인 실행 — 줄은 이때만 쓴다
  vi.stubEnv('PLATFORM_HISTORY_ID', '77');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('판정 흘려보내기', () => {
  it('케이스가 끝나는 대로 판정을 첨부와 stdout 줄로 낸다 — 다음 케이스가 돌기 전에 나가 있다', async () => {
    const [a, b] = [케이스(), 케이스()];
    const 정보 = 가짜정보();
    let 둘째전: unknown[][] = [];
    흐름([a, b], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      둘째전 = 낸판정들(정보);
      await test.case(b, 확인('틀린 확인', 1, 2));
    });

    await 돌린다(pw, 정보);

    expect(둘째전).toEqual([[a.tcId, 'PASS']]);
    expect(낸판정들(정보)).toEqual([[a.tcId, 'PASS'], [b.tcId, 'FAIL']]);
    // 러너가 읽는 줄은 첨부와 같은 것이다 — 절차까지 실려 있다
    expect(줄들<CaseResult>(CASE_MARKER)).toEqual(낸것(정보));
    expect(낸것(정보)[1]?.steps.map((s) => [s.title, s.tcId, s.status])).toEqual([['틀린 확인', b.tcId, 'FAIL']]);
    // 케이스 코드가 줄바꿈 없이 찍은 글 뒤에 붙어도 표시자가 줄 첫머리에 온다 — 아니면 러너가 그 판정을 놓친다
    const 판정글 = 쓴.mock.calls.map(([글]) => String(글)).filter((글) => 글.includes(CASE_MARKER));
    expect(판정글.every((글) => 글.startsWith(`\n${CASE_MARKER}`))).toBe(true);
  });

  it('사람이 손으로 돌리면 stdout 줄은 쓰지 않고 첨부만 남긴다 — 읽을 러너가 없다', async () => {
    vi.stubEnv('PLATFORM_HISTORY_ID', undefined);
    const a = 케이스();
    흐름([a], async () => {
      await test.case(a, 확인('확인', 1, 1));
    });

    const { testInfo } = await 돌린다(pw);

    expect(낸판정들(testInfo)).toEqual([[a.tcId, 'PASS']]);
    expect(줄들(CASE_MARKER)).toEqual([]);
  });

  it('흐름이 멈추면 멈춘 케이스의 줄 뒤에 남은 케이스의 Blocked 줄까지 낸다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    흐름([a, b, c], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, 깨짐('화면이 안 뜬다', '요소를 찾지 못했다'));
      await test.case(c, 확인('안 도는 확인', 1, 1));
    });

    const { testInfo } = await 돌린다(pw);

    expect(낸판정들(testInfo)).toEqual([[a.tcId, 'PASS'], [b.tcId, 'FAIL', '요소를 찾지 못했다'], [c.tcId, 'NA', 'BLOCKED', b.tcId]]);
    expect(줄들<CaseResult>(CASE_MARKER).map((r) => r.tcId)).toEqual([a.tcId, b.tcId, c.tcId]);
  });

  it('보류 케이스의 줄은 폰 연결을 열기 전에 낸다 — 도중에 끊겨도 그 케이스가 못 간 케이스로 남지 않는다', async () => {
    const [a, 보류, c] = [케이스(), 케이스({ held: '보류 — 값을 채워야 한다' }), 케이스()];
    const 정보 = 가짜정보();
    let 열때: unknown[][] = [];
    app.openApp.mockImplementation(async () => {
      열때 = 낸판정들(정보);
      return { id: 'fake-driver' };
    });
    흐름([a, 보류, c], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(보류, 확인('안 도는 확인', 1, 1));
      await test.case(c, 확인('셋째 확인', 1, 1));
    });

    const { 던짐 } = await 돌린다(pw, 정보);

    expect(열때).toEqual([[보류.tcId, 'NA', '보류 — 값을 채워야 한다']]);
    expect(낸판정들(정보)).toEqual([[보류.tcId, 'NA', '보류 — 값을 채워야 한다'], [a.tcId, 'PASS'], [c.tcId, 'PASS']]);
    expect(던짐).toBeUndefined();
  });

  it('케이스가 모두 보류면 케이스마다 보류 줄을 내고 통째로 건너뛴다 — 줄이 없으면 케이스마다의 보류 사유가 건너뛴 사유 하나로 뭉개진다', async () => {
    const [a, b] = [케이스({ held: '보류 1' }), 케이스({ held: '판정 불가 — 기획서에 값이 없다' })];
    흐름([a, b], vi.fn());

    const { testInfo, 던짐 } = await 돌린다(pw);

    expect((던짐 as Error).message).toBe('skipped');
    expect(낸판정들(testInfo)).toEqual([[a.tcId, 'NA', '보류 1'], [b.tcId, 'NA', '판정 불가 — 기획서에 값이 없다']]);
    expect(줄들<CaseResult>(CASE_MARKER).map((r) => r.tcId)).toEqual([a.tcId, b.tcId]);
    expect(app.openApp).not.toHaveBeenCalled();
  });

  it('본문이 한도에 끊기면 정리 단계에서 끊긴 케이스와 남은 케이스의 줄을 낸다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    let 닿음 = (): void => {};
    const 닿았다 = new Promise<void>((resolve) => (닿음 = resolve));
    흐름([a, b, c], async () => {
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, async () => {
        await test.step('멈춘다', async () => {
          await verify('값이 같다', 1, 1);
          닿음();
          await new Promise(() => {});
        });
      });
      await test.case(c, 확인('안 도는 확인', 1, 1));
    });

    const { testInfo } = await 끊는다(pw, 닿았다, 'timedOut');

    expect(낸판정들(testInfo)).toEqual([[a.tcId, 'PASS'], [b.tcId, 'NA', 'Test timeout of 120000ms exceeded.'], [c.tcId, 'NA', 'BLOCKED', b.tcId]]);
    expect(줄들<CaseResult>(CASE_MARKER).map((r) => r.tcId)).toEqual([a.tcId, b.tcId, c.tcId]);
  });

  it('끝 정리 절차가 붙으면 마지막으로 돈 케이스의 줄을 한 번 더 낸다 — 뒤 줄에 정리 절차가 실려 있다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.cleanup('올린 글을 지운다', async () => {});
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.case(b, 확인('둘째 확인', 1, 1));
    });

    const { testInfo } = await 돌린다(pw);

    const 낸 = 낸것(testInfo);
    expect(낸.map((r) => r.tcId)).toEqual([a.tcId, b.tcId, b.tcId]);
    expect(낸.map((r) => r.steps.map((s) => s.title))).toEqual([
      ['시작 정리 — 올린 글을 지운다', '첫 확인'],
      ['둘째 확인'],
      ['둘째 확인', '끝 정리 — 올린 글을 지운다'],
    ]);
    // 정리 절차는 판정을 바꾸지 않는다
    expect(낸.map((r) => r.status)).toEqual(['PASS', 'PASS', 'PASS']);
  });

  it('진행 줄에 지금 도는 케이스가 실린다 — 케이스 사이 절차는 다음 케이스이고 정리 절차는 그 절차가 붙는 케이스다', async () => {
    const [a, b] = [케이스(), 케이스()];
    흐름([a, b], async () => {
      await test.cleanup('올린 글을 지운다', async () => {});
      await test.step('화면을 연다', async () => {});
      await test.case(a, 확인('첫 확인', 1, 1));
      await test.step('다음 준비', async () => {});
      await test.case(b, 확인('둘째 확인', 1, 1));
    });

    await 돌린다(pw);

    expect(줄들<StepProgress>(PROGRESS_MARKER)).toEqual([
      { historyId: 77, seq: 1, title: '시작 정리 — 올린 글을 지운다', tcId: a.tcId },
      { historyId: 77, seq: 2, title: '화면을 연다', tcId: a.tcId },
      { historyId: 77, seq: 3, title: '첫 확인', tcId: a.tcId },
      { historyId: 77, seq: 4, title: '다음 준비', tcId: b.tcId },
      { historyId: 77, seq: 5, title: '둘째 확인', tcId: b.tcId },
      { historyId: 77, seq: 6, title: '끝 정리 — 올린 글을 지운다', tcId: b.tcId },
    ]);
  });
});

describe('케이스별 입력', () => {
  const 계정 = () => 케이스({ params: z.object({ loginId: z.string().default('qa1') }) });
  const 글자수 = () => 케이스({ params: z.object({ 본문: z.string().default('가나다') }), expected: z.object({ 남은글자: z.string().default('497') }) });

  it('러너가 넘긴 값을 케이스마다 그 케이스 것으로 넘긴다 — 실어 켤 값도 첫 케이스의 그 값이다', async () => {
    const [첫째, 둘째] = [계정(), 글자수()];
    vi.stubEnv(
      'PLATFORM_CASES',
      JSON.stringify([
        { tcId: 첫째.tcId, params: { loginId: 'qa9' }, expected: {} },
        { tcId: 둘째.tcId, params: { 본문: '받은 글' }, expected: { 남은글자: '-1' } },
      ]),
    );
    const 받은: unknown[] = [];
    const 받고확인 = async (칸: unknown): Promise<void> => {
      받은.push(칸);
      await 확인(`확인 ${String(받은.length)}`, 1, 1)();
    };
    흐름(
      [첫째, 둘째],
      async () => {
        await test.case(첫째, 받고확인);
        await test.case(둘째, 받고확인);
      },
      { launchIntent: async (params) => ({ activity: '.Main', extras: { id: (params as { loginId: string }).loginId } }) },
    );

    await 돌린다(pw);

    expect(받은).toEqual([{ params: { loginId: 'qa9' }, expected: {} }, { params: { 본문: '받은 글' }, expected: { 남은글자: '-1' } }]);
    expect(app.openApp.mock.calls[0]?.[1]).toMatchObject({ intent: { activity: '.Main', extras: { id: 'qa9' } } });
  });

  it('넘긴 값이 없으면(사람이 손으로 돌린다) 케이스마다 스키마 기본값이다', async () => {
    const 둘째 = 글자수();
    let 받은: unknown;
    흐름([둘째], async () => {
      await test.case(둘째, async (칸) => {
        받은 = 칸;
        await 확인('확인', 1, 1)();
      });
    });

    await 돌린다(pw);

    expect(받은).toEqual({ params: { 본문: '가나다' }, expected: { 남은글자: '497' } });
  });

  it.each([
    ['케이스가 빠졌다', (ids: string[]) => ids.slice(0, 1)],
    ['차례가 바뀌었다', (ids: string[]) => [...ids].reverse()],
    ['없는 케이스가 있다', (ids: string[]) => [ids[0]!, 'DEMO-FN-999']],
  ])('요청의 케이스 목록이 파일과 다르면(%s) 본문을 돌지 않고 요청의 케이스마다 NA + PROCEDURE_CHANGED 줄을 낸다', async (_무엇, 바꾼다) => {
    const [a, b] = [케이스(), 케이스()];
    const 요청 = 바꾼다([a.tcId, b.tcId]);
    vi.stubEnv('PLATFORM_CASES', JSON.stringify(요청.map((tcId) => ({ tcId, params: {}, expected: {} }))));
    const 본문 = vi.fn();
    흐름([a, b], 본문);

    const { testInfo, 던짐 } = await 돌린다(pw);

    expect(낸판정들(testInfo)).toEqual(요청.map((tcId) => [tcId, 'NA', PROCEDURE_CHANGED]));
    expect(줄들<CaseResult>(CASE_MARKER).map((r) => r.tcId)).toEqual(요청);
    // 판정이 아닌 결과다 — 테스트를 실패로 끝내지 않고 건너뛴다
    expect((던짐 as Error).message).toBe('skipped');
    expect(본문).not.toHaveBeenCalled();
    expect(app.openApp).not.toHaveBeenCalled();
  });
});
