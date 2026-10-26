// 결정 목록의 판단 — 고른 것 중 보낼 것 · ③ 이 켜졌나 · 「진행하면 이렇게 됩니다」 차례. 그림은 AuthoringDecide*.tsx 가 그린다 (도메인/작성 §3.6 「★ 결정 목록」 진행)

import { 상한 } from '../prd/rules.js';
import type { 결정항목, 고르기, 보낼고름 } from './decideApi.js';

/** 항목 하나에 고른 값. 「나중에」도 고른 것이라 화면에 눌린 채 남지만 보내지는 않는다 */
export interface 고른값 {
  pick: 고르기 | 'LATER';
  text?: string;
  option?: number;
  env?: string;
}

export type 고른표 = ReadonlyMap<string, 고른값>;

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;

/** ① 을 모두 「올린다」로 골랐나 */
const 다올림 = (items: readonly 결정항목[], 고른: 고른표) => items.every((y) => y.kind !== 'APPLY' || 고른.get(y.key)?.pick === 'APPLY');

/** ③ 이 반영 대기를 기다리면 ① 을 모두 「올린다」로 골라야 켠다 — 서버도 같은 것을 본다(BAD_PICK) */
export function 켜졌나(x: 결정항목, items: readonly 결정항목[], 고른: 고른표): boolean {
  return x.needsApply !== true || 다올림(items, 고른);
}

/** 요구 문장 상한을 넘었나 — 서버(PUT /api/prd 와 같은 상한)가 진행 전체를 BAD_PICK 으로 거절하므로 미리 빼고 칸 곁에 알린다 */
export const 넘치나 = (글: string) => 글.length > 상한.요구문장;

/** ① 을 「올린다」에서 바꾸면 그것을 기다리던 ③ 고름도 뺀다 — 남기면 보낼 수 없는 고름이 눌린 채 보인다 */
export function 고름바꾼표(items: readonly 결정항목[], 고른: 고른표, key: string, 값: 고른값 | null): Map<string, 고른값> {
  const 새 = new Map(고른);
  if (값 === null) 새.delete(key);
  else 새.set(key, 값);
  const 올림 = 다올림(items, 새);
  for (const x of items) if (x.needsApply === true && !올림) 새.delete(x.key);
  return 새;
}

/** 확인 필요 하나가 요구 문장을 바꾸나 — 같은 문장을 적으면 서버도 확정으로 본다(decisionItems.ts `결정판`) */
function 문장(x: 항목of<'CHECK'>, 값: 고른값): string | null {
  const 글 = 값.pick === 'PICK' ? (값.option === undefined ? undefined : x.options[값.option]?.quote) : 값.pick === 'EDIT' || 값.pick === 'OWN' ? 값.text : undefined;
  return 글 === undefined || 글.trim() === '' || 넘치나(글) ? null : 글;
}

/** 다 고른 것만 보낸다 — 문장 칸이 비었거나 넘쳤거나 대상 서버를 안 고른 것은 사람이 아직 고르는 중이다 */
export function 보낼것(items: readonly 결정항목[], 고른: 고른표): 보낼고름[] {
  const 올림 = 다올림(items, 고른);
  return items.flatMap((x): 보낼고름[] => {
    const 값 = 고른.get(x.key);
    if (값 === undefined || 값.pick === 'LATER' || !x.picks.includes(값.pick) || (x.needsApply === true && !올림)) return [];
    if (x.kind === 'CHECK' && 값.pick !== 'SAME') {
      const 새문장 = 문장(x, 값);
      if (새문장 === null) return [];
      return [값.pick === 'PICK' ? { key: x.key, pick: 'PICK', option: 값.option! } : { key: x.key, pick: 값.pick, text: 새문장 }];
    }
    if (x.kind === 'API_CHANGED' || (x.kind === 'SCREENS' && x.env === null)) {
      return (값.env ?? '') === '' ? [] : [{ key: x.key, pick: 값.pick, env: 값.env! }];
    }
    return [{ key: x.key, pick: 값.pick }];
  });
}

export type 차례줄 =
  | { 곳: 'BUG'; 종류: 'bug'; keys: string[]; tcId: string }
  | { 곳: 'PRD'; 종류: 'prd'; keys: string[]; version: number; 바뀜: { kind: 'EDIT' | 'PICK' | 'CONFIRM'; reqId: string }[] }
  | { 곳: 'TEST'; 종류: 'apply'; keys: string[]; rootId: number }
  | { 곳: 'TEST'; 종류: 'fix'; keys: string[]; 화면: number; 문장: number; 바뀐요구: boolean; 바뀐요구수: number | null; 같이: boolean }
  | { 곳: 'TEST'; 종류: 'api'; keys: string[]; 수: number | null }
  | { 곳: 'TEST'; 종류: 'screens'; keys: string[]; 수: number | null };

