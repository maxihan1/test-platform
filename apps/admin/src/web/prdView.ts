// 「PRD 관리」 화면의 판단 — 기능 묶음 · 확인 필요 차례 · 반영 안 됨 줄 · 보낼 판 · 고치기 칸 검사. 그림은 Prd*.tsx 가 그린다

import type { PrdItem } from '@platform/kit';

import { 상한 } from '../prd/rules.js';
import type { PrdItemDraft, PrdNow } from './prdApi.js';

/** 기능 묶음으로 접는다. 묶음 차례는 판에 처음 나온 차례다 — 옮기기가 원본 차례대로 싣는다 */
export function 묶음들(items: PrdItem[]): { feature: string; items: PrdItem[] }[] {
  const 표 = new Map<string, PrdItem[]>();
  for (const x of items) 표.set(x.feature, [...(표.get(x.feature) ?? []), x]);
  return [...표].map(([feature, 줄들]) => ({ feature, items: 줄들 }));
}

/** 확인 필요는 오래 기다린 것부터. 시각이 없는 것은 맨 아래 — 서버가 늘 매기지만 옛 판을 되돌리면 빠질 수 있다 */
export function 확인필요줄(items: PrdItem[]): PrdItem[] {
  const 언제 = (x: PrdItem) => x.checkSince ?? '\uffff';
  return items.filter((x) => x.status === 'NEEDS_CHECK').sort((a, b) => 언제(a).localeCompare(언제(b)));
}

/** 고른 것 · 편 것 모음에서 값 하나를 넣고 뺀다 */
export function 뒤집은(모음: ReadonlySet<string>, 값: string) {
  const 새것 = new Set(모음);
  if (!새것.delete(값)) 새것.add(값);
  return 새것;
}

export type 반영종류 = keyof PrdNow['unapplied'];

/** 반영 안 됨 줄. 지운 번호는 지금 판에 글이 없어 번호만 보인다 */
export function 반영안됨줄(now: Pick<PrdNow, 'items' | 'unapplied'>): { kind: 반영종류; reqId: string; text: string | null }[] {
  const 글 = new Map(now.items.map((x) => [x.reqId, x.text]));
  const 종류들: 반영종류[] = ['changed', 'added', 'removed'];
  return 종류들.flatMap((kind) => now.unapplied[kind].map((reqId) => ({ kind, reqId, text: 글.get(reqId) ?? null })));
}

/**
 * 보낼 판. 번호가 있으면 그 항목을 바꾸거나(새것) 지우고(null), 번호가 없으면 맨 뒤에 더한다.
 * 저장은 늘 판 전체다 — 서버가 앞 판과 견줘 번호 · checkSince · byPerson 을 매긴다 (도메인/작성 §7 PUT /api/prd)
 */
export function 고친판(items: PrdItem[], reqId: string | null, 새것: PrdItemDraft | null): PrdItemDraft[] {
  if (reqId === null) return 새것 === null ? items : [...items, 새것];
  return items.flatMap((x) => (x.reqId !== reqId ? [x] : 새것 === null ? [] : [{ ...새것, reqId }]));
}

export type 틀린칸 = 'feature' | 'text' | 'basis' | 'from' | 'quote' | 'long';

/**
 * 보내기 전에 빈 칸 · 넘친 칸을 잡는다. 서버도 같은 상한으로 다시 본다(prd/rules.ts `항목검사`) —
 * 여기서 안 잡으면 `BAD_PRD 3.text` 처럼 자리 번호만 돌아와 어느 칸인지 사람이 못 찾는다
 */
export function 고치기검사(x: PrdItemDraft): 틀린칸 | null {
  const 빈 = (글: string) => 글.trim() === '';
  if (빈(x.feature)) return 'feature';
  if (빈(x.text)) return 'text';
  if (x.basis.length === 0) return 'basis';
  if (x.basis.some((b) => 빈(b.from))) return 'from';
  if (x.basis.some((b) => 빈(b.quote))) return 'quote';
  const 넘침 =
    x.feature.length > 상한.기능묶음 ||
    x.text.length > 상한.요구문장 ||
    x.basis.length > 상한.근거 ||
    x.basis.some((b) => b.from.length > 상한.근거자리 || (b.ref ?? '').length > 상한.근거자리 || b.quote.length > 상한.근거문장);
  return 넘침 ? 'long' : null;
}
