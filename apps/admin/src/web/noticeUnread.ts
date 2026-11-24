// 알림 배지 수와 토스트로 알릴 새 소식 — 서랍 줄을 짓는 noticeView.ts 에서 뗐다 (SPEC 공통/5-화면공통 §8 「알림」)

import type { NoticeRecent } from './api.js';
import { 서랍목록, 읽음열쇠 } from './noticeView.js';

/** 「알림」 버튼의 배지 수 — 서랍에 있는(7일) 것 가운데 이 브라우저가 아직 안 읽은 것 */
export function 안읽은수(recent: readonly NoticeRecent[], 읽음: ReadonlySet<string>): number {
  return recent.filter((n) => !읽음.has(읽음열쇠(n))).length;
}

/**
 * 토스트로 알릴 새 소식 하나 — 앞 답에 없던 안 읽은 것 가운데 가장 늦게 끝난 것.
 * 앞 답이 없으면(화면을 막 열었다) 없다 — 열기 전에 끝난 것은 소식이 아니라 줄 · 배지가 알린다.
 * `뺄실행` 은 완료 창(진행 알약)이나 결과 화면이 이미 알리는 실행이다
 */
export function 새소식(
  앞: readonly NoticeRecent[] | null,
  지금: readonly NoticeRecent[],
  읽음: ReadonlySet<string>,
  뺄실행: readonly (number | null)[],
): NoticeRecent | null {
  if (앞 === null) return null;
  const 있던 = new Set(앞.map(읽음열쇠));
  // E2E(scenario)도 runId 로 뺀다 — 실행 창이 떠 있으면 그 창이 끝을 알린다 (점검표 D8)
  const 새것 = 지금.filter((n) => !있던.has(읽음열쇠(n)) && !읽음.has(읽음열쇠(n)) && !(n.kind !== 'authoring' && 뺄실행.includes(n.runId)));
  return 서랍목록(새것, 읽음, 'all')[0] ?? null;
}