/** 바뀐 요구 묶음의 번호 수. 열린 작성이 있으면 서버가 null 로 준다 */
export function 바뀐요구수(x: 항목of<'PRD_CHANGED'>): number | null {
  return x.changed === null || x.added === null || x.removed === null ? null : x.changed.length + x.added.length + x.removed.length;
}

/** 바뀐 API 가운데 다시 쓸 것 — 없어진 API 는 그 케이스를 PR 에 삭제 제안만 한다 */
export const 다시쓸API = (x: 항목of<'API_CHANGED'>) => (x.operations === null ? null : x.operations.filter((o) => o.change !== 'REMOVED'));

/**
 * 「진행하면 이렇게 됩니다」 — 서버가 도는 차례 그대로(decisionRun.ts): 버그 → 기획서 새 버전 → 반영 → 고치기 · 다시 만들기 → 보완.
 * 문장이 바뀌거나 화면이 맞음을 고르면 바뀐 요구를 안 골라도 같은 요청에서 같이 다시 만든다 — 기준 판이 하나라서다
 */
export function 차례(items: readonly 결정항목[], 고른: 고른표, prdVersion: number): 차례줄[] {
  const 보냄 = new Map(보낼것(items, 고른).map((p) => [p.key, p]));
  const 고른항목 = items.filter((x) => 보냄.has(x.key));
  const 줄: 차례줄[] = [];
  for (const x of 고른항목) if (x.kind === 'FAIL' && 보냄.get(x.key)!.pick === 'BUG') 줄.push({ 곳: 'BUG', 종류: 'bug', keys: [x.key], tcId: x.tcId });

  const 확인 = 고른항목.filter((x): x is 항목of<'CHECK'> => x.kind === 'CHECK');
  const 바뀜 = 확인.map((x) => {
    const p = 보냄.get(x.key)!;
    const kind = p.pick === 'PICK' ? 'PICK' : p.text !== undefined && p.text !== x.text ? 'EDIT' : 'CONFIRM';
    return { kind, reqId: x.reqId } as const;
  });
  if (확인.length > 0) 줄.push({ 곳: 'PRD', 종류: 'prd', keys: 확인.map((x) => x.key), version: prdVersion + 1, 바뀜 });

  for (const x of 고른항목) if (x.kind === 'APPLY') 줄.push({ 곳: 'TEST', 종류: 'apply', keys: [x.key], rootId: x.rootId });

  const 화면들 = 고른항목.filter((x) => x.kind === 'FAIL' && 보냄.get(x.key)!.pick === 'SCREEN');
  const 문장수 = 확인.filter((x) => {
    const p = 보냄.get(x.key)!;
    return p.pick === 'PICK' ? x.options[p.option!]?.quote !== x.text : p.text !== undefined && p.text !== x.text;
  }).length;
  const 요구항목 = items.find((x): x is 항목of<'PRD_CHANGED'> => x.kind === 'PRD_CHANGED');
  const 다시고름 = 요구항목 !== undefined && 보냄.has(요구항목.key);
  const 같이 = 화면들.length + 문장수 > 0;
  if (다시고름 || 같이) {
    줄.push({
      곳: 'TEST',
      종류: 'fix',
      keys: [...(다시고름 ? [요구항목.key] : []), ...화면들.map((x) => x.key)],
      화면: 화면들.length,
      문장: 문장수,
      바뀐요구: 다시고름 || (같이 && 요구항목 !== undefined),
      바뀐요구수: 요구항목 === undefined ? null : 바뀐요구수(요구항목),
      같이: 같이 && 요구항목 !== undefined && !다시고름,
    });
  }
  const API = 고른항목.find((x): x is 항목of<'API_CHANGED'> => x.kind === 'API_CHANGED');
  if (API !== undefined) 줄.push({ 곳: 'TEST', 종류: 'api', keys: [API.key], 수: 다시쓸API(API)?.length ?? null });
  const 화면 = 고른항목.find((x): x is 항목of<'SCREENS'> => x.kind === 'SCREENS');
  if (화면 !== undefined) 줄.push({ 곳: 'TEST', 종류: 'screens', keys: [화면.key], 수: 화면.screens === null ? null : new Set(화면.screens.map((s) => s.url)).size });
  return 줄;
}

/** 진행 뒤 차례 줄마다 서버가 세운 요청 번호 — 기획서 · 버그는 요청이 없다. 문장 변경만으로 세운 고치기는 key 가 null 이다 */
export function 줄요청(줄: 차례줄, steps: readonly { step: number; key: string | null; requestId: number | null }[]): number | null {
  const 단계 = { bug: 1, prd: 2, apply: 3, fix: 4, api: 4, screens: 5 }[줄.종류];
  const 맞음 = steps.find((s) => s.step === 단계 && s.requestId !== null && (s.key === null ? 줄.종류 === 'fix' : 줄.keys.includes(s.key)));
  return 맞음?.requestId ?? null;
}
