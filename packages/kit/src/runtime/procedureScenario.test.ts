// E2E 프로시저 단계 — 프로시저를 통째로 돌고 케이스마다의 판정 · 케이스마다의 한도 · 단계 오류를 검사한다. Appium 은 가짜로 바꿔 끼운다

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ProcedureBody } from './bodyArgs.js';
import type { CaseSchema } from './defineCase.js';
import type { ScenarioCaseInput } from './scenario.js';

vi.mock('./app.js', () => ({ captureApp: vi.fn(async () => undefined), closeApp: vi.fn(), openApp: vi.fn(), readDevice: vi.fn() }));

const { defineCase } = await import('./defineCase.js');
const { defineProcedure } = await import('./defineProcedure.js');
const { 프로시저단계 } = await import('./procedureScenario.js');
const { test } = await import('./test.js');
const { verify } = await import('./verify.js');

let 번호 = 0;
const 케이스 = (params: CaseSchema = null) => {
  번호 += 1;
  return defineCase({ tcId: `DEMO-FN-${String(번호 + 700)}`, name: `케이스 ${String(번호)}`, platforms: ['android'], precondition: [], params, expected: null });
};
const 프로시저 = (cases: ReturnType<typeof 케이스>[]) =>
  defineProcedure({ procId: 'DEMO-TP-701', name: '흐름', platforms: ['android'], precondition: [], cases: cases as [ReturnType<typeof 케이스>] });

const 입력 = (extra: Partial<ScenarioCaseInput> = {}): ScenarioCaseInput => ({
  driver: { id: 'fake' } as unknown as NonNullable<ScenarioCaseInput['driver']>,
  request: {} as ScenarioCaseInput['request'],
  platform: 'android',
  params: {},
  expected: {},
  skipSteps: [],
  seq: 4,
  ...extra,
});

const 확인 = (제목: string, 실제: unknown, 기대: unknown) => () => test.step(제목, async () => { await verify('값이 같다', 실제, 기대); });

beforeEach(() => {
  번호 += 10;
});

