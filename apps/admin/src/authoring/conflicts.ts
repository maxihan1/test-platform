// 반영 때 겹친 케이스 — 모양 검사 · 사람이 고른 것(conflict_input) · 남은 수 · 반영에 실을 결정 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// 겹침을 찾는 것은 에이전트다(main 을 보는 쪽이 에이전트뿐이다). 서버는 그 목록을 받아 두고 사람의 결정을 모은다

import { tcId인가 } from './held.js';

export type 겹침종류 = 'TCID' | 'REQUIREMENT' | 'NAME';

/** 겹친 상대 — main 에 이미 있는 케이스 */
export interface 상대 {
  tcId: string;
  name: string;
  file: string;
}

/** 끝내기 result.conflicts[] 한 줄. 한 케이스에 종류가 여럿이면 kinds 에 모은다 */
export interface 겹침 {
  tcId: string;
  name: string;
  file: string;
  kinds: 겹침종류[];
  with: 상대[];
  requirements?: string[];
}

/** 남긴다(tc_id 가 겹칠 때만 새 번호) · 뺀다 — 게이트 1 사용자 */
export type 결정 = 'KEEP' | 'DROP';
export interface 고른것 {
  action: 결정;
  by: string;
  at: string;
}
export type 겹침입력 = Record<string, 고른것>;

/** 한 반영이 싣는 겹침 수 상한 — 끝내기 본문(1MiB)과 화면이 끝없이 커지지 않게 */
export const 겹침상한 = 200;

const 종류들: readonly string[] = ['TCID', 'REQUIREMENT', 'NAME'];
const 줄키 = ['tcId', 'name', 'file', 'kinds', 'with', 'requirements'];
const 상대키 = ['tcId', 'name', 'file'];

function 객체인가(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function 글인가(v: unknown, 상한: number): v is string {
  return typeof v === 'string' && v.length <= 상한;
}

function 상대모양(v: unknown): boolean {
  if (!객체인가(v) || Object.keys(v).some((k) => !상대키.includes(k))) return false;
  return tcId인가(v.tcId) && 글인가(v.name, 300) && 글인가(v.file, 500) && v.file !== '';
}

function 줄모양(v: unknown): v is 겹침 {
  if (!객체인가(v) || Object.keys(v).some((k) => !줄키.includes(k))) return false;
  if (!tcId인가(v.tcId) || !글인가(v.name, 300) || !글인가(v.file, 500) || v.file === '') return false;
  const { kinds, with: 상대들, requirements } = v;
  if (!Array.isArray(kinds) || kinds.length === 0 || new Set(kinds).size !== kinds.length) return false;
  if (!kinds.every((k) => typeof k === 'string' && 종류들.includes(k))) return false;
  if (!Array.isArray(상대들) || 상대들.length > 20 || !상대들.every(상대모양)) return false;
  if (requirements === undefined) return true;
  return Array.isArray(requirements) && requirements.length <= 20 && requirements.every((r) => 글인가(r, 100) && r !== '');
}

/**
 * 반영 FAILED 의 result.conflicts 모양. 맞으면 그대로, 아니면 null(→ 400 BAD_CONFLICTS).
 * 이 목록이 화면의 고르기 칸과 「무엇을 골라야 반영되나」를 정한다 — 느슨하면 없는 케이스를 고르라고 한다
 */
export function 겹침모양검사(v: unknown): 겹침[] | null {
  if (!Array.isArray(v) || v.length > 겹침상한) return null;
  const 본것 = new Set<string>();
  for (const 줄 of v) {
    if (!줄모양(줄) || 본것.has(줄.tcId)) return null;
    본것.add(줄.tcId);
  }
  return v as 겹침[];
}

/** 저장된 반영 결과의 겹침 목록 — 끝내기에서 모양을 본 뒤 저장된 값이다 */
export function 겹침들(result: unknown): 겹침[] {
  const 목록 = 객체인가(result) ? result.conflicts : undefined;
  return Array.isArray(목록) ? (목록 as 겹침[]) : [];
}

export function 결정인가(v: unknown): v is 결정 {
  return v === 'KEEP' || v === 'DROP';
}

/** 고르지 않은 겹침 수 — 0 보다 크면 반영이 409 CONFLICT_OPEN */
export function 남은겹침수(목록: 겹침[], 입력: 겹침입력 | null): number {
  return 목록.filter((c) => !결정인가(입력?.[c.tcId]?.action)).length;
}

/**
 * 반영 행을 가져갈 때 싣는 결정 — **전부** 싣는다. 지금 목록으로 거르면 한 번 적용한 결정이
 * CI 빨강 뒤 다시 반영에서 사라진다(그 실패에는 겹침 목록이 없다). 거르기는 에이전트가 새로 찾은 목록으로 한다
 */
export function 가져갈결정(입력: 겹침입력 | null): { tcId: string; action: 결정 }[] {
  return Object.entries(입력 ?? {})
    .filter(([, 고른]) => 결정인가(고른.action))
    .map(([tcId, 고른]) => ({ tcId, action: 고른.action }));
}
