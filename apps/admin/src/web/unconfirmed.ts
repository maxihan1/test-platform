// 미확정 항목을 화면에 적는 규칙. 요약 띠·실행 목록·완료 모달이 같은 글을 쓴다 (도메인/실행 §3.2)
// 미확정은 따로 묶어 세지 않는다 — 통과·실패·미실행은 모든 항목이고, 미확정은 「그중 N건」 한 줄과 줄의 꼬리표로만 보인다

import type { RunCounts } from './api.js';
import { t, type 언어 } from './i18n.js';

/** `그중 미확정 5건`. 미확정이 없으면 빈 글자 — 줄 자체를 안 쓴다 */
export function 그중미확정글(counts: RunCounts, 언어: 언어): string {
  const 수 = counts.unconfirmed ?? 0;
  return 수 > 0 ? t('그중 미확정 {수}건', 언어, { 수 }) : '';
}

/** 처음 미확정이 된 뒤 지난 날 수. 기획 답을 얼마나 기다렸나를 보인다 (도메인/카탈로그 §3.1) */
export function 미확정나이(since: string, 지금: Date = new Date()): number {
  return Math.max(0, Math.floor((지금.getTime() - new Date(since).getTime()) / 86_400_000));
}
