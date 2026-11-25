// 성능 시나리오 마법사를 열 때 네 단계의 첫 값 — 저장한 시나리오가 있으면 그 값, 없으면 기본값 (도메인/성능 §8.14)

import type { ServiceRow } from './api.js';
import { 마지막서버 } from './layout.js';
import type { PerfScenario, ScenarioBody } from './perfApi.js';
import type { 이단계값 } from './PerfStepLoad.js';
import type { 사단계값 } from './PerfStepRun.js';
import type { 일단계값 } from './PerfStepScenario.js';
import type { 삼단계값 } from './PerfStepTargets.js';
import { 구간만들기, 기본부하칸 } from './perfView.js';

export function 처음값(s: PerfScenario | null, service: ServiceRow): { 일: 일단계값; 이: 이단계값; 삼: 삼단계값; 사: 사단계값 } {
  const b: ScenarioBody = s?.body ?? {};
  const r = b.run ?? {};
  const 칸 = { maxVus: r.maxVus ?? 기본부하칸.maxVus, rampMin: r.rampMin ?? 기본부하칸.rampMin, holdMin: r.holdMin ?? 기본부하칸.holdMin, peakVus: r.peakVus };
  const testType = b.load?.testType ?? 'LOAD';
  const env = r.env !== undefined && service.envs.some((it) => it.env === r.env) ? r.env : 마지막서버(service.prefix, service.envs);
  return {
    일: { name: s?.name ?? '', 방식: b.dummyClient === undefined ? 'TX' : 'DUMMY', 더미번호: b.dummyClient ?? null, transactions: b.transactions ?? [], notes: {}, 가져온: null },
    이: { testType, basis: b.load?.basis ?? 'VUS', 칸, stages: b.load?.stages ?? 구간만들기(testType, 칸) },
    삼: { targets: b.targets ?? [], aiBasis: [], degradeAlert: r.degradeAlert ?? true },
    사: { env, agentIds: r.agentIds ?? [], monitorIds: r.monitorIds ?? [], pageCheck: r.pageCheck ?? false },
  };
}
