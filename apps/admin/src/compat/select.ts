// 호환성 자동 선택 — 전체 화면 목록을 덮는 작은 케이스 묶음 · 화면 커버리지 · 예상 소요 시간 (도메인/호환성 §3.13 「자동 선택」 · 「디바이스 · 점검 상태」)

import { 틀덮나 } from '../../../../scripts/authoring-crawl-rules.js';

export interface 화면 {
  key: string;
  name: string;
}

/** 고를 수 있는 케이스. 틀은 크롤러 같은 틀로 바꾼 화면 주소 · 여는 주소와 장소 열쇠(`game:World/zone:…`)다. proc 는 테스트 프로시저 안 케이스만 있다 */
export interface 후보 {
  tcId: string;
  name: string;
  틀: string[];
  proc?: { id: string; name: string; seq: number };
}

/** 고른 것 하나 — 프로시저를 골랐으면 procId · procName · tcIds(그 프로시저의 케이스 전부 · 도는 차례)가 늘고 tcId · name 은 첫 케이스 것이다 */
export interface 고른것 {
  tcId: string;
  name: string;
  adds: number;
  procId?: string;
  procName?: string;
  tcIds?: string[];
}

export interface 셈결과 {
  auto: 고른것[];
  coverage: { covered: number; total: number; fallback: boolean };
  uncovered: 화면[];
}

/** 그 케이스가 지나는 전체 목록의 화면 — 「PRD 에 없는 화면」 셈과 같은 `틀덮나`(인자 없는 주소는 인자 붙은 틀도 · 게임은 요소가 든 위 창도 덮는다) */
function 덮는것(전체: readonly 화면[], 틀: readonly string[]): Set<string> {
  const 틀들 = new Set(틀);
  return new Set(전체.filter((u) => 틀덮나(u.key, 틀들)).map((u) => u.key));
}

/** 따로 도는 단위 — 프로시저 안 케이스는 그 프로시저의 케이스 전부(proc_seq 차례), 옛 꼴 케이스 · 미션은 그 케이스 하나다 (§3.13 「테스트 프로시저」) */
export function 단위들<T extends 후보>(후보들: readonly T[]): T[][] {
  const 묶음 = new Map<string, T[]>();
  for (const c of 후보들) {
    const 열쇠 = c.proc === undefined ? `case:${c.tcId}` : `proc:${c.proc.id}`;
    묶음.set(열쇠, [...(묶음.get(열쇠) ?? []), c]);
  }
  return [...묶음.values()].map((u) => [...u].sort((a, b) => (a.proc?.seq ?? 0) - (b.proc?.seq ?? 0)));
}

/** 케이스 번호들을 실제로 도는 케이스로 편다 — 프로시저 안 케이스면 그 프로시저의 케이스가 다 든다. 후보에 없는 번호(지운 케이스)는 빠진다. 단위 차례 · 단위 안 도는 차례다 */
export function 펼치기<T extends 후보>(후보들: readonly T[], tcIds: readonly string[]): T[][] {
  const 고른 = new Set(tcIds);
  return 단위들(후보들).filter((u) => u.some((c) => 고른.has(c.tcId)));
}

/**
 * 탐욕 근사 — 아직 안 덮은 화면을 가장 많이 더하는 단위(프로시저 · 케이스)를 하나씩 고르고 더할 것이 없으면 멈춘다.
 * 같으면 지나는 화면이 적은 것 → 케이스 수가 적은 것 → 첫 케이스 tcId 차례다. 정확한 최소 묶음은 화면 수백 개에서 비싸다
 */
