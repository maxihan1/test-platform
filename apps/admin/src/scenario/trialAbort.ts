// E2E 시험 실행의 중단 상태 — 러너에 보냈는지 · 멈췄는지를 들고, 멈춘 결과의 모양을 정한다 (SPEC 도메인/실행 §3.2 「E2E 도 지금 단계를 알리고 끊는다」)

import type { ScenarioExecuteRequest, ScenarioExecuteResponse } from '@platform/kit';

import { callScenarioRunner } from '../execution/runner.js';

/**
 * 도는 시험마다 러너에 보냈는지와 멈췄는지. 보내기 전이면 중단을 admin 이 닫고, 보낸 뒤면 러너가 끊는다.
 * 케이스 시험 실행(execution/trialRoutes.ts)의 같은 이름 규칙이다. 일이 끝나면 지운다
 */
export interface 시험상태 {
  보냄: boolean;
  멈춤: boolean;
  부품수: number;
}

const 상태들 = new Map<string, 시험상태>();

export function 상태를연다(id: string, 부품수: number): 시험상태 {
  const 상태: 시험상태 = { 보냄: false, 멈춤: false, 부품수 };
  상태들.set(id, 상태);
  return 상태;
}

export const 상태를지운다 = (id: string): void => void 상태들.delete(id);
export const 상태찾기 = (id: string): 시험상태 | undefined => 상태들.get(id);

/** 러너에 보내지 않고 닫은 시험의 결과 — 전체 NA · 'ABORTED', 부품은 전부 NA · 'STOPPED'. 부품의 'ABORTED' 는 재기동 복구 몫이다 (도메인/시나리오 §8.11) */
export function 보내기전멈춘결과(부품수: number): ScenarioExecuteResponse {
  return {
    status: 'NA',
    durationMs: 0,
    parts: Array.from({ length: 부품수 }, (_, i) => ({
      seq: i + 1, status: 'NA' as const, durationMs: 0, steps: [], mocks: [], error: { message: 'STOPPED' },
    })),
    error: { message: 'ABORTED' },
  };
}

/** 러너가 끊고 돌려준 답은 그대로이되, 안 끝난 부품의 'ABORTED' 만 'STOPPED' 로 바꾼다. 끊긴 답이 아니면 건드리지 않는다 */
export function 멈춘부품을고친다<R extends ScenarioExecuteResponse>(응답: R): R {
  if (응답.error?.message !== 'ABORTED') return 응답;
  return { ...응답, parts: 응답.parts.map((p) => (p.status === 'NA' && p.error?.message === 'ABORTED' ? { ...p, error: { ...p.error, message: 'STOPPED' } } : p)) };
}

/**
 * 러너로 보내는 길. 멈췄으면 보내지 않고 닫은 결과를 돌려준다 — 폰을 잡은 뒤에도 한 번 더 본다.
 * 멈췄나를 보고 보냄을 적는 사이에 await 가 없어 중단은 둘 중 한 갈래만 탄다
 */
export function 보내는길(상태: 시험상태): (요청: ScenarioExecuteRequest) => Promise<ScenarioExecuteResponse> {
  return async (요청) => {
    if (상태.멈춤) return 보내기전멈춘결과(요청.parts.length);
    상태.보냄 = true;
    return callScenarioRunner(요청);
  };
}
