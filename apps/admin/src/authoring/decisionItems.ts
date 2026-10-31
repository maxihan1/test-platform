// 결정 목록의 항목 모양과 DB 없이 도는 규칙 — 확인 필요 셋 가르기 · 셈 · 화면 목록 지문 · 결정 버전 짓기 (도메인/작성 §3.6 「★ 결정 목록」 · §7 「결정 목록 통로」)

import { createHash } from 'node:crypto';

import type { PrdItem } from '@platform/kit';

import { 상한, 화면에서 } from '../prd/rules.js';
import type { 초안카드 } from '../bts/draftDecide.js';
import type { 판변경 } from '../prd/changes.js';
import type { 목록요약 } from './listSummary.js';

// TAKE · DROP · RETRY 는 「PRD 초안」 카드 — 고른 줄로 기획서 고치기 · 초안 버리기 · 실패한 초안 다시 만들기 (도메인/BTS 「PRD 초안 → 결정 필요」)
export type 고르기 = 'APPLY' | 'SCREEN' | 'BUG' | 'SAME' | 'EDIT' | 'PICK' | 'OWN' | 'REDO' | 'FIX' | 'TAKE' | 'DROP' | 'RETRY';
export type 막힘 = 'ADMIN_ONLY' | 'NO_WRITE' | 'NO_RUN_WRITE' | 'AUTHORING_OPEN';

interface 머리 {
  key: string;
  group: 1 | 2 | 3;
  picks: 고르기[];
  blockedBy: 막힘 | null;
  /** ③ 이 열린 반영 대기를 기다리는데 부른 사람이 admin 이면 단다 — ① 을 모두 「올린다」로 골라야 켠다 */
  needsApply?: true;
}

export interface 바뀐요구줄 {
  reqId: string;
  text: string | null;
  oldText: string | null;
}

export type 결정항목 = 머리 &
  (
    | { kind: 'APPLY'; rootId: number; runId: number; summary: 목록요약; prUrl: string | null; requestedByName: string; finishedAt: string | null }
    | { kind: 'FIX'; rootId: number; summary: 목록요약; why: 'APPLY_FAILED' | 'HELD' | 'CONFLICT'; count: number; waiting: number[] }
    | { kind: 'FAIL'; runId: number; tcId: string; reqs: { reqId: string; text: string }[]; verify: string | null; reason: string | null; finishedAt: string | null }
    | { kind: 'CHECK'; reqId: string; feature: string; text: string; checkSince: string | null; basis: 'SCREEN' | 'DOCS' | 'OTHER'; options: { asset: string; quote: string }[] }
    | { kind: 'PRD_CHANGED'; changed: 바뀐요구줄[] | null; added: 바뀐요구줄[] | null; removed: 바뀐요구줄[] | null; scenarios: { id: number; name: string }[] }
    | { kind: 'API_CHANGED'; fromVersion: number; toVersion: number; operations: { method: string; path: string; change: 'NEW' | 'CHANGED' | 'REMOVED'; breaking: boolean }[] | null }
    | { kind: 'SCREENS'; screens: { state: string; url: string; name: string }[] | null; env: string | null }
    | { kind: 'APIS'; apis: { method: string; path: string; name: string | null }[] | null }
    | ({ kind: 'PRD_DRAFT' } & 초안카드)
  );

export interface 결정목록 {
  prdVersion: number;
  count: number;
  open: number[];
  items: 결정항목[];
  failMore: number;
}

/**
 * 확인 필요 요구가 어느 갈래인가 — 근거가 모두 화면이면 SCREEN, 근거 자료가 둘 이상이고 원문이 서로 다르면 DOCS, 그 밖은 OTHER.
 * DOCS 만 options(근거 차례)를 싣는다 — 「문구 선택」이 고른 출처의 원문을 그대로 요구 문장으로 쓴다
 */
export function 확인갈래(x: PrdItem): { basis: 'SCREEN' | 'DOCS' | 'OTHER'; options: { asset: string; quote: string }[] } {
  if (x.basis.every((b) => b.from === 화면에서)) return { basis: 'SCREEN', options: [] };
  const 자료 = new Set(x.basis.map((b) => b.from));
  const 원문 = new Set(x.basis.map((b) => b.quote));
  if (자료.size >= 2 && 원문.size >= 2) return { basis: 'DOCS', options: x.basis.map((b) => ({ asset: b.from, quote: b.quote })) };
  return { basis: 'OTHER', options: [] };
}

/** 「반영 안 됨」 번호들을 문장과 옛 문장으로 편다 — 더한 것은 옛 문장이, 지운 것은 새 문장이 없다 */
export function 바뀐요구펴기(
  차이: { changed: string[]; added: string[]; removed: string[] },
  기준: PrdItem[] | null,
  지금: PrdItem[],
): { changed: 바뀐요구줄[]; added: 바뀐요구줄[]; removed: 바뀐요구줄[] } {
  const 옛 = new Map((기준 ?? []).map((x) => [x.reqId, x.text]));
  const 새 = new Map(지금.map((x) => [x.reqId, x.text]));
  const 줄 = (reqId: string): 바뀐요구줄 => ({ reqId, text: 새.get(reqId) ?? null, oldText: 옛.get(reqId) ?? null });
  return { changed: 차이.changed.map(줄), added: 차이.added.map(줄), removed: 차이.removed.map(줄) };
}

