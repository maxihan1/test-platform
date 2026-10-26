// 표준 기획서 기능 묶음은 원본 기획서 제목에서만 — 자식의 prd:ledger 가 막고 에이전트가 PR 머리에 남은 것을 띄운다 (도메인/작성 §3.6 「항목 — 칸 다섯」 기능 묶음 · PRD-F16-02)
// 14674 · 14675 가 같은 기획서에서 「주문서」 · 「1:1 문의」 같은 이름을 지어내 판마다 묶음이 달랐다

import type { 옮긴항목 } from './authoring-prd.js';

/**
 * 기능 묶음이 원본 기획서 제목(`원장.제목` — 자료 이름 → 제목들)에 없는 항목을 묶음마다 — `「주문서」(MKT-NEW-003 · MKT-REQ-020)`.
 * 제목이 있는 자료를 근거로 단 항목만 본다 — PDF · 피그마 · 화면에서만 온 항목과 제목 칸이 없는 옛 사본은 안 본다(고를 제목이 없다)
 */
export function 제목밖묶음(items: readonly 옮긴항목[], 제목: Readonly<Record<string, readonly string[]>> | undefined): string[] {
  const 있는 = new Set(Object.values(제목 ?? {}).flat());
  if (제목 === undefined || 있는.size === 0) return [];
  const 밖 = new Map<string, string[]>();
  for (const i of items) {
    if (있는.has(i.feature) || !i.basis.some((b) => Object.hasOwn(제목, b.from) && 제목[b.from]!.length > 0)) continue;
    밖.set(i.feature, [...(밖.get(i.feature) ?? []), i.reqId ?? i.임시 ?? '번호 없음']);
  }
  return [...밖].map(([묶음, 번호]) => `「${묶음}」(${번호.join(' · ')})`);
}
