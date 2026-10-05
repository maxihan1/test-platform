// 올리기 판정 — 원장 대조 · 칸 번호 · 설계 칸 · 기법을 PR 머리 줄로 모은다. authoring-ledger-check.ts 가 300줄이라 뗐다 (2026-10-05)

import { 경고줄, 설계대조, 설계줄들 } from './authoring-design-check.js';
import { 케이스tcId } from './authoring-held-apply.js';
import type { 원장 } from './authoring-ledger.js';
import { type 기준결정, type 대조결과, 셈글, 설계거절행들, 요구줄들, 원장대조 } from './authoring-ledger-check.js';
import { 기법대조 } from './authoring-technique-check.js';

/** 케이스 글을 `defineCase` 의 tcId 로 묶는다 — 기법 대조 재료. tcId 를 못 읽은 글은 뺀다(빠짐 · 형식 오류가 따로 본다) */
export function tcId별글(글들: readonly string[]): Map<string, string> {
  const 표 = new Map<string, string>();
  for (const 글 of 글들) {
    const tcId = 케이스tcId(글);
    if (tcId !== null && !표.has(tcId)) 표.set(tcId, 글);
  }
  return 표;
}

/**
 * 에이전트의 올리기 판정. 메모리의 원장 · 올릴 트리의 표 · 트리의 케이스로 본다 — 자식의 말과 자식이 고친 사본을 안 믿는다.
 * 빠짐 · 형식 오류가 있어도 **거절하지 않는다** — 올리고 PR 본문 `머리글`(셈 줄 아래 경고 줄)에 적는다. `대조` 는 셈 재료다.
 * 거절하면 자식이 만든 케이스를 통째로 못 쓴다 (도메인/작성 §3.6 「★ 원장」, 2026-09-30 게이트 1). 원장 없음은 `없음` 에 까닭
 */
export function 원장판정(
  원장값: 원장 | { 없음: string },
  표글: string,
  있는케이스: Set<string>,
  // 기준 — 안 주면(옛 호출 · 검사) 칸 번호를 안 보고 머리글에도 안 싣는다
  기준?: 기준결정,
  // 케이스글 — tcId → 케이스 파일 글. 안 주면(옛 호출) 기법을 안 본다 (작성 §3.6 「기법 어긋남」)
  케이스글?: ReadonlyMap<string, string>,
): { 머리글: string; 대조: 대조결과 } | { 머리글: string; 없음: string } {
  if ('없음' in 원장값) return { 머리글: `⚠️ 원장 없음 — ${원장값.없음}. 빠진 요구를 기계로 확인하지 못했다`, 없음: 원장값.없음 };
  const 결과 = 원장대조(원장값.항목, 표글, { 있는케이스, 에이전트: true, 사람이뺌: 기준?.사람이뺌, 다음요청: 기준?.다음요청, 칸재료: 기준?.칸재료 });
  const 못넣음 = 원장값.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${원장값.빠진자료.join(' · ')}` : '';
  // UI 로만 덮음은 경고가 아니라 보고다 — 원장은 그 요구가 동작 요구인지 모르므로 사람이 PR 에서 본다 (작성 §3.6 R19)
  const UI만줄 = 경고줄('UI 로만 덮음', 결과.UI만, 10, '');
  const 칸줄 = 기준 === undefined ? [] : 기준.칸재료 === null ? ['칸 번호 · 설계 칸 · 기법 — 기준 표를 못 읽어 안 봤다'] : [...결과.칸알림, ...경고줄('칸 번호 어긋남', 결과.칸어긋남, 3)];
  const 줄들 = 요구줄들(표글);
  const 기준줄 = new Set(기준?.칸재료?.기준줄 ?? []);
  const 설계 = 기준?.칸재료 == null ? null : 설계대조(원장값.항목, 줄들, 설계거절행들(표글), new Set(결과.제외번호.keys()), 기준줄);
  const 설계줄 = 기준 === undefined ? [] : 설계줄들(원장값.항목, 설계);
  const 기법줄 = 기준?.칸재료 == null || 케이스글 === undefined ? [] : 경고줄('기법 어긋남', 기법대조(원장값.항목, 줄들, 케이스글, 기준줄), 3);
  const 머리 = [`${셈글(결과.셈, 원장값.가족)}${못넣음}`, ...UI만줄, ...경고줄('빠짐', 결과.빠짐, 10), ...경고줄('형식 오류', 결과.형식오류, 3), ...칸줄, ...설계줄, ...기법줄];
  return { 머리글: 머리.join('\n'), 대조: 결과 };
}
