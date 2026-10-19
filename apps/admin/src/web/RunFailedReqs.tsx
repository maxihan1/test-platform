// 실패 카드의 「관련 요구사항」 줄과 요구 번호 고리 (도메인/리포팅 「실패 요구사항」)
// 요약 띠 아래 「실패 요구사항 N건」 칸은 2026-10-19 ⑫ 에 뺐다 — 카드의 이 줄과 같은 내용을 두 번 보였다 (점검 2.1)

import { use말 } from './i18n.js';
import type { 판정 } from './role.js';
import { PRD항목주소 } from './route.js';

/** 고리는 그 서비스의 (작성, read) 가 있고 판에 있는 번호(문장이 있음)일 때만 건다. 아니면 글자 — 거절될 주소로 보내지 않는다 */
function 요구번호({ reqId, text, 권한 }: { reqId: string; text: string | null; 권한: 판정 }) {
  return 권한('작성보기') && text !== null ? (
    <a className="fr-id" href={PRD항목주소(reqId)}>
      {reqId}
    </a>
  ) : (
    <span className="fr-id">{reqId}</span>
  );
}

export function 관련요구줄({ reqs, 권한 }: { reqs: { reqId: string; text: string | null }[]; 권한: 판정 }) {
  const t = use말();
  if (reqs.length === 0) return null;
  return (
    <div className="fc-reqs">
      <span className="fc-reqs-label">{t('관련 요구사항')}</span>
      <ul>
        {reqs.map((요구) => (
          <li key={요구.reqId}>
            <요구번호 reqId={요구.reqId} text={요구.text} 권한={권한} /> <span>{요구.text ?? t('PRD 에 없는 번호')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
