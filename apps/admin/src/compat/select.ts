// 호환성 자동 선택 — 전체 화면 목록을 덮는 작은 케이스 묶음 · 화면 커버리지 · 예상 소요 시간 (도메인/호환성 §3.13 「자동 선택」 · 「디바이스 · 점검 상태」)

import { 틀닿나 } from '../../../../scripts/authoring-crawl-rules.js';

export interface 화면 {
  key: string;
  name: string;
}

/** 고를 수 있는 케이스. 틀은 크롤러 같은 틀로 바꾼 화면 주소 · 여는 주소와 장소 열쇠(`game:World/zone:…`)다 */
export interface 후보 {
  tcId: string;
  name: string;
  틀: string[];
}

export interface 고른것 {
  tcId: string;
  name: string;
  adds: number;
}

export interface 셈결과 {
  auto: 고른것[];
  coverage: { covered: number; total: number; fallback: boolean };
  uncovered: 화면[];
}

/** 그 케이스가 지나는 전체 목록의 화면 — 「PRD 에 없는 화면」 셈과 같은 `틀닿나`(인자 없는 주소는 인자 붙은 틀도 덮는다) */
function 덮는것(전체: readonly 화면[], 틀: readonly string[]): Set<string> {
  const 틀들 = new Set(틀);
  return new Set(전체.filter((u) => 틀닿나(u.key, 틀들)).map((u) => u.key));
}

/**
 * 탐욕 근사 — 아직 안 덮은 화면을 가장 많이 더하는 케이스를 하나씩 고르고 더할 것이 없으면 멈춘다.
 * 같으면 지나는 화면이 적은 케이스 → tcId 차례다. 정확한 최소 묶음은 화면 수백 개에서 비싸다
 */
export function 자동선택(전체: readonly 화면[], 후보들: readonly 후보[]): 고른것[] {
  const 덮음 = 후보들.map((c) => ({ c, 화면: 덮는것(전체, c.틀) }));
  const 덮은 = new Set<string>();
  const 고름: 고른것[] = [];
  for (;;) {
    let 최고: { c: 후보; 화면: Set<string>; 더함: number } | null = null;
    for (const x of 덮음) {
      let 더함 = 0;
      for (const k of x.화면) if (!덮은.has(k)) 더함 += 1;
      if (더함 === 0) continue;
      if (최고 === null || 더함 > 최고.더함 || (더함 === 최고.더함 && (x.화면.size < 최고.화면.size || (x.화면.size === 최고.화면.size && x.c.tcId < 최고.c.tcId)))) {
        최고 = { ...x, 더함 };
      }
    }
    if (최고 === null) return 고름;
    for (const k of 최고.화면) 덮은.add(k);
    고름.push({ tcId: 최고.c.tcId, name: 최고.c.name, adds: 최고.더함 });
  }
}

/**
 * 자동 선택 ∪ 직접 추가가 지나는 화면으로 화면 커버리지 · 미커버 화면을 센다. 후보에 없는 직접 추가(지운 케이스)는 지나는 화면이 없다.
 * 자동 선택은 직접 추가와 상관없어 세트 여럿을 셀 때 한 번 구해 넘긴다
 */
export function 셈하기(전체: readonly 화면[], 후보들: readonly 후보[], 더한: readonly string[], fallback: boolean, auto = 자동선택(전체, 후보들)): 셈결과 {
  const 고른 = new Set([...auto.map((a) => a.tcId), ...더한]);
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
 * AI 점검은 마지막 상태의 화면 수 × 7초(비전 측정 중앙값 6.7초). 화면 수는 케이스마다 지나는 화면 수의 합이다 — 케이스 세션마다 따로 찍고 한 세션에 40장까지다
 */
export function 예상하기(케이스들: readonly { 화면수: number; 평균ms: number | null }[], 상태수: number): { runs: number; testMinutes: number; checkMinutes: number } {
  const 한바퀴ms = 케이스들.reduce((합, c) => 합 + (c.평균ms ?? 기본케이스ms), 0);
  const 화면수 = 케이스들.reduce((합, c) => 합 + Math.min(Math.max(1, c.화면수), 세션당화면상한), 0);
  return {
    runs: 케이스들.length * 상태수,
    testMinutes: Math.ceil((한바퀴ms * 상태수) / 60_000),
    checkMinutes: 상태수 === 0 ? 0 : Math.ceil((화면수 * 화면당점검초) / 60),
  };
}
