// 작성 끝내기 result.cases — 이 실행이 새로 만들거나 바꾼 케이스의 모양 검사 · 어디에 실릴 수 있나 · 상세에 싣기 (SPEC 도메인/작성 §7 finish)
// DB · 서버 틀을 import 하지 않는다 — 작성 에이전트가 보내기 전에 같은 상한을 가져다 쓴다(scripts/authoring-cases.ts)

import { TCID } from '../catalog/rules.js';
import { 행의고칠것 } from './edit.js';

export interface 만든케이스 {
  tcId: string;
  name: string;
  file: string;
  change: 'NEW' | 'CHANGED';
  verifies: string[];
  reqs: string[];
}

// 상한은 서버 한 곳에 둔다 — 에이전트도 이 숫자로 자르거나 안 싣는다
export const 케이스건수상한 = 5000;
export const 확인문장수상한 = 50;
export const 케이스글상한 = 300;
export const 요구수상한 = 50;
export const 요구번호상한 = 40;

const 케이스키 = ['tcId', 'name', 'file', 'change', 'verifies', 'reqs'];

const 객체인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const 글인가 = (v: unknown, 상한: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= 상한;
const 글목록인가 = (v: unknown, 개수: number, 상한: number): v is string[] =>
  Array.isArray(v) && v.length <= 개수 && v.every((x) => 글인가(x, 상한));

/** 에이전트가 보낸 목록을 본다. 틀리면 null — 끝내기가 400 BAD_CASES 를 낸다. 같은 tcId 두 줄도 틀린 것이다 */
export function 케이스모양검사(v: unknown): 만든케이스[] | null {
  if (!Array.isArray(v) || v.length > 케이스건수상한) return null;
  const 본것 = new Set<string>();
  for (const c of v) {
    if (!객체인가(c) || Object.keys(c).some((k) => !케이스키.includes(k))) return null;
    if (typeof c.tcId !== 'string' || !TCID.test(c.tcId) || 본것.has(c.tcId)) return null;
    본것.add(c.tcId);
    if (!글인가(c.name, 케이스글상한) || !글인가(c.file, 케이스글상한)) return null;
    if (c.change !== 'NEW' && c.change !== 'CHANGED') return null;
    if (!글목록인가(c.verifies, 확인문장수상한, 케이스글상한)) return null;
    if (!글목록인가(c.reqs, 요구수상한, 요구번호상한) || new Set(c.reqs).size !== c.reqs.length) return null;
  }
  return v as 만든케이스[];
}

/**
 * 끝내기에 cases 가 실려도 되나. 싣지 않았으면 늘 맞다.
 * 작성(AUTHOR) · 재작성(RERUN)의 DONE 만 싣는다 — 케이스 고치기(EDIT · edits 를 가진 RERUN)는 만든 케이스가 아니다
 */
export function 끝내기케이스맞나(종류: string, status: string, params: unknown, cases: unknown): boolean {
  if (cases === undefined) return true;
  if (status !== 'DONE' || (종류 !== 'AUTHOR' && 종류 !== 'RERUN') || 행의고칠것(params) !== null) return false;
  return 케이스모양검사(cases) !== null;
}

/** 상세가 싣는 목록 — 저장된 result 를 읽을 때도 다시 본다. 싣지 않은 옛 행 · 모양이 틀린 행은 null */
export function 행케이스(result: unknown): 만든케이스[] | null {
  return 객체인가(result) ? 케이스모양검사(result.cases) : null;
}
