// E2E 프로시저 단계의 판정 계산 — 서버가 준 케이스마다의 칸을 실행 결과 화면(runFlow.ts)이 쓰는 줄 판정으로 바꾼다 (도메인/시나리오 §3.7 결정 17)

import type { ScenarioPart } from '@platform/kit';

import type { ItemStatus } from './api.js';
import { 막힌항목, type 줄판정 } from './runFlow.js';
import type { 프로시저칸, 프로시저케이스 } from './scenarioApi.js';

/** 조립 화면이 단계 카드에 그리는 프로시저 — 단계의 케이스 번호가 지금 든 프로시저와 그 케이스(도는 차례) */
export interface 프로시저정보 {
  procId: string;
  procName: string;
  cases: { tcId: string; name: string }[];
}

/** 프로시저 단계가 아니면 null — 옛 꼴 케이스 · 웹 · API 부품에는 procId 가 없다 */
export function 프로시저읽기(part: 프로시저칸): 프로시저정보 | null {
  return part.procId === undefined ? null : { procId: part.procId, procName: part.procName ?? '', cases: (part.cases ?? []).map((c) => ({ tcId: c.tcId, name: c.name ?? '' })) };
}

/** 서버가 단계에 실어 준 프로시저 칸을 떼어 단계는 맨몸으로 돌려준다 — 저장 때 되돌려 보내지 않으려고 초안에는 맨몸만 둔다 */
export function 프로시저떼기(parts: (ScenarioPart & 프로시저칸)[]): { 단계들: ScenarioPart[]; 정보: Map<string, 프로시저정보> } {
  const 정보 = new Map<string, 프로시저정보>();
  const 단계들 = parts.map((p): ScenarioPart => {
    const { procId, procName, cases, ...맨몸 } = p;
    if (맨몸.kind === 'case' && procId !== undefined) 정보.set(맨몸.tcId, { procId, procName: procName ?? '', cases: (cases ?? []).map((c) => ({ tcId: c.tcId, name: c.name ?? '' })) });
    return 맨몸;
  });
  return { 단계들, 정보 };
}

/**
 * 케이스 한 줄의 판정 — status 가 없으면 안 돈 것(Not tested)이고, 도는 중인 실행에서는 아직 판정이 없어 「도는 중」이다.
 * Blocked 는 status 'NA' + message 'BLOCKED' (또는 막은 케이스 번호)다
 */
export function 케이스판정(c: 프로시저케이스, 실행중: boolean): 줄판정 {
  if (c.status === undefined) return { status: 'NA', blocked: false, 도는중: 실행중 };
  return { status: c.status, blocked: 막힌항목({ status: c.status, error: c.error ?? null, blockedBy: c.blockedBy }), 도는중: false };
}

/** Blocked 사유 글자의 재료 — 막은 케이스가 같은 실행에서 어떻게 끝났는지. 그 케이스도 Blocked 면 까닭을 모른다(undefined) */
export function 막은판정(cases: 프로시저케이스[], blockedBy: string): ItemStatus | undefined {
  const 막은 = cases.find((c) => c.tcId === blockedBy);
  if (막은?.status === undefined) return undefined;
  return 막힌항목({ status: 막은.status, error: 막은.error ?? null, blockedBy: 막은.blockedBy }) ? undefined : 막은.status;
}

/** 저장본을 열 때 프로시저 단계의 건너뛸 제목을 뺀다 — 저장 · 시험 실행이 400 으로 거절하는데 프로시저 단계는 화면에서 고칠 길이 없다 (도메인/시나리오 §3.7 결정 17 「케이스가 바뀌었을 때」) */
export function 프로시저건너뛰기빼기(parts: ScenarioPart[], 정보: ReadonlyMap<string, 프로시저정보>): ScenarioPart[] {
  return parts.map((p) => (p.kind === 'case' && 정보.has(p.tcId) && p.skipSteps.length > 0 ? { ...p, skipSteps: [] } : p));
}

/** 시나리오에 이미 든 프로시저 번호들 — 다음 단계 추천 · 첫 단계 후보에서 그 프로시저의 케이스를 뺀다 */
export function 든프로시저들(단계들: ScenarioPart[], 번호: (tcId: string) => string | undefined): Set<string> {
  const 모음 = new Set<string>();
  for (const p of 단계들) {
    const id = p.kind === 'case' ? 번호(p.tcId) : undefined;
    if (id !== undefined) 모음.add(id);
  }
  return 모음;
}
