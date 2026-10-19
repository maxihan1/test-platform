// 실패 이유 한 줄(유형 칩 + 사람 말)과 접힌 원문 — 실패 카드 · 항목 상세 · 진행 창 · E2E 결과가 같이 쓴다 (도메인/실행 §8.3)

import type { 항목실패 } from './api.js';
import { 실패유형이름 } from './DashboardTypes.js';
import { use말 } from './i18n.js';

export function 실패이유({ failure }: { failure: 항목실패 | null | undefined }) {
  const t = use말();
  if (failure === null || failure === undefined) return null;
  return (
    <span className="fail-why">
      <span className="fc-tag fail-type">{t(실패유형이름[failure.type])}</span>
      <span className="fail-reason">{failure.reason}</span>
    </span>
  );
}

/** 오류 원문 · 스택 · 동작 원문은 코드를 아는 사람만 읽는다 — 늘 접어 두고 누를 때만 연다 */
export function 원문보기({ 글 }: { 글: string | null | undefined }) {
  const t = use말();
  if (글 === null || 글 === undefined || 글.trim() === '') return null;
  return (
    <details className="code raw">
      <summary>{t('원문 보기')}</summary>
      <pre>{글}</pre>
    </details>
  );
}