export function 자동선택(전체: readonly 화면[], 후보들: readonly 후보[]): 고른것[] {
  const 덮음 = 단위들(후보들).map((u) => ({ u, 화면: new Set(u.flatMap((c) => [...덮는것(전체, c.틀)])) }));
  const 덮은 = new Set<string>();
  const 고름: 고른것[] = [];
  const 앞선다 = (x: { u: 후보[]; 화면: Set<string> }, y: { u: 후보[]; 화면: Set<string> }) =>
    x.화면.size !== y.화면.size ? x.화면.size < y.화면.size : x.u.length !== y.u.length ? x.u.length < y.u.length : x.u[0]!.tcId < y.u[0]!.tcId;
  for (;;) {
    let 최고: { u: 후보[]; 화면: Set<string>; 더함: number } | null = null;
    for (const x of 덮음) {
      let 더함 = 0;
      for (const k of x.화면) if (!덮은.has(k)) 더함 += 1;
      if (더함 === 0) continue;
      if (최고 === null || 더함 > 최고.더함 || (더함 === 최고.더함 && 앞선다(x, 최고))) 최고 = { ...x, 더함 };
    }
    if (최고 === null) return 고름;
    for (const k of 최고.화면) 덮은.add(k);
    const [첫] = 최고.u;
    const proc = 첫!.proc;
    고름.push({
      tcId: 첫!.tcId,
      name: 첫!.name,
      adds: 최고.더함,
      ...(proc !== undefined && { procId: proc.id, procName: proc.name, tcIds: 최고.u.map((c) => c.tcId) }),
    });
  }
}

/** 고른 것들이 실제로 도는 케이스 번호 — 프로시저를 골랐으면 그 케이스 전부다 */
export const 고른케이스 = (auto: readonly 고른것[]): string[] => auto.flatMap((a) => a.tcIds ?? [a.tcId]);

/**
 * 자동 선택 ∪ 직접 추가가 지나는 화면으로 화면 커버리지 · 미커버 화면을 센다. 후보에 없는 직접 추가(지운 케이스)는 지나는 화면이 없다.
 * 직접 추가한 케이스가 프로시저 안이면 그 프로시저가 통째로 돌아 그 케이스 전부로 센다.
 * 자동 선택은 직접 추가와 상관없어 세트 여럿을 셀 때 한 번 구해 넘긴다
 */
export function 셈하기(전체: readonly 화면[], 후보들: readonly 후보[], 더한: readonly string[], fallback: boolean, auto = 자동선택(전체, 후보들)): 셈결과 {
  const 고른 = new Set([...고른케이스(auto), ...펼치기(후보들, 더한).flat().map((c) => c.tcId)]);
  const 지남 = new Set(후보들.filter((c) => 고른.has(c.tcId)).flatMap((c) => [...덮는것(전체, c.틀)]));
  return {
    auto,
    coverage: { covered: 지남.size, total: 전체.length, fallback },
    uncovered: 전체.filter((u) => !지남.has(u.key)),
  };
}

const 기본케이스ms = 60_000;
const 화면당점검초 = 7;
const 세션당화면상한 = 40;

/**
 * 예상 소요 시간 — 테스트는 점검 상태마다 케이스를 한 번씩 돌린 합(최근 통과 소요 평균, 없으면 1분),
 * AI 점검은 마지막 상태의 화면 수 × 7초(비전 측정 중앙값 6.7초). 화면 수는 단위마다 지나는 화면 수의 합이다 — 단위(옛 꼴 케이스 하나 · 프로시저 하나)마다 연결이 하나라
 * 따로 찍고 한 연결에 40장까지다. 케이스 수 · 소요는 프로시저도 케이스로 센다 (§3.13 「테스트 프로시저」)
 */
export function 예상하기(단위: readonly (readonly { 화면수: number; 평균ms: number | null }[])[], 상태수: number): { runs: number; testMinutes: number; checkMinutes: number } {
  const 케이스들 = 단위.flat();
  const 한바퀴ms = 케이스들.reduce((합, c) => 합 + (c.평균ms ?? 기본케이스ms), 0);
  const 화면수 = 단위.reduce((합, u) => 합 + Math.min(Math.max(1, u.reduce((n, c) => n + c.화면수, 0)), 세션당화면상한), 0);
  return {
    runs: 케이스들.length * 상태수,
    testMinutes: Math.ceil((한바퀴ms * 상태수) / 60_000),
    checkMinutes: 상태수 === 0 ? 0 : Math.ceil((화면수 * 화면당점검초) / 60),
  };
}
