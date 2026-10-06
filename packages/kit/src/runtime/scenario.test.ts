// kit 시나리오 모드 검사 — 등록부 · 한 RunScope 로 이어지는 순번 · 부품마다 새로 서는 실패 표시 (SPEC 공통/3-공유계약 §5.1)

import type { APIRequestContext, Page } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineCase } from './defineCase.js';
import { scenarioCase, type ScenarioCaseInput, type ScenarioPhase } from './scenario.js';
import { test } from './test.js';
import { verify } from './verify.js';

// about:blank 이면 kit 이 스크린샷을 안 찍는다. 브라우저 없이 본체만 돌린다
const page = { isClosed: () => false, url: () => 'about:blank' } as unknown as Page;
const request = {} as APIRequestContext;

const 입력 = (칸: Partial<ScenarioCaseInput> = {}): ScenarioCaseInput => ({
  page, request, platform: 'desktop', params: {}, expected: {}, skipSteps: [], seq: 0, ...칸,
});

const 받은입력: unknown[] = [];

// 본체 안에서 그 순간의 표시판을 찍어 둔다. 러너의 가로채기가 요청을 볼 때 읽는 값이 이것이다
let 표시판: ScenarioPhase = { started: false, inStep: 0, judged: false };
const 찍힌: Array<{ 언제: string } & ScenarioPhase> = [];
const 찍는다 = (언제: string): void => {
  찍힌.push({ 언제, ...표시판 });
};
const 새표시판 = (): ScenarioPhase => {
  찍힌.length = 0;
  표시판 = { started: false, inStep: 0, judged: false };
  return 표시판;
};

beforeAll(() => {
  process.env.PLATFORM_SCENARIO_MODE = '1';

  test(defineCase({
    tcId: 'XKS-001', name: '계정을 만들고 로그인한다', precondition: [],
    params: z.object({ 이름: z.string().default('검사') }), expected: null,
  }), async ({ params }) => {
    받은입력.push(params);
    await test.step('계정을 만든다', async () => {});
    await test.step('로그인한다', async () => {
      await verify('로그인됐다', true, true);
    });
  });

  test(defineCase({ tcId: 'XKS-002', name: '실패한다', precondition: [], params: null, expected: null }), async () => {
    await test.step('틀린 것을 본다', async () => {
      await verify('값이 같다', 1, 2);
    });
  });

  test(defineCase({ tcId: 'XKS-003', name: '예외가 난다', precondition: [], params: null, expected: null }), async () => {
    await test.step('앞 절차', async () => {});
    await test.step('터진다', async () => {
      throw new Error('화면이 안 떴다');
    });
  });

  test(defineCase({ tcId: 'XKS-004', name: '절차를 겹쳐 돈다', precondition: [], params: null, expected: null }), async () => {
    찍는다('처음');
    await test.step('만든다', async () => {
      찍는다('바깥');
      await test.step('안쪽', async () => {
        찍는다('안쪽');
      });
      찍는다('안쪽 뒤');
    });
    찍는다('끝');
  });

  test(defineCase({ tcId: 'XKS-005', name: '겹친 절차에서 터진다', precondition: [], params: null, expected: null }), async () => {
    await test.step('바깥', async () => {
      await test.step('터진다', async () => {
        찍는다('터지기 전');
        throw new Error('안쪽에서 터졌다');
      });
    });
  });

  test(defineCase({
    tcId: 'XKS-006', name: '준비를 확인하고 본다', precondition: [],
    params: z.object({ 실제: z.number().default(1) }), expected: null,
  }), async ({ params }) => {
    await test.step('준비한다', async () => {
      await verify('준비됐다', true, true, { blocker: true });
      찍는다('blocker 뒤');
    });
    await test.step('본다', async () => {
      await verify('값이 같다', params.실제, 1);
      찍는다('판정 뒤');
    });
  });
});

afterAll(() => {
  delete process.env.PLATFORM_SCENARIO_MODE;
});

