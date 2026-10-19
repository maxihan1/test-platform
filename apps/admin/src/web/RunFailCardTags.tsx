// 실패 카드 머리의 꼬리표 — 판정을 남겼나 · 다시 돌린 결과 (도메인/실행 §8.3 · 점검 2.17 · 2.24)

import type { FailureJudgment } from './api.js';
import { use말 } from './i18n.js';
import { 실행기록주소 } from './route.js';
import type { 다시돌린결과 } from './useRerunResults.js';

/** 판정한 카드와 아직 안 본 카드를 가른다. 안 본 카드에는 꼬리표를 달지 않는다 — 대부분이 안 본 카드다 */
export function 판정꼬리표({ judgment }: { judgment: FailureJudgment }) {
  const t = use말();
  if (judgment === null) return null;
  return <span className="fc-tag">{judgment.kind === 'BUG' ? t('판정함 · 버그') : t('판정함 · 화면이 맞음')}</span>;
}

/** 이 케이스를 「실패 다시 실행」으로 다시 돌린 결과. 누르면 그 실행에서 이 케이스 카드가 펼쳐진 채 열린다 */
export function 다시돌림꼬리표({ tcId, 결과 }: { tcId: string; 결과: 다시돌린결과 | undefined }) {
  const t = use말();
  if (결과 === undefined) return null;
  const 글 =
    결과.status === 'PASS'
      ? t('RUN {번호}에서 통과', { 번호: 결과.runId })
      : 결과.status === 'FAIL'
        ? t('RUN {번호}에서도 실패', { 번호: 결과.runId })
        : t('RUN {번호}에서 미실행', { 번호: 결과.runId });
  return (
    <a className="fc-tag" href={실행기록주소(tcId, 결과.runId, true)}>
      {글}
    </a>
  );
}
