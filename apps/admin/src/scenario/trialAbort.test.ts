// E2E 시험 실행 중단 상태 검사 — 보내기 전에 닫은 결과 · 러너 답의 부품 고치기 · 멈춘 뒤에는 러너에 안 보내기 (DB 없이 돈다)

import type { ScenarioExecuteRequest, ScenarioExecuteResponse } from '@platform/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../execution/runner.js', () => ({
  callScenarioRunner: vi.fn(async (): Promise<ScenarioExecuteResponse> => ({ status: 'PASS', durationMs: 1, parts: [] })),
}));

const { callScenarioRunner } = await import('../execution/runner.js');
const { 멈춘부품을고친다, 보내기전멈춘결과, 보내는길, 상태를연다, 상태를지운다, 상태찾기 } = await import('./trialAbort.js');

const 부품 = (seq: number, status: 'PASS' | 'NA', message?: string) => ({
  seq, status, durationMs: 1, steps: [], mocks: [], ...(message === undefined ? {} : { error: { message } }),
});
const 요청 = { runId: null, trialId: 't-1', platform: 'desktop', baseUrl: 'http://x', timeoutMs: 1000, parts: [{ kind: 'wait', ms: 1 }, { kind: 'wait', ms: 1 }] } as ScenarioExecuteRequest;

beforeEach(() => {
  vi.mocked(callScenarioRunner).mockClear();
});

describe('보내기전멈춘결과', () => {
  it('전체는 NA · STOPPED 이고 부품은 하나도 안 돌았으니 전부 NA · NOT_RUN 이다', () => {
    const 결과 = 보내기전멈춘결과(3);

    expect(결과).toMatchObject({ status: 'NA', durationMs: 0, error: { message: 'STOPPED' } });
    expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'NA', 'NOT_RUN'], [2, 'NA', 'NOT_RUN'], [3, 'NA', 'NOT_RUN']]);
  });
});

describe('멈춘부품을고친다', () => {
  it('끊긴 답이면 머리는 STOPPED, 돌던 부품(첫 ABORTED)은 STOPPED 와 걸린 시간 그대로, 그 뒤는 NOT_RUN 이다', () => {
    const 답: ScenarioExecuteResponse = {
      status: 'NA', durationMs: 5, error: { message: 'ABORTED' },
      parts: [부품(1, 'PASS'), { ...부품(2, 'NA', 'ABORTED'), durationMs: 13000 }, 부품(3, 'NA', 'ABORTED'), 부품(4, 'NA', 'NOT_RUN')],
    };

    const 고침 = 멈춘부품을고친다(답);

    expect(고침.error?.message).toBe('STOPPED');
    expect(고침.parts.map((p) => [p.error?.message, p.durationMs])).toEqual([[undefined, 1], ['STOPPED', 13000], ['NOT_RUN', 0], ['NOT_RUN', 1]]);
  });

  it('답에 돌던 부품이 없으면(줄이 빠진 답) 비어 있는 첫 부품을 STOPPED 로, 나머지를 NOT_RUN 으로 채운다', () => {
    const 답: ScenarioExecuteResponse = { status: 'NA', durationMs: 5, error: { message: 'ABORTED' }, parts: [부품(1, 'PASS')] };

    const 고침 = 멈춘부품을고친다(답, 3);

    expect(고침.parts.map((p) => [p.seq, p.status, p.error?.message, p.durationMs])).toEqual([[1, 'PASS', undefined, 1], [2, 'NA', 'STOPPED', 0], [3, 'NA', 'NOT_RUN', 0]]);
  });

  it('앞 부품이 실패해 멈춘 답이면 돌던 부품을 만들어 채우지 않는다', () => {
    const 답: ScenarioExecuteResponse = { status: 'NA', durationMs: 5, error: { message: 'ABORTED' }, parts: [{ ...부품(1, 'PASS'), status: 'FAIL' }] };

    expect(멈춘부품을고친다(답, 3).parts).toHaveLength(1);
  });

  it('끊긴 답이 아니면 건드리지 않는다', () => {
    const 답: ScenarioExecuteResponse = { status: 'NA', durationMs: 5, error: { message: 'TIMEOUT' }, parts: [부품(1, 'NA', 'TIMEOUT')] };

    expect(멈춘부품을고친다(답)).toBe(답);
  });
});

describe('보내는길', () => {
  it('멈추지 않았으면 러너에 보내고 보냄을 적는다', async () => {
    const 상태 = 상태를연다('t-1', 2);

    await 보내는길(상태)(요청);

    expect(callScenarioRunner).toHaveBeenCalledWith(요청);
    expect(상태.보냄).toBe(true);
    상태를지운다('t-1');
  });

  it('멈췄으면 러너에 보내지 않고 닫은 결과를 돌려준다 — 보냄도 적지 않는다', async () => {
    const 상태 = 상태를연다('t-2', 2);
    상태.멈춤 = true;

    const 결과 = await 보내는길(상태)(요청);

    expect(callScenarioRunner).not.toHaveBeenCalled();
    expect(상태.보냄).toBe(false);
    expect(결과.parts.map((p) => p.error?.message)).toEqual(['NOT_RUN', 'NOT_RUN']);
    상태를지운다('t-2');
  });

  it('상태는 열고 지울 수 있다', () => {
    상태를연다('t-3', 1);
    expect(상태찾기('t-3')).toMatchObject({ 보냄: false, 멈춤: false, 부품수: 1 });

    상태를지운다('t-3');
    expect(상태찾기('t-3')).toBeUndefined();
  });
});