describe('시나리오 모드', () => {
  it('Playwright 에 등록하지 않고 tcId 로 꺼낼 수 있게 올린다', () => {
    expect(scenarioCase('XKS-001')).toBeTypeOf('function');
    expect(scenarioCase('없는-케이스')).toBeUndefined();
  });

  it('같은 순번 흐름으로 두 번 돌리면 순번이 이어지고 꺼낸 뒤에도 등록부에 남는다', async () => {
    const 첫 = await scenarioCase('XKS-001')!(입력());
    const 둘 = await scenarioCase('XKS-001')!(입력({ seq: 첫.seq }));

    expect(첫.steps.map((s) => s.seq)).toEqual([1, 2]);
    expect(둘.steps.map((s) => s.seq)).toEqual([3, 4]);
    expect(둘.seq).toBe(4);
  });

  it('입력값을 그 케이스 명세로 해석한다 — 안 준 칸은 기본값', async () => {
    받은입력.length = 0;
    await scenarioCase('XKS-001')!(입력());
    await scenarioCase('XKS-001')!(입력({ params: { 이름: '민수' } }));

    expect(받은입력).toEqual([{ 이름: '검사' }, { 이름: '민수' }]);
  });

  it('건너뛸 제목은 그 호출에만 걸린다', async () => {
    const 건너뜀 = await scenarioCase('XKS-001')!(입력({ skipSteps: ['계정을 만든다'] }));
    const 그대로 = await scenarioCase('XKS-001')!(입력());

    expect(건너뜀.steps[0]).toMatchObject({ title: '계정을 만든다', skipped: true });
    expect(그대로.steps[0]?.skipped).toBeUndefined();
  });

  it('앞 케이스가 실패해도 다음 호출은 실패 표시를 새로 세운다', async () => {
    const 실패 = await scenarioCase('XKS-002')!(입력());
    const 다음 = await scenarioCase('XKS-001')!(입력({ seq: 실패.seq }));

    expect(실패.failed).toBe(true);
    expect(다음.failed).toBe(false);
  });

  it('본체 예외는 던지지 않고 실패와 사유로 돌려준다 — 그 전 절차도 남는다', async () => {
    const 결과 = await scenarioCase('XKS-003')!(입력());

    expect(결과.failed).toBe(true);
    expect(결과.error?.message).toBe('화면이 안 떴다');
    expect(결과.steps.map((s) => [s.title, s.status])).toEqual([['앞 절차', 'PASS'], ['터진다', 'FAIL']]);
  });

  it('시나리오 디바이스를 선언하지 않은 케이스는 본체를 안 돌리고 실패한다', async () => {
    const 결과 = await scenarioCase('XKS-001')!(입력({ platform: 'mobile' }));

    expect(결과.failed).toBe(true);
    expect(결과.error?.message).toBe('XKS-001은 모바일 환경을 선언하지 않았다');
    expect(결과.steps).toEqual([]);
  });

  describe('표시판 — 준비 구간과 절차 밖', () => {
    it('첫 절차 전에는 시작 전이고 절차 밖이다 — 첫 절차가 서면 시작으로 바뀐다', async () => {
      await scenarioCase('XKS-004')!(입력({ phase: 새표시판() }));

      expect(찍힌[0]).toEqual({ 언제: '처음', started: false, inStep: 0, judged: false });
      expect(찍힌.map((s) => [s.언제, s.started])).toEqual([
        ['처음', false], ['바깥', true], ['안쪽', true], ['안쪽 뒤', true], ['끝', true],
      ]);
    });

    it('절차 안에서는 겹친 만큼 세고 끝나면 0 으로 돌아간다 — 예외로 끝나도', async () => {
      await scenarioCase('XKS-004')!(입력({ phase: 새표시판() }));
      expect(찍힌.map((s) => [s.언제, s.inStep])).toEqual([
        ['처음', 0], ['바깥', 1], ['안쪽', 2], ['안쪽 뒤', 1], ['끝', 0],
      ]);

      const 터진표시판 = 새표시판();
      const 결과 = await scenarioCase('XKS-005')!(입력({ phase: 터진표시판 }));
      expect(결과.error?.message).toBe('안쪽에서 터졌다');
      expect(찍힌.map((s) => [s.언제, s.inStep])).toEqual([['터지기 전', 2]]);
      expect(터진표시판.inStep).toBe(0);
    });

    it('건너뛴 절차도 첫 절차로 친다', async () => {
      await scenarioCase('XKS-004')!(입력({ phase: 새표시판(), skipSteps: ['만든다'] }));

      expect(찍힌.map((s) => [s.언제, s.started, s.inStep])).toEqual([['처음', false, 0], ['끝', true, 0]]);
    });

    it('blocker 판정은 준비 구간을 안 끝내고 그 밖 판정은 통과 · 실패 모두 끝낸다', async () => {
      await scenarioCase('XKS-006')!(입력({ phase: 새표시판(), params: { 실제: 1 } }));
      const 통과 = 찍힌.map((s) => [s.언제, s.judged]);
      await scenarioCase('XKS-006')!(입력({ phase: 새표시판(), params: { 실제: 2 } }));
      const 실패 = 찍힌.map((s) => [s.언제, s.judged]);

      expect(통과).toEqual([['blocker 뒤', false], ['판정 뒤', true]]);
      expect(실패).toEqual([['blocker 뒤', false], ['판정 뒤', true]]);
    });
  });
});
