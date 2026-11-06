// E2E 시나리오 자식의 진행(지금 부품 번호 · 경과)과 중단 검사 — 가짜 자식으로 돌린다 (SPEC 도메인/러너 §5.2 「시나리오 진행 · 중단」)

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

const 만든자식: EventEmitter[] = [];

vi.mock('node:child_process', async () => {
  const { EventEmitter: 방송 } = await import('node:events');
  const { PassThrough: 통 } = await import('node:stream');
  return {
    spawn: vi.fn(() => {
      const 자식 = Object.assign(new 방송(), { pid: 4242, stdout: new 통(), stderr: new 통() });
      만든자식.push(자식);
      return 자식;
    }),
  };
});
vi.mock('./kill.js', () => ({ killTree: vi.fn((c: EventEmitter) => { c.emit('close', null); }) }));

const { executeScenario } = await import('./scenario.js');
const { abortScenario, runningScenarios, 시나리오진행 } = await import('./scenarioRunning.js');
const { killTree } = await import('./kill.js');

const 줄 = (seq: number): string =>
  `@@SCENARIO_PART@@${JSON.stringify({ seq, status: 'PASS', durationMs: 1, steps: [], mocks: [] } satisfies ScenarioPartResult)}\n`;

const 요청 = (바꿈: Partial<ScenarioExecuteRequest> = {}): ScenarioExecuteRequest => ({
  runId: 42, platform: 'desktop', baseUrl: 'https://qa.example.com', timeoutMs: 60_000,
  parts: [{ kind: 'wait', ms: 1 }, { kind: 'wait', ms: 1 }, { kind: 'wait', ms: 1 }], ...바꿈,
});

async function 띄운다(req: ScenarioExecuteRequest) {
  const 답 = executeScenario(req);
  await vi.waitFor(() => { expect(runningScenarios.size).toBe(1); });
  const 자식 = 만든자식.at(-1) as EventEmitter & { stdout: PassThrough };
  return { 답, 자식 };
}

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(killTree).mockClear();
  runningScenarios.clear();
  만든자식.length = 0;
});

describe('시나리오진행', () => {
  it('첫 부품은 자식을 띄운 때부터, 결과 줄을 받을 때마다 다음 부품으로 넘어가 경과를 새로 잰다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    const { 답, 자식 } = await 띄운다(요청());

    vi.setSystemTime(1_002_000);
    expect(시나리오진행()).toEqual([{ runId: 42, seq: 1, elapsedMs: 2000 }]);

    자식.stdout.write(줄(1));
    await vi.waitFor(() => { expect(시나리오진행()[0]?.seq).toBe(2); });
    vi.setSystemTime(1_002_300);
    expect(시나리오진행()).toEqual([{ runId: 42, seq: 2, elapsedMs: 300 }]);

    자식.emit('close', 0);
    await 답;
  });

  it('줄이 반쯤 온 동안은 세지 않고 부품 수를 넘지 않는다', async () => {
    const { 답, 자식 } = await 띄운다(요청({ runId: null, trialId: 't-1', parts: [{ kind: 'wait', ms: 1 }] }));

    자식.stdout.write(줄(1).slice(0, 30));
    await new Promise((r) => setImmediate(r));
    expect(시나리오진행()).toEqual([{ runId: null, trialId: 't-1', seq: 1, elapsedMs: expect.any(Number) }]);

    자식.stdout.write(줄(1).slice(30));
    await new Promise((r) => setImmediate(r));
    expect(시나리오진행()[0]?.seq).toBe(1);

    자식.emit('close', 0);
    await 답;
  });

  it('부품이 실패하면 그 부품에 머문다 — 뒤 부품은 돌지 않는다 (WEB-F9-14 끝 검사)', async () => {
    const { 답, 자식 } = await 띄운다(요청());

    자식.stdout.write(`@@SCENARIO_PART@@${JSON.stringify({ seq: 1, status: 'FAIL', durationMs: 1, steps: [], mocks: [] } satisfies ScenarioPartResult)}\n`);
    await new Promise((r) => setImmediate(r));
    expect(시나리오진행()[0]?.seq).toBe(1);

    자식.emit('close', 0);
    await 답;
  });

  it('끝나면 지도에서 빠진다', async () => {
    const { 답, 자식 } = await 띄운다(요청());
    자식.emit('close', 0);
    await 답;

    expect(시나리오진행()).toEqual([]);
  });
});

describe('abortScenario', () => {
  it('모르는 열쇠는 false 다', () => {
    expect(abortScenario({ scenarioRunId: 999 })).toBe(false);
    expect(abortScenario({ scenarioTrialId: 'nope' })).toBe(false);
  });

  it('정식 실행 열쇠로 끊으면 끝난 부품은 그대로, 안 끝난 부품과 전체는 ABORTED 다', async () => {
    const { 답, 자식 } = await 띄운다(요청());
    자식.stdout.write(줄(1));
    await vi.waitFor(() => { expect(시나리오진행()[0]?.seq).toBe(2); });

    expect(abortScenario({ scenarioRunId: 42 })).toBe(true);
    expect(abortScenario({ scenarioRunId: 42 })).toBe(true);
    expect(killTree).toHaveBeenCalledTimes(1);

    const 결과 = await 답;
    expect(결과).toMatchObject({ status: 'NA', error: { message: 'ABORTED' } });
    expect(결과.parts.map((p) => [p.status, p.error?.message])).toEqual([['PASS', undefined], ['NA', 'ABORTED'], ['NA', 'ABORTED']]);
  });

  it('시험 실행 열쇠로도 끊는다', async () => {
    const { 답 } = await 띄운다(요청({ runId: null, trialId: 't-9' }));

    expect(abortScenario({ scenarioRunId: 42 })).toBe(false);
    expect(abortScenario({ scenarioTrialId: 't-9' })).toBe(true);
    expect((await 답).error?.message).toBe('ABORTED');
  });

  it('제한 시간에 끊기면 TIMEOUT 이다', async () => {
    const 결과 = await executeScenario(요청({ timeoutMs: 20 }));

    expect(결과).toMatchObject({ status: 'NA', error: { message: 'TIMEOUT' } });
    expect(결과.parts.every((p) => p.error?.message === 'TIMEOUT')).toBe(true);
  });
});
