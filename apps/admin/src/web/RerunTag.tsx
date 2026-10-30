// 한 건 실행이 덮은 항목의 꼬리표 「다시 실행해서 통과 / 다시 실행해서도 실패」와 「원래 결과 보기」 (도메인/실행 §8.3 「한 건 실행이 붙은 실행」)

import { useState } from 'react';

import type { ItemStatus, 다시실행 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 상세본문 } from './ItemExpand.js';
import { Verdict, when } from './ui.js';

/**
 * 그 항목이 든 실행 번호. 덮인 항목은 칸이 모두 한 건 항목 것이라 상세 · 화면은 한 건 실행 번호로 연다 —
 * 붙은 실행 번호로 열면 그 실행에 없는 항목이라 404 다 (도메인/실행 §7 `GET /api/runs/:runId`)
 */
export const 항목실행번호 = (it: { rerun?: 다시실행 | null }, runId: number): number => it.rerun?.runId ?? runId;

/** 판정이 난 것만 덮는다 — 미실행은 덮지 않아 통과 · 실패 둘뿐이다 (도메인/실행 §3.2 「판정이 난 것만 고친다」) */
export function 다시실행꼬리표({ rerun, status }: { rerun: 다시실행; status: ItemStatus }) {
  const t = use말();
  const 언어 = use언어();
  return (
    <span className="fc-tag">
      {status === 'PASS' ? t('다시 실행해서 통과') : t('다시 실행해서도 실패')} · {when(rerun.finishedAt, 언어)}
      {rerun.triggeredBy === '' ? null : ` · ${rerun.triggeredBy}`}
    </span>
  );
}

/** 원래 항목을 접힌 채로 둔다. 처음 펼칠 때만 상세를 부르고 다시 접어도 지우지 않는다 */
export function 원래결과보기({ runId, rerun }: { runId: number; rerun: 다시실행 }) {
  const t = use말();
  const 언어 = use언어();
  const [불렀나, set불렀나] = useState(false);
  return (
    <details className="fc-orig" onToggle={(e) => { if (e.currentTarget.open) set불렀나(true); }}>
      <summary>
        {t('원래 결과 보기')} <Verdict status={rerun.original.status} /> {when(rerun.original.finishedAt, 언어)}
      </summary>
      {불렀나 ? <상세본문 runId={runId} historyId={rerun.original.historyId} /> : null}
    </details>
  );
}
