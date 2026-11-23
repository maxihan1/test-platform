// 프로시저 테스트 파일들이 같이 쓰는 도우미 — 케이스 · 프로시저를 만들고, 가짜 Playwright 로 본문과 정리 단계를 돌리고, kit 이 정한 판정을 읽는다.
// vi.mock 은 파일마다 따로 걸어야 해서 가짜 Playwright · Appium 자체는 테스트 파일에 둔다

import { vi } from 'vitest';

import type { ProcedureBody } from './bodyArgs.js';
import { runScope, type ProcScope } from './context.js';
import { defineCase, type CaseHandle, type CaseSchema } from './defineCase.js';
import { defineProcedure, type DefineProcedureInput } from './defineProcedure.js';
import { test } from './test.js';
import { verify } from './verify.js';

export type Body = (fixtures: unknown, testInfo: unknown) => Promise<void>;
type Use = (session: { open(): Promise<unknown> }) => Promise<void>;
export type Fixture = (deps: object, use: Use, testInfo?: object) => Promise<void>;
/** 테스트 파일이 vi.mock 으로 받아 둔 등록 본문과 fixture */
export interface 가짜PW {
  appRegistered: Body[];
  fixtures: Record<string, Fixture>;
}

export type 케이스선언 = CaseHandle<unknown, unknown>;

let 번호 = 0;
let 잡은: ProcScope | undefined;

/** kit 이 정한 판정은 이 줄에서 kit 밖으로 안 나간다 — 본문에 들어갈 때 잡아 둔 케이스 장부로 읽는다 */
export const 장부 = (): ProcScope | undefined => 잡은;
export function 장부를잡는다(): void {
  잡은 = runScope.getStore()?.proc;
}
export function 장부를비운다(): void {
  잡은 = undefined;
}

// 케이스와 프로시저를 같은 파일(여기)에서 선언해야 defineProcedure 가 받는다 (K19) — 입력값 칸이 있는 케이스도 이 함수로 만든다
export function 케이스(extra: { held?: string; params?: CaseSchema; expected?: CaseSchema } = {}): 케이스선언 {
  번호 += 1;
  return defineCase({ tcId: `DEMO-FN-${String(번호).padStart(3, '0')}`, name: `케이스 ${String(번호)}`, platforms: ['android'], precondition: [], params: null, expected: null, ...extra });
}

type 켜기설정 = Pick<DefineProcedureInput<[케이스선언]>, 'keepAppData' | 'launchIntent'>;

export function 흐름(cases: 케이스선언[], 본문: ProcedureBody, 머리: 켜기설정 = {}): void {
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
    장부를잡는다();
    await 본문(args);
  });
}

/** 판정 확인 하나짜리 절차 */
export const 확인 = (제목: string, 실제: unknown, 기대: unknown, options?: { blocker: boolean }) => async (): Promise<void> => {
  await test.step(제목, async () => {
    await verify('값이 같다', 실제, 기대, options);
  });
};
/** 예외로 깨지는 절차 */
export const 깨짐 = (제목: string, 글: string) => async (): Promise<void> => {
  await test.step(제목, async () => {
    throw new Error(글);
  });
};

export function 가짜정보(extra: object = {}) {
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
export async function 돌린다(pw: 가짜PW, testInfo = 가짜정보(), request: object = {}) {
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
export async function 끊는다(pw: 가짜PW, 닿았다: Promise<void>, status: string) {
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

/** 케이스마다 [번호, 판정, 사유, 막은 케이스] — 없는 칸은 뺀다 */
export const 판정들 = (): unknown[][] => (잡은?.results ?? []).map((r) => [r?.tcId, r?.status, r?.error?.message, r?.blockedBy].filter((v) => v !== undefined));

/** 리포터로 흘린 절차마다 [번호, 제목, 든 케이스, 판정] */
export function 절차들(testInfo: ReturnType<typeof 가짜정보>): unknown[][] {
  return testInfo.attach.mock.calls
    .filter(([이름]) => 이름 === 'platform-step')
    .map(([, 첨부]) => JSON.parse((첨부 as { body: string }).body) as { seq: number; title: string; tcId: string; status: string })
    .map((s) => [s.seq, s.title, s.tcId, s.status]);
}
