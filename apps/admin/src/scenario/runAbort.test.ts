// E2E 정식 실행 중단 검사 — 보내기 전이면 admin 이 닫고 러너에 안 보낸다 · 보낸 뒤면 러너에 끊어 달라 한다 (DB 는 가짜 연결로 갈음한다)

import { afterEach, describe, expect, it, vi } from 'vitest';

const 질의: string[] = [];
let 닫힌행수 = 1;

vi.mock('../db/index.js', () => ({
  pool: {
    connect: async () => ({
      query: async (sql: string) => {
        질의.push(sql.trim().split(/\s+/).slice(0, 3).join(' '));
        return { rowCount: sql.includes('UPDATE test_run') ? 닫힌행수 : 1 };
      },
      release: () => undefined,
    }),
  },
}));
vi.mock('../execution/runner.js', () => ({
  callScenarioRunner: vi.fn(),
}));
vi.mock('../execution/scenarioRunner.js', () => ({
  abortScenarioRunner: vi.fn(async () => true),
}));

const { 시나리오실행을멈춘다, 실행상태를연다, 실행상태를지운다 } = await import('./runAbort.js');
const { abortScenarioRunner } = await import('../execution/scenarioRunner.js');

afterEach(() => {
  질의.length = 0;
  닫힌행수 = 1;
  vi.mocked(abortScenarioRunner).mockClear();
  실행상태를지운다(7);
});

describe('시나리오실행을멈춘다', () => {
  it('분배를 모르는 실행이면 null 이다', async () => {
    expect(await 시나리오실행을멈춘다(7)).toBeNull();
    expect(abortScenarioRunner).not.toHaveBeenCalled();
  });

  it('보내기 전이면 한 트랜잭션으로 실행을 ABORTED 로, 부품을 STOPPED 로 닫고 러너는 안 부른다', async () => {
    const 상태 = 실행상태를연다(7, 3);

    expect(await 시나리오실행을멈춘다(7)).toEqual({ aborted: 1 });

    expect(상태.멈춤).toBe(true);
    expect(질의).toEqual(['BEGIN', 'UPDATE test_run SET', 'UPDATE scenario_run_part SET', 'COMMIT']);
    expect(abortScenarioRunner).not.toHaveBeenCalled();
  });

  it('보내기 전에 닫으려는데 이미 RUNNING 이 아니면 되돌리고 null 이다', async () => {
    실행상태를연다(7, 3);
    닫힌행수 = 0;

    expect(await 시나리오실행을멈춘다(7)).toBeNull();
    expect(질의).toEqual(['BEGIN', 'UPDATE test_run SET', 'ROLLBACK']);
  });

  it('보낸 뒤면 DB 는 건드리지 않고 러너에 끊어 달라 한다 — 닫는 것은 러너 답이 온 결과 저장이다', async () => {
    const 상태 = 실행상태를연다(7, 3);
    상태.보냄 = true;

    expect(await 시나리오실행을멈춘다(7)).toEqual({ aborted: 1 });

    expect(abortScenarioRunner).toHaveBeenCalledWith({ scenarioRunId: 7 });
    expect(상태.멈춤).toBe(true);
    expect(질의).toEqual([]);
  });

  it('이미 멈춘 실행을 또 멈추라 하면 null 이다', async () => {
    const 상태 = 실행상태를연다(7, 3);
    상태.보냄 = true;
    await 시나리오실행을멈춘다(7);

    expect(await 시나리오실행을멈춘다(7)).toBeNull();
    expect(abortScenarioRunner).toHaveBeenCalledTimes(1);
  });
});
