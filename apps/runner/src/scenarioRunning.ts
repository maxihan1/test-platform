// 돌고 있는 E2E 시나리오 자식의 지도 — 지금 부품(진행)과 중단 (SPEC 도메인/러너 §5.2 「시나리오 진행 · 중단」)

import type { ChildProcess } from 'node:child_process';

import type { RunningScenario, ScenarioExecuteRequest } from '@platform/kit';

import type { KilledBy } from './execute.js';
import { killTree } from './kill.js';

// 열쇠는 정식 실행이면 run:<runId>, 시험 실행이면 trial:<trialId> — 케이스의 historyId 와 열쇠 꼴이 달라 지도를 따로 둔다
export interface 도는시나리오 {
  child: ChildProcess;
  killedBy: KilledBy | null;
  runId: number | null;
  trialId: string | undefined;
  total: number;
  받은줄수: number;
  // 마지막 결과 줄이 실패였다 — 뒤 부품은 안 돈다(parseParts 가 실패 뒤를 버린다). 지금 부품은 그 실패한 부품이다
  실패함: boolean;
  // 지금 부품이 시작한 때 — 첫 부품은 자식을 띄운 때, 그 뒤는 앞 결과 줄을 받은 때
  부품시작: number;
  // 끊은 순간에 잰 돌던 부품 시간 — 끊은 뒤 정리(프로세스 정리 · 폰 연결 닫기 · trace 옮기기)가 끝난 때 재면 그 시간까지 섞인다
  돌던ms?: number;
}
export const runningScenarios = new Map<string, 도는시나리오>();

export const 열쇠 = (req: Pick<ScenarioExecuteRequest, 'runId' | 'trialId'>): string =>
  req.runId === null ? `trial:${req.trialId ?? ''}` : `run:${String(req.runId)}`;

// 경과는 묻는 그 순간에 잰다 — 받는 쪽 시계와의 차가 오차로 남지 않게 (케이스 /progress 와 같다)
export function 시나리오진행(): RunningScenario[] {
  return [...runningScenarios.values()].map((e) => ({
    runId: e.runId,
    ...(e.trialId === undefined ? {} : { trialId: e.trialId }),
    seq: e.실패함 ? e.받은줄수 : Math.min(e.받은줄수 + 1, e.total),
    elapsedMs: Date.now() - e.부품시작,
  }));
}

// 끊는 방식은 제한 시간과 같다. 모르는 열쇠는 경합이라 false 이고, 이미 죽인 것은 true 다 — 먼저 찍힌 사유가 이긴다 (execute.ts abort 와 같다)
export function abortScenario(k: { scenarioRunId: number } | { scenarioTrialId: string }): boolean {
  const entry = runningScenarios.get('scenarioRunId' in k ? `run:${String(k.scenarioRunId)}` : `trial:${k.scenarioTrialId}`);
  if (entry === undefined) return false;
  if (entry.killedBy !== null) return true;
  entry.killedBy = 'ABORTED';
  entry.돌던ms = Date.now() - entry.부품시작;
  killTree(entry.child);
  return true;
}