describe('프로시저 단계', () => {
  it('케이스를 차례로 다 돌고 판정을 케이스마다 낸다 — 절차는 든 케이스가 붙고 번호는 앞 부품에서 이어진다', async () => {
    const [a, b] = [케이스(), 케이스()];
    const 본문: ProcedureBody = async () => {
      await test.step('준비', async () => {});
      await test.case(a, 확인('a 확인', 1, 1));
      await test.case(b, 확인('b 확인', 1, 1));
    };

    const 결과 = await 프로시저단계(프로시저([a, b]), 본문, b.tcId)(입력());

    expect(결과.failed).toBe(false);
    expect(결과.error).toBeUndefined();
    expect(결과.cases?.map((c) => [c.tcId, c.status])).toEqual([[a.tcId, 'PASS'], [b.tcId, 'PASS']]);
    expect(결과.steps.map((s) => [s.seq, s.title, s.tcId])).toEqual([[5, '준비', a.tcId], [6, 'a 확인', a.tcId], [7, 'b 확인', b.tcId]]);
    expect(결과.seq).toBe(7);
  });

  it('고른 케이스는 부품 값, 다른 케이스는 admin 이 채운 값을 받는다', async () => {
    const [a, b] = [케이스(z.object({ 글: z.string() })), 케이스(z.object({ 글: z.string() }))];
    const 받은: string[] = [];
    const 본문: ProcedureBody = async () => {
      await test.case(a, ({ params }) => { 받은.push((params as { 글: string }).글); });
      await test.case(b, ({ params }) => { 받은.push((params as { 글: string }).글); });
    };

    await 프로시저단계(프로시저([a, b]), 본문, b.tcId)(
      입력({ params: { 글: '꽂은 값' }, cases: [{ tcId: a.tcId, params: { 글: '저장값' }, expected: {} }, { tcId: b.tcId, params: { 글: '옛 값' }, expected: {} }] }),
    );

    expect(받은).toEqual(['저장값', '꽂은 값']);
  });

  it('판정 확인만 틀리면 흐름은 이어지고 단계는 실패지만 오류 글은 없다', async () => {
    const [a, b] = [케이스(), 케이스()];
    const 본문: ProcedureBody = async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.case(b, 확인('b 확인', 1, 1));
    };

    const 결과 = await 프로시저단계(프로시저([a, b]), 본문, a.tcId)(입력());

    expect(결과.failed).toBe(true);
    expect(결과.error).toBeUndefined();
    expect(결과.cases?.map((c) => [c.tcId, c.status])).toEqual([[a.tcId, 'FAIL'], [b.tcId, 'PASS']]);
  });

  it('준비 구간에서 깨져 Blocked 로 남아도 단계 오류는 난 예외다 — 막은 케이스는 kit 이 고른다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    const 본문: ProcedureBody = async () => {
      await test.case(a, 확인('틀린 확인', 1, 2));
      await test.step('b 준비', async () => { throw new Error('요소를 못 찾았다'); });
      await test.case(b, 확인('b 확인', 1, 1));
      await test.case(c, 확인('c 확인', 1, 1));
    };

    const 결과 = await 프로시저단계(프로시저([a, b, c]), 본문, a.tcId)(입력());

    expect(결과.failed).toBe(true);
    expect(결과.error?.message).toContain('요소를 못 찾았다');
    expect(결과.cases?.map((x) => [x.tcId, x.status, x.error?.message, x.blockedBy])).toEqual([
      [a.tcId, 'FAIL', undefined, undefined],
      [b.tcId, 'NA', 'BLOCKED', a.tcId],
      [c.tcId, 'NA', 'BLOCKED', a.tcId],
    ]);
  });

  it('케이스 한도는 케이스마다 다시 건다 — 넘은 케이스는 제한 시간 초과, 뒤는 Blocked 이고 본문을 기다리지 않는다', async () => {
    const [a, b, c] = [케이스(), 케이스(), 케이스()];
    const 본문: ProcedureBody = async () => {
      // a 와 b 를 합치면 한도를 넘지만 케이스마다 다시 걸어 a 는 안 끊긴다
      await test.case(a, async () => { await new Promise((done) => setTimeout(done, 60)); });
      await test.case(b, async () => { await new Promise(() => {}); });
      await test.case(c, 확인('c 확인', 1, 1));
    };

    const 결과 = await 프로시저단계(프로시저([a, b, c]), 본문, a.tcId)(입력({ caseTimeoutMs: 100 }));

    expect(결과.error?.message).toBe('단계 제한 시간 100ms 를 넘었다');
    expect(결과.cases?.map((x) => [x.tcId, x.status, x.error?.message, x.blockedBy])).toEqual([
      [a.tcId, 'PASS', undefined, undefined],
      [b.tcId, 'NA', '단계 제한 시간 100ms 를 넘었다', undefined],
      [c.tcId, 'NA', 'BLOCKED', b.tcId],
    ]);
  });

  it('실행을 만든 뒤 프로시저가 바뀌었으면 돌지 않고 케이스마다 알린다', async () => {
    const [a, b] = [케이스(), 케이스()];
    const 본문 = vi.fn();

    const 결과 = await 프로시저단계(프로시저([a, b]), 본문, a.tcId)(입력({ cases: [{ tcId: a.tcId, params: {}, expected: {} }] }));

    expect(본문).not.toHaveBeenCalled();
    expect(결과.failed).toBe(true);
    expect(결과.cases).toEqual([{ tcId: a.tcId, status: 'NA', durationMs: 0, error: { message: 'PROCEDURE_CHANGED' } }]);
  });

  it('케이스가 모두 보류면 돌린 것이 없어 단계를 통과로 두지 않는다', async () => {
    번호 += 1;
    const 보류 = defineCase({ tcId: `DEMO-FN-${String(번호 + 700)}`, name: '보류', platforms: ['android'], precondition: [], params: null, expected: null, held: '값이 비었다' });
    const 본문 = vi.fn();

    const 결과 = await 프로시저단계(프로시저([보류]), 본문, 보류.tcId)(입력());

    expect(본문).not.toHaveBeenCalled();
    expect(결과).toMatchObject({ failed: true, error: { message: 'DEMO-TP-701의 케이스가 모두 보류다' } });
    expect(결과.cases).toEqual([{ tcId: 보류.tcId, status: 'NA', durationMs: 0, error: { message: '값이 비었다' } }]);
  });

  it('폰 연결이 없으면 케이스를 안 돌아 판정 줄이 없다', async () => {
    const a = 케이스();

    const 결과 = await 프로시저단계(프로시저([a]), vi.fn(), a.tcId)(입력({ driver: undefined }));

    expect(결과).toMatchObject({ failed: true, error: { message: 'DEMO-TP-701에 디바이스 연결이 없다' } });
    expect(결과.cases).toBeUndefined();
  });
});