/** 미검증 화면 열쇠의 지문 — 사람이 본 목록과 진행 때 목록이 같은지 본다 */
export function 화면지문(screens: { state: string; url: string }[]): string {
  return createHash('sha256').update(JSON.stringify(screens.map((x) => [x.state, x.url]))).digest('hex').slice(0, 16);
}

/**
 * 「결정 필요 N」 — 부른 사람이 지금 고를 수 있는 항목 수. FAIL 은 20건 상한 밖(failMore)도 센다 — 같은 사람에게 FAIL 의 고르기는 모두 같다
 */
export function 결정수세기(items: 결정항목[], failMore: number): number {
  const 고를것 = items.filter((x) => x.picks.length > 0);
  return 고를것.length + (고를것.some((x) => x.kind === 'FAIL') ? failMore : 0);
}

/**
 * API 문서의 요약 이름. 문서 경로(`/orders/{id}`)와 서비스 지도 틀(`/orders/:n`)은 칸 글자가 달라 마디마다 견준다 — 문서의 `{…}` 마디는 틀의 `:…` 마디와 맞는다
 */
export function API요약이름(이름들: readonly { method: string; path: string; summary: string }[], method: string, path: string): string | null {
  const 틀 = path.split('/');
  const 맞나 = (문서경로: string) => {
    const 마디 = 문서경로.split('/');
    return 마디.length === 틀.length && 마디.every((m, i) => m === 틀[i] || (/^\{[^}]+\}$/.test(m) && 틀[i]!.startsWith(':')));
  };
  return 이름들.find((x) => x.method === method && 맞나(x.path))?.summary ?? null;
}

/** 문서의 API 마다 summary — 글자인 것만 */
export function 요약이름들(문서: Record<string, unknown>): { method: string; path: string; summary: string }[] {
  const paths = typeof 문서.paths === 'object' && 문서.paths !== null ? (문서.paths as Record<string, unknown>) : {};
  const 결과: { method: string; path: string; summary: string }[] = [];
  for (const [path, 줄] of Object.entries(paths)) {
    if (typeof 줄 !== 'object' || 줄 === null) continue;
    for (const [m, op] of Object.entries(줄 as Record<string, unknown>)) {
      const summary = typeof op === 'object' && op !== null ? (op as { summary?: unknown }).summary : undefined;
      if (typeof summary === 'string' && summary.trim() !== '') 결과.push({ method: m.toUpperCase(), path, summary: summary.trim() });
    }
  }
  return 결과;
}

/** 확인 필요 하나를 어떻게 정했나 — SAME 은 확정만, 나머지는 새 문장으로 확정한다 */
export type 확인결정 =
  | { reqId: string; pick: 'SAME' }
  | { reqId: string; pick: 'EDIT' | 'OWN'; text: string }
  | { reqId: string; pick: 'PICK'; text: string; asset: string };

/**
 * 결정 버전의 항목 — 고른 번호만 확정 · 사람이 고친 것으로 바꾸고 checkSince 를 뺀다. 문장 변경 · 문구 선택 · 직접 입력은 요구 문장을 바꾼다.
 * 근거는 그대로 둔다 — 사람이 고친 것(byPerson)이라 다음 옮기기가 덮지 않는다. 고른 번호가 지금 판에서 확인 필요가 아니면 null
 */
export function 결정판(지금: PrdItem[], 결정들: 확인결정[]): { items: PrdItem[]; changes: 판변경[]; 문장바뀜: boolean } | null {
  const 고른 = new Map(결정들.map((x) => [x.reqId, x]));
  if (결정들.some((x) => 지금.find((y) => y.reqId === x.reqId)?.status !== 'NEEDS_CHECK')) return null;
  const changes: 판변경[] = [];
  let 문장바뀜 = false;
  const items = 지금.map((x): PrdItem => {
    const 결정 = 고른.get(x.reqId);
    if (결정 === undefined) return x;
    const { checkSince: _뺌, ...나머지 } = x;
    if (결정.pick === 'SAME') {
      changes.push({ kind: 'CONFIRM', reqId: x.reqId, text: null, asset: null, tcId: null });
      return { ...나머지, status: 'CONFIRMED', byPerson: true };
    }
    // 문구 선택은 지금 문장과 같은 쪽을 골라도 어느 자료를 골랐는지 남긴다 — 버전 기록의 까닭 「<자료 이름> 쪽」
    if (결정.text === x.text && 결정.pick !== 'PICK') {
      changes.push({ kind: 'CONFIRM', reqId: x.reqId, text: null, asset: null, tcId: null });
      return { ...나머지, status: 'CONFIRMED', byPerson: true };
    }
    if (결정.text !== x.text) 문장바뀜 = true;
    changes.push({ kind: 결정.pick === 'PICK' ? 'PICK' : 'EDIT', reqId: x.reqId, text: 결정.text, asset: 결정.pick === 'PICK' ? 결정.asset : null, tcId: null });
    return { ...나머지, text: 결정.text, status: 'CONFIRMED', byPerson: true };
  });
  return { items, changes, 문장바뀜 };
}

/** 사람이 적은 요구 문장 — PUT /api/prd 와 같은 상한. 비었거나 넘으면 null */
export function 요구문장(값: unknown): string | null {
  return typeof 값 === 'string' && 값.trim() !== '' && 값.length <= 상한.요구문장 ? 값 : null;
}
