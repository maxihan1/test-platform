// 프로시저 선언이 ProcedureSpec 으로 바뀌고 안 케이스에 프로시저 번호 · 차례가 실리는지, 잘못 묶은 선언을 거절하는지 검사한다 (SPEC 공통/2 §4 「테스트 프로시저」)

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Platform } from '../types.js';
import type { AppLaunchIntent } from './app.js';
import { defineCase, keepsAppData, schemasOf, 실어켤값 } from './defineCase.js';
import { defineProcedure } from './defineProcedure.js';

beforeAll(() => {
  process.env.PLATFORM_TESTS_DIR = dirname(fileURLToPath(import.meta.url));
});

let 번호 = 0;

function 케이스(extra: { tcId?: string; platforms?: Platform[]; keepAppData?: boolean } = {}) {
  번호 += 1;
  return defineCase({
    tcId: `DEMO-FN-${String(번호).padStart(3, '0')}`,
    name: '케이스',
    platforms: ['android'],
    precondition: [],
    params: null,
    expected: null,
    ...extra,
  });
}

const 머리 = { procId: 'DEMO-TP-001', name: '글쓰기 — 입력 제한부터 게시까지', platforms: ['android'] as Platform[], precondition: ['로그인해 있다'] };

describe('defineProcedure', () => {
  it('케이스를 적은 차례대로 묶고 케이스마다 프로시저 번호와 차례를 싣는다', () => {
    const 첫째 = defineCase({
      tcId: 'DEMO-FN-101',
      name: '본문이 비면 게시할 수 없다',
      platforms: ['android'],
      precondition: [],
      params: z.object({ 본문: z.string().default('').describe('본문') }),
      expected: null,
    });
    const 둘째 = 케이스({ tcId: 'DEMO-FN-102' });

    const procedure = defineProcedure({ ...머리, cases: [첫째, 둘째] });

    expect(procedure).toEqual({
      procId: 'DEMO-TP-001',
      name: '글쓰기 — 입력 제한부터 게시까지',
      platforms: ['android'],
      precondition: ['로그인해 있다'],
      filePath: 'defineProcedure.test.ts',
      cases: [
        expect.objectContaining({ tcId: 'DEMO-FN-101', procId: 'DEMO-TP-001', procSeq: 1 }),
        expect.objectContaining({ tcId: 'DEMO-FN-102', procId: 'DEMO-TP-001', procSeq: 2 }),
      ],
    });
    // test.case 가 받는 케이스 선언과 스캐너가 읽는 케이스가 한 몸이다 — 스키마 원본을 그 객체로 찾는다
    expect(procedure.cases[0]).toBe(첫째);
    expect(schemasOf(procedure.cases[0]!).params).not.toBeNull();
  });

  it('스캐너가 JSON 으로 내보내면 케이스 명세가 차례대로 딸려 나가고 연결 설정은 안 나간다', () => {
    const procedure = defineProcedure({
      ...머리,
      procId: 'DEMO-TP-002',
      cases: [케이스(), 케이스()],
      keepAppData: true,
      launchIntent: () => Promise.resolve({ activity: '.Main', extras: {} }),
    });

    const 나간것 = JSON.parse(JSON.stringify(procedure)) as Record<string, unknown>;

    expect(Object.keys(나간것)).toEqual(['procId', 'name', 'platforms', 'precondition', 'filePath', 'cases']);
    expect((나간것.cases as { procSeq: number; paramSchema: unknown }[]).map((c) => [c.procSeq, c.paramSchema])).toEqual([
      [1, { type: 'object', properties: {} }],
      [2, { type: 'object', properties: {} }],
    ]);
  });

  it('옛 꼴 케이스에는 프로시저 칸이 없다', () => {
    expect(케이스()).not.toHaveProperty('procId');
  });

  it.each([[0], [11]])('케이스가 %i개면 던진다', (개수) => {
    const cases = Array.from({ length: 개수 }, () => 케이스()) as unknown as [ReturnType<typeof 케이스>];
    expect(() => defineProcedure({ ...머리, cases })).toThrow(`DEMO-TP-001: cases 는 1개 이상 10개 이하다 — ${String(개수)}개를 넣었다`);
  });

  it('케이스 10개까지는 받는다', () => {
    const cases = Array.from({ length: 10 }, () => 케이스()) as unknown as [ReturnType<typeof 케이스>];
    expect(defineProcedure({ ...머리, cases }).cases.at(-1)?.procSeq).toBe(10);
  });

  it('같은 케이스를 두 번 넣으면 던진다 — 번호만 같은 다른 선언도 같다', () => {
    const 하나 = 케이스({ tcId: 'DEMO-FN-201' });
    const 글 = 'DEMO-TP-001: DEMO-FN-201 를 두 번 넣었다 — 케이스 하나는 프로시저 한 자리에만 든다';
    expect(() => defineProcedure({ ...머리, cases: [하나, 하나] })).toThrow(글);
    expect(() => defineProcedure({ ...머리, cases: [하나, 케이스({ tcId: 'DEMO-FN-201' })] })).toThrow(글);
  });

  it('던지면 앞 케이스에 프로시저 번호를 남기지 않는다', () => {
    const 앞 = 케이스();
    expect(() => defineProcedure({ ...머리, cases: [앞, 케이스({ keepAppData: true })] })).toThrow();
    expect(앞).not.toHaveProperty('procId');
    expect(defineProcedure({ ...머리, procId: 'DEMO-TP-007', cases: [앞] }).cases[0]?.procSeq).toBe(1);
  });

  it('다른 파일에서 선언한 케이스를 넣으면 던진다', () => {
    const 남의것 = 케이스({ tcId: 'DEMO-FN-205' });
    남의것.filePath = 'DEMO-FN-205.spec.ts';
    expect(() => defineProcedure({ ...머리, cases: [남의것] })).toThrow(
      'DEMO-TP-001: DEMO-FN-205 는 다른 파일(DEMO-FN-205.spec.ts)의 케이스다 — 같은 파일에서 선언한 케이스만 넣는다',
    );
  });

  it('다른 프로시저에 든 케이스를 넣으면 던진다', () => {
    const 하나 = 케이스({ tcId: 'DEMO-FN-202' });
    defineProcedure({ ...머리, procId: 'DEMO-TP-003', cases: [하나] });
    expect(() => defineProcedure({ ...머리, cases: [하나] })).toThrow('DEMO-TP-001: DEMO-FN-202 는 이미 DEMO-TP-003 에 들어 있다');
  });

  it('게임 미션 케이스를 넣으면 던진다', () => {
    expect(() => defineProcedure({ ...머리, cases: [케이스({ tcId: 'DEMO-GS-001' })] })).toThrow(
      'DEMO-TP-001: 게임 미션 DEMO-GS-001 는 프로시저에 넣지 않는다',
    );
  });

  it.each([[['desktop']], [['mobile']], [['android', 'windows']], [[]]] as Platform[][][])('platforms 가 %j 면 던진다', (platforms) => {
    expect(() => defineProcedure({ ...머리, platforms, cases: [케이스()] })).toThrow(
      'DEMO-TP-001: 프로시저의 platforms 는 android 하나이거나 windows 값이다',
    );
  });

  it('윈도우 값은 케이스와 같은 값이면 차례가 달라도 받는다', () => {
    const procedure = defineProcedure({
      ...머리,
      platforms: ['windows-xbox', 'windows-ps5'],
      cases: [케이스({ platforms: ['windows-ps5', 'windows-xbox'] })],
    });
    expect(procedure.platforms).toEqual(['windows-xbox', 'windows-ps5']);
  });

  it('케이스의 platforms 가 프로시저와 다르면 던진다', () => {
    expect(() => defineProcedure({ ...머리, cases: [케이스({ tcId: 'DEMO-FN-203', platforms: ['windows'] })] })).toThrow(
      'DEMO-TP-001: DEMO-FN-203 의 platforms 가 프로시저와 다르다',
    );
  });

  it.each([[{ keepAppData: true }], [{ launchIntent: () => Promise.resolve({ activity: '.Main', extras: {} }) }]])(
    '케이스에 앱 켜기 설정을 적으면 던진다',
    (설정) => {
      const 적은것 = defineCase({ tcId: 'DEMO-FN-204', name: '케이스', platforms: ['android'], precondition: [], params: null, expected: null, ...설정 });
      expect(() => defineProcedure({ ...머리, cases: [적은것] })).toThrow('DEMO-TP-001: DEMO-FN-204 의 keepAppData · launchIntent 는 프로시저에 적는다');
    },
  );

  it('앱 켜기 설정은 프로시저에 적히고 launchIntent 는 첫 케이스의 입력값을 받는다', async () => {
    // 케이스 폴더의 로그인 도우미(tests/mta/helpers/login-inject.helper.ts)와 같은 꼴 — 그 도우미를 그대로 받아야 한다
    const 로그인된채켜기 =
      <칸 extends string>(아이디칸: 칸) =>
      (params: Partial<Record<칸, string>>): Promise<AppLaunchIntent> =>
        Promise.resolve({ activity: '.Main', extras: { id: params[아이디칸] ?? '' } });
    const 첫째 = defineCase({
      tcId: 'DEMO-FN-301',
      name: '로그인된 채 시작한다',
      platforms: ['android'],
      precondition: [],
      params: z.object({ loginId: z.string().describe('아이디').optional() }),
      expected: null,
    });
    const 둘째 = defineCase({
      tcId: 'DEMO-FN-302',
      name: '본문을 넣는다',
      platforms: ['android'],
      precondition: [],
      params: z.object({ 본문: z.string().default('가').describe('본문') }),
      expected: null,
    });
    const procedure = defineProcedure({ ...머리, procId: 'DEMO-TP-004', cases: [첫째, 둘째], keepAppData: true, launchIntent: 로그인된채켜기('loginId') });

    expect(keepsAppData(procedure)).toBe(true);
    await expect(실어켤값(procedure, { loginId: 'qa' })).resolves.toEqual({ activity: '.Main', extras: { id: 'qa' } });
    expect(keepsAppData(첫째)).toBe(false);

    const 셋째 = defineCase({ tcId: 'DEMO-FN-303', name: '본문만 받는다', platforms: ['android'], precondition: [], params: z.object({ 본문: z.string().default('가').describe('본문') }), expected: null });
    // @ts-expect-error 첫 케이스에 없는 칸(loginId)을 받는 함수는 못 단다
    defineProcedure({ ...머리, procId: 'DEMO-TP-006', cases: [셋째], launchIntent: 로그인된채켜기('loginId') });
  });

  it('앱 켜기 설정을 적지 않은 프로시저는 지우고 그냥 켠다', async () => {
    const procedure = defineProcedure({ ...머리, procId: 'DEMO-TP-005', cases: [케이스()] });
    expect(keepsAppData(procedure)).toBe(false);
    await expect(실어켤값(procedure, {})).resolves.toBeUndefined();
  });

  it.each([
    [{ keepAppData: true }, 'DEMO-TP-001: keepAppData 는 android 프로시저에만 단다'],
    [{ launchIntent: () => Promise.resolve({ activity: '.Main', extras: {} }) }, 'DEMO-TP-001: launchIntent 는 android 프로시저에만 단다'],
  ])('윈도우 프로시저에 앱 켜기 설정을 달면 던진다', (설정, 글) => {
    expect(() => defineProcedure({ ...머리, platforms: ['windows'], cases: [케이스({ platforms: ['windows'] })], ...설정 })).toThrow(글);
  });
});
